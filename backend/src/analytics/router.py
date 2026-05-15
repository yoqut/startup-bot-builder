"""Analytics API — dashboard metrics, event history, user stats."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from litestar import Router, get
from litestar.di import Provide
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.models import AnalyticsEvent, BotAnalytics, BotUser
from src.core.database.base import get_db
from src.core.security.deps import current_user
from src.flows.models import FlowExecution


@get("/summary")
async def analytics_summary(bot_id: uuid.UUID, db: AsyncSession, user: dict) -> dict:
    now = datetime.now(UTC)
    last_30 = now - timedelta(days=30)

    # Total bot users
    total_users = await db.scalar(
        select(func.count()).where(BotUser.bot_id == bot_id)
    ) or 0

    # Executions last 30 days
    executions = await db.scalar(
        select(func.count())
        .where(FlowExecution.bot_id == bot_id)
        .where(FlowExecution.started_at >= last_30)
    ) or 0

    # Error rate
    errors = await db.scalar(
        select(func.count())
        .where(FlowExecution.bot_id == bot_id)
        .where(FlowExecution.status == "failed")
        .where(FlowExecution.started_at >= last_30)
    ) or 0

    error_rate = (errors / executions * 100) if executions > 0 else 0

    # Avg execution time
    avg_ms = await db.scalar(
        select(func.avg(FlowExecution.duration_ms))
        .where(FlowExecution.bot_id == bot_id)
        .where(FlowExecution.started_at >= last_30)
    ) or 0

    return {
        "total_users": total_users,
        "executions_30d": executions,
        "error_rate": round(error_rate, 2),
        "avg_execution_ms": round(float(avg_ms), 1),
    }


@get("/users")
async def bot_users(bot_id: uuid.UUID, db: AsyncSession, user: dict) -> list[dict]:
    result = await db.execute(
        select(BotUser)
        .where(BotUser.bot_id == bot_id)
        .order_by(BotUser.last_active_at.desc())
        .limit(100)
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "telegram_id": u.telegram_user_id,
            "username": u.username,
            "first_name": u.first_name,
            "message_count": u.message_count,
            "last_active_at": u.last_active_at.isoformat() if u.last_active_at else None,
        }
        for u in users
    ]


analytics_router = Router(
    path="/api/v1/bots/{bot_id:uuid}/analytics",
    route_handlers=[analytics_summary, bot_users],
    dependencies={"db": Provide(get_db), "user": Provide(current_user)},
)
