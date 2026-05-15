"""
WebSocket endpoint — Litestar WebSocket handler.
Each connection subscribes to a bot's Redis pub/sub channel.
Auth: Bearer token in query string (WS doesn't support custom headers in browsers).
"""
from __future__ import annotations

import asyncio
import json
import uuid

import structlog
from litestar import WebSocket
from litestar.exceptions import WebSocketDisconnect
from redis.asyncio import Redis
from redis.asyncio.client import PubSub

from src.auth.service import TokenExpiredError, verify_access_token
from src.core.config.settings import settings

logger = structlog.get_logger(__name__)

PING_INTERVAL = 25  # seconds — keep connection alive through proxies


async def websocket_handler(
    socket: WebSocket,
    bot_id: uuid.UUID,
    redis: Redis,
) -> None:
    await socket.accept()

    # Authenticate via token in query param
    token = socket.query_params.get("token")
    if not token:
        await socket.close(code=4001, reason="Missing auth token")
        return

    try:
        payload = verify_access_token(token)
        user_id = payload["sub"]
    except TokenExpiredError:
        await socket.close(code=4003, reason="Invalid or expired token")
        return

    channel = f"bot:{bot_id}:execution"
    analytics_channel = f"bot:{bot_id}:analytics"
    logs_channel = f"bot:{bot_id}:logs"

    pubsub: PubSub = redis.pubsub()
    await pubsub.subscribe(channel, analytics_channel, logs_channel)

    logger.info("ws_connected", user_id=user_id, bot_id=str(bot_id))

    async def reader() -> None:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    await socket.send_text(message["data"])
                except WebSocketDisconnect:
                    break

    async def ping_loop() -> None:
        while True:
            await asyncio.sleep(PING_INTERVAL)
            try:
                await socket.send_text(json.dumps({"type": "ping"}))
            except WebSocketDisconnect:
                break

    async def client_handler() -> None:
        """Handle messages from client (e.g., subscription changes)."""
        try:
            while True:
                data = await socket.receive_text()
                msg = json.loads(data)
                if msg.get("type") == "pong":
                    continue
        except WebSocketDisconnect:
            pass

    try:
        await asyncio.gather(
            reader(),
            ping_loop(),
            client_handler(),
            return_exceptions=True,
        )
    finally:
        await pubsub.unsubscribe()
        await pubsub.aclose()
        logger.info("ws_disconnected", user_id=user_id, bot_id=str(bot_id))
