import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bot import Bot
from app.models.bot_user import BotUser
from app.models.broadcast import Broadcast, BroadcastStatus
from app.utils.encryption import decrypt_token


async def get_broadcasts(db: AsyncSession, bot_id: str) -> list[Broadcast]:
    result = await db.execute(
        select(Broadcast)
        .where(Broadcast.bot_id == uuid.UUID(bot_id))
        .order_by(Broadcast.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


async def create_broadcast(db: AsyncSession, bot_id: str, **kwargs) -> Broadcast:
    bc = Broadcast(bot_id=uuid.UUID(bot_id), **kwargs)
    db.add(bc)
    await db.commit()
    await db.refresh(bc)
    return bc


async def run_broadcast(db: AsyncSession, broadcast: Broadcast, bot: Bot) -> None:
    """Enqueue broadcast as a Celery task so the web process is not blocked."""
    from app.queue.tasks import send_broadcast

    token = decrypt_token(bot.token)

    query = select(BotUser.telegram_id).where(BotUser.bot_id == bot.id)
    if broadcast.target_tags:
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import ARRAY
        from sqlalchemy import String

        query = query.where(
            BotUser.tags.overlap(cast(broadcast.target_tags, ARRAY(String)))
        )

    result = await db.execute(query)
    chat_ids = [row[0] for row in result.fetchall()]

    broadcast.status = BroadcastStatus.running
    await db.commit()

    send_broadcast.delay(
        broadcast_id=str(broadcast.id),
        token=token,
        chat_ids=chat_ids,
        message=broadcast.message or "",
        media_url=broadcast.media_url,
        media_type=broadcast.media_type,
    )
