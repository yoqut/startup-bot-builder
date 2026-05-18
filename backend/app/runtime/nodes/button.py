import telebot.async_telebot as telebot
from typing import Optional
from telebot.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
    WebAppInfo,
)

from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult

KY_TYPE = Optional[ReplyKeyboardMarkup | InlineKeyboardMarkup | ReplyKeyboardRemove]


class ButtonNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        bot = telebot.AsyncTeleBot(ctx.bot_token)
        buttons = self.config.get("buttons", [])
        layout = self.config.get("button_layout") or self.config.get("layout", "inline")
        on_callback = self.config.get("on_callback", "edit")
        text = self._render(self.config.get("text", "Tanlang:"), ctx.variables)

        markup: KY_TYPE = _build_inline(buttons)

        should_edit = (
            on_callback == "edit"
            and ctx.callback_message_id is not None
            and layout == "inline"
        )

        if should_edit:
            try:
                await bot.edit_message_text(
                    text or ".",
                    ctx.chat_id,
                    ctx.callback_message_id,
                    reply_markup=markup,
                )
            except Exception:
                await bot.send_message(ctx.chat_id, text or ".", reply_markup=markup)
        else:
            await bot.send_message(ctx.chat_id, text or ".", reply_markup=markup)

        await bot.close_session()

        # For reply keyboard: if message_text matches a button label, route via handle
        wait = True
        handle = None
        if layout == "reply" and ctx.message_text:
            for i, btn in enumerate(buttons):
                if (
                    btn.get("label", "").strip().lower()
                    == ctx.message_text.strip().lower()
                ):
                    handle = f"btn_{i}"
                    wait = False
                    break

        return ExecutionResult(
            next_node_id=None,
            variables=ctx.variables,
            wait_for_input=wait,
            handle=handle or "default",
        )


def _build_reply(buttons: list[dict]) -> ReplyKeyboardMarkup:
    markup = ReplyKeyboardMarkup(resize_keyboard=True, one_time_keyboard=True)
    for btn in buttons:
        action = btn.get("action", "text")
        label = btn.get("label", "")
        if action == "request_location":
            markup.add(KeyboardButton(label, request_location=True))
        elif action == "request_contact":
            markup.add(KeyboardButton(label, request_contact=True))
        elif action == "web_app":
            url = btn.get("value", "")
            if url:
                markup.add(KeyboardButton(label, web_app=WebAppInfo(url=url)))
            else:
                markup.add(KeyboardButton(label))
        else:
            markup.add(KeyboardButton(label))
    return markup


def _build_inline(buttons: list[dict]) -> InlineKeyboardMarkup:
    markup = InlineKeyboardMarkup()
    for btn in buttons:
        action = btn.get("action", "node")
        label = btn.get("label", "")
        value = btn.get("value", "")

        if action == "url":
            markup.add(InlineKeyboardButton(label, url=value or "https://t.me"))
        elif action == "web_app":
            if value:
                markup.add(InlineKeyboardButton(label, web_app=WebAppInfo(url=value)))
        else:
            # callback → target node
            target = btn.get("target_node_id", value or "")
            markup.add(
                InlineKeyboardButton(
                    label,
                    callback_data=f"node:{target}",
                )
            )
    return markup
