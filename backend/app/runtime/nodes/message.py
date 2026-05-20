import uuid

from telebot.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton,
    InputPollOption,
)

from app.bot import get_bot
from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult


def _build_markup(buttons: list[dict], layout: str):
    if not buttons:
        return None
    if layout == "reply":
        markup = ReplyKeyboardMarkup(resize_keyboard=True, one_time_keyboard=True)
        for btn in buttons:
            markup.add(KeyboardButton(btn["label"]))
        return markup
    markup = InlineKeyboardMarkup()
    for btn in buttons:
        if btn.get("url"):
            markup.add(InlineKeyboardButton(btn["label"], url=btn["url"]))
        else:
            markup.add(
                InlineKeyboardButton(
                    btn["label"],
                    callback_data=f"node:{btn.get('target_node_id', '')}",
                )
            )
    return markup


class MessageNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        bot = get_bot(ctx.bot_token)
        msg_type = self.config.get("message_type", "text")
        text = self._render(self.config.get("text", ""), ctx.variables)
        parse_mode = self.config.get("parse_mode", "HTML")
        buttons = self.config.get("buttons", [])
        layout = self.config.get("button_layout", "inline")
        on_callback = self.config.get("on_callback", "edit")
        markup = _build_markup(buttons, layout) if buttons else None
        wait = bool(buttons)

        should_edit = (
            on_callback == "edit"
            and ctx.callback_message_id is not None
            and layout == "inline"
            and msg_type == "text"
        )

        sent_message_id: int | None = None
        biz_id = ctx.business_connection_id

        if should_edit and not biz_id:
            try:
                sent = await bot.edit_message_text(
                    text or ".",
                    ctx.chat_id,
                    ctx.callback_message_id,
                    parse_mode=parse_mode,
                    reply_markup=markup,
                )
                if hasattr(sent, "message_id"):
                    sent_message_id = sent.message_id
            except Exception:
                pass
        else:
            send_kwargs: dict = {}
            if biz_id:
                send_kwargs["business_connection_id"] = biz_id

            if msg_type == "text":
                sent = await bot.send_message(
                    ctx.chat_id,
                    text or ".",
                    parse_mode=parse_mode,
                    reply_markup=markup,
                    **send_kwargs,
                )
                sent_message_id = sent.message_id

            elif msg_type == "photo":
                url = self.config.get("file_url", "")
                caption = self._render(self.config.get("caption", ""), ctx.variables)
                sent = await bot.send_photo(
                    ctx.chat_id, url,
                    caption=caption or None,
                    reply_markup=markup,
                    **send_kwargs,
                )
                sent_message_id = sent.message_id

            elif msg_type == "video":
                url = self.config.get("file_url", "")
                caption = self._render(self.config.get("caption", ""), ctx.variables)
                sent = await bot.send_video(
                    ctx.chat_id, url,
                    caption=caption or None,
                    reply_markup=markup,
                    **send_kwargs,
                )
                sent_message_id = sent.message_id

            elif msg_type == "audio":
                url = self.config.get("file_url", "")
                caption = self._render(self.config.get("caption", ""), ctx.variables)
                sent = await bot.send_audio(
                    ctx.chat_id, url,
                    caption=caption or None,
                    reply_markup=markup,
                    **send_kwargs,
                )
                sent_message_id = sent.message_id

            elif msg_type == "voice":
                url = self.config.get("file_url", "")
                sent = await bot.send_voice(
                    ctx.chat_id, url,
                    reply_markup=markup,
                    **send_kwargs,
                )
                sent_message_id = sent.message_id

            elif msg_type == "document":
                url = self.config.get("file_url", "")
                caption = self._render(self.config.get("caption", ""), ctx.variables)
                sent = await bot.send_document(
                    ctx.chat_id, url,
                    caption=caption or None,
                    reply_markup=markup,
                    **send_kwargs,
                )
                sent_message_id = sent.message_id

            elif msg_type == "poll":
                question = self._render(
                    self.config.get("poll_question", "Savol?"), ctx.variables
                )
                raw_options = self.config.get("poll_options", ["Ha", "Yo'q"])
                options: list[InputPollOption] = [InputPollOption(o) for o in raw_options]
                poll_type = self.config.get("poll_type", "regular")
                await bot.send_poll(
                    ctx.chat_id,
                    question,
                    [o.text for o in options],
                    type=poll_type,
                    **send_kwargs,
                )
                wait = False

        if sent_message_id:
            ctx.variables["last_message_id"] = sent_message_id

        if ctx.db and (text or msg_type != "text"):
            try:
                from app.models.conversation import ConversationMessage

                ctx.db.add(
                    ConversationMessage(
                        bot_id=uuid.UUID(ctx.bot_id),
                        telegram_id=ctx.telegram_user_id,
                        direction="out",
                        message_type=msg_type,
                        content=(text or self.config.get("caption", ""))[:4000] or None,
                    )
                )
                await ctx.db.commit()
            except Exception:
                pass

        handle: str = ""
        if wait and layout == "reply" and ctx.message_text:
            for i, btn in enumerate(buttons):
                if (
                    btn.get("label", "").strip().lower()
                    == ctx.message_text.strip().lower()
                ):
                    handle = f"btn_{i}"
                    wait = False
                    break

        return ExecutionResult(
            next_node_id=None if wait else self.config.get("next_node_id"),
            variables=dict(ctx.variables),
            wait_for_input=wait,
            handle=handle,
        )
