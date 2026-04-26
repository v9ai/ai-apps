"""Tests for the GraphQL-based ``resolve_github_handle`` node.

Mocks ``_gh_graphql.post`` to feed canned GraphQL responses; mocks
``psycopg.connect`` to capture persistence side effects without touching Neon.
The 5-arm batched search, surname hard-gate, ORCID short-circuit, multi-arm
dedup, and confidence-band branching are all covered here.
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
    _gh_node_to_rest_shape,
    _gh_node_top_languages,
    resolve_github_handle,
)


def _run(coro):
    return asyncio.run(coro)


def _state(
    *,
    contact_id: int = 42,
    first: str = "Anne",
    last: str = "Researcher",
    github_handle: str = "",
    orcid: str = "",
    institution: str = "",
    institution_country: str = "",
    topics: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "contact": {
            "id": contact_id,
            "first_name": first,
            "last_name": last,
            "tags": [],
            "openalex_profile": {},
            "email": "",
            "linkedin_url": "",
            "github_handle": github_handle,
        },
        "orcid": orcid,
        "institution": institution,
        "institution_country": institution_country,
        "topics": topics or [],
    }


def _user_node(
    login: str,
    *,
    name: str | None = None,
    bio: str = "",
    company: str = "",
    location: str = "",
    website_url: str = "",
    followers: int = 0,
    primary_languages: list[str] | None = None,
    org_logins: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "login": login,
        "name": name,
        "bio": bio,
        "company": company,
        "location": location,
        "websiteUrl": website_url,
        "twitterUsername": None,
        "followers": {"totalCount": followers},
        "organizations": {
            "nodes": [{"login": o} for o in (org_logins or [])]
        },
        "topRepos": {
            "nodes": [
                {"primaryLanguage": {"name": lang}}
                for lang in (primary_languages or [])
            ]
        },
    }


def _gql_response(arms: dict[str, list[dict[str, Any]]], cost: int = 2) -> dict[str, Any]:
    out: dict[str, Any] = {
        "rateLimit": {"cost": cost, "remaining": 4998, "resetAt": "2026-04-25T23:00:00Z"},
    }
    for arm_id in ("orcid_exact", "name_affil", "name_country", "fullname", "name_topic"):
        if arm_id in arms:
            out[arm_id] = {"nodes": arms[arm_id]}
    return out


@pytest.fixture
def mock_psycopg():
    """Patch psycopg.connect inside the graph module to a no-op MagicMock."""
    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph.psycopg"
    ) as mock_pg:
        mock_pg.connect.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value.rowcount = 1
        mock_pg.Error = Exception
        yield mock_pg


def test_resolve_arms_built_from_state(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")

    captured: dict[str, Any] = {}

    async def fake_post(client, query, variables, **kw):
        captured["query"] = query
        captured["variables"] = variables
        return _gql_response({}), []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)

    state = _state(
        first="Anne",
        last="Researcher",
        orcid="0000-0001-2345-6789",
        institution="Stanford University",
        institution_country="US",
        topics=["machine learning"],
    )
    out = _run(resolve_github_handle(state))

    assert "ResolveAuthor" in captured["query"]
    v = captured["variables"]
    assert v["runOrcid"] is True
    assert v["runAffil"] is True
    assert v["runCountry"] is True
    assert v["runTopic"] is True
    assert v["qOrcid"] == "0000-0001-2345-6789 in:bio"
    assert "Stanford" in v["qNameAffil"]
    assert "location:US" in v["qNameCountry"]
    assert v["qFullname"] == 'fullname:"Anne Researcher"'
    assert "machine" in v["qNameTopic"]
    assert out["github_handle_status"] == "no_match"
    assert out["enrichers_completed"] == ["github_handle"]


def test_resolve_arms_skip_empty_inputs(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    captured: dict[str, Any] = {}

    async def fake_post(client, query, variables, **kw):
        captured["variables"] = variables
        return _gql_response({}), []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    state = _state(orcid="", institution="", institution_country="", topics=[])
    _run(resolve_github_handle(state))
    v = captured["variables"]
    assert v["runOrcid"] is False
    assert v["runAffil"] is False
    assert v["runCountry"] is False
    assert v["runTopic"] is False


def test_resolve_orcid_short_circuit(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    orcid = "0000-0001-2345-6789"
    node = _user_node(
        "researcher42",
        name="Anne Researcher",
        bio=f"AI researcher | ORCID {orcid}",
        followers=100,
        primary_languages=["Python"],
    )

    async def fake_post(client, query, variables, **kw):
        return _gql_response({"orcid_exact": [node]}), []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    state = _state(first="Anne", last="Researcher", orcid=orcid)
    out = _run(resolve_github_handle(state))
    assert out["github_handle_status"] == "hit"
    assert out["github_login"] == "researcher42"
    assert out["github_confidence"] >= 0.95
    assert out["github_handle_arm"] == "orcid_exact"


def test_resolve_surname_hard_gate(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    # Candidate's name has neither "Researcher" in login nor in name.
    node = _user_node(
        "completely-different",
        name="Foo Bar",
        bio="ML engineer",
        followers=500,
        primary_languages=["Python"],
    )

    async def fake_post(client, query, variables, **kw):
        return _gql_response({"fullname": [node]}), []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    state = _state(first="Anne", last="Researcher")
    out = _run(resolve_github_handle(state))
    assert out["github_handle_status"] == "no_match"
    assert "github_login" not in out


def test_resolve_no_match_floor_prolific_wrong_person(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    # 50k followers but surname missing — gate kills it.
    node = _user_node(
        "famous-dev",
        name="Other Person",
        bio="prolific contributor",
        followers=50_000,
    )

    async def fake_post(client, query, variables, **kw):
        return _gql_response({"fullname": [node]}), []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    state = _state(first="Anne", last="Researcher")
    out = _run(resolve_github_handle(state))
    assert out["github_handle_status"] == "no_match"


def test_resolve_dedup_across_arms(monkeypatch, mock_psycopg):
    """Same login in 3 arms → scored once; evidence.arms_matched length 3."""
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    node = _user_node(
        "researcher42",
        name="Anne Researcher",
        bio="ML at Stanford",
        company="Stanford",
        location="US",
        followers=50,
        primary_languages=["Python"],
    )
    score_calls: list[str] = []
    real_score = None

    async def fake_post(client, query, variables, **kw):
        return _gql_response({
            "name_affil": [node],
            "name_country": [node],
            "fullname": [node],
        }), []

    from leadgen_agent import contact_enrich_paper_author_graph as g

    real_score = g._gh_score_candidate

    def counting_score(candidate, **kw):
        score_calls.append(candidate.get("login", ""))
        return real_score(candidate, **kw)

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    monkeypatch.setattr(g, "_gh_score_candidate", counting_score)

    state = _state(
        first="Anne", last="Researcher",
        institution="Stanford University", institution_country="US",
    )
    out = _run(resolve_github_handle(state))

    # Scored exactly once despite appearing in 3 arms.
    assert score_calls == ["researcher42"]
    evidence = json.loads(out["github_evidence"])
    assert evidence["arms_matched"] == ["name_affil", "name_country", "fullname"]


def test_resolve_low_conf_band(monkeypatch, mock_psycopg):
    """Score lands in [0.45, 0.70) → low_conf, github_login NOT exposed.

    Composition: full-name token match (0.30 * 1.0) + plausible Python language
    (0.10 * 1.0) + saturated account_prior from 10k followers (0.05 * 1.0)
    = 0.45 — exactly the low_conf floor.
    """
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    node = _user_node(
        "abc",
        name="Anne Researcher",
        bio="",
        followers=10_000,
        primary_languages=["Python"],
    )

    async def fake_post(client, query, variables, **kw):
        return _gql_response({"fullname": [node]}), []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    # No orcid, no institution, no topics — keeps scores below 0.70 hit floor.
    state = _state(first="Anne", last="Researcher")
    out = _run(resolve_github_handle(state))
    assert out["github_handle_status"] == "low_conf"
    assert "github_login" not in out


def test_resolve_api_error(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")

    async def fake_post(client, query, variables, **kw):
        raise httpx.ConnectError("simulated transport failure")

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    state = _state()
    out = _run(resolve_github_handle(state))
    assert out["github_handle_status"] == "api_error"


def test_resolve_skipped_when_handle_already_set(monkeypatch, mock_psycopg):
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://test")
    called = {"n": 0}

    async def fake_post(client, query, variables, **kw):
        called["n"] += 1
        return _gql_response({}), []

    monkeypatch.setattr(_gh_graphql, "post", fake_post)
    state = _state(github_handle="manually-set")
    out = _run(resolve_github_handle(state))
    assert out["github_handle_status"] == "skipped_already_set"
    assert out["github_login"] == "manually-set"
    assert called["n"] == 0


# ── Adapter unit tests ──────────────────────────────────────────────────────


def test_node_to_rest_shape_coerces_nulls():
    node = {
        "login": "x",
        "name": None,
        "bio": None,
        "company": None,
        "location": None,
        "websiteUrl": None,
        "followers": None,
    }
    out = _gh_node_to_rest_shape(node)
    assert out["login"] == "x"
    assert out["name"] == ""
    assert out["bio"] == ""
    assert out["blog"] == ""  # GraphQL websiteUrl → REST blog
    assert out["followers"] == 0


def test_node_to_rest_shape_renames_websiteUrl_to_blog():
    node = {"login": "x", "websiteUrl": "https://example.com", "followers": {"totalCount": 12}}
    out = _gh_node_to_rest_shape(node)
    assert out["blog"] == "https://example.com"
    assert out["followers"] == 12


def test_top_languages_dedupes_and_skips_nones():
    node = {
        "topRepos": {
            "nodes": [
                {"primaryLanguage": {"name": "Python"}},
                {"primaryLanguage": None},
                {"primaryLanguage": {"name": "Python"}},
                {"primaryLanguage": {"name": "Rust"}},
            ]
        }
    }
    assert _gh_node_top_languages(node) == ["Python", "Rust"]
