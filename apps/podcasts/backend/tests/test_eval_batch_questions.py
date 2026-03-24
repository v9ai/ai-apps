"""Batch evaluation tests for questions across all on-disk research profiles.

Validates question quality patterns at scale: schema conformance, word count
distribution, category coverage, duplicate detection across profiles, and
research grounding (questions reference entities from their profile).

Usage:
    pytest tests/test_eval_batch_questions.py -v
"""

import json
import re
from collections import Counter
from pathlib import Path

import pytest

VALID_CATEGORIES_OLD = {"origin", "technical depth", "philosophy & contrarian views",
                        "collaboration & ecosystem", "future & predictions"}
VALID_CATEGORIES_NEW = {"origin", "technical_depth", "philosophy", "collaboration", "future"}
VALID_CATEGORIES_ALL = VALID_CATEGORIES_OLD | VALID_CATEGORIES_NEW


def _profiles_with_questions(all_research_data):
    return [d for d in all_research_data if d.get("questions") and len(d["questions"]) > 0]


# ═══════════════════════════════════════════════════════════════════════════
# Batch structural tests
# ═══════════════════════════════════════════════════════════════════════════


def test_batch_questions_have_valid_schema(all_research_data):
    """Every question across all profiles must have category + question fields."""
    profiles = _profiles_with_questions(all_research_data)
    if not profiles:
        pytest.skip("No profiles with questions on disk")

    errors = []
    for data in profiles:
        slug = data.get("slug", "unknown")
        for i, q in enumerate(data["questions"]):
            if not isinstance(q, dict):
                errors.append(f"{slug}[{i}]: not a dict")
                continue
            if not q.get("category"):
                errors.append(f"{slug}[{i}]: missing category")
            if not q.get("question"):
                errors.append(f"{slug}[{i}]: missing question text")
    assert not errors, f"Schema errors:\n" + "\n".join(errors)


def test_batch_questions_word_count_distribution(all_research_data):
    """Across all profiles, average question length should be 15-40 words."""
    profiles = _profiles_with_questions(all_research_data)
    if not profiles:
        pytest.skip("No profiles with questions on disk")

    word_counts = []
    for data in profiles:
        for q in data["questions"]:
            wc = len(q.get("question", "").split())
            word_counts.append(wc)

    if not word_counts:
        pytest.skip("No question text found")

    avg = sum(word_counts) / len(word_counts)
    assert 15 <= avg <= 40, (
        f"Average question word count {avg:.1f} outside range [15, 40]. "
        f"Total questions: {len(word_counts)}"
    )


def test_batch_questions_category_coverage(all_research_data):
    """Each profile with questions should cover at least 3 distinct categories."""
    profiles = _profiles_with_questions(all_research_data)
    if not profiles:
        pytest.skip("No profiles with questions on disk")

    weak_profiles = []
    for data in profiles:
        cats = {q.get("category", "") for q in data["questions"]}
        if len(cats) < 3:
            weak_profiles.append(f"{data.get('slug', '?')} ({len(cats)} categories)")

    assert not weak_profiles, (
        f"Profiles with <3 categories: {', '.join(weak_profiles)}"
    )


def test_batch_no_cross_profile_duplicate_questions(all_research_data):
    """No two profiles should have identical question text (copy-paste detection)."""
    profiles = _profiles_with_questions(all_research_data)
    if len(profiles) < 2:
        pytest.skip("Need at least 2 profiles with questions")

    seen: dict[str, str] = {}  # question_text -> slug
    duplicates = []
    for data in profiles:
        slug = data.get("slug", "unknown")
        for q in data["questions"]:
            text = q.get("question", "").strip().lower()
            if text in seen:
                duplicates.append(f"'{text[:50]}...' in {seen[text]} and {slug}")
            else:
                seen[text] = slug

    assert not duplicates, (
        f"Cross-profile duplicate questions:\n" + "\n".join(duplicates)
    )


def test_batch_questions_end_with_question_mark(all_research_data):
    """At least 80% of questions across all profiles should end with '?'."""
    profiles = _profiles_with_questions(all_research_data)
    if not profiles:
        pytest.skip("No profiles with questions on disk")

    total = 0
    with_mark = 0
    for data in profiles:
        for q in data["questions"]:
            total += 1
            if q.get("question", "").strip().endswith("?"):
                with_mark += 1

    if total == 0:
        pytest.skip("No questions found")

    ratio = with_mark / total
    assert ratio >= 0.8, (
        f"Only {with_mark}/{total} ({ratio:.0%}) questions end with '?'. "
        f"Expected >= 80%"
    )


# ═══════════════════════════════════════════════════════════════════════════
# Research grounding tests
# ═══════════════════════════════════════════════════════════════════════════


def _extract_entities(data: dict) -> set[str]:
    """Extract named entities from a research profile for grounding checks.

    Extracts both full phrases and individual significant words (4+ chars,
    capitalized) so that partial matches work — e.g., a question mentioning
    "Chroma" matches the contribution title "Chroma Vector Database".
    """
    entities = set()
    # Stop words to ignore when extracting individual tokens
    _stop = {"the", "and", "for", "with", "from", "that", "this", "will",
             "have", "been", "their", "about", "into", "most", "more",
             "also", "some", "than", "very", "what", "when", "where"}

    def _add_words(text: str):
        """Add individual significant words (4+ chars) from a text."""
        for word in re.findall(r"[A-Za-z]{4,}", text):
            low = word.lower()
            if low not in _stop:
                entities.add(low)

    # Person's name parts
    name = data.get("name", "")
    for part in name.split():
        if len(part) > 2:
            entities.add(part.lower())

    # Contribution titles — both full and individual words
    for c in data.get("key_contributions", []):
        title = c.get("title", "")
        if title:
            _add_words(title)

    # Topics — extract individual words from multi-word topics
    for t in data.get("topics", []):
        if isinstance(t, str):
            _add_words(t)

    # Timeline events — extract capitalized words
    for e in data.get("timeline", []):
        event = e.get("event", "")
        for word in re.findall(r"[A-Z][a-zA-Z]{2,}", event):
            entities.add(word.lower())

    # Collaborator names
    collab = data.get("collaboration_network", {})
    for c in collab.get("key_collaborators", []):
        cname = c.get("name", "")
        for part in cname.split():
            if len(part) > 2:
                entities.add(part.lower())

    # Conference/talk names
    conf = data.get("conferences", {})
    for t in conf.get("talks", []):
        event_name = t.get("event", "")
        if event_name:
            _add_words(event_name)

    # Quote sources
    for q in data.get("quotes", []):
        source = q.get("source", "")
        if source:
            _add_words(source)

    return entities


def test_batch_questions_reference_profile_entities(all_research_data):
    """At least 60% of questions should reference an entity from the research profile."""
    profiles = _profiles_with_questions(all_research_data)
    if not profiles:
        pytest.skip("No profiles with questions on disk")

    total = 0
    grounded = 0
    for data in profiles:
        entities = _extract_entities(data)
        if not entities:
            continue
        for q in data["questions"]:
            total += 1
            q_lower = q.get("question", "").lower()
            if any(e in q_lower for e in entities):
                grounded += 1

    if total == 0:
        pytest.skip("No questions with extractable entities")

    ratio = grounded / total
    assert ratio >= 0.6, (
        f"Only {grounded}/{total} ({ratio:.0%}) questions reference profile entities. "
        f"Expected >= 60%"
    )


def test_batch_questions_no_lazy_openers(all_research_data):
    """No questions across disk profiles should start with lazy opener patterns."""
    profiles = _profiles_with_questions(all_research_data)
    if not profiles:
        pytest.skip("No profiles with questions on disk")

    lazy_openers = [
        "tell me about", "tell us about", "what is", "what are",
        "can you explain", "can you describe",
    ]
    violations = []
    for data in profiles:
        slug = data.get("slug", "unknown")
        for i, q in enumerate(data["questions"]):
            lower = q.get("question", "").lower().strip()
            for opener in lazy_openers:
                if lower.startswith(opener):
                    violations.append(f"{slug}[{i}]: starts with '{opener}'")
                    break

    assert not violations, (
        f"Lazy opener violations:\n" + "\n".join(violations)
    )
