"""
Auth service — Telegram WebApp InitData verification + JWT lifecycle.
InitData validation follows Telegram's HMAC-SHA256 spec exactly.
Tokens are short-lived; refresh tokens rotated on each use.
"""
from __future__ import annotations

import hashlib
import hmac
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import unquote

import structlog
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import AuditLog, RefreshToken, User, UserRole
from src.auth.schemas import TelegramInitData, TokenPair, UserCreate
from src.core.config.settings import settings

logger = structlog.get_logger(__name__)

_JWT_SECRET = settings.jwt.secret_key.get_secret_value()
_JWT_ALGORITHM = settings.jwt.algorithm


class AuthError(Exception):
    pass


class InvalidInitDataError(AuthError):
    pass


class TokenExpiredError(AuthError):
    pass


def _verify_telegram_init_data(init_data: str, bot_token: str) -> dict[str, Any]:
    """
    Verify Telegram WebApp initData per official spec.
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    parsed: dict[str, str] = {}
    data_check_string_parts: list[str] = []
    received_hash: str = ""

    for chunk in init_data.split("&"):
        if "=" not in chunk:
            continue
        key, _, value = chunk.partition("=")
        decoded_value = unquote(value)
        if key == "hash":
            received_hash = decoded_value
        else:
            parsed[key] = decoded_value
            data_check_string_parts.append(f"{key}={decoded_value}")

    if not received_hash:
        raise InvalidInitDataError("Missing hash in initData")

    data_check_string_parts.sort()
    data_check_string = "\n".join(data_check_string_parts)

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(received_hash, expected_hash):
        raise InvalidInitDataError("InitData hash verification failed")

    # Telegram init_data expires after 24 hours
    auth_date = int(parsed.get("auth_date", 0))
    if time.time() - auth_date > 86400:
        raise InvalidInitDataError("InitData has expired")

    return parsed


def _create_access_token(user_id: uuid.UUID, role: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
        "iat": datetime.now(UTC),
        "type": "access",
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def _create_refresh_token() -> tuple[str, str]:
    """Returns (raw_token, hashed_token). Only hashed version is stored."""
    raw = str(uuid.uuid4())
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def verify_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise TokenExpiredError("Not an access token")
        return payload
    except JWTError as e:
        raise TokenExpiredError(str(e)) from e


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def authenticate_telegram(
        self,
        init_data: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[User, TokenPair]:
        bot_token = settings.telegram.platform_bot_token.get_secret_value()
        data = _verify_telegram_init_data(init_data, bot_token)

        import json
        tg_user = json.loads(data["user"])
        telegram_id = int(tg_user["id"])

        result = await self._db.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                telegram_id=telegram_id,
                username=tg_user.get("username"),
                first_name=tg_user.get("first_name", ""),
                last_name=tg_user.get("last_name"),
                language_code=tg_user.get("language_code", "en"),
                photo_url=tg_user.get("photo_url"),
                is_premium=tg_user.get("is_premium", False),
            )
            self._db.add(user)
            await self._db.flush()

            await self._audit(user.id, "user.registered", ip_address=ip_address)
            logger.info("new_user_registered", telegram_id=telegram_id)
        else:
            user.last_active_at = datetime.now(UTC)
            user.username = tg_user.get("username", user.username)
            user.photo_url = tg_user.get("photo_url", user.photo_url)

        tokens = await self._issue_tokens(user, ip_address, user_agent)
        return user, tokens

    async def refresh_tokens(
        self,
        raw_refresh_token: str,
        ip_address: str | None = None,
    ) -> TokenPair:
        token_hash = hashlib.sha256(raw_refresh_token.encode()).hexdigest()

        result = await self._db.execute(
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .where(RefreshToken.is_revoked.is_(False))
        )
        stored = result.scalar_one_or_none()

        if stored is None or stored.expires_at < datetime.now(UTC):
            raise TokenExpiredError("Invalid or expired refresh token")

        # Rotate: revoke old, issue new
        stored.is_revoked = True
        tokens = await self._issue_tokens(stored.user, ip_address, None)
        return tokens

    async def revoke_refresh_token(self, raw_refresh_token: str) -> None:
        token_hash = hashlib.sha256(raw_refresh_token.encode()).hexdigest()
        result = await self._db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored = result.scalar_one_or_none()
        if stored:
            stored.is_revoked = True

    async def _issue_tokens(
        self,
        user: User,
        ip_address: str | None,
        user_agent: str | None,
    ) -> TokenPair:
        access_token = _create_access_token(user.id, user.role)
        raw_refresh, hashed_refresh = _create_refresh_token()

        refresh_token_record = RefreshToken(
            user_id=user.id,
            token_hash=hashed_refresh,
            expires_at=datetime.now(UTC) + timedelta(days=settings.jwt.refresh_token_expire_days),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self._db.add(refresh_token_record)

        return TokenPair(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.jwt.access_token_expire_minutes * 60,
        )

    async def _audit(
        self,
        user_id: uuid.UUID,
        action: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            created_at=datetime.now(UTC),
        )
        self._db.add(log)
