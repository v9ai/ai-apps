"""Tests for the test helpers module itself."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from helpers import (
    validate_json_array,
    validate_json_object,
    has_required_keys,
    has_valid_urls,
    bio_word_count,
    timeline_is_chronological,
    make_test_case_input,
)


# ── validate_json_array ─────────────────────────────────────────────────


def test_validate_json_array_pure():
    raw = '[{"name": "Alice"}, {"name": "Bob"}]'
    result = validate_json_array(raw)
    assert len(result) == 2
    assert result[0]["name"] == "Alice"
    assert result[1]["name"] == "Bob"


def test_validate_json_array_fenced():
    raw = '```json\n[{"id": 1}, {"id": 2}, {"id": 3}]\n```'
    result = validate_json_array(raw)
    assert len(result) == 3
    assert result[2]["id"] == 3


def test_validate_json_array_mixed():
    raw = 'Here is the result:\n[{"key": "value"}]\nDone.'
    result = validate_json_array(raw)
    assert len(result) == 1
    assert result[0]["key"] == "value"


def test_validate_json_array_invalid():
    raw = "this is not json at all"
    result = validate_json_array(raw)
    assert result == []


# ── validate_json_object ─────────────────────────────────────────────────


def test_validate_json_object_pure():
    raw = '{"name": "Alice", "age": 30}'
    result = validate_json_object(raw)
    assert result["name"] == "Alice"
    assert result["age"] == 30


def test_validate_json_object_fenced():
    raw = '```json\n{"status": "ok", "count": 5}\n```'
    result = validate_json_object(raw)
    assert result["status"] == "ok"
    assert result["count"] == 5


def test_validate_json_object_invalid():
    raw = "no json here, sorry"
    result = validate_json_object(raw)
    assert result == {}


# ── has_required_keys ────────────────────────────────────────────────────


def test_has_required_keys_all_present():
    data = {"name": "Alice", "role": "CEO", "org": "Acme"}
    missing = has_required_keys(data, ["name", "role", "org"])
    assert missing == []


def test_has_required_keys_missing():
    data = {"name": "Alice"}
    missing = has_required_keys(data, ["name", "role", "org"])
    assert sorted(missing) == ["org", "role"]


# ── has_valid_urls ───────────────────────────────────────────────────────


def test_has_valid_urls_counts():
    items = [
        {"url": "https://example.com"},
        {"url": "http://example.org/page"},
        {"url": "ftp://not-valid.com"},
        {"url": ""},
        {},
    ]
    total, valid = has_valid_urls(items)
    assert total == 3
    assert valid == 2


# ── bio_word_count ───────────────────────────────────────────────────────


def test_bio_word_count():
    assert bio_word_count("Alice is a software engineer at Acme Corp") == 8
    assert bio_word_count("") == 0
    assert bio_word_count("one") == 1


# ── timeline_is_chronological ───────────────────────────────────────────


def test_timeline_chronological():
    sorted_events = [
        {"date": "2020-01-01", "event": "founded"},
        {"date": "2021-06-15", "event": "series A"},
        {"date": "2023-03-10", "event": "IPO"},
    ]
    assert timeline_is_chronological(sorted_events) is True

    unsorted_events = [
        {"date": "2023-03-10", "event": "IPO"},
        {"date": "2020-01-01", "event": "founded"},
        {"date": "2021-06-15", "event": "series A"},
    ]
    assert timeline_is_chronological(unsorted_events) is False
