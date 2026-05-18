"""
Telegram Stars to'lov xizmati.

invoke flow:
  create_invoice()  → Payment(pending) → sendInvoice via MANAGER_BOT
  handle_pre_checkout() → answerPreCheckoutQuery(ok=True)
  handle_successful_payment() → complete_payment() → UserTemplate unlock

Telegram API calls use httpx (async-safe, no blocking).
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

import httpx
from litestar.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment, PaymentStatus
from app.models.template import Template, UserTemplate
from app.models.user import User
from app.settings import settings

logger = logging.getLogger(__name__)

TG_API = "https://api.telegram.org/bot{token}/{method}"


async def _tg(method: str, **payload) -> dict:
    """Generic async Telegram Bot API call via MANAGER_BOT_TOKEN."""
    url = TG_API.format(token=settings.MANAGER_BOT_TOKEN, method=method)
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(url, json=payload)
    data = r.json()
    if not data.get("ok"):
        raise RuntimeError(f"Telegram API {method} error: {data.get('description')}")
    return data.get("result", {})


# ── Invoice ───────────────────────────────────────────────────────────────────

async def create_invoice(
    db: AsyncSession, user_id: str, template_id: str
) -> dict:
    uid = uuid.UUID(user_id)
    tid = uuid.UUID(template_id)

    # 1. Template mavjudligini tekshir
    tmpl = await db.get(Template, tid)
    if not tmpl or not tmpl.is_published:
        raise HTTPException(status_code=404, detail="Template topilmadi")

    # 2. Allaqachon sotib olinganmi?
    already = await db.execute(
        select(UserTemplate).where(
            UserTemplate.user_id == uid,
            UserTemplate.template_id == tid,
        )
    )
    if already.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Allaqachon sotib olingan")

    # 3. Foydalanuvchini ol
    user = await db.get(User, uid)
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    # 4. Bepul template → to'g'ridan unlock
    if tmpl.price_stars == 0:
        await _unlock(db, uid, tid)
        return {"status": "unlocked"}

    # 5. telegram_id yo'q → xato
    if not user.telegram_id:
        raise HTTPException(
            status_code=400,
            detail="Telegram akkauntingiz ulanmagan. Avval Telegram orqali kiring.",
        )

    # 6. Payload — unique per (user, template)
    payload = f"template_{tid}_user_{uid}"

    # 7. Mavjud pending to'lovni tekshir (duplicate invoice oldini olish)
    existing = await db.execute(select(Payment).where(Payment.payload == payload))
    existing_payment = existing.scalar_one_or_none()
    if existing_payment:
        if existing_payment.status == PaymentStatus.completed:
            raise HTTPException(status_code=409, detail="Allaqachon sotib olingan")
        # Pending bor — yangi invoice yubor (user to'lamagan bo'lishi mumkin)

    if not existing_payment:
        payment = Payment(
            user_id=uid,
            template_id=tid,
            amount=tmpl.price_stars,
            currency="XTR",
            payload=payload,
            status=PaymentStatus.pending,
        )
        db.add(payment)
        await db.commit()

    # 8. Telegram invoice yuborish
    await _tg(
        "sendInvoice",
        chat_id=user.telegram_id,
        title=tmpl.title[:32],
        description=(tmpl.description or tmpl.title)[:255],
        payload=payload,
        currency="XTR",
        prices=[{"label": "Shablon", "amount": tmpl.price_stars}],
        provider_token="",
    )

    return {"status": "invoice_sent"}


# ── Webhook handlers ───────────────────────────────────────────────────────────

async def handle_pre_checkout(db: AsyncSession, query: dict) -> None:
    """pre_checkout_query → har doim ok=True deb javob ber."""
    query_id = query["id"]
    try:
        await _tg("answerPreCheckoutQuery", pre_checkout_query_id=query_id, ok=True)
        logger.info("Pre-checkout approved: %s", query_id)
    except Exception as e:
        logger.error("answerPreCheckoutQuery error: %s", e)
        # Telegram'ga error javob berishga harakat qil
        try:
            await _tg(
                "answerPreCheckoutQuery",
                pre_checkout_query_id=query_id,
                ok=False,
                error_message="To'lov qabul qilinmadi. Qayta urinib ko'ring.",
            )
        except Exception:
            pass


async def handle_successful_payment(
    db: AsyncSession, message: dict
) -> None:
    """successful_payment → payment'ni complete qil, template'ni unlock qil."""
    sp = message.get("successful_payment", {})
    charge_id: str = sp.get("telegram_payment_charge_id", "")
    payload: str = sp.get("invoice_payload", "")

    if not charge_id or not payload:
        logger.warning("successful_payment: missing charge_id or payload")
        return

    # Idempotency check — agar shu charge_id allaqachon yozilgan bo'lsa, o'tkazib yubor
    dup = await db.execute(
        select(Payment).where(Payment.telegram_payment_charge_id == charge_id)
    )
    if dup.scalar_one_or_none():
        logger.info("Duplicate successful_payment ignored: %s", charge_id)
        return

    # Payment yozuvini topib yangilash
    result = await db.execute(select(Payment).where(Payment.payload == payload))
    payment = result.scalar_one_or_none()

    if not payment:
        logger.error("successful_payment: no payment found for payload=%s", payload)
        return

    payment.telegram_payment_charge_id = charge_id
    payment.status = PaymentStatus.completed
    payment.completed_at = datetime.now(timezone.utc)
    await db.commit()

    # Template'ni unlock qilish
    await _unlock(db, payment.user_id, payment.template_id)
    logger.info(
        "Payment completed: payload=%s charge=%s", payload, charge_id
    )


async def _unlock(
    db: AsyncSession, user_id: uuid.UUID, template_id: uuid.UUID
) -> None:
    """UserTemplate yozuvi yaratish (idempotent)."""
    existing = await db.execute(
        select(UserTemplate).where(
            UserTemplate.user_id == user_id,
            UserTemplate.template_id == template_id,
        )
    )
    if existing.scalar_one_or_none():
        return

    db.add(UserTemplate(user_id=user_id, template_id=template_id))

    # Template uses_count oshirish
    tmpl = await db.get(Template, template_id)
    if tmpl:
        tmpl.uses_count += 1

    await db.commit()


# ── Refund (admin only) ────────────────────────────────────────────────────────

async def refund_payment(db: AsyncSession, charge_id: str) -> dict:
    """Stars qaytarish — Telegram refundStarPayment API."""
    result = await db.execute(
        select(Payment).where(Payment.telegram_payment_charge_id == charge_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="To'lov topilmadi")
    if payment.status != PaymentStatus.completed:
        raise HTTPException(status_code=400, detail="Faqat completed to'lovni qaytarish mumkin")

    user = await db.get(User, payment.user_id)
    if not user or not user.telegram_id:
        raise HTTPException(status_code=400, detail="Foydalanuvchi telegram_id topilmadi")

    await _tg(
        "refundStarPayment",
        user_id=user.telegram_id,
        telegram_payment_charge_id=charge_id,
    )

    payment.status = PaymentStatus.refunded
    await db.commit()

    # Unlock olib tashlash
    existing = await db.execute(
        select(UserTemplate).where(
            UserTemplate.user_id == payment.user_id,
            UserTemplate.template_id == payment.template_id,
        )
    )
    ut = existing.scalar_one_or_none()
    if ut:
        await db.delete(ut)
        await db.commit()

    return {"status": "refunded", "charge_id": charge_id}
