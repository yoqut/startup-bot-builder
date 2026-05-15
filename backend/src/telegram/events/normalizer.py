"""
Normalize raw Telegram Update objects into our internal event format.
This layer decouples the flow engine from Telegram's API structure.
"""
from __future__ import annotations

from typing import Any


def normalize_telegram_update(update: dict[str, Any]) -> dict[str, Any] | None:
    """Convert a Telegram update dict to internal event format."""

    if "message" in update:
        return _normalize_message(update["message"])

    if "edited_message" in update:
        event = _normalize_message(update["edited_message"])
        if event:
            event["type"] = "edited_message"
        return event

    if "callback_query" in update:
        return _normalize_callback_query(update["callback_query"])

    if "channel_post" in update:
        return _normalize_channel_post(update["channel_post"])

    if "inline_query" in update:
        return _normalize_inline_query(update["inline_query"])

    if "my_chat_member" in update:
        return _normalize_chat_member(update["my_chat_member"])

    if "chat_member" in update:
        return _normalize_chat_member(update["chat_member"], is_my=False)

    if "message_reaction" in update:
        return _normalize_reaction(update["message_reaction"])

    return None


def _normalize_user(tg_user: dict) -> dict:
    return {
        "id": tg_user.get("id"),
        "username": tg_user.get("username"),
        "first_name": tg_user.get("first_name", ""),
        "last_name": tg_user.get("last_name"),
        "language_code": tg_user.get("language_code", "en"),
        "is_premium": tg_user.get("is_premium", False),
        "is_bot": tg_user.get("is_bot", False),
    }


def _normalize_message(msg: dict) -> dict | None:
    if not msg:
        return None

    event: dict[str, Any] = {
        "message_id": msg.get("message_id"),
        "chat_id": msg.get("chat", {}).get("id"),
        "chat_type": msg.get("chat", {}).get("type", "private"),
        "user": _normalize_user(msg.get("from", {})),
        "date": msg.get("date"),
        "reply_to": msg.get("reply_to_message", {}).get("message_id"),
    }

    # Detect message type
    if "text" in msg:
        text = msg["text"]
        if text.startswith("/"):
            cmd = text.split()[0].lstrip("/").split("@")[0]
            event["type"] = "command"
            event["command"] = cmd
            event["text"] = text
            event["args"] = text.split(maxsplit=1)[1] if len(text.split()) > 1 else ""
        else:
            event["type"] = "message"
            event["text"] = text
    elif "photo" in msg:
        event["type"] = "media"
        event["media_type"] = "photo"
        event["caption"] = msg.get("caption", "")
        event["file_id"] = msg["photo"][-1]["file_id"] if msg["photo"] else None
    elif "video" in msg:
        event["type"] = "media"
        event["media_type"] = "video"
        event["caption"] = msg.get("caption", "")
        event["file_id"] = msg["video"].get("file_id")
    elif "voice" in msg:
        event["type"] = "media"
        event["media_type"] = "voice"
        event["file_id"] = msg["voice"].get("file_id")
    elif "document" in msg:
        event["type"] = "media"
        event["media_type"] = "document"
        event["file_id"] = msg["document"].get("file_id")
        event["file_name"] = msg["document"].get("file_name")
    elif "audio" in msg:
        event["type"] = "media"
        event["media_type"] = "audio"
        event["file_id"] = msg["audio"].get("file_id")
    elif "location" in msg:
        event["type"] = "location"
        event["latitude"] = msg["location"].get("latitude")
        event["longitude"] = msg["location"].get("longitude")
    elif "sticker" in msg:
        event["type"] = "media"
        event["media_type"] = "sticker"
        event["file_id"] = msg["sticker"].get("file_id")
    elif "new_chat_members" in msg:
        event["type"] = "new_chat_member"
        event["new_members"] = [_normalize_user(u) for u in msg["new_chat_members"]]
    elif "left_chat_member" in msg:
        event["type"] = "left_chat_member"
        event["left_member"] = _normalize_user(msg["left_chat_member"])
    else:
        event["type"] = "message"
        event["text"] = ""

    return event


def _normalize_callback_query(cq: dict) -> dict:
    return {
        "type": "callback_query",
        "callback_query_id": cq.get("id"),
        "chat_id": cq.get("message", {}).get("chat", {}).get("id"),
        "message_id": cq.get("message", {}).get("message_id"),
        "user": _normalize_user(cq.get("from", {})),
        "callback_data": cq.get("data", ""),
        "inline_message_id": cq.get("inline_message_id"),
    }


def _normalize_channel_post(post: dict) -> dict:
    return {
        "type": "channel_post",
        "message_id": post.get("message_id"),
        "chat_id": post.get("chat", {}).get("id"),
        "chat_username": post.get("chat", {}).get("username"),
        "text": post.get("text", ""),
        "caption": post.get("caption", ""),
        "date": post.get("date"),
    }


def _normalize_inline_query(iq: dict) -> dict:
    return {
        "type": "inline_query",
        "inline_query_id": iq.get("id"),
        "user": _normalize_user(iq.get("from", {})),
        "query": iq.get("query", ""),
        "offset": iq.get("offset", ""),
    }


def _normalize_chat_member(cm: dict, is_my: bool = True) -> dict:
    new_status = cm.get("new_chat_member", {}).get("status")
    old_status = cm.get("old_chat_member", {}).get("status")

    event_type = "chat_member_join"
    if old_status in ("member", "administrator", "creator") and new_status == "left":
        event_type = "chat_member_leave"
    elif new_status in ("member", "restricted") and old_status in ("left", "kicked", None):
        event_type = "chat_member_join"

    return {
        "type": event_type,
        "chat_id": cm.get("chat", {}).get("id"),
        "chat_type": cm.get("chat", {}).get("type"),
        "user": _normalize_user(cm.get("new_chat_member", {}).get("user", {})),
        "old_status": old_status,
        "new_status": new_status,
        "is_my": is_my,
    }


def _normalize_reaction(reaction: dict) -> dict:
    return {
        "type": "message_reaction",
        "chat_id": reaction.get("chat", {}).get("id"),
        "message_id": reaction.get("message_id"),
        "user": _normalize_user(reaction.get("user", {})),
        "new_reactions": reaction.get("new_reaction", []),
        "old_reactions": reaction.get("old_reaction", []),
    }
