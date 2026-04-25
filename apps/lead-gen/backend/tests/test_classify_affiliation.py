"""Tests for the affiliation-type classifier in contact_enrich_paper_author_graph.

Covers the helper `_classify_affiliation_type` over the OpenAlex
institution-type enum (`"education"`, `"company"`, `"government"`,
`"healthcare"`, `"archive"`, `"other"`, `""`), the `additional_institution_types`
mixed-detection path, and an integration test for the `classify_affiliation`
graph node.

The B2B lead-gen ICP can only buy from `industry` or `mixed` profiles;
`academic` is a hard non-buyer.
"""

from __future__ import annotations

import pytest

from leadgen_agent.contact_enrich_paper_author_graph import (
    _classify_affiliation_type,
    classify_affiliation,
)


# --------------------------------------------------------------------------- #
# _classify_affiliation_type — pure helper
# --------------------------------------------------------------------------- #


def test_education_is_academic():
    assert _classify_affiliation_type({"institution_type": "education"}) == "academic"


def test_company_is_industry():
    assert _classify_affiliation_type({"institution_type": "company"}) == "industry"


def test_government_is_industry():
    """`government` is non-academic per the spec — auditors / public-sector
    teams are buyable, faculty is not."""
    assert _classify_affiliation_type({"institution_type": "government"}) == "industry"


def test_healthcare_is_industry():
    assert _classify_affiliation_type({"institution_type": "healthcare"}) == "industry"


def test_archive_is_industry():
    assert _classify_affiliation_type({"institution_type": "archive"}) == "industry"


def test_other_is_industry():
    assert _classify_affiliation_type({"institution_type": "other"}) == "industry"


def test_empty_is_unknown():
    assert _classify_affiliation_type({"institution_type": ""}) == "unknown"


def test_missing_field_is_unknown():
    assert _classify_affiliation_type({}) == "unknown"


def test_non_dict_is_unknown():
    assert _classify_affiliation_type(None) == "unknown"  # type: ignore[arg-type]
    assert _classify_affiliation_type("education") == "unknown"  # type: ignore[arg-type]


# --------------------------------------------------------------------------- #
# Mixed detection — primary + additional_institution_types
# --------------------------------------------------------------------------- #


def test_mixed_education_plus_company():
    profile = {
        "institution_type": "education",
        "additional_institution_types": ["company"],
    }
    assert _classify_affiliation_type(profile) == "mixed"


def test_mixed_company_plus_education():
    profile = {
        "institution_type": "company",
        "additional_institution_types": ["education"],
    }
    assert _classify_affiliation_type(profile) == "mixed"


def test_additional_only_education_and_company():
    """Spec example: a profile carrying both types in additional_institution_types
    classifies as mixed even when the primary slot is empty."""
    profile = {
        "institution_type": "",
        "additional_institution_types": ["education", "company"],
    }
    assert _classify_affiliation_type(profile) == "mixed"


def test_two_education_entries_stay_academic():
    profile = {
        "institution_type": "education",
        "additional_institution_types": ["education"],
    }
    assert _classify_affiliation_type(profile) == "academic"


def test_two_industry_entries_stay_industry():
    profile = {
        "institution_type": "company",
        "additional_institution_types": ["healthcare", "government"],
    }
    assert _classify_affiliation_type(profile) == "industry"


def test_additional_garbage_is_ignored():
    profile = {
        "institution_type": "company",
        "additional_institution_types": [None, 42, "", "education"],
    }
    # The lone valid "education" still flips to mixed.
    assert _classify_affiliation_type(profile) == "mixed"


def test_additional_not_a_list_is_tolerated():
    profile = {
        "institution_type": "company",
        "additional_institution_types": "education",  # wrong type
    }
    assert _classify_affiliation_type(profile) == "industry"


# --------------------------------------------------------------------------- #
# Integration — classify_affiliation graph node
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_classify_affiliation_node_industry():
    state = {
        "institution": "Acme Corp",
        "institution_type": "company",
        "additional_institution_types": [],
    }
    result = await classify_affiliation(state)
    assert result == {"affiliation_type": "industry"}


@pytest.mark.asyncio
async def test_classify_affiliation_node_academic():
    state = {
        "institution": "MIT",
        "institution_type": "education",
        "additional_institution_types": [],
    }
    result = await classify_affiliation(state)
    assert result == {"affiliation_type": "academic"}


@pytest.mark.asyncio
async def test_classify_affiliation_node_mixed():
    state = {
        "institution": "MIT",
        "institution_type": "education",
        "additional_institution_types": ["company"],
    }
    result = await classify_affiliation(state)
    assert result == {"affiliation_type": "mixed"}


@pytest.mark.asyncio
async def test_classify_affiliation_node_unknown_empty_profile():
    """No institution-type info at all (e.g., resolver picked an institution
    but its OpenAlex `type` field was null) → unknown."""
    state = {
        "institution": "",
        "institution_type": "",
        "additional_institution_types": [],
    }
    result = await classify_affiliation(state)
    assert result == {"affiliation_type": "unknown"}


@pytest.mark.asyncio
async def test_classify_affiliation_node_short_circuits_on_error():
    """Upstream error (load_contact / resolve failure) → unknown verdict."""
    state = {"error": "no_unenriched_paper_authors_remaining"}
    result = await classify_affiliation(state)
    assert result == {"affiliation_type": "unknown"}
