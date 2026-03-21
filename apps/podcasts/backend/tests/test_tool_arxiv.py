"""Tests for search_arxiv and search_semantic_scholar tools from crew.py."""

import os

import pytest

from crew import search_arxiv, search_semantic_scholar

_skip_network = pytest.mark.skipif(
    os.getenv("SKIP_NETWORK_TESTS", "0") == "1",
    reason="Network tests disabled",
)


# ── search_arxiv ────────────────────────────────────────────────────────────


@_skip_network
def test_search_arxiv_returns_results():
    """search_arxiv returns non-empty results for a well-known paper query."""
    result = search_arxiv.invoke("attention is all you need")
    assert result
    assert result != "(no arXiv results)"


@_skip_network
def test_search_arxiv_contains_titles():
    """search_arxiv result contains paper titles (title text appears after date bracket)."""
    result = search_arxiv.invoke("attention is all you need")
    assert "Attention" in result or "attention" in result.lower()


@_skip_network
def test_search_arxiv_contains_authors():
    """search_arxiv result includes an Authors line."""
    result = search_arxiv.invoke("attention is all you need")
    assert "Authors:" in result


@_skip_network
def test_search_arxiv_contains_dates():
    """search_arxiv result contains publication dates in YYYY-MM-DD format."""
    result = search_arxiv.invoke("attention is all you need")
    import re

    assert re.search(r"\[\d{4}-\d{2}-\d{2}\]", result), (
        "Expected at least one date in [YYYY-MM-DD] format"
    )


@_skip_network
def test_search_arxiv_handles_empty_query():
    """search_arxiv does not crash on an empty query string."""
    result = search_arxiv.invoke("")
    assert isinstance(result, str)


# ── search_semantic_scholar ─────────────────────────────────────────────────


@_skip_network
def test_search_semantic_scholar_returns_author_info():
    """search_semantic_scholar returns author information for a known researcher."""
    result = search_semantic_scholar.invoke("Geoffrey Hinton")
    assert "Author:" in result


@_skip_network
def test_search_semantic_scholar_includes_h_index():
    """search_semantic_scholar result includes h-index metric."""
    result = search_semantic_scholar.invoke("Geoffrey Hinton")
    assert "h-index:" in result


@_skip_network
def test_search_semantic_scholar_includes_citation_counts():
    """search_semantic_scholar result includes citation count."""
    result = search_semantic_scholar.invoke("Geoffrey Hinton")
    assert "Citations:" in result


@_skip_network
def test_search_semantic_scholar_includes_paper_list():
    """search_semantic_scholar result includes a papers section."""
    result = search_semantic_scholar.invoke("Geoffrey Hinton")
    assert "Papers:" in result or "Top Papers:" in result or "Related Papers:" in result


# ── Shared ──────────────────────────────────────────────────────────────────


@_skip_network
def test_both_tools_return_string_type():
    """Both search_arxiv and search_semantic_scholar return str."""
    arxiv_result = search_arxiv.invoke("transformer architecture")
    scholar_result = search_semantic_scholar.invoke("Yann LeCun")
    assert isinstance(arxiv_result, str)
    assert isinstance(scholar_result, str)
