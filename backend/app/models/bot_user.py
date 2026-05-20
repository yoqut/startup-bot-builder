from datetime import datetime
import uuid

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, JSON, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimeStampMixin, UUIDMixin
from app.models.bot import Bot


class BotUser(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "bot_users"
    __table_args__ = (
        UniqueConstraint("bot_id", "telegram_id"),
        Index("ix_bot_users_bot_id", "bot_id"),
        Index("ix_bot_users_last_seen_at", "last_seen_at"),
    )

    bot_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False
    )
    telegram_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    username: Mapped[str | None] = mapped_column(String, nullable=True)
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    language_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    variables: Mapped[dict] = mapped_column(JSON, default=dict)
    first_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    bot: Mapped["Bot"] = relationship("Bot", back_populates="bot_users")  # noqa: F821
