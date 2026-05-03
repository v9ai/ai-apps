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
    PRODUCT_CATEGORIES,
    RepoSellBrief,
    _render_markdown_brief,
    _scan_product_surface,
    _score_repo,
    _summarize_commit_activity,
    _summarize_releases,
)


# Default Pydantic-valid payload — every test that constructs a RepoSellBrief
# can override individual fields without re-typing the boilerplate.
def _brief_payload(**overrides: object) -> dict:
    base = {
        "commercial_intent": "open_core",
        "product_category": "agent_framework",
        "buyer_persona": "ml_team_lead",
        "pain_points": [],
        "pitch_angle": "",
        "why_now": "",
        "confidence": 0.5,
        "llm_score": 0.5,
    }
    base.update(overrides)
    return base


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
        {
            "published_at": (now - timedelta(days=10)).isoformat(),
            "tag_name": "v0.4.0",
            "body": "Adds streaming + sponsors badge.",
        },
        {"published_at": (now - timedelta(days=40)).isoformat(), "tag_name": "v0.3.0"},
        {"published_at": (now - timedelta(days=80)).isoformat(), "tag_name": "v0.2.0"},
        {"published_at": (now - timedelta(days=200)).isoformat(), "tag_name": "v0.1.0"},  # outside 90d
    ]
    recent, median_gap, latest, latest_tag, latest_notes = _summarize_releases(releases)
    assert recent == 3
    assert median_gap is not None and 30 <= median_gap <= 40 + 1
    assert latest is not None  # ISO string
    assert latest_tag == "v0.4.0"
    assert latest_notes is not None and "streaming" in latest_notes


def test_release_summary_handles_missing_dates_and_empty() -> None:
    assert _summarize_releases([]) == (0, None, None, None, None)
    assert _summarize_releases(None) == (0, None, None, None, None)
    # Releases with no date fields fall through.
    assert _summarize_releases([{"name": "v1"}]) == (0, None, None, None, None)


def test_release_summary_single_release_has_no_gap() -> None:
    now = datetime.now(timezone.utc)
    recent, median_gap, latest, tag, notes = _summarize_releases(
        [{
            "published_at": (now - timedelta(days=5)).isoformat(),
            "tag_name": "v1.0.0",
            "body": "First stable release.",
        }]
    )
    assert recent == 1
    assert median_gap is None
    assert latest is not None
    assert tag == "v1.0.0"
    assert notes == "First stable release."


def test_release_summary_caps_notes_at_1500_chars() -> None:
    now = datetime.now(timezone.utc)
    huge = "x" * 5000
    _, _, _, _, notes = _summarize_releases(
        [{"published_at": now.isoformat(), "tag_name": "v9", "body": huge}]
    )
    assert notes is not None
    assert len(notes) == 1500


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
    brief = RepoSellBrief.model_validate(_brief_payload(
        pain_points=[
            "hosting_cost",      # canonical → kept
            "Scaling",           # casing → kept
            "fine-tuning",       # dash → kept (normalized)
            "world_peace",       # off-list → dropped
        ],
        pitch_angle="x",
        why_now="y",
        confidence=0.8,
        llm_score=0.7,
    ))
    assert set(brief.pain_points) <= set(PAIN_POINTS)
    assert "world_peace" not in brief.pain_points
    assert "hosting_cost" in brief.pain_points
    assert "scaling" in brief.pain_points
    assert "fine_tuning" in brief.pain_points


def test_brief_caps_pain_points_at_4() -> None:
    brief = RepoSellBrief.model_validate(_brief_payload(
        pain_points=list(PAIN_POINTS),  # all 10
    ))
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
    brief = RepoSellBrief.model_validate(_brief_payload(
        confidence=raw,
        llm_score=raw,
    ))
    assert brief.confidence == pytest.approx(expected, abs=1e-6)
    assert brief.llm_score == pytest.approx(expected, abs=1e-6)


def test_brief_rejects_off_list_literals() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        RepoSellBrief.model_validate(_brief_payload(
            commercial_intent="freemium_with_extras",  # not in Literal
        ))

    with pytest.raises(ValidationError):
        RepoSellBrief.model_validate(_brief_payload(
            buyer_persona="data_scientist",  # not in Literal
        ))

    with pytest.raises(ValidationError):
        RepoSellBrief.model_validate(_brief_payload(
            product_category="ai_dust_collector",  # not in Literal
        ))


def test_brief_constants_are_self_consistent() -> None:
    # Belt-and-braces: the constants exposed at module level must match the
    # Literals enforced in the schema. A future drift would cause our prompt
    # to enumerate values the model can produce that Pydantic then rejects.
    schema = RepoSellBrief.model_json_schema()
    assert set(schema["properties"]["commercial_intent"]["enum"]) == set(COMMERCIAL_INTENTS)
    assert set(schema["properties"]["buyer_persona"]["enum"]) == set(BUYER_PERSONAS)
    assert set(schema["properties"]["product_category"]["enum"]) == set(PRODUCT_CATEGORIES)


# --------------------------------------------------------------------------- #
# _scan_product_surface — homepage HTML probe
# --------------------------------------------------------------------------- #


def test_scan_product_surface_detects_pricing_signup_enterprise() -> None:
    html = (
        '<html><body>'
        '<a href="/pricing">Pricing</a>'
        '<a href="/sign-up">Sign up</a>'
        '<a href="/enterprise">Enterprise</a>'
        '<a href="/contact-sales">Talk to sales</a>'
        '<a href="/docs">Docs</a>'
        '<a href="/jobs">We are hiring</a>'
        '</body></html>'
    )
    flags = _scan_product_surface(html, "https://acme.ai")
    assert flags["has_pricing"] is True
    assert flags["has_signup"] is True
    assert flags["has_enterprise"] is True
    assert flags["has_demo"] is True       # /contact-sales is a demo signal
    assert flags["has_docs"] is True
    assert flags["has_careers"] is True
    assert flags["has_changelog"] is False
    assert flags["homepage"] == "https://acme.ai"
    # All five hits should appear in the dedup'd hits list.
    assert "/pricing" in flags["hits"]
    assert "/sign-up" in flags["hits"]


def test_scan_product_surface_empty_html_yields_all_false() -> None:
    flags = _scan_product_surface("", "https://example.com")
    for key in (
        "has_pricing", "has_signup", "has_login", "has_enterprise",
        "has_demo", "has_docs", "has_changelog", "has_careers",
    ):
        assert flags[key] is False
    assert flags["hits"] == []


def test_scan_product_surface_case_insensitive() -> None:
    # Substring match runs on lowercased haystack — uppercase still hits.
    flags = _scan_product_surface("/PRICING", "https://x")
    assert flags["has_pricing"] is True


# --------------------------------------------------------------------------- #
# _score_repo — product_surface + sponsors signals
# --------------------------------------------------------------------------- #


def test_product_surface_signals_boost_score() -> None:
    base, _ = _score_repo(
        _base_repo(),
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    boosted, reasons = _score_repo(
        {
            **_base_repo(),
            "product_surface": {
                "has_pricing": True,    # +0.08
                "has_signup": True,     # +0.05
                "has_enterprise": True, # +0.05
                "has_demo": True,       # +0.03
                "has_careers": True,    # +0.02
            },
        },
        org=None,
        framework_focus=None,
        last_seen_days_ago=None,
    )
    # +0.23 total
    assert boosted >= base + 0.23 - 1e-6
    assert any("/pricing" in r for r in reasons)
    assert any("/enterprise" in r for r in reasons)


def test_sponsors_enabled_boosts_score() -> None:
    plain, _ = _score_repo(
        _base_repo(owner_type="Organization"),
        org={"public_members": 0, "blog": "", "twitter_username": "", "ai_repo_count": 0,
             "sponsors_enabled": False},
        framework_focus=None,
        last_seen_days_ago=None,
    )
    sponsored, reasons = _score_repo(
        _base_repo(owner_type="Organization"),
        org={"public_members": 0, "blog": "", "twitter_username": "", "ai_repo_count": 0,
             "sponsors_enabled": True},
        framework_focus=None,
        last_seen_days_ago=None,
    )
    assert sponsored >= plain + 0.03 - 1e-6
    assert any("Sponsors" in r for r in reasons)


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
        "latest_release_tag": "v0.4.0",
        "license": "Apache-2.0",
        "homepage": "https://acme.ai",
        "final_score": 0.78,
        "score_reasons": ["fallback reason"],
        "brief": {
            "pitch_angle": "Concrete pitch sentence.",
            "why_now": "Just shipped v0.4.",
            "buyer_persona": "platform_eng",
            "commercial_intent": "open_core",
            "product_category": "agent_framework",
            "pain_points": ["eval_observability", "scaling"],
        },
        "org": {
            "name": "Acme AI",
            "blog": "https://acme.ai/blog",
            "twitter_username": "acmeai",
            "public_members": 12,
            "ai_repo_count": 5,
            "sponsors_enabled": True,
        },
        "product_surface": {
            "has_pricing": True,
            "has_signup": True,
            "has_enterprise": True,
            "has_demo": False,
            "has_careers": True,
        },
        "maintainers": [
            {
                "login": "alice",
                "name": "Alice Maintainer",
                "company": "Acme AI",
                "email": "alice@acme.ai",
                "is_hireable": False,
            },
            {
                "login": "bob",
                "company": "Acme AI",
                "twitter": "bobcodes",
            },
        ],
    })
    assert "Concrete pitch sentence" in md
    assert "Just shipped v0.4" in md
    assert "platform_eng" in md
    assert "open_core" in md
    assert "agent_framework" in md
    assert "eval_observability" in md
    assert "Acme AI" in md
    assert "@acmeai" in md
    assert "33 commits" in md
    # New product-surface block + maintainer block + sponsors line
    assert "/pricing" in md
    assert "/enterprise" in md
    assert "GitHub Sponsors" in md
    assert "@alice" in md and "alice@acme.ai" in md
    assert "@bob" in md and "bobcodes on Twitter" in md


def test_markdown_brief_uses_release_tag_for_why_now_when_llm_silent() -> None:
    # No brief → why_now falls back. With latest_release_tag set, prefer it
    # over commit count.
    md = _render_markdown_brief({
        "full_name": "acme/agent",
        "html_url": "https://github.com/acme/agent",
        "stars": 1500,
        "contributors_count": 6,
        "commits_4w": 12,
        "releases_90d": 1,
        "latest_release_tag": "v2.1.0",
        "final_score": 0.45,
        "score_reasons": ["x"],
    })
    assert "Just shipped v2.1.0" in md


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
