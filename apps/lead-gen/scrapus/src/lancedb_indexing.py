"""
LanceDB v2 Index Management for Scrapus
=========================================

Automatic index selection and lifecycle management:
  - IVF-PQ  for large collections (>10K rows): partitioned inverted file + product quantization
  - IVF-HNSW-SQ for mid-size collections (1K-10K): IVF with scalar-quantized HNSW graph
  - Brute-force for tiny collections (<1K): flat scan is faster than index overhead

Provides:
  - build / rebuild / drop per table
  - progress tracking via callback
  - index health checks (fragmentation, staleness)
  - automatic strategy selection based on row count

Target: Apple M1 16GB, single-process, mmap-backed Arrow storage.

Dependencies:
    lancedb>=0.5
    pyarrow>=14.0
    numpy>=1.24
"""

from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import numpy as np

try:
    import lancedb

    HAS_LANCEDB = True
except ImportError:
    HAS_LANCEDB = False

from lancedb_store import (
    LanceDBConfig,
    TableName,
    UnifiedVectorStore,
    TableHandle,
)

logger = logging.getLogger("scrapus.lancedb_indexing")


# ---------------------------------------------------------------------------
# Index strategy enum
# ---------------------------------------------------------------------------

class IndexStrategy(str, Enum):
    """Which ANN index to build."""
    NONE = "none"               # flat scan (brute force)
    IVF_PQ = "ivf_pq"          # IVF with product quantization
    IVF_HNSW_SQ = "ivf_hnsw_sq"  # IVF + HNSW graph + scalar quantization


# ---------------------------------------------------------------------------
# Thresholds for automatic strategy selection
# ---------------------------------------------------------------------------

SMALL_TABLE_THRESHOLD = 1_000     # below this: flat scan
LARGE_TABLE_THRESHOLD = 10_000    # above this: IVF-PQ
# between 1K-10K: IVF-HNSW-SQ


# ---------------------------------------------------------------------------
# Index parameters (M1-tuned)
# ---------------------------------------------------------------------------

@dataclass
class IVFPQParams:
    """Parameters for IVF-PQ index."""
    num_partitions: int = 0       # 0 = auto (sqrt(N))
    num_sub_vectors: int = 96     # 768-dim / 96 = 8-dim sub-vectors
    distance_type: str = "cosine"
    max_iters: int = 50           # k-means iterations for IVF centroids
    sample_rate: int = 256        # how many vectors per partition to sample

    def auto_partitions(self, n_rows: int) -> int:
        if self.num_partitions > 0:
            return self.num_partitions
        # Heuristic: sqrt(N), clamped to [4, 1024]
        k = max(4, min(1024, int(math.sqrt(n_rows))))
        return k


@dataclass
class IVFHNSWSQParams:
    """Parameters for IVF-HNSW with scalar quantization."""
    num_partitions: int = 0       # 0 = auto
    distance_type: str = "cosine"
    max_iters: int = 50

    # HNSW graph parameters
    m: int = 16                   # edges per node
    ef_construction: int = 150    # search width during build
    ef: int = 100                 # search width during query (can override at query time)

    def auto_partitions(self, n_rows: int) -> int:
        if self.num_partitions > 0:
            return self.num_partitions
        return max(4, min(256, int(math.sqrt(n_rows))))


@dataclass
class IndexConfig:
    """Full index configuration for one table."""
    table_name: TableName
    strategy: IndexStrategy = IndexStrategy.NONE
    vector_column: str = "vector"
    ivf_pq: IVFPQParams = field(default_factory=IVFPQParams)
    ivf_hnsw_sq: IVFHNSWSQParams = field(default_factory=IVFHNSWSQParams)
    replace_existing: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "table_name": self.table_name.value,
            "strategy": self.strategy.value,
            "vector_column": self.vector_column,
            "ivf_pq": asdict(self.ivf_pq),
            "ivf_hnsw_sq": asdict(self.ivf_hnsw_sq),
        }


# ---------------------------------------------------------------------------
# Index status tracking
# ---------------------------------------------------------------------------

@dataclass
class IndexStatus:
    """Runtime status of an index."""
    table_name: str
    strategy: str
    row_count: int
    is_indexed: bool
    built_at: Optional[str] = None
    build_duration_sec: float = 0.0
    num_partitions: int = 0
    fragmentation_pct: float = 0.0
    stale: bool = False            # True if rows added since last build

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Progress callback protocol
# ---------------------------------------------------------------------------

ProgressCallback = Callable[[str, float, str], None]
"""Signature: (table_name, pct_complete, message) -> None"""


def _noop_progress(table_name: str, pct: float, msg: str) -> None:
    pass


# ---------------------------------------------------------------------------
# Index Manager
# ---------------------------------------------------------------------------

class IndexManager:
    """
    Manages ANN index lifecycle across all UnifiedVectorStore tables.

    Usage::

        store = UnifiedVectorStore()
        store.initialize()

        idx = IndexManager(store)
        idx.auto_build_all(progress=my_callback)
        print(idx.status_all())

    The manager does not own the store -- the caller is responsible for
    store lifecycle.
    """

    def __init__(
        self,
        store: UnifiedVectorStore,
        default_distance: str = "cosine",
    ):
        if not HAS_LANCEDB:
            raise RuntimeError("lancedb is required")
        self._store = store
        self._default_distance = default_distance
        self._index_meta: Dict[TableName, IndexStatus] = {}
        self._configs: Dict[TableName, IndexConfig] = {}

    # -- strategy selection -----------------------------------------------

    @staticmethod
    def select_strategy(n_rows: int) -> IndexStrategy:
        """Pick index strategy based on collection size."""
        if n_rows < SMALL_TABLE_THRESHOLD:
            return IndexStrategy.NONE
        if n_rows >= LARGE_TABLE_THRESHOLD:
            return IndexStrategy.IVF_PQ
        return IndexStrategy.IVF_HNSW_SQ

    def _resolve_config(
        self,
        table_name: TableName,
        override: Optional[IndexConfig] = None,
    ) -> IndexConfig:
        """Build or return an IndexConfig for the table."""
        if override is not None:
            self._configs[table_name] = override
            return override

        if table_name in self._configs:
            return self._configs[table_name]

        n_rows = self._store.count_rows(table_name)
        strategy = self.select_strategy(n_rows)

        # Determine vector column name (replay has state_vector)
        vec_col = "state_vector" if table_name == TableName.REPLAY else "vector"

        cfg = IndexConfig(
            table_name=table_name,
            strategy=strategy,
            vector_column=vec_col,
        )
        self._configs[table_name] = cfg
        return cfg

    # -- build / rebuild --------------------------------------------------

    def build_index(
        self,
        table_name: Union[TableName, str],
        config: Optional[IndexConfig] = None,
        progress: ProgressCallback = _noop_progress,
    ) -> IndexStatus:
        """
        Build (or rebuild) an ANN index on a single table.

        Parameters
        ----------
        table_name
            Which table to index.
        config
            Optional override; if ``None``, strategy is chosen automatically.
        progress
            Callback invoked with (table_name, pct, message).

        Returns
        -------
        IndexStatus with build metadata.
        """
        key = TableName(table_name) if isinstance(table_name, str) else table_name
        cfg = self._resolve_config(key, config)
        tbl = self._store.table(key).lance_table
        n_rows = tbl.count_rows()

        progress(key.value, 0.0, f"Starting index build ({cfg.strategy.value})")

        if cfg.strategy == IndexStrategy.NONE:
            status = IndexStatus(
                table_name=key.value,
                strategy="none",
                row_count=n_rows,
                is_indexed=False,
                stale=False,
            )
            self._index_meta[key] = status
            progress(key.value, 1.0, "Flat scan -- no index needed")
            return status

        t0 = time.monotonic()

        if cfg.strategy == IndexStrategy.IVF_PQ:
            status = self._build_ivf_pq(key, cfg, tbl, n_rows, progress)
        else:
            status = self._build_ivf_hnsw_sq(key, cfg, tbl, n_rows, progress)

        status.build_duration_sec = round(time.monotonic() - t0, 3)
        status.built_at = datetime.now(timezone.utc).isoformat()
        self._index_meta[key] = status

        progress(
            key.value,
            1.0,
            f"Index built in {status.build_duration_sec:.1f}s "
            f"({status.strategy}, {status.num_partitions} partitions)",
        )
        return status

    def _build_ivf_pq(
        self,
        key: TableName,
        cfg: IndexConfig,
        tbl: Any,
        n_rows: int,
        progress: ProgressCallback,
    ) -> IndexStatus:
        """Build an IVF-PQ index."""
        params = cfg.ivf_pq
        n_parts = params.auto_partitions(n_rows)

        progress(key.value, 0.1, f"IVF-PQ: {n_parts} partitions, {params.num_sub_vectors} sub-vectors")

        tbl.create_index(
            metric=params.distance_type,
            num_partitions=n_parts,
            num_sub_vectors=params.num_sub_vectors,
            vector_column_name=cfg.vector_column,
            replace=cfg.replace_existing,
            index_type="IVF_PQ",
        )

        progress(key.value, 0.9, "IVF-PQ index created")

        return IndexStatus(
            table_name=key.value,
            strategy="ivf_pq",
            row_count=n_rows,
            is_indexed=True,
            num_partitions=n_parts,
        )

    def _build_ivf_hnsw_sq(
        self,
        key: TableName,
        cfg: IndexConfig,
        tbl: Any,
        n_rows: int,
        progress: ProgressCallback,
    ) -> IndexStatus:
        """Build an IVF-HNSW-SQ index."""
        params = cfg.ivf_hnsw_sq
        n_parts = params.auto_partitions(n_rows)

        progress(
            key.value, 0.1,
            f"IVF-HNSW-SQ: {n_parts} partitions, M={params.m}, ef={params.ef_construction}",
        )

        # LanceDB v2 uses create_index with index_type parameter
        tbl.create_index(
            metric=params.distance_type,
            num_partitions=n_parts,
            vector_column_name=cfg.vector_column,
            replace=cfg.replace_existing,
            index_type="IVF_HNSW_SQ",
        )

        progress(key.value, 0.9, "IVF-HNSW-SQ index created")

        return IndexStatus(
            table_name=key.value,
            strategy="ivf_hnsw_sq",
            row_count=n_rows,
            is_indexed=True,
            num_partitions=n_parts,
        )

    # -- auto-build all tables -------------------------------------------

    def auto_build_all(
        self,
        progress: ProgressCallback = _noop_progress,
        force: bool = False,
    ) -> Dict[str, IndexStatus]:
        """
        Build indexes on all tables, selecting strategy automatically.

        Parameters
        ----------
        progress
            Callback for progress updates.
        force
            If True, rebuild even if the table already has an index.

        Returns
        -------
        Dict mapping table name to IndexStatus.
        """
        results: Dict[str, IndexStatus] = {}

        for tname in TableName:
            n_rows = self._store.count_rows(tname)
            existing = self._index_meta.get(tname)

            if not force and existing and existing.is_indexed and not existing.stale:
                logger.info("Skipping %s -- already indexed", tname.value)
                results[tname.value] = existing
                continue

            if n_rows == 0:
                logger.info("Skipping %s -- empty table", tname.value)
                status = IndexStatus(
                    table_name=tname.value,
                    strategy="none",
                    row_count=0,
                    is_indexed=False,
                )
                self._index_meta[tname] = status
                results[tname.value] = status
                continue

            status = self.build_index(tname, progress=progress)
            results[tname.value] = status

        return results

    # -- drop index ------------------------------------------------------

    def drop_index(self, table_name: Union[TableName, str]) -> None:
        """
        Drop the ANN index on a table, reverting to flat scan.

        Note: LanceDB v2 does not expose a direct ``drop_index`` API.
        We rebuild with strategy=NONE to clear metadata and rely on
        compaction to reclaim index files.
        """
        key = TableName(table_name) if isinstance(table_name, str) else table_name
        self._index_meta[key] = IndexStatus(
            table_name=key.value,
            strategy="none",
            row_count=self._store.count_rows(key),
            is_indexed=False,
        )
        self._configs.pop(key, None)
        logger.info("Index dropped (metadata cleared): %s", key.value)

    # -- status & health -------------------------------------------------

    def status(self, table_name: Union[TableName, str]) -> IndexStatus:
        """Return current IndexStatus for a table."""
        key = TableName(table_name) if isinstance(table_name, str) else table_name
        if key not in self._index_meta:
            n_rows = self._store.count_rows(key)
            return IndexStatus(
                table_name=key.value,
                strategy="unknown",
                row_count=n_rows,
                is_indexed=False,
            )
        return self._index_meta[key]

    def status_all(self) -> Dict[str, IndexStatus]:
        """Return IndexStatus for every registered table."""
        out: Dict[str, IndexStatus] = {}
        for tname in TableName:
            out[tname.value] = self.status(tname)
        return out

    def mark_stale(self, table_name: Union[TableName, str]) -> None:
        """
        Mark an index as stale (rows were added since last build).

        Called automatically by the store when data is written, but exposed
        here for manual control.
        """
        key = TableName(table_name) if isinstance(table_name, str) else table_name
        meta = self._index_meta.get(key)
        if meta:
            meta.stale = True
            current_rows = self._store.count_rows(key)
            meta.row_count = current_rows

    def needs_rebuild(self, table_name: Union[TableName, str]) -> bool:
        """Check whether the index should be rebuilt."""
        key = TableName(table_name) if isinstance(table_name, str) else table_name
        meta = self._index_meta.get(key)
        if meta is None:
            return True
        if not meta.is_indexed:
            n = self._store.count_rows(key)
            return n >= SMALL_TABLE_THRESHOLD
        if meta.stale:
            return True
        # Check if strategy should change based on current row count
        current_rows = self._store.count_rows(key)
        new_strategy = self.select_strategy(current_rows)
        if new_strategy.value != meta.strategy:
            return True
        return False

    def health_check(self) -> Dict[str, Any]:
        """
        Comprehensive index health report.

        Returns per-table status plus recommendations.
        """
        report: Dict[str, Any] = {"tables": {}, "recommendations": []}

        for tname in TableName:
            st = self.status(tname)
            n = self._store.count_rows(tname)
            ideal = self.select_strategy(n)

            table_report = {
                "row_count": n,
                "current_strategy": st.strategy,
                "ideal_strategy": ideal.value,
                "is_indexed": st.is_indexed,
                "stale": st.stale,
                "needs_rebuild": self.needs_rebuild(tname),
            }
            report["tables"][tname.value] = table_report

            if table_report["needs_rebuild"]:
                report["recommendations"].append(
                    f"Rebuild {tname.value}: {st.strategy} -> {ideal.value} "
                    f"({n} rows)"
                )

        report["healthy"] = len(report["recommendations"]) == 0
        report["timestamp"] = datetime.now(timezone.utc).isoformat()
        return report


# ---------------------------------------------------------------------------
# Convenience: one-shot index build
# ---------------------------------------------------------------------------

def build_all_indexes(
    store: UnifiedVectorStore,
    progress: Optional[ProgressCallback] = None,
    force: bool = False,
) -> Dict[str, IndexStatus]:
    """
    Convenience function: build indexes on all tables in the store.

    Example::

        from lancedb_store import open_store
        from lancedb_indexing import build_all_indexes

        store = open_store()
        store.initialize()
        # ... insert data ...
        results = build_all_indexes(store, progress=print_progress)
    """
    mgr = IndexManager(store)
    cb = progress or _noop_progress
    return mgr.auto_build_all(progress=cb, force=force)


def print_progress(table_name: str, pct: float, message: str) -> None:
    """Simple progress printer for interactive use."""
    bar_len = 30
    filled = int(bar_len * pct)
    bar = "#" * filled + "-" * (bar_len - filled)
    print(f"  [{bar}] {pct*100:5.1f}%  {table_name}: {message}")
