"""
Flow, Node, Edge models — the core of the visual builder.
A Flow is a DAG: Nodes are vertices, Edges are directed connections.
Version history stored separately for rollback support.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from src.core.database.models import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin

# JSONB for PostgreSQL, JSON for SQLite
JsonType = JSON


class FlowStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class NodeType(StrEnum):
    # Universal nodes — one per concern
    TRIGGER      = "trigger"       # All Telegram events + filters
    MESSAGE      = "message"       # All content types + keyboards
    CONDITION    = "condition"     # If/else branching
    DELAY        = "delay"         # Wait
    HTTP_REQUEST = "http_request"  # External API
    AI_REPLY     = "ai_reply"      # AI response
    VARIABLE     = "variable"      # Set/get/update/delete/increment
    SPLIT        = "split"         # Random A/B traffic split
    LOOP         = "loop"          # Iterate over list
    TRACK_EVENT  = "track_event"   # Analytics


class Flow(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "flows"

    bot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[FlowStatus] = mapped_column(String(32), default=FlowStatus.DRAFT, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Viewport state for the visual editor (zoom, pan position)
    viewport: Mapped[dict] = mapped_column(JsonType, default=dict, nullable=False)

    # Execution stats
    total_executions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    bot: Mapped["Bot"] = relationship(back_populates="flows")
    nodes: Mapped[list["Node"]] = relationship(back_populates="flow", cascade="all, delete-orphan")
    edges: Mapped[list["Edge"]] = relationship(back_populates="flow", cascade="all, delete-orphan")
    versions: Mapped[list["FlowVersion"]] = relationship(back_populates="flow", cascade="all, delete-orphan")
    executions: Mapped[list["FlowExecution"]] = relationship(back_populates="flow")


class Node(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "nodes"

    flow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"), nullable=False, index=True
    )

    node_type: Mapped[NodeType] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)

    # Position on canvas
    position_x: Mapped[float] = mapped_column(nullable=False, default=0.0)
    position_y: Mapped[float] = mapped_column(nullable=False, default=0.0)

    # Node-specific configuration (validated against node type schema)
    config: Mapped[dict] = mapped_column(JsonType, default=dict, nullable=False)

    # UI state
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    flow: Mapped[Flow] = relationship(back_populates="nodes")
    outgoing_edges: Mapped[list["Edge"]] = relationship(
        back_populates="source_node",
        foreign_keys="Edge.source_node_id",
    )
    incoming_edges: Mapped[list["Edge"]] = relationship(
        back_populates="target_node",
        foreign_keys="Edge.target_node_id",
    )


class Edge(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "edges"

    flow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_node_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False
    )
    target_node_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False
    )

    # For conditional nodes: which output port this edge connects from
    source_handle: Mapped[str | None] = mapped_column(String(64), nullable=True)
    target_handle: Mapped[str | None] = mapped_column(String(64), nullable=True)
    label: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Edge styling
    edge_type: Mapped[str] = mapped_column(String(32), default="smoothstep", nullable=False)
    animated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    flow: Mapped[Flow] = relationship(back_populates="edges")
    source_node: Mapped[Node] = relationship(back_populates="outgoing_edges", foreign_keys=[source_node_id])
    target_node: Mapped[Node] = relationship(back_populates="incoming_edges", foreign_keys=[target_node_id])


class FlowVersion(Base, UUIDMixin, TimestampMixin):
    """Immutable snapshot of a flow at a point in time."""
    __tablename__ = "flow_versions"

    flow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JsonType, nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    flow: Mapped[Flow] = relationship(back_populates="versions")


class FlowExecution(Base, UUIDMixin):
    """Execution record for a single flow run (one Telegram event)."""
    __tablename__ = "flow_executions"

    flow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"), nullable=False, index=True
    )
    bot_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)

    # Telegram context
    telegram_user_id: Mapped[int | None] = mapped_column(nullable=True)
    telegram_chat_id: Mapped[int | None] = mapped_column(nullable=True)
    trigger_event: Mapped[str] = mapped_column(String(64), nullable=False)
    trigger_data: Mapped[dict] = mapped_column(JsonType, default=dict, nullable=False)

    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Execution trace for debugger
    execution_trace: Mapped[list] = mapped_column(JsonType, default=list, nullable=False)
    variables: Mapped[dict] = mapped_column(JsonType, default=dict, nullable=False)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    flow: Mapped[Flow] = relationship(back_populates="executions")
