from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimeStampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.subscription import Plan
    from app.models.bot import Bot
    from app.models.template import Template


class UserRole(str, enum.Enum):
    superadmin = "superadmin"
    user = "user"


class User(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "users"

    telegram_id: Mapped[int | None] = mapped_column(
        BigInteger, unique=True, nullable=True
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.user, nullable=False
    )
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    plan_expires_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    plan: Mapped["Plan"] = relationship("Plan", back_populates="users")  # noqa: F821
    bots: Mapped[list["Bot"]] = relationship("Bot", back_populates="owner")  # noqa: F821
    templates: Mapped[list["Template"]] = relationship("Template", back_populates="creator")  # noqa: F821
