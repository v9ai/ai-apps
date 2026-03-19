from pathlib import Path
from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    deepseek_api_key: str
    dashscope_api_key: str
    database_url: str

    class Config:
        env_file = _ENV_FILE
        extra = "ignore"


settings = Settings()
