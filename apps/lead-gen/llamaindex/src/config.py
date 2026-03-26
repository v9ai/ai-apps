"""LLM factory — DeepSeek via LlamaIndex's DeepSeek integration."""

import os

from llama_index.llms.deepseek import DeepSeek


_llm_json: DeepSeek | None = None
_llm_text: DeepSeek | None = None


def get_llm_json() -> DeepSeek:
    """DeepSeek LLM configured for JSON output (lower temperature)."""
    global _llm_json
    if _llm_json is None:
        _llm_json = DeepSeek(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            temperature=0.3,
            additional_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm_json


def get_llm_text() -> DeepSeek:
    """DeepSeek LLM configured for long-form text generation."""
    global _llm_text
    if _llm_text is None:
        _llm_text = DeepSeek(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            temperature=0.5,
            max_tokens=4096,
            timeout=120,
        )
    return _llm_text
