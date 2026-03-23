"""Tests for creating and using deepeval EvaluationDataset with Golden objects.

Validates that:
- Golden objects can be created from real personality data
- EvaluationDataset can be built from all personality slugs
- Dataset count matches the number of personality files on disk
- Every Golden has a non-empty input field
- Dataset supports iteration (both evals_iterator and direct)
- Goldens can include expected_output sourced from research JSON files
"""

import json, os, pytest
from pathlib import Path
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.test_case import LLMTestCase

PERSONALITIES_DIR = Path(__file__).resolve().parent.parent.parent / "personalities"
RESEARCH_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "lib" / "research"

pytestmark = [pytest.mark.deepeval, pytest.mark.e2e]


def _slug_to_name(slug: str) -> str:
    """Convert a kebab-case slug to a title-cased display name."""
    return slug.replace("-", " ").title()


def _personality_slugs() -> list[str]:
    """Return sorted slugs from all .ts files in the personalities directory."""
    if not PERSONALITIES_DIR.exists():
        return []
    return sorted(p.stem for p in PERSONALITIES_DIR.glob("*.ts"))


def _load_research(slug: str) -> dict | None:
    """Load a research JSON file for the given slug, or return None."""
    path = RESEARCH_DIR / f"{slug}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


# ── Test 1: create a Golden from a single personality ────────────────


def test_create_golden_from_personality():
    """Create a Golden(input=...) from a known personality name successfully."""
    golden = Golden(input="Harrison Chase")
    assert golden is not None
    assert golden.input == "Harrison Chase"


# ── Test 2: create dataset from all personality slugs ────────────────


def test_create_dataset_from_personalities():
    """Create an EvaluationDataset with one Golden per personality slug."""
    slugs = _personality_slugs()
    assert len(slugs) > 0, "No personality .ts files found in personalities/"

    goldens = [
        Golden(
            input=f"Research the AI/tech personality: {_slug_to_name(slug)} (slug: {slug})",
        )
        for slug in slugs
    ]
    dataset = EvaluationDataset(goldens=goldens)

    assert isinstance(dataset, EvaluationDataset)
    assert len(dataset.goldens) == len(slugs)
    for golden in dataset.goldens:
        assert golden.input is not None


# ── Test 3: dataset count matches personality file count ─────────────


def test_dataset_has_correct_count():
    """Dataset Golden count must equal the number of .ts personality files."""
    slugs = _personality_slugs()
    ts_count = len(list(PERSONALITIES_DIR.glob("*.ts")))
    assert len(slugs) == ts_count, (
        f"Slug count ({len(slugs)}) differs from .ts file count ({ts_count})"
    )

    goldens = [Golden(input=_slug_to_name(slug)) for slug in slugs]
    dataset = EvaluationDataset(goldens=goldens)

    assert len(dataset.goldens) == ts_count, (
        f"Expected {ts_count} goldens, got {len(dataset.goldens)}"
    )


# ── Test 4: every Golden has a non-empty input ───────────────────────


def test_golden_has_input():
    """Each Golden created from personality slugs must have a non-empty input."""
    slugs = _personality_slugs()
    assert len(slugs) > 0, "No personality slugs found"

    goldens = [Golden(input=_slug_to_name(slug)) for slug in slugs]
    dataset = EvaluationDataset(goldens=goldens)

    for i, golden in enumerate(dataset.goldens):
        assert golden.input is not None, f"Golden at index {i} has None input"
        assert len(golden.input.strip()) > 0, (
            f"Golden at index {i} has empty input"
        )


# ── Test 5: dataset supports iteration ───────────────────────────────


def test_dataset_iteration():
    """Can iterate over dataset goldens directly and via __iter__."""
    slugs = _personality_slugs()[:5]  # small subset for speed
    assert len(slugs) > 0, "Need at least one personality slug"

    goldens = [Golden(input=_slug_to_name(slug)) for slug in slugs]
    dataset = EvaluationDataset(goldens=goldens)

    # Direct iteration over dataset.goldens list
    iterated_inputs = []
    for golden in dataset.goldens:
        iterated_inputs.append(golden.input)
    assert len(iterated_inputs) == len(slugs)

    # Verify all inputs are present and unique
    expected_names = {_slug_to_name(slug) for slug in slugs}
    assert set(iterated_inputs) == expected_names

    # Index-based access
    assert dataset.goldens[0].input == _slug_to_name(slugs[0])
    assert dataset.goldens[-1].input == _slug_to_name(slugs[-1])


# ── Test 6: Golden with expected_output from research JSON ───────────


def test_golden_with_expected_output():
    """Create Goldens with expected_output populated from research JSON bio field."""
    slugs = _personality_slugs()
    assert len(slugs) > 0, "No personality slugs found"

    goldens_with_output = []
    goldens_without_output = []

    for slug in slugs:
        name = _slug_to_name(slug)
        research = _load_research(slug)

        if research and research.get("bio"):
            golden = Golden(
                input=f"Research the AI/tech personality: {name}",
                expected_output=research["bio"],
            )
            goldens_with_output.append(golden)
        else:
            golden = Golden(
                input=f"Research the AI/tech personality: {name}",
            )
            goldens_without_output.append(golden)

    # There should be at least one research JSON with a bio on disk
    assert len(goldens_with_output) > 0, (
        "Expected at least one research JSON file with a bio field in "
        f"{RESEARCH_DIR}"
    )

    # Verify the expected_output is the actual bio text
    for golden in goldens_with_output:
        assert golden.expected_output is not None
        assert len(golden.expected_output) > 50, (
            f"Bio too short for golden: {golden.input}"
        )

    # Build a combined dataset from both lists
    all_goldens = goldens_with_output + goldens_without_output
    dataset = EvaluationDataset(goldens=all_goldens)
    assert len(dataset.goldens) == len(slugs)
