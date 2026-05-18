from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class ExecutionContext:
    bot_id: str
    bot_token: str
    telegram_user_id: int
    chat_id: int
    variables: dict
    message_text: str | None = None
    callback_data: str | None = None
    callback_message_id: int | None = None
    db: "AsyncSession | None" = field(default=None, repr=False)
    business_connection_id: str | None = None


@dataclass
class ExecutionResult:
    next_node_id: str | None
    variables: dict
    wait_for_input: bool = False
    handle: str = "default"  # output port: 'default', 'true', 'false', 'btn_0', …


class BaseNode(ABC):
    def __init__(self, node_id: str, config: dict):
        self.node_id = node_id
        self.config = config

    @abstractmethod
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        pass

    def _render(self, text: str, variables: dict) -> str:
        for k, v in variables.items():
            text = text.replace(f"{{{{{k}}}}}", str(v))
        return text
