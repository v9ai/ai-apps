"""Regression tests for edge cases where agent outputs might be empty or malformed.

Covers _extract_json robustness against empty strings, whitespace, truncated JSON,
nested code fences, multiple JSON blocks, multiline JSON, agent preambles,
trailing commentary, and large payloads.
"""

import json
import pytest

from research_pipeline import _extract_json


# ── 1. Empty string ─────────────────────────────────────────────────────

def test_empty_string_extract():
    """_extract_json('') returns None."""
    assert _extract_json("") is None


# ── 2. Whitespace only ──────────────────────────────────────────────────

def test_whitespace_only():
    """_extract_json('   ') returns None."""
    assert _extract_json("   ") is None


# ── 3. Plain text without JSON ──────────────────────────────────────────

def test_no_json_in_text():
    """_extract_json on plain prose returns None."""
    assert _extract_json("Just some text without JSON") is None


# ── 4. Truncated / incomplete JSON ──────────────────────────────────────

def test_truncated_json():
    """Incomplete JSON like '{"key": "val' returns None."""
    assert _extract_json('{"key": "val') is None


# ── 5. Nested code fences ───────────────────────────────────────────────

def test_nested_code_fences():
    """Handles nested ``` blocks and still extracts the JSON."""
    text = (
        "Some explanation:\n"
        "```json\n"
        '[{"date": "2024-01", "event": "Launch"}]\n'
        "```\n"
        "And then more text with another fence:\n"
        "```\n"
        "not json\n"
        "```"
    )
    result = _extract_json(text)
    assert result is not None
    assert isinstance(result, list)
    assert result[0]["date"] == "2024-01"
    assert result[0]["event"] == "Launch"


# ── 6. Multiple JSON blocks — first valid wins ─────────────────────────

def test_multiple_json_blocks():
    """When multiple JSON blocks exist, the first valid one is returned."""
    text = (
        '```json\n'
        '{"winner": true}\n'
        '```\n'
        'Some commentary.\n'
        '```json\n'
        '{"winner": false}\n'
        '```'
    )
    result = _extract_json(text)
    assert result is not None
    assert result["winner"] is True


# ── 7. JSON with newlines (multiline) ──────────────────────────────────

def test_json_with_newlines():
    """Handles JSON spread across multiple lines."""
    text = '[\n  {\n    "name": "Alice",\n    "age": 30\n  },\n  {\n    "name": "Bob",\n    "age": 25\n  }\n]'
    result = _extract_json(text)
    assert result is not None
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["name"] == "Alice"
    assert result[1]["name"] == "Bob"


# ── 8. JSON after agent preamble ────────────────────────────────────────

def test_json_after_agent_preamble():
    """Handles 'Here is the result:\\n```json\\n[...]\\n```' pattern."""
    text = (
        "Here is the result:\n"
        "```json\n"
        '[{"show": "Lex Fridman", "title": "Episode 400", "date": "2025-01"}]\n'
        "```"
    )
    result = _extract_json(text)
    assert result is not None
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["show"] == "Lex Fridman"
    assert result[0]["date"] == "2025-01"


# ── 9. JSON with trailing text / commentary ─────────────────────────────

def test_json_with_trailing_text():
    """Handles JSON followed by commentary text."""
    text = (
        '{"market_position": "leader", "moats": ["first-mover"]}\n\n'
        "Note: The above analysis is based on publicly available data. "
        "Additional research may be needed for a complete picture."
    )
    result = _extract_json(text)
    assert result is not None
    assert isinstance(result, dict)
    assert result["market_position"] == "leader"
    assert result["moats"] == ["first-mover"]


# ── 10. Extremely large JSON (100 items) ────────────────────────────────

def test_extremely_large_json():
    """Handles a valid JSON array with 100 items."""
    items = [
        {"date": f"2024-{(i % 12) + 1:02d}", "event": f"Event number {i}", "url": f"https://example.com/{i}"}
        for i in range(100)
    ]
    text = json.dumps(items)
    result = _extract_json(text)
    assert result is not None
    assert isinstance(result, list)
    assert len(result) == 100
    assert result[0]["event"] == "Event number 0"
    assert result[99]["event"] == "Event number 99"
