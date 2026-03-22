"""URL and source quality tests across all profile sections.

Validates that every URL in research profiles is well-formed, avoids
placeholder/localhost values, and that profiles have diverse, real sources.

Pure structural assertions using urllib.parse — no LLM or network calls.

Usage:
    pytest tests/test_eval_source_verification2.py -v
"""

import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

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


# ═══════════════════════════════════════════════════════════════════════════
# URL extraction helper
# ═══════════════════════════════════════════════════════════════════════════

def _collect_all_urls(profile: dict[str, Any]) -> list[str]:
    """Gather every URL string found across all sections of a profile."""
    urls: list[str] = []

    for item in profile.get("timeline", []):
        if item.get("url"):
            urls.append(item["url"])

    for item in profile.get("key_contributions", []):
        if item.get("url"):
            urls.append(item["url"])

    for _key, val in profile.get("social", {}).items():
        if isinstance(val, str) and val:
            urls.append(val)

    for item in profile.get("quotes", []):
        if item.get("url"):
            urls.append(item["url"])

    for item in profile.get("podcast_appearances", []):
        if item.get("url"):
            urls.append(item["url"])

    for item in profile.get("news", []):
        if item.get("url"):
            urls.append(item["url"])

    for item in profile.get("conferences", {}).get("talks", []):
        if item.get("url"):
            urls.append(item["url"])

    positions = profile.get("technical_philosophy", {}).get("positions", {})
    for _key, pos in positions.items():
        if isinstance(pos, dict) and pos.get("source_url"):
            urls.append(pos["source_url"])

    for item in profile.get("funding", {}).get("funding_rounds", []):
        if item.get("url"):
            urls.append(item["url"])

    for item in profile.get("sources", []):
        if isinstance(item, str) and item:
            urls.append(item)
        elif isinstance(item, dict) and item.get("url"):
            urls.append(item["url"])

    return urls


# ═══════════════════════════════════════════════════════════════════════════
# Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestURLAndSourceQuality:
    """URL well-formedness and source quality across all research profiles."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    # ── 1. All URLs well-formed ───────────────────────────────────────────

    def test_all_urls_well_formed(self):
        """Every URL across timeline, contributions, social, quotes,
        podcasts, and news must start with 'http'."""
        for profile in self._profiles():
            all_urls = _collect_all_urls(profile)
            for url in all_urls:
                assert url.startswith("http"), (
                    f"[{profile['slug']}] URL does not start with 'http': {url}"
                )

    # ── 2. No localhost URLs ──────────────────────────────────────────────

    def test_no_localhost_urls(self):
        """No URL should contain 'localhost' or '127.0.0.1'."""
        for profile in self._profiles():
            all_urls = _collect_all_urls(profile)
            for url in all_urls:
                parsed = urlparse(url)
                hostname = (parsed.hostname or "").lower()
                assert "localhost" not in hostname and "127.0.0.1" not in hostname, (
                    f"[{profile['slug']}] URL points to localhost: {url}"
                )

    # ── 3. No example.com or placeholder URLs ────────────────────────────

    def test_no_example_urls(self):
        """No URL should contain 'example.com' or 'placeholder'."""
        for profile in self._profiles():
            all_urls = _collect_all_urls(profile)
            for url in all_urls:
                lower = url.lower()
                assert "example.com" not in lower, (
                    f"[{profile['slug']}] URL contains 'example.com': {url}"
                )
                assert "placeholder" not in lower, (
                    f"[{profile['slug']}] URL contains 'placeholder': {url}"
                )

    # ── 4. GitHub URLs have a username path ───────────────────────────────

    def test_github_urls_have_username(self):
        """GitHub URLs must match github.com/{something} (non-empty path)."""
        gh_pattern = re.compile(r"^https?://(?:www\.)?github\.com/([^/?\s]+)")
        for profile in self._profiles():
            all_urls = _collect_all_urls(profile)
            gh_urls = [u for u in all_urls if "github.com" in u.lower()]
            for url in gh_urls:
                match = gh_pattern.match(url)
                assert match, (
                    f"[{profile['slug']}] GitHub URL missing username path: {url}"
                )
                username = match.group(1)
                assert username not in ("", ".", ".."), (
                    f"[{profile['slug']}] GitHub URL has invalid username: {url}"
                )

    # ── 5. URL domains are diverse ────────────────────────────────────────

    def test_url_domains_diverse(self):
        """When a profile has 3+ URLs, there should be at least 2 distinct
        domains — avoids single-source or self-referential profiles."""
        for profile in self._profiles():
            all_urls = _collect_all_urls(profile)
            if len(all_urls) < 3:
                continue
            domains = set()
            for url in all_urls:
                parsed = urlparse(url)
                if parsed.hostname:
                    domains.add(parsed.hostname.lower())
            assert len(domains) >= 2, (
                f"[{profile['slug']}] Only {len(domains)} distinct domain(s) "
                f"across {len(all_urls)} URLs: {domains}"
            )

    # ── 6. Profiles with contributions have at least 1 URL ───────────────

    def test_total_urls_per_profile(self):
        """Profiles that have key_contributions must have at least 1 URL
        total across all sections."""
        for profile in self._profiles():
            contributions = profile.get("key_contributions", [])
            if not contributions:
                continue
            all_urls = _collect_all_urls(profile)
            assert len(all_urls) >= 1, (
                f"[{profile['slug']}] has {len(contributions)} contribution(s) "
                f"but 0 URLs across all sections"
            )
