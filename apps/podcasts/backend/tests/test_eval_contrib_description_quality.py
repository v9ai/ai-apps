"""G-Eval tests for contribution description quality.

Tests whether contribution titles are proper names (not sentences) and whether
descriptions are self-contained enough to be understood without the title.

Usage:
    pytest tests/test_eval_contrib_description_quality.py -v
    deepeval test run tests/test_eval_contrib_description_quality.py
"""

import json
import os
from pathlib import Path
from typing import Any

import httpx
import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"


# ═══════════════════════════════════════════════════════════════════════════
# DeepSeek model for DeepEval
# ═══════════════════════════════════════════════════════════════════════════

class DeepSeekEvalModel(DeepEvalBaseLLM):
    def __init__(self):
        self._api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self._base_url = "https://api.deepseek.com/v1"
        self._model_name = "deepseek-chat"
        super().__init__(model=self._model_name)

    def load_model(self):
        return self

    def get_model_name(self) -> str:
        return self._model_name

    def _call_api(self, prompt: str) -> str:
        if not self._api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not set")
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{self._base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                json={"model": self._model_name, "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.0, "max_tokens": 2048},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    def generate(self, prompt: str, **kwargs) -> str:
        return self._call_api(prompt)

    async def a_generate(self, prompt: str, **kwargs) -> str:
        import asyncio
        return await asyncio.to_thread(self._call_api, prompt)


_eval_model = None

def _get_eval_model() -> DeepSeekEvalModel:
    global _eval_model
    if _eval_model is None:
        _eval_model = DeepSeekEvalModel()
    return _eval_model


# ═══════════════════════════════════════════════════════════════════════════
# Data loader
# ═══════════════════════════════════════════════════════════════════════════

def _load_profiles() -> list[dict[str, Any]]:
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data and "bio" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# G-Eval: Contribution Title is a Name, Not a Sentence
# ═══════════════════════════════════════════════════════════════════════════

class TestContribTitleIsNameGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_contrib_title_is_name_not_sentence_geval(self, profile):
        contribs = profile.get("key_contributions", [])
        if not contribs:
            pytest.skip(f"No contributions for {profile['slug']}")
        titles = "\n".join(
            f"- {c.get('title', '(missing)')}" for c in contribs
        )
        metric = GEval(
            name="Contribution Title Naming",
            criteria=(
                "Are contribution titles proper project/paper NAMES "
                "(like 'LangChain', 'Attention Is All You Need', 'vLLM') "
                "rather than sentences or descriptions? "
                "Score 1.0=all titles are names, 0.0=titles are sentences."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List contribution titles for {profile.get('name', profile['slug'])}",
            actual_output=titles,
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# G-Eval: Contribution Description is Self-Contained
# ═══════════════════════════════════════════════════════════════════════════

class TestContribDescriptionSelfContainedGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_contrib_description_self_contained_geval(self, profile):
        contribs = profile.get("key_contributions", [])
        if not contribs:
            pytest.skip(f"No contributions for {profile['slug']}")
        descriptions = "\n\n".join(
            f"Description: {c.get('description', '(missing)')}"
            for c in contribs
        )
        metric = GEval(
            name="Contribution Description Self-Containedness",
            criteria=(
                "Can you understand what each contribution IS and WHY it matters "
                "from the description alone, without needing the title? "
                "Score 1.0=fully self-contained descriptions."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Evaluate contribution descriptions for {profile.get('name', profile['slug'])}",
            actual_output=descriptions,
        )
        assert_test(tc, [metric])
