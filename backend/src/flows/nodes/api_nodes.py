"""HTTP request and webhook call node handlers."""
from __future__ import annotations

import json as json_lib
from typing import Any

import httpx
import structlog

from src.flows.nodes.registry import BaseNodeHandler

logger = structlog.get_logger(__name__)

_TIMEOUT = 15.0  # seconds


def _interpolate_dict(d: Any, ctx: Any) -> Any:
    """Recursively interpolate {{var.x}} in dict/list/string values."""
    import re
    _PAT = re.compile(r"\{\{([^}]+)\}\}")

    def _resolve(val: Any) -> Any:
        if isinstance(val, str):
            def repl(m):
                parts = m.group(1).strip().split(".")
                if parts[0] == "var":
                    return str(ctx.get_var(parts[1] if len(parts) > 1 else "", ""))
                if parts[0] == "event":
                    return str(ctx.telegram_event.get(parts[1] if len(parts) > 1 else "", ""))
                return m.group(0)
            return _PAT.sub(repl, val)
        if isinstance(val, dict):
            return {k: _resolve(v) for k, v in val.items()}
        if isinstance(val, list):
            return [_resolve(i) for i in val]
        return val

    return _resolve(d)


class HttpRequestHandler(BaseNodeHandler):
    async def execute(self, config: dict, ctx: Any) -> Any:
        method = config.get("method", "GET").upper()
        url = _interpolate_dict(config.get("url", ""), ctx)
        headers = _interpolate_dict(config.get("headers", {}), ctx)
        params = _interpolate_dict(config.get("query_params", {}), ctx)
        body = _interpolate_dict(config.get("body"), ctx)

        output_var = config.get("output_variable", "http_response")

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=body if isinstance(body, dict) else None,
                    content=body if isinstance(body, str) else None,
                )

            try:
                data = resp.json()
            except Exception:
                data = resp.text

            result = {
                "status_code": resp.status_code,
                "data": data,
                "headers": dict(resp.headers),
            }

            ctx.set_var(output_var, data)
            ctx.set_var(f"{output_var}_status", resp.status_code)

            branch = "success" if resp.status_code < 400 else "error"
            return {"branch": branch, **result}

        except httpx.TimeoutException:
            logger.warning("http_request_timeout", url=url)
            return {"branch": "error", "error": "timeout"}
        except Exception as exc:
            logger.error("http_request_failed", url=url, error=str(exc))
            return {"branch": "error", "error": str(exc)}


class WebhookCallHandler(BaseNodeHandler):
    """Fire-and-forget webhook call with the current execution context."""

    async def execute(self, config: dict, ctx: Any) -> Any:
        url = _interpolate_dict(config.get("url", ""), ctx)
        include_event = config.get("include_event", True)
        include_vars = config.get("include_variables", True)

        payload: dict = {"bot_id": str(ctx.bot_id), "execution_id": str(ctx.execution_id)}
        if include_event:
            payload["event"] = ctx.telegram_event
        if include_vars:
            payload["variables"] = {
                k: v for k, v in ctx.variables.items() if not k.startswith("__")
            }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(url, json=payload)
            return {"branch": "success", "sent": True}
        except Exception as exc:
            return {"branch": "error", "error": str(exc)}
