"""Structural eval: topic deduplication and quality across research profiles.

Pure assertions — no LLM judge, no network calls.

Usage:
    pytest tests/test_eval_topics_dedup.py -v
"""

import json
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


class TestTopicsDedup:
    """Topic deduplication and quality checks for every research profile."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    # 1. No exact duplicate topics (case-insensitive) within a single profile
    def test_no_duplicate_topics_within_profile(self):
        for p in self._profiles():
            topics = p.get("topics", [])
            seen: set[str] = set()
            dupes: list[str] = []
            for t in topics:
                key = t.strip().lower()
                if key in seen:
                    dupes.append(t)
                seen.add(key)
            assert not dupes, (
                f"{p['slug']} has exact duplicate topics: {dupes}"
            )

    # 2. No near-duplicate topics (one is a substring of the other)
    def test_no_near_duplicate_topics(self):
        for p in self._profiles():
            topics = p.get("topics", [])
            lowered = [t.strip().lower() for t in topics]
            collisions: list[tuple[str, str]] = []
            for i, a in enumerate(lowered):
                for b in lowered[i + 1 :]:
                    if a == b:
                        continue  # exact dupes caught by test above
                    if a in b or b in a:
                        collisions.append((topics[i], topics[lowered.index(b)]))
            assert not collisions, (
                f"{p['slug']} has near-duplicate topics (substring): {collisions}"
            )

    # 3. Each profile has between 2 and 20 topics
    def test_topics_count_range(self):
        for p in self._profiles():
            n = len(p.get("topics", []))
            assert 2 <= n <= 20, (
                f"{p['slug']} has {n} topics — expected 2..20"
            )

    # 4. Every topic is a non-empty string with at least 2 characters
    def test_topics_all_strings(self):
        for p in self._profiles():
            for t in p.get("topics", []):
                assert isinstance(t, str) and len(t.strip()) >= 2, (
                    f"{p['slug']} has invalid topic: {t!r}"
                )

    # 5. Not all profiles share the exact same topic set
    def test_topics_cross_profile_not_identical(self):
        profiles = self._profiles()
        if len(profiles) < 2:
            pytest.skip("Need at least 2 profiles to compare topic sets")
        topic_sets = [
            frozenset(t.strip().lower() for t in p.get("topics", []))
            for p in profiles
        ]
        unique = set(topic_sets)
        assert len(unique) > 1, (
            "All profiles have the exact same topic set — likely a generation bug"
        )
