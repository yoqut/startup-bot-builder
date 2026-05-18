import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.flow_node import FlowNode, NodeType
from app.models.flow_edge import FlowEdge
from app.runtime.nodes.base import ExecutionContext, ExecutionResult
from app.runtime.nodes.message import MessageNode
from app.runtime.nodes.button import ButtonNode
from app.runtime.nodes.input import InputNode
from app.runtime.nodes.condition import ConditionNode
from app.runtime.nodes.api_call import ApiCallNode
from app.runtime.nodes.ai import AiNode
from app.runtime.nodes.command import CommandNode
from app.runtime.nodes.delay import DelayNode
from app.runtime.nodes.set_variable import SetVariableNode
from app.runtime.nodes.handler import HandlerNode
from app.runtime.nodes.auto_delete import AutoDeleteNode
from app.runtime.nodes.send_to import SendToNode
from app.runtime.nodes.business_handler import BusinessHandlerNode
from app.runtime import state as state_manager

NODE_REGISTRY = {
    NodeType.start: CommandNode,
    NodeType.command: CommandNode,
    NodeType.handler: HandlerNode,
    NodeType.message: MessageNode,
    NodeType.button: ButtonNode,
    NodeType.input: InputNode,
    NodeType.condition: ConditionNode,
    NodeType.delay: DelayNode,
    NodeType.set_variable: SetVariableNode,
    NodeType.api_call: ApiCallNode,
    NodeType.ai: AiNode,
    NodeType.auto_delete: AutoDeleteNode,
    NodeType.send_to: SendToNode,
    NodeType.business_handler: BusinessHandlerNode,
}

MAX_HOPS = 20


async def execute_flow(
    db: AsyncSession,
    bot_id: str,
    bot_token: str,
    telegram_user_id: int,
    chat_id: int,
    start_node_id: str,
    message_text: str | None = None,
    callback_data: str | None = None,
    callback_message_id: int | None = None,
    business_connection_id: str | None = None,
) -> None:
    # Load starting node to get flow_id
    try:
        start_uuid = uuid.UUID(start_node_id)
    except ValueError, AttributeError:
        return
    result = await db.execute(select(FlowNode).where(FlowNode.id == start_uuid))
    start_node = result.scalar_one_or_none()
    if not start_node:
        return

    # Load ALL edges for this flow once — build adjacency map
    edges_result = await db.execute(
        select(FlowEdge).where(FlowEdge.flow_id == start_node.flow_id)
    )
    edges = edges_result.scalars().all()

    # edge_map[source_node_id] = list of {handle, target}
    edge_map: dict[str, list[dict]] = {}
    for e in edges:
        sid = str(e.source_node_id)
        edge_map.setdefault(sid, []).append(
            {
                "handle": e.condition_key or "default",
                "target": str(e.target_node_id),
            }
        )

    # Load current user state for variables
    current_state = await state_manager.get_state(bot_id, telegram_user_id)
    variables = current_state.get("variables", {})

    ctx = ExecutionContext(
        bot_id=bot_id,
        bot_token=bot_token,
        telegram_user_id=telegram_user_id,
        chat_id=chat_id,
        variables=variables,
        message_text=message_text,
        callback_data=callback_data,
        callback_message_id=callback_message_id,
        db=db,
        business_connection_id=business_connection_id,
    )

    node_id = start_node_id
    visited: set[str] = set()

    for _ in range(MAX_HOPS):
        if not node_id or node_id in visited:
            break
        visited.add(node_id)

        # Load node
        try:
            node_uuid = uuid.UUID(node_id)
        except ValueError, AttributeError:
            break
        node_result = await db.execute(select(FlowNode).where(FlowNode.id == node_uuid))
        node = node_result.scalar_one_or_none()
        if not node or node.type == NodeType.end:
            break

        node_class = NODE_REGISTRY.get(node.type)
        if not node_class:
            # Unknown type: skip to first outgoing edge
            outgoing = edge_map.get(node_id, [])
            node_id = outgoing[0]["target"] if outgoing else None
            continue

        # Enrich message node config with button targets from edges
        config = dict(node.config)
        if node.type in (NodeType.message, NodeType.button):
            outgoing = edge_map.get(node_id, [])
            buttons = config.get("buttons", [])
            enriched = []
            for i, btn in enumerate(buttons):
                btn = dict(btn)
                edge = next(
                    (e for e in outgoing if e["handle"] == f"btn_{i}"),
                    None,
                )
                if edge:
                    btn["target_node_id"] = edge["target"]
                enriched.append(btn)
            config["buttons"] = enriched

        executor = node_class(str(node.id), config)
        exec_result: ExecutionResult = await executor.execute(ctx)

        ctx.variables = exec_result.variables
        # Clear message_text after trigger nodes so downstream nodes (e.g. InputNode)
        # don't mistake the command text for user input
        if node.type in (
            NodeType.start,
            NodeType.command,
            NodeType.handler,
            NodeType.business_handler,
        ):
            ctx.message_text = None

        if exec_result.wait_for_input:
            # Pause execution — save current node so dispatcher resumes here
            await state_manager.save_state(
                bot_id,
                telegram_user_id,
                {
                    "current_node_id": node_id,
                    "variables": ctx.variables,
                },
            )
            return

        # Resolve next node: prefer explicit next_node_id, then edge lookup
        if exec_result.next_node_id:
            node_id = exec_result.next_node_id
        else:
            outgoing = edge_map.get(node_id, [])
            handle = exec_result.handle or "default"
            edge = next((e for e in outgoing if e["handle"] == handle), None)
            if edge is None and outgoing:
                edge = outgoing[0]  # fallback to first edge
            node_id = edge["target"] if edge else None

    # Clear or update state at end
    await state_manager.save_state(
        bot_id,
        telegram_user_id,
        {
            "current_node_id": node_id,
            "variables": ctx.variables,
        },
    )
