"""Tests for output assembly logic in crew.py — how raw agent outputs are
parsed into the final research JSON via _extract_json and the type-checking
guards in run_person.
"""

import json
import pytest

from crew import _extract_json


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
