from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    max_bots: Mapped[int] = mapped_column(Integer, default=3)
    max_webapps: Mapped[int] = mapped_column(Integer, default=1)
    max_bot_users: Mapped[int] = mapped_column(BigInteger, default=500_000)
    has_ads: Mapped[bool] = mapped_column(Boolean, default=True)
    multi_lang: Mapped[bool] = mapped_column(Boolean, default=False)
    webhook_access: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_nodes: Mapped[bool] = mapped_column(Boolean, default=False)
    marketplace: Mapped[bool] = mapped_column(Boolean, default=False)
    crm_access: Mapped[bool] = mapped_column(Boolean, default=False)
    erp_access: Mapped[bool] = mapped_column(Boolean, default=False)

    users: Mapped[list["User"]] = relationship("User", back_populates="plan")  # noqa: F821
