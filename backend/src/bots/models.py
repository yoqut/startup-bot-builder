"""
Bot model — each bot is a Telegram bot token + metadata.
Tokens encrypted at rest with Fernet (AES-128-CBC + HMAC-SHA256).
Multi-tenant: each bot fully isolated in execution.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database.models import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin


class BotStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    PENDING = "pending"


class BotType(StrEnum):
    PRIVATE = "private"      # Private chats
    GROUP = "group"          # Groups / supergroups
    CHANNEL = "channel"      # Channels
    BUSINESS = "business"    # Telegram Business


class Bot(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "bots"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    telegram_bot_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, unique=True)

    # Token stored encrypted; never exposed in API responses
    token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[BotStatus] = mapped_column(String(32), default=BotStatus.PENDING, nullable=False)
    bot_type: Mapped[BotType] = mapped_column(String(32), default=BotType.PRIVATE, nullable=False)

    webhook_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    webhook_secret: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_webhook_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Bot metadata from Telegram API
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    can_join_groups: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_read_messages: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    supports_inline: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Stats (denormalized for fast reads)
    total_users: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_users: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    messages_today: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="bots")
    flows: Mapped[list["Flow"]] = relationship(back_populates="bot", cascade="all, delete-orphan")
    analytics: Mapped[list["BotAnalytics"]] = relationship(back_populates="bot")
    members: Mapped[list["BotMember"]] = relationship(back_populates="bot", cascade="all, delete-orphan")


class BotMember(Base, UUIDMixin, TimestampMixin):
    """Collaborate on a bot — shared team access."""
    __tablename__ = "bot_members"

    bot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bots.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(32), default="viewer", nullable=False)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    bot: Mapped[Bot] = relationship(back_populates="members")
