"""Research grounding tests for interview questions.

Verifies that questions reference specific entities from the research
profile — project names, people, organizations, and topics. Runs against
the sample fixture data (no disk files needed).

Usage:
    pytest tests/test_eval_questions_grounding.py -v
"""

import re

import pytest


def _significant_entities(research: dict) -> set[str]:
    """Extract significant named entities from a research profile."""
    entities = set()

    # Person name parts
    for part in research.get("name", "").split():
        if len(part) > 2:
            entities.add(part.lower())

    # Contribution titles — individual words
    for c in research.get("key_contributions", []):
        for word in re.findall(r"[A-Z][a-zA-Z]{2,}", c.get("title", "")):
            entities.add(word.lower())

    # Topics — individual words 4+ chars
    stop = {"the", "and", "for", "with", "from", "that", "this"}
    for t in research.get("topics", []):
        if isinstance(t, str):
            for word in re.findall(r"[A-Za-z]{4,}", t):
                low = word.lower()
                if low not in stop:
                    entities.add(low)

    # Organization from executive summary
    exec_sum = research.get("executive_summary", {})
    if isinstance(exec_sum, dict):
        for fact in exec_sum.get("key_facts", []):
            for word in re.findall(r"[A-Z][a-zA-Z]{2,}", fact):
                entities.add(word.lower())

    # Collaborators
    collab = research.get("collaboration_network", {})
    if isinstance(collab, dict):
        for c in collab.get("key_collaborators", []):
            for part in c.get("name", "").split():
                if len(part) > 2:
                    entities.add(part.lower())
        for cf in collab.get("co_founders", []):
            for part in cf.split():
                if len(part) > 2:
                    entities.add(part.lower())

    # Competitor names
    comp = research.get("competitive_landscape", {})
    if isinstance(comp, dict):
        for c in comp.get("competitors", []):
            for word in re.findall(r"[A-Z][a-zA-Z]{2,}", c.get("name", "")):
                entities.add(word.lower())

    # Timeline events
    for e in research.get("timeline", []):
        for word in re.findall(r"[A-Z][a-zA-Z]{2,}", e.get("event", "")):
            entities.add(word.lower())

    return entities


def test_majority_questions_grounded_in_research(sample_questions, sample_research):
    """At least 70% of questions should reference a specific entity from the research."""
    entities = _significant_entities(sample_research)
    assert entities, "No entities extracted from sample research"

    grounded = 0
    details = []
    for q in sample_questions:
        q_lower = q["question"].lower()
        matches = [e for e in entities if e in q_lower]
        if matches:
            grounded += 1
            details.append(f"  [grounded] {q['question'][:50]}... -> {matches[:3]}")
        else:
            details.append(f"  [ungrounded] {q['question'][:50]}...")

    ratio = grounded / len(sample_questions) if sample_questions else 0
    assert ratio >= 0.7, (
        f"Only {grounded}/{len(sample_questions)} ({ratio:.0%}) questions are grounded. "
        f"Expected >= 70%.\n" + "\n".join(details)
    )


def test_each_category_has_grounded_question(sample_questions, sample_research):
    """Each category should have at least one question grounded in research."""
    entities = _significant_entities(sample_research)
    categories = {q["category"] for q in sample_questions}

    ungrounded_cats = []
    for cat in categories:
        cat_questions = [q for q in sample_questions if q["category"] == cat]
        has_grounded = any(
            any(e in q["question"].lower() for e in entities)
            for q in cat_questions
        )
        if not has_grounded:
            ungrounded_cats.append(cat)

    assert not ungrounded_cats, (
        f"Categories with no grounded questions: {ungrounded_cats}"
    )


def test_questions_reference_different_entities(sample_questions, sample_research):
    """Questions should collectively reference at least 4 different entities."""
    entities = _significant_entities(sample_research)

    referenced = set()
    for q in sample_questions:
        q_lower = q["question"].lower()
        for e in entities:
            if e in q_lower:
                referenced.add(e)

    # Filter out name parts (too common) to count distinct project/topic references
    name_parts = {p.lower() for p in sample_research.get("name", "").split() if len(p) > 2}
    non_name_refs = referenced - name_parts

    assert len(non_name_refs) >= 4, (
        f"Questions only reference {len(non_name_refs)} distinct non-name entities: "
        f"{sorted(non_name_refs)}. Expected >= 4."
    )


def test_questions_dont_just_namecheck(sample_questions, sample_research):
    """Questions should do more than just mention a project name — they should probe it."""
    probe_patterns = [
        r"\bwhy\b", r"\bhow\b", r"\bwhat\b", r"\bwhich\b", r"\bwhere\b",
        r"trade-?off", r"decision", r"chose", r"bet", r"risk",
        r"failure", r"mistake", r"challenge", r"tension", r"disagree",
    ]

    shallow = []
    for i, q in enumerate(sample_questions):
        q_lower = q["question"].lower()
        has_probe = any(re.search(p, q_lower) for p in probe_patterns)
        if not has_probe:
            shallow.append(f"  [{i}] {q['question'][:60]}...")

    # Allow at most 2 questions without probing language
    assert len(shallow) <= 2, (
        f"{len(shallow)} questions lack probing language:\n" + "\n".join(shallow)
    )
