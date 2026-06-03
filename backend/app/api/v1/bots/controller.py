from litestar import Controller, delete, get, patch, post
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.bots.schemas import (
    BotAutoCreate,
    BotCreate,
    BotResponse,
    BotStatsResponse,
    BotUpdate,
)
from app.api.v1.bots.service import (
    create_bot,
    delete_webhook,
    get_bot_by_id,
    get_bot_stats,
    get_user_bots,
    set_webhook,
)
from app.api.v1.dependencies import get_current_user_id
from app.db.session import get_db
from app.settings import settings


def _fmt(bot) -> BotResponse:
    return BotResponse(
        id=str(bot.id),
        name=bot.name,
        username=bot.username,
        is_active=bot.is_active,
        is_for_sale=bot.is_for_sale,
        sale_price=float(bot.sale_price) if bot.sale_price else None,
        webhook_url=bot.webhook_url,
        created_at=bot.created_at.isoformat(),
    )


class BotsController(Controller):
    path = "/api/v1/bots"
    dependencies = {"db": Provide(get_db)}

    @get("/")
    async def list_bots(self, request: Request, db: AsyncSession) -> list[BotResponse]:
        user_id = get_current_user_id(request)
        bots = await get_user_bots(db, user_id)
        return [_fmt(b) for b in bots]

    @post("/")
    async def add_bot(
        self, data: BotCreate, request: Request, db: AsyncSession
    ) -> BotResponse:
        user_id = get_current_user_id(request)
        try:
            bot = await create_bot(db, user_id, data.name, data.token)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        try:
            await set_webhook(db, bot)
        except Exception as e:
            # Webhook failure is non-fatal: bot is saved, user can activate manually
            import logging

            logging.getLogger(__name__).warning(
                "Auto-webhook failed for bot %s: %s", bot.id, e
            )
        return _fmt(bot)

    @get("/{bot_id:str}")
    async def get_bot(
        self, bot_id: str, request: Request, db: AsyncSession
    ) -> BotResponse:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        return _fmt(bot)

    @patch("/{bot_id:str}")
    async def update_bot(
        self, bot_id: str, data: BotUpdate, request: Request, db: AsyncSession
    ) -> BotResponse:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        if data.name is not None:
            bot.name = data.name
        if data.is_for_sale is not None:
            bot.is_for_sale = data.is_for_sale
        if data.sale_price is not None:
            bot.sale_price = data.sale_price
        await db.commit()
        return _fmt(bot)

    @delete("/{bot_id:str}")
    async def remove_bot(self, bot_id: str, request: Request, db: AsyncSession) -> None:
        import logging, uuid as _uuid
        user_id = get_current_user_id(request)
        try:
            _uuid.UUID(bot_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        if bot.is_active:
            try:
                await delete_webhook(db, bot)
            except Exception as e:
                logging.getLogger(__name__).warning("Webhook o'chirishda xato (bot o'chiriladi): %s", e)
                bot.is_active = False
        await db.delete(bot)
        await db.commit()

    @post("/{bot_id:str}/duplicate")
    async def duplicate_bot(
        self, bot_id: str, request: Request, db: AsyncSession
    ) -> BotResponse:
        import uuid as _uuid
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        from app.models.bot import Bot as BotModel
        from app.models.flow import Flow
        from app.models.flow_node import FlowNode
        from app.models.flow_edge import FlowEdge
        from sqlalchemy import select
        new_bot = BotModel(
            user_id=_uuid.UUID(user_id),
            name=f"{bot.name} (copy)",
            token=f"PENDING:{_uuid.uuid4().hex}",
            username=None,
            is_active=False,
        )
        db.add(new_bot)
        await db.flush()
        flows = (await db.execute(select(Flow).where(Flow.bot_id == bot.id))).scalars().all()
        for flow in flows:
            new_flow = Flow(
                bot_id=new_bot.id,
                name=flow.name,
                is_published=False,
            )
            db.add(new_flow)
            await db.flush()
            nodes = (await db.execute(select(FlowNode).where(FlowNode.flow_id == flow.id))).scalars().all()
            node_id_map: dict[_uuid.UUID, _uuid.UUID] = {}
            for node in nodes:
                new_node = FlowNode(
                    flow_id=new_flow.id,
                    type=node.type,
                    label=node.label,
                    config=node.config,
                    position_x=node.position_x,
                    position_y=node.position_y,
                )
                db.add(new_node)
                await db.flush()
                node_id_map[node.id] = new_node.id
            edges = (await db.execute(select(FlowEdge).where(FlowEdge.flow_id == flow.id))).scalars().all()
            for edge in edges:
                new_src = node_id_map.get(edge.source_node_id)
                new_tgt = node_id_map.get(edge.target_node_id)
                if new_src and new_tgt:
                    db.add(FlowEdge(
                        flow_id=new_flow.id,
                        source_node_id=new_src,
                        target_node_id=new_tgt,
                        condition_key=edge.condition_key,
                    ))
        await db.commit()
        await db.refresh(new_bot)
        return _fmt(new_bot)

    @post("/{bot_id:str}/activate")
    async def activate(
        self, bot_id: str, request: Request, db: AsyncSession
    ) -> BotResponse:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        await set_webhook(db, bot)
        return _fmt(bot)

    @post("/{bot_id:str}/deactivate")
    async def deactivate(
        self, bot_id: str, request: Request, db: AsyncSession
    ) -> BotResponse:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        await delete_webhook(db, bot)
        return _fmt(bot)

    @get("/{bot_id:str}/stats")
    async def stats(
        self, bot_id: str, request: Request, db: AsyncSession
    ) -> BotStatsResponse:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        data = await get_bot_stats(db, bot_id)
        return BotStatsResponse(**data)

    # ── Managed Bots (Bot API 9.6) ────────────────────────────────────────────

    @post("/request-managed")
    async def request_managed_bot(
        self, data: BotAutoCreate, request: Request, db: AsyncSession
    ) -> dict:
        """
        Managed bot yaratish uchun deep link va pending_id qaytaradi.
        Frontend shu linkni ochadi, user Telegramda tasdiqlaydi.
        """
        from app.services.managed_bots import create_pending, managed_bot_link

        if not settings.MANAGER_BOT_TOKEN or not settings.MANAGER_BOT_USERNAME:
            raise HTTPException(
                status_code=503,
                detail="MANAGER_BOT_TOKEN va MANAGER_BOT_USERNAME .env da sozlanmagan",
            )
        user_id = get_current_user_id(request)
        from app.api.v1.auth.service import get_user_by_id

        user = await get_user_by_id(db, user_id)
        tg_id = user.telegram_id if user else None
        pending_id = await create_pending(
            user_id, data.bot_name, data.bot_username, tg_id
        )
        link = managed_bot_link(data.bot_username, data.bot_name)
        return {"pending_id": pending_id, "link": link}

    @get("/pending/{pending_id:str}")
    async def poll_pending(
        self, pending_id: str, request: Request, db: AsyncSession
    ) -> dict:
        """
        Frontend har 2 soniyada so'raydi.
        status='done' bo'lganda bot_id ham keladi.
        """
        from app.services.managed_bots import get_pending

        user_id = get_current_user_id(request)
        pending = await get_pending(pending_id)
        if not pending:
            raise HTTPException(
                status_code=404, detail="Pending topilmadi yoki muddati o'tgan"
            )
        if pending["user_id"] != user_id:
            raise HTTPException(status_code=403)
        return {
            "status": pending["status"],
            "bot_id": pending.get("bot_id"),
        }

    @post("/setup-manager-webhook")
    async def setup_manager(self, request: Request, db: AsyncSession) -> dict:
        """Manager bot webhookini bir marta o'rnatish (superadmin)."""
        from app.services.managed_bots import setup_manager_webhook
        from app.api.v1.dependencies import get_current_user_id
        from app.models.user import UserRole
        from sqlalchemy import select
        from app.models.user import User
        import uuid

        user_id = get_current_user_id(request)
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))

        user = result.scalar_one_or_none()
        if not user or user.role != UserRole.superadmin:
            raise HTTPException(status_code=403)
        ok = await setup_manager_webhook()
        return {"ok": ok}
