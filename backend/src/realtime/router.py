"""WebSocket route."""
from __future__ import annotations

import uuid

from litestar import Router, WebSocket, websocket
from litestar.di import Provide

from src.realtime.websocket_handler import websocket_handler


@websocket("/bots/{bot_id:uuid}")
async def bot_websocket(socket: WebSocket, bot_id: uuid.UUID) -> None:
    redis = socket.app.state.redis
    await websocket_handler(socket, bot_id, redis)


realtime_router = Router(
    path="/api/v1/ws",
    route_handlers=[bot_websocket],
)
