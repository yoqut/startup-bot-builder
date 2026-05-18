import asyncio
import logging

import telebot.async_telebot as telebot

from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult

logger = logging.getLogger(__name__)


class AutoDeleteNode(BaseNode):
    """
    Deletes a Telegram message after a delay.
    Uses `last_message_id` variable (set by MessageNode) unless overridden.
    Fire-and-forget via asyncio.create_task — does not block flow.
    """

    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        seconds = int(self.config.get("seconds", 5))
        msg_id_var = (self.config.get("message_id_var") or "last_message_id").strip()
        chat_id_override = self.config.get("chat_id_override", "")

        raw_msg_id = ctx.variables.get(msg_id_var)
        if raw_msg_id is None:
            logger.warning(
                "AutoDeleteNode: variable '%s' not found in variables", msg_id_var
            )
            return ExecutionResult(next_node_id=None, variables=ctx.variables)

        try:
            message_id = int(raw_msg_id)
        except ValueError, TypeError:
            logger.warning(
                "AutoDeleteNode: '%s' = %r is not an integer", msg_id_var, raw_msg_id
            )
            return ExecutionResult(next_node_id=None, variables=ctx.variables)

        chat_id = ctx.chat_id
        if chat_id_override:
            try:
                chat_id = int(self._render(str(chat_id_override), ctx.variables))
            except ValueError, TypeError:
                pass

        bot_token = ctx.bot_token

        async def _delete_later():
            await asyncio.sleep(seconds)
            try:
                bot = telebot.AsyncTeleBot(bot_token)
                await bot.delete_message(chat_id, message_id)
                await bot.close_session()
            except Exception as exc:
                logger.debug("AutoDeleteNode: delete failed: %s", exc)

        asyncio.create_task(_delete_later())

        return ExecutionResult(next_node_id=None, variables=ctx.variables)
