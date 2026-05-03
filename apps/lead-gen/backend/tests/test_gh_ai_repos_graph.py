"""Unit tests for ``gh_ai_repos_graph`` — deterministic helpers only.

Covers the activity-velocity summarisers, the heuristic scorer's signal
weighting, the ``RepoSellBrief`` Pydantic schema's grounding (Literals +
canonical pain-point list), and the markdown brief renderer's fallback path.
No network, no DB, no LLM calls.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from leadgen_agent.gh_ai_repos_graph import (
    BUYER_PERSONAS,
    COMMERCIAL_INTENTS,
    PAIN_POINTS,
    RepoSellBrief,
    _render_markdown_brief,
    _score_repo,
    _summarize_commit_activity,
    _summarize_releases,
)


# --------------------------------------------------------------------------- #
# _summarize_commit_activity
# --------------------------------------------------------------------------- #


def test_commit_activity_sums_last_4_and_52_weeks() -> None:
    weeks = [{"week": 0, "total": i + 1} for i in range(52)]
    last4, last1y = _summarize_commit_activity(weeks)
    assert last4 == 49 + 50 + 51 + 52
    assert last1y == sum(range(1, 53))


def test_commit_activity_handles_empty_or_missing() -> None:
    assert _summarize_commit_activity([]) == (0, 0)
    assert _summarize_commit_activity(None) == (0, 0)
    assert _summarize_commit_activity([{"week": 0}]) == (0, 0)


# --------------------------------------------------------------------------- #
# _summarize_releases
# --------------------------------------------------------------------------- #


def test_release_summary_counts_90d_and_computes_median_gap() -> None:
    now = datetime.now(timezone.utc)
    releases = [
        {"published_at": (now - timedelta(days=10)).isoformat()},
        {"published_at": (now - timedelta(days=40)).isoformat()},
        {"published_at": (now - timedelta(days=80)).isoformat()},
        {"published_at": (now - timedelta(days=200)).isoformat()},  # outside 90d
    ]
    recent, median_gap, latest = _summarize_releases(releases)
    assert recent == 3
    assert median_gap is not None and 30 <= median_gap <= 40 + 1
    assert latest is not None  # ISO string


def test_release_summary_handles_missing_dates_and_empty() -> None:
    assert _summarize_releases([]) == (0, None, None)
    assert _summarize_releases(None) == (0, None, None)
    # Releases with no date fields fall through.
    assert _summarize_releases([{"name": "v1"}]) == (0, None, None)


def test_release_summary_single_release_has_no_gap() -> None:
    now = datetime.now(timezone.utc)
    recent, median_gap, latest = _summarize_releases(
        [{"published_at": (now - timedelta(days=5)).isoformat()}]
    )
    assert recent == 1
    assert median_gap is None
    assert latest is not None


# --------------------------------------------------------------------------- #
# _score_repo — signal weighting boundaries
# --------------------------------------------------------------------------- #


def _base_repo(**overrides: object) -> dict:
    """Minimal repo dict the scorer expects, with overrides for each test."""
    base = {
        "stars": 1500,
        "forks": 0,
        "open_issues": 0,
        "contributors_count": 0,
        "owner_type": "User",
        "license": None,
        "topics": [],
        "description": "",
        "readme_excerpt": "",
        "homepage": "",
        "python_share": 0.5,
        "commits_4w": 0,
        "commits_1y": 0,
        "releases_90d": 0,
        "days_between_releases": None,
    }
    base.update(overrides)
    return base


def test_org_ownership_boosts_score() -> None:
    user_score, _ = _score_repo(
        _base_repo(owner_type="User"),
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    org_score, reasons = _score_repo(
        _base_repo(owner_type="Organization"),
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    assert org_score > user_score
    assert any("owned by an org" in r for r in reasons)


def test_commit_velocity_dominates_over_pushed_at() -> None:
    quiet, _ = _score_repo(
        _base_repo(commits_4w=0),
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    busy, reasons = _score_repo(
        _base_repo(commits_4w=25),
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    assert busy >= quiet + 0.10 - 1e-6
    assert any("commits in last 4 weeks" in r for r in reasons)


def test_release_cadence_boost() -> None:
    no_release, _ = _score_repo(
        _base_repo(),
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    productized, reasons = _score_repo(
        _base_repo(releases_90d=2, days_between_releases=30),
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    # +0.06 for releases_90d>=1 and +0.04 for days_between<=60 = +0.10
    assert productized >= no_release + 0.10 - 1e-6
    assert any("release(s) in last 90 days" in r for r in reasons)


def test_personal_project_hints_penalize() -> None:
    score, reasons = _score_repo(
        _base_repo(readme_excerpt="This is just a hobby weekend project for fun."),
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    assert any("personal-project hints" in r for r in reasons)
    # The penalty is -0.15; with the base stars boost (+0.08) we end up below.
    assert score < 0.10


def test_framework_focus_boost_applied_only_when_topic_matches() -> None:
    miss, _ = _score_repo(
        _base_repo(topics=["rag", "vector-database"]),
        org=None,
        framework_focus="langgraph",
        last_seen_days_ago=None,
    )
    hit, reasons = _score_repo(
        _base_repo(topics=["langgraph", "rag"]),
        org=None,
        framework_focus="langgraph",
        last_seen_days_ago=None,
    )
    assert hit >= miss + 0.05 - 1e-6
    assert any("framework focus" in r for r in reasons)


def test_recent_db_dupe_penalized() -> None:
    # Use a high-base repo so the -0.20 penalty doesn't get swallowed by the
    # [0, 1] clamp at the bottom.
    high_base = _base_repo(stars=6000, owner_type="Organization", commits_4w=25)
    fresh, _ = _score_repo(
        high_base,
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    dupe, reasons = _score_repo(
        high_base,
        org=None,
        framework_focus=None,
        last_seen_days_ago=10,
    )
    assert dupe <= fresh - 0.20 + 1e-6
    assert any("recent dupe" in r for r in reasons)


def test_org_signals_boost_score() -> None:
    plain, _ = _score_repo(
        _base_repo(owner_type="Organization"),
        org={"public_members": 0, "blog": "", "twitter_username": "", "ai_repo_count": 0},
        framework_focus=None,
        last_seen_days_ago=None,
    )
    rich, reasons = _score_repo(
        _base_repo(owner_type="Organization"),
        org={
            "public_members": 12,
            "blog": "https://acme.ai",
            "twitter_username": "acmeai",
            "ai_repo_count": 5,
        },
        framework_focus=None,
        last_seen_days_ago=None,
    )
    # +0.04 (members) +0.03 (blog/twitter) +0.04 (ai_repo_count) = +0.11
    assert rich >= plain + 0.11 - 1e-6
    assert any("public org members" in r for r in reasons)


def test_score_clamped_to_unit_interval() -> None:
    # Stack every boost; score must still cap at 1.0.
    score, _ = _score_repo(
        _base_repo(
            stars=10_000,
            commits_4w=100,
            releases_90d=4,
            days_between_releases=14,
            owner_type="Organization",
            license="MIT",
            topics=["langgraph"],
            python_share=0.95,
            forks=500,
            open_issues=80,
            contributors_count=60,
            readme_excerpt=" ".join(
                ["pricing enterprise saas managed contact us we are hiring"]
            ),
        ),
        org={
            "public_members": 30,
            "blog": "https://x",
            "twitter_username": "x",
            "ai_repo_count": 8,
        },
        framework_focus="langgraph",
        last_seen_days_ago=None,
    )
    assert 0.95 <= score <= 1.0


# --------------------------------------------------------------------------- #
# RepoSellBrief — schema grounding
# --------------------------------------------------------------------------- #


def test_brief_drops_pain_points_outside_canonical_list() -> None:
    brief = RepoSellBrief.model_validate({
        "commercial_intent": "open_core",
        "buyer_persona": "ml_team_lead",
        "pain_points": [
            "hosting_cost",      # canonical → kept
            "Scaling",           # casing → kept
            "fine-tuning",       # dash → kept (normalized)
            "world_peace",       # off-list → dropped
        ],
        "pitch_angle": "x",
        "why_now": "y",
        "confidence": 0.8,
        "llm_score": 0.7,
    })
    assert set(brief.pain_points) <= set(PAIN_POINTS)
    assert "world_peace" not in brief.pain_points
    assert "hosting_cost" in brief.pain_points
    assert "scaling" in brief.pain_points
    assert "fine_tuning" in brief.pain_points


def test_brief_caps_pain_points_at_4() -> None:
    brief = RepoSellBrief.model_validate({
        "commercial_intent": "open_core",
        "buyer_persona": "ml_team_lead",
        "pain_points": list(PAIN_POINTS),  # all 10
        "pitch_angle": "x",
        "why_now": "y",
        "confidence": 0.5,
        "llm_score": 0.5,
    })
    assert len(brief.pain_points) <= 4


@pytest.mark.parametrize(
    "raw, expected",
    [
        (0.85, 0.85),
        ("0.6", 0.6),
        ("85%", 0.85),
        (95, 0.95),       # whole-number percent → divided by 100
        (None, 0.0),
        ("garbage", 0.0),
        (-0.2, 0.0),      # below clamp
        # The coercion divides any >1.0 value by 100 (handles whole-number
        # percents like 85 → 0.85). 1.5 is therefore treated as "1.5%" → 0.015.
        # That's fine — the LLM should never emit 1.5; if it does, we'd
        # rather under-confidence than over-confidence the lead.
        (1.5, 0.015),
    ],
)
def test_brief_coerces_confidence_and_score(raw: object, expected: float) -> None:
    brief = RepoSellBrief.model_validate({
        "commercial_intent": "open_core",
        "buyer_persona": "ml_team_lead",
        "pain_points": [],
        "pitch_angle": "",
        "why_now": "",
        "confidence": raw,
        "llm_score": raw,
    })
    assert brief.confidence == pytest.approx(expected, abs=1e-6)
    assert brief.llm_score == pytest.approx(expected, abs=1e-6)


def test_brief_rejects_off_list_literals() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        RepoSellBrief.model_validate({
            "commercial_intent": "freemium_with_extras",  # not in Literal
            "buyer_persona": "ml_team_lead",
            "pain_points": [],
            "pitch_angle": "",
            "why_now": "",
            "confidence": 0.5,
            "llm_score": 0.5,
        })

    with pytest.raises(ValidationError):
        RepoSellBrief.model_validate({
            "commercial_intent": "open_core",
            "buyer_persona": "data_scientist",  # not in Literal
            "pain_points": [],
            "pitch_angle": "",
            "why_now": "",
            "confidence": 0.5,
            "llm_score": 0.5,
        })


def test_brief_constants_are_self_consistent() -> None:
    # Belt-and-braces: the constants exposed at module level must match the
    # Literals enforced in the schema. A future drift would cause our prompt
    # to enumerate values the model can produce that Pydantic then rejects.
    schema = RepoSellBrief.model_json_schema()
    assert set(schema["properties"]["commercial_intent"]["enum"]) == set(COMMERCIAL_INTENTS)
    assert set(schema["properties"]["buyer_persona"]["enum"]) == set(BUYER_PERSONAS)


# --------------------------------------------------------------------------- #
# _render_markdown_brief — fallback path
# --------------------------------------------------------------------------- #


def test_markdown_brief_with_full_llm_output() -> None:
    md = _render_markdown_brief({
        "full_name": "acme/agent",
        "html_url": "https://github.com/acme/agent",
        "stars": 4200,
        "contributors_count": 18,
        "commits_4w": 33,
        "releases_90d": 2,
        "license": "Apache-2.0",
        "homepage": "https://acme.ai",
        "final_score": 0.78,
        "score_reasons": ["fallback reason"],
        "brief": {
            "pitch_angle": "Concrete pitch sentence.",
            "why_now": "Just shipped v0.4.",
            "buyer_persona": "platform_eng",
            "commercial_intent": "open_core",
            "pain_points": ["eval_observability", "scaling"],
        },
        "org": {
            "name": "Acme AI",
            "blog": "https://acme.ai/blog",
            "twitter_username": "acmeai",
            "public_members": 12,
            "ai_repo_count": 5,
        },
    })
    assert "Concrete pitch sentence" in md
    assert "Just shipped v0.4" in md
    assert "platform_eng" in md
    assert "open_core" in md
    assert "eval_observability" in md
    assert "Acme AI" in md
    assert "@acmeai" in md
    assert "33 commits" in md


def test_markdown_brief_falls_back_when_no_llm_brief() -> None:
    # Heuristic-only repo (below classify_top_n cutoff). Must still produce
    # a usable brief from score_reasons and stats — never a Python error.
    md = _render_markdown_brief({
        "full_name": "indie/dev-tool",
        "html_url": "https://github.com/indie/dev-tool",
        "stars": 1100,
        "contributors_count": 4,
        "commits_4w": 8,
        "releases_90d": 0,
        "final_score": 0.32,
        "score_reasons": ["1,100 stars", "4 contributors", "8 commits in last 4 weeks"],
    })
    assert "indie/dev-tool" in md
    assert "1,100 stars" in md
    assert "8 commits" in md
    # No LLM brief → defaults are populated.
    assert "ml_team_lead" in md
    assert "oss_only" in md
