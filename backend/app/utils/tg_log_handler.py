"""
Telegram logging handler.

Har qanday ERROR/CRITICAL xato yuzaga kelganda,
MANAGER_BOT_TOKEN orqali belgilangan chat_idga batafsil xabar yuboradi.

Ishlatish:
    from app.utils.tg_log_handler import setup_telegram_log_handler
    setup_telegram_log_handler()   # main.py da, app yaratilishidan oldin
"""

from __future__ import annotations

import asyncio
import logging
import os
import platform
import sys
import traceback
from datetime import datetime, timezone
from typing import Optional

import httpx


# ── Config ────────────────────────────────────────────────────────────────────

ALERT_CHAT_ID: int = 1230394567  # YoqutConstructor xato logi boruvchi chat
MIN_LEVEL: int = logging.ERROR  # ERROR va CRITICAL


# ── Formatter ─────────────────────────────────────────────────────────────────


class TelegramFormatter(logging.Formatter):
    ICONS = {
        logging.ERROR: "🔴",
        logging.CRITICAL: "💀",
        logging.WARNING: "🟡",
    }

    def format(self, record: logging.LogRecord) -> str:
        icon = self.ICONS.get(record.levelno, "⚠️")
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        lines: list[str] = [
            f"{icon} <b>BotBuilder xatosi</b>",
            f"<code>{now}</code>",
            "",
            f"📌 <b>Level:</b>  {record.levelname}",
            f"📂 <b>Logger:</b> {record.name}",
            f"📄 <b>Fayl:</b>   {record.pathname}:{record.lineno}",
            f"⚙️  <b>Funksiya:</b> {record.funcName}",
            "",
            "💬 <b>Xabar:</b>",
            f"<code>{self._esc(record.getMessage())[:800]}</code>",
        ]

        if record.exc_info:
            tb = "".join(traceback.format_exception(*record.exc_info))
            lines += [
                "",
                "🔍 <b>Traceback:</b>",
                f"<pre>{self._esc(tb[-2000:])}</pre>",
            ]

        lines += [
            "",
            f"🖥 <b>Host:</b> {platform.node()}",
            f"🐍 <b>Python:</b> {sys.version.split()[0]}",
        ]

        return "\n".join(lines)

    @staticmethod
    def _esc(text: str) -> str:
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ── Async sender (fire-and-forget) ────────────────────────────────────────────


async def _send_to_telegram(token: str, chat_id: int, text: str) -> None:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )
    except Exception:
        pass  # logging handler hech qachon exception ko'tarmasligi kerak


def _fire_and_forget(token: str, chat_id: int, text: str) -> None:
    """Event loop mavjud bo'lsa — task qo'sh, bo'lmasa — yangi loop ochib yubot."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_send_to_telegram(token, chat_id, text))
    except RuntimeError:
        # Sync kontekst (worker process yoki startup)
        asyncio.run(_send_to_telegram(token, chat_id, text))


# ── Handler ───────────────────────────────────────────────────────────────────


class TelegramLogHandler(logging.Handler):
    """
    Python logging.Handler — ERROR/CRITICAL xatolarni Telegramga yuboradi.
    Handler o'zi HECH QACHON exception ko'tarmaydi.
    """

    def __init__(self, token: str, chat_id: int, level: int = MIN_LEVEL) -> None:
        super().__init__(level)
        self.token = token
        self.chat_id = chat_id
        self.setFormatter(TelegramFormatter())

    def emit(self, record: logging.LogRecord) -> None:
        # Telegram API logi o'zi chaqirishdan loop hosil bo'lmasligi uchun filtr
        if record.name.startswith("httpx") or record.name.startswith("hpack"):
            return
        try:
            text = self.format(record)
            _fire_and_forget(self.token, self.chat_id, text)
        except Exception:
            self.handleError(record)


# ── Setup function ────────────────────────────────────────────────────────────


def setup_telegram_log_handler(
    token: Optional[str] = None,
    chat_id: Optional[int] = None,
    level: int = MIN_LEVEL,
) -> None:
    """
    Root logger ga TelegramLogHandler ulaydi.
    token/chat_id ko'rsatilmasa, env o'zgaruvchilardan oladi.
    """
    _token = token or os.getenv("MANAGER_BOT_TOKEN", "")
    _chat = chat_id or ALERT_CHAT_ID

    if not _token:
        logging.getLogger(__name__).warning(
            "TelegramLogHandler: MANAGER_BOT_TOKEN topilmadi — Telegram logi o'chirilgan"
        )
        return

    handler = TelegramLogHandler(token=_token, chat_id=_chat, level=level)

    root = logging.getLogger()
    # Bir necha marta chaqirilganda duplikat handler qo'shmasligi uchun
    if not any(isinstance(h, TelegramLogHandler) for h in root.handlers):
        root.addHandler(handler)
        logging.getLogger(__name__).info(
            "TelegramLogHandler faollashtirildi → chat_id=%s", _chat
        )
