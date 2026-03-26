# error_handling.py
"""
Centralized error handling for Scrapus M1 16GB local deployment.

Provides:
1. Custom exception hierarchy (ScrapusError -> stage-specific errors)
2. Error context: stage, item_id, memory_snapshot, traceback on every exception
3. Recovery strategies per error type (retry, skip, fallback, abort)
4. Error rate tracking: sliding-window counts per stage
5. Circuit breaker: disable stage after N consecutive failures
6. Dead letter queue: failed items stored in SQLite for later retry
7. Error aggregation: group similar errors, report counts

Thread-safe, zero external dependencies (Python stdlib + psutil).
"""

from __future__ import annotations

import collections
import json
import logging
import os
import sqlite3
import sys
import threading
import time
import traceback as tb_module
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple, Type


logger = logging.getLogger("scrapus.errors")

# ============================================================================
# Constants
# ============================================================================

DEFAULT_DATA_DIR = Path.home() / "scrapus_data"
CIRCUIT_BREAKER_THRESHOLD = 5        # consecutive failures before open
CIRCUIT_BREAKER_RESET_SECS = 120.0   # seconds before half-open
ERROR_WINDOW_SIZE = 100              # sliding window length
DLQ_DB_NAME = "dead_letter_queue.db"

# Recovery strategy names
RETRY = "retry"
SKIP = "skip"
FALLBACK = "fallback"
ABORT = "abort"


# ============================================================================
# Memory snapshot helper
# ============================================================================

@dataclass(frozen=True)
class ErrorMemorySnapshot:
    """Lightweight memory state captured at error time."""
    rss_mb: float
    vms_mb: float
    swap_mb: float
    available_mb: float

    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


def _capture_memory() -> ErrorMemorySnapshot:
    try:
        import psutil  # type: ignore[import-untyped]
        proc = psutil.Process(os.getpid())
        mem = proc.memory_info()
        swap = psutil.swap_memory()
        vm = psutil.virtual_memory()
        return ErrorMemorySnapshot(
            rss_mb=round(mem.rss / (1024 * 1024), 2),
            vms_mb=round(mem.vms / (1024 * 1024), 2),
            swap_mb=round(swap.used / (1024 * 1024), 2),
            available_mb=round(vm.available / (1024 * 1024), 2),
        )
    except Exception:
        return ErrorMemorySnapshot(0.0, 0.0, 0.0, 0.0)


# ============================================================================
# Recovery strategy enum
# ============================================================================

class RecoveryStrategy(Enum):
    RETRY = "retry"
    SKIP = "skip"
    FALLBACK = "fallback"
    ABORT = "abort"


# ============================================================================
# Exception hierarchy
# ============================================================================

class ScrapusError(Exception):
    """
    Base exception for all Scrapus pipeline errors.

    Every ScrapusError carries:
        - stage:   pipeline stage where the error occurred
        - item_id: identifier of the item being processed
        - memory:  memory snapshot at error time
        - recovery: suggested recovery strategy
    """

    default_recovery: RecoveryStrategy = RecoveryStrategy.ABORT

    def __init__(
        self,
        message: str,
        *,
        stage: Optional[str] = None,
        item_id: Optional[str] = None,
        cause: Optional[Exception] = None,
        recovery: Optional[RecoveryStrategy] = None,
    ) -> None:
        super().__init__(message)
        self.stage = stage
        self.item_id = item_id
        self.cause = cause
        self.recovery = recovery or self.default_recovery
        self.memory = _capture_memory()
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.traceback_str = tb_module.format_exc()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_type": type(self).__name__,
            "message": str(self),
            "stage": self.stage,
            "item_id": self.item_id,
            "recovery": self.recovery.value,
            "memory": self.memory.to_dict(),
            "timestamp": self.timestamp,
            "traceback": self.traceback_str,
            "cause": str(self.cause) if self.cause else None,
        }


# ---- Module 1: Crawl errors ------------------------------------------------

class CrawlError(ScrapusError):
    """Errors during web crawling."""
    default_recovery = RecoveryStrategy.RETRY


class NetworkError(CrawlError):
    """Network connectivity failure (DNS, TCP, TLS)."""
    default_recovery = RecoveryStrategy.RETRY


class TimeoutError(CrawlError):
    """HTTP request timed out."""
    default_recovery = RecoveryStrategy.RETRY


class RobotsBlockedError(CrawlError):
    """URL blocked by robots.txt."""
    default_recovery = RecoveryStrategy.SKIP


class RateLimitedError(CrawlError):
    """HTTP 429 or equivalent rate-limit response."""
    default_recovery = RecoveryStrategy.RETRY


# ---- Module 2: Extraction errors -------------------------------------------

class ExtractionError(ScrapusError):
    """Errors during NER / entity extraction."""
    default_recovery = RecoveryStrategy.SKIP


class ModelLoadFailedError(ExtractionError):
    """Failed to load NER model (file missing, corrupt, incompatible)."""
    default_recovery = RecoveryStrategy.ABORT


class InferenceFailedError(ExtractionError):
    """Model inference produced an error (bad input, numerical instability)."""
    default_recovery = RecoveryStrategy.SKIP


class OOMError(ExtractionError):
    """Out-of-memory during extraction (batch too large, model too heavy)."""
    default_recovery = RecoveryStrategy.FALLBACK


# ---- Module 3: Entity resolution errors ------------------------------------

class ResolutionError(ScrapusError):
    """Errors during entity resolution."""
    default_recovery = RecoveryStrategy.SKIP


class BlockingFailedError(ResolutionError):
    """SBERT/DBSCAN blocking stage failed."""
    default_recovery = RecoveryStrategy.FALLBACK


class MatchingFailedError(ResolutionError):
    """Pairwise matching (DeBERTa) failed."""
    default_recovery = RecoveryStrategy.SKIP


class ClusteringFailedError(ResolutionError):
    """Connected-component or GNN clustering failed."""
    default_recovery = RecoveryStrategy.SKIP


# ---- Module 4: Lead scoring errors -----------------------------------------

class ScoringError(ScrapusError):
    """Errors during lead scoring."""
    default_recovery = RecoveryStrategy.SKIP


class ModelMissingError(ScoringError):
    """Scoring model artifact not found."""
    default_recovery = RecoveryStrategy.ABORT


class CalibrationFailedError(ScoringError):
    """Isotonic / Platt calibration failed."""
    default_recovery = RecoveryStrategy.FALLBACK


class ConformalFailedError(ScoringError):
    """MAPIE conformal prediction failed."""
    default_recovery = RecoveryStrategy.FALLBACK


# ---- Module 5: Report generation errors ------------------------------------

class ReportError(ScrapusError):
    """Errors during report generation."""
    default_recovery = RecoveryStrategy.RETRY


class LLMTimeoutError(ReportError):
    """LLM inference timed out (Ollama, MLX)."""
    default_recovery = RecoveryStrategy.RETRY


class GenerationFailedError(ReportError):
    """LLM produced invalid / empty output."""
    default_recovery = RecoveryStrategy.RETRY


class VerificationFailedError(ReportError):
    """Self-RAG verification rejected the generated report."""
    default_recovery = RecoveryStrategy.RETRY


# ---- Module 0/6: Storage errors -------------------------------------------

class StorageError(ScrapusError):
    """Errors accessing local storage (SQLite, LanceDB, disk)."""
    default_recovery = RecoveryStrategy.RETRY


class SQLiteLockedError(StorageError):
    """SQLite database is locked (concurrent write contention)."""
    default_recovery = RecoveryStrategy.RETRY


class LanceDBError(StorageError):
    """LanceDB read/write error."""
    default_recovery = RecoveryStrategy.RETRY


class DiskFullError(StorageError):
    """Disk space exhausted."""
    default_recovery = RecoveryStrategy.ABORT


# ---- Memory errors ---------------------------------------------------------

class MemoryPressureError(ScrapusError):
    """Memory-related errors (OOM, swap thrashing)."""
    default_recovery = RecoveryStrategy.FALLBACK


class OOMWarningError(MemoryPressureError):
    """RSS approaching memory budget (>80%)."""
    default_recovery = RecoveryStrategy.FALLBACK


class OOMCriticalError(MemoryPressureError):
    """RSS exceeds memory budget (>95%)."""
    default_recovery = RecoveryStrategy.ABORT


class SwapExceededError(MemoryPressureError):
    """Swap usage exceeds threshold (>500 MB warning, >1.5 GB critical)."""
    default_recovery = RecoveryStrategy.ABORT


# ============================================================================
# Error rate tracker (sliding window)
# ============================================================================

@dataclass
class _ErrorEvent:
    timestamp: float
    error_type: str
    stage: str


class ErrorRateTracker:
    """
    Track error rates per stage using a fixed-size sliding window.

    Thread-safe.  Used by the circuit breaker and aggregation layer.
    """

    def __init__(self, window_size: int = ERROR_WINDOW_SIZE) -> None:
        self._lock = threading.Lock()
        self._window_size = window_size
        self._windows: Dict[str, Deque[_ErrorEvent]] = {}
        self._consecutive: Dict[str, int] = {}
        self._total: Dict[str, int] = {}

    def record(self, stage: str, error: Exception) -> None:
        with self._lock:
            if stage not in self._windows:
                self._windows[stage] = collections.deque(maxlen=self._window_size)
                self._consecutive[stage] = 0
                self._total[stage] = 0

            evt = _ErrorEvent(
                timestamp=time.monotonic(),
                error_type=type(error).__name__,
                stage=stage,
            )
            self._windows[stage].append(evt)
            self._consecutive[stage] += 1
            self._total[stage] += 1

    def record_success(self, stage: str) -> None:
        """Reset consecutive failure count on a successful operation."""
        with self._lock:
            self._consecutive[stage] = 0

    def get_rate(self, stage: str, window_secs: float = 60.0) -> float:
        """Errors per second over the last ``window_secs``."""
        now = time.monotonic()
        cutoff = now - window_secs
        with self._lock:
            dq = self._windows.get(stage)
            if not dq:
                return 0.0
            count = sum(1 for e in dq if e.timestamp >= cutoff)
            return count / window_secs

    def get_consecutive(self, stage: str) -> int:
        with self._lock:
            return self._consecutive.get(stage, 0)

    def get_total(self, stage: str) -> int:
        with self._lock:
            return self._total.get(stage, 0)

    def get_window_counts(self, stage: str) -> Dict[str, int]:
        """Return error-type -> count within the current window."""
        with self._lock:
            dq = self._windows.get(stage)
            if not dq:
                return {}
            counts: Dict[str, int] = {}
            for e in dq:
                counts[e.error_type] = counts.get(e.error_type, 0) + 1
            return counts

    def summary(self) -> Dict[str, Any]:
        with self._lock:
            return {
                stage: {
                    "total": self._total.get(stage, 0),
                    "consecutive": self._consecutive.get(stage, 0),
                    "window_counts": {
                        etype: sum(1 for e in dq if e.error_type == etype)
                        for etype in {e.error_type for e in dq}
                    },
                }
                for stage, dq in self._windows.items()
            }


# ============================================================================
# Circuit breaker
# ============================================================================

class CircuitState(Enum):
    CLOSED = "closed"       # normal operation
    OPEN = "open"           # stage disabled
    HALF_OPEN = "half_open" # probing (allow single request)


@dataclass
class _CircuitBreakerState:
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_time: float = 0.0
    last_success_time: float = 0.0
    total_trips: int = 0


class CircuitBreaker:
    """
    Per-stage circuit breaker.

    Transitions:
        CLOSED  -> OPEN       after ``threshold`` consecutive failures
        OPEN    -> HALF_OPEN  after ``reset_timeout`` seconds
        HALF_OPEN -> CLOSED   on next success
        HALF_OPEN -> OPEN     on next failure
    """

    def __init__(
        self,
        threshold: int = CIRCUIT_BREAKER_THRESHOLD,
        reset_timeout: float = CIRCUIT_BREAKER_RESET_SECS,
    ) -> None:
        self._threshold = threshold
        self._reset_timeout = reset_timeout
        self._lock = threading.Lock()
        self._states: Dict[str, _CircuitBreakerState] = {}

    def _get(self, stage: str) -> _CircuitBreakerState:
        if stage not in self._states:
            self._states[stage] = _CircuitBreakerState()
        return self._states[stage]

    def allow_request(self, stage: str) -> bool:
        """Return True if the stage is allowed to execute."""
        with self._lock:
            cb = self._get(stage)
            if cb.state == CircuitState.CLOSED:
                return True
            if cb.state == CircuitState.OPEN:
                elapsed = time.monotonic() - cb.last_failure_time
                if elapsed >= self._reset_timeout:
                    cb.state = CircuitState.HALF_OPEN
                    logger.warning(
                        "Circuit breaker HALF_OPEN for stage '%s' (%.1fs since last failure)",
                        stage, elapsed,
                    )
                    return True
                return False
            # HALF_OPEN: allow one probe
            return True

    def record_success(self, stage: str) -> None:
        with self._lock:
            cb = self._get(stage)
            cb.failure_count = 0
            cb.last_success_time = time.monotonic()
            if cb.state == CircuitState.HALF_OPEN:
                cb.state = CircuitState.CLOSED
                logger.info("Circuit breaker CLOSED for stage '%s'", stage)

    def record_failure(self, stage: str) -> None:
        with self._lock:
            cb = self._get(stage)
            cb.failure_count += 1
            cb.last_failure_time = time.monotonic()
            if cb.state == CircuitState.HALF_OPEN:
                cb.state = CircuitState.OPEN
                cb.total_trips += 1
                logger.error(
                    "Circuit breaker re-OPEN for stage '%s' (probe failed)",
                    stage,
                )
            elif cb.failure_count >= self._threshold:
                if cb.state != CircuitState.OPEN:
                    cb.state = CircuitState.OPEN
                    cb.total_trips += 1
                    logger.error(
                        "Circuit breaker OPEN for stage '%s' after %d consecutive failures",
                        stage, cb.failure_count,
                    )

    def get_state(self, stage: str) -> CircuitState:
        with self._lock:
            return self._get(stage).state

    def summary(self) -> Dict[str, Any]:
        with self._lock:
            return {
                stage: {
                    "state": cb.state.value,
                    "failure_count": cb.failure_count,
                    "total_trips": cb.total_trips,
                }
                for stage, cb in self._states.items()
            }


# ============================================================================
# Dead letter queue (SQLite-backed)
# ============================================================================

class DeadLetterQueue:
    """
    Persist failed items in SQLite for later retry or manual inspection.

    Schema:
        id          INTEGER PRIMARY KEY
        stage       TEXT
        item_id     TEXT
        error_type  TEXT
        error_json  TEXT  (full serialised ScrapusError)
        retry_count INTEGER
        created_at  TEXT
        status      TEXT  (pending | retried | discarded)
    """

    def __init__(self, db_path: Optional[Path] = None) -> None:
        self._db_path = str(db_path or (DEFAULT_DATA_DIR / DLQ_DB_NAME))
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self) -> None:
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS dead_letters (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    stage       TEXT NOT NULL,
                    item_id     TEXT,
                    error_type  TEXT NOT NULL,
                    error_json  TEXT NOT NULL,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
                    status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'retried', 'discarded'))
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_dlq_stage_status
                ON dead_letters (stage, status)
            """)
            conn.commit()

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self._db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA busy_timeout = 5000")
        try:
            yield conn
        finally:
            conn.close()

    def enqueue(self, error: ScrapusError) -> int:
        """Add a failed item to the dead letter queue.  Returns the row id."""
        error_json = json.dumps(error.to_dict(), default=str, ensure_ascii=False)
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """INSERT INTO dead_letters (stage, item_id, error_type, error_json)
                   VALUES (?, ?, ?, ?)""",
                (error.stage or "unknown", error.item_id, type(error).__name__, error_json),
            )
            conn.commit()
            row_id = cur.lastrowid or 0
            logger.info(
                "DLQ enqueue: id=%d stage=%s item=%s error=%s",
                row_id, error.stage, error.item_id, type(error).__name__,
            )
            return row_id

    def get_pending(self, stage: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve pending items for retry."""
        with self._lock, self._connect() as conn:
            if stage:
                rows = conn.execute(
                    """SELECT id, stage, item_id, error_type, error_json, retry_count, created_at
                       FROM dead_letters WHERE status = 'pending' AND stage = ?
                       ORDER BY created_at LIMIT ?""",
                    (stage, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """SELECT id, stage, item_id, error_type, error_json, retry_count, created_at
                       FROM dead_letters WHERE status = 'pending'
                       ORDER BY created_at LIMIT ?""",
                    (limit,),
                ).fetchall()
        return [
            {
                "id": r[0], "stage": r[1], "item_id": r[2], "error_type": r[3],
                "error_json": json.loads(r[4]), "retry_count": r[5], "created_at": r[6],
            }
            for r in rows
        ]

    def mark_retried(self, row_id: int) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                "UPDATE dead_letters SET status = 'retried', retry_count = retry_count + 1 WHERE id = ?",
                (row_id,),
            )
            conn.commit()

    def mark_discarded(self, row_id: int) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                "UPDATE dead_letters SET status = 'discarded' WHERE id = ?",
                (row_id,),
            )
            conn.commit()

    def count_by_stage(self) -> Dict[str, int]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT stage, COUNT(*) FROM dead_letters WHERE status = 'pending' GROUP BY stage"
            ).fetchall()
        return {r[0]: r[1] for r in rows}

    def purge_old(self, days: int = 7) -> int:
        """Delete discarded/retried entries older than ``days``."""
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """DELETE FROM dead_letters
                   WHERE status != 'pending'
                     AND created_at < datetime('now', ? || ' days')""",
                (f"-{days}",),
            )
            conn.commit()
            return cur.rowcount


# ============================================================================
# Error aggregator
# ============================================================================

class ErrorAggregator:
    """
    Group similar errors and track counts.

    Groups by (stage, error_type).  Reports the top-N most frequent groups.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._groups: Dict[Tuple[str, str], int] = {}
        self._samples: Dict[Tuple[str, str], str] = {}  # first message per group

    def record(self, error: ScrapusError) -> None:
        key = (error.stage or "unknown", type(error).__name__)
        with self._lock:
            self._groups[key] = self._groups.get(key, 0) + 1
            if key not in self._samples:
                self._samples[key] = str(error)

    def top(self, n: int = 10) -> List[Dict[str, Any]]:
        with self._lock:
            sorted_groups = sorted(
                self._groups.items(), key=lambda kv: kv[1], reverse=True
            )[:n]
        return [
            {
                "stage": k[0],
                "error_type": k[1],
                "count": v,
                "sample_message": self._samples.get(k, ""),
            }
            for k, v in sorted_groups
        ]

    def total(self) -> int:
        with self._lock:
            return sum(self._groups.values())

    def clear(self) -> None:
        with self._lock:
            self._groups.clear()
            self._samples.clear()


# ============================================================================
# Recovery executor
# ============================================================================

# Mapping of error type -> default recovery configuration
_RECOVERY_TABLE: Dict[Type[ScrapusError], Dict[str, Any]] = {
    # Crawl
    NetworkError:        {"strategy": RecoveryStrategy.RETRY, "max_retries": 3, "backoff_base": 2.0},
    TimeoutError:        {"strategy": RecoveryStrategy.RETRY, "max_retries": 2, "backoff_base": 5.0},
    RobotsBlockedError:  {"strategy": RecoveryStrategy.SKIP},
    RateLimitedError:    {"strategy": RecoveryStrategy.RETRY, "max_retries": 5, "backoff_base": 10.0},
    # Extraction
    ModelLoadFailedError:  {"strategy": RecoveryStrategy.ABORT},
    InferenceFailedError:  {"strategy": RecoveryStrategy.SKIP},
    OOMError:              {"strategy": RecoveryStrategy.FALLBACK, "fallback": "reduce_batch_size"},
    # Resolution
    BlockingFailedError:   {"strategy": RecoveryStrategy.FALLBACK, "fallback": "rule_based_blocking"},
    MatchingFailedError:   {"strategy": RecoveryStrategy.SKIP},
    ClusteringFailedError: {"strategy": RecoveryStrategy.SKIP},
    # Scoring
    ModelMissingError:     {"strategy": RecoveryStrategy.ABORT},
    CalibrationFailedError: {"strategy": RecoveryStrategy.FALLBACK, "fallback": "platt_calibration"},
    ConformalFailedError:  {"strategy": RecoveryStrategy.FALLBACK, "fallback": "skip_conformal"},
    # Report
    LLMTimeoutError:       {"strategy": RecoveryStrategy.RETRY, "max_retries": 2, "backoff_base": 15.0},
    GenerationFailedError: {"strategy": RecoveryStrategy.RETRY, "max_retries": 3, "backoff_base": 5.0},
    VerificationFailedError: {"strategy": RecoveryStrategy.RETRY, "max_retries": 2, "backoff_base": 5.0},
    # Storage
    SQLiteLockedError:     {"strategy": RecoveryStrategy.RETRY, "max_retries": 5, "backoff_base": 1.0},
    LanceDBError:          {"strategy": RecoveryStrategy.RETRY, "max_retries": 3, "backoff_base": 2.0},
    DiskFullError:         {"strategy": RecoveryStrategy.ABORT},
    # Memory
    OOMWarningError:       {"strategy": RecoveryStrategy.FALLBACK, "fallback": "reduce_batch_size"},
    OOMCriticalError:      {"strategy": RecoveryStrategy.ABORT},
    SwapExceededError:     {"strategy": RecoveryStrategy.ABORT},
}


def get_recovery_config(error: ScrapusError) -> Dict[str, Any]:
    """Look up the recovery configuration for an error type."""
    for cls in type(error).__mro__:
        if cls in _RECOVERY_TABLE:
            return _RECOVERY_TABLE[cls]
    return {"strategy": RecoveryStrategy.ABORT}


# ============================================================================
# Error handler (orchestrates everything)
# ============================================================================

class ErrorHandler:
    """
    Central error handler.  Wire this into the pipeline orchestrator.

    Combines:
        - Error rate tracking
        - Circuit breaker
        - Dead letter queue
        - Error aggregation
        - Structured logging

    Usage:
        handler = ErrorHandler()

        try:
            result = crawl(url)
            handler.record_success("crawl")
        except ScrapusError as e:
            action = handler.handle(e)
            # action is one of: "retry", "skip", "fallback", "abort"
    """

    def __init__(
        self,
        data_dir: Optional[Path] = None,
        circuit_threshold: int = CIRCUIT_BREAKER_THRESHOLD,
        circuit_reset_secs: float = CIRCUIT_BREAKER_RESET_SECS,
    ) -> None:
        self.tracker = ErrorRateTracker()
        self.breaker = CircuitBreaker(
            threshold=circuit_threshold,
            reset_timeout=circuit_reset_secs,
        )
        self.dlq = DeadLetterQueue(
            db_path=(data_dir or DEFAULT_DATA_DIR) / DLQ_DB_NAME
        )
        self.aggregator = ErrorAggregator()

    def handle(self, error: ScrapusError) -> str:
        """
        Process an error: log, track, aggregate, enqueue to DLQ, trip breaker.

        Returns the recovery strategy name ("retry" / "skip" / "fallback" / "abort").
        """
        stage = error.stage or "unknown"

        # 1. Track
        self.tracker.record(stage, error)

        # 2. Aggregate
        self.aggregator.record(error)

        # 3. Circuit breaker
        self.breaker.record_failure(stage)

        # 4. Dead letter queue
        self.dlq.enqueue(error)

        # 5. Look up recovery
        config = get_recovery_config(error)
        strategy: RecoveryStrategy = config.get("strategy", RecoveryStrategy.ABORT)

        # 6. Log
        logger.error(
            "Handled error: stage=%s type=%s item=%s recovery=%s consecutive=%d rate=%.2f/s | %s",
            stage,
            type(error).__name__,
            error.item_id,
            strategy.value,
            self.tracker.get_consecutive(stage),
            self.tracker.get_rate(stage),
            str(error),
        )

        return strategy.value

    def record_success(self, stage: str) -> None:
        """Record a successful operation (resets consecutive failure count + breaker)."""
        self.tracker.record_success(stage)
        self.breaker.record_success(stage)

    def is_stage_available(self, stage: str) -> bool:
        """Check whether the circuit breaker allows requests to this stage."""
        return self.breaker.allow_request(stage)

    def summary(self) -> Dict[str, Any]:
        """Full error summary for dashboard / reporting."""
        return {
            "error_tracker": self.tracker.summary(),
            "circuit_breaker": self.breaker.summary(),
            "dlq_pending": self.dlq.count_by_stage(),
            "top_errors": self.aggregator.top(10),
            "total_errors": self.aggregator.total(),
        }


# ============================================================================
# Context manager for stage execution with error handling
# ============================================================================

@contextmanager
def guarded_stage(
    handler: ErrorHandler,
    stage: str,
    *,
    item_id: Optional[str] = None,
    on_retry: Optional[Callable[[], Any]] = None,
    on_fallback: Optional[Callable[[], Any]] = None,
    max_retries: int = 3,
    suppress: bool = False,
):
    """
    Context manager that wraps a pipeline stage with full error handling.

    Usage:
        with guarded_stage(handler, "crawl", item_id=url) as ctx:
            result = crawl(url)
            ctx["result"] = result

    On ScrapusError:
        - Determines recovery strategy
        - Retries if applicable
        - Calls fallback if provided
        - Re-raises on abort (unless suppress=True)
    """
    if not handler.is_stage_available(stage):
        logger.warning("Stage '%s' is circuit-broken, skipping", stage)
        if suppress:
            yield {}
            return
        raise ScrapusError(
            f"Stage '{stage}' disabled by circuit breaker",
            stage=stage,
            item_id=item_id,
        )

    ctx_dict: Dict[str, Any] = {"stage": stage, "item_id": item_id}
    attempt = 0

    while attempt <= max_retries:
        try:
            yield ctx_dict
            handler.record_success(stage)
            return  # success
        except ScrapusError as e:
            e.stage = e.stage or stage
            e.item_id = e.item_id or item_id
            action = handler.handle(e)

            if action == RETRY and attempt < max_retries:
                attempt += 1
                backoff = get_recovery_config(e).get("backoff_base", 2.0) * attempt
                logger.info(
                    "Retrying stage '%s' item '%s' attempt %d/%d (backoff %.1fs)",
                    stage, item_id, attempt, max_retries, backoff,
                )
                time.sleep(backoff)
                continue
            elif action == FALLBACK and on_fallback is not None:
                logger.info("Executing fallback for stage '%s'", stage)
                on_fallback()
                return
            elif action == SKIP:
                logger.info("Skipping item '%s' in stage '%s'", item_id, stage)
                return
            else:
                # ABORT or exhausted retries
                if suppress:
                    logger.error("Suppressed abort in stage '%s': %s", stage, e)
                    return
                raise
        except Exception as exc:
            # Wrap unexpected exceptions
            wrapped = ScrapusError(
                str(exc), stage=stage, item_id=item_id, cause=exc,
            )
            handler.handle(wrapped)
            if suppress:
                return
            raise wrapped from exc

    # Exhausted retries without returning
    if suppress:
        return
    raise ScrapusError(
        f"Exhausted {max_retries} retries for stage '{stage}'",
        stage=stage,
        item_id=item_id,
    )


# ============================================================================
# Module-level __all__
# ============================================================================

__all__ = [
    # Base
    "ScrapusError",
    "RecoveryStrategy",
    # Crawl
    "CrawlError", "NetworkError", "TimeoutError",
    "RobotsBlockedError", "RateLimitedError",
    # Extraction
    "ExtractionError", "ModelLoadFailedError",
    "InferenceFailedError", "OOMError",
    # Resolution
    "ResolutionError", "BlockingFailedError",
    "MatchingFailedError", "ClusteringFailedError",
    # Scoring
    "ScoringError", "ModelMissingError",
    "CalibrationFailedError", "ConformalFailedError",
    # Report
    "ReportError", "LLMTimeoutError",
    "GenerationFailedError", "VerificationFailedError",
    # Storage
    "StorageError", "SQLiteLockedError",
    "LanceDBError", "DiskFullError",
    # Memory
    "MemoryPressureError", "OOMWarningError",
    "OOMCriticalError", "SwapExceededError",
    # Infrastructure
    "ErrorHandler",
    "ErrorRateTracker",
    "CircuitBreaker", "CircuitState",
    "DeadLetterQueue",
    "ErrorAggregator",
    "guarded_stage",
    "get_recovery_config",
]
