"""DeepEval evaluation suite for the Mega 50-Agent Contributors Discovery Crew.

Tests the quality of generated contributor profiles across multiple dimensions
using both structural assertions and LLM-as-judge (DeepEval G-Eval).

Usage:
    pytest tests/test_mega_crew_eval.py -v
    pytest tests/test_mega_crew_eval.py -k "schema" -v
    pytest tests/test_mega_crew_eval.py -k "deepeval" -v
    deepeval test run tests/test_mega_crew_eval.py
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
PERSONALITIES_DIR = SCRIPT_DIR / "personalities"
REPORTS_DIR = SCRIPT_DIR / "github-reports"


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
# Data loaders
# ═══════════════════════════════════════════════════════════════════════════

AI_KEYWORDS = {
    "ai", "ml", "machine learning", "deep learning", "neural", "llm",
    "transformer", "gpt", "bert", "diffusion", "inference", "training",
    "model", "pytorch", "tensorflow", "jax", "huggingface", "langchain",
    "rag", "agent", "embedding", "vector", "nlp", "computer vision",
    "reinforcement learning", "rlhf", "fine-tuning", "quantization",
    "cuda", "gpu", "distributed", "serving", "deployment", "mlops",
    "prompt", "tokeniz", "attention", "scaling", "benchmark",
}

REQUIRED_FIELDS = {"slug", "name", "generated_at", "bio", "topics",
                    "timeline", "key_contributions", "quotes", "social", "sources"}


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


def _load_mega_report() -> dict[str, Any]:
    p = REPORTS_DIR / "mega-discovery.json"
    if p.exists():
        try:
            return json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def _load_mega_quality() -> dict[str, Any]:
    p = REPORTS_DIR / "mega-quality.json"
    if p.exists():
        try:
            return json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def _is_ai_relevant(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in AI_KEYWORDS)


# ═══════════════════════════════════════════════════════════════════════════
# Schema conformance
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaSchema:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_required_fields(self):
        for p in self._profiles():
            missing = REQUIRED_FIELDS - set(p.keys())
            assert not missing, f"{p.get('slug', '?')} missing: {missing}"

    def test_slug_format(self):
        for p in self._profiles():
            slug = p.get("slug", "")
            assert slug and re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", slug), f"Bad slug: '{slug}'"

    def test_bio_length(self):
        for p in self._profiles():
            bio = p.get("bio", "")
            assert isinstance(bio, str) and len(bio) >= 50, f"Bio too short for {p['slug']}: {len(bio)} chars"

    def test_topics_array(self):
        for p in self._profiles():
            topics = p.get("topics", [])
            assert isinstance(topics, list) and len(topics) >= 2, f"Too few topics for {p['slug']}"

    def test_timeline_structure(self):
        for p in self._profiles():
            for e in p.get("timeline", []):
                assert isinstance(e, dict), f"Timeline entry not dict for {p['slug']}"
                assert "date" in e and "event" in e, f"Timeline missing date/event for {p['slug']}"

    def test_social_is_dict(self):
        for p in self._profiles():
            assert isinstance(p.get("social", {}), dict), f"Social not dict for {p['slug']}"

    def test_contributions_structure(self):
        for p in self._profiles():
            for c in p.get("key_contributions", []):
                assert isinstance(c, dict) and "title" in c, f"Bad contribution for {p['slug']}"

    def test_no_duplicate_slugs(self):
        slugs = [p["slug"] for p in self._profiles()]
        dupes = [s for s in slugs if slugs.count(s) > 1]
        assert not dupes, f"Duplicate slugs: {set(dupes)}"


# ═══════════════════════════════════════════════════════════════════════════
# AI relevance
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaAIRelevance:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles")
        return p

    def test_bio_mentions_ai(self):
        for p in self._profiles():
            combined = f"{p.get('bio', '')} {' '.join(p.get('topics', []))}"
            assert _is_ai_relevant(combined), f"{p['slug']} not AI-relevant"

    def test_topics_specificity(self):
        generic = {"programming", "software", "open source", "web", "coding", "development"}
        for p in self._profiles():
            topics = p.get("topics", [])
            if not topics:
                continue
            specific = sum(1 for t in topics if t.lower() not in generic)
            assert specific / len(topics) >= 0.5, f"{p['slug']} too many generic topics"


# ═══════════════════════════════════════════════════════════════════════════
# Completeness
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaCompleteness:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles")
        return p

    def test_minimum_completeness(self):
        for p in self._profiles():
            score = 0
            if len(p.get("bio", "")) >= 100:
                score += 2
            elif len(p.get("bio", "")) >= 50:
                score += 1
            if len(p.get("topics", [])) >= 3:
                score += 1
            tl = p.get("timeline", [])
            if len(tl) >= 5:
                score += 2
            elif len(tl) >= 2:
                score += 1
            kc = p.get("key_contributions", [])
            if len(kc) >= 3:
                score += 2
            elif len(kc) >= 1:
                score += 1
            if len(p.get("social", {})) >= 2:
                score += 1
            if len(p.get("quotes", [])) >= 1:
                score += 1
            if len(p.get("sources", [])) >= 1:
                score += 1
            assert score >= 4, f"{p['slug']} completeness {score}/10 < 4"


# ═══════════════════════════════════════════════════════════════════════════
# Deduplication
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaDedup:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles")
        return p

    def test_no_duplicate_github_logins(self):
        logins = []
        for p in self._profiles():
            gh = p.get("social", {}).get("github", "")
            if gh:
                login = gh.rstrip("/").split("/")[-1] if "/" in gh else gh
                logins.append(login)
        dupes = [l for l in logins if logins.count(l) > 1]
        assert not dupes, f"Duplicate logins: {set(dupes)}"


# ═══════════════════════════════════════════════════════════════════════════
# TypeScript personality files
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaTSFiles:
    def _files(self):
        slugs = {p["slug"] for p in _load_profiles()}
        files = [ts for ts in PERSONALITIES_DIR.glob("*.ts") if ts.stem in slugs]
        if not files:
            pytest.skip("No matching .ts files")
        return files

    def test_has_required_fields(self):
        for ts in self._files():
            content = ts.read_text()
            for field in ("name:", "role:", "org:", "slug:"):
                assert field in content, f"Missing '{field}' in {ts.name}"

    def test_has_personality_type(self):
        for ts in self._files():
            assert "Personality" in ts.read_text(), f"Missing Personality type in {ts.name}"

    def test_has_default_export(self):
        for ts in self._files():
            assert "export default" in ts.read_text(), f"Missing export in {ts.name}"


# ═══════════════════════════════════════════════════════════════════════════
# Discovery report
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaReport:
    def _report(self):
        r = _load_mega_report()
        if not r:
            pytest.skip("No mega report — run research_pipeline.py first")
        return r

    def test_has_discovery_data(self):
        assert self._report().get("discovery"), "No discovery data"

    def test_has_roster(self):
        assert isinstance(self._report().get("roster", []), list)

    def test_has_quality(self):
        assert isinstance(self._report().get("quality", {}), dict)

    def test_50_agents(self):
        assert self._report().get("agents") == 50

    def test_6_phases(self):
        assert self._report().get("phases") == 6


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Bio Quality (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaBioGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_specificity(self, profile):
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Bio Specificity",
            criteria=(
                "Evaluate whether the biography contains specific, verifiable facts about the person. "
                "A good bio names actual projects, frameworks, companies, roles, metrics. "
                "A bad bio uses vague language like 'contributed to various projects'."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.6, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a bio for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])

    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_coherence(self, profile):
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Bio Coherence",
            criteria=(
                "Evaluate whether the biography reads as a coherent, well-structured paragraph. "
                "Should flow naturally, avoid contradictions, present info logically. "
                "Deduct for JSON artifacts, broken sentences, placeholder text."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.6, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a bio for: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: AI Contributor Relevance (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaRelevanceGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_profile_describes_ai_contributor(self, profile):
        bio = profile.get("bio", "")
        topics = ", ".join(profile.get("topics", []))
        contribs = "; ".join(c.get("title", "") for c in profile.get("key_contributions", []))
        full = f"Bio: {bio}\nTopics: {topics}\nContributions: {contribs}"
        if len(full) < 50:
            pytest.skip(f"Not enough content for {profile['slug']}")
        metric = GEval(
            name="AI Contributor Relevance",
            criteria=(
                "Evaluate whether this profile describes a genuine contributor to AI/ML open source. "
                "Score 1.0 for core contributors to PyTorch, HuggingFace, LangChain, etc. "
                "Score 0.5 for peripheral contributors. Score 0.0 for non-AI people."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(input="Describe an AI/ML contributor", actual_output=full)
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Profile Completeness (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaCompletenessGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:5],
                             ids=lambda p: p.get("slug", "?"))
    def test_profile_completeness(self, profile):
        sections = []
        sections.append(f"Bio: {profile.get('bio', '(missing)')}")
        sections.append(f"Topics: {', '.join(profile.get('topics', ['(none)']))}")
        tl = profile.get("timeline", [])
        sections.append(f"Timeline: {len(tl)} events")
        kc = profile.get("key_contributions", [])
        sections.append(f"Contributions: {len(kc)} entries")
        sections.append(f"Social links: {len(profile.get('social', {}))}")
        sections.append(f"Quotes: {len(profile.get('quotes', []))}")
        full = "\n".join(sections)
        metric = GEval(
            name="Profile Completeness",
            criteria=(
                "Evaluate how complete this AI contributor profile is. A complete profile has: "
                "a specific bio (3+ sentences), 5+ topics, 5+ timeline events, 3+ contributions, "
                "2+ social links, and at least 1 quote. Score 1.0 for fully complete, "
                "0.5 for partially complete, 0.0 for mostly empty."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(input="Assess profile completeness", actual_output=full)
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Executive Summary Quality (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaExecSummaryGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:5],
                             ids=lambda p: p.get("slug", "?"))
    def test_executive_summary_quality(self, profile):
        exec_summary = profile.get("executive_summary", {})
        if not exec_summary or not isinstance(exec_summary, dict):
            pytest.skip(f"No executive summary for {profile['slug']}")
        text = json.dumps(exec_summary, indent=2)
        metric = GEval(
            name="Executive Summary Quality",
            criteria=(
                "Evaluate this executive summary of an AI contributor. A good summary has: "
                "a clear one-liner, 3 specific key facts, a concise career arc, "
                "actionable meeting prep starters, and an honest assessment of significance. "
                "Score 1.0 for CEO-ready briefing, 0.5 for adequate, 0.0 for vague/empty."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(input="Evaluate executive summary quality", actual_output=text)
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# Quality report validation
# ═══════════════════════════════════════════════════════════════════════════

class TestMegaQuality:
    def _quality(self):
        q = _load_mega_quality()
        if not q:
            pytest.skip("No quality report — run research_pipeline.py first")
        return q.get("quality", {})

    def test_batch_score_exists(self):
        q = self._quality()
        assert "batch_score" in q or "profiles" in q, "No batch_score or profiles in quality"

    def test_profiles_have_scores(self):
        q = self._quality()
        profiles = q.get("profiles", [])
        if not profiles:
            pytest.skip("No per-profile scores")
        for p in profiles:
            assert "overall" in p or "slug" in p, f"Missing score data: {p}"
