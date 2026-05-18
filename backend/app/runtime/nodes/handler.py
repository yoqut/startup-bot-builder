import re

from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult


class HandlerNode(BaseNode):
    """
    Trigger node: matches incoming update type + optional conditions.
    Dispatcher finds matching handler and starts flow from it.
    During execution it optionally saves the matched text as a variable.
    """

    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        variables = dict(ctx.variables)
        save_as = self.config.get("save_as", "").strip()
        if save_as and ctx.message_text:
            variables[save_as] = ctx.message_text
        return ExecutionResult(next_node_id=None, variables=variables)

    def matches(self, update_type: str, payload: dict) -> bool:
        trigger = self.config.get("trigger", "any")

        # Chat type filter: private / group / channel / any
        required_chat_type = self.config.get("chat_type", "any")
        if required_chat_type != "any":
            actual_chat_type = payload.get("chat_type", "private")
            # group handler should match both 'group' and 'supergroup'
            if required_chat_type == "group":
                if actual_chat_type not in ("group", "supergroup"):
                    return False
            elif actual_chat_type != required_chat_type:
                return False

        if trigger != "any" and trigger != update_type:
            return False

        text = payload.get("text", "") or ""

        # Command trigger: match against `commands` list
        if trigger == "command":
            commands = self.config.get("commands", [])
            if not commands:
                return True  # no filter → match all commands
            cmd = text.strip().split()[0].lower() if text else ""
            return cmd in [c.strip().lower() for c in commands if c]

        # join_request / left_member — no further filtering
        if trigger in ("join_request", "left_member"):
            return True

        # Text trigger: condition builder
        conditions = self.config.get("conditions", [])
        if not conditions:
            return True

        mode = self.config.get("condition_mode", "any")
        results = [_check_condition(c, text) for c in conditions]
        return any(results) if mode == "any" else all(results)


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
