from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class TelegramInitData(BaseModel):
    init_data: str = Field(..., description="Raw Telegram WebApp initData string")


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserCreate(BaseModel):
    telegram_id: int
    username: str | None = None
    first_name: str
    last_name: str | None = None
    language_code: str = "en"


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    telegram_id: int
    username: str | None
    first_name: str
    last_name: str | None
    photo_url: str | None
    role: str
    subscription_plan: str
    is_premium: bool
    created_at: datetime
    last_active_at: datetime | None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str
