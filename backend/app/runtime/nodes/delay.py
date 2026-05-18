import asyncio
import telebot.async_telebot as telebot_async
from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult


class DelayNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        seconds = float(self.config.get("seconds", 3))
        typing = self.config.get("typing_action", True)

        bot = telebot_async.AsyncTeleBot(ctx.bot_token)
        if typing:
            await bot.send_chat_action(ctx.chat_id, "typing")

        await asyncio.sleep(min(seconds, 30))  # cap at 30s

        next_node_id = self.config.get("next_node_id")
        return ExecutionResult(next_node_id=next_node_id, variables=ctx.variables)
