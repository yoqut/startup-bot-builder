from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult


class CommandNode(BaseNode):
    """
    /start, /help, /menu kabi commandlarni ushlaydi.
    Webhook dispatcher bu nodeni command kelganda topib ishlatadi.
    """

    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        return ExecutionResult(
            next_node_id=self.config.get("next_node_id"),
            variables=ctx.variables,
        )

    def matches(self, text: str) -> bool:
        command = self.config.get("command", "/start").strip()
        return text.strip().split()[0].lower() == command.lower()
