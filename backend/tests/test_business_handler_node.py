"""
BusinessHandlerNode.matches() — eski trigger string va yangi triggers[]
"""
import pytest
from app.runtime.nodes.business_handler import BusinessHandlerNode


def node(config: dict) -> BusinessHandlerNode:
    return BusinessHandlerNode("n1", config)

MSG = {"msg_type": "text", "text": "salom", "is_owner_message": False}
CMD = {"msg_type": "command", "text": "/start", "is_owner_message": False}


# ── Eski format (trigger: string) — backward compat ──────────────────────────

def test_legacy_trigger_any():
    assert node({"trigger": "any"}).matches("business_message", MSG)

def test_legacy_trigger_text():
    assert node({"trigger": "text"}).matches("business_message", MSG)
    assert not node({"trigger": "text"}).matches("business_message", {**MSG, "msg_type": "photo"})

def test_legacy_trigger_connected():
    assert node({"trigger": "connected"}).matches("business_connected", {})
    assert not node({"trigger": "connected"}).matches("business_disconnected", {})

def test_legacy_trigger_disconnected():
    assert node({"trigger": "disconnected"}).matches("business_disconnected", {})

def test_legacy_connection_trigger_no_match_message():
    assert not node({"trigger": "connected"}).matches("business_message", MSG)


# ── Yangi format (triggers: list) ─────────────────────────────────────────────

def test_triggers_any():
    assert node({"triggers": ["any"]}).matches("business_message", MSG)

def test_triggers_text():
    assert node({"triggers": ["text"]}).matches("business_message", MSG)

def test_triggers_multi_text_and_photo():
    n = node({"triggers": ["text", "photo"]})
    assert n.matches("business_message", {**MSG, "msg_type": "text"})
    assert n.matches("business_message", {**MSG, "msg_type": "photo"})
    assert not n.matches("business_message", {**MSG, "msg_type": "video"})

def test_triggers_connected_and_disconnected():
    n = node({"triggers": ["connected", "disconnected"]})
    assert n.matches("business_connected", {})
    assert n.matches("business_disconnected", {})
    assert not n.matches("business_message", MSG)

def test_triggers_connected_only():
    n = node({"triggers": ["connected"]})
    assert n.matches("business_connected", {})
    assert not n.matches("business_disconnected", {})
    assert not n.matches("business_message", MSG)

def test_triggers_command_with_filter():
    n = node({"triggers": ["command"], "commands": ["/start"]})
    assert n.matches("business_message", CMD)
    assert not n.matches("business_message", {**CMD, "text": "/stop"})

def test_triggers_command_no_filter():
    n = node({"triggers": ["command"], "commands": []})
    assert n.matches("business_message", CMD)

def test_triggers_text_with_conditions():
    n = node({
        "triggers": ["text"],
        "conditions": [{"type": "exact", "value": "salom"}],
    })
    assert n.matches("business_message", MSG)
    assert not n.matches("business_message", {**MSG, "text": "boshqa"})

def test_triggers_multi_includes_any():
    n = node({"triggers": ["any", "text"]})
    assert n.matches("business_message", {**MSG, "msg_type": "photo"})


# ── sender_type filter ────────────────────────────────────────────────────────

def test_sender_type_customer_blocks_owner():
    n = node({"triggers": ["any"], "sender_type": "customer"})
    assert not n.matches("business_message", {**MSG, "is_owner_message": True})
    assert n.matches("business_message", {**MSG, "is_owner_message": False})

def test_sender_type_owner_blocks_customer():
    n = node({"triggers": ["any"], "sender_type": "owner"})
    assert n.matches("business_message", {**MSG, "is_owner_message": True})
    assert not n.matches("business_message", {**MSG, "is_owner_message": False})

def test_sender_type_any_passes_all():
    n = node({"triggers": ["any"], "sender_type": "any"})
    assert n.matches("business_message", {**MSG, "is_owner_message": True})
    assert n.matches("business_message", {**MSG, "is_owner_message": False})


# ── connection_filter ─────────────────────────────────────────────────────────

def test_connection_filter_match():
    n = node({"triggers": ["any"], "connection_filter": "conn123"})
    assert n.matches("business_message", {**MSG, "business_connection_id": "conn123"})

def test_connection_filter_no_match():
    n = node({"triggers": ["any"], "connection_filter": "conn123"})
    assert not n.matches("business_message", {**MSG, "business_connection_id": "other"})

def test_connection_filter_empty_passes_all():
    n = node({"triggers": ["any"], "connection_filter": ""})
    assert n.matches("business_message", {**MSG, "business_connection_id": "anything"})


# ── Non-business update type ──────────────────────────────────────────────────

def test_non_business_update_rejected():
    assert not node({"triggers": ["any"]}).matches("text", MSG)
    assert not node({"triggers": ["any"]}).matches("command", MSG)
