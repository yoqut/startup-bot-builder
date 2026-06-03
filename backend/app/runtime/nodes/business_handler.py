import re

from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult


class BusinessHandlerNode(BaseNode):
    """
    Trigger node for Telegram Business Chat.
    Supports the same message subtypes as HandlerNode (command, text, photo, …)
    plus connection events (connected, disconnected).

    Config keys:
      trigger           - "any"|"text"|"command"|"photo"|...|"connected"|"disconnected"
      sender_type       - "customer" | "owner" | "any"
                          "customer"  → only messages from the other person (default)
                          "owner"     → only messages the business account owner writes
                          "any"       → both sides (legacy behaviour)
      commands          - list of /commands (when trigger=="command")
      conditions        - text match conditions (when trigger=="text")
      condition_mode    - "any" | "all"
      connection_filter - optional specific connection_id to match
      save_as           - variable name to store incoming text
    """

    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        variables = dict(ctx.variables)
        save_as = self.config.get("save_as", "").strip()
        if save_as and ctx.message_text:
            variables[save_as] = ctx.message_text
        if ctx.business_connection_id:
            variables["business_connection_id"] = ctx.business_connection_id
        return ExecutionResult(next_node_id=None, variables=variables)

    def matches(self, update_type: str, payload: dict) -> bool:
        # Support both old single trigger and new multi-select triggers array
        raw = self.config.get("triggers")
        if isinstance(raw, list) and raw:
            triggers = raw
        else:
            triggers = [self.config.get("trigger") or self.config.get("event") or "any"]

        # ── Connection events ─────────────────────────────────────────────────
        if update_type in ("business_connected", "business_disconnected"):
            event = "connected" if update_type == "business_connected" else "disconnected"
            return event in triggers

        # ── Message events ────────────────────────────────────────────────────
        if update_type != "business_message":
            return False

        # connection-only triggers should not fire on messages
        if all(t in ("connected", "disconnected") for t in triggers):
            return False

        # ── sender_type filter ────────────────────────────────────────────────
        sender_type = self.config.get("sender_type", "any")
        is_owner = payload.get("is_owner_message", False)
        if sender_type == "customer" and is_owner:
            return False
        if sender_type == "owner" and not is_owner:
            return False

        # ── Optional connection_filter ────────────────────────────────────────
        connection_filter = self.config.get("connection_filter", "").strip()
        if connection_filter:
            if payload.get("business_connection_id", "") != connection_filter:
                return False

        msg_type = payload.get("msg_type", "any")

        # Check each trigger — return True if any matches
        for trigger in triggers:
            if trigger in ("connected", "disconnected"):
                continue

            if trigger == "any":
                return True

            if trigger == "command":
                if msg_type != "command":
                    continue
                commands = self.config.get("commands", [])
                if not commands:
                    return True
                text = payload.get("text", "") or ""
                cmd = text.strip().split()[0].lower() if text else ""
                if cmd in [c.strip().lower() for c in commands if c]:
                    return True
                continue

            if trigger == "text":
                if msg_type != "text":
                    continue
                conditions = self.config.get("conditions", [])
                if not conditions:
                    return True
                text = payload.get("text", "") or ""
                mode = self.config.get("condition_mode", "any")
                results = [_check_condition(c, text) for c in conditions]
                if any(results) if mode == "any" else all(results):
                    return True
                continue

            if msg_type == trigger:
                return True

        return False


def _check_condition(cond: dict, text: str) -> bool:
    ctype = cond.get("type", "any")
    value = cond.get("value", "")

    if ctype == "any":
        return True
    if ctype == "exact":
        return text.strip().lower() == str(value).strip().lower()
    if ctype == "contains":
        return str(value).lower() in text.lower()
    if ctype == "starts_with":
        return text.lower().startswith(str(value).lower())
    if ctype == "ends_with":
        return text.lower().endswith(str(value).lower())
    if ctype == "in_list":
        items = value if isinstance(value, list) else [value]
        return text.strip().lower() in [str(i).strip().lower() for i in items]
    if ctype == "regex":
        try:
            return bool(re.search(str(value), text, re.IGNORECASE))
        except re.error:
            return False
    return False
