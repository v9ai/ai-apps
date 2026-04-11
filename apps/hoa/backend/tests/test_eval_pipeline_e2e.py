"""End-to-end pipeline integrity tests.

Validates structural consistency between research JSON files and their
corresponding TypeScript personality files.  Pure assertions — no LLM
calls, no network, no side-effects.

Usage:
    pytest tests/test_eval_pipeline_e2e.py -v
"""

import json
import re
from pathlib import Path
from typing import Any

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"
PERSONALITIES_DIR = PROJECT_ROOT / "personalities"


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _load_research_profiles() -> list[dict[str, Any]]:
    """Load all research JSON files (excluding timeline and eval variants)."""
    if not RESEARCH_DIR.exists():
        return []
    profiles = []
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


def _parse_ts_field(content: str, field: str) -> str | None:
    """Extract a string field value from a TypeScript personality file.

    Handles both single- and double-quoted values, e.g.:
        slug: "dario-amodei",
        name: "Dario Amodei",
        github: "damodei",
    """
    pattern = rf'^\s+{re.escape(field)}:\s*["\'](.+?)["\']'
    m = re.search(pattern, content, re.MULTILINE)
    return m.group(1) if m else None


def _research_ts_pairs() -> list[tuple[dict[str, Any], str]]:
    """Return (research_dict, ts_content) pairs for every research JSON
    that has a matching .ts personality file."""
    pairs = []
    for profile in _load_research_profiles():
        slug = profile.get("slug", "")
        ts_path = PERSONALITIES_DIR / f"{slug}.ts"
        if ts_path.exists():
            pairs.append((profile, ts_path.read_text()))
    return pairs


# ═══════════════════════════════════════════════════════════════════════════
# Test data (collected once at import time for parametrize)
# ═══════════════════════════════════════════════════════════════════════════

_ALL_PROFILES = _load_research_profiles()
_ALL_PAIRS = _research_ts_pairs()


# ═══════════════════════════════════════════════════════════════════════════
# 1. Every research JSON has a matching .ts file
# ═══════════════════════════════════════════════════════════════════════════

class TestEveryResearchJsonHasTsFile:
    @pytest.mark.parametrize(
        "profile",
        _ALL_PROFILES,
        ids=lambda p: p.get("slug", "?"),
    )
    def test_every_research_json_has_ts_file(self, profile: dict[str, Any]):
        slug = profile["slug"]
        ts_path = PERSONALITIES_DIR / f"{slug}.ts"
        assert ts_path.exists(), (
            f"Research JSON for '{slug}' has no matching TypeScript file at "
            f"{ts_path}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 2. TS slug matches JSON slug
# ═══════════════════════════════════════════════════════════════════════════

class TestTsSlugMatchesJsonSlug:
    @pytest.mark.parametrize(
        "profile,ts_content",
        _ALL_PAIRS,
        ids=lambda p: p.get("slug", "?") if isinstance(p, dict) else "ts",
    )
    def test_ts_slug_matches_json_slug(
        self, profile: dict[str, Any], ts_content: str
    ):
        json_slug = profile["slug"]
        ts_slug = _parse_ts_field(ts_content, "slug")
        assert ts_slug is not None, (
            f"Could not parse slug from .ts file for '{json_slug}'"
        )
        assert ts_slug == json_slug, (
            f"Slug mismatch: .ts has '{ts_slug}', JSON has '{json_slug}'"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 3. TS name matches JSON name
# ═══════════════════════════════════════════════════════════════════════════

class TestTsNameMatchesJsonName:
    @pytest.mark.parametrize(
        "profile,ts_content",
        _ALL_PAIRS,
        ids=lambda p: p.get("slug", "?") if isinstance(p, dict) else "ts",
    )
    def test_ts_name_matches_json_name(
        self, profile: dict[str, Any], ts_content: str
    ):
        json_name = profile["name"]
        ts_name = _parse_ts_field(ts_content, "name")
        assert ts_name is not None, (
            f"Could not parse name from .ts file for '{profile['slug']}'"
        )
        assert ts_name == json_name, (
            f"Name mismatch for '{profile['slug']}': "
            f".ts has '{ts_name}', JSON has '{json_name}'"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 4. TS github matches JSON social.github
# ═══════════════════════════════════════════════════════════════════════════

class TestTsGithubMatchesJsonSocial:
    @pytest.mark.parametrize(
        "profile,ts_content",
        _ALL_PAIRS,
        ids=lambda p: p.get("slug", "?") if isinstance(p, dict) else "ts",
    )
    def test_ts_github_matches_json_social(
        self, profile: dict[str, Any], ts_content: str
    ):
        json_github_url = profile.get("social", {}).get("github", "")
        ts_github = _parse_ts_field(ts_content, "github")

        if not json_github_url and not ts_github:
            pytest.skip(
                f"No github in either source for '{profile['slug']}'"
            )

        # JSON stores a full URL; TS stores just the username.
        # Normalise the JSON URL to a bare username for comparison.
        if json_github_url:
            json_github_user = json_github_url.rstrip("/").split("/")[-1]
        else:
            json_github_user = ""

        ts_github_user = ts_github or ""

        assert ts_github_user == json_github_user, (
            f"GitHub mismatch for '{profile['slug']}': "
            f".ts has '{ts_github_user}', JSON has '{json_github_user}' "
            f"(from {json_github_url})"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 5. No orphan .eval.json files in the research directory
# ═══════════════════════════════════════════════════════════════════════════

class TestResearchDirNoOrphanEvals:
    def test_research_dir_no_orphan_evals(self):
        if not RESEARCH_DIR.exists():
            pytest.skip("Research directory does not exist")

        eval_files = sorted(RESEARCH_DIR.glob("*.eval.json"))
        if not eval_files:
            pytest.skip("No .eval.json files to check")

        research_stems = {
            f.stem
            for f in RESEARCH_DIR.glob("*.json")
            if not f.name.endswith("-timeline.json")
            and not f.name.endswith(".eval.json")
        }

        orphans = []
        for ef in eval_files:
            # e.g. "athos-georgiou.eval.json" → stem "athos-georgiou.eval"
            # strip the ".eval" suffix to get the base slug
            base_stem = ef.stem.removesuffix(".eval")
            if base_stem not in research_stems:
                orphans.append(ef.name)

        assert not orphans, (
            f"Orphan .eval.json files with no matching research JSON: "
            f"{orphans}"
        )
