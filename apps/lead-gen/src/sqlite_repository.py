"""
sqlite_repository.py
Data access layer (Repository pattern) for Scrapus SQLite OLTP store.

Provides typed methods for every pipeline module:
  - Module 1 (Crawler):   insert_page, get_pages_by_domain, upsert_domain
  - Module 2 (NER):       insert_entities, get_entities_by_page
  - Module 3 (ER):        create_cluster, add_cluster_member, get_cluster
  - Module 4 (Scoring):   insert_lead, update_lead_score, insert_lead_features
  - Module 5 (Reports):   insert_report, get_reports_by_lead
  - Module 6 (Eval):      get_graph_neighbors, pipeline run tracking

All methods use parameterised queries.  Batch inserts use executemany.
Connection pooling is handled via a simple thread-local pool with
configurable size.

Optimised for Apple M1 16GB: WAL mode, mmap 256 MB, batch sizes tuned for
cache-line efficiency.

Author: Scrapus Pipeline
"""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import (
    Any,
    Dict,
    Generator,
    List,
    Optional,
    Sequence,
    Tuple,
    Union,
)

from sqlite_schema import (
    DEFAULT_DB_PATH,
    apply_m1_pragmas,
    bootstrap,
    get_connection,
    init_schema,
)

logger = logging.getLogger(__name__)


# =========================================================================
# Lightweight row dataclasses — thin wrappers for type safety
# =========================================================================

@dataclass
class PageRow:
    id: Optional[int] = None
    url: str = ""
    domain: str = ""
    title: Optional[str] = None
    body_text: Optional[str] = None
    html_hash: Optional[str] = None
    crawl_timestamp: Optional[float] = None
    status: str = "pending"
    http_status: Optional[int] = None
    depth: int = 0
    rl_priority_score: float = 0.0
    content_length: Optional[int] = None
    language: Optional[str] = None
    run_id: Optional[str] = None


@dataclass
class EntityRow:
    id: Optional[int] = None
    page_id: int = 0
    entity_type: str = ""
    entity_text: str = ""
    normalized_text: Optional[str] = None
    start_pos: Optional[int] = None
    end_pos: Optional[int] = None
    confidence: float = 0.0
    source_model: str = "unknown"
    metadata_json: Optional[str] = None


@dataclass
class ClusterRow:
    cluster_id: Optional[int] = None
    canonical_name: str = ""
    canonical_type: str = ""
    member_count: int = 0
    avg_confidence: float = 0.0
    metadata_json: Optional[str] = None


@dataclass
class LeadRow:
    id: Optional[int] = None
    cluster_id: Optional[int] = None
    company_name: str = ""
    contact_info: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    employee_count: Optional[int] = None
    lead_score: float = 0.0
    conformal_lower: Optional[float] = None
    conformal_upper: Optional[float] = None
    qualification_status: str = "unscored"
    scoring_model: Optional[str] = None
    scoring_timestamp: Optional[float] = None
    metadata_json: Optional[str] = None


@dataclass
class ReportRow:
    id: Optional[int] = None
    lead_id: int = 0
    report_text: str = ""
    report_format: str = "markdown"
    factuality_score: Optional[float] = None
    claim_count: Optional[int] = None
    verified_claim_count: Optional[int] = None
    generation_timestamp: Optional[float] = None
    generation_latency_ms: Optional[float] = None
    llm_model: str = ""
    llm_config_json: Optional[str] = None
    run_id: Optional[str] = None


@dataclass
class DomainRow:
    domain: str = ""
    robots_txt: Optional[str] = None
    robots_fetched: Optional[float] = None
    last_crawl: Optional[float] = None
    crawl_count: int = 0
    page_count: int = 0
    avg_priority: float = 0.0
    rate_limit_until: Optional[float] = None
    rate_limit_reason: Optional[str] = None
    sitemap_url: Optional[str] = None
    is_blocked: int = 0
    metadata_json: Optional[str] = None


@dataclass
class GraphEdgeRow:
    id: Optional[int] = None
    source_entity_id: int = 0
    target_entity_id: int = 0
    relation_type: str = ""
    weight: float = 1.0
    confidence: float = 0.0
    evidence_page_id: Optional[int] = None
    metadata_json: Optional[str] = None


# =========================================================================
# Connection pool — thread-local, lightweight
# =========================================================================

class _ConnectionPool:
    """
    Thread-local SQLite connection pool.

    Each thread gets at most one reusable connection.  WAL mode makes this
    safe: readers never block writers, writers never block readers.
    """

    def __init__(self, db_path: str, max_idle: int = 4):
        self._db_path = db_path
        self._local = threading.local()
        self._max_idle = max_idle
        self._lock = threading.Lock()
        self._idle: list[sqlite3.Connection] = []

    def acquire(self) -> sqlite3.Connection:
        """Return a connection for the calling thread."""
        conn = getattr(self._local, "conn", None)
        if conn is not None:
            try:
                conn.execute("SELECT 1")
                return conn
            except sqlite3.ProgrammingError:
                pass  # connection was closed

        with self._lock:
            if self._idle:
                conn = self._idle.pop()
                self._local.conn = conn
                return conn

        conn = get_connection(self._db_path)
        init_schema(conn, create_indexes=False, create_triggers=False)
        self._local.conn = conn
        return conn

    def release(self, conn: sqlite3.Connection) -> None:
        """Return a connection to the idle pool."""
        self._local.conn = None
        with self._lock:
            if len(self._idle) < self._max_idle:
                self._idle.append(conn)
            else:
                conn.close()

    def close_all(self) -> None:
        """Close every pooled connection."""
        with self._lock:
            for c in self._idle:
                try:
                    c.close()
                except Exception:
                    pass
            self._idle.clear()
        conn = getattr(self._local, "conn", None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
            self._local.conn = None


# =========================================================================
# ScrapusRepository — main data-access class
# =========================================================================

class ScrapusRepository:
    """
    Repository pattern over the Scrapus SQLite OLTP store.

    Usage::

        repo = ScrapusRepository("scrapus_data/scrapus.db")
        with repo.transaction() as tx:
            page_id = repo.insert_page(PageRow(url="https://...", domain="example.com"), conn=tx)
            repo.insert_entities([EntityRow(page_id=page_id, ...)], conn=tx)
    """

    # Default batch size tuned for M1 cache (4 KB pages, 8 MB SLC)
    BATCH_SIZE = 500

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        self._pool = _ConnectionPool(db_path)

        # Bootstrap schema on first instantiation
        conn = bootstrap(db_path)
        conn.close()

    # -----------------------------------------------------------------
    # Connection helpers
    # -----------------------------------------------------------------

    @property
    def conn(self) -> sqlite3.Connection:
        """Acquire a connection from the pool (thread-safe)."""
        return self._pool.acquire()

    def _get_conn(self, conn: Optional[sqlite3.Connection]) -> sqlite3.Connection:
        """Use the caller-provided connection, or fall back to pool."""
        return conn if conn is not None else self.conn

    @contextmanager
    def transaction(self) -> Generator[sqlite3.Connection, None, None]:
        """
        Context manager that wraps a block in BEGIN / COMMIT (or ROLLBACK).

        Usage::

            with repo.transaction() as tx:
                repo.insert_page(page, conn=tx)
                repo.insert_entities(entities, conn=tx)
        """
        conn = self._pool.acquire()
        conn.execute("BEGIN IMMEDIATE")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    def close(self) -> None:
        """Shut down the connection pool."""
        self._pool.close_all()

    # =================================================================
    # MODULE 1 — CRAWLER: pages + domains
    # =================================================================

    def insert_page(
        self,
        page: PageRow,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """
        Insert a crawled page. Returns the new row id.

        Duplicate URLs are silently ignored (UPSERT on url).
        """
        c = self._get_conn(conn)
        cursor = c.execute(
            """
            INSERT INTO pages
                (url, domain, title, body_text, html_hash, crawl_timestamp,
                 status, http_status, depth, rl_priority_score, content_length,
                 language, run_id)
            VALUES (?, ?, ?, ?, ?, COALESCE(?, unixepoch('subsec')),
                    ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
                title           = COALESCE(excluded.title, title),
                body_text       = COALESCE(excluded.body_text, body_text),
                html_hash       = COALESCE(excluded.html_hash, html_hash),
                crawl_timestamp = excluded.crawl_timestamp,
                status          = excluded.status,
                http_status     = excluded.http_status,
                rl_priority_score = excluded.rl_priority_score,
                content_length  = COALESCE(excluded.content_length, content_length),
                language        = COALESCE(excluded.language, language),
                run_id          = excluded.run_id,
                updated_at      = unixepoch('subsec')
            """,
            (
                page.url, page.domain, page.title, page.body_text,
                page.html_hash, page.crawl_timestamp, page.status,
                page.http_status, page.depth, page.rl_priority_score,
                page.content_length, page.language, page.run_id,
            ),
        )
        if conn is None:
            c.commit()
        return cursor.lastrowid or 0

    def insert_pages_batch(
        self,
        pages: Sequence[PageRow],
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """
        Batch-insert pages using executemany.

        Returns number of rows affected.
        """
        c = self._get_conn(conn)
        data = [
            (
                p.url, p.domain, p.title, p.body_text, p.html_hash,
                p.crawl_timestamp, p.status, p.http_status, p.depth,
                p.rl_priority_score, p.content_length, p.language, p.run_id,
            )
            for p in pages
        ]
        c.executemany(
            """
            INSERT OR IGNORE INTO pages
                (url, domain, title, body_text, html_hash, crawl_timestamp,
                 status, http_status, depth, rl_priority_score, content_length,
                 language, run_id)
            VALUES (?, ?, ?, ?, ?, COALESCE(?, unixepoch('subsec')),
                    ?, ?, ?, ?, ?, ?, ?)
            """,
            data,
        )
        if conn is None:
            c.commit()
        return len(data)

    def get_pages_by_domain(
        self,
        domain: str,
        *,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Retrieve pages for a given domain, optionally filtered by status."""
        c = self._get_conn(conn)
        if status:
            return c.execute(
                "SELECT * FROM pages WHERE domain = ? AND status = ? "
                "ORDER BY crawl_timestamp DESC LIMIT ? OFFSET ?",
                (domain, status, limit, offset),
            ).fetchall()
        return c.execute(
            "SELECT * FROM pages WHERE domain = ? "
            "ORDER BY crawl_timestamp DESC LIMIT ? OFFSET ?",
            (domain, limit, offset),
        ).fetchall()

    def get_page_by_url(
        self,
        url: str,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Fetch a single page by URL."""
        c = self._get_conn(conn)
        return c.execute("SELECT * FROM pages WHERE url = ?", (url,)).fetchone()

    def get_pending_pages(
        self,
        *,
        limit: int = 100,
        min_priority: float = 0.0,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get highest-priority pending pages for the crawler."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM pages WHERE status = 'pending' AND rl_priority_score >= ? "
            "ORDER BY rl_priority_score DESC LIMIT ?",
            (min_priority, limit),
        ).fetchall()

    def update_page_status(
        self,
        page_id: int,
        status: str,
        *,
        http_status: Optional[int] = None,
        conn: Optional[sqlite3.Connection] = None,
    ) -> None:
        """Update the crawl status of a page."""
        c = self._get_conn(conn)
        c.execute(
            "UPDATE pages SET status = ?, http_status = COALESCE(?, http_status) "
            "WHERE id = ?",
            (status, http_status, page_id),
        )
        if conn is None:
            c.commit()

    # -- domains --

    def upsert_domain(
        self,
        domain: DomainRow,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> None:
        """Insert or update a domain record."""
        c = self._get_conn(conn)
        c.execute(
            """
            INSERT INTO domains
                (domain, robots_txt, robots_fetched, last_crawl, crawl_count,
                 page_count, avg_priority, rate_limit_until, rate_limit_reason,
                 sitemap_url, is_blocked, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(domain) DO UPDATE SET
                robots_txt       = COALESCE(excluded.robots_txt, robots_txt),
                robots_fetched   = COALESCE(excluded.robots_fetched, robots_fetched),
                last_crawl       = COALESCE(excluded.last_crawl, last_crawl),
                crawl_count      = excluded.crawl_count,
                page_count       = excluded.page_count,
                avg_priority     = excluded.avg_priority,
                rate_limit_until = excluded.rate_limit_until,
                rate_limit_reason = excluded.rate_limit_reason,
                sitemap_url      = COALESCE(excluded.sitemap_url, sitemap_url),
                is_blocked       = excluded.is_blocked,
                metadata_json    = COALESCE(excluded.metadata_json, metadata_json),
                updated_at       = unixepoch('subsec')
            """,
            (
                domain.domain, domain.robots_txt, domain.robots_fetched,
                domain.last_crawl, domain.crawl_count, domain.page_count,
                domain.avg_priority, domain.rate_limit_until,
                domain.rate_limit_reason, domain.sitemap_url,
                domain.is_blocked, domain.metadata_json,
            ),
        )
        if conn is None:
            c.commit()

    def get_domain(
        self,
        domain: str,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Get domain metadata."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM domains WHERE domain = ?", (domain,)
        ).fetchone()

    def get_crawlable_domains(
        self,
        *,
        limit: int = 50,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get domains not rate-limited and not blocked, ordered by priority."""
        c = self._get_conn(conn)
        return c.execute(
            """
            SELECT * FROM domains
            WHERE is_blocked = 0
              AND (rate_limit_until IS NULL OR rate_limit_until < unixepoch('subsec'))
            ORDER BY avg_priority DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    # =================================================================
    # MODULE 2 — NER: entities
    # =================================================================

    def insert_entities(
        self,
        entities: Sequence[EntityRow],
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """
        Batch-insert entities extracted from a page.

        Uses executemany for throughput (target: 300+ pages/sec NER output).
        Returns number of rows inserted.
        """
        c = self._get_conn(conn)
        data = [
            (
                e.page_id, e.entity_type, e.entity_text, e.normalized_text,
                e.start_pos, e.end_pos, e.confidence, e.source_model,
                e.metadata_json,
            )
            for e in entities
        ]
        # Chunk to avoid SQLite variable limit (SQLITE_MAX_VARIABLE_NUMBER)
        inserted = 0
        for i in range(0, len(data), self.BATCH_SIZE):
            chunk = data[i : i + self.BATCH_SIZE]
            c.executemany(
                """
                INSERT INTO entities
                    (page_id, entity_type, entity_text, normalized_text,
                     start_pos, end_pos, confidence, source_model, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                chunk,
            )
            inserted += len(chunk)
        if conn is None:
            c.commit()
        return inserted

    def get_entities_by_page(
        self,
        page_id: int,
        *,
        entity_type: Optional[str] = None,
        min_confidence: float = 0.0,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get all entities from a given page."""
        c = self._get_conn(conn)
        if entity_type:
            return c.execute(
                "SELECT * FROM entities WHERE page_id = ? AND entity_type = ? "
                "AND confidence >= ? ORDER BY start_pos",
                (page_id, entity_type, min_confidence),
            ).fetchall()
        return c.execute(
            "SELECT * FROM entities WHERE page_id = ? AND confidence >= ? "
            "ORDER BY start_pos",
            (page_id, min_confidence),
        ).fetchall()

    def get_entities_by_type(
        self,
        entity_type: str,
        *,
        limit: int = 1000,
        min_confidence: float = 0.0,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get all entities of a given type, ordered by confidence."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM entities WHERE entity_type = ? AND confidence >= ? "
            "ORDER BY confidence DESC LIMIT ?",
            (entity_type, min_confidence, limit),
        ).fetchall()

    def get_entity_by_id(
        self,
        entity_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Get a single entity by id."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM entities WHERE id = ?", (entity_id,)
        ).fetchone()

    def count_entities_by_page(
        self,
        page_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Dict[str, int]:
        """Return entity counts grouped by type for a page."""
        c = self._get_conn(conn)
        rows = c.execute(
            "SELECT entity_type, COUNT(*) AS cnt FROM entities "
            "WHERE page_id = ? GROUP BY entity_type",
            (page_id,),
        ).fetchall()
        return {row["entity_type"]: row["cnt"] for row in rows}

    # =================================================================
    # MODULE 3 — ENTITY RESOLUTION: clusters + members
    # =================================================================

    def create_cluster(
        self,
        cluster: ClusterRow,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """Create an entity cluster and return its cluster_id."""
        c = self._get_conn(conn)
        cursor = c.execute(
            """
            INSERT INTO entity_clusters
                (canonical_name, canonical_type, member_count, avg_confidence, metadata_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                cluster.canonical_name, cluster.canonical_type,
                cluster.member_count, cluster.avg_confidence,
                cluster.metadata_json,
            ),
        )
        if conn is None:
            c.commit()
        return cursor.lastrowid or 0

    def add_cluster_member(
        self,
        cluster_id: int,
        entity_id: int,
        similarity_score: float = 0.0,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> None:
        """Add an entity to an existing cluster."""
        c = self._get_conn(conn)
        c.execute(
            """
            INSERT OR IGNORE INTO entity_cluster_members
                (cluster_id, entity_id, similarity_score)
            VALUES (?, ?, ?)
            """,
            (cluster_id, entity_id, similarity_score),
        )
        if conn is None:
            c.commit()

    def add_cluster_members_batch(
        self,
        members: Sequence[Tuple[int, int, float]],
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """
        Batch-add cluster memberships.

        Args:
            members: List of (cluster_id, entity_id, similarity_score) tuples.
        """
        c = self._get_conn(conn)
        c.executemany(
            "INSERT OR IGNORE INTO entity_cluster_members "
            "(cluster_id, entity_id, similarity_score) VALUES (?, ?, ?)",
            members,
        )
        if conn is None:
            c.commit()
        return len(members)

    def get_cluster(
        self,
        cluster_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Get cluster metadata."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM entity_clusters WHERE cluster_id = ?", (cluster_id,)
        ).fetchone()

    def get_cluster_members(
        self,
        cluster_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get all entity members of a cluster, with entity details."""
        c = self._get_conn(conn)
        return c.execute(
            """
            SELECT ecm.*, e.entity_type, e.entity_text, e.confidence AS entity_confidence
            FROM entity_cluster_members ecm
            JOIN entities e ON e.id = ecm.entity_id
            WHERE ecm.cluster_id = ?
            ORDER BY ecm.similarity_score DESC
            """,
            (cluster_id,),
        ).fetchall()

    def find_cluster_for_entity(
        self,
        entity_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Find which cluster an entity belongs to."""
        c = self._get_conn(conn)
        return c.execute(
            """
            SELECT ec.*
            FROM entity_clusters ec
            JOIN entity_cluster_members ecm ON ec.cluster_id = ecm.cluster_id
            WHERE ecm.entity_id = ?
            """,
            (entity_id,),
        ).fetchone()

    def get_all_clusters(
        self,
        *,
        min_members: int = 1,
        limit: int = 500,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get all clusters, ordered by member count descending."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM entity_clusters WHERE member_count >= ? "
            "ORDER BY member_count DESC LIMIT ?",
            (min_members, limit),
        ).fetchall()

    # =================================================================
    # MODULE 4 — LEAD SCORING: leads + features
    # =================================================================

    def insert_lead(
        self,
        lead: LeadRow,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """Insert a lead and return its id."""
        c = self._get_conn(conn)
        cursor = c.execute(
            """
            INSERT INTO leads
                (cluster_id, company_name, contact_info, domain, industry,
                 location, employee_count, lead_score, conformal_lower,
                 conformal_upper, qualification_status, scoring_model,
                 scoring_timestamp, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lead.cluster_id, lead.company_name, lead.contact_info,
                lead.domain, lead.industry, lead.location,
                lead.employee_count, lead.lead_score, lead.conformal_lower,
                lead.conformal_upper, lead.qualification_status,
                lead.scoring_model, lead.scoring_timestamp,
                lead.metadata_json,
            ),
        )
        if conn is None:
            c.commit()
        return cursor.lastrowid or 0

    def insert_leads_batch(
        self,
        leads: Sequence[LeadRow],
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """Batch-insert leads using executemany."""
        c = self._get_conn(conn)
        data = [
            (
                l.cluster_id, l.company_name, l.contact_info, l.domain,
                l.industry, l.location, l.employee_count, l.lead_score,
                l.conformal_lower, l.conformal_upper, l.qualification_status,
                l.scoring_model, l.scoring_timestamp, l.metadata_json,
            )
            for l in leads
        ]
        c.executemany(
            """
            INSERT INTO leads
                (cluster_id, company_name, contact_info, domain, industry,
                 location, employee_count, lead_score, conformal_lower,
                 conformal_upper, qualification_status, scoring_model,
                 scoring_timestamp, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            data,
        )
        if conn is None:
            c.commit()
        return len(data)

    def update_lead_score(
        self,
        lead_id: int,
        lead_score: float,
        *,
        conformal_lower: Optional[float] = None,
        conformal_upper: Optional[float] = None,
        qualification_status: Optional[str] = None,
        scoring_model: Optional[str] = None,
        conn: Optional[sqlite3.Connection] = None,
    ) -> None:
        """Update the score and conformal bounds of a lead."""
        c = self._get_conn(conn)
        c.execute(
            """
            UPDATE leads SET
                lead_score           = ?,
                conformal_lower      = COALESCE(?, conformal_lower),
                conformal_upper      = COALESCE(?, conformal_upper),
                qualification_status = COALESCE(?, qualification_status),
                scoring_model        = COALESCE(?, scoring_model),
                scoring_timestamp    = unixepoch('subsec')
            WHERE id = ?
            """,
            (
                lead_score, conformal_lower, conformal_upper,
                qualification_status, scoring_model, lead_id,
            ),
        )
        if conn is None:
            c.commit()

    def update_lead_status(
        self,
        lead_id: int,
        status: str,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> None:
        """Update the qualification status of a lead."""
        c = self._get_conn(conn)
        c.execute(
            "UPDATE leads SET qualification_status = ? WHERE id = ?",
            (status, lead_id),
        )
        if conn is None:
            c.commit()

    def get_lead(
        self,
        lead_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Get a single lead by id."""
        c = self._get_conn(conn)
        return c.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()

    def get_leads_by_status(
        self,
        status: str,
        *,
        limit: int = 100,
        min_score: float = 0.0,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get leads filtered by qualification status."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM leads WHERE qualification_status = ? AND lead_score >= ? "
            "ORDER BY lead_score DESC LIMIT ?",
            (status, min_score, limit),
        ).fetchall()

    def get_top_leads(
        self,
        *,
        limit: int = 50,
        min_score: float = 0.5,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get the highest-scoring leads."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM leads WHERE lead_score >= ? "
            "ORDER BY lead_score DESC LIMIT ?",
            (min_score, limit),
        ).fetchall()

    def get_lead_by_cluster(
        self,
        cluster_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Get the lead associated with an entity cluster."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM leads WHERE cluster_id = ?", (cluster_id,)
        ).fetchone()

    # -- lead features --

    def insert_lead_features(
        self,
        lead_id: int,
        features: Dict[str, float],
        *,
        feature_source: Optional[str] = None,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """
        Insert feature-value pairs for a lead.

        Args:
            lead_id: The lead to attach features to.
            features: Mapping of feature_name -> feature_value.
            feature_source: Optional label for provenance.

        Returns:
            Number of features inserted.
        """
        c = self._get_conn(conn)
        data = [
            (lead_id, name, value, feature_source)
            for name, value in features.items()
        ]
        c.executemany(
            """
            INSERT INTO lead_features (lead_id, feature_name, feature_value, feature_source)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(lead_id, feature_name) DO UPDATE SET
                feature_value  = excluded.feature_value,
                feature_source = COALESCE(excluded.feature_source, feature_source),
                created_at     = unixepoch('subsec')
            """,
            data,
        )
        if conn is None:
            c.commit()
        return len(data)

    def get_lead_features(
        self,
        lead_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Dict[str, float]:
        """Return the feature vector for a lead as a dict."""
        c = self._get_conn(conn)
        rows = c.execute(
            "SELECT feature_name, feature_value FROM lead_features WHERE lead_id = ?",
            (lead_id,),
        ).fetchall()
        return {row["feature_name"]: row["feature_value"] for row in rows}

    # =================================================================
    # MODULE 5 — REPORT GENERATION: reports
    # =================================================================

    def insert_report(
        self,
        report: ReportRow,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """Insert a generated report and return its id."""
        c = self._get_conn(conn)
        cursor = c.execute(
            """
            INSERT INTO reports
                (lead_id, report_text, report_format, factuality_score,
                 claim_count, verified_claim_count, generation_timestamp,
                 generation_latency_ms, llm_model, llm_config_json, run_id)
            VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, unixepoch('subsec')),
                    ?, ?, ?, ?)
            """,
            (
                report.lead_id, report.report_text, report.report_format,
                report.factuality_score, report.claim_count,
                report.verified_claim_count, report.generation_timestamp,
                report.generation_latency_ms, report.llm_model,
                report.llm_config_json, report.run_id,
            ),
        )
        if conn is None:
            c.commit()
        return cursor.lastrowid or 0

    def insert_reports_batch(
        self,
        reports: Sequence[ReportRow],
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """Batch-insert reports using executemany."""
        c = self._get_conn(conn)
        data = [
            (
                r.lead_id, r.report_text, r.report_format,
                r.factuality_score, r.claim_count, r.verified_claim_count,
                r.generation_timestamp, r.generation_latency_ms,
                r.llm_model, r.llm_config_json, r.run_id,
            )
            for r in reports
        ]
        c.executemany(
            """
            INSERT INTO reports
                (lead_id, report_text, report_format, factuality_score,
                 claim_count, verified_claim_count, generation_timestamp,
                 generation_latency_ms, llm_model, llm_config_json, run_id)
            VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, unixepoch('subsec')),
                    ?, ?, ?, ?)
            """,
            data,
        )
        if conn is None:
            c.commit()
        return len(data)

    def get_reports_by_lead(
        self,
        lead_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get all reports for a lead, newest first."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM reports WHERE lead_id = ? "
            "ORDER BY generation_timestamp DESC",
            (lead_id,),
        ).fetchall()

    def get_latest_report(
        self,
        lead_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Get the most recent report for a lead."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM reports WHERE lead_id = ? "
            "ORDER BY generation_timestamp DESC LIMIT 1",
            (lead_id,),
        ).fetchone()

    def get_reports_by_run(
        self,
        run_id: str,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get all reports generated in a specific pipeline run."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM reports WHERE run_id = ? "
            "ORDER BY generation_timestamp DESC",
            (run_id,),
        ).fetchall()

    # =================================================================
    # MODULE 5 — GRAPH EDGES (LightGraphRAG)
    # =================================================================

    def insert_graph_edge(
        self,
        edge: GraphEdgeRow,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """Insert a graph edge. Duplicates are ignored (UPSERT on unique triple)."""
        c = self._get_conn(conn)
        cursor = c.execute(
            """
            INSERT INTO graph_edges
                (source_entity_id, target_entity_id, relation_type,
                 weight, confidence, evidence_page_id, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_entity_id, target_entity_id, relation_type) DO UPDATE SET
                weight           = excluded.weight,
                confidence       = excluded.confidence,
                evidence_page_id = COALESCE(excluded.evidence_page_id, evidence_page_id),
                metadata_json    = COALESCE(excluded.metadata_json, metadata_json)
            """,
            (
                edge.source_entity_id, edge.target_entity_id,
                edge.relation_type, edge.weight, edge.confidence,
                edge.evidence_page_id, edge.metadata_json,
            ),
        )
        if conn is None:
            c.commit()
        return cursor.lastrowid or 0

    def insert_graph_edges_batch(
        self,
        edges: Sequence[GraphEdgeRow],
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> int:
        """Batch-insert graph edges."""
        c = self._get_conn(conn)
        data = [
            (
                e.source_entity_id, e.target_entity_id, e.relation_type,
                e.weight, e.confidence, e.evidence_page_id, e.metadata_json,
            )
            for e in edges
        ]
        c.executemany(
            """
            INSERT OR IGNORE INTO graph_edges
                (source_entity_id, target_entity_id, relation_type,
                 weight, confidence, evidence_page_id, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            data,
        )
        if conn is None:
            c.commit()
        return len(data)

    def get_graph_neighbors(
        self,
        entity_id: int,
        *,
        relation_type: Optional[str] = None,
        max_hops: int = 1,
        limit: int = 100,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """
        Get neighboring entities in the knowledge graph.

        For 1-hop (default), returns direct neighbors.
        For 2-hop, uses a recursive CTE to traverse two levels.

        Args:
            entity_id: Starting entity.
            relation_type: Optional filter on relation_type.
            max_hops: 1 or 2 (higher values capped at 2 for safety).
            limit: Maximum results.

        Returns:
            Rows with neighbor entity info and traversal depth.
        """
        c = self._get_conn(conn)
        max_hops = min(max_hops, 2)  # Cap at 2 for M1 memory safety

        if max_hops == 1:
            if relation_type:
                return c.execute(
                    """
                    SELECT ge.*, e.entity_type, e.entity_text, e.confidence AS entity_confidence,
                           1 AS hop_depth
                    FROM graph_edges ge
                    JOIN entities e ON e.id = ge.target_entity_id
                    WHERE ge.source_entity_id = ? AND ge.relation_type = ?
                    UNION ALL
                    SELECT ge.*, e.entity_type, e.entity_text, e.confidence AS entity_confidence,
                           1 AS hop_depth
                    FROM graph_edges ge
                    JOIN entities e ON e.id = ge.source_entity_id
                    WHERE ge.target_entity_id = ? AND ge.relation_type = ?
                    ORDER BY weight DESC
                    LIMIT ?
                    """,
                    (entity_id, relation_type, entity_id, relation_type, limit),
                ).fetchall()
            return c.execute(
                """
                SELECT ge.*, e.entity_type, e.entity_text, e.confidence AS entity_confidence,
                       1 AS hop_depth
                FROM graph_edges ge
                JOIN entities e ON e.id = ge.target_entity_id
                WHERE ge.source_entity_id = ?
                UNION ALL
                SELECT ge.*, e.entity_type, e.entity_text, e.confidence AS entity_confidence,
                       1 AS hop_depth
                FROM graph_edges ge
                JOIN entities e ON e.id = ge.source_entity_id
                WHERE ge.target_entity_id = ?
                ORDER BY weight DESC
                LIMIT ?
                """,
                (entity_id, entity_id, limit),
            ).fetchall()

        # 2-hop: recursive CTE
        rel_filter = "AND ge.relation_type = ?" if relation_type else ""
        params: list[Any] = [entity_id]
        if relation_type:
            params.append(relation_type)
        params.append(entity_id)
        if relation_type:
            params.append(relation_type)
        params.append(max_hops)
        params.append(limit)

        return c.execute(
            f"""
            WITH RECURSIVE neighbors(eid, depth) AS (
                SELECT ? AS eid, 0 AS depth
                UNION ALL
                SELECT
                    CASE WHEN ge.source_entity_id = n.eid
                         THEN ge.target_entity_id
                         ELSE ge.source_entity_id
                    END,
                    n.depth + 1
                FROM neighbors n
                JOIN graph_edges ge
                    ON (ge.source_entity_id = n.eid OR ge.target_entity_id = n.eid)
                    {rel_filter}
                WHERE n.depth < ?
            )
            SELECT DISTINCT e.id, e.entity_type, e.entity_text, e.confidence,
                   n.depth AS hop_depth
            FROM neighbors n
            JOIN entities e ON e.id = n.eid
            WHERE n.depth > 0
            ORDER BY n.depth, e.confidence DESC
            LIMIT ?
            """,
            params,
        ).fetchall()

    def get_entity_relations(
        self,
        entity_id: int,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get all edges involving an entity (both directions)."""
        c = self._get_conn(conn)
        return c.execute(
            """
            SELECT * FROM graph_edges
            WHERE source_entity_id = ? OR target_entity_id = ?
            ORDER BY weight DESC
            """,
            (entity_id, entity_id),
        ).fetchall()

    # =================================================================
    # MODULE 6 — PIPELINE RUNS
    # =================================================================

    def start_pipeline_run(
        self,
        *,
        config_json: Optional[str] = None,
        run_id: Optional[str] = None,
        conn: Optional[sqlite3.Connection] = None,
    ) -> str:
        """Create a new pipeline run record and return its run_id."""
        c = self._get_conn(conn)
        rid = run_id or str(uuid.uuid4())
        c.execute(
            "INSERT INTO pipeline_runs (run_id, config_json) VALUES (?, ?)",
            (rid, config_json),
        )
        if conn is None:
            c.commit()
        return rid

    def finish_pipeline_run(
        self,
        run_id: str,
        *,
        status: str = "completed",
        stages_completed: Optional[str] = None,
        pages_crawled: int = 0,
        entities_found: int = 0,
        leads_scored: int = 0,
        reports_generated: int = 0,
        error_message: Optional[str] = None,
        peak_memory_mb: Optional[float] = None,
        conn: Optional[sqlite3.Connection] = None,
    ) -> None:
        """Finalise a pipeline run with results."""
        c = self._get_conn(conn)
        c.execute(
            """
            UPDATE pipeline_runs SET
                end_time          = unixepoch('subsec'),
                status            = ?,
                stages_completed  = ?,
                pages_crawled     = ?,
                entities_found    = ?,
                leads_scored      = ?,
                reports_generated = ?,
                error_message     = ?,
                peak_memory_mb    = ?
            WHERE run_id = ?
            """,
            (
                status, stages_completed, pages_crawled, entities_found,
                leads_scored, reports_generated, error_message,
                peak_memory_mb, run_id,
            ),
        )
        if conn is None:
            c.commit()

    def get_pipeline_run(
        self,
        run_id: str,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Optional[sqlite3.Row]:
        """Get a pipeline run by id."""
        c = self._get_conn(conn)
        return c.execute(
            "SELECT * FROM pipeline_runs WHERE run_id = ?", (run_id,)
        ).fetchone()

    def get_recent_runs(
        self,
        *,
        limit: int = 20,
        status: Optional[str] = None,
        conn: Optional[sqlite3.Connection] = None,
    ) -> List[sqlite3.Row]:
        """Get recent pipeline runs."""
        c = self._get_conn(conn)
        if status:
            return c.execute(
                "SELECT * FROM pipeline_runs WHERE status = ? "
                "ORDER BY start_time DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        return c.execute(
            "SELECT * FROM pipeline_runs ORDER BY start_time DESC LIMIT ?",
            (limit,),
        ).fetchall()

    # =================================================================
    # CROSS-CUTTING: stats & diagnostics
    # =================================================================

    def get_table_stats(
        self,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Dict[str, int]:
        """Row counts for all core tables."""
        from sqlite_schema import get_table_stats
        c = self._get_conn(conn)
        return get_table_stats(c)

    def get_pipeline_summary(
        self,
        run_id: Optional[str] = None,
        *,
        conn: Optional[sqlite3.Connection] = None,
    ) -> Dict[str, Any]:
        """
        Return a summary dict covering the whole pipeline or a single run.

        Useful for dashboard rendering and end-of-run reporting.
        """
        c = self._get_conn(conn)

        if run_id:
            run_filter = "WHERE run_id = ?"
            params: tuple = (run_id,)
        else:
            run_filter = ""
            params = ()

        pages_total = c.execute(
            f"SELECT COUNT(*) FROM pages {run_filter}", params  # noqa: S608
        ).fetchone()[0]

        pages_crawled = c.execute(
            f"SELECT COUNT(*) FROM pages WHERE status = 'crawled' "
            f"{'AND run_id = ?' if run_id else ''}",
            params,
        ).fetchone()[0]

        entity_count = c.execute("SELECT COUNT(*) FROM entities").fetchone()[0]
        cluster_count = c.execute("SELECT COUNT(*) FROM entity_clusters").fetchone()[0]
        lead_count = c.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
        report_count = c.execute("SELECT COUNT(*) FROM reports").fetchone()[0]

        qualified_leads = c.execute(
            "SELECT COUNT(*) FROM leads WHERE qualification_status = 'qualified'"
        ).fetchone()[0]

        avg_score_row = c.execute(
            "SELECT AVG(lead_score) FROM leads WHERE lead_score > 0"
        ).fetchone()
        avg_lead_score = round(avg_score_row[0], 4) if avg_score_row[0] else 0.0

        avg_fact_row = c.execute(
            "SELECT AVG(factuality_score) FROM reports WHERE factuality_score IS NOT NULL"
        ).fetchone()
        avg_factuality = round(avg_fact_row[0], 4) if avg_fact_row[0] else 0.0

        return {
            "pages_total": pages_total,
            "pages_crawled": pages_crawled,
            "entities": entity_count,
            "clusters": cluster_count,
            "leads": lead_count,
            "qualified_leads": qualified_leads,
            "avg_lead_score": avg_lead_score,
            "reports": report_count,
            "avg_factuality": avg_factuality,
        }


# =========================================================================
# CLI smoke test
# =========================================================================

if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")

    db_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB_PATH
    repo = ScrapusRepository(db_path)

    print(f"Repository opened: {db_path}")
    print(f"Table stats: {repo.get_table_stats()}")
    print(f"Pipeline summary: {repo.get_pipeline_summary()}")

    repo.close()
