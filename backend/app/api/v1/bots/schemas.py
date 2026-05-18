from pydantic import BaseModel


class BotCreate(BaseModel):
    name: str
    token: str


class BotAutoCreate(BaseModel):
    bot_name: str
    bot_username: str


class BotUpdate(BaseModel):
    name: str | None = None
    is_for_sale: bool | None = None
    sale_price: float | None = None


class BotResponse(BaseModel):
    id: str
    name: str
    username: str | None
    is_active: bool
    is_for_sale: bool
    sale_price: float | None
    webhook_url: str | None
    created_at: str


class BotStatsResponse(BaseModel):
    total_users: int
    active_users_7d: int
    total_messages: int
