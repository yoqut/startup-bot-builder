"""
Platform bot handler — @YoqutConstructor_bot
Handles /start, /help, /dashboard commands.
Sends WebApp button to users.
"""
from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

import httpx
import structlog

from src.core.config.settings import settings

logger = structlog.get_logger(__name__)

FRONTEND_URL = "https://a70a-213-230-71-129.ngrok-free.app"


async def handle_platform_update(update: dict[str, Any]) -> None:
    """Process incoming updates for the platform bot itself."""
    message = update.get("message", {})
    if not message:
        return

    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "")
    user = message.get("from", {})
    first_name = user.get("first_name", "there")

    if not chat_id:
        return

    if text.startswith("/start"):
        await send_webapp_welcome(chat_id, first_name)
    elif text.startswith("/help"):
        await send_help(chat_id)
    elif text.startswith("/dashboard"):
        await send_webapp_button(chat_id, "📊 Open Dashboard", FRONTEND_URL + "/dashboard")


async def send_webapp_welcome(chat_id: int, first_name: str) -> None:
    payload = {
        "chat_id": chat_id,
        "text": (
            f"👋 Salom, <b>{first_name}</b>!\n\n"
            "🚀 <b>BotBuilder</b> — Telegram botlarini kod yozmasdan yaratish platformasi.\n\n"
            "✨ <b>Nima qila olasiz:</b>\n"
            "• Drag & drop bilan bot flow yarating\n"
            "• AI yordamida avtomatik flow genaerate qiling\n"
            "• Realtime analytics ko'ring\n"
            "• 25+ node type: trigger, message, logic, AI, API\n\n"
            "👇 Platformani ochish uchun tugmani bosing:"
        ),
        "parse_mode": "HTML",
        "reply_markup": json.dumps({
            "inline_keyboard": [[
                {
                    "text": "🚀 Open BotBuilder",
                    "web_app": {"url": FRONTEND_URL}
                }
            ], [
                {
                    "text": "📖 Documentation",
                    "url": "https://t.me/YoqutConstructor_bot"
                }
            ]]
        })
    }
    await _send(payload)


async def send_help(chat_id: int) -> None:
    await _send({
        "chat_id": chat_id,
        "text": (
            "📚 <b>BotBuilder Yordam</b>\n\n"
            "🔹 /start — Platformani ochish\n"
            "🔹 /dashboard — Dashboard ga o'tish\n\n"
            "<b>Bot yaratish:</b>\n"
            "1. @BotFather dan yangi bot token oling\n"
            "2. BotBuilder da 'Add Bot' bosing\n"
            "3. Token kiriting\n"
            "4. Flow builder da drag & drop qiling\n"
            "5. Publish bosing — bot tayyor!"
        ),
        "parse_mode": "HTML",
    })


async def send_webapp_button(chat_id: int, text: str, url: str) -> None:
    await _send({
        "chat_id": chat_id,
        "text": text,
        "reply_markup": json.dumps({
            "inline_keyboard": [[{"text": text, "web_app": {"url": url}}]]
        })
    })


async def _send(payload: dict) -> None:
    token = settings.telegram.platform_bot_token.get_secret_value()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json=payload,
            )
    except Exception as exc:
        logger.error("platform_send_failed", error=str(exc))
