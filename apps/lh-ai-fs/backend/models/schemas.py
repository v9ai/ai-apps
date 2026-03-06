from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class VerificationStatus(str, Enum):
    SUPPORTED = "supported"
    NOT_SUPPORTED = "not_supported"
    COULD_NOT_VERIFY = "could_not_verify"
    MISLEADING = "misleading"


class ConsistencyStatus(str, Enum):
    CONSISTENT = "consistent"
    CONTRADICTORY = "contradictory"
    PARTIAL = "partial"
    COULD_NOT_VERIFY = "could_not_verify"


class Citation(BaseModel):
    citation_text: str
    claimed_proposition: Optional[str] = None
    source_location: str = ""
    context: Optional[str] = None


class VerifiedCitation(BaseModel):
    citation: Optional[Citation] = None
    is_supported: bool = False
    confidence: float = Field(default=0.5, ge=0, le=1)
    confidence_reasoning: Optional[str] = None
    discrepancies: List[str] = Field(default_factory=list)
    supporting_evidence: Optional[str] = None
    status: str = "could_not_verify"
    notes: Optional[str] = None


class Fact(BaseModel):
    fact_text: str = ""
    source_document: str = ""
    location: str = ""
    category: Optional[str] = None


class VerifiedFact(BaseModel):
    fact: Optional[Fact] = None
    is_consistent: bool = True
    confidence: float = Field(default=0.5, ge=0, le=1)
    confidence_reasoning: Optional[str] = None
    contradictory_sources: List[str] = Field(default_factory=list)
    supporting_sources: List[str] = Field(default_factory=list)
    status: str = "could_not_verify"
    summary: Optional[str] = None

    @field_validator("is_consistent", mode="before")
    @classmethod
    def coerce_is_consistent(cls, v):
        if v is None:
            return True
        return v


class Finding(BaseModel):
    id: str
    type: str = ""
    description: str = ""
    severity: str = "medium"
    confidence: float = Field(default=0.5, ge=0, le=1)
    confidence_reasoning: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)
    recommendation: Optional[str] = None

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v)

    @field_validator("evidence", mode="before")
    @classmethod
    def coerce_evidence(cls, v):
        if isinstance(v, str):
            return [v]
        return v


class ConfidenceScores(BaseModel):
    citation_verification: float = Field(default=0.0, ge=0, le=1)
    fact_consistency: float = Field(default=0.0, ge=0, le=1)
    overall: float = Field(default=0.0, ge=0, le=1)


class JudicialMemo(BaseModel):
    memo: str = ""
    key_issues: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    overall_assessment: str = ""


class AgentStatus(BaseModel):
    agent_name: str
    status: str = "pending"
    duration_ms: Optional[int] = None
    error: Optional[str] = None


class VerificationReport(BaseModel):
    motion_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    verified_citations: List[VerifiedCitation] = Field(default_factory=list)
    verified_facts: List[VerifiedFact] = Field(default_factory=list)
    confidence_scores: ConfidenceScores
    top_findings: List[Finding] = Field(default_factory=list)
    unknown_issues: List[str] = Field(default_factory=list)
    judicial_memo: Optional[JudicialMemo] = None
    pipeline_status: List[AgentStatus] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
