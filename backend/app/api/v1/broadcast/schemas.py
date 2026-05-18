from pydantic import BaseModel


class BroadcastCreate(BaseModel):
    bot_id: str
    message: str
    media_url: str | None = None
    media_type: str | None = None  # photo | video | document
    target_tags: list[str] = []
    scheduled_at: str | None = None


class BroadcastOut(BaseModel):
    id: str
    bot_id: str
    message: str | None
    media_url: str | None
    media_type: str | None
    target_tags: list[str]
    status: str
    sent_count: int
    fail_count: int
    scheduled_at: str | None
    created_at: str
