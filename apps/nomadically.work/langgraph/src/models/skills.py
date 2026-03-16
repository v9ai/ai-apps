"""Skill extraction models."""

from pydantic import BaseModel, field_validator


class ExtractedSkill(BaseModel):
    """A single skill extracted from a job description."""
    tag: str = ""
    level: str = "preferred"  # "required" | "preferred" | "nice"
    confidence: float = 0.7
    evidence: str = ""

    @field_validator("evidence", mode="before")
    @classmethod
    def truncate_evidence(cls, v: str) -> str:
        return str(v)[:300] if v else ""

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, float(v)))


class JobSkillOutput(BaseModel):
    """Structured output for skill extraction."""
    skills: list[ExtractedSkill] = []

    @classmethod
    def from_dict(cls, data: dict) -> "JobSkillOutput":
        raw_skills = data.get("skills") or []
        skills = []
        for s in raw_skills:
            if isinstance(s, dict):
                skills.append(ExtractedSkill(
                    tag=str(s.get("tag", "")),
                    level=str(s.get("level", "preferred")),
                    confidence=float(s.get("confidence", 0.7)),
                    evidence=str(s.get("evidence", "")),
                ))
        return cls(skills=skills)
