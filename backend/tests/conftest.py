"""
Shared fixtures for all tests.
"""
import pytest
from app.runtime.nodes.base import ExecutionContext


def make_ctx(**kwargs) -> ExecutionContext:
    defaults = dict(
        bot_id="00000000-0000-0000-0000-000000000001",
        bot_token="123:TOKEN",
        telegram_user_id=111,
        chat_id=111,
        variables={},
        message_text=None,
    )
    defaults.update(kwargs)
    return ExecutionContext(**defaults)
