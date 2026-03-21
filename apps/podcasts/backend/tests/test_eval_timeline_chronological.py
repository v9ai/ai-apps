"""Structural evaluation: timeline chronological ordering.

Pure assertions — no LLM / G-Eval needed.

Usage:
    pytest tests/test_eval_timeline_chronological.py -v
"""

import json
import re
from pathlib import Path
from typing import Any

import pytest

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"


def _load_profiles() -> list[dict[str, Any]]:
    profiles = []
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


def _profiles_with_timeline() -> list[dict[str, Any]]:
    """Return only profiles that have a non-empty timeline list."""
    return [p for p in _load_profiles() if p.get("timeline")]


# ═══════════════════════════════════════════════════════════════════════════
# Timeline chronological ordering
# ═══════════════════════════════════════════════════════════════════════════

DATE_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
CURRENT_MONTH = "2026-03"


class TestTimelineChronological:
    def _profiles(self):
        p = _profiles_with_timeline()
        if not p:
            pytest.skip("No profiles with timeline — run crew.py first")
        return p

    def test_timeline_dates_ascending(self):
        """For each profile, parse timeline dates (YYYY-MM) and assert ascending order."""
        for p in self._profiles():
            dates = [e["date"] for e in p["timeline"] if "date" in e]
            if len(dates) < 2:
                continue
            for i in range(len(dates) - 1):
                assert dates[i] <= dates[i + 1], (
                    f"{p['slug']}: timeline not ascending — "
                    f"'{dates[i]}' comes before '{dates[i + 1]}' at index {i}"
                )

    def test_timeline_dates_valid_format(self):
        """Assert every timeline date matches YYYY-MM format."""
        for p in self._profiles():
            for e in p["timeline"]:
                date = e.get("date", "")
                assert DATE_RE.match(date), (
                    f"{p['slug']}: invalid date format '{date}' — "
                    f"expected YYYY-MM matching {DATE_RE.pattern}"
                )

    def test_timeline_no_future_dates(self):
        """Assert no timeline date is after 2026-03 (current month)."""
        for p in self._profiles():
            for e in p["timeline"]:
                date = e.get("date", "")
                if DATE_RE.match(date):
                    assert date <= CURRENT_MONTH, (
                        f"{p['slug']}: future date '{date}' > '{CURRENT_MONTH}'"
                    )

    def test_timeline_minimum_events(self):
        """Assert profiles with timeline have at least 3 events."""
        for p in self._profiles():
            count = len(p["timeline"])
            assert count >= 3, (
                f"{p['slug']}: only {count} timeline event(s), expected >= 3"
            )
