"""Auth API routes — Telegram login, token refresh, logout, profile."""
from __future__ import annotations

from litestar import Router, get, post
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import ValidationException
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.schemas import (
    LogoutRequest,
    RefreshRequest,
    TelegramInitData,
    TokenPair,
    UserResponse,
)
from src.auth.service import AuthError, AuthService
from src.core.database.base import get_db
from src.core.security.deps import current_user


@post("/telegram")
async def telegram_auth(
    data: TelegramInitData,
    request: Request,
    db: AsyncSession,
) -> dict:
    service = AuthService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    try:
        user, tokens = await service.authenticate_telegram(data.init_data, ip, ua)
        await db.commit()
        return {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
            "token_type": "bearer",
            "expires_in": tokens.expires_in,
        }
    except AuthError as e:
        raise ValidationException(str(e)) from e


@post("/refresh")
async def refresh_token(data: RefreshRequest, request: Request, db: AsyncSession) -> dict:
    service = AuthService(db)
    ip = request.client.host if request.client else None
    try:
        tokens = await service.refresh_tokens(data.refresh_token, ip)
        await db.commit()
        return {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
            "token_type": "bearer",
            "expires_in": tokens.expires_in,
        }
    except AuthError as e:
        raise ValidationException(str(e)) from e


@post("/logout", status_code=204)
async def logout(data: LogoutRequest, db: AsyncSession) -> None:
    service = AuthService(db)
    await service.revoke_refresh_token(data.refresh_token)
    await db.commit()


@get("/me")
async def me(user: dict, db: AsyncSession) -> dict:
    from sqlalchemy import select
    from src.auth.models import User
    result = await db.execute(select(User).where(User.id == user["id"]))
    db_user = result.scalar_one_or_none()
    if not db_user:
        from litestar.exceptions import NotFoundException
        raise NotFoundException("User not found")
    return {
        "id": str(db_user.id),
        "telegramId": db_user.telegram_id,
        "username": db_user.username,
        "firstName": db_user.first_name,
        "lastName": db_user.last_name,
        "photoUrl": db_user.photo_url,
        "role": db_user.role,
        "subscriptionPlan": db_user.subscription_plan,
        "isPremium": db_user.is_premium,
    }


@post("/dev-login")
async def dev_login(request: Request, db: AsyncSession) -> dict:
    """Development-only: create/login a test user without Telegram."""
    from src.core.config.settings import settings
    if settings.is_production:
        from litestar.exceptions import NotFoundException
        raise NotFoundException()

    from sqlalchemy import select
    from src.auth.models import User
    from datetime import UTC, datetime

    result = await db.execute(select(User).where(User.telegram_id == 99999999))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            telegram_id=99999999,
            username="devuser",
            first_name="Dev",
            last_name="User",
            language_code="en",
        )
        db.add(user)
        await db.flush()

    service = AuthService(db)
    tokens = await service._issue_tokens(user, None, None)
    await db.commit()

    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "token_type": "bearer",
        "expires_in": tokens.expires_in,
        "user": {
            "id": str(user.id),
            "telegramId": user.telegram_id,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "username": user.username,
            "photoUrl": user.photo_url,
            "role": user.role,
            "subscriptionPlan": user.subscription_plan,
            "isPremium": user.is_premium,
        }
    }


@post("/telegram/webhook")
async def platform_webhook(data: dict, request: Request) -> dict:
    """Receive updates from the platform bot (@YoqutConstructor_bot)."""
    import asyncio
    from src.telegram.platform_handler import handle_platform_update
    asyncio.create_task(handle_platform_update(data))
    return {"ok": True}


auth_router = Router(
    path="/api/v1/auth",
    route_handlers=[telegram_auth, refresh_token, logout, me, dev_login, platform_webhook],
    dependencies={
        "db": Provide(get_db),
        "user": Provide(current_user),
    },
)
