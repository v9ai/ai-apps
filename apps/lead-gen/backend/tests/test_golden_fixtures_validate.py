"""Structural validation for the four golden fixture files.

Golden fixtures (``tests/golden/*.json``) feed both the ``EVAL=1`` offline
eval harness and — in the future — any rollback/regression tooling. If one of
them drifts (duplicate ids, a ``product`` missing ``name``, a stray
``expected_*`` key renamed to something the test doesn't check), the live
evals fail *after* paying for hundreds of LLM tokens. These tests fail in
milliseconds, with no API keys, no judge, no network.

The rules they enforce are narrow on purpose — they must accept every valid
hand-edited addition without churn, but catch shape mistakes that would
silently no-op later:

    1. JSON is a non-empty list of dicts.
    2. Every entry has a unique integer ``id`` and a non-empty ``product``
       with ``name`` + ``description`` (the LLM needs both to ground).
    3. ``expected_*`` lists (where present) are non-empty strings.
    4. Pricing expectations have numeric ``expected_tier_count_range`` where
       ``min <= max``.

These are the invariants every metric in ``test_*_eval.py`` relies on.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

GOLDEN_DIR = Path(__file__).parent / "golden"


# ── Loader helpers ──────────────────────────────────────────────────────

def _load(name: str) -> list[dict]:
    path = GOLDEN_DIR / name
    assert path.exists(), f"golden fixture missing: {path}"
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return data


def _assert_structural_invariants(data: object, label: str) -> list[dict]:
    assert isinstance(data, list), f"{label}: top-level must be a list"
    assert data, f"{label}: golden set must be non-empty"
    assert all(isinstance(e, dict) for e in data), f"{label}: every entry must be a dict"
    return data  # type: ignore[return-value]


def _assert_entry_shape(entry: dict, label: str) -> None:
    assert "id" in entry, f"{label}: entry missing 'id'"
    assert isinstance(entry["id"], int), f"{label}[{entry.get('id')!r}]: id must be int"
    assert "product" in entry, f"{label}[{entry['id']}]: missing 'product' key"
    product = entry["product"]
    assert isinstance(product, dict), f"{label}[{entry['id']}]: product must be dict"
    # ``name`` and ``description`` together are what the graphs serialize into
    # the product brief for the LLM. Either missing turns evals into noise.
    assert product.get("name"), f"{label}[{entry['id']}]: product.name is empty"
    assert product.get("description"), (
        f"{label}[{entry['id']}]: product.description is empty — "
        "the LLM cannot ground without it"
    )


def _assert_ids_unique(data: list[dict], label: str) -> None:
    ids = [e["id"] for e in data]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"{label}: duplicate ids {sorted(dupes)}"


def _assert_non_empty_string_lists(entry: dict, keys: tuple[str, ...], label: str) -> None:
    for key in keys:
        if key not in entry:
            continue
        value = entry[key]
        assert isinstance(value, list), f"{label}[{entry['id']}].{key} must be a list"
        # Allow empty (the graph may not populate every category) but every
        # item must be a non-empty string — empty strings silently no-op the
        # judge prompt's match logic.
        for item in value:
            assert isinstance(item, str) and item.strip(), (
                f"{label}[{entry['id']}].{key} has a blank / non-string entry: {item!r}"
            )


# ── Per-file tests ──────────────────────────────────────────────────────

def test_deep_icp_golden_shape() -> None:
    data = _assert_structural_invariants(_load("deep_icp.json"), "deep_icp")
    _assert_ids_unique(data, "deep_icp")
    for entry in data:
        _assert_entry_shape(entry, "deep_icp")
        _assert_non_empty_string_lists(
            entry,
            ("expected_segments", "expected_personas", "expected_anti_icp"),
            "deep_icp",
        )


def test_pricing_golden_shape() -> None:
    data = _assert_structural_invariants(_load("pricing.json"), "pricing")
    _assert_ids_unique(data, "pricing")
    for entry in data:
        _assert_entry_shape(entry, "pricing")
        _assert_non_empty_string_lists(
            entry,
            (
                "expected_value_metric_signals",
                "expected_wtp_signals",
                "expected_billing_units",
                "expected_risks",
            ),
            "pricing",
        )
        if "expected_model_type" in entry:
            assert isinstance(entry["expected_model_type"], str) and entry[
                "expected_model_type"
            ].strip(), f"pricing[{entry['id']}].expected_model_type is blank"
        if "expected_tier_count_range" in entry:
            rng = entry["expected_tier_count_range"]
            assert (
                isinstance(rng, list)
                and len(rng) == 2
                and all(isinstance(x, int) for x in rng)
                and rng[0] >= 1
                and rng[0] <= rng[1]
            ), (
                f"pricing[{entry['id']}].expected_tier_count_range must be "
                f"[min, max] with 1 <= min <= max (got {rng!r})"
            )
        if "expected_free_offer" in entry:
            assert isinstance(entry["expected_free_offer"], bool), (
                f"pricing[{entry['id']}].expected_free_offer must be bool"
            )


def test_gtm_golden_shape() -> None:
    data = _assert_structural_invariants(_load("gtm.json"), "gtm")
    _assert_ids_unique(data, "gtm")
    for entry in data:
        _assert_entry_shape(entry, "gtm")
        _assert_non_empty_string_lists(
            entry,
            (
                "expected_channels",
                "expected_icps",
                "expected_pain_points",
                "expected_positioning_axes",
            ),
            "gtm",
        )


def test_positioning_golden_shape() -> None:
    data = _assert_structural_invariants(_load("positioning.json"), "positioning")
    _assert_ids_unique(data, "positioning")
    for entry in data:
        _assert_entry_shape(entry, "positioning")
        _assert_non_empty_string_lists(
            entry,
            (
                "expected_differentiators",
                "expected_positioning_axes",
                "expected_competitor_frame",
                "expected_narrative_hooks",
            ),
            "positioning",
        )
        if "expected_category" in entry:
            assert isinstance(entry["expected_category"], str) and entry[
                "expected_category"
            ].strip(), f"positioning[{entry['id']}].expected_category is blank"


# ── Cross-fixture consistency ──────────────────────────────────────────

def test_every_golden_file_is_well_formed_utf8_json() -> None:
    """Defense against accidentally saving fixtures as latin-1 / with BOM —
    which the CI worker's locale handles fine but production readers may not."""
    for name in ("deep_icp.json", "pricing.json", "gtm.json", "positioning.json"):
        path = GOLDEN_DIR / name
        raw = path.read_bytes()
        # No BOM.
        assert not raw.startswith(b"\xef\xbb\xbf"), f"{name}: unexpected UTF-8 BOM"
        # Valid UTF-8.
        raw.decode("utf-8")
        # Valid JSON.
        json.loads(raw)


@pytest.mark.parametrize(
    "filename",
    ["deep_icp.json", "pricing.json", "gtm.json", "positioning.json"],
)
def test_golden_file_has_at_least_one_entry(filename: str) -> None:
    """Guardrail: a PR that accidentally empties a golden fixture (e.g. by
    leaving ``[]`` after a bad rebase) must not ship silently."""
    data = _load(filename)
    assert len(data) >= 1, f"{filename} is empty"


# ── Product-intel schema compatibility of pricing goldens ──────────────

def test_pricing_golden_product_payloads_serializable_as_input() -> None:
    """The pricing graph reads ``state["product"]`` as a dict and never
    mutates it in place. Confirm every golden product dict survives a JSON
    round-trip (no sets, no tuples, no NaN) — catches accidental Python
    literals from a hand-edit."""
    data = _load("pricing.json")
    for entry in data:
        product = entry["product"]
        roundtrip = json.loads(json.dumps(product, ensure_ascii=False, allow_nan=False))
        assert roundtrip == product, (
            f"pricing[{entry['id']}] product dict is not JSON-stable"
        )
