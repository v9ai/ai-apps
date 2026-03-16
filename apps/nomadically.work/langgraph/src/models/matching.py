"""Job matching result models."""

from typing import TypedDict


class ScoredJob(TypedDict):
    """A job with composite match score."""
    job_id: int
    composite: float
    matched: list[str]
    missing: list[str]
    total_req: int


class MatchResult(TypedDict):
    """Final match result for a job."""
    job: dict
    matchedSkills: list[str]
    missingSkills: list[str]
    matchScore: float
    totalRequired: int
    totalMatched: int
