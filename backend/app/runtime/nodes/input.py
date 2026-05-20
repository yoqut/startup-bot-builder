import re

from app.bot import get_bot
from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult

VALIDATORS = {
    "text": lambda v: bool(v),
    "number": lambda v: v.isdigit(),
    "phone": lambda v: bool(re.match(r"^\+?[\d\s\-]{7,15}$", v)),
    "email": lambda v: bool(re.match(r"^[^@]+@[^@]+\.[^@]+$", v)),
}


class InputNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        bot = get_bot(ctx.bot_token)
        prompt = self._render(self.config.get("prompt", "Kiriting:"), ctx.variables)
        variable_name = self.config.get("variable_name", "input")
        validation = self.config.get("validation", "text")
        error_msg = self.config.get("error_message", "Iltimos qayta kiriting")

        if ctx.message_text is None:
            await bot.send_message(ctx.chat_id, prompt)
            return ExecutionResult(
                next_node_id=None, variables=ctx.variables, wait_for_input=True
            )

        validator = VALIDATORS.get(validation, VALIDATORS["text"])
        if not validator(ctx.message_text):
            await bot.send_message(ctx.chat_id, error_msg)
            return ExecutionResult(
                next_node_id=None, variables=ctx.variables, wait_for_input=True
            )

        variables = {**ctx.variables, variable_name: ctx.message_text}
        return ExecutionResult(
            next_node_id=self.config.get("next_node_id"),
            variables=variables,
        )
