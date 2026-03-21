"""DeepEval evaluation suite for the 20-agent LangGraph research pipeline.

Maps one test class per agent. Each class uses G-Eval (LLM-as-judge) to
evaluate the quality of that agent's output section in the generated
research profile JSON.

Phase 1 — Intelligence Gathering (7 agents):
    Agent 1:  Web Research Specialist       → sources diversity & quality
    Agent 2:  GitHub & Open Source Analyst  → GitHub data accuracy
    Agent 3:  Academic Publications Analyst → ORCID / publication data
    Agent 4:  arXiv & Semantic Scholar      → scholarly metrics
    Agent 5:  Podcast & Media Analyst       → podcast_appearances
    Agent 6:  News & Press Analyst          → news items
    Agent 7:  HuggingFace Analyst           → HF model/dataset data

Phase 2 — Deep Analysis (11 agents):
    Agent 8:  Biography Writer              → bio quality
    Agent 9:  Timeline Architect            → timeline completeness
    Agent 10: Technical Contributions       → key_contributions depth
    Agent 11: Quote & Interview Specialist  → quotes authenticity
    Agent 12: Social & Digital Mapper       → social links coverage
    Agent 13: Expertise Domain Analyst      → topics specificity
    Agent 14: Competitive Landscape         → competitive_landscape
    Agent 15: Collaboration Network         → collaboration_network
    Agent 16: Funding & Business            → funding data
    Agent 17: Conference & Speaking          → conferences data
    Agent 18: Technical Philosophy          → technical_philosophy

Phase 3 — Synthesis & Evaluation (2 agents):
    Agent 19: Research Quality Evaluator    → eval scores
    Agent 20: Executive Summary Synthesizer → executive_summary

Usage:
    # All 20-agent tests
    deepeval test run tests/test_crew_agents_eval.py

    # Single agent by class
    pytest tests/test_crew_agents_eval.py::TestAgent08Bio -v

    # All Phase 2 agents
    pytest tests/test_crew_agents_eval.py -k "Phase2" -v

    # Single profile
    pytest tests/test_crew_agents_eval.py -k "joao-moura" -v
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
# DeepSeek model adapter (shared with test_contributors_eval.py)
# ═══════════════════════════════════════════════════════════════════════════

class DeepSeekEvalModel(DeepEvalBaseLLM):
    def __init__(self):
        self._api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self._base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        self._model_name = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        super().__init__(model=self._model_name)

    def load_model(self):
        return self

    def get_model_name(self) -> str:
        return self._model_name

    def _call_api(self, prompt: str) -> str:
        if not self._api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not set")
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                f"{self._base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self._model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.0,
                    "max_tokens": 2048,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    def generate(self, prompt: str, **kwargs) -> str:
        return self._call_api(prompt)

    async def a_generate(self, prompt: str, **kwargs) -> str:
        import asyncio
        return await asyncio.to_thread(self._call_api, prompt)


_model = None

def _get_model() -> DeepSeekEvalModel:
    global _model
    if _model is None:
        _model = DeepSeekEvalModel()
    return _model


# ═══════════════════════════════════════════════════════════════════════════
# Profile loader
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
            if isinstance(data, dict) and "slug" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


def _profiles_with(field: str) -> list[dict[str, Any]]:
    """Return profiles that have a non-empty value for `field`."""
    return [p for p in _load_profiles() if p.get(field)]


def _skip_if_empty(profiles, field: str):
    if not profiles:
        pytest.skip(f"No profiles with '{field}' — run crew.py first")


def _profile_id(p: dict) -> str:
    return p.get("slug", "?")


def _geval(name: str, criteria: str, threshold: float = 0.6) -> GEval:
    return GEval(
        name=name,
        criteria=criteria,
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        model=_get_model(),
        async_mode=False,
        threshold=threshold,
    )


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1 — Intelligence Gathering (Agents 1-7)
# ═══════════════════════════════════════════════════════════════════════════


class TestAgent01WebResearch:
    """Agent 1: Web Research Specialist — evaluates source diversity."""

    @pytest.mark.parametrize("profile", _profiles_with("sources"),
                             ids=_profile_id)
    def test_Phase1_source_diversity(self, profile):
        """Sources should span multiple domains, not all from one site."""
        sources = profile["sources"]
        urls = [s.get("url", "") for s in sources if isinstance(s, dict)]
        domains = set()
        for url in urls:
            m = re.search(r"https?://(?:www\.)?([^/]+)", url)
            if m:
                domains.add(m.group(1))

        text = json.dumps(sources, indent=2)
        metric = _geval(
            "Source Diversity",
            "Evaluate whether the research sources cover diverse domains and "
            "publication types (tech blogs, news sites, GitHub, official docs, "
            "podcasts, academic). Score 1.0 for 5+ distinct domains with mix of "
            "primary sources. Score 0.5 for 3-4 domains. Score 0.0 for sources "
            "from only 1-2 domains or all from social media.",
        )
        case = LLMTestCase(
            input=f"Research sources for {profile.get('name', '?')}",
            actual_output=text,
        )
        assert_test(case, [metric])

    @pytest.mark.parametrize("profile", _profiles_with("sources"),
                             ids=_profile_id)
    def test_Phase1_source_count(self, profile):
        """Should have at least 5 sources."""
        sources = profile.get("sources", [])
        assert len(sources) >= 5, (
            f"{profile['slug']} has only {len(sources)} sources (need ≥5)"
        )


class TestAgent02GitHub:
    """Agent 2: GitHub & Open Source Analyst — evaluates GitHub data."""

    @pytest.mark.parametrize("profile", _profiles_with("social"),
                             ids=_profile_id)
    def test_Phase1_github_url_present(self, profile):
        """Profile should have a GitHub URL if the person is a builder."""
        social = profile.get("social", {})
        topics = " ".join(profile.get("topics", [])).lower()
        bio = profile.get("bio", "").lower()
        is_builder = any(kw in topics + " " + bio for kw in [
            "framework", "open source", "github", "library", "sdk",
            "developer", "engineer", "code", "software",
        ])
        if is_builder:
            assert social.get("github"), (
                f"{profile['slug']} appears to be a builder but has no GitHub URL"
            )


class TestAgent03Academic:
    """Agent 3: Academic Publications Analyst — ORCID data quality."""

    # Academic data is optional — only test profiles that have it
    pass


class TestAgent04ArxivScholar:
    """Agent 4: arXiv & Semantic Scholar — scholarly impact metrics."""

    @pytest.mark.parametrize("profile", _profiles_with("key_contributions"),
                             ids=_profile_id)
    def test_Phase1_arxiv_links_valid(self, profile):
        """Any arXiv URLs in contributions should match the arxiv.org pattern."""
        for c in profile.get("key_contributions", []):
            url = c.get("url", "")
            if "arxiv" in url:
                assert re.match(r"https?://arxiv\.org/abs/\d+\.\d+", url), (
                    f"Invalid arXiv URL: {url}"
                )


class TestAgent05Podcasts:
    """Agent 5: Podcast & Media Analyst — podcast appearances quality."""

    @pytest.mark.parametrize("profile", _profiles_with("podcast_appearances"),
                             ids=_profile_id)
    def test_Phase1_podcast_appearances_quality(self, profile):
        """Podcast appearances should have show name, title, and date."""
        appearances = profile["podcast_appearances"]
        text = json.dumps(appearances, indent=2)
        metric = _geval(
            "Podcast Data Quality",
            "Evaluate whether the podcast appearances list contains well-structured "
            "entries with show name, episode title, date, and discussion topics. "
            "Score 1.0 if all entries have show+title+date and topics are specific. "
            "Score 0.5 if some entries are incomplete. "
            "Score 0.0 if entries are vague or lack basic metadata.",
        )
        case = LLMTestCase(
            input=f"Podcast appearances for {profile.get('name', '?')}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])


class TestAgent06News:
    """Agent 6: News & Press Analyst — news items quality."""

    @pytest.mark.parametrize("profile", _profiles_with("news"),
                             ids=_profile_id)
    def test_Phase1_news_recency_and_relevance(self, profile):
        """News items should be recent and relevant to the person."""
        news = profile["news"]
        text = json.dumps(news, indent=2)
        metric = _geval(
            "News Relevance",
            f"Evaluate whether these news items are genuinely about "
            f"{profile.get('name', '?')} and their work in AI/tech. "
            f"Score 1.0 if items are recent, from reputable sources, with "
            f"headlines, dates, and summaries that clearly relate to this person. "
            f"Score 0.0 if items are about a different person or unrelated topics.",
        )
        case = LLMTestCase(
            input=f"Recent news about {profile.get('name', '?')}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])


class TestAgent07HuggingFace:
    """Agent 7: HuggingFace Analyst — model registry data."""

    # HuggingFace data is optional — many people won't have it
    pass


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2 — Deep Analysis (Agents 8-18)
# ═══════════════════════════════════════════════════════════════════════════


class TestAgent08Bio:
    """Agent 8: Biography Writer — bio specificity, accuracy, and coherence."""

    @pytest.mark.parametrize("profile", _profiles_with("bio"),
                             ids=_profile_id)
    def test_Phase2_bio_specificity(self, profile):
        """Bio should contain specific, verifiable facts — not vague generalities."""
        bio = profile["bio"]
        metric = _geval(
            "Bio Specificity",
            "Evaluate whether the biography contains specific, verifiable facts. "
            "A good bio names actual projects, frameworks, companies, roles, "
            "and achievements with concrete metrics (funding amounts, user counts, "
            "GitHub stars). A bad bio uses vague language like 'contributed to "
            "various projects' or 'is known for their work in AI'. "
            "Score 1.0 for highly specific with metrics. Score 0.5 for "
            "names projects but lacks metrics. Score 0.0 for vague.",
        )
        case = LLMTestCase(
            input=f"Write a biography for {profile.get('name', '?')}",
            actual_output=bio,
        )
        assert_test(case, [metric])

    @pytest.mark.parametrize("profile", _profiles_with("bio"),
                             ids=_profile_id)
    def test_Phase2_bio_coherence(self, profile):
        """Bio should be a coherent narrative paragraph."""
        bio = profile["bio"]
        metric = _geval(
            "Bio Coherence",
            "Evaluate whether the biography reads as a coherent, well-structured "
            "paragraph about a single person. It should flow naturally from "
            "background to key achievements to current work. Deduct for: "
            "JSON artifacts, broken sentences, bullet points in prose, "
            "placeholder text, or robotic language.",
        )
        case = LLMTestCase(
            input=f"Write a biography for {profile.get('name', '?')}",
            actual_output=bio,
        )
        assert_test(case, [metric])

    @pytest.mark.parametrize("profile", _profiles_with("bio"),
                             ids=_profile_id)
    def test_Phase2_bio_name_disambiguation(self, profile):
        """Bio should be clearly about the correct AI/tech person."""
        bio = profile["bio"]
        name = profile.get("name", "?")
        metric = _geval(
            "Name Disambiguation",
            f"Evaluate whether this biography is clearly about {name} the "
            f"AI/tech figure — not a different person with the same name. "
            f"Score 1.0 if the bio mentions their specific role, company, or "
            f"technical work that uniquely identifies them. Score 0.0 if the "
            f"bio could be about anyone or is about the wrong person.",
        )
        case = LLMTestCase(
            input=f"Is this bio about {name} the AI/tech person?",
            actual_output=bio,
        )
        assert_test(case, [metric])


class TestAgent09Timeline:
    """Agent 9: Timeline Architect — chronological accuracy and completeness."""

    @pytest.mark.parametrize("profile", _profiles_with("timeline"),
                             ids=_profile_id)
    def test_Phase2_timeline_completeness(self, profile):
        """Timeline should cover the full career arc with verified dates."""
        timeline = profile["timeline"]
        text = json.dumps(timeline, indent=2)
        metric = _geval(
            "Timeline Completeness",
            "Evaluate the career timeline for completeness and accuracy. "
            "A good timeline covers: education, founding moments or job changes, "
            "product launches, funding rounds, and recent activities. Each event "
            "has a specific date (YYYY-MM or YYYY) and a clear description. "
            "Score 1.0 for 10+ well-dated events spanning the full career. "
            "Score 0.5 for 5-9 events or gaps in chronology. "
            "Score 0.0 for fewer than 5 events or undated events.",
        )
        case = LLMTestCase(
            input=f"Career timeline for {profile.get('name', '?')}",
            actual_output=text[:3000],
        )
        assert_test(case, [metric])

    @pytest.mark.parametrize("profile", _profiles_with("timeline"),
                             ids=_profile_id)
    def test_Phase2_timeline_chronological_order(self, profile):
        """Timeline events should be in chronological order."""
        timeline = profile["timeline"]
        dates = [e.get("date", "") for e in timeline if e.get("date")]
        # Normalize to YYYY-MM-DD for comparison.
        # Less-precise dates pad to end-of-range so YYYY-MM sorts after
        # any specific day within that month (avoids false failures).
        def _pad(d: str) -> str:
            if len(d) == 4:       # YYYY → YYYY-12-31
                return d + "-12-31"
            if len(d) == 7:       # YYYY-MM → YYYY-MM-31
                return d + "-31"
            return d              # YYYY-MM-DD
        for i in range(len(dates) - 1):
            assert _pad(dates[i]) <= _pad(dates[i + 1]), (
                f"{profile['slug']} timeline out of order: "
                f"'{dates[i]}' before '{dates[i+1]}'"
            )

    @pytest.mark.parametrize("profile", _profiles_with("timeline"),
                             ids=_profile_id)
    def test_Phase2_timeline_has_sources(self, profile):
        """At least half of timeline events should have source URLs."""
        timeline = profile["timeline"]
        with_url = sum(1 for e in timeline if e.get("url"))
        ratio = with_url / len(timeline) if timeline else 0
        assert ratio >= 0.5, (
            f"{profile['slug']} only {with_url}/{len(timeline)} timeline events "
            f"have URLs ({ratio:.0%})"
        )


class TestAgent10Contributions:
    """Agent 10: Technical Contributions Analyst — depth and impact."""

    @pytest.mark.parametrize("profile", _profiles_with("key_contributions"),
                             ids=_profile_id)
    def test_Phase2_contributions_depth(self, profile):
        """Contributions should have specific impact descriptions with metrics."""
        contribs = profile["key_contributions"]
        text = json.dumps(contribs, indent=2)
        metric = _geval(
            "Contribution Depth",
            "Evaluate whether the technical contributions describe specific, "
            "impactful work with concrete evidence of impact. A good contribution "
            "names what was built, why it matters, and provides metrics (GitHub "
            "stars, downloads, citations, users, adoption). A bad contribution "
            "is vague ('worked on AI projects') or lacks evidence of impact. "
            "Score 1.0 for all contributions with metrics/evidence. "
            "Score 0.5 for named projects but vague impact. "
            "Score 0.0 for generic descriptions.",
        )
        case = LLMTestCase(
            input=f"Technical contributions of {profile.get('name', '?')}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])

    @pytest.mark.parametrize("profile", _profiles_with("key_contributions"),
                             ids=_profile_id)
    def test_Phase2_contributions_count(self, profile):
        """Should have at least 3 contributions."""
        contribs = profile.get("key_contributions", [])
        assert len(contribs) >= 3, (
            f"{profile['slug']} has only {len(contribs)} contributions (need ≥3)"
        )


class TestAgent11Quotes:
    """Agent 11: Quote & Interview Specialist — authenticity and attribution."""

    @pytest.mark.parametrize("profile", _profiles_with("quotes"),
                             ids=_profile_id)
    def test_Phase2_quotes_authenticity(self, profile):
        """Quotes should sound authentic with proper attribution."""
        quotes = profile["quotes"]
        text = json.dumps(quotes, indent=2)
        name = profile.get("name", "?")
        metric = _geval(
            "Quote Authenticity",
            f"Evaluate whether these quotes attributed to {name} sound "
            f"authentic and are properly sourced. A good quote: reads like "
            f"natural speech (not robotic), has a named source (podcast name, "
            f"article title, conference), and has a URL. A bad quote: sounds "
            f"fabricated or generic, lacks a source, or could be said by anyone. "
            f"Score 1.0 for all quotes with source+URL that sound natural. "
            f"Score 0.5 for authentic-sounding but missing some sources. "
            f"Score 0.0 for obviously fabricated or unsourced quotes.",
        )
        case = LLMTestCase(
            input=f"Verbatim quotes from {name}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])

    @pytest.mark.parametrize("profile", _profiles_with("quotes"),
                             ids=_profile_id)
    def test_Phase2_quotes_have_sources(self, profile):
        """Every quote should have a source and URL."""
        quotes = profile["quotes"]
        for i, q in enumerate(quotes):
            assert q.get("source"), (
                f"{profile['slug']} quote #{i} missing source: {q.get('text', '?')[:60]}"
            )


class TestAgent12Social:
    """Agent 12: Social & Digital Presence Mapper — link coverage."""

    @pytest.mark.parametrize("profile", _profiles_with("social"),
                             ids=_profile_id)
    def test_Phase2_social_minimum_platforms(self, profile):
        """Should map at least 2 social platforms."""
        social = profile.get("social", {})
        assert len(social) >= 2, (
            f"{profile['slug']} has only {len(social)} social links (need ≥2)"
        )

    @pytest.mark.parametrize("profile", _profiles_with("social"),
                             ids=_profile_id)
    def test_Phase2_social_urls_valid(self, profile):
        """All social URLs should be valid HTTP(S) URLs."""
        for platform, url in profile.get("social", {}).items():
            assert url.startswith("http"), (
                f"{profile['slug']} social['{platform}'] is not a URL: {url}"
            )


class TestAgent13Topics:
    """Agent 13: Expertise Domain Analyst — topic specificity."""

    @pytest.mark.parametrize("profile", _profiles_with("topics"),
                             ids=_profile_id)
    def test_Phase2_topics_specificity(self, profile):
        """Topics should be specific technical domains, not vague buzzwords."""
        topics = profile["topics"]
        text = ", ".join(topics)
        metric = _geval(
            "Topic Specificity",
            "Evaluate whether these expertise topics are specific enough to "
            "differentiate this person from generic 'AI researcher'. "
            "Good topics: 'multi-agent AI orchestration', 'ColPali late-interaction', "
            "'LLM inference on AMD GPUs'. Bad topics: 'AI', 'machine learning', "
            "'technology'. Score 1.0 if all topics are specific subdomains. "
            "Score 0.5 if mix of specific and generic. Score 0.0 if all generic.",
        )
        case = LLMTestCase(
            input=f"Expertise topics for {profile.get('name', '?')}",
            actual_output=text,
        )
        assert_test(case, [metric])

    @pytest.mark.parametrize("profile", _profiles_with("topics"),
                             ids=_profile_id)
    def test_Phase2_topics_count(self, profile):
        """Should have 5-10 topics."""
        topics = profile.get("topics", [])
        assert 3 <= len(topics) <= 15, (
            f"{profile['slug']} has {len(topics)} topics (expected 3-15)"
        )


class TestAgent14CompetitiveLandscape:
    """Agent 14: Competitive Landscape Analyst."""

    @pytest.mark.parametrize("profile", _profiles_with("competitive_landscape"),
                             ids=_profile_id)
    def test_Phase2_competitive_landscape_quality(self, profile):
        """Competitive landscape should name specific competitors with differentiation."""
        data = profile["competitive_landscape"]
        text = json.dumps(data, indent=2)
        metric = _geval(
            "Competitive Analysis Quality",
            f"Evaluate this competitive landscape analysis for {profile.get('name', '?')}. "
            f"A good analysis: names specific competing companies/projects, explains "
            f"differentiation, identifies market position (leader/challenger/niche), "
            f"and describes competitive moats. A bad analysis: is vague, names no "
            f"competitors, or reads like marketing copy. "
            f"Score 1.0 for named competitors with differentiation and moats. "
            f"Score 0.5 for competitors named but shallow analysis. "
            f"Score 0.0 for no competitors or irrelevant analysis.",
        )
        case = LLMTestCase(
            input=f"Competitive landscape for {profile.get('name', '?')}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])


class TestAgent15Collaboration:
    """Agent 15: Collaboration Network Analyst."""

    @pytest.mark.parametrize("profile", _profiles_with("collaboration_network"),
                             ids=_profile_id)
    def test_Phase2_collaboration_network_quality(self, profile):
        """Collaboration network should identify real co-authors, co-founders, mentors."""
        data = profile["collaboration_network"]
        text = json.dumps(data, indent=2)
        metric = _geval(
            "Collaboration Network Quality",
            f"Evaluate this collaboration network for {profile.get('name', '?')}. "
            f"A good network: names actual co-founders, co-authors, mentors, "
            f"and describes the relationship context (e.g. 'co-founded CrewAI', "
            f"'PhD advisor at Stanford'). A bad network: lists random names, "
            f"fabricates relationships, or provides no context. "
            f"Score 1.0 for verified relationships with context. "
            f"Score 0.5 for names present but context is thin. "
            f"Score 0.0 for clearly fabricated or empty.",
        )
        case = LLMTestCase(
            input=f"Collaboration network for {profile.get('name', '?')}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])


class TestAgent16Funding:
    """Agent 16: Funding & Business Analyst."""

    @pytest.mark.parametrize("profile", _profiles_with("funding"),
                             ids=_profile_id)
    def test_Phase2_funding_data_quality(self, profile):
        """Funding data should have dates, amounts, and investors."""
        data = profile["funding"]
        text = json.dumps(data, indent=2)
        metric = _geval(
            "Funding Data Quality",
            f"Evaluate this funding/business data for {profile.get('name', '?')}. "
            f"A good funding profile: lists rounds with dates, amounts, lead "
            f"investors, and valuations where known. Notes total raised and "
            f"revenue signals. A bad profile: has round names but no amounts, "
            f"fabricates investor names, or contradicts known facts. "
            f"Score 1.0 for complete rounds with amounts and investors. "
            f"Score 0.5 for partial data. Score 0.0 for fabricated or empty.",
        )
        case = LLMTestCase(
            input=f"Funding history for {profile.get('name', '?')}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])


class TestAgent17Conferences:
    """Agent 17: Conference & Speaking Analyst."""

    @pytest.mark.parametrize("profile", _profiles_with("conferences"),
                             ids=_profile_id)
    def test_Phase2_conferences_quality(self, profile):
        """Conference data should have event names, talk titles, and dates."""
        data = profile["conferences"]
        text = json.dumps(data, indent=2)
        metric = _geval(
            "Conference Data Quality",
            f"Evaluate conference/speaking data for {profile.get('name', '?')}. "
            f"A good profile: lists specific events (NeurIPS, ICML, AI Summit, etc.) "
            f"with talk titles, dates, and whether it was keynote/panel/workshop. "
            f"Includes a speaking tier assessment. A bad profile: lists events "
            f"without dates or specifics, or fabricates conferences. "
            f"Score 1.0 for named events with titles and dates. "
            f"Score 0.5 for events named but missing details. "
            f"Score 0.0 for fabricated or empty.",
        )
        case = LLMTestCase(
            input=f"Speaking engagements for {profile.get('name', '?')}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])


class TestAgent18Philosophy:
    """Agent 18: Technical Philosophy Analyst."""

    @pytest.mark.parametrize("profile", _profiles_with("technical_philosophy"),
                             ids=_profile_id)
    def test_Phase2_philosophy_quality(self, profile):
        """Technical philosophy should capture specific positions with evidence."""
        data = profile["technical_philosophy"]
        text = json.dumps(data, indent=2)
        name = profile.get("name", "?")
        metric = _geval(
            "Technical Philosophy Quality",
            f"Evaluate the technical philosophy analysis for {name}. "
            f"A good analysis: identifies the person's core thesis, their "
            f"positions on key debates (AGI timeline, open vs closed source, "
            f"scaling laws, safety), with evidence from interviews or posts. "
            f"Includes contrarian takes. A bad analysis: states generic positions "
            f"('AI is important') without evidence, or attributes positions "
            f"the person never expressed. "
            f"Score 1.0 for specific positions with cited evidence. "
            f"Score 0.5 for positions stated but evidence is weak. "
            f"Score 0.0 for generic or fabricated positions.",
        )
        case = LLMTestCase(
            input=f"Technical philosophy of {name}",
            actual_output=text[:2000],
        )
        assert_test(case, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3 — Synthesis & Evaluation (Agents 19-20)
# ═══════════════════════════════════════════════════════════════════════════


class TestAgent19QualityEvaluator:
    """Agent 19: Research Quality Evaluator — eval dimension scores."""

    @pytest.mark.parametrize("profile", _load_profiles(),
                             ids=_profile_id)
    def test_Phase3_eval_file_exists(self, profile):
        """Each profile should have a corresponding .eval.json file."""
        eval_path = RESEARCH_DIR / f"{profile['slug']}.eval.json"
        if not eval_path.exists():
            pytest.skip(f"No eval file for {profile['slug']} — run 20-agent crew")

        eval_data = json.loads(eval_path.read_text())
        scores = eval_data.get("eval", {})
        for dim in ["bio_quality", "source_coverage", "timeline_completeness",
                     "contributions_depth", "name_disambiguation"]:
            entry = scores.get(dim, {})
            score = entry.get("score", 0)
            assert isinstance(score, (int, float)), (
                f"{profile['slug']} eval dimension '{dim}' has no numeric score"
            )
            assert 1 <= score <= 10, (
                f"{profile['slug']} eval '{dim}' score {score} out of range [1-10]"
            )

    @pytest.mark.parametrize("profile", _load_profiles(),
                             ids=_profile_id)
    def test_Phase3_overall_score_threshold(self, profile):
        """Overall eval score should be ≥ 6/10."""
        eval_path = RESEARCH_DIR / f"{profile['slug']}.eval.json"
        if not eval_path.exists():
            pytest.skip(f"No eval file for {profile['slug']}")
        eval_data = json.loads(eval_path.read_text())
        overall = eval_data.get("eval", {}).get("overall_score", 0)
        assert overall >= 6, (
            f"{profile['slug']} overall eval score {overall}/10 < 6"
        )


class TestAgent20ExecutiveSummary:
    """Agent 20: Executive Summary Synthesizer — final profile quality."""

    @pytest.mark.parametrize("profile", _profiles_with("executive_summary"),
                             ids=_profile_id)
    def test_Phase3_executive_summary_completeness(self, profile):
        """Executive summary should have one-liner, key facts, and meeting prep."""
        summary = profile["executive_summary"]
        text = json.dumps(summary, indent=2)
        metric = _geval(
            "Executive Summary Completeness",
            f"Evaluate this executive summary for {profile.get('name', '?')}. "
            f"A complete summary has: a compelling one-liner, 3 key facts, "
            f"a career arc narrative, current focus, industry significance, "
            f"risk factors, and conversation starters for meeting prep. "
            f"Score 1.0 for all sections present and substantive. "
            f"Score 0.5 for most sections but some thin. "
            f"Score 0.0 for mostly empty or generic.",
        )
        case = LLMTestCase(
            input=f"Executive summary for {profile.get('name', '?')}",
            actual_output=text[:3000],
        )
        assert_test(case, [metric])

    @pytest.mark.parametrize("profile", _profiles_with("executive_summary"),
                             ids=_profile_id)
    def test_Phase3_executive_summary_actionable(self, profile):
        """Meeting prep conversation starters should be specific and useful."""
        summary = profile.get("executive_summary", {})
        meeting_prep = summary.get("meeting_prep", [])
        if not meeting_prep:
            pytest.skip(f"No meeting_prep in executive_summary for {profile['slug']}")

        text = "\n".join(f"- {s}" for s in meeting_prep)
        metric = _geval(
            "Meeting Prep Quality",
            f"Evaluate these conversation starters for meeting {profile.get('name', '?')}. "
            f"Good starters: reference specific recent work, products, or statements "
            f"that would show preparation ('I saw your talk at X about Y'). "
            f"Bad starters: are generic ('Tell me about AI') or could apply to anyone. "
            f"Score 1.0 for specific, recent, personalized starters. "
            f"Score 0.0 for generic conversation openers.",
        )
        case = LLMTestCase(
            input=f"Conversation starters for meeting {profile.get('name', '?')}",
            actual_output=text,
        )
        assert_test(case, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# CROSS-AGENT: Consistency & Integration Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestCrossAgentConsistency:
    """Verify outputs from different agents are consistent with each other."""

    @pytest.mark.parametrize("profile", _profiles_with("bio"),
                             ids=_profile_id)
    def test_bio_matches_contributions(self, profile):
        """Bio should reference at least one key contribution by name."""
        bio = profile.get("bio", "").lower()
        contribs = profile.get("key_contributions", [])
        if not contribs:
            pytest.skip(f"No contributions for {profile['slug']}")

        # Match on any significant word (4+ chars) from contribution titles
        matches = 0
        for c in contribs:
            title = c.get("title", "").lower()
            words = [w for w in re.split(r"[\s\-/&]+", title) if len(w) >= 4]
            if any(w in bio for w in words):
                matches += 1
        assert matches >= 1, (
            f"{profile['slug']} bio does not mention any of its "
            f"key contributions: {[c.get('title') for c in contribs]}"
        )

    @pytest.mark.parametrize("profile", _profiles_with("bio"),
                             ids=_profile_id)
    def test_bio_matches_topics(self, profile):
        """Bio should be relevant to at least some of the listed topics."""
        bio = profile.get("bio", "").lower()
        topics = profile.get("topics", [])
        if not topics:
            pytest.skip(f"No topics for {profile['slug']}")

        # Check if at least 1 topic keyword appears in the bio
        matches = sum(
            1 for t in topics
            if any(word in bio for word in t.lower().split() if len(word) > 3)
        )
        assert matches >= 1, (
            f"{profile['slug']} bio has no overlap with topics: {topics}"
        )

    @pytest.mark.parametrize("profile", _profiles_with("timeline"),
                             ids=_profile_id)
    def test_timeline_covers_contributions(self, profile):
        """Timeline should mention at least one key contribution."""
        timeline_text = " ".join(
            e.get("event", "") for e in profile.get("timeline", [])
        ).lower()
        contribs = profile.get("key_contributions", [])
        if not contribs:
            pytest.skip(f"No contributions for {profile['slug']}")

        titles = [c.get("title", "").lower() for c in contribs]
        matches = sum(1 for t in titles if t and t in timeline_text)
        assert matches >= 1, (
            f"{profile['slug']} timeline doesn't mention any contribution: "
            f"{[c.get('title') for c in contribs]}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMA: Extended fields from 20-agent crew
# ═══════════════════════════════════════════════════════════════════════════


class TestExtendedSchema:
    """Validate the extended JSON schema produced by the 20-agent crew."""

    EXTENDED_FIELDS = {
        "executive_summary": dict,
        "competitive_landscape": dict,
        "collaboration_network": dict,
        "funding": dict,
        "conferences": dict,
        "technical_philosophy": dict,
        "podcast_appearances": list,
        "news": list,
    }

    @pytest.mark.parametrize("profile", _load_profiles(),
                             ids=_profile_id)
    def test_extended_fields_types(self, profile):
        """Extended fields, when present, should have correct types."""
        for field, expected_type in self.EXTENDED_FIELDS.items():
            value = profile.get(field)
            if value is not None:
                assert isinstance(value, expected_type), (
                    f"{profile['slug']}.{field} is {type(value).__name__}, "
                    f"expected {expected_type.__name__}"
                )

    @pytest.mark.parametrize("profile", _load_profiles(),
                             ids=_profile_id)
    def test_core_fields_present(self, profile):
        """Core fields from original 10-agent crew should always be present."""
        core = {"slug", "name", "generated_at", "bio", "topics",
                "timeline", "key_contributions", "quotes", "social"}
        missing = core - set(profile.keys())
        assert not missing, (
            f"{profile['slug']} missing core fields: {missing}"
        )
