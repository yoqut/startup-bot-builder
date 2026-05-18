from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TemplateCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    category: str | None = None
    complexity: str | None = None
    price_stars: int = Field(default=0, ge=0)
    flow_data: dict | None = None
    preview_url: str | None = None


class TemplateUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    complexity: str | None = None
    price_stars: int | None = Field(default=None, ge=0)
    preview_url: str | None = None


class TemplateReviewOut(BaseModel):
    id: str
    user_id: str
    template_id: str
    rating: int
    comment: str | None
    reviewer_name: str | None
    created_at: datetime


class TemplateOut(BaseModel):
    id: str
    creator_id: str
    title: str
    description: str | None
    category: str | None
    complexity: str | None
    price_stars: int
    is_published: bool
    is_featured: bool
    uses_count: int
    avg_rating: float
    review_count: int
    node_count: int
    preview_url: str | None
    created_at: datetime
    is_unlocked: bool = False
    is_own: bool = False


class TemplateDetailOut(TemplateOut):
    reviews: list[TemplateReviewOut] = []
    flow_data: dict[str, Any] | None = None


class TemplateReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class PublishFromFlowRequest(BaseModel):
    bot_id: str
    flow_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    category: str | None = None
    complexity: str | None = None
    price_stars: int = Field(default=0, ge=0)


class UseTemplateRequest(BaseModel):
    bot_id: str
