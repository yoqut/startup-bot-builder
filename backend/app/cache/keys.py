def bot_user_state(bot_id: str, telegram_user_id: int) -> str:
    return f"state:{bot_id}:{telegram_user_id}"


def rate_limit(user_id: str) -> str:
    return f"ratelimit:{user_id}"


def bot_token_cache(bot_id: str) -> str:
    return f"bot:token:{bot_id}"
