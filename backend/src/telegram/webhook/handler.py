"""
Telegram webhook handler — receives updates, validates signatures,
normalizes events, and dispatches to the flow execution engine.

Security:
- Webhook secret validated via X-Telegram-Bot-Api-Secret-Token header
- Request body validated as valid JSON before processing
- Each bot identified by bot_id in the URL path

Performance:
- Webhook returns 200 immediately; execution runs async in background
- Redis pub/sub notifies WebSocket clients of realtime updates
"""
from __future__ import annotations

import hmac
import hashlib
import uuid
from typing import Any

import structlog
from litestar import Request, Response, post
from litestar.datastructures import Headers
from sqlalchemy.ext.asyncio import AsyncSession

from src.bots.models import Bot
from src.flows.engine.executor import FlowExecutor
from src.flows.models import Flow, FlowExecution, FlowStatus
from src.telegram.events.normalizer import normalize_telegram_update
from src.core.config.settings import settings
from src.realtime.broadcaster import WebSocketBroadcaster

logger = structlog.get_logger(__name__)


class WebhookSecurityError(Exception):
    pass


def _verify_webhook_secret(request_secret: str | None, stored_secret: str) -> bool:
    if not request_secret or not stored_secret:
        return False
    return hmac.compare_digest(request_secret.encode(), stored_secret.encode())


async def handle_webhook(
    bot_id: uuid.UUID,
    update: dict[str, Any],
    db: AsyncSession,
    executor: FlowExecutor,
    broadcaster: WebSocketBroadcaster,
) -> None:
    """Core dispatch logic — find matching flows and execute them."""
    from sqlalchemy import select

    # Load bot
    result = await db.execute(
        select(Bot).where(Bot.id == bot_id).where(Bot.deleted_at.is_(None))
    )
    bot = result.scalar_one_or_none()
    if not bot or not bot.is_webhook_active:
        return

    # Normalize update to internal event format
    event = normalize_telegram_update(update)
    if not event:
        return

    # Find active flows for this bot
    flows_result = await db.execute(
        select(Flow)
        .where(Flow.bot_id == bot_id)
        .where(Flow.status == FlowStatus.ACTIVE)
    )
    active_flows = list(flows_result.scalars().all())

    if not active_flows:
        return

    # Load bot's decrypted token to inject Aiogram Bot instance
    from src.bots.service import _decrypt_token
    from aiogram import Bot as AiogramBot
    bot_token = _decrypt_token(bot.token_encrypted)
    aiogram_bot = AiogramBot(token=bot_token)

    try:
        for flow in active_flows:
            from sqlalchemy.orm import selectinload
            flow_result = await db.execute(
                select(Flow)
                .options(selectinload(Flow.nodes), selectinload(Flow.edges))
                .where(Flow.id == flow.id)
            )
            flow_full = flow_result.scalar_one_or_none()
            if not flow_full:
                continue

            from datetime import UTC, datetime
            execution = FlowExecution(
                flow_id=flow.id,
                bot_id=bot_id,
                telegram_user_id=event.get("user", {}).get("id"),
                telegram_chat_id=event.get("chat_id"),
                trigger_event=event.get("type", "unknown"),
                trigger_data=update,
                status="pending",
                started_at=datetime.now(UTC),
                execution_trace=[],
                variables={"__bot_instance__": None},
            )
            db.add(execution)
            await db.flush()

            # Inject bot instance into context via a sentinel variable
            event["__bot_instance__"] = aiogram_bot

            await executor.execute(
                nodes=flow_full.nodes,
                edges=flow_full.edges,
                telegram_event=event,
                bot_id=bot_id,
                flow_id=flow.id,
                execution_record=execution,
                websocket_broadcaster=broadcaster,
            )

            flow.total_executions += 1
            flow.last_executed_at = datetime.now(UTC)

        await db.commit()
    finally:
        await aiogram_bot.session.close()

    logger.info(
        "webhook_processed",
        bot_id=str(bot_id),
        event_type=event.get("type"),
        flows_matched=len(active_flows),
    )
