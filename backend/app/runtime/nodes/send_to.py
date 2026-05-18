import logging

import telebot.async_telebot as telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton

from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult

logger = logging.getLogger(__name__)


class SendToNode(BaseNode):
    """
    Sends a message to a specific chat_id (user / group / channel).
    chat_id can be a literal integer or a {{variable}} reference.
    Saves sent message_id to `last_sent_message_id` variable.
    """

    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        variables = dict(ctx.variables)
        bot = telebot.AsyncTeleBot(ctx.bot_token)

        raw_chat_id = self._render(
            str(self.config.get("chat_id", "")), variables
        ).strip()
        if not raw_chat_id:
            logger.warning("SendToNode: chat_id is empty")
            await bot.close_session()
            return ExecutionResult(next_node_id=None, variables=variables)

        try:
            target_chat_id = int(raw_chat_id)
        except ValueError:
            logger.warning("SendToNode: invalid chat_id '%s'", raw_chat_id)
            await bot.close_session()
            return ExecutionResult(next_node_id=None, variables=variables)

        msg_type = self.config.get("message_type", "text")
        text = self._render(self.config.get("text", ""), variables)
        parse_mode = self.config.get("parse_mode", "HTML")
        file_url = self.config.get("file_url", "")
        caption = self._render(self.config.get("caption", ""), variables)

        # Optional inline buttons
        buttons_cfg = self.config.get("buttons", [])
        markup = None
        if buttons_cfg:
            markup = InlineKeyboardMarkup()
            for btn in buttons_cfg:
                label = btn.get("label", "")
                url = btn.get("url", "")
                if url:
                    markup.add(InlineKeyboardButton(label, url=url))
                else:
                    cb = btn.get("callback_data", "noop")
                    markup.add(InlineKeyboardButton(label, callback_data=cb))

        try:
            if msg_type == "text":
                sent = await bot.send_message(
                    target_chat_id,
                    text or ".",
                    parse_mode=parse_mode,
                    reply_markup=markup,
                )
                variables["last_sent_message_id"] = sent.message_id
            elif msg_type == "photo":
                sent = await bot.send_photo(
                    target_chat_id, file_url, caption=caption or None
                )
                variables["last_sent_message_id"] = sent.message_id
            elif msg_type == "video":
                sent = await bot.send_video(
                    target_chat_id, file_url, caption=caption or None
                )
                variables["last_sent_message_id"] = sent.message_id
            elif msg_type == "audio":
                sent = await bot.send_audio(
                    target_chat_id, file_url, caption=caption or None
                )
                variables["last_sent_message_id"] = sent.message_id
            elif msg_type == "document":
                sent = await bot.send_document(
                    target_chat_id, file_url, caption=caption or None
                )
                variables["last_sent_message_id"] = sent.message_id
        except Exception as exc:
            logger.error("SendToNode: failed to send to %s: %s", target_chat_id, exc)

        await bot.close_session()
        return ExecutionResult(next_node_id=None, variables=variables)
