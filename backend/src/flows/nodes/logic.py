"""
Logic node handlers — conditions, delays, random splits.
Condition evaluation uses a safe expression engine (no eval()).
"""
from __future__ import annotations

import asyncio
import operator
import random
from typing import Any

from src.flows.nodes.registry import BaseNodeHandler

_OPS = {
    "eq": operator.eq,
    "ne": operator.ne,
    "gt": operator.gt,
    "gte": operator.ge,
    "lt": operator.lt,
    "lte": operator.le,
    "contains": lambda a, b: b in str(a),
    "not_contains": lambda a, b: b not in str(a),
    "starts_with": lambda a, b: str(a).startswith(str(b)),
    "ends_with": lambda a, b: str(a).endswith(str(b)),
    "is_empty": lambda a, _: not a,
    "is_not_empty": lambda a, _: bool(a),
}


def _resolve_value(source: dict, ctx: Any) -> Any:
    """Resolve a value from config — either literal, variable, or event field."""
    kind = source.get("type", "literal")
    if kind == "literal":
        return source.get("value")
    if kind == "variable":
        return ctx.get_var(source.get("name", ""))
    if kind == "event":
        return ctx.telegram_event.get(source.get("field", ""))
    if kind == "user":
        return ctx.telegram_event.get("user", {}).get(source.get("field", ""))
    return None


class ConditionHandler(BaseNodeHandler):
    """Evaluates a condition: field op value → true/false branch.
    Supports both the legacy {left/right} shape and the flat {field, operator, value} shape.
    """

    async def execute(self, config: dict, ctx: Any) -> Any:
        op_name = config.get("operator", "eq")
        op_fn = _OPS.get(op_name, operator.eq)

        # Flat shape from universal frontend
        if "field" in config:
            field = config["field"]
            # Resolve field from event/variables
            if field.startswith("var.") or config.get("variable_name"):
                var_key = config.get("variable_name") or field.replace("var.", "")
                left_val = ctx.get_var(var_key)
            elif "." in field:
                parts = field.split(".")
                val = ctx.telegram_event
                for p in parts:
                    val = val.get(p, {}) if isinstance(val, dict) else None
                left_val = val
            else:
                left_val = ctx.telegram_event.get(field)
            right_val = config.get("value", "")
        else:
            # Legacy nested shape
            left_val = _resolve_value(config.get("left", {}), ctx)
            right_val = _resolve_value(config.get("right", {}), ctx)

        try:
            result = op_fn(left_val, right_val)
        except (TypeError, ValueError):
            result = False

        return {"branch": "true" if result else "false", "result": result}


class IfElseHandler(BaseNodeHandler):
    """Multi-condition if/else with AND/OR logic."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        conditions = config.get("conditions", [])
        logic = config.get("logic", "and")
        results = []

        for cond in conditions:
            left_val = _resolve_value(cond.get("left", {}), ctx)
            right_val = _resolve_value(cond.get("right", {}), ctx)
            op_fn = _OPS.get(cond.get("operator", "eq"), operator.eq)
            try:
                results.append(op_fn(left_val, right_val))
            except (TypeError, ValueError):
                results.append(False)

        if logic == "and":
            passed = all(results)
        else:
            passed = any(results)

        return {"branch": "true" if passed else "false", "result": passed}


class DelayHandler(BaseNodeHandler):
    """Pause execution for N seconds/minutes."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        amount = config.get("amount", 0)
        unit = config.get("unit", "seconds")

        if unit == "minutes":
            amount = amount * 60
        elif unit == "hours":
            amount = amount * 3600

        # Cap at 5 minutes in execution (longer delays should use scheduling)
        amount = min(amount, 300)

        if amount > 0:
            await asyncio.sleep(amount)

        return {"delayed": amount}


class RandomSplitHandler(BaseNodeHandler):
    """Split traffic across branches with weighted probabilities."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        branches = config.get("branches", [])
        if not branches:
            return {"branch": "default"}

        weights = [b.get("weight", 1) for b in branches]
        names = [b.get("name", f"branch_{i}") for i, b in enumerate(branches)]

        chosen = random.choices(names, weights=weights, k=1)[0]
        return {"branch": chosen}


class LoopHandler(BaseNodeHandler):
    """Iterate over a list variable, executing downstream for each item."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        list_var = ctx.get_var(config.get("list_variable", ""), [])
        item_var = config.get("item_variable", "item")
        index_var = config.get("index_variable", "index")

        if not isinstance(list_var, list):
            return {"iterations": 0}

        max_iterations = min(len(list_var), config.get("max_iterations", 50))

        for i, item in enumerate(list_var[:max_iterations]):
            ctx.set_var(item_var, item)
            ctx.set_var(index_var, i)

        return {"iterations": max_iterations, "list": list_var}
