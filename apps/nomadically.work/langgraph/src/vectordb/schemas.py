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
