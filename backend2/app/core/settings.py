from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Backend2 API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_debug: bool = Field(default=True, alias="APP_DEBUG")
    api_prefix: str = Field(default="/api/v1", alias="API_PREFIX")

    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/lab_analytics",
        alias="DATABASE_URL",
    )

    max_upload_mb: int = Field(default=10, alias="MAX_UPLOAD_MB")
    tesseract_cmd: str | None = Field(default=None, alias="TESSERACT_CMD")
    reports_drive_path: str | None = Field(default=None, alias="REPORTS_DRIVE_PATH")
    minio_endpoint: str = Field(default="http://localhost:9000", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(default="minioadmin", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(default="minioadmin", alias="MINIO_SECRET_KEY")
    minio_bucket: str = Field(default="vitabridge-documents", alias="MINIO_BUCKET")
    cors_allow_origins: str = Field(
        default="http://localhost:5173,https://localhost:5173,http://localhost:5174,https://localhost:5174",
        alias="CORS_ALLOW_ORIGINS",
    )

    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allow_origins.split(",")
            if origin.strip()
        ]

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
