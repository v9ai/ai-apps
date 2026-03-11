"""Custom DeepEval LLM wrapper for DeepSeek (OpenAI-compatible API)."""

from pathlib import Path

from deepeval.models import DeepEvalBaseLLM
from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI
import os

# Load API key from the app's .env.local
_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
_BASE_URL = "https://api.deepseek.com"
_MODEL = "deepseek-chat"


class DeepSeekModel(DeepEvalBaseLLM):
    """DeepSeek judge model for DeepEval metrics."""

    def __init__(self, model: str = _MODEL):
        self._model_name = model
        self._client = OpenAI(api_key=_API_KEY, base_url=_BASE_URL)
        self._async_client = AsyncOpenAI(api_key=_API_KEY, base_url=_BASE_URL)

    def load_model(self):
        return self._model_name

    def generate(self, prompt: str, **kwargs) -> str:
        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        return response.choices[0].message.content or ""

    async def a_generate(self, prompt: str, **kwargs) -> str:
        response = await self._async_client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        return response.choices[0].message.content or ""

    def get_model_name(self) -> str:
        return self._model_name
