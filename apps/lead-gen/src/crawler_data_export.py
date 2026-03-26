"""
Data export, backup, and reporting for the crawler subsystem.

Provides:
1. DataExporter: Export frontier, domain stats, replay metadata, and training
   logs to JSON Lines (gzipped) format.
2. BackupManager: Atomic SQLite backups with rotation (VACUUM INTO).
3. ReplayBufferExporter: Stream replay buffer transitions to NPZ for
   offline Decision Transformer training.
4. CrawlReportGenerator: Human-readable Markdown crawl summary with ASCII
   charts.

No external dependencies beyond numpy and sqlite3.
Target: Apple M1 16GB, zero cloud dependency.
"""

import gzip
import json
import logging
import os
import shutil
import sqlite3
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_data_export")


# ======================= Configuration ======================================

@dataclass
class ExportConfig:
    """Configuration for data export and backup."""

    output_dir: str = "scrapus_data/exports"
    format: str = "jsonl"  # jsonl / csv / parquet
    compress: bool = True  # gzip compression
    backup_interval: int = 3600  # hourly backups (seconds)
    max_backups: int = 24  # keep last 24 backups


# ======================= Data Exporter ======================================

class DataExporter:
    """Export crawler data stores to JSON Lines format.

    Reads directly from the SQLite databases used by URLFrontier,
    DomainScheduler, and MmapReplayBuffer.  Each export writes one JSON
    object per line, optionally gzip-compressed.
    """

    def __init__(
        self,
        config: Optional[ExportConfig] = None,
        frontier_db: str = "scrapus_data/frontier.db",
        domain_stats_db: str = "scrapus_data/domain_stats.db",
        replay_meta_db: str = "scrapus_data/replay_buffer/replay_meta.db",
    ) -> None:
        self.config = config or ExportConfig()
        self._frontier_db = frontier_db
        self._domain_stats_db = domain_stats_db
        self._replay_meta_db = replay_meta_db

        os.makedirs(self.config.output_dir, exist_ok=True)

    # ---- Helpers ------------------------------------------------------------

    def _timestamp_suffix(self) -> str:
        """Return a compact timestamp for file naming."""
        return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    def _output_path(self, base_name: str, output_path: Optional[str] = None) -> str:
        """Resolve output path with timestamp and compression extension."""
        if output_path is not None:
            return output_path
        ext = ".jsonl.gz" if self.config.compress else ".jsonl"
        filename = f"{base_name}_{self._timestamp_suffix()}{ext}"
        return os.path.join(self.config.output_dir, filename)

    def _write_jsonl(self, path: str, rows: List[Dict[str, Any]]) -> str:
        """Write rows as JSON Lines, optionally gzipped.

        Returns the path written.
        """
        if path.endswith(".gz"):
            with gzip.open(path, "wt", encoding="utf-8") as f:
                for row in rows:
                    f.write(json.dumps(row, default=str) + "\n")
        else:
            with open(path, "w", encoding="utf-8") as f:
                for row in rows:
                    f.write(json.dumps(row, default=str) + "\n")
        logger.info("Exported %d rows to %s", len(rows), path)
        return path

    def _open_db(self, db_path: str) -> Optional[sqlite3.Connection]:
        """Open a read-only SQLite connection; return None if DB missing."""
        if not os.path.exists(db_path):
            logger.warning("Database not found: %s", db_path)
            return None
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    # ---- Export methods ------------------------------------------------------

    def export_frontier(self, output_path: Optional[str] = None) -> str:
        """Export all frontier URLs with status, q_value, domain, depth.

        Returns path to the exported file.
        """
        path = self._output_path("frontier", output_path)
        conn = self._open_db(self._frontier_db)
        if conn is None:
            return self._write_jsonl(path, [])

        try:
            cur = conn.execute(
                "SELECT url, domain, q_value, depth, status, created_at, updated_at "
                "FROM frontier ORDER BY q_value DESC"
            )
            rows: List[Dict[str, Any]] = []
            for row in cur:
                rows.append({
                    "url": row["url"],
                    "domain": row["domain"],
                    "q_value": round(row["q_value"], 6),
                    "depth": row["depth"],
                    "status": row["status"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                })
            return self._write_jsonl(path, rows)
        finally:
            conn.close()

    def export_domain_stats(self, output_path: Optional[str] = None) -> str:
        """Export all domain statistics with derived metrics.

        Derived metrics: avg_reward, leads_per_page, ucb_score_approx.
        Returns path to the exported file.
        """
        path = self._output_path("domain_stats", output_path)
        conn = self._open_db(self._domain_stats_db)
        if conn is None:
            return self._write_jsonl(path, [])

        try:
            cur = conn.execute(
                "SELECT domain, pages_crawled, reward_sum, leads_found, "
                "last_crawled, created_at FROM domain_stats "
                "ORDER BY reward_sum / MAX(pages_crawled, 1) DESC"
            )
            # Compute total pages for UCB approximation
            all_rows = cur.fetchall()
            total_pages = sum(r["pages_crawled"] for r in all_rows)

            rows: List[Dict[str, Any]] = []
            for r in all_rows:
                pages = max(r["pages_crawled"], 1)
                avg_reward = r["reward_sum"] / pages
                leads_per_page = r["leads_found"] / pages
                # UCB1 approximation (c=2.0)
                import math
                if total_pages > 0 and r["pages_crawled"] > 0:
                    ucb_score = avg_reward + math.sqrt(
                        2.0 * math.log(total_pages) / r["pages_crawled"]
                    )
                else:
                    ucb_score = float("inf")

                rows.append({
                    "domain": r["domain"],
                    "pages_crawled": r["pages_crawled"],
                    "reward_sum": round(r["reward_sum"], 6),
                    "leads_found": r["leads_found"],
                    "avg_reward": round(avg_reward, 6),
                    "leads_per_page": round(leads_per_page, 6),
                    "ucb_score": round(ucb_score, 6) if ucb_score != float("inf") else "inf",
                    "last_crawled": r["last_crawled"],
                    "created_at": r["created_at"],
                })
            return self._write_jsonl(path, rows)
        finally:
            conn.close()

    def export_replay_metadata(self, output_path: Optional[str] = None) -> str:
        """Export transition metadata (action, reward, done, priority).

        Excludes state vectors (those are in mmap files).
        Returns path to the exported file.
        """
        path = self._output_path("replay_metadata", output_path)
        conn = self._open_db(self._replay_meta_db)
        if conn is None:
            return self._write_jsonl(path, [])

        try:
            cur = conn.execute(
                "SELECT idx, action, reward, done, priority, created_at, updated_at "
                "FROM transitions ORDER BY idx"
            )
            rows: List[Dict[str, Any]] = []
            for row in cur:
                rows.append({
                    "idx": row["idx"],
                    "action": row["action"],
                    "reward": round(row["reward"], 6),
                    "done": bool(row["done"]),
                    "priority": round(row["priority"], 6),
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                })
            return self._write_jsonl(path, rows)
        finally:
            conn.close()

    def export_training_log(self, output_path: Optional[str] = None) -> str:
        """Export training metrics time series from replay buffer stats.

        Reads buffer_stats table for any training-related keys and
        pending_rewards resolution rate over time.
        Returns path to the exported file.
        """
        path = self._output_path("training_log", output_path)
        conn = self._open_db(self._replay_meta_db)
        if conn is None:
            return self._write_jsonl(path, [])

        try:
            rows: List[Dict[str, Any]] = []

            # Buffer stats snapshot
            cur = conn.execute("SELECT key, value FROM buffer_stats")
            stats: Dict[str, str] = {}
            for row in cur:
                stats[row["key"]] = row["value"]
            if stats:
                rows.append({
                    "type": "buffer_stats",
                    "timestamp": time.time(),
                    **stats,
                })

            # Transition statistics
            summary = conn.execute(
                "SELECT COUNT(*) as total, "
                "AVG(reward) as avg_reward, "
                "MIN(reward) as min_reward, "
                "MAX(reward) as max_reward, "
                "AVG(priority) as avg_priority, "
                "SUM(done) as total_done "
                "FROM transitions"
            ).fetchone()
            if summary and summary["total"] > 0:
                rows.append({
                    "type": "transition_summary",
                    "timestamp": time.time(),
                    "total_transitions": summary["total"],
                    "avg_reward": round(summary["avg_reward"], 6),
                    "min_reward": round(summary["min_reward"], 6),
                    "max_reward": round(summary["max_reward"], 6),
                    "avg_priority": round(summary["avg_priority"], 6),
                    "total_episodes_done": summary["total_done"],
                })

            # Pending rewards resolution stats
            pending = conn.execute(
                "SELECT COUNT(*) as total, "
                "SUM(CASE WHEN reward IS NOT NULL THEN 1 ELSE 0 END) as resolved, "
                "SUM(CASE WHEN reward IS NULL THEN 1 ELSE 0 END) as unresolved "
                "FROM pending_rewards"
            ).fetchone()
            if pending and pending["total"] > 0:
                rows.append({
                    "type": "pending_rewards_summary",
                    "timestamp": time.time(),
                    "total": pending["total"],
                    "resolved": pending["resolved"],
                    "unresolved": pending["unresolved"],
                    "resolution_rate": round(
                        pending["resolved"] / max(pending["total"], 1), 4
                    ),
                })

            # Reward time series (binned by hour)
            reward_series = conn.execute(
                "SELECT CAST(created_at / 3600 AS INTEGER) * 3600 as hour_bucket, "
                "COUNT(*) as count, AVG(reward) as avg_reward "
                "FROM transitions "
                "GROUP BY hour_bucket ORDER BY hour_bucket"
            ).fetchall()
            for row in reward_series:
                rows.append({
                    "type": "reward_timeseries",
                    "timestamp": row["hour_bucket"],
                    "count": row["count"],
                    "avg_reward": round(row["avg_reward"], 6),
                })

            return self._write_jsonl(path, rows)
        finally:
            conn.close()

    def export_all(self, output_dir: Optional[str] = None) -> Dict[str, str]:
        """Export all data stores.

        Returns a dict mapping export name to file path.
        """
        if output_dir is not None:
            original_dir = self.config.output_dir
            self.config.output_dir = output_dir
            os.makedirs(output_dir, exist_ok=True)

        try:
            result: Dict[str, str] = {}
            result["frontier"] = self.export_frontier()
            result["domain_stats"] = self.export_domain_stats()
            result["replay_metadata"] = self.export_replay_metadata()
            result["training_log"] = self.export_training_log()
            logger.info("Exported all data: %s", result)
            return result
        finally:
            if output_dir is not None:
                self.config.output_dir = original_dir


# ======================= Backup Manager =====================================

class BackupManager:
    """Automated SQLite database backups with rotation.

    Uses SQLite VACUUM INTO for atomic, consistent snapshots.
    Keeps the last N backups per database and rotates older ones.
    """

    def __init__(
        self,
        config: Optional[ExportConfig] = None,
        frontier_db: str = "scrapus_data/frontier.db",
        domain_stats_db: str = "scrapus_data/domain_stats.db",
        replay_meta_db: str = "scrapus_data/replay_buffer/replay_meta.db",
    ) -> None:
        self.config = config or ExportConfig()
        self._frontier_db = frontier_db
        self._domain_stats_db = domain_stats_db
        self._replay_meta_db = replay_meta_db
        self._backup_dir = os.path.join(
            os.path.dirname(frontier_db), "backups"
        )
        os.makedirs(self._backup_dir, exist_ok=True)

    # ---- Helpers ------------------------------------------------------------

    def _timestamp_suffix(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    def _backup_path(self, db_name: str) -> str:
        """Generate backup filename with timestamp."""
        stem = Path(db_name).stem
        filename = f"{stem}_{self._timestamp_suffix()}.db"
        return os.path.join(self._backup_dir, filename)

    def _atomic_backup(self, source_db: str, dest_path: str) -> bool:
        """Create an atomic backup using SQLite VACUUM INTO.

        VACUUM INTO creates a consistent snapshot without blocking writers
        (when the source uses WAL mode).

        Returns True on success, False on failure.
        """
        if not os.path.exists(source_db):
            logger.warning("Source database not found: %s", source_db)
            return False

        try:
            conn = sqlite3.connect(source_db)
            conn.execute(f"VACUUM INTO '{dest_path}'")
            conn.close()
            size_mb = os.path.getsize(dest_path) / (1024 * 1024)
            logger.info(
                "Backup created: %s (%.2f MB)", dest_path, size_mb
            )
            return True
        except sqlite3.OperationalError as exc:
            logger.error("Backup failed for %s: %s", source_db, exc)
            # Fallback: file-level copy (less consistent but better than nothing)
            try:
                shutil.copy2(source_db, dest_path)
                logger.warning(
                    "Used fallback file copy for %s", source_db
                )
                return True
            except OSError as copy_exc:
                logger.error("Fallback copy also failed: %s", copy_exc)
                return False

    def _rotate_backups(self, db_stem: str) -> int:
        """Delete older backups beyond max_backups.

        Returns the number of backups deleted.
        """
        pattern = f"{db_stem}_"
        backups: List[Tuple[str, float]] = []

        for entry in os.listdir(self._backup_dir):
            if entry.startswith(pattern) and entry.endswith(".db"):
                full_path = os.path.join(self._backup_dir, entry)
                mtime = os.path.getmtime(full_path)
                backups.append((full_path, mtime))

        # Sort newest first
        backups.sort(key=lambda x: x[1], reverse=True)

        deleted = 0
        for path, _ in backups[self.config.max_backups:]:
            try:
                os.remove(path)
                deleted += 1
                logger.info("Rotated old backup: %s", path)
            except OSError as exc:
                logger.error("Failed to delete backup %s: %s", path, exc)

        return deleted

    # ---- Backup methods -----------------------------------------------------

    def backup_frontier(self) -> Optional[str]:
        """Backup frontier.db using VACUUM INTO.

        Returns the backup path on success, None on failure.
        """
        dest = self._backup_path("frontier")
        if self._atomic_backup(self._frontier_db, dest):
            self._rotate_backups("frontier")
            return dest
        return None

    def backup_domain_stats(self) -> Optional[str]:
        """Backup domain_stats.db using VACUUM INTO.

        Returns the backup path on success, None on failure.
        """
        dest = self._backup_path("domain_stats")
        if self._atomic_backup(self._domain_stats_db, dest):
            self._rotate_backups("domain_stats")
            return dest
        return None

    def backup_replay_meta(self) -> Optional[str]:
        """Backup replay_meta.db using VACUUM INTO.

        Returns the backup path on success, None on failure.
        """
        dest = self._backup_path("replay_meta")
        if self._atomic_backup(self._replay_meta_db, dest):
            self._rotate_backups("replay_meta")
            return dest
        return None

    def backup_all(self) -> Dict[str, Optional[str]]:
        """Backup all databases.

        Returns a dict mapping db name to backup path (None on failure).
        """
        result: Dict[str, Optional[str]] = {}
        result["frontier"] = self.backup_frontier()
        result["domain_stats"] = self.backup_domain_stats()
        result["replay_meta"] = self.backup_replay_meta()
        logger.info("Backup all complete: %s", result)
        return result

    def restore_from_backup(self, backup_path: str, target: str) -> bool:
        """Restore a database from a backup file.

        Copies the backup file to the target path, replacing the existing
        database.  The caller should ensure no active connections to the
        target database before calling this.

        Args:
            backup_path: path to the backup .db file.
            target: path to the target database to overwrite.

        Returns True on success, False on failure.
        """
        if not os.path.exists(backup_path):
            logger.error("Backup file not found: %s", backup_path)
            return False

        # Verify the backup is a valid SQLite file
        try:
            conn = sqlite3.connect(f"file:{backup_path}?mode=ro", uri=True)
            conn.execute("SELECT 1")
            conn.close()
        except sqlite3.DatabaseError as exc:
            logger.error("Backup is not a valid SQLite database: %s", exc)
            return False

        try:
            # Create parent directory if needed
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.copy2(backup_path, target)

            # Remove WAL/SHM files from the target location to avoid
            # stale journal conflicts after restore
            for suffix in ("-wal", "-shm"):
                wal_path = target + suffix
                if os.path.exists(wal_path):
                    os.remove(wal_path)

            size_mb = os.path.getsize(target) / (1024 * 1024)
            logger.info(
                "Restored %s from %s (%.2f MB)", target, backup_path, size_mb
            )
            return True
        except OSError as exc:
            logger.error("Restore failed: %s", exc)
            return False

    def list_backups(self) -> List[Dict[str, Any]]:
        """List all available backups.

        Returns a list of dicts with path, db_name, timestamp, and size_bytes.
        Sorted newest first.
        """
        backups: List[Dict[str, Any]] = []

        if not os.path.exists(self._backup_dir):
            return backups

        for entry in os.listdir(self._backup_dir):
            if not entry.endswith(".db"):
                continue
            full_path = os.path.join(self._backup_dir, entry)
            stat = os.stat(full_path)

            # Parse db name from filename (e.g. "frontier_20260326T120000Z.db")
            stem = entry[:-3]  # strip .db
            parts = stem.rsplit("_", 1)
            db_name = parts[0] if len(parts) == 2 else stem
            ts_str = parts[1] if len(parts) == 2 else ""

            backups.append({
                "path": full_path,
                "db_name": db_name,
                "timestamp": ts_str,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified_at": stat.st_mtime,
            })

        backups.sort(key=lambda x: x["modified_at"], reverse=True)
        return backups


# ======================= Replay Buffer Exporter =============================

class ReplayBufferExporter:
    """Export replay buffer transitions to NPZ for offline training.

    Streams transitions from the mmap arrays and SQLite metadata without
    loading everything into memory.  Useful for Decision Transformer
    offline training.
    """

    def __init__(
        self,
        config: Optional[ExportConfig] = None,
        data_dir: str = "scrapus_data/replay_buffer",
        state_dim: int = 784,
        capacity: int = 100_000,
    ) -> None:
        self.config = config or ExportConfig()
        self._data_dir = Path(data_dir)
        self._state_dim = state_dim
        self._capacity = capacity

        os.makedirs(self.config.output_dir, exist_ok=True)

    def _timestamp_suffix(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    def export_transitions(
        self,
        output_path: Optional[str] = None,
        max_transitions: Optional[int] = None,
    ) -> str:
        """Export replay buffer transitions as an NPZ file.

        The NPZ file contains arrays:
        - states: (N, state_dim) float32
        - actions: (N,) int64
        - rewards: (N,) float32
        - next_states: (N, state_dim) float32
        - dones: (N,) float32

        Streams data in chunks to avoid loading everything into memory.

        Args:
            output_path: optional output file path.
            max_transitions: limit the number of transitions exported.

        Returns the path to the NPZ file.
        """
        if output_path is None:
            filename = f"transitions_{self._timestamp_suffix()}.npz"
            output_path = os.path.join(self.config.output_dir, filename)

        # Open mmap arrays (read-only)
        states_path = self._data_dir / "states.npy"
        next_states_path = self._data_dir / "next_states.npy"
        meta_db_path = self._data_dir / "replay_meta.db"

        if not states_path.exists() or not meta_db_path.exists():
            logger.warning(
                "Replay buffer files not found in %s", self._data_dir
            )
            # Save empty arrays
            np.savez_compressed(
                output_path,
                states=np.empty((0, self._state_dim), dtype=np.float32),
                actions=np.empty(0, dtype=np.int64),
                rewards=np.empty(0, dtype=np.float32),
                next_states=np.empty((0, self._state_dim), dtype=np.float32),
                dones=np.empty(0, dtype=np.float32),
            )
            return output_path

        shape = (self._capacity, self._state_dim)
        states_mmap = np.memmap(
            str(states_path), dtype=np.float32, mode="r", shape=shape
        )
        next_states_mmap = np.memmap(
            str(next_states_path), dtype=np.float32, mode="r", shape=shape
        ) if next_states_path.exists() else None

        conn = sqlite3.connect(f"file:{meta_db_path}?mode=ro", uri=True)

        try:
            # Get total count and buffer size
            size_row = conn.execute(
                "SELECT value FROM buffer_stats WHERE key = 'size'"
            ).fetchone()
            buffer_size = int(size_row[0]) if size_row else 0

            if buffer_size == 0:
                # Try counting transitions directly
                count_row = conn.execute(
                    "SELECT COUNT(*) FROM transitions"
                ).fetchone()
                buffer_size = count_row[0] if count_row else 0

            if max_transitions is not None:
                export_count = min(buffer_size, max_transitions)
            else:
                export_count = buffer_size

            if export_count == 0:
                np.savez_compressed(
                    output_path,
                    states=np.empty((0, self._state_dim), dtype=np.float32),
                    actions=np.empty(0, dtype=np.int64),
                    rewards=np.empty(0, dtype=np.float32),
                    next_states=np.empty((0, self._state_dim), dtype=np.float32),
                    dones=np.empty(0, dtype=np.float32),
                )
                return output_path

            # Stream in chunks to limit memory
            chunk_size = 10_000
            all_states: List[np.ndarray] = []
            all_actions: List[np.ndarray] = []
            all_rewards: List[np.ndarray] = []
            all_next_states: List[np.ndarray] = []
            all_dones: List[np.ndarray] = []
            exported = 0

            cur = conn.execute(
                "SELECT idx, action, reward, done FROM transitions "
                "ORDER BY idx LIMIT ?",
                (export_count,),
            )

            chunk_indices: List[int] = []
            chunk_actions: List[int] = []
            chunk_rewards: List[float] = []
            chunk_dones: List[float] = []

            for row in cur:
                idx, action, reward, done = row
                chunk_indices.append(idx)
                chunk_actions.append(action)
                chunk_rewards.append(reward)
                chunk_dones.append(float(done))
                exported += 1

                if len(chunk_indices) >= chunk_size or exported >= export_count:
                    # Extract state vectors for this chunk
                    idx_arr = np.array(chunk_indices, dtype=np.int64)
                    all_states.append(
                        np.array(states_mmap[idx_arr], dtype=np.float32)
                    )
                    if next_states_mmap is not None:
                        all_next_states.append(
                            np.array(next_states_mmap[idx_arr], dtype=np.float32)
                        )
                    else:
                        all_next_states.append(
                            np.zeros((len(idx_arr), self._state_dim), dtype=np.float32)
                        )
                    all_actions.append(np.array(chunk_actions, dtype=np.int64))
                    all_rewards.append(np.array(chunk_rewards, dtype=np.float32))
                    all_dones.append(np.array(chunk_dones, dtype=np.float32))

                    chunk_indices.clear()
                    chunk_actions.clear()
                    chunk_rewards.clear()
                    chunk_dones.clear()

                if exported >= export_count:
                    break

            # Concatenate and save
            if all_states:
                np.savez_compressed(
                    output_path,
                    states=np.concatenate(all_states, axis=0),
                    actions=np.concatenate(all_actions, axis=0),
                    rewards=np.concatenate(all_rewards, axis=0),
                    next_states=np.concatenate(all_next_states, axis=0),
                    dones=np.concatenate(all_dones, axis=0),
                )
            else:
                np.savez_compressed(
                    output_path,
                    states=np.empty((0, self._state_dim), dtype=np.float32),
                    actions=np.empty(0, dtype=np.int64),
                    rewards=np.empty(0, dtype=np.float32),
                    next_states=np.empty((0, self._state_dim), dtype=np.float32),
                    dones=np.empty(0, dtype=np.float32),
                )

            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            logger.info(
                "Exported %d transitions to %s (%.2f MB)",
                exported, output_path, size_mb,
            )
            return output_path
        finally:
            conn.close()
            del states_mmap
            if next_states_mmap is not None:
                del next_states_mmap


# ======================= Crawl Report Generator =============================

class CrawlReportGenerator:
    """Generate human-readable Markdown crawl summary reports.

    Reads from frontier, domain stats, and replay buffer databases to
    produce a comprehensive overview with ASCII charts.
    """

    def __init__(
        self,
        config: Optional[ExportConfig] = None,
        frontier_db: str = "scrapus_data/frontier.db",
        domain_stats_db: str = "scrapus_data/domain_stats.db",
        replay_meta_db: str = "scrapus_data/replay_buffer/replay_meta.db",
    ) -> None:
        self.config = config or ExportConfig()
        self._frontier_db = frontier_db
        self._domain_stats_db = domain_stats_db
        self._replay_meta_db = replay_meta_db

    def _open_db(self, db_path: str) -> Optional[sqlite3.Connection]:
        if not os.path.exists(db_path):
            return None
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    # ---- ASCII chart helpers ------------------------------------------------

    @staticmethod
    def _ascii_bar_chart(
        labels: List[str],
        values: List[float],
        max_width: int = 40,
        value_fmt: str = ".2f",
    ) -> str:
        """Render a horizontal ASCII bar chart.

        Args:
            labels: bar labels (left side).
            values: numeric values for each bar.
            max_width: maximum bar width in characters.
            value_fmt: format string for value display.

        Returns multi-line string.
        """
        if not values:
            return "  (no data)\n"

        max_val = max(values) if max(values) > 0 else 1.0
        max_label_len = max(len(l) for l in labels) if labels else 0
        lines: List[str] = []

        for label, val in zip(labels, values):
            bar_len = int((val / max_val) * max_width) if max_val > 0 else 0
            bar = "#" * bar_len
            formatted_val = format(val, value_fmt)
            lines.append(
                f"  {label:<{max_label_len}} | {bar} {formatted_val}"
            )

        return "\n".join(lines) + "\n"

    @staticmethod
    def _ascii_sparkline(values: List[float], width: int = 50) -> str:
        """Render a simple ASCII sparkline.

        Uses block characters to represent values.
        """
        if not values:
            return "(no data)"

        blocks = " _.-=+*#@"
        min_val = min(values)
        max_val = max(values)
        val_range = max_val - min_val if max_val > min_val else 1.0

        # Resample if needed
        if len(values) > width:
            step = len(values) / width
            resampled = []
            for i in range(width):
                idx = int(i * step)
                resampled.append(values[min(idx, len(values) - 1)])
            values = resampled

        chars: List[str] = []
        for v in values:
            normalised = (v - min_val) / val_range
            block_idx = int(normalised * (len(blocks) - 1))
            chars.append(blocks[block_idx])

        return "".join(chars)

    # ---- Report sections ----------------------------------------------------

    def _section_overview(self) -> str:
        """Generate overview section with high-level stats."""
        lines: List[str] = []
        lines.append("## Overview\n")
        lines.append(
            f"Report generated: "
            f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        )

        # Frontier stats
        conn = self._open_db(self._frontier_db)
        if conn:
            try:
                rows = conn.execute(
                    "SELECT status, COUNT(*) as cnt FROM frontier GROUP BY status"
                ).fetchall()
                status_counts = {r["status"]: r["cnt"] for r in rows}
                total = sum(status_counts.values())

                total_row = conn.execute(
                    "SELECT COUNT(DISTINCT domain) as domains FROM frontier"
                ).fetchone()
                unique_domains = total_row["domains"] if total_row else 0

                lines.append(f"| Metric | Value |")
                lines.append(f"|---|---|")
                lines.append(f"| Total URLs | {total:,} |")
                lines.append(f"| Unique domains | {unique_domains:,} |")
                for status in ("pending", "active", "completed", "failed"):
                    count = status_counts.get(status, 0)
                    pct = (count / total * 100) if total > 0 else 0
                    lines.append(f"| {status.capitalize()} | {count:,} ({pct:.1f}%) |")
                lines.append("")
            finally:
                conn.close()
        else:
            lines.append("Frontier database not found.\n")

        # Replay buffer stats
        conn = self._open_db(self._replay_meta_db)
        if conn:
            try:
                trans_row = conn.execute(
                    "SELECT COUNT(*) as cnt FROM transitions"
                ).fetchone()
                pending_row = conn.execute(
                    "SELECT COUNT(*) as total, "
                    "SUM(CASE WHEN reward IS NULL THEN 1 ELSE 0 END) as unresolved "
                    "FROM pending_rewards"
                ).fetchone()
                lines.append(f"| Replay transitions | {trans_row['cnt']:,} |")
                if pending_row and pending_row["total"] > 0:
                    lines.append(
                        f"| Pending rewards | {pending_row['unresolved']:,} / "
                        f"{pending_row['total']:,} unresolved |"
                    )
                lines.append("")
            finally:
                conn.close()

        return "\n".join(lines)

    def _section_top_domains(self, top_n: int = 15) -> str:
        """Generate top domains section ranked by avg reward."""
        lines: List[str] = []
        lines.append("## Top Domains (by avg reward)\n")

        conn = self._open_db(self._domain_stats_db)
        if conn is None:
            lines.append("Domain stats database not found.\n")
            return "\n".join(lines)

        try:
            rows = conn.execute(
                "SELECT domain, pages_crawled, reward_sum, leads_found "
                "FROM domain_stats "
                "WHERE pages_crawled > 0 "
                "ORDER BY reward_sum / pages_crawled DESC "
                f"LIMIT {top_n}"
            ).fetchall()

            if not rows:
                lines.append("No domain data available.\n")
                return "\n".join(lines)

            labels = []
            avg_rewards = []
            for r in rows:
                avg = r["reward_sum"] / max(r["pages_crawled"], 1)
                labels.append(
                    f"{r['domain'][:25]} ({r['pages_crawled']}p, {r['leads_found']}L)"
                )
                avg_rewards.append(avg)

            lines.append("```")
            lines.append(self._ascii_bar_chart(labels, avg_rewards, max_width=35))
            lines.append("```\n")

            # Tabular detail
            lines.append("| Domain | Pages | Leads | Avg Reward |")
            lines.append("|---|---|---|---|")
            for r in rows:
                avg = r["reward_sum"] / max(r["pages_crawled"], 1)
                lines.append(
                    f"| {r['domain']} | {r['pages_crawled']:,} | "
                    f"{r['leads_found']:,} | {avg:.4f} |"
                )
            lines.append("")

            return "\n".join(lines)
        finally:
            conn.close()

    def _section_frontier_health(self) -> str:
        """Generate frontier health section."""
        lines: List[str] = []
        lines.append("## Frontier Health\n")

        conn = self._open_db(self._frontier_db)
        if conn is None:
            lines.append("Frontier database not found.\n")
            return "\n".join(lines)

        try:
            # Q-value distribution
            q_rows = conn.execute(
                "SELECT "
                "MIN(q_value) as min_q, "
                "MAX(q_value) as max_q, "
                "AVG(q_value) as avg_q, "
                "COUNT(*) as total "
                "FROM frontier WHERE status = 'pending'"
            ).fetchone()

            if q_rows and q_rows["total"] > 0:
                lines.append("### Q-Value Distribution (pending URLs)\n")
                lines.append(f"- Min: {q_rows['min_q']:.4f}")
                lines.append(f"- Max: {q_rows['max_q']:.4f}")
                lines.append(f"- Avg: {q_rows['avg_q']:.4f}")
                lines.append(f"- Count: {q_rows['total']:,}")
                lines.append("")

                # Q-value histogram (10 buckets)
                all_q = conn.execute(
                    "SELECT q_value FROM frontier WHERE status = 'pending' "
                    "ORDER BY q_value"
                ).fetchall()
                q_values = [r["q_value"] for r in all_q]
                if q_values:
                    bucket_count = 10
                    min_q = q_values[0]
                    max_q = q_values[-1]
                    bucket_width = (max_q - min_q) / bucket_count if max_q > min_q else 1.0
                    buckets = [0] * bucket_count
                    for q in q_values:
                        idx = min(
                            int((q - min_q) / bucket_width),
                            bucket_count - 1,
                        )
                        buckets[idx] += 1

                    bucket_labels = []
                    for i in range(bucket_count):
                        lo = min_q + i * bucket_width
                        hi = lo + bucket_width
                        bucket_labels.append(f"{lo:.2f}-{hi:.2f}")

                    lines.append("```")
                    lines.append(self._ascii_bar_chart(
                        bucket_labels,
                        [float(b) for b in buckets],
                        max_width=30,
                        value_fmt=".0f",
                    ))
                    lines.append("```\n")

            # Depth distribution
            depth_rows = conn.execute(
                "SELECT depth, COUNT(*) as cnt FROM frontier "
                "WHERE status = 'pending' GROUP BY depth ORDER BY depth"
            ).fetchall()
            if depth_rows:
                lines.append("### Depth Distribution\n")
                depth_labels = [f"depth={r['depth']}" for r in depth_rows]
                depth_values = [float(r["cnt"]) for r in depth_rows]
                lines.append("```")
                lines.append(self._ascii_bar_chart(
                    depth_labels, depth_values, max_width=30, value_fmt=".0f"
                ))
                lines.append("```\n")

            # Stale URLs (pending > 24h)
            cutoff = time.time() - 86400
            stale_row = conn.execute(
                "SELECT COUNT(*) as cnt FROM frontier "
                "WHERE status = 'pending' AND updated_at < ?",
                (cutoff,),
            ).fetchone()
            stale = stale_row["cnt"] if stale_row else 0
            if stale > 0:
                lines.append(
                    f"**Warning:** {stale:,} pending URLs are older than 24 hours.\n"
                )

            return "\n".join(lines)
        finally:
            conn.close()

    def _section_training_progress(self) -> str:
        """Generate training progress section."""
        lines: List[str] = []
        lines.append("## Training Progress\n")

        conn = self._open_db(self._replay_meta_db)
        if conn is None:
            lines.append("Replay buffer database not found.\n")
            return "\n".join(lines)

        try:
            # Overall stats
            summary = conn.execute(
                "SELECT COUNT(*) as total, "
                "AVG(reward) as avg_reward, "
                "MIN(reward) as min_reward, "
                "MAX(reward) as max_reward, "
                "AVG(priority) as avg_priority "
                "FROM transitions"
            ).fetchone()

            if summary and summary["total"] > 0:
                lines.append(f"| Metric | Value |")
                lines.append(f"|---|---|")
                lines.append(f"| Total transitions | {summary['total']:,} |")
                lines.append(f"| Avg reward | {summary['avg_reward']:.4f} |")
                lines.append(f"| Min reward | {summary['min_reward']:.4f} |")
                lines.append(f"| Max reward | {summary['max_reward']:.4f} |")
                lines.append(f"| Avg priority | {summary['avg_priority']:.4f} |")
                lines.append("")

                # Reward sparkline over time (hourly buckets)
                hourly = conn.execute(
                    "SELECT CAST(created_at / 3600 AS INTEGER) * 3600 as bucket, "
                    "AVG(reward) as avg_reward, COUNT(*) as cnt "
                    "FROM transitions GROUP BY bucket ORDER BY bucket"
                ).fetchall()
                if hourly:
                    avg_rewards = [r["avg_reward"] for r in hourly]
                    counts = [float(r["cnt"]) for r in hourly]
                    lines.append("### Reward Trend (hourly avg)\n")
                    lines.append(f"```")
                    lines.append(f"  {self._ascii_sparkline(avg_rewards)}")
                    lines.append(f"```\n")
                    lines.append("### Throughput (transitions/hour)\n")
                    lines.append(f"```")
                    lines.append(f"  {self._ascii_sparkline(counts)}")
                    lines.append(f"```\n")
            else:
                lines.append("No training data available.\n")

            return "\n".join(lines)
        finally:
            conn.close()

    def _section_domain_distribution(self) -> str:
        """Generate domain distribution section."""
        lines: List[str] = []
        lines.append("## Domain Distribution\n")

        conn = self._open_db(self._domain_stats_db)
        if conn is None:
            lines.append("Domain stats database not found.\n")
            return "\n".join(lines)

        try:
            total_row = conn.execute(
                "SELECT COUNT(*) as cnt, "
                "SUM(pages_crawled) as total_pages, "
                "SUM(leads_found) as total_leads "
                "FROM domain_stats"
            ).fetchone()

            if total_row and total_row["cnt"] > 0:
                lines.append(f"- Total domains: {total_row['cnt']:,}")
                lines.append(f"- Total pages crawled: {total_row['total_pages']:,}")
                lines.append(f"- Total leads found: {total_row['total_leads']:,}")
                total_pages = total_row["total_pages"] or 0
                total_leads = total_row["total_leads"] or 0
                if total_pages > 0:
                    lines.append(
                        f"- Overall lead rate: "
                        f"{total_leads / total_pages * 100:.2f}%"
                    )
                lines.append("")

                # Pages per domain distribution (top 10)
                top_pages = conn.execute(
                    "SELECT domain, pages_crawled FROM domain_stats "
                    "ORDER BY pages_crawled DESC LIMIT 10"
                ).fetchall()
                if top_pages:
                    lines.append("### Pages per Domain (top 10)\n")
                    labels = [r["domain"][:30] for r in top_pages]
                    values = [float(r["pages_crawled"]) for r in top_pages]
                    lines.append("```")
                    lines.append(self._ascii_bar_chart(
                        labels, values, max_width=35, value_fmt=".0f"
                    ))
                    lines.append("```\n")

                # Domains with zero leads
                zero_leads = conn.execute(
                    "SELECT COUNT(*) as cnt FROM domain_stats "
                    "WHERE leads_found = 0 AND pages_crawled > 0"
                ).fetchone()
                if zero_leads and zero_leads["cnt"] > 0:
                    lines.append(
                        f"**Note:** {zero_leads['cnt']:,} domains have been "
                        f"crawled but produced zero leads.\n"
                    )

            return "\n".join(lines)
        finally:
            conn.close()

    # ---- Public API ---------------------------------------------------------

    def generate_report(self) -> str:
        """Generate a full Markdown crawl summary report.

        Sections: overview, top domains, frontier health, training progress,
        domain distribution.

        Returns the report as a Markdown string.
        """
        sections: List[str] = []
        sections.append("# Crawl Summary Report\n")
        sections.append(self._section_overview())
        sections.append(self._section_top_domains())
        sections.append(self._section_frontier_health())
        sections.append(self._section_training_progress())
        sections.append(self._section_domain_distribution())
        sections.append("---\n*Generated by crawler_data_export.py*\n")

        return "\n".join(sections)

    def save_report(self, output_path: Optional[str] = None) -> str:
        """Generate and save the crawl report to a file.

        Args:
            output_path: optional path; defaults to output_dir/crawl_report_<ts>.md.

        Returns the path to the saved report.
        """
        if output_path is None:
            ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            filename = f"crawl_report_{ts}.md"
            output_path = os.path.join(self.config.output_dir, filename)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        report = self.generate_report()

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(report)

        logger.info("Saved crawl report to %s", output_path)
        return output_path
