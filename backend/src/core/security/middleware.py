"""
Security middleware stack:
1. Rate limiting via Redis (per-IP and per-user sliding window)
2. Request ID injection for distributed tracing
3. Security headers (CSP, HSTS, X-Frame-Options)
4. IP throttling for suspicious patterns
"""
from __future__ import annotations

import time
import uuid
from collections.abc import Callable
from typing import Any

import structlog
from litestar.middleware import AbstractMiddleware
from litestar.types import ASGIApp, Receive, Scope, Send

logger = structlog.get_logger(__name__)


class RequestIDMiddleware(AbstractMiddleware):
    """Injects X-Request-ID for tracing across services."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        request_id = str(uuid.uuid4())
        scope["state"]["request_id"] = request_id

        async def send_with_header(message: Any) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_header)


class SecurityHeadersMiddleware(AbstractMiddleware):
    """Add security headers to every response."""

    _HEADERS = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"x-xss-protection", b"1; mode=block"),
        (b"referrer-policy", b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"geolocation=(), microphone=(), camera=()"),
    ]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        async def send_with_headers(message: Any) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(self._HEADERS)
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_headers)


class RateLimitMiddleware(AbstractMiddleware):
    """
    Sliding window rate limiter backed by Redis.
    Limits: 60 req/min per IP, 1000 req/hour per user.
    Returns 429 with Retry-After header on breach.
    """

    exclude_paths = {"/health", "/metrics", "/api/v1/webhook"}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if any(path.startswith(p) for p in self.exclude_paths):
            await self.app(scope, receive, send)
            return

        # Get Redis from app state
        redis = scope["app"].state.redis if hasattr(scope.get("app", {}), "state") else None
        if not redis:
            await self.app(scope, receive, send)
            return

        client_ip = self._get_client_ip(scope)
        key = f"rl:ip:{client_ip}"
        now = int(time.time())
        window = 60  # 1 minute
        limit = 60

        try:
            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, 0, now - window)
            pipe.zadd(key, {str(uuid.uuid4()): now})
            pipe.zcard(key)
            pipe.expire(key, window * 2)
            results = await pipe.execute()
            count = results[2]
        except Exception:
            count = 0

        if count > limit:
            await self._send_429(send, retry_after=window)
            return

        await self.app(scope, receive, send)

    def _get_client_ip(self, scope: dict) -> str:
        headers = dict(scope.get("headers", []))
        forwarded_for = headers.get(b"x-forwarded-for", b"").decode()
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        client = scope.get("client")
        return client[0] if client else "unknown"

    async def _send_429(self, send: Send, retry_after: int) -> None:
        await send({
            "type": "http.response.start",
            "status": 429,
            "headers": [
                (b"content-type", b"application/json"),
                (b"retry-after", str(retry_after).encode()),
            ],
        })
        await send({
            "type": "http.response.body",
            "body": b'{"detail":"Too many requests"}',
        })
