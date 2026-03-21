"""Structural assertions for timeline coverage span.

Validates that generated profiles have timelines that:
- span multiple years (for profiles with enough events)
- include at least one recent event (2023+)
- have non-trivial event descriptions
- include URLs on the majority of events

Usage:
    pytest tests/test_eval_timeline_coverage.py -v
"""

import json
import re
from pathlib import Path
from typing import Any

import pytest

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"


# ═══════════════════════════════════════════════════════════════════════════
# Data loader
# ═══════════════════════════════════════════════════════════════════════════

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


def _extract_year(date_str: str) -> int | None:
    """Extract a four-digit year from a date string like '2023-04' or '2024-01-15'."""
    m = re.search(r"\b(19|20)\d{2}\b", date_str)
    if m:
        return int(m.group(0))
    return None


# ═══════════════════════════════════════════════════════════════════════════
# Timeline coverage
# ═══════════════════════════════════════════════════════════════════════════

class TestTimelineCoverage:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run crew.py first")
        return p

    def test_timeline_spans_multiple_years(self):
        """For profiles with 5+ timeline events, the span between the first
        and last event must be >= 2 years."""
        for p in self._profiles():
            timeline = p.get("timeline", [])
            if len(timeline) < 5:
                continue
            years = [_extract_year(e.get("date", "")) for e in timeline]
            years = [y for y in years if y is not None]
            if len(years) < 2:
                continue
            span = max(years) - min(years)
            assert span >= 2, (
                f"{p['slug']} has {len(timeline)} events but span is only "
                f"{span} year(s) ({min(years)}–{max(years)})"
            )

    def test_timeline_has_recent_event(self):
        """At least one timeline event must be from 2023 or later."""
        for p in self._profiles():
            timeline = p.get("timeline", [])
            if not timeline:
                continue
            years = [_extract_year(e.get("date", "")) for e in timeline]
            years = [y for y in years if y is not None]
            assert any(y >= 2023 for y in years), (
                f"{p['slug']} has no timeline event from 2023 or later "
                f"(years found: {sorted(set(years))})"
            )

    def test_timeline_event_descriptions_nonempty(self):
        """Every timeline event description must be >= 10 characters."""
        for p in self._profiles():
            for i, e in enumerate(p.get("timeline", [])):
                desc = e.get("event", "")
                assert isinstance(desc, str) and len(desc) >= 10, (
                    f"{p['slug']} timeline[{i}] description too short: "
                    f"{desc!r} ({len(desc)} chars)"
                )

    def test_timeline_urls_present(self):
        """At least 50% of timeline events must have a non-empty url field."""
        for p in self._profiles():
            timeline = p.get("timeline", [])
            if not timeline:
                continue
            with_url = sum(
                1 for e in timeline
                if isinstance(e.get("url", ""), str) and e["url"].strip()
            )
            ratio = with_url / len(timeline)
            assert ratio >= 0.5, (
                f"{p['slug']} only {with_url}/{len(timeline)} timeline events "
                f"have URLs ({ratio:.0%} < 50%)"
            )
