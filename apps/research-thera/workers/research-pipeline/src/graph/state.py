"""LangGraph state definition — all inter-node fields."""

from __future__ import annotations

from typing import Any, TypedDict


class ResearchState(TypedDict, total=False):
    # Input fields
    user_id: str
    goal_id: int | None
    job_id: str
    characteristic_id: int | None
    feedback_id: int | None  # optional: contact feedback to incorporate

    # load_context output
    goal: dict  # {id, title, description, family_member_id}
    notes: list[dict]  # [{id, content}]
    family_member_name: str | None
    family_member_age: int | None
    feedback_content: str | None  # raw feedback text
    extracted_issues: list[dict]  # [{title, description, category, severity}]

    # normalize_goal output
    translated_goal_title: str
    original_language: str
    clinical_restatement: str
    clinical_domain: str
    behavior_direction: str  # INCREASE | REDUCE | MAINTAIN | UNCLEAR
    developmental_tier: str
    required_keywords: list[str]
    excluded_topics: list[str]

    # plan_query output
    goal_type: str
    keywords: list[str]
    semantic_scholar_queries: list[str]
    crossref_queries: list[str]
    pubmed_queries: list[str]
    inclusion: list[str]
    exclusion: list[str]

    # search output
    candidates: list[dict]

    # extract_candidates output
    extraction_results: list[dict]

    # persist output
    persisted_count: int
    success: bool
    message: str

    # Step-level diagnostic counts (accumulated across nodes)
    diagnostics: dict

    # Settings dict (passed to every node)
    settings: dict
