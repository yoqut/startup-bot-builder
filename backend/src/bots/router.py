"""Bot management API routes."""
from __future__ import annotations

import uuid

from litestar import Router, delete, get, patch, post
from litestar.di import Provide
from sqlalchemy.ext.asyncio import AsyncSession

from src.bots.schemas import BotCreate, BotResponse, BotUpdate
from src.bots.service import BotService
from src.core.database.base import get_db
from src.core.security.deps import current_user


@post("/")
async def create_bot(
    data: BotCreate,
    db: AsyncSession,
    user: dict,
) -> BotResponse:
    service = BotService(db)
    bot = await service.create_bot(user["id"], data)
    await db.commit()
    return BotResponse.model_validate(bot)


@get("/")
async def list_bots(db: AsyncSession, user: dict) -> list[BotResponse]:
    service = BotService(db)
    bots = await service.list_bots(user["id"])
    return [BotResponse.model_validate(b) for b in bots]


@get("/{bot_id:uuid}")
async def get_bot(bot_id: uuid.UUID, db: AsyncSession, user: dict) -> BotResponse:
    service = BotService(db)
    bot = await service.get_bot(bot_id, user["id"])
    return BotResponse.model_validate(bot)


@patch("/{bot_id:uuid}")
async def update_bot(
    bot_id: uuid.UUID,
    data: BotUpdate,
    db: AsyncSession,
    user: dict,
) -> BotResponse:
    service = BotService(db)
    bot = await service.update_bot(bot_id, user["id"], data)
    await db.commit()
    return BotResponse.model_validate(bot)


@delete("/{bot_id:uuid}", status_code=204)
async def delete_bot(bot_id: uuid.UUID, db: AsyncSession, user: dict) -> None:
    service = BotService(db)
    await service.delete_bot(bot_id, user["id"])
    await db.commit()


bots_router = Router(
    path="/api/v1/bots",
    route_handlers=[create_bot, list_bots, get_bot, update_bot, delete_bot],
    dependencies={"db": Provide(get_db), "user": Provide(current_user)},
)
