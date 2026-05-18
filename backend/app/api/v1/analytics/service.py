import uuid
from typing import Dict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytic_event import AnalyticEvent
from app.models.bot_user import BotUser


async def get_analytics(db: AsyncSession, bot_id: str, days: int = 30) -> dict:
    bot_uuid = uuid.UUID(bot_id)
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # ── Summary ───────────────────────────────────────────────────────────────
    total_users = (
        await db.execute(select(func.count()).where(BotUser.bot_id == bot_uuid))
    ).scalar() or 0

    active_7d = (
        await db.execute(
            select(func.count()).where(
                BotUser.bot_id == bot_uuid,
                BotUser.last_seen_at >= now - timedelta(days=7),
            )
        )
    ).scalar() or 0

    new_today = (
        await db.execute(
            select(func.count()).where(
                BotUser.bot_id == bot_uuid,
                BotUser.first_seen_at >= today_start,
            )
        )
    ).scalar() or 0

    messages_today = (
        await db.execute(
            select(func.count()).where(
                AnalyticEvent.bot_id == bot_uuid,
                AnalyticEvent.created_at >= today_start,
            )
        )
    ).scalar() or 0

    messages_total = (
        await db.execute(select(func.count()).where(AnalyticEvent.bot_id == bot_uuid))
    ).scalar() or 0

    messages_7d = (
        await db.execute(
            select(func.count()).where(
                AnalyticEvent.bot_id == bot_uuid,
                AnalyticEvent.created_at >= now - timedelta(days=7),
            )
        )
    ).scalar() or 0

    # ── Users by day (last N days) ────────────────────────────────────────────
    users_raw = (
        await db.execute(
            select(
                cast(BotUser.first_seen_at, Date).label("day"),
                func.count().label("count"),
            )
            .where(BotUser.bot_id == bot_uuid, BotUser.first_seen_at >= since)
            .group_by("day")
            .order_by("day")
        )
    ).all()

    users_by_day = _fill_days({str(r.day): r.total for r in users_raw}, days)

    # ── Messages by day ───────────────────────────────────────────────────────
    msgs_raw = (
        await db.execute(
            select(
                cast(AnalyticEvent.created_at, Date).label("day"),
                func.count().label("count"),
            )
            .where(AnalyticEvent.bot_id == bot_uuid, AnalyticEvent.created_at >= since)
            .group_by("day")
            .order_by("day")
        )
    ).all()

    messages_by_day = _fill_days({str(r.day): r.total for r in msgs_raw}, days)

    # ── Event type breakdown ──────────────────────────────────────────────────
    events_raw = (
        await db.execute(
            select(AnalyticEvent.event_type, func.count().label("count"))
            .where(AnalyticEvent.bot_id == bot_uuid)
            .group_by(AnalyticEvent.event_type)
        )
    ).all()

    event_breakdown = {str(r.event_type): r.total for r in events_raw}

    # ── Recent users ──────────────────────────────────────────────────────────
    recent_users_raw = (
        (
            await db.execute(
                select(BotUser)
                .where(BotUser.bot_id == bot_uuid)
                .order_by(BotUser.last_seen_at.desc())
                .limit(20)
            )
        )
        .scalars()
        .all()
    )

    recent_users = [
        {
            "id": str(u.id),
            "telegram_id": u.telegram_id,
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "language_code": u.language_code,
            "first_seen_at": u.first_seen_at if u.first_seen_at else None,
            "last_seen_at": u.last_seen_at if u.last_seen_at else None,
        }
        for u in recent_users_raw
    ]

    return {
        "summary": {
            "total_users": total_users,
            "active_users_7d": active_7d,
            "new_users_today": new_today,
            "messages_today": messages_today,
            "messages_7d": messages_7d,
            "messages_total": messages_total,
        },
        "users_by_day": users_by_day,
        "messages_by_day": messages_by_day,
        "event_breakdown": event_breakdown,
        "recent_users": recent_users,
    }


def _fill_days(data: Dict[str, int], days: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    result = []
    for i in range(days - 1, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        result.append({"date": d, "count": data.get(d, 0)})
    return result
