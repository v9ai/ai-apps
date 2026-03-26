# Implementation Guide -- Module 0: System Architecture

Consolidated from agent-01 (architecture research) and agent-08 (implementation details).

---

## 1. SQLite Configuration for Graph Workloads

### Connection Setup

Every connection must apply these PRAGMAs before any queries:

```python
import sqlite3
from contextlib import contextmanager

def open_connection(db_path: str, *, readonly: bool = False) -> sqlite3.Connection:
    """Open a configured SQLite connection.

    Args:
        db_path: Path to scrapus.db.
        readonly: If True, open in read-only mode (URI required).

    Returns:
        Configured sqlite3.Connection.

    Raises:
        sqlite3.OperationalError: If the database file is missing or corrupt.
    """
    uri = f"file:{db_path}?mode=ro" if readonly else db_path
    conn = sqlite3.connect(uri, uri=readonly, timeout=10.0)
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA page_size = 4096;")
        conn.execute("PRAGMA cache_size = -2000;")           # ~8 MB
        conn.execute("PRAGMA mmap_size = 268435456;")        # 256 MB
        conn.execute("PRAGMA busy_timeout = 5000;")          # 5 s lock wait
        conn.execute("PRAGMA wal_autocheckpoint = 1000;")    # checkpoint every 1000 pages
        conn.execute("PRAGMA journal_size_limit = 67108864;") # 64 MB max WAL
        conn.row_factory = sqlite3.Row
    except Exception:
        conn.close()
        raise
    return conn
```

### Graph Schema

Adjacency tables with JSON columns. FTS5 for name matching:

```python
def create_graph_schema(conn: sqlite3.Connection) -> None:
    """Create the core graph schema. Idempotent."""
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS companies (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        domain      TEXT UNIQUE NOT NULL,
        industry    TEXT,
        size        TEXT,
        location    TEXT,
        metadata    JSON,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS companies_fts
    USING fts5(name, industry, location, content='companies');

    CREATE TABLE IF NOT EXISTS people (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        name             TEXT NOT NULL,
        email            TEXT UNIQUE,
        title            TEXT,
        company_id       INTEGER REFERENCES companies(id),
        profile_json     JSON,
        confidence_score REAL DEFAULT 0.0,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS edges (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id         INTEGER NOT NULL,
        target_id         INTEGER NOT NULL,
        relationship_type TEXT NOT NULL,
        weight            REAL DEFAULT 1.0,
        metadata          JSON,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, target_id, relationship_type)
    );

    CREATE INDEX IF NOT EXISTS idx_edges_source   ON edges(source_id);
    CREATE INDEX IF NOT EXISTS idx_edges_target   ON edges(target_id);
    CREATE INDEX IF NOT EXISTS idx_edges_type     ON edges(relationship_type);
    CREATE INDEX IF NOT EXISTS idx_people_company ON people(company_id, confidence_score DESC);
    CREATE INDEX IF NOT EXISTS idx_companies_rev  ON companies(json_extract(metadata, '$.revenue_tier'));
    """)
```

### Graph Traversal (Recursive CTE)

Graph depth in this system is shallow (rarely >2 hops), so recursive CTEs are sufficient:

```python
def find_company_connections(
    conn: sqlite3.Connection, company_id: int, max_depth: int = 2
) -> list[sqlite3.Row]:
    """Return companies within max_depth edges of company_id."""
    query = """
    WITH RECURSIVE cg AS (
        SELECT c.id, c.name, 0 AS depth, CAST(c.id AS TEXT) AS path
        FROM companies c WHERE c.id = ?
        UNION ALL
        SELECT
            CASE WHEN e.source_id = cg.id THEN e.target_id ELSE e.source_id END,
            c2.name,
            cg.depth + 1,
            cg.path || '->' || CAST(
                CASE WHEN e.source_id = cg.id THEN e.target_id ELSE e.source_id END AS TEXT)
        FROM cg
        JOIN edges e ON e.source_id = cg.id OR e.target_id = cg.id
        JOIN companies c2 ON c2.id =
            CASE WHEN e.source_id = cg.id THEN e.target_id ELSE e.source_id END
        WHERE cg.depth < ?
    )
    SELECT DISTINCT id, name, depth, path FROM cg ORDER BY depth, name;
    """
    return conn.execute(query, (company_id, max_depth)).fetchall()
```

---

## 2. LanceDB Vector Store

### Schema Definitions

Four tables, each with a purpose-built Arrow schema:

| Table              | Vector dim | Index     | Use case                       |
|--------------------|-----------|-----------|--------------------------------|
| entity_embeddings  | 768       | IVF_PQ    | Siamese entity matching        |
| page_embeddings    | 384       | IVF_PQ    | Crawler state representation   |
| lead_profiles      | 512       | (none)    | ICP similarity                 |
| replay_buffer      | 384       | (none)    | DQN experience tuples          |

```python
import lancedb
import pyarrow as pa

def init_lancedb(path: str) -> lancedb.DBConnection:
    """Create LanceDB tables if they do not exist."""
    db = lancedb.connect(path)

    schemas = {
        "entity_embeddings": pa.schema([
            pa.field("entity_id", pa.int64()),
            pa.field("entity_type", pa.string()),
            pa.field("embedding", pa.list_(pa.float32(), 768)),
            pa.field("source", pa.string()),
            pa.field("confidence", pa.float32()),
            pa.field("metadata", pa.string()),
            pa.field("created_at", pa.timestamp("ms")),
        ]),
        "page_embeddings": pa.schema([
            pa.field("page_id", pa.string()),
            pa.field("url", pa.string()),
            pa.field("domain", pa.string()),
            pa.field("embedding", pa.list_(pa.float32(), 384)),
            pa.field("content_hash", pa.string()),
            pa.field("crawl_depth", pa.int32()),
            pa.field("metadata", pa.string()),
            pa.field("timestamp", pa.timestamp("ms")),
        ]),
        "lead_profiles": pa.schema([
            pa.field("profile_id", pa.string()),
            pa.field("company_id", pa.int64()),
            pa.field("embedding", pa.list_(pa.float32(), 512)),
            pa.field("industry_vector", pa.list_(pa.float32(), 100)),
            pa.field("technology_vector", pa.list_(pa.float32(), 100)),
            pa.field("score", pa.float32()),
            pa.field("qualification_data", pa.string()),
            pa.field("created_at", pa.timestamp("ms")),
        ]),
        "replay_buffer": pa.schema([
            pa.field("episode_id", pa.string()),
            pa.field("state", pa.list_(pa.float32(), 384)),
            pa.field("action", pa.int32()),
            pa.field("reward", pa.float32()),
            pa.field("next_state", pa.list_(pa.float32(), 384)),
            pa.field("done", pa.bool_()),
            pa.field("priority", pa.float32()),
            pa.field("timestamp", pa.timestamp("ms")),
        ]),
    }

    indexes = {
        "entity_embeddings": {"num_partitions": 256, "num_sub_vectors": 16},
        "page_embeddings":   {"num_partitions": 128, "num_sub_vectors": 8},
    }

    for name, schema in schemas.items():
        if name not in db.table_names():
            db.create_table(name, schema=schema, mode="create")
            if name in indexes:
                tbl = db.open_table(name)
                tbl.create_index(
                    "embedding",
                    index_type="IVF_PQ",
                    metric="cosine",
                    **indexes[name],
                )
    return db
```

### Thread Safety

LanceDB is single-writer, readers are thread-safe. In the async pipeline, serialize writes with `asyncio.Lock`:

```python
_lance_write_lock = asyncio.Lock()

async def add_entity_embedding(db, record: dict) -> None:
    async with _lance_write_lock:
        tbl = db.open_table("entity_embeddings")
        tbl.add([record])
```

---

## 3. ChromaDB Document Store

### Collection Configuration

Each collection has tuned HNSW parameters:

| Collection         | construction_ef | M   | ef_search | Purpose                          |
|--------------------|----------------|-----|-----------|----------------------------------|
| page_documents     | 200            | 16  | 200       | Full page profiles + topics      |
| company_documents  | 400            | 32  | 400       | Aggregated company descriptions  |
| topic_vectors      | 100            | 8   | 100       | BERTopic outputs                 |

```python
import chromadb
from chromadb.config import Settings

def init_chromadb(path: str) -> chromadb.ClientAPI:
    client = chromadb.PersistentClient(
        path=path,
        settings=Settings(anonymized_telemetry=False, allow_reset=True),
    )
    collections = {
        "page_documents":    {"hnsw:space": "cosine", "hnsw:construction_ef": 200, "hnsw:M": 16},
        "company_documents": {"hnsw:space": "cosine", "hnsw:construction_ef": 400, "hnsw:M": 32},
        "topic_vectors":     {"hnsw:space": "cosine", "hnsw:construction_ef": 100, "hnsw:M": 8},
    }
    for name, meta in collections.items():
        client.get_or_create_collection(name=name, metadata=meta)
    return client
```

---

## 4. Asyncio Pipeline Pattern

Single-process, asyncio event loop. CPU-bound inference (BERT, Siamese, XGBoost) offloaded to `ProcessPoolExecutor`:

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor
import os

# CPU workers = cores - 1 (leave one for the event loop)
_cpu_pool = ProcessPoolExecutor(max_workers=max(1, os.cpu_count() - 1))

async def run_inference(model_fn, *args):
    """Run a CPU-bound model function in the process pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_cpu_pool, model_fn, *args)
```

### Backpressure via Bounded Queues

```python
class PipelineQueues:
    def __init__(self, max_size: int = 1000):
        self.raw_html   = asyncio.Queue(maxsize=max_size)
        self.extracted   = asyncio.Queue(maxsize=max_size)
        self.resolved    = asyncio.Queue(maxsize=max_size)
        self.leads       = asyncio.Queue(maxsize=max_size)
```

When a queue is full, the producer `await queue.put()` blocks, providing natural backpressure without explicit rate limiting.

---

## 5. Connection Pool Model

SQLite WAL mode allows one writer and many concurrent readers:

```
Writer connection (1)  ──► INSERT/UPDATE/DELETE
Reader connections (4) ──► SELECT only
```

Implementation:

```python
import queue as stdlib_queue

class ConnectionPool:
    def __init__(self, db_path: str, readers: int = 4):
        self.writer = open_connection(db_path, readonly=False)
        self._readers = stdlib_queue.Queue()
        for _ in range(readers):
            self._readers.put(open_connection(db_path, readonly=True))

    @contextmanager
    def read(self):
        conn = self._readers.get()
        try:
            yield conn
        finally:
            self._readers.put(conn)

    @contextmanager
    def write(self):
        yield self.writer
```

---

## 6. Monitoring Queries

### SQLite Health

```sql
-- Database size and fragmentation
SELECT page_count * page_size AS db_bytes,
       freelist_count * page_size AS free_bytes
FROM pragma_page_count(), pragma_page_size(), pragma_freelist_count();

-- WAL size
SELECT * FROM pragma_wal_checkpoint(TRUNCATE);  -- returns: busy, log, checkpointed
```

### LanceDB Health

```python
def lancedb_stats(db) -> dict:
    stats = {}
    for name in db.table_names():
        tbl = db.open_table(name)
        stats[name] = tbl.count_rows()
    return stats
```

### ChromaDB Health

```python
def chromadb_stats(client) -> dict:
    stats = {}
    for col in client.list_collections():
        stats[col.name] = col.count()
    return stats
```

---

## 7. Backup Strategy

All persistence is file-based. Backup with standard filesystem tools:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# SQLite: online backup (safe while writers are active)
sqlite3 scrapus_data/scrapus.db ".backup '$BACKUP_DIR/scrapus.db'"

# LanceDB + ChromaDB: directory copy (pause writes first for consistency)
cp -r scrapus_data/lancedb/  "$BACKUP_DIR/lancedb/"
cp -r scrapus_data/chromadb/ "$BACKUP_DIR/chromadb/"

echo "Backup complete: $BACKUP_DIR"
```

For hot backups of LanceDB/ChromaDB without pausing writes, snapshot the filesystem (ZFS/Btrfs) or use rsync with `--link-dest` for incremental copies.

---

## 8. Key Design Decisions Summary

| Decision                    | Choice                          | Rationale                                           |
|-----------------------------|---------------------------------|-----------------------------------------------------|
| Graph store                 | SQLite adjacency + JSON         | Single file, no server, FTS5, WAL concurrency       |
| Vector store                | LanceDB                        | Arrow-native, on-disk ANN, no server process        |
| Document store              | ChromaDB                       | Collection API, HNSW tuning, BERTopic integration   |
| Queue                       | asyncio.Queue                  | In-process, backpressure via maxsize                 |
| CPU inference               | ProcessPoolExecutor             | GIL bypass for BERT/Siamese/XGBoost                 |
| Write serialization         | asyncio.Lock (LanceDB)         | Single-writer constraint                            |
| WAL checkpoint              | autocheckpoint=1000 + 10m cron | Bound WAL growth, prevent reader lag                 |
| Concurrency                 | 1 writer + 4 readers           | SQLite WAL optimal for read-heavy workload          |
