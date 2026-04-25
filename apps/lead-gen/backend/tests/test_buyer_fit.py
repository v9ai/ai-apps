"""Tests for the buyer-fit classifier and its graph node.

Pure heuristic — no LLM, no DB, no network. We can therefore assert exact
score/verdict pairs deterministically.
"""

from __future__ import annotations

import asyncio

import pytest

from leadgen_agent.buyer_fit_classifier import classify_buyer_fit
from leadgen_agent.contact_enrich_paper_author_graph import (
    classify_buyer_fit_node,
)


# --------------------------------------------------------------------------- #
# Direct classifier tests                                                     #
# --------------------------------------------------------------------------- #


def test_team_a_academic_overrides_everything() -> None:
    """affiliation_type=academic is the highest-priority signal."""
    profile = {
        "institution": "Acme Corp",
        "institution_type": "company",  # would normally yield buyer
        "institution_ror": "",
    }
    verdict, score, reasons = classify_buyer_fit(profile, "academic")
    assert verdict == "not_buyer"
    assert score <= 0.2
    assert "affiliation_type=academic" in reasons


def test_openalex_education_type_is_not_buyer() -> None:
    profile = {
        "institution": "Stanford University",
        "institution_type": "education",
        "institution_ror": "https://ror.org/00f54p054",
    }
    verdict, score, reasons = classify_buyer_fit(profile, None)
    assert verdict == "not_buyer"
    assert score <= 0.2
    assert any("education" in r for r in reasons)


def test_openalex_company_type_with_ror_is_buyer() -> None:
    profile = {
        "institution": "DeepMind",
        "institution_type": "company",
        "institution_ror": "https://ror.org/02nm3yx04",
    }
    verdict, score, reasons = classify_buyer_fit(profile, None)
    assert verdict == "buyer"
    assert score >= 0.8
    assert any("DeepMind" in r for r in reasons)


def test_openalex_company_type_without_ror_bumps_score() -> None:
    """Companies without a ROR are more likely to be real B2B (RORs skew academic)."""
    profile = {
        "institution": "Acme Corp",
        "institution_type": "company",
        "institution_ror": "",
    }
    verdict, score, reasons = classify_buyer_fit(profile, None)
    assert verdict == "buyer"
    assert score == pytest.approx(0.9)
    # First reason mentions the company name
    assert "Acme Corp" in reasons[0]


def test_government_type_is_not_buyer() -> None:
    profile = {
        "institution": "NASA",
        "institution_type": "government",
        "institution_ror": "https://ror.org/027ka1x80",
    }
    verdict, score, reasons = classify_buyer_fit(profile, None)
    assert verdict == "not_buyer"
    assert 0.2 <= score <= 0.3
    assert any("government" in r.lower() for r in reasons)


def test_healthcare_type_is_not_buyer() -> None:
    profile = {
        "institution": "Mayo Clinic",
        "institution_type": "healthcare",
        "institution_ror": "",
    }
    verdict, score, reasons = classify_buyer_fit(profile, None)
    assert verdict == "not_buyer"
    assert score <= 0.3


def test_facility_type_is_not_buyer() -> None:
    profile = {
        "institution": "CERN Test Beam Facility",
        "institution_type": "facility",
        "institution_ror": "",
    }
    verdict, score, _ = classify_buyer_fit(profile, None)
    assert verdict == "not_buyer"
    assert score <= 0.3


def test_archive_type_is_unknown() -> None:
    profile = {
        "institution": "Internet Archive",
        "institution_type": "archive",
        "institution_ror": "",
    }
    verdict, score, _ = classify_buyer_fit(profile, None)
    assert verdict == "unknown"
    assert score == pytest.approx(0.4)


def test_other_type_is_unknown() -> None:
    profile = {
        "institution": "Some Other Org",
        "institution_type": "other",
        "institution_ror": "",
    }
    verdict, score, _ = classify_buyer_fit(profile, None)
    assert verdict == "unknown"
    assert score == pytest.approx(0.4)


def test_empty_type_with_academic_name_is_not_buyer() -> None:
    """OpenAlex sometimes leaves institution_type empty; fall back to name keywords."""
    profile = {
        "institution": "MIT (Massachusetts Institute of Technology)",
        "institution_type": "",
        "institution_ror": "",
    }
    verdict, score, reasons = classify_buyer_fit(profile, None)
    assert verdict == "not_buyer"
    assert score <= 0.2
    assert any("name pattern" in r for r in reasons)


def test_empty_type_with_university_name_is_not_buyer() -> None:
    profile = {
        "institution": "Carnegie Mellon University",
        "institution_type": "",
        "institution_ror": "",
    }
    verdict, score, _ = classify_buyer_fit(profile, None)
    assert verdict == "not_buyer"
    assert score <= 0.2


def test_empty_type_with_company_name_is_unknown() -> None:
    """Plain 'Acme Corp' with no type and no academic keywords → unknown."""
    profile = {
        "institution": "Acme Corp",
        "institution_type": "",
        "institution_ror": "",
    }
    verdict, score, _ = classify_buyer_fit(profile, None)
    assert verdict == "unknown"
    assert score == pytest.approx(0.5)


def test_no_institution_at_all_is_unknown() -> None:
    verdict, score, reasons = classify_buyer_fit({}, None)
    assert verdict == "unknown"
    assert score == pytest.approx(0.5)
    assert reasons == ["no institution"]


def test_affiliation_type_industry_does_not_short_circuit() -> None:
    """Team A's `industry` verdict shouldn't force buyer — small consultancies
    can still be not_buyer. We only short-circuit on `academic`."""
    profile = {
        "institution": "Solo Dev LLC",
        "institution_type": "",  # empty so we fall through to name heuristics
        "institution_ror": "",
    }
    verdict, score, _ = classify_buyer_fit(profile, "industry")
    # industry hint doesn't override the fact that we have no useful signal
    assert verdict == "unknown"
    assert score == pytest.approx(0.5)


# --------------------------------------------------------------------------- #
# Integration: graph node                                                     #
# --------------------------------------------------------------------------- #


def test_graph_node_returns_state_delta_for_company() -> None:
    """Synthetic profile through the graph node — should yield a buyer state delta."""
    state = {
        "institution": "DeepMind",
        "institution_type": "company",
        "institution_ror": "",
        "institution_country": "GB",
        "institution_id": "https://openalex.org/I1290206253",
        "resolve_source": "openalex",
    }
    delta = asyncio.run(classify_buyer_fit_node(state))
    assert set(delta.keys()) == {"buyer_verdict", "buyer_score", "buyer_reasons"}
    assert delta["buyer_verdict"] == "buyer"
    assert delta["buyer_score"] >= 0.8
    assert isinstance(delta["buyer_reasons"], list)
    assert delta["buyer_reasons"]


def test_graph_node_passes_affiliation_type_through() -> None:
    """Team A's affiliation_type is consumed correctly via dict access."""
    state = {
        "institution": "Acme Corp",  # would otherwise be a buyer signal
        "institution_type": "company",
        "institution_ror": "",
        "affiliation_type": "academic",  # Team A says academic — wins
    }
    delta = asyncio.run(classify_buyer_fit_node(state))
    assert delta["buyer_verdict"] == "not_buyer"
    assert delta["buyer_score"] <= 0.2


def test_graph_node_works_when_team_a_field_absent() -> None:
    """Graph node must work when Team A's classifier hasn't run yet."""
    state = {
        "institution": "Stanford University",
        "institution_type": "education",
        "institution_ror": "https://ror.org/00f54p054",
        # no affiliation_type at all
    }
    delta = asyncio.run(classify_buyer_fit_node(state))
    assert delta["buyer_verdict"] == "not_buyer"


def test_graph_node_handles_upstream_error() -> None:
    state = {"error": "no_openalex_match"}
    delta = asyncio.run(classify_buyer_fit_node(state))
    assert delta["buyer_verdict"] == "unknown"
    assert delta["buyer_score"] == 0.5
    assert delta["buyer_reasons"]
