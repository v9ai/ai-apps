"""Shared LLM and database configuration singletons."""

import os

from langchain_openai import ChatOpenAI

_llm: ChatOpenAI | None = None
_llm_no_json: ChatOpenAI | None = None


def get_llm() -> ChatOpenAI:
    """Get a cached ChatOpenAI instance configured for JSON output."""
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.2,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm


def get_llm_no_json() -> ChatOpenAI:
    """Get a cached ChatOpenAI instance without forced JSON output."""
    global _llm_no_json
    if _llm_no_json is None:
        _llm_no_json = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.2,
        )
    return _llm_no_json
