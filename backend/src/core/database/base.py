"""
Database engine setup with async SQLAlchemy 2.0.
Multi-database support: SQLite for dev, PostgreSQL for production.
Connection pooling is tuned per environment.
"""
from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.core.config.settings import Environment, settings


def _build_engine() -> AsyncEngine:
    kwargs: dict = {
        "echo": settings.db.echo,
        "future": True,
    }

    if settings.environment != Environment.DEVELOPMENT or "sqlite" not in settings.db.url:
        kwargs.update({
            "pool_size": settings.db.pool_size,
            "max_overflow": settings.db.max_overflow,
            "pool_timeout": settings.db.pool_timeout,
            "pool_recycle": settings.db.pool_recycle,
            "pool_pre_ping": True,
        })
    else:
        # SQLite doesn't support connection pooling params
        kwargs["connect_args"] = {"check_same_thread": False}

    return create_async_engine(settings.db.url, **kwargs)


engine: AsyncEngine = _build_engine()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI/Litestar dependency for injecting DB sessions."""
    async with get_db_session() as session:
        yield session
