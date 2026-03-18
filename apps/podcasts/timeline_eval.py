"""
timeline_eval.py
────────────────
Evals for the LangChain timeline enrichment pipeline.

Run:
    python timeline_enrichment.py eval
    pytest timeline_eval.py -v
    pytest timeline_eval.py -v -k "test_sort"
"""

from __future__ import annotations

import pytest
import asyncio
from timeline_enrichment import (
    PipelineInput,
    TimelineEvent,
    enrich_timeline,
    merge_and_sort,
    _build_github_events,
    _build_hf_events,
    _search_person_image,
    MIN_STARS_FOR_TIMELINE,
    load_personality,
    load_research,
    enrich_person_timeline,
)


# ─── Fixtures ──────────────────────────────────────────────

MOCK_RESEARCH_TIMELINE = [
    {"date": "2026-03-15", "event": "Published blog post on optimization", "url": "https://example.com/blog"},
    {"date": "2025-12-02", "event": "Published arXiv paper on retrieval", "url": "https://arxiv.org/abs/2512.02660"},
    {"date": "2025-09-01", "event": "Released vision RAG system", "url": "https://example.com/rag"},
]

MOCK_PAPERS = [
    {"title": "Spatially-Grounded Document Retrieval", "arxiv": "2512.02660", "date": "2025-12-02"},
    {"title": "Architecture-Aware LLM Inference", "arxiv": "2603.10031", "date": "2026-02-27"},
]

MOCK_GITHUB_REPOS = [
    {
        "name": "Snappy",
        "description": "Vision-language retrieval system",
        "url": "https://github.com/user/Snappy",
        "stars": 83,
        "created_at": "2025-08-15T00:00:00Z",
    },
    {
        "name": "tiny-project",
        "description": "A small utility",
        "url": "https://github.com/user/tiny-project",
        "stars": 1,
        "created_at": "2025-06-01T00:00:00Z",
    },
]

MOCK_HF_MODELS = [
    {
        "id": "user/colqwen3.5-4.5B-v3",
        "likes": 5,
        "downloads": 1200,
        "pipeline_tag": "image-text-to-text",
        "created_at": "2026-03-10T12:00:00Z",
        "last_modified": "2026-03-12T00:00:00Z",
    },
    {
        "id": "user/dateless-model",
        "likes": 0,
        "downloads": 50,
        "pipeline_tag": None,
        "created_at": None,
        "last_modified": None,
    },
]

MOCK_INPUT = PipelineInput(
    slug="test-person",
    name="Test Person",
    org="Test Org",
    github_username="testuser",
    hf_username="testuser",
    research_timeline=MOCK_RESEARCH_TIMELINE,
    papers=MOCK_PAPERS,
)


# ─── Unit evals: merge_and_sort ────────────────────────────

class TestMergeAndSort:
    """Eval the core merge-and-sort logic."""

    def test_sorts_newest_first(self):
        events = merge_and_sort({
            "research": [
                TimelineEvent(date="2024-01-01", event="old", url="https://a.com", source="research"),
                TimelineEvent(date="2026-03-15", event="new", url="https://b.com", source="research"),
            ],
            "github": [],
            "papers": [],
            "huggingface": [],
        })
        assert events[0]["date"] >= events[-1]["date"]
        assert events[0]["date"] == "2026-03-15"

    def test_deduplicates_by_date_and_url(self):
        dup_url = "https://arxiv.org/abs/2512.02660"
        events = merge_and_sort({
            "research": [
                TimelineEvent(date="2025-12-02", event="From research", url=dup_url, source="research"),
            ],
            "papers": [
                TimelineEvent(date="2025-12-02", event="From papers", url=dup_url, source="paper"),
            ],
            "github": [],
            "huggingface": [],
        })
        matching = [e for e in events if e["url"] == dup_url]
        assert len(matching) == 1
        # Research takes priority (comes first in merge order)
        assert matching[0]["source"] == "research"

    def test_preserves_all_unique_events(self):
        events = merge_and_sort({
            "research": [
                TimelineEvent(date="2026-01-01", event="A", url="https://a.com", source="research"),
            ],
            "github": [
                TimelineEvent(date="2025-06-01", event="B", url="https://b.com", source="github"),
            ],
            "papers": [
                TimelineEvent(date="2025-12-02", event="C", url="https://c.com", source="paper"),
            ],
            "huggingface": [
                TimelineEvent(date="2026-03-10", event="D", url="https://d.com", source="huggingface"),
            ],
        })
        assert len(events) == 4
        sources = {e["source"] for e in events}
        assert sources == {"research", "github", "paper", "huggingface"}

    def test_empty_input(self):
        events = merge_and_sort({
            "research": [],
            "github": [],
            "papers": [],
            "huggingface": [],
        })
        assert events == []

    def test_event_schema(self):
        events = merge_and_sort({
            "research": [
                TimelineEvent(date="2026-01-01", event="Test", url="https://x.com", source="research"),
            ],
            "github": [],
            "papers": [],
            "huggingface": [],
        })
        for e in events:
            assert "date" in e
            assert "event" in e
            assert "url" in e
            assert "source" in e
            assert e["source"] in ("research", "github", "paper", "huggingface")


# ─── Unit evals: event builders ────────────────────────────

class TestGitHubEventBuilder:
    """Eval GitHub event generation."""

    def test_filters_low_star_repos(self):
        events = _build_github_events((MOCK_INPUT, MOCK_GITHUB_REPOS))
        repo_names = [e["event"] for e in events]
        assert any("Snappy" in name for name in repo_names)
        assert not any("tiny-project" in name for name in repo_names)

    def test_star_threshold(self):
        repos = [
            {"name": "edge-case", "description": "", "url": "https://gh.com/r",
             "stars": MIN_STARS_FOR_TIMELINE, "created_at": "2025-01-01T00:00:00Z"},
            {"name": "below", "description": "", "url": "https://gh.com/r2",
             "stars": MIN_STARS_FOR_TIMELINE - 1, "created_at": "2025-01-01T00:00:00Z"},
        ]
        events = _build_github_events((MOCK_INPUT, repos))
        assert len(events) == 1
        assert "edge-case" in events[0]["event"]

    def test_date_format(self):
        events = _build_github_events((MOCK_INPUT, MOCK_GITHUB_REPOS))
        for e in events:
            assert len(e["date"]) == 10  # YYYY-MM-DD
            assert e["date"].count("-") == 2

    def test_source_is_github(self):
        events = _build_github_events((MOCK_INPUT, MOCK_GITHUB_REPOS))
        for e in events:
            assert e["source"] == "github"

    def test_empty_repos(self):
        assert _build_github_events((MOCK_INPUT, [])) == []


class TestHFEventBuilder:
    """Eval Hugging Face event generation."""

    def test_includes_models_with_dates(self):
        events = _build_hf_events((MOCK_INPUT, MOCK_HF_MODELS))
        assert len(events) == 1
        assert "colqwen3.5" in events[0]["event"]

    def test_excludes_dateless_models(self):
        events = _build_hf_events((MOCK_INPUT, MOCK_HF_MODELS))
        assert not any("dateless" in e["event"] for e in events)

    def test_source_is_huggingface(self):
        events = _build_hf_events((MOCK_INPUT, MOCK_HF_MODELS))
        for e in events:
            assert e["source"] == "huggingface"

    def test_url_format(self):
        events = _build_hf_events((MOCK_INPUT, MOCK_HF_MODELS))
        for e in events:
            assert e["url"].startswith("https://huggingface.co/")

    def test_empty_models(self):
        assert _build_hf_events((MOCK_INPUT, [])) == []


# ─── Integration evals: full pipeline ──────────────────────

class TestFullPipeline:
    """Integration evals that run the full LCEL pipeline (requires network)."""

    @pytest.mark.asyncio
    async def test_pipeline_with_mock_data(self):
        """Test pipeline with a local-only input (no GitHub/HF username → no fetch)."""
        inp = PipelineInput(
            slug="test",
            name="Test",
            org="Test",
            github_username=None,
            hf_username=None,
            research_timeline=MOCK_RESEARCH_TIMELINE,
            papers=MOCK_PAPERS,
        )
        events = await enrich_timeline.ainvoke(inp)

        # Should have research + paper events (minus deduped overlap)
        assert len(events) >= len(MOCK_RESEARCH_TIMELINE)
        assert all(e["source"] in ("research", "paper") for e in events)

        # The paper "2512.02660" duplicates a research event → deduped
        urls = [e["url"] for e in events]
        arxiv_urls = [u for u in urls if "2512.02660" in u]
        assert len(arxiv_urls) == 1  # deduped

    @pytest.mark.asyncio
    async def test_pipeline_all_empty(self):
        inp = PipelineInput(
            slug="empty",
            name="",
            org="",
            github_username=None,
            hf_username=None,
            research_timeline=[],
            papers=[],
        )
        events = await enrich_timeline.ainvoke(inp)
        assert events == []

    @pytest.mark.asyncio
    async def test_pipeline_papers_only(self):
        inp = PipelineInput(
            slug="papers-only",
            name="",
            org="",
            github_username=None,
            hf_username=None,
            research_timeline=[],
            papers=MOCK_PAPERS,
        )
        events = await enrich_timeline.ainvoke(inp)
        assert len(events) == len(MOCK_PAPERS)
        assert all(e["source"] == "paper" for e in events)

    @pytest.mark.asyncio
    async def test_sort_invariant(self):
        """All pipeline outputs must be sorted newest-first."""
        inp = PipelineInput(
            slug="sort-test",
            name="",
            org="",
            github_username=None,
            hf_username=None,
            research_timeline=MOCK_RESEARCH_TIMELINE,
            papers=MOCK_PAPERS,
        )
        events = await enrich_timeline.ainvoke(inp)
        dates = [e["date"] for e in events]
        assert dates == sorted(dates, reverse=True)


# ─── Data evals: real person (athos-georgiou) ─────────────

class TestAthosGeorgiouData:
    """Eval that loaded data for athos-georgiou is well-formed."""

    def test_personality_loads(self):
        p = load_personality("athos-georgiou")
        assert p is not None
        assert p["github"] == "athrael-soju"
        assert len(p["papers"]) >= 2

    def test_research_loads(self):
        r = load_research("athos-georgiou")
        assert r is not None
        assert len(r["timeline"]) >= 5
        assert r["social"]["github"] == "https://github.com/athrael-soju"

    def test_research_timeline_sorted(self):
        r = load_research("athos-georgiou")
        assert r is not None
        dates = [e["date"] for e in r["timeline"]]
        assert dates == sorted(dates, reverse=True), "Research timeline should be pre-sorted newest first"

    @pytest.mark.asyncio
    @pytest.mark.network
    async def test_live_enrichment(self):
        """Full pipeline with live API calls (skip with -m 'not network')."""
        events = await enrich_person_timeline("athos-georgiou")
        assert len(events) >= 10

        sources = {e["source"] for e in events}
        assert "research" in sources

        # Verify sorted
        dates = [e["date"] for e in events]
        assert dates == sorted(dates, reverse=True)

        # Verify no duplicate date+url pairs
        keys = [f'{e["date"]}|{e["url"]}' for e in events]
        assert len(keys) == len(set(keys)), "Duplicate events found"


# ─── Image search evals ───────────────────────────────────

class TestImageSearch:
    """Eval the LangChain image search pipeline."""

    def test_personality_has_name(self):
        p = load_personality("athos-georgiou")
        assert p is not None
        assert p["name"] == "Athos Georgiou"
        assert p["org"] == "NCA"

    @pytest.mark.asyncio
    @pytest.mark.network
    async def test_image_search_returns_url(self):
        """Image search should return a valid URL for a known person."""
        inp = PipelineInput(
            slug="test",
            name="Athos Georgiou",
            org="NCA",
            github_username="athrael-soju",
            hf_username=None,
            research_timeline=[],
            papers=[],
        )
        result = await _search_person_image(inp)
        assert result is not None
        assert result.startswith("http")

    @pytest.mark.asyncio
    async def test_image_search_empty_name(self):
        """Image search with empty name returns None."""
        inp = PipelineInput(
            slug="test",
            name="",
            org="",
            github_username=None,
            hf_username=None,
            research_timeline=[],
            papers=[],
        )
        result = await _search_person_image(inp)
        assert result is None
