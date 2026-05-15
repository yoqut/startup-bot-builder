"""Admin panel API — platform-wide management."""
from __future__ import annotations

from litestar import Router, get
from litestar.di import Provide
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.bots.models import Bot
from src.core.database.base import get_db
from src.core.security.deps import require_admin
from src.flows.models import FlowExecution


@get("/stats")
async def platform_stats(db: AsyncSession, admin: dict) -> dict:
    total_users = await db.scalar(select(func.count()).select_from(User)) or 0
    total_bots = await db.scalar(
        select(func.count()).select_from(Bot).where(Bot.deleted_at.is_(None))
    ) or 0
    total_executions = await db.scalar(select(func.count()).select_from(FlowExecution)) or 0

    return {
        "total_users": total_users,
        "total_bots": total_bots,
        "total_executions": total_executions,
    }


@get("/users")
async def list_users(db: AsyncSession, admin: dict) -> list[dict]:
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(100)
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "telegram_id": u.telegram_id,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "subscription_plan": u.subscription_plan,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


admin_router = Router(
    path="/api/v1/admin",
    route_handlers=[platform_stats, list_users],
    dependencies={"db": Provide(get_db), "admin": Provide(require_admin)},
)
