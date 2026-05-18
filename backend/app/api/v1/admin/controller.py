import uuid
from datetime import datetime, timezone

from litestar import Controller, delete, get, patch, post
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.admin.schemas import (
    AdminBotOut,
    AdminStatsOut,
    AdminUserOut,
    PatchUserBody,
    PlanBody,
    PlanOut,
    SettingBody,
    SettingOut,
)
from app.api.v1.dependencies import require_superadmin
from app.db.session import get_db
from app.models.analytic_event import AnalyticEvent
from app.models.bot import Bot
from app.models.bot_user import BotUser
from app.models.flow import Flow
from app.models.subscription import Plan
from app.models.system_setting import SystemSetting
from app.models.user import User, UserRole


class AdminController(Controller):
    path = "/api/v1/admin"
    dependencies = {"db": Provide(get_db)}

    # ── Dashboard stats ───────────────────────────────────────────────────────

    @get("/stats")
    async def stats(self, request: Request, db: AsyncSession) -> AdminStatsOut:
        require_superadmin(request)

        today = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        total_users = (
            await db.execute(select(func.count()).select_from(User))
        ).scalar_one()
        total_bots = (
            await db.execute(select(func.count()).select_from(Bot))
        ).scalar_one()
        total_bu = (
            await db.execute(select(func.count()).select_from(BotUser))
        ).scalar_one()
        total_events = (
            await db.execute(select(func.count()).select_from(AnalyticEvent))
        ).scalar_one()
        new_users_td = (
            await db.execute(
                select(func.count()).select_from(User).where(User.created_at >= today)
            )
        ).scalar_one()
        new_bots_td = (
            await db.execute(
                select(func.count()).select_from(Bot).where(Bot.created_at >= today)
            )
        ).scalar_one()
        active_bots = (
            await db.execute(
                select(func.count()).select_from(Bot).where(Bot.is_active == bool(True))
            )
        ).scalar_one()

        return AdminStatsOut(
            total_users=total_users,
            total_bots=total_bots,
            total_bot_users=total_bu,
            total_events=total_events,
            new_users_today=new_users_td,
            new_bots_today=new_bots_td,
            active_bots=active_bots,
        )

    # ── Users ─────────────────────────────────────────────────────────────────

    @get("/users")
    async def list_users(
        self, request: Request, db: AsyncSession
    ) -> list[AdminUserOut]:
        require_superadmin(request)

        result = await db.execute(
            select(User, Plan)
            .outerjoin(Plan, User.plan_id == Plan.id)
            .order_by(User.created_at.desc())
        )
        rows = result.all()

        out = []
        for user, plan in rows:
            bc = (
                await db.execute(
                    select(func.count()).select_from(Bot).where(Bot.user_id == user.id)
                )
            ).scalar_one()
            out.append(
                AdminUserOut(
                    id=str(user.id),
                    email=user.email,
                    full_name=user.full_name,
                    role=user.role.value,
                    is_active=user.is_active,
                    plan_id=user.plan_id,
                    plan_name=plan.name if plan else None,
                    bot_count=bc,
                    created_at=user.created_at.isoformat(),
                )
            )
        return out

    @patch("/users/{user_id:str}")
    async def patch_user(
        self, request: Request, user_id: str, data: PatchUserBody, db: AsyncSession
    ) -> AdminUserOut:
        require_superadmin(request)

        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User topilmadi")

        if data.is_active is not None:
            user.is_active = data.is_active
        if data.role is not None:
            try:
                user.role = UserRole(data.role)
            except ValueError:
                raise HTTPException(status_code=400, detail="Noto'g'ri role")
        if data.plan_id is not None:
            user.plan_id = data.plan_id if data.plan_id > 0 else None

        await db.commit()
        await db.refresh(user)

        bc = (
            await db.execute(
                select(func.count()).select_from(Bot).where(Bot.user_id == user.id)
            )
        ).scalar_one()

        plan = None
        if user.plan_id:
            plan = (
                await db.execute(select(Plan).where(Plan.id == user.plan_id))
            ).scalar_one_or_none()

        return AdminUserOut(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            plan_id=user.plan_id,
            plan_name=plan.name if plan else None,
            bot_count=bc,
            created_at=user.created_at.isoformat(),
        )

    @delete("/users/{user_id:str}", status_code=204)
    async def delete_user(
        self, request: Request, user_id: str, db: AsyncSession
    ) -> None:
        require_superadmin(request)

        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User topilmadi")
        await db.delete(user)
        await db.commit()

    # ── Bots ──────────────────────────────────────────────────────────────────

    @get("/bots")
    async def list_bots(self, request: Request, db: AsyncSession) -> list[AdminBotOut]:
        require_superadmin(request)

        result = await db.execute(
            select(Bot, User)
            .join(User, Bot.user_id == User.id)
            .order_by(Bot.created_at.desc())
        )
        rows = result.all()

        out = []
        for bot, owner in rows:
            fc = (
                await db.execute(
                    select(func.count()).select_from(Flow).where(Flow.bot_id == bot.id)
                )
            ).scalar_one()
            uc = (
                await db.execute(
                    select(func.count())
                    .select_from(BotUser)
                    .where(BotUser.bot_id == bot.id)
                )
            ).scalar_one()
            out.append(
                AdminBotOut(
                    id=str(bot.id),
                    name=bot.name,
                    username=bot.username,
                    is_active=bot.is_active,
                    owner_email=owner.email,
                    owner_id=str(owner.id),
                    flow_count=fc,
                    user_count=uc,
                    created_at=bot.created_at.isoformat(),
                )
            )
        return out

    @patch("/bots/{bot_id:str}/toggle")
    async def toggle_bot(self, request: Request, bot_id: str, db: AsyncSession) -> dict:
        require_superadmin(request)

        result = await db.execute(select(Bot).where(Bot.id == uuid.UUID(bot_id)))
        bot = result.scalar_one_or_none()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")

        bot.is_active = not bot.is_active
        await db.commit()
        return {"id": str(bot.id), "is_active": bot.is_active}

    @delete("/bots/{bot_id:str}", status_code=204)
    async def delete_bot(self, request: Request, bot_id: str, db: AsyncSession) -> None:
        require_superadmin(request)

        result = await db.execute(select(Bot).where(Bot.id == uuid.UUID(bot_id)))
        bot = result.scalar_one_or_none()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        await db.delete(bot)
        await db.commit()

    # ── Plans ─────────────────────────────────────────────────────────────────

    @get("/plans")
    async def list_plans(self, request: Request, db: AsyncSession) -> list[PlanOut]:
        require_superadmin(request)

        plans = (await db.execute(select(Plan).order_by(Plan.id))).scalars().all()
        out = []
        for p in plans:
            uc = (
                await db.execute(
                    select(func.count()).select_from(User).where(User.plan_id == p.id)
                )
            ).scalar_one()
            out.append(_plan_out(p, uc))
        return out

    @post("/plans")
    async def create_plan(
        self, request: Request, data: PlanBody, db: AsyncSession
    ) -> PlanOut:
        require_superadmin(request)

        plan = Plan(
            name=data.name,
            price=data.price,
            max_bots=data.max_bots,
            max_webapps=data.max_webapps,
            max_bot_users=data.max_bot_users,
            has_ads=data.has_ads,
            multi_lang=data.multi_lang,
            webhook_access=data.webhook_access,
            ai_nodes=data.ai_nodes,
            marketplace=data.marketplace,
            crm_access=data.crm_access,
            erp_access=data.erp_access,
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        return _plan_out(plan, 0)

    @patch("/plans/{plan_id:int}")
    async def update_plan(
        self, request: Request, plan_id: int, data: PlanBody, db: AsyncSession
    ) -> PlanOut:
        require_superadmin(request)

        result = await db.execute(select(Plan).where(Plan.id == plan_id))
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan topilmadi")

        plan.name = data.name
        plan.price = data.price
        plan.max_bots = data.max_bots
        plan.max_webapps = data.max_webapps
        plan.max_bot_users = data.max_bot_users
        plan.has_ads = data.has_ads
        plan.multi_lang = data.multi_lang
        plan.webhook_access = data.webhook_access
        plan.ai_nodes = data.ai_nodes
        plan.marketplace = data.marketplace
        plan.crm_access = data.crm_access
        plan.erp_access = data.erp_access
        await db.commit()

        uc = (
            await db.execute(
                select(func.count()).select_from(User).where(User.plan_id == plan.id)
            )
        ).scalar_one()
        return _plan_out(plan, uc)

    @delete("/plans/{plan_id:int}", status_code=204)
    async def delete_plan(
        self, request: Request, plan_id: int, db: AsyncSession
    ) -> None:
        require_superadmin(request)

        result = await db.execute(select(Plan).where(Plan.id == plan_id))
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan topilmadi")
        await db.delete(plan)
        await db.commit()

    # ── System Settings ───────────────────────────────────────────────────────

    @get("/settings")
    async def list_settings(
        self, request: Request, db: AsyncSession
    ) -> list[SettingOut]:
        require_superadmin(request)

        rows = (
            (await db.execute(select(SystemSetting).order_by(SystemSetting.key)))
            .scalars()
            .all()
        )
        return [
            SettingOut(key=r.key, value=r.value, description=r.description)
            for r in rows
        ]

    @patch("/settings/{key:str}")
    async def update_setting(
        self, request: Request, key: str, data: SettingBody, db: AsyncSession
    ) -> SettingOut:
        require_superadmin(request)

        result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = result.scalar_one_or_none()
        if not setting:
            # create on-the-fly for unknown keys
            setting = SystemSetting(key=key, value=data.value)
            db.add(setting)
        else:
            setting.value = data.value
        await db.commit()
        return SettingOut(
            key=setting.key, value=setting.value, description=setting.description
        )


# ── helpers ───────────────────────────────────────────────────────────────────


def _plan_out(p: Plan, user_count: int) -> PlanOut:
    return PlanOut(
        id=p.id,
        name=p.name,
        price=float(p.price),
        max_bots=p.max_bots,
        max_webapps=p.max_webapps,
        max_bot_users=p.max_bot_users,
        has_ads=p.has_ads,
        multi_lang=p.multi_lang,
        webhook_access=p.webhook_access,
        ai_nodes=p.ai_nodes,
        marketplace=p.marketplace,
        crm_access=p.crm_access,
        erp_access=p.erp_access,
        user_count=user_count,
    )
