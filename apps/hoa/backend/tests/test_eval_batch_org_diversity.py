"""DeepEval evaluation suite for organizational diversity across AI contributor profiles.

Tests that the profile corpus represents a healthy spread of organizations
rather than being dominated by a single company.

Usage:
    pytest tests/test_eval_batch_org_diversity.py -v
    pytest tests/test_eval_batch_org_diversity.py -k "deepeval" -v
    deepeval test run tests/test_eval_batch_org_diversity.py
"""

import json
import os
import re
from collections import Counter
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
# Known AI organizations and org extraction
# ═══════════════════════════════════════════════════════════════════════════

KNOWN_AI_ORGS = {
    "Google": [r"\bGoogle\b", r"\bDeepMind\b", r"\bGoogle DeepMind\b", r"\bGoogle Brain\b", r"\bGoogle AI\b"],
    "Meta": [r"\bMeta\b", r"\bFacebook\b", r"\bFAIR\b", r"\bMeta AI\b"],
    "OpenAI": [r"\bOpenAI\b"],
    "Anthropic": [r"\bAnthropic\b"],
    "Microsoft": [r"\bMicrosoft\b", r"\bMicrosoft Research\b"],
    "HuggingFace": [r"\bHugging\s?Face\b", r"\bHuggingFace\b"],
    "Apple": [r"\bApple\b"],
    "Amazon": [r"\bAmazon\b", r"\bAWS\b"],
    "NVIDIA": [r"\bNVIDIA\b", r"\bNvidia\b"],
    "Stability AI": [r"\bStability AI\b", r"\bStability\b"],
    "Cohere": [r"\bCohere\b"],
    "Mistral": [r"\bMistral\b", r"\bMistral AI\b"],
    "xAI": [r"\bxAI\b"],
    "Tesla": [r"\bTesla\b"],
    "Baidu": [r"\bBaidu\b"],
    "ByteDance": [r"\bByteDance\b"],
    "Inflection AI": [r"\bInflection\s?AI\b", r"\bInflection\b"],
    "Character AI": [r"\bCharacter\.?AI\b", r"\bCharacter AI\b"],
    "LangChain": [r"\bLangChain\b"],
    "Stanford": [r"\bStanford\b"],
    "MIT": [r"\bMIT\b"],
    "UC Berkeley": [r"\bUC Berkeley\b", r"\bBerkeley\b"],
    "Carnegie Mellon": [r"\bCarnegie Mellon\b", r"\bCMU\b"],
    "Mila": [r"\bMila\b"],
    "University of Toronto": [r"\bUniversity of Toronto\b", r"\bU of T\b"],
    "University of Montreal": [r"\bUniversit[ey] (?:de |of )?Montr[ée]al\b"],
}


def _extract_orgs_from_bio(bio: str) -> set[str]:
    """Return the set of known AI orgs mentioned in a bio string."""
    found = set()
    for org, patterns in KNOWN_AI_ORGS.items():
        for pat in patterns:
            if re.search(pat, bio, re.IGNORECASE):
                found.add(org)
                break
    return found


# ═══════════════════════════════════════════════════════════════════════════
# Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestOrgDiversity:

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run research_pipeline.py first")
        return p

    def test_extract_orgs_from_bios(self):
        """Parse bios to find company/org mentions and count per org."""
        profiles = self._profiles()
        org_counter: Counter[str] = Counter()
        for p in profiles:
            bio = p.get("bio", "")
            orgs = _extract_orgs_from_bio(bio)
            for org in orgs:
                org_counter[org] += 1

        assert len(org_counter) > 0, "No known AI orgs found in any bio"

        # Informational: print the distribution
        total_profiles = len(profiles)
        for org, count in org_counter.most_common():
            pct = count / total_profiles * 100
            print(f"  {org}: {count}/{total_profiles} ({pct:.0f}%)")

    def test_no_org_dominance(self):
        """Assert no single organization is mentioned in more than 40% of profiles."""
        profiles = self._profiles()
        total = len(profiles)
        org_counter: Counter[str] = Counter()
        for p in profiles:
            bio = p.get("bio", "")
            orgs = _extract_orgs_from_bio(bio)
            for org in orgs:
                org_counter[org] += 1

        for org, count in org_counter.items():
            ratio = count / total
            assert ratio <= 0.4, (
                f"Org '{org}' dominates: mentioned in {count}/{total} profiles "
                f"({ratio:.0%}), exceeds 40% threshold"
            )

    def test_multiple_orgs_represented(self):
        """Assert at least 3 different organizations are represented across all profiles."""
        profiles = self._profiles()
        all_orgs: set[str] = set()
        for p in profiles:
            bio = p.get("bio", "")
            all_orgs |= _extract_orgs_from_bio(bio)

        assert len(all_orgs) >= 3, (
            f"Only {len(all_orgs)} org(s) found across all profiles: {all_orgs}. "
            f"Expected at least 3 for meaningful diversity."
        )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Organizational Diversity (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestOrgDiversityGEval:
    @pytest.mark.deepeval
    def test_org_diversity_geval(self):
        """G-Eval: assess organizational diversity across all profile bios."""
        profiles = _load_profiles()
        if not profiles:
            pytest.skip("No profiles -- run research_pipeline.py first")

        n = len(profiles)
        bio_summaries = []
        for p in profiles:
            name = p.get("name", p.get("slug", "unknown"))
            bio = p.get("bio", "(no bio)")
            # Truncate long bios to keep prompt manageable
            if len(bio) > 300:
                bio = bio[:300] + "..."
            bio_summaries.append(f"- {name}: {bio}")

        bios_text = "\n".join(bio_summaries)

        metric = GEval(
            name="Organizational Diversity",
            criteria=(
                f"Looking at these {n} AI contributor bios, is there good organizational "
                f"diversity? Not all from one company? "
                f"Score 1.0=excellent diversity, 0.0=all from same org."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Evaluate organizational diversity across {n} AI contributor profiles",
            actual_output=bios_text,
        )
        assert_test(tc, [metric])
