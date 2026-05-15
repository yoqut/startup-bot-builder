"""
Node registry — maps NodeType strings to handler instances.
10 universal handlers replace the previous 30+ specific ones.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from src.flows.models import NodeType


class BaseNodeHandler(ABC):
    @abstractmethod
    async def execute(self, config: dict[str, Any], ctx: Any) -> Any:
        """Run the node. Returns output forwarded to downstream nodes."""

    def matches_event(self, config: dict[str, Any], event: dict[str, Any]) -> bool:
        """For trigger nodes: does this event match this node's config?"""
        return False

    def config_schema(self) -> dict:
        """JSON Schema for this node — used by the frontend for AI generation."""
        return {}


class NodeRegistry:
    def __init__(self) -> None:
        self._handlers: dict[str, BaseNodeHandler] = {}

    def register(self, node_type: str, handler: BaseNodeHandler) -> None:
        self._handlers[node_type] = handler

    def get(self, node_type: str) -> BaseNodeHandler | None:
        return self._handlers.get(node_type)

    def list_types(self) -> list[str]:
        return list(self._handlers.keys())


def build_default_registry() -> NodeRegistry:
    from src.flows.nodes.triggers import UniversalTriggerHandler
    from src.flows.nodes.messages import UniversalMessageHandler
    from src.flows.nodes.logic import ConditionHandler, DelayHandler, RandomSplitHandler, LoopHandler
    from src.flows.nodes.ai_nodes import AIReplyHandler
    from src.flows.nodes.database import VariableHandler
    from src.flows.nodes.api_nodes import HttpRequestHandler
    from src.flows.nodes.analytics_nodes import TrackEventHandler

    registry = NodeRegistry()
    registry.register(NodeType.TRIGGER,      UniversalTriggerHandler())
    registry.register(NodeType.MESSAGE,      UniversalMessageHandler())
    registry.register(NodeType.CONDITION,    ConditionHandler())
    registry.register(NodeType.DELAY,        DelayHandler())
    registry.register(NodeType.HTTP_REQUEST, HttpRequestHandler())
    registry.register(NodeType.AI_REPLY,     AIReplyHandler())
    registry.register(NodeType.VARIABLE,     VariableHandler())
    registry.register(NodeType.SPLIT,        RandomSplitHandler())
    registry.register(NodeType.LOOP,         LoopHandler())
    registry.register(NodeType.TRACK_EVENT,  TrackEventHandler())
    return registry
