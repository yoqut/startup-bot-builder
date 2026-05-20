from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimeStampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.flow import Flow
    from app.models.bot_user import BotUser
    from app.models.webapp import WebApp
    from app.models.user import User


class Bot(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "bots"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String, nullable=True)
    webhook_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    is_for_sale: Mapped[bool] = mapped_column(Boolean, default=False)
    sale_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    owner: Mapped["User"] = relationship("User", back_populates="bots")  # noqa: F821
    flows: Mapped[list["Flow"]] = relationship(
        "Flow", back_populates="bot", passive_deletes=True
    )  # noqa: F821
    webapps: Mapped[list["WebApp"]] = relationship(
        "WebApp", back_populates="bot", passive_deletes=True
    )  # noqa: F821
    bot_users: Mapped[list["BotUser"]] = relationship(
        "BotUser", back_populates="bot", passive_deletes=True
    )  # noqa: F821
