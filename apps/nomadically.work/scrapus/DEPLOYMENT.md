# Scrapus Pipeline -- Deployment & Operations Runbook

Local-first B2B lead generation pipeline. This document covers everything
needed to deploy, configure, operate, and troubleshoot the system on a single
machine.

---

## 1. Prerequisites

### Hardware

| Tier | CPU | RAM | Disk | GPU | Approx Cost |
|------|-----|-----|------|-----|-------------|
| **Minimum** | 4 cores | 16 GB | 50 GB SSD | None | ~$600 |
| **Recommended** | 8+ cores | 32 GB | 500 GB NVMe | RTX 3060+ or Apple Metal | ~$1,500 |
| **Production** | 16+ cores | 64 GB+ | 1 TB+ NVMe | RTX 4090 / A100 | ~$3,000+ |

**Memory breakdown at peak load:**

| Component | RAM |
|-----------|-----|
| BERT NER (FP32) | ~1.2-1.5 GB |
| Siamese network | ~100-200 MB |
| XGBoost + ensemble | ~50-100 MB |
| DQN policy | ~50-100 MB |
| SQLite (cache + mmap) | ~264 MB |
| LanceDB (HNSW index, 100K vectors) | ~200-500 MB |
| ChromaDB (10K documents) | ~200-400 MB |
| Local LLM (Ollama Q4) | ~4-6 GB |
| Python runtime + buffers | ~200-300 MB |
| **Total peak** | **~6.5-9.5 GB** |

On a 16 GB machine there is headroom for the OS. On 8 GB, reduce `mmap_size`
to 64 MB and limit crawl concurrency.

GPU is optional -- it accelerates BERT NER inference (4x with CUDA/Metal) and
local LLM generation but is not required. CPU-only is fully supported.

### Software

| Dependency | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Runtime (asyncio.TaskGroup, tomllib) |
| PyTorch | 2.1+ | BERT NER, Siamese network, DQN |
| Ollama | 0.1.29+ | Local LLM serving (llama3.1:8b) |
| SQLite | 3.45+ | Graph store, metadata, queues (WAL + FTS5 + JSON) |
| LanceDB | 0.6+ | Vector embeddings (Arrow-native, HNSW) |
| ChromaDB | 0.4+ | Document storage, topic vectors |

### Python Dependencies

```
# Core pipeline
spacy>=3.7
transformers>=4.36
sentence-transformers>=2.3
torch>=2.1
xgboost>=2.0
scikit-learn>=1.4
lancedb>=0.6
chromadb>=0.4
trafilatura>=1.8
bertopic>=0.16

# Crawling
aiohttp>=3.9
aiohttp-socks>=0.9    # optional, for proxy support

# Topic modeling
hdbscan>=0.8
umap-learn>=0.5

# Utilities
numpy>=1.26
pyarrow>=14.0
requests>=2.31
apscheduler>=3.10
```

---

## 2. Installation Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd scrapus

# 2. Create and activate virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Download spaCy model
python -m spacy download en_core_web_trf

# 5. Install and start Ollama
# macOS:
brew install ollama
# Linux:
curl -fsSL https://ollama.ai/install.sh | sh

ollama serve &   # starts the Ollama daemon on localhost:11434

# 6. Pull the LLM model
ollama pull llama3.1:8b-instruct-q4_K_M

# 7. Create data directories
mkdir -p scrapus_data/{lancedb,chromadb,models/{bert-ner,siamese,xgboost,dqn,logreg,rf}}

# 8. Initialize SQLite database (see Section 4 for full schema)
sqlite3 scrapus_data/scrapus.db < scripts/init_schema.sql

# 9. Place model weights
#    Copy fine-tuned BERT NER weights into scrapus_data/models/bert-ner/
#    Copy Siamese encoder weights into scrapus_data/models/siamese/
#    Copy XGBoost model.json into scrapus_data/models/xgboost/
#    Copy LogReg model.pkl into scrapus_data/models/logreg/
#    Copy RF model.pkl into scrapus_data/models/rf/
#    Copy DQN policy network into scrapus_data/models/dqn/

# 10. Initialize LanceDB tables (run once)
python scripts/init_lancedb.py

# 11. Initialize ChromaDB collections (run once)
python scripts/init_chromadb.py

# 12. Verify installation
python -m pytest test_smoke.py -v
```

---

## 3. Configuration Reference

All tunable parameters in one place. Grouped by pipeline stage.

### 3.1 Crawler (Module 1)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `max_concurrent` | 10 | 1-50 | Parallel fetch coroutines. Higher = faster crawl, more RAM |
| `epsilon_start` | 1.0 | -- | Initial exploration rate (fully random) |
| `epsilon_end` | 0.01 | 0.001-0.1 | Final exploration rate (near-greedy) |
| `epsilon_decay_steps` | 100,000 | 50K-500K | Steps to anneal epsilon from start to end |
| `dqn_batch_size` | 64 | 32-256 | Training batch size for DQN learner |
| `replay_buffer_max` | 100,000 | 50K-500K | Max tuples in LanceDB replay table; pruned by timestamp |
| `per_alpha` | 0.6 | 0.0-1.0 | Prioritized Experience Replay priority exponent |
| `per_beta_start` | 0.4 | 0.0-1.0 | PER importance sampling start (annealed to 1.0) |
| `dqn_lr` | 3e-4 | 1e-4 to 1e-3 | Adam learning rate for Q-network |
| `gamma` | 0.99 | 0.9-0.999 | Discount factor for future rewards |
| `target_update_freq` | 1,000 | 500-5,000 | Steps between target network sync |
| `dqn_ucb_weight` | 0.7 / 0.3 | -- | DQN Q-value vs UCB score blend (grid-searched) |
| `frontier_prune_days` | 7 | 3-30 | Days before failed URLs are garbage-collected |
| `asyncio_queue_maxsize` | 1,000 | 100-5,000 | Bounded queue between crawler and extraction |

### 3.2 Extraction (Module 2)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `ner_batch_size` | 32 | 8-128 | Documents per NER inference batch. Lower = less RAM |
| `ner_learning_rate` | 2e-5 | 1e-5 to 5e-5 | Fine-tuning learning rate for BERT NER |
| `ner_confidence_floor` | 0.5 | 0.3-0.8 | Drop entities below this confidence |
| `lda_n_topics` | 20 | 10-50 | Number of LDA topics |
| `bertopic_min_cluster_size` | 15 | 5-50 | Minimum documents per topic cluster (HDBSCAN) |
| `bertopic_min_samples` | 5 | 2-20 | HDBSCAN core-point threshold |
| `umap_n_neighbors` | 15 | 5-50 | UMAP neighborhood size for dimension reduction |
| `umap_n_components` | 5 | 2-10 | UMAP target dimensions |
| `umap_min_dist` | 0.0 | 0.0-0.5 | UMAP minimum distance parameter |
| `chunk_size_words` | 500 | 200-1,000 | Trafilatura text chunk size for ChromaDB |
| `chunk_overlap_words` | 100 | 50-200 | Overlap between consecutive chunks |

### 3.3 Entity Resolution (Module 3)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `cosine_threshold` | 0.05 | 0.01-0.20 | LanceDB ANN merge threshold (cosine distance). Lower = stricter |
| `block_size_cap` | 200 | 50-500 | Max candidates per blocking key; random sample if exceeded |
| `siamese_embedding_dim` | 128 | 64-512 | Siamese encoder output dimensionality |
| `location_embedding_dim` | 16 | 8-32 | Learned location vector dimensions |
| `entity_ann_limit` | 5 | 3-20 | Top-k results from LanceDB ANN search per candidate |
| `dbscan_eps` | 0.3 | 0.1-0.5 | DBSCAN clustering epsilon for advanced blocking |
| `dbscan_min_samples` | 2 | 2-10 | DBSCAN minimum samples per cluster |

### 3.4 Lead Matching (Module 4)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `ensemble_weights` | XGB 0.50, LR 0.25, RF 0.25 | sum = 1.0 | Soft voting weights (grid-searched) |
| `qualification_threshold` | 0.85 | 0.70-0.95 | Score above which a lead is qualified |
| `xgb_max_depth` | 6 | 3-10 | XGBoost tree depth |
| `xgb_n_estimators` | 200 | 100-500 | Number of XGBoost trees |
| `xgb_learning_rate` | 0.05 | 0.01-0.3 | XGBoost boosting step size |
| `xgb_subsample` | 0.8 | 0.5-1.0 | XGBoost row sampling rate |
| `xgb_colsample_bytree` | 0.8 | 0.5-1.0 | XGBoost column sampling rate |
| `xgb_reg_lambda` | 1.0 | 0.0-10.0 | L2 regularization |
| `xgb_min_child_weight` | 3 | 1-10 | Minimum sum of instance weight in a child |
| `rf_n_estimators` | 100 | 50-500 | Random Forest tree count |
| `rf_max_depth` | 8 | 4-16 | Random Forest tree depth |
| `lr_C` | 1.0 | 0.01-100 | Logistic Regression regularization strength |
| `siamese_top_k` | 1,000 | 100-5,000 | Candidates retrieved from LanceDB for scoring |

### 3.5 Report Generation (Module 5)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `temperature` | 0.3 | 0.0-1.0 | LLM sampling temperature. Lower = more deterministic |
| `top_p` | 0.9 | 0.5-1.0 | Nucleus sampling cutoff |
| `repeat_penalty` | 1.1 | 1.0-1.5 | Prevents repetitive phrasing |
| `num_predict` / `max_tokens` | 200 | 100-500 | Hard cap on output tokens |
| `top_k_retrieval` | 5 | 3-20 | ChromaDB documents retrieved per lead |
| `cosine_retrieval_threshold` | 0.3 | 0.1-0.5 | Minimum cosine similarity for retrieved docs |
| `max_retries` | 2 | 0-5 | JSON validation retry attempts |
| `ollama_model` | `llama3.1:8b-instruct-q4_K_M` | -- | Local LLM model tag |
| `ollama_endpoint` | `http://localhost:11434` | -- | Ollama API base URL |

### 3.6 SQLite PRAGMAs

| PRAGMA | Default | Rationale |
|--------|---------|-----------|
| `journal_mode` | WAL | Concurrent reads + single writer |
| `synchronous` | NORMAL | Crash-safe with WAL, faster than FULL |
| `foreign_keys` | ON | Referential integrity |
| `page_size` | 4096 | Matches OS page size |
| `cache_size` | -2000 (~8 MB) | Per-connection page cache |
| `mmap_size` | 268435456 (256 MB) | Memory-mapped I/O (reduce to 64 MB on 8 GB systems) |
| `busy_timeout` | 5000 (5 s) | Wait on lock contention before returning BUSY |
| `wal_autocheckpoint` | 1000 | Passive checkpoint every 1,000 pages |
| `journal_size_limit` | 67108864 (64 MB) | Max WAL file size |

### 3.7 ChromaDB Collection Parameters

| Collection | construction_ef | M | ef_search | Purpose |
|------------|----------------|---|-----------|---------|
| page_documents | 200 | 16 | 200 | Full page profiles + topics |
| company_documents | 400 | 32 | 400 | Aggregated company descriptions |
| topic_vectors | 100 | 8 | 100 | BERTopic outputs |

---

## 4. First Run Checklist

- [ ] **Ollama running** -- `curl http://localhost:11434/api/tags` returns a JSON response
- [ ] **LLM model pulled** -- `ollama list` shows `llama3.1:8b-instruct-q4_K_M`
- [ ] **SQLite database initialized** -- run the init SQL below
- [ ] **LanceDB tables created** -- run the init script below
- [ ] **ChromaDB collections created** -- run the init script below
- [ ] **BERT NER model present** -- `ls scrapus_data/models/bert-ner/` shows `config.json`, `pytorch_model.bin`
- [ ] **Siamese model present** -- `ls scrapus_data/models/siamese/` shows weights
- [ ] **XGBoost model present** -- `ls scrapus_data/models/xgboost/model.json`
- [ ] **Seed URLs configured** -- at least 5 seed URLs inserted into the `frontier` table
- [ ] **ICP profile defined** -- at least one ICP vector in the `lead_profiles` LanceDB table
- [ ] **Smoke tests pass** -- `pytest test_smoke.py -v` (all 5 tests green, < 10 min)

### SQLite Init Schema

```sql
-- scrapus_data/scrapus.db
PRAGMA journal_mode       = WAL;
PRAGMA synchronous        = NORMAL;
PRAGMA foreign_keys       = ON;
PRAGMA page_size          = 4096;
PRAGMA cache_size         = -2000;
PRAGMA mmap_size          = 268435456;
PRAGMA busy_timeout       = 5000;
PRAGMA wal_autocheckpoint = 1000;
PRAGMA journal_size_limit = 67108864;

-- Crawler frontier
CREATE TABLE IF NOT EXISTS frontier (
    url TEXT PRIMARY KEY,
    domain TEXT,
    q_value REAL DEFAULT 0.0,
    depth INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',  -- pending | fetching | done | failed
    created_at REAL,
    fetched_at REAL
);
CREATE INDEX IF NOT EXISTS idx_frontier_priority ON frontier(status, q_value DESC);

-- Domain-level MAB statistics
CREATE TABLE IF NOT EXISTS domain_stats (
    domain TEXT PRIMARY KEY,
    pages_crawled INTEGER DEFAULT 0,
    leads_found INTEGER DEFAULT 0,
    reward_sum REAL DEFAULT 0.0,
    ucb_score REAL DEFAULT 0.0
);

-- Entities (companies)
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT,
    industry TEXT,
    location TEXT,
    employee_count INTEGER,
    revenue_estimate REAL,
    founded_year INTEGER,
    description TEXT,
    domain_authority REAL DEFAULT -1,
    linkedin_url TEXT,
    twitter_url TEXT,
    github_url TEXT,
    crunchbase_url TEXT,
    funding_info TEXT,
    metadata TEXT,              -- JSON column
    lead_score REAL,
    lead_confidence REAL,
    is_qualified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_companies_normalized ON companies(normalized_name);
CREATE INDEX IF NOT EXISTS idx_companies_qualified ON companies(is_qualified);

-- Persons linked to companies
CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    name TEXT NOT NULL,
    role TEXT
);
CREATE INDEX IF NOT EXISTS idx_persons_company ON persons(company_id);

-- Facts extracted per company
CREATE TABLE IF NOT EXISTS company_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    fact_type TEXT,
    fact_text TEXT,
    source_url TEXT,
    extracted_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_facts_company ON company_facts(company_id);

-- Graph edges (company-to-company, company-to-person, etc.)
CREATE TABLE IF NOT EXISTS edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    target_id INTEGER,
    source_type TEXT,  -- 'company' | 'person' | 'product'
    target_type TEXT,
    relation TEXT,     -- 'partner' | 'competitor' | 'employs' | etc.
    weight REAL DEFAULT 1.0,
    metadata TEXT       -- JSON
);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id, target_type);

-- Lead explanations (SHAP-based)
CREATE TABLE IF NOT EXISTS lead_explanations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    top_factors TEXT,    -- JSON array of {factor, shap_value, direction}
    created_at TEXT DEFAULT (datetime('now'))
);

-- Generated reports
CREATE TABLE IF NOT EXISTS lead_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    report_json TEXT,        -- full JSON output from LLM
    model_used TEXT,         -- 'gpt-4' | 'llama3.1:8b-instruct-q4_K_M'
    validation_passed INTEGER DEFAULT 0,
    hallucination_score REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Monitoring: per-stage timing
CREATE TABLE IF NOT EXISTS stage_timing (
    id INTEGER PRIMARY KEY,
    stage TEXT,
    elapsed_s REAL,
    mem_before_mb REAL,
    mem_after_mb REAL,
    ts TEXT DEFAULT (datetime('now'))
);

-- Domain authority cache (updated monthly from CommonCrawl)
CREATE TABLE IF NOT EXISTS domain_authority_cache (
    domain TEXT PRIMARY KEY,
    authority_score REAL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Reward events (async feedback from extraction to crawler)
CREATE TABLE IF NOT EXISTS reward_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT,
    reward REAL,
    created_at REAL DEFAULT (strftime('%s', 'now'))
);
```

### LanceDB Init Script

```python
#!/usr/bin/env python3
"""scripts/init_lancedb.py -- Initialize all LanceDB tables."""
import lancedb
import numpy as np

db = lancedb.connect("scrapus_data/lancedb")

# Replay buffer (448-dim state vectors)
db.create_table("replay_buffer", data=[{
    "state_vector": np.zeros(448).tolist(),
    "action_index": 0,
    "reward": 0.0,
    "next_state_vector": np.zeros(448).tolist(),
    "done": False,
    "priority": 1.0,
    "timestamp": 0,
}], mode="overwrite")

# Page embeddings (384-dim sentence-transformer)
db.create_table("page_embeddings", data=[{
    "vector": np.zeros(384).tolist(),
    "url": "seed",
    "domain": "seed",
    "crawl_ts": 0,
}], mode="overwrite")

# Entity embeddings (768-dim Siamese)
db.create_table("entity_embeddings", data=[{
    "vector": np.zeros(768).tolist(),
    "company_id": 0,
    "name": "seed",
    "industry": "seed",
}], mode="overwrite")

# Lead profiles (128-dim Siamese output)
db.create_table("lead_profiles", data=[{
    "vector": np.zeros(128).tolist(),
    "profile_id": "seed",
    "profile_type": "seed",
    "profile_json": "{}",
}], mode="overwrite")

# Delete seed rows
for table_name in db.table_names():
    tbl = db.open_table(table_name)
    # Seed rows remain until real data replaces them -- they are inert

print("LanceDB tables initialized:")
for name in db.table_names():
    tbl = db.open_table(name)
    print(f"  {name}: {tbl.count_rows()} rows")
```

### ChromaDB Init Script

```python
#!/usr/bin/env python3
"""scripts/init_chromadb.py -- Initialize all ChromaDB collections."""
import chromadb

client = chromadb.PersistentClient(path="scrapus_data/chromadb")

collections = {
    "page_documents":    {"hnsw:construction_ef": 200, "hnsw:M": 16, "hnsw:search_ef": 200},
    "company_documents": {"hnsw:construction_ef": 400, "hnsw:M": 32, "hnsw:search_ef": 400},
    "topic_vectors":     {"hnsw:construction_ef": 100, "hnsw:M": 8,  "hnsw:search_ef": 100},
}

for name, metadata in collections.items():
    client.get_or_create_collection(name=name, metadata=metadata)
    print(f"  {name}: created (ef={metadata['hnsw:construction_ef']}, M={metadata['hnsw:M']})")

print("ChromaDB collections initialized.")
```

### Seed URL Insertion

```sql
-- Insert seed URLs into the frontier table
INSERT INTO frontier (url, domain, q_value, depth, status, created_at)
VALUES
    ('https://example-target.com', 'example-target.com', 1.0, 0, 'pending', strftime('%s','now')),
    ('https://crunchbase.com/lists/ai-startups', 'crunchbase.com', 0.9, 0, 'pending', strftime('%s','now')),
    ('https://builtwith.com/top-sites', 'builtwith.com', 0.8, 0, 'pending', strftime('%s','now'));
-- Replace with actual seed URLs relevant to your ICP
```

---

## 5. Operations Runbook

### Daily Operations

| Task | Command / Action | Expected Output |
|------|------------------|-----------------|
| Check crawl progress | `sqlite3 scrapus_data/scrapus.db "SELECT status, COUNT(*) FROM frontier GROUP BY status;"` | pending > 0, done growing |
| Check frontier size | `sqlite3 scrapus_data/scrapus.db "SELECT COUNT(*) FROM frontier WHERE status='pending';"` | Should not be 0 (stall) or growing unboundedly |
| Review lead reports | `sqlite3 scrapus_data/scrapus.db "SELECT COUNT(*), AVG(hallucination_score) FROM lead_reports WHERE date(created_at) = date('now');"` | hallucination_score < 0.15 |
| Check Ollama health | `curl -s http://localhost:11434/api/tags \| python3 -c "import sys,json; print(json.load(sys.stdin))"` | Model list includes llama3.1 |
| Monitor stage latency | `sqlite3 scrapus_data/scrapus.db "SELECT stage, ROUND(AVG(elapsed_s),3) AS avg_s, COUNT(*) FROM stage_timing WHERE ts > datetime('now','-1 day') GROUP BY stage;"` | No stage > 2x baseline P95 |
| Check queue backlog | Monitor `asyncio.Queue.qsize()` in application logs | < 800 items |

### Weekly Operations

| Task | Command / Action | Expected Output |
|------|------------------|-----------------|
| Run regression tests | `pytest test_regression.py -v` | All thresholds pass (see table below) |
| Check data freshness | `sqlite3 scrapus_data/scrapus.db "SELECT domain, ROUND(julianday('now') - julianday(MAX(datetime(fetched_at,'unixepoch'))),1) AS age_days FROM frontier WHERE status='done' GROUP BY domain ORDER BY age_days DESC LIMIT 10;"` | No domain > 30 days stale |
| SQLite WAL checkpoint | `sqlite3 scrapus_data/scrapus.db "PRAGMA wal_checkpoint(TRUNCATE);"` | Returns `0 0 0` (busy, log, checkpointed) |
| SQLite fragmentation | `sqlite3 scrapus_data/scrapus.db "SELECT ROUND(CAST(freelist_count AS REAL) * page_size / (page_count * page_size) * 100, 1) AS frag_pct FROM pragma_page_count(), pragma_page_size(), pragma_freelist_count();"` | < 25%. If > 25%, run VACUUM |
| Backup scrapus_data/ | Run backup script (see Section 7) | Backup directory created with .db + dirs |
| LanceDB row counts | `python3 -c "import lancedb; db=lancedb.connect('scrapus_data/lancedb'); [print(f'{n}: {db.open_table(n).count_rows()}') for n in db.table_names()]"` | All tables > 0 rows, growing |
| ChromaDB collection counts | `python3 -c "import chromadb; c=chromadb.PersistentClient(path='scrapus_data/chromadb'); [print(f'{col.name}: {col.count()}') for col in c.list_collections()]"` | All collections > 0 docs |

**Regression test thresholds (hard-fail):**

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| NER F1 | > 0.90 | Extraction quality floor |
| Lead Precision | > 0.85 | Sales team trusts the output |
| Lead Recall | > 0.80 | Do not miss qualified prospects |
| Report Accuracy | > 0.93 | Factual correctness of summaries |
| Crawl Harvest Rate | > 10% | RL crawler is functioning |

### Monthly Operations

| Task | Action | Notes |
|------|--------|-------|
| Re-evaluate on gold labels | Run pipeline on 50 gold-labelled examples from recent crawls | Alert if any metric drops > 5pp from baseline |
| Review SHAP importance | `python3 scripts/shap_analysis.py` | Check for feature drift; `siamese_similarity` should remain top feature |
| Update seed URLs | Review domain_stats for stale/low-reward domains; add new seeds | Keep frontier diverse |
| Prune old frontier | `DELETE FROM frontier WHERE status IN ('done','failed') AND created_at < strftime('%s','now') - 90*86400;` | Remove entries older than 90 days |
| Update domain authority | Refresh `domain_authority_cache` from latest CommonCrawl CC-MAIN release | Monthly release cycle |
| LanceDB compaction | Compact tables after bulk deletes to reclaim Arrow fragments | `tbl.compact_files()` for each table |
| SQLite VACUUM | `sqlite3 scrapus_data/scrapus.db "VACUUM;"` | Run only if fragmentation > 25% |
| SQLite integrity check | `sqlite3 scrapus_data/scrapus.db "PRAGMA integrity_check;"` | Must return "ok" |

---

## 6. Troubleshooting Guide

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `database is locked` or SQLite BUSY errors | `busy_timeout` too low, or a stuck writer holding the WAL lock | Increase `busy_timeout` to 10000. Check for hung processes with `fuser scrapus_data/scrapus.db`. Kill stuck writers if necessary |
| OOM during NER extraction | `ner_batch_size` too large for available RAM | Reduce `ner_batch_size` to 16 (or 8 on 8 GB systems). Check BERT is not loading multiple copies |
| OOM during report generation | Ollama + BERT + working set exceed RAM | Stop Ollama when not generating reports, or reduce `mmap_size` to 64 MB |
| LanceDB queries slow (> 10 ms) | HNSW index stale after many inserts/deletes | Rebuild the IVF index: `tbl.create_index(metric="cosine", num_partitions=256, num_sub_vectors=96)` |
| Crawler stuck (no progress) | Frontier empty, or all domains are rate-limited | Check `SELECT COUNT(*) FROM frontier WHERE status='pending'`. If 0, add more seed URLs. If all fetching, check for stuck fetchers |
| Harvest rate below 10% | Bad seed URLs, epsilon decayed too fast, or domain mix shifted | Check `domain_stats` for low-reward domains. Consider resetting epsilon temporarily. Add higher-quality seeds |
| LLM hallucinating (low factual accuracy) | Context too sparse, temperature too high, or retrieval returning irrelevant docs | Lower `temperature` to 0.1. Increase `top_k_retrieval` to 10. Check `cosine_retrieval_threshold` is not too permissive |
| LLM returns invalid JSON | Model struggling with structured output | Increase `max_retries` to 3. Add explicit JSON schema in system prompt. Consider switching to GPT-4 for complex leads |
| Ollama not responding | Daemon crashed or not started | `ollama serve &` to restart. Check `ollama ps` for loaded models. Check port 11434 is not blocked |
| Entity resolution creating too many duplicates | `cosine_threshold` too strict (too low) | Increase threshold from 0.05 toward 0.10. Re-run threshold sweep on recent data |
| Entity resolution over-merging | `cosine_threshold` too permissive (too high) | Decrease threshold toward 0.03. Check that location conflict detection is working |
| ChromaDB slow queries | Collection too large, HNSW parameters too low | Increase `ef_search`. Consider migrating to LanceDB unified store |
| Pipeline silently dropping pages | No dead-letter queue (known production gap) | Check application logs for NER exceptions. Monitor `stage_timing` for extraction stage errors |
| WAL file growing unboundedly | Checkpoint not running, or long-running reader blocking checkpoint | Run `PRAGMA wal_checkpoint(TRUNCATE)` manually. Check that no reader connection stays open > 10 min |
| DQN not learning (flat Q-values) | Replay buffer too small, or reward signal not reaching learner | Check `replay_buffer` row count (needs > 10K for meaningful training). Verify `reward_events` table is being populated |
| High false positive rate in leads | Qualification threshold too low, or Siamese embeddings drifted | Raise `qualification_threshold` from 0.85 to 0.90. Re-evaluate Siamese encoder on recent data |
| `ModuleNotFoundError: spacy` or similar | Virtual environment not activated or deps not installed | `source .venv/bin/activate && pip install -r requirements.txt` |

---

## 7. Backup & Recovery

### Full Backup Script

```bash
#!/usr/bin/env bash
# scripts/backup.sh -- Full Scrapus backup
set -euo pipefail

SCRAPUS_DIR="${SCRAPUS_DIR:-scrapus_data}"
BACKUP_ROOT="${BACKUP_ROOT:-backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

echo "[1/4] Backing up SQLite (online backup API)..."
sqlite3 "${SCRAPUS_DIR}/scrapus.db" ".backup '${BACKUP_DIR}/scrapus.db'"

echo "[2/4] Backing up LanceDB directory..."
cp -r "${SCRAPUS_DIR}/lancedb/" "${BACKUP_DIR}/lancedb/"

echo "[3/4] Backing up ChromaDB directory..."
cp -r "${SCRAPUS_DIR}/chromadb/" "${BACKUP_DIR}/chromadb/"

echo "[4/4] Backing up model weights..."
cp -r "${SCRAPUS_DIR}/models/" "${BACKUP_DIR}/models/"

# Calculate total backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Backup complete: ${BACKUP_DIR} (${BACKUP_SIZE})"

# Optional: remove backups older than 30 days
find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true
echo "Old backups (>30 days) pruned."
```

**Usage:**

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh                          # default paths
BACKUP_ROOT=/mnt/external ./scripts/backup.sh  # custom backup location
```

### Point-in-Time Recovery from WAL

SQLite WAL mode provides automatic crash recovery. On startup, SQLite replays
any committed transactions in the WAL file that have not been checkpointed.
No manual intervention is needed -- just restart the pipeline.

If you need to recover from a specific backup:

```bash
# Stop the pipeline
kill $(pgrep -f scrapus_pipeline)

# Restore from backup
BACKUP="backups/20260325_143000"
cp "${BACKUP}/scrapus.db"  scrapus_data/scrapus.db
cp -r "${BACKUP}/lancedb/"  scrapus_data/lancedb/
cp -r "${BACKUP}/chromadb/" scrapus_data/chromadb/

# Verify integrity
sqlite3 scrapus_data/scrapus.db "PRAGMA integrity_check;"
# Must return "ok"

# Restart
python3 -m scrapus_pipeline
```

### LanceDB / ChromaDB Consistency

For consistent backups during active writes, either:

1. **Pause the write lock** momentarily before `cp -r` (application-level).
2. **Filesystem snapshot** -- use ZFS, Btrfs, or APFS snapshot for atomic
   point-in-time copies of the entire `scrapus_data/` directory.

SQLite `.backup` is always safe -- it uses SQLite's own online backup API and
does not require pausing writers.

### Model Checkpoint Versioning

Model weights should be versioned with a simple directory convention:

```
scrapus_data/models/
  bert-ner/
    v1/        <-- initial fine-tuned model
    v2/        <-- re-trained after drift detection
    current -> v2   (symlink)
  siamese/
    v1/
    current -> v1
  xgboost/
    v1/
    current -> v1
```

The pipeline loads from `models/<name>/current/`. Rolling back is a symlink
change:

```bash
cd scrapus_data/models/bert-ner
ln -sfn v1 current   # roll back to v1
```

---

## 8. Monitoring Alerts

### Alert Conditions

| Alert | Metric | Warning | Critical | Response Action |
|-------|--------|---------|----------|-----------------|
| WAL size | SQLite WAL file bytes | > 32 MB | > 60 MB | Run `PRAGMA wal_checkpoint(TRUNCATE)`. If persists, check for long-running readers |
| SQLite fragmentation | freelist ratio | > 15% | > 25% | Schedule `VACUUM` during low-traffic window |
| Queue backlog | `asyncio.Queue.qsize()` | > 800 items | maxsize (1,000) reached | Extraction is bottlenecked. Reduce crawl concurrency or increase extraction workers |
| LanceDB write lock wait | Time waiting for `_lance_write_lock` | > 2 s | > 5 s | Reduce write batch frequency. Check for contention from concurrent embeddings |
| Process pool utilization | Busy workers / total workers | > 80% | 100% (all workers busy) | Increase `ProcessPoolExecutor(max_workers)` or reduce batch sizes |
| Stage latency | P95 of any stage | > 2x baseline P95 | > 5x baseline P95 | Profile the slow stage. Check for resource contention or data size growth |
| Crawl harvest rate | Relevant pages / total pages (rolling 1K) | < 12% | < 10% | Review seed URLs and epsilon. Check domain_stats for degraded domains |
| Frontier depletion | Pending URLs in frontier | < 100 | 0 | Add new seed URLs. Check if crawler is marking too many URLs as failed |
| NER F1 (drift check) | Monthly gold-set evaluation | < 0.92 (from 0.923 baseline) | < 0.90 | Inspect which entity types degraded. Check if source HTML structure changed. Re-fine-tune NER if needed |
| Lead precision drift | Monthly gold-set evaluation | < 0.88 | < 0.85 | Review SHAP feature importance for drift. Check ensemble calibration |
| Report factual accuracy | Hallucination check score | < 0.90 | < 0.85 | Lower LLM temperature. Increase retrieval top_k. Review prompt grounding |
| Disk usage | `scrapus_data/` total size | > 80% of partition | > 90% of partition | Prune old frontier entries, compact LanceDB, archive old backups |
| Ollama health | HTTP health check to `:11434` | Response > 5 s | No response | Restart Ollama daemon. Check system memory pressure |
| Cascade error rate (CER) | Inter-stage error propagation | > 0.13 (baseline) | > 0.20 | Check extraction quality. Add confidence gating between stages |
| Data freshness | Max age per domain | Any domain > 21 days | Any domain > 30 days | Re-crawl stale domains. Check if rate-limited or blocked |

### Monitoring Queries

Run these periodically (via cron or APScheduler) and compare against thresholds:

```bash
# WAL size in bytes
sqlite3 scrapus_data/scrapus.db "SELECT page_count * page_size FROM pragma_wal_checkpoint(PASSIVE), pragma_page_size();"

# Stage timing P95 (last 24 hours)
sqlite3 scrapus_data/scrapus.db "
  SELECT stage,
         ROUND(AVG(elapsed_s), 3) AS avg,
         ROUND(MAX(elapsed_s), 3) AS max
  FROM (
    SELECT stage, elapsed_s,
           NTILE(20) OVER (PARTITION BY stage ORDER BY elapsed_s) AS tile
    FROM stage_timing
    WHERE ts > datetime('now', '-1 day')
  )
  WHERE tile = 19
  GROUP BY stage;
"

# Data freshness per domain
sqlite3 scrapus_data/scrapus.db "
  SELECT domain,
         ROUND(julianday('now') - julianday(MAX(datetime(fetched_at, 'unixepoch'))), 1) AS age_days
  FROM frontier
  WHERE status = 'done'
  GROUP BY domain
  HAVING age_days > 21
  ORDER BY age_days DESC
  LIMIT 20;
"

# Crawl harvest rate (last 1,000 pages)
sqlite3 scrapus_data/scrapus.db "
  SELECT ROUND(
    CAST(SUM(CASE WHEN c.is_qualified = 1 THEN 1 ELSE 0 END) AS REAL) /
    COUNT(*) * 100, 1
  ) AS harvest_pct
  FROM (
    SELECT url FROM frontier WHERE status = 'done'
    ORDER BY fetched_at DESC LIMIT 1000
  ) f
  LEFT JOIN companies c ON c.name IS NOT NULL;
"
```

### Smoke Test Suite

Run on every deploy and as a pre-commit gate (`pytest test_smoke.py`):

| # | Test | Pass Criterion |
|---|------|----------------|
| 1 | Load all models (BERT, spaCy, XGBoost, Siamese, DQN) | < 60 seconds |
| 2 | Process 10-page sample end-to-end | < 5 minutes |
| 3 | Generate 1 LLM report via Ollama | < 30 seconds |
| 4 | SQLite `PRAGMA integrity_check` | Returns "ok" |
| 5 | LanceDB table row counts | All tables > 0 rows |

---

## Quick Reference: Full Deployment Footprint

| Component | Size |
|-----------|------|
| Databases (SQLite + LanceDB + ChromaDB) | 4-7 GB |
| Model artifacts (BERT, Siamese, XGBoost, DQN, LogReg, RF) | 4.5-4.6 GB |
| Local LLM (Ollama, Q4_K_M) | ~4 GB |
| Python env + dependencies | ~2-3 GB |
| **Total** | **~15-19 GB** |

---

## Quick Reference: File Layout

```
scrapus_data/
  scrapus.db                   # SQLite -- graph, metadata, queues, config
  lancedb/
    entity_embeddings/         # Siamese vectors (768-d) for entity matching
    page_embeddings/           # Crawler state vectors (384-d)
    lead_profiles/             # ICP + candidate profile vectors (128-d)
    replay_buffer/             # RL experience tuples (448-d state)
  chromadb/
    page_documents/            # Full page profiles + topic vectors
    company_documents/         # Aggregated company descriptions
    topic_vectors/             # BERTopic cluster outputs
  models/
    bert-ner/current/          # Fine-tuned BERT NER (~440 MB)
    siamese/current/           # Siamese network weights (~50 MB)
    xgboost/current/           # Ensemble classifier (~20 MB)
    logreg/current/            # Logistic Regression (~1 MB)
    rf/current/                # Random Forest (~10-50 MB)
    dqn/current/               # Crawler policy network (~5 MB)
backups/
  YYYYMMDD_HHMMSS/            # Timestamped full backups
scripts/
  init_schema.sql             # SQLite schema initialization
  init_lancedb.py             # LanceDB table setup
  init_chromadb.py            # ChromaDB collection setup
  backup.sh                   # Full backup script
  shap_analysis.py            # Monthly SHAP feature importance report
  threshold_sweep.py          # Entity resolution threshold sweep
```
