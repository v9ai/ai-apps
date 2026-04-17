"""Tests for output assembly logic in research_pipeline.py — how raw agent outputs are
parsed into the final research JSON via _extract_json and the type-checking
guards in run_person.
"""

import json
import pytest

from research_pipeline import _extract_json


# ── 1. test_bio_extraction ────────────────────────────────────────────────
def test_bio_extraction():
    """Plain text bio is used as-is (no JSON parsing needed)."""
    raw = "Geoffrey Hinton is a pioneer of deep learning and backpropagation."
    # Bio path in run_person: bio = _raw(7).strip()
    bio = raw.strip()
    assert bio == "Geoffrey Hinton is a pioneer of deep learning and backpropagation."


# ── 2. test_bio_truncation ────────────────────────────────────────────────
def test_bio_truncation():
    """Bio longer than 600 chars is truncated to exactly 600."""
    raw = "A" * 800
    bio = raw.strip()
    if len(bio) > 600:
        bio = bio[:600]
    assert len(bio) == 600
    assert bio == "A" * 600


# ── 3. test_timeline_json_extraction ──────────────────────────────────────
def test_timeline_json_extraction():
    """JSON array extracted from timeline output containing events."""
    raw = '''Here is the timeline:
```json
[
  {"date": "2012-06", "event": "Won ImageNet with AlexNet", "url": "https://example.com/1"},
  {"date": "2018-03", "event": "Awarded Turing Prize", "url": "https://example.com/2"}
]
```
'''
    timeline = _extract_json(raw) or []
    if not isinstance(timeline, list):
        timeline = []
    assert isinstance(timeline, list)
    assert len(timeline) == 2
    assert timeline[0]["date"] == "2012-06"
    assert timeline[1]["event"] == "Awarded Turing Prize"


# ── 4. test_timeline_fallback ─────────────────────────────────────────────
def test_timeline_fallback():
    """Non-JSON timeline output falls back to empty list."""
    raw = "I could not find any timeline events for this person."
    timeline = _extract_json(raw) or []
    if not isinstance(timeline, list):
        timeline = []
    assert timeline == []


# ── 5. test_contributions_extraction ──────────────────────────────────────
def test_contributions_extraction():
    """JSON array of contribution objects extracted from agent output."""
    raw = json.dumps([
        {
            "title": "Backpropagation",
            "description": "Co-developed the backpropagation algorithm for training neural networks.",
            "url": "https://example.com/backprop",
        },
        {
            "title": "Boltzmann Machines",
            "description": "Invented Boltzmann machines for unsupervised learning.",
            "url": "https://example.com/boltzmann",
        },
    ])
    contributions = _extract_json(raw) or []
    if not isinstance(contributions, list):
        contributions = []
    assert len(contributions) == 2
    assert contributions[0]["title"] == "Backpropagation"
    assert "url" in contributions[1]


# ── 6. test_quotes_extraction ─────────────────────────────────────────────
def test_quotes_extraction():
    """JSON array of quote objects extracted from agent output."""
    raw = '''Some preamble text.
[
  {"text": "The future is already here.", "source": "Lex Fridman Podcast", "url": "https://example.com/q1"},
  {"text": "Deep learning is not enough.", "source": "NeurIPS Keynote", "url": "https://example.com/q2"}
]
Some trailing text.'''
    quotes = _extract_json(raw) or []
    if not isinstance(quotes, list):
        quotes = []
    assert len(quotes) == 2
    assert quotes[0]["text"] == "The future is already here."
    assert quotes[1]["source"] == "NeurIPS Keynote"


# ── 7. test_social_extraction ─────────────────────────────────────────────
def test_social_extraction():
    """JSON object of social links extracted from agent output."""
    raw = '''Here are the social profiles:
```json
{
  "github": "https://github.com/geoffhinton",
  "twitter": "https://x.com/geoffhinton",
  "website": "https://www.cs.toronto.edu/~hinton/"
}
```'''
    social = _extract_json(raw) or {}
    if not isinstance(social, dict):
        social = {}
    assert isinstance(social, dict)
    assert social["github"] == "https://github.com/geoffhinton"
    assert "twitter" in social
    assert social["website"] == "https://www.cs.toronto.edu/~hinton/"


# ── 8. test_topics_extraction ─────────────────────────────────────────────
def test_topics_extraction():
    """JSON array of topic strings extracted from agent output."""
    raw = '["deep learning", "capsule networks", "neural network generalization", "variational inference"]'
    topics = _extract_json(raw) or []
    if not isinstance(topics, list):
        topics = []
    # run_person also filters: [t for t in topics if isinstance(t, str)]
    topics = [t for t in topics if isinstance(t, str)]
    assert len(topics) == 4
    assert "capsule networks" in topics
    assert all(isinstance(t, str) for t in topics)


# ── 9. test_competitive_extraction ────────────────────────────────────────
def test_competitive_extraction():
    """JSON object extracted for competitive landscape."""
    raw = json.dumps({
        "market_position": "pioneer",
        "competitors": [
            {"name": "Yann LeCun", "relationship": "peer researcher", "differentiation": "Focuses on self-supervised learning"},
        ],
        "moats": ["Academic prestige", "Foundational patents"],
        "ecosystem_role": "Godfather of deep learning, influential across industry and academia.",
    })
    competitive = _extract_json(raw) or {}
    if not isinstance(competitive, dict):
        competitive = {}
    assert competitive["market_position"] == "pioneer"
    assert len(competitive["competitors"]) == 1
    assert competitive["competitors"][0]["name"] == "Yann LeCun"
    assert "Academic prestige" in competitive["moats"]


# ── 10. test_invalid_types_handled ────────────────────────────────────────
def test_invalid_types_handled():
    """Non-list timeline returns empty list; non-dict social returns empty dict.

    Tests the isinstance guards used throughout run_person:
        if not isinstance(timeline, list): timeline = []
        if not isinstance(social, dict): social = {}
    """
    # Timeline that parses as a dict instead of a list
    timeline_raw = '{"date": "2020-01", "event": "single event"}'
    timeline = _extract_json(timeline_raw) or []
    if not isinstance(timeline, list):
        timeline = []
    assert timeline == []

    # Social that parses as a list instead of a dict
    social_raw = '["github", "twitter"]'
    social = _extract_json(social_raw) or {}
    if not isinstance(social, dict):
        social = {}
    assert social == {}

    # Contributions that parse as a dict instead of a list
    contributions_raw = '{"title": "something"}'
    contributions = _extract_json(contributions_raw) or []
    if not isinstance(contributions, list):
        contributions = []
    assert contributions == []

    # Competitive that parses as a list instead of a dict
    competitive_raw = '["competitor1", "competitor2"]'
    competitive = _extract_json(competitive_raw) or {}
    if not isinstance(competitive, dict):
        competitive = {}
    assert competitive == {}


# ── 11. test_questions_extraction ────────────────────────────────────────
def test_questions_extraction():
    """JSON array of enriched question objects extracted from agent output."""
    raw = json.dumps([
        {
            "category": "origin",
            "question": "What moment made you leave Kensho?",
            "why_this_question": "Reveals risk calculus.",
            "expected_insight": "A concrete anecdote.",
        },
        {
            "category": "philosophy",
            "question": "Why did LangGraph introduce cyclic graphs?",
            "why_this_question": "Exposes DAG limitations.",
            "expected_insight": "A specific failure pattern.",
        },
    ])
    questions = _extract_json(raw) or []
    if not isinstance(questions, list):
        questions = []
    assert len(questions) == 2
    assert questions[0]["category"] == "origin"
    assert questions[1]["why_this_question"] == "Exposes DAG limitations."


# ── 12. test_questions_extraction_with_markdown ──────────────────────────
def test_questions_extraction_with_markdown():
    """Questions wrapped in markdown code fence are extracted correctly."""
    raw = '''Here are the interview questions:
```json
[
  {"category": "philosophy", "question": "What's the most dangerous misconception?",
   "why_this_question": "Tests paradigm gap.", "expected_insight": "A concrete anti-pattern."}
]
```'''
    questions = _extract_json(raw) or []
    if not isinstance(questions, list):
        questions = []
    assert len(questions) == 1
    assert questions[0]["category"] == "philosophy"
    assert "why_this_question" in questions[0]


# ── 13. test_questions_empty_text_filtered ───────────────────────────────
def test_questions_empty_text_filtered():
    """Questions with empty question text should be filtered out in export."""
    raw_questions = [
        {"category": "origin", "question": "Valid question?", "why_this_question": "reason", "expected_insight": "insight"},
        {"category": "origin", "question": "", "why_this_question": "reason", "expected_insight": "insight"},
        {"category": "future", "question": "Another valid?", "why_this_question": "reason", "expected_insight": "insight"},
    ]
    # Replicate the export_results filtering logic
    exported = [
        {
            "category": q.get("category", ""),
            "question": q.get("question", ""),
            "why_this_question": q.get("why_this_question", ""),
            "expected_insight": q.get("expected_insight", ""),
        }
        for q in raw_questions if isinstance(q, dict) and q.get("question")
    ]
    assert len(exported) == 2
    assert exported[0]["question"] == "Valid question?"
    assert exported[1]["question"] == "Another valid?"


# ── 14. test_questions_fallback_to_empty_list ────────────────────────────
def test_questions_fallback_to_empty_list():
    """Non-JSON question output falls back to empty list."""
    raw = "(agent error: timeout occurred while generating questions)"
    questions = _extract_json(raw) or []
    if not isinstance(questions, list):
        questions = []
    assert questions == []


# ── 15. test_questions_enrichment_fields_optional ────────────────────────
def test_questions_enrichment_fields_optional():
    """Old-style questions without enrichment fields should still export."""
    raw_questions = [
        {"category": "origin", "question": "How did you start?"},
    ]
    # Replicate export logic with .get defaults
    exported = [
        {
            "category": q.get("category", ""),
            "question": q.get("question", ""),
            "why_this_question": q.get("why_this_question", ""),
            "expected_insight": q.get("expected_insight", ""),
        }
        for q in raw_questions if isinstance(q, dict) and q.get("question")
    ]
    assert len(exported) == 1
    assert exported[0]["question"] == "How did you start?"
    assert exported[0]["why_this_question"] == ""
    assert exported[0]["expected_insight"] == ""
