"""
Scrapus ML-Specific Models — Pydantic v2 Data Contracts

Types consumed by the NER ensemble, entity resolution blocker/matcher,
lead scoring pipeline, conformal prediction stages, drift detection
system, and LLM-as-judge evaluation harness.

These unify the ad-hoc dataclasses in:
  - gliner2_integration.py   (NERPrediction, inference results)
  - sbert_blocker.py          (EpsilonTuningResult, blocking metrics)
  - lightgbm_onnx_migration.py (scoring outputs, SHAP)
  - conformal_pipeline.py     (ConformalPrediction, stage outputs)
  - drift_detection.py        (DetectorResult, EnsembleVotingResult)
  - llm_judge_ensemble.py     (JudgmentScore, ConsensusResult)

All models use Pydantic v2 BaseModel, support JSON round-tripping, and
provide ``.from_row()`` / ``.to_row()`` for SQLite persistence.

Author: Scrapus ML Pipeline
Target: Apple M1 16 GB, zero cloud dependency
"""

from __future__ import annotations

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

from models_core import (
    ConformalInterval,
    Entity,
    NERBackend,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return uuid4().hex


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class MatchDecision(str, Enum):
    """Binary outcome of a pairwise entity match."""
    MATCH = "match"
    NON_MATCH = "non_match"
    UNCERTAIN = "uncertain"


class DriftSeverity(str, Enum):
    """Severity levels for drift alerts (mirrors drift_detection.py)."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ===================================================================
# Module 2 — NER
# ===================================================================

class NERResult(BaseModel):
    """
    Output of the hybrid NER ensemble for a single page.

    Replaces the ``NERPrediction`` / ad-hoc dict returned by
    ``gliner2_integration.ScrapusM1Pipeline.process_page()``.
    """

    model_config = ConfigDict(populate_by_name=True)

    entities: list[Entity] = Field(default_factory=list, description="Extracted entities")
    page_id: str = Field(..., min_length=1, description="URL of the source page")
    latency_ms: float = Field(default=0.0, ge=0.0, description="Inference wall-clock (ms)")
    model_backend: NERBackend = Field(
        default=NERBackend.GLINER2,
        description="Primary backend used for this page",
    )

    # -- convenience ---------------------------------------------------------

    @property
    def entity_count(self) -> int:
        return len(self.entities)

    @property
    def avg_confidence(self) -> float:
        if not self.entities:
            return 0.0
        return sum(e.confidence for e in self.entities) / len(self.entities)

    def entities_by_type(self) -> dict[str, list[Entity]]:
        """Group entities by their EntityType value."""
        groups: dict[str, list[Entity]] = {}
        for e in self.entities:
            groups.setdefault(e.entity_type.value, []).append(e)
        return groups

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = ("page_id", "entities", "latency_ms", "model_backend")

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.page_id,
            _json.dumps([e.model_dump() for e in self.entities]),
            self.latency_ms,
            self.model_backend.value,
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> NERResult:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        entities_raw = d.pop("entities", "[]")
        if isinstance(entities_raw, str):
            entities_raw = _json.loads(entities_raw)
        entities = [Entity(**e) for e in entities_raw]
        return cls(entities=entities, **d)


# ===================================================================
# Module 3 — Entity Resolution
# ===================================================================

class BlockingResult(BaseModel):
    """
    Output of the SBERT+DBSCAN blocker.

    ``candidate_pairs`` is a list of ``[entity_a_id, entity_b_id]`` pairs
    that share at least one block.  ``reduction_ratio`` measures how many
    non-duplicate pairs were eliminated compared to the full Cartesian
    product.
    """

    model_config = ConfigDict(populate_by_name=True)

    candidate_pairs: list[tuple[str, str]] = Field(
        default_factory=list,
        description="Entity id pairs sharing a block",
    )
    reduction_ratio: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Fraction of non-duplicate pairs removed (higher is better)",
    )
    estimated_recall: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Estimated blocking recall on labeled pairs",
    )
    num_blocks: int = Field(default=0, ge=0, description="Total blocks formed")
    avg_block_size: float = Field(default=0.0, ge=0.0, description="Mean entities per block")
    epsilon: float = Field(default=0.3, gt=0.0, description="DBSCAN epsilon used")

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "candidate_pairs", "reduction_ratio", "estimated_recall",
        "num_blocks", "avg_block_size", "epsilon",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            _json.dumps(self.candidate_pairs),
            self.reduction_ratio,
            self.estimated_recall,
            self.num_blocks,
            self.avg_block_size,
            self.epsilon,
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> BlockingResult:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        pairs_raw = d.pop("candidate_pairs", "[]")
        if isinstance(pairs_raw, str):
            pairs_raw = _json.loads(pairs_raw)
        d["candidate_pairs"] = [tuple(p) for p in pairs_raw]
        return cls(**d)


class MatchResult(BaseModel):
    """
    Pairwise entity match decision from the DeBERTa adapter matcher.

    ``similarity`` is the cosine similarity (or adapter logit) between
    the two entity representations.  ``confidence`` is the calibrated
    probability that the decision is correct.
    """

    model_config = ConfigDict(populate_by_name=True)

    entity_a_id: str = Field(..., min_length=1, description="First entity id")
    entity_b_id: str = Field(..., min_length=1, description="Second entity id")
    similarity: float = Field(..., ge=-1.0, le=1.0, description="Pairwise similarity score")
    match_decision: MatchDecision = Field(..., description="Match/non-match/uncertain")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Calibrated confidence")

    @model_validator(mode="after")
    def _ids_differ(self) -> MatchResult:
        if self.entity_a_id == self.entity_b_id:
            raise ValueError("entity_a_id and entity_b_id must be different")
        return self

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "entity_a_id", "entity_b_id", "similarity",
        "match_decision", "confidence",
    )

    def to_row(self) -> tuple:
        return (
            self.entity_a_id,
            self.entity_b_id,
            self.similarity,
            self.match_decision.value,
            self.confidence,
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> MatchResult:
        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        return cls(**d)


# ===================================================================
# Module 4 — Lead Scoring
# ===================================================================

class ScoringResult(BaseModel):
    """
    Output of the LightGBM + ONNX ensemble lead scorer with MAPIE
    conformal intervals and SHAP explanations.

    ``shap_values`` maps feature names to their SHAP contribution so the
    Streamlit dashboard can render waterfall plots.
    """

    model_config = ConfigDict(populate_by_name=True)

    lead_id: str = Field(..., min_length=1, description="Lead being scored")
    score: float = Field(..., ge=0.0, le=1.0, description="Ensemble probability score")
    conformal_lower: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Lower bound of conformal interval",
    )
    conformal_upper: float = Field(
        default=1.0, ge=0.0, le=1.0,
        description="Upper bound of conformal interval",
    )
    shap_values: dict[str, float] = Field(
        default_factory=dict,
        description="Feature-name -> SHAP value map",
    )
    calibrated: bool = Field(
        default=False,
        description="True if isotonic calibration was applied",
    )

    # -- convenience ---------------------------------------------------------

    @property
    def conformal_interval(self) -> ConformalInterval:
        return ConformalInterval(
            lower=self.conformal_lower,
            upper=self.conformal_upper,
        )

    @property
    def interval_width(self) -> float:
        return self.conformal_upper - self.conformal_lower

    def top_features(self, n: int = 5) -> list[tuple[str, float]]:
        """Return the top-N features by absolute SHAP value."""
        sorted_feats = sorted(
            self.shap_values.items(),
            key=lambda kv: abs(kv[1]),
            reverse=True,
        )
        return sorted_feats[:n]

    # -- validators ----------------------------------------------------------

    @model_validator(mode="after")
    def _bounds_order(self) -> ScoringResult:
        if self.conformal_upper < self.conformal_lower:
            raise ValueError(
                f"conformal_upper ({self.conformal_upper}) must be >= "
                f"conformal_lower ({self.conformal_lower})"
            )
        return self

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "lead_id", "score", "conformal_lower", "conformal_upper",
        "shap_values", "calibrated",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.lead_id,
            self.score,
            self.conformal_lower,
            self.conformal_upper,
            _json.dumps(self.shap_values),
            int(self.calibrated),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> ScoringResult:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        shap_raw = d.pop("shap_values", "{}")
        if isinstance(shap_raw, str):
            shap_raw = _json.loads(shap_raw)
        d["shap_values"] = shap_raw
        # SQLite stores bools as ints
        if isinstance(d.get("calibrated"), int):
            d["calibrated"] = bool(d["calibrated"])
        return cls(**d)


# ===================================================================
# Module 6 — Evaluation & Monitoring
# ===================================================================

class DriftAlert(BaseModel):
    """
    A drift signal emitted by one of the multi-scale detectors
    (KS, Jensen-Shannon, cosine shift, MMD, CUSUM).

    Stored in the ``drift_checks`` monitoring table.
    """

    model_config = ConfigDict(populate_by_name=True)

    metric_name: str = Field(..., min_length=1, description="Feature or distribution being monitored")
    statistic: float = Field(..., description="Test statistic value")
    p_value: Optional[float] = Field(
        default=None, ge=0.0, le=1.0,
        description="P-value (None for non-parametric detectors)",
    )
    threshold: float = Field(default=0.05, description="Decision threshold for drift")
    window_size: int = Field(default=500, ge=1, description="Number of samples in the window")
    severity: DriftSeverity = Field(default=DriftSeverity.NONE, description="Alert severity")
    detector_name: str = Field(
        default="ensemble",
        description="Detector that produced this alert (ks|js|cosine|mmd|cusum|ensemble)",
    )
    drift_detected: bool = Field(default=False, description="True if drift exceeds threshold")
    timestamp: datetime = Field(default_factory=_utcnow, description="Alert time (UTC)")

    # -- validators ----------------------------------------------------------

    @model_validator(mode="after")
    def _infer_severity(self) -> DriftAlert:
        """Auto-set severity from p_value when caller leaves it at NONE."""
        if self.severity == DriftSeverity.NONE and self.drift_detected:
            if self.p_value is not None:
                if self.p_value < 0.001:
                    self.severity = DriftSeverity.CRITICAL
                elif self.p_value < 0.01:
                    self.severity = DriftSeverity.HIGH
                elif self.p_value < 0.05:
                    self.severity = DriftSeverity.MEDIUM
                else:
                    self.severity = DriftSeverity.LOW
            else:
                self.severity = DriftSeverity.MEDIUM
        return self

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "metric_name", "statistic", "p_value", "threshold",
        "window_size", "severity", "detector_name",
        "drift_detected", "timestamp",
    )

    def to_row(self) -> tuple:
        return (
            self.metric_name,
            self.statistic,
            self.p_value,
            self.threshold,
            self.window_size,
            self.severity.value,
            self.detector_name,
            int(self.drift_detected),
            self.timestamp.isoformat(),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> DriftAlert:
        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        if isinstance(d.get("drift_detected"), int):
            d["drift_detected"] = bool(d["drift_detected"])
        return cls(**d)


class JudgeVerdict(BaseModel):
    """
    Consensus verdict from the 2-model LLM judge ensemble
    (Llama 3.1 8B + Mistral 7B).

    Dimension scores are on a 1-5 Likert scale matching the rubric in
    ``llm_judge_ensemble.EVALUATION_RUBRIC``.  ``agreement`` is
    Krippendorff's alpha or Cohen's kappa between the two judges.
    """

    model_config = ConfigDict(populate_by_name=True)

    report_id: str = Field(default="", description="Report being evaluated (empty for ad-hoc)")
    factuality: float = Field(..., ge=1.0, le=5.0, description="Factual accuracy (1-5)")
    relevance: float = Field(..., ge=1.0, le=5.0, description="Relevance to lead profile (1-5)")
    completeness: float = Field(..., ge=1.0, le=5.0, description="Coverage of key facts (1-5)")
    formatting: float = Field(..., ge=1.0, le=5.0, description="Markdown structure / readability (1-5)")
    overall: float = Field(..., ge=1.0, le=5.0, description="Weighted overall score (1-5)")
    agreement: float = Field(
        default=0.0, ge=-1.0, le=1.0,
        description="Inter-judge agreement (Krippendorff alpha or Cohen kappa)",
    )
    agreement_metric: str = Field(
        default="krippendorff",
        description="Agreement metric name",
    )
    judges_used: list[str] = Field(
        default_factory=list,
        description="Model identifiers of judges used",
    )
    latency_ms: float = Field(default=0.0, ge=0.0, description="Total judge inference time (ms)")
    timestamp: datetime = Field(default_factory=_utcnow, description="Verdict time (UTC)")

    # -- validators ----------------------------------------------------------

    @model_validator(mode="after")
    def _recompute_overall(self) -> JudgeVerdict:
        """
        Recompute ``overall`` from dimension scores using the rubric weights
        if the caller supplied 0 or an inconsistent value.

        Weights: factuality=0.35, relevance=0.25, completeness=0.25, formatting=0.15
        """
        expected = round(
            0.35 * self.factuality
            + 0.25 * self.relevance
            + 0.25 * self.completeness
            + 0.15 * self.formatting,
            4,
        )
        # Only override if overall looks like a default / placeholder
        if self.overall == 1.0 and expected > 1.5:
            self.overall = expected
        return self

    # -- convenience ---------------------------------------------------------

    @property
    def dimension_scores(self) -> dict[str, float]:
        return {
            "factuality": self.factuality,
            "relevance": self.relevance,
            "completeness": self.completeness,
            "formatting": self.formatting,
        }

    @property
    def passes_threshold(self) -> bool:
        """True if overall score >= 3.5 (default acceptance bar)."""
        return self.overall >= 3.5

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "report_id", "factuality", "relevance", "completeness",
        "formatting", "overall", "agreement", "agreement_metric",
        "judges_used", "latency_ms", "timestamp",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.report_id,
            self.factuality,
            self.relevance,
            self.completeness,
            self.formatting,
            self.overall,
            self.agreement,
            self.agreement_metric,
            _json.dumps(self.judges_used),
            self.latency_ms,
            self.timestamp.isoformat(),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> JudgeVerdict:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        judges_raw = d.pop("judges_used", "[]")
        if isinstance(judges_raw, str):
            judges_raw = _json.loads(judges_raw)
        d["judges_used"] = judges_raw
        return cls(**d)
