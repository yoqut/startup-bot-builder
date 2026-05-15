"""
AI node handlers — OpenAI-powered replies, moderation, intent, summarization.
Prompt templates support variable interpolation.
Token usage tracked per execution for billing/analytics.
"""
from __future__ import annotations

from typing import Any

import structlog
from openai import AsyncOpenAI

from src.core.config.settings import settings
from src.flows.nodes.registry import BaseNodeHandler

logger = structlog.get_logger(__name__)

_VAR_PATTERN_RE = __import__("re").compile(r"\{\{([^}]+)\}\}")


def _interpolate(text: str, ctx: Any) -> str:
    def replacer(m):
        parts = m.group(1).strip().split(".")
        if parts[0] == "var":
            return str(ctx.get_var(parts[1] if len(parts) > 1 else "", ""))
        if parts[0] == "user":
            return str(ctx.telegram_event.get("user", {}).get(parts[1] if len(parts) > 1 else "", ""))
        if parts[0] == "event":
            return str(ctx.telegram_event.get(parts[1] if len(parts) > 1 else "", ""))
        return m.group(0)
    return _VAR_PATTERN_RE.sub(replacer, text)


def _get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai.api_key.get_secret_value())


class AIReplyHandler(BaseNodeHandler):
    """Generate an AI reply to the user's message and send it."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        user_message = ctx.telegram_event.get("text", "")
        system_prompt = _interpolate(
            config.get("system_prompt", "You are a helpful assistant."), ctx
        )
        model = config.get("model", settings.openai.default_model)
        max_tokens = config.get("max_tokens", settings.openai.max_tokens)
        temperature = config.get("temperature", settings.openai.temperature)

        # Build message history from context variable if available
        history = ctx.get_var("__conversation_history__", [])
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history[-10:])  # Last 10 turns
        messages.append({"role": "user", "content": user_message})

        client = _get_openai_client()
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        reply = response.choices[0].message.content or ""
        tokens_used = response.usage.total_tokens if response.usage else 0

        # Update conversation history
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": reply})
        ctx.set_var("__conversation_history__", history[-20:])
        ctx.set_var("ai_reply", reply)

        # Send reply if bot instance available
        bot = ctx.get_var("__bot_instance__")
        chat_id = ctx.telegram_event.get("chat_id")
        if bot and chat_id and reply:
            await bot.send_message(chat_id=chat_id, text=reply, parse_mode="HTML")

        logger.info("ai_reply_generated", tokens=tokens_used)
        return {"reply": reply, "tokens_used": tokens_used}


class AIModerationHandler(BaseNodeHandler):
    """Moderate content — returns safe/unsafe + categories."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        text = ctx.telegram_event.get("text", "")
        if not text:
            return {"branch": "safe", "flagged": False}

        client = _get_openai_client()
        response = await client.moderations.create(input=text)
        result = response.results[0]

        is_flagged = result.flagged
        categories = {k: v for k, v in result.categories.__dict__.items() if v}

        action = config.get("action_if_flagged", "block")
        if is_flagged:
            bot = ctx.get_var("__bot_instance__")
            chat_id = ctx.telegram_event.get("chat_id")
            if action == "delete" and bot:
                msg_id = ctx.telegram_event.get("message_id")
                if msg_id:
                    try:
                        await bot.delete_message(chat_id=chat_id, message_id=msg_id)
                    except Exception:
                        pass
            elif action == "warn" and bot:
                warn_text = config.get("warn_message", "⚠️ Your message violated our rules.")
                if chat_id:
                    await bot.send_message(chat_id=chat_id, text=warn_text)

        return {
            "branch": "unsafe" if is_flagged else "safe",
            "flagged": is_flagged,
            "categories": categories,
        }


class AIIntentHandler(BaseNodeHandler):
    """Classify user intent into predefined categories."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        text = ctx.telegram_event.get("text", "")
        intents = config.get("intents", [])
        if not intents or not text:
            return {"branch": "unknown", "intent": "unknown", "confidence": 0}

        intent_list = "\n".join(f"- {i}" for i in intents)
        prompt = (
            f"Classify the user message into one of these intents:\n{intent_list}\n\n"
            f"User message: {text}\n\n"
            "Respond with JSON: {\"intent\": \"<intent>\", \"confidence\": <0-1>}"
        )

        client = _get_openai_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100,
            temperature=0,
            response_format={"type": "json_object"},
        )

        import json
        try:
            data = json.loads(response.choices[0].message.content or "{}")
            intent = data.get("intent", "unknown")
            confidence = float(data.get("confidence", 0))
        except (json.JSONDecodeError, ValueError):
            intent = "unknown"
            confidence = 0

        ctx.set_var("detected_intent", intent)
        ctx.set_var("intent_confidence", confidence)
        return {"branch": intent, "intent": intent, "confidence": confidence}


class AISummarizeHandler(BaseNodeHandler):
    """Summarize a variable's text content."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        source_var = config.get("source_variable", "text_to_summarize")
        target_var = config.get("target_variable", "summary")
        text = ctx.get_var(source_var, "")

        if not text:
            return {"summary": ""}

        max_length = config.get("max_length", 200)
        prompt = f"Summarize in under {max_length} words:\n\n{text}"

        client = _get_openai_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_length * 2,
            temperature=0.3,
        )

        summary = response.choices[0].message.content or ""
        ctx.set_var(target_var, summary)
        return {"summary": summary}
