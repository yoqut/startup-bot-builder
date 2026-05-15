"""Telegram webhook endpoint."""
from __future__ import annotations

import uuid
from typing import Any

import structlog
from litestar import Router, post
from litestar.connection import Request
from litestar.di import Provide
from sqlalchemy.ext.asyncio import AsyncSession

from src.bots.service import _decrypt_token
from src.core.database.base import get_db
from src.telegram.webhook.handler import WebhookSecurityError, handle_webhook

logger = structlog.get_logger(__name__)


@post("/{bot_id:uuid}", status_code=200)
async def receive_webhook(
    bot_id: uuid.UUID,
    data: dict[str, Any],
    request: Request,
    db: AsyncSession,
) -> dict:
    # Verify webhook secret
    from sqlalchemy import select
    from src.bots.models import Bot

    result = await db.execute(select(Bot).where(Bot.id == bot_id))
    bot = result.scalar_one_or_none()

    if not bot:
        return {"ok": False}

    secret_header = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if bot.webhook_secret and secret_header != bot.webhook_secret:
        logger.warning("invalid_webhook_secret", bot_id=str(bot_id))
        return {"ok": False}

    # Process async (don't block webhook response)
    import asyncio
    executor = request.app.state.executor
    broadcaster = request.app.state.broadcaster

    asyncio.create_task(
        handle_webhook(bot_id, data, db, executor, broadcaster)
    )

    return {"ok": True}


telegram_router = Router(
    path="/api/v1/webhook",
    route_handlers=[receive_webhook],
    dependencies={"db": Provide(get_db)},
)
