"""
LanceDB v2 Search API for Scrapus
===================================

Unified search layer across all five vector tables:
  - Vector similarity search (cosine, L2, dot)
  - Hybrid search (vector + metadata filters)
  - MMR diversity search (Maximal Marginal Relevance)
  - Batch search (multiple queries in one call)
  - Multi-table joins via DuckDB integration
  - Score normalization and re-ranking

All search operations are M1-optimized:
  - Batched numpy ops stay within 8 MB SLC
  - Arrow zero-copy reads from memory-mapped tables
  - DuckDB scans LanceDB Arrow tables directly (no serialization)

Dependencies:
    lancedb>=0.5
    pyarrow>=14.0
    numpy>=1.24
    duckdb>=0.10  (optional, for cross-table joins)
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
import pyarrow as pa

try:
    import lancedb

    HAS_LANCEDB = True
except ImportError:
    HAS_LANCEDB = False

try:
    import duckdb

    HAS_DUCKDB = True
except ImportError:
    HAS_DUCKDB = False

from lancedb_store import (
    LanceDBConfig,
    TableName,
    UnifiedVectorStore,
)

logger = logging.getLogger("scrapus.lancedb_search")


# ---------------------------------------------------------------------------
# Search result container
# ---------------------------------------------------------------------------

@dataclass
class SearchResult:
    """Single search hit."""
    id: str
    score: float                      # similarity / relevance score [0..1]
    distance: float                   # raw distance from ANN
    table: str                        # source table name
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "score": self.score,
            "distance": self.distance,
            "table": self.table,
            **self.data,
        }


@dataclass
class SearchResponse:
    """Aggregated response for a search operation."""
    results: List[SearchResult]
    query_time_ms: float
    total_scanned: int = 0
    index_used: str = "unknown"
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def ids(self) -> List[str]:
        return [r.id for r in self.results]

    @property
    def scores(self) -> List[float]:
        return [r.score for r in self.results]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "results": [r.to_dict() for r in self.results],
            "query_time_ms": self.query_time_ms,
            "total_scanned": self.total_scanned,
            "index_used": self.index_used,
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# Score normalization
# ---------------------------------------------------------------------------

def normalize_scores(
    distances: np.ndarray,
    metric: str = "cosine",
) -> np.ndarray:
    """
    Convert raw distances to [0, 1] similarity scores.

    For cosine distance: score = 1 - distance  (since LanceDB cosine
    distance is in [0, 2], but for normalized vectors it is [0, 1]).

    For L2: score = 1 / (1 + distance)
    For dot: score = (distance - min) / (max - min)  (already a similarity)
    """
    if len(distances) == 0:
        return distances

    if metric == "cosine":
        scores = 1.0 - distances
    elif metric in ("l2", "euclidean"):
        scores = 1.0 / (1.0 + distances)
    elif metric == "dot":
        d_min = distances.min()
        d_max = distances.max()
        rng = d_max - d_min
        if rng > 0:
            scores = (distances - d_min) / rng
        else:
            scores = np.ones_like(distances)
    else:
        scores = distances  # pass-through

    return np.clip(scores, 0.0, 1.0)


# ---------------------------------------------------------------------------
# MMR (Maximal Marginal Relevance)
# ---------------------------------------------------------------------------

def _mmr_rerank(
    query_vector: np.ndarray,
    candidate_vectors: np.ndarray,
    candidate_scores: np.ndarray,
    k: int,
    lambda_param: float = 0.7,
) -> List[int]:
    """
    Re-rank candidates using Maximal Marginal Relevance.

    Args:
        query_vector:      (D,) query embedding
        candidate_vectors: (N, D) candidate embeddings
        candidate_scores:  (N,) relevance scores in [0, 1]
        k:                 number of results to return
        lambda_param:      trade-off relevance vs diversity (1.0 = pure relevance)

    Returns:
        List of *k* indices into candidate arrays, ordered by MMR score.
    """
    if len(candidate_scores) == 0:
        return []

    k = min(k, len(candidate_scores))
    query_vector = query_vector.astype(np.float32).reshape(1, -1)
    candidate_vectors = candidate_vectors.astype(np.float32)

    # Pre-compute norms for cosine similarity
    q_norm = np.linalg.norm(query_vector, axis=1, keepdims=True) + 1e-8
    c_norms = np.linalg.norm(candidate_vectors, axis=1, keepdims=True) + 1e-8
    q_unit = query_vector / q_norm
    c_units = candidate_vectors / c_norms

    # Relevance: cosine(query, candidate_i)
    relevance = (c_units @ q_unit.T).squeeze()  # (N,)

    selected: List[int] = []
    remaining = set(range(len(candidate_scores)))

    for _ in range(k):
        if not remaining:
            break

        best_idx = -1
        best_mmr = -np.inf

        for idx in remaining:
            rel = lambda_param * relevance[idx]

            # Max similarity to already selected items
            if selected:
                sel_vecs = c_units[selected]  # (S, D)
                sims = (sel_vecs @ c_units[idx]).max()
            else:
                sims = 0.0

            mmr = rel - (1.0 - lambda_param) * sims

            if mmr > best_mmr:
                best_mmr = mmr
                best_idx = idx

        if best_idx >= 0:
            selected.append(best_idx)
            remaining.discard(best_idx)

    return selected


# ---------------------------------------------------------------------------
# Search Engine
# ---------------------------------------------------------------------------

class SearchEngine:
    """
    High-level search API over the UnifiedVectorStore.

    Wraps LanceDB's native search with:
      - Automatic score normalization
      - MMR diversity re-ranking
      - Metadata filtering (WHERE clauses)
      - Batch multi-query support
      - Cross-table DuckDB joins

    Usage::

        store = UnifiedVectorStore()
        store.initialize()

        engine = SearchEngine(store)

        # Simple vector search
        response = engine.search_pages(query_vector, k=10)

        # Hybrid: vector + filter
        response = engine.search_entities(
            query_vector,
            k=20,
            where="entity_type = 'COMPANY' AND confidence >= 0.8",
        )

        # MMR diversity search
        response = engine.search_documents(
            query_vector, k=10, mmr=True, lambda_param=0.7,
        )
    """

    def __init__(
        self,
        store: UnifiedVectorStore,
        default_metric: str = "cosine",
    ):
        self._store = store
        self._metric = default_metric

    # ===================================================================
    # Generic vector search (any table)
    # ===================================================================

    def search(
        self,
        table_name: Union[TableName, str],
        query_vector: np.ndarray,
        k: int = 10,
        *,
        vector_column: Optional[str] = None,
        where: Optional[str] = None,
        select: Optional[List[str]] = None,
        metric: Optional[str] = None,
        nprobes: int = 20,
        refine_factor: Optional[int] = None,
        mmr: bool = False,
        lambda_param: float = 0.7,
        mmr_fetch_k: int = 0,
    ) -> SearchResponse:
        """
        Vector similarity search on a single table.

        Parameters
        ----------
        table_name
            Target table.
        query_vector
            (D,) query embedding.
        k
            Number of results.
        vector_column
            Column containing vectors (default: "vector" or "state_vector" for replay).
        where
            SQL-like filter expression applied before ANN search.
        select
            Columns to return (default: all).
        metric
            Distance metric override.
        nprobes
            Number of IVF partitions to probe (higher = more accurate, slower).
        refine_factor
            If set, over-fetches by this factor and re-ranks with exact distances.
        mmr
            If True, apply MMR diversity re-ranking on top-K results.
        lambda_param
            MMR relevance-diversity trade-off.
        mmr_fetch_k
            How many candidates to fetch before MMR filtering. 0 = 3*k.

        Returns
        -------
        SearchResponse
        """
        t0 = time.monotonic()
        tname = TableName(table_name) if isinstance(table_name, str) else table_name
        handle = self._store.table(tname)
        tbl = handle.lance_table
        m = metric or self._metric

        # Determine vector column
        if vector_column is None:
            vector_column = "state_vector" if tname == TableName.REPLAY else "vector"

        query_vector = np.asarray(query_vector, dtype=np.float32)

        # How many to fetch
        fetch_k = k
        if mmr:
            fetch_k = mmr_fetch_k if mmr_fetch_k > 0 else max(k * 3, 30)
        if refine_factor and refine_factor > 1:
            fetch_k = max(fetch_k, k * refine_factor)

        # Build LanceDB search query
        q = tbl.search(query_vector.tolist(), vector_column_name=vector_column)
        q = q.metric(m)
        q = q.nprobes(nprobes)

        if refine_factor and refine_factor > 1:
            q = q.refine_factor(refine_factor)

        if where:
            q = q.where(where)

        if select:
            q = q.select(select)

        q = q.limit(fetch_k)

        # Execute
        arrow_result = q.to_arrow()
        n_hits = arrow_result.num_rows

        if n_hits == 0:
            return SearchResponse(
                results=[],
                query_time_ms=round((time.monotonic() - t0) * 1000, 2),
                total_scanned=0,
            )

        # Extract distances and normalize
        dist_col = "_distance"
        raw_distances = np.array(arrow_result.column(dist_col).to_pylist(), dtype=np.float32)
        norm_scores = normalize_scores(raw_distances, m)

        # Extract IDs
        id_col = "id"
        ids = arrow_result.column(id_col).to_pylist()

        # Build result rows
        all_columns = arrow_result.column_names
        skip_cols = {dist_col, id_col, vector_column}
        data_cols = [c for c in all_columns if c not in skip_cols]

        results: List[SearchResult] = []
        for i in range(n_hits):
            row_data = {}
            for col in data_cols:
                val = arrow_result.column(col)[i].as_py()
                row_data[col] = val
            results.append(SearchResult(
                id=ids[i],
                score=float(norm_scores[i]),
                distance=float(raw_distances[i]),
                table=tname.value,
                data=row_data,
            ))

        # MMR re-ranking
        if mmr and n_hits > k:
            # We need the vectors for diversity calculation
            vecs_col = arrow_result.column(vector_column)
            cand_vecs = np.array([v.as_py() for v in vecs_col], dtype=np.float32)
            cand_scores = norm_scores[:n_hits]

            selected_indices = _mmr_rerank(
                query_vector, cand_vecs, cand_scores, k, lambda_param,
            )
            results = [results[i] for i in selected_indices]
        else:
            results = results[:k]

        # Sort by score descending
        results.sort(key=lambda r: r.score, reverse=True)

        elapsed = round((time.monotonic() - t0) * 1000, 2)
        return SearchResponse(
            results=results,
            query_time_ms=elapsed,
            total_scanned=n_hits,
            index_used=m,
            metadata={"nprobes": nprobes, "mmr": mmr},
        )

    # ===================================================================
    # Table-specific convenience methods
    # ===================================================================

    def search_pages(
        self,
        query_vector: np.ndarray,
        k: int = 10,
        *,
        domain: Optional[str] = None,
        where: Optional[str] = None,
        mmr: bool = False,
        lambda_param: float = 0.7,
    ) -> SearchResponse:
        """Search page embeddings. Optionally filter by domain."""
        filters: List[str] = []
        if domain:
            filters.append(f"domain = '{domain}'")
        if where:
            filters.append(where)
        combined = " AND ".join(filters) if filters else None
        return self.search(
            TableName.PAGES, query_vector, k,
            where=combined, mmr=mmr, lambda_param=lambda_param,
        )

    def search_entities(
        self,
        query_vector: np.ndarray,
        k: int = 20,
        *,
        entity_type: Optional[str] = None,
        min_confidence: float = 0.0,
        where: Optional[str] = None,
        mmr: bool = False,
        lambda_param: float = 0.7,
    ) -> SearchResponse:
        """Search entity embeddings with optional type/confidence filter."""
        filters: List[str] = []
        if entity_type:
            filters.append(f"entity_type = '{entity_type}'")
        if min_confidence > 0:
            filters.append(f"confidence >= {min_confidence}")
        if where:
            filters.append(where)
        combined = " AND ".join(filters) if filters else None
        return self.search(
            TableName.ENTITIES, query_vector, k,
            where=combined, mmr=mmr, lambda_param=lambda_param,
        )

    def search_leads(
        self,
        query_vector: np.ndarray,
        k: int = 20,
        *,
        industry: Optional[str] = None,
        min_score: float = 0.0,
        qualified_only: bool = False,
        where: Optional[str] = None,
    ) -> SearchResponse:
        """Search lead profile vectors."""
        filters: List[str] = []
        if industry:
            filters.append(f"industry = '{industry}'")
        if min_score > 0:
            filters.append(f"lead_score >= {min_score}")
        if qualified_only:
            filters.append("is_qualified = true")
        if where:
            filters.append(where)
        combined = " AND ".join(filters) if filters else None
        return self.search(TableName.LEADS, query_vector, k, where=combined)

    def search_documents(
        self,
        query_vector: np.ndarray,
        k: int = 10,
        *,
        source_page_id: Optional[str] = None,
        where: Optional[str] = None,
        mmr: bool = True,
        lambda_param: float = 0.7,
    ) -> SearchResponse:
        """
        Search document chunks for RAG retrieval.

        MMR is enabled by default to ensure diversity in retrieved chunks.
        """
        filters: List[str] = []
        if source_page_id:
            filters.append(f"source_page_id = '{source_page_id}'")
        if where:
            filters.append(where)
        combined = " AND ".join(filters) if filters else None
        return self.search(
            TableName.DOCUMENTS, query_vector, k,
            where=combined, mmr=mmr, lambda_param=lambda_param,
        )

    def search_replay(
        self,
        query_vector: np.ndarray,
        k: int = 64,
        *,
        episode: Optional[int] = None,
        min_priority: float = 0.0,
    ) -> SearchResponse:
        """Search replay buffer by state vector similarity."""
        filters: List[str] = []
        if episode is not None:
            filters.append(f"episode = {episode}")
        if min_priority > 0:
            filters.append(f"priority >= {min_priority}")
        combined = " AND ".join(filters) if filters else None
        return self.search(
            TableName.REPLAY, query_vector, k,
            vector_column="state_vector",
            where=combined,
        )

    # ===================================================================
    # Batch search
    # ===================================================================

    def batch_search(
        self,
        table_name: Union[TableName, str],
        query_vectors: np.ndarray,
        k: int = 10,
        *,
        where: Optional[str] = None,
        metric: Optional[str] = None,
        nprobes: int = 20,
    ) -> List[SearchResponse]:
        """
        Execute multiple queries against the same table.

        Parameters
        ----------
        query_vectors
            (N, D) array of query embeddings.
        k, where, metric, nprobes
            Same as ``search()``.

        Returns
        -------
        List of SearchResponse, one per query.
        """
        query_vectors = np.asarray(query_vectors, dtype=np.float32)
        if query_vectors.ndim == 1:
            query_vectors = query_vectors.reshape(1, -1)

        results: List[SearchResponse] = []
        for qv in query_vectors:
            resp = self.search(
                table_name, qv, k,
                where=where, metric=metric, nprobes=nprobes,
            )
            results.append(resp)

        return results

    # ===================================================================
    # DuckDB cross-table joins
    # ===================================================================

    def cross_table_join(
        self,
        query: str,
        *,
        tables: Optional[List[Union[TableName, str]]] = None,
    ) -> pa.Table:
        """
        Execute a DuckDB SQL query that joins across LanceDB tables.

        The tables are registered as DuckDB Arrow datasets, enabling
        zero-copy cross-table analytics.

        Parameters
        ----------
        query
            DuckDB SQL. Reference tables by their LanceDB name
            (pages, entities, leads, documents, replay).
        tables
            Which tables to register. None = all.

        Returns
        -------
        PyArrow Table with query results.

        Example::

            engine.cross_table_join('''
                SELECT e.canonical_name, l.lead_score, l.industry
                FROM entities e
                JOIN leads l ON e.cluster_id = l.id
                WHERE l.is_qualified = true
                ORDER BY l.lead_score DESC
                LIMIT 50
            ''')
        """
        if not HAS_DUCKDB:
            raise RuntimeError("duckdb is required for cross-table joins")

        conn = duckdb.connect()
        try:
            # Apply M1-tuned settings
            conn.execute("SET threads = 4")
            conn.execute("SET memory_limit = '512MB'")

            # Register requested tables as Arrow datasets
            target_tables = tables or list(TableName)
            for tname in target_tables:
                key = TableName(tname) if isinstance(tname, str) else tname
                arrow_tbl = self._store.table(key).to_arrow()
                conn.register(key.value, arrow_tbl)

            result = conn.execute(query).fetch_arrow_table()
            return result
        finally:
            conn.close()

    def entity_lead_enrichment(
        self,
        entity_type: str = "COMPANY",
        min_lead_score: float = 0.5,
        limit: int = 100,
    ) -> pa.Table:
        """
        Join entities with leads to produce enriched company profiles.

        Returns entities that have matching lead scores above the threshold.
        """
        sql = f"""
            SELECT
                e.id            AS entity_id,
                e.canonical_name,
                e.entity_type,
                e.confidence    AS entity_confidence,
                l.lead_score,
                l.lead_confidence,
                l.industry,
                l.size_tier,
                l.is_qualified
            FROM entities e
            JOIN leads l ON e.cluster_id = l.id
            WHERE e.entity_type = '{entity_type}'
              AND l.lead_score >= {min_lead_score}
            ORDER BY l.lead_score DESC
            LIMIT {limit}
        """
        return self.cross_table_join(
            sql, tables=[TableName.ENTITIES, TableName.LEADS],
        )

    def document_page_context(
        self,
        query_vector: np.ndarray,
        k: int = 10,
        *,
        mmr: bool = True,
    ) -> pa.Table:
        """
        Search documents, then enrich each chunk with its source page metadata.

        Useful for RAG: get the chunk text + full page context (URL, title, domain).
        """
        # Step 1: vector search on documents
        doc_resp = self.search_documents(query_vector, k=k, mmr=mmr)
        if not doc_resp.results:
            return pa.table({})

        # Step 2: join with pages via DuckDB
        doc_ids = [r.id for r in doc_resp.results]
        id_list = ", ".join(f"'{d}'" for d in doc_ids)

        sql = f"""
            SELECT
                d.id            AS doc_id,
                d.text,
                d.chunk_index,
                d.section,
                d.token_count,
                p.url           AS page_url,
                p.title         AS page_title,
                p.domain        AS page_domain,
                p.crawl_ts      AS page_crawl_ts
            FROM documents d
            LEFT JOIN pages p ON d.source_page_id = p.id
            WHERE d.id IN ({id_list})
        """
        return self.cross_table_join(
            sql, tables=[TableName.DOCUMENTS, TableName.PAGES],
        )

    # ===================================================================
    # Aggregation / analytics helpers
    # ===================================================================

    def nearest_entity_clusters(
        self,
        query_vector: np.ndarray,
        k_entities: int = 50,
        min_confidence: float = 0.5,
    ) -> pa.Table:
        """
        Find entity clusters near a query vector, grouped by cluster_id.

        Returns cluster_id, count, avg_confidence, representative_name.
        """
        resp = self.search_entities(
            query_vector, k=k_entities, min_confidence=min_confidence,
        )
        if not resp.results:
            return pa.table({})

        entity_ids = [r.id for r in resp.results]
        id_list = ", ".join(f"'{e}'" for e in entity_ids)

        sql = f"""
            SELECT
                cluster_id,
                COUNT(*)            AS entity_count,
                ROUND(AVG(confidence), 3) AS avg_confidence,
                FIRST(canonical_name)     AS representative_name,
                LIST(entity_type)         AS entity_types
            FROM entities
            WHERE id IN ({id_list}) AND cluster_id != ''
            GROUP BY cluster_id
            ORDER BY entity_count DESC
        """
        return self.cross_table_join(sql, tables=[TableName.ENTITIES])

    def lead_score_distribution_for_query(
        self,
        query_vector: np.ndarray,
        k: int = 100,
    ) -> Dict[str, Any]:
        """
        Search leads near a query vector and summarize score distribution.

        Returns percentiles, mean, std, and histogram bins.
        """
        resp = self.search_leads(query_vector, k=k)
        if not resp.results:
            return {"count": 0}

        scores = np.array([r.data.get("lead_score", 0) for r in resp.results], dtype=np.float32)
        return {
            "count": len(scores),
            "mean": float(np.mean(scores)),
            "std": float(np.std(scores)),
            "min": float(np.min(scores)),
            "max": float(np.max(scores)),
            "p25": float(np.percentile(scores, 25)),
            "p50": float(np.percentile(scores, 50)),
            "p75": float(np.percentile(scores, 75)),
            "qualified_count": sum(
                1 for r in resp.results if r.data.get("is_qualified")
            ),
        }
