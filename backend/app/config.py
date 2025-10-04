from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "dms_demo"
    JWT_SECRET: str = "change-me"
    JWT_REFRESH_SECRET: str = "change-me-too"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()