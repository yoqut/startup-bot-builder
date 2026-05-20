import uuid

from sqlalchemy import ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin
from app.models.flow import Flow


class FlowEdge(Base, UUIDMixin):
    __tablename__ = "flow_edges"
    __table_args__ = (
        Index("ix_flow_edges_flow_id", "flow_id"),
    )

    flow_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("flows.id", ondelete="CASCADE"), nullable=False
    )
    source_node_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("flow_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_node_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("flow_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    condition_key: Mapped[str | None] = mapped_column(String, nullable=True)

    flow: Mapped["Flow"] = relationship("Flow", back_populates="edges")  # noqa: F821
