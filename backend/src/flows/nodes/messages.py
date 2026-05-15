"""
Universal Message handler — sends any Telegram content type from one node.
Config schema:
  content_type: str          — text | photo | video | animation | voice | audio |
                               document | sticker | location | contact | poll | media_group
  text: str                  — message text or caption (supports {{variable}} interpolation)
  parse_mode: str            — HTML | Markdown | MarkdownV2 | None
  media_url: str             — URL or file_id for media content
  media_file_id: str         — Telegram file_id
  media_source: str          — url | file_id | variable
  media_variable: str        — variable name holding file_id
  keyboard_type: str         — none | inline | reply | remove
  inline_buttons: list       — [[{text, callback_data, url}]]
  reply_buttons: list        — [["Yes", "No"]]
  resize_keyboard: bool
  one_time_keyboard: bool
  reply_to_message: bool
  disable_notification: bool
  protect_content: bool
  chat_id_override: str
"""
from __future__ import annotations

import re
from typing import Any

import structlog

from src.flows.nodes.registry import BaseNodeHandler

logger = structlog.get_logger(__name__)

_VAR_PATTERN = re.compile(r"\{\{([^}]+)\}\}")


def _interpolate(text: str, ctx: Any) -> str:
    def replacer(match: re.Match) -> str:
        key = match.group(1).strip()
        parts = key.split(".")
        if parts[0] == "user":
            return str(ctx.telegram_event.get("user", {}).get(parts[1] if len(parts) > 1 else "", ""))
        if parts[0] == "var":
            return str(ctx.get_var(parts[1] if len(parts) > 1 else key, ""))
        if parts[0] == "event":
            return str(ctx.telegram_event.get(parts[1] if len(parts) > 1 else "", ""))
        # bare name → try as variable
        return str(ctx.get_var(key, match.group(0)))
    return _VAR_PATTERN.sub(replacer, text)


def _get_bot(ctx: Any) -> Any:
    return ctx.get_var("__bot_instance__")


def _build_inline_keyboard(rows: list, ctx: Any):
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=_interpolate(btn.get("text", ""), ctx),
                    callback_data=btn.get("callback_data") or None,
                    url=btn.get("url") or None,
                )
                for btn in row
            ]
            for row in rows
        ]
    )


def _build_reply_keyboard(rows: list, resize: bool, one_time: bool):
    from aiogram.types import KeyboardButton, ReplyKeyboardMarkup
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=btn) for btn in row] for row in rows],
        resize_keyboard=resize,
        one_time_keyboard=one_time,
    )


class UniversalMessageHandler(BaseNodeHandler):
    async def execute(self, config: dict, ctx: Any) -> Any:
        bot = _get_bot(ctx)
        chat_id = config.get("chat_id_override") or ctx.telegram_event.get("chat_id")

        if not bot or not chat_id:
            # Return dry-run preview when no bot context (tests / builder preview)
            return {"dry_run": True, "config": config}

        chat_id = int(_interpolate(str(chat_id), ctx))
        ct = config.get("content_type", "text")
        text = _interpolate(config.get("text", ""), ctx)
        parse_mode = config.get("parse_mode", "HTML") or None
        if parse_mode == "None":
            parse_mode = None

        # Build reply markup
        kb_type = config.get("keyboard_type", "none")
        markup = None
        if kb_type == "inline":
            rows = config.get("inline_buttons", [])
            if rows:
                markup = _build_inline_keyboard(rows, ctx)
        elif kb_type == "reply":
            rows = config.get("reply_buttons", [])
            if rows:
                markup = _build_reply_keyboard(
                    rows,
                    config.get("resize_keyboard", True),
                    config.get("one_time_keyboard", False),
                )
        elif kb_type == "remove":
            from aiogram.types import ReplyKeyboardRemove
            markup = ReplyKeyboardRemove()

        common = dict(
            chat_id=chat_id,
            reply_markup=markup,
            disable_notification=config.get("disable_notification", False),
            protect_content=config.get("protect_content", False),
        )
        if config.get("reply_to_message"):
            common["reply_to_message_id"] = ctx.telegram_event.get("message_id")

        # Resolve media
        def _media():
            src = config.get("media_source", "url")
            if src == "file_id":
                return config.get("media_file_id", "")
            if src == "variable":
                return ctx.get_var(config.get("media_variable", ""), "")
            return _interpolate(config.get("media_url", ""), ctx)

        try:
            if ct == "text":
                msg = await bot.send_message(text=text or "​", parse_mode=parse_mode, **common)
            elif ct == "photo":
                msg = await bot.send_photo(photo=_media(), caption=text or None, parse_mode=parse_mode, has_spoiler=config.get("has_spoiler", False), **common)
            elif ct == "video":
                msg = await bot.send_video(video=_media(), caption=text or None, parse_mode=parse_mode, has_spoiler=config.get("has_spoiler", False), **common)
            elif ct == "animation":
                msg = await bot.send_animation(animation=_media(), caption=text or None, parse_mode=parse_mode, has_spoiler=config.get("has_spoiler", False), **common)
            elif ct == "voice":
                msg = await bot.send_voice(voice=_media(), caption=text or None, parse_mode=parse_mode, **common)
            elif ct == "audio":
                msg = await bot.send_audio(audio=_media(), caption=text or None, parse_mode=parse_mode, **common)
            elif ct == "document":
                msg = await bot.send_document(document=_media(), caption=text or None, parse_mode=parse_mode, **common)
            elif ct == "sticker":
                msg = await bot.send_sticker(sticker=_media(), **common)
            elif ct == "location":
                lat = float(config.get("latitude", 0))
                lon = float(config.get("longitude", 0))
                msg = await bot.send_location(latitude=lat, longitude=lon, **common)
            elif ct == "contact":
                msg = await bot.send_contact(
                    phone_number=config.get("phone_number", ""),
                    first_name=_interpolate(config.get("contact_first_name", ""), ctx),
                    **common,
                )
            elif ct == "poll":
                opts = [_interpolate(o, ctx) for o in config.get("poll_options", ["Yes", "No"])]
                msg = await bot.send_poll(
                    question=_interpolate(config.get("poll_question", ""), ctx),
                    options=opts,
                    is_anonymous=config.get("is_anonymous", True),
                    **common,
                )
            else:
                msg = await bot.send_message(text=text or "​", parse_mode=parse_mode, **common)

            return {"message_id": msg.message_id, "chat_id": chat_id}
        except Exception as exc:
            logger.error("message_node_failed", content_type=ct, error=str(exc))
            raise
