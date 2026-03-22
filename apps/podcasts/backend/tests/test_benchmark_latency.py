"""Tool execution latency benchmarks.

Measures wall-clock time for each LangChain tool and asserts that calls
complete within acceptable thresholds.  All tests that hit the network
can be disabled with SKIP_NETWORK_TESTS=1.
"""

import os, time, pytest
from research_pipeline import web_search, fetch_github_profile, search_arxiv, fetch_hf_author, fetch_url_content

SKIP_NETWORK = os.getenv("SKIP_NETWORK_TESTS", "0") == "1"
network = pytest.mark.skipif(SKIP_NETWORK, reason="Network tests disabled")
pytestmark = pytest.mark.benchmark


@network
def test_web_search_latency():
    """web_search completes under 15 seconds."""
    start = time.perf_counter()
    result = web_search.invoke("Harrison Chase LangChain CEO")
    elapsed = time.perf_counter() - start
    assert isinstance(result, str) and len(result) > 0
    assert elapsed < 15, f"web_search took {elapsed:.2f}s (threshold: 15s)"


@network
def test_github_fetch_latency():
    """fetch_github_profile completes under 10 seconds."""
    start = time.perf_counter()
    result = fetch_github_profile.invoke({"username": "hwchase17"})
    elapsed = time.perf_counter() - start
    assert isinstance(result, str) and len(result) > 0
    assert elapsed < 10, f"fetch_github_profile took {elapsed:.2f}s (threshold: 10s)"


@network
def test_arxiv_search_latency():
    """search_arxiv completes under 15 seconds."""
    start = time.perf_counter()
    result = search_arxiv.invoke("transformer attention mechanism")
    elapsed = time.perf_counter() - start
    assert isinstance(result, str) and len(result) > 0
    assert elapsed < 15, f"search_arxiv took {elapsed:.2f}s (threshold: 15s)"


@network
def test_hf_fetch_latency():
    """fetch_hf_author completes under 10 seconds."""
    start = time.perf_counter()
    result = fetch_hf_author.invoke({"username": "deepseek-ai"})
    elapsed = time.perf_counter() - start
    assert isinstance(result, str) and len(result) > 0
    assert elapsed < 10, f"fetch_hf_author took {elapsed:.2f}s (threshold: 10s)"


@network
def test_fetch_url_latency():
    """fetch_url_content completes under 10 seconds."""
    start = time.perf_counter()
    result = fetch_url_content.invoke({"url": "https://github.com/langchain-ai/langchain"})
    elapsed = time.perf_counter() - start
    assert isinstance(result, str) and len(result) > 0
    assert elapsed < 10, f"fetch_url_content took {elapsed:.2f}s (threshold: 10s)"


def test_blocked_domain_instant():
    """Fetching blocked domains returns instantly (<0.1s)."""
    blocked_urls = [
        "https://twitter.com/hwchase17",
        "https://www.linkedin.com/in/harrison-chase",
        "https://www.youtube.com/watch?v=abc123",
        "https://www.reddit.com/r/MachineLearning",
        "https://x.com/elonmusk",
    ]
    for url in blocked_urls:
        start = time.perf_counter()
        result = fetch_url_content.invoke({"url": url})
        elapsed = time.perf_counter() - start
        assert elapsed < 0.1, f"Blocked domain {url} took {elapsed:.2f}s (threshold: 0.1s)"
        assert "Skipped" in result or "blocked" in result.lower(), (
            f"Blocked domain {url} should return skip message, got: {result[:100]}"
        )
