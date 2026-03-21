"""DeepEval evaluation suite for the collaboration_network section of profiles.

Tests structural correctness and factual plausibility of collaborator data
using both assertions and LLM-as-judge (DeepEval G-Eval).

Usage:
    pytest tests/test_eval_collab_network.py -v
    pytest tests/test_eval_collab_network.py -k "deepeval" -v
    deepeval test run tests/test_eval_collab_network.py
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
# Data loader — only profiles that have collaboration_network
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
            if isinstance(data, dict) and "slug" in data and "collaboration_network" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests
# ═══════════════════════════════════════════════════════════════════════════

class TestCollabStructure:
    """collaboration_network must be a dict when present."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with collaboration_network — run crew.py first")
        return p

    def test_collab_structure(self):
        for p in self._profiles():
            cn = p["collaboration_network"]
            assert isinstance(cn, dict), (
                f"{p['slug']}: collaboration_network is {type(cn).__name__}, expected dict"
            )


class TestCollabHasCollaborators:
    """collaboration_network must contain key_collaborators or co_founders as a list."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with collaboration_network — run crew.py first")
        return p

    def test_collab_has_collaborators(self):
        for p in self._profiles():
            cn = p["collaboration_network"]
            has_key_collabs = isinstance(cn.get("key_collaborators"), list)
            has_co_founders = isinstance(cn.get("co_founders"), list)
            assert has_key_collabs or has_co_founders, (
                f"{p['slug']}: collaboration_network has neither "
                f"'key_collaborators' nor 'co_founders' as a list"
            )


class TestCollabNoSelfReference:
    """The profile person's own name must not appear as their own collaborator."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with collaboration_network — run crew.py first")
        return p

    def test_collab_no_self_reference(self):
        for p in self._profiles():
            cn = p["collaboration_network"]
            person_name = p.get("name", "").lower().strip()
            if not person_name:
                continue

            # Collect all collaborator names from every list-like field
            collab_names: list[str] = []
            for key in ("key_collaborators", "co_founders", "mentors", "mentees"):
                items = cn.get(key, [])
                if not isinstance(items, list):
                    continue
                for item in items:
                    if isinstance(item, str):
                        collab_names.append(item.lower().strip())
                    elif isinstance(item, dict):
                        name = item.get("name", "")
                        if isinstance(name, str):
                            collab_names.append(name.lower().strip())

            assert person_name not in collab_names, (
                f"{p['slug']}: lists themselves ({p.get('name')}) as a collaborator"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Collaborator Plausibility (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestCollabPeopleAreRealGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _load_profiles()[:5],
        ids=lambda p: p.get("slug", "?"),
    )
    def test_collab_people_are_real_geval(self, profile):
        cn = profile["collaboration_network"]
        person_name = profile.get("name", profile["slug"])

        # Build a readable summary of the collaboration network
        parts = [f"Person: {person_name}"]
        for key in ("key_collaborators", "co_founders", "mentors", "mentees"):
            items = cn.get(key, [])
            if not isinstance(items, list) or not items:
                continue
            entries = []
            for item in items:
                if isinstance(item, str):
                    entries.append(item)
                elif isinstance(item, dict):
                    name = item.get("name", "unknown")
                    rel = item.get("relationship", "")
                    ctx = item.get("context", "")
                    entry = name
                    if rel:
                        entry += f" ({rel})"
                    if ctx:
                        entry += f" — {ctx}"
                    entries.append(entry)
            parts.append(f"{key}: {'; '.join(entries)}")

        academic = cn.get("academic_lineage", "")
        if academic and isinstance(academic, str):
            parts.append(f"Academic lineage: {academic}")

        full_text = "\n".join(parts)
        if len(full_text) < 30:
            pytest.skip(f"Collaboration data too sparse for {profile['slug']}")

        metric = GEval(
            name="Collaborator Plausibility",
            criteria=(
                "Are these collaborators/co-founders REAL people in AI/tech? "
                "Do the relationships described (co-founder, co-author, mentor) sound plausible? "
                "Score 1.0=all real and plausible, 0.0=fabricated names."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List the collaboration network for AI/tech figure: {person_name}",
            actual_output=full_text,
        )
        assert_test(tc, [metric])
