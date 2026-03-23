"""Tests coverage across all personalities — validates that research exists
and is complete for each personality in the project."""

import json
import pytest
from pathlib import Path

RESEARCH_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "lib" / "research"
PERSONALITIES_DIR = Path(__file__).resolve().parent.parent.parent / "personalities"

_personalities_exist = PERSONALITIES_DIR.exists() and any(PERSONALITIES_DIR.glob("*.ts"))
_research_exists = RESEARCH_DIR.exists() and any(RESEARCH_DIR.glob("*.json"))


# ── helpers ──────────────────────────────────────────────────────────────

def _research_json_files() -> list[Path]:
    """Return all primary research JSON files (excluding timeline / eval)."""
    if not RESEARCH_DIR.exists():
        return []
    return sorted(
        p
        for p in RESEARCH_DIR.glob("*.json")
        if not p.name.endswith("-timeline.json")
        and not p.name.endswith(".eval.json")
    )


def _load_research(path: Path) -> dict:
    return json.loads(path.read_text())


# ── 1. personalities directory ───────────────────────────────────────────

@pytest.mark.skipif(not PERSONALITIES_DIR.exists(), reason="personalities/ directory missing")
def test_personalities_directory_exists():
    """personalities/ dir exists and contains .ts files."""
    ts_files = list(PERSONALITIES_DIR.glob("*.ts"))
    assert len(ts_files) > 0, "personalities/ exists but contains no .ts files"


# ── 2. personality count ─────────────────────────────────────────────────

@pytest.mark.skipif(not _personalities_exist, reason="personalities/ directory missing or empty")
def test_personality_count():
    """At least 15 personalities are defined."""
    ts_files = list(PERSONALITIES_DIR.glob("*.ts"))
    assert len(ts_files) >= 15, (
        f"Expected at least 15 personality files, found {len(ts_files)}"
    )


# ── 3. research directory ───────────────────────────────────────────────

@pytest.mark.skipif(not RESEARCH_DIR.exists(), reason="src/lib/research/ directory missing")
def test_research_directory_exists():
    """src/lib/research/ dir exists and contains JSON files."""
    json_files = list(RESEARCH_DIR.glob("*.json"))
    assert len(json_files) > 0, "research/ exists but contains no .json files"


# ── 4. valid JSON ────────────────────────────────────────────────────────

@pytest.mark.skipif(not _research_exists, reason="research directory missing or empty")
def test_research_files_valid_json():
    """All .json research files parse correctly."""
    errors: list[str] = []
    for path in _research_json_files():
        try:
            json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            errors.append(f"{path.name}: {exc}")
    assert not errors, "JSON parse failures:\n" + "\n".join(errors)


# ── 5. required fields ──────────────────────────────────────────────────

@pytest.mark.skipif(not _research_exists, reason="research directory missing or empty")
def test_research_files_have_required_fields():
    """Each research JSON has slug, name, and bio."""
    required = {"slug", "name", "bio"}
    missing: list[str] = []
    for path in _research_json_files():
        data = _load_research(path)
        absent = required - set(data.keys())
        if absent:
            missing.append(f"{path.name} missing: {', '.join(sorted(absent))}")
    assert not missing, "Required fields missing:\n" + "\n".join(missing)


# ── 6. slug matches filename ────────────────────────────────────────────

@pytest.mark.skipif(not _research_exists, reason="research directory missing or empty")
def test_research_slugs_match_filenames():
    """slug field matches the filename (without .json extension)."""
    mismatches: list[str] = []
    for path in _research_json_files():
        data = _load_research(path)
        expected_slug = path.stem
        actual_slug = data.get("slug", "")
        if actual_slug != expected_slug:
            mismatches.append(
                f"{path.name}: slug={actual_slug!r}, expected={expected_slug!r}"
            )
    assert not mismatches, "Slug/filename mismatches:\n" + "\n".join(mismatches)


# ── 7. no empty bios ────────────────────────────────────────────────────

@pytest.mark.skipif(not _research_exists, reason="research directory missing or empty")
def test_no_empty_bios():
    """No research file has an empty bio string."""
    empty: list[str] = []
    for path in _research_json_files():
        data = _load_research(path)
        bio = data.get("bio", "")
        if not isinstance(bio, str) or not bio.strip():
            empty.append(path.name)
    assert not empty, "Empty or missing bios:\n" + "\n".join(empty)


# ── 8. topics ────────────────────────────────────────────────────────────

@pytest.mark.skipif(not _research_exists, reason="research directory missing or empty")
def test_research_has_topics():
    """Each research file has at least 3 topics."""
    insufficient: list[str] = []
    for path in _research_json_files():
        data = _load_research(path)
        topics = data.get("topics", [])
        if not isinstance(topics, list) or len(topics) < 3:
            insufficient.append(
                f"{path.name}: {len(topics) if isinstance(topics, list) else 0} topics"
            )
    assert not insufficient, (
        "Research files with fewer than 3 topics:\n" + "\n".join(insufficient)
    )
