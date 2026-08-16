"""OpenAI Vision 연동 설정.

`landmarks.py`의 `LANDMARKER_MODEL_PATH`처럼 단순 환경변수 하나였다면 `os.environ.get()`으로
충분했겠지만, OpenAI 연동은 키·엔드포인트·모델·타임아웃 여러 개를 다루고 `.env` 로딩까지
필요해 pydantic-settings로 구조화한다. 다른 기존 설정까지 이 패턴으로 옮기지는 않는다.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="OPENAI_", extra="ignore")

    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"
    timeout_seconds: float = 15.0


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
