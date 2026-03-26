"""EU-remote classification result model."""

from pydantic import BaseModel


class JobClassification(BaseModel):
    """EU-remote classification result.

    Accepts both camelCase (isRemoteEU) and snake_case (is_remote_eu) keys.
    """
    isRemoteEU: bool = False
    confidence: str = "low"  # "high" | "medium" | "low"
    reason: str = ""

    @classmethod
    def from_dict(cls, data: dict) -> "JobClassification":
        is_eu = data.get("isRemoteEU", data.get("is_remote_eu", False))
        return cls(
            isRemoteEU=bool(is_eu),
            confidence=str(data.get("confidence", "low")),
            reason=str(data.get("reason", "")),
        )
