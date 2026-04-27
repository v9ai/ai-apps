"""Tests for `company_problems_graph` — pure helpers + summary shape.

Covers slug derivation (used as the `field` suffix on company_facts so each
problem is uniquely keyed) and LLM-output validation (we'd rather drop a
malformed problem than fail the whole graph)."""

from __future__ import annotations

import pytest

from leadgen_agent.company_problems_graph import (
    EXTRACTOR_VERSION,
    MAX_PROBLEMS,
    MIN_PROBLEMS,
    _coerce_problem,
    _slugify,
    summarise,
)


# --------------------------------------------------------------------------- #
# _slugify
# --------------------------------------------------------------------------- #


def test_slugify_basic():
    assert _slugify("Candidate screening bottleneck") == "candidate-screening-bottleneck"


def test_slugify_collapses_punctuation():
    assert _slugify("CV/résumé parsing & ranking") == "cv-r-sum-parsing-ranking"


def test_slugify_strips_leading_trailing_dashes():
    assert _slugify("--Edge case--") == "edge-case"


def test_slugify_caps_length():
    long = "a" * 200
    out = _slugify(long, max_len=48)
    assert len(out) <= 48
    assert out == "a" * 48


def test_slugify_falls_back_when_empty_after_strip():
    """A string that contains nothing in [a-z0-9] (emoji, punctuation only)
    must still produce a non-empty slug, otherwise the field key collapses
    to `problem.` and breaks the company_facts row."""
    assert _slugify("***") == "untitled"
    assert _slugify("   ") == "untitled"


def test_slugify_handles_unicode_diacritics():
    # Same trade-off as _sanitize_local in contact_discovery_graph — drop the
    # bare diacritic, keep its plain neighbours.
    assert _slugify("Façade refactor") == "fa-ade-refactor"


# --------------------------------------------------------------------------- #
# _coerce_problem
# --------------------------------------------------------------------------- #


def _good_problem() -> dict:
    return {
        "problem": "Candidate screening at scale is manual",
        "role_affected": "Recruiter",
        "ai_solution": "LLM-based CV summariser that highlights fit signals",
        "evidence": "category=STAFFING, has_open_roles=true",
        "confidence": 0.8,
    }


def test_coerce_problem_passes_clean_input():
    out = _coerce_problem(_good_problem())
    assert out is not None
    assert out["problem"].startswith("Candidate screening")
    assert out["confidence"] == 0.8


def test_coerce_problem_strips_whitespace():
    p = _good_problem() | {"problem": "  Padded  ", "role_affected": " Recruiter  "}
    out = _coerce_problem(p)
    assert out["problem"] == "Padded"
    assert out["role_affected"] == "Recruiter"


def test_coerce_problem_rejects_non_dict():
    assert _coerce_problem("not a dict") is None
    assert _coerce_problem(None) is None
    assert _coerce_problem(["wrong", "shape"]) is None


def test_coerce_problem_rejects_when_problem_missing():
    p = _good_problem() | {"problem": ""}
    assert _coerce_problem(p) is None


def test_coerce_problem_rejects_when_solution_missing():
    """ai_solution is the actionable half of the pair; without it the row is
    useless for outreach personalization."""
    p = _good_problem() | {"ai_solution": "   "}
    assert _coerce_problem(p) is None


def test_coerce_problem_allows_missing_role_and_evidence():
    """Role and evidence are nice-to-have but not load-bearing."""
    p = {"problem": "X", "ai_solution": "Y"}
    out = _coerce_problem(p)
    assert out is not None
    assert out["role_affected"] == ""
    assert out["evidence"] == ""
    assert out["confidence"] == 0.5  # default


def test_coerce_problem_clamps_confidence_to_unit_interval():
    assert _coerce_problem(_good_problem() | {"confidence": -0.5})["confidence"] == 0.0
    assert _coerce_problem(_good_problem() | {"confidence": 2.0})["confidence"] == 1.0


def test_coerce_problem_handles_string_confidence():
    assert _coerce_problem(_good_problem() | {"confidence": "0.7"})["confidence"] == 0.7


def test_coerce_problem_falls_back_when_confidence_unparseable():
    assert _coerce_problem(_good_problem() | {"confidence": "high"})["confidence"] == 0.5
    assert _coerce_problem(_good_problem() | {"confidence": None})["confidence"] == 0.5


# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #


def test_problem_count_bounds_are_sane():
    assert 1 <= MIN_PROBLEMS <= MAX_PROBLEMS <= 20


def test_extractor_version_is_pinned():
    """If this changes, the persist node's idempotent DELETE must still find
    prior rows. Bump deliberately; don't drift."""
    assert EXTRACTOR_VERSION == "problems-v1"


# --------------------------------------------------------------------------- #
# summarise
# --------------------------------------------------------------------------- #


def test_summarise_shape_is_complete():
    state = {
        "company_id": 39344,
        "company": {"name": "Durlston Partners", "category": "STAFFING"},
        "problems": [_good_problem()],
        "facts_persisted": 1,
        "graph_meta": {"telemetry": {"analyze": {"input_tokens": 100}}},
    }
    out = summarise(state)
    expected_keys = {
        "company_id", "company_name", "category", "problems",
        "facts_persisted", "model", "telemetry", "totals",
    }
    assert expected_keys.issubset(out.keys())
    assert out["company_id"] == 39344
    assert out["company_name"] == "Durlston Partners"
    assert out["category"] == "STAFFING"
    assert out["problems"] == [_good_problem()]
    assert out["facts_persisted"] == 1


def test_summarise_handles_minimal_state():
    """A graph that errored before `analyze` shouldn't crash the summary."""
    out = summarise({"company_id": 1})
    assert out["company_id"] == 1
    assert out["company_name"] is None
    assert out["category"] is None
    assert out["problems"] == []
    assert out["facts_persisted"] == 0
