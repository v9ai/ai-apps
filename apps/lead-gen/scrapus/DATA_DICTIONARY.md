# Scrapus Data Dictionary

Exhaustive schema reference for every storage object in the Scrapus pipeline.
Covers SQLite (scrapus.db, scrapus_metrics.db), LanceDB, and ChromaDB.

---

## 1. SQLite Tables

All tables reside in `scrapus_data/scrapus.db` unless noted otherwise.
Connection PRAGMAs applied on every connection:

```sql
PRAGMA journal_mode       = WAL;
PRAGMA synchronous        = NORMAL;
PRAGMA foreign_keys       = ON;
PRAGMA page_size          = 4096;
PRAGMA cache_size         = -2000;           -- ~8 MB
PRAGMA mmap_size          = 268435456;       -- 256 MB
PRAGMA busy_timeout       = 5000;            -- 5 s
PRAGMA wal_autocheckpoint = 1000;
PRAGMA journal_size_limit = 67108864;        -- 64 MB max WAL
```

Connection pool: 1 writer + 4 readers (read-only URI `?mode=ro`).

---

### 1.1 `companies`

Primary entity table. Authoritative record for every resolved company.

```sql
CREATE TABLE companies (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    normalized_name  TEXT NOT NULL,
    domain           TEXT UNIQUE NOT NULL,
    industry         TEXT,
    size             TEXT,
    location         TEXT,
    founded_year     INTEGER,
    employee_count   INTEGER,
    funding_info     TEXT,            -- JSON: [{"round": "B", "amount": 15000000}]
    description      TEXT,
    lead_score       REAL DEFAULT 0.0,
    lead_confidence  REAL DEFAULT 0.0,
    is_qualified     INTEGER DEFAULT 0,
    external_data    TEXT,            -- JSON: DBpedia/Wikidata enrichment
    metadata         JSON,
    created_at       REAL,
    updated_at       REAL
);
```

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | INTEGER | No | AUTOINCREMENT | Primary key |
| name | TEXT | No | -- | Display name |
| normalized_name | TEXT | No | -- | Lowercase, suffix-stripped ("Inc.", "LLC", etc.) |
| domain | TEXT | No (UNIQUE) | -- | Company website domain |
| industry | TEXT | Yes | NULL | Free-text industry label |
| size | TEXT | Yes | NULL | Company size tier |
| location | TEXT | Yes | NULL | HQ location string |
| founded_year | INTEGER | Yes | NULL | Year founded |
| employee_count | INTEGER | Yes | NULL | Approximate headcount |
| funding_info | TEXT | Yes | NULL | JSON array of funding rounds |
| description | TEXT | Yes | NULL | Company description text |
| lead_score | REAL | No | 0.0 | Ensemble classifier probability |
| lead_confidence | REAL | No | 0.0 | Model confidence in the score |
| is_qualified | INTEGER | No | 0 | 1 if lead_score > 0.85, else 0 |
| external_data | TEXT | Yes | NULL | JSON enrichment from DBpedia/Wikidata |
| metadata | JSON | Yes | NULL | Catch-all JSON (revenue_tier, etc.) |
| created_at | REAL | Yes | -- | Unix timestamp |
| updated_at | REAL | Yes | -- | Unix timestamp |

**Indexes:**

```sql
CREATE INDEX idx_people_company ON people(company_id, confidence_score DESC);
CREATE INDEX idx_companies_rev  ON companies(json_extract(metadata, '$.revenue_tier'));
```

**FTS5 virtual table:**

```sql
CREATE VIRTUAL TABLE companies_fts USING fts5(
    name, description, industry,
    content=companies, content_rowid=id
);
```

**Example row:**

```json
{
  "id": 42,
  "name": "Acme Corp",
  "normalized_name": "acme corp",
  "domain": "acme.com",
  "industry": "cybersecurity",
  "location": "Berlin, DE",
  "founded_year": 2019,
  "employee_count": 120,
  "funding_info": "[{\"round\": \"A\", \"amount\": 10000000}]",
  "lead_score": 0.91,
  "lead_confidence": 0.88,
  "is_qualified": 1,
  "created_at": 1711497600.0,
  "updated_at": 1711584000.0
}
```

**Write:** Module 3 (entity resolution), Module 4 (score writeback).
**Read:** Module 1 (entity existence check), Module 4 (feature assembly), Module 5 (report generation), Module 6 (evaluation).

---

### 1.2 `persons`

People associated with companies.

```sql
CREATE TABLE persons (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    role       TEXT,
    company_id INTEGER REFERENCES companies(id)
);
```

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | INTEGER | No | AUTOINCREMENT | -- |
| name | TEXT | No | -- | -- |
| role | TEXT | Yes | NULL | -- |
| company_id | INTEGER | Yes | NULL | companies(id) |

**Example row:**

```json
{"id": 101, "name": "Jane Doe", "role": "CTO", "company_id": 42}
```

**Write:** Module 3 (entity resolution).
**Read:** Module 5 (report generation).

---

### 1.3 `products`

Products associated with companies.

```sql
CREATE TABLE products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    company_id  INTEGER REFERENCES companies(id),
    description TEXT
);
```

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | INTEGER | No | AUTOINCREMENT | -- |
| name | TEXT | No | -- | -- |
| company_id | INTEGER | Yes | NULL | companies(id) |
| description | TEXT | Yes | NULL | -- |

**Write:** Module 3 (entity resolution).
**Read:** Module 5 (report generation).

---

### 1.4 `edges`

Graph adjacency table replacing Neo4j relationships.

```sql
CREATE TABLE edges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL CHECK(source_type IN ('company','person','product')),
    source_id   INTEGER NOT NULL,
    relation    TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('company','person','product')),
    target_id   INTEGER NOT NULL,
    properties  TEXT,               -- JSON for extra attributes
    source_url  TEXT,               -- provenance: which page this came from
    confidence  REAL DEFAULT 1.0,
    weight      REAL DEFAULT 1.0,
    metadata    JSON,
    created_at  REAL,
    UNIQUE(source_type, source_id, relation, target_type, target_id)
);
```

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | INTEGER | No | AUTOINCREMENT | Primary key |
| source_type | TEXT | No | -- | 'company', 'person', or 'product' |
| source_id | INTEGER | No | -- | FK to the typed entity table |
| relation | TEXT | No | -- | e.g. 'acquired', 'launched', 'works_at' |
| target_type | TEXT | No | -- | 'company', 'person', or 'product' |
| target_id | INTEGER | No | -- | FK to the typed entity table |
| properties | TEXT | Yes | NULL | JSON attributes (date, amount, etc.) |
| source_url | TEXT | Yes | NULL | URL of the page this relation was extracted from |
| confidence | REAL | No | 1.0 | Relation extraction confidence |
| weight | REAL | No | 1.0 | Edge weight for graph traversal |
| metadata | JSON | Yes | NULL | Additional metadata |
| created_at | REAL | Yes | -- | Unix timestamp |

**Indexes:**

```sql
CREATE INDEX idx_edges_composite ON edges(source_type, source_id, relation);
CREATE INDEX idx_edges_reverse   ON edges(target_type, target_id, relation);
CREATE INDEX idx_edges_source    ON edges(source_id);
CREATE INDEX idx_edges_target    ON edges(target_id);
CREATE INDEX idx_edges_type      ON edges(relationship_type);
CREATE INDEX idx_edges_relation  ON edges(relation);
```

**Example row:**

```json
{
  "id": 500,
  "source_type": "company",
  "source_id": 42,
  "relation": "acquired",
  "target_type": "company",
  "target_id": 87,
  "properties": "{\"date\": \"2024-03\", \"amount\": 5000000}",
  "source_url": "https://example.com/acme-acquires-beta",
  "confidence": 0.92,
  "created_at": 1711497600.0
}
```

**View:**

```sql
CREATE VIEW company_relationships AS
SELECT
    c1.name AS source_company,
    c2.name AS target_company,
    e.relation,
    json_extract(e.properties, '$.date') AS relation_date,
    e.confidence
FROM edges e
JOIN companies c1 ON e.source_id = c1.id AND e.source_type = 'company'
JOIN companies c2 ON e.target_id = c2.id AND e.target_type = 'company';
```

**Write:** Module 2 (extraction), Module 3 (entity resolution, edge re-pointing during merges).
**Read:** Module 3 (graph traversal), Module 4 (feature assembly), Module 5 (report generation).

---

### 1.5 `frontier`

Crawler URL frontier queue with priority scheduling.

```sql
CREATE TABLE frontier (
    url        TEXT PRIMARY KEY,
    domain     TEXT,
    q_value    REAL DEFAULT 0.0,
    depth      INTEGER DEFAULT 0,
    status     TEXT DEFAULT 'pending',  -- pending | fetching | done | failed
    created_at REAL,
    fetched_at REAL
);
```

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| url | TEXT | No | -- | Canonicalized URL (primary key) |
| domain | TEXT | Yes | -- | Extracted domain for MAB scheduling |
| q_value | REAL | No | 0.0 | DQN Q-value for priority |
| depth | INTEGER | No | 0 | Hop count from seed URL |
| status | TEXT | No | 'pending' | Lifecycle state |
| created_at | REAL | Yes | -- | Unix timestamp |
| fetched_at | REAL | Yes | NULL | Unix timestamp when fetched |

**Index:**

```sql
CREATE INDEX idx_frontier_priority ON frontier(status, q_value DESC);
```

**Pruning:** Failed URLs older than 7 days are garbage-collected hourly:

```sql
DELETE FROM frontier
WHERE status = 'failed'
  AND created_at < (strftime('%s', 'now') - 7 * 86400);
```

**Example row:**

```json
{
  "url": "https://acme.com/news/launch",
  "domain": "acme.com",
  "q_value": 0.73,
  "depth": 2,
  "status": "pending",
  "created_at": 1711497600.0,
  "fetched_at": null
}
```

**Write:** Module 1 (crawler adds/updates URLs).
**Read:** Module 1 (crawler pops next URL by priority).

---

### 1.6 `domain_stats`

Multi-Armed Bandit domain scheduler statistics.

```sql
CREATE TABLE domain_stats (
    domain        TEXT PRIMARY KEY,
    pages_crawled INTEGER DEFAULT 0,
    leads_found   INTEGER DEFAULT 0,
    reward_sum    REAL DEFAULT 0.0,
    ucb_score     REAL DEFAULT 0.0
);
```

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| domain | TEXT | No | -- | Domain name (primary key) |
| pages_crawled | INTEGER | No | 0 | Total pages crawled for this domain |
| leads_found | INTEGER | No | 0 | Total leads found |
| reward_sum | REAL | No | 0.0 | Cumulative reward |
| ucb_score | REAL | No | 0.0 | UCB1 score, periodically recomputed |

UCB1 formula: `ucb = (reward_sum / pages_crawled) + sqrt(2 * ln(total_pages) / pages_crawled)`

**Example row:**

```json
{
  "domain": "acme.com",
  "pages_crawled": 350,
  "leads_found": 12,
  "reward_sum": 45.3,
  "ucb_score": 0.87
}
```

**Write:** Module 1 (crawler updates after each page).
**Read:** Module 1 (MAB domain selection, blended with DQN Q-value at 0.7/0.3 ratio).

---

### 1.7 `company_facts`

Denormalized fact table for fast LLM prompt building.

```sql
CREATE TABLE company_facts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id   INTEGER REFERENCES companies(id),
    fact_type    TEXT,                -- 'funding', 'acquisition', 'product_launch', 'hiring'
    fact_text    TEXT,                -- "Raised $15M Series B in 2023"
    source_url   TEXT,
    extracted_at REAL
);
```

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | INTEGER | No | AUTOINCREMENT | -- |
| company_id | INTEGER | Yes | NULL | companies(id) |
| fact_type | TEXT | Yes | NULL | Category of the fact |
| fact_text | TEXT | Yes | NULL | Human-readable fact string |
| source_url | TEXT | Yes | NULL | URL provenance |
| extracted_at | REAL | Yes | NULL | Unix timestamp |

**Index:**

```sql
CREATE INDEX idx_facts_company ON company_facts(company_id);
```

**Example row:**

```json
{
  "id": 301,
  "company_id": 42,
  "fact_type": "funding",
  "fact_text": "Raised $10M Series A in 2023",
  "source_url": "https://example.com/acme-funding",
  "extracted_at": 1711497600.0
}
```

**Write:** Module 2 (extraction), Module 3 (entity resolution).
**Read:** Module 5 (report generation prompt assembly).

---

### 1.8 `reward_events`

Asynchronous reward signal from extraction to crawler (multi-process mode).

```sql
CREATE TABLE reward_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    url          TEXT,
    state_vector BLOB,
    reward       REAL,
    consumed     INTEGER DEFAULT 0,
    created_at   REAL
);
```

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | INTEGER | No | AUTOINCREMENT | -- |
| url | TEXT | Yes | NULL | The crawled URL |
| state_vector | BLOB | Yes | NULL | Serialized 448-dim state vector |
| reward | REAL | Yes | NULL | +1.0 (qualified lead), +0.2 (entity found), -0.1 (nothing) |
| consumed | INTEGER | No | 0 | 0 = unread, 1 = consumed by crawler |
| created_at | REAL | Yes | NULL | Unix timestamp |

**Example row:**

```json
{
  "id": 1200,
  "url": "https://acme.com/news/launch",
  "reward": 1.0,
  "consumed": 0,
  "created_at": 1711497600.0
}
```

**Write:** Module 2 (extraction pushes rewards).
**Read:** Module 1 (crawler consumes rewards for replay buffer).

---

### 1.9 `lead_explanations`

Per-lead explainability log for the matching stage.

```sql
CREATE TABLE lead_explanations (
    company_id             INTEGER REFERENCES companies(id),
    siamese_score          REAL,
    ensemble_prob          REAL,
    top_factors            TEXT,      -- JSON: [{"factor": "industry_match", "value": 0.95}, ...]
    xgb_feature_importance TEXT,      -- JSON from XGBoost
    created_at             REAL
);
```

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| company_id | INTEGER | Yes | NULL | companies(id) |
| siamese_score | REAL | Yes | NULL | Cosine similarity to ICP |
| ensemble_prob | REAL | Yes | NULL | Final ensemble probability |
| top_factors | TEXT | Yes | NULL | JSON array of top contributing factors |
| xgb_feature_importance | TEXT | Yes | NULL | JSON of XGBoost feature importances |
| created_at | REAL | Yes | NULL | Unix timestamp |

**Note:** Missing an index on `company_id` (documented production gap).

**Example row:**

```json
{
  "company_id": 42,
  "siamese_score": 0.91,
  "ensemble_prob": 0.93,
  "top_factors": "[{\"factor\": \"industry_match\", \"value\": 0.95}, {\"factor\": \"funding_signal\", \"value\": 0.88}]",
  "created_at": 1711584000.0
}
```

**Write:** Module 4 (lead matching).
**Read:** Module 5 (report generation -- match reasons), Module 6 (evaluation).

---

### 1.10 `lead_reports`

Final LLM-generated lead reports.

```sql
CREATE TABLE lead_reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id      INTEGER REFERENCES companies(id),
    summary_text    TEXT,
    model_used      TEXT,          -- 'gpt-4', 'llama3.1:8b-instruct-q4_K_M'
    prompt_text     TEXT,          -- full prompt for reproducibility
    fact_count      INTEGER,       -- how many facts were in prompt
    word_count      INTEGER,
    validation_json TEXT,          -- full validation result
    created_at      REAL
);
```

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | INTEGER | No | AUTOINCREMENT | -- |
| company_id | INTEGER | Yes | NULL | companies(id) |
| summary_text | TEXT | Yes | NULL | JSON report (summary, key_strengths, etc.) |
| model_used | TEXT | Yes | NULL | LLM backend identifier |
| prompt_text | TEXT | Yes | NULL | Full prompt for audit/reproducibility |
| fact_count | INTEGER | Yes | NULL | Number of facts injected into prompt |
| word_count | INTEGER | Yes | NULL | Word count of generated summary |
| validation_json | TEXT | Yes | NULL | JSON validation pipeline result |
| created_at | REAL | Yes | NULL | Unix timestamp |

**Example row:**

```json
{
  "id": 55,
  "company_id": 42,
  "summary_text": "{\"summary\": \"Acme Corp is a mid-sized...\", \"confidence\": 0.85, ...}",
  "model_used": "llama3.1:8b-instruct-q4_K_M",
  "fact_count": 5,
  "word_count": 62,
  "created_at": 1711584000.0
}
```

**Write:** Module 5 (report generation).
**Read:** Module 6 (evaluation).

---

### 1.11 `pending_rewards` (proposed)

Tracks late-arriving rewards from extraction to crawler replay buffer.
Defined in Module 1 RESEARCH.md as a mitigation for reward delay.

```sql
CREATE TABLE pending_rewards (
    url          TEXT PRIMARY KEY,
    replay_index INTEGER,     -- row in replay_buffer LanceDB table
    crawled_at   REAL,
    reward       REAL DEFAULT NULL,  -- NULL until extraction completes
    resolved_at  REAL DEFAULT NULL
);
```

**Write:** Module 1 (crawler inserts on crawl), Module 2 (extraction patches reward).
**Read:** Module 1 (crawler resolves pending rewards into replay buffer).

---

### 1.12 Monitoring Tables (in `scrapus_data/scrapus_metrics.db`)

#### `stage_timing`

Per-stage latency and memory profiling.

```sql
CREATE TABLE stage_timing (
    id            INTEGER PRIMARY KEY,
    stage         TEXT,
    elapsed_s     REAL,
    mem_before_mb REAL,
    mem_after_mb  REAL,
    ts            TEXT DEFAULT (datetime('now'))
);
```

**Write:** All modules (via `profile_stage()` context manager).
**Read:** Module 6 (P95 regression checks, dashboards).

#### `drift_checks`

Concept drift monitoring snapshots.

```sql
CREATE TABLE drift_checks (
    id           INTEGER PRIMARY KEY,
    ts           TEXT DEFAULT (datetime('now')),
    metrics_json TEXT,
    alert_fired  INTEGER DEFAULT 0
);
```

**Write:** Module 6 (monthly drift detection job).
**Read:** Module 6 (alerting, dashboards).

#### `judge_scores`

LLM-as-judge evaluation of generated reports.

```sql
CREATE TABLE judge_scores (
    id        INTEGER PRIMARY KEY,
    report_id TEXT NOT NULL,
    consensus REAL NOT NULL,
    agreement REAL NOT NULL,
    breakdown TEXT,            -- JSON: per-dimension scores
    ts        TEXT DEFAULT (datetime('now'))
);
```

**Write:** Module 6 (per-report judge evaluation).
**Read:** Module 6 (quality gate, dashboards).

#### `error_propagation`

Causal error propagation analysis per pipeline execution.

```sql
CREATE TABLE error_propagation (
    id            INTEGER PRIMARY KEY,
    execution_id  TEXT NOT NULL,
    cer           REAL NOT NULL,
    eaf           REAL NOT NULL,
    matrix_json   TEXT NOT NULL,  -- JSON: 4x4 propagation matrix
    critical_path TEXT,           -- JSON: highest-weight path
    ts            TEXT DEFAULT (datetime('now'))
);
```

**Write:** Module 6 (per-execution analysis).
**Read:** Module 6 (dashboards, alerting on CER > 0.15).

#### `adversarial_results`

Red-team adversarial testing results.

```sql
CREATE TABLE adversarial_results (
    id               INTEGER PRIMARY KEY,
    test_suite       TEXT NOT NULL,
    robustness_score REAL NOT NULL,
    vulnerabilities  TEXT,         -- JSON: attack vector details
    ts               TEXT DEFAULT (datetime('now'))
);
```

**Write:** Module 6 (adversarial test runs).
**Read:** Module 6 (regression gate, threshold > 0.85).

---

## 2. LanceDB Tables

All tables reside under `scrapus_data/lancedb/`. LanceDB uses Apache Arrow columnar format on disk.

**Thread safety:** Single-writer (serialized via `asyncio.Lock`), concurrent readers.

---

### 2.1 `entity_embeddings`

Siamese network output vectors for entity matching during resolution.

```python
pa.schema([
    pa.field("entity_id",   pa.int64()),
    pa.field("entity_type", pa.string()),
    pa.field("embedding",   pa.list_(pa.float32(), 768)),
    pa.field("source",      pa.string()),
    pa.field("confidence",  pa.float32()),
    pa.field("metadata",    pa.string()),
    pa.field("created_at",  pa.timestamp("ms")),
])
```

| Column | Type | Dimensions | Notes |
|--------|------|------------|-------|
| entity_id | int64 | -- | FK to SQLite companies/persons/products |
| entity_type | string | -- | 'company', 'person', 'product' |
| embedding | float32[] | 768 | Siamese encoder output vector |
| source | string | -- | Origin (e.g. 'ner_extraction', 'enrichment') |
| confidence | float32 | -- | Entity confidence score |
| metadata | string | -- | JSON metadata |
| created_at | timestamp(ms) | -- | Insertion time |

**Note:** Module 3 README also documents a simplified version with 128-dim vectors for the Siamese encoder used in entity resolution. The 768-dim schema is from the system overview; the actual dimension depends on the encoder in use.

**Index configuration:**

```python
{
    "index_type": "IVF_PQ",
    "metric": "cosine",
    "num_partitions": 256,
    "num_sub_vectors": 16
}
```

**Query patterns:**

```python
# Entity existence check (crawler, <1ms)
entity_table.search(candidate_vec).limit(3).to_list()
# Threshold: _distance < 0.15 for soft penalty, < 0.05 for merge

# Entity resolution deep matching
entity_table.search(candidate_vec).limit(5).to_list()
# Threshold: _distance < 0.05 for same-entity match
```

**Write:** Module 3 (entity resolution -- insert/upsert on create/merge).
**Read:** Module 1 (crawler entity existence check), Module 3 (deep matching).

---

### 2.2 `page_embeddings`

Crawler state representation vectors for RL replay and similarity lookups.

```python
pa.schema([
    pa.field("page_id",      pa.string()),
    pa.field("url",          pa.string()),
    pa.field("domain",       pa.string()),
    pa.field("embedding",    pa.list_(pa.float32(), 384)),
    pa.field("content_hash", pa.string()),
    pa.field("crawl_depth",  pa.int32()),
    pa.field("metadata",     pa.string()),
    pa.field("timestamp",    pa.timestamp("ms")),
])
```

| Column | Type | Dimensions | Notes |
|--------|------|------------|-------|
| page_id | string | -- | Unique page identifier |
| url | string | -- | Canonical URL |
| domain | string | -- | Domain of the URL |
| embedding | float32[] | 384 | `all-MiniLM-L6-v2` sentence-transformer output |
| content_hash | string | -- | For dedup detection |
| crawl_depth | int32 | -- | Hop count from seed |
| metadata | string | -- | JSON metadata |
| timestamp | timestamp(ms) | -- | Crawl time |

**Index configuration:**

```python
{
    "index_type": "IVF_PQ",
    "metric": "cosine",
    "num_partitions": 128,
    "num_sub_vectors": 8
}
```

**Query patterns:**

```python
# Similarity-based state lookup
page_table.search(state_vec).limit(10).to_list()
```

**Write:** Module 1 (crawler stores page state on each crawl).
**Read:** Module 1 (similarity lookups for state representation).

---

### 2.3 `lead_profiles`

ICP and candidate company profile vectors for lead matching.

```python
pa.schema([
    pa.field("profile_id",         pa.string()),
    pa.field("company_id",         pa.int64()),
    pa.field("embedding",          pa.list_(pa.float32(), 512)),
    pa.field("industry_vector",    pa.list_(pa.float32(), 100)),
    pa.field("technology_vector",  pa.list_(pa.float32(), 100)),
    pa.field("score",              pa.float32()),
    pa.field("qualification_data", pa.string()),
    pa.field("created_at",         pa.timestamp("ms")),
])
```

| Column | Type | Dimensions | Notes |
|--------|------|------------|-------|
| profile_id | string | -- | 'icp_001' for targets, 'candidate_{id}' for candidates |
| company_id | int64 | -- | FK to SQLite companies table |
| embedding | float32[] | 512 | Main profile embedding |
| industry_vector | float32[] | 100 | Industry-specific sub-vector |
| technology_vector | float32[] | 100 | Technology stack sub-vector |
| score | float32 | -- | Pre-computed score (if available) |
| qualification_data | string | -- | JSON qualification metadata |
| created_at | timestamp(ms) | -- | Insertion time |

**Index configuration:** None (no IVF_PQ -- exact search). For datasets >10K rows, adaptive indexing is applied:

```python
# <10K: exact search
# 10K-100K: IVF_PQ, 256 partitions, 64 sub-vectors, nprobe=10
# >100K: IVF_PQ, 1024 partitions, 32 sub-vectors, nprobe=20
```

**Query patterns:**

```python
# ICP similarity search
lead_profiles.search(icp_vector) \
    .where("profile_type = 'candidate'") \
    .limit(1000) \
    .to_list()
# Similarity = 1.0 - _distance (cosine)
```

**Write:** Module 4 (lead matching -- stores ICP and candidate embeddings).
**Read:** Module 4 (lead matching -- ICP similarity search).

---

### 2.4 `replay_buffer`

DQN experience tuples for Prioritized Experience Replay.

```python
pa.schema([
    pa.field("episode_id",  pa.string()),
    pa.field("state",       pa.list_(pa.float32(), 384)),
    pa.field("action",      pa.int32()),
    pa.field("reward",      pa.float32()),
    pa.field("next_state",  pa.list_(pa.float32(), 384)),
    pa.field("done",        pa.bool_()),
    pa.field("priority",    pa.float32()),
    pa.field("timestamp",   pa.timestamp("ms")),
])
```

| Column | Type | Dimensions | Notes |
|--------|------|------------|-------|
| episode_id | string | -- | Episode identifier |
| state | float32[] | 384 | Page state embedding (or 448 with augmented features) |
| action | int32 | -- | Link index chosen (0-9) |
| reward | float32 | -- | +1.0 / +0.2 / -0.1 / -0.01 |
| next_state | float32[] | 384 | Resulting page state (zeroed if done=True) |
| done | bool | -- | Episode terminal flag |
| priority | float32 | -- | PER priority = (|TD_error| + 1e-6) ^ alpha |
| timestamp | timestamp(ms) | -- | For pruning old experiences |

**Note:** The README documents 448-dim state vectors (384 embedding + 32 URL trigrams + 16 title trigrams + 16 scalar features), while the Arrow schema uses 384. The full 448-dim vector is the combined state representation; the 384-dim `state` field stores the sentence-transformer portion.

**Index configuration:** None (sampled via priority-weighted random selection, not ANN search).

**PER parameters:**
- alpha = 0.6 (prioritization strength)
- beta = 0.4, annealed to 1.0 (importance-sampling correction)
- Capacity = 100,000 tuples (pruned by timestamp when exceeded)

**Query patterns:**

```python
# Priority-weighted batch sampling
batch = replay_table.sample_batch(batch_size=64)

# Approximate sampling via random vector search
replay_table.search(random_vector).limit(64).to_list()
```

**Write:** Module 1 (crawler adds experiences after each step).
**Read:** Module 1 (DQN learner samples batches for training).

---

## 3. ChromaDB Collections

All collections reside under `scrapus_data/chromadb/`.

**Client configuration:**

```python
chromadb.PersistentClient(
    path="scrapus_data/chromadb",
    settings=Settings(anonymized_telemetry=False, allow_reset=True),
)
```

**Embedding model for all collections:** `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions).

---

### 3.1 `page_documents`

Full page profiles with topic vectors and entity metadata.

**HNSW parameters:**

| Parameter | Value |
|-----------|-------|
| `hnsw:space` | cosine |
| `hnsw:construction_ef` | 200 |
| `hnsw:M` | 16 |
| `hnsw:search_ef` | 200 |

**Metadata fields:**

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| url | str | No (unindexed) | Original URL |
| title | str | No (unindexed) | Page title |
| entities_json | str | No (unindexed) | JSON array of extracted entities |
| relations_json | str | No (unindexed) | JSON array of extracted relations |
| topics_json | str | No (unindexed) | JSON topic distribution + BERTopic phrases |
| crawl_timestamp | float | No (unindexed) | Unix timestamp |
| has_org_entity | bool | Yes (indexed) | True if any ORG entity was extracted |
| domain | str | Yes (indexed) | Domain of the source page |
| crawl_date | date | Yes (indexed) | Date for freshness filtering |

**Document field:** First 2000 characters of clean extracted text.

**Embedding:** 384-dim float32 from `all-MiniLM-L6-v2`.

**ID:** `url_hash` (SHA hash of the canonical URL).

**Query patterns:**

```python
# Deduplication check (distance < 0.05 = near-duplicate)
page_collection.query(
    query_embeddings=[content_embedding],
    n_results=5,
    where={"domain": domain},
    include=["metadatas", "distances"],
)

# Context retrieval for report generation
page_collection.query(
    query_texts=[company_name],
    n_results=5,
    where={"has_org_entity": True},
    include=["documents", "metadatas", "distances"],
)
```

**Write:** Module 2 (extraction -- upsert after page profile creation).
**Read:** Module 2 (deduplication), Module 5 (report generation context retrieval).

---

### 3.2 `company_documents`

Aggregated company descriptions for entity-level similarity search.

**HNSW parameters:**

| Parameter | Value |
|-----------|-------|
| `hnsw:space` | cosine |
| `hnsw:construction_ef` | 400 |
| `hnsw:M` | 32 |
| `hnsw:search_ef` | 400 |

Higher construction quality than `page_documents` because entity resolution recall matters more (fewer documents, higher cost of a miss).

**Metadata fields:**

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| industry | str | Yes | For industry-filtered queries |
| company_id | int | No | FK to SQLite companies |

**Document field:** Aggregated company description text.

**Embedding:** 384-dim float32 from `all-MiniLM-L6-v2`.

**Query patterns:**

```python
# Similar companies by industry
company_collection.query(
    query_embeddings=[company_embedding],
    n_results=5,
    where={"industry": {"$eq": "cybersecurity"}},
)
```

**Write:** Module 3 (entity resolution -- after company creation/update).
**Read:** Module 5 (report generation -- supplementary context when facts are sparse).

---

### 3.3 `topic_vectors`

BERTopic cluster outputs (UMAP + HDBSCAN + c-TF-IDF).

**HNSW parameters:**

| Parameter | Value |
|-----------|-------|
| `hnsw:space` | cosine |
| `hnsw:construction_ef` | 100 |
| `hnsw:M` | 8 |
| `hnsw:search_ef` | 100 |

Lower values because the collection is small and queries are frequent.

**BERTopic parameters:**

| Parameter | Value |
|-----------|-------|
| `min_cluster_size` | 15 |
| `min_samples` | 5 |
| HDBSCAN metric | euclidean |
| `nr_topics` | 30 |
| UMAP `n_neighbors` | 15 |
| UMAP `n_components` | 5 |
| UMAP `min_dist` | 0.0 |
| UMAP metric | cosine |

**Embedding:** 384-dim float32 from `all-MiniLM-L6-v2`.

**Write:** Module 2 (extraction -- BERTopic output storage).
**Read:** Module 4 (lead matching -- topic similarity features).

---

## 4. Data Flow Matrix

| Source Module | Storage | Target Module | Operation | Description |
|---------------|---------|---------------|-----------|-------------|
| Module 1 (Crawler) | LanceDB `page_embeddings` | Module 1 | write | Store page state vector on each crawl |
| Module 1 (Crawler) | LanceDB `replay_buffer` | Module 1 | write/read | Store RL experiences; sample batches for DQN training |
| Module 1 (Crawler) | LanceDB `entity_embeddings` | Module 1 | read (ANN) | Entity existence check before following links |
| Module 1 (Crawler) | SQLite `frontier` | Module 1 | write/read | URL priority queue management |
| Module 1 (Crawler) | SQLite `domain_stats` | Module 1 | write/read | MAB domain scheduler statistics |
| Module 1 (Crawler) | asyncio.Queue | Module 2 | write | Push raw HTML to extraction queue |
| Module 2 (Extraction) | ChromaDB `page_documents` | Module 2 | write | Store page profiles for dedup |
| Module 2 (Extraction) | ChromaDB `page_documents` | Module 2 | read (search) | Deduplication check before processing |
| Module 2 (Extraction) | ChromaDB `topic_vectors` | Module 2 | write | Store BERTopic outputs |
| Module 2 (Extraction) | SQLite `reward_events` | Module 1 | write | Push reward signal back to crawler |
| Module 2 (Extraction) | asyncio.Queue | Module 3 | write | Push PageProfile downstream |
| Module 3 (Entity Res.) | SQLite `companies` | Module 3 | write | Create/merge company records |
| Module 3 (Entity Res.) | SQLite `persons` | Module 3 | write | Create person records |
| Module 3 (Entity Res.) | SQLite `products` | Module 3 | write | Create product records |
| Module 3 (Entity Res.) | SQLite `edges` | Module 3 | write | Create/re-point edges |
| Module 3 (Entity Res.) | SQLite `company_facts` | Module 3 | write | Insert extracted facts |
| Module 3 (Entity Res.) | LanceDB `entity_embeddings` | Module 3 | write/read | Upsert entity vectors; deep matching search |
| Module 3 (Entity Res.) | ChromaDB `company_documents` | Module 3 | write | Update aggregated company descriptions |
| Module 3 (Entity Res.) | SQLite `companies_fts` | Module 3 | read | FTS name matching during blocking |
| Module 4 (Matching) | SQLite `companies` | Module 4 | read/write | Read profiles for feature assembly; write lead_score back |
| Module 4 (Matching) | SQLite `company_facts` | Module 4 | read | Read facts for feature assembly |
| Module 4 (Matching) | ChromaDB `topic_vectors` | Module 4 | read (search) | Topic cosine similarity feature |
| Module 4 (Matching) | LanceDB `lead_profiles` | Module 4 | write/read | Store ICP + candidate embeddings; ICP similarity search |
| Module 4 (Matching) | SQLite `lead_explanations` | Module 4 | write | Log per-lead explainability data |
| Module 5 (Reports) | SQLite `companies` | Module 5 | read | Core company profile |
| Module 5 (Reports) | SQLite `company_facts` | Module 5 | read | Facts for prompt assembly |
| Module 5 (Reports) | SQLite `persons` | Module 5 | read | Key people for prompt |
| Module 5 (Reports) | SQLite `lead_explanations` | Module 5 | read | Match reasons for prompt |
| Module 5 (Reports) | ChromaDB `page_documents` | Module 5 | read (search) | Supplementary context retrieval |
| Module 5 (Reports) | ChromaDB `company_documents` | Module 5 | read (search) | Industry context when facts are sparse |
| Module 5 (Reports) | SQLite `lead_reports` | Module 5 | write | Store generated reports |
| Module 6 (Evaluation) | SQLite `stage_timing` (metrics db) | Module 6 | write/read | Performance profiling |
| Module 6 (Evaluation) | SQLite `drift_checks` (metrics db) | Module 6 | write/read | Concept drift monitoring |
| Module 6 (Evaluation) | SQLite `judge_scores` (metrics db) | Module 6 | write/read | LLM-as-judge evaluations |
| Module 6 (Evaluation) | SQLite `error_propagation` (metrics db) | Module 6 | write/read | Causal error analysis |
| Module 6 (Evaluation) | SQLite `adversarial_results` (metrics db) | Module 6 | write/read | Red-team test results |
| Module 6 (Evaluation) | All stores | Module 6 | read | Regression tests, smoke tests, health checks |

---

## 5. File System Layout

```
scrapus_data/
├── scrapus.db                      # SQLite -- primary database
│                                   #   tables: companies, persons, products, edges,
│                                   #           company_facts, frontier, domain_stats,
│                                   #           reward_events, lead_explanations,
│                                   #           lead_reports, companies_fts
│                                   #   size: ~50-200 MB at 100K entities
│
├── scrapus_metrics.db              # SQLite -- monitoring/evaluation database
│                                   #   tables: stage_timing, drift_checks,
│                                   #           judge_scores, error_propagation,
│                                   #           adversarial_results
│                                   #   size: ~10-50 MB
│
├── lance_sync_failures.jsonl       # Dead-letter log for failed LanceDB syncs
│                                   #   format: one JSON object per line
│                                   #   alert if size exceeds 1 MB
│
├── lancedb/                        # LanceDB directory (Arrow-native on disk)
│   ├── entity_embeddings/          # 768-dim Siamese vectors
│   │                               #   format: Apache Arrow IPC / Lance columnar
│   │                               #   index: IVF_PQ (256 partitions, 16 sub-vectors)
│   │                               #   size estimate: ~50 MB at 100K entities
│   │
│   ├── page_embeddings/            # 384-dim sentence-transformer vectors
│   │                               #   index: IVF_PQ (128 partitions, 8 sub-vectors)
│   │                               #   size estimate: ~200 MB at 50K pages
│   │
│   ├── lead_profiles/              # 512-dim ICP + candidate profiles
│   │                               #   index: none (exact search) or adaptive IVF_PQ
│   │                               #   size estimate: ~20 MB at 10K profiles
│   │
│   └── replay_buffer/              # 384-dim RL experience tuples
│                                   #   index: none (priority-weighted sampling)
│                                   #   capacity: 100K tuples, pruned by timestamp
│                                   #   size estimate: ~100 MB at capacity
│
├── chromadb/                       # ChromaDB persistent directory
│   │                               #   format: SQLite + HNSW binary index files
│   │                               #   total size estimate: ~500 MB at 50K documents
│   │
│   ├── page_documents/             # Full page profiles + topic vectors
│   │                               #   HNSW: ef_construction=200, M=16, ef_search=200
│   │                               #   embedding: 384-dim, cosine metric
│   │
│   ├── company_documents/          # Aggregated company descriptions
│   │                               #   HNSW: ef_construction=400, M=32, ef_search=400
│   │                               #   embedding: 384-dim, cosine metric
│   │
│   └── topic_vectors/              # BERTopic cluster outputs
│                                   #   HNSW: ef_construction=100, M=8, ef_search=100
│                                   #   embedding: 384-dim, cosine metric
│
└── models/                         # Local model weights
    ├── bert-ner/                    # Fine-tuned BERT NER
    │                               #   format: PyTorch (model.bin + config.json + vocab.txt)
    │                               #   size: ~440 MB (FP32), ~110 MB (INT8 ONNX)
    │                               #   entity types: ORG, PERSON, LOCATION, PRODUCT
    │
    ├── siamese/                    # Siamese network weights
    │                               #   format: PyTorch (.pt)
    │                               #   size: ~50 MB (FP32), ~25 MB (FP16 ONNX)
    │                               #   output: 128-dim L2-normalized embeddings
    │
    ├── xgboost/                    # Ensemble classifier
    │   ├── model.json              #   XGBoost model (primary, weight 0.50)
    │   └── ...                     #   size: ~20 MB total
    │
    ├── logreg/                     # Logistic Regression
    │   └── model.pkl               #   scikit-learn pickle (weight 0.25)
    │
    ├── rf/                         # Random Forest
    │   └── model.pkl               #   scikit-learn pickle (weight 0.25)
    │
    └── dqn/                        # Crawler policy network
        └── policy.pt               #   DQN weights (3-layer MLP: 448->512->256->10)
                                    #   size: ~5 MB
                                    #   reloaded by actor threads every 500 steps
```

**Total disk footprint at 50K pages:** ~2-4 GB (SQLite + LanceDB + ChromaDB + models).

**Peak RAM at runtime:** ~3-5 GB (models ~515 MB FP32, working set 2-4 GB).

---

## Appendix: In-Memory Data Structures

These structures are not persisted but are critical to the data flow:

| Structure | Type | Size | Purpose |
|-----------|------|------|---------|
| asyncio.Queue (raw_html) | asyncio.Queue(maxsize=1000) | Up to 1000 items | Crawler -> Extraction backpressure |
| asyncio.Queue (extracted) | asyncio.Queue(maxsize=1000) | Up to 1000 items | Extraction -> Entity Resolution |
| asyncio.Queue (resolved) | asyncio.Queue(maxsize=1000) | Up to 1000 items | Entity Resolution -> Lead Matching |
| asyncio.Queue (leads) | asyncio.Queue(maxsize=1000) | Up to 1000 items | Lead Matching -> Report Generation |
| reward_queue | queue.Queue | Unbounded | Extraction -> Crawler reward signal (single-process mode) |
| Bloom filter | BloomFilter(1M, 0.001) | ~1.7 MB | URL deduplication in frontier |
| URL hash set | set | Variable | In-memory dedup backing the Bloom filter |
| Frontier heap | min-heap (heapq) | Variable | Priority queue for URL selection |
| robots.txt cache | dict | Variable | Domain -> crawl delay mapping |
| Blocking index | dict | Variable | normalized_name[:4] -> [company_id] |
| Candidate cache | dict (TTL=1h) | Variable | normalized_name -> (match_result, timestamp) |
| DQN policy network | PyTorch nn.Module | ~5 MB | In-memory copy, reloaded from disk every 500 steps |
| DQN target network | PyTorch nn.Module | ~5 MB | Hard-updated from policy every 1000 learner steps |
