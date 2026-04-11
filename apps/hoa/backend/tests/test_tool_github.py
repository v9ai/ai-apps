"""Tests for the fetch_github_profile LangChain tool.

Validates profile data retrieval, field presence, and edge-case handling
for empty or unknown usernames.
"""

import os

import pytest

from research_pipeline import fetch_github_profile

SKIP_NETWORK = os.getenv("SKIP_NETWORK_TESTS", "0") == "1"
_SKIP_REASON = "SKIP_NETWORK_TESTS is set"


# ── Network tests (hit the real GitHub API) ──────────────────────────────


@pytest.mark.network
@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_returns_profile_data_for_known_user():
    """fetch_github_profile returns non-empty data for a known GitHub user."""
    result = fetch_github_profile("hwchase17")
    if result == "(no GitHub data)":
        pytest.skip("GitHub API unavailable (rate limit or network)")
    assert result
    assert result != "(no username provided)"


@pytest.mark.network
@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_result_contains_login_field():
    """The profile output includes the 'login' field."""
    result = fetch_github_profile("hwchase17")
    if result == "(no GitHub data)":
        pytest.skip("GitHub API unavailable (rate limit or network)")
    assert "login:" in result


@pytest.mark.network
@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_result_contains_followers_count():
    """The profile output includes a followers count."""
    result = fetch_github_profile("hwchase17")
    if result == "(no GitHub data)":
        pytest.skip("GitHub API unavailable (rate limit or network)")
    assert "followers:" in result


@pytest.mark.network
@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_result_contains_top_repositories_section():
    """The profile output includes the 'Top repositories' section."""
    result = fetch_github_profile("hwchase17")
    if result == "(no GitHub data)":
        pytest.skip("GitHub API unavailable (rate limit or network)")
    assert "Top repositories:" in result


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_returns_string_type():
    """fetch_github_profile always returns a string."""
    result = fetch_github_profile("hwchase17")
    assert isinstance(result, str)


@pytest.mark.network
@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_result_contains_repo_star_counts():
    """Repository entries include star counts."""
    result = fetch_github_profile("hwchase17")
    if result == "(no GitHub data)":
        pytest.skip("GitHub API unavailable (rate limit or network)")
    assert "stars" in result


# ── Edge-case tests (no network needed) ──────────────────────────────────


def test_handles_empty_username_gracefully():
    """An empty username returns a graceful fallback message."""
    result = fetch_github_profile("")
    assert result == "(no username provided)"


def test_handles_unknown_username_gracefully():
    """The literal string 'unknown' is treated as missing."""
    result = fetch_github_profile("unknown")
    assert result == "(no username provided)"
