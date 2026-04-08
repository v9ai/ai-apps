# ML Enhancement Plan — Unified Synthesis

> Generated from 10 parallel ML expert agents analyzing the lead-gen codebase.
> Date: 2026-04-08

---

## Key Discovery: Existing ML Infrastructure

All 10 experts independently discovered that the codebase already has **world-class low-level ML infrastructure** — far more than initially apparent:

### Rust Layer (`crates/metal/` + `crates/jobbert/`)
| Component | File | What It Does |
|-----------|------|-------------|
| BGE Embedder | `similarity/bge.rs` | `BAAI/bge-small-en-v1.5` ONNX (384-dim, L2-norm) |
| Cross-Encoder | `similarity/reranker.rs` | `ms-marco-MiniLM-L6-v2` two-stage retriever |
| SIMD Cosine | `similarity/simd.rs` | NEON INT8 cosine ~10ns/vector on M1 |
| Embedding Index | `similarity/embedding_index.rs` | Mmap INT8 `EMBIDX01` binary format |
| ICP Scorer | `kernel/scoring.rs` | SoA ContactBatch, 256-contact SIMD batches |
| Intent Classifier | `kernel/intent_scoring.rs` | 16-feature semantic+keyword logistic |
| Spam Scorer | `kernel/spam_scoring.rs` | 24-feature, Bloom-filter domain reputation |
| NER | `kernel/ner.rs` | `dslim/bert-base-NER` ONNX with BIO decoding |
| Eval Harness | `kernel/ml_eval.rs` | AUC-ROC, NDCG@k, F1, JSONL label loading |
| Weight Optimizer | `kernel/weight_optimizer.rs` | Grid search + SGD + isotonic calibration |
| Dedup | `dedup.rs` | Fellegi-Sunter probabilistic linkage + Union-Find |
| Bloom/HLL/CMS | `bloom.rs`, `hll.rs`, `sketch.rs` | Probabilistic data structures |
| JobBERT | `crates/jobbert/` | Candle Metal: skill NER + 1024-dim embeddings |

### Python Layer (`mlx-training/` + `salescue/`)
| Component | What It Does |
|-----------|-------------|
| ONNX Export | BGE, NER, reranker → `~/.cache/leadgen-ml/` |
| Distillation | DeBERTa teacher → logistic student (intent, reply) |
| ICP Pairs | Contrastive learning data export |
| Deep Survival Machine | Weibull mixture time-to-conversion |
| GraphSAGE | Company relationship scoring |
| Thompson Sampling | 125-arm outreach bandit |
| DAGMM | Signal anomaly detection |

### TypeScript Layer (production Next.js)
| Component | File | What It Does |
|-----------|------|-------------|
| Reply Classifier | `src/lib/email/reply-classifier.ts` | 16-feature OvR logistic (6 classes) |
| Contact Classifier | `src/apollo/resolvers/contacts.ts` | 170-line regex pattern matcher |
| Intent Aggregator | `src/apollo/resolvers/intent-signals.ts` | Weighted exponential decay |
| Touch Scorer | `src/apollo/resolvers/reminders.ts` | Inverse-sigmoid at 14 days |
| Deletion Scorer | `src/apollo/resolvers/contacts.ts` | 10-factor weighted sum |

### The Critical Gap

**The Rust ML layer and the Next.js app have ZERO bridge.** All TypeScript-side ML is either regex patterns or LLM API calls. The sophisticated Rust models (ONNX embeddings, SIMD scoring, cross-encoder reranking) cannot be called from Vercel serverless. This is the #1 infrastructure gap.

---

## Unified Architecture: Four Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: EDGE (Pure JS, <5ms, Vercel Edge Runtime)              │
│  • Keyword classifiers (AI tier, spam gate)                     │
│  • Feature extraction (intent signals, deletion score)          │
│  • BM25, Jaro-Winkler dedup                                    │
│  • Seasonal pattern forecasts (precomputed DFT)                 │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2: SERVERLESS (Node.js, 50-200ms, @huggingface/transformers)│
│  • BGE-small embeddings (INT8, 32MB)                            │
│  • Zero-shot NLI classification (DeBERTa, INT8, 90MB)           │
│  • Cross-encoder reranking (MiniLM, INT8, 6MB)                  │
│  • pgvector similarity search (Neon-native)                     │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3: LOCAL BATCH (Rust CLI, throughput-optimized)           │
│  • Full pipeline: discover → enrich → score → outreach          │
│  • NEON SIMD INT8 embeddings (100M sims/sec)                    │
│  • Node2Vec graph embeddings (15K nodes, <5 min)                │
│  • ALS collaborative filtering (ndarray)                        │
│  • XGBoost LambdaMART lead ranking → JSON weight export         │
│  • MinHash LSH company dedup (O(n) vs O(n²))                   │
│  • GLiNER zero-shot B2B NER (funding, team size, tech)          │
├─────────────────────────────────────────────────────────────────┤
│  TIER 4: TRAINING (Python, offline)                             │
│  • DeBERTa → logistic distillation                              │
│  • XGBoost training + ONNX export                               │
│  • Hawkes process MLE parameter estimation                      │
│  • Feature snapshot → HuggingFace datasets export               │
│  • Eval harness (≥80% accuracy bar)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Priority Matrix

### P0 — Foundation (enables everything else)

| Enhancement | Expert | Effort | Impact | Dependencies |
|-------------|--------|--------|--------|-------------|
| **pgvector on Neon** + `embedding vector(384)` column | #1, #7, #9 | 1 day | Unlocks all semantic search | None |
| **`@huggingface/transformers`** in package.json | #1, #3, #9 | 5 min | Bridge: Rust models → Vercel | None |
| **`src/ml/embedder.ts`** — BGE singleton | #1, #9 | 2 hrs | Server-side embedding gen | HF transformers |
| **Backfill 592 company embeddings** | #1, #7 | 30 sec | Enable similarity queries | Embedder + pgvector |
| **Data quality scoring** (`src/lib/ml/data-quality.ts`) | #6 | 1 day | Identifies what to re-enrich | None |
| **Quality gate** (`src/lib/ml/quality-gate.ts`) | #6 | 0.5 day | Unified flagging for all modules | Data quality |

### P1 — Core ML Models

| Enhancement | Expert | Effort | Impact |
|-------------|--------|--------|--------|
| **`similarCompanies` GraphQL query** (pgvector cosine) | #1, #7 | 1 day | Semantic company search |
| **Zero-shot company classifier** (DeBERTa NLI, replaces LLM) | #3 | 2 days | Eliminate LLM dependency for categorization |
| **Contact classifier** (BGE → logistic, replaces 170-line regex) | #3 | 1 day | +5-10% on creative titles |
| **Lead temperature** (Hawkes process, replaces 14-day sigmoid) | #10 | 2 days | Dynamic engagement scoring |
| **Send-time optimizer** (Thompson Sampling, replaces fixed 8am) | #10 | 2 days | Immediate open rate boost |
| **Bounce predictor** (20-feature logistic) | #6 | 2 days | Protect sender reputation |
| **XGBoost lead ranker** (42 features → JSON weights) | #4 | 3 days | Unified ranking of all scoring signals |

### P2 — Advanced Models

| Enhancement | Expert | Effort | Impact |
|-------------|--------|--------|--------|
| **Feature store** (4 Neon tables, 50+ features) | #8 | 3 days | Unified feature infra for all models |
| **GLiNER zero-shot B2B NER** (funding, team size, tech) | #2 | 2 days | Structured entity extraction |
| **`extracted_entities` table** + Drizzle schema | #2 | 0.5 day | Entity store for downstream |
| **Company dedup** (MinHash LSH + Fellegi-Sunter) | #6 | 2 days | Clean pipeline |
| **ALS collaborative filtering** (Rust ndarray) | #7 | 3 days | "Users who contacted X also contacted Y" |
| **Engagement predictor** (20-stump gradient boosted) | #10 | 2 days | P(open)/P(reply) per contact |
| **Outreach cadence** (Kaplan-Meier + optimal stopping) | #10 | 2 days | Data-driven follow-up timing |
| **Cross-encoder reranking** for text queries | #4, #9 | 2 days | Precision boost on search |

### P3 — Graph & Advanced

| Enhancement | Expert | Effort | Impact |
|-------------|--------|--------|--------|
| **Node2Vec graph embeddings** (pure Rust, petgraph) | #5 | 2 weeks | Structural company similarity |
| **Louvain community detection** (market segmentation) | #5 | 1 week | Cluster-based targeting |
| **Intent signal propagation** (graph BFS) | #5 | 1 week | "Guilt by association" scoring |
| **Link prediction** (Hadamard logistic) | #5 | 1 week | Contact recommendation |
| **Anomaly detection** (Mahalanobis, Welford's online) | #6 | 1.5 days | Catch fake/bot companies |
| **Seasonal patterns** (DFT on weekly engagement) | #10 | 1 day | Hiring/budget cycle awareness |
| **Drift detection** (PSI + KS tests) | #8 | 2 days | Feature distribution monitoring |
| **Template recommendation** (Beta-binomial posterior) | #7 | 1 day | Best template per company type |

---

## Shared Infrastructure Decisions

### Model Registry (agreed across all experts)

| Model | HF ID | ONNX INT8 | Purpose | Status |
|-------|--------|-----------|---------|--------|
| BGE-small-en-v1.5 | `BAAI/bge-small-en-v1.5` | 32 MB | Embeddings (384-dim) | **Already in Rust** |
| MiniLM Reranker | `cross-encoder/ms-marco-MiniLM-L6-v2` | 6 MB | Cross-encoder reranking | **Already in Rust** |
| bert-base-NER | `dslim/bert-base-NER` | ~110 MB | PER/ORG/LOC extraction | **Already in Rust** |
| GLiNER medium | `urchade/gliner_medium-v2.1` | ~420 MB | Zero-shot B2B NER | **New** |
| DeBERTa NLI | `MoritzLaurer/deberta-v3-base-zeroshot-v2.0` | ~90 MB | Zero-shot classification | **New** |
| JobBERT | `jjzha/jobbert_knowledge_extraction` | ~28 MB (INT8) | Skill NER (BIO) | **Already in Candle** |

**Total new models: 2** (GLiNER + DeBERTa). Total Vercel bundle: ~128 MB INT8. Within 250 MB limit.

### New npm Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `@huggingface/transformers` | ONNX inference + tokenization in Node.js | ~2 MB (runtime downloads models) |

That's it. One dependency. All experts agreed: no `onnxruntime-node` needed separately — `@huggingface/transformers` v3+ bundles it.

### Database Schema Changes

```sql
-- P0: pgvector
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE companies ADD COLUMN embedding vector(384);
CREATE INDEX idx_companies_embedding_hnsw ON companies
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- P0: Data quality
ALTER TABLE companies ADD COLUMN data_quality_score real;
ALTER TABLE companies ADD COLUMN anomaly_score real;

-- P1: Ranking
ALTER TABLE companies ADD COLUMN rank_score real DEFAULT 0;
ALTER TABLE companies ADD COLUMN rank_score_version text;

-- P2: Entities
CREATE TABLE extracted_entities (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_text TEXT NOT NULL,
  normalized_value TEXT,
  model_id TEXT NOT NULL,
  confidence REAL NOT NULL,
  relation_type TEXT,
  created_at TEXT NOT NULL DEFAULT now()::text
);

-- P2: Feature store
CREATE TABLE feature_registry (id SERIAL PRIMARY KEY, name TEXT NOT NULL, version INT DEFAULT 1, entity_type TEXT NOT NULL, feature_group TEXT NOT NULL, dtype TEXT NOT NULL, computation TEXT NOT NULL, is_active BOOLEAN DEFAULT true);
CREATE TABLE feature_store (id SERIAL PRIMARY KEY, entity_type TEXT NOT NULL, entity_id INT NOT NULL, feature_name TEXT NOT NULL, feature_version INT DEFAULT 1, value_float REAL, computed_at TEXT NOT NULL);
CREATE TABLE feature_snapshots (id SERIAL PRIMARY KEY, snapshot_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INT NOT NULL, feature_vector TEXT NOT NULL, label TEXT);
CREATE TABLE feature_drift (id SERIAL PRIMARY KEY, feature_name TEXT NOT NULL, window_start TEXT NOT NULL, psi REAL, ks_statistic REAL, drift_detected BOOLEAN DEFAULT false);

-- P2: Collaborative filtering
ALTER TABLE companies ADD COLUMN cf_factors FLOAT4[64];
CREATE TABLE company_similarities (company_id INT NOT NULL, similar_company_id INT NOT NULL, combined_score REAL NOT NULL, PRIMARY KEY (company_id, similar_company_id));

-- P3: Graph
ALTER TABLE companies ADD COLUMN graph_embedding TEXT; -- JSON f64[128]
ALTER TABLE companies ADD COLUMN graph_cluster_id INTEGER;
ALTER TABLE companies ADD COLUMN graph_intent_boost REAL DEFAULT 0;

-- P3: Time series
CREATE TABLE send_time_stats (id SERIAL PRIMARY KEY, hour_utc INT NOT NULL, day_of_week INT NOT NULL, seniority TEXT, sends INT DEFAULT 0, opens INT DEFAULT 0);
CREATE TABLE lead_temperature (id SERIAL PRIMARY KEY, contact_id INT NOT NULL, temperature REAL NOT NULL, trend TEXT, computed_at TEXT NOT NULL);
CREATE TABLE weekly_engagement_stats (id SERIAL PRIMARY KEY, week_start TEXT NOT NULL, sends INT DEFAULT 0, opens INT DEFAULT 0, replies INT DEFAULT 0);
CREATE TABLE ml_predictions (id SERIAL PRIMARY KEY, entity_type TEXT NOT NULL, entity_id INT NOT NULL, model_name TEXT NOT NULL, prediction_json TEXT NOT NULL, expires_at TEXT NOT NULL);
```

### New File Structure

```
src/ml/                              # NEW — Tier 2 inference layer
  index.ts                           # Model registry, lazy loaders
  embedder.ts                        # BGE-small singleton
  reranker.ts                        # Cross-encoder service
  company-classifier.ts              # DeBERTa zero-shot NLI
  contact-classifier.ts              # BGE → logistic (replaces regex)
  icp-scorer.ts                      # 22-feature learned score
  contact-ranker.ts                  # 12-feature BPR logistic
  template-recommender.ts            # Beta-binomial posterior
  lead-temperature.ts                # Hawkes process
  send-time-optimizer.ts             # Thompson Sampling
  engagement-predictor.ts            # 20-stump gradient boosted
  outreach-cadence.ts                # Kaplan-Meier + stopping rule
  seasonal-patterns.ts               # DFT cycle detection

src/lib/ml/                          # NEW — Pure TS utilities (no model deps)
  data-quality.ts                    # Completeness + freshness scoring
  quality-gate.ts                    # Unified flagging
  anomaly-detector.ts                # Mahalanobis distance
  bounce-predictor.ts                # 20-feature logistic
  feature-vector.ts                  # Lead ranking feature extraction
  lead-ranker.ts                     # XGBoost JSON-weights inference
  drift.ts                           # PSI + KS statistics

src/lib/embeddings/                  # NEW — Embedding utilities
  embedder.ts                        # @huggingface/transformers wrapper
  company-text.ts                    # Canonical text builder
  index.ts

src/lib/ner/                         # NEW — Lightweight TS NER
  b2b-extractor.ts                   # Regex-based for serverless
  normalizer.ts                      # Funding amounts, team sizes

src/apollo/resolvers/
  semantic-search.ts                 # NEW — similarCompanies, companiesLike
  recommendations.ts                 # NEW — recommendedCompanies, contacts, templates
  ranking.ts                         # NEW — rankedCompanies with ML scoring

schema/
  recommendations/schema.graphql     # NEW — Recommendation types + queries

crates/metal/src/
  kernel/anomaly.rs                  # NEW — Welford's + Mahalanobis
  kernel/bounce_prediction.rs        # NEW — 20-feature logistic
  kernel/gliner.rs                   # NEW — GLiNER ONNX inference
  kernel/entity_normalizer.rs        # NEW — Amount/size normalization
  company_dedup.rs                   # NEW — MinHash LSH

crates/leadgen/src/graph/            # NEW — Graph ML module
  mod.rs                             # Public API
  schema.rs                          # HeteroNode, HeteroEdge, B2BGraph
  builder.rs                         # SQL → graph construction
  node2vec.rs                        # Random walks + skip-gram
  community.rs                       # Louvain modularity
  link_predict.rs                    # Hadamard logistic

crates/metal/src/recommender/        # NEW — Recommendation module
  mod.rs                             # ALS matrix factorization
  cold_start.rs                      # Neighbor factor transfer

mlx-training/
  distill_contact_classifier.py      # NEW — BGE → logistic for titles
  distill_icp_scorer.py              # NEW — 22-feature ICP model
  distill_bounce_classifier.py       # NEW — Bounce prediction
  train_lead_ranker.py               # NEW — XGBoost LambdaMART
  export_bounce_data.py              # NEW — Training data extraction
  export_ranking_labels.py           # NEW — Labeled training data
  export_features_hf.py              # NEW — HuggingFace datasets export
  eval_company_classifier.py         # NEW — Eval framework
```

---

## Design Principles (Consensus Across All 10 Experts)

1. **Distill to JSON weights** — Train sophisticated models offline (XGBoost, DeBERTa, etc.), distill to logistic regression weights stored as JSON. Inference is pure `Math.*` — zero deps, L1-cache-friendly, SIMD-vectorizable. This is the proven pattern from `reply-classifier.ts`.

2. **Dual-layer: Rust batch + TypeScript real-time** — Rust for throughput (nightly scoring of all companies), TypeScript for latency (per-request scoring in GraphQL resolvers). Both use the same model weights.

3. **Same model, two runtimes** — BGE-small runs identically in Rust (ONNX Runtime) and TypeScript (`@huggingface/transformers`). Embeddings are interchangeable. pgvector is the shared persistence layer.

4. **No ONNX for simple models** — Anomaly detection, bounce prediction, quality scoring, lead temperature, send-time optimization are all lightweight enough for pure TypeScript/Rust arithmetic. ONNX Runtime is reserved for transformer models (BGE, DeBERTa, cross-encoder).

5. **Eval-first** — Every model must pass ≥80% accuracy bar (strategy enforcer). Train/test split. No model ships without eval metrics logged.

6. **Zero new Python runtime dependencies** — All Python is training-only. Production inference is Rust or TypeScript.

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Enable pgvector on Neon (`CREATE EXTENSION vector`)
- [ ] Add `embedding vector(384)` to companies table
- [ ] `pnpm add @huggingface/transformers`
- [ ] Create `src/ml/embedder.ts` + `src/lib/embeddings/company-text.ts`
- [ ] Backfill 592 company embeddings
- [ ] `similarCompanies` + `companiesLike` GraphQL queries
- [ ] `src/lib/ml/data-quality.ts` + `quality-gate.ts`

### Week 2: Classification & Scoring
- [ ] Export DeBERTa-v3-base-zeroshot to INT8 ONNX
- [ ] `src/ml/company-classifier.ts` (zero-shot NLI)
- [ ] Distill contact classifier (BGE → logistic, train on 19,486 titles)
- [ ] `src/ml/contact-classifier.ts` (replace regex)
- [ ] 42-feature lead ranking vector design
- [ ] `mlx-training/train_lead_ranker.py` (XGBoost → JSON)
- [ ] `src/lib/ml/lead-ranker.ts` (pure TS inference)

### Week 3: Engagement & Temporal
- [ ] `src/ml/lead-temperature.ts` (Hawkes process)
- [ ] `src/ml/send-time-optimizer.ts` (Thompson Sampling)
- [ ] Wire into `campaign-scheduler.ts` (replace fixed 8am)
- [ ] Wire into webhook handler (update temperature on open/reply)
- [ ] `src/ml/engagement-predictor.ts` (gradient boosted stumps)
- [ ] `src/ml/outreach-cadence.ts` (survival + stopping rule)
- [ ] `src/lib/ml/bounce-predictor.ts`

### Week 4: Entities & Dedup
- [ ] Export GLiNER to ONNX, add Rust kernel
- [ ] `extracted_entities` table + enrichment pipeline integration
- [ ] `src/lib/ner/b2b-extractor.ts` (regex fallback for serverless)
- [ ] MinHash LSH company dedup in Rust
- [ ] Anomaly detection (Mahalanobis + Welford's)

### Week 5-6: Recommendations & Features
- [ ] ALS collaborative filtering in Rust
- [ ] `company_similarities` precomputed table
- [ ] `recommendedCompanies` GraphQL query (hybrid CF + content)
- [ ] Feature store tables + `src/lib/ml/features.ts`
- [ ] Feature drift detection (PSI + KS)
- [ ] Training data export to HuggingFace datasets format

### Week 7-8: Graph ML
- [ ] `crates/leadgen/src/graph/` module (Node2Vec)
- [ ] Heterogeneous B2B graph construction from Neon
- [ ] Louvain community detection → `graph_cluster_id`
- [ ] Intent signal propagation via graph BFS
- [ ] Link prediction for contact recommendation
- [ ] Fused text+graph company similarity

---

## HuggingFace Models Referenced (Complete List)

| Model ID | Task | Expert(s) | Priority |
|----------|------|-----------|----------|
| `BAAI/bge-small-en-v1.5` | Embeddings 384-dim | #1, #3, #4, #7, #9 | P0 |
| `cross-encoder/ms-marco-MiniLM-L6-v2` | Reranking | #1, #4, #9 | P1 |
| `MoritzLaurer/deberta-v3-base-zeroshot-v2.0` | Zero-shot classification | #3 | P1 |
| `urchade/gliner_medium-v2.1` | Zero-shot B2B NER | #2 | P2 |
| `dslim/bert-base-NER` | Token NER (PER/ORG/LOC) | #2 | Already deployed |
| `jjzha/jobbert_knowledge_extraction` | Skill NER (BIO) | #2, #9 | Already deployed |
| `TechWolf/JobBERT-v3` | Job embeddings 1024-dim | #9 | Already deployed |
| `Babelscape/rebel-large` | Relation extraction | #2 | P3 (optional) |

---

## Metrics & Eval Targets

| Model | Metric | Target | Eval Data Source |
|-------|--------|--------|-----------------|
| Company classifier | Macro-F1 | ≥ 80% | 592 labeled companies |
| Contact classifier | Macro-F1 (seniority + dept) | ≥ 80% | 19,486 classified contacts |
| Lead ranker | NDCG@10 | ≥ 0.7 | Reply-classified contact_emails |
| Bounce predictor | AUC-ROC | ≥ 0.85 | Historical bounces |
| Engagement predictor | AUC-ROC (open) | ≥ 0.65 | contact_emails opened_at |
| Anomaly detection | Precision@95%recall | ≥ 0.8 | Manual review of flagged |
| Company dedup | Precision of duplicate pairs | ≥ 0.9 | Manual review |
| Similar companies | MRR (user clicks) | ≥ 0.5 | A/B test logging |
