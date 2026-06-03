"""
HandlerNode.matches() — barcha trigger turlarini tekshiradi.
"""
import pytest
from app.runtime.nodes.handler import HandlerNode, _check_condition


def node(config: dict) -> HandlerNode:
    return HandlerNode("n1", config)


# ── trigger = any ─────────────────────────────────────────────────────────────

def test_any_matches_text():
    assert node({"trigger": "any"}).matches("text", {"text": "salom"})

def test_any_matches_photo():
    assert node({"trigger": "any"}).matches("photo", {})

def test_any_matches_command():
    assert node({"trigger": "any"}).matches("command", {"text": "/start"})


# ── trigger = command ─────────────────────────────────────────────────────────

def test_command_no_filter_matches_any_command():
    assert node({"trigger": "command"}).matches("command", {"text": "/help"})

def test_command_filter_matches():
    n = node({"trigger": "command", "commands": ["/start", "/help"]})
    assert n.matches("command", {"text": "/start"})
    assert n.matches("command", {"text": "/help arg"})

def test_command_filter_no_match():
    n = node({"trigger": "command", "commands": ["/start"]})
    assert not n.matches("command", {"text": "/stop"})

def test_command_does_not_match_text_update():
    assert not node({"trigger": "command"}).matches("text", {"text": "hello"})


# ── trigger = text ────────────────────────────────────────────────────────────

def test_text_no_conditions_matches_all():
    assert node({"trigger": "text"}).matches("text", {"text": "anything"})

def test_text_exact_match():
    n = node({"trigger": "text", "conditions": [{"type": "exact", "value": "salom"}]})
    assert n.matches("text", {"text": "salom"})
    assert not n.matches("text", {"text": "hello"})

def test_text_contains():
    n = node({"trigger": "text", "conditions": [{"type": "contains", "value": "bot"}]})
    assert n.matches("text", {"text": "botga xabar"})
    assert not n.matches("text", {"text": "salom"})

def test_text_starts_with():
    n = node({"trigger": "text", "conditions": [{"type": "starts_with", "value": "salom"}]})
    assert n.matches("text", {"text": "salom dunyo"})
    assert not n.matches("text", {"text": "dunyo salom"})

def test_text_ends_with():
    n = node({"trigger": "text", "conditions": [{"type": "ends_with", "value": "kerak"}]})
    assert n.matches("text", {"text": "yordam kerak"})

def test_text_in_list():
    n = node({"trigger": "text", "conditions": [{"type": "in_list", "value": ["ha", "yo'q"]}]})
    assert n.matches("text", {"text": "ha"})
    assert not n.matches("text", {"text": "balki"})

def test_text_regex():
    n = node({"trigger": "text", "conditions": [{"type": "regex", "value": r"^\d+$"}]})
    assert n.matches("text", {"text": "12345"})
    assert not n.matches("text", {"text": "abc"})

def test_text_regex_invalid_pattern():
    n = node({"trigger": "text", "conditions": [{"type": "regex", "value": "[invalid"}]})
    assert not n.matches("text", {"text": "anything"})

def test_text_condition_mode_all():
    n = node({
        "trigger": "text",
        "condition_mode": "all",
        "conditions": [
            {"type": "contains", "value": "salom"},
            {"type": "contains", "value": "dunyo"},
        ]
    })
    assert n.matches("text", {"text": "salom dunyo"})
    assert not n.matches("text", {"text": "salom"})

def test_text_condition_mode_any():
    n = node({
        "trigger": "text",
        "condition_mode": "any",
        "conditions": [
            {"type": "exact", "value": "ha"},
            {"type": "exact", "value": "yo'q"},
        ]
    })
    assert n.matches("text", {"text": "ha"})
    assert n.matches("text", {"text": "yo'q"})
    assert not n.matches("text", {"text": "balki"})


# ── trigger = photo/video/etc ─────────────────────────────────────────────────

@pytest.mark.parametrize("trigger", ["photo", "video", "audio", "voice", "document", "sticker", "location", "contact"])
def test_media_trigger_matches(trigger):
    assert node({"trigger": trigger}).matches(trigger, {})

def test_media_trigger_no_match_wrong_type():
    assert not node({"trigger": "photo"}).matches("video", {})


# ── chat_type filter ──────────────────────────────────────────────────────────

def test_chat_type_private_filter():
    n = node({"trigger": "any", "chat_type": "private"})
    assert n.matches("text", {"chat_type": "private", "text": "hi"})
    assert not n.matches("text", {"chat_type": "group", "text": "hi"})

def test_chat_type_group_matches_supergroup():
    n = node({"trigger": "any", "chat_type": "group"})
    assert n.matches("text", {"chat_type": "group", "text": "hi"})
    assert n.matches("text", {"chat_type": "supergroup", "text": "hi"})
    assert not n.matches("text", {"chat_type": "private", "text": "hi"})


# ── join_request / left_member ────────────────────────────────────────────────

def test_join_request_matches():
    assert node({"trigger": "join_request"}).matches("join_request", {})

def test_left_member_matches():
    assert node({"trigger": "left_member"}).matches("left_member", {})


# ── _check_condition ──────────────────────────────────────────────────────────

def test_check_condition_any():
    assert _check_condition({"type": "any"}, "anything")

def test_check_condition_unknown_type():
    assert not _check_condition({"type": "unknown_type", "value": "x"}, "x")
