"""
sqlite_schema.py
Complete SQLite OLTP schema for Scrapus B2B lead-generation pipeline.

This is the primary structured data store that ALL pipeline modules read/write.
Optimized for Apple M1 16GB: WAL mode, mmap 256MB, tuned cache and journal.

Tables:
  - pages:                Crawled web pages with RL priority scores
  - entities:             Extracted named entities (NER output)
  - entity_clusters:      Resolved entity clusters (canonical forms)
  - entity_cluster_members: Cluster membership with similarity scores
  - leads:                Scored leads with conformal prediction bounds
  - lead_features:        Feature vectors for lead scoring models
  - reports:              Generated lead reports with factuality metrics
  - domains:              Domain-level crawl metadata and rate limiting
  - pipeline_runs:        Pipeline execution metadata per run
  - graph_edges:          Entity relationship graph for LightGraphRAG
  - schema_migrations:    Migration version tracking

Author: Scrapus Pipeline
Target: Apple M1 16GB, SQLite 3.45+, WAL mode
"""

from __future__ import annotations

import sqlite3
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default paths
# ---------------------------------------------------------------------------
DEFAULT_DB_DIR = "scrapus_data"
DEFAULT_DB_PATH = f"{DEFAULT_DB_DIR}/scrapus.db"

# ---------------------------------------------------------------------------
# M1-optimised PRAGMAs
# ---------------------------------------------------------------------------
M1_PRAGMAS = [
    # WAL mode: concurrent reads during writes, critical for pipeline stages
    "PRAGMA journal_mode = WAL;",
    # 256 MB mmap — keeps hot pages in virtual memory without malloc
    "PRAGMA mmap_size = 268435456;",
    # -32768 = 32768 pages * 4 KB = 128 MB page-cache (negative = KB value)
    "PRAGMA cache_size = -131072;",
    # Limit WAL file growth: 64 MB before checkpoint
    "PRAGMA journal_size_limit = 67108864;",
    # Synchronous NORMAL: safe with WAL, 2x faster than FULL
    "PRAGMA synchronous = NORMAL;",
    # Foreign key enforcement
    "PRAGMA foreign_keys = ON;",
    # Store temp tables in memory (faster sorts / GROUP BY)
    "PRAGMA temp_store = MEMORY;",
    # Busy timeout 5 s — lets concurrent pipeline stages wait gracefully
    "PRAGMA busy_timeout = 5000;",
    # Auto-checkpoint every 1000 WAL pages (~4 MB)
    "PRAGMA wal_autocheckpoint = 1000;",
]


# =========================================================================
# Schema version — bump on every migration
# =========================================================================
CURRENT_SCHEMA_VERSION = 1


# =========================================================================
# CREATE TABLE statements
# =========================================================================

SQL_CREATE_SCHEMA_MIGRATIONS = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    applied_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
    checksum    TEXT
);
"""

SQL_CREATE_PAGES = """
CREATE TABLE IF NOT EXISTS pages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    url             TEXT    NOT NULL UNIQUE,
    domain          TEXT    NOT NULL,
    title           TEXT,
    body_text       TEXT,
    html_hash       TEXT,
    crawl_timestamp REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    status          TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                            'pending', 'crawled', 'failed', 'skipped', 'robots_blocked'
                        )),
    http_status     INTEGER,
    depth           INTEGER NOT NULL DEFAULT 0,
    rl_priority_score REAL  DEFAULT 0.0,
    content_length  INTEGER,
    language        TEXT,
    run_id          TEXT,
    created_at      REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    updated_at      REAL    NOT NULL DEFAULT (unixepoch('subsec'))
);
"""

SQL_CREATE_ENTITIES = """
CREATE TABLE IF NOT EXISTS entities (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id         INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    entity_type     TEXT    NOT NULL,
    entity_text     TEXT    NOT NULL,
    normalized_text TEXT,
    start_pos       INTEGER,
    end_pos         INTEGER,
    confidence      REAL    NOT NULL DEFAULT 0.0,
    source_model    TEXT    NOT NULL DEFAULT 'unknown',
    metadata_json   TEXT,
    created_at      REAL    NOT NULL DEFAULT (unixepoch('subsec'))
);
"""

SQL_CREATE_ENTITY_CLUSTERS = """
CREATE TABLE IF NOT EXISTS entity_clusters (
    cluster_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_name  TEXT    NOT NULL,
    canonical_type  TEXT    NOT NULL,
    member_count    INTEGER NOT NULL DEFAULT 0,
    avg_confidence  REAL    NOT NULL DEFAULT 0.0,
    metadata_json   TEXT,
    created_at      REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    updated_at      REAL    NOT NULL DEFAULT (unixepoch('subsec'))
);
"""

SQL_CREATE_ENTITY_CLUSTER_MEMBERS = """
CREATE TABLE IF NOT EXISTS entity_cluster_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_id      INTEGER NOT NULL REFERENCES entity_clusters(cluster_id) ON DELETE CASCADE,
    entity_id       INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    similarity_score REAL   NOT NULL DEFAULT 0.0,
    added_at        REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    UNIQUE(cluster_id, entity_id)
);
"""

SQL_CREATE_LEADS = """
CREATE TABLE IF NOT EXISTS leads (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_id            INTEGER REFERENCES entity_clusters(cluster_id) ON DELETE SET NULL,
    company_name          TEXT    NOT NULL,
    contact_info          TEXT,
    domain                TEXT,
    industry              TEXT,
    location              TEXT,
    employee_count        INTEGER,
    lead_score            REAL    NOT NULL DEFAULT 0.0,
    conformal_lower       REAL,
    conformal_upper       REAL,
    qualification_status  TEXT    NOT NULL DEFAULT 'unscored'
                            CHECK (qualification_status IN (
                                'unscored', 'qualified', 'disqualified',
                                'needs_review', 'contacted', 'converted'
                            )),
    scoring_model         TEXT,
    scoring_timestamp     REAL,
    metadata_json         TEXT,
    created_at            REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    updated_at            REAL    NOT NULL DEFAULT (unixepoch('subsec'))
);
"""

SQL_CREATE_LEAD_FEATURES = """
CREATE TABLE IF NOT EXISTS lead_features (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id         INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    feature_name    TEXT    NOT NULL,
    feature_value   REAL    NOT NULL,
    feature_source  TEXT,
    created_at      REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    UNIQUE(lead_id, feature_name)
);
"""

SQL_CREATE_REPORTS = """
CREATE TABLE IF NOT EXISTS reports (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id               INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    report_text           TEXT    NOT NULL,
    report_format         TEXT    NOT NULL DEFAULT 'markdown',
    factuality_score      REAL,
    claim_count           INTEGER,
    verified_claim_count  INTEGER,
    generation_timestamp  REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    generation_latency_ms REAL,
    llm_model             TEXT    NOT NULL,
    llm_config_json       TEXT,
    run_id                TEXT,
    created_at            REAL    NOT NULL DEFAULT (unixepoch('subsec'))
);
"""

SQL_CREATE_DOMAINS = """
CREATE TABLE IF NOT EXISTS domains (
    domain          TEXT    PRIMARY KEY,
    robots_txt      TEXT,
    robots_fetched  REAL,
    last_crawl      REAL,
    crawl_count     INTEGER NOT NULL DEFAULT 0,
    page_count      INTEGER NOT NULL DEFAULT 0,
    avg_priority    REAL    NOT NULL DEFAULT 0.0,
    rate_limit_until REAL,
    rate_limit_reason TEXT,
    sitemap_url     TEXT,
    is_blocked      INTEGER NOT NULL DEFAULT 0,
    metadata_json   TEXT,
    created_at      REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    updated_at      REAL    NOT NULL DEFAULT (unixepoch('subsec'))
);
"""

SQL_CREATE_PIPELINE_RUNS = """
CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id          TEXT    PRIMARY KEY,
    start_time      REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    end_time        REAL,
    status          TEXT    NOT NULL DEFAULT 'running'
                        CHECK (status IN (
                            'running', 'completed', 'failed', 'cancelled'
                        )),
    config_json     TEXT,
    stages_completed TEXT,
    pages_crawled   INTEGER DEFAULT 0,
    entities_found  INTEGER DEFAULT 0,
    leads_scored    INTEGER DEFAULT 0,
    reports_generated INTEGER DEFAULT 0,
    error_message   TEXT,
    peak_memory_mb  REAL,
    created_at      REAL    NOT NULL DEFAULT (unixepoch('subsec'))
);
"""

SQL_CREATE_GRAPH_EDGES = """
CREATE TABLE IF NOT EXISTS graph_edges (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_entity_id    INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id    INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relation_type       TEXT    NOT NULL,
    weight              REAL    NOT NULL DEFAULT 1.0,
    confidence          REAL    NOT NULL DEFAULT 0.0,
    evidence_page_id    INTEGER REFERENCES pages(id) ON DELETE SET NULL,
    metadata_json       TEXT,
    created_at          REAL    NOT NULL DEFAULT (unixepoch('subsec')),
    UNIQUE(source_entity_id, target_entity_id, relation_type)
);
"""


# =========================================================================
# Indexes — tuned for the most frequent pipeline queries
# =========================================================================

SQL_CREATE_INDEXES = [
    # -- pages --
    "CREATE INDEX IF NOT EXISTS idx_pages_domain          ON pages(domain);",
    "CREATE INDEX IF NOT EXISTS idx_pages_status          ON pages(status);",
    "CREATE INDEX IF NOT EXISTS idx_pages_domain_status   ON pages(domain, status);",
    "CREATE INDEX IF NOT EXISTS idx_pages_rl_priority     ON pages(rl_priority_score DESC);",
    "CREATE INDEX IF NOT EXISTS idx_pages_crawl_ts        ON pages(crawl_timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_pages_html_hash       ON pages(html_hash);",
    "CREATE INDEX IF NOT EXISTS idx_pages_run_id          ON pages(run_id);",

    # -- entities --
    "CREATE INDEX IF NOT EXISTS idx_entities_page_id      ON entities(page_id);",
    "CREATE INDEX IF NOT EXISTS idx_entities_type          ON entities(entity_type);",
    "CREATE INDEX IF NOT EXISTS idx_entities_text          ON entities(entity_text);",
    "CREATE INDEX IF NOT EXISTS idx_entities_page_type     ON entities(page_id, entity_type);",
    "CREATE INDEX IF NOT EXISTS idx_entities_confidence    ON entities(confidence DESC);",
    "CREATE INDEX IF NOT EXISTS idx_entities_source_model  ON entities(source_model);",

    # -- entity_clusters --
    "CREATE INDEX IF NOT EXISTS idx_clusters_type          ON entity_clusters(canonical_type);",
    "CREATE INDEX IF NOT EXISTS idx_clusters_name          ON entity_clusters(canonical_name);",

    # -- entity_cluster_members --
    "CREATE INDEX IF NOT EXISTS idx_cluster_members_cluster ON entity_cluster_members(cluster_id);",
    "CREATE INDEX IF NOT EXISTS idx_cluster_members_entity  ON entity_cluster_members(entity_id);",

    # -- leads --
    "CREATE INDEX IF NOT EXISTS idx_leads_cluster_id       ON leads(cluster_id);",
    "CREATE INDEX IF NOT EXISTS idx_leads_score            ON leads(lead_score DESC);",
    "CREATE INDEX IF NOT EXISTS idx_leads_status           ON leads(qualification_status);",
    "CREATE INDEX IF NOT EXISTS idx_leads_score_status     ON leads(lead_score DESC, qualification_status);",
    "CREATE INDEX IF NOT EXISTS idx_leads_domain           ON leads(domain);",
    "CREATE INDEX IF NOT EXISTS idx_leads_company_name     ON leads(company_name);",

    # -- lead_features --
    "CREATE INDEX IF NOT EXISTS idx_lead_features_lead     ON lead_features(lead_id);",
    "CREATE INDEX IF NOT EXISTS idx_lead_features_name     ON lead_features(feature_name);",

    # -- reports --
    "CREATE INDEX IF NOT EXISTS idx_reports_lead_id        ON reports(lead_id);",
    "CREATE INDEX IF NOT EXISTS idx_reports_factuality     ON reports(factuality_score);",
    "CREATE INDEX IF NOT EXISTS idx_reports_run_id         ON reports(run_id);",
    "CREATE INDEX IF NOT EXISTS idx_reports_gen_ts         ON reports(generation_timestamp DESC);",

    # -- domains --
    "CREATE INDEX IF NOT EXISTS idx_domains_last_crawl     ON domains(last_crawl);",
    "CREATE INDEX IF NOT EXISTS idx_domains_rate_limit     ON domains(rate_limit_until);",
    "CREATE INDEX IF NOT EXISTS idx_domains_blocked        ON domains(is_blocked);",

    # -- pipeline_runs --
    "CREATE INDEX IF NOT EXISTS idx_runs_status            ON pipeline_runs(status);",
    "CREATE INDEX IF NOT EXISTS idx_runs_start_time        ON pipeline_runs(start_time DESC);",

    # -- graph_edges --
    "CREATE INDEX IF NOT EXISTS idx_graph_source           ON graph_edges(source_entity_id);",
    "CREATE INDEX IF NOT EXISTS idx_graph_target           ON graph_edges(target_entity_id);",
    "CREATE INDEX IF NOT EXISTS idx_graph_relation         ON graph_edges(relation_type);",
    "CREATE INDEX IF NOT EXISTS idx_graph_source_rel       ON graph_edges(source_entity_id, relation_type);",
    "CREATE INDEX IF NOT EXISTS idx_graph_weight           ON graph_edges(weight DESC);",
]


# =========================================================================
# Triggers — keep denormalised counters consistent
# =========================================================================

SQL_CREATE_TRIGGERS = [
    # --- Auto-update entity_clusters.member_count on member insert ---
    """
    CREATE TRIGGER IF NOT EXISTS trg_cluster_member_insert
    AFTER INSERT ON entity_cluster_members
    BEGIN
        UPDATE entity_clusters
        SET member_count = (
                SELECT COUNT(*) FROM entity_cluster_members
                WHERE cluster_id = NEW.cluster_id
            ),
            avg_confidence = (
                SELECT COALESCE(AVG(e.confidence), 0.0)
                FROM entity_cluster_members ecm
                JOIN entities e ON e.id = ecm.entity_id
                WHERE ecm.cluster_id = NEW.cluster_id
            ),
            updated_at = unixepoch('subsec')
        WHERE cluster_id = NEW.cluster_id;
    END;
    """,

    # --- Auto-update entity_clusters.member_count on member delete ---
    """
    CREATE TRIGGER IF NOT EXISTS trg_cluster_member_delete
    AFTER DELETE ON entity_cluster_members
    BEGIN
        UPDATE entity_clusters
        SET member_count = (
                SELECT COUNT(*) FROM entity_cluster_members
                WHERE cluster_id = OLD.cluster_id
            ),
            avg_confidence = (
                SELECT COALESCE(AVG(e.confidence), 0.0)
                FROM entity_cluster_members ecm
                JOIN entities e ON e.id = ecm.entity_id
                WHERE ecm.cluster_id = OLD.cluster_id
            ),
            updated_at = unixepoch('subsec')
        WHERE cluster_id = OLD.cluster_id;
    END;
    """,

    # --- Auto-update domains.page_count and last_crawl on page insert ---
    """
    CREATE TRIGGER IF NOT EXISTS trg_page_insert_domain
    AFTER INSERT ON pages
    WHEN NEW.status = 'crawled'
    BEGIN
        INSERT INTO domains (domain, crawl_count, page_count, last_crawl)
        VALUES (NEW.domain, 1, 1, NEW.crawl_timestamp)
        ON CONFLICT(domain) DO UPDATE SET
            crawl_count = crawl_count + 1,
            page_count  = page_count + 1,
            last_crawl  = MAX(last_crawl, NEW.crawl_timestamp),
            updated_at  = unixepoch('subsec');
    END;
    """,

    # --- Auto-update pages.updated_at on any page update ---
    """
    CREATE TRIGGER IF NOT EXISTS trg_pages_updated_at
    AFTER UPDATE ON pages
    BEGIN
        UPDATE pages SET updated_at = unixepoch('subsec')
        WHERE id = NEW.id AND updated_at = OLD.updated_at;
    END;
    """,

    # --- Auto-update leads.updated_at on any lead update ---
    """
    CREATE TRIGGER IF NOT EXISTS trg_leads_updated_at
    AFTER UPDATE ON leads
    BEGIN
        UPDATE leads SET updated_at = unixepoch('subsec')
        WHERE id = NEW.id AND updated_at = OLD.updated_at;
    END;
    """,
]


# =========================================================================
# Collected DDL in dependency order
# =========================================================================

ALL_CREATE_TABLES = [
    SQL_CREATE_SCHEMA_MIGRATIONS,
    SQL_CREATE_DOMAINS,
    SQL_CREATE_PIPELINE_RUNS,
    SQL_CREATE_PAGES,
    SQL_CREATE_ENTITIES,
    SQL_CREATE_ENTITY_CLUSTERS,
    SQL_CREATE_ENTITY_CLUSTER_MEMBERS,
    SQL_CREATE_LEADS,
    SQL_CREATE_LEAD_FEATURES,
    SQL_CREATE_REPORTS,
    SQL_CREATE_GRAPH_EDGES,
]


# =========================================================================
# Public API
# =========================================================================

def apply_m1_pragmas(conn: sqlite3.Connection) -> None:
    """Apply M1-optimised PRAGMAs to an open connection."""
    for pragma in M1_PRAGMAS:
        conn.execute(pragma)
    logger.debug("Applied %d M1-optimised PRAGMAs", len(M1_PRAGMAS))


def get_connection(
    db_path: str = DEFAULT_DB_PATH,
    *,
    read_only: bool = False,
    apply_pragmas: bool = True,
) -> sqlite3.Connection:
    """
    Open a connection to the Scrapus OLTP database.

    Args:
        db_path: Path to the SQLite file.
        read_only: Open in read-only mode (URI-based).
        apply_pragmas: Apply M1-tuned PRAGMAs on connect.

    Returns:
        sqlite3.Connection with row_factory = sqlite3.Row.
    """
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if read_only:
        uri = f"file:{path}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
    else:
        conn = sqlite3.connect(str(path))

    conn.row_factory = sqlite3.Row

    if apply_pragmas:
        apply_m1_pragmas(conn)

    return conn


def init_schema(
    conn: sqlite3.Connection,
    *,
    create_indexes: bool = True,
    create_triggers: bool = True,
) -> None:
    """
    Idempotently create all core tables, indexes and triggers.

    This function is safe to call on every application start.

    Args:
        conn: An open SQLite connection (WAL + FK already enabled).
        create_indexes: Also create performance indexes.
        create_triggers: Also install maintenance triggers.
    """
    cursor = conn.cursor()

    # Tables
    for ddl in ALL_CREATE_TABLES:
        cursor.execute(ddl)

    # Indexes
    if create_indexes:
        for idx in SQL_CREATE_INDEXES:
            cursor.execute(idx)

    # Triggers
    if create_triggers:
        for trg in SQL_CREATE_TRIGGERS:
            cursor.execute(trg)

    conn.commit()
    logger.info("SQLite OLTP schema initialised (%d tables, %d indexes, %d triggers)",
                len(ALL_CREATE_TABLES), len(SQL_CREATE_INDEXES), len(SQL_CREATE_TRIGGERS))


def get_schema_version(conn: sqlite3.Connection) -> int:
    """Return the latest applied migration version, or 0 if none."""
    try:
        row = conn.execute(
            "SELECT MAX(version) FROM schema_migrations"
        ).fetchone()
        return row[0] if row and row[0] is not None else 0
    except sqlite3.OperationalError:
        return 0


def verify_schema(conn: sqlite3.Connection) -> dict[str, bool]:
    """
    Verify that all expected tables exist and return a health dict.

    Returns:
        Mapping of table_name -> exists (True/False).
    """
    expected = [
        "schema_migrations", "pages", "entities", "entity_clusters",
        "entity_cluster_members", "leads", "lead_features", "reports",
        "domains", "pipeline_runs", "graph_edges",
    ]
    existing = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    return {t: (t in existing) for t in expected}


def get_table_stats(conn: sqlite3.Connection) -> dict[str, int]:
    """Return row counts for every core table (useful for health checks)."""
    tables = [
        "pages", "entities", "entity_clusters", "entity_cluster_members",
        "leads", "lead_features", "reports", "domains", "pipeline_runs",
        "graph_edges",
    ]
    stats: dict[str, int] = {}
    for t in tables:
        try:
            row = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()  # noqa: S608
            stats[t] = row[0] if row else 0
        except sqlite3.OperationalError:
            stats[t] = -1
    return stats


def get_pragma_report(conn: sqlite3.Connection) -> dict[str, str]:
    """Return a diagnostic snapshot of key PRAGMAs."""
    pragmas = [
        "journal_mode", "mmap_size", "cache_size", "synchronous",
        "foreign_keys", "temp_store", "busy_timeout", "wal_autocheckpoint",
        "page_size", "freelist_count", "page_count",
    ]
    report: dict[str, str] = {}
    for p in pragmas:
        try:
            row = conn.execute(f"PRAGMA {p};").fetchone()
            report[p] = str(row[0]) if row else "N/A"
        except sqlite3.OperationalError:
            report[p] = "ERROR"
    return report


# =========================================================================
# Standalone bootstrap
# =========================================================================

def bootstrap(db_path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """
    One-call convenience: open DB, apply PRAGMAs, create schema.

    Returns:
        Ready-to-use sqlite3.Connection.
    """
    conn = get_connection(db_path)
    init_schema(conn)

    version = get_schema_version(conn)
    if version == 0:
        conn.execute(
            "INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)",
            (CURRENT_SCHEMA_VERSION, "initial_schema"),
        )
        conn.commit()
        logger.info("Recorded initial schema version %d", CURRENT_SCHEMA_VERSION)

    return conn


# =========================================================================
# CLI entry point
# =========================================================================

if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")

    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB_PATH
    conn = bootstrap(path)

    print(f"\nDatabase: {path}")
    print(f"Schema version: {get_schema_version(conn)}")

    print("\nPRAGMA report:")
    for k, v in get_pragma_report(conn).items():
        print(f"  {k:24s} = {v}")

    print("\nSchema verification:")
    for table, ok in verify_schema(conn).items():
        mark = "OK" if ok else "MISSING"
        print(f"  {table:28s} {mark}")

    print("\nTable row counts:")
    for table, count in get_table_stats(conn).items():
        print(f"  {table:28s} {count:>8,d}")

    conn.close()
