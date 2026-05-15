"""Analytics models — time-series metrics, events, funnels."""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from src.core.database.models import Base, TimestampMixin, UUIDMixin


class BotAnalytics(Base, UUIDMixin):
    """Daily rollup stats per bot."""
    __tablename__ = "bot_analytics"

    bot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Engagement
    new_users: Mapped[int] = mapped_column(Integer, default=0)
    active_users: Mapped[int] = mapped_column(Integer, default=0)
    total_messages: Mapped[int] = mapped_column(Integer, default=0)
    total_callbacks: Mapped[int] = mapped_column(Integer, default=0)

    # Flows
    flow_executions: Mapped[int] = mapped_column(Integer, default=0)
    flow_errors: Mapped[int] = mapped_column(Integer, default=0)
    avg_execution_ms: Mapped[float] = mapped_column(Float, default=0.0)

    # AI
    ai_requests: Mapped[int] = mapped_column(Integer, default=0)
    ai_tokens_used: Mapped[int] = mapped_column(Integer, default=0)

    bot: Mapped["Bot"] = relationship(back_populates="analytics")


class AnalyticsEvent(Base, UUIDMixin):
    """Individual event records — supports custom event tracking."""
    __tablename__ = "analytics_events"

    bot_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)
    flow_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    user_telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)

    event_name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    properties: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )


class BotUser(Base, UUIDMixin, TimestampMixin):
    """Tracks individual users interacting with a bot."""
    __tablename__ = "bot_users"

    bot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True
    )
    telegram_user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    language_code: Mapped[str] = mapped_column(String(8), default="en")
    is_blocked: Mapped[bool] = mapped_column(default=False)

    message_count: Mapped[int] = mapped_column(Integer, default=0)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Stored variables for this user
    variables: Mapped[dict] = mapped_column(JSON, default=dict)

    bot: Mapped["Bot"] = relationship()
