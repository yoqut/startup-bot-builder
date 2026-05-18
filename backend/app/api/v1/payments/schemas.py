from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CreateInvoiceRequest(BaseModel):
    template_id: str


class InvoiceResponse(BaseModel):
    status: str  # "invoice_sent" | "unlocked"


class PaymentOut(BaseModel):
    id: str
    template_id: str
    amount: int
    currency: str
    status: str
    payload: str
    created_at: datetime
    completed_at: datetime | None = None


class RefundRequest(BaseModel):
    charge_id: str
