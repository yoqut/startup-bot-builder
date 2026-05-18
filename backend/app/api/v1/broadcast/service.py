import asyncio
import uuid

import httpx
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


async def _send_one(
    token: str,
    chat_id: int,
    message: str,
    media_url: str | None,
    media_type: str | None,
):
    async with httpx.AsyncClient(timeout=10) as client:
        if media_url and media_type == "photo":
            await client.post(
                f"https://api.telegram.org/bot{token}/sendPhoto",
                json={
                    "chat_id": chat_id,
                    "photo": media_url,
                    "caption": message,
                    "parse_mode": "HTML",
                },
            )
        elif media_url and media_type == "video":
            await client.post(
                f"https://api.telegram.org/bot{token}/sendVideo",
                json={
                    "chat_id": chat_id,
                    "video": media_url,
                    "caption": message,
                    "parse_mode": "HTML",
                },
            )
        else:
            await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
            )


async def run_broadcast(db: AsyncSession, broadcast: Broadcast, bot: Bot) -> None:
    token = decrypt_token(bot.token)
    broadcast.status = BroadcastStatus.running
    await db.commit()

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

    sent = 0
    failed = 0
    for i, chat_id in enumerate(chat_ids):
        try:
            await _send_one(
                token,
                chat_id,
                broadcast.message or "",
                broadcast.media_url,
                broadcast.media_type,
            )
            sent += 1
        except Exception:
            failed += 1
        if i % 20 == 19:
            await asyncio.sleep(1)
        else:
            await asyncio.sleep(0.05)

    broadcast.sent_count = sent
    broadcast.fail_count = failed
    broadcast.status = BroadcastStatus.done
    await db.commit()
