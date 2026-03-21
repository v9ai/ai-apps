"""Tests for data integrity and consistency across research profile sections.

Validates structural rules: naming conventions, date formats, required fields,
uniqueness constraints, and reasonable value bounds.
"""

import re
from datetime import datetime
from typing import Any


def test_slug_is_kebab_case(sample_research: dict[str, Any]):
    """Slug uses only lowercase letters and hyphens."""
    slug = sample_research["slug"]
    assert isinstance(slug, str) and len(slug) > 0, "slug must be a non-empty string"
    assert re.fullmatch(r"[a-z][a-z0-9]*(-[a-z0-9]+)*", slug), (
        f"slug '{slug}' is not valid kebab-case (lowercase + hyphens only)"
    )


def test_generated_at_is_iso(sample_research: dict[str, Any]):
    """generated_at is a valid ISO 8601 datetime."""
    raw = sample_research["generated_at"]
    assert isinstance(raw, str) and len(raw) > 0, "generated_at must be a non-empty string"
    try:
        datetime.fromisoformat(raw)
    except ValueError:
        raise AssertionError(f"generated_at '{raw}' is not valid ISO 8601")


def test_bio_length_reasonable(sample_research: dict[str, Any]):
    """Bio text is between 100 and 800 characters."""
    bio = sample_research["bio"]
    assert isinstance(bio, str), "bio must be a string"
    length = len(bio)
    assert 100 <= length <= 800, (
        f"bio length {length} is outside the acceptable range of 100-800 characters"
    )


def test_topics_are_unique(sample_research: dict[str, Any]):
    """No duplicate topics in the topics list."""
    topics = sample_research["topics"]
    assert isinstance(topics, list) and len(topics) > 0, "topics must be a non-empty list"
    lowered = [t.lower() for t in topics]
    duplicates = [t for t in lowered if lowered.count(t) > 1]
    assert len(duplicates) == 0, f"duplicate topics found: {set(duplicates)}"


def test_timeline_dates_valid(sample_research: dict[str, Any]):
    """All timeline dates match YYYY-MM or YYYY-MM-DD pattern."""
    timeline = sample_research["timeline"]
    assert isinstance(timeline, list) and len(timeline) > 0, "timeline must be a non-empty list"
    pattern = re.compile(r"^\d{4}-\d{2}(-\d{2})?$")
    for entry in timeline:
        date = entry["date"]
        assert pattern.match(date), (
            f"timeline date '{date}' does not match YYYY-MM or YYYY-MM-DD"
        )


def test_quotes_have_all_fields(sample_research: dict[str, Any]):
    """Every quote has text, source, and url."""
    quotes = sample_research["quotes"]
    assert isinstance(quotes, list) and len(quotes) > 0, "quotes must be a non-empty list"
    required = {"text", "source", "url"}
    for i, quote in enumerate(quotes):
        missing = required - quote.keys()
        assert not missing, f"quote[{i}] is missing fields: {missing}"
        for field in required:
            assert isinstance(quote[field], str) and len(quote[field]) > 0, (
                f"quote[{i}].{field} must be a non-empty string"
            )


def test_contributions_have_all_fields(sample_research: dict[str, Any]):
    """Every contribution has title, description, and url."""
    contributions = sample_research["key_contributions"]
    assert isinstance(contributions, list) and len(contributions) > 0, (
        "key_contributions must be a non-empty list"
    )
    required = {"title", "description", "url"}
    for i, contrib in enumerate(contributions):
        missing = required - contrib.keys()
        assert not missing, f"key_contributions[{i}] is missing fields: {missing}"
        for field in required:
            assert isinstance(contrib[field], str) and len(contrib[field]) > 0, (
                f"key_contributions[{i}].{field} must be a non-empty string"
            )


def test_social_keys_lowercase(sample_research: dict[str, Any]):
    """All social platform keys are lowercase."""
    social = sample_research["social"]
    assert isinstance(social, dict) and len(social) > 0, "social must be a non-empty dict"
    for key in social:
        assert key == key.lower(), f"social key '{key}' is not lowercase"


def test_executive_key_facts_count(sample_research: dict[str, Any]):
    """key_facts in executive_summary has exactly 3 items."""
    executive = sample_research["executive_summary"]
    key_facts = executive["key_facts"]
    assert isinstance(key_facts, list), "key_facts must be a list"
    assert len(key_facts) == 3, (
        f"key_facts has {len(key_facts)} items, expected exactly 3"
    )


def test_funding_rounds_have_amounts(sample_research: dict[str, Any]):
    """Every funding round includes an amount field."""
    funding = sample_research["funding"]
    rounds = funding["funding_rounds"]
    assert isinstance(rounds, list) and len(rounds) > 0, (
        "funding_rounds must be a non-empty list"
    )
    for i, rnd in enumerate(rounds):
        assert "amount" in rnd, f"funding_rounds[{i}] is missing 'amount' field"
        assert isinstance(rnd["amount"], str) and len(rnd["amount"]) > 0, (
            f"funding_rounds[{i}].amount must be a non-empty string"
        )
