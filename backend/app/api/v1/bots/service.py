import uuid

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bot import Bot
from app.models.bot_user import BotUser
from app.settings import settings
from app.utils.encryption import encrypt_token, decrypt_token


async def validate_telegram_token(token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.telegram.org/bot{token}/getMe")
        data = resp.json()
        if not data.get("ok"):
            raise ValueError("Telegram token yaroqsiz")
        return data["result"]


async def create_bot(db: AsyncSession, user_id: str, name: str, token: str) -> Bot:
    bot_info = await validate_telegram_token(token)
    encrypted = encrypt_token(token)

    bot = Bot(
        user_id=uuid.UUID(user_id),
        name=name,
        token=encrypted,
        username=bot_info.get("username"),
    )
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return bot


async def set_webhook(db: AsyncSession, bot: Bot) -> None:
    token = decrypt_token(bot.token)
    webhook_url = f"{settings.WEBHOOK_BASE_URL}/webhook/{token.split(':')[1]}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={
                "url": webhook_url,
                "allowed_updates": [
                    "message",
                    "edited_message",
                    "channel_post",
                    "callback_query",
                    "chat_join_request",
                    "business_connection",
                    "business_message",
                    "edited_business_message",
                    "deleted_business_messages",
                ],
            },
        )
    data = resp.json()
    if not data.get("ok"):
        desc = data.get("description", "noma'lum xato")
        raise ValueError(f"Telegram webhook o'rnatmadi: {desc}")
    bot.webhook_url = webhook_url
    bot.is_active = True
    await db.commit()


async def delete_webhook(db: AsyncSession, bot: Bot) -> None:
    token = decrypt_token(bot.token)
    async with httpx.AsyncClient() as client:
        await client.get(f"https://api.telegram.org/bot{token}/deleteWebhook")
    bot.is_active = False
    await db.commit()


async def get_user_bots(db: AsyncSession, user_id: str):
    result = await db.execute(
        select(Bot)
        .where(Bot.user_id == uuid.UUID(user_id))
        .order_by(Bot.created_at.desc())
    )
    return result.scalars().all()


async def get_bot_by_id(db: AsyncSession, bot_id: str, user_id: str) -> Bot | None:
    result = await db.execute(
        select(Bot).where(
            Bot.id == uuid.UUID(bot_id), Bot.user_id == uuid.UUID(user_id)
        )
    )
    return result.scalar_one_or_none()


async def get_bot_stats(db: AsyncSession, bot_id: str) -> dict:
    from datetime import datetime, timedelta, timezone

    total = await db.execute(
        select(func.count()).where(BotUser.bot_id == uuid.UUID(bot_id))
    )
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active = await db.execute(
        select(func.count()).where(
            BotUser.bot_id == uuid.UUID(bot_id),
            BotUser.last_seen_at >= week_ago,
        )
    )
    return {
        "total_users": total.scalar() or 0,
        "active_users_7d": active.scalar() or 0,
        "total_messages": 0,
    }
