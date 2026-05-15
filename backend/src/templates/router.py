"""Flow templates — pre-built flows for common use cases."""
from __future__ import annotations

from litestar import Router, get, post
from litestar.di import Provide

from src.core.security.deps import current_user

TEMPLATES = [
    {
        "id": "welcome-bot",
        "name": "Welcome Bot",
        "description": "Greet new users with a personalized message and menu",
        "category": "onboarding",
        "preview_url": None,
        "nodes": [
            {"id": "t1", "type": "custom", "position": {"x": 300, "y": 100},
             "data": {"label": "Start Command", "nodeType": "trigger_command", "config": {"command": "start"}}},
            {"id": "n1", "type": "custom", "position": {"x": 300, "y": 250},
             "data": {"label": "Welcome Message", "nodeType": "send_inline_keyboard",
                      "config": {"text": "👋 Hello {{user.first_name}}! Welcome to our bot.\n\nWhat would you like to do?",
                                 "buttons": [[{"text": "📚 Help", "callback_data": "help"}, {"text": "⚙️ Settings", "callback_data": "settings"}]]}}},
        ],
        "edges": [{"id": "e1", "source": "t1", "target": "n1"}],
    },
    {
        "id": "ai-assistant",
        "name": "AI Assistant",
        "description": "Intelligent bot that replies using OpenAI GPT",
        "category": "ai",
        "preview_url": None,
        "nodes": [
            {"id": "t1", "type": "custom", "position": {"x": 300, "y": 100},
             "data": {"label": "Any Message", "nodeType": "trigger_message", "config": {"match_type": "any"}}},
            {"id": "n1", "type": "custom", "position": {"x": 300, "y": 250},
             "data": {"label": "AI Reply", "nodeType": "ai_reply",
                      "config": {"system_prompt": "You are a helpful assistant.", "model": "gpt-4o-mini"}}},
        ],
        "edges": [{"id": "e1", "source": "t1", "target": "n1"}],
    },
    {
        "id": "lead-capture",
        "name": "Lead Capture Bot",
        "description": "Capture user info and save to CRM",
        "category": "sales",
        "preview_url": None,
        "nodes": [
            {"id": "t1", "type": "custom", "position": {"x": 300, "y": 50},
             "data": {"label": "/start", "nodeType": "trigger_command", "config": {"command": "start"}}},
            {"id": "n1", "type": "custom", "position": {"x": 300, "y": 200},
             "data": {"label": "Ask Name", "nodeType": "send_text",
                      "config": {"text": "Hi! What's your name?"}}},
            {"id": "n2", "type": "custom", "position": {"x": 300, "y": 350},
             "data": {"label": "Save Name", "nodeType": "var_set",
                      "config": {"key": "user_name", "value": {"type": "event", "field": "text"}}}},
            {"id": "n3", "type": "custom", "position": {"x": 300, "y": 500},
             "data": {"label": "Thank You", "nodeType": "send_text",
                      "config": {"text": "Thanks {{var.user_name}}! We'll be in touch. 🎉"}}},
        ],
        "edges": [
            {"id": "e1", "source": "t1", "target": "n1"},
            {"id": "e2", "source": "n1", "target": "n2"},
            {"id": "e3", "source": "n2", "target": "n3"},
        ],
    },
]


@get("/")
async def list_templates(user: dict) -> list[dict]:
    return [{k: v for k, v in t.items() if k not in ("nodes", "edges")} for t in TEMPLATES]


@get("/{template_id:str}")
async def get_template(template_id: str, user: dict) -> dict:
    for t in TEMPLATES:
        if t["id"] == template_id:
            return t
    from litestar.exceptions import NotFoundException
    raise NotFoundException("Template not found")


templates_router = Router(
    path="/api/v1/templates",
    route_handlers=[list_templates, get_template],
    dependencies={"user": Provide(current_user)},
)
