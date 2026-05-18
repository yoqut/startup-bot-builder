from datetime import datetime
import uuid

from sqlalchemy import ARRAY, BigInteger, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimeStampMixin, UUIDMixin
from app.models.bot import Bot


class BotUser(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "bot_users"
    __table_args__ = (UniqueConstraint("bot_id", "telegram_id"),)

    bot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False
    )
    telegram_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    username: Mapped[str | None] = mapped_column(String, nullable=True)
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    language_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    variables: Mapped[dict] = mapped_column(JSONB, default=dict)
    first_seen_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_seen_at: Mapped[DateTime | datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    bot: Mapped["Bot"] = relationship("Bot", back_populates="bot_users")  # noqa: F821
