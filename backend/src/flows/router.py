"""Flow management API — CRUD, activate/pause, version history, test execution."""
from __future__ import annotations

import uuid
from typing import Any

from litestar import Router, delete, get, patch, post, put
from litestar.di import Provide
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database.base import get_db
from src.core.security.deps import current_user
from src.flows.models import Flow, FlowStatus, FlowVersion, Node, Edge
from src.bots.service import BotService


@post("/")
async def create_flow(
    bot_id: uuid.UUID,
    data: dict[str, Any],
    db: AsyncSession,
    user: dict,
) -> dict:
    bot_service = BotService(db)
    await bot_service.get_bot(bot_id, user["id"])  # verify ownership

    flow = Flow(
        bot_id=bot_id,
        name=data.get("name", "New Flow"),
        description=data.get("description"),
        status=FlowStatus.DRAFT,
        viewport=data.get("viewport", {"x": 0, "y": 0, "zoom": 1}),
    )
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return {"id": str(flow.id), "name": flow.name, "status": flow.status}


@get("/")
async def list_flows(bot_id: uuid.UUID, db: AsyncSession, user: dict) -> list[dict]:
    bot_service = BotService(db)
    await bot_service.get_bot(bot_id, user["id"])

    result = await db.execute(
        select(Flow)
        .where(Flow.bot_id == bot_id)
        .where(Flow.deleted_at.is_(None))
    )
    flows = result.scalars().all()
    return [{"id": str(f.id), "name": f.name, "status": f.status, "version": f.version} for f in flows]


@get("/{flow_id:uuid}")
async def get_flow(bot_id: uuid.UUID, flow_id: uuid.UUID, db: AsyncSession, user: dict) -> dict:
    result = await db.execute(
        select(Flow)
        .options(selectinload(Flow.nodes), selectinload(Flow.edges))
        .where(Flow.id == flow_id)
        .where(Flow.bot_id == bot_id)
    )
    flow = result.scalar_one_or_none()
    if not flow:
        from litestar.exceptions import NotFoundException
        raise NotFoundException("Flow not found")

    return {
        "id": str(flow.id),
        "name": flow.name,
        "description": flow.description,
        "status": flow.status,
        "version": flow.version,
        "viewport": flow.viewport,
        "nodes": [
            {
                "id": str(n.id),
                "type": "custom",
                "position": {"x": n.position_x, "y": n.position_y},
                "data": {"label": n.label, "nodeType": n.node_type, "config": n.config},
                "width": n.width,
                "height": n.height,
            }
            for n in flow.nodes
        ],
        "edges": [
            {
                "id": str(e.id),
                "source": str(e.source_node_id),
                "target": str(e.target_node_id),
                "sourceHandle": e.source_handle,
                "targetHandle": e.target_handle,
                "label": e.label,
                "type": e.edge_type,
                "animated": e.animated,
            }
            for e in flow.edges
        ],
    }


@put("/{flow_id:uuid}")
async def update_flow(
    bot_id: uuid.UUID,
    flow_id: uuid.UUID,
    data: dict[str, Any],
    db: AsyncSession,
    user: dict,
) -> dict:
    result = await db.execute(
        select(Flow)
        .options(selectinload(Flow.nodes), selectinload(Flow.edges))
        .where(Flow.id == flow_id)
        .where(Flow.bot_id == bot_id)
    )
    flow = result.scalar_one_or_none()
    if not flow:
        from litestar.exceptions import NotFoundException
        raise NotFoundException("Flow not found")

    # Save version snapshot before overwriting
    from datetime import UTC, datetime
    version_snapshot = {
        "nodes": [
            {
                "id": str(n.id),
                "node_type": n.node_type,
                "label": n.label,
                "position_x": n.position_x,
                "position_y": n.position_y,
                "config": n.config,
            }
            for n in flow.nodes
        ],
        "edges": [
            {
                "id": str(e.id),
                "source_node_id": str(e.source_node_id),
                "target_node_id": str(e.target_node_id),
                "source_handle": e.source_handle,
                "target_handle": e.target_handle,
                "label": e.label,
                "edge_type": e.edge_type,
                "animated": e.animated,
            }
            for e in flow.edges
        ],
    }
    version = FlowVersion(
        flow_id=flow.id,
        version_number=flow.version,
        snapshot=version_snapshot,
        created_by=user["id"],
    )
    db.add(version)

    # Update name/viewport
    if "name" in data:
        flow.name = data["name"]
    if "viewport" in data:
        flow.viewport = data["viewport"]

    # Replace nodes and edges
    if "nodes" in data:
        for node in flow.nodes:
            await db.delete(node)
        for edge in flow.edges:
            await db.delete(edge)
        await db.flush()

        node_id_map: dict[str, uuid.UUID] = {}
        for node_data in data["nodes"]:
            frontend_id = node_data.get("id", str(uuid.uuid4()))
            new_node = Node(
                flow_id=flow.id,
                node_type=node_data["data"]["nodeType"],
                label=node_data["data"].get("label", ""),
                position_x=node_data["position"]["x"],
                position_y=node_data["position"]["y"],
                config=node_data["data"].get("config", {}),
            )
            db.add(new_node)
            await db.flush()
            node_id_map[frontend_id] = new_node.id

        for edge_data in data.get("edges", []):
            src = node_id_map.get(edge_data["source"])
            tgt = node_id_map.get(edge_data["target"])
            if src and tgt:
                new_edge = Edge(
                    flow_id=flow.id,
                    source_node_id=src,
                    target_node_id=tgt,
                    source_handle=edge_data.get("sourceHandle"),
                    target_handle=edge_data.get("targetHandle"),
                    label=edge_data.get("label"),
                    edge_type=edge_data.get("type", "smoothstep"),
                    animated=edge_data.get("animated", False),
                )
                db.add(new_edge)

    flow.version += 1
    await db.commit()
    return {"id": str(flow.id), "version": flow.version, "saved": True}


@post("/{flow_id:uuid}/activate")
async def activate_flow(bot_id: uuid.UUID, flow_id: uuid.UUID, db: AsyncSession, user: dict) -> dict:
    result = await db.execute(select(Flow).where(Flow.id == flow_id).where(Flow.bot_id == bot_id))
    flow = result.scalar_one_or_none()
    if flow:
        flow.status = FlowStatus.ACTIVE
        await db.commit()
    return {"status": "active"}


@post("/{flow_id:uuid}/pause")
async def pause_flow(bot_id: uuid.UUID, flow_id: uuid.UUID, db: AsyncSession, user: dict) -> dict:
    result = await db.execute(select(Flow).where(Flow.id == flow_id).where(Flow.bot_id == bot_id))
    flow = result.scalar_one_or_none()
    if flow:
        flow.status = FlowStatus.PAUSED
        await db.commit()
    return {"status": "paused"}


@delete("/{flow_id:uuid}", status_code=204)
async def delete_flow(bot_id: uuid.UUID, flow_id: uuid.UUID, db: AsyncSession, user: dict) -> None:
    from datetime import UTC, datetime
    result = await db.execute(
        select(Flow).where(Flow.id == flow_id).where(Flow.bot_id == bot_id).where(Flow.deleted_at.is_(None))
    )
    flow = result.scalar_one_or_none()
    if not flow:
        from litestar.exceptions import NotFoundException
        raise NotFoundException("Flow not found")
    flow.deleted_at = datetime.now(UTC)
    await db.commit()


@patch("/{flow_id:uuid}")
async def rename_flow(bot_id: uuid.UUID, flow_id: uuid.UUID, data: dict, db: AsyncSession, user: dict) -> dict:
    result = await db.execute(
        select(Flow).where(Flow.id == flow_id).where(Flow.bot_id == bot_id).where(Flow.deleted_at.is_(None))
    )
    flow = result.scalar_one_or_none()
    if not flow:
        from litestar.exceptions import NotFoundException
        raise NotFoundException("Flow not found")
    if "name" in data:
        flow.name = data["name"]
    await db.commit()
    return {"id": str(flow.id), "name": flow.name}


flows_router = Router(
    path="/api/v1/bots/{bot_id:uuid}/flows",
    route_handlers=[create_flow, list_flows, get_flow, update_flow, activate_flow, pause_flow, delete_flow, rename_flow],
    dependencies={"db": Provide(get_db), "user": Provide(current_user)},
)
