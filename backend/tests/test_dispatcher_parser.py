"""
dispatcher._parse_update() — Telegram update obyektlarini normalizatsiya qilish.
"""
import pytest
from app.webhook.dispatcher import _parse_update


# ── Text xabar ────────────────────────────────────────────────────────────────

def test_parse_text_message():
    update = {"message": {
        "from": {"id": 1, "first_name": "Ali"},
        "chat": {"id": 1, "type": "private"},
        "text": "salom",
    }}
    r = _parse_update(update)
    assert r is not None
    assert r["type"] == "text"
    assert r["text"] == "salom"
    assert r["chat_type"] == "private"


# ── Command ───────────────────────────────────────────────────────────────────

def test_parse_command():
    update = {"message": {
        "from": {"id": 1},
        "chat": {"id": 1, "type": "private"},
        "text": "/start",
    }}
    r = _parse_update(update)
    assert r["type"] == "command"
    assert r["text"].startswith("/start")

def test_parse_command_strips_bot_mention():
    update = {"message": {
        "from": {"id": 1},
        "chat": {"id": 1, "type": "group"},
        "text": "/start@MyBot",
    }}
    r = _parse_update(update)
    assert r["type"] == "command"
    assert "@MyBot" not in r["text"]
    assert r["text"].startswith("/start")


# ── Media ─────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("field,expected_type", [
    ("photo",    "photo"),
    ("video",    "video"),
    ("audio",    "audio"),
    ("voice",    "voice"),
    ("document", "document"),
    ("sticker",  "sticker"),
    ("location", "location"),
    ("contact",  "contact"),
])
def test_parse_media_types(field, expected_type):
    update = {"message": {
        "from": {"id": 1},
        "chat": {"id": 1, "type": "private"},
        field: {"file_id": "abc"},
    }}
    r = _parse_update(update)
    assert r["type"] == expected_type


# ── Group events ──────────────────────────────────────────────────────────────

def test_parse_new_chat_member():
    update = {"message": {
        "from": {"id": 1},
        "chat": {"id": -100, "type": "group"},
        "new_chat_members": [{"id": 2}],
    }}
    r = _parse_update(update)
    assert r["type"] == "join_request"

def test_parse_left_chat_member():
    update = {"message": {
        "from": {"id": 1},
        "chat": {"id": -100, "type": "group"},
        "left_chat_member": {"id": 2},
    }}
    r = _parse_update(update)
    assert r["type"] == "left_member"


# ── Channel post ──────────────────────────────────────────────────────────────

def test_parse_channel_post_text():
    update = {"channel_post": {
        "chat": {"id": -1001, "type": "channel", "title": "Test Channel"},
        "text": "Yangilik",
    }}
    r = _parse_update(update)
    assert r is not None
    assert r["chat_type"] == "channel"
    assert r["type"] == "text"

def test_parse_channel_post_photo():
    update = {"channel_post": {
        "chat": {"id": -1001, "type": "channel", "title": "Ch"},
        "photo": [{"file_id": "abc"}],
    }}
    r = _parse_update(update)
    assert r["type"] == "photo"


# ── Callback query ────────────────────────────────────────────────────────────

def test_parse_callback_query():
    update = {"callback_query": {
        "from": {"id": 1},
        "data": "node:abc-123",
        "message": {"chat": {"id": 1, "type": "private"}, "message_id": 42},
    }}
    r = _parse_update(update)
    assert r is not None
    assert r["type"] == "callback"
    assert r["callback_data"] == "node:abc-123"
    assert r["callback_message_id"] == 42


# ── Unknown update ────────────────────────────────────────────────────────────

def test_parse_unknown_update_returns_none():
    r = _parse_update({"some_unknown_event": {}})
    assert r is None


# ── Xabar matni yo'q ──────────────────────────────────────────────────────────

def test_parse_message_no_text_or_media():
    update = {"message": {
        "from": {"id": 1},
        "chat": {"id": 1, "type": "private"},
    }}
    r = _parse_update(update)
    assert r is not None
    assert r["type"] == "any"
