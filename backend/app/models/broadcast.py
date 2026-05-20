import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimeStampMixin, UUIDMixin


class BroadcastStatus(str, enum.Enum):
    draft = "draft"
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class Broadcast(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "broadcasts"

    bot_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(String, nullable=True)
    media_type: Mapped[str | None] = mapped_column(String, nullable=True)
    target_tags: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[BroadcastStatus] = mapped_column(
        Enum(BroadcastStatus), default=BroadcastStatus.draft
    )
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    fail_count: Mapped[int] = mapped_column(Integer, default=0)
    scheduled_at: Mapped[str | None] = mapped_column(nullable=True)
