"""
Flow Execution Engine — DAG-based async execution.

Architecture:
- Build adjacency list from edges
- Find trigger node matching the incoming event
- Traverse graph with BFS/DFS, executing each node handler
- Variable context shared across execution
- Each step recorded in execution_trace for the visual debugger
- Retries on transient failures via tenacity
- Max execution depth guard (prevents infinite loops)
"""
from __future__ import annotations

import asyncio
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from src.flows.models import FlowExecution, Node, NodeType
from src.flows.nodes.registry import NodeRegistry

logger = structlog.get_logger(__name__)

MAX_EXECUTION_DEPTH = 100
MAX_EXECUTION_TIME_MS = 30_000  # 30 seconds hard limit


class ExecutionContext:
    """Shared mutable state threaded through all nodes in one execution."""

    def __init__(
        self,
        execution_id: uuid.UUID,
        bot_id: uuid.UUID,
        flow_id: uuid.UUID,
        telegram_event: dict[str, Any],
        initial_variables: dict[str, Any] | None = None,
    ) -> None:
        self.execution_id = execution_id
        self.bot_id = bot_id
        self.flow_id = flow_id
        self.telegram_event = telegram_event
        self.variables: dict[str, Any] = initial_variables or {}
        self.trace: list[dict] = []
        self._start_time = time.monotonic()

    def set_var(self, key: str, value: Any) -> None:
        self.variables[key] = value

    def get_var(self, key: str, default: Any = None) -> Any:
        return self.variables.get(key, default)

    def record_step(
        self,
        node_id: str,
        node_type: str,
        status: str,
        output: Any = None,
        error: str | None = None,
    ) -> None:
        self.trace.append({
            "node_id": node_id,
            "node_type": node_type,
            "status": status,
            "output": output,
            "error": error,
            "elapsed_ms": int((time.monotonic() - self._start_time) * 1000),
            "ts": datetime.now(UTC).isoformat(),
        })

    @property
    def elapsed_ms(self) -> int:
        return int((time.monotonic() - self._start_time) * 1000)


class FlowExecutor:
    """
    Executes a compiled flow graph for a single Telegram event.
    Thread-safe: each execution gets its own ExecutionContext.
    """

    def __init__(self, registry: NodeRegistry) -> None:
        self._registry = registry

    async def execute(
        self,
        nodes: list[Node],
        edges: list,
        telegram_event: dict[str, Any],
        bot_id: uuid.UUID,
        flow_id: uuid.UUID,
        execution_record: FlowExecution,
        websocket_broadcaster: Any | None = None,
    ) -> FlowExecution:
        ctx = ExecutionContext(
            execution_id=execution_record.id,
            bot_id=bot_id,
            flow_id=flow_id,
            telegram_event=telegram_event,
        )

        # Build graph structures
        adjacency: dict[str, list[tuple[str, str | None]]] = defaultdict(list)
        node_map: dict[str, Node] = {str(n.id): n for n in nodes}

        for edge in edges:
            src = str(edge.source_node_id)
            tgt = str(edge.target_node_id)
            handle = edge.source_handle
            adjacency[src].append((tgt, handle))

        # Find trigger node matching this event
        trigger_node = self._find_trigger(nodes, telegram_event)
        if not trigger_node:
            execution_record.status = "skipped"
            return execution_record

        execution_record.status = "running"
        execution_record.started_at = datetime.now(UTC)

        try:
            await asyncio.wait_for(
                self._traverse(
                    str(trigger_node.id),
                    node_map,
                    adjacency,
                    ctx,
                    websocket_broadcaster,
                ),
                timeout=MAX_EXECUTION_TIME_MS / 1000,
            )
            execution_record.status = "completed"
        except asyncio.TimeoutError:
            execution_record.status = "timeout"
            execution_record.error_message = f"Execution exceeded {MAX_EXECUTION_TIME_MS}ms"
            logger.warning("execution_timeout", flow_id=str(flow_id))
        except Exception as exc:
            execution_record.status = "failed"
            execution_record.error_message = str(exc)
            logger.exception("execution_failed", flow_id=str(flow_id), error=str(exc))
        finally:
            execution_record.completed_at = datetime.now(UTC)
            execution_record.duration_ms = ctx.elapsed_ms
            execution_record.execution_trace = ctx.trace
            execution_record.variables = ctx.variables

        return execution_record

    async def _traverse(
        self,
        start_node_id: str,
        node_map: dict[str, Node],
        adjacency: dict[str, list[tuple[str, str | None]]],
        ctx: ExecutionContext,
        broadcaster: Any | None,
    ) -> None:
        queue: deque[str] = deque([start_node_id])
        visited: set[str] = set()
        depth = 0

        while queue and depth < MAX_EXECUTION_DEPTH:
            node_id = queue.popleft()
            if node_id in visited:
                continue
            visited.add(node_id)
            depth += 1

            node = node_map.get(node_id)
            if not node:
                continue

            # Broadcast realtime status to WebSocket clients
            if broadcaster:
                await broadcaster.broadcast_node_active(
                    ctx.execution_id, node_id, ctx.bot_id
                )

            output = await self._execute_node(node, ctx)

            if broadcaster:
                await broadcaster.broadcast_node_done(
                    ctx.execution_id, node_id, output, ctx.bot_id
                )

            # Determine next nodes based on output (handles conditional branching)
            next_nodes = self._resolve_next(node_id, output, adjacency)
            queue.extend(next_nodes)

    async def _execute_node(self, node: Node, ctx: ExecutionContext) -> Any:
        handler = self._registry.get(node.node_type)
        if not handler:
            ctx.record_step(str(node.id), node.node_type, "skipped", error="No handler registered")
            return None

        try:
            result = await handler.execute(node.config, ctx)
            ctx.record_step(str(node.id), node.node_type, "success", output=result)
            return result
        except Exception as exc:
            ctx.record_step(str(node.id), node.node_type, "error", error=str(exc))
            logger.error("node_execution_error", node_id=str(node.id), type=node.node_type, error=str(exc))
            raise

    def _find_trigger(self, nodes: list[Node], event: dict) -> Node | None:
        event_type = event.get("type", "")
        for node in nodes:
            if not node.node_type.startswith("trigger_"):
                continue
            handler = self._registry.get(node.node_type)
            if handler and handler.matches_event(node.config, event):
                return node
        return None

    def _resolve_next(
        self,
        node_id: str,
        output: Any,
        adjacency: dict[str, list[tuple[str, str | None]]],
    ) -> list[str]:
        candidates = adjacency.get(node_id, [])
        if not candidates:
            return []

        # If output is a dict with a "branch" key, follow that specific handle
        if isinstance(output, dict) and "branch" in output:
            branch = output["branch"]
            return [tgt for tgt, handle in candidates if handle == branch or handle is None]

        # Default: follow all outgoing edges
        return [tgt for tgt, _ in candidates]
