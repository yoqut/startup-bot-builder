"""
Universal Trigger handler — context-aware event matching.

Config schema (new context-based format):
  contexts:
    user:     { enabled: bool, events: list[str], command?: str, callback_pattern?: str, schedule_cron?: str }
    group:    { enabled: bool, events: list[str], ... }
    channel:  { enabled: bool, events: list[str], ... }
    business: { enabled: bool, events: list[str], ... }
  filters: list[Filter]      — global filters applied after context match
  ignore_bots: bool
  require_admin: bool
  skip_forwarded: bool

Legacy flat format (backwards compat):
  events: list[str]
  command: str
  callback_pattern: str
"""
from __future__ import annotations

import re
from typing import Any

from src.flows.nodes.registry import BaseNodeHandler

# Map Telegram chat types to context ids
_CHAT_CONTEXT = {
    "private":    "user",
    "group":      "group",
    "supergroup": "group",
    "channel":    "channel",
}

# Map Telegram update event types to our event ids
_EVENT_ALIASES: dict[str, str] = {
    "channel_post":         "channel_post",
    "edited_channel_post":  "edited_channel_post",
    "business_message":     "business_message",
    "business_connection":  "business_connection",
    "edited_business_message": "edited_business",
    "deleted_business_messages": "deleted_business",
    "new_chat_members":     "join",
    "left_chat_member":     "leave",
    "pinned_message":       "pinned",
    "message_reaction":     "reaction",
    "edited_message":       "edited",
}


def _resolve_event_id(event: dict) -> str:
    """Map incoming Telegram event to our event id string."""
    raw_type = event.get("type", "")
    if raw_type in _EVENT_ALIASES:
        return _EVENT_ALIASES[raw_type]
    # Media subtypes
    media_type = event.get("media_type")
    if media_type:
        return media_type  # "photo", "video", "voice", etc.
    if raw_type == "callback_query":
        return "callback"
    if raw_type == "inline_query":
        return "inline_query"
    return raw_type  # "message", "command", etc.


def _apply_filter(f: dict, event: dict) -> bool:
    field = f.get("field", "")
    operator = f.get("operator", "eq")
    expected = str(f.get("value", ""))

    parts = field.split(".")
    actual: Any = event
    for part in parts:
        actual = actual.get(part) if isinstance(actual, dict) else None
    actual_str = str(actual) if actual is not None else ""

    match operator:
        case "eq":           return actual_str == expected
        case "ne":           return actual_str != expected
        case "contains":     return expected in actual_str
        case "not_contains": return expected not in actual_str
        case "starts_with":  return actual_str.startswith(expected)
        case "ends_with":    return actual_str.endswith(expected)
        case "is_empty":     return actual_str == ""
        case "is_not_empty": return actual_str != ""
        case "regex":
            try:
                return bool(re.search(expected, actual_str))
            except re.error:
                return False
    return False


class UniversalTriggerHandler(BaseNodeHandler):
    """Matches Telegram events by context (user/group/channel/business) + event type + filters."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        return {"event": ctx.telegram_event, "triggered": True}

    def matches_event(self, config: dict, event: dict) -> bool:
        # Global guards
        if config.get("ignore_bots", True) and event.get("from", {}).get("is_bot"):
            return False
        if config.get("skip_forwarded") and event.get("forward_origin"):
            return False

        event_id = _resolve_event_id(event)
        chat_type = event.get("chat", {}).get("type", "private")
        context_id = _CHAT_CONTEXT.get(chat_type)

        # Detect business / channel context overrides
        raw_type = event.get("type", "")
        if raw_type in ("business_message", "edited_business_message",
                         "deleted_business_messages", "business_connection"):
            context_id = "business"
        elif raw_type in ("channel_post", "edited_channel_post"):
            context_id = "channel"

        contexts = config.get("contexts")

        # ── New context-based format ──────────────────────────────────────
        if contexts:
            if not context_id or context_id not in contexts:
                return False

            ctx_cfg = contexts[context_id]
            if not ctx_cfg.get("enabled", False):
                return False

            allowed_events: list[str] = ctx_cfg.get("events", [])
            if allowed_events and event_id not in allowed_events:
                return False

            # Per-context extras
            if event_id == "command":
                expected_cmd = ctx_cfg.get("command", "").lstrip("/")
                actual_cmd = event.get("command", "").lstrip("/")
                if expected_cmd and expected_cmd != actual_cmd:
                    return False

            if event_id == "callback":
                pattern = ctx_cfg.get("callback_pattern", "")
                if pattern:
                    cb = event.get("callback_data", "")
                    if not (cb == pattern or cb.startswith(pattern)):
                        return False

        # ── Legacy flat format (backwards compat) ─────────────────────────
        else:
            legacy_events: list[str] = config.get("events", [])
            if legacy_events and event_id not in legacy_events:
                return False

            if event_id == "command":
                expected = config.get("command", "").lstrip("/")
                if expected and expected != event.get("command", "").lstrip("/"):
                    return False

            if event_id == "callback":
                pattern = config.get("callback_pattern", "")
                if pattern:
                    cb = event.get("callback_data", "")
                    if not (cb == pattern or cb.startswith(pattern)):
                        return False

        # Global filters
        for f in config.get("filters", []):
            if not _apply_filter(f, event):
                return False

        return True
