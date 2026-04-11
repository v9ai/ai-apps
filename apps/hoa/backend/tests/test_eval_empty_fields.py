"""Edge-case tests for empty / missing field handling in research profiles.

Pure structural assertions — no LLM judge, no network calls.

Usage:
    pytest tests/test_eval_empty_fields.py -v
"""

import json
import re
from pathlib import Path
from typing import Any

import pytest

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"

REQUIRED_FIELDS = {
    "slug", "name", "bio", "topics",
    "timeline", "key_contributions", "quotes", "social", "sources",
}

NULL_STRINGS = {"null", "none", "undefined", "n/a"}

# ISO 8601 — accepts both offset (+00:00 / Z) and naive datetime variants
ISO8601_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}"           # date
    r"[T ]\d{2}:\d{2}:\d{2}"        # time
    r"(\.\d+)?"                      # optional fractional seconds
    r"(Z|[+-]\d{2}:\d{2})?$"        # optional timezone
)


def _load_profiles() -> list[dict[str, Any]]:
    profiles: list[dict[str, Any]] = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data and "bio" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


class TestEmptyFieldHandling:
    """Verify that empty collections are proper types, never None or missing."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    # 1
    def test_empty_arrays_are_valid(self):
        """timeline, key_contributions, quotes, sources — when empty must be [], not None or missing."""
        array_fields = ("timeline", "key_contributions", "quotes", "sources")
        for p in self._profiles():
            for field in array_fields:
                assert field in p, f"{p['slug']} missing field '{field}'"
                val = p[field]
                assert isinstance(val, list), (
                    f"{p['slug']}.{field} should be list, got {type(val).__name__}: {val!r}"
                )

    # 2
    def test_empty_social_is_dict(self):
        """social must be {} (dict) when empty, not None or missing."""
        for p in self._profiles():
            assert "social" in p, f"{p['slug']} missing 'social'"
            val = p["social"]
            assert isinstance(val, dict), (
                f"{p['slug']}.social should be dict, got {type(val).__name__}: {val!r}"
            )

    # 3
    def test_no_none_values_in_required(self):
        """None of the required fields may have Python None as their value."""
        for p in self._profiles():
            for field in REQUIRED_FIELDS:
                assert p.get(field) is not None, (
                    f"{p.get('slug', '?')}.{field} is None"
                )

    # 4
    def test_no_null_strings(self):
        """slug, name, bio must not be the literal strings 'null', 'None', 'undefined', or 'N/A'."""
        text_fields = ("slug", "name", "bio")
        for p in self._profiles():
            for field in text_fields:
                val = p.get(field, "")
                assert str(val).strip().lower() not in NULL_STRINGS, (
                    f"{p.get('slug', '?')}.{field} is a null-string: {val!r}"
                )

    # 5
    def test_generated_at_is_iso_format(self):
        """generated_at must match ISO 8601 datetime format."""
        for p in self._profiles():
            ts = p.get("generated_at", "")
            assert isinstance(ts, str) and ISO8601_RE.match(ts), (
                f"{p['slug']}.generated_at is not ISO 8601: {ts!r}"
            )

    # 6
    def test_topics_no_empty_strings(self):
        """No topic in the topics array should be an empty string."""
        for p in self._profiles():
            for i, topic in enumerate(p.get("topics", [])):
                assert isinstance(topic, str) and topic.strip() != "", (
                    f"{p['slug']}.topics[{i}] is empty or not a string: {topic!r}"
                )

    # 7
    def test_timeline_no_empty_events(self):
        """No timeline event should have an empty date or empty event string."""
        for p in self._profiles():
            for i, entry in enumerate(p.get("timeline", [])):
                date = entry.get("date", "")
                event = entry.get("event", "")
                assert isinstance(date, str) and date.strip() != "", (
                    f"{p['slug']}.timeline[{i}].date is empty: {date!r}"
                )
                assert isinstance(event, str) and event.strip() != "", (
                    f"{p['slug']}.timeline[{i}].event is empty: {event!r}"
                )
