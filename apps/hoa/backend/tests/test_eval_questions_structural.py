"""Structural evaluation tests for interview questions.

Tests the schema, category balance, word count, uniqueness, and
completeness of the questions array — no LLM calls required.

Usage:
    pytest tests/test_eval_questions_structural.py -v
"""

import json
from collections import Counter
from pathlib import Path

import pytest

VALID_CATEGORIES = {"origin", "technical_depth", "philosophy", "collaboration", "future"}
MAX_QUESTION_WORDS = 45
MIN_QUESTION_WORDS = 8
EXPECTED_COUNT = 10
EXPECTED_PER_CATEGORY = 2


# ═══════════════════════════════════════════════════════════════════════════
# Sample data tests
# ═══════════════════════════════════════════════════════════════════════════


def test_questions_count(sample_questions):
    """Must have exactly 10 questions."""
    assert len(sample_questions) == EXPECTED_COUNT, (
        f"Expected {EXPECTED_COUNT} questions, got {len(sample_questions)}"
    )


def test_questions_required_keys(sample_questions):
    """Each question must have category and question fields."""
    for i, q in enumerate(sample_questions):
        assert "category" in q, f"Question {i} missing 'category'"
        assert "question" in q, f"Question {i} missing 'question'"
        assert q["question"].strip(), f"Question {i} has empty question text"


def test_questions_enrichment_keys(sample_questions):
    """Each question should have why_this_question and expected_insight fields."""
    for i, q in enumerate(sample_questions):
        assert "why_this_question" in q, f"Question {i} missing 'why_this_question'"
        assert "expected_insight" in q, f"Question {i} missing 'expected_insight'"
        assert q["why_this_question"].strip(), f"Question {i} has empty why_this_question"
        assert q["expected_insight"].strip(), f"Question {i} has empty expected_insight"


def test_questions_valid_categories(sample_questions):
    """All categories must be from the valid set."""
    for i, q in enumerate(sample_questions):
        assert q["category"] in VALID_CATEGORIES, (
            f"Question {i} has invalid category '{q['category']}'. "
            f"Valid: {VALID_CATEGORIES}"
        )


def test_questions_category_balance(sample_questions):
    """Each category should have exactly 2 questions."""
    counts = Counter(q["category"] for q in sample_questions)
    for cat in VALID_CATEGORIES:
        assert counts.get(cat, 0) == EXPECTED_PER_CATEGORY, (
            f"Category '{cat}' has {counts.get(cat, 0)} questions, "
            f"expected {EXPECTED_PER_CATEGORY}. Distribution: {dict(counts)}"
        )


def test_questions_all_categories_present(sample_questions):
    """All 5 categories must be represented."""
    present = {q["category"] for q in sample_questions}
    missing = VALID_CATEGORIES - present
    assert not missing, f"Missing categories: {missing}"


def test_questions_word_count(sample_questions):
    """Each question must be between {MIN_QUESTION_WORDS} and {MAX_QUESTION_WORDS} words."""
    for i, q in enumerate(sample_questions):
        wc = len(q["question"].split())
        assert wc >= MIN_QUESTION_WORDS, (
            f"Question {i} too short ({wc} words): {q['question'][:60]}..."
        )
        assert wc <= MAX_QUESTION_WORDS, (
            f"Question {i} too long ({wc} words, max {MAX_QUESTION_WORDS}): {q['question'][:60]}..."
        )


def test_questions_no_duplicates(sample_questions):
    """No two questions should be identical."""
    texts = [q["question"].strip().lower() for q in sample_questions]
    seen = set()
    for i, t in enumerate(texts):
        assert t not in seen, f"Duplicate question at index {i}: {t[:60]}..."
        seen.add(t)


def test_questions_end_with_question_mark(sample_questions):
    """Each question should end with a question mark."""
    for i, q in enumerate(sample_questions):
        assert q["question"].strip().endswith("?"), (
            f"Question {i} doesn't end with '?': ...{q['question'][-30:]}"
        )


def test_questions_no_follow_up_patterns(sample_questions):
    """Questions should be standalone — no 'building on' or 'following up' patterns."""
    follow_up_phrases = [
        "building on", "following up", "as a follow-up",
        "related to the previous", "going back to",
        "you mentioned earlier", "as we discussed",
    ]
    for i, q in enumerate(sample_questions):
        lower = q["question"].lower()
        for phrase in follow_up_phrases:
            assert phrase not in lower, (
                f"Question {i} contains follow-up pattern '{phrase}': {q['question'][:60]}..."
            )


def test_questions_no_lazy_openers(sample_questions):
    """Questions should not start with lazy patterns like 'Tell me about' or 'What is'."""
    lazy_openers = [
        "tell me about", "tell us about", "what is", "what are",
        "can you explain", "can you describe", "could you tell",
        "describe your", "explain your",
    ]
    for i, q in enumerate(sample_questions):
        lower = q["question"].lower().strip()
        for opener in lazy_openers:
            assert not lower.startswith(opener), (
                f"Question {i} starts with lazy opener '{opener}': {q['question'][:60]}..."
            )


# ═══════════════════════════════════════════════════════════════════════════
# Disk data tests — run against all generated research files
# ═══════════════════════════════════════════════════════════════════════════


def test_disk_questions_schema(all_research_data):
    """All on-disk research files with questions should have valid schema."""
    if not all_research_data:
        pytest.skip("No research files on disk")

    files_with_questions = [d for d in all_research_data if d.get("questions")]
    if not files_with_questions:
        pytest.skip("No research files have questions populated")

    for data in files_with_questions:
        slug = data.get("slug", "unknown")
        qs = data["questions"]
        assert isinstance(qs, list), f"{slug}: questions is not a list"
        for i, q in enumerate(qs):
            assert isinstance(q, dict), f"{slug}: question {i} is not a dict"
            assert "category" in q, f"{slug}: question {i} missing category"
            assert "question" in q, f"{slug}: question {i} missing question"
            assert q["question"].strip(), f"{slug}: question {i} has empty text"


def test_disk_questions_no_duplicates_within_profile(all_research_data):
    """Within a single profile, no two questions should be identical."""
    if not all_research_data:
        pytest.skip("No research files on disk")

    for data in all_research_data:
        qs = data.get("questions", [])
        if len(qs) < 2:
            continue
        slug = data.get("slug", "unknown")
        texts = [q.get("question", "").strip().lower() for q in qs]
        assert len(texts) == len(set(texts)), (
            f"{slug}: duplicate questions found"
        )


def test_disk_questions_categories_valid(all_research_data):
    """On-disk questions should use valid category names (old or new format)."""
    if not all_research_data:
        pytest.skip("No research files on disk")

    # Accept both old-style and new-style categories for backward compat
    valid_old = {"origin", "technical depth", "philosophy & contrarian views",
                 "collaboration & ecosystem", "future & predictions"}
    valid_new = VALID_CATEGORIES
    valid_all = valid_old | valid_new

    for data in all_research_data:
        slug = data.get("slug", "unknown")
        for i, q in enumerate(data.get("questions", [])):
            cat = q.get("category", "")
            assert cat in valid_all, (
                f"{slug}: question {i} has unknown category '{cat}'"
            )
