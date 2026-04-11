"""Tests for web_search and web_news_search tool functions from research_pipeline.py.

These are LangChain @tool-decorated functions that wrap DuckDuckGo searches.
All tests hit the network and are skipped when SKIP_NETWORK_TESTS=1.
"""

import os
import re

import pytest

SKIP_NETWORK = os.getenv("SKIP_NETWORK_TESTS", "0") == "1"
network = pytest.mark.skipif(SKIP_NETWORK, reason="Network tests disabled")

from research_pipeline import web_news_search, web_search


# ---------------------------------------------------------------------------
# 1. web_search returns non-empty string for a valid query
# ---------------------------------------------------------------------------
@network
@pytest.mark.network
def test_web_search_returns_nonempty_string():
    result = web_search("Harrison Chase LangChain")
    assert isinstance(result, str)
    assert len(result) > 0
    assert result != "(no results)"


# ---------------------------------------------------------------------------
# 2. web_search result contains URLs (markdown links)
# ---------------------------------------------------------------------------
@network
@pytest.mark.network
def test_web_search_contains_urls():
    result = web_search("Harrison Chase LangChain")
    # The tool formats results as markdown links: [title](url)
    assert re.search(r"\[.+?\]\(https?://.+?\)", result), (
        "Expected at least one markdown link in search results"
    )


# ---------------------------------------------------------------------------
# 3. web_search handles empty query gracefully
# ---------------------------------------------------------------------------
@network
@pytest.mark.network
def test_web_search_empty_query():
    result = web_search("")
    assert isinstance(result, str)
    # Should not raise; may return "(no results)" or a failure message
    assert len(result) > 0


# ---------------------------------------------------------------------------
# 4. web_news_search returns non-empty string
# ---------------------------------------------------------------------------
@network
@pytest.mark.network
def test_web_news_search_returns_nonempty_string():
    result = web_news_search("artificial intelligence")
    assert isinstance(result, str)
    assert len(result) > 0
    assert result != "(no news results)"


# ---------------------------------------------------------------------------
# 5. web_news_search result contains date information
# ---------------------------------------------------------------------------
@network
@pytest.mark.network
def test_web_news_search_contains_dates():
    result = web_news_search("artificial intelligence")
    # The tool formats each item with a date field on its own line:
    #   <date> | <source>
    # Dates from DuckDuckGo news typically look like "YYYY-MM-DD..." or similar.
    has_date_pattern = bool(re.search(r"\d{4}-\d{2}-\d{2}", result))
    has_pipe_separator = "|" in result
    assert has_date_pattern or has_pipe_separator, (
        "Expected date information (YYYY-MM-DD or pipe-separated date|source) "
        "in news search results"
    )


# ---------------------------------------------------------------------------
# 6. Both tools return string type
# ---------------------------------------------------------------------------
@network
@pytest.mark.network
def test_both_tools_return_string_type():
    search_result = web_search("OpenAI GPT")
    news_result = web_news_search("OpenAI GPT")
    assert type(search_result) is str, (
        f"web_search returned {type(search_result).__name__}, expected str"
    )
    assert type(news_result) is str, (
        f"web_news_search returned {type(news_result).__name__}, expected str"
    )


# ---------------------------------------------------------------------------
# 7. Search results don't exceed reasonable length
# ---------------------------------------------------------------------------
@network
@pytest.mark.network
def test_search_results_reasonable_length():
    result = web_search("Anthropic Claude AI")
    # Each result snippet is capped at 300 chars, with 10 results max.
    # Title + URL + snippet per result: ~400 chars each, so ~4000 chars total
    # is a generous upper bound. Allow 50_000 to be safe with formatting.
    max_reasonable_length = 50_000
    assert len(result) <= max_reasonable_length, (
        f"Search result unexpectedly large: {len(result)} chars"
    )

    news_result = web_news_search("Anthropic Claude AI")
    assert len(news_result) <= max_reasonable_length, (
        f"News search result unexpectedly large: {len(news_result)} chars"
    )


# ---------------------------------------------------------------------------
# 8. web_search with very specific query returns relevant results
# ---------------------------------------------------------------------------
@network
@pytest.mark.network
def test_web_search_specific_query_relevance():
    query = "Dario Amodei Anthropic CEO"
    result = web_search(query)
    result_lower = result.lower()
    # At least one of the key terms should appear in the results
    assert "amodei" in result_lower or "anthropic" in result_lower, (
        f"Expected 'amodei' or 'anthropic' in results for query '{query}'"
    )
