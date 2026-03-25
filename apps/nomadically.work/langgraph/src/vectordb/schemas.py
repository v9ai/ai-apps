"""Data models for vectordb search results and sync operations."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ScoredContact:
    neon_id: int
    first_name: str
    last_name: str
    position: str
    company: str
    email: str | None
    email_verified: bool
    linkedin_url: str | None
    contact_type: str
    focus_areas: str
    regions: str
    ai_tier: int
    company_category: str
    distance: float  # L2 distance from LanceDB (lower = more similar)

    @property
    def similarity(self) -> float:
        """Convert L2 distance to similarity score (0-1, higher = better)."""
        return max(0.0, 1.0 - self.distance)

    @classmethod
    def from_row(cls, row: dict) -> ScoredContact:
        return cls(
            neon_id=int(row.get("neon_id", 0)),
            first_name=row.get("first_name", ""),
            last_name=row.get("last_name", ""),
            position=row.get("position", ""),
            company=row.get("company", ""),
            email=row.get("email"),
            email_verified=bool(row.get("email_verified", False)),
            linkedin_url=row.get("linkedin_url"),
            contact_type=row.get("contact_type", "other"),
            focus_areas=row.get("focus_areas", ""),
            regions=row.get("regions", ""),
            ai_tier=int(row.get("ai_tier", 0)),
            company_category=row.get("company_category", ""),
            distance=float(row.get("_distance", 0)),
        )


@dataclass
class ScoredPost:
    post_id: int
    contact_neon_id: int
    author_name: str
    post_url: str | None
    post_text: str | None
    posted_date: str | None
    reactions_count: int
    distance: float

    @property
    def similarity(self) -> float:
        return max(0.0, 1.0 - self.distance)

    @classmethod
    def from_row(cls, row: dict) -> ScoredPost:
        return cls(
            post_id=int(row.get("post_id", 0)),
            contact_neon_id=int(row.get("contact_neon_id", 0)),
            author_name=row.get("author_name", ""),
            post_url=row.get("post_url"),
            post_text=row.get("post_text"),
            posted_date=row.get("posted_date"),
            reactions_count=int(row.get("reactions_count", 0)),
            distance=float(row.get("_distance", 0)),
        )


@dataclass
class SyncResult:
    table: str
    total_rows: int
    synced: int
    mode: str  # "full" or "incremental"
    errors: list[str] = field(default_factory=list)


@dataclass
class ScoredJob:
    job_id: int
    title: str
    company_name: str
    company_key: str
    remote_policy: str  # full_remote, hybrid, onsite, unknown
    salary_min: int
    salary_max: int
    skills: str
    source_url: str
    posted_at: str
    distance: float

    @property
    def similarity(self) -> float:
        return max(0.0, 1.0 - self.distance)

    @classmethod
    def from_row(cls, row: dict) -> ScoredJob:
        return cls(
            job_id=int(row.get("neon_id", 0)),
            title=row.get("title", ""),
            company_name=row.get("company_name", ""),
            company_key=row.get("company_key", ""),
            remote_policy=row.get("remote_policy", "unknown"),
            salary_min=int(row.get("salary_min", 0)),
            salary_max=int(row.get("salary_max", 0)),
            skills=row.get("skills", ""),
            source_url=row.get("source_url", ""),
            posted_at=row.get("posted_at", ""),
            distance=float(row.get("_distance", 0)),
        )


@dataclass
class LabeledPair:
    job_id: int
    job_text: str
    profile_text: str
    label: int  # 1 = match, 0 = no match
    similarity_score: float


@dataclass
class AuditResult:
    neon_id: int
    name: str
    position: str
    company: str
    num_posts: int
    best_post_sim: float
    avg_post_sim: float
    num_relevant_posts: int
    keyword_adjustment: float
    final_score: float
    decision: str  # "keep" or "remove"
    reason: str
    sample_posts: list[str] = field(default_factory=list)
