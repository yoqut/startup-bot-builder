from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text,
    UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimeStampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


TEMPLATE_CATEGORIES = [
    "E-commerce", "Support", "Booking", "FAQ", "Quiz", "Loyalty", "Other",
]

TEMPLATE_COMPLEXITIES = ["simple", "medium", "advanced"]


class Template(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "templates"

    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    complexity: Mapped[str | None] = mapped_column(String(20), nullable=True)  # simple/medium/advanced
    price_stars: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    flow_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    preview_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uses_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    creator: Mapped["User"] = relationship("User", back_populates="templates")
    purchases: Mapped[list["UserTemplate"]] = relationship(
        "UserTemplate", back_populates="template", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["TemplateReview"]] = relationship(
        "TemplateReview", back_populates="template", cascade="all, delete-orphan",
        order_by="TemplateReview.created_at.desc()",
    )


class UserTemplate(Base):
    """Unlock table — tracks which users have access to which templates."""
    __tablename__ = "user_templates"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), primary_key=True
    )
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    template: Mapped["Template"] = relationship("Template", back_populates="purchases")


class TemplateReview(Base, UUIDMixin):
    """User review/rating for a template."""
    __tablename__ = "template_reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "template_id", name="uq_template_reviews_user_template"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    template: Mapped["Template"] = relationship("Template", back_populates="reviews")
