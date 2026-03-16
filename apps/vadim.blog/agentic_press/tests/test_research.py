"""Tests for research utilities — dedup, scoring, search, and synthesis."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest
import respx

from agentic_press.papers import PaperSource, ResearchPaper
from agentic_press.research import (
    CURRENT_YEAR,
    ResearchConfig,
    _expand_query,
    _score_paper,
    deduplicate_and_rank,
    format_paper_digest,
    research_phase,
    search_papers,
)


def _make_paper(
    title: str,
    citations: int | None = None,
    authors: list[str] | None = None,
    year: int | None = 2024,
    doi: str | None = None,
) -> ResearchPaper:
    return ResearchPaper(
        title=title,
        authors=authors or [],
        year=year,
        citation_count=citations,
        abstract_text=f"Abstract for {title}",
        doi=doi,
        source=PaperSource.SEMANTIC_SCHOLAR,
    )


def test_dedup_removes_duplicate_titles():
    papers = [
        _make_paper("Paper A", 10, ["Alice"]),
        _make_paper("Paper A", 5, ["Bob"]),
        _make_paper("Paper B", 3, ["Charlie"]),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert len(result) == 2


def test_dedup_removes_empty_titles():
    papers = [
        _make_paper("", 100, ["Alice"]),
        _make_paper("  ", 50, ["Bob"]),
        _make_paper("Real Paper", 10, ["Charlie"]),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert len(result) == 1
    assert result[0].title == "Real Paper"


def test_dedup_sorts_by_citations_desc():
    papers = [
        _make_paper("Low", 1, ["A"]),
        _make_paper("High", 100, ["B"]),
        _make_paper("Mid", 50, ["C"]),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert result[0].title == "High"
    assert result[1].title == "Mid"
    assert result[2].title == "Low"


def test_dedup_truncates_to_limit():
    papers = [
        _make_paper(f"Paper {i}", i) for i in range(20)
    ]
    result = deduplicate_and_rank(papers, 5)
    assert len(result) == 5
    assert result[0].citation_count == 19


def test_format_digest_empty_papers():
    assert format_paper_digest([]) == ""


def test_format_digest_includes_authors_and_citations():
    papers = [_make_paper("Test Paper", 42, ["Alice", "Bob"])]
    digest = format_paper_digest(papers)
    assert "Test Paper" in digest
    assert "Alice, Bob" in digest
    assert "42" in digest
    assert "## Academic Papers Found" in digest


def test_format_digest_truncates_long_abstracts():
    paper = _make_paper("Long Abstract Paper", 1, ["Author"])
    paper.abstract_text = "x" * 500
    digest = format_paper_digest([paper])
    assert "…" in digest
    assert "x" * 500 not in digest


def test_dedup_case_insensitive():
    papers = [
        _make_paper("Attention Is All You Need", 50000, ["Vaswani"]),
        _make_paper("attention is all you need", 100, ["Imposter"]),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert len(result) == 1


def test_dedup_none_citations_treated_as_zero():
    papers = [
        _make_paper("No Cites", None, ["A"]),
        _make_paper("Some Cites", 5, ["B"]),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert result[0].title == "Some Cites"
    assert result[1].title == "No Cites"


def test_dedup_empty_input():
    assert deduplicate_and_rank([], 10) == []


def test_dedup_limit_zero():
    papers = [_make_paper("A", 1, ["X"])]
    assert deduplicate_and_rank(papers, 0) == []


def test_format_digest_no_abstract():
    paper = _make_paper("No Abstract", 10, ["Author"])
    paper.abstract_text = None
    digest = format_paper_digest([paper])
    assert "No Abstract" in digest
    assert "Abstract:" not in digest


def test_format_digest_unknown_authors():
    paper = _make_paper("Solo Paper", 5)
    digest = format_paper_digest([paper])
    assert "Unknown" in digest


def test_format_digest_year_and_source():
    paper = _make_paper("Yearly Paper", 1, ["Author"])
    digest = format_paper_digest([paper])
    assert "2024" in digest
    assert "SemanticScholar" in digest


def test_format_digest_numbering():
    papers = [
        _make_paper("First", 10, ["A"]),
        _make_paper("Second", 5, ["B"]),
        _make_paper("Third", 1, ["C"]),
    ]
    digest = format_paper_digest(papers)
    assert "### 1." in digest
    assert "### 2." in digest
    assert "### 3." in digest


def test_dedup_preserves_first_occurrence():
    papers = [
        _make_paper("Duplicate", 10, ["First Author"]),
        _make_paper("Duplicate", 99, ["Second Author"]),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert len(result) == 1
    assert result[0].authors == ["First Author"]


# ── DOI-based dedup tests ───────────────────────────────────────────────────


def test_dedup_by_doi():
    """Same DOI with slightly different titles should dedup."""
    papers = [
        _make_paper("Paper v1", 50, doi="10.1234/abc"),
        _make_paper("Paper version 1", 30, doi="10.1234/abc"),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert len(result) == 1
    assert result[0].title == "Paper v1"


def test_dedup_doi_different_titles_same_doi():
    papers = [
        _make_paper("Title A", 10, doi="10.9999/same"),
        _make_paper("Completely Different Title", 100, doi="10.9999/same"),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert len(result) == 1


def test_dedup_no_doi_falls_back_to_title():
    papers = [
        _make_paper("Same Title", 10),
        _make_paper("Same Title", 20),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert len(result) == 1


def test_dedup_different_doi_different_title():
    papers = [
        _make_paper("Paper A", 10, doi="10.1111/a"),
        _make_paper("Paper B", 20, doi="10.2222/b"),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert len(result) == 2


# ── scoring / recency tests ─────────────────────────────────────────────────


def test_score_recent_paper_boosted():
    recent = _make_paper("Recent", 10, year=CURRENT_YEAR)
    old = _make_paper("Old", 10, year=2015)
    assert _score_paper(recent) > _score_paper(old)


def test_score_no_year_no_boost():
    paper = _make_paper("No Year", 10, year=None)
    assert _score_paper(paper) == 10.0


def test_score_high_citations_beats_recency():
    """A highly cited old paper should still outrank a low-cited new paper."""
    old_classic = _make_paper("Classic", 500, year=2015)
    recent_new = _make_paper("New", 5, year=CURRENT_YEAR)
    assert _score_paper(old_classic) > _score_paper(recent_new)


def test_dedup_ranks_by_combined_score():
    """Recent paper with moderate citations should beat old paper with same cites."""
    papers = [
        _make_paper("Old", 30, year=2015),
        _make_paper("Recent", 30, year=CURRENT_YEAR),
    ]
    result = deduplicate_and_rank(papers, 10)
    assert result[0].title == "Recent"


# ── query expansion tests ───────────────────────────────────────────────────


def test_expand_short_query_no_expansion():
    queries = _expand_query("LLM agents")
    assert queries == ["LLM agents"]


def test_expand_long_query_adds_variant():
    queries = _expand_query("LLM as judge evaluation benchmarks and pitfalls")
    assert len(queries) == 2
    assert queries[0] == "LLM as judge evaluation benchmarks and pitfalls"
    assert queries[1] == "LLM as judge evaluation"


def test_expand_exact_five_words_adds_variant():
    queries = _expand_query("one two three four five")
    assert len(queries) == 2


def test_expand_four_words_no_variant():
    queries = _expand_query("one two three four")
    assert len(queries) == 1


# ── search_papers integration (mocked HTTP) ─────────────────────────────────


@pytest.mark.asyncio
@respx.mock
async def test_search_papers_aggregates_and_deduplicates():
    # Mock all 4 APIs — return 1 paper each, 2 with same title
    respx.get("https://api.semanticscholar.org/graph/v1/paper/search/bulk").mock(
        return_value=httpx.Response(200, json={
            "data": [{"paperId": "s1", "title": "Shared Paper", "authors": [],
                       "year": 2024, "citationCount": 50}],
        })
    )
    respx.get("https://api.openalex.org/works").mock(
        return_value=httpx.Response(200, json={
            "results": [{"id": "W1", "title": "Shared Paper",
                         "authorships": [], "publication_year": 2024,
                         "cited_by_count": 50}],
        })
    )
    respx.get("https://api.crossref.org/works").mock(
        return_value=httpx.Response(200, json={
            "message": {"items": [{"DOI": "10.1234/cr", "title": ["Crossref Only"],
                                    "is-referenced-by-count": 30}]},
        })
    )
    respx.get("https://api.core.ac.uk/v3/search/works").mock(
        return_value=httpx.Response(200, json={
            "results": [{"id": 1, "title": "Core Only", "authors": [],
                          "yearPublished": 2023, "citationCount": 10}],
        })
    )

    papers, digest = await search_papers("test")
    # "Shared Paper" appears in Scholar+OpenAlex but deduped to 1
    assert len(papers) == 3
    titles = {p.title for p in papers}
    assert "Shared Paper" in titles
    assert "Crossref Only" in titles
    assert "Core Only" in titles
    assert "## Academic Papers Found" in digest


@pytest.mark.asyncio
@respx.mock
async def test_search_papers_all_fail_returns_empty():
    respx.get("https://api.semanticscholar.org/graph/v1/paper/search/bulk").mock(
        return_value=httpx.Response(500, text="Error")
    )
    respx.get("https://api.openalex.org/works").mock(
        return_value=httpx.Response(500, text="Error")
    )
    respx.get("https://api.crossref.org/works").mock(
        return_value=httpx.Response(500, text="Error")
    )
    respx.get("https://api.core.ac.uk/v3/search/works").mock(
        return_value=httpx.Response(500, text="Error")
    )

    papers, digest = await search_papers("failing query")
    assert papers == []
    assert digest == ""


# ── research_phase integration (mocked agent + papers) ──────────────────────


@pytest.mark.asyncio
@respx.mock
async def test_research_phase_with_paper_search():
    # Mock all 4 APIs with minimal data
    respx.get("https://api.semanticscholar.org/graph/v1/paper/search/bulk").mock(
        return_value=httpx.Response(200, json={
            "data": [{"paperId": "s1", "title": "Found Paper", "authors": [],
                       "year": 2024, "citationCount": 20}],
        })
    )
    respx.get("https://api.openalex.org/works").mock(
        return_value=httpx.Response(200, json={"results": []})
    )
    respx.get("https://api.crossref.org/works").mock(
        return_value=httpx.Response(200, json={"message": {"items": []}})
    )
    respx.get("https://api.core.ac.uk/v3/search/works").mock(
        return_value=httpx.Response(200, json={"results": []})
    )

    # Mock the LLM call
    mock_model = AsyncMock()
    mock_model.ainvoke.return_value = type(
        "Msg", (), {"content": "## Research notes\nSynthesized findings."}
    )()

    config = ResearchConfig(enable_paper_search=True)
    result = await research_phase("test topic", "angle", "niche", config, mock_model)

    assert result.paper_count == 1
    assert len(result.papers) == 1
    assert result.papers[0].title == "Found Paper"
    assert "Research notes" in result.notes


@pytest.mark.asyncio
async def test_research_phase_without_paper_search():
    mock_model = AsyncMock()
    mock_model.ainvoke.return_value = type(
        "Msg", (), {"content": "## Research notes\nDirect synthesis."}
    )()

    config = ResearchConfig(enable_paper_search=False)
    result = await research_phase("topic", "angle", "niche", config, mock_model)

    assert result.paper_count == 0
    assert result.papers == []
    assert "Research notes" in result.notes
