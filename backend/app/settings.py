from typing import ClassVar

from pydantic import Field
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=(".env", "../.env"),
        extra="ignore",
    )

    DATABASE_URL: str = Field(..., description="PostgreSQL connection URL")
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = Field(..., description="Secret key for signing JWT tokens")
    JWT_EXPIRE_MINUTES: int = 1440
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    WEBHOOK_BASE_URL: str = "https://yourdomain.com"

    ENCRYPTION_KEY: str = Field(..., description="Key for encrypting sensitive data")
    BOT_TOKEN_ENCRYPTION_KEY: str = Field(
        ..., description="Key for encrypting bot tokens"
    )

    OPENAI_API_KEY: str = ""

    CORS_ORIGINS: str = "http://localhost:3000"

    MANAGER_BOT_TOKEN: str = ""
    MANAGER_BOT_USERNAME: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
