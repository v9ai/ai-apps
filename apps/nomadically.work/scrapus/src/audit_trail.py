"""
Immutable Append-Only Audit Trail with Cryptographic Hash Chain
for Scrapus M1 Local Deployment

Tracks every decision the pipeline makes for B2B lead generation
compliance and explainability:
  - Which URLs were crawled and why
  - Which entities were extracted from which pages
  - How entity clusters were formed (merges, splits)
  - Which leads were qualified or rejected and the scoring rationale
  - What reports were generated and their verification status
  - Drift events, model lifecycle, errors

Design:
  1. SQLite-backed with WAL mode for concurrent dashboard reads
  2. SHA-256 hash chain: each entry links to the previous via prev_hash
  3. Batch logging for high-throughput stages (NER can emit thousands)
  4. Query interface: by time range, stage, action, entity_id
  5. Chain verification: validate integrity from genesis to tip
  6. Compaction: archive entries older than N days to separate DB
  7. Memory budget: 25 MB (write buffer + connection pool)

Hash chain formula:
  entry_hash = SHA-256(prev_hash || timestamp || stage || action || details_json)

Dependencies: hashlib (stdlib), sqlite3 (stdlib), no external crypto.
"""

import hashlib
import json
import logging
import os
import shutil
import sqlite3
import threading
import time
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple
from uuid import uuid4

logger = logging.getLogger(__name__)

# ============================================================================
# Constants
# ============================================================================

DEFAULT_DB_DIR = Path.home() / "scrapus_data"
DEFAULT_AUDIT_DB = DEFAULT_DB_DIR / "scrapus_audit.db"
GENESIS_HASH = "0" * 64  # SHA-256 zero hash for the first entry
MAX_BATCH_SIZE = 500  # Max entries per batch insert
WRITE_BUFFER_LIMIT = 1000  # Flush when buffer hits this count
MEMORY_BUDGET_MB = 25
# Approximate bytes per buffered entry (for memory budget enforcement)
APPROX_ENTRY_BYTES = 512


class AuditAction(Enum):
    """All auditable event types in the Scrapus pipeline."""

    # Module 1: Crawler
    PAGE_CRAWLED = "PAGE_CRAWLED"

    # Module 2: NER Extraction
    ENTITY_EXTRACTED = "ENTITY_EXTRACTED"

    # Module 3: Entity Resolution
    ENTITY_MERGED = "ENTITY_MERGED"
    CLUSTER_CREATED = "CLUSTER_CREATED"

    # Module 4: Lead Matching
    LEAD_SCORED = "LEAD_SCORED"
    LEAD_QUALIFIED = "LEAD_QUALIFIED"
    LEAD_REJECTED = "LEAD_REJECTED"

    # Module 5: Report Generation
    REPORT_GENERATED = "REPORT_GENERATED"
    REPORT_VERIFIED = "REPORT_VERIFIED"

    # Module 6: Monitoring
    DRIFT_DETECTED = "DRIFT_DETECTED"

    # Model lifecycle
    MODEL_LOADED = "MODEL_LOADED"
    MODEL_UNLOADED = "MODEL_UNLOADED"

    # Pipeline lifecycle
    STAGE_STARTED = "STAGE_STARTED"
    STAGE_COMPLETED = "STAGE_COMPLETED"

    # Errors
    ERROR_OCCURRED = "ERROR_OCCURRED"


class AuditStage(Enum):
    """Pipeline stages that produce audit events."""
    CRAWLER = "crawler"
    NER_EXTRACTION = "ner_extraction"
    ENTITY_RESOLUTION = "entity_resolution"
    LEAD_MATCHING = "lead_matching"
    REPORT_GENERATION = "report_generation"
    EVALUATION = "evaluation"
    INFRASTRUCTURE = "infrastructure"
    PIPELINE = "pipeline"


class DetailLevel(Enum):
    """Controls how much detail is recorded per event."""
    MINIMAL = "minimal"    # action + entity_id only
    STANDARD = "standard"  # + key metrics, scores, counts
    VERBOSE = "verbose"    # + full inputs/outputs, embeddings excluded


@dataclass
class AuditEntry:
    """Single immutable audit log entry."""
    seq_id: int
    timestamp: str
    stage: str
    action: str
    entity_id: Optional[str]
    details_json: str
    prev_hash: str
    entry_hash: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "seq_id": self.seq_id,
            "timestamp": self.timestamp,
            "stage": self.stage,
            "action": self.action,
            "entity_id": self.entity_id,
            "details_json": self.details_json,
            "prev_hash": self.prev_hash,
            "entry_hash": self.entry_hash,
        }

    @staticmethod
    def from_row(row: Tuple) -> "AuditEntry":
        return AuditEntry(
            seq_id=row[0],
            timestamp=row[1],
            stage=row[2],
            action=row[3],
            entity_id=row[4],
            details_json=row[5],
            prev_hash=row[6],
            entry_hash=row[7],
        )


# ============================================================================
# Hash computation
# ============================================================================

def compute_entry_hash(
    prev_hash: str,
    timestamp: str,
    stage: str,
    action: str,
    details_json: str,
) -> str:
    """
    Compute SHA-256 hash for an audit entry.

    Formula: SHA-256(prev_hash || timestamp || stage || action || details_json)

    All fields are concatenated with '|' delimiter to prevent ambiguity
    from field-boundary shifting attacks.
    """
    payload = f"{prev_hash}|{timestamp}|{stage}|{action}|{details_json}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def verify_entry_hash(entry: AuditEntry) -> bool:
    """Verify that an entry's hash matches its contents."""
    expected = compute_entry_hash(
        entry.prev_hash,
        entry.timestamp,
        entry.stage,
        entry.action,
        entry.details_json,
    )
    return expected == entry.entry_hash


# ============================================================================
# SQLite schema and connection
# ============================================================================

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS audit_chain (
    seq_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp    TEXT    NOT NULL,
    stage        TEXT    NOT NULL,
    action       TEXT    NOT NULL,
    entity_id    TEXT,
    details_json TEXT    NOT NULL DEFAULT '{}',
    prev_hash    TEXT    NOT NULL,
    entry_hash   TEXT    NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_chain(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_stage     ON audit_chain(stage);
CREATE INDEX IF NOT EXISTS idx_audit_action    ON audit_chain(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity    ON audit_chain(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_hash      ON audit_chain(entry_hash);

-- Metadata table for chain tip tracking and compaction state
CREATE TABLE IF NOT EXISTS audit_metadata (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def _open_connection(db_path: Path) -> sqlite3.Connection:
    """Open a SQLite connection with WAL mode and tuned pragmas."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=10.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-8000")  # 8 MB cache
    conn.execute("PRAGMA mmap_size=16777216")  # 16 MB mmap
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


# ============================================================================
# AuditTrail: core append-only log
# ============================================================================

class AuditTrail:
    """
    Immutable append-only audit log with cryptographic hash chain.

    Thread-safe via a reentrant lock on all write operations.
    Reads use separate connections for concurrent dashboard access.

    Memory budget: 25 MB total
      - Write buffer: ~512 bytes/entry * 1000 max = 500 KB
      - SQLite connection + cache: ~8 MB
      - Indexes in memory (mmap-backed): ~16 MB
    """

    def __init__(
        self,
        db_path: Optional[Path] = None,
        detail_level: DetailLevel = DetailLevel.STANDARD,
        auto_flush_count: int = WRITE_BUFFER_LIMIT,
        auto_flush_interval_s: float = 5.0,
    ):
        self._db_path = db_path or DEFAULT_AUDIT_DB
        self._detail_level = detail_level
        self._auto_flush_count = auto_flush_count
        self._auto_flush_interval_s = auto_flush_interval_s

        self._lock = threading.RLock()
        self._write_buffer: List[Tuple[str, str, str, Optional[str], str]] = []
        self._last_flush_time = time.monotonic()
        self._tip_hash: str = GENESIS_HASH
        self._tip_seq_id: int = 0
        self._closed = False

        # Initialize DB and recover chain tip
        self._conn = _open_connection(self._db_path)
        self._init_schema()
        self._recover_tip()

        logger.info(
            "AuditTrail initialized: db=%s, tip_seq=%d, tip_hash=%s...",
            self._db_path,
            self._tip_seq_id,
            self._tip_hash[:12],
        )

    # ------------------------------------------------------------------
    # Schema and recovery
    # ------------------------------------------------------------------

    def _init_schema(self) -> None:
        """Create tables and indexes if they don't exist."""
        self._conn.executescript(_SCHEMA_SQL)
        self._conn.commit()

    def _recover_tip(self) -> None:
        """
        Recover the chain tip (last entry hash) from the database.
        Called once at initialization to resume the chain.
        """
        row = self._conn.execute(
            "SELECT seq_id, entry_hash FROM audit_chain ORDER BY seq_id DESC LIMIT 1"
        ).fetchone()
        if row:
            self._tip_seq_id = row[0]
            self._tip_hash = row[1]
        else:
            self._tip_seq_id = 0
            self._tip_hash = GENESIS_HASH

    # ------------------------------------------------------------------
    # Public write API
    # ------------------------------------------------------------------

    def log(
        self,
        stage: AuditStage,
        action: AuditAction,
        entity_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Log a single audit event. Returns the entry hash.

        This method is thread-safe. The event is buffered and written
        to SQLite either immediately (if buffer is full) or on the
        next flush cycle.

        Args:
            stage: Pipeline stage that produced the event.
            action: Type of action being recorded.
            entity_id: Optional entity/lead/report identifier.
            details: Additional structured data about the event.

        Returns:
            The SHA-256 hash of the logged entry.
        """
        if self._closed:
            raise RuntimeError("AuditTrail is closed")

        details_json = self._prepare_details(details)
        timestamp = datetime.utcnow().isoformat(timespec="microseconds")

        with self._lock:
            entry_hash = self._append_to_chain(
                timestamp, stage.value, action.value, entity_id, details_json
            )
            self._maybe_auto_flush()

        return entry_hash

    def log_batch(
        self,
        stage: AuditStage,
        action: AuditAction,
        entries: Sequence[Tuple[Optional[str], Optional[Dict[str, Any]]]],
    ) -> List[str]:
        """
        Log a batch of events atomically. Used for high-throughput stages
        like NER extraction where thousands of entities are produced.

        Args:
            stage: Pipeline stage.
            action: Action type (same for all entries in batch).
            entries: List of (entity_id, details) tuples.

        Returns:
            List of entry hashes, one per entry.
        """
        if self._closed:
            raise RuntimeError("AuditTrail is closed")

        hashes: List[str] = []
        timestamp_base = datetime.utcnow().isoformat(timespec="microseconds")

        with self._lock:
            for i, (entity_id, details) in enumerate(entries):
                details_json = self._prepare_details(details)
                # Microsecond-offset timestamps for ordering within batch
                ts = f"{timestamp_base}+{i:06d}"
                h = self._append_to_chain(
                    ts, stage.value, action.value, entity_id, details_json
                )
                hashes.append(h)

                # Flush in chunks to stay within memory budget
                if len(self._write_buffer) >= MAX_BATCH_SIZE:
                    self._flush_buffer()

            # Flush any remainder
            if self._write_buffer:
                self._flush_buffer()

        return hashes

    def flush(self) -> int:
        """
        Force-flush the write buffer to SQLite.

        Returns:
            Number of entries flushed.
        """
        with self._lock:
            return self._flush_buffer()

    # ------------------------------------------------------------------
    # Public read / query API
    # ------------------------------------------------------------------

    def get_entry(self, seq_id: int) -> Optional[AuditEntry]:
        """Fetch a single entry by sequence ID."""
        row = self._read_conn().execute(
            "SELECT seq_id, timestamp, stage, action, entity_id, "
            "details_json, prev_hash, entry_hash "
            "FROM audit_chain WHERE seq_id = ?",
            (seq_id,),
        ).fetchone()
        return AuditEntry.from_row(row) if row else None

    def get_tip(self) -> Tuple[int, str]:
        """Return (seq_id, entry_hash) of the chain tip."""
        with self._lock:
            return self._tip_seq_id, self._tip_hash

    def query_by_time_range(
        self,
        start: datetime,
        end: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[AuditEntry]:
        """Query entries within a time range."""
        end = end or datetime.utcnow()
        rows = self._read_conn().execute(
            "SELECT seq_id, timestamp, stage, action, entity_id, "
            "details_json, prev_hash, entry_hash "
            "FROM audit_chain "
            "WHERE timestamp >= ? AND timestamp <= ? "
            "ORDER BY seq_id ASC LIMIT ?",
            (start.isoformat(), end.isoformat(), limit),
        ).fetchall()
        return [AuditEntry.from_row(r) for r in rows]

    def query_by_stage(
        self,
        stage: AuditStage,
        limit: int = 1000,
    ) -> List[AuditEntry]:
        """Query entries for a specific pipeline stage."""
        rows = self._read_conn().execute(
            "SELECT seq_id, timestamp, stage, action, entity_id, "
            "details_json, prev_hash, entry_hash "
            "FROM audit_chain "
            "WHERE stage = ? "
            "ORDER BY seq_id DESC LIMIT ?",
            (stage.value, limit),
        ).fetchall()
        return [AuditEntry.from_row(r) for r in rows]

    def query_by_action(
        self,
        action: AuditAction,
        limit: int = 1000,
    ) -> List[AuditEntry]:
        """Query entries for a specific action type."""
        rows = self._read_conn().execute(
            "SELECT seq_id, timestamp, stage, action, entity_id, "
            "details_json, prev_hash, entry_hash "
            "FROM audit_chain "
            "WHERE action = ? "
            "ORDER BY seq_id DESC LIMIT ?",
            (action.value, limit),
        ).fetchall()
        return [AuditEntry.from_row(r) for r in rows]

    def query_by_entity(
        self,
        entity_id: str,
        limit: int = 500,
    ) -> List[AuditEntry]:
        """
        Query all audit entries related to a specific entity.
        Returns events in chronological order for provenance tracing.
        """
        rows = self._read_conn().execute(
            "SELECT seq_id, timestamp, stage, action, entity_id, "
            "details_json, prev_hash, entry_hash "
            "FROM audit_chain "
            "WHERE entity_id = ? "
            "ORDER BY seq_id ASC LIMIT ?",
            (entity_id, limit),
        ).fetchall()
        return [AuditEntry.from_row(r) for r in rows]

    def query_entries(
        self,
        stage: Optional[AuditStage] = None,
        action: Optional[AuditAction] = None,
        entity_id: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> List[AuditEntry]:
        """
        Flexible multi-filter query. All parameters are optional;
        unset parameters are not included in the WHERE clause.
        """
        conditions: List[str] = []
        params: List[Any] = []

        if stage is not None:
            conditions.append("stage = ?")
            params.append(stage.value)
        if action is not None:
            conditions.append("action = ?")
            params.append(action.value)
        if entity_id is not None:
            conditions.append("entity_id = ?")
            params.append(entity_id)
        if start is not None:
            conditions.append("timestamp >= ?")
            params.append(start.isoformat())
        if end is not None:
            conditions.append("timestamp <= ?")
            params.append(end.isoformat())

        where = "WHERE " + " AND ".join(conditions) if conditions else ""
        params.extend([limit, offset])

        rows = self._read_conn().execute(
            f"SELECT seq_id, timestamp, stage, action, entity_id, "
            f"details_json, prev_hash, entry_hash "
            f"FROM audit_chain {where} "
            f"ORDER BY seq_id ASC LIMIT ? OFFSET ?",
            params,
        ).fetchall()
        return [AuditEntry.from_row(r) for r in rows]

    def count(
        self,
        stage: Optional[AuditStage] = None,
        action: Optional[AuditAction] = None,
    ) -> int:
        """Count entries, optionally filtered by stage and/or action."""
        conditions: List[str] = []
        params: List[Any] = []

        if stage is not None:
            conditions.append("stage = ?")
            params.append(stage.value)
        if action is not None:
            conditions.append("action = ?")
            params.append(action.value)

        where = "WHERE " + " AND ".join(conditions) if conditions else ""
        row = self._read_conn().execute(
            f"SELECT COUNT(*) FROM audit_chain {where}", params
        ).fetchone()
        return row[0] if row else 0

    def chain_length(self) -> int:
        """Total number of entries in the chain."""
        row = self._read_conn().execute(
            "SELECT COUNT(*) FROM audit_chain"
        ).fetchone()
        return row[0] if row else 0

    # ------------------------------------------------------------------
    # Chain verification
    # ------------------------------------------------------------------

    def verify_chain(
        self,
        start_seq: int = 1,
        end_seq: Optional[int] = None,
        batch_size: int = 5000,
    ) -> Tuple[bool, int, Optional[int]]:
        """
        Verify the integrity of the hash chain.

        Walks the chain from start_seq to end_seq, checking that each
        entry's hash matches its contents and that prev_hash links
        are unbroken.

        Args:
            start_seq: First sequence ID to verify (1 = genesis).
            end_seq: Last sequence ID to verify (None = tip).
            batch_size: Number of rows to fetch per cursor iteration.

        Returns:
            (is_valid, entries_checked, first_broken_seq)
            - is_valid: True if chain is intact.
            - entries_checked: Number of entries verified.
            - first_broken_seq: seq_id of first broken link, or None.
        """
        conn = self._read_conn()

        if end_seq is None:
            row = conn.execute(
                "SELECT MAX(seq_id) FROM audit_chain"
            ).fetchone()
            end_seq = row[0] if row and row[0] else 0

        if end_seq == 0:
            return True, 0, None

        # Determine the expected prev_hash for start_seq
        if start_seq == 1:
            expected_prev_hash = GENESIS_HASH
        else:
            prev_row = conn.execute(
                "SELECT entry_hash FROM audit_chain WHERE seq_id = ?",
                (start_seq - 1,),
            ).fetchone()
            if not prev_row:
                logger.error(
                    "Cannot verify: entry seq_id=%d not found", start_seq - 1
                )
                return False, 0, start_seq
            expected_prev_hash = prev_row[0]

        entries_checked = 0
        current_offset = start_seq

        while current_offset <= end_seq:
            rows = conn.execute(
                "SELECT seq_id, timestamp, stage, action, entity_id, "
                "details_json, prev_hash, entry_hash "
                "FROM audit_chain "
                "WHERE seq_id >= ? AND seq_id <= ? "
                "ORDER BY seq_id ASC LIMIT ?",
                (current_offset, end_seq, batch_size),
            ).fetchall()

            if not rows:
                break

            for row in rows:
                entry = AuditEntry.from_row(row)

                # Check 1: prev_hash links to the previous entry
                if entry.prev_hash != expected_prev_hash:
                    logger.error(
                        "Chain broken at seq_id=%d: expected prev_hash=%s..., got=%s...",
                        entry.seq_id,
                        expected_prev_hash[:12],
                        entry.prev_hash[:12],
                    )
                    return False, entries_checked, entry.seq_id

                # Check 2: entry_hash matches computed hash
                computed = compute_entry_hash(
                    entry.prev_hash,
                    entry.timestamp,
                    entry.stage,
                    entry.action,
                    entry.details_json,
                )
                if computed != entry.entry_hash:
                    logger.error(
                        "Tampered entry at seq_id=%d: computed=%s..., stored=%s...",
                        entry.seq_id,
                        computed[:12],
                        entry.entry_hash[:12],
                    )
                    return False, entries_checked, entry.seq_id

                expected_prev_hash = entry.entry_hash
                entries_checked += 1

            current_offset = rows[-1][0] + 1

        logger.info(
            "Chain verification passed: %d entries, seq_id %d..%d",
            entries_checked,
            start_seq,
            end_seq,
        )
        return True, entries_checked, None

    # ------------------------------------------------------------------
    # Compaction: archive old entries
    # ------------------------------------------------------------------

    def compact(
        self,
        older_than_days: int = 90,
        archive_dir: Optional[Path] = None,
    ) -> Tuple[int, Optional[Path]]:
        """
        Archive entries older than N days to a separate SQLite file.
        The archived entries are removed from the primary database,
        but the chain integrity is preserved via a bridging record
        in the metadata table.

        Args:
            older_than_days: Archive entries older than this.
            archive_dir: Directory for archive files (default: same dir).

        Returns:
            (archived_count, archive_path)
        """
        cutoff = (datetime.utcnow() - timedelta(days=older_than_days)).isoformat()
        archive_dir = archive_dir or self._db_path.parent / "audit_archives"
        archive_dir.mkdir(parents=True, exist_ok=True)

        with self._lock:
            self._flush_buffer()

            # Find entries to archive
            conn = self._conn
            count_row = conn.execute(
                "SELECT COUNT(*) FROM audit_chain WHERE timestamp < ?",
                (cutoff,),
            ).fetchone()
            archive_count = count_row[0] if count_row else 0

            if archive_count == 0:
                logger.info("No entries to archive (cutoff=%s)", cutoff)
                return 0, None

            # Find the boundary: last entry to archive
            boundary_row = conn.execute(
                "SELECT seq_id, entry_hash FROM audit_chain "
                "WHERE timestamp < ? ORDER BY seq_id DESC LIMIT 1",
                (cutoff,),
            ).fetchone()
            boundary_seq = boundary_row[0]
            boundary_hash = boundary_row[1]

            # Create archive database
            ts_slug = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            archive_path = archive_dir / f"audit_archive_{ts_slug}.db"
            archive_conn = _open_connection(archive_path)
            archive_conn.executescript(_SCHEMA_SQL)

            # Copy entries to archive
            rows = conn.execute(
                "SELECT seq_id, timestamp, stage, action, entity_id, "
                "details_json, prev_hash, entry_hash "
                "FROM audit_chain WHERE seq_id <= ? ORDER BY seq_id ASC",
                (boundary_seq,),
            ).fetchall()

            archive_conn.executemany(
                "INSERT INTO audit_chain "
                "(seq_id, timestamp, stage, action, entity_id, "
                "details_json, prev_hash, entry_hash) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
            archive_conn.execute(
                "INSERT OR REPLACE INTO audit_metadata (key, value) VALUES (?, ?)",
                ("archive_boundary_seq", str(boundary_seq)),
            )
            archive_conn.execute(
                "INSERT OR REPLACE INTO audit_metadata (key, value) VALUES (?, ?)",
                ("archive_boundary_hash", boundary_hash),
            )
            archive_conn.commit()
            archive_conn.close()

            # Record compaction in primary DB metadata
            conn.execute(
                "INSERT OR REPLACE INTO audit_metadata (key, value) VALUES (?, ?)",
                ("last_compaction_ts", datetime.utcnow().isoformat()),
            )
            conn.execute(
                "INSERT OR REPLACE INTO audit_metadata (key, value) VALUES (?, ?)",
                ("last_compaction_boundary_seq", str(boundary_seq)),
            )
            conn.execute(
                "INSERT OR REPLACE INTO audit_metadata (key, value) VALUES (?, ?)",
                ("last_compaction_boundary_hash", boundary_hash),
            )
            conn.execute(
                "INSERT OR REPLACE INTO audit_metadata (key, value) VALUES (?, ?)",
                ("last_archive_path", str(archive_path)),
            )

            # Delete archived entries from primary
            conn.execute(
                "DELETE FROM audit_chain WHERE seq_id <= ?",
                (boundary_seq,),
            )
            conn.commit()

            logger.info(
                "Compacted %d entries to %s (boundary seq=%d, hash=%s...)",
                archive_count,
                archive_path,
                boundary_seq,
                boundary_hash[:12],
            )
            return archive_count, archive_path

    def get_compaction_info(self) -> Dict[str, Any]:
        """Return metadata about the last compaction."""
        conn = self._read_conn()
        rows = conn.execute(
            "SELECT key, value FROM audit_metadata WHERE key LIKE 'last_%'"
        ).fetchall()
        return {row[0]: row[1] for row in rows}

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Flush pending writes and close the database connection."""
        if self._closed:
            return
        with self._lock:
            self._flush_buffer()
            self._conn.close()
            self._closed = True
        logger.info("AuditTrail closed (tip_seq=%d)", self._tip_seq_id)

    def __enter__(self) -> "AuditTrail":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Internal: chain append and buffer management
    # ------------------------------------------------------------------

    def _append_to_chain(
        self,
        timestamp: str,
        stage: str,
        action: str,
        entity_id: Optional[str],
        details_json: str,
    ) -> str:
        """
        Append an entry to the in-memory chain. Must be called under lock.
        The entry is buffered; actual SQLite write happens on flush.
        """
        entry_hash = compute_entry_hash(
            self._tip_hash, timestamp, stage, action, details_json
        )
        self._write_buffer.append(
            (timestamp, stage, action, entity_id, details_json, self._tip_hash, entry_hash)
        )
        self._tip_hash = entry_hash
        self._tip_seq_id += 1
        return entry_hash

    def _maybe_auto_flush(self) -> None:
        """Flush if buffer size or time threshold exceeded. Under lock."""
        buffer_len = len(self._write_buffer)
        elapsed = time.monotonic() - self._last_flush_time

        if buffer_len >= self._auto_flush_count or elapsed >= self._auto_flush_interval_s:
            self._flush_buffer()

    def _flush_buffer(self) -> int:
        """
        Write all buffered entries to SQLite in a single transaction.
        Must be called under lock. Returns count of entries flushed.
        """
        if not self._write_buffer:
            return 0

        count = len(self._write_buffer)
        try:
            self._conn.executemany(
                "INSERT INTO audit_chain "
                "(timestamp, stage, action, entity_id, details_json, prev_hash, entry_hash) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                self._write_buffer,
            )
            self._conn.commit()
        except sqlite3.Error as e:
            logger.error("Failed to flush %d audit entries: %s", count, e)
            # Re-raise: data integrity is non-negotiable
            raise
        finally:
            self._write_buffer.clear()
            self._last_flush_time = time.monotonic()

        return count

    def _prepare_details(self, details: Optional[Dict[str, Any]]) -> str:
        """
        Serialize details dict to JSON, applying detail level filtering.
        Enforces memory budget by truncating oversized payloads.
        """
        if details is None:
            return "{}"

        if self._detail_level == DetailLevel.MINIMAL:
            # Strip everything except a few key fields
            minimal_keys = {"score", "count", "status", "reason", "url", "model_name"}
            details = {k: v for k, v in details.items() if k in minimal_keys}
        elif self._detail_level == DetailLevel.STANDARD:
            # Exclude large binary/embedding fields
            exclude_keys = {"embeddings", "raw_html", "raw_bytes", "weights"}
            details = {k: v for k, v in details.items() if k not in exclude_keys}
        # VERBOSE: keep everything

        try:
            serialized = json.dumps(details, separators=(",", ":"), default=str)
        except (TypeError, ValueError) as e:
            logger.warning("Failed to serialize audit details: %s", e)
            serialized = json.dumps({"_serialization_error": str(e)})

        # Enforce payload size limit (16 KB per entry)
        if len(serialized) > 16384:
            serialized = serialized[:16380] + '..."}'
            logger.warning("Audit details truncated to 16 KB limit")

        return serialized

    def _read_conn(self) -> sqlite3.Connection:
        """
        Return a connection for read operations.
        Uses the main connection since WAL mode supports concurrent reads.
        """
        return self._conn

    # ------------------------------------------------------------------
    # Convenience helpers for pipeline integration
    # ------------------------------------------------------------------

    def log_page_crawled(
        self,
        url: str,
        status_code: int,
        content_length: int,
        crawl_time_ms: float,
        domain: Optional[str] = None,
    ) -> str:
        """Log a crawled page event."""
        return self.log(
            stage=AuditStage.CRAWLER,
            action=AuditAction.PAGE_CRAWLED,
            entity_id=url,
            details={
                "url": url,
                "status_code": status_code,
                "content_length": content_length,
                "crawl_time_ms": round(crawl_time_ms, 2),
                "domain": domain,
            },
        )

    def log_entity_extracted(
        self,
        entity_id: str,
        entity_type: str,
        text: str,
        confidence: float,
        source_url: str,
    ) -> str:
        """Log an extracted entity."""
        return self.log(
            stage=AuditStage.NER_EXTRACTION,
            action=AuditAction.ENTITY_EXTRACTED,
            entity_id=entity_id,
            details={
                "entity_type": entity_type,
                "text": text[:256],  # truncate long entity text
                "confidence": round(confidence, 4),
                "source_url": source_url,
            },
        )

    def log_entity_merged(
        self,
        canonical_id: str,
        merged_ids: List[str],
        similarity_score: float,
        merge_method: str,
    ) -> str:
        """Log an entity merge decision."""
        return self.log(
            stage=AuditStage.ENTITY_RESOLUTION,
            action=AuditAction.ENTITY_MERGED,
            entity_id=canonical_id,
            details={
                "merged_ids": merged_ids,
                "similarity_score": round(similarity_score, 4),
                "merge_method": merge_method,
                "merge_count": len(merged_ids),
            },
        )

    def log_cluster_created(
        self,
        cluster_id: str,
        member_ids: List[str],
        cluster_method: str,
    ) -> str:
        """Log cluster formation."""
        return self.log(
            stage=AuditStage.ENTITY_RESOLUTION,
            action=AuditAction.CLUSTER_CREATED,
            entity_id=cluster_id,
            details={
                "member_ids": member_ids,
                "cluster_method": cluster_method,
                "member_count": len(member_ids),
            },
        )

    def log_lead_scored(
        self,
        lead_id: str,
        score: float,
        confidence_interval: Optional[Tuple[float, float]] = None,
        features: Optional[Dict[str, float]] = None,
    ) -> str:
        """Log a lead scoring decision."""
        details: Dict[str, Any] = {
            "score": round(score, 4),
        }
        if confidence_interval:
            details["ci_lower"] = round(confidence_interval[0], 4)
            details["ci_upper"] = round(confidence_interval[1], 4)
        if features and self._detail_level != DetailLevel.MINIMAL:
            # Top-5 features by absolute SHAP value
            top_features = dict(
                sorted(features.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
            )
            details["top_features"] = {
                k: round(v, 4) for k, v in top_features.items()
            }
        return self.log(
            stage=AuditStage.LEAD_MATCHING,
            action=AuditAction.LEAD_SCORED,
            entity_id=lead_id,
            details=details,
        )

    def log_lead_qualified(
        self,
        lead_id: str,
        score: float,
        threshold: float,
        reason: str,
    ) -> str:
        """Log a lead qualification decision."""
        return self.log(
            stage=AuditStage.LEAD_MATCHING,
            action=AuditAction.LEAD_QUALIFIED,
            entity_id=lead_id,
            details={
                "score": round(score, 4),
                "threshold": round(threshold, 4),
                "reason": reason,
            },
        )

    def log_lead_rejected(
        self,
        lead_id: str,
        score: float,
        threshold: float,
        reason: str,
    ) -> str:
        """Log a lead rejection decision."""
        return self.log(
            stage=AuditStage.LEAD_MATCHING,
            action=AuditAction.LEAD_REJECTED,
            entity_id=lead_id,
            details={
                "score": round(score, 4),
                "threshold": round(threshold, 4),
                "reason": reason,
            },
        )

    def log_report_generated(
        self,
        report_id: str,
        lead_id: str,
        model_name: str,
        token_count: int,
        generation_time_s: float,
    ) -> str:
        """Log a generated report."""
        return self.log(
            stage=AuditStage.REPORT_GENERATION,
            action=AuditAction.REPORT_GENERATED,
            entity_id=report_id,
            details={
                "lead_id": lead_id,
                "model_name": model_name,
                "token_count": token_count,
                "generation_time_s": round(generation_time_s, 2),
            },
        )

    def log_report_verified(
        self,
        report_id: str,
        factuality_score: float,
        claims_verified: int,
        claims_total: int,
    ) -> str:
        """Log a report verification result."""
        return self.log(
            stage=AuditStage.REPORT_GENERATION,
            action=AuditAction.REPORT_VERIFIED,
            entity_id=report_id,
            details={
                "factuality_score": round(factuality_score, 4),
                "claims_verified": claims_verified,
                "claims_total": claims_total,
                "verification_rate": round(claims_verified / max(claims_total, 1), 4),
            },
        )

    def log_stage_started(self, stage: AuditStage, run_id: Optional[str] = None) -> str:
        """Log the start of a pipeline stage."""
        return self.log(
            stage=stage,
            action=AuditAction.STAGE_STARTED,
            details={"run_id": run_id} if run_id else None,
        )

    def log_stage_completed(
        self,
        stage: AuditStage,
        items_processed: int,
        elapsed_s: float,
        run_id: Optional[str] = None,
    ) -> str:
        """Log the completion of a pipeline stage."""
        return self.log(
            stage=stage,
            action=AuditAction.STAGE_COMPLETED,
            details={
                "items_processed": items_processed,
                "elapsed_s": round(elapsed_s, 3),
                "run_id": run_id,
            },
        )

    def log_model_loaded(
        self,
        model_name: str,
        size_mb: float,
        load_time_s: float,
    ) -> str:
        """Log a model being loaded into memory."""
        return self.log(
            stage=AuditStage.INFRASTRUCTURE,
            action=AuditAction.MODEL_LOADED,
            entity_id=model_name,
            details={
                "model_name": model_name,
                "size_mb": round(size_mb, 1),
                "load_time_s": round(load_time_s, 3),
            },
        )

    def log_model_unloaded(self, model_name: str) -> str:
        """Log a model being unloaded from memory."""
        return self.log(
            stage=AuditStage.INFRASTRUCTURE,
            action=AuditAction.MODEL_UNLOADED,
            entity_id=model_name,
            details={"model_name": model_name},
        )

    def log_drift_detected(
        self,
        detector_name: str,
        drift_type: str,
        statistic: float,
        threshold: float,
        severity: str,
    ) -> str:
        """Log a drift detection event."""
        return self.log(
            stage=AuditStage.EVALUATION,
            action=AuditAction.DRIFT_DETECTED,
            details={
                "detector_name": detector_name,
                "drift_type": drift_type,
                "statistic": round(statistic, 6),
                "threshold": round(threshold, 6),
                "severity": severity,
            },
        )

    def log_error(
        self,
        stage: AuditStage,
        error_type: str,
        message: str,
        entity_id: Optional[str] = None,
    ) -> str:
        """Log an error that occurred during pipeline execution."""
        return self.log(
            stage=stage,
            action=AuditAction.ERROR_OCCURRED,
            entity_id=entity_id,
            details={
                "error_type": error_type,
                "message": message[:1024],
            },
        )
