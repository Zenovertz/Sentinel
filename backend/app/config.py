from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SENTINEL API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    frontend_origins: str = "http://localhost:3000"
    database_url: str = "sqlite:///./sentinel.db"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [x.strip() for x in self.frontend_origins.split(",") if x.strip()]


settings = Settings()
