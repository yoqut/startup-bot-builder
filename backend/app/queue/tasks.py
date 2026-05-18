import time

import telebot

from app.queue.worker import celery_app


@celery_app.task(bind=True, max_retries=3)
def send_broadcast(
    self,
    bot_token: str,
    chat_ids: list[int],
    message: str,
    media_url: str | None = None,
):
    bot = telebot.TeleBot(bot_token)
    success = 0
    failed = 0
    for chat_id in chat_ids:
        try:
            if media_url:
                bot.send_photo(chat_id, media_url, caption=message)
            else:
                bot.send_message(chat_id, message)
            success += 1
        except Exception:
            failed += 1
        time.sleep(0.03)
    return {"success": success, "failed": failed}
