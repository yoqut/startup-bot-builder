"""
Application settings — all values pulled from environment variables.
Pydantic-settings handles type coercion, validation, and .env loading.
"""
from __future__ import annotations

from enum import StrEnum
from functools import lru_cache
from typing import Annotated

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


_ENV_FILE = ".env"


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DB_", extra="ignore", env_file=_ENV_FILE)

    url: str = Field(default="sqlite+aiosqlite:///./botbuilder.db")
    echo: bool = Field(default=False)
    pool_size: int = Field(default=10)
    max_overflow: int = Field(default=20)
    pool_timeout: int = Field(default=30)
    pool_recycle: int = Field(default=1800)


class RedisSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="REDIS_", extra="ignore", env_file=_ENV_FILE)

    url: str = Field(default="redis://localhost:6379/0")
    max_connections: int = Field(default=50)
    socket_timeout: int = Field(default=5)
    decode_responses: bool = Field(default=True)


class JWTSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="JWT_", extra="ignore", env_file=_ENV_FILE)

    secret_key: SecretStr = Field(default="change-me-in-production-use-256bit-secret")
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60)
    refresh_token_expire_days: int = Field(default=30)


class TelegramSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TELEGRAM_", extra="ignore", env_file=_ENV_FILE)

    platform_bot_token: SecretStr = Field(default="")
    webhook_secret: SecretStr = Field(default="change-me-webhook-secret")
    webhook_base_url: str = Field(default="https://your-domain.com")
    bot_api_url: str = Field(default="https://api.telegram.org")


class OpenAISettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="OPENAI_", extra="ignore", env_file=_ENV_FILE)

    api_key: SecretStr = Field(default="")
    default_model: str = Field(default="gpt-4o-mini")
    max_tokens: int = Field(default=2048)
    temperature: float = Field(default=0.7)
    embedding_model: str = Field(default="text-embedding-3-small")


class SecuritySettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SECURITY_", extra="ignore", env_file=_ENV_FILE)

    encryption_key: SecretStr = Field(default="change-me-32-char-encryption-key!!")
    rate_limit_per_minute: int = Field(default=60)
    rate_limit_per_hour: int = Field(default=1000)
    max_bots_per_user: int = Field(default=10)
    max_flows_per_bot: int = Field(default=50)
    max_nodes_per_flow: int = Field(default=200)


class ObservabilitySettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="OBSERVABILITY_", extra="ignore", env_file=_ENV_FILE)

    sentry_dsn: str = Field(default="")
    otlp_endpoint: str = Field(default="http://localhost:4317")
    prometheus_port: int = Field(default=9090)
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # App
    app_name: str = Field(default="BotBuilder Platform")
    app_version: str = Field(default="1.0.0")
    environment: Environment = Field(default=Environment.DEVELOPMENT)
    debug: bool = Field(default=False)
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=4)
    cors_origins: list[str] = Field(default=["http://localhost:3000"])

    # Sub-settings
    db: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    jwt: JWTSettings = Field(default_factory=JWTSettings)
    telegram: TelegramSettings = Field(default_factory=TelegramSettings)
    openai: OpenAISettings = Field(default_factory=OpenAISettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    observability: ObservabilitySettings = Field(default_factory=ObservabilitySettings)

    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PRODUCTION

    @property
    def is_development(self) -> bool:
        return self.environment == Environment.DEVELOPMENT


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
