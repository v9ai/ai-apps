"""Tests for _extract_json helper in crew.py."""

import pytest

from crew import _extract_json


# ── 1. Pure JSON array ─────────────────────────────────────────────────────

def test_pure_json_array():
    text = '[{"name": "Alice"}, {"name": "Bob"}]'
    result = _extract_json(text)
    assert result == [{"name": "Alice"}, {"name": "Bob"}]


# ── 2. Pure JSON object ───────────────────────────────────────────────────

def test_pure_json_object():
    text = '{"key": "value", "count": 42}'
    result = _extract_json(text)
    assert result == {"key": "value", "count": 42}


# ── 3. JSON inside markdown ```json code fence ─────────────────────────────

def test_json_in_json_code_fence():
    text = (
        "Here are the results:\n"
        "```json\n"
        '[{"date": "2024-01", "event": "Launch"}]\n'
        "```\n"
        "That's all."
    )
    result = _extract_json(text)
    assert result == [{"date": "2024-01", "event": "Launch"}]


# ── 4. JSON inside generic ``` code fence ──────────────────────────────────

def test_json_in_generic_code_fence():
    text = (
        "Output:\n"
        "```\n"
        '{"status": "ok", "items": [1, 2, 3]}\n'
        "```"
    )
    result = _extract_json(text)
    assert result == {"status": "ok", "items": [1, 2, 3]}


# ── 5. JSON mixed with surrounding prose ──────────────────────────────────

def test_json_with_surrounding_text():
    text = (
        "Based on my research, here is the timeline:\n\n"
        '[{"date": "2023-06", "event": "Founded company"}]\n\n'
        "I hope this helps!"
    )
    result = _extract_json(text)
    assert result == [{"date": "2023-06", "event": "Founded company"}]


# ── 6. Nested JSON objects ─────────────────────────────────────────────────

def test_nested_json():
    text = '{"outer": {"inner": {"deep": [1, 2, 3]}}}'
    result = _extract_json(text)
    assert result == {"outer": {"inner": {"deep": [1, 2, 3]}}}


# ── 7. Empty input ────────────────────────────────────────────────────────

def test_empty_string():
    assert _extract_json("") is None


def test_whitespace_only():
    assert _extract_json("   \n\t  ") is None


# ── 8. No JSON present → returns None ─────────────────────────────────────

def test_no_json_plain_text():
    assert _extract_json("This is just plain text with no JSON at all.") is None


def test_no_json_markdown():
    text = "# Heading\n\nSome paragraph without any JSON structures."
    assert _extract_json(text) is None


# ── 9. Malformed JSON → returns None ──────────────────────────────────────

def test_malformed_json_missing_quotes():
    text = '{key: "value"}'
    assert _extract_json(text) is None


def test_malformed_json_trailing_comma():
    text = '{"a": 1, "b": 2,}'
    assert _extract_json(text) is None


def test_malformed_json_in_code_fence():
    text = "```json\n{broken: [1, 2,}\n```"
    assert _extract_json(text) is None


# ── 10. Multiple JSON blocks (first wins) ─────────────────────────────────

def test_multiple_json_blocks_first_wins():
    text = (
        "```json\n"
        '["first", "block"]\n'
        "```\n"
        "And also:\n"
        "```json\n"
        '["second", "block"]\n'
        "```"
    )
    result = _extract_json(text)
    assert result == ["first", "block"]


def test_multiple_inline_json_first_wins():
    text = (
        'Here is array one: [1, 2, 3] and here is array two: [4, 5, 6]'
    )
    result = _extract_json(text)
    assert result == [1, 2, 3]


# ── 11. JSON with unicode characters ──────────────────────────────────────

def test_unicode_characters():
    text = '{"name": "Rene Descartes", "motto": "Cogito ergo sum"}'
    result = _extract_json(text)
    assert result == {"name": "Rene Descartes", "motto": "Cogito ergo sum"}


def test_unicode_cjk():
    text = '[{"speaker": "Zhang Wei", "text": "Hello World"}]'
    result = _extract_json(text)
    assert isinstance(result, list)
    assert result[0]["speaker"] == "Zhang Wei"


def test_unicode_emoji():
    text = '{"reaction": "\u2764\ufe0f", "count": 5}'
    result = _extract_json(text)
    assert result == {"reaction": "\u2764\ufe0f", "count": 5}


# ── 12. JSON with escaped quotes ──────────────────────────────────────────

def test_escaped_quotes_in_value():
    text = '{"quote": "He said \\"hello\\" to everyone"}'
    result = _extract_json(text)
    assert result == {"quote": 'He said "hello" to everyone'}


def test_escaped_quotes_in_array():
    text = '["She replied: \\"thank you\\"", "normal string"]'
    result = _extract_json(text)
    assert result == ['She replied: "thank you"', "normal string"]


def test_escaped_quotes_in_code_fence():
    text = (
        "```json\n"
        '{"text": "The \\"Attention Is All You Need\\" paper"}\n'
        "```"
    )
    result = _extract_json(text)
    assert result == {"text": 'The "Attention Is All You Need" paper'}
