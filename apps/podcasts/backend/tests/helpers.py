"""Test helpers — mock data generators, output validators, and metric factories."""

import asyncio
import json
import os
import re
from typing import Any

try:
    from deepeval.models import DeepEvalBaseLLM
    _HAS_DEEPEVAL = True
except (ImportError, TypeError):
    _HAS_DEEPEVAL = False
    DeepEvalBaseLLM = object  # type: ignore[misc,assignment]


class MLXEvalModel(DeepEvalBaseLLM):  # type: ignore[misc]
    """Local MLX model for deepeval metrics — fully offline.

    Import via: ``from helpers import get_eval_model``
    """

    def __init__(self):
        self._model_name = os.environ.get("MLX_MODEL", "mlx-community/Qwen2.5-7B-Instruct-4bit")
        if _HAS_DEEPEVAL:
            super().__init__(model=self._model_name)
        self._client = None

    def _get_client(self):
        if self._client is None:
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
            from mlx_client import MLXClient, MLXConfig
            self._client = MLXClient(MLXConfig(
                default_temperature=0.0,
                default_max_tokens=2048,
            ))
        return self._client

    def load_model(self):
        return self

    def get_model_name(self) -> str:
        return self._model_name

    def _call_sync(self, prompt: str) -> str:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from mlx_client import ChatMessage
        client = self._get_client()
        resp = asyncio.get_event_loop().run_until_complete(
            client.chat([ChatMessage(role="user", content=prompt)])
        )
        return resp.choices[0].message.content

    def generate(self, prompt: str, **kwargs) -> str:
        return self._call_sync(prompt)

    async def a_generate(self, prompt: str, **kwargs) -> str:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from mlx_client import ChatMessage
        client = self._get_client()
        resp = await client.chat([ChatMessage(role="user", content=prompt)])
        return resp.choices[0].message.content


_shared_model: "MLXEvalModel | None" = None


def get_eval_model() -> MLXEvalModel:
    """Return the shared singleton MLXEvalModel instance."""
    global _shared_model
    if _shared_model is None:
        _shared_model = MLXEvalModel()
    return _shared_model


def make_test_case_input(person: dict[str, str], task_description: str) -> str:
    """Build a representative input string for an LLMTestCase."""
    return (
        f"Research {person.get('name', '')} ({person.get('role', '')} @ {person.get('org', '')}). "
        f"Task: {task_description}"
    )


def validate_json_array(raw: str) -> list[dict]:
    """Extract and validate a JSON array from raw agent output."""
    raw = raw.strip()
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except Exception:
        pass
    m = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", raw, re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    m = re.search(r"(\[[\s\S]*?\])", raw)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return []


def validate_json_object(raw: str) -> dict[str, Any]:
    """Extract and validate a JSON object from raw agent output."""
    raw = raw.strip()
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    m = re.search(r"(\{[\s\S]*?\})", raw)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return {}


def has_required_keys(data: dict, keys: list[str]) -> list[str]:
    """Return list of missing required keys."""
    return [k for k in keys if k not in data]


def has_valid_urls(items: list[dict], url_key: str = "url") -> tuple[int, int]:
    """Count (total, valid) URLs in a list of dicts."""
    total = 0
    valid = 0
    for item in items:
        url = item.get(url_key, "")
        if url:
            total += 1
            if url.startswith(("http://", "https://")):
                valid += 1
    return total, valid


def bio_word_count(bio: str) -> int:
    """Return word count of a bio string."""
    return len(bio.split())


def timeline_is_chronological(events: list[dict]) -> bool:
    """Check if timeline events are in chronological order."""
    dates = [e.get("date", "") for e in events if e.get("date")]
    return dates == sorted(dates)


# ── Mock tool responses for deterministic testing ────────────────────────

MOCK_WEB_SEARCH_RESULT = (
    "- [Harrison Chase on LangChain](https://langchain.com)\n"
    "  CEO of LangChain, building the LLM orchestration framework.\n"
    "- [LangChain raises $25M](https://techcrunch.com/langchain)\n"
    "  LangChain raises Series A led by Sequoia Capital."
)

MOCK_GITHUB_PROFILE = (
    "login: hwchase17\n"
    "name: Harrison Chase\n"
    "bio: Building LangChain\n"
    "company: LangChain\n"
    "public_repos: 50\n"
    "followers: 12000\n\n"
    "Top repositories:\n"
    "  - langchain (100000 stars, Python): Build context-aware reasoning apps\n"
    "  - langgraph (5000 stars, Python): Multi-agent orchestration framework"
)

MOCK_ARXIV_RESULT = (
    "- [2024-01-05] SPADE: Synthesizing Data Quality Assertions for LLM Pipelines\n"
    "  Authors: Harrison Chase, et al.\n"
    "  We present SPADE, a system for generating data quality assertions...\n"
    "  https://arxiv.org/abs/2401.03038"
)

MOCK_NEWS_RESULT = (
    "- [LangChain Launches LangGraph](https://techcrunch.com/langgraph)\n"
    "  2024-06-15 | TechCrunch\n"
    "  LangChain releases LangGraph for multi-agent orchestration."
)

MOCK_HF_RESULT = "(no HuggingFace data)"

MOCK_ORCID_RESULT = "(no academic record available)"

MOCK_SEMANTIC_SCHOLAR_RESULT = (
    "Author: Harrison Chase\n"
    "  h-index: 3\n"
    "  Citations: 150\n"
    "  Papers: 5\n"
    "  Top Papers:\n"
    "    - [2024] SPADE (120 citations)"
)
