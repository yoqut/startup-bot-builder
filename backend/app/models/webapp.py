import uuid

from sqlalchemy import Boolean, ForeignKey, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimeStampMixin, UUIDMixin
from app.models.bot import Bot


class WebApp(Base, UUIDMixin, TimeStampMixin):
    __tablename__ = "webapps"

    bot_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    layout: Mapped[dict] = mapped_column(JSON, default=dict)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    bot: Mapped["Bot"] = relationship("Bot", back_populates="webapps")  # noqa: F821
