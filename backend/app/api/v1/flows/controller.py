from litestar import Controller, delete, get, post, put
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.flows.schemas import (
    FlowCreate,
    FlowResponse,
    FlowSave,
    NodeData,
    EdgeData,
)
from app.api.v1.flows.service import (
    create_flow,
    get_bot_flows,
    get_flow_full,
    get_or_create_flow,
    publish_flow,
    save_flow,
)
from app.api.v1.dependencies import get_current_user_id
from app.db.session import get_db


def _fmt(flow, include_nodes: bool = True) -> FlowResponse:
    nodes = [
        NodeData(
            id=str(n.id),
            type=n.type.value,
            label=n.label,
            position_x=n.position_x,
            position_y=n.position_y,
            config=n.config,
        )
        for n in (flow.nodes or [])
    ]
    edges = [
        EdgeData(
            id=str(e.id),
            source_node_id=str(e.source_node_id),
            target_node_id=str(e.target_node_id),
            label=e.label,
            condition_key=e.condition_key,
        )
        for e in (flow.edges or [])
    ]
    return FlowResponse(
        id=str(flow.id),
        bot_id=str(flow.bot_id),
        name=flow.name,
        chat_type=flow.chat_type.value
        if hasattr(flow.chat_type, "value")
        else str(flow.chat_type),
        is_published=flow.is_published,
        version=flow.version,
        nodes=nodes,
        edges=edges,
        created_at=flow.created_at.isoformat(),
        updated_at=flow.updated_at.isoformat() if flow.updated_at else None,
    )


class FlowsController(Controller):
    path = "/api/v1/flows"
    dependencies = {"db": Provide(get_db)}

    @get("/bot/{bot_id:str}")
    async def list_flows(
        self,
        bot_id: str,
        request: Request,
        db: AsyncSession,
        chat_type: str | None = None,
    ) -> list[FlowResponse]:
        get_current_user_id(request)
        flows = await get_bot_flows(db, bot_id, chat_type)
        return [
            FlowResponse(
                id=str(f.id),
                bot_id=str(f.bot_id),
                name=f.name,
                chat_type=f.chat_type.value
                if hasattr(f.chat_type, "value")
                else str(f.chat_type),
                is_published=f.is_published,
                version=f.version,
                created_at=f.created_at.isoformat(),
                updated_at=f.updated_at.isoformat() if f.updated_at else None,
            )
            for f in flows
        ]

    @get("/bot/{bot_id:str}/canvas/{chat_type:str}")
    async def get_canvas(
        self, bot_id: str, chat_type: str, request: Request, db: AsyncSession
    ) -> FlowResponse:
        """Get or create the flow for a specific chat_type. Used by the 4-tab flow builder."""
        get_current_user_id(request)
        flow = await get_or_create_flow(db, bot_id, chat_type)
        flow = await get_flow_full(db, str(flow.id))
        return _fmt(flow)

    @post("/bot/{bot_id:str}")
    async def create(
        self, bot_id: str, data: FlowCreate, request: Request, db: AsyncSession
    ) -> FlowResponse:
        get_current_user_id(request)
        flow = await create_flow(db, bot_id, data.name, data.chat_type)
        return FlowResponse(
            id=str(flow.id),
            bot_id=str(flow.bot_id),
            name=flow.name,
            chat_type=flow.chat_type.value
            if hasattr(flow.chat_type, "value")
            else str(flow.chat_type),
            is_published=flow.is_published,
            version=flow.version,
            created_at=flow.created_at.isoformat(),
            updated_at=None,
        )

    @get("/{flow_id:str}")
    async def get_flow(
        self, flow_id: str, request: Request, db: AsyncSession
    ) -> FlowResponse:
        get_current_user_id(request)
        flow = await get_flow_full(db, flow_id)
        if not flow:
            raise HTTPException(status_code=404, detail="Flow topilmadi")
        return _fmt(flow)

    @put("/{flow_id:str}")
    async def save(
        self, flow_id: str, data: FlowSave, request: Request, db: AsyncSession
    ) -> FlowResponse:
        get_current_user_id(request)
        flow = await get_flow_full(db, flow_id)
        if not flow:
            raise HTTPException(status_code=404, detail="Flow topilmadi")
        flow = await save_flow(db, flow, data.name, data.nodes, data.edges)
        return _fmt(flow)

    @post("/{flow_id:str}/publish")
    async def publish(
        self, flow_id: str, request: Request, db: AsyncSession
    ) -> FlowResponse:
        get_current_user_id(request)
        flow = await get_flow_full(db, flow_id)
        if not flow:
            raise HTTPException(status_code=404, detail="Flow topilmadi")
        await publish_flow(db, str(flow.bot_id), flow_id)
        flow = await get_flow_full(db, flow_id)
        return _fmt(flow)

    @delete("/{flow_id:str}")
    async def remove_flow(
        self, flow_id: str, request: Request, db: AsyncSession
    ) -> None:
        get_current_user_id(request)
        flow = await get_flow_full(db, flow_id)
        if not flow:
            raise HTTPException(status_code=404, detail="Flow topilmadi")
        await db.delete(flow)
        await db.commit()
