"""
Module 1: State management for crash recovery and resumability.

Provides:
- Atomic checkpoint save/load with .tmp + fsync + rename
- Write-ahead log (WAL) in SQLite for replaying ops since last checkpoint
- Run tracker for comparing crawl runs over time
- Migration manager for state format versioning

Integration points:
- CrawlerPipeline: checkpoint/restore pipeline state between runs
- MmapReplayBuffer: coordinate replay buffer size in state snapshots
- DQN agent: track train_step, epsilon for recovery

Memory budget: <5 MB (SQLite + JSON checkpoint files).
Target: Apple M1 16GB, zero cloud dependency.
"""

import json
import logging
import os
import sqlite3
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("crawler_state_manager")

# Current state format version — bump when PipelineState fields change
_STATE_VERSION = "1.0.0"


# ======================= Configuration ======================================

@dataclass
class StateConfig:
    """Configuration for the state manager."""

    state_dir: str = "scrapus_data/state"
    checkpoint_interval: int = 300  # seconds between automatic checkpoints
    max_checkpoints: int = 5  # rolling window of checkpoint files
    enable_wal: bool = True  # write-ahead log for crash recovery


# ======================= Pipeline State =====================================

@dataclass
class PipelineState:
    """Serialisable snapshot of the crawler pipeline state.

    All fields are JSON-safe (primitives + list of float).
    """

    global_step: int = 0
    episode_id: int = 0
    episode_pages: int = 0
    episode_depth: int = 0
    current_domain: Optional[str] = None
    total_pages_crawled: int = 0
    total_pages_failed: int = 0
    total_leads_found: int = 0
    reward_history: List[float] = field(default_factory=list)
    start_time: float = 0.0
    last_checkpoint_time: float = 0.0
    dqn_train_step: int = 0
    epsilon: float = 1.0
    replay_buffer_size: int = 0
    frontier_pending: int = 0

    # ---- Serialisation helpers ----------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """Convert to a JSON-safe dict, capping reward_history to last 1000."""
        d = asdict(self)
        d["reward_history"] = d["reward_history"][-1000:]
        d["_version"] = _STATE_VERSION
        d["_saved_at"] = time.time()
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "PipelineState":
        """Reconstruct from a dict, ignoring unknown keys."""
        known_keys = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in d.items() if k in known_keys}
        return cls(**filtered)


# ======================= Write-Ahead Log ====================================

@dataclass
class LogEntry:
    """Single WAL entry."""

    timestamp: float
    operation: str
    data: Dict[str, Any]


class WriteAheadLog:
    """Append-only log of state changes between checkpoints.

    Operations:
        PAGE_CRAWLED  — page fetched and processed
        REWARD_RECEIVED — async reward resolved
        EPISODE_END — episode boundary
        TRAIN_STEP — DQN training step completed
        CHECKPOINT — checkpoint written (truncation marker)

    SQLite-backed for durability. Automatically truncates entries
    older than the most recent CHECKPOINT operation.
    """

    _SCHEMA_SQL = """
    CREATE TABLE IF NOT EXISTS wal_entries (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp  REAL NOT NULL,
        operation  TEXT NOT NULL,
        data       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wal_operation
        ON wal_entries(operation);

    CREATE INDEX IF NOT EXISTS idx_wal_timestamp
        ON wal_entries(timestamp);
    """

    _VALID_OPERATIONS = frozenset({
        "PAGE_CRAWLED",
        "REWARD_RECEIVED",
        "EPISODE_END",
        "TRAIN_STEP",
        "CHECKPOINT",
    })

    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._init_sqlite()

    def _init_sqlite(self) -> None:
        """Open connection and ensure schema exists."""
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.executescript(self._SCHEMA_SQL)
        self._conn.commit()

    def append(self, operation: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Append an operation to the WAL.

        Args:
            operation: one of PAGE_CRAWLED, REWARD_RECEIVED, EPISODE_END,
                       TRAIN_STEP, CHECKPOINT.
            data: arbitrary JSON-safe payload.
        """
        if operation not in self._VALID_OPERATIONS:
            raise ValueError(
                f"Invalid WAL operation: {operation!r}. "
                f"Valid: {sorted(self._VALID_OPERATIONS)}"
            )
        now = time.time()
        payload = json.dumps(data or {})
        self._conn.execute(
            "INSERT INTO wal_entries (timestamp, operation, data) VALUES (?, ?, ?)",
            (now, operation, payload),
        )
        self._conn.commit()

    def replay_from(self, checkpoint_time: float) -> List[LogEntry]:
        """Replay all WAL entries since the given checkpoint timestamp.

        Args:
            checkpoint_time: epoch timestamp of the last checkpoint.

        Returns:
            Ordered list of LogEntry objects to replay.
        """
        rows = self._conn.execute(
            "SELECT timestamp, operation, data FROM wal_entries "
            "WHERE timestamp > ? ORDER BY id ASC",
            (checkpoint_time,),
        ).fetchall()
        entries = []
        for ts, op, raw_data in rows:
            entries.append(LogEntry(
                timestamp=ts,
                operation=op,
                data=json.loads(raw_data),
            ))
        return entries

    def truncate_before(self, checkpoint_time: float) -> int:
        """Remove WAL entries at or before the given checkpoint time.

        Called after a successful checkpoint to prevent unbounded growth.

        Returns:
            Number of entries removed.
        """
        cur = self._conn.execute(
            "DELETE FROM wal_entries WHERE timestamp <= ?",
            (checkpoint_time,),
        )
        self._conn.commit()
        deleted = cur.rowcount
        if deleted > 0:
            logger.debug("WAL truncated: removed %d entries before %.0f", deleted, checkpoint_time)
        return deleted

    def entry_count(self) -> int:
        """Return the total number of WAL entries."""
        row = self._conn.execute("SELECT COUNT(*) FROM wal_entries").fetchone()
        return row[0] if row else 0

    def close(self) -> None:
        """Close the SQLite connection."""
        if self._conn:
            self._conn.close()
            self._conn = None


# ======================= State Manager ======================================

class StateManager:
    """Atomic checkpoint save/load with WAL-based crash recovery.

    Recovery flow:
        1. Load the most recent valid checkpoint file.
        2. Replay WAL entries written after that checkpoint.
        3. Return the recovered PipelineState for the pipeline to resume.

    Checkpoint files use atomic writes: write to .tmp, fsync, rename.
    Old checkpoints are pruned to keep at most max_checkpoints files.
    """

    def __init__(self, config: Optional[StateConfig] = None) -> None:
        self.config = config or StateConfig()
        self._state_dir = Path(self.config.state_dir)
        self._state_dir.mkdir(parents=True, exist_ok=True)

        # WAL (optional)
        self._wal: Optional[WriteAheadLog] = None
        if self.config.enable_wal:
            wal_path = str(self._state_dir / "wal.db")
            self._wal = WriteAheadLog(wal_path)

        logger.info(
            "StateManager initialised: dir=%s, wal=%s, interval=%ds",
            self._state_dir,
            "enabled" if self._wal else "disabled",
            self.config.checkpoint_interval,
        )

    # ---- Checkpoint save/load -----------------------------------------------

    def save_checkpoint(self, state: PipelineState) -> str:
        """Atomically save a checkpoint.

        Writes to a .tmp file, fsyncs to disk, then renames into place.
        Prunes old checkpoint files to keep at most max_checkpoints.

        Args:
            state: current pipeline state to persist.

        Returns:
            Path to the saved checkpoint file.
        """
        state.last_checkpoint_time = time.time()
        data = state.to_dict()

        # Filename: checkpoint_<epoch_ms>.json
        ts_ms = int(state.last_checkpoint_time * 1000)
        filename = f"checkpoint_{ts_ms}.json"
        final_path = self._state_dir / filename
        tmp_path = self._state_dir / f"{filename}.tmp"

        # Atomic write: .tmp -> fsync -> rename
        with open(tmp_path, "w") as f:
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.rename(str(tmp_path), str(final_path))

        # Record CHECKPOINT in WAL and truncate old entries
        if self._wal:
            self._wal.append("CHECKPOINT", {"file": filename})
            self._wal.truncate_before(state.last_checkpoint_time)

        # Prune old checkpoints
        self._prune_checkpoints()

        logger.info(
            "Checkpoint saved: %s (step=%d, pages=%d)",
            filename,
            state.global_step,
            state.total_pages_crawled,
        )
        return str(final_path)

    def load_checkpoint(self) -> Optional[PipelineState]:
        """Load the most recent valid checkpoint.

        Scans checkpoint files in reverse chronological order and returns
        the first one that parses successfully.

        Returns:
            PipelineState or None if no valid checkpoint exists.
        """
        checkpoint_files = self._list_checkpoints()
        if not checkpoint_files:
            return None

        # Try from newest to oldest
        for cp_path in reversed(checkpoint_files):
            try:
                with open(cp_path) as f:
                    data = json.load(f)
                state = PipelineState.from_dict(data)
                logger.info(
                    "Loaded checkpoint: %s (step=%d)",
                    cp_path.name,
                    state.global_step,
                )
                return state
            except (json.JSONDecodeError, KeyError, TypeError) as exc:
                logger.warning("Corrupt checkpoint %s: %s", cp_path.name, exc)
                continue

        return None

    def has_checkpoint(self) -> bool:
        """Check whether any checkpoint file exists."""
        return len(self._list_checkpoints()) > 0

    # ---- Recovery -----------------------------------------------------------

    def recover(self) -> Optional[PipelineState]:
        """Full recovery: load checkpoint + replay WAL.

        Recovery flow:
            1. Load the latest valid checkpoint.
            2. If WAL is enabled, replay all entries since that checkpoint.
            3. Apply each WAL entry to update the state.
            4. Return the fully recovered state.

        Returns:
            Recovered PipelineState, or None if no checkpoint exists.
        """
        state = self.load_checkpoint()
        if state is None:
            return None

        if not self._wal:
            return state

        entries = self._wal.replay_from(state.last_checkpoint_time)
        if not entries:
            logger.info("Recovery: no WAL entries to replay")
            return state

        logger.info("Recovery: replaying %d WAL entries", len(entries))
        for entry in entries:
            self._apply_wal_entry(state, entry)

        logger.info(
            "Recovery complete: step=%d, pages_crawled=%d, leads=%d",
            state.global_step,
            state.total_pages_crawled,
            state.total_leads_found,
        )
        return state

    def _apply_wal_entry(self, state: PipelineState, entry: LogEntry) -> None:
        """Apply a single WAL entry to the pipeline state."""
        op = entry.operation
        data = entry.data

        if op == "PAGE_CRAWLED":
            state.global_step += 1
            state.total_pages_crawled += 1
            state.episode_pages += 1
            state.episode_depth = data.get("depth", state.episode_depth + 1)
            state.current_domain = data.get("domain", state.current_domain)
            if data.get("failed", False):
                state.total_pages_failed += 1

        elif op == "REWARD_RECEIVED":
            reward = data.get("reward", 0.0)
            state.reward_history.append(reward)
            # Cap at 1000
            if len(state.reward_history) > 1000:
                state.reward_history = state.reward_history[-1000:]
            if data.get("is_lead", False):
                state.total_leads_found += 1

        elif op == "EPISODE_END":
            state.episode_id += 1
            state.episode_pages = 0
            state.episode_depth = 0
            state.current_domain = None

        elif op == "TRAIN_STEP":
            state.dqn_train_step = data.get("train_step", state.dqn_train_step + 1)
            state.epsilon = data.get("epsilon", state.epsilon)
            state.replay_buffer_size = data.get("replay_size", state.replay_buffer_size)

        elif op == "CHECKPOINT":
            # No-op during replay; checkpoints are recovery markers only
            pass

    def get_recovery_info(self) -> Dict[str, Any]:
        """Return diagnostic info about recoverable state.

        Returns:
            Dict with checkpoint_age_seconds, wal_entries_to_replay,
            estimated_recovery_time_ms, has_checkpoint, wal_enabled.
        """
        info: Dict[str, Any] = {
            "has_checkpoint": self.has_checkpoint(),
            "wal_enabled": self._wal is not None,
            "checkpoint_age_seconds": None,
            "wal_entries_to_replay": 0,
            "estimated_recovery_time_ms": 0,
        }

        state = self.load_checkpoint()
        if state is None:
            return info

        now = time.time()
        info["checkpoint_age_seconds"] = round(now - state.last_checkpoint_time, 1)

        if self._wal:
            entries = self._wal.replay_from(state.last_checkpoint_time)
            info["wal_entries_to_replay"] = len(entries)
            # Estimate ~0.01 ms per WAL entry replay
            info["estimated_recovery_time_ms"] = round(len(entries) * 0.01, 2)

        return info

    # ---- WAL proxy ----------------------------------------------------------

    def log_page_crawled(self, domain: str, depth: int, failed: bool = False) -> None:
        """Log a PAGE_CRAWLED operation to the WAL."""
        if self._wal:
            self._wal.append("PAGE_CRAWLED", {
                "domain": domain,
                "depth": depth,
                "failed": failed,
            })

    def log_reward(self, reward: float, is_lead: bool = False) -> None:
        """Log a REWARD_RECEIVED operation to the WAL."""
        if self._wal:
            self._wal.append("REWARD_RECEIVED", {
                "reward": reward,
                "is_lead": is_lead,
            })

    def log_episode_end(self) -> None:
        """Log an EPISODE_END operation to the WAL."""
        if self._wal:
            self._wal.append("EPISODE_END", {})

    def log_train_step(
        self,
        train_step: int,
        epsilon: float,
        replay_size: int,
    ) -> None:
        """Log a TRAIN_STEP operation to the WAL."""
        if self._wal:
            self._wal.append("TRAIN_STEP", {
                "train_step": train_step,
                "epsilon": epsilon,
                "replay_size": replay_size,
            })

    # ---- Internals ----------------------------------------------------------

    def _list_checkpoints(self) -> List[Path]:
        """Return checkpoint files sorted by timestamp (oldest first)."""
        files = sorted(self._state_dir.glob("checkpoint_*.json"))
        # Exclude .tmp files
        return [f for f in files if not f.name.endswith(".tmp")]

    def _prune_checkpoints(self) -> None:
        """Remove old checkpoints beyond max_checkpoints."""
        files = self._list_checkpoints()
        while len(files) > self.config.max_checkpoints:
            oldest = files.pop(0)
            try:
                oldest.unlink()
                logger.debug("Pruned old checkpoint: %s", oldest.name)
            except OSError as exc:
                logger.warning("Failed to prune checkpoint %s: %s", oldest.name, exc)

    def close(self) -> None:
        """Release resources."""
        if self._wal:
            self._wal.close()
            self._wal = None
        logger.info("StateManager closed")


# ======================= Run Tracker ========================================

class RunTracker:
    """Track and compare multiple crawl runs over time.

    SQLite-backed. Each run records its configuration, start/end times,
    and final statistics for later comparison.
    """

    _SCHEMA_SQL = """
    CREATE TABLE IF NOT EXISTS runs (
        run_id       TEXT PRIMARY KEY,
        config       TEXT NOT NULL,
        started_at   REAL NOT NULL,
        ended_at     REAL DEFAULT NULL,
        stats        TEXT DEFAULT NULL,
        status       TEXT NOT NULL DEFAULT 'running'
    );

    CREATE INDEX IF NOT EXISTS idx_runs_started
        ON runs(started_at);
    """

    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._init_sqlite()

    def _init_sqlite(self) -> None:
        """Open connection and ensure schema exists."""
        os.makedirs(os.path.dirname(self._db_path) or ".", exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.executescript(self._SCHEMA_SQL)
        self._conn.commit()

    def start_run(self, config: Dict[str, Any]) -> str:
        """Register a new crawl run.

        Args:
            config: serialised pipeline configuration.

        Returns:
            Unique run_id string.
        """
        run_id = str(uuid.uuid4())[:12]
        now = time.time()
        self._conn.execute(
            "INSERT INTO runs (run_id, config, started_at, status) "
            "VALUES (?, ?, ?, 'running')",
            (run_id, json.dumps(config), now),
        )
        self._conn.commit()
        logger.info("Run started: %s", run_id)
        return run_id

    def end_run(self, run_id: str, stats: Dict[str, Any]) -> None:
        """Mark a run as completed with final statistics.

        Args:
            run_id: the run_id returned by start_run.
            stats: final statistics dict from the pipeline.
        """
        now = time.time()
        self._conn.execute(
            "UPDATE runs SET ended_at = ?, stats = ?, status = 'completed' "
            "WHERE run_id = ?",
            (now, json.dumps(stats), run_id),
        )
        self._conn.commit()
        logger.info("Run ended: %s", run_id)

    def fail_run(self, run_id: str, error: str) -> None:
        """Mark a run as failed.

        Args:
            run_id: the run_id returned by start_run.
            error: error message or traceback summary.
        """
        now = time.time()
        self._conn.execute(
            "UPDATE runs SET ended_at = ?, stats = ?, status = 'failed' "
            "WHERE run_id = ?",
            (now, json.dumps({"error": error}), run_id),
        )
        self._conn.commit()
        logger.warning("Run failed: %s — %s", run_id, error)

    def get_run_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return recent runs, newest first.

        Args:
            limit: maximum number of runs to return.

        Returns:
            List of run dicts with keys: run_id, config, started_at,
            ended_at, stats, status, duration_seconds.
        """
        rows = self._conn.execute(
            "SELECT run_id, config, started_at, ended_at, stats, status "
            "FROM runs ORDER BY started_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        results = []
        for run_id, config_json, started, ended, stats_json, status in rows:
            entry: Dict[str, Any] = {
                "run_id": run_id,
                "config": json.loads(config_json),
                "started_at": started,
                "ended_at": ended,
                "stats": json.loads(stats_json) if stats_json else None,
                "status": status,
                "duration_seconds": round(ended - started, 1) if ended else None,
            }
            results.append(entry)
        return results

    def get_latest_run(self) -> Optional[Dict[str, Any]]:
        """Return the most recent run, or None."""
        history = self.get_run_history(limit=1)
        return history[0] if history else None

    def compare_runs(
        self, run_id_a: str, run_id_b: str
    ) -> Dict[str, Any]:
        """Compare two runs on key metrics.

        Returns a dict of metric deltas: positive means run_b improved.
        Metrics compared: harvest_rate, pages_per_second, total_leads,
        domains_discovered, mean_reward.
        """
        a = self._load_run(run_id_a)
        b = self._load_run(run_id_b)

        if not a or not b:
            return {"error": "One or both runs not found"}

        stats_a = a.get("stats") or {}
        stats_b = b.get("stats") or {}

        def _safe_get(stats: Dict, *keys: str, default: float = 0.0) -> float:
            """Navigate nested dicts safely."""
            current = stats
            for key in keys:
                if isinstance(current, dict):
                    current = current.get(key, default)
                else:
                    return default
            return float(current) if current is not None else default

        comparison: Dict[str, Any] = {
            "run_a": run_id_a,
            "run_b": run_id_b,
            "metrics": {},
        }

        metric_paths = [
            ("harvest_rate", ("rewards", "harvest_rate")),
            ("total_leads", ("rewards", "positive_count")),
            ("mean_reward", ("rewards", "mean")),
            ("global_step", ("global_step",)),
        ]

        for name, path in metric_paths:
            val_a = _safe_get(stats_a, *path)
            val_b = _safe_get(stats_b, *path)
            delta = val_b - val_a
            comparison["metrics"][name] = {
                "run_a": round(val_a, 4),
                "run_b": round(val_b, 4),
                "delta": round(delta, 4),
                "improved": delta > 0,
            }

        # Pages per second from duration
        dur_a = a.get("duration_seconds") or 1.0
        dur_b = b.get("duration_seconds") or 1.0
        pps_a = _safe_get(stats_a, "global_step") / dur_a
        pps_b = _safe_get(stats_b, "global_step") / dur_b
        comparison["metrics"]["pages_per_second"] = {
            "run_a": round(pps_a, 2),
            "run_b": round(pps_b, 2),
            "delta": round(pps_b - pps_a, 2),
            "improved": pps_b > pps_a,
        }

        return comparison

    def _load_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Load a single run by ID."""
        row = self._conn.execute(
            "SELECT run_id, config, started_at, ended_at, stats, status "
            "FROM runs WHERE run_id = ?",
            (run_id,),
        ).fetchone()
        if not row:
            return None
        run_id, config_json, started, ended, stats_json, status = row
        return {
            "run_id": run_id,
            "config": json.loads(config_json),
            "started_at": started,
            "ended_at": ended,
            "stats": json.loads(stats_json) if stats_json else None,
            "status": status,
            "duration_seconds": round(ended - started, 1) if ended else None,
        }

    def close(self) -> None:
        """Release resources."""
        if self._conn:
            self._conn.close()
            self._conn = None


# ======================= Migration Manager ==================================

class MigrationManager:
    """Handle state format changes between versions.

    Tracks the current schema version in SQLite and applies upgrade
    functions when loading state files from older versions.
    """

    _SCHEMA_SQL = """
    CREATE TABLE IF NOT EXISTS schema_version (
        id      INTEGER PRIMARY KEY CHECK (id = 1),
        version TEXT NOT NULL,
        updated_at REAL NOT NULL
    );
    """

    # Ordered list of (from_version, to_version, migration_fn)
    _MIGRATIONS: List[Tuple[str, str, str]] = [
        # ("0.9.0", "1.0.0", "_migrate_0_9_to_1_0"),
        # Add future migrations here as tuples
    ]

    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._init_sqlite()

    def _init_sqlite(self) -> None:
        """Open connection and ensure schema exists."""
        os.makedirs(os.path.dirname(self._db_path) or ".", exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.executescript(self._SCHEMA_SQL)
        self._conn.commit()

        # Ensure version row exists
        row = self._conn.execute(
            "SELECT version FROM schema_version WHERE id = 1"
        ).fetchone()
        if not row:
            self._conn.execute(
                "INSERT INTO schema_version (id, version, updated_at) "
                "VALUES (1, ?, ?)",
                (_STATE_VERSION, time.time()),
            )
            self._conn.commit()

    def check_version(self) -> str:
        """Return the current state format version."""
        row = self._conn.execute(
            "SELECT version FROM schema_version WHERE id = 1"
        ).fetchone()
        return row[0] if row else _STATE_VERSION

    def migrate_if_needed(self) -> bool:
        """Check version and apply any pending migrations.

        Returns:
            True if migrations were applied, False if already current.
        """
        current = self.check_version()
        if current == _STATE_VERSION:
            logger.debug("State version %s is current; no migration needed", current)
            return False

        logger.info(
            "State version %s detected; target is %s. Running migrations...",
            current,
            _STATE_VERSION,
        )

        applied = 0
        version = current
        for from_ver, to_ver, method_name in self._MIGRATIONS:
            if version == from_ver:
                migration_fn = getattr(self, method_name, None)
                if migration_fn is None:
                    raise RuntimeError(
                        f"Migration function {method_name} not found"
                    )
                logger.info("Applying migration: %s -> %s", from_ver, to_ver)
                migration_fn()
                version = to_ver
                applied += 1

        # Update stored version
        self._conn.execute(
            "UPDATE schema_version SET version = ?, updated_at = ? WHERE id = 1",
            (version, time.time()),
        )
        self._conn.commit()

        if version != _STATE_VERSION:
            logger.warning(
                "Migration incomplete: reached %s but target is %s. "
                "Missing migration steps.",
                version,
                _STATE_VERSION,
            )
        else:
            logger.info(
                "Migration complete: %d step(s) applied, now at %s",
                applied,
                _STATE_VERSION,
            )

        return applied > 0

    def migrate_checkpoint(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate a checkpoint dict from an older version.

        Adds missing fields with sensible defaults so that
        PipelineState.from_dict() succeeds on old checkpoints.

        Args:
            data: raw checkpoint dict (may lack newer fields).

        Returns:
            Updated dict compatible with current PipelineState.
        """
        version = data.get("_version", "0.0.0")
        if version == _STATE_VERSION:
            return data

        # Generic forward-compat: ensure all PipelineState fields exist
        defaults = PipelineState()
        defaults_dict = defaults.to_dict()
        for key, default_val in defaults_dict.items():
            if key.startswith("_"):
                continue
            if key not in data:
                data[key] = default_val
                logger.debug(
                    "Migration: added missing field %r with default %r",
                    key,
                    default_val,
                )

        data["_version"] = _STATE_VERSION
        return data

    # ---- Future migration implementations go here ---------------------------

    # def _migrate_0_9_to_1_0(self) -> None:
    #     """Example: rename old columns, add new tables, etc."""
    #     pass

    def close(self) -> None:
        """Release resources."""
        if self._conn:
            self._conn.close()
            self._conn = None
