"""Tests for the fetch_github_profile LangChain tool.

Validates profile data retrieval, field presence, and edge-case handling
for empty or unknown usernames.
"""

import os

import pytest

from crew import fetch_github_profile

SKIP_NETWORK = os.getenv("SKIP_NETWORK_TESTS", "0") == "1"
_SKIP_REASON = "SKIP_NETWORK_TESTS is set"


# ── Network tests (hit the real GitHub API) ──────────────────────────────


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_returns_profile_data_for_known_user():
    """fetch_github_profile returns non-empty data for a known GitHub user."""
    result = fetch_github_profile.invoke({"username": "hwchase17"})
    assert result
    assert result != "(no GitHub data)"
    assert result != "(no username provided)"


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_result_contains_login_field():
    """The profile output includes the 'login' field."""
    result = fetch_github_profile.invoke({"username": "hwchase17"})
    assert "login:" in result


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_result_contains_followers_count():
    """The profile output includes a followers count."""
    result = fetch_github_profile.invoke({"username": "hwchase17"})
    assert "followers:" in result


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_result_contains_top_repositories_section():
    """The profile output includes the 'Top repositories' section."""
    result = fetch_github_profile.invoke({"username": "hwchase17"})
    assert "Top repositories:" in result


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_returns_string_type():
    """fetch_github_profile always returns a string."""
    result = fetch_github_profile.invoke({"username": "hwchase17"})
    assert isinstance(result, str)


@pytest.mark.skipif(SKIP_NETWORK, reason=_SKIP_REASON)
def test_result_contains_repo_star_counts():
    """Repository entries include star counts."""
    result = fetch_github_profile.invoke({"username": "hwchase17"})
    assert "stars" in result


# ── Edge-case tests (no network needed) ──────────────────────────────────


def test_handles_empty_username_gracefully():
    """An empty username returns a graceful fallback message."""
    result = fetch_github_profile.invoke({"username": ""})
    assert result == "(no username provided)"


def test_handles_unknown_username_gracefully():
    """The literal string 'unknown' is treated as missing."""
    result = fetch_github_profile.invoke({"username": "unknown"})
    assert result == "(no username provided)"
