from litestar import Controller, get
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user_id
from app.api.v1.bots.service import get_bot_by_id
from app.api.v1.analytics.service import get_analytics
from app.db.session import get_db


class AnalyticsController(Controller):
    path = "/api/v1/analytics"
    dependencies = {"db": Provide(get_db)}

    @get("/{bot_id:str}")
    async def bot_analytics(
        self,
        bot_id: str,
        request: Request,
        db: AsyncSession,
        days: int = 30,
    ) -> dict:
        user_id = get_current_user_id(request)
        bot = await get_bot_by_id(db, bot_id, user_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot topilmadi")
        return await get_analytics(db, bot_id, days=min(days, 90))
