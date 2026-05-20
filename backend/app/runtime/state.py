import json

from app.cache.keys import bot_user_state
from app.cache.redis import get_redis

STATE_TTL = 86400  # 24h


async def get_state(bot_id: str, telegram_user_id: int) -> dict:
    raw = await get_redis().get(bot_user_state(bot_id, telegram_user_id))
    if raw:
        return json.loads(raw)
    return {"current_node_id": None, "variables": {}, "context": {}}


async def save_state(bot_id: str, telegram_user_id: int, state: dict) -> None:
    await get_redis().set(
        bot_user_state(bot_id, telegram_user_id),
        json.dumps(state),
        ex=STATE_TTL,
    )


async def clear_state(bot_id: str, telegram_user_id: int) -> None:
    await get_redis().delete(bot_user_state(bot_id, telegram_user_id))
