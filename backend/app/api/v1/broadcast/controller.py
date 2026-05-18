import asyncio

from litestar import Controller, delete, get, post
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.bots.service import get_bot_by_id
from app.api.v1.broadcast.schemas import BroadcastCreate, BroadcastOut
from app.api.v1.broadcast.service import create_broadcast, get_broadcasts, run_broadcast
from app.api.v1.dependencies import get_current_user_id
from app.db.session import get_db
from app.models.broadcast import Broadcast


def _fmt(bc: Broadcast) -> BroadcastOut:
    return BroadcastOut(
        id=str(bc.id),
        bot_id=str(bc.bot_id),
        message=bc.message,
        media_url=bc.media_url,
        media_type=bc.media_type,
        target_tags=bc.target_tags or [],
        status=bc.status.value,
        sent_count=bc.sent_count or 0,
        fail_count=bc.fail_count or 0,
        scheduled_at=bc.scheduled_at,
        created_at=bc.created_at.isoformat(),
    )


class BroadcastController(Controller):
    path = "/api/v1/broadcasts"
    dependencies = {"db": Provide(get_db)}

    @get("/")
    async def list_broadcasts(
        self, request: Request, db: AsyncSession, bot_id: str
    ) -> list[BroadcastOut]:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        broadcasts = await get_broadcasts(db, bot_id)
        return [_fmt(bc) for bc in broadcasts]

    @post("/")
    async def send_broadcast(
        self, data: BroadcastCreate, request: Request, db: AsyncSession
    ) -> BroadcastOut:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, data.bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        if not bot.is_active:
            raise HTTPException(status_code=400, detail="Bot aktiv emas")

        bc = await create_broadcast(
            db,
            data.bot_id,
            message=data.message,
            media_url=data.media_url,
            media_type=data.media_type,
            target_tags=data.target_tags,
            scheduled_at=data.scheduled_at,
        )
        asyncio.create_task(run_broadcast(db, bc, bot))
        return _fmt(bc)

    @get("/{broadcast_id:str}")
    async def get_broadcast(
        self, broadcast_id: str, request: Request, db: AsyncSession
    ) -> BroadcastOut:
        user_id = get_current_user_id(request)
        result = await db.execute(select(Broadcast).where(Broadcast.id == broadcast_id))  # type: ignore[arg-type]
        bc = result.scalar_one_or_none()
        if not bc:
            raise HTTPException(status_code=404)
        bot = await get_bot_by_id(db, str(bc.bot_id), user_id)
        if not bot:
            raise HTTPException(status_code=403)
        return _fmt(bc)

    @delete("/{broadcast_id:str}")
    async def delete_broadcast(
        self, broadcast_id: str, request: Request, db: AsyncSession
    ) -> None:
        user_id = get_current_user_id(request)
        result = await db.execute(select(Broadcast).where(Broadcast.id == broadcast_id))  # type: ignore[arg-type]
        bc = result.scalar_one_or_none()
        if not bc:
            raise HTTPException(status_code=404)
        bot = await get_bot_by_id(db, str(bc.bot_id), user_id)
        if not bot:
            raise HTTPException(status_code=403)
        await db.delete(bc)
        await db.commit()
