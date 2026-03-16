"""Tests for paper API clients — _to_paper conversion and mocked HTTP calls."""

from __future__ import annotations

import httpx
import pytest
import respx

from agentic_press.papers import PaperSource, ResearchPaper, retry_async
from agentic_press.papers.core_api import CoreClient
from agentic_press.papers.crossref import CrossrefClient
from agentic_press.papers.openalex import OpenAlexClient
from agentic_press.papers.semantic_scholar import SemanticScholarClient


# ── retry_async tests ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_retry_succeeds_on_first_attempt():
    calls = []

    @retry_async(max_attempts=3, base_delay=0.0)
    async def fn():
        calls.append(1)
        return "ok"

    result = await fn()
    assert result == "ok"
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_retry_succeeds_on_second_attempt():
    calls = []

    @retry_async(max_attempts=3, base_delay=0.0)
    async def fn():
        calls.append(1)
        if len(calls) < 2:
            raise RuntimeError("transient")
        return "ok"

    result = await fn()
    assert result == "ok"
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_retry_uses_fallback_on_exhaustion():
    calls = []

    @retry_async(max_attempts=2, base_delay=0.0, fallback=list)
    async def fn():
        calls.append(1)
        raise RuntimeError("persistent")

    result = await fn()
    assert result == []
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_retry_raises_without_fallback():
    @retry_async(max_attempts=2, base_delay=0.0)
    async def fn():
        raise ValueError("boom")

    with pytest.raises(ValueError, match="boom"):
        await fn()


# ── Semantic Scholar ─────────────────────────────────────────────────────────


class TestSemanticScholarToPaper:
    def test_full_record(self):
        raw = {
            "paperId": "abc123",
            "title": "Attention Is All You Need",
            "authors": [{"name": "Ashish Vaswani"}, {"name": "Noam Shazeer"}],
            "year": 2017,
            "citationCount": 90000,
            "abstract": "The dominant sequence transduction models...",
            "externalIds": {"DOI": "10.5555/3295222.3295349"},
            "openAccessPdf": {"url": "https://arxiv.org/pdf/1706.03762"},
            "s2FieldsOfStudy": [{"category": "Computer Science"}],
        }
        paper = SemanticScholarClient._to_paper(raw)
        assert paper.title == "Attention Is All You Need"
        assert paper.authors == ["Ashish Vaswani", "Noam Shazeer"]
        assert paper.year == 2017
        assert paper.citation_count == 90000
        assert paper.doi == "10.5555/3295222.3295349"
        assert paper.source == PaperSource.SEMANTIC_SCHOLAR
        assert paper.source_id == "abc123"
        assert paper.pdf_url == "https://arxiv.org/pdf/1706.03762"
        assert paper.fields_of_study == ["Computer Science"]

    def test_minimal_record(self):
        raw = {"title": "Untitled", "paperId": ""}
        paper = SemanticScholarClient._to_paper(raw)
        assert paper.title == "Untitled"
        assert paper.authors == []
        assert paper.year is None
        assert paper.doi is None
        assert paper.pdf_url is None

    def test_missing_external_ids(self):
        raw = {"title": "No IDs", "externalIds": None}
        paper = SemanticScholarClient._to_paper(raw)
        assert paper.doi is None


@pytest.mark.asyncio
@respx.mock
async def test_semantic_scholar_search_success():
    respx.get("https://api.semanticscholar.org/graph/v1/paper/search/bulk").mock(
        return_value=httpx.Response(
            200,
            json={
                "data": [
                    {
                        "paperId": "p1",
                        "title": "Test Paper",
                        "authors": [{"name": "Author A"}],
                        "year": 2023,
                        "citationCount": 42,
                    }
                ]
            },
        )
    )
    client = SemanticScholarClient()
    papers = await client.search_bulk("test query")
    assert len(papers) == 1
    assert papers[0].title == "Test Paper"
    assert papers[0].citation_count == 42


@pytest.mark.asyncio
@respx.mock
async def test_semantic_scholar_search_empty():
    respx.get("https://api.semanticscholar.org/graph/v1/paper/search/bulk").mock(
        return_value=httpx.Response(200, json={"data": []})
    )
    client = SemanticScholarClient()
    papers = await client.search_bulk("obscure query")
    assert papers == []


@pytest.mark.asyncio
@respx.mock
async def test_semantic_scholar_search_http_error_returns_empty():
    respx.get("https://api.semanticscholar.org/graph/v1/paper/search/bulk").mock(
        return_value=httpx.Response(429, text="Rate limited")
    )
    client = SemanticScholarClient()
    # retry exhausts, fallback returns []
    papers = await client.search_bulk("rate limited query")
    assert papers == []


# ── OpenAlex ─────────────────────────────────────────────────────────────────


class TestOpenAlexToPaper:
    def test_full_record(self):
        raw = {
            "id": "https://openalex.org/W123",
            "title": "BERT: Pre-training of Deep Bidirectional Transformers",
            "authorships": [
                {"author": {"display_name": "Jacob Devlin"}},
                {"author": {"display_name": "Ming-Wei Chang"}},
            ],
            "publication_year": 2019,
            "cited_by_count": 50000,
            "abstract_inverted_index": {"The": [0], "model": [1], "works": [2]},
            "doi": "10.18653/v1/N19-1423",
        }
        paper = OpenAlexClient._to_paper(raw)
        assert paper.title == "BERT: Pre-training of Deep Bidirectional Transformers"
        assert paper.authors == ["Jacob Devlin", "Ming-Wei Chang"]
        assert paper.year == 2019
        assert paper.citation_count == 50000
        assert paper.abstract_text == "The model works"
        assert paper.source == PaperSource.OPENALEX

    def test_no_abstract_index(self):
        raw = {"title": "No Abstract", "abstract_inverted_index": None}
        paper = OpenAlexClient._to_paper(raw)
        assert paper.abstract_text is None

    def test_empty_authorships(self):
        raw = {"title": "Solo", "authorships": []}
        paper = OpenAlexClient._to_paper(raw)
        assert paper.authors == []


@pytest.mark.asyncio
@respx.mock
async def test_openalex_search_success():
    respx.get("https://api.openalex.org/works").mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "id": "W1",
                        "title": "OpenAlex Paper",
                        "authorships": [{"author": {"display_name": "Auth"}}],
                        "publication_year": 2024,
                        "cited_by_count": 10,
                    }
                ]
            },
        )
    )
    client = OpenAlexClient()
    papers = await client.search("test")
    assert len(papers) == 1
    assert papers[0].source == PaperSource.OPENALEX


@pytest.mark.asyncio
@respx.mock
async def test_openalex_search_http_error_returns_empty():
    respx.get("https://api.openalex.org/works").mock(
        return_value=httpx.Response(500, text="Server Error")
    )
    client = OpenAlexClient()
    papers = await client.search("broken")
    assert papers == []


# ── Crossref ─────────────────────────────────────────────────────────────────


class TestCrossrefToPaper:
    def test_full_record(self):
        raw = {
            "DOI": "10.1234/test",
            "URL": "https://doi.org/10.1234/test",
            "title": ["Crossref Paper Title"],
            "author": [
                {"given": "Jane", "family": "Doe"},
                {"given": "John", "family": "Smith"},
            ],
            "published-print": {"date-parts": [[2022, 6]]},
            "is-referenced-by-count": 300,
            "abstract": "This paper explores...",
        }
        paper = CrossrefClient._to_paper(raw)
        assert paper.title == "Crossref Paper Title"
        assert paper.authors == ["Jane Doe", "John Smith"]
        assert paper.year == 2022
        assert paper.citation_count == 300
        assert paper.doi == "10.1234/test"
        assert paper.source == PaperSource.CROSSREF

    def test_empty_title_list(self):
        raw = {"title": []}
        paper = CrossrefClient._to_paper(raw)
        assert paper.title == ""

    def test_published_online_fallback(self):
        raw = {
            "title": ["Online Paper"],
            "published-online": {"date-parts": [[2021, 3, 15]]},
        }
        paper = CrossrefClient._to_paper(raw)
        assert paper.year == 2021

    def test_no_date_parts(self):
        raw = {"title": ["No Date"]}
        paper = CrossrefClient._to_paper(raw)
        assert paper.year is None


@pytest.mark.asyncio
@respx.mock
async def test_crossref_search_success():
    respx.get("https://api.crossref.org/works").mock(
        return_value=httpx.Response(
            200,
            json={
                "message": {
                    "items": [
                        {
                            "DOI": "10.9999/cr",
                            "title": ["Crossref Hit"],
                            "is-referenced-by-count": 77,
                        }
                    ]
                }
            },
        )
    )
    client = CrossrefClient()
    papers = await client.search("crossref query")
    assert len(papers) == 1
    assert papers[0].doi == "10.9999/cr"


@pytest.mark.asyncio
@respx.mock
async def test_crossref_search_http_error_returns_empty():
    respx.get("https://api.crossref.org/works").mock(
        return_value=httpx.Response(503, text="Unavailable")
    )
    client = CrossrefClient()
    papers = await client.search("unavailable")
    assert papers == []


# ── CORE ─────────────────────────────────────────────────────────────────────


class TestCoreToPaper:
    def test_full_record(self):
        raw = {
            "id": 999,
            "title": "CORE Paper",
            "authors": [{"name": "Core Author"}],
            "yearPublished": 2023,
            "citationCount": 15,
            "abstract": "An open-access paper...",
            "doi": "10.7777/core",
            "downloadUrl": "https://core.ac.uk/pdf/999.pdf",
        }
        paper = CoreClient._to_paper(raw)
        assert paper.title == "CORE Paper"
        assert paper.authors == ["Core Author"]
        assert paper.year == 2023
        assert paper.citation_count == 15
        assert paper.doi == "10.7777/core"
        assert paper.source == PaperSource.CORE
        assert paper.source_id == "999"
        assert paper.url == "https://core.ac.uk/pdf/999.pdf"

    def test_fallback_url_from_source_fulltext(self):
        raw = {
            "id": 1,
            "title": "Fulltext",
            "authors": [],
            "sourceFulltextUrls": ["https://example.com/fulltext.pdf"],
        }
        paper = CoreClient._to_paper(raw)
        assert paper.url == "https://example.com/fulltext.pdf"

    def test_no_urls(self):
        raw = {"id": 2, "title": "No URL", "authors": []}
        paper = CoreClient._to_paper(raw)
        assert paper.url is None


@pytest.mark.asyncio
@respx.mock
async def test_core_search_success():
    respx.get("https://api.core.ac.uk/v3/search/works").mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "id": 42,
                        "title": "Core Result",
                        "authors": [{"name": "Auth"}],
                        "yearPublished": 2024,
                        "citationCount": 5,
                    }
                ]
            },
        )
    )
    client = CoreClient()
    papers = await client.search("core query")
    assert len(papers) == 1
    assert papers[0].source == PaperSource.CORE


@pytest.mark.asyncio
@respx.mock
async def test_core_search_http_error_returns_empty():
    respx.get("https://api.core.ac.uk/v3/search/works").mock(
        return_value=httpx.Response(401, text="Unauthorized")
    )
    client = CoreClient()
    papers = await client.search("unauthorized")
    assert papers == []
