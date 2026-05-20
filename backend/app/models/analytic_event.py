import enum
import uuid

from sqlalchemy import Enum, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimeStampMixin, UUIDMixin


class EventType(str, enum.Enum):
    start = "start"
    message = "message"
    button_click = "button_click"
    flow_complete = "flow_complete"
    webapp_open = "webapp_open"


class AnalyticEvent(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "analytic_events"

    bot_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False
    )
    bot_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bot_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[EventType] = mapped_column(Enum(EventType), nullable=False)
    node_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    event_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
