"""Tests for consistency between different sections of a research profile.

Validates that information referenced in one section is corroborated or
logically consistent with information in other sections (e.g., the bio
mentions the person's org, contributions appear in the bio, timeline
dates precede the generation timestamp, etc.).
"""

import re
from datetime import datetime
from typing import Any


def test_name_consistent_across_sections(sample_research: dict[str, Any]):
    """Name in bio matches the top-level research name field."""
    name = sample_research["name"]
    bio = sample_research["bio"]
    assert name in bio, (
        f"Top-level name '{name}' does not appear in bio text"
    )


def test_org_in_bio(sample_research: dict[str, Any]):
    """The organisation from the profile appears in the bio text."""
    bio = sample_research["bio"]
    executive = sample_research["executive_summary"]

    # Try to extract the org from several likely locations
    org_candidates: set[str] = set()

    # From career_arc
    career_arc = executive.get("career_arc", "")
    # From current_focus
    current_focus = executive.get("current_focus", "")
    # From key_facts — look for company/org names (capitalised multi-word tokens)
    for fact in executive.get("key_facts", []):
        org_candidates.update(
            m.group()
            for m in re.finditer(r"[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*", fact)
        )

    # From competitive_landscape ecosystem_role
    comp = sample_research.get("competitive_landscape", {})
    eco_role = comp.get("ecosystem_role", "")

    # From collaboration_network co_founders context
    collab = sample_research.get("collaboration_network", {})
    for person in collab.get("key_collaborators", []):
        ctx = person.get("context", "")
        if ctx:
            org_candidates.add(ctx)

    # From key_contributions titles (very reliable org/project names)
    for contrib in sample_research.get("key_contributions", []):
        org_candidates.add(contrib["title"])

    # From funding business_milestones
    funding = sample_research.get("funding", {})
    for ms in funding.get("business_milestones", []):
        event_text = ms.get("event", "")
        org_candidates.update(
            m.group()
            for m in re.finditer(r"[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*", event_text)
        )

    # Filter to meaningful candidates (at least 3 chars)
    org_candidates = {c for c in org_candidates if len(c) >= 3}

    assert org_candidates, "Could not extract any organisation candidates from profile"

    bio_lower = bio.lower()
    found = any(org.lower() in bio_lower for org in org_candidates)
    assert found, (
        f"None of the org candidates {org_candidates} appear in bio: {bio[:200]}..."
    )


def test_contributions_mentioned_in_bio(sample_research: dict[str, Any]):
    """At least one key_contribution title appears in the bio text."""
    contributions = sample_research["key_contributions"]
    bio = sample_research["bio"]
    assert isinstance(contributions, list) and len(contributions) > 0, (
        "key_contributions must be a non-empty list"
    )

    bio_lower = bio.lower()
    matching = [
        c["title"]
        for c in contributions
        if c["title"].lower() in bio_lower
    ]
    assert len(matching) >= 1, (
        f"No contribution title found in bio. Titles: "
        f"{[c['title'] for c in contributions]}"
    )


def test_timeline_predates_generated_at(sample_research: dict[str, Any]):
    """All timeline dates are before the generated_at timestamp."""
    generated_at = datetime.fromisoformat(sample_research["generated_at"])
    timeline = sample_research["timeline"]
    assert isinstance(timeline, list) and len(timeline) > 0, (
        "timeline must be a non-empty list"
    )

    # Strip timezone info so comparison is always naive-to-naive
    generated_naive = generated_at.replace(tzinfo=None)

    for entry in timeline:
        date_str = entry["date"]
        # Normalise YYYY-MM to YYYY-MM-01 for comparison
        parts = date_str.split("-")
        if len(parts) == 2:
            date_str = f"{date_str}-01"
        entry_date = datetime.strptime(date_str, "%Y-%m-%d")
        assert entry_date < generated_naive, (
            f"Timeline event '{entry['event']}' dated {entry['date']} "
            f"is not before generated_at {sample_research['generated_at']}"
        )


def test_social_github_matches(sample_research: dict[str, Any]):
    """If a GitHub URL exists in social, it contains a username path segment."""
    social = sample_research.get("social", {})
    github_url = social.get("github", "")

    if not github_url:
        return  # Nothing to check if no GitHub URL

    assert "github.com/" in github_url, (
        f"GitHub URL '{github_url}' does not contain 'github.com/'"
    )

    # Extract the path after github.com/
    match = re.search(r"github\.com/([A-Za-z0-9_-]+)", github_url)
    assert match is not None, (
        f"GitHub URL '{github_url}' does not contain a valid username"
    )
    username = match.group(1)
    assert len(username) >= 1, (
        f"GitHub username extracted from '{github_url}' is empty"
    )


def test_topics_relate_to_contributions(sample_research: dict[str, Any]):
    """At least one topic keyword appears in a contribution description."""
    topics = sample_research["topics"]
    contributions = sample_research["key_contributions"]
    assert isinstance(topics, list) and len(topics) > 0, (
        "topics must be a non-empty list"
    )
    assert isinstance(contributions, list) and len(contributions) > 0, (
        "key_contributions must be a non-empty list"
    )

    # Build a single string from all contribution descriptions
    all_descriptions = " ".join(
        c["description"].lower() for c in contributions
    )

    matching_topics = [
        t for t in topics
        if t.lower() in all_descriptions
    ]
    assert len(matching_topics) >= 1, (
        f"No topic appears in any contribution description. "
        f"Topics: {topics}"
    )


def test_executive_key_facts_supported(sample_research: dict[str, Any]):
    """Key facts reference verifiable claims from other sections.

    Each key fact should contain at least one term that also appears in
    contributions, timeline events, funding rounds, or the bio.
    """
    executive = sample_research["executive_summary"]
    key_facts = executive["key_facts"]
    assert isinstance(key_facts, list) and len(key_facts) > 0, (
        "key_facts must be a non-empty list"
    )

    # Build a reference corpus from other sections
    corpus_parts: list[str] = [sample_research.get("bio", "")]

    for entry in sample_research.get("timeline", []):
        corpus_parts.append(entry.get("event", ""))

    for contrib in sample_research.get("key_contributions", []):
        corpus_parts.append(contrib.get("title", ""))
        corpus_parts.append(contrib.get("description", ""))

    funding = sample_research.get("funding", {})
    for rnd in funding.get("funding_rounds", []):
        corpus_parts.append(rnd.get("amount", ""))
        corpus_parts.append(rnd.get("round", ""))
        corpus_parts.extend(rnd.get("investors", []))

    for item in sample_research.get("news", []):
        corpus_parts.append(item.get("headline", ""))
        corpus_parts.append(item.get("summary", ""))

    corpus = " ".join(corpus_parts).lower()

    unsupported: list[str] = []
    for fact in key_facts:
        # Extract significant words (4+ chars, not common stopwords)
        words = re.findall(r"[a-zA-Z]{4,}", fact)
        significant = [
            w.lower() for w in words
            if w.lower() not in {
                "that", "this", "with", "from", "have", "been", "were",
                "their", "about", "which", "would", "could", "other",
                "more", "most", "some", "also", "into", "than",
            }
        ]
        if not any(word in corpus for word in significant):
            unsupported.append(fact)

    assert len(unsupported) == 0, (
        f"{len(unsupported)} key fact(s) have no supporting evidence in "
        f"other sections:\n" + "\n".join(f"  - {f}" for f in unsupported)
    )


def test_funding_consistent_with_news(sample_research: dict[str, Any]):
    """If funding section exists with rounds, news section mentions funding or investment."""
    funding = sample_research.get("funding", {})
    rounds = funding.get("funding_rounds", [])

    if not rounds:
        return  # No funding rounds to verify

    news = sample_research.get("news", [])
    assert isinstance(news, list) and len(news) > 0, (
        "Profile has funding rounds but news section is empty — "
        "expected at least one news item mentioning the funding"
    )

    # Check that at least one news item references funding/investment
    funding_keywords = {"funding", "fund", "raise", "raised", "investment", "series", "seed", "round"}
    news_text = " ".join(
        f"{item.get('headline', '')} {item.get('summary', '')} {item.get('category', '')}".lower()
        for item in news
    )

    found = any(kw in news_text for kw in funding_keywords)
    assert found, (
        f"Profile has {len(rounds)} funding round(s) but no news item "
        f"mentions funding/investment. News headlines: "
        f"{[item.get('headline', '') for item in news]}"
    )
