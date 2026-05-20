import asyncio

from app.bot import get_bot
from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult

# Hard cap: do not block the event loop longer than this per delay node
MAX_DELAY_SECONDS = 10


class DelayNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        seconds = min(float(self.config.get("seconds", 3)), MAX_DELAY_SECONDS)
        typing = self.config.get("typing_action", True)

        bot = get_bot(ctx.bot_token)
        if typing:
            try:
                await bot.send_chat_action(ctx.chat_id, "typing")
            except Exception:
                pass

        await asyncio.sleep(seconds)

        return ExecutionResult(
            next_node_id=self.config.get("next_node_id"),
            variables=ctx.variables,
        )
