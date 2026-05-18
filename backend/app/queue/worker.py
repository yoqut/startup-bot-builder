from celery import Celery
from app.settings import settings

celery_app = Celery("botbuilder", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.config_from_object("app.queue.tasks")
