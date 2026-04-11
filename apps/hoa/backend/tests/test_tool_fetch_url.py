"""Tests for the fetch_url_content LangChain tool.

Validates HTML fetching with tag stripping, blocked-domain filtering,
graceful error handling, and content truncation.
"""

import os

import pytest

from research_pipeline import fetch_url_content

SKIP_NETWORK = os.getenv("SKIP_NETWORK_TESTS", "0") == "1"
_SKIP_REASON = "SKIP_NETWORK_TESTS is set"


# -- Network tests (hit a real HTTP endpoint) ---------------------------------


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_fetches_content_from_valid_url():
    """fetch_url_content returns non-empty content from a valid URL."""
    result = fetch_url_content("https://httpbin.org/html")
    assert result
    assert "Herman Melville" in result


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_returns_string_type():
    """fetch_url_content always returns a string."""
    result = fetch_url_content("https://httpbin.org/html")
    assert isinstance(result, str)


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_strips_html_tags():
    """HTML tags are removed from the fetched content."""
    result = fetch_url_content("https://httpbin.org/html")
    assert "<" not in result
    assert ">" not in result


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_content_truncated_to_reasonable_length():
    """Returned content is truncated to at most 5000 characters."""
    result = fetch_url_content("https://httpbin.org/html")
    assert len(result) <= 5000


# -- Blocked-domain tests (no network needed) ---------------------------------


def test_blocks_twitter():
    """twitter.com is a blocked domain and returns a Skipped message."""
    result = fetch_url_content("https://twitter.com/someuser")
    assert "Skipped" in result


def test_blocks_linkedin():
    """linkedin.com is a blocked domain and returns a Skipped message."""
    result = fetch_url_content("https://www.linkedin.com/in/someone")
    assert "Skipped" in result


def test_blocks_youtube():
    """youtube.com is a blocked domain and returns a Skipped message."""
    result = fetch_url_content("https://www.youtube.com/watch?v=abc")
    assert "Skipped" in result


# -- Error-handling tests (no network needed) ----------------------------------


def test_handles_invalid_url_gracefully():
    """An unreachable URL returns a failure message rather than raising."""
    result = fetch_url_content("https://this-domain-does-not-exist.invalid/page")
    assert "Fetch failed" in result or "HTTP" in result
