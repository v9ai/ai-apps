"""Custom DeepEval LLM wrapper for DeepSeek (OpenAI-compatible API)."""

import json
from pathlib import Path

from deepeval.models import DeepEvalBaseLLM
from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI
from pydantic import BaseModel
import os

# Load API key from the app's .env.local
_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
_BASE_URL = "https://api.deepseek.com"
_MODEL = "deepseek-chat"


def _parse_schema(text: str, schema):
    """Parse LLM response into a Pydantic model if schema is provided.

    Raises TypeError on failure so DeepEval falls back to its own parsing.
    """
    if schema is None or not (isinstance(schema, type) and issubclass(schema, BaseModel)):
        return text
    try:
        # Strip markdown code fences if present
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = lines[1:]  # drop opening fence
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines)
        return schema(**json.loads(cleaned))
    except (json.JSONDecodeError, ValueError, KeyError):
        raise TypeError(f"Could not parse response into {schema.__name__}")


class DeepSeekModel(DeepEvalBaseLLM):
    """DeepSeek judge model for DeepEval metrics."""

    def __init__(self, model: str = _MODEL):
        self._model_name = model
        self._client = OpenAI(api_key=_API_KEY, base_url=_BASE_URL)
        self._async_client = AsyncOpenAI(api_key=_API_KEY, base_url=_BASE_URL)

    def load_model(self):
        return self._model_name

    def generate(self, prompt: str, schema=None, **kwargs):
        use_json = schema and "json" in prompt.lower()
        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            **({"response_format": {"type": "json_object"}} if use_json else {}),
        )
        text = response.choices[0].message.content or ""
        return _parse_schema(text, schema) if schema else text

    async def a_generate(self, prompt: str, schema=None, **kwargs):
        use_json = schema and "json" in prompt.lower()
        response = await self._async_client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            **({"response_format": {"type": "json_object"}} if use_json else {}),
        )
        text = response.choices[0].message.content or ""
        return _parse_schema(text, schema) if schema else text

    def get_model_name(self) -> str:
        return self._model_name
