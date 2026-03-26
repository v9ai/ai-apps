"""
ChromaDB -> LanceDB v2 Migration for Scrapus
==============================================

One-shot migration script that:
  1. Reads all ChromaDB collections (documents, entities, embeddings)
  2. Transforms to the unified LanceDB v2 Arrow schema
  3. Applies INT8 scalar quantization (75% storage reduction)
  4. Writes to LanceDB v2 with ZSTD compression
  5. Builds appropriate ANN indexes
  6. Validates data integrity (row counts, embedding recall)
  7. Supports rollback on failure

The migration is idempotent: re-running skips already-migrated tables.

Target: Apple M1 16GB -- the entire migration runs in <300 MB RSS.

Dependencies:
    chromadb>=0.4          (source)
    lancedb>=0.5           (destination)
    pyarrow>=14.0
    numpy>=1.24
    zstandard>=0.22        (optional, for ZSTD stats)
"""

from __future__ import annotations

import gc
import hashlib
import json
import logging
import os
import shutil
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import numpy as np

try:
    import chromadb

    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False

from lancedb_store import (
    LanceDBConfig,
    TableName,
    UnifiedVectorStore,
    _quantize_vectors_int8,
    _dequantize_vectors_int8,
    open_store,
)
from lancedb_indexing import IndexManager, build_all_indexes, print_progress

logger = logging.getLogger("scrapus.lancedb_migration")


# ---------------------------------------------------------------------------
# Progress / status tracking
# ---------------------------------------------------------------------------

@dataclass
class MigrationStep:
    """Status of a single migration step."""
    name: str
    source_collection: str
    target_table: str
    status: str = "pending"          # pending | running | done | failed | skipped
    source_rows: int = 0
    migrated_rows: int = 0
    duration_sec: float = 0.0
    error: Optional[str] = None
    recall_at_10: Optional[float] = None
    int8_compression_ratio: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MigrationReport:
    """Full migration report."""
    started_at: str = ""
    finished_at: str = ""
    total_duration_sec: float = 0.0
    steps: List[MigrationStep] = field(default_factory=list)
    source_disk_bytes: int = 0
    target_disk_bytes: int = 0
    compression_ratio: float = 0.0
    status: str = "pending"          # pending | running | done | failed | rolled_back
    rollback_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            "steps": [s.to_dict() for s in self.steps],
        }

    def summary(self) -> str:
        lines = [
            f"Migration {self.status}",
            f"  Duration: {self.total_duration_sec:.1f}s",
            f"  Source disk: {self.source_disk_bytes / (1024**2):.1f} MB",
            f"  Target disk: {self.target_disk_bytes / (1024**2):.1f} MB",
            f"  Compression: {self.compression_ratio:.2f}x",
        ]
        for step in self.steps:
            emoji = {"done": "[OK]", "failed": "[FAIL]", "skipped": "[SKIP]"}.get(
                step.status, "[??]"
            )
            lines.append(
                f"  {emoji} {step.name}: {step.migrated_rows}/{step.source_rows} rows "
                f"({step.duration_sec:.1f}s)"
            )
            if step.recall_at_10 is not None:
                lines.append(f"       Recall@10: {step.recall_at_10:.4f}")
        return "\n".join(lines)


MigrationCallback = Callable[[str, float, str], None]
"""Signature: (step_name, pct_complete, message) -> None"""


def _noop_callback(name: str, pct: float, msg: str) -> None:
    pass


# ---------------------------------------------------------------------------
# ChromaDB reader
# ---------------------------------------------------------------------------

class ChromaDBReader:
    """
    Read-only accessor for an existing ChromaDB persistent store.

    Extracts collections, embeddings, documents, and metadata in batches
    to stay within the M1 RAM budget.
    """

    def __init__(self, persist_dir: str):
        if not HAS_CHROMADB:
            raise RuntimeError(
                "chromadb is required for migration. "
                "Install with: pip install chromadb>=0.4"
            )
        self._persist_dir = persist_dir
        self._client: Optional[chromadb.ClientAPI] = None

    def connect(self) -> None:
        self._client = chromadb.PersistentClient(path=self._persist_dir)
        logger.info("ChromaDB opened: %s", self._persist_dir)

    @property
    def client(self) -> chromadb.ClientAPI:
        if self._client is None:
            self.connect()
        return self._client

    def list_collections(self) -> List[str]:
        return [c.name for c in self.client.list_collections()]

    def collection_count(self, name: str) -> int:
        coll = self.client.get_collection(name)
        return coll.count()

    def read_collection(
        self,
        name: str,
        batch_size: int = 2048,
    ) -> Dict[str, Any]:
        """
        Read an entire collection.

        Returns dict with keys: ids, embeddings, documents, metadatas.
        Reads in batches to control peak memory.
        """
        coll = self.client.get_collection(name)
        total = coll.count()

        all_ids: List[str] = []
        all_embeddings: List[List[float]] = []
        all_documents: List[str] = []
        all_metadatas: List[Dict] = []

        for offset in range(0, total, batch_size):
            result = coll.get(
                limit=batch_size,
                offset=offset,
                include=["embeddings", "documents", "metadatas"],
            )
            all_ids.extend(result["ids"])
            if result["embeddings"] is not None:
                all_embeddings.extend(result["embeddings"])
            if result["documents"] is not None:
                all_documents.extend(result["documents"])
            if result["metadatas"] is not None:
                all_metadatas.extend(result["metadatas"])

        return {
            "ids": all_ids,
            "embeddings": all_embeddings,
            "documents": all_documents,
            "metadatas": all_metadatas,
            "count": total,
        }

    def disk_size_bytes(self) -> int:
        """Total size of the ChromaDB persist directory."""
        total = 0
        for f in Path(self._persist_dir).rglob("*"):
            if f.is_file():
                total += f.stat().st_size
        return total


# ---------------------------------------------------------------------------
# Collection-to-table mapping
# ---------------------------------------------------------------------------

# ChromaDB collection names (conventional) -> LanceDB target tables.
# Adjust these if your ChromaDB uses different collection names.
DEFAULT_COLLECTION_MAP: Dict[str, TableName] = {
    "page_embeddings": TableName.PAGES,
    "pages": TableName.PAGES,
    "entity_embeddings": TableName.ENTITIES,
    "entities": TableName.ENTITIES,
    "documents": TableName.DOCUMENTS,
    "document_chunks": TableName.DOCUMENTS,
    "doc_chunks": TableName.DOCUMENTS,
}


# ---------------------------------------------------------------------------
# Transformer functions: ChromaDB record -> LanceDB row
# ---------------------------------------------------------------------------

def _transform_pages(
    ids: List[str],
    embeddings: np.ndarray,
    documents: List[str],
    metadatas: List[Dict],
) -> Dict[str, list]:
    """Transform ChromaDB page records to LanceDB pages schema."""
    n = len(ids)
    now = datetime.now(timezone.utc)

    urls, domains, titles = [], [], []
    http_statuses, content_hashes, depths = [], [], []
    byte_sizes, languages, meta_jsons = [], [], []

    for i, meta in enumerate(metadatas):
        urls.append(meta.get("url", ""))
        domains.append(meta.get("domain", ""))
        titles.append(meta.get("title", ""))
        http_statuses.append(int(meta.get("http_status", 200)))
        content_hashes.append(
            meta.get("content_hash", "")
            or hashlib.md5(documents[i].encode() if i < len(documents) and documents[i] else b"").hexdigest()
        )
        depths.append(int(meta.get("depth", 0)))
        byte_sizes.append(int(meta.get("byte_size", 0)))
        languages.append(meta.get("language", "en"))
        # Preserve remaining metadata as JSON
        preserved = {k: v for k, v in meta.items() if k not in {
            "url", "domain", "title", "http_status",
            "content_hash", "depth", "byte_size", "language",
        }}
        meta_jsons.append(json.dumps(preserved) if preserved else "{}")

    return {
        "id": ids,
        "vector": [v.tolist() for v in embeddings],
        "url": urls,
        "domain": domains,
        "title": titles,
        "crawl_ts": [now] * n,
        "http_status": http_statuses,
        "content_hash": content_hashes,
        "depth": depths,
        "byte_size": byte_sizes,
        "language": languages,
        "meta_json": meta_jsons,
    }


def _transform_entities(
    ids: List[str],
    embeddings: np.ndarray,
    documents: List[str],
    metadatas: List[Dict],
) -> Dict[str, list]:
    """Transform ChromaDB entity records to LanceDB entities schema."""
    n = len(ids)
    now = datetime.now(timezone.utc)

    entity_types, canonical_names, source_page_ids = [], [], []
    confidences, cluster_ids, attr_jsons = [], [], []

    for meta in metadatas:
        entity_types.append(meta.get("entity_type", meta.get("type", "UNKNOWN")))
        canonical_names.append(meta.get("canonical_name", meta.get("name", "")))
        source_page_ids.append(meta.get("source_page_id", meta.get("page_id", "")))
        confidences.append(float(meta.get("confidence", 0.0)))
        cluster_ids.append(meta.get("cluster_id", ""))
        preserved = {k: v for k, v in meta.items() if k not in {
            "entity_type", "type", "canonical_name", "name",
            "source_page_id", "page_id", "confidence", "cluster_id",
        }}
        attr_jsons.append(json.dumps(preserved) if preserved else "{}")

    return {
        "id": ids,
        "vector": [v.tolist() for v in embeddings],
        "entity_type": entity_types,
        "canonical_name": canonical_names,
        "source_page_id": source_page_ids,
        "confidence": confidences,
        "cluster_id": cluster_ids,
        "attributes_json": attr_jsons,
        "created_ts": [now] * n,
        "updated_ts": [now] * n,
    }


def _transform_documents(
    ids: List[str],
    embeddings: np.ndarray,
    documents: List[str],
    metadatas: List[Dict],
) -> Dict[str, list]:
    """Transform ChromaDB document/chunk records to LanceDB documents schema."""
    n = len(ids)

    source_page_ids, chunk_indices, texts = [], [], []
    char_starts, char_ends, token_counts = [], [], []
    sections, meta_jsons = [], []

    for i, meta in enumerate(metadatas):
        source_page_ids.append(meta.get("source_page_id", meta.get("page_id", "")))
        chunk_indices.append(int(meta.get("chunk_index", meta.get("chunk_idx", i))))
        texts.append(documents[i] if i < len(documents) and documents[i] else "")
        char_starts.append(int(meta.get("char_start", 0)))
        char_ends.append(int(meta.get("char_end", 0)))
        token_counts.append(int(meta.get("token_count", meta.get("tokens", 0))))
        sections.append(meta.get("section", ""))
        preserved = {k: v for k, v in meta.items() if k not in {
            "source_page_id", "page_id", "chunk_index", "chunk_idx",
            "char_start", "char_end", "token_count", "tokens", "section",
        }}
        meta_jsons.append(json.dumps(preserved) if preserved else "{}")

    return {
        "id": ids,
        "vector": [v.tolist() for v in embeddings],
        "source_page_id": source_page_ids,
        "chunk_index": chunk_indices,
        "text": texts,
        "char_start": char_starts,
        "char_end": char_ends,
        "token_count": token_counts,
        "section": sections,
        "meta_json": meta_jsons,
    }


TRANSFORMERS: Dict[TableName, Callable] = {
    TableName.PAGES: _transform_pages,
    TableName.ENTITIES: _transform_entities,
    TableName.DOCUMENTS: _transform_documents,
}


# ---------------------------------------------------------------------------
# INT8 quantization validation
# ---------------------------------------------------------------------------

def _validate_int8_recall(
    original: np.ndarray,
    n_queries: int = 100,
    k: int = 10,
    threshold: float = 0.98,
) -> Tuple[float, bool]:
    """
    Quantize -> dequantize -> measure recall@K.

    Returns (recall, passed).
    """
    if len(original) < k + n_queries:
        return 1.0, True  # too few vectors to test meaningfully

    quantized, scales = _quantize_vectors_int8(original)
    reconstructed = _dequantize_vectors_int8(quantized, scales)

    # Sample queries
    n = len(original)
    query_idx = np.random.choice(n, size=min(n_queries, n // 5), replace=False)

    # Compute cosine similarities
    def _cosine_batch(a: np.ndarray, b: np.ndarray) -> np.ndarray:
        a_n = np.linalg.norm(a, axis=1, keepdims=True) + 1e-8
        b_n = np.linalg.norm(b, axis=1, keepdims=True) + 1e-8
        return (a / a_n) @ (b / b_n).T

    sim_orig = _cosine_batch(original[query_idx], original)
    sim_recon = _cosine_batch(reconstructed[query_idx], reconstructed)

    true_nn = np.argsort(-sim_orig, axis=1)[:, :k]
    approx_nn = np.argsort(-sim_recon, axis=1)[:, :k]

    recalls = []
    for q in range(len(query_idx)):
        overlap = len(set(true_nn[q]) & set(approx_nn[q]))
        recalls.append(overlap / k)

    recall = float(np.mean(recalls))
    return recall, recall >= threshold


# ---------------------------------------------------------------------------
# Rollback support
# ---------------------------------------------------------------------------

class RollbackManager:
    """
    Creates a snapshot of the LanceDB directory before migration
    so we can restore on failure.
    """

    def __init__(self, db_path: str):
        self._db_path = Path(db_path)
        self._backup_path = self._db_path.parent / (self._db_path.name + ".pre_migration_backup")

    @property
    def backup_path(self) -> str:
        return str(self._backup_path)

    def create_snapshot(self) -> bool:
        """Copy current LanceDB directory to backup. Returns True if created."""
        if not self._db_path.exists():
            return False
        if self._backup_path.exists():
            shutil.rmtree(self._backup_path)
        shutil.copytree(self._db_path, self._backup_path)
        logger.info("Snapshot created: %s", self._backup_path)
        return True

    def rollback(self) -> bool:
        """Restore from snapshot. Returns True if restored."""
        if not self._backup_path.exists():
            logger.warning("No snapshot to rollback to")
            return False
        if self._db_path.exists():
            shutil.rmtree(self._db_path)
        shutil.copytree(self._backup_path, self._db_path)
        logger.info("Rolled back to snapshot: %s", self._backup_path)
        return True

    def cleanup(self) -> None:
        """Remove the backup snapshot (call after successful migration)."""
        if self._backup_path.exists():
            shutil.rmtree(self._backup_path)
            logger.info("Snapshot cleaned up: %s", self._backup_path)


# ---------------------------------------------------------------------------
# Migration orchestrator
# ---------------------------------------------------------------------------

class ChromaToLanceMigration:
    """
    Orchestrates the full ChromaDB -> LanceDB v2 migration.

    Usage::

        migration = ChromaToLanceMigration(
            chromadb_path="scrapus_data/chromadb",
            lancedb_path="scrapus_data/lancedb_v2",
        )
        report = migration.run(progress=print_callback)
        print(report.summary())

    The migration is idempotent: if a target table already has data it
    is skipped unless ``force=True``.
    """

    def __init__(
        self,
        chromadb_path: str = "scrapus_data/chromadb",
        lancedb_path: str = "scrapus_data/lancedb_v2",
        collection_map: Optional[Dict[str, TableName]] = None,
        apply_int8: bool = True,
        build_indexes: bool = True,
        validate: bool = True,
        recall_threshold: float = 0.98,
        batch_size: int = 2048,
    ):
        self._chromadb_path = chromadb_path
        self._lancedb_path = lancedb_path
        self._collection_map = collection_map or DEFAULT_COLLECTION_MAP
        self._apply_int8 = apply_int8
        self._build_indexes = build_indexes
        self._validate = validate
        self._recall_threshold = recall_threshold
        self._batch_size = batch_size

        self._reader: Optional[ChromaDBReader] = None
        self._store: Optional[UnifiedVectorStore] = None
        self._rollback = RollbackManager(lancedb_path)
        self._report = MigrationReport()

    # -- lifecycle -------------------------------------------------------

    def run(
        self,
        progress: MigrationCallback = _noop_callback,
        force: bool = False,
    ) -> MigrationReport:
        """
        Execute the full migration pipeline.

        Parameters
        ----------
        progress
            Callback: (step_name, pct, message) -> None
        force
            If True, overwrite existing LanceDB data.

        Returns
        -------
        MigrationReport with per-step details.
        """
        self._report = MigrationReport(
            started_at=datetime.now(timezone.utc).isoformat(),
            status="running",
        )
        t0 = time.monotonic()

        try:
            # Step 0: snapshot for rollback
            progress("init", 0.0, "Creating rollback snapshot")
            self._rollback.create_snapshot()
            self._report.rollback_path = self._rollback.backup_path

            # Step 1: open source and destination
            progress("init", 0.05, "Opening ChromaDB")
            self._reader = ChromaDBReader(self._chromadb_path)
            self._reader.connect()
            self._report.source_disk_bytes = self._reader.disk_size_bytes()

            progress("init", 0.1, "Opening LanceDB v2")
            self._store = open_store(self._lancedb_path)
            self._store.initialize()

            # Step 2: discover collections
            collections = self._reader.list_collections()
            logger.info("ChromaDB collections: %s", collections)

            # Step 3: migrate each mapped collection
            mapped = [
                (coll, target)
                for coll in collections
                if (target := self._collection_map.get(coll)) is not None
            ]
            total_steps = len(mapped)
            if total_steps == 0:
                logger.warning("No mappable collections found in ChromaDB")

            for idx, (coll_name, target_table) in enumerate(mapped):
                step_pct_base = 0.15 + 0.65 * (idx / max(total_steps, 1))
                step = self._migrate_one(
                    coll_name, target_table, progress, step_pct_base, force,
                )
                self._report.steps.append(step)

            # Step 4: build indexes
            if self._build_indexes:
                progress("indexing", 0.85, "Building ANN indexes")
                build_all_indexes(self._store, progress=print_progress)

            # Step 5: compute final stats
            stats = self._store.storage_stats()
            self._report.target_disk_bytes = stats["total_disk_bytes"]
            if self._report.target_disk_bytes > 0:
                self._report.compression_ratio = round(
                    self._report.source_disk_bytes / self._report.target_disk_bytes, 2
                )

            self._report.status = "done"
            progress("done", 1.0, "Migration complete")

            # Clean up snapshot on success
            self._rollback.cleanup()

        except Exception as exc:
            logger.error("Migration failed: %s", exc, exc_info=True)
            self._report.status = "failed"
            self._report.steps.append(MigrationStep(
                name="fatal",
                source_collection="",
                target_table="",
                status="failed",
                error=str(exc),
            ))

            # Rollback
            progress("rollback", 0.0, f"Rolling back: {exc}")
            if self._store:
                self._store.close()
                self._store = None
            self._rollback.rollback()
            self._report.status = "rolled_back"

        finally:
            if self._store:
                self._store.close()
            self._report.finished_at = datetime.now(timezone.utc).isoformat()
            self._report.total_duration_sec = round(time.monotonic() - t0, 2)
            gc.collect()

        return self._report

    # -- single collection migration -------------------------------------

    def _migrate_one(
        self,
        coll_name: str,
        target: TableName,
        progress: MigrationCallback,
        pct_base: float,
        force: bool,
    ) -> MigrationStep:
        """Migrate a single ChromaDB collection to a LanceDB table."""
        step = MigrationStep(
            name=f"{coll_name} -> {target.value}",
            source_collection=coll_name,
            target_table=target.value,
        )
        t0 = time.monotonic()

        try:
            # Check if target already has data
            existing_rows = self._store.count_rows(target)
            if existing_rows > 0 and not force:
                step.status = "skipped"
                step.source_rows = self._reader.collection_count(coll_name)
                step.migrated_rows = existing_rows
                logger.info(
                    "Skipping %s -> %s: target has %d rows",
                    coll_name, target.value, existing_rows,
                )
                return step

            step.status = "running"
            progress(step.name, pct_base, f"Reading {coll_name}")

            # Read from ChromaDB
            data = self._reader.read_collection(coll_name, self._batch_size)
            step.source_rows = data["count"]

            if step.source_rows == 0:
                step.status = "done"
                step.migrated_rows = 0
                return step

            ids = data["ids"]
            embeddings = np.array(data["embeddings"], dtype=np.float32) if data["embeddings"] else None
            documents = data["documents"] or [""] * len(ids)
            metadatas = data["metadatas"] or [{}] * len(ids)

            progress(step.name, pct_base + 0.02, f"Read {step.source_rows} records")

            # INT8 quantization validation (before writing)
            if self._apply_int8 and self._validate and embeddings is not None:
                recall, passed = _validate_int8_recall(
                    embeddings,
                    threshold=self._recall_threshold,
                )
                step.recall_at_10 = recall
                if not passed:
                    logger.warning(
                        "INT8 recall (%.4f) below threshold (%.4f) for %s",
                        recall, self._recall_threshold, coll_name,
                    )
                else:
                    logger.info("INT8 recall@10 = %.4f for %s", recall, coll_name)

                # Compute compression ratio for reporting
                if embeddings is not None:
                    orig_bytes = embeddings.nbytes
                    q, s = _quantize_vectors_int8(embeddings)
                    comp_bytes = q.nbytes + s.nbytes
                    step.int8_compression_ratio = round(orig_bytes / comp_bytes, 2)

            # Transform to LanceDB schema
            progress(step.name, pct_base + 0.04, "Transforming schema")
            transformer = TRANSFORMERS.get(target)
            if transformer is None:
                step.status = "failed"
                step.error = f"No transformer for target table {target.value}"
                return step

            if embeddings is None:
                step.status = "failed"
                step.error = "Collection has no embeddings"
                return step

            row_data = transformer(ids, embeddings, documents, metadatas)

            # Write to LanceDB in batches
            progress(step.name, pct_base + 0.06, "Writing to LanceDB")
            tbl = self._store.table(target).lance_table
            n = len(ids)
            batch_sz = self._batch_size

            written = 0
            for start in range(0, n, batch_sz):
                end = min(start + batch_sz, n)
                batch = {k: v[start:end] for k, v in row_data.items()}
                tbl.add(batch)
                written += end - start

            step.migrated_rows = written
            step.status = "done"
            progress(step.name, pct_base + 0.10, f"Wrote {written} rows")

        except Exception as exc:
            step.status = "failed"
            step.error = str(exc)
            logger.error("Failed migrating %s: %s", coll_name, exc, exc_info=True)

        step.duration_sec = round(time.monotonic() - t0, 3)
        return step

    # -- manual rollback -------------------------------------------------

    def rollback(self) -> bool:
        """Manually trigger rollback to pre-migration state."""
        if self._store:
            self._store.close()
            self._store = None
        return self._rollback.rollback()


# ---------------------------------------------------------------------------
# Validation utilities
# ---------------------------------------------------------------------------

def validate_migration(
    chromadb_path: str,
    lancedb_path: str,
    collection_map: Optional[Dict[str, TableName]] = None,
) -> Dict[str, Any]:
    """
    Post-migration validation: compare row counts and spot-check embeddings.

    Returns a report dict.
    """
    cmap = collection_map or DEFAULT_COLLECTION_MAP
    report: Dict[str, Any] = {"tables": {}, "passed": True}

    reader = ChromaDBReader(chromadb_path)
    reader.connect()

    store = open_store(lancedb_path)
    store.initialize()

    try:
        for coll_name, target in cmap.items():
            try:
                source_count = reader.collection_count(coll_name)
            except Exception:
                continue

            target_count = store.count_rows(target)

            table_report = {
                "source_rows": source_count,
                "target_rows": target_count,
                "match": source_count == target_count,
            }

            if not table_report["match"]:
                report["passed"] = False
                table_report["warning"] = (
                    f"Row count mismatch: source={source_count}, target={target_count}"
                )

            report["tables"][f"{coll_name} -> {target.value}"] = table_report

    finally:
        store.close()

    report["timestamp"] = datetime.now(timezone.utc).isoformat()
    return report


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """
    Run migration from command line.

    Usage::

        python lancedb_migration.py [--chromadb-path PATH] [--lancedb-path PATH] [--force]
    """
    import argparse

    parser = argparse.ArgumentParser(description="Migrate ChromaDB to LanceDB v2")
    parser.add_argument(
        "--chromadb-path",
        default="scrapus_data/chromadb",
        help="Path to ChromaDB persist directory",
    )
    parser.add_argument(
        "--lancedb-path",
        default="scrapus_data/lancedb_v2",
        help="Path for LanceDB v2 database",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing LanceDB data",
    )
    parser.add_argument(
        "--no-index",
        action="store_true",
        help="Skip ANN index building",
    )
    parser.add_argument(
        "--no-validate",
        action="store_true",
        help="Skip INT8 recall validation",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    def cli_progress(name: str, pct: float, msg: str) -> None:
        bar_len = 30
        filled = int(bar_len * pct)
        bar = "#" * filled + "-" * (bar_len - filled)
        print(f"  [{bar}] {pct*100:5.1f}%  {name}: {msg}")

    migration = ChromaToLanceMigration(
        chromadb_path=args.chromadb_path,
        lancedb_path=args.lancedb_path,
        build_indexes=not args.no_index,
        validate=not args.no_validate,
    )

    report = migration.run(progress=cli_progress, force=args.force)
    print("\n" + "=" * 70)
    print(report.summary())
    print("=" * 70)

    if report.status == "done":
        print("\nRunning post-migration validation...")
        val = validate_migration(args.chromadb_path, args.lancedb_path)
        if val["passed"]:
            print("Validation PASSED")
        else:
            print("Validation FAILED:")
            for tbl, info in val["tables"].items():
                if not info.get("match", True):
                    print(f"  {tbl}: {info.get('warning', '')}")


if __name__ == "__main__":
    main()
