import logging

from litestar import Controller, post
from litestar.di import Provide
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.bot import Bot
from app.webhook.dispatcher import dispatch

logger = logging.getLogger(__name__)


class WebhookController(Controller):
    path = "/webhook"
    dependencies = {"db": Provide(get_db)}

    @post("/{token:str}")
    async def receive_update(self, token: str, data: dict, db: AsyncSession) -> dict:
        result = await db.execute(
            select(Bot)
            .where(Bot.webhook_url.contains(token), Bot.is_active == bool(True))
            .limit(1)
        )
        bot = result.scalar_one_or_none()
        if not bot:
            logger.warning(
                "Webhook: no active bot found for token fragment %r", token[:8]
            )
            return {"ok": False}

        try:
            await dispatch(db, str(bot.id), bot.token, data)
        except Exception:
            logger.exception("Webhook dispatch error for bot %s", bot.id)
        return {"ok": True}

    @post("/manager")
    async def manager_update(self, data: dict, db: AsyncSession) -> dict:
        """
        Manager bot webhogi — managed_bot, pre_checkout_query, successful_payment.
        """
        try:
            # Payment updatelar (pre_checkout_query, successful_payment)
            if "pre_checkout_query" in data or (
                "message" in data and "successful_payment" in data["message"]
            ):
                await _handle_payment_update(db, data)
            else:
                await _handle_manager_update(db, data)
        except Exception:
            logger.exception("Manager webhook error")
        return {"ok": True}


async def _handle_payment_update(db: AsyncSession, update: dict) -> None:
    """pre_checkout_query va successful_payment updatelarini qayta ishlash."""
    from app.api.v1.payments.service import handle_pre_checkout, handle_successful_payment

    if "pre_checkout_query" in update:
        await handle_pre_checkout(db, update["pre_checkout_query"])
    elif "message" in update and "successful_payment" in update["message"]:
        await handle_successful_payment(db, update["message"])


async def _handle_manager_update(db: AsyncSession, update: dict) -> None:
    """
    managed_bot update:
    {
      "update_id": ...,
      "managed_bot": {
        "user": { "id": 123, "first_name": "...", ... },   # kim yaratdi
        "bot":  { "id": 456789, "username": "MyShopBot", ...}  # yaratilgan bot
      }
    }
    """
    managed = update.get("managed_bot")
    if not managed:
        return

    tg_bot = managed.get("bot", {})
    tg_user = managed.get("user", {})

    bot_tg_id: int = tg_bot.get("id")
    bot_username: str = (tg_bot.get("username") or "").lower()

    if not bot_tg_id or not bot_username:
        logger.warning("Manager update: missing bot id/username in %s", managed)
        return

    from app.services.managed_bots import (
        get_managed_bot_token,
        resolve_pending,
        mark_pending_done,
    )
    from app.api.v1.bots.service import create_bot, set_webhook

    # 1. Pending yozuvni topish — avval tg_user_id, keyin username bilan
    tg_user_id: int = tg_user.get("id")
    pending = await resolve_pending(bot_username, tg_user_id)
    if not pending:
        logger.warning(
            "Manager update: no pending for @%s (tg_user=%s)", bot_username, tg_user_id
        )
        return

    pending_id = pending["pending_id"]
    user_id = pending["user_id"]
    bot_name = pending["bot_name"]

    # 2. getManagedBotToken orqali tokenni olish
    try:
        token = await get_managed_bot_token(bot_tg_id)
    except Exception as e:
        logger.error("getManagedBotToken failed for bot_id=%s: %s", bot_tg_id, e)
        return

    # 3. Botni DB ga qo'shish
    try:
        bot = await create_bot(db, user_id, bot_name, token)
    except Exception as e:
        logger.error("create_bot failed for user=%s: %s", user_id, e)
        return

    # 4. Webhookni o'rnatish
    try:
        await set_webhook(db, bot)
    except Exception as e:
        logger.warning("set_webhook failed: %s", e)

    # 5. Pending ni 'done' qilish — frontend polling ko'radi
    await mark_pending_done(pending_id, str(bot.id))
    logger.info(
        "Managed bot created: @%s → bot_id=%s user=%s", bot_username, bot.id, user_id
    )
