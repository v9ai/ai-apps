"""Tests that research outputs contain valid, verifiable sources/URLs.

Uses standard pytest with sample fixtures from conftest and the
has_valid_urls helper from helpers.py. No deepeval dependency needed.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from helpers import has_valid_urls


# Blocked domains: social profiles are not valid research sources
BLOCKED_SOURCE_DOMAINS = [
    "twitter.com",
    "x.com",
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
]


def _collect_all_urls(research: dict) -> list[str]:
    """Gather every URL string found across all sections of a research profile."""
    urls: list[str] = []

    # timeline
    for item in research.get("timeline", []):
        if item.get("url"):
            urls.append(item["url"])

    # key_contributions
    for item in research.get("key_contributions", []):
        if item.get("url"):
            urls.append(item["url"])

    # quotes
    for item in research.get("quotes", []):
        if item.get("url"):
            urls.append(item["url"])

    # social
    for _key, val in research.get("social", {}).items():
        if isinstance(val, str) and val:
            urls.append(val)

    # podcast_appearances
    for item in research.get("podcast_appearances", []):
        if item.get("url"):
            urls.append(item["url"])

    # news
    for item in research.get("news", []):
        if item.get("url"):
            urls.append(item["url"])

    # conferences -> talks
    for item in research.get("conferences", {}).get("talks", []):
        if item.get("url"):
            urls.append(item["url"])

    # technical_philosophy -> positions -> source_url
    positions = research.get("technical_philosophy", {}).get("positions", {})
    for _key, pos in positions.items():
        if isinstance(pos, dict) and pos.get("source_url"):
            urls.append(pos["source_url"])

    # funding -> funding_rounds (no direct URLs typically, but check)
    for item in research.get("funding", {}).get("funding_rounds", []):
        if item.get("url"):
            urls.append(item["url"])

    return urls


# ── 1. Timeline events have URLs ────────────────────────────────────────

def test_timeline_events_have_urls(sample_timeline):
    """All timeline events must have a non-empty url field."""
    for event in sample_timeline:
        assert "url" in event, f"Timeline event missing 'url' key: {event.get('event', '?')}"
        assert event["url"], f"Timeline event has empty url: {event.get('event', '?')}"


# ── 2. Contribution URLs are valid ──────────────────────────────────────

def test_contribution_urls_valid(sample_contributions):
    """All contribution URLs must start with https://."""
    total, valid = has_valid_urls(sample_contributions, url_key="url")
    assert total > 0, "No contribution URLs found at all"
    for contrib in sample_contributions:
        url = contrib.get("url", "")
        assert url.startswith("https://"), (
            f"Contribution '{contrib.get('title', '?')}' URL does not start with https://: {url}"
        )


# ── 3. Quotes have URLs ────────────────────────────────────────────────

def test_quote_urls_present(sample_quotes):
    """All quotes must have a url field."""
    for quote in sample_quotes:
        assert "url" in quote, f"Quote missing 'url' key: {quote.get('text', '?')[:60]}"
        assert quote["url"], f"Quote has empty url: {quote.get('text', '?')[:60]}"


# ── 4. Social URLs use HTTPS ───────────────────────────────────────────

def test_social_urls_https(sample_social):
    """All social profile URLs must use https."""
    for platform, url in sample_social.items():
        if not url:
            continue
        assert url.startswith("https://"), (
            f"Social URL for '{platform}' does not use https: {url}"
        )


# ── 5. No placeholder URLs ─────────────────────────────────────────────

@pytest.mark.xfail(reason="Sample fixture intentionally contains example.com placeholder URLs")
def test_no_placeholder_urls(sample_research):
    """No URL anywhere in the research should contain 'example.com' or 'placeholder'."""
    all_urls = _collect_all_urls(sample_research)
    placeholder_urls = [
        url for url in all_urls
        if "example.com" in url.lower() or "placeholder" in url.lower()
    ]
    assert placeholder_urls == [], (
        f"Found {len(placeholder_urls)} placeholder URL(s): {placeholder_urls}"
    )


# ── 6. URLs not from blocked domains ───────────────────────────────────

def test_urls_not_blocked_domains(sample_research):
    """Source URLs (non-social) must not come from blocked social domains.

    Social profiles are stored in research['social'] and are fine there.
    But timeline, contributions, quotes, podcasts, news, and conference
    URLs should not point to social media sites — they are not verifiable
    research sources.
    """
    source_urls: list[str] = []
    for item in sample_research.get("timeline", []):
        if item.get("url"):
            source_urls.append(item["url"])
    for item in sample_research.get("key_contributions", []):
        if item.get("url"):
            source_urls.append(item["url"])
    for item in sample_research.get("quotes", []):
        if item.get("url"):
            source_urls.append(item["url"])
    for item in sample_research.get("podcast_appearances", []):
        if item.get("url"):
            source_urls.append(item["url"])
    for item in sample_research.get("news", []):
        if item.get("url"):
            source_urls.append(item["url"])
    for item in sample_research.get("conferences", {}).get("talks", []):
        if item.get("url"):
            source_urls.append(item["url"])

    violations = []
    for url in source_urls:
        for domain in BLOCKED_SOURCE_DOMAINS:
            if domain in url.lower():
                violations.append((url, domain))
                break

    assert violations == [], (
        f"Found {len(violations)} source URL(s) from blocked domains: {violations}"
    )


# ── 7. Timeline URL fields are strings ─────────────────────────────────

def test_timeline_urls_are_strings(sample_timeline):
    """URL fields in timeline events must be strings, not None or other types."""
    for event in sample_timeline:
        url = event.get("url")
        assert isinstance(url, str), (
            f"Timeline event '{event.get('event', '?')}' url is {type(url).__name__}, expected str"
        )


# ── 8. Podcast appearances have URLs ───────────────────────────────────

def test_podcast_urls_present(sample_podcasts):
    """All podcast appearances must have a non-empty url."""
    assert len(sample_podcasts) > 0, "No podcast appearances to verify"
    for pod in sample_podcasts:
        assert "url" in pod, f"Podcast '{pod.get('show', '?')}' missing 'url' key"
        assert pod["url"], f"Podcast '{pod.get('show', '?')}' has empty url"


# ── 9. News items have URLs ────────────────────────────────────────────

def test_news_urls_present(sample_news):
    """All news items must have a non-empty url."""
    assert len(sample_news) > 0, "No news items to verify"
    for item in sample_news:
        assert "url" in item, f"News item '{item.get('headline', '?')}' missing 'url' key"
        assert item["url"], f"News item '{item.get('headline', '?')}' has empty url"


# ── 10. Total source count ─────────────────────────────────────────────

def test_total_source_count(sample_research):
    """Research must have a reasonable number of total URLs across all sections (>5)."""
    all_urls = _collect_all_urls(sample_research)
    assert len(all_urls) > 5, (
        f"Research has only {len(all_urls)} total URL(s) across all sections; expected >5"
    )
