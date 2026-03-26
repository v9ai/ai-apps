"""
SQLite-backed checkpoint system for Scrapus pipeline orchestrator.

Provides:
1. Save/load pipeline state after each stage
2. Track: stage name, status, items processed, timestamp, memory snapshot
3. Resume from last successful stage
4. Cleanup old checkpoints
5. Run-level isolation: multiple concurrent pipeline runs supported
6. Atomic writes with WAL mode for crash safety

Schema:
    pipeline_runs   - top-level run metadata
    stage_checkpoints - per-stage completion records
    item_progress   - per-item processing status (for skip-on-resume)
"""

import json
import logging
import os
import sqlite3
import time
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

logger = logging.getLogger(__name__)


# ============================================================================
# Data Types
# ============================================================================

class StageStatus(Enum):
    """Lifecycle states for a pipeline stage."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class RunStatus(Enum):
    """Lifecycle states for a full pipeline run."""
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    INTERRUPTED = "interrupted"
    RESUMED = "resumed"


@dataclass
class StageCheckpoint:
    """Snapshot of a completed pipeline stage."""
    run_id: str
    stage_name: str
    status: StageStatus
    started_at: str
    completed_at: Optional[str]
    items_processed: int
    items_failed: int
    duration_seconds: float
    memory_rss_mb: float
    memory_peak_mb: float
    output_summary: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None

    def to_row(self) -> Tuple:
        return (
            self.run_id,
            self.stage_name,
            self.status.value,
            self.started_at,
            self.completed_at,
            self.items_processed,
            self.items_failed,
            self.duration_seconds,
            self.memory_rss_mb,
            self.memory_peak_mb,
            json.dumps(self.output_summary),
            self.error_message,
        )


@dataclass
class PipelineRun:
    """Metadata for a single end-to-end pipeline execution."""
    run_id: str
    status: RunStatus
    created_at: str
    updated_at: str
    config_snapshot: Dict[str, Any] = field(default_factory=dict)
    stages_total: int = 0
    stages_completed: int = 0
    resumed_from: Optional[str] = None  # stage name if resumed


@dataclass
class ItemProgress:
    """Per-item tracking for skip-on-resume within a stage."""
    run_id: str
    stage_name: str
    item_id: str
    status: str  # "completed", "failed", "pending"
    processed_at: Optional[str] = None
    error_message: Optional[str] = None


# ============================================================================
# Schema Management
# ============================================================================

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id          TEXT PRIMARY KEY,
    status          TEXT NOT NULL DEFAULT 'created',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    config_snapshot  TEXT NOT NULL DEFAULT '{}',
    stages_total    INTEGER NOT NULL DEFAULT 0,
    stages_completed INTEGER NOT NULL DEFAULT 0,
    resumed_from    TEXT
);

CREATE TABLE IF NOT EXISTS stage_checkpoints (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id          TEXT NOT NULL,
    stage_name      TEXT NOT NULL,
    status          TEXT NOT NULL,
    started_at      TEXT NOT NULL,
    completed_at    TEXT,
    items_processed INTEGER NOT NULL DEFAULT 0,
    items_failed    INTEGER NOT NULL DEFAULT 0,
    duration_seconds REAL NOT NULL DEFAULT 0.0,
    memory_rss_mb   REAL NOT NULL DEFAULT 0.0,
    memory_peak_mb  REAL NOT NULL DEFAULT 0.0,
    output_summary  TEXT NOT NULL DEFAULT '{}',
    error_message   TEXT,
    FOREIGN KEY (run_id) REFERENCES pipeline_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_run ON stage_checkpoints(run_id, stage_name);

CREATE TABLE IF NOT EXISTS item_progress (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id          TEXT NOT NULL,
    stage_name      TEXT NOT NULL,
    item_id         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    processed_at    TEXT,
    error_message   TEXT,
    FOREIGN KEY (run_id) REFERENCES pipeline_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_item_run_stage ON item_progress(run_id, stage_name, item_id);
"""


# ============================================================================
# Checkpoint Manager
# ============================================================================

class CheckpointManager:
    """
    SQLite-backed checkpoint/resume system.

    Usage:
        ckpt = CheckpointManager("./data/checkpoints.db")
        run_id = ckpt.create_run(config={...}, stages=["crawl", "ner", ...])

        # Before each stage
        if ckpt.is_stage_completed(run_id, "crawl"):
            data = ckpt.load_stage_output(run_id, "crawl")
        else:
            ckpt.mark_stage_running(run_id, "crawl")
            data = await crawl(...)
            ckpt.mark_stage_completed(run_id, "crawl", checkpoint)

        # Resume
        resume_stage = ckpt.get_resume_point(run_id)
    """

    def __init__(self, db_path: str = "./data/pipeline_checkpoints.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        logger.info(f"CheckpointManager initialized: {self.db_path}")

    # ------------------------------------------------------------------
    # Internal DB helpers
    # ------------------------------------------------------------------

    def _init_db(self) -> None:
        """Create tables and configure WAL mode."""
        with self._connect() as conn:
            conn.executescript(_SCHEMA_SQL)
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA synchronous = NORMAL")

    @contextmanager
    def _connect(self):
        """Yield a connection with auto-commit/rollback."""
        conn = sqlite3.connect(str(self.db_path), timeout=30)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Run lifecycle
    # ------------------------------------------------------------------

    def create_run(
        self,
        config: Dict[str, Any],
        stages: List[str],
        run_id: Optional[str] = None,
    ) -> str:
        """Create a new pipeline run. Returns run_id."""
        run_id = run_id or f"run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO pipeline_runs
                   (run_id, status, created_at, updated_at, config_snapshot, stages_total)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (run_id, RunStatus.CREATED.value, now, now, json.dumps(config), len(stages)),
            )
        logger.info(f"Created pipeline run {run_id} with {len(stages)} stages")
        return run_id

    def update_run_status(self, run_id: str, status: RunStatus) -> None:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                "UPDATE pipeline_runs SET status = ?, updated_at = ? WHERE run_id = ?",
                (status.value, now, run_id),
            )

    def get_run(self, run_id: str) -> Optional[PipelineRun]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM pipeline_runs WHERE run_id = ?", (run_id,)
            ).fetchone()
        if row is None:
            return None
        return PipelineRun(
            run_id=row["run_id"],
            status=RunStatus(row["status"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            config_snapshot=json.loads(row["config_snapshot"]),
            stages_total=row["stages_total"],
            stages_completed=row["stages_completed"],
            resumed_from=row["resumed_from"],
        )

    def get_latest_run_id(self) -> Optional[str]:
        """Return the most recent run_id, or None."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT run_id FROM pipeline_runs ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
        return row["run_id"] if row else None

    # ------------------------------------------------------------------
    # Stage lifecycle
    # ------------------------------------------------------------------

    def mark_stage_running(self, run_id: str, stage_name: str) -> None:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO stage_checkpoints
                   (run_id, stage_name, status, started_at)
                   VALUES (?, ?, ?, ?)""",
                (run_id, stage_name, StageStatus.RUNNING.value, now),
            )
            conn.execute(
                "UPDATE pipeline_runs SET status = ?, updated_at = ? WHERE run_id = ?",
                (RunStatus.RUNNING.value, now, run_id),
            )
        logger.info(f"[{run_id}] Stage '{stage_name}' -> RUNNING")

    def mark_stage_completed(
        self,
        run_id: str,
        stage_name: str,
        checkpoint: StageCheckpoint,
    ) -> None:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            # Update the most recent row for this run+stage
            conn.execute(
                """UPDATE stage_checkpoints
                   SET status = ?, completed_at = ?, items_processed = ?,
                       items_failed = ?, duration_seconds = ?,
                       memory_rss_mb = ?, memory_peak_mb = ?,
                       output_summary = ?, error_message = ?
                   WHERE run_id = ? AND stage_name = ?
                     AND id = (
                         SELECT MAX(id) FROM stage_checkpoints
                         WHERE run_id = ? AND stage_name = ?
                     )""",
                (
                    StageStatus.COMPLETED.value,
                    checkpoint.completed_at or now,
                    checkpoint.items_processed,
                    checkpoint.items_failed,
                    checkpoint.duration_seconds,
                    checkpoint.memory_rss_mb,
                    checkpoint.memory_peak_mb,
                    json.dumps(checkpoint.output_summary),
                    checkpoint.error_message,
                    run_id, stage_name,
                    run_id, stage_name,
                ),
            )
            conn.execute(
                """UPDATE pipeline_runs
                   SET stages_completed = stages_completed + 1, updated_at = ?
                   WHERE run_id = ?""",
                (now, run_id),
            )
        logger.info(
            f"[{run_id}] Stage '{stage_name}' -> COMPLETED "
            f"({checkpoint.items_processed} items, {checkpoint.duration_seconds:.1f}s)"
        )

    def mark_stage_failed(
        self,
        run_id: str,
        stage_name: str,
        error_message: str,
        duration_seconds: float = 0.0,
        memory_rss_mb: float = 0.0,
    ) -> None:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                """UPDATE stage_checkpoints
                   SET status = ?, completed_at = ?, error_message = ?,
                       duration_seconds = ?, memory_rss_mb = ?
                   WHERE run_id = ? AND stage_name = ?
                     AND id = (
                         SELECT MAX(id) FROM stage_checkpoints
                         WHERE run_id = ? AND stage_name = ?
                     )""",
                (
                    StageStatus.FAILED.value, now, error_message,
                    duration_seconds, memory_rss_mb,
                    run_id, stage_name, run_id, stage_name,
                ),
            )
        logger.warning(f"[{run_id}] Stage '{stage_name}' -> FAILED: {error_message[:120]}")

    def mark_stage_skipped(self, run_id: str, stage_name: str, reason: str = "") -> None:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO stage_checkpoints
                   (run_id, stage_name, status, started_at, completed_at, error_message)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (run_id, stage_name, StageStatus.SKIPPED.value, now, now, reason),
            )
        logger.info(f"[{run_id}] Stage '{stage_name}' -> SKIPPED ({reason})")

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def is_stage_completed(self, run_id: str, stage_name: str) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                """SELECT status FROM stage_checkpoints
                   WHERE run_id = ? AND stage_name = ?
                   ORDER BY id DESC LIMIT 1""",
                (run_id, stage_name),
            ).fetchone()
        return row is not None and row["status"] == StageStatus.COMPLETED.value

    def get_stage_checkpoint(self, run_id: str, stage_name: str) -> Optional[StageCheckpoint]:
        with self._connect() as conn:
            row = conn.execute(
                """SELECT * FROM stage_checkpoints
                   WHERE run_id = ? AND stage_name = ?
                   ORDER BY id DESC LIMIT 1""",
                (run_id, stage_name),
            ).fetchone()
        if row is None:
            return None
        return StageCheckpoint(
            run_id=row["run_id"],
            stage_name=row["stage_name"],
            status=StageStatus(row["status"]),
            started_at=row["started_at"],
            completed_at=row["completed_at"],
            items_processed=row["items_processed"],
            items_failed=row["items_failed"],
            duration_seconds=row["duration_seconds"],
            memory_rss_mb=row["memory_rss_mb"],
            memory_peak_mb=row["memory_peak_mb"],
            output_summary=json.loads(row["output_summary"]) if row["output_summary"] else {},
            error_message=row["error_message"],
        )

    def load_stage_output(self, run_id: str, stage_name: str) -> Optional[Dict[str, Any]]:
        """Load the output_summary from the most recent completed checkpoint."""
        ckpt = self.get_stage_checkpoint(run_id, stage_name)
        if ckpt is None or ckpt.status != StageStatus.COMPLETED:
            return None
        return ckpt.output_summary

    def get_all_stage_statuses(self, run_id: str) -> Dict[str, StageStatus]:
        """Return {stage_name: latest_status} for a run."""
        result: Dict[str, StageStatus] = {}
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT stage_name, status FROM stage_checkpoints
                   WHERE run_id = ?
                   ORDER BY id ASC""",
                (run_id,),
            ).fetchall()
        for row in rows:
            result[row["stage_name"]] = StageStatus(row["status"])
        return result

    def get_resume_point(self, run_id: str, stage_order: List[str]) -> Optional[str]:
        """
        Find the first stage in stage_order that is NOT completed.
        Returns None if all stages completed.
        """
        statuses = self.get_all_stage_statuses(run_id)
        for stage in stage_order:
            if statuses.get(stage) != StageStatus.COMPLETED:
                return stage
        return None

    def get_completed_stages(self, run_id: str) -> List[str]:
        """Return ordered list of completed stage names."""
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT DISTINCT stage_name FROM stage_checkpoints
                   WHERE run_id = ? AND status = ?
                   ORDER BY id ASC""",
                (run_id, StageStatus.COMPLETED.value),
            ).fetchall()
        return [row["stage_name"] for row in rows]

    # ------------------------------------------------------------------
    # Per-item tracking (for intra-stage resume)
    # ------------------------------------------------------------------

    def save_item_progress(
        self,
        run_id: str,
        stage_name: str,
        item_id: str,
        status: str,
        error_message: Optional[str] = None,
    ) -> None:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO item_progress
                   (run_id, stage_name, item_id, status, processed_at, error_message)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (run_id, stage_name, item_id, status, now, error_message),
            )

    def get_completed_item_ids(self, run_id: str, stage_name: str) -> set:
        """Return set of item_ids already completed in this stage."""
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT item_id FROM item_progress
                   WHERE run_id = ? AND stage_name = ? AND status = 'completed'""",
                (run_id, stage_name),
            ).fetchall()
        return {row["item_id"] for row in rows}

    def get_failed_item_ids(self, run_id: str, stage_name: str) -> set:
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT item_id FROM item_progress
                   WHERE run_id = ? AND stage_name = ? AND status = 'failed'""",
                (run_id, stage_name),
            ).fetchall()
        return {row["item_id"] for row in rows}

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def cleanup_old_runs(self, max_age_days: int = 30) -> int:
        """Delete runs older than max_age_days. Returns count deleted."""
        cutoff = (datetime.utcnow() - timedelta(days=max_age_days)).isoformat()
        with self._connect() as conn:
            # Get old run_ids
            old_runs = conn.execute(
                "SELECT run_id FROM pipeline_runs WHERE created_at < ?", (cutoff,)
            ).fetchall()
            old_ids = [r["run_id"] for r in old_runs]
            if not old_ids:
                return 0
            placeholders = ",".join("?" * len(old_ids))
            conn.execute(
                f"DELETE FROM item_progress WHERE run_id IN ({placeholders})", old_ids
            )
            conn.execute(
                f"DELETE FROM stage_checkpoints WHERE run_id IN ({placeholders})", old_ids
            )
            conn.execute(
                f"DELETE FROM pipeline_runs WHERE run_id IN ({placeholders})", old_ids
            )
        logger.info(f"Cleaned up {len(old_ids)} runs older than {max_age_days} days")
        return len(old_ids)

    def vacuum(self) -> None:
        """Reclaim disk space after cleanup."""
        conn = sqlite3.connect(str(self.db_path))
        conn.execute("VACUUM")
        conn.close()
        logger.info("Vacuumed checkpoint database")

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def get_run_summary(self, run_id: str) -> Dict[str, Any]:
        """Build a human-readable summary dict for a pipeline run."""
        run = self.get_run(run_id)
        if run is None:
            return {"error": f"Run {run_id} not found"}

        statuses = self.get_all_stage_statuses(run_id)
        stages_detail = []
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT stage_name, status, items_processed, items_failed,
                          duration_seconds, memory_peak_mb, error_message
                   FROM stage_checkpoints WHERE run_id = ? ORDER BY id ASC""",
                (run_id,),
            ).fetchall()
        for row in rows:
            stages_detail.append({
                "stage": row["stage_name"],
                "status": row["status"],
                "items_processed": row["items_processed"],
                "items_failed": row["items_failed"],
                "duration_s": round(row["duration_seconds"], 2),
                "peak_mb": round(row["memory_peak_mb"], 1),
                "error": row["error_message"],
            })

        total_items = sum(s["items_processed"] for s in stages_detail)
        total_duration = sum(s["duration_s"] for s in stages_detail)

        return {
            "run_id": run_id,
            "status": run.status.value,
            "created_at": run.created_at,
            "stages_completed": run.stages_completed,
            "stages_total": run.stages_total,
            "total_items_processed": total_items,
            "total_duration_seconds": round(total_duration, 2),
            "stages": stages_detail,
        }

    def print_run_summary(self, run_id: str) -> None:
        summary = self.get_run_summary(run_id)
        if "error" in summary:
            print(summary["error"])
            return

        print(f"\n{'=' * 72}")
        print(f"Pipeline Run: {summary['run_id']}")
        print(f"Status: {summary['status']}")
        print(f"Stages: {summary['stages_completed']}/{summary['stages_total']}")
        print(f"Total items: {summary['total_items_processed']}")
        print(f"Total duration: {summary['total_duration_seconds']:.1f}s")
        print(f"{'=' * 72}")

        for s in summary["stages"]:
            icon = {
                "completed": "[OK]",
                "failed": "[FAIL]",
                "skipped": "[SKIP]",
                "running": "[..]",
                "pending": "[  ]",
            }.get(s["status"], "[??]")
            line = f"  {icon} {s['stage']:<25} {s['items_processed']:>6} items  {s['duration_s']:>8.1f}s  {s['peak_mb']:>7.1f} MB"
            if s["error"]:
                line += f"  ERR: {s['error'][:60]}"
            print(line)

        print(f"{'=' * 72}\n")
