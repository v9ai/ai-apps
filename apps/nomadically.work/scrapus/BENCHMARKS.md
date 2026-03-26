# Scrapus Benchmarks

Consolidated performance numbers and testing methodology for the Scrapus B2B
lead generation pipeline. Every number in this document traces to a specific
module README, SYNTHESIS.md, or the Kaplan et al. (2025) case study.

**Reference hardware** (unless noted otherwise): Apple M1, 16 GB RAM, SSD.
All latency measurements via `time.perf_counter()`, aggregated over 500+
pipeline runs.

---

## 1. Accuracy Benchmarks

### 1.1 Crawling (Module 1)

Baseline: random URL selection with BFS frontier.

| Metric | Scrapus (RL) | Baseline (Random) | Improvement |
|--------|-------------:|-------------------:|-------------|
| Harvest rate | ~15% | ~5% | 3x |
| Relevant pages per 50K budget | ~7,500 | ~2,500 | 3x |
| Distinct domains crawled | ~820 | ~560 | +46% |

**Methodology.** Paired t-test across 5 ICP profiles, each with a 50K-page
crawl budget drawn from 200K+ web pages spanning software, logistics,
healthcare, and other verticals. Statistical significance: p < 0.01.

**Gold set.** ~500 annotated pages labeled for relevance by 2 annotators.

**DQN-UCB weight selection.** Grid search over {0.5/0.5, 0.6/0.4, 0.7/0.3,
0.8/0.2} on 50 held-out domains (10K pages each):

| DQN Weight | UCB Weight | Harvest Rate | Domain Diversity |
|-----------:|-----------:|-------------:|-----------------:|
| 0.5 | 0.5 | 12.1% | 890 |
| 0.6 | 0.4 | 13.8% | 860 |
| **0.7** | **0.3** | **15.2%** | **820** |
| 0.8 | 0.2 | 14.6% | 710 |

0.7/0.3 maximizes harvest rate while keeping domain diversity above 800.

### 1.2 NER Extraction (Module 2)

Base model: `bert-base-cased` fine-tuned on CoNLL-2003 + 1K press release
annotations. Inference batch size: 32 documents.

| Entity Type | Precision | Recall | F1 |
|-------------|----------:|-------:|------:|
| ORG | 94.8% | 93.4% | 94.1% |
| PERSON | 93.9% | 92.5% | 93.2% |
| LOCATION | 90.5% | 89.1% | 89.8% |
| PRODUCT | 89.2% | 87.8% | 88.5% |
| **Overall** | **93.1%** | **91.5%** | **92.3%** |

LOCATION and PRODUCT score lower due to fewer fine-tuning examples and
overlap with common nouns.

**Entity confidence thresholds.** Softmax probability cutoffs per type:

| Entity Type | Threshold |
|-------------|----------:|
| ORG | 0.75 |
| PERSON | 0.75 |
| LOCATION | 0.60 |
| PRODUCT | 0.60 |

#### Relation Extraction

Hybrid approach: spaCy dependency parse + BERT classifier trained on 1,500
labeled sentences. Max dependency path: 4 hops.

| Metric | Value |
|-----------|------:|
| Precision | 85.0% |
| Recall | 78.0% |
| F1 | 81.2% |

Recall lags precision because the 4-hop dependency-path filter prunes
long-distance relations across clause boundaries.

#### Comparison with Baselines

| Metric | Scrapus | Off-the-shelf NER | ETAP (prior art) |
|---------------------|--------:|-----------------:|-----------------:|
| Entity F1 | 92.3% | 85.0% | 77.0% |
| Entity Precision | 93.1% | -- | 74.0% |
| Entity Recall | 91.5% | -- | 81.0% |
| Relation Precision | 85.0% | -- | -- |

**Test set.** ~500 annotated pages from the gold set; 2 annotators.

### 1.3 Entity Resolution (Module 3)

Siamese encoder: 128-dim contrastive loss, trained on 5,000 labeled pairs
(3,200 positive, 1,800 negative; 30% hard negatives). Matching threshold:
0.05 cosine distance.

| Metric | Value | Test Set |
|-----------|------:|------------------------------|
| Precision | 96.8% | 500-pair held-out test set |
| Recall | 84.2% | 500-pair held-out test set |
| F1 | 90.1% | 500-pair held-out test set |

High precision / lower recall is intentional: false merges corrupt the
knowledge graph, while missed merges only create duplicates caught later.

#### Threshold Sensitivity

Sweep range: 0.01 to 0.20 in 0.005 increments (39 candidates). Selection
criterion: maximize F1 while keeping precision above 95%. Reproducible via
`scripts/threshold_sweep.py`.

| Cosine Distance Threshold | Precision | Recall | F1 | Note |
|--------------------------:|----------:|-------:|-----:|------|
| 0.03 | <95% | higher | lower | Below precision floor |
| 0.04 | ~95% | ~86% | ~90% | Marginal gain over 0.05 |
| **0.05** | **96.8%** | **84.2%** | **90.1%** | **Selected** |
| 0.06 | ~97.5% | ~81% | ~88.5% | Recall drops faster |
| 0.07 | ~98% | ~78% | ~87% | Diminishing returns |

Thresholds below 0.05 push precision under the 95% floor. Thresholds above
0.05 sacrifice recall faster than they improve precision.

#### Blocking Strategy

| Key | Derivation | Block Size Cap |
|-------------|---------------------------------------------|---------------:|
| Primary | First 4 chars of `normalized_name` (prefix) | 200 |
| Secondary | Soundex code of full normalized name | 200 |

### 1.4 Lead Matching (Module 4)

Two-stage architecture: Siamese similarity (128-dim) + XGBoost/LogReg/RF
soft-voting ensemble (50%/25%/25%). Training set: 2,400 hand-labeled
companies (1,800 train / 300 val / 300 test), 35% positive rate.

| Metric | Scrapus | Baseline | ETAP (prior art) |
|-----------|--------:|---------:|-----------------:|
| Precision | 89.7% | 80.0% | -- |
| Recall | 86.5% | 78.0% | -- |
| F1 | 0.881 | 0.79 | 0.77 |
| PR-AUC | 0.92 | 0.79 | -- |
| ROC-AUC | 0.94 | 0.82 | -- |

#### Threshold Analysis

Ensemble probability threshold for lead qualification:

| Threshold | Precision | Recall | F1 |
|----------:|----------:|-------:|------:|
| 0.75 | -- | -- | -- |
| 0.80 | 85.2% | 91.3% | 0.882 |
| **0.85** | **89.7%** | **86.5%** | **0.881** |
| 0.90 | 94.1% | 78.2% | 0.854 |
| 0.95 | 97.3% | 62.8% | 0.764 |

0.85 selected for best F1 while maintaining precision near 90%.

#### Confusion Matrix

Test set: 1,800 labeled examples at threshold = 0.85.

| | Predicted Positive | Predicted Negative |
|---------------------|-------------------:|-------------------:|
| **Actual Positive** | TP = 260 | FN = 40 |
| **Actual Negative** | FP = 30 | TN = 1,470 |

Derived: Precision = 89.7%, Recall = 86.7%, Specificity = 98.0%, FPR = 2.0%.

#### Confidence Calibration

Expected Calibration Error (ECE) = 0.034 via Platt scaling on XGBoost
output logits, validated on 200-example calibration set.

#### Feature Importance (SHAP, Top 6)

| Rank | Feature | Mean |SHAP| | Direction |
|-----:|---------------------|--------:|--------------------------|
| 1 | siamese_similarity | 0.28 | Higher = more qualified |
| 2 | keyword_density | 0.19 | Higher = more qualified |
| 3 | employee_count_log | 0.14 | Mid-range = most qualified |
| 4 | domain_authority | 0.11 | Higher = more qualified |
| 5 | revenue_estimate | 0.09 | Higher = more qualified |
| 6 | tech_stack_overlap | 0.08 | Higher = more qualified |

XGBoost gain-based importance (top 5): siamese_similarity (0.31),
keyword_density (0.14), employee_count_log (0.11), topic_cosine (0.09),
funding_amount_log (0.08).

#### Ensemble Weight Derivation

5-fold cross-validation grid search over all weight triplets
`(w_xgb, w_lr, w_rf)` with step = 0.05, constrained to sum = 1.0.
Best: XGBoost 50%, LogReg 25%, RF 25% with mean F1 = 0.883 +/- 0.012.

#### Compression Funnel

```
50,000 crawled pages
  --> 7,500 relevant pages       (crawl filter, 15% harvest rate)
  --> 4,200 unique entities      (entity resolution dedup)
  --> 1,800 ICP candidates       (Siamese top-K similarity)
  -->   300 qualified leads      (ensemble score > 0.85)
```

Overall compression: 99.4% of pages eliminated, 300 actionable leads remain.

### 1.5 Report Generation (Module 5)

Evaluated on 100 reports, 2 independent annotators, Cohen's kappa = 0.82
(strong inter-rater agreement). Claim-level granularity: 212 of 219 claims
correct = 96.8% (rounded to 97%).

| Metric | GPT-4 | Ollama (8B) | Extractive Baseline |
|--------------------------------------|------:|-------------:|-------------------:|
| User satisfaction (>= satisfactory) | 92% | 85-88% | 72% |
| Average Likert rating | 4.6/5 | -- | 3.9/5 |
| Factual accuracy (claim-level) | 97% | 93-95% | -- |
| Average report length | ~60 words | ~60 words | ~100 words |

**LLM backend.** GPT-4 API (`temperature=0.3`, `max_tokens=200`) or
Ollama `llama3.1:8b-instruct-q4_K_M` (Q4_K_M, 4-bit quantization,
~4.7 GB VRAM, 8192-token context window).

**Cost per report.** Ollama: $0.00 (local). GPT-4: ~$0.08 (~2K input +
200 output tokens).

**Hallucination check.** Post-generation claim extraction via regex +
token-overlap verification (threshold > 0.5 against source facts).

#### Local LLM Quality Comparison

| Model | Size | Report Quality | Speed | Memory |
|-----------------------|-----:|---------------:|------------|--------:|
| Llama 3.1 8B (Q4_K_M)| 8B | 8.2/10 | Fast | ~4.7 GB |
| Qwen2.5 7B | 7B | 8.5/10 | Fast | ~14 GB |
| Mistral 7B v0.3 | 7B | 7.8/10 | Very fast | ~14 GB |
| Phi-3.5 Mini | 3.8B | 7.2/10 | Extremely fast | ~8 GB |

### 1.6 Error Propagation (Module 6)

| Metric | Value | Description |
|-------------------------------------|------:|--------------------------------------|
| Cascade Error Rate (CER) | 0.13 | 13% of extraction errors reach leads |
| Error Amplification Factor (EAF) | 1.15x | 15% more downstream than upstream |

Low propagation because entity resolution and ensemble scoring act as
error filters at each stage handoff.

---

## 2. Latency Benchmarks

Measured on M1 Mac, 16 GB RAM, SSD. Timing: `time.perf_counter()`, 500+ runs.

| Stage | Median | P95 | P99 | Throughput | Bottleneck |
|--------------------------|-------:|-------:|-------:|-------------------:|------------------:|
| Crawl (per page) | 2.1s | 5.3s | 12s | ~10 pages/sec | Network I/O |
| HTML parse | 15ms | 45ms | 120ms | -- | CPU |
| NER inference | 85ms | 180ms | 350ms | ~100 pages/sec | CPU (BERT) |
| Entity resolution | 12ms | 35ms | 80ms | ~1ms/query (ANN) | LanceDB ANN |
| Lead matching | 8ms | 22ms | 55ms | ~1,000 leads/sec | XGBoost inference |
| LLM report (GPT-4) | 8.5s | 15s | 28s | ~10-30 sec/report | LLM inference |
| **E2E per lead** | ~45min | -- | -- | ~5K pages/day | Crawl budget |

Crawl and LLM stages dominate wall-clock time. HTML parse + NER + entity
resolution + matching combined account for less than 1% of E2E latency.

### Amortized Latency Budget (per lead)

Pipeline stages overlap in production. Amortized latency assumes full
pipeline overlap at ~5K pages/day sustained rate.

| Stage | Amortized Latency | Cumulative |
|-----------------------------------------|------------------:|------------|
| Crawl (amortized per lead) | ~170 ms | 170 ms |
| NER extraction | ~10 ms | 180 ms |
| Entity resolution (ANN lookup) | ~1 ms | 181 ms |
| Lead matching (ensemble) | ~1 ms | 182 ms |
| Report generation (LLM) | ~10-30 sec | ~10-30 sec |
| **Total without LLM** | | **~182 ms** |
| **Total with LLM** | | **~10-30 sec** |

Note: raw crawl time per lead = (50K pages / 10 pg/sec) / 300 leads =
~16.7 sec, but batching and overlap reduce amortized cost.

### Local Stack I/O Performance

| Operation | Throughput | Notes |
|-------------------------------------|-------------------:|-------------------------------|
| SQLite write (WAL, batched) | ~5K inserts/sec | Single writer, WAL mode |
| SQLite read (indexed) | ~50K reads/sec | 4 reader connections |
| LanceDB ANN query (100K vectors) | <1ms per query | HNSW index |
| ChromaDB similarity query (10K docs)| ~5ms per query | cosine distance |

---

## 3. Resource Benchmarks

### 3.1 Disk Footprint

#### Databases (at 50K pages)

| Store | Format | Role | Size |
|-----------------|--------------------------|---------------------------------------------|----------:|
| SQLite 3.45+ | `scrapus.db` (WAL mode) | Graph, structured data, FTS5, explanations | ~500 MB |
| LanceDB | `scrapus_data/lancedb/` | Vectors: page, entity, lead, replay buffer | ~2-4 GB |
| ChromaDB | `scrapus_data/chromadb/` | Document storage, topics, dedup | ~1-2 GB |
| **Total DB** | | | **~4-7 GB** |

#### Model Artifacts

| Model | Location | Size |
|--------------------------------------|-------------------------------|----------:|
| BERT NER (bert-base-cased, fine-tuned)| `models/bert-ner/` | ~440 MB |
| DQN policy (3-layer MLP) | `models/dqn/` | ~5-10 MB |
| Siamese encoder (128-dim) | `models/siamese/` | ~50-100 MB |
| XGBoost | `models/xgboost/model.json` | ~5-20 MB |
| Logistic Regression | `models/logreg/model.pkl` | ~1 MB |
| Random Forest | `models/rf/model.pkl` | ~10-50 MB |
| Local LLM (Ollama, e.g. Mistral 7B Q4)| system-managed | ~4 GB |
| **Total models** | | **~4.5-4.6 GB** |
| **Total models + LLM** | | **~8.5-8.6 GB** |

#### Full Deployment Footprint

| Component | Size |
|---------------------|----------:|
| Databases | 4-7 GB |
| Model artifacts | 4.5-4.6 GB |
| Local LLM | ~4 GB |
| Python env + deps | ~2-3 GB |
| **Total** | **~15-19 GB** |

### 3.2 RAM Usage

| Component | Idle | Peak | Notes |
|-------------------------------------|----------|----------|--------------------------------------|
| SQLite (WAL reader) | ~50 MB | ~100 MB | WAL mode, 8 MB cache per connection |
| SQLite mmap | -- | 256 MB | Virtual, paged by OS on demand |
| LanceDB (HNSW index, 100K vectors) | ~200 MB | ~500 MB | Depends on dimension + index params |
| ChromaDB (10K documents) | ~200 MB | ~400 MB | In-memory index + embeddings |
| BERT NER inference | ~440 MB | ~1.5 GB | 110M params, FP32 single batch |
| DQN policy | ~5 MB | ~100 MB | 3-layer MLP, small policy network |
| Siamese inference | ~50 MB | ~200 MB | 128-dim contrastive encoder |
| XGBoost + ensemble | ~20 MB | ~100 MB | Trees in memory |
| Local LLM (Ollama, Q4) | ~4 GB | ~6 GB | Dominates memory budget |
| Python runtime + overhead | ~200 MB | ~300 MB | Asyncio event loop, buffers |
| **Total (without LLM)** | **~1.2 GB** | **~3.5 GB** | |
| **Total (with LLM)** | **~5.2 GB** | **~9.5 GB** | 16 GB system RAM recommended |

### 3.3 GPU Requirements

| Tier | GPU | Use Case |
|-------------|-----------|-----------------------------------------------|
| Minimum | None | CPU inference for all models (slower) |
| Recommended | RTX 3060+ | NER acceleration, LLM inference via Ollama |
| Production | RTX 4090 / A100 | Full pipeline acceleration |

Ollama LLM uses Metal acceleration on macOS (M1/M2).

---

## 4. Scale Benchmarks

Evaluated with the RL crawler and full extraction pipeline. 10K and 25K
are measured; 50K and 100K are projected from observed scaling behavior.

| Dataset Size | Crawl Time | Extraction Time | Total E2E | Lead Count |
|-------------:|-----------:|----------------:|----------:|-----------:|
| 10K pages | ~17 min | ~1.7 min | ~20 min | ~60 |
| 25K pages | ~42 min | ~4.2 min | ~50 min | ~150 |
| 50K pages | ~83 min | ~8.3 min | ~100 min | ~300 |
| 100K pages | ~167 min (proj.) | ~17 min (proj.) | ~200 min (proj.) | ~600 (proj.) |

**Derivation.** Crawl: 10 pages/sec sustained. NER extraction: ~100
pages/sec. Entity resolution: <1ms/query. Lead matching: ~1K leads/sec.
Lead yield: ~0.6% of crawled pages qualify at threshold 0.85.

### Known Scale Limits

| Component | Limit | Mitigation |
|------------------------|-------------------------------|----------------------------------------|
| SQLite single-writer | ~500 merges/sec under contention | Batch 100-entity transactions |
| SQLite frontier | ~50 concurrent writers | Shard by domain hash across files |
| LanceDB replay buffer | 100K tuples (pruning trigger) | Timestamp-based garbage collection |
| Blocking candidate cap | 200 per block | Random sampling above cap |

---

## 5. Cost Benchmarks

### 5.1 Hardware Tiers

| Deployment | RAM | CPU | Storage | GPU | Approx Cost |
|-------------|-------|---------|-----------|-----------|-------------|
| M1 Mac | 16 GB | 8 cores | 256 GB SSD | Integrated | ~$1,200 |
| Workstation | 32 GB | 8 cores | 500 GB NVMe | RTX 3060+ | ~$1,500 |
| Server | 64 GB+ | 16+ cores | 1 TB+ NVMe | RTX 4090/A100 | ~$3,000+ |

### 5.2 Annual Operating Cost

| Cost Component | Scrapus (Local) | Cloud-Native (Apollo/ZoomInfo tier) | Delta |
|------------------------|-----------------|-------------------------------------|-------|
| Infrastructure | $1,500 one-time | $200-500/mo ($2,400-6,000/yr) | -$900 to -$4,500 |
| API calls (LLM, VDB) | $0 | $100-300/mo ($1,200-3,600/yr) | -$1,200 to -$3,600 |
| Storage | $0 | $50-100/mo ($600-1,200/yr) | -$600 to -$1,200 |
| Managed ops | $0 (self-service) | $100-200/mo ($1,200-2,400/yr) | Variable |
| **Year 1 total** | **~$1,500** | **~$5,400-13,200** | **64-89% savings** |
| **Year 2+ total** | **~$0** (elec.) | **~$5,400-13,200** | **~100% savings** |
| **3-year total** | **~$1,500** | **~$16,200-39,600** | |

### 5.3 Per-Lead Cost

| Deployment | Cost per Lead (300-lead run) | Methodology |
|--------------------------------------|----------------------------:|------------------------------|
| Local (Ollama reports) | ~$0.00 | Hardware amortized separately |
| Local (GPT-4 reports) | ~$0.08 | ~2K input + 200 output tokens |
| Cloud Apollo.io equivalent (est.) | ~$0.50-2.00 | Per-credit pricing |

### 5.4 LLM-as-Fallback Cost

Using Ollama for 100% of reports: $0/day. Using a cascade where the local
LLM handles 95% and GPT-4 handles 5% of edge cases:
~$0.08 x 15 reports/day = ~$1.20/day = ~$36/month.

---

## 6. Regression Test Thresholds

Hard-fail quality gates: a single violation blocks the pipeline.

| Metric | Minimum (Fail) | Target | Current | Source |
|-------------------------|---------------:|-------:|--------:|---------------------|
| NER F1 | > 0.90 | 0.93 | 0.923 | Module 2 gold set |
| Lead Precision | > 0.85 | 0.90 | 0.897 | Module 4 test set |
| Lead Recall | > 0.80 | 0.87 | 0.865 | Module 4 test set |
| Report Factual Accuracy | > 0.93 | 0.97 | 0.968 | Module 5 (100 reports) |
| Crawl Harvest Rate | > 10% | 15% | ~15% | Module 1 (50K budget) |
| ER Precision | > 0.95 | 0.97 | 0.968 | Module 3 (500 pairs) |
| ER F1 | > 0.88 | 0.91 | 0.901 | Module 3 (500 pairs) |
| PR-AUC | > 0.88 | 0.92 | 0.920 | Module 4 test set |
| ECE (calibration) | < 0.05 | 0.03 | 0.034 | Module 4 (200 cal.) |
| CER (error cascade) | < 0.15 | 0.10 | 0.130 | Module 6 |

Implementation: `pytest test_regression.py` with a session-scoped fixture
that runs the full evaluation once and asserts each threshold.

---

## 7. Testing Infrastructure

### 7.1 Gold Set Composition

| Component | Size | Composition | Maintenance |
|--------------------------|---------|--------------------------------------|-------------------------|
| Annotated pages | ~500 | Software, logistics, healthcare, other | 2 annotators per page |
| ER labeled pairs | 5,000 | 3,200 positive, 1,800 negative, 30% hard negatives | 80/10/10 split |
| Lead labeled companies | 2,400 | 35% positive rate, stratified split | Sales-team confirmed |
| Report evaluation set | 100 | Claim-level annotation, 2 annotators | Cohen's kappa = 0.82 |
| ICP profiles | 5 | Distinct industry targets | Used across all modules |

### 7.2 Evaluation Cadence

| Check | Frequency | Sample Size | Action on Failure |
|-------------------------------|------------|-------------|---------------------------------------|
| Concept drift detection | Monthly | 50 labels from recent crawls | Inspect degraded entity types, retrain NER |
| Full regression suite | Every merge | Full gold set | Block pipeline promotion |
| Smoke tests | Every deploy | 10 pages + 1 report | Block deploy |
| Data freshness per domain | Daily | All domains | Alert if any domain > 30 days stale |
| P95 latency check | Per 100 runs | All stages | Alert if 2x baseline |

### 7.3 Smoke Test Suite

5 tests, < 10 minutes total. Run on every deploy and as pre-commit gate.

| # | Test | Pass Criterion | Command |
|---|---------------------------------------|--------------------------------------|----------------------------------------------|
| 1 | Load all models (BERT, spaCy, XGBoost)| Completes in < 60 seconds | `python -m pytest tests/smoke/test_model_load.py` |
| 2 | Process 10-page sample end-to-end | Completes in < 5 minutes | `python -m pytest tests/smoke/test_e2e_sample.py` |
| 3 | Generate 1 LLM report | Completes in < 30 seconds | `python -m pytest tests/smoke/test_report_gen.py` |
| 4 | SQLite integrity check | `PRAGMA integrity_check` returns "ok" | `python -m pytest tests/smoke/test_sqlite_integrity.py` |
| 5 | LanceDB table row counts | All tables > 0 rows | `python -m pytest tests/smoke/test_lancedb_tables.py` |

### 7.4 How to Run

```bash
# Full regression suite
python -m pytest tests/regression/ -v --tb=short

# Smoke tests only
python -m pytest tests/smoke/ -v --tb=short

# Specific module benchmarks
python -m pytest tests/regression/test_ner.py -v
python -m pytest tests/regression/test_matching.py -v
python -m pytest tests/regression/test_entity_resolution.py -v

# ER threshold sweep (reproduces Section 1.3 table)
python scripts/threshold_sweep.py
```

---

## 8. Reproducing Benchmarks

Step-by-step instructions to reproduce every benchmark table in this
document. All commands assume `scrapus_data/` is populated with models and
at least one complete crawl run.

### 8.1 Crawling (Section 1.1)

1. Configure 5 ICP profiles in `config/icp_profiles.json`.
2. Run RL crawler with 50K-page budget per profile:
   ```bash
   python -m scrapus.crawl --budget 50000 --profiles config/icp_profiles.json
   ```
3. Run baseline (random) crawler for comparison:
   ```bash
   python -m scrapus.crawl --budget 50000 --profiles config/icp_profiles.json --policy random
   ```
4. Compute harvest rate, domain count, and paired t-test:
   ```bash
   python scripts/eval_crawl.py --rl-output data/rl_crawl/ --baseline-output data/random_crawl/
   ```
5. DQN-UCB weight grid search:
   ```bash
   python scripts/weight_grid_search.py --domains 50 --pages-per-domain 10000
   ```

### 8.2 NER Extraction (Section 1.2)

1. Ensure gold-set annotations are in `data/gold/ner_annotations.jsonl`.
2. Run NER evaluation:
   ```bash
   python -m pytest tests/regression/test_ner.py -v
   ```
3. Per-entity breakdown is printed to stdout. Aggregate F1 must exceed 0.90.

### 8.3 Entity Resolution (Section 1.3)

1. Ensure labeled pairs are in `data/gold/er_pairs.jsonl` (5,000 pairs).
2. Run ER evaluation:
   ```bash
   python -m pytest tests/regression/test_entity_resolution.py -v
   ```
3. Threshold sweep:
   ```bash
   python scripts/threshold_sweep.py --pairs data/gold/er_pairs.jsonl --range 0.01:0.20:0.005
   ```

### 8.4 Lead Matching (Section 1.4)

1. Ensure labeled companies are in `data/gold/lead_labels.jsonl` (2,400 companies).
2. Run matching evaluation:
   ```bash
   python -m pytest tests/regression/test_matching.py -v
   ```
3. Threshold analysis and confusion matrix:
   ```bash
   python scripts/threshold_analysis.py --labels data/gold/lead_labels.jsonl --thresholds 0.75,0.80,0.85,0.90,0.95
   ```
4. SHAP feature importance:
   ```bash
   python scripts/shap_analysis.py --model scrapus_data/models/xgboost/model.json --data data/gold/lead_labels.jsonl
   ```

### 8.5 Report Generation (Section 1.5)

1. Generate 100 reports from qualified leads:
   ```bash
   python -m scrapus.report --company-ids data/gold/report_company_ids.txt --backend ollama
   python -m scrapus.report --company-ids data/gold/report_company_ids.txt --backend gpt4
   ```
2. Run claim-level evaluation (requires 2 annotators):
   ```bash
   python scripts/eval_reports.py --reports output/reports/ --annotations data/gold/report_annotations.jsonl
   ```
3. Compute inter-rater agreement (Cohen's kappa):
   ```bash
   python scripts/interrater.py --annotator1 data/gold/ann1.jsonl --annotator2 data/gold/ann2.jsonl
   ```

### 8.6 Latency Profiling (Section 2)

1. Run the full pipeline with timing instrumentation:
   ```bash
   python -m scrapus.pipeline --profile --budget 1000 --output data/timing/
   ```
2. Aggregate latency percentiles:
   ```bash
   python scripts/latency_report.py --timing-db scrapus_data/scrapus.db --table stage_timing
   ```
3. All per-stage measurements are stored in the `stage_timing` SQLite table.

### 8.7 Scale Benchmarks (Section 4)

1. Run at each scale point:
   ```bash
   for BUDGET in 10000 25000 50000; do
     python -m scrapus.pipeline --budget $BUDGET --output data/scale_$BUDGET/
   done
   ```
2. Collect timing and lead counts:
   ```bash
   python scripts/scale_report.py --runs data/scale_*/
   ```

### 8.8 Resource Measurement (Section 3)

1. Monitor peak RAM via `resource.getrusage()` (logged to `stage_timing`
   as `mem_before_mb` and `mem_after_mb`).
2. Disk footprint:
   ```bash
   du -sh scrapus_data/scrapus.db scrapus_data/lancedb/ scrapus_data/chromadb/ scrapus_data/models/
   ```

---

## Appendix: Monitoring Thresholds

Alert rules applied in production to the `stage_timing` and `drift_checks`
SQLite tables.

| Alert | Condition | Severity |
|------------------------------|----------------------------------------------|----------|
| Latency spike | P95 for any stage > 2x baseline P95 | Warning |
| Data freshness | Any domain > 30 days without fresh crawl | Warning |
| NER drift | Monthly 50-sample F1 drops > 5pp from baseline | Critical |
| ER precision drop | Precision < 95% on monthly re-eval | Critical |
| Lead precision drop | Precision < 85% on monthly re-eval | Critical |
| Report accuracy drop | Factual accuracy < 93% on monthly re-eval | Critical |
| SQLite WAL size | WAL file > 64 MB | Warning |
| LanceDB sync failures | `lance_sync_failures.jsonl` > 1 MB | Warning |
