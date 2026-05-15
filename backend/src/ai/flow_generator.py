"""
AI Flow Generator — turns natural language descriptions into flow graphs.
"Create a sales bot" → structured flow with nodes, edges, config.

Uses structured output (JSON mode) to ensure valid graph schema.
Two-phase generation:
1. Plan: understand intent, determine flow structure
2. Generate: output node+edge JSON
"""
from __future__ import annotations

import uuid
from typing import Any

import structlog
from openai import AsyncOpenAI

from src.core.config.settings import settings

logger = structlog.get_logger(__name__)

GENERATION_SYSTEM_PROMPT = """You are an expert Telegram bot flow designer.
Given a user's description, generate a complete bot flow as JSON.

Available node types:
Triggers: trigger_message, trigger_command, trigger_callback, trigger_media, trigger_join
Messages: send_text, send_photo, send_inline_keyboard, send_reply_keyboard, edit_message, delete_message
Logic: condition, if_else, delay, random_split, loop
AI: ai_reply, ai_moderation, ai_intent, ai_summarize
Database: var_set, var_get, var_update
API: http_request, webhook_call
Analytics: track_event, increment_counter

Output valid JSON with this structure:
{
  "name": "flow name",
  "description": "flow description",
  "nodes": [
    {
      "id": "unique_id",
      "node_type": "trigger_command",
      "label": "Start Command",
      "position": {"x": 100, "y": 100},
      "config": {}
    }
  ],
  "edges": [
    {
      "source": "node_id_1",
      "target": "node_id_2",
      "source_handle": null,
      "label": null
    }
  ]
}

Rules:
- Always start with a trigger node
- Position nodes logically (triggers at top, left to right flow)
- Use meaningful labels
- Configure nodes appropriately for the use case
- Include error handling where appropriate
"""


class AIFlowGenerator:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai.api_key.get_secret_value())

    async def generate_flow(
        self,
        description: str,
        bot_context: dict | None = None,
    ) -> dict[str, Any]:
        """Generate a complete flow graph from a natural language description."""

        context_str = ""
        if bot_context:
            context_str = f"\nBot context: {bot_context}"

        messages = [
            {"role": "system", "content": GENERATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Create a bot flow for: {description}{context_str}",
            },
        ]

        response = await self._client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=3000,
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        import json
        try:
            flow_data = json.loads(response.choices[0].message.content or "{}")
        except json.JSONDecodeError:
            raise ValueError("AI generated invalid JSON flow structure")

        # Validate and normalize
        return self._normalize_flow(flow_data)

    async def suggest_improvements(
        self,
        flow_json: dict,
        user_goal: str | None = None,
    ) -> list[dict]:
        """Analyze existing flow and suggest optimizations."""
        import json

        prompt = (
            f"Analyze this bot flow and suggest specific improvements:\n"
            f"{json.dumps(flow_json, indent=2)}\n"
            f"{'Goal: ' + user_goal if user_goal else ''}\n\n"
            "Return JSON array of suggestions: "
            '[{"title": "...", "description": "...", "priority": "high|medium|low"}]'
        )

        response = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.5,
            response_format={"type": "json_object"},
        )

        try:
            data = json.loads(response.choices[0].message.content or "[]")
            return data if isinstance(data, list) else data.get("suggestions", [])
        except json.JSONDecodeError:
            return []

    async def generate_node_config(
        self,
        node_type: str,
        context: str,
    ) -> dict:
        """Auto-fill node configuration based on context."""
        import json

        prompt = (
            f"Generate optimal configuration for a '{node_type}' node in a Telegram bot.\n"
            f"Context: {context}\n"
            "Return only the config JSON object for this node type."
        )

        response = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.2,
            response_format={"type": "json_object"},
        )

        try:
            return json.loads(response.choices[0].message.content or "{}")
        except json.JSONDecodeError:
            return {}

    def _normalize_flow(self, raw: dict) -> dict:
        """Ensure all nodes have valid UUIDs and positions."""
        nodes = raw.get("nodes", [])
        edges = raw.get("edges", [])

        # Ensure unique IDs
        id_map: dict[str, str] = {}
        for node in nodes:
            old_id = node.get("id", str(uuid.uuid4()))
            new_id = str(uuid.uuid4())
            id_map[old_id] = new_id
            node["id"] = new_id

            if "position" not in node:
                node["position"] = {"x": 100, "y": 100}

        # Remap edge source/target
        for edge in edges:
            edge["source"] = id_map.get(edge.get("source", ""), edge.get("source", ""))
            edge["target"] = id_map.get(edge.get("target", ""), edge.get("target", ""))
            edge["id"] = str(uuid.uuid4())

        return {
            "name": raw.get("name", "AI Generated Flow"),
            "description": raw.get("description", ""),
            "nodes": nodes,
            "edges": edges,
        }
