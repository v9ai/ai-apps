"""
Scrapus Pipeline State Models — Pydantic v2 Data Contracts

Configuration, stage tracking, checkpointing, and memory monitoring types
consumed by memory_management.py, benchmark_harness.py, e2e_benchmark.py,
and the Streamlit monitoring dashboard.

These replace the ad-hoc dataclasses in memory_management (MemorySnapshot,
StageTimeline, BatchSizeRecommendation) and benchmark_harness (BenchmarkResult,
LatencySample, ThroughputMetric) with a single coherent set of models that
serialise cleanly to JSON and SQLite.

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


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class StageStatus(str, Enum):
    """Lifecycle status of a single pipeline stage."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class PipelineStatus(str, Enum):
    """Lifecycle status of an end-to-end pipeline run."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StageName(str, Enum):
    """Canonical stage identifiers used across the pipeline."""
    CRAWL = "crawl"
    NER = "ner"
    ENTITY_RESOLUTION = "entity_resolution"
    LEAD_SCORING = "lead_scoring"
    REPORT_GENERATION = "report_generation"
    EVALUATION = "evaluation"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return uuid4().hex


# ---------------------------------------------------------------------------
# PipelineConfig
# ---------------------------------------------------------------------------

class PipelineConfig(BaseModel):
    """
    Immutable configuration snapshot for a pipeline run.

    ``stages_to_run`` controls which stages execute (default: all six).
    ``memory_budget_gb`` caps total process RSS — the memory manager will
    reduce batch sizes or skip optional stages when the budget is exceeded.
    ``batch_sizes`` maps ``StageName.value`` to the initial batch size; the
    adaptive batcher may lower it at runtime.
    """

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    seed_urls: list[str] = Field(
        ..., min_length=1,
        description="Initial URLs to crawl",
    )
    output_dir: str = Field(
        default="./scrapus_output",
        description="Root directory for artefacts (DB, models, reports)",
    )
    max_pages: int = Field(
        default=50_000, ge=1, le=10_000_000,
        description="Hard cap on pages to crawl",
    )
    stages_to_run: list[StageName] = Field(
        default_factory=lambda: list(StageName),
        description="Ordered list of stages to execute",
    )
    memory_budget_gb: float = Field(
        default=12.0, gt=0.0, le=128.0,
        description="Total RSS budget in GB (M1 16 GB -> 12 GB safe)",
    )
    batch_sizes: dict[str, int] = Field(
        default_factory=lambda: {
            StageName.CRAWL.value: 64,
            StageName.NER.value: 32,
            StageName.ENTITY_RESOLUTION.value: 256,
            StageName.LEAD_SCORING.value: 1024,
            StageName.REPORT_GENERATION.value: 1,
            StageName.EVALUATION.value: 128,
        },
        description="Per-stage initial batch sizes (may be lowered at runtime)",
    )

    # -- validators ----------------------------------------------------------

    @field_validator("seed_urls", mode="before")
    @classmethod
    def _deduplicate_urls(cls, v: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for url in v:
            normed = url.strip().rstrip("/")
            if normed and normed not in seen:
                seen.add(normed)
                out.append(normed)
        return out

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "seed_urls", "output_dir", "max_pages",
        "stages_to_run", "memory_budget_gb", "batch_sizes",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            _json.dumps(self.seed_urls),
            self.output_dir,
            self.max_pages,
            _json.dumps([s.value for s in self.stages_to_run]),
            self.memory_budget_gb,
            _json.dumps(self.batch_sizes),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> PipelineConfig:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        for key in ("seed_urls", "stages_to_run", "batch_sizes"):
            if isinstance(d.get(key), str):
                d[key] = _json.loads(d[key])
        return cls(**d)


# ---------------------------------------------------------------------------
# StageResult
# ---------------------------------------------------------------------------

class StageResult(BaseModel):
    """
    Outcome of a single pipeline stage execution.

    Recorded by ``MemoryManager.track_stage()`` and persisted in the
    ``stage_timing`` monitoring table.
    """

    model_config = ConfigDict(populate_by_name=True)

    stage_name: StageName = Field(..., description="Which stage ran")
    status: StageStatus = Field(default=StageStatus.PENDING, description="Outcome")
    items_in: int = Field(default=0, ge=0, description="Items entering the stage")
    items_out: int = Field(default=0, ge=0, description="Items leaving the stage")
    duration_sec: float = Field(default=0.0, ge=0.0, description="Wall-clock seconds")
    peak_memory_mb: float = Field(default=0.0, ge=0.0, description="Peak RSS during stage (MB)")
    errors: list[str] = Field(default_factory=list, description="Error messages (if any)")

    # -- convenience ---------------------------------------------------------

    @property
    def throughput(self) -> float:
        """Items per second (0 if duration is zero)."""
        if self.duration_sec <= 0:
            return 0.0
        return self.items_out / self.duration_sec

    @property
    def drop_rate(self) -> float:
        """Fraction of items dropped (filtered/errored) by this stage."""
        if self.items_in <= 0:
            return 0.0
        return 1.0 - (self.items_out / self.items_in)

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "stage_name", "status", "items_in", "items_out",
        "duration_sec", "peak_memory_mb", "errors",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.stage_name.value,
            self.status.value,
            self.items_in,
            self.items_out,
            self.duration_sec,
            self.peak_memory_mb,
            _json.dumps(self.errors),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> StageResult:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        if isinstance(d.get("errors"), str):
            d["errors"] = _json.loads(d["errors"])
        return cls(**d)


# ---------------------------------------------------------------------------
# PipelineRun
# ---------------------------------------------------------------------------

class PipelineRun(BaseModel):
    """
    Full metadata for one end-to-end pipeline execution.

    ``stage_results`` is populated incrementally as each stage completes.
    ``end_time`` is ``None`` while the run is still in progress.
    """

    model_config = ConfigDict(populate_by_name=True)

    run_id: str = Field(default_factory=_new_id, description="Unique run identifier")
    config: PipelineConfig = Field(..., description="Frozen config snapshot")
    stage_results: list[StageResult] = Field(
        default_factory=list,
        description="Per-stage outcomes (appended as stages finish)",
    )
    start_time: datetime = Field(default_factory=_utcnow, description="Run start (UTC)")
    end_time: Optional[datetime] = Field(default=None, description="Run end (UTC, None if running)")
    status: PipelineStatus = Field(default=PipelineStatus.PENDING, description="Run lifecycle status")

    # -- convenience ---------------------------------------------------------

    @property
    def total_duration_sec(self) -> float:
        if self.end_time is None:
            return (_utcnow() - self.start_time).total_seconds()
        return (self.end_time - self.start_time).total_seconds()

    @property
    def total_items_out(self) -> int:
        if not self.stage_results:
            return 0
        return self.stage_results[-1].items_out

    @property
    def peak_memory_mb(self) -> float:
        if not self.stage_results:
            return 0.0
        return max(sr.peak_memory_mb for sr in self.stage_results)

    @property
    def failed_stages(self) -> list[StageResult]:
        return [sr for sr in self.stage_results if sr.status == StageStatus.FAILED]

    def finish(self, status: PipelineStatus | None = None) -> None:
        """Mark the run as finished, inferring status from stage results."""
        self.end_time = _utcnow()
        if status is not None:
            self.status = status
        elif any(sr.status == StageStatus.FAILED for sr in self.stage_results):
            self.status = PipelineStatus.FAILED
        else:
            self.status = PipelineStatus.COMPLETED

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "run_id", "config", "stage_results",
        "start_time", "end_time", "status",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.run_id,
            self.config.model_dump_json(),
            _json.dumps([sr.model_dump() for sr in self.stage_results]),
            self.start_time.isoformat(),
            self.end_time.isoformat() if self.end_time else None,
            self.status.value,
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> PipelineRun:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))

        # Reconstruct config
        config_raw = d.pop("config")
        if isinstance(config_raw, str):
            config_raw = _json.loads(config_raw)
        config = PipelineConfig(**config_raw)

        # Reconstruct stage results
        sr_raw = d.pop("stage_results", "[]")
        if isinstance(sr_raw, str):
            sr_raw = _json.loads(sr_raw)
        stage_results = [StageResult(**sr) for sr in sr_raw]

        return cls(config=config, stage_results=stage_results, **d)


# ---------------------------------------------------------------------------
# CheckpointData
# ---------------------------------------------------------------------------

class CheckpointData(BaseModel):
    """
    Resumable checkpoint written between batches so the pipeline can
    restart from the last completed batch after a crash or OOM kill.

    ``completed_items`` and ``pending_items`` are opaque JSON-serialisable
    payloads (typically lists of ids).
    """

    model_config = ConfigDict(populate_by_name=True)

    run_id: str = Field(..., min_length=1, description="Parent PipelineRun id")
    stage_name: StageName = Field(..., description="Stage being checkpointed")
    completed_items: list[Any] = Field(
        default_factory=list,
        description="Ids of items already processed",
    )
    pending_items: list[Any] = Field(
        default_factory=list,
        description="Ids of items remaining",
    )
    timestamp: datetime = Field(default_factory=_utcnow, description="Checkpoint time (UTC)")

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "run_id", "stage_name", "completed_items",
        "pending_items", "timestamp",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.run_id,
            self.stage_name.value,
            _json.dumps(self.completed_items),
            _json.dumps(self.pending_items),
            self.timestamp.isoformat(),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> CheckpointData:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        for key in ("completed_items", "pending_items"):
            if isinstance(d.get(key), str):
                d[key] = _json.loads(d[key])
        return cls(**d)

    # -- convenience ---------------------------------------------------------

    @property
    def progress_ratio(self) -> float:
        """Fraction of items completed."""
        total = len(self.completed_items) + len(self.pending_items)
        if total == 0:
            return 0.0
        return len(self.completed_items) / total


# ---------------------------------------------------------------------------
# MemorySnapshot
# ---------------------------------------------------------------------------

class MemorySnapshot(BaseModel):
    """
    Point-in-time process memory reading.

    Replaces the dataclass ``MemorySnapshot`` in ``memory_management.py``.
    Values are in **megabytes** for human readability; the original
    byte-granularity values can be recovered by multiplying by 1,048,576.
    """

    model_config = ConfigDict(populate_by_name=True)

    rss_mb: float = Field(..., ge=0.0, description="Resident set size (MB)")
    vms_mb: float = Field(..., ge=0.0, description="Virtual memory size (MB)")
    swap_mb: float = Field(default=0.0, ge=0.0, description="Swap used (MB)")
    available_mb: float = Field(default=0.0, ge=0.0, description="System available RAM (MB)")
    models_loaded: list[str] = Field(
        default_factory=list,
        description="Names of ML models currently resident in memory",
    )
    timestamp: datetime = Field(default_factory=_utcnow, description="Snapshot time (UTC)")

    # -- convenience ---------------------------------------------------------

    @property
    def total_pressure_mb(self) -> float:
        """RSS + swap — a proxy for real memory pressure on macOS."""
        return self.rss_mb + self.swap_mb

    @property
    def headroom_mb(self) -> float:
        """Estimated headroom before OOM (available - swap)."""
        return max(0.0, self.available_mb - self.swap_mb)

    # -- SQLite helpers ------------------------------------------------------

    _COLUMNS = (
        "rss_mb", "vms_mb", "swap_mb", "available_mb",
        "models_loaded", "timestamp",
    )

    def to_row(self) -> tuple:
        import json as _json

        return (
            self.rss_mb,
            self.vms_mb,
            self.swap_mb,
            self.available_mb,
            _json.dumps(self.models_loaded),
            self.timestamp.isoformat(),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row | tuple, columns: tuple[str, ...] | None = None) -> MemorySnapshot:
        import json as _json

        cols = columns or cls._COLUMNS
        if isinstance(row, sqlite3.Row):
            d = dict(row)
        else:
            d = dict(zip(cols, row))
        if isinstance(d.get("models_loaded"), str):
            d["models_loaded"] = _json.loads(d["models_loaded"])
        return cls(**d)

    @classmethod
    def capture(cls, models_loaded: list[str] | None = None) -> MemorySnapshot:
        """Take a live snapshot using ``psutil``."""
        import psutil

        proc = psutil.Process()
        mem = proc.memory_info()
        vm = psutil.virtual_memory()
        swap = psutil.swap_memory()

        return cls(
            rss_mb=round(mem.rss / (1024 * 1024), 2),
            vms_mb=round(mem.vms / (1024 * 1024), 2),
            swap_mb=round(swap.used / (1024 * 1024), 2),
            available_mb=round(vm.available / (1024 * 1024), 2),
            models_loaded=models_loaded or [],
        )
