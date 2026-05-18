import logging
import logging.config

import httpx
from litestar import Litestar
from litestar.config.cors import CORSConfig
from litestar.openapi import OpenAPIConfig

from app.api.v1.admin.controller import AdminController
from app.api.v1.analytics.controller import AnalyticsController
from app.api.v1.auth.controller import AuthController
from app.api.v1.bots.controller import BotsController
from app.api.v1.broadcast.controller import BroadcastController
from app.api.v1.business.controller import BusinessController
from app.api.v1.conversations.controller import ConversationsController
from app.api.v1.flows.controller import FlowsController
from app.api.v1.payments.controller import PaymentsController
from app.api.v1.templates.controller import TemplatesController
from app.webhook.controller import WebhookController
from app.cache.redis import close_redis
from app.settings import settings
from app.utils.tg_log_handler import setup_telegram_log_handler

# ── Logging sozlamalari ────────────────────────────────────────────────────────

logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "standard",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": "INFO",
            "handlers": ["console"],
        },
        "loggers": {
            "uvicorn": {"level": "INFO", "propagate": True},
            "uvicorn.access": {"level": "WARNING", "propagate": True},
            "sqlalchemy.engine": {"level": "WARNING", "propagate": True},
            "httpx": {"level": "WARNING", "propagate": True},
        },
    }
)

# Telegram xato bildirishnomasi (ERROR+ → YoqutConstructor_bot → chat_id 1230394567)
setup_telegram_log_handler()

logger = logging.getLogger(__name__)

cors_config = CORSConfig(
    allow_origins=settings.cors_origins_list,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

openapi_config = OpenAPIConfig(title="TelegramBotBuilder API", version="1.0.0")


async def on_startup() -> None:
    if not settings.MANAGER_BOT_TOKEN:
        return
    webhook_url = f"{settings.WEBHOOK_BASE_URL}/webhook/manager"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"https://api.telegram.org/bot{settings.MANAGER_BOT_TOKEN}/setWebhook",
                json={
                    "url": webhook_url,
                    "allowed_updates": ["message", "managed_bot", "callback_query", "pre_checkout_query"],
                },
            )
            data = r.json()
            if data.get("ok"):
                logger.info("Manager bot webhook registered: %s", webhook_url)
            else:
                logger.warning("Manager bot webhook registration failed: %s", data)
    except Exception as e:
        logger.warning("Manager bot webhook registration error: %s", e)


async def on_shutdown() -> None:
    await close_redis()


app = Litestar(
    debug=True,
    route_handlers=[
        AdminController,
        AnalyticsController,
        AuthController,
        BotsController,
        BroadcastController,
        BusinessController,
        ConversationsController,
        FlowsController,
        PaymentsController,
        TemplatesController,
        WebhookController,
    ],
    cors_config=cors_config,
    openapi_config=openapi_config,
    on_startup=[on_startup],
    on_shutdown=[on_shutdown],
)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
