"""Custom DeepEval LLM wrapper for DeepSeek.

Used as both judge model (DeepEval GEval metrics) and simulator/evaluation
model for DeepTeam red teaming. Supports structured output via schema parameter
required by DeepTeam's internal attack simulation pipeline.

DeepTeam treats custom (non-native) models differently from GPTModel:
- Non-native generate(prompt) → str
- Non-native generate(prompt, schema=X) → X (validated pydantic model)
No tuple wrapping — that's only for native GPTModel.
"""

import json
import os
import re
from pathlib import Path
from typing import Optional, Union

from deepeval.models import DeepEvalBaseLLM
from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI
from pydantic import BaseModel

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
_BASE_URL = "https://api.deepseek.com"
_MODEL = "deepseek-chat"


def _trim_and_load_json(text: str) -> dict:
    """Extract JSON from LLM output that may contain markdown fences."""
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1)
    text = text.strip()
    return json.loads(text)


class DeepSeekModel(DeepEvalBaseLLM):
    """DeepSeek model for DeepEval metrics and DeepTeam red teaming."""

    def __init__(self, model: str = _MODEL):
        self._model_name = model
        self._client = OpenAI(api_key=_API_KEY, base_url=_BASE_URL)
        self._async_client = AsyncOpenAI(api_key=_API_KEY, base_url=_BASE_URL)

    def load_model(self):
        return self._model_name

    def supports_json_mode(self) -> bool:
        return True

    def supports_structured_outputs(self) -> bool:
        return False

    def generate(
        self, prompt: str, schema: Optional[type[BaseModel]] = None, **kwargs
    ) -> Union[str, BaseModel]:
        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            **({"response_format": {"type": "json_object"}} if schema else {}),
        )
        output = response.choices[0].message.content or ""

        if schema:
            try:
                json_output = _trim_and_load_json(output)
                return schema.model_validate(json_output)
            except Exception:
                return output

        return output

    async def a_generate(
        self, prompt: str, schema: Optional[type[BaseModel]] = None, **kwargs
    ) -> Union[str, BaseModel]:
        response = await self._async_client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            **({"response_format": {"type": "json_object"}} if schema else {}),
        )
        output = response.choices[0].message.content or ""

        if schema:
            try:
                json_output = _trim_and_load_json(output)
                return schema.model_validate(json_output)
            except Exception:
                return output

        return output

    def get_model_name(self) -> str:
        return self._model_name
