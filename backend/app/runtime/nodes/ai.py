import httpx

from app.bot import get_bot
from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult
from app.settings import settings


class AiNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        system_prompt = self.config.get("system_prompt", "Sen yordamchi assistantsan.")
        model = self.config.get("model", "gpt-4o-mini")
        # Use global API key from settings — per-node keys are a security risk
        api_key = settings.OPENAI_API_KEY or self.config.get("api_key", "")
        response_var = self.config.get("response_variable", "ai_answer")
        user_message = ctx.variables.get("last_message", ctx.message_text or "")

        ai_response = ""
        if api_key:
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
        else:
            ai_response = "AI node: API key sozlanmagan."

        bot = get_bot(ctx.bot_token)
        await bot.send_message(ctx.chat_id, ai_response)

        variables = {**ctx.variables, response_var: ai_response}
        return ExecutionResult(
            next_node_id=self.config.get("next_node_id"),
            variables=variables,
        )
