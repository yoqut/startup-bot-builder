import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.flow import Flow, FlowChatType
from app.models.flow_edge import FlowEdge
from app.models.flow_node import FlowNode, NodeType


async def get_bot_flows(db: AsyncSession, bot_id: str, chat_type: str | None = None):
    q = select(Flow).where(Flow.bot_id == uuid.UUID(bot_id))
    if chat_type:
        q = q.where(Flow.chat_type == FlowChatType(chat_type))
    q = q.order_by(Flow.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


async def get_or_create_flow(db: AsyncSession, bot_id: str, chat_type: str) -> Flow:
    """Return the latest flow for this bot+chat_type, creating one if none exist."""
    result = await db.execute(
        select(Flow)
        .where(
            Flow.bot_id == uuid.UUID(bot_id), Flow.chat_type == FlowChatType(chat_type)
        )
        .order_by(Flow.created_at.desc())
        .limit(1)
    )
    flow = result.scalar_one_or_none()
    if not flow:
        flow = Flow(
            bot_id=uuid.UUID(bot_id),
            name=f"{chat_type.capitalize()} Flow",
            chat_type=FlowChatType(chat_type),
        )
        db.add(flow)
        await db.commit()
        await db.refresh(flow)
    return flow


async def create_flow(
    db: AsyncSession, bot_id: str, name: str, chat_type: str = "user"
) -> Flow:
    flow = Flow(bot_id=uuid.UUID(bot_id), name=name, chat_type=FlowChatType(chat_type))
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return flow


async def get_flow_full(db: AsyncSession, flow_id: str) -> Flow | None:
    result = await db.execute(
        select(Flow)
        .options(selectinload(Flow.nodes), selectinload(Flow.edges))
        .where(Flow.id == uuid.UUID(flow_id))
    )
    return result.scalar_one_or_none()


async def save_flow(
    db: AsyncSession, flow: Flow, name: str | None, nodes: list, edges: list
):
    if name:
        flow.name = name

    await db.execute(delete(FlowEdge).where(FlowEdge.flow_id == flow.id))
    await db.execute(delete(FlowNode).where(FlowNode.flow_id == flow.id))
    await db.flush()

    def to_uuid(val: str | None) -> uuid.UUID:
        if not val:
            return uuid.uuid4()
        try:
            return uuid.UUID(val)
        except (ValueError, AttributeError):
            return uuid.uuid4()

    # Build mapping: original React Flow node ID → assigned DB UUID
    id_map: dict[str, uuid.UUID] = {}
    for n in nodes:
        assigned = to_uuid(n.id)
        id_map[n.id] = assigned
        node = FlowNode(
            id=assigned,
            flow_id=flow.id,
            type=NodeType(n.type),
            label=n.label,
            position_x=n.position_x,
            position_y=n.position_y,
            config=n.config,
        )
        db.add(node)

    await db.flush()  # nodes DB'ga tushsin, keyin edges FK check qiladi

    for e in edges:
        # Resolve source/target via id_map first, then try direct UUID parse
        src_id = id_map.get(e.source_node_id)
        if src_id is None:
            try:
                src_id = uuid.UUID(e.source_node_id)
            except (ValueError, AttributeError):
                continue

        tgt_id = id_map.get(e.target_node_id)
        if tgt_id is None:
            try:
                tgt_id = uuid.UUID(e.target_node_id)
            except (ValueError, AttributeError):
                continue

        edge = FlowEdge(
            id=to_uuid(e.id),
            flow_id=flow.id,
            source_node_id=src_id,
            target_node_id=tgt_id,
            label=e.label,
            condition_key=e.condition_key,
        )
        db.add(edge)

    flow.version += 1
    flow_id = str(flow.id)
    await db.commit()
    db.expire_all()
    return await get_flow_full(db, flow_id)


async def publish_flow(db: AsyncSession, bot_id: str, flow_id: str) -> Flow:
    from sqlalchemy import update as sa_update

    result = await db.execute(select(Flow).where(Flow.id == uuid.UUID(flow_id)))
    flow = result.scalar_one()
    # Unpublish all flows of the SAME chat_type for this bot
    await db.execute(
        sa_update(Flow)
        .where(Flow.bot_id == uuid.UUID(bot_id), Flow.chat_type == flow.chat_type)
        .values(is_published=False)
    )
    flow.is_published = True
    await db.commit()
    return flow
