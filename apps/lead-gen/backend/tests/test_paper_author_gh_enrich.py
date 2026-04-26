"""Tests for the GraphQL-based ``enrich_github_profile`` node, the v2 builder,
and the ``_persist_github_profile`` LinkedIn-promotion logic.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any
from unittest.mock import MagicMock, patch

import httpx
import pytest

from leadgen_agent import _gh_graphql
from leadgen_agent.contact_enrich_paper_author_graph import (
    _build_github_profile_v2,
    _persist_github_profile,
    enrich_github_profile,
)


def _run(coro):
    return asyncio.run(coro)


def _state(*, contact_id: int = 7, github_login: str = "researcher42") -> dict[str, Any]:
    return {
        "contact": {
            "id": contact_id,
            "first_name": "Anne",
            "last_name": "Researcher",
            "tags": [],
            "openalex_profile": {},
            "email": "",
            "linkedin_url": "",
            "github_handle": "",
        },
        "github_login": github_login,
    }


def _hydrate_response(
    *,
    login: str = "researcher42",
    name: str | None = "Anne Researcher",
    company: str = "@anthropic",
    email: str = "",
    org_logins: list[str] | None = None,
    social_accounts: list[dict[str, str]] | None = None,
    repos: list[dict[str, Any]] | None = None,
    pinned: list[dict[str, Any]] | None = None,
    contributions_total: int = 1234,
    is_hireable: bool | None = True,
    sponsorships_count: int = 0,
    rate_limit_cost: int = 7,
) -> dict[str, Any]:
    return {
        "user": {
            "login": login,
            "databaseId": 999,
            "url": f"https://github.com/{login}",
            "name": name,
            "bio": "ML engineer",
            "company": company,
            "location": "SF",
            "email": email,
            "websiteUrl": "https://example.com",
            "twitterUsername": "anne",
            "avatarUrl": "https://avatars.example/x.png",
            "isHireable": is_hireable,
            "createdAt": "2015-01-01T00:00:00Z",
            "updatedAt": "2026-04-01T00:00:00Z",
            "socialAccounts": {"nodes": social_accounts or []},
            "organizations": {
                "nodes": [{"login": o, "name": o.title()} for o in (org_logins or [])]
            },
            "followers": {"totalCount": 250},
            "following": {"totalCount": 90},
            "publicRepositories": {"totalCount": len(repos or [])},
            "publicGists": {"totalCount": 3},
            "contributionsCollection": {
                "totalCommitContributions": 800,
                "totalPullRequestContributions": 50,
                "totalIssueContributions": 30,
                "totalRepositoriesWithContributedCommits": 12,
                "contributionCalendar": {"totalContributions": contributions_total},
            },
            "pinnedItems": {"nodes": pinned or []},
            "repositoriesContributedTo": {
                "nodes": [
                    {"nameWithOwner": "facebook/react", "stargazerCount": 220_000},
                ]
            },
            "repositories": {
                "totalCount": len(repos or []),
                "nodes": repos or [],
            },
            "sponsorshipsAsMaintainer": {"totalCount": sponsorships_count},
            "sponsorsListing": None,
        },
        "rateLimit": {"cost": rate_limit_cost, "remaining": 4990, "resetAt": "2026-04-25T23:00:00Z"},
    }


def _repo(
    name: str,
    *,
    stars: int = 0,
    pushed_at: str = "2026-04-01T00:00:00Z",
    primary_language: str = "Python",
    languages: list[tuple[str, int]] | None = None,
    topics: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "name": name,
        "nameWithOwner": f"researcher42/{name}",
        "url": f"https://github.com/researcher42/{name}",
        "description": f"{name} description",
        "stargazerCount": stars,
        "forkCount": 0,
        "pushedAt": pushed_at,
        "primaryLanguage": {"name": primary_language},
        "languages": {
            "edges": [
                {"size": size, "node": {"name": lang}}
                for lang, size in (languages or [(primary_language, 10_000)])
            ]
        },
        "repositoryTopics": {
            "nodes": [{"topic": {"name": t}} for t in (topics or [])]
        },
    }


@pytest.fixture
def mock_psycopg():
    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph.psycopg"
    ) as mock_pg:
        cur = MagicMock()
        cur.rowcount = 1
        ctx_cur = MagicMock(__enter__=MagicMock(return_value=cur), __exit__=MagicMock(return_value=False))
        conn = MagicMock(cursor=MagicMock(return_value=ctx_cur))
        ctx_conn = MagicMock(__enter__=MagicMock(return_value=conn), __exit__=MagicMock(return_value=False))
        mock_pg.connect.return_value = ctx_conn
        mock_pg.Error = Exception
        yield mock_pg, cur


def test_enrich_happy_path_payload_v2(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    pg, cur = mock_psycopg

    repos = [
        _repo("foo", stars=120, primary_language="Python",
              languages=[("Python", 50_000), ("Rust", 5_000)],
              topics=["llm", "rag"]),
        _repo("bar", stars=30, primary_language="Rust",
              languages=[("Rust", 10_000)], topics=["rust"]),
    ]
    response = _hydrate_response(
        org_logins=["anthropic"],
        social_accounts=[
            {"provider": "LINKEDIN", "url": "https://linkedin.com/in/anne", "displayName": "Anne"},
            {"provider": "MASTODON", "url": "https://hachyderm.io/@anne", "displayName": "@anne"},
        ],
        repos=repos,
        pinned=[
            {
                "name": "foo", "nameWithOwner": "researcher42/foo",
                "url": "https://github.com/researcher42/foo",
                "description": "pinned",
                "stargazerCount": 120, "pushedAt": "2026-04-01T00:00:00Z",
                "primaryLanguage": {"name": "Python"},
                "repositoryTopics": {"nodes": [{"topic": {"name": "llm"}}]},
            }
        ],
    )

    async def fake_post(client, query, variables, **kw):
        assert variables == {"login": "researcher42"}
        return response, []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)

    out = _run(enrich_github_profile(_state()))

    assert out["github_profile_status"] == "ok"
    p = out["github_profile"]
    assert p["schema_version"] == 2
    # PRESERVED v1 keys
    for key in (
        "login", "github_id", "html_url", "name", "bio", "company", "company_org",
        "location", "blog", "twitter_username", "email_public", "hireable",
        "public_repos", "public_gists", "followers", "following",
        "gh_created_at", "gh_updated_at", "last_push_at",
        "top_languages", "top_topics", "pinned_repos", "ai_topic_hits",
        "owned_repo_count", "fork_repo_count", "status", "fetched_at",
    ):
        assert key in p, f"missing v1 key {key}"
    # NEW v2 keys
    for key in (
        "org_logins", "org_names", "social_accounts", "linkedin_url",
        "repositories_contributed_to", "total_commits", "total_prs",
        "total_issues", "total_repos_contributed_to",
        "contributions_last_year", "is_sponsorable", "hireable_known",
        "pinned_source", "gql_rate_limit",
    ):
        assert key in p, f"missing v2 key {key}"
    assert p["company_org"] == "anthropic"  # @anthropic stripped + lowered
    assert p["pinned_source"] == "actual"
    assert p["pinned_repos"][0]["name"] == "foo"
    assert p["top_languages"][0]["name"] == "Python"
    assert "llm" in p["ai_topic_hits"]


def test_enrich_org_logins_propagation(monkeypatch, mock_psycopg):
    """The buyer-fit bug fix: org_logins is now populated. Verify the
    classifier picks up the +0.20 industry-org boost when fed the v2 payload.
    """
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    response = _hydrate_response(org_logins=["anthropic", "openai"], repos=[])

    async def fake_post(client, query, variables, **kw):
        return response, []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    out = _run(enrich_github_profile(_state()))
    p = out["github_profile"]
    assert p["org_logins"] == ["anthropic", "openai"]

    from leadgen_agent.buyer_fit_classifier import classify_buyer_fit

    profile = {
        "institution": "Stanford",
        "institution_id": "ror:00f54p054",
        "institution_country": "US",
        "institution_type": "education",
        "institution_ror": "00f54p054",
    }
    verdict_no_gh, score_no_gh, _ = classify_buyer_fit(profile, "academic")
    verdict_gh, score_gh, reasons = classify_buyer_fit(profile, "academic", gh=p)
    # gh boost should improve score by at least the +0.20 industry-org bump.
    assert score_gh - score_no_gh >= 0.20 - 1e-9
    assert any("anthropic" in r.lower() or "gh.org" in r.lower() for r in reasons)


def test_enrich_linkedin_promotion_calls_update(monkeypatch, mock_psycopg):
    """When socialAccounts has a LINKEDIN entry, _persist_github_profile
    must issue an UPDATE that promotes the URL onto contacts.linkedin_url
    in the same transaction as the github_profile UPDATE."""
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    pg, cur = mock_psycopg
    response = _hydrate_response(
        social_accounts=[
            {"provider": "LINKEDIN", "url": "https://linkedin.com/in/anne", "displayName": "Anne"},
        ],
        repos=[],
    )

    async def fake_post(client, query, variables, **kw):
        return response, []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    _run(enrich_github_profile(_state()))

    # Two execute calls: github_profile UPDATE + linkedin_url promotion UPDATE.
    assert cur.execute.call_count == 2
    li_call = cur.execute.call_args_list[1]
    li_sql, li_params = li_call.args
    assert "linkedin_url" in li_sql
    assert "linkedin_url IS NULL OR linkedin_url = ''" in li_sql
    assert li_params[0] == "https://linkedin.com/in/anne"
    assert li_params[2] == "https://linkedin.com/in/anne"


def test_persist_no_linkedin_skips_promotion_via_sql_guard(monkeypatch, mock_psycopg):
    """When no LinkedIn social account is in the payload, the LinkedIn UPDATE
    still runs but its WHERE clause filters out (third %s = NULL); the SQL
    guard makes it a true no-op without a Python branch."""
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    pg, cur = mock_psycopg
    payload = _build_github_profile_v2({"login": "x"}, {"cost": 1})
    assert payload["linkedin_url"] is None

    _persist_github_profile(7, payload)
    # Two SQL statements still: profile UPDATE + LinkedIn UPDATE (no-op via guard)
    assert cur.execute.call_count == 2
    li_call = cur.execute.call_args_list[1]
    li_sql, li_params = li_call.args
    assert li_params[0] is None
    assert li_params[2] is None  # the IS NOT NULL guard makes the WHERE false


def test_enrich_pinned_fallback(monkeypatch, mock_psycopg):
    """When pinnedItems is empty, fall back to top-6 by stars and tag the
    payload's pinned_source as 'stars_fallback'."""
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    repos = [
        _repo("famous", stars=500, primary_language="Python", topics=["llm"]),
        _repo("ok", stars=10, primary_language="Rust"),
    ]
    response = _hydrate_response(repos=repos, pinned=[])

    async def fake_post(client, query, variables, **kw):
        return response, []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    out = _run(enrich_github_profile(_state()))
    p = out["github_profile"]
    assert p["pinned_source"] == "stars_fallback"
    assert p["pinned_repos"][0]["name"] == "famous"
    assert p["pinned_repos"][0]["stars"] == 500


def test_enrich_not_found_data_user_null(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")

    async def fake_post(client, query, variables, **kw):
        return {"user": None, "rateLimit": {"cost": 1, "remaining": 4999, "resetAt": "x"}}, []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    out = _run(enrich_github_profile(_state()))
    assert out["github_profile_status"] == "not_found"
    assert out["github_profile"]["status"] == "not_found"
    assert out["github_profile"]["schema_version"] == 2


def test_enrich_not_found_via_graphql_error(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")

    async def fake_post(client, query, variables, **kw):
        raise _gh_graphql.NotFoundError("no such login")

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    out = _run(enrich_github_profile(_state()))
    assert out["github_profile_status"] == "not_found"


def test_enrich_rate_limited_sentinel(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")

    async def fake_post(client, query, variables, **kw):
        raise _gh_graphql.RateLimitError("2026-04-25T23:00:00Z")

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    out = _run(enrich_github_profile(_state()))
    assert out["github_profile_status"] == "rate_limited"


def test_enrich_auth_error_no_persist(monkeypatch):
    """Auth errors are operator problems — don't write a sentinel row."""
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")

    async def fake_post(client, query, variables, **kw):
        raise _gh_graphql.AuthError("401")

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._persist_github_profile"
    ) as persist:
        out = _run(enrich_github_profile(_state()))
    assert out["github_profile_status"] == "auth_error"
    persist.assert_not_called()


def test_enrich_no_login_skips_http(monkeypatch):
    called = {"n": 0}

    async def fake_post(client, query, variables, **kw):
        called["n"] += 1
        return {"user": None, "rateLimit": {}}, []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    state = _state(github_login="")
    state["contact"]["github_handle"] = ""
    out = _run(enrich_github_profile(state))
    assert out["github_profile_status"] == "no_data"
    assert called["n"] == 0


def test_build_v2_hireable_known_flag():
    payload = _build_github_profile_v2({"login": "x", "isHireable": False}, None)
    assert payload["hireable"] is False
    assert payload["hireable_known"] is True

    payload = _build_github_profile_v2({"login": "x", "isHireable": None}, None)
    assert payload["hireable"] is None
    assert payload["hireable_known"] is False
