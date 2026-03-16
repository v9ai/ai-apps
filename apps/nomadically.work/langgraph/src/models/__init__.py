"""Data models for the pipeline."""

from .job import Job
from .classification import JobClassification
from .role_tagging import JobRoleTags
from .skills import ExtractedSkill, JobSkillOutput
from .matching import MatchResult, ScoredJob
from .taxonomy import SKILL_TAGS, SKILL_LABELS

__all__ = [
    "Job",
    "JobClassification",
    "JobRoleTags",
    "ExtractedSkill",
    "JobSkillOutput",
    "MatchResult",
    "ScoredJob",
    "SKILL_TAGS",
    "SKILL_LABELS",
]
