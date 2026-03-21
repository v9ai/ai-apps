"""DeepEval evaluation suite for bio factual density.

Measures how many verifiable facts each bio contains per sentence:
- Named entities (project names, company names, person names)
- Metrics and numbers (stars, users, citations, funding amounts)
- G-Eval: factual density scoring via LLM-as-judge

Usage:
    pytest tests/test_eval_bio_factual_density.py -v
    pytest tests/test_eval_bio_factual_density.py -k "named_entities" -v
    pytest tests/test_eval_bio_factual_density.py -k "metrics" -v
    pytest tests/test_eval_bio_factual_density.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_factual_density.py
"""

import json
import os
import re
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
# Regex helpers
# ═══════════════════════════════════════════════════════════════════════════

# Capitalized multi-word names: "LangChain", "Harrison Chase", "Google DeepMind"
# Matches sequences of capitalized words (2+ chars) that look like proper nouns,
# as well as CamelCase identifiers like PyTorch, TensorFlow, HuggingFace.
NAMED_ENTITY_RE = re.compile(
    r"\b[A-Z][a-zA-Z]{1,}(?:\s+[A-Z][a-zA-Z]{1,})*\b"
)

# Numbers and metrics: "100k+", "$25M", "1.5 billion", "50,000", "2023", percentages
METRIC_RE = re.compile(
    r"\$[\d,.]+[MBKmk]?"           # dollar amounts like $25M, $1.5B
    r"|\d[\d,]*\.?\d*[MBKmk]\+?"  # numbers with suffixes like 100k+, 1.5B
    r"|\d[\d,]*\.?\d*%"           # percentages like 95.2%
    r"|\d[\d,]+(?:\.\d+)?"        # plain large numbers like 50,000 or 1.5
    r"|\d{4}"                      # years like 2023
)


# ═══════════════════════════════════════════════════════════════════════════
# Test 1: Named entities
# ═══════════════════════════════════════════════════════════════════════════

class TestBioHasNamedEntities:
    """Check bios mention specific project names, company names, or person names."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_bio_has_named_entities(self):
        for p in self._profiles():
            bio = p.get("bio", "")
            if len(bio) < 30:
                continue
            entities = NAMED_ENTITY_RE.findall(bio)
            # Filter out common English words that happen to start sentences
            stopwords = {
                "The", "This", "That", "These", "Those", "His", "Her", "He",
                "She", "They", "It", "Its", "With", "From", "Before", "After",
                "Under", "Over", "Between", "During", "Since", "While", "Where",
                "When", "How", "What", "Who", "Which", "Also", "But", "And",
                "Not", "Has", "Had", "Was", "Were", "Are", "Been", "Being",
                "Have", "Does", "Did", "Will", "Would", "Could", "Should",
                "May", "Might", "Must", "Shall", "Can", "Prior", "Most",
                "Some", "Many", "Much", "Such", "Each", "Every", "Other",
                "Another", "Both", "All", "Any", "Few", "Several",
            }
            real_entities = [e for e in entities if e not in stopwords]
            assert len(real_entities) >= 2, (
                f"{p['slug']} bio has only {len(real_entities)} named entities "
                f"(expected >= 2): {real_entities}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Test 2: Metrics / numbers
# ═══════════════════════════════════════════════════════════════════════════

class TestBioHasMetrics:
    """Check bios contain numbers/metrics (stars, users, citations, funding amounts)."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_bio_has_metrics(self):
        for p in self._profiles():
            bio = p.get("bio", "")
            if len(bio) < 30:
                continue
            metrics = METRIC_RE.findall(bio)
            assert len(metrics) >= 1, (
                f"{p['slug']} bio has no numbers or metrics. "
                f"Good bios include GitHub stars, funding amounts, user counts, "
                f"or publication years."
            )


# ═══════════════════════════════════════════════════════════════════════════
# Test 3: G-Eval factual density (LLM-as-judge)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioFactualDensityGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_factual_density_geval(self, profile):
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Bio Factual Density",
            criteria=(
                "Count verifiable facts per sentence. "
                "Score 1.0 if every sentence has 2+ verifiable facts (names, dates, metrics). "
                "Score 0.5 if most sentences have 1 fact. "
                "Score 0.0 if bio is vague with no specific facts."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a factually dense bio for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])
