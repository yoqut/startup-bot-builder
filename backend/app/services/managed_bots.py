"""
Telegram Bot API 9.6 — Managed Bots (April 3, 2026)
https://core.telegram.org/bots/api#getmanagedbottoken

Manager bot — platformaning asosiy boti. U orqali foydalanuvchilar
yangi botlarni yaratadi. Oqim:
  1. Frontend  → POST /bots/request-managed  → deep link + pending_id
  2. User      → Telegramda deep linkni bosadi va tasdiqlaydi
  3. Telegram  → Manager bot webhookiga managed_bot update yuboradi
  4. Backend   → getManagedBotToken(bot.id) → token
  5. Backend   → Botni DB ga qo'shadi, pending ni 'done' qiladi
  6. Frontend  → GET /bots/pending/{id} polling → muvaffaqiyat!
"""

import json
import uuid
import httpx

from app.cache.redis import get_redis
from app.settings import settings

PENDING_TTL = 600  # 10 daqiqa


# ── Deep link ────────────────────────────────────────────────────────────────


def managed_bot_link(suggested_username: str, suggested_name: str) -> str:
    """https://t.me/newbot/{manager}/{username}?name={name}"""
    username = suggested_username.strip().lstrip("@")
    if not username.lower().endswith("bot"):
        username += "bot"
    name_param = suggested_name.strip().replace(" ", "%20")
    return (
        f"https://t.me/newbot/{settings.MANAGER_BOT_USERNAME}/{username}"
        f"?name={name_param}"
    )


# ── Pending store (Redis) ─────────────────────────────────────────────────────


async def create_pending(
    user_id: str,
    bot_name: str,
    suggested_username: str,
    telegram_user_id: int | None = None,
) -> str:
    """Pending yozuv yaratadi. pending_id qaytaradi."""
    username = suggested_username.strip().lstrip("@").lower()
    if not username.endswith("bot"):
        username += "bot"

    pending_id = str(uuid.uuid4())
    redis = await get_redis()

    payload = json.dumps(
        {
            "pending_id": pending_id,
            "user_id": user_id,
            "telegram_user_id": telegram_user_id,
            "bot_name": bot_name,
            "username": username,
            "status": "pending",
            "bot_id": None,
        }
    )
    await redis.setex(f"managed_pending:{pending_id}", PENDING_TTL, payload)
    # Username bo'yicha lookup (fallback)
    await redis.setex(f"managed_username:{username}", PENDING_TTL, pending_id)
    # Telegram user_id bo'yicha lookup (asosiy — username o'zgarishi mumkin)
    if telegram_user_id:
        await redis.setex(f"managed_tguser:{telegram_user_id}", PENDING_TTL, pending_id)
    return pending_id


async def get_pending(pending_id: str) -> dict | None:
    redis = await get_redis()
    raw = await redis.get(f"managed_pending:{pending_id}")
    return json.loads(raw) if raw else None


async def resolve_pending(
    username: str, telegram_user_id: int | None = None
) -> dict | None:
    """Telegram user_id bo'yicha (asosiy), keyin username bo'yicha (fallback) topadi."""
    redis = await get_redis()
    pending_id = None
    if telegram_user_id:
        pending_id = await redis.get(f"managed_tguser:{telegram_user_id}")
    if not pending_id:
        pending_id = await redis.get(f"managed_username:{username.lower()}")
    if not pending_id:
        return None
    return await get_pending(pending_id)


async def mark_pending_done(pending_id: str, bot_id: str) -> None:
    redis = await get_redis()
    raw = await redis.get(f"managed_pending:{pending_id}")
    if not raw:
        return
    data = json.loads(raw)
    data["status"] = "done"
    data["bot_id"] = bot_id
    # 5 daqiqa saqlab turadi — frontend oxirgi marta o'qishi uchun
    await redis.setex(f"managed_pending:{pending_id}", 300, json.dumps(data))


# ── Telegram API calls ────────────────────────────────────────────────────────


async def get_managed_bot_token(telegram_user_id: int) -> str:
    """
    getManagedBotToken — yangi bot tokenini manager bot orqali oladi.
    Parameter: user_id — managed bot'ning Telegram user ID si (bot.id in ManagedBotUpdated)
    Returns: token string
    """
    if not settings.MANAGER_BOT_TOKEN:
        raise ValueError("MANAGER_BOT_TOKEN sozlanmagan")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{settings.MANAGER_BOT_TOKEN}/getManagedBotToken",
            json={"user_id": telegram_user_id},
        )
        data = resp.json()
        if not data.get("ok"):
            raise ValueError(data.get("description", "Token olishda xato"))
        return data["result"]


async def setup_manager_webhook() -> bool:
    """Manager bot webhookini o'rnatadi. Bir marta chaqiriladi."""
    if not settings.MANAGER_BOT_TOKEN:
        return False
    webhook_url = f"{settings.WEBHOOK_BASE_URL}/webhook/manager"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{settings.MANAGER_BOT_TOKEN}/setWebhook",
            json={
                "url": webhook_url,
                "allowed_updates": ["managed_bot", "message"],
                "drop_pending_updates": True,
            },
        )
        return resp.json().get("ok", False)
