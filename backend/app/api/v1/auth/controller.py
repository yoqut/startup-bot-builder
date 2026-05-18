import logging

from litestar import Controller, get, post
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TelegramWebAppRequest,
    TelegramWidgetRequest,
    TokenResponse,
    UserResponse,
)
from app.api.v1.auth.service import (
    authenticate_user,
    generate_tokens,
    get_or_create_user_by_telegram,
    get_user_by_id,
    parse_webapp_user,
    register_user,
    verify_refresh_token,
    verify_telegram_webapp_hash,
    verify_telegram_widget_hash,
)
from app.api.v1.dependencies import get_current_user_id
from app.db.session import get_db
from app.settings import settings

logger = logging.getLogger(__name__)


class AuthController(Controller):
    path = "/api/v1/auth"
    dependencies = {"db": Provide(get_db)}

    @post("/register")
    async def register(self, data: RegisterRequest, db: AsyncSession) -> TokenResponse:
        try:
            user = await register_user(db, data.email, data.password, data.full_name)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return TokenResponse(**generate_tokens(user))

    @post("/login")
    async def login(self, data: LoginRequest, db: AsyncSession) -> TokenResponse:
        try:
            user = await authenticate_user(db, data.email, data.password)
        except ValueError as e:
            raise HTTPException(status_code=401, detail=str(e))
        return TokenResponse(**generate_tokens(user))

    @post("/refresh")
    async def refresh(self, data: RefreshRequest, db: AsyncSession) -> TokenResponse:
        try:
            user_id = verify_refresh_token(data.refresh_token)
            user = await get_user_by_id(db, user_id)
            if not user:
                raise ValueError("User topilmadi")
        except Exception as e:
            raise HTTPException(status_code=401, detail=str(e))
        return TokenResponse(**generate_tokens(user))

    @post("/telegram-widget")
    async def telegram_widget(
        self, data: TelegramWidgetRequest, db: AsyncSession
    ) -> TokenResponse:
        payload = {
            "id": str(data.id),
            "first_name": data.first_name,
            "auth_date": str(data.auth_date),
            "hash": data.hash,
        }
        if data.last_name:
            payload["last_name"] = data.last_name
        if data.username:
            payload["username"] = data.username
        if data.photo_url:
            payload["photo_url"] = data.photo_url

        if not verify_telegram_widget_hash(payload, settings.MANAGER_BOT_TOKEN):
            raise HTTPException(status_code=401, detail="Telegram hash noto'g'ri")

        user = await get_or_create_user_by_telegram(
            db, data.id, data.first_name, data.last_name, data.username
        )
        return TokenResponse(**generate_tokens(user))

    @post("/telegram-webapp")
    async def telegram_webapp(
        self, data: TelegramWebAppRequest, db: AsyncSession
    ) -> TokenResponse:
        # 1. Hash tekshir
        try:
            params = verify_telegram_webapp_hash(
                data.init_data, settings.MANAGER_BOT_TOKEN
            )
        except ValueError as e:
            logger.warning("Telegram WebApp auth rejected: %s", e)
            raise HTTPException(status_code=401, detail=str(e))

        # 2. User ma'lumotlarini parse qil
        try:
            user_data = parse_webapp_user(params)
        except ValueError as e:
            logger.error("Telegram WebApp user parse failed: %s", e)
            raise HTTPException(status_code=400, detail=str(e))

        telegram_id = user_data.get("id")
        if not telegram_id:
            raise HTTPException(status_code=400, detail="initData.user.id topilmadi")

        # 3. User yarat yoki top
        try:
            user = await get_or_create_user_by_telegram(
                db,
                int(telegram_id),
                user_data.get("first_name", ""),
                user_data.get("last_name"),
                user_data.get("username"),
            )
        except Exception as e:
            logger.exception(
                "Telegram WebApp DB error for tg_id=%s: %s", telegram_id, e
            )
            raise HTTPException(status_code=500, detail="Auth server xatosi")

        logger.info(
            "Telegram WebApp login: tg_id=%s user_id=%s", telegram_id, user.id
        )
        return TokenResponse(**generate_tokens(user))

    @get("/me")
    async def me(self, request: Request, db: AsyncSession) -> UserResponse:
        user_id = get_current_user_id(request)
        user = await get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User topilmadi")
        return UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            plan_id=user.plan_id,
            is_active=user.is_active,
        )
