from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimeStampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.bot import Bot
    from app.models.flow_edge import FlowEdge
    from app.models.flow_node import FlowNode


class FlowChatType(str, enum.Enum):
    user = "user"
    group = "group"
    channel = "channel"
    business = "business"


class Flow(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "flows"

    bot_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, default="Main Flow")
    chat_type: Mapped[FlowChatType] = mapped_column(
        Enum(FlowChatType), default=FlowChatType.user, nullable=False
    )
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)

    bot: Mapped["Bot"] = relationship("Bot", back_populates="flows")  # noqa: F821
    nodes: Mapped[list["FlowNode"]] = relationship(  # noqa: F821
        "FlowNode", back_populates="flow", cascade="all, delete-orphan"
    )
    edges: Mapped[list["FlowEdge"]] = relationship(  # noqa: F821
        "FlowEdge", back_populates="flow", cascade="all, delete-orphan"
    )
