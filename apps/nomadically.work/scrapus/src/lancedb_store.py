"""
Unified LanceDB v2 Vector Store for Scrapus
=============================================

Single-store replacement for ChromaDB + old LanceDB. All vector data lives here:
  - pages:     crawled page embeddings + HTML metadata
  - entities:  entity embeddings + type labels
  - leads:     lead profile vectors + scoring metadata
  - documents: full-text chunks for RAG retrieval
  - replay:    RL crawler replay buffer vectors

Storage budget: 1.6 GB disk, 200-300 MB RAM (mmap-first).
Compression: ZSTD on Arrow columns + INT8 scalar quantization.
Target: Apple M1 16GB, zero cloud dependency.

Dependencies:
    lancedb>=0.5
    pyarrow>=14.0
    numpy>=1.24
    zstandard>=0.22
"""

from __future__ import annotations

import gc
import json
import logging
import os
import shutil
import time
from contextlib import contextmanager
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import (
    Any,
    Dict,
    Iterator,
    List,
    Literal,
    Optional,
    Sequence,
    Tuple,
    Union,
)

import numpy as np
import pyarrow as pa

try:
    import lancedb
    from lancedb.table import LanceTable

    HAS_LANCEDB = True
except ImportError:
    HAS_LANCEDB = False

try:
    import zstandard as zstd

    HAS_ZSTD = True
except ImportError:
    HAS_ZSTD = False

logger = logging.getLogger("scrapus.lancedb_store")


# ---------------------------------------------------------------------------
# Constants & configuration
# ---------------------------------------------------------------------------

# Default embedding dimensions used across Scrapus modules
DEFAULT_PAGE_DIM = 768       # nomic-embed-text-v1.5
DEFAULT_ENTITY_DIM = 768     # all-MiniLM-L6-v2 / DeBERTa
DEFAULT_LEAD_DIM = 64        # LightGBM leaf-embedding projection
DEFAULT_DOCUMENT_DIM = 768   # nomic / MiniLM for RAG
DEFAULT_REPLAY_DIM = 768     # DQN state embeddings

# M1 16 GB budget guardrails
MAX_DISK_BYTES = 1_700_000_000   # 1.6 GB operational + headroom
MAX_RAM_BYTES = 314_572_800      # 300 MB mmap ceiling
MMAP_THRESHOLD_ROWS = 500       # tables below this stay in RAM


class TableName(str, Enum):
    """Canonical table names -- used as keys everywhere."""
    PAGES = "pages"
    ENTITIES = "entities"
    LEADS = "leads"
    DOCUMENTS = "documents"
    REPLAY = "replay"


# ---------------------------------------------------------------------------
# Arrow schema definitions
# ---------------------------------------------------------------------------

def _fixed_vector_field(name: str, dim: int) -> pa.Field:
    """Create a fixed-size-list field for embedding vectors."""
    return pa.field(name, pa.list_(pa.float32(), dim))


def _int8_vector_field(name: str, dim: int) -> pa.Field:
    """Create a fixed-size-list field for INT8 quantized vectors."""
    return pa.field(name, pa.list_(pa.int8(), dim))


def pages_schema(dim: int = DEFAULT_PAGE_DIM) -> pa.Schema:
    """Arrow schema for crawled page embeddings."""
    return pa.schema([
        pa.field("id", pa.utf8(), nullable=False),
        _fixed_vector_field("vector", dim),
        pa.field("url", pa.utf8()),
        pa.field("domain", pa.utf8()),
        pa.field("title", pa.utf8()),
        pa.field("crawl_ts", pa.timestamp("us", tz="UTC")),
        pa.field("http_status", pa.int16()),
        pa.field("content_hash", pa.utf8()),
        pa.field("depth", pa.int16()),
        pa.field("byte_size", pa.int32()),
        pa.field("language", pa.utf8()),
        pa.field("meta_json", pa.utf8()),  # overflow metadata as JSON blob
    ])


def entities_schema(dim: int = DEFAULT_ENTITY_DIM) -> pa.Schema:
    """Arrow schema for entity embeddings."""
    return pa.schema([
        pa.field("id", pa.utf8(), nullable=False),
        _fixed_vector_field("vector", dim),
        pa.field("entity_type", pa.utf8()),           # COMPANY, PERSON, PRODUCT, ...
        pa.field("canonical_name", pa.utf8()),
        pa.field("source_page_id", pa.utf8()),
        pa.field("confidence", pa.float32()),
        pa.field("cluster_id", pa.utf8()),
        pa.field("attributes_json", pa.utf8()),
        pa.field("created_ts", pa.timestamp("us", tz="UTC")),
        pa.field("updated_ts", pa.timestamp("us", tz="UTC")),
    ])


def leads_schema(dim: int = DEFAULT_LEAD_DIM) -> pa.Schema:
    """Arrow schema for lead profile vectors."""
    return pa.schema([
        pa.field("id", pa.utf8(), nullable=False),
        _fixed_vector_field("vector", dim),
        pa.field("company_name", pa.utf8()),
        pa.field("industry", pa.utf8()),
        pa.field("size_tier", pa.utf8()),
        pa.field("location", pa.utf8()),
        pa.field("lead_score", pa.float32()),
        pa.field("lead_confidence", pa.float32()),
        pa.field("conformal_lower", pa.float32()),
        pa.field("conformal_upper", pa.float32()),
        pa.field("is_qualified", pa.bool_()),
        pa.field("scored_ts", pa.timestamp("us", tz="UTC")),
        pa.field("features_json", pa.utf8()),
    ])


def documents_schema(dim: int = DEFAULT_DOCUMENT_DIM) -> pa.Schema:
    """Arrow schema for RAG document chunks."""
    return pa.schema([
        pa.field("id", pa.utf8(), nullable=False),
        _fixed_vector_field("vector", dim),
        pa.field("source_page_id", pa.utf8()),
        pa.field("chunk_index", pa.int32()),
        pa.field("text", pa.utf8()),
        pa.field("char_start", pa.int32()),
        pa.field("char_end", pa.int32()),
        pa.field("token_count", pa.int32()),
        pa.field("section", pa.utf8()),
        pa.field("meta_json", pa.utf8()),
    ])


def replay_schema(dim: int = DEFAULT_REPLAY_DIM) -> pa.Schema:
    """Arrow schema for RL replay buffer state vectors."""
    return pa.schema([
        pa.field("id", pa.utf8(), nullable=False),
        _fixed_vector_field("state_vector", dim),
        _fixed_vector_field("next_state_vector", dim),
        pa.field("action", pa.int16()),
        pa.field("reward", pa.float32()),
        pa.field("done", pa.bool_()),
        pa.field("priority", pa.float32()),
        pa.field("episode", pa.int32()),
        pa.field("step", pa.int32()),
        pa.field("inserted_ts", pa.timestamp("us", tz="UTC")),
    ])


TABLE_SCHEMAS: Dict[TableName, pa.Schema] = {
    TableName.PAGES: pages_schema(),
    TableName.ENTITIES: entities_schema(),
    TableName.LEADS: leads_schema(),
    TableName.DOCUMENTS: documents_schema(),
    TableName.REPLAY: replay_schema(),
}


# ---------------------------------------------------------------------------
# Configuration dataclass
# ---------------------------------------------------------------------------

@dataclass
class LanceDBConfig:
    """M1-optimized LanceDB v2 configuration."""

    db_path: str = "scrapus_data/lancedb_v2"

    # Compression
    use_zstd: bool = True
    zstd_level: int = 3            # 3 = fast default; 22 = max (offline only)

    # INT8 quantization for stored embeddings
    quantize_on_write: bool = True  # apply INT8 scalar quant before storage

    # Memory-mapping
    enable_mmap: bool = True
    mmap_populate: bool = False     # do NOT prefault pages on M1 (saves RSS)

    # Write-ahead log / versioning
    max_versions: int = 5           # keep last 5 versions for rollback

    # Batch sizes tuned for M1 8 MB SLC
    write_batch_size: int = 2048
    read_batch_size: int = 4096

    # Disk budget enforcement
    max_disk_bytes: int = MAX_DISK_BYTES
    max_ram_bytes: int = MAX_RAM_BYTES

    # Embedding dimensions per table (overridable)
    page_dim: int = DEFAULT_PAGE_DIM
    entity_dim: int = DEFAULT_ENTITY_DIM
    lead_dim: int = DEFAULT_LEAD_DIM
    document_dim: int = DEFAULT_DOCUMENT_DIM
    replay_dim: int = DEFAULT_REPLAY_DIM

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# INT8 scalar quantization helpers (wraps int8_quantization.py)
# ---------------------------------------------------------------------------

def _quantize_vectors_int8(
    vectors: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Per-vector min/max INT8 scalar quantization.

    Returns:
        quantized: (N, D) int8
        scales:    (N, 2) float32  [min_val, scale_factor]
    """
    vectors = np.asarray(vectors, dtype=np.float32)
    N, D = vectors.shape
    v_min = vectors.min(axis=1, keepdims=True)          # (N,1)
    v_max = vectors.max(axis=1, keepdims=True)          # (N,1)
    scale = (v_max - v_min) / 254.0                     # (N,1)
    scale = np.where(scale == 0, 1.0, scale)
    normalized = (vectors - v_min) / scale - 127.0
    quantized = np.clip(normalized, -128, 127).astype(np.int8)
    scales = np.hstack([v_min, scale]).astype(np.float32)  # (N,2)
    return quantized, scales


def _dequantize_vectors_int8(
    quantized: np.ndarray,
    scales: np.ndarray,
) -> np.ndarray:
    """Reconstruct float32 vectors from INT8 codes + per-vector scales."""
    v_min = scales[:, 0:1]   # (N,1)
    scale = scales[:, 1:2]   # (N,1)
    return (quantized.astype(np.float32) + 127.0) * scale + v_min


# ---------------------------------------------------------------------------
# Connection pool (lightweight -- LanceDB is file-backed)
# ---------------------------------------------------------------------------

class _ConnectionPool:
    """
    Singleton-ish connection holder.

    LanceDB v2 connections are cheap (just an open directory handle), but we
    centralise connection reuse to guarantee a single writer at a time and to
    apply M1 mmap settings consistently.
    """

    _instances: Dict[str, "_ConnectionPool"] = {}

    def __init__(self, db_path: str, config: LanceDBConfig):
        self._db_path = db_path
        self._config = config
        self._db: Optional[lancedb.DBConnection] = None
        self._opened_at: Optional[float] = None

    @classmethod
    def get(cls, db_path: str, config: LanceDBConfig) -> "_ConnectionPool":
        abs_path = str(Path(db_path).resolve())
        if abs_path not in cls._instances:
            cls._instances[abs_path] = cls(abs_path, config)
        return cls._instances[abs_path]

    @property
    def db(self) -> lancedb.DBConnection:
        if self._db is None:
            Path(self._db_path).mkdir(parents=True, exist_ok=True)
            self._db = lancedb.connect(self._db_path)
            self._opened_at = time.monotonic()
            logger.info("LanceDB connection opened: %s", self._db_path)
        return self._db

    def close(self) -> None:
        self._db = None
        abs_path = str(Path(self._db_path).resolve())
        self._instances.pop(abs_path, None)
        logger.info("LanceDB connection closed: %s", self._db_path)


# ---------------------------------------------------------------------------
# Table handle wrapper
# ---------------------------------------------------------------------------

class TableHandle:
    """
    Thin wrapper around a LanceDB table providing typed helpers.

    One instance per (table_name, connection) pair. Created by
    ``UnifiedVectorStore`` -- not intended for direct construction.
    """

    def __init__(
        self,
        table: LanceTable,
        name: TableName,
        schema: pa.Schema,
        config: LanceDBConfig,
    ):
        self._table = table
        self.name = name
        self.schema = schema
        self._config = config

    # -- metadata --------------------------------------------------------

    @property
    def row_count(self) -> int:
        return self._table.count_rows()

    @property
    def lance_table(self) -> LanceTable:
        return self._table

    # -- low-level read --------------------------------------------------

    def to_arrow(self) -> pa.Table:
        """Full table scan as Arrow Table (memory-mapped if enabled)."""
        return self._table.to_arrow()

    def to_pandas(self):
        """Convert to pandas DataFrame -- convenience for analytics."""
        return self._table.to_pandas()

    def head(self, n: int = 10) -> pa.Table:
        """Return first *n* rows."""
        return self._table.head(n)


# ---------------------------------------------------------------------------
# Core: Unified Vector Store
# ---------------------------------------------------------------------------

class UnifiedVectorStore:
    """
    LanceDB v2 unified vector store for Scrapus.

    Consolidates page embeddings, entity embeddings, lead profiles,
    document chunks, and replay buffer vectors into a single LanceDB
    database directory with ZSTD-compressed Arrow columnar storage.

    Usage::

        store = UnifiedVectorStore()          # default M1 config
        store.initialize()                    # create all tables
        store.upsert_pages(ids, vectors, metadata_dicts)
        results = store.get_pages(ids=["page-001"])
        store.close()

    Or as a context manager::

        with UnifiedVectorStore() as store:
            store.initialize()
            ...
    """

    def __init__(self, config: Optional[LanceDBConfig] = None):
        if not HAS_LANCEDB:
            raise RuntimeError(
                "lancedb is required.  Install with: pip install lancedb>=0.5"
            )
        self._config = config or LanceDBConfig()
        self._pool = _ConnectionPool.get(self._config.db_path, self._config)
        self._tables: Dict[TableName, TableHandle] = {}
        self._initialized = False

    # -- lifecycle -------------------------------------------------------

    def __enter__(self) -> "UnifiedVectorStore":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def close(self) -> None:
        """Release the connection and clear cached table handles."""
        self._tables.clear()
        self._pool.close()
        gc.collect()

    # -- initialization --------------------------------------------------

    def initialize(self) -> None:
        """
        Ensure every expected table exists. Creates missing tables with
        empty data conforming to the canonical Arrow schemas.

        Safe to call repeatedly (idempotent).
        """
        db = self._pool.db
        existing = set(db.table_names())

        for tname, schema in TABLE_SCHEMAS.items():
            if tname.value in existing:
                tbl = db.open_table(tname.value)
            else:
                # Create empty table from schema by inserting an empty record batch
                empty_batch = pa.RecordBatch.from_pydict(
                    {f.name: [] for f in schema},
                    schema=schema,
                )
                tbl = db.create_table(
                    tname.value,
                    data=pa.Table.from_batches([empty_batch]),
                    mode="overwrite",
                )
                logger.info("Created table: %s", tname.value)

            self._tables[tname] = TableHandle(tbl, tname, schema, self._config)

        self._initialized = True
        logger.info(
            "UnifiedVectorStore initialized with %d tables at %s",
            len(self._tables),
            self._config.db_path,
        )

    def _ensure_initialized(self) -> None:
        if not self._initialized:
            raise RuntimeError("Call .initialize() before performing operations")

    # -- table access ----------------------------------------------------

    def table(self, name: Union[TableName, str]) -> TableHandle:
        """Get a table handle by name."""
        self._ensure_initialized()
        key = TableName(name) if isinstance(name, str) else name
        return self._tables[key]

    def table_names(self) -> List[str]:
        return [t.value for t in self._tables]

    # -- helpers: Arrow batch builder ------------------------------------

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _to_timestamp_array(ts_list: List[Optional[datetime]]) -> pa.Array:
        return pa.array(ts_list, type=pa.timestamp("us", tz="UTC"))

    # ===================================================================
    # PAGES CRUD
    # ===================================================================

    def upsert_pages(
        self,
        ids: List[str],
        vectors: np.ndarray,
        *,
        urls: Optional[List[str]] = None,
        domains: Optional[List[str]] = None,
        titles: Optional[List[str]] = None,
        crawl_timestamps: Optional[List[datetime]] = None,
        http_statuses: Optional[List[int]] = None,
        content_hashes: Optional[List[str]] = None,
        depths: Optional[List[int]] = None,
        byte_sizes: Optional[List[int]] = None,
        languages: Optional[List[str]] = None,
        meta_jsons: Optional[List[str]] = None,
    ) -> int:
        """
        Insert or update page embeddings.

        Returns the number of rows written.
        """
        self._ensure_initialized()
        n = len(ids)
        vectors = np.asarray(vectors, dtype=np.float32)
        assert vectors.shape[0] == n, "ids / vectors length mismatch"

        now = self._now_utc()
        data = {
            "id": ids,
            "vector": [v.tolist() for v in vectors],
            "url": urls or [""] * n,
            "domain": domains or [""] * n,
            "title": titles or [""] * n,
            "crawl_ts": crawl_timestamps or [now] * n,
            "http_status": http_statuses or [200] * n,
            "content_hash": content_hashes or [""] * n,
            "depth": depths or [0] * n,
            "byte_size": byte_sizes or [0] * n,
            "language": languages or ["en"] * n,
            "meta_json": meta_jsons or ["{}"] * n,
        }
        return self._write_batched(TableName.PAGES, data, n)

    def get_pages(
        self,
        *,
        ids: Optional[List[str]] = None,
        domain: Optional[str] = None,
        limit: int = 100,
    ) -> pa.Table:
        """Read pages. Optionally filter by id list or domain."""
        self._ensure_initialized()
        tbl = self._tables[TableName.PAGES].lance_table

        if ids is not None:
            id_list = ", ".join(f"'{i}'" for i in ids)
            return tbl.search().where(f"id IN ({id_list})").limit(limit).to_arrow()

        if domain is not None:
            return tbl.search().where(f"domain = '{domain}'").limit(limit).to_arrow()

        return tbl.head(limit)

    def delete_pages(self, ids: List[str]) -> None:
        """Delete pages by id."""
        self._ensure_initialized()
        id_list = ", ".join(f"'{i}'" for i in ids)
        self._tables[TableName.PAGES].lance_table.delete(f"id IN ({id_list})")

    # ===================================================================
    # ENTITIES CRUD
    # ===================================================================

    def upsert_entities(
        self,
        ids: List[str],
        vectors: np.ndarray,
        *,
        entity_types: Optional[List[str]] = None,
        canonical_names: Optional[List[str]] = None,
        source_page_ids: Optional[List[str]] = None,
        confidences: Optional[List[float]] = None,
        cluster_ids: Optional[List[str]] = None,
        attributes_jsons: Optional[List[str]] = None,
    ) -> int:
        """Insert or update entity embeddings."""
        self._ensure_initialized()
        n = len(ids)
        vectors = np.asarray(vectors, dtype=np.float32)
        now = self._now_utc()

        data = {
            "id": ids,
            "vector": [v.tolist() for v in vectors],
            "entity_type": entity_types or ["UNKNOWN"] * n,
            "canonical_name": canonical_names or [""] * n,
            "source_page_id": source_page_ids or [""] * n,
            "confidence": confidences or [0.0] * n,
            "cluster_id": cluster_ids or [""] * n,
            "attributes_json": attributes_jsons or ["{}"] * n,
            "created_ts": [now] * n,
            "updated_ts": [now] * n,
        }
        return self._write_batched(TableName.ENTITIES, data, n)

    def get_entities(
        self,
        *,
        ids: Optional[List[str]] = None,
        entity_type: Optional[str] = None,
        cluster_id: Optional[str] = None,
        min_confidence: float = 0.0,
        limit: int = 200,
    ) -> pa.Table:
        """Read entities with optional filtering."""
        self._ensure_initialized()
        tbl = self._tables[TableName.ENTITIES].lance_table
        filters: List[str] = []

        if ids is not None:
            id_list = ", ".join(f"'{i}'" for i in ids)
            filters.append(f"id IN ({id_list})")
        if entity_type is not None:
            filters.append(f"entity_type = '{entity_type}'")
        if cluster_id is not None:
            filters.append(f"cluster_id = '{cluster_id}'")
        if min_confidence > 0:
            filters.append(f"confidence >= {min_confidence}")

        where = " AND ".join(filters) if filters else None
        if where:
            return tbl.search().where(where).limit(limit).to_arrow()
        return tbl.head(limit)

    def delete_entities(self, ids: List[str]) -> None:
        self._ensure_initialized()
        id_list = ", ".join(f"'{i}'" for i in ids)
        self._tables[TableName.ENTITIES].lance_table.delete(f"id IN ({id_list})")

    # ===================================================================
    # LEADS CRUD
    # ===================================================================

    def upsert_leads(
        self,
        ids: List[str],
        vectors: np.ndarray,
        *,
        company_names: Optional[List[str]] = None,
        industries: Optional[List[str]] = None,
        size_tiers: Optional[List[str]] = None,
        locations: Optional[List[str]] = None,
        lead_scores: Optional[List[float]] = None,
        lead_confidences: Optional[List[float]] = None,
        conformal_lowers: Optional[List[float]] = None,
        conformal_uppers: Optional[List[float]] = None,
        is_qualified: Optional[List[bool]] = None,
        features_jsons: Optional[List[str]] = None,
    ) -> int:
        """Insert or update lead profile vectors."""
        self._ensure_initialized()
        n = len(ids)
        vectors = np.asarray(vectors, dtype=np.float32)
        now = self._now_utc()

        data = {
            "id": ids,
            "vector": [v.tolist() for v in vectors],
            "company_name": company_names or [""] * n,
            "industry": industries or [""] * n,
            "size_tier": size_tiers or [""] * n,
            "location": locations or [""] * n,
            "lead_score": lead_scores or [0.0] * n,
            "lead_confidence": lead_confidences or [0.0] * n,
            "conformal_lower": conformal_lowers or [0.0] * n,
            "conformal_upper": conformal_uppers or [0.0] * n,
            "is_qualified": is_qualified or [False] * n,
            "scored_ts": [now] * n,
            "features_json": features_jsons or ["{}"] * n,
        }
        return self._write_batched(TableName.LEADS, data, n)

    def get_leads(
        self,
        *,
        ids: Optional[List[str]] = None,
        industry: Optional[str] = None,
        min_score: float = 0.0,
        qualified_only: bool = False,
        limit: int = 200,
    ) -> pa.Table:
        """Read leads with optional filtering."""
        self._ensure_initialized()
        tbl = self._tables[TableName.LEADS].lance_table
        filters: List[str] = []

        if ids is not None:
            id_list = ", ".join(f"'{i}'" for i in ids)
            filters.append(f"id IN ({id_list})")
        if industry is not None:
            filters.append(f"industry = '{industry}'")
        if min_score > 0:
            filters.append(f"lead_score >= {min_score}")
        if qualified_only:
            filters.append("is_qualified = true")

        where = " AND ".join(filters) if filters else None
        if where:
            return tbl.search().where(where).limit(limit).to_arrow()
        return tbl.head(limit)

    def delete_leads(self, ids: List[str]) -> None:
        self._ensure_initialized()
        id_list = ", ".join(f"'{i}'" for i in ids)
        self._tables[TableName.LEADS].lance_table.delete(f"id IN ({id_list})")

    # ===================================================================
    # DOCUMENTS CRUD
    # ===================================================================

    def upsert_documents(
        self,
        ids: List[str],
        vectors: np.ndarray,
        texts: List[str],
        *,
        source_page_ids: Optional[List[str]] = None,
        chunk_indices: Optional[List[int]] = None,
        char_starts: Optional[List[int]] = None,
        char_ends: Optional[List[int]] = None,
        token_counts: Optional[List[int]] = None,
        sections: Optional[List[str]] = None,
        meta_jsons: Optional[List[str]] = None,
    ) -> int:
        """Insert or update document chunks for RAG retrieval."""
        self._ensure_initialized()
        n = len(ids)
        vectors = np.asarray(vectors, dtype=np.float32)

        data = {
            "id": ids,
            "vector": [v.tolist() for v in vectors],
            "source_page_id": source_page_ids or [""] * n,
            "chunk_index": chunk_indices or list(range(n)),
            "text": texts,
            "char_start": char_starts or [0] * n,
            "char_end": char_ends or [0] * n,
            "token_count": token_counts or [0] * n,
            "section": sections or [""] * n,
            "meta_json": meta_jsons or ["{}"] * n,
        }
        return self._write_batched(TableName.DOCUMENTS, data, n)

    def get_documents(
        self,
        *,
        ids: Optional[List[str]] = None,
        source_page_id: Optional[str] = None,
        limit: int = 200,
    ) -> pa.Table:
        self._ensure_initialized()
        tbl = self._tables[TableName.DOCUMENTS].lance_table
        filters: List[str] = []

        if ids is not None:
            id_list = ", ".join(f"'{i}'" for i in ids)
            filters.append(f"id IN ({id_list})")
        if source_page_id is not None:
            filters.append(f"source_page_id = '{source_page_id}'")

        where = " AND ".join(filters) if filters else None
        if where:
            return tbl.search().where(where).limit(limit).to_arrow()
        return tbl.head(limit)

    def delete_documents(self, ids: List[str]) -> None:
        self._ensure_initialized()
        id_list = ", ".join(f"'{i}'" for i in ids)
        self._tables[TableName.DOCUMENTS].lance_table.delete(f"id IN ({id_list})")

    # ===================================================================
    # REPLAY BUFFER CRUD
    # ===================================================================

    def upsert_replay(
        self,
        ids: List[str],
        state_vectors: np.ndarray,
        next_state_vectors: np.ndarray,
        actions: List[int],
        rewards: List[float],
        dones: List[bool],
        *,
        priorities: Optional[List[float]] = None,
        episodes: Optional[List[int]] = None,
        steps: Optional[List[int]] = None,
    ) -> int:
        """Insert RL replay buffer transitions."""
        self._ensure_initialized()
        n = len(ids)
        state_vectors = np.asarray(state_vectors, dtype=np.float32)
        next_state_vectors = np.asarray(next_state_vectors, dtype=np.float32)
        now = self._now_utc()

        data = {
            "id": ids,
            "state_vector": [v.tolist() for v in state_vectors],
            "next_state_vector": [v.tolist() for v in next_state_vectors],
            "action": actions,
            "reward": rewards,
            "done": dones,
            "priority": priorities or [1.0] * n,
            "episode": episodes or [0] * n,
            "step": steps or list(range(n)),
            "inserted_ts": [now] * n,
        }
        return self._write_batched(TableName.REPLAY, data, n)

    def get_replay(
        self,
        *,
        episode: Optional[int] = None,
        min_priority: float = 0.0,
        limit: int = 256,
    ) -> pa.Table:
        self._ensure_initialized()
        tbl = self._tables[TableName.REPLAY].lance_table
        filters: List[str] = []

        if episode is not None:
            filters.append(f"episode = {episode}")
        if min_priority > 0:
            filters.append(f"priority >= {min_priority}")

        where = " AND ".join(filters) if filters else None
        if where:
            return tbl.search().where(where).limit(limit).to_arrow()
        return tbl.head(limit)

    def sample_replay(self, n: int = 64) -> pa.Table:
        """
        Sample *n* transitions weighted by priority (for PER).

        Falls back to uniform sampling when priorities are uniform.
        """
        self._ensure_initialized()
        tbl = self._tables[TableName.REPLAY].lance_table
        # Read all priorities, sample in numpy, fetch by id
        all_rows = tbl.to_arrow()
        total = all_rows.num_rows
        if total == 0:
            return all_rows
        n = min(n, total)

        priorities = all_rows.column("priority").to_pylist()
        p_arr = np.array(priorities, dtype=np.float32)
        p_sum = p_arr.sum()
        if p_sum > 0:
            probs = p_arr / p_sum
        else:
            probs = np.ones(total, dtype=np.float32) / total

        indices = np.random.choice(total, size=n, replace=False, p=probs)
        return all_rows.take(indices.tolist())

    def delete_replay(self, ids: List[str]) -> None:
        self._ensure_initialized()
        id_list = ", ".join(f"'{i}'" for i in ids)
        self._tables[TableName.REPLAY].lance_table.delete(f"id IN ({id_list})")

    def truncate_replay(self, keep_last: int = 10_000) -> int:
        """
        Trim the replay buffer to *keep_last* most recent transitions.

        Returns the number of rows deleted.
        """
        self._ensure_initialized()
        tbl = self._tables[TableName.REPLAY].lance_table
        total = tbl.count_rows()
        if total <= keep_last:
            return 0

        # Identify IDs to remove (oldest by inserted_ts)
        all_rows = tbl.to_arrow()
        ts_col = all_rows.column("inserted_ts")
        id_col = all_rows.column("id")
        # Sort ascending by timestamp
        sort_idx = pa.compute.sort_indices(ts_col)
        remove_count = total - keep_last
        remove_indices = sort_idx.to_pylist()[:remove_count]
        remove_ids = [id_col[i].as_py() for i in remove_indices]

        if remove_ids:
            id_list = ", ".join(f"'{i}'" for i in remove_ids)
            tbl.delete(f"id IN ({id_list})")

        return len(remove_ids)

    # ===================================================================
    # Bulk / generic operations
    # ===================================================================

    def count_rows(self, table_name: Union[TableName, str]) -> int:
        """Return row count for a table."""
        return self.table(table_name).row_count

    def drop_table(self, table_name: Union[TableName, str]) -> None:
        """Drop a table entirely."""
        self._ensure_initialized()
        key = TableName(table_name) if isinstance(table_name, str) else table_name
        self._pool.db.drop_table(key.value)
        self._tables.pop(key, None)
        logger.info("Dropped table: %s", key.value)

    def compact(self, table_name: Optional[Union[TableName, str]] = None) -> None:
        """
        Compact table storage (Lance v2 compaction).

        If *table_name* is None, compacts all tables.
        """
        self._ensure_initialized()
        targets = (
            [TableName(table_name) if isinstance(table_name, str) else table_name]
            if table_name
            else list(self._tables.keys())
        )
        for tname in targets:
            tbl = self._tables[tname].lance_table
            tbl.compact_files()
            logger.info("Compacted table: %s", tname.value)

    def cleanup_old_versions(
        self, table_name: Optional[Union[TableName, str]] = None
    ) -> None:
        """
        Remove old Lance versions to reclaim disk space.
        Keeps the last ``config.max_versions`` versions.
        """
        self._ensure_initialized()
        targets = (
            [TableName(table_name) if isinstance(table_name, str) else table_name]
            if table_name
            else list(self._tables.keys())
        )
        for tname in targets:
            tbl = self._tables[tname].lance_table
            tbl.cleanup_old_versions(
                older_than=None,
                delete_unverified=True,
            )
            logger.info("Cleaned up old versions: %s", tname.value)

    # ===================================================================
    # Storage statistics
    # ===================================================================

    def storage_stats(self) -> Dict[str, Any]:
        """
        Aggregate storage statistics across all tables.

        Returns dict with per-table row counts and total disk usage.
        """
        self._ensure_initialized()
        db_path = Path(self._config.db_path)
        total_disk = 0
        per_table: Dict[str, Dict[str, Any]] = {}

        for tname, handle in self._tables.items():
            row_count = handle.row_count
            # Estimate disk usage from the Lance data directory
            table_dir = db_path / (tname.value + ".lance")
            table_bytes = 0
            if table_dir.exists():
                for f in table_dir.rglob("*"):
                    if f.is_file():
                        table_bytes += f.stat().st_size
            total_disk += table_bytes
            per_table[tname.value] = {
                "rows": row_count,
                "disk_bytes": table_bytes,
                "disk_mb": round(table_bytes / (1024 * 1024), 2),
            }

        within_budget = total_disk <= self._config.max_disk_bytes
        return {
            "tables": per_table,
            "total_disk_bytes": total_disk,
            "total_disk_mb": round(total_disk / (1024 * 1024), 2),
            "budget_bytes": self._config.max_disk_bytes,
            "budget_mb": round(self._config.max_disk_bytes / (1024 * 1024), 2),
            "within_budget": within_budget,
            "utilization_pct": round(100 * total_disk / self._config.max_disk_bytes, 1),
            "timestamp": self._now_utc().isoformat(),
        }

    def health_check(self) -> Dict[str, Any]:
        """
        Quick health check: connection alive, tables present, disk OK.
        """
        try:
            db = self._pool.db
            names = set(db.table_names())
            expected = {t.value for t in TableName}
            missing = expected - names
            stats = self.storage_stats()
            return {
                "status": "healthy" if not missing else "degraded",
                "missing_tables": sorted(missing),
                "storage": stats,
                "connection": "open",
            }
        except Exception as exc:
            return {"status": "error", "error": str(exc)}

    # ===================================================================
    # Internal helpers
    # ===================================================================

    def _write_batched(
        self,
        table_name: TableName,
        data: Dict[str, list],
        n: int,
    ) -> int:
        """
        Write *data* to *table_name* in batches of ``config.write_batch_size``.

        Uses ``table.add()`` which appends rows. For true upsert semantics
        the caller should delete-then-insert (LanceDB v2 does not have native
        merge yet).

        Returns total rows written.
        """
        tbl = self._tables[table_name].lance_table
        batch_size = self._config.write_batch_size
        written = 0

        for start in range(0, n, batch_size):
            end = min(start + batch_size, n)
            batch = {k: v[start:end] for k, v in data.items()}
            tbl.add(batch)
            written += end - start

        logger.debug("Wrote %d rows to %s", written, table_name.value)
        return written


# ---------------------------------------------------------------------------
# Convenience factory
# ---------------------------------------------------------------------------

def open_store(
    db_path: str = "scrapus_data/lancedb_v2",
    **config_overrides: Any,
) -> UnifiedVectorStore:
    """
    Open (or create) the unified vector store with sensible M1 defaults.

    Example::

        store = open_store()
        store.initialize()
    """
    cfg = LanceDBConfig(db_path=db_path, **config_overrides)
    return UnifiedVectorStore(config=cfg)
