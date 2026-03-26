"""
Scrapus Core Domain Models — Unified Pydantic v2 Data Contracts

Shared types consumed by every pipeline module. These replace the ad-hoc
dataclasses and dicts scattered across gliner2_integration, sbert_blocker,
lightgbm_onnx_migration, structured_output, conformal_pipeline, drift_detection,
and llm_judge_ensemble.

All models:
  - Use Pydantic v2 (BaseModel, Field, model_validator)
  - Round-trip through JSON without data loss
  - Map to/from SQLite rows via .from_row() / .to_row()
  - Carry field-level validation so invalid data is rejected at creation time

Author: Scrapus ML Pipeline
Target: Apple M1 16 GB, zero cloud dependency
"""

from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EntityType(str, Enum):
    """Named-entity categories recognised by the hybrid NER ensemble."""
    PERSON = "PERSON"
    ORG = "ORG"
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    TITLE = "TITLE"
    LOCATION = "LOCATION"
    URL = "URL"


class NERBackend(str, Enum):
    """NER model backends used by the hybrid ensemble."""
    GLINER2 = "gliner2"
    DISTILBERT = "distilbert"
    SPACY = "spacy"


class QualificationStatus(str, Enum):
    """Lead qualification decision after conformal gating."""
    QUALIFIED = "qualified"
    MARGINAL = "marginal"
    REJECTED = "rejected"
    PENDING = "pending"


class CrawlStatus(str, Enum):
    """HTTP-level outcome of a crawl attempt."""
    SUCCESS = "success"
    REDIRECT = "redirect"
    CLIENT_ERROR = "client_error"
    SERVER_ERROR = "server_error"
    TIMEOUT = "timeout"
    ROBOTS_BLOCKED = "robots_blocked"
    PARSE_ERROR = "parse_error"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utcnow() -> datetime:
    """Return a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def _new_id() -> str:
    """Generate a deterministic-length hex id (32 chars)."""
    return uuid4().hex


# ---------------------------------------------------------------------------
# CrawledPage
# ---------------------------------------------------------------------------

class CrawledPage(BaseModel):
    """
    A single web page fetched by the RL crawler (Module 1).

    Stored in SQLite ``crawled_pages`` table.  The ``rl_score`` is the
    DQN-predicted value used for prioritisation; ``embedding`` is the
    optional nomic-embed-text-v1.5 768-dim vector (stored as JSON array
    in SQLite, binary blob in LanceDB).
    """

    model_config = ConfigDict(
        populate_by_name=True,
        ser_json_bytes="base64",
        str_strip_whitespace=True,
    )

    url: str = Field(..., min_length=1, description="Canonical URL")
    domain: str = Field(..., min_length=1, description="Registered domain (e.g. techcrunch.com)")
    title: str = Field(default="", max_length=1024, description="HTML <title> content")
    body_text: str = Field(default="", description="Cleaned body text (HTML stripped)")
    html_hash: str = Field(
        default="",
        max_length=64,
        description="SHA-256 hex digest of raw HTML (dedup key)",
    )
    crawl_timestamp: datetime = Field(default_factory=_utcnow, description="UTC crawl time")
    status: CrawlStatus = Field(default=CrawlStatus.SUCCESS, description="Crawl outcome")
    depth: int = Field(default=0, ge=0, le=50, description="Link-graph depth from seed URL")
    rl_score: float = Field(default=0.0, ge=-1.0, le=1.0, description="DQN predicted page value")
    embedding: Optional[list[float]] = Field(
        default=None,
        description="nomic-embed-text-v1.5 768-dim vector (optional)",
    )

    # -- validators ----------------------------------------------------------

    @field_validator("html_hash", mode="before")
    @classmethod
    def _compute_hash_if_empty(cls, v: str, info: Any) -> str:
        """If no hash is supplied, leave empty — caller should compute it."""
        if v is None:
            return ""
        return v

    @field_validator("embedding", mode="before")
    @classmethod
    def _coerce_embedding(cls, v: Any) -> Optional[list[float]]:
        if v is None:
            return None
        if isinstance(v, (bytes, memoryview)):
            import struct

            buf = bytes(v)
            n = len(buf) // 4
            return list(struct.unpack(f"<{n}f", buf))
        return [float(x) for x in v]

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "url", "domain", "title", "body_text", "html_hash",
        "crawl_timestamp", "status", "depth", "rl_score", "embedding",
    )

    def to_row(self) -> tuple:
        """Return a tuple matching ``_COLUMNS`` for ``INSERT`` statements."""
        import json as _json

        return (
            self.url,
            self.domain,
            self.title,
            self.body_text,
            self.html_hash,
            self.crawl_timestamp.isoformat(),
            self.status.value,
            self.depth,
            self.rl_score,
            _json.dumps(self.embedding) if self.embedding is not None else None,
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> CrawledPage:
        """Construct from a ``sqlite3.Row`` or positional tuple."""
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        emb_raw = d.get("embedding")
        if isinstance(emb_raw, str):
            d["embedding"] = _json.loads(emb_raw)
        return cls(**d)

    # -- convenience ---------------------------------------------------------

    def compute_html_hash(self, raw_html: str | bytes) -> str:
        """SHA-256 of the raw HTML bytes; also sets ``self.html_hash``."""
        if isinstance(raw_html, str):
            raw_html = raw_html.encode("utf-8")
        h = hashlib.sha256(raw_html).hexdigest()
        # Pydantic v2 models are mutable by default
        self.html_hash = h
        return h


# ---------------------------------------------------------------------------
# Entity
# ---------------------------------------------------------------------------

class Entity(BaseModel):
    """
    A single named entity extracted by the hybrid NER ensemble (Module 2).

    ``page_id`` links back to ``CrawledPage.url``.  ``source_model``
    records which NER backend produced the span so the conflict resolver
    and evaluator can attribute performance.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=_new_id, description="Unique entity id (hex)")
    page_id: str = Field(..., min_length=1, description="URL of the source CrawledPage")
    entity_type: EntityType = Field(..., description="NER label")
    text: str = Field(..., min_length=1, max_length=2048, description="Surface form")
    start_pos: int = Field(..., ge=0, description="Char offset (inclusive)")
    end_pos: int = Field(..., ge=0, description="Char offset (exclusive)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence")
    source_model: NERBackend = Field(..., description="Backend that produced this entity")

    # -- validators ----------------------------------------------------------

    @model_validator(mode="after")
    def _end_after_start(self) -> Entity:
        if self.end_pos <= self.start_pos:
            raise ValueError(
                f"end_pos ({self.end_pos}) must be > start_pos ({self.start_pos})"
            )
        return self

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "id", "page_id", "entity_type", "text",
        "start_pos", "end_pos", "confidence", "source_model",
    )

    def to_row(self) -> tuple:
        return (
            self.id,
            self.page_id,
            self.entity_type.value,
            self.text,
            self.start_pos,
            self.end_pos,
            self.confidence,
            self.source_model.value,
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> Entity:
        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        return cls(**d)


# ---------------------------------------------------------------------------
# EntityCluster
# ---------------------------------------------------------------------------

class EntityCluster(BaseModel):
    """
    A resolved entity cluster produced by the SBERT+DBSCAN blocker and
    DeBERTa matcher (Module 3).

    ``members`` contains the full ``Entity`` objects belonging to this
    cluster.  ``canonical_name`` and ``canonical_type`` are the
    majority-voted surface form and entity type respectively.
    """

    model_config = ConfigDict(populate_by_name=True)

    cluster_id: str = Field(default_factory=_new_id, description="Cluster id")
    canonical_name: str = Field(..., min_length=1, description="Resolved canonical name")
    canonical_type: EntityType = Field(..., description="Majority-voted entity type")
    members: list[Entity] = Field(default_factory=list, min_length=1, description="Constituent entities")
    avg_confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Mean member confidence")

    # -- validators ----------------------------------------------------------

    @model_validator(mode="after")
    def _recompute_avg_confidence(self) -> EntityCluster:
        if self.members and self.avg_confidence == 0.0:
            self.avg_confidence = round(
                sum(m.confidence for m in self.members) / len(self.members), 6
            )
        return self

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "cluster_id", "canonical_name", "canonical_type",
        "member_ids", "avg_confidence",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.cluster_id,
            self.canonical_name,
            self.canonical_type.value,
            _json.dumps([m.id for m in self.members]),
            self.avg_confidence,
        )

    @classmethod
    def from_row(
        cls,
        row: sqlite3.Row | tuple,
        members: list[Entity] | None = None,
        columns: tuple[str, ...] | None = None,
    ) -> EntityCluster:
        """
        Reconstruct from a SQLite row.

        ``members`` must be supplied separately because the DB stores only
        member ids — call ``Entity.from_row()`` for each id first.
        """
        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        d.pop("member_ids", None)
        d["members"] = members or []
        return cls(**d)


# ---------------------------------------------------------------------------
# ContactInfo
# ---------------------------------------------------------------------------

class ContactInfo(BaseModel):
    """
    Structured contact details extracted from entity clusters.

    All fields except ``source_url`` are optional because not every page
    yields every field.
    """

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    name: Optional[str] = Field(default=None, max_length=256, description="Full name")
    email: Optional[str] = Field(default=None, max_length=320, description="Email address")
    phone: Optional[str] = Field(default=None, max_length=32, description="Phone number (E.164)")
    title: Optional[str] = Field(default=None, max_length=256, description="Job title")
    source_url: str = Field(..., min_length=1, description="Page where this contact was found")

    @field_validator("email", mode="before")
    @classmethod
    def _lowercase_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip().lower()
        return v

    _COLUMNS = ("name", "email", "phone", "title", "source_url")

    def to_row(self) -> tuple:
        return (self.name, self.email, self.phone, self.title, self.source_url)

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> ContactInfo:
        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        return cls(**d)


# ---------------------------------------------------------------------------
# ConformalInterval (shared between scoring + evaluation)
# ---------------------------------------------------------------------------

class ConformalInterval(BaseModel):
    """
    A MAPIE conformal prediction interval attached to a score.

    ``method`` is one of ``naive``, ``plus``, or ``lac``
    (Least Ambiguous set-valued Classifier).
    """

    model_config = ConfigDict(populate_by_name=True)

    lower: float = Field(..., description="Lower confidence bound")
    upper: float = Field(..., description="Upper confidence bound")
    coverage_target: float = Field(default=0.95, ge=0.0, le=1.0, description="Nominal coverage (1-alpha)")
    method: str = Field(default="plus", description="Conformal method (naive|plus|lac)")

    @model_validator(mode="after")
    def _bounds_order(self) -> ConformalInterval:
        if self.upper < self.lower:
            raise ValueError(
                f"upper ({self.upper}) must be >= lower ({self.lower})"
            )
        return self

    @property
    def width(self) -> float:
        return self.upper - self.lower


# ---------------------------------------------------------------------------
# Claim (used in reports)
# ---------------------------------------------------------------------------

class Claim(BaseModel):
    """
    A single factual claim extracted from a generated report.

    Verified by the Self-RAG proxy (Module 5) against source chunks.
    """

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    text: str = Field(..., min_length=1, description="Claim text")
    verified: bool = Field(default=False, description="True if verified against source")
    source_url: Optional[str] = Field(default=None, description="URL supporting this claim")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Verification confidence")


# ---------------------------------------------------------------------------
# Lead
# ---------------------------------------------------------------------------

class Lead(BaseModel):
    """
    A scored B2B lead produced by Module 4 (lead matching) after
    conformal gating.

    ``features`` is the raw feature dict fed to the LightGBM+ONNX
    ensemble so that SHAP explanations can be recomputed downstream.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=_new_id, description="Lead id")
    cluster_id: str = Field(..., min_length=1, description="Parent EntityCluster id")
    company_name: str = Field(..., min_length=1, max_length=512, description="Resolved company name")
    contacts: list[ContactInfo] = Field(default_factory=list, description="Extracted contacts")
    score: float = Field(..., ge=0.0, le=1.0, description="Ensemble lead score")
    conformal_interval: Optional[ConformalInterval] = Field(
        default=None, description="MAPIE conformal interval for the score"
    )
    qualification: QualificationStatus = Field(
        default=QualificationStatus.PENDING,
        description="Qualification decision after conformal gating",
    )
    features: dict[str, Any] = Field(
        default_factory=dict,
        description="Feature vector for SHAP explanations",
    )

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "id", "cluster_id", "company_name", "contacts",
        "score", "conformal_lower", "conformal_upper",
        "conformal_coverage", "conformal_method",
        "qualification", "features",
    )

    def to_row(self) -> tuple:
        import json as _json

        ci = self.conformal_interval
        return (
            self.id,
            self.cluster_id,
            self.company_name,
            _json.dumps([c.model_dump() for c in self.contacts]),
            self.score,
            ci.lower if ci else None,
            ci.upper if ci else None,
            ci.coverage_target if ci else None,
            ci.method if ci else None,
            self.qualification.value,
            _json.dumps(self.features),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> Lead:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))

        # Reconstruct contacts
        contacts_raw = d.pop("contacts", "[]")
        if isinstance(contacts_raw, str):
            contacts_raw = _json.loads(contacts_raw)
        contacts = [ContactInfo(**c) for c in contacts_raw]

        # Reconstruct conformal interval
        ci_lower = d.pop("conformal_lower", None)
        ci_upper = d.pop("conformal_upper", None)
        ci_coverage = d.pop("conformal_coverage", None)
        ci_method = d.pop("conformal_method", None)
        conformal_interval = None
        if ci_lower is not None and ci_upper is not None:
            conformal_interval = ConformalInterval(
                lower=ci_lower,
                upper=ci_upper,
                coverage_target=ci_coverage or 0.95,
                method=ci_method or "plus",
            )

        # Reconstruct features
        features_raw = d.pop("features", "{}")
        if isinstance(features_raw, str):
            features_raw = _json.loads(features_raw)

        return cls(
            contacts=contacts,
            conformal_interval=conformal_interval,
            features=features_raw,
            **d,
        )


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

class Report(BaseModel):
    """
    A generated B2B lead report (Module 5).

    ``claims`` are the individual factual assertions extracted and verified
    by the Self-RAG proxy.  ``factuality_score`` is the fraction of claims
    verified against source documents.
    """

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    id: str = Field(default_factory=_new_id, description="Report id")
    lead_id: str = Field(..., min_length=1, description="Parent Lead id")
    text: str = Field(..., min_length=1, description="Full report markdown text")
    factuality_score: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Fraction of claims verified against sources",
    )
    claims: list[Claim] = Field(default_factory=list, description="Extracted factual claims")
    model_used: str = Field(
        default="llama3.1:8b-instruct-q4_K_M",
        description="LLM model identifier",
    )
    generated_at: datetime = Field(default_factory=_utcnow, description="Generation timestamp (UTC)")

    # -- validators ----------------------------------------------------------

    @model_validator(mode="after")
    def _recompute_factuality(self) -> Report:
        """Recompute factuality_score from claims if claims are present and
        the caller left factuality_score at default 0."""
        if self.claims and self.factuality_score == 0.0:
            verified = sum(1 for c in self.claims if c.verified)
            self.factuality_score = round(verified / len(self.claims), 6)
        return self

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "id", "lead_id", "text", "factuality_score",
        "claims", "model_used", "generated_at",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.id,
            self.lead_id,
            self.text,
            self.factuality_score,
            _json.dumps([c.model_dump() for c in self.claims]),
            self.model_used,
            self.generated_at.isoformat(),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> Report:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))

        claims_raw = d.pop("claims", "[]")
        if isinstance(claims_raw, str):
            claims_raw = _json.loads(claims_raw)
        claims = [Claim(**c) for c in claims_raw]

        return cls(claims=claims, **d)
