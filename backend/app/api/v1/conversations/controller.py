import uuid

from litestar import Controller, get
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.bots.service import get_bot_by_id
from app.api.v1.dependencies import get_current_user_id
from app.db.session import get_db
from app.models.conversation import ConversationMessage
from app.models.bot_user import BotUser


class ConversationsController(Controller):
    path = "/api/v1/conversations"
    dependencies = {"db": Provide(get_db)}

    @get("/users")
    async def list_users(
        self,
        request: Request,
        db: AsyncSession,
        bot_id: str,
        search: str = "",
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")

        query = select(BotUser).where(BotUser.bot_id == uuid.UUID(bot_id))
        if search:
            from sqlalchemy import or_, cast, String

            query = query.where(
                or_(
                    BotUser.first_name.ilike(f"%{search}%"),
                    BotUser.username.ilike(f"%{search}%"),
                    cast(BotUser.telegram_id, String).ilike(f"%{search}%"),
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        result = await db.execute(
            query.order_by(BotUser.last_seen_at.desc().nullslast())
            .limit(limit)
            .offset(offset)
        )
        users = result.scalars().all()

        return {
            "total": total,
            "items": [
                {
                    "id": str(u.id),
                    "telegram_id": u.telegram_id,
                    "username": u.username,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "language_code": u.language_code,
                    "tags": u.tags or [],
                    "first_seen_at": u.first_seen_at if u.first_seen_at else None,
                    "last_seen_at": u.last_seen_at if u.last_seen_at else None,
                }
                for u in users
            ],
        }

    @get("/messages")
    async def list_messages(
        self,
        request: Request,
        db: AsyncSession,
        bot_id: str,
        telegram_id: int,
        limit: int = 100,
    ) -> list[dict]:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")

        result = await db.execute(
            select(ConversationMessage)
            .where(
                ConversationMessage.bot_id == uuid.UUID(bot_id),
                ConversationMessage.telegram_id == telegram_id,
            )
            .order_by(ConversationMessage.created_at.asc())
            .limit(limit)
        )
        messages = result.scalars().all()
        return [
            {
                "id": str(m.id),
                "direction": m.direction,
                "message_type": m.message_type,
                "content": m.content,
                "media_url": m.media_url,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ]
