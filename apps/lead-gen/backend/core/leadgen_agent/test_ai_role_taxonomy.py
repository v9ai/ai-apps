"""Tests for :mod:`leadgen_agent.ai_role_taxonomy`."""

from __future__ import annotations

import pytest

from leadgen_agent.ai_role_taxonomy import (
    classify_job,
    classify_role,
    is_ai_role,
    is_remote,
)


# ── is_ai_role ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "title",
    [
        "Staff AI Engineer (Remote)",
        "Senior ML Engineer — Worldwide",
        "Machine Learning Engineer, Inference",
        "Applied Scientist",
        "Applied AI Engineer",
        "AI Infrastructure Engineer",
        "AI Infra — Platform",
        "LLM Engineer",
        "RAG Engineer, Knowledge",
        "GenAI Engineer (Remote)",
        "MLOps Engineer",
        "Foundation Model Researcher",
        "AI/ML Engineer",
        "AI Platform Engineer",
        "AI Research Engineer",
        "Senior Agentic Systems Engineer",
    ],
)
def test_positive_titles_are_ai_roles(title: str) -> None:
    ok, pattern = is_ai_role(title)
    assert ok is True, f"expected AI match for {title!r}"
    assert pattern is not None and pattern != ""


@pytest.mark.parametrize(
    "title",
    [
        "AI Sales Engineer",
        "Sales Engineer - AI",
        "Senior Recruiter — AI team",
        "Technical Recruiter (AI)",
        "AI Product Marketer",
        "Account Executive, AI",
        "Customer Success Manager - ML",
        "Backend Engineer",
        "iOS Engineer",
        "Designer",
    ],
)
def test_negative_titles_are_not_ai_roles(title: str) -> None:
    ok, pattern = is_ai_role(title)
    assert ok is False, f"expected non-AI for {title!r}, got pattern={pattern}"
    assert pattern is None


def test_ai_role_falls_back_to_description() -> None:
    title = "Senior Engineer, Platform"
    desc = "You will own our LLM Engineer track and ship RAG systems to prod."
    ok, pattern = is_ai_role(title, desc)
    assert ok is True
    assert pattern == "llm engineer"


def test_ai_role_description_scan_is_bounded() -> None:
    title = "Senior Engineer"
    # Push the AI signal past the 2k char scan budget.
    desc = ("filler. " * 300) + " ai engineer "
    ok, _pattern = is_ai_role(title, desc)
    assert ok is False


def test_ai_role_negative_in_description_suppresses_title_match() -> None:
    title = "AI Engineer"
    desc = "This is a Senior Recruiter role embedded with the AI team."
    ok, _pattern = is_ai_role(title, desc)
    assert ok is False


def test_ai_role_handles_none_inputs() -> None:
    ok, pattern = is_ai_role(None, None)
    assert ok is False
    assert pattern is None


# ── is_remote ───────────────────────────────────────────────────────────────


def test_remote_via_is_remote_flag() -> None:
    assert is_remote({"isRemote": True}) is True


def test_remote_via_workplace_type_remote() -> None:
    assert is_remote({"workplaceType": "Remote"}) is True


def test_remote_via_workplace_type_fully_remote_lowercased() -> None:
    assert is_remote({"workplaceType": "fully remote"}) is True


def test_remote_via_location_word() -> None:
    assert is_remote({"location": "Remote, US"}) is True


def test_remote_via_location_worldwide() -> None:
    assert is_remote({"location": "Worldwide"}) is True


def test_remote_via_location_anywhere() -> None:
    assert is_remote({"location": "Anywhere"}) is True


def test_remote_location_with_hybrid_qualifier_is_not_remote() -> None:
    assert is_remote({"location": "Remote (Hybrid)"}) is False


def test_remote_location_with_onsite_qualifier_is_not_remote() -> None:
    assert is_remote({"location": "Remote / On-site, NYC"}) is False


def test_remote_via_title_fully_remote() -> None:
    assert is_remote({"title": "Senior Engineer (Fully Remote)"}) is True


def test_remote_via_description_100_percent_remote() -> None:
    job = {
        "title": "Senior Engineer",
        "descriptionPlain": "This role is 100% remote across the globe.",
    }
    assert is_remote(job) is True


def test_non_remote_default() -> None:
    assert is_remote({"location": "New York, NY"}) is False


def test_hybrid_workplace_type_is_not_remote() -> None:
    assert is_remote({"workplaceType": "Hybrid", "location": "London"}) is False


def test_remote_priority_isremote_flag_beats_hybrid_location() -> None:
    # ``isRemote=True`` is the highest-priority signal — even if location
    # has a hybrid qualifier, the explicit flag wins.
    assert is_remote({"isRemote": True, "location": "Remote (Hybrid)"}) is True


# ── classify_role / classify_job ────────────────────────────────────────────


def test_classify_role_positive_ai_remote() -> None:
    result = classify_role(
        "Staff AI Engineer",
        workplace_type="Remote",
        is_remote_flag=True,
    )
    assert result.is_ai_role is True
    assert result.is_remote is True
    assert result.matched_pattern == "ai engineer"


def test_classify_role_ai_not_remote() -> None:
    result = classify_role(
        "Senior ML Engineer",
        location="New York, NY",
        workplace_type="On-site",
    )
    assert result.is_ai_role is True
    assert result.is_remote is False


def test_classify_role_remote_not_ai() -> None:
    result = classify_role("Senior Backend Engineer", is_remote_flag=True)
    assert result.is_ai_role is False
    assert result.is_remote is True
    assert result.matched_pattern is None


def test_classify_role_neither() -> None:
    result = classify_role("Sales Manager", location="London")
    assert result.is_ai_role is False
    assert result.is_remote is False
    assert result.matched_pattern is None


def test_classify_role_hybrid_ml_lead_is_not_remote() -> None:
    result = classify_role(
        "ML Engineering Lead",
        workplace_type="Hybrid",
        location="Hybrid - Berlin",
    )
    assert result.is_ai_role is True
    assert result.is_remote is False


def test_classify_job_full_payload() -> None:
    job = {
        "title": "Applied Scientist, Foundation Models",
        "descriptionPlain": "Build new foundation model architectures.",
        "workplaceType": "Remote",
        "isRemote": True,
        "location": "Remote — Worldwide",
    }
    result = classify_job(job)
    assert result.is_ai_role is True
    assert result.is_remote is True
    assert result.matched_pattern == "applied scientist"


def test_classify_job_ai_recruiter_is_suppressed() -> None:
    job = {
        "title": "Recruiter — AI Research Team",
        "isRemote": True,
        "location": "Remote",
    }
    result = classify_job(job)
    assert result.is_ai_role is False
    assert result.is_remote is True
