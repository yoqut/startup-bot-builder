from __future__ import annotations

import logging

from litestar import Controller, get, post
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user_id, require_superadmin
from app.api.v1.payments.schemas import (
    CreateInvoiceRequest,
    InvoiceResponse,
    PaymentOut,
)
from app.api.v1.payments.service import (
    create_invoice,
    handle_pre_checkout,
    handle_successful_payment,
    refund_payment,
)
from app.db.session import get_db
from app.models.payment import Payment

logger = logging.getLogger(__name__)


class PaymentsController(Controller):
    path = "/api/v1/payments"
    dependencies = {"db": Provide(get_db)}

    @post("/create-invoice")
    async def create_invoice_endpoint(
        self,
        request: Request,
        data: CreateInvoiceRequest,
        db: AsyncSession,
    ) -> InvoiceResponse:
        user_id = get_current_user_id(request)
        result = await create_invoice(db, user_id, data.template_id)
        return InvoiceResponse(**result)

    @get("/my")
    async def my_payments(self, request: Request, db: AsyncSession) -> list[PaymentOut]:
        user_id = get_current_user_id(request)
        from uuid import UUID
        rows = await db.execute(
            select(Payment)
            .where(Payment.user_id == UUID(user_id))
            .order_by(Payment.created_at.desc())
        )
        payments = rows.scalars().all()
        return [
            PaymentOut(
                id=str(p.id),
                template_id=str(p.template_id),
                amount=p.amount,
                currency=p.currency,
                status=p.status.value,
                payload=p.payload,
                created_at=p.created_at,
                completed_at=p.completed_at,
            )
            for p in payments
        ]

    @post("/webhook")
    async def payment_webhook(self, data: dict, db: AsyncSession) -> dict:
        """
        Telegram payment webhook endpoint.
        Register this URL via setWebhook for the MANAGER_BOT with
        allowed_updates=["pre_checkout_query", "message"].

        NOTE: Since Telegram supports only ONE webhook URL per bot,
        this endpoint should be registered instead of (or alongside)
        /webhook/manager. The main.py on_startup registers it automatically.
        """
        try:
            if "pre_checkout_query" in data:
                await handle_pre_checkout(db, data["pre_checkout_query"])
            elif "message" in data and "successful_payment" in data["message"]:
                await handle_successful_payment(db, data["message"])
        except Exception:
            logger.exception("Payment webhook error")
        return {"ok": True}

    @post("/refund/{charge_id:str}")
    async def refund(
        self,
        request: Request,
        charge_id: str,
        db: AsyncSession,
    ) -> dict:
        """Admin only — Stars qaytarish."""
        require_superadmin(request)
        return await refund_payment(db, charge_id)
