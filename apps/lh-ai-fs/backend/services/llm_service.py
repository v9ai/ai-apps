import json
import logging
import os
import re
from typing import Optional, Type

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

logger = logging.getLogger(__name__)

DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

# Ollama defaults (local, no API key needed)
# Usage: OLLAMA_MODEL=qwen2.5:7b python run_evals.py
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_DEFAULT_MODEL = "qwen2.5:7b"


def _extract_json(text: str) -> str:
    """Extract JSON from LLM response, handling markdown code fences and edge cases."""
    # Try markdown code fences first
    m = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if m:
        candidate = m.group(1).strip()
        try:
            json.loads(candidate)
            return candidate
        except json.JSONDecodeError:
            pass  # Fall through to other strategies

    text = text.strip()
    if text.startswith("{") or text.startswith("["):
        return text

    # Last resort: find outermost JSON object or array
    start = text.find("{")
    if start < 0:
        start = text.find("[")
    if start >= 0:
        bracket = "{" if text[start] == "{" else "["
        close = "}" if bracket == "{" else "]"
        end = text.rfind(close)
        if end > start:
            return text[start:end + 1]

    return text


class LLMService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        if ollama_model := (model or os.getenv("OLLAMA_MODEL")):
            self.api_key = "ollama"
            self.model = ollama_model
            self.base_url = OLLAMA_BASE_URL
        elif key := (api_key or os.getenv("DEEPSEEK_API_KEY")):
            self.api_key = key
            self.model = model or DEEPSEEK_MODEL
            self.base_url = DEEPSEEK_BASE_URL
        else:
            raise ValueError(
                "No LLM provider configured.\n"
                "  Local:  ollama pull qwen2.5:7b  →  OLLAMA_MODEL=qwen2.5:7b\n"
                "  Cloud:  DEEPSEEK_API_KEY=<key>"
            )
        logger.info("LLMService: model=%s base_url=%s", self.model, self.base_url)

    def _make_llm(self, temperature: float = 0.1) -> ChatOpenAI:
        return ChatOpenAI(
            model=self.model,
            temperature=temperature,
            api_key=self.api_key,
            base_url=self.base_url,
        )

    def _schema_prompt(self, response_model: Type[BaseModel]) -> str:
        schema = response_model.model_json_schema()
        return (
            "You are a precise legal analysis assistant.\n"
            f"Respond with valid JSON matching this schema:\n{json.dumps(schema, indent=2)}\n"
            "Output ONLY valid JSON, no markdown fences, no explanation."
        )

    async def get_structured_response(
        self,
        prompt: str,
        response_model: Type[BaseModel],
        system_prompt: str = "",
        temperature: float = 0.1,
    ) -> BaseModel:
        if system_prompt:
            schema = response_model.model_json_schema()
            system = (
                system_prompt
                + f"\n\nRespond with valid JSON matching this schema:\n"
                + f"{json.dumps(schema, indent=2)}\n"
                + "Output ONLY valid JSON."
            )
        else:
            system = self._schema_prompt(response_model)

        raw = await self.get_completion(system, prompt, temperature)
        if raw is None:
            raise ValueError("Empty LLM response")
        json_str = _extract_json(raw)
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON from LLM (len=%d): %s", len(raw), e)
            raise ValueError(f"Invalid JSON from LLM: {e}") from e
        result = response_model.model_validate(data)
        if result is None:
            raise ValueError("Empty LLM response")
        return result

    async def get_completion(
        self,
        system: str,
        user: str,
        temperature: float = 0.1,
    ) -> str:
        llm = self._make_llm(temperature)
        chain = (
            ChatPromptTemplate.from_messages([
                ("system", "{system}"),
                ("human", "{user}"),
            ])
            | llm
            | StrOutputParser()
        )
        result = await chain.ainvoke({"system": system, "user": user})
        return result or ""
