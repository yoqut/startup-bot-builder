from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BotCreate(BaseModel):
    token: str = Field(..., min_length=40, description="Telegram bot token from @BotFather")
    name: str | None = Field(None, max_length=128)
    description: str | None = Field(None, max_length=512)


class BotUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    description: str | None = Field(None, max_length=512)


class BotResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None
    username: str | None
    telegram_bot_id: int | None
    status: str
    bot_type: str
    is_webhook_active: bool
    total_users: int
    active_users: int
    messages_today: int
    last_activity_at: datetime | None
    created_at: datetime
    avatar_url: str | None
    can_join_groups: bool
    supports_inline: bool
