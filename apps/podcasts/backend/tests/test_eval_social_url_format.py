"""Structural assertions for social profile URL quality.

Tests that all social dicts in research profiles follow URL formatting
conventions: HTTPS prefixes, correct domain patterns, no empty values,
lowercase keys, and no duplicate URLs.

Usage:
    pytest tests/test_eval_social_url_format.py -v
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


class TestSocialURLFormat:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_social_urls_start_with_https(self):
        """Assert all non-empty social URLs start with 'http'."""
        for p in self._profiles():
            social = p.get("social", {})
            if not isinstance(social, dict):
                continue
            for key, url in social.items():
                if url:
                    assert url.startswith("http"), (
                        f"{p['slug']} social['{key}'] does not start with http: '{url}'"
                    )

    def test_social_github_url_format(self):
        """If 'github' key exists, URL matches 'github.com/{username}'."""
        pattern = re.compile(r"^https?://(?:www\.)?github\.com/[A-Za-z0-9_-]+/?$")
        for p in self._profiles():
            social = p.get("social", {})
            if not isinstance(social, dict):
                continue
            gh = social.get("github")
            if gh:
                assert pattern.match(gh), (
                    f"{p['slug']} social['github'] bad format: '{gh}'"
                )

    def test_social_twitter_url_format(self):
        """If 'twitter' key exists, URL contains 'x.com/' or 'twitter.com/'."""
        for p in self._profiles():
            social = p.get("social", {})
            if not isinstance(social, dict):
                continue
            tw = social.get("twitter")
            if tw:
                assert "x.com/" in tw or "twitter.com/" in tw, (
                    f"{p['slug']} social['twitter'] missing x.com/ or twitter.com/: '{tw}'"
                )

    def test_social_no_empty_values(self):
        """Assert no social dict has empty string values (should omit key instead)."""
        for p in self._profiles():
            social = p.get("social", {})
            if not isinstance(social, dict):
                continue
            for key, url in social.items():
                assert url != "", (
                    f"{p['slug']} social['{key}'] is an empty string — omit the key instead"
                )

    def test_social_keys_lowercase(self):
        """Assert all social dict keys are lowercase strings."""
        for p in self._profiles():
            social = p.get("social", {})
            if not isinstance(social, dict):
                continue
            for key in social:
                assert isinstance(key, str) and key == key.lower(), (
                    f"{p['slug']} social key '{key}' is not lowercase"
                )

    def test_social_no_duplicate_urls(self):
        """Assert no two keys in the same social dict point to the same URL."""
        for p in self._profiles():
            social = p.get("social", {})
            if not isinstance(social, dict):
                continue
            urls = [url for url in social.values() if url]
            dupes = [u for u in urls if urls.count(u) > 1]
            assert not dupes, (
                f"{p['slug']} has duplicate social URLs: {set(dupes)}"
            )
