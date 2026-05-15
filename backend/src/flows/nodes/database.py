"""Variable node handlers — universal Set/Get/Update/Delete/Increment in one handler."""
from __future__ import annotations

from typing import Any

from src.flows.nodes.registry import BaseNodeHandler


class VariableHandler(BaseNodeHandler):
    """Universal variable node: set / get / update / delete / increment."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        action = config.get("action", "set")
        key = config.get("key", "")
        if not key:
            return {"error": "no key"}

        if action == "set":
            value = config.get("value", "")
            # Resolve if it looks like a variable reference
            if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
                var_name = value[2:-2].strip().replace("var.", "")
                value = ctx.get_var(var_name, "")
            ctx.set_var(key, value)
            return {"key": key, "value": value}

        if action == "get":
            value = ctx.get_var(key, config.get("default", ""))
            return {"key": key, "value": value}

        if action == "update":
            value = config.get("value", "")
            ctx.set_var(key, value)
            return {"key": key, "value": value}

        if action == "delete":
            ctx.set_var(key, None)
            return {"key": key, "deleted": True}

        if action == "increment":
            current = ctx.get_var(key, 0)
            by = config.get("increment_by", 1)
            try:
                new_val = float(current) + float(by)
            except (TypeError, ValueError):
                new_val = float(by)
            ctx.set_var(key, new_val)
            return {"key": key, "value": new_val}

        return {"error": f"unknown action: {action}"}


class VarSetHandler(BaseNodeHandler):
    async def execute(self, config: dict, ctx: Any) -> Any:
        key = config.get("key", "")
        value_config = config.get("value", {})
        value_type = value_config.get("type", "literal")
        value = value_config.get("value")

        if value_type == "event":
            value = ctx.telegram_event.get(value_config.get("field", ""))
        elif value_type == "variable":
            value = ctx.get_var(value_config.get("name", ""))

        if key:
            ctx.set_var(key, value)
        return {"key": key, "value": value}


class VarGetHandler(BaseNodeHandler):
    async def execute(self, config: dict, ctx: Any) -> Any:
        key = config.get("key", "")
        default = config.get("default")
        value = ctx.get_var(key, default)
        output_var = config.get("output_variable", key)
        if output_var:
            ctx.set_var(output_var, value)
        return {"key": key, "value": value}


class VarUpdateHandler(BaseNodeHandler):
    async def execute(self, config: dict, ctx: Any) -> Any:
        key = config.get("key", "")
        operation = config.get("operation", "set")
        operand = config.get("operand", 1)
        current = ctx.get_var(key, 0)

        if operation == "increment":
            try:
                new_value = float(current) + float(operand)
            except (TypeError, ValueError):
                new_value = operand
        elif operation == "decrement":
            try:
                new_value = float(current) - float(operand)
            except (TypeError, ValueError):
                new_value = 0
        elif operation == "append":
            if isinstance(current, list):
                new_value = current + [operand]
            else:
                new_value = [current, operand]
        elif operation == "toggle":
            new_value = not bool(current)
        else:
            new_value = operand

        ctx.set_var(key, new_value)
        return {"key": key, "old_value": current, "new_value": new_value}
