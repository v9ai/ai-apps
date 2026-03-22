"""Statistical tests for bio length distribution across all research profiles.

Pure structural assertions — no G-Eval / LLM-as-judge needed.

Usage:
    pytest tests/test_eval_bio_length_stats.py -v
"""

import json
import statistics
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


class TestBioLengthStats:
    """Statistical tests for bio length distribution."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_bio_min_length(self):
        """Assert every bio >= 100 chars."""
        for p in self._profiles():
            bio = p.get("bio", "")
            assert len(bio) >= 100, (
                f"{p['slug']} bio too short: {len(bio)} chars (min 100)"
            )

    def test_bio_max_length(self):
        """Assert every bio <= 1000 chars (too long = likely raw agent output)."""
        for p in self._profiles():
            bio = p.get("bio", "")
            assert len(bio) <= 1000, (
                f"{p['slug']} bio too long: {len(bio)} chars (max 1000)"
            )

    def test_bio_word_count_range(self):
        """Assert every bio has 20-150 words."""
        for p in self._profiles():
            bio = p.get("bio", "")
            word_count = len(bio.split())
            assert 20 <= word_count <= 150, (
                f"{p['slug']} bio word count out of range: {word_count} words (expected 20-150)"
            )

    def test_bio_batch_mean_length(self):
        """Assert mean bio length across all profiles is 150-500 chars."""
        profiles = self._profiles()
        lengths = [len(p.get("bio", "")) for p in profiles]
        mean_len = statistics.mean(lengths)
        assert 150 <= mean_len <= 500, (
            f"Mean bio length {mean_len:.0f} chars out of range (expected 150-500)"
        )

    def test_bio_no_outliers(self):
        """Assert no bio is more than 3x the median length (outlier detection)."""
        profiles = self._profiles()
        lengths = [len(p.get("bio", "")) for p in profiles]
        median_len = statistics.median(lengths)
        threshold = median_len * 3
        for p in profiles:
            bio_len = len(p.get("bio", ""))
            assert bio_len <= threshold, (
                f"{p['slug']} bio is an outlier: {bio_len} chars > 3x median ({median_len:.0f} chars = threshold {threshold:.0f})"
            )
