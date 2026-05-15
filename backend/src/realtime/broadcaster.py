"""
WebSocket broadcaster — pushes realtime execution events to connected clients.
Redis pub/sub as message bus: multiple server instances share state.
Each client subscribes to channels for their specific bots.

Channel naming:
  bot:{bot_id}:execution   — execution trace events
  bot:{bot_id}:analytics   — analytics updates
  bot:{bot_id}:logs        — live log stream
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from redis.asyncio import Redis

logger = structlog.get_logger(__name__)


def _channel(bot_id: uuid.UUID, suffix: str) -> str:
    return f"bot:{bot_id}:{suffix}"


class WebSocketBroadcaster:
    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    async def broadcast(self, channel: str, payload: dict) -> None:
        try:
            await self._redis.publish(channel, json.dumps(payload, default=str))
        except Exception as exc:
            logger.warning("broadcast_failed", channel=channel, error=str(exc))

    async def broadcast_node_active(
        self,
        execution_id: uuid.UUID,
        node_id: str,
        bot_id: uuid.UUID,
    ) -> None:
        await self.broadcast(
            _channel(bot_id, "execution"),
            {
                "type": "node_active",
                "execution_id": str(execution_id),
                "node_id": node_id,
                "ts": datetime.now(UTC).isoformat(),
            },
        )

    async def broadcast_node_done(
        self,
        execution_id: uuid.UUID,
        node_id: str,
        output: Any,
        bot_id: uuid.UUID,
    ) -> None:
        await self.broadcast(
            _channel(bot_id, "execution"),
            {
                "type": "node_done",
                "execution_id": str(execution_id),
                "node_id": node_id,
                "output": output,
                "ts": datetime.now(UTC).isoformat(),
            },
        )

    async def broadcast_execution_complete(
        self,
        execution_id: uuid.UUID,
        status: str,
        duration_ms: int,
        bot_id: uuid.UUID,
    ) -> None:
        await self.broadcast(
            _channel(bot_id, "execution"),
            {
                "type": "execution_complete",
                "execution_id": str(execution_id),
                "status": status,
                "duration_ms": duration_ms,
                "ts": datetime.now(UTC).isoformat(),
            },
        )

    async def broadcast_analytics_update(
        self,
        bot_id: uuid.UUID,
        metric: str,
        value: Any,
    ) -> None:
        await self.broadcast(
            _channel(bot_id, "analytics"),
            {
                "type": "metric_update",
                "metric": metric,
                "value": value,
                "ts": datetime.now(UTC).isoformat(),
            },
        )

    async def broadcast_log(
        self,
        bot_id: uuid.UUID,
        level: str,
        message: str,
        extra: dict | None = None,
    ) -> None:
        await self.broadcast(
            _channel(bot_id, "logs"),
            {
                "type": "log",
                "level": level,
                "message": message,
                "extra": extra or {},
                "ts": datetime.now(UTC).isoformat(),
            },
        )
