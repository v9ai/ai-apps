"""Structural evaluation: slug-to-name consistency for research profiles.

Tests that every profile's slug is correctly derived from the person's name,
follows formatting rules, and matches the filename on disk.

Usage:
    pytest tests/test_eval_slug_name_match.py -v
"""

import json
import re
import unicodedata
from pathlib import Path
from typing import Any

import pytest

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"


# ═══════════════════════════════════════════════════════════════════════════
# Data loader (copied from test_mega_crew_eval.py)
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


def _load_profiles_with_filenames() -> list[tuple[dict[str, Any], str]]:
    """Load profiles together with the filename stem they came from."""
    results = []
    if not RESEARCH_DIR.exists():
        return results
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data and "bio" in data:
                results.append((data, f.stem))
        except (json.JSONDecodeError, OSError):
            continue
    return results


# ═══════════════════════════════════════════════════════════════════════════
# Slug / name consistency tests
# ═══════════════════════════════════════════════════════════════════════════

class TestSlugNameMatch:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def _profiles_with_filenames(self):
        p = _load_profiles_with_filenames()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_slug_derived_from_name(self):
        """Assert slug is roughly firstname-lastname derived from name."""
        for p in self._profiles():
            slug = p["slug"]
            name = p.get("name", "")
            parts = name.lower().split()
            assert len(parts) >= 2, (
                f"Name '{name}' has fewer than 2 parts for slug '{slug}'"
            )
            for part in parts:
                # Transliterate Unicode to ASCII (e.g. "João" -> "joao")
                # then strip any remaining non-alpha chars.
                nfkd = unicodedata.normalize("NFKD", part)
                ascii_part = nfkd.encode("ascii", "ignore").decode("ascii")
                cleaned = re.sub(r"[^a-z]", "", ascii_part)
                if not cleaned:
                    continue
                assert cleaned in slug, (
                    f"Slug '{slug}' does not contain name part '{cleaned}' "
                    f"(from name '{name}')"
                )

    def test_slug_no_special_chars(self):
        """Assert slug matches the kebab-case pattern: lowercase alphanumeric segments separated by hyphens."""
        pattern = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
        for p in self._profiles():
            slug = p["slug"]
            assert pattern.match(slug), (
                f"Slug '{slug}' contains invalid characters or format"
            )

    def test_slug_reasonable_length(self):
        """Assert 3 <= len(slug) <= 50."""
        for p in self._profiles():
            slug = p["slug"]
            assert 3 <= len(slug) <= 50, (
                f"Slug '{slug}' length {len(slug)} outside [3, 50]"
            )

    def test_slug_matches_filename(self):
        """For each profile loaded from file, assert the filename (stem) matches the slug field."""
        for profile, stem in self._profiles_with_filenames():
            slug = profile["slug"]
            assert slug == stem, (
                f"Slug '{slug}' does not match filename stem '{stem}' "
                f"(expected file '{slug}.json')"
            )

    def test_name_not_empty(self):
        """Assert every profile has a non-empty name field."""
        for p in self._profiles():
            name = p.get("name", "")
            assert isinstance(name, str) and name.strip(), (
                f"Profile '{p['slug']}' has empty or missing name"
            )
