# Scrapus Integration Guide

How all seven modules connect, what data flows between them, and what
shared state they depend on.

---

## 1. Module Dependency Graph (ASCII)

```
                          +------------------+
                          | Module 0         |
                          | System Overview  |
                          | (config, stores) |
                          +--------+---------+
                                   |
               provides SQLite PRAGMAs, LanceDB/ChromaDB connections,
               asyncio.Queue factory, ProcessPoolExecutor, file layout
                                   |
       +---------------------------+---------------------------+
       |               |               |               |       |
       v               v               v               v       v
+-------------+  +------------+  +----------+  +--------+  +--------+
| Module 1    |  | Module 2   |  | Module 3 |  | Mod 4  |  | Mod 5  |
| Crawler     |  | Extraction |  | Entity   |  | Lead   |  | Report |
| DQN + MAB   |  | BERT NER   |  | Resolut. |  | Match  |  | Gen    |
+------+------+  +-----+------+  +----+-----+  +---+----+  +---+----+
       |                |              |            |            |
       |   raw HTML     |  PageProfile |  company_id|  company_id|
       +------>---------+              |            |            |
              |                        |            |            |
              | entities+topics        |            |            |
              +----------->------------+            |            |
              |                        |            |            |
              | reward signal          | enriched   |            |
              +------<---------+       | profile    |            |
       +------<--------+       |       +---->-------+            |
       | reward from   |       |                    |            |
       | extraction    |       |                    | score +    |
       |               |       |                    | company_id |
       |               |       |                    +---->-------+
       |               |       |                    |            |
       v               v       v                    v            v
+--------------------------------------------------------------+
|                     Module 6: Evaluation                      |
|  Reads metrics from all stages via SQLite + timing tables     |
+--------------------------------------------------------------+


Data flow (linear pipeline with one feedback loop):

  Module 1          Module 2         Module 3        Module 4        Module 5
  Crawler  -------> Extraction ----> Entity Res. --> Lead Match ---> Report Gen
     ^                  |
     |   reward signal  |
     +------------------+

  Module 6 (Evaluation) reads from all stages; does not produce data consumed
  by other modules.
```

### Data types on each arrow

| Edge | Data type | Dimensions / Fields |
|------|-----------|---------------------|
| 1 -> 2 | raw HTML bytes + URL + crawl metadata | `bytes`, `str`, `int` (depth) |
| 2 -> 3 | `PageProfile` dict | entities `[{name, type, span, confidence}]`, relations, topics, `content_embedding: float32[384]`, `clean_text: str` |
| 2 -> 1 | reward event | `{url: str, state: float32[448], reward: float}` |
| 3 -> 4 | enriched company profile | `company_id: int` (FK into SQLite `companies` table) |
| 4 -> 5 | qualified lead reference | `company_id: int` where `is_qualified = 1` |
| all -> 6 | stage timing + error counts | SQLite `stage_timing` table rows |

---

## 2. Inter-Module Contracts

### 2.1 Module 0 -> All Modules (Infrastructure)

Module 0 is not a pipeline stage. It provides shared infrastructure that all
other modules depend on:

- **SQLite connection** with PRAGMAs applied (`WAL`, `synchronous=NORMAL`, `busy_timeout=5000`, `cache_size=-2000`, `mmap_size=268435456`)
- **LanceDB handle**: `lancedb.connect("scrapus_data/lancedb")`
- **ChromaDB client**: `chromadb.PersistentClient(path="scrapus_data/chromadb")`
- **asyncio.Queue factory**: bounded queues (`maxsize=1000`)
- **ProcessPoolExecutor**: `max_workers=cpu_count - 1`
- **LanceDB write lock**: single `asyncio.Lock` serializing all LanceDB writes

### 2.2 Module 1 -> Module 2 (Crawler -> Extraction)

**Transport**: `asyncio.Queue` (bounded, `maxsize=1000`, in-process). Falls back
to SQLite `reward_events` table in multi-process mode.

**Output contract (Module 1 produces)**:
```python
{
    "raw_html": bytes,           # raw HTTP response body
    "url": str,                  # canonicalized URL (lowercase scheme/host, sorted params, no fragment)
    "url_hash": str,             # SHA-256 hex digest of canonical URL
    "domain": str,               # extracted netloc
    "depth": int,                # hop count from seed (0-5)
    "state_vector": float[448],  # page state embedding for RL reward matching
    "crawl_timestamp": float     # time.time() at fetch
}
```

**Input contract (Module 2 expects)**:
- `raw_html`: non-empty `bytes`. Module 2 performs encoding detection via `chardet`.
- `url`: canonical form. Used as the key for reward feedback and ChromaDB dedup.
- `state_vector`: required for reward event routing back to the replay buffer.

**Error handling**:
- If the queue is full (`maxsize` reached), the crawler blocks until a slot opens. This is the primary backpressure mechanism.
- If Module 2 receives malformed HTML, it skips the document, logs `(url, stage="parse", error=...)`, and pushes `reward = -0.1` back to Module 1.
- If Module 2 extraction yields empty text (< 50 chars after trafilatura), the page is dropped with `reward = -0.1`.

**Backpressure**: Bounded `asyncio.Queue(maxsize=1000)`. When extraction falls behind, the queue fills and crawler coroutines await `queue.put()`, throttling fetch rate. Alerting threshold: warning at 800 items, critical at maxsize.

### 2.3 Module 2 -> Module 3 (Extraction -> Entity Resolution)

**Transport**: In-process function call. Module 2 produces a `PageProfile` dict and passes it directly to Module 3's resolution entry point.

**Output contract (Module 2 produces)**:
```python
{
    "url": str,
    "url_hash": str,                              # SHA-256 hex
    "entities": [
        {
            "name": str,                          # raw span text, e.g. "Acme Corp"
            "type": str,                          # "ORG" | "PERSON" | "LOCATION" | "PRODUCT"
            "span": [int, int],                   # character offsets in clean_text
            "confidence": float                   # softmax probability (thresholds: ORG/PERSON >= 0.75, LOCATION/PRODUCT >= 0.60)
        }
    ],
    "relations": [
        {
            "subj": str,                          # entity name (must match an entities[].name)
            "pred": str,                          # relation label: "launched", "acquired", "joined", "raised", "in"
            "obj": str                            # entity name or free text
        }
    ],
    "topics": {
        "lda_distribution": float[20],            # 20-topic LDA vector, sums to 1.0
        "bertopic_phrases": [str, ...],           # top keywords from BERTopic cluster
        "bertopic_topic_id": int                  # BERTopic cluster ID
    },
    "content_embedding": float[384],              # all-MiniLM-L6-v2 sentence embedding
    "clean_text": str,                            # trafilatura output, truncated to 2000 chars for ChromaDB
    "domain": str,
    "timestamp": float
}
```

**Input contract (Module 3 expects)**:
- `entities` list with at least the `name` and `type` fields present.
- `type` must be one of: `ORG`, `PERSON`, `LOCATION`, `PRODUCT`.
- `relations` may be empty (no relations extracted is valid).
- `content_embedding` must be exactly 384 `float32` values (all-MiniLM-L6-v2 output).

**Error handling**:
- If NER times out (> 30s per document), Module 2 kills inference, logs the timeout, and pushes `reward = -0.1`. No PageProfile is emitted downstream.
- If ChromaDB write fails during Module 2's dedup store, it retries once after 1s, then skips. The PageProfile is still passed to Module 3 (ChromaDB storage is not blocking).
- Module 3 silently creates a new entity if no blocking candidates are found, so empty or sparse extraction still works.

**Backpressure**: None explicit between 2 and 3 -- they run in the same process. CPU saturation in the `ProcessPoolExecutor` (BERT NER) is the implicit throttle.

### 2.4 Module 3 -> Module 4 (Entity Resolution -> Lead Matching)

**Transport**: SQLite table reads. Module 3 writes resolved entities to the
`companies`, `persons`, `products`, `edges`, and `company_facts` tables.
Module 4 reads from these tables by `company_id`.

**Output contract (Module 3 produces)**:
```sql
-- companies row
id:              INTEGER PRIMARY KEY
name:            TEXT NOT NULL
normalized_name: TEXT NOT NULL       -- lowercase, stripped suffixes (Inc., LLC, GmbH)
location:        TEXT | NULL
industry:        TEXT | NULL
founded_year:    INTEGER | NULL
employee_count:  INTEGER | NULL
funding_info:    TEXT | NULL          -- JSON array: [{"round": "B", "amount": 15000000}]
description:     TEXT | NULL
lead_score:      REAL DEFAULT 0.0    -- overwritten by Module 4
lead_confidence: REAL DEFAULT 0.0    -- overwritten by Module 4
is_qualified:    INTEGER DEFAULT 0   -- overwritten by Module 4
external_data:   TEXT | NULL          -- JSON from DBpedia/Wikidata enrichment
created_at:      REAL
updated_at:      REAL

-- edges row (graph relationships)
source_type: TEXT    -- 'company' | 'person' | 'product'
source_id:   INTEGER
relation:    TEXT    -- 'acquired' | 'launched' | 'works_at' | etc.
target_type: TEXT
target_id:   INTEGER
properties:  TEXT    -- JSON for extra attributes
source_url:  TEXT    -- provenance URL

-- company_facts row
company_id:   INTEGER (FK)
fact_type:    TEXT    -- 'funding' | 'acquisition' | 'product_launch' | 'hiring'
fact_text:    TEXT    -- human-readable: "Raised $15M Series B in 2023"
source_url:   TEXT
extracted_at: REAL
```

Additionally, Module 3 writes a 128-dim Siamese embedding per company to the
LanceDB `entity_embeddings` table:
```python
{
    "vector": float[128],       # Siamese encoder output
    "company_id": int,          # FK to SQLite companies.id
    "name": str,
    "normalized_name": str,
    "location": str,
    "industry": str,
    "last_updated": float
}
```

**Input contract (Module 4 expects)**:
- `company_id` that exists in `companies` table.
- `industry`, `employee_count`, `funding_info`, `description` fields are nullable -- Module 4 uses `-1` sentinel for missing numerics and XGBoost's native missing-value handling.
- `company_facts` rows for the company are optional but improve scoring quality.

**Error handling**:
- If Module 3's merge transaction fails (SQLite lock contention beyond `busy_timeout=5000ms`), the merge is retried. If all 3 retries fail, the batch goes to `scrapus_data/lance_sync_failures.jsonl`.
- Module 4 tolerates missing fields. All numeric features default to `-1`; XGBoost handles this via default-direction splits. LogReg and RF use median imputation.

**Backpressure**: Module 4 processes companies on-demand (batch or triggered by new entity creation). SQLite WAL mode allows concurrent reads by Module 4 while Module 3 writes. Single-writer bottleneck caps merge throughput at ~500 merges/sec.

### 2.5 Module 4 -> Module 5 (Lead Matching -> Report Generation)

**Transport**: SQLite table reads. Module 4 writes `lead_score`, `lead_confidence`,
and `is_qualified` back to the `companies` row. Module 5 queries companies where
`is_qualified = 1`.

**Output contract (Module 4 produces)**:
```sql
UPDATE companies SET
    lead_score      = REAL,    -- ensemble probability [0.0, 1.0]
    lead_confidence = REAL,    -- calibrated confidence
    is_qualified    = INTEGER, -- 1 if lead_score > 0.85, else 0
    updated_at      = REAL
WHERE id = ?;
```

Module 4 also writes to the `lead_explanations` table:
```sql
INSERT INTO lead_explanations (
    company_id,
    siamese_score,        -- REAL: cosine similarity to ICP (0.0-1.0)
    ensemble_prob,        -- REAL: final ensemble probability
    top_factors,          -- TEXT (JSON): [{"factor": "industry_match", "value": 0.95}, ...]
    xgb_feature_importance, -- TEXT (JSON): XGBoost feature importances
    created_at
);
```

**Input contract (Module 5 expects)**:
- `company_id` with `is_qualified = 1` in the `companies` table.
- `lead_explanations` row for the company (used for the "why this is a lead" section of the prompt).
- `company_facts` rows (used to populate the "recent events" section).
- `persons` rows linked via `company_id` FK (used for "key people" section).

Module 5 also queries **ChromaDB** `page_documents` collection:
- Query: `query_texts=[company_name]`, `n_results=5`, filtered by `has_org_entity=True`
- Post-retrieval cosine threshold: `> 0.3` (discard below)
- Reranking: by fact overlap score (token intersection / claim tokens)

**Error handling**:
- If a company has no `lead_explanations` row, Module 5 proceeds without the "why this is a lead" section. The prompt still includes company profile and facts.
- If ChromaDB query returns zero results above the 0.3 threshold, Module 5 generates the report using SQLite facts only. ChromaDB context is supplementary.
- LLM generation failure (Ollama down, GPT-4 rate limit) causes the report to be skipped with a log entry. No retry queue exists (production gap).

**Backpressure**: Reports are generated sequentially (one at a time). No parallelism. The LLM call (8.5s median, 28s P99) is the dominant bottleneck. For batch generation of > 100 companies, async batching with rate limiting is needed (production gap).

### 2.6 Module 5 -> Module 6 (Report Generation -> Evaluation)

**Transport**: SQLite table reads. Module 5 writes completed reports to the
`lead_reports` table.

**Output contract (Module 5 produces)**:
```sql
INSERT INTO lead_reports (
    company_id,
    summary_text,      -- TEXT: full JSON report (validated, hallucination-checked)
    model_used,        -- TEXT: 'gpt-4' | 'llama3.1:8b-instruct-q4_K_M'
    prompt_text,       -- TEXT: full prompt for reproducibility
    fact_count,        -- INTEGER: number of facts in prompt
    word_count,        -- INTEGER: word count of summary field
    validation_json,   -- TEXT (JSON): validation pipeline result
    created_at         -- REAL: timestamp
);
```

The JSON report itself conforms to:
```json
{
    "summary": "string (>= 30 words, 3-4 sentences)",
    "key_strengths": ["max 3 items"],
    "growth_indicators": ["max 3 items"],
    "risk_factors": ["max 2 items"],
    "recommended_approach": "string (1 sentence)",
    "confidence": 0.0,
    "sources": ["url1", "url2"]
}
```

**Input contract (Module 6 expects)**:
- `lead_reports` rows for evaluation.
- `stage_timing` rows from all stages (inserted per-stage via `time.perf_counter()` instrumentation).
- Access to SQLite `companies` + `company_facts` for gold-set validation.

**Error handling**: Module 6 is read-only. If data is missing from upstream tables, the corresponding evaluation metric is marked as "insufficient data" rather than failing.

**Backpressure**: Not applicable. Module 6 runs on-demand (batch evaluation or scheduled regression tests), not as a streaming consumer.

---

## 3. Shared State

### 3.1 SQLite Tables Accessed by Multiple Modules

| Table | Writer(s) | Reader(s) | Purpose |
|-------|-----------|-----------|---------|
| `frontier` | Module 1 | Module 1 | URL priority queue (status, q_value, depth) |
| `domain_stats` | Module 1 | Module 1 | UCB1 domain scores (pages_crawled, leads_found, reward_sum) |
| `reward_events` | Module 2 | Module 1 | Async reward delivery (multi-process mode only) |
| `companies` | Module 3 (create/merge), Module 4 (score writeback) | Modules 3, 4, 5, 6 | Core entity table |
| `persons` | Module 3 | Modules 5, 6 | People linked to companies |
| `products` | Module 3 | Module 6 | Products linked to companies |
| `edges` | Module 3 | Modules 4, 5, 6 | Graph relationships |
| `company_facts` | Module 3 | Modules 4, 5, 6 | Denormalized facts for prompt building |
| `companies_fts` | Module 3 (via FTS5 triggers) | Modules 4, 5 | Full-text search on company descriptions |
| `lead_explanations` | Module 4 | Modules 5, 6 | SHAP / feature importance per lead |
| `lead_reports` | Module 5 | Module 6 | Generated report text + metadata |
| `stage_timing` | All modules | Module 6 | Per-stage latency and memory metrics |

All tables live in a single file: `scrapus_data/scrapus.db`.

SQLite concurrency model: WAL mode, 1 writer + 4 readers. Writer serializes
through Python's GIL. Readers never block the writer. `busy_timeout=5000`
handles transient lock contention during checkpoints.

### 3.2 LanceDB Tables Shared Across Modules

All tables live under `scrapus_data/lancedb/`.

| Table | Writer(s) | Reader(s) | Vector dims | Purpose |
|-------|-----------|-----------|-------------|---------|
| `page_embeddings` | Module 1 | Module 1 | 448 (384 sentence-transformer + 64 features) | Crawler state vectors for RL replay |
| `replay_buffer` | Module 1 | Module 1 | 448 (state) + 448 (next_state) | DQN experience tuples (state, action, reward, next_state, done, priority) |
| `entity_embeddings` | Module 3 | Modules 1, 3 | 128 (Siamese encoder) | Entity dedup + crawler "entity exists?" check |
| `lead_profiles` | Module 4 | Module 4 | 128 (Siamese encoder) | ICP + candidate profile vectors for similarity scoring |

LanceDB is single-writer. All writes go through a shared `asyncio.Lock`.
Reads are thread-safe and do not require the lock.

**Critical cross-module dependency**: Module 1 reads `entity_embeddings`
(written by Module 3) to check whether a target page likely discusses an
already-known entity before following a link. The ANN lookup uses a 0.15
cosine distance threshold and applies a soft Q-value penalty (multiply by 0.3)
rather than a hard block.

### 3.3 ChromaDB Collections Shared Across Modules

All collections live under `scrapus_data/chromadb/`.

| Collection | Writer(s) | Reader(s) | Embedding dims | HNSW params |
|------------|-----------|-----------|----------------|-------------|
| `page_documents` | Module 2 | Modules 2, 5 | 384 (all-MiniLM-L6-v2) | ef_construction=200, M=16, ef_search=200, space=cosine |
| `company_documents` | Module 3 | Modules 5, 6 | 384 | ef_construction=400, M=32, ef_search=400, space=cosine |
| `topic_vectors` | Module 2 | Module 4 | 384 | ef_construction=100, M=8, ef_search=100, space=cosine |

**Cross-module usage**:
- Module 2 writes page profiles to `page_documents` and also queries it for deduplication (cosine distance < 0.05 = near-duplicate, skip extraction).
- Module 5 queries `page_documents` with `query_texts=[company_name]` to retrieve supplementary context for report generation.
- Module 4 queries `topic_vectors` to compute `topic_cosine` similarity between a candidate company's topic distribution and the ICP topic distribution.

### 3.4 In-Memory State Shared Across Modules

| State | Loaded by | Used by | Size | Persistence |
|-------|-----------|---------|------|-------------|
| BERT NER weights | Module 2 (startup) | Module 2 | ~440 MB | `scrapus_data/models/bert-ner/` |
| Siamese encoder weights | Module 3, Module 4 (startup) | Modules 3, 4 | ~50 MB | `scrapus_data/models/siamese/` |
| XGBoost + LogReg + RF ensemble | Module 4 (startup) | Module 4 | ~20 MB | `scrapus_data/models/xgboost/model.json`, `logreg/model.pkl`, `rf/model.pkl` |
| DQN policy network | Module 1 (startup) | Module 1 | ~5 MB | `scrapus_data/models/dqn/policy.pt` |
| sentence-transformers/all-MiniLM-L6-v2 | Module 1 (embeddings), Module 2 (ChromaDB + BERTopic) | Modules 1, 2 | ~90 MB | Hugging Face cache or local copy |
| spaCy model | Module 2 (startup) | Module 2 | ~50 MB | spaCy model directory |
| LDA model (20 topics) | Module 2 (startup) | Module 2 | small | Disk, pre-trained |
| BERTopic model | Module 2 (startup) | Module 2 | depends on HDBSCAN state | Disk |
| Bloom filter (URL dedup) | Module 1 (startup) | Module 1 | in-memory | Rebuilt from frontier table on start |

**DQN policy sharing**: The DQN learner thread saves `policy.pt` to disk
periodically (every 1000 steps). Crawler actor threads reload it every 500
steps via filesystem read. No Redis pub/sub required.

---

## 4. Feedback Loops

### 4.1 Extraction -> Crawler Reward Loop

This is the only feedback loop in the pipeline. Module 2 sends a scalar
reward to Module 1 after extracting (or failing to extract) entities from a
crawled page.

**Reward values**:

| Condition | Reward | Frequency |
|-----------|--------|-----------|
| Page yields >= 1 qualified ORG entity matching target profile | +1.0 | ~3% of pages |
| Page contains any ORG entity but not target-qualified | +0.2 | ~12% of pages |
| Page has no relevant entities / extraction failed / empty | -0.1 | ~85% of pages |
| Per-page crawl cost (always applied) | -0.01 | 100% of pages |

**Transport mechanism**:

Single-process mode (default):
```python
reward_queue = queue.Queue()  # Python stdlib, unbounded

# Module 2 pushes:
reward_queue.put({"url": url, "state": state_vec, "reward": 1.0})

# Module 1 consumes (DQN learner thread):
event = reward_queue.get(timeout=1.0)
replay_table.add([{
    "state_vector": event["state"],
    "reward": event["reward"],
    ...
}])
```

Multi-process mode (fallback):
```sql
-- Module 2 writes:
INSERT INTO reward_events (url, state_vector, reward, consumed, created_at)
VALUES (?, ?, ?, 0, ?);

-- Module 1 reads:
SELECT * FROM reward_events WHERE consumed = 0 ORDER BY created_at LIMIT 100;
UPDATE reward_events SET consumed = 1 WHERE id IN (...);
```

**Timing**: Rewards arrive asynchronously. A page crawled at time T may
receive its reward at T + 100ms (NER is fast) to T + several seconds
(if NER batching delays processing). There is no mechanism to match
late-arriving rewards to the correct replay buffer entry (production gap #10
in Module 1). The `url` field in the reward event is used to correlate back
to the original state vector.

**Effect on crawler behavior**:
1. Reward is stored in the LanceDB `replay_buffer` alongside the
   `(state, action, next_state)` transition.
2. The DQN learner samples batches from the replay buffer using Prioritized
   Experience Replay (alpha=0.6, beta annealed 0.4->1.0).
3. Updated Q-values propagate to the `frontier` table's `q_value` column.
4. The MAB domain scheduler updates `domain_stats.reward_sum` and recalculates
   UCB scores.
5. Future URL selection uses the blended score:
   `combined_score = q_value * 0.7 + ucb_score * 0.3`

---

## 5. Startup & Shutdown Sequence

### 5.1 Startup Order

Initialization must follow this order because of data dependencies:

```
Phase 1: Storage initialization (no model loading yet)
  1. Create/open scrapus_data/ directory structure
  2. Open SQLite connection, apply PRAGMAs (WAL, synchronous, foreign_keys, etc.)
  3. Run CREATE TABLE IF NOT EXISTS for all tables (companies, edges, frontier,
     domain_stats, reward_events, company_facts, persons, products, lead_explanations,
     lead_reports, stage_timing, companies_fts)
  4. Connect LanceDB: lancedb.connect("scrapus_data/lancedb")
  5. Create or open LanceDB tables: entity_embeddings, page_embeddings, replay_buffer,
     lead_profiles
  6. Connect ChromaDB: PersistentClient(path="scrapus_data/chromadb")
  7. Create or open ChromaDB collections: page_documents, company_documents, topic_vectors

Phase 2: Model loading (stores must be ready)
  8. Load sentence-transformers/all-MiniLM-L6-v2  (shared by Modules 1, 2)
  9. Load BERT NER weights from scrapus_data/models/bert-ner/  (Module 2)
 10. Load spaCy model  (Module 2)
 11. Load LDA + BERTopic models  (Module 2)
 12. Load Siamese encoder from scrapus_data/models/siamese/  (Modules 3, 4)
 13. Load XGBoost, LogReg, RF from scrapus_data/models/  (Module 4)
 14. Load DQN policy from scrapus_data/models/dqn/policy.pt  (Module 1)

Phase 3: Runtime setup (models must be loaded)
 15. Initialize ProcessPoolExecutor(max_workers=cpu_count - 1)
 16. Create asyncio.Queue instances (crawler->extraction: maxsize=1000)
 17. Create asyncio.Lock for LanceDB writes
 18. Initialize Bloom filter for URL dedup from frontier table
 19. Seed frontier if empty (Bing/Google search API -> initial URLs)
 20. Start DQN learner thread (reads replay_buffer, writes policy.pt)
 21. Start MAB domain scheduler (reads/writes domain_stats)
 22. Start crawler coroutines (reads frontier, writes raw HTML to queue)
 23. Start extraction workers (reads queue, writes to ChromaDB + reward_queue)
 24. Verify Ollama is running (if using local LLM) or OpenAI API key is set
```

**Critical ordering constraints**:
- SQLite must be initialized before LanceDB and ChromaDB (some tables reference each other via FK).
- Models must be loaded before ProcessPoolExecutor submits work (model weights are shared via fork).
- The Bloom filter must be rebuilt from the frontier table before crawlers start (otherwise duplicate URLs enter the queue).
- DQN policy must be loaded before crawler threads start scoring URLs.

### 5.2 Graceful Shutdown

**NOTE**: Graceful shutdown is a production gap (Module 0, gap #1). The
following is the intended protocol:

```
Signal: SIGTERM or SIGINT received

Phase 1: Stop accepting new work
  1. Set asyncio.Event (shutdown_event)
  2. Stop crawler coroutines (finish current fetch, do not start new ones)
  3. Stop DQN learner thread (finish current training step)

Phase 2: Drain in-flight work
  4. Wait for extraction queue to drain (with timeout: 30s)
  5. Wait for any in-flight Module 3 merges to complete
  6. Wait for any in-flight Module 4 scoring to complete
  7. Wait for any in-flight Module 5 LLM generation to complete (with timeout: 60s)

Phase 3: Persist state
  8. Save DQN policy checkpoint: torch.save(q_network.state_dict(), "policy.pt")
  9. Flush LanceDB replay buffer (ensure all appended rows are persisted)
 10. Run SQLite PRAGMA wal_checkpoint(TRUNCATE) to flush WAL to main database
 11. Close ChromaDB client (ensures persistence flush)
 12. Close LanceDB connection
 13. Close SQLite connection

Phase 4: Cleanup
 14. Shutdown ProcessPoolExecutor (wait=True)
 15. Exit
```

**Crash recovery** (unclean shutdown):
- SQLite WAL mode provides automatic recovery on next open.
- LanceDB Arrow files are append-only; partial writes may lose the last batch.
- ChromaDB `PersistentClient` does not guarantee fsync; last few inserts may be lost.
- DQN policy: the last saved `policy.pt` is used; any training since the last checkpoint is lost.

---

## 6. Configuration Propagation

### 6.1 Embedding Dimensions (Must Match Across Modules)

| Constant | Value | Used by | Impact of mismatch |
|----------|-------|---------|-------------------|
| Sentence-transformer embedding dim | **384** | Module 1 (page state, first 384 of 448), Module 2 (ChromaDB page embeddings, BERTopic), Module 5 (ChromaDB queries) | LanceDB schema error, ChromaDB query failure |
| Full crawler state dim | **448** | Module 1 (DQN input/output, replay buffer, frontier scoring) | DQN forward pass crash |
| Siamese encoder output dim | **128** | Module 3 (entity_embeddings), Module 4 (lead_profiles, ICP encoding) | LanceDB search returns wrong distances |
| LDA topic count | **20** | Module 2 (topic modeling), Module 4 (topic_cosine feature) | Feature vector length mismatch in ensemble |
| BERTopic target topics | **30** | Module 2 | Internal to Module 2, no cross-module impact |
| Location embedding dim | **16** | Module 4 (Siamese training), Module 4 (feature vector) | Internal to Module 4 |

**Single source of truth**: These dimensions are currently hardcoded in each
module's code. There is no shared config file. A future improvement would
extract them to `scrapus_data/config.json` or a Python constants module.

### 6.2 Thresholds That Affect Multiple Modules

| Threshold | Value | Set by | Consumed by | Effect |
|-----------|-------|--------|-------------|--------|
| Entity existence ANN distance | 0.15 | Module 1 | Module 1 (crawler Q-value penalty) | Controls how aggressively the crawler avoids re-visiting known entities |
| ChromaDB dedup cosine distance | 0.05 | Module 2 | Module 2 (skip extraction if near-duplicate) | Trades extraction compute for dedup coverage |
| Entity resolution cosine distance | 0.05 | Module 3 | Module 3 (merge threshold) | False merges corrupt the KG; false splits create duplicates |
| Lead qualification probability | 0.85 | Module 4 | Modules 4, 5, 6 | Determines how many companies enter the report generation stage |
| ChromaDB retrieval cosine threshold | 0.3 | Module 5 | Module 5 (post-retrieval filter) | Controls quality of supplementary context for reports |
| Hallucination token overlap | 0.5 | Module 5 | Module 5 (claim verification) | Trades false-positive flagging vs hallucination catch rate |

### 6.3 Model File Paths

All models are stored under `scrapus_data/models/`:

```
scrapus_data/models/
  bert-ner/           # BERT NER weights (~440 MB) -- Module 2
  siamese/            # Siamese encoder (~50 MB)   -- Modules 3, 4
  xgboost/model.json  # XGBoost primary (~20 MB)   -- Module 4
  logreg/model.pkl    # Logistic Regression         -- Module 4
  rf/model.pkl        # Random Forest               -- Module 4
  dqn/policy.pt       # DQN policy (~5 MB)          -- Module 1
```

The Siamese encoder is the only model loaded by two different modules (3 and 4).
If the encoder is retrained, both modules must be restarted to pick up new
weights. There is no hot-reload or model versioning mechanism (production gap).

### 6.4 SQLite PRAGMAs (Applied Uniformly)

Every SQLite connection applies these PRAGMAs. Changing any value affects all
modules:

```sql
PRAGMA journal_mode       = WAL;
PRAGMA synchronous        = NORMAL;
PRAGMA foreign_keys       = ON;
PRAGMA page_size          = 4096;
PRAGMA cache_size         = -2000;          -- ~8 MB per connection
PRAGMA mmap_size          = 268435456;      -- 256 MB
PRAGMA busy_timeout       = 5000;           -- 5s wait on lock contention
PRAGMA wal_autocheckpoint = 1000;           -- checkpoint every 1000 pages
PRAGMA journal_size_limit = 67108864;       -- 64 MB max WAL file
```

### 6.5 Queue Sizing

| Queue | maxsize | Producer | Consumer | Overflow behavior |
|-------|---------|----------|----------|-------------------|
| crawler -> extraction | 1000 | Module 1 (crawlers) | Module 2 (extraction workers) | Producer blocks on `put()` |
| reward feedback | unbounded (`queue.Queue()`) | Module 2 | Module 1 (DQN learner) | No limit; memory grows |

The reward queue is unbounded because rewards are small (URL + 448 floats +
scalar) and consumed quickly. The crawler -> extraction queue is bounded to
prevent memory exhaustion from fast crawling outpacing slow NER inference.

### 6.6 Ensemble Weights

The soft voting weights for Module 4's ensemble classifier:

```
final_prob = 0.50 * xgb_prob + 0.25 * lr_prob + 0.25 * rf_prob
```

These were derived via 5-fold cross-validation grid search. Changing them
requires rerunning the grid search on the training set (2,400 labeled companies,
35% positive rate).

### 6.7 DQN-UCB Blended Score

```
combined_score = q_value * 0.7 + ucb_score * 0.3
```

The 0.7/0.3 split maximizes harvest rate (15.2%) while maintaining domain
diversity (820 domains). This weight is internal to Module 1 but indirectly
affects the quality of data flowing into all downstream modules.
