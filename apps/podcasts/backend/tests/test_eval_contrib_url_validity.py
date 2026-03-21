"""Structural assertions for contribution URL quality.

Validates that key_contributions URLs across all research profiles are
well-formed, have real domains, avoid placeholders, follow GitHub conventions,
and that contribution titles are unique within each profile.

Usage:
    pytest tests/test_eval_contrib_url_validity.py -v
"""

import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

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


class TestContribUrlValidity:
    """Validate contribution URLs across all research profiles."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run crew.py first")
        return p

    def _all_contrib_urls(self) -> list[tuple[str, str]]:
        """Return (slug, url) pairs for every non-empty contribution URL."""
        pairs = []
        for p in self._profiles():
            for c in p.get("key_contributions", []):
                url = c.get("url", "")
                if url:
                    pairs.append((p["slug"], url))
        return pairs

    # ── 1. well-formed scheme ────────────────────────────────────────────

    def test_contrib_urls_well_formed(self):
        """Assert all non-empty contribution URLs start with https:// or http://."""
        for slug, url in self._all_contrib_urls():
            assert url.startswith("https://") or url.startswith("http://"), (
                f"{slug}: URL missing http(s) scheme: {url}"
            )

    # ── 2. domain present ────────────────────────────────────────────────

    def test_contrib_urls_have_domain(self):
        """Assert all non-empty URLs contain a dot (urlparse netloc check)."""
        for slug, url in self._all_contrib_urls():
            parsed = urlparse(url)
            assert parsed.netloc and "." in parsed.netloc, (
                f"{slug}: URL has no valid domain: {url}"
            )

    # ── 3. no placeholder domains ────────────────────────────────────────

    def test_contrib_urls_not_example(self):
        """Assert no URLs contain 'example.com' or 'placeholder'."""
        for slug, url in self._all_contrib_urls():
            lower = url.lower()
            assert "example.com" not in lower, (
                f"{slug}: URL contains example.com: {url}"
            )
            assert "placeholder" not in lower, (
                f"{slug}: URL contains placeholder: {url}"
            )

    # ── 4. GitHub URL format ─────────────────────────────────────────────

    def test_contrib_urls_github_format(self):
        """For URLs containing 'github.com', assert they match github.com/owner/repo."""
        gh_pattern = re.compile(r"https?://github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+")
        for slug, url in self._all_contrib_urls():
            if "github.com" in url.lower():
                assert gh_pattern.match(url), (
                    f"{slug}: GitHub URL does not match owner/repo pattern: {url}"
                )

    # ── 5. unique titles within a profile ────────────────────────────────

    def test_contrib_titles_unique_within_profile(self):
        """Assert no profile has duplicate contribution titles."""
        for p in self._profiles():
            titles = [
                c.get("title", "")
                for c in p.get("key_contributions", [])
                if c.get("title")
            ]
            dupes = [t for t in titles if titles.count(t) > 1]
            assert not dupes, (
                f"{p['slug']} has duplicate contribution titles: {set(dupes)}"
            )
