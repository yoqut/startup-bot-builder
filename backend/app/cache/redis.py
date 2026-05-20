import redis.asyncio as aioredis

from app.settings import settings

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    """Return the shared Redis client. Must be initialized via init_redis() at startup."""
    if _redis is None:
        raise RuntimeError("Redis not initialized — call init_redis() at startup")
    return _redis


async def init_redis() -> None:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
