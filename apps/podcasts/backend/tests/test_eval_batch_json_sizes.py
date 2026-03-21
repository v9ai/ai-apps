"""Structural and size assertions for generated JSON files.

Tests that research profile JSON files and report JSON files are valid,
reasonably sized, and not exhibiting agent output artifacts (excessive nesting).

Usage:
    pytest tests/test_eval_batch_json_sizes.py -v
"""

import json
from pathlib import Path
from typing import Any

import pytest

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"
REPORTS_DIR = SCRIPT_DIR / "github-reports"

MIN_PROFILE_BYTES = 500
MAX_PROFILE_BYTES = 200 * 1024  # 200 KB
MAX_NESTING_DEPTH = 5


def _research_json_files() -> list[Path]:
    """Return all research profile JSON files, excluding timeline and eval files."""
    if not RESEARCH_DIR.exists():
        return []
    return sorted(
        f for f in RESEARCH_DIR.glob("*.json")
        if not f.name.endswith("-timeline.json") and not f.name.endswith(".eval.json")
    )


def _measure_depth(obj: Any, current: int = 1) -> int:
    """Return the maximum nesting depth of a JSON-like structure.

    Scalars (str, int, float, bool, None) have depth 0 at the point they
    are encountered, but the container holding them counts as 1 level.
    """
    if isinstance(obj, dict):
        if not obj:
            return current
        return max(_measure_depth(v, current + 1) for v in obj.values())
    if isinstance(obj, list):
        if not obj:
            return current
        return max(_measure_depth(v, current + 1) for v in obj)
    return current


# ═══════════════════════════════════════════════════════════════════════════
# Profile JSON file size and structure
# ═══════════════════════════════════════════════════════════════════════════

class TestProfileJsonSizes:
    def _files(self) -> list[Path]:
        files = _research_json_files()
        if not files:
            pytest.skip("No research JSON files — run crew.py first")
        return files

    def test_profile_json_min_size(self):
        """Assert each research JSON file is >= 500 bytes."""
        for f in self._files():
            size = f.stat().st_size
            assert size >= MIN_PROFILE_BYTES, (
                f"{f.name} is only {size} bytes (minimum {MIN_PROFILE_BYTES})"
            )

    def test_profile_json_max_size(self):
        """Assert each research JSON file is <= 200KB (not bloated)."""
        for f in self._files():
            size = f.stat().st_size
            assert size <= MAX_PROFILE_BYTES, (
                f"{f.name} is {size} bytes ({size / 1024:.1f} KB), "
                f"exceeds {MAX_PROFILE_BYTES / 1024:.0f} KB limit"
            )

    def test_profile_json_valid(self):
        """Assert each file is valid JSON that parses without error."""
        for f in self._files():
            text = f.read_text(encoding="utf-8")
            try:
                data = json.loads(text)
            except json.JSONDecodeError as exc:
                pytest.fail(f"{f.name} is not valid JSON: {exc}")
            assert isinstance(data, (dict, list)), (
                f"{f.name} top-level type is {type(data).__name__}, expected dict or list"
            )

    def test_profile_json_not_nested_too_deep(self):
        """Assert JSON nesting doesn't exceed 5 levels (prevent agent output artifacts)."""
        for f in self._files():
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue  # validity is checked in test_profile_json_valid
            depth = _measure_depth(data)
            assert depth <= MAX_NESTING_DEPTH, (
                f"{f.name} has nesting depth {depth}, exceeds limit of {MAX_NESTING_DEPTH}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Report JSON validity
# ═══════════════════════════════════════════════════════════════════════════

class TestReportJsonValidity:
    def test_report_json_valid(self):
        """If mega-discovery.json exists, assert it's valid JSON."""
        p = REPORTS_DIR / "mega-discovery.json"
        if not p.exists():
            pytest.skip("mega-discovery.json not found — run crew.py first")
        text = p.read_text(encoding="utf-8")
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            pytest.fail(f"mega-discovery.json is not valid JSON: {exc}")
        assert isinstance(data, (dict, list)), (
            f"mega-discovery.json top-level type is {type(data).__name__}, expected dict or list"
        )

    def test_quality_json_valid(self):
        """If mega-quality.json exists, assert it's valid JSON."""
        p = REPORTS_DIR / "mega-quality.json"
        if not p.exists():
            pytest.skip("mega-quality.json not found — run crew.py first")
        text = p.read_text(encoding="utf-8")
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            pytest.fail(f"mega-quality.json is not valid JSON: {exc}")
        assert isinstance(data, (dict, list)), (
            f"mega-quality.json top-level type is {type(data).__name__}, expected dict or list"
        )
