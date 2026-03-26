"""Role tagging result model."""

from pydantic import BaseModel, field_validator


class JobRoleTags(BaseModel):
    """Role tagging result from Phase 2."""
    isFrontendReact: bool = False
    isAIEngineer: bool = False
    confidence: str = "low"  # "high" | "medium" | "low"
    reason: str = ""

    @field_validator("reason", mode="before")
    @classmethod
    def truncate_reason(cls, v: str) -> str:
        return str(v)[:500] if v else ""

    @classmethod
    def from_dict(cls, data: dict) -> "JobRoleTags":
        return cls(
            isFrontendReact=bool(data.get("isFrontendReact", False)),
            isAIEngineer=bool(data.get("isAIEngineer", False)),
            confidence=str(data.get("confidence", "low")),
            reason=str(data.get("reason", "")),
        )
