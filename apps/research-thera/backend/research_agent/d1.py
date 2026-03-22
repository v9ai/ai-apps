"""Data models and URL path parser for the research pipeline."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class Issue:
    id: int
    title: str
    description: str
    category: str
    severity: str
    recommendations: Optional[str] = None  # JSON array string


@dataclass
class Characteristic:
    id: int
    family_member_id: int
    category: str
    title: str
    description: Optional[str] = None
    severity: Optional[str] = None
    impairment_domains: Optional[str] = None  # JSON array string


@dataclass
class FamilyMember:
    id: int
    first_name: str
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    age_years: Optional[int] = None


@dataclass
class ResearchPaper:
    id: int
    title: str
    authors: Optional[str] = None  # JSON array
    year: Optional[int] = None
    key_findings: Optional[str] = None  # JSON array
    therapeutic_techniques: Optional[str] = None  # JSON array
    evidence_level: Optional[str] = None
    relevance_score: Optional[int] = None


@dataclass
class ContactFeedback:
    id: int
    contact_id: int
    family_member_id: int
    subject: str
    content: str
    feedback_date: str
    tags: Optional[str] = None
    source: Optional[str] = None
    extracted_issues: Optional[str] = None


@dataclass
class CharacteristicTarget:
    family_member_id: int
    characteristic_id: int


@dataclass
class FeedbackTarget:
    family_member_id: int
    feedback_id: int


def parse_path(path: str) -> "CharacteristicTarget | FeedbackTarget":
    """Parse URL paths into therapy targets.

    /family/{id}/characteristics/{id} -> CharacteristicTarget
    /family/{name}/contacts/{name}/feedback/{id} -> FeedbackTarget
    """
    parts = path.strip("/").split("/")
    if len(parts) == 4 and parts[0] == "family" and parts[2] == "characteristics":
        return CharacteristicTarget(
            family_member_id=int(parts[1]),
            characteristic_id=int(parts[3]),
        )
    if len(parts) == 6 and parts[0] == "family" and parts[2] == "contacts" and parts[4] == "feedback":
        return FeedbackTarget(
            family_member_id=0,  # resolved from feedback row
            feedback_id=int(parts[5]),
        )
    raise ValueError(
        f"Expected /family/{{id}}/characteristics/{{id}} or "
        f"/family/{{name}}/contacts/{{name}}/feedback/{{id}}, got: {path}"
    )
