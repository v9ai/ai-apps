"""Batch deduplication tests for generated research profiles.

Ensures no two profiles describe the same person by checking slugs, names,
GitHub URLs, bios (exact match), and near-duplicate bios (Jaccard similarity).

Usage:
    pytest tests/test_eval_batch_no_duplicates.py -v
"""

import json
from itertools import combinations
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


class TestBatchNoDuplicates:
    """Assert that no two profiles describe the same person."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_unique_slugs(self):
        """All slugs must be unique."""
        profiles = self._profiles()
        slugs = [p["slug"] for p in profiles]
        seen: set[str] = set()
        dupes: set[str] = set()
        for s in slugs:
            if s in seen:
                dupes.add(s)
            seen.add(s)
        assert not dupes, f"Duplicate slugs: {dupes}"

    def test_unique_github_urls(self):
        """No two profiles share the same GitHub URL."""
        profiles = self._profiles()
        urls: list[str] = []
        for p in profiles:
            gh = p.get("social", {}).get("github", "")
            if gh:
                urls.append(gh.rstrip("/").lower())
        seen: set[str] = set()
        dupes: set[str] = set()
        for u in urls:
            if u in seen:
                dupes.add(u)
            seen.add(u)
        assert not dupes, f"Duplicate GitHub URLs: {dupes}"

    def test_unique_names(self):
        """No two profiles have the same name (case-insensitive)."""
        profiles = self._profiles()
        names = [p.get("name", "").strip().lower() for p in profiles]
        seen: set[str] = set()
        dupes: set[str] = set()
        for n in names:
            if not n:
                continue
            if n in seen:
                dupes.add(n)
            seen.add(n)
        assert not dupes, f"Duplicate names: {dupes}"

    def test_bios_not_identical(self):
        """No two profiles have identical bios."""
        profiles = self._profiles()
        bio_to_slugs: dict[str, list[str]] = {}
        for p in profiles:
            bio = p.get("bio", "").strip()
            if not bio:
                continue
            bio_to_slugs.setdefault(bio, []).append(p["slug"])
        dupes = {k: v for k, v in bio_to_slugs.items() if len(v) > 1}
        assert not dupes, (
            "Identical bios found: "
            + "; ".join(f"{slugs}" for slugs in dupes.values())
        )

    def test_no_near_duplicate_bios(self):
        """No two bios share more than 80% of their words (Jaccard similarity)."""
        profiles = self._profiles()
        slug_words: list[tuple[str, set[str]]] = []
        for p in profiles:
            bio = p.get("bio", "").strip()
            if not bio:
                continue
            words = set(bio.lower().split())
            slug_words.append((p["slug"], words))

        threshold = 0.80
        too_similar: list[tuple[str, str, float]] = []
        for (slug_a, words_a), (slug_b, words_b) in combinations(slug_words, 2):
            union = words_a | words_b
            if not union:
                continue
            jaccard = len(words_a & words_b) / len(union)
            if jaccard > threshold:
                too_similar.append((slug_a, slug_b, round(jaccard, 3)))

        assert not too_similar, (
            f"Near-duplicate bios (Jaccard > {threshold}): "
            + "; ".join(
                f"{a} <-> {b} ({sim})" for a, b, sim in too_similar
            )
        )
