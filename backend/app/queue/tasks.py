import asyncio
import logging

import httpx

from app.queue.worker import celery_app

logger = logging.getLogger(__name__)


async def _broadcast_async(
    token: str,
    chat_ids: list[int],
    message: str,
    media_url: str | None,
    media_type: str | None,
) -> dict:
    success = 0
    failed = 0
    batch: list = []

    async def send_one(chat_id: int) -> bool:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                if media_url and media_type == "photo":
                    await client.post(
                        f"https://api.telegram.org/bot{token}/sendPhoto",
                        json={"chat_id": chat_id, "photo": media_url, "caption": message, "parse_mode": "HTML"},
                    )
                elif media_url and media_type == "video":
                    await client.post(
                        f"https://api.telegram.org/bot{token}/sendVideo",
                        json={"chat_id": chat_id, "video": media_url, "caption": message, "parse_mode": "HTML"},
                    )
                else:
                    await client.post(
                        f"https://api.telegram.org/bot{token}/sendMessage",
                        json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
                    )
            return True
        except Exception:
            return False

    # Send in batches of 25 with 1s gap between batches (Telegram rate limit ~30 msg/s)
    BATCH_SIZE = 25
    for i in range(0, len(chat_ids), BATCH_SIZE):
        batch = chat_ids[i : i + BATCH_SIZE]
        results = await asyncio.gather(*[send_one(cid) for cid in batch])
        success += sum(results)
        failed += len(results) - sum(results)
        if i + BATCH_SIZE < len(chat_ids):
            await asyncio.sleep(1.0)

    return {"success": success, "failed": failed}


@celery_app.task(bind=True, max_retries=2, name="tasks.send_broadcast")
def send_broadcast(
    self,
    broadcast_id: str,
    token: str,
    chat_ids: list[int],
    message: str,
    media_url: str | None = None,
    media_type: str | None = None,
):
    """Celery task: sends broadcast messages. Updates Broadcast status via DB."""
    from app.db.session import async_session_factory
    from app.models.broadcast import Broadcast, BroadcastStatus
    import uuid

    async def run():
        result = await _broadcast_async(token, chat_ids, message, media_url, media_type)
        async with async_session_factory() as db:
            from sqlalchemy import select
            r = await db.execute(
                select(Broadcast).where(Broadcast.id == uuid.UUID(broadcast_id))
            )
            bc = r.scalar_one_or_none()
            if bc:
                bc.sent_count = result["success"]
                bc.fail_count = result["failed"]
                bc.status = BroadcastStatus.done
                await db.commit()
        return result

    try:
        return asyncio.run(run())
    except Exception as exc:
        logger.exception("Broadcast task failed for broadcast_id=%s", broadcast_id)
        raise self.retry(exc=exc, countdown=60)
