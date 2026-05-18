from litestar import Controller, delete, get
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.v1.dependencies import get_current_user_id
from app.db.session import get_db
from app.models.bot import Bot
from app.models.business_connection import BusinessConnection


class BusinessController(Controller):
    path = "/api/v1/business"
    dependencies = {"db": Provide(get_db)}

    @get("/connections")
    async def list_connections(
        self, request: Request, db: AsyncSession, bot_id: str
    ) -> list[dict]:
        user_id = get_current_user_id(request)
        bot_result = await db.execute(
            select(Bot).where(
                Bot.id == uuid.UUID(bot_id), Bot.user_id == uuid.UUID(user_id)
            )
        )
        bot = bot_result.scalar_one_or_none()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")

        result = await db.execute(
            select(BusinessConnection)
            .where(BusinessConnection.bot_id == uuid.UUID(bot_id))
            .order_by(BusinessConnection.created_at.desc())
        )
        conns = result.scalars().all()
        return [
            {
                "id": str(c.id),
                "connection_id": c.connection_id,
                "user_id": c.user_id,
                "user_chat_id": c.user_chat_id,
                "username": c.username,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "can_reply": c.can_reply,
                "is_enabled": c.is_enabled,
                "connected_at": c.created_at.isoformat(),
            }
            for c in conns
        ]

    @delete("/connections/{connection_id:str}", status_code=204)
    async def remove_connection(
        self, connection_id: str, request: Request, db: AsyncSession
    ) -> None:
        user_id = get_current_user_id(request)
        result = await db.execute(
            select(BusinessConnection).where(
                BusinessConnection.id == uuid.UUID(connection_id)
            )
        )
        conn = result.scalar_one_or_none()
        if not conn:
            raise HTTPException(status_code=404)

        bot_result = await db.execute(
            select(Bot).where(Bot.id == conn.bot_id, Bot.user_id == uuid.UUID(user_id))
        )
        if not bot_result.scalar_one_or_none():
            raise HTTPException(status_code=403)

        await db.delete(conn)
        await db.commit()
