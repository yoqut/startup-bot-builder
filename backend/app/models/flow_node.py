import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimeStampMixin, UUIDMixin
from app.models.flow import Flow


class NodeType(str, enum.Enum):
    start = "start"
    command = "command"
    handler = "handler"
    message = "message"
    button = "button"
    input = "input"
    condition = "condition"
    delay = "delay"
    set_variable = "set_variable"
    api_call = "api_call"
    ai = "ai"
    media = "media"
    catalog = "catalog"
    auto_delete = "auto_delete"
    send_to = "send_to"
    business_handler = "business_handler"
    sticky = "sticky"
    end = "end"


class FlowNode(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "flow_nodes"

    flow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("flows.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[NodeType] = mapped_column(Enum(NodeType), nullable=False)
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    position_x: Mapped[float] = mapped_column(Float, default=0)
    position_y: Mapped[float] = mapped_column(Float, default=0)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)

    flow: Mapped["Flow"] = relationship("Flow", back_populates="nodes")  # noqa: F821
