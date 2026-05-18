import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qsl

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.utils.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

# Telegram initData 24 soatdan eski bo'lsa rad etiladi
TELEGRAM_AUTH_MAX_AGE = 86_400


async def register_user(
    db: AsyncSession, email: str, password: str, full_name: str | None
) -> User:
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise ValueError("Email allaqachon ro'yxatdan o'tgan")

    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(
        select(User).where(User.email == email, User.is_active == bool(True))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise ValueError("Email yoki parol noto'g'ri")
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    from uuid import UUID

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    return result.scalar_one_or_none()


def generate_tokens(user: User) -> dict:
    return {
        "access_token": create_access_token(str(user.id), user.role.value),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
    }


def verify_refresh_token(token: str) -> str:
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token")
    return payload["sub"]


async def get_or_create_user_by_telegram(
    db: AsyncSession,
    telegram_id: int,
    first_name: str,
    last_name: str | None = None,
    username: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if user:
        return user

    full_name = first_name
    if last_name:
        full_name = f"{first_name} {last_name}"

    email = f"tg_{telegram_id}@telegram.user"
    user = User(
        telegram_id=telegram_id,
        email=email,
        password_hash=None,
        full_name=full_name,
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
        logger.info("New Telegram user created: tg_id=%s", telegram_id)
        return user
    except IntegrityError:
        # Parallel request already created the user — just fetch it
        await db.rollback()
        result = await db.execute(select(User).where(User.telegram_id == telegram_id))
        return result.scalar_one()


def verify_telegram_widget_hash(data: dict, bot_token: str) -> bool:
    received_hash = data.pop("hash", "")
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(data.items()) if v is not None
    )
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    expected_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    auth_date = int(data.get("auth_date", 0))
    if time.time() - auth_date > TELEGRAM_AUTH_MAX_AGE:
        return False
    return hmac.compare_digest(expected_hash, received_hash)


def verify_telegram_webapp_hash(init_data: str, bot_token: str) -> dict:
    """
    Telegram WebApp initData ni tekshiradi.
    Raises ValueError: hash noto'g'ri yoki muddati o'tgan bo'lsa.
    Returns: parsed params dict (hash olib tashlangan).
    """
    if not init_data:
        raise ValueError("initData bo'sh")

    if not bot_token:
        raise ValueError("Bot token sozlanmagan (MANAGER_BOT_TOKEN)")

    params = dict(parse_qsl(init_data, keep_blank_values=True))

    received_hash = params.pop("hash", "")
    if not received_hash:
        raise ValueError("initData ichida hash topilmadi")

    # auth_date muddatini tekshir
    auth_date = int(params.get("auth_date", 0))
    age = time.time() - auth_date
    if age > TELEGRAM_AUTH_MAX_AGE:
        raise ValueError(f"initData eskirgan ({int(age)}s > {TELEGRAM_AUTH_MAX_AGE}s)")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))

    # Telegram spec: secret = HMAC_SHA256(key="WebAppData", msg=bot_token)
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise ValueError("initData hash noto'g'ri (imzo tasdiqlanmadi)")

    return params


def parse_webapp_user(params: dict) -> dict:
    """params['user'] JSON stringini xavfsiz parse qiladi."""
    raw = params.get("user", "{}")
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ValueError(f"initData.user JSON parse xatosi: {exc}") from exc
