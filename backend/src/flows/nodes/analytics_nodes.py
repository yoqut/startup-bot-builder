"""Analytics node handlers — event tracking, counters, conversions."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog

from src.flows.nodes.registry import BaseNodeHandler

logger = structlog.get_logger(__name__)


class TrackEventHandler(BaseNodeHandler):
    async def execute(self, config: dict, ctx: Any) -> Any:
        event_name = config.get("event_name", "custom_event")

        # Support both structured dict and raw JSON string (from frontend)
        import json
        raw = config.get("properties_json", "")
        if raw:
            try:
                properties = json.loads(raw)
            except (ValueError, TypeError):
                properties = {}
        else:
            properties = config.get("properties", {})

        resolved = {
            k: ctx.get_var(v.replace("{{var.", "").replace("}}", "")) if "{{var." in str(v) else v
            for k, v in properties.items()
        }

        payload = {
            "bot_id": str(ctx.bot_id),
            "execution_id": str(ctx.execution_id),
            "event": event_name,
            "user_id": ctx.telegram_event.get("user", {}).get("id"),
            "properties": resolved,
            "ts": datetime.now(UTC).isoformat(),
        }

        logger.info("analytics_event", **payload)
        return {"tracked": event_name, "properties": resolved}


class IncrementCounterHandler(BaseNodeHandler):
    async def execute(self, config: dict, ctx: Any) -> Any:
        counter_name = config.get("counter_name", "counter")
        increment_by = config.get("increment_by", 1)

        current = ctx.get_var(f"__counter_{counter_name}__", 0)
        new_value = current + increment_by
        ctx.set_var(f"__counter_{counter_name}__", new_value)

        return {"counter": counter_name, "value": new_value}
