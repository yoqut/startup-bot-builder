import telebot.async_telebot as telebot
import httpx

from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult


class AiNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        system_prompt = self.config.get("system_prompt", "Sen yordamchi assistantsan.")
        model = self.config.get("model", "gpt-4o-mini")
        api_key = self.config.get("api_key", "")
        response_var = self.config.get("response_variable", "ai_answer")
        user_message = ctx.variables.get("last_message", ctx.message_text or "")

        ai_response = ""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                    },
                )
                data = resp.json()
                ai_response = data["choices"][0]["message"]["content"]
        except Exception as e:
            ai_response = f"Xatolik yuz berdi: {e}"

        tg_bot = telebot.AsyncTeleBot(ctx.bot_token)
        await tg_bot.send_message(ctx.chat_id, ai_response)
        await tg_bot.close_session()

        variables = {**ctx.variables, response_var: ai_response}
        return ExecutionResult(
            next_node_id=self.config.get("next_node_id"),
            variables=variables,
        )
