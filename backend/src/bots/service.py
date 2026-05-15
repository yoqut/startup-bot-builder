"""
Bot service — register, update, verify, and manage Telegram bots.
Token encryption uses Fernet (symmetric, authenticated encryption).
Webhook registration delegates to Telegram's Bot API.
"""
from __future__ import annotations

import uuid

import httpx
import structlog
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.bots.models import Bot, BotStatus
from src.bots.schemas import BotCreate, BotUpdate
from src.core.config.settings import settings

logger = structlog.get_logger(__name__)

# Derive a URL-safe base64 Fernet key from the 32-byte encryption key
_ENCRYPTION_KEY = settings.security.encryption_key.get_secret_value().encode()[:32]
import base64
_FERNET = Fernet(base64.urlsafe_b64encode(_ENCRYPTION_KEY.ljust(32)[:32]))


def _encrypt_token(token: str) -> str:
    return _FERNET.encrypt(token.encode()).decode()


def _decrypt_token(encrypted: str) -> str:
    try:
        return _FERNET.decrypt(encrypted.encode()).decode()
    except InvalidToken as e:
        raise ValueError("Failed to decrypt bot token") from e


class BotNotFoundError(Exception):
    pass


class BotTokenError(Exception):
    pass


class BotService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_bot(self, owner_id: uuid.UUID, data: BotCreate) -> Bot:
        # Verify token with Telegram API before saving
        bot_info = await self._verify_telegram_token(data.token)

        # Enforce per-user bot limit
        result = await self._db.execute(
            select(Bot)
            .where(Bot.owner_id == owner_id)
            .where(Bot.deleted_at.is_(None))
        )
        existing = result.scalars().all()
        max_bots = settings.security.max_bots_per_user
        if len(existing) >= max_bots:
            raise ValueError(f"Bot limit reached ({max_bots} bots per account)")

        bot = Bot(
            owner_id=owner_id,
            name=data.name or bot_info["first_name"],
            description=data.description,
            username=bot_info["username"],
            telegram_bot_id=bot_info["id"],
            token_encrypted=_encrypt_token(data.token),
            status=BotStatus.ACTIVE,
            can_join_groups=bot_info.get("can_join_groups", True),
            can_read_messages=bot_info.get("can_read_all_group_messages", False),
            supports_inline=bot_info.get("supports_inline_queries", False),
        )
        self._db.add(bot)
        await self._db.flush()

        await self._register_webhook(bot, data.token)

        logger.info("bot_created", bot_id=str(bot.id), username=bot.username)
        return bot

    async def get_bot(self, bot_id: uuid.UUID, owner_id: uuid.UUID) -> Bot:
        result = await self._db.execute(
            select(Bot)
            .where(Bot.id == bot_id)
            .where(Bot.owner_id == owner_id)
            .where(Bot.deleted_at.is_(None))
        )
        bot = result.scalar_one_or_none()
        if not bot:
            raise BotNotFoundError(f"Bot {bot_id} not found")
        return bot

    async def list_bots(self, owner_id: uuid.UUID) -> list[Bot]:
        result = await self._db.execute(
            select(Bot)
            .where(Bot.owner_id == owner_id)
            .where(Bot.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def update_bot(self, bot_id: uuid.UUID, owner_id: uuid.UUID, data: BotUpdate) -> Bot:
        bot = await self.get_bot(bot_id, owner_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(bot, field, value)
        return bot

    async def delete_bot(self, bot_id: uuid.UUID, owner_id: uuid.UUID) -> None:
        bot = await self.get_bot(bot_id, owner_id)
        from datetime import UTC, datetime
        bot.deleted_at = datetime.now(UTC)
        bot.status = BotStatus.PAUSED
        await self._remove_webhook(bot)

    async def get_decrypted_token(self, bot_id: uuid.UUID, owner_id: uuid.UUID) -> str:
        bot = await self.get_bot(bot_id, owner_id)
        return _decrypt_token(bot.token_encrypted)

    async def _verify_telegram_token(self, token: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.telegram.bot_api_url}/bot{token}/getMe",
                timeout=10.0,
            )
        data = resp.json()
        if not data.get("ok"):
            raise BotTokenError(f"Invalid bot token: {data.get('description', 'unknown error')}")
        return data["result"]

    async def _register_webhook(self, bot: Bot, token: str) -> None:
        webhook_secret = str(uuid.uuid4()).replace("-", "")
        webhook_url = f"{settings.telegram.webhook_base_url}/api/v1/webhook/{bot.id}"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.telegram.bot_api_url}/bot{token}/setWebhook",
                json={
                    "url": webhook_url,
                    "secret_token": webhook_secret,
                    "allowed_updates": [
                        "message", "callback_query", "inline_query",
                        "my_chat_member", "chat_member", "chat_join_request",
                        "message_reaction", "channel_post", "edited_message",
                    ],
                    "drop_pending_updates": True,
                    "max_connections": 100,
                },
                timeout=10.0,
            )

        if resp.json().get("ok"):
            bot.webhook_url = webhook_url
            bot.webhook_secret = webhook_secret
            bot.is_webhook_active = True
            logger.info("webhook_registered", bot_id=str(bot.id), url=webhook_url)

    async def _remove_webhook(self, bot: Bot) -> None:
        try:
            token = _decrypt_token(bot.token_encrypted)
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{settings.telegram.bot_api_url}/bot{token}/deleteWebhook",
                    timeout=5.0,
                )
            bot.is_webhook_active = False
        except Exception:
            logger.warning("failed_to_remove_webhook", bot_id=str(bot.id))
