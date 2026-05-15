"""
Litestar application factory.
Modular architecture: each domain registers its own router.
Lifespan manages DB, Redis, and background workers.
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from litestar import Litestar
from litestar.config.cors import CORSConfig
from litestar.config.compression import CompressionConfig
from litestar.middleware.logging import LoggingMiddlewareConfig
from litestar.openapi import OpenAPIConfig
from litestar.openapi.spec import Components, SecurityScheme
from redis.asyncio import Redis

from src.core.config.settings import settings
from src.core.database.base import engine
from src.core.database.models import Base
from src.core.security.middleware import (
    RateLimitMiddleware,
    RequestIDMiddleware,
    SecurityHeadersMiddleware,
)
from src.flows.nodes.registry import build_default_registry
from src.flows.engine.executor import FlowExecutor
from src.realtime.broadcaster import WebSocketBroadcaster

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: Litestar) -> AsyncGenerator[None, None]:
    """Initialize and teardown shared resources."""

    # Database setup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("database_ready")

    # Redis
    redis = Redis.from_url(
        settings.redis.url,
        max_connections=settings.redis.max_connections,
        decode_responses=True,
    )
    await redis.ping()
    logger.info("redis_ready")

    # Build node registry and executor
    registry = build_default_registry()
    executor = FlowExecutor(registry)
    broadcaster = WebSocketBroadcaster(redis)

    # Inject into app state
    app.state.redis = redis
    app.state.executor = executor
    app.state.broadcaster = broadcaster

    logger.info("app_started", environment=settings.environment)

    yield

    # Cleanup
    await redis.aclose()
    await engine.dispose()
    logger.info("app_stopped")


def create_app() -> Litestar:
    # Import routers
    from src.auth.router import auth_router
    from src.bots.router import bots_router
    from src.flows.router import flows_router
    from src.analytics.router import analytics_router
    from src.ai.router import ai_router
    from src.admin.router import admin_router
    from src.telegram.router import telegram_router
    from src.realtime.router import realtime_router
    from src.templates.router import templates_router

    return Litestar(
        route_handlers=[
            auth_router,
            bots_router,
            flows_router,
            analytics_router,
            ai_router,
            admin_router,
            telegram_router,
            realtime_router,
            templates_router,
        ],
        lifespan=[lifespan],
        cors_config=CORSConfig(
            allow_origins=settings.cors_origins,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
            allow_credentials=True,
        ),
        compression_config=CompressionConfig(backend="gzip", minimum_size=1000),
        middleware=[
            RequestIDMiddleware,
            SecurityHeadersMiddleware,
            RateLimitMiddleware,
        ],
        openapi_config=OpenAPIConfig(
            title="BotBuilder API",
            version=settings.app_version,
            description="Telegram Bot Builder Platform API",
            components=Components(
                security_schemes={
                    "BearerAuth": SecurityScheme(
                        type="http",
                        scheme="bearer",
                        bearer_format="JWT",
                    )
                }
            ),
        ),
        debug=settings.debug,
    )


app = create_app()
