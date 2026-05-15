"""AI endpoints — flow generation, node config suggestions, optimization."""
from __future__ import annotations

from typing import Any

from litestar import Router, post
from litestar.di import Provide
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.flow_generator import AIFlowGenerator
from src.core.database.base import get_db
from src.core.security.deps import current_user


@post("/generate-flow")
async def generate_flow(data: dict[str, Any], user: dict) -> dict:
    description = data.get("description", "")
    if not description:
        from litestar.exceptions import ValidationException
        raise ValidationException("Description required")

    generator = AIFlowGenerator()
    flow = await generator.generate_flow(description)
    return flow


@post("/suggest-improvements")
async def suggest_improvements(data: dict[str, Any], user: dict) -> list:
    generator = AIFlowGenerator()
    suggestions = await generator.suggest_improvements(
        data.get("flow", {}),
        data.get("goal"),
    )
    return suggestions


@post("/generate-node-config")
async def generate_node_config(data: dict[str, Any], user: dict) -> dict:
    generator = AIFlowGenerator()
    config = await generator.generate_node_config(
        data.get("node_type", ""),
        data.get("context", ""),
    )
    return config


ai_router = Router(
    path="/api/v1/ai",
    route_handlers=[generate_flow, suggest_improvements, generate_node_config],
    dependencies={"user": Provide(current_user)},
)
