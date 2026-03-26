"""State definitions for the linkedin_contact pipeline."""

from typing import TypedDict


class ProfileAnalysis(TypedDict):
    is_relevant: bool
    contact_type: str  # recruiter, hiring_manager, founder, talent_partner, other
    focus_areas: list[str]  # e.g. ["AI", "ML", "Data Science"]
    regions: list[str]  # e.g. ["UK", "EU", "EMEA"]
    relevance_score: float  # 0.0-1.0
    reason: str


class LinkedInContactState(TypedDict):
    # Input
    linkedin_url: str
    name: str
    headline: str
    about: str
    location: str

    # Intermediate
    profile_analysis: ProfileAnalysis | None

    # Output
    contact_id: int | None
    skipped: bool
