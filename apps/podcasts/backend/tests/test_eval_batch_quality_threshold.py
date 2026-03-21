"""Batch-level statistical quality threshold tests.

Pure structural/statistical assertions across all loaded profiles.
No LLM calls — just data validation with aggregate thresholds.

Usage:
    pytest tests/test_eval_batch_quality_threshold.py -v
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


def _completeness_score(profile: dict[str, Any]) -> int:
    """Compute a 0-10 completeness score for a single profile."""
    score = 0
    # Bio: up to 2 points
    bio_len = len(profile.get("bio", ""))
    if bio_len >= 100:
        score += 2
    elif bio_len >= 50:
        score += 1
    # Topics: 1 point
    if len(profile.get("topics", [])) >= 3:
        score += 1
    # Timeline: up to 2 points
    tl = profile.get("timeline", [])
    if len(tl) >= 5:
        score += 2
    elif len(tl) >= 2:
        score += 1
    # Key contributions: up to 2 points
    kc = profile.get("key_contributions", [])
    if len(kc) >= 3:
        score += 2
    elif len(kc) >= 1:
        score += 1
    # Social: 1 point
    if len(profile.get("social", {})) >= 2:
        score += 1
    # Quotes: 1 point
    if len(profile.get("quotes", [])) >= 1:
        score += 1
    # Sources: 1 point
    if len(profile.get("sources", [])) >= 1:
        score += 1
    return score


class TestBatchQualityThreshold:
    """Aggregate statistical assertions across the full batch of profiles."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run crew.py first")
        return p

    def test_batch_mean_bio_length(self):
        """Assert mean bio length >= 100 characters."""
        profiles = self._profiles()
        lengths = [len(p.get("bio", "")) for p in profiles]
        mean_len = statistics.mean(lengths)
        assert mean_len >= 100, (
            f"Mean bio length {mean_len:.1f} chars < 100 threshold "
            f"(n={len(profiles)}, min={min(lengths)}, max={max(lengths)})"
        )

    def test_batch_mean_topic_count(self):
        """Assert mean topics per profile >= 3."""
        profiles = self._profiles()
        counts = [len(p.get("topics", [])) for p in profiles]
        mean_count = statistics.mean(counts)
        assert mean_count >= 3, (
            f"Mean topic count {mean_count:.1f} < 3 threshold "
            f"(n={len(profiles)}, min={min(counts)}, max={max(counts)})"
        )

    def test_batch_profiles_with_timeline(self):
        """Assert >= 50% of profiles have at least 1 timeline event."""
        profiles = self._profiles()
        with_timeline = sum(1 for p in profiles if len(p.get("timeline", [])) >= 1)
        ratio = with_timeline / len(profiles)
        assert ratio >= 0.5, (
            f"Only {with_timeline}/{len(profiles)} ({ratio:.0%}) profiles have timeline events; "
            f"need >= 50%"
        )

    def test_batch_profiles_with_contributions(self):
        """Assert >= 50% of profiles have at least 1 contribution."""
        profiles = self._profiles()
        with_contribs = sum(1 for p in profiles if len(p.get("key_contributions", [])) >= 1)
        ratio = with_contribs / len(profiles)
        assert ratio >= 0.5, (
            f"Only {with_contribs}/{len(profiles)} ({ratio:.0%}) profiles have contributions; "
            f"need >= 50%"
        )

    def test_batch_profiles_with_social(self):
        """Assert >= 80% of profiles have at least 1 social link."""
        profiles = self._profiles()
        with_social = sum(1 for p in profiles if len(p.get("social", {})) >= 1)
        ratio = with_social / len(profiles)
        assert ratio >= 0.8, (
            f"Only {with_social}/{len(profiles)} ({ratio:.0%}) profiles have social links; "
            f"need >= 80%"
        )

    def test_batch_completeness_distribution(self):
        """Compute completeness score (0-10) per profile; assert mean >= 4 and no profile scores 0."""
        profiles = self._profiles()
        scores = [(p["slug"], _completeness_score(p)) for p in profiles]
        values = [s for _, s in scores]
        mean_score = statistics.mean(values)
        zeros = [slug for slug, s in scores if s == 0]
        assert not zeros, f"Profiles with completeness 0: {zeros}"
        assert mean_score >= 4, (
            f"Mean completeness {mean_score:.1f}/10 < 4 threshold "
            f"(n={len(profiles)}, min={min(values)}, max={max(values)})"
        )
