"""Validate the output JSON schema of research profiles.

Uses the ``sample_research`` fixture defined in conftest.py to verify that
every required key exists, has the correct type, and contains the expected
nested structure.
"""

from __future__ import annotations

from typing import Any

import pytest

# ── 1. Required top-level keys ──────────────────────────────────────────

REQUIRED_TOP_LEVEL_KEYS = [
    "slug",
    "name",
    "generated_at",
    "bio",
    "topics",
    "timeline",
    "key_contributions",
    "quotes",
    "social",
    "sources",
]


@pytest.mark.parametrize("key", REQUIRED_TOP_LEVEL_KEYS)
def test_required_top_level_key_exists(sample_research: dict[str, Any], key: str):
    """Each mandatory top-level key must be present."""
    assert key in sample_research, f"Missing required top-level key: {key}"


# ── 2. bio is a non-empty string ────────────────────────────────────────

def test_bio_is_string(sample_research: dict[str, Any]):
    assert isinstance(sample_research["bio"], str)


def test_bio_is_non_empty(sample_research: dict[str, Any]):
    assert len(sample_research["bio"].strip()) > 0, "bio must not be empty or whitespace"


# ── 3. topics is a list of strings ──────────────────────────────────────

def test_topics_is_list(sample_research: dict[str, Any]):
    assert isinstance(sample_research["topics"], list)


def test_topics_contains_only_strings(sample_topics: list[str]):
    for item in sample_topics:
        assert isinstance(item, str), f"Expected str in topics, got {type(item)}"


def test_topics_non_empty(sample_topics: list[str]):
    assert len(sample_topics) > 0, "topics list must not be empty"


# ── 4. timeline items have date, event, url ─────────────────────────────

TIMELINE_REQUIRED_KEYS = ["date", "event", "url"]


@pytest.mark.parametrize("key", TIMELINE_REQUIRED_KEYS)
def test_timeline_items_have_required_keys(sample_timeline: list[dict], key: str):
    for idx, item in enumerate(sample_timeline):
        assert key in item, f"timeline[{idx}] missing key '{key}'"


def test_timeline_is_list(sample_research: dict[str, Any]):
    assert isinstance(sample_research["timeline"], list)


def test_timeline_item_values_are_strings(sample_timeline: list[dict]):
    for idx, item in enumerate(sample_timeline):
        for key in TIMELINE_REQUIRED_KEYS:
            assert isinstance(item[key], str), (
                f"timeline[{idx}]['{key}'] should be str, got {type(item[key])}"
            )


# ── 5. key_contributions items have title, description, url ─────────────

CONTRIBUTION_REQUIRED_KEYS = ["title", "description", "url"]


@pytest.mark.parametrize("key", CONTRIBUTION_REQUIRED_KEYS)
def test_contributions_have_required_keys(sample_contributions: list[dict], key: str):
    for idx, item in enumerate(sample_contributions):
        assert key in item, f"key_contributions[{idx}] missing key '{key}'"


def test_contributions_is_list(sample_research: dict[str, Any]):
    assert isinstance(sample_research["key_contributions"], list)


def test_contribution_values_are_strings(sample_contributions: list[dict]):
    for idx, item in enumerate(sample_contributions):
        for key in CONTRIBUTION_REQUIRED_KEYS:
            assert isinstance(item[key], str), (
                f"key_contributions[{idx}]['{key}'] should be str, got {type(item[key])}"
            )


# ── 6. quotes items have text, source, url ──────────────────────────────

QUOTE_REQUIRED_KEYS = ["text", "source", "url"]


@pytest.mark.parametrize("key", QUOTE_REQUIRED_KEYS)
def test_quotes_have_required_keys(sample_quotes: list[dict], key: str):
    for idx, item in enumerate(sample_quotes):
        assert key in item, f"quotes[{idx}] missing key '{key}'"


def test_quotes_is_list(sample_research: dict[str, Any]):
    assert isinstance(sample_research["quotes"], list)


def test_quote_values_are_strings(sample_quotes: list[dict]):
    for idx, item in enumerate(sample_quotes):
        for key in QUOTE_REQUIRED_KEYS:
            assert isinstance(item[key], str), (
                f"quotes[{idx}]['{key}'] should be str, got {type(item[key])}"
            )


# ── 7. social is a dict of string -> string ─────────────────────────────

def test_social_is_dict(sample_research: dict[str, Any]):
    assert isinstance(sample_research["social"], dict)


def test_social_keys_are_strings(sample_social: dict):
    for key in sample_social:
        assert isinstance(key, str), f"social key should be str, got {type(key)}"


def test_social_values_are_strings(sample_social: dict):
    for key, val in sample_social.items():
        assert isinstance(val, str), f"social['{key}'] should be str, got {type(val)}"


# ── 8. executive_summary has required keys ──────────────────────────────

EXECUTIVE_REQUIRED_KEYS = [
    "one_liner",
    "key_facts",
    "career_arc",
    "current_focus",
    "industry_significance",
]


@pytest.mark.parametrize("key", EXECUTIVE_REQUIRED_KEYS)
def test_executive_summary_has_required_keys(sample_executive: dict, key: str):
    assert key in sample_executive, f"executive_summary missing key '{key}'"


def test_executive_summary_one_liner_is_string(sample_executive: dict):
    assert isinstance(sample_executive["one_liner"], str)


def test_executive_summary_key_facts_is_list(sample_executive: dict):
    assert isinstance(sample_executive["key_facts"], list)
    for idx, fact in enumerate(sample_executive["key_facts"]):
        assert isinstance(fact, str), f"key_facts[{idx}] should be str"


# ── 9. competitive_landscape has required keys ──────────────────────────

COMPETITIVE_REQUIRED_KEYS = [
    "market_position",
    "competitors",
    "moats",
    "ecosystem_role",
]


@pytest.mark.parametrize("key", COMPETITIVE_REQUIRED_KEYS)
def test_competitive_landscape_has_required_keys(sample_competitive: dict, key: str):
    assert key in sample_competitive, f"competitive_landscape missing key '{key}'"


def test_competitive_landscape_competitors_is_list(sample_competitive: dict):
    assert isinstance(sample_competitive["competitors"], list)


def test_competitive_landscape_moats_is_list(sample_competitive: dict):
    assert isinstance(sample_competitive["moats"], list)
    for idx, moat in enumerate(sample_competitive["moats"]):
        assert isinstance(moat, str), f"moats[{idx}] should be str"


def test_competitive_landscape_market_position_is_string(sample_competitive: dict):
    assert isinstance(sample_competitive["market_position"], str)


# ── 10. collaboration_network has required keys ─────────────────────────

COLLABORATION_REQUIRED_KEYS = ["co_founders", "key_collaborators"]


@pytest.mark.parametrize("key", COLLABORATION_REQUIRED_KEYS)
def test_collaboration_network_has_required_keys(sample_collaboration: dict, key: str):
    assert key in sample_collaboration, f"collaboration_network missing key '{key}'"


def test_collaboration_co_founders_is_list(sample_collaboration: dict):
    assert isinstance(sample_collaboration["co_founders"], list)


def test_collaboration_key_collaborators_is_list(sample_collaboration: dict):
    assert isinstance(sample_collaboration["key_collaborators"], list)


# ── 11. funding has required keys ───────────────────────────────────────

FUNDING_REQUIRED_KEYS = ["funding_rounds", "total_raised"]


@pytest.mark.parametrize("key", FUNDING_REQUIRED_KEYS)
def test_funding_has_required_keys(sample_funding: dict, key: str):
    assert key in sample_funding, f"funding missing key '{key}'"


def test_funding_rounds_is_list(sample_funding: dict):
    assert isinstance(sample_funding["funding_rounds"], list)


def test_funding_total_raised_is_string(sample_funding: dict):
    assert isinstance(sample_funding["total_raised"], str)


# ── 12. conferences has required keys ───────────────────────────────────

CONFERENCES_REQUIRED_KEYS = ["speaking_tier", "talks"]


@pytest.mark.parametrize("key", CONFERENCES_REQUIRED_KEYS)
def test_conferences_has_required_keys(sample_conferences: dict, key: str):
    assert key in sample_conferences, f"conferences missing key '{key}'"


def test_conferences_speaking_tier_is_string(sample_conferences: dict):
    assert isinstance(sample_conferences["speaking_tier"], str)


def test_conferences_talks_is_list(sample_conferences: dict):
    assert isinstance(sample_conferences["talks"], list)


def test_conferences_talk_items_have_event_and_title(sample_conferences: dict):
    for idx, talk in enumerate(sample_conferences["talks"]):
        assert "event" in talk, f"talks[{idx}] missing 'event'"
        assert "title" in talk, f"talks[{idx}] missing 'title'"


# ── 13. technical_philosophy has required keys ──────────────────────────

PHILOSOPHY_REQUIRED_KEYS = ["core_thesis", "positions"]


@pytest.mark.parametrize("key", PHILOSOPHY_REQUIRED_KEYS)
def test_technical_philosophy_has_required_keys(sample_philosophy: dict, key: str):
    assert key in sample_philosophy, f"technical_philosophy missing key '{key}'"


def test_technical_philosophy_core_thesis_is_string(sample_philosophy: dict):
    assert isinstance(sample_philosophy["core_thesis"], str)


def test_technical_philosophy_positions_is_dict(sample_philosophy: dict):
    assert isinstance(sample_philosophy["positions"], dict)


# ── 14. podcast_appearances is a list of dicts with show, title, date ───

PODCAST_REQUIRED_KEYS = ["show", "title", "date"]


def test_podcast_appearances_is_list(sample_research: dict[str, Any]):
    assert isinstance(sample_research["podcast_appearances"], list)


@pytest.mark.parametrize("key", PODCAST_REQUIRED_KEYS)
def test_podcast_items_have_required_keys(sample_podcasts: list[dict], key: str):
    for idx, item in enumerate(sample_podcasts):
        assert key in item, f"podcast_appearances[{idx}] missing key '{key}'"


def test_podcast_item_values_are_strings(sample_podcasts: list[dict]):
    for idx, item in enumerate(sample_podcasts):
        for key in PODCAST_REQUIRED_KEYS:
            assert isinstance(item[key], str), (
                f"podcast_appearances[{idx}]['{key}'] should be str, got {type(item[key])}"
            )


# ── 15. news is a list of dicts with headline, source, date ─────────────

NEWS_REQUIRED_KEYS = ["headline", "source", "date"]


def test_news_is_list(sample_research: dict[str, Any]):
    assert isinstance(sample_research["news"], list)


@pytest.mark.parametrize("key", NEWS_REQUIRED_KEYS)
def test_news_items_have_required_keys(sample_news: list[dict], key: str):
    for idx, item in enumerate(sample_news):
        assert key in item, f"news[{idx}] missing key '{key}'"


def test_news_item_values_are_strings(sample_news: list[dict]):
    for idx, item in enumerate(sample_news):
        for key in NEWS_REQUIRED_KEYS:
            assert isinstance(item[key], str), (
                f"news[{idx}]['{key}'] should be str, got {type(item[key])}"
            )


# ── Cross-cutting: slug and generated_at format ─────────────────────────

def test_slug_is_kebab_case(sample_research: dict[str, Any]):
    slug = sample_research["slug"]
    assert isinstance(slug, str)
    assert slug == slug.lower(), "slug should be lowercase"
    assert " " not in slug, "slug must not contain spaces"


def test_generated_at_is_iso_string(sample_research: dict[str, Any]):
    from datetime import datetime, timezone

    raw = sample_research["generated_at"]
    assert isinstance(raw, str)
    # Should parse as ISO-8601 without raising
    dt = datetime.fromisoformat(raw)
    assert dt.tzinfo is not None or "T" in raw, "generated_at should be an ISO-8601 timestamp"


def test_sources_is_list(sample_research: dict[str, Any]):
    assert isinstance(sample_research["sources"], list)
