# Scrapus Configuration Reference

Every tunable parameter in the pipeline, extracted from module-0 through module-6 documentation. This is the single source of truth for configuration.

---

## 1. Shared Constants

Parameters that MUST match across modules. Changing one without updating the others will produce silent data corruption or runtime crashes.

| Constant | Value | Used By | Why Must Match |
|----------|-------|---------|----------------|
| `sentence_transformer_model` | `all-MiniLM-L6-v2` | mod-1, mod-2, mod-3 | Embedding dimensions must be 384 everywhere; mismatched models produce incomparable vectors |
| `page_embedding_dim` | 384 | mod-1, mod-2 | Crawler state vector (first 384 dims) + ChromaDB page storage + BERTopic input must agree |
| `entity_embedding_dim` | 128 | mod-3, mod-4 | Siamese encoder output dimension feeds LanceDB `entity_embeddings` table and lead matching |
| `lead_profile_dim` | 128 | mod-4 | Siamese output for lead profile vectors in LanceDB `lead_profiles` table |
| `state_vector_dim` | 448 | mod-1 | DQN input size: 384 (page embed) + 32 (URL trigram) + 16 (title trigram) + 1 (depth) + 1 (seed distance) + 1 (domain pages log) + 1 (domain avg reward) + 12 (domain category one-hot) |
| `cosine_threshold_er` | 0.05 | mod-3 | Entity resolution matching threshold; tighter = fewer merges, looser = more false merges |
| `qualification_threshold` | 0.85 | mod-4, mod-5, mod-6 | Lead qualification cutoff; ensemble prob > 0.85 sets `is_qualified = 1` in SQLite and gates report generation |
| `chromadb_space` | `cosine` | mod-0, mod-2, mod-5 | All ChromaDB collections use cosine distance; switching to L2 invalidates all stored embeddings |
| `lancedb_path` | `scrapus_data/lancedb` | mod-1, mod-3, mod-4 | All modules connect to the same LanceDB directory |
| `sqlite_path` | `scrapus_data/scrapus.db` | mod-0 through mod-6 | Single SQLite database for all structured data |
| `chromadb_path` | `scrapus_data/chromadb` | mod-0, mod-2, mod-5 | Single ChromaDB persistent directory |

---

## 2. Per-Module Configuration

### Module 0 -- System

#### SQLite PRAGMAs

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `journal_mode` | `WAL` | WAL / DELETE / TRUNCATE | WAL enables concurrent readers with single writer; do not change |
| `synchronous` | `NORMAL` | OFF / NORMAL / FULL | NORMAL balances durability and speed; OFF risks corruption on power loss |
| `foreign_keys` | `ON` | ON / OFF | Enforces referential integrity across companies, persons, products, edges tables |
| `page_size` | `4096` | 512-65536 (power of 2) | Must be set before database creation; 4096 is SSD-optimal |
| `cache_size` | `-2000` (~8 MB) | Negative = KB, positive = pages | Per-connection memory for page cache; increase for read-heavy workloads |
| `mmap_size` | `268435456` (256 MB) | 0 to available RAM | OS-managed memory-mapped I/O; reduce to 64 MB on 8 GB machines |
| `busy_timeout` | `5000` (5 s) | 0-30000 ms | Wait time on write lock contention; 0 = fail immediately |
| `wal_autocheckpoint` | `1000` | 0-100000 pages | Passive checkpoint trigger; 0 disables auto-checkpoint |
| `journal_size_limit` | `67108864` (64 MB) | 0 = unlimited | Max WAL file size; writers block when reached until checkpoint completes |

#### Connection Pool

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `writer_connections` | 1 | 1 (fixed) | SQLite WAL mode supports exactly one writer |
| `reader_connections` | 4 | 1-16 | Read-only connections opened with `?mode=ro`; increase for parallel query load |

#### WAL Checkpoint Strategy

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `scheduled_checkpoint_interval` | 10 min | 1-60 min | Background `PRAGMA wal_checkpoint(TRUNCATE)` to reclaim WAL space |
| `vacuum_threshold` | 25% fragmentation | 10-50% | Run `VACUUM` when `free_bytes / db_bytes` exceeds this ratio |

#### Process Model

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `process_pool_max_workers` | `cpu_count - 1` | 1-32 | CPU-bound workers for BERT, Siamese, XGBoost, DQN inference |
| `asyncio_queue_maxsize` | 1000 | 100-10000 | Bounded in-process queue between crawler and extraction; backpressure when full |

#### Alerting Thresholds

| Parameter | Warning | Critical | Impact |
|-----------|---------|----------|--------|
| `sqlite_wal_size` | >32 MB | >60 MB | WAL approaching `journal_size_limit`; writers will block |
| `sqlite_freelist_ratio` | >15% | >25% | Database fragmentation; triggers VACUUM recommendation |
| `asyncio_queue_backlog` | >800 items | maxsize reached | Extraction falling behind crawling throughput |
| `lancedb_write_lock_wait` | >2 s | >5 s | Write contention on LanceDB single-writer lock |
| `process_pool_utilization` | >80% tasks busy | All workers busy | CPU saturation; increase pool or reduce concurrency |

#### ChromaDB Collection Parameters

| Collection | `construction_ef` | `M` | `ef_search` | Purpose |
|------------|-------------------|-----|-------------|---------|
| `page_documents` | 200 | 16 | 200 | Full page profiles + topic vectors |
| `company_documents` | 400 | 32 | 400 | Aggregated company descriptions (higher recall needed for ER) |
| `topic_vectors` | 100 | 8 | 100 | BERTopic outputs (small collection, frequent queries) |

---

### Module 1 -- Crawler

#### DQN Hyperparameters

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `lr` (learning rate) | `3e-4` | 1e-5 to 1e-3 | Adam optimizer; lower = more stable but slower convergence |
| `gamma` (discount factor) | `0.99` | 0.9-0.999 | Higher values weight future rewards more; 0.99 standard for episodic tasks |
| `epsilon_start` | 1.0 | 0.5-1.0 | Initial exploration rate |
| `epsilon_end` | 0.01 (implied) | 0.01-0.1 | Minimum exploration rate after decay |
| `epsilon_decay` | Annealed over training | -- | Decay schedule from `epsilon_start` to `epsilon_end` |
| `batch_size` | 64 | 32-256 | Sampled from replay buffer per training step |
| `target_update_freq` | 1000 steps | 500-5000 | Target network sync interval; too frequent = instability |
| `replay_buffer_size` | 100,000 tuples | 50K-500K | LanceDB replay table; pruned by timestamp when exceeded |
| `action_dim` | 10 | 5-20 | Number of candidate links per page |
| `architecture` | 3-layer MLP | -- | ~5 MB; loaded from `scrapus_data/models/dqn/policy.pt` |
| `weight_reload_interval` | 500 actor steps | 100-1000 | How often crawler threads reload `policy.pt` from disk |

#### Prioritized Experience Replay (PER)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `per_alpha` | 0.6 | 0.0-1.0 | Prioritization exponent; 0 = uniform, 1 = fully prioritized |
| `per_beta_start` | 0.4 | 0.0-1.0 | Initial importance-sampling correction |
| `per_beta_end` | 1.0 | 0.4-1.0 | Final beta value (annealed over training) |

#### UCB1 Domain Scheduler

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `exploration_constant` | `sqrt(2)` (~1.414) | 0.5-3.0 | UCB1 exploration term coefficient |
| `dqn_weight` | 0.7 | 0.0-1.0 | Weight of DQN Q-value in blended score |
| `ucb_weight` | 0.3 | 0.0-1.0 | Weight of UCB score in blended score; must sum to 1.0 with `dqn_weight` |

#### Frontier Management

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `max_depth` | 5 | 3-10 | Maximum link-hop depth from seed URL before episode terminates |
| `max_pages_per_episode` | 500 | 100-5000 | Hard crawl budget cap per episode |
| `pruning_age_days` | 7 | 1-30 | Failed URLs older than this are garbage-collected hourly |
| `pruning_interval` | 60 min | 10-120 min | How often the frontier pruning job runs |

#### Politeness and Throttling

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `default_delay` | Per `robots.txt` `Crawl-delay` | 0.5-10 s | Per-domain delay between requests |
| `max_concurrent_threads` | 10-50 | 5-100 | `ThreadPoolExecutor` thread count for crawlers |
| `user_agent` | `ScrapusBot` | -- | Identifier for `robots.txt` matching |
| `robots_txt_cache_ttl` | Forever (gap) | 24 h recommended | Currently cached indefinitely; needs TTL |

#### Bloom Filter (URL Dedup)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `bloom_filter_size` | Implicit | 100K-10M bits | Size of Bloom filter for URL deduplication |
| `bloom_error_rate` | Implicit | 0.001-0.01 | Acceptable false positive rate for duplicate detection |

#### Reward Design

| Condition | Reward | Frequency |
|-----------|--------|-----------|
| Page yields >= 1 qualified lead | +1.0 | ~3% of pages |
| Page contains target entity, not qualified | +0.2 | ~12% of pages |
| Page has no relevant info | -0.1 | ~85% of pages |
| Per-page crawl cost | -0.01 | Every page |

#### Entity Existence Check (LanceDB ANN)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `entity_existence_distance_threshold` | 0.15 | 0.05-0.30 | Cosine distance below which a page is penalized as discussing a known entity |
| `entity_existence_q_penalty` | 0.3 | 0.1-0.5 | Multiplicative penalty to Q-value when known-entity detected |
| `entity_existence_limit` | 3 | 1-10 | Number of nearest neighbors checked |

---

### Module 2 -- Extraction

#### HTML Parsing

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `parser_library` | `trafilatura` >= 1.6 | -- | Content extraction engine |
| `include_tables` | `True` | True / False | Extract table content from HTML |
| `include_links` | `True` | True / False | Extract link elements |
| `favor_recall` | `True` | True / False | Trafilatura recall-biased extraction mode |
| `min_extraction_length` | 50 chars | 20-200 | Pages with less extracted text are skipped |

#### Chunking (for NER pipeline)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `chunk_size_tokens` | 512 | 256-1024 | Max tokens per chunk for NER processing |
| `overlap_tokens` | 64 | 0-128 | Token overlap between adjacent chunks; ensures cross-chunk entity capture |
| `min_chunk_length` | 50 tokens | 20-100 | Drop trailing chunks shorter than this |
| `split_boundary` | Sentence-aware (NLTK `sent_tokenize`) | -- | Avoids cutting entities mid-span |

#### NER Model

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `ner_base_model` | `bert-base-cased` | -- | Local weights at `scrapus_data/models/bert-ner/` |
| `ner_batch_size` | 32 | 8-128 | Documents per NER inference batch; higher = faster but more memory |
| `ner_timeout` | 30 s | 10-120 s | Per-document timeout; kill + log on exceed |
| `max_seq_length` | 512 tokens | 128-512 | Maximum input sequence length for BERT tokenizer |

#### NER Confidence Thresholds (per entity type)

| Entity Type | Threshold | Rationale |
|-------------|-----------|-----------|
| ORG | 0.75 | High-precision entities; abundant training data |
| PERSON | 0.75 | High-precision entities; abundant training data |
| LOCATION | 0.60 | Lower threshold compensates for less training data; recall > precision here |
| PRODUCT | 0.60 | Lower threshold compensates for less training data; filtered by downstream stages |

#### Embedding Model

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `embedding_model` | `sentence-transformers/all-MiniLM-L6-v2` | -- | 384-dim output; shared with mod-1 and mod-3 |
| `embedding_batch_size` | 64 | 16-256 | Documents per embedding batch |

#### BERTopic Parameters

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `min_cluster_size` | 15 | 5-50 | HDBSCAN minimum documents per topic cluster |
| `min_samples` | 5 | 2-20 | HDBSCAN core-point threshold |
| `hdbscan_metric` | `euclidean` | euclidean / manhattan / cosine | Applied in UMAP-reduced space |
| `nr_topics` | 30 | 10-100 | Target topic count (auto-merge to reach this) |

#### UMAP Parameters (BERTopic)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `n_neighbors` | 15 | 5-50 | Local neighborhood size for manifold approximation |
| `n_components` | 5 | 2-50 | UMAP output dimensionality |
| `min_dist` | 0.0 | 0.0-1.0 | Minimum distance between embedded points |
| `umap_metric` | `cosine` | cosine / euclidean | Distance metric for UMAP |

#### LDA Parameters

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `lda_num_topics` | 20 | 10-50 | Number of latent topics in LDA model |

#### ChromaDB Page Dedup

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `cosine_threshold` | 0.05 | 0.01-0.20 | Pages with cosine distance below this to an existing page are skipped as near-duplicates |
| `n_results` | 1 (implied) | 1-10 | Number of nearest neighbors checked for dedup |

#### ChromaDB HNSW Index (page_documents)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `ef_construction` | 200 | 50-500 | Build-time quality; higher = better recall, slower build |
| `M` | 16 | 8-64 | Max connections per HNSW node; higher = better recall, more memory |
| `ef_search` | 200 | 50-500 | Query-time quality; higher = better recall, slower queries |
| `space` | `cosine` | cosine / l2 / ip | Distance metric; must be `cosine` (shared constant) |

---

### Module 3 -- Entity Resolution

#### Blocking Strategy

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `prefix_length` | 4 | 2-6 | Characters of `normalized_name` used for primary blocking key |
| `secondary_key` | Soundex | Soundex / Double Metaphone | Phonetic blocking key; Soundex is English-biased (known gap) |
| `max_block_size` | 200 | 50-500 | Cap on candidate pairs per block; random sample drawn if exceeded |

#### Siamese Encoder Training

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `siamese_margin` | 1.0 | 0.5-2.0 | Contrastive loss margin |
| `siamese_lr` | `1e-3` | 1e-4 to 1e-2 | Adam optimizer learning rate |
| `siamese_batch_size` | 64 | 16-256 | Training batch size |
| `siamese_epochs` | 50 (max) | 10-100 | Maximum training epochs |
| `siamese_patience` | 5 epochs | 3-10 | Early stopping patience on validation F1 |
| `siamese_embedding_dim` | 128 | 64-512 | Output embedding dimension (shared constant) |
| `hard_negative_ratio` | 0.30 | 0.1-0.5 | Fraction of negative pairs that are hard negatives (same industry, different entity) |
| `train_val_test_split` | 80/10/10 | -- | Data partitioning for training |

#### Deep Matching (LanceDB)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `cosine_threshold` | 0.05 | 0.01-0.20 | Cosine distance below which entities are considered matches (shared constant) |
| `top_k_candidates` | 5 | 1-20 | Number of nearest neighbors retrieved from LanceDB |

#### Location Conflict Detection

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `levenshtein_ratio_threshold` | 0.6 | 0.4-0.8 | Minimum Levenshtein similarity ratio to consider locations compatible |

#### SQLite-LanceDB Sync

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `sync_batch_size` | 100 | 50-500 | Entities per LanceDB upsert call |
| `sync_max_retries` | 3 | 1-5 | Retry attempts on sync failure |
| `sync_backoff_base` | 1 s | 1-5 s | Exponential backoff: 1s, 2s, 4s |
| `dead_letter_log` | `scrapus_data/lance_sync_failures.jsonl` | -- | Failed sync entries written here for manual replay |

#### Incremental ER

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `blocking_index_rebuild_interval` | 1000 new entities | 500-5000 | Frequency of full blocking index rebuild |
| `candidate_cache_ttl` | 1 hour | 15 min - 4 hours | TTL for `normalized_name -> match_result` cache |

---

### Module 4 -- Lead Matching

#### XGBoost (primary model)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `max_depth` | 6 | 3-12 | Maximum tree depth; deeper = more complex interactions, more overfitting risk |
| `n_estimators` | 200 | 50-1000 | Number of boosting rounds |
| `learning_rate` | 0.05 | 0.01-0.3 | Step size shrinkage; lower = more rounds needed |
| `subsample` | 0.8 | 0.5-1.0 | Row sampling ratio per tree |
| `colsample_bytree` | 0.8 | 0.5-1.0 | Column sampling ratio per tree |
| `reg_lambda` | 1.0 | 0.0-10.0 | L2 regularization on leaf weights |
| `min_child_weight` | 3 | 1-10 | Minimum sum of instance weights in a child node |
| `objective` | `binary:logistic` | -- | Binary classification with logistic loss |
| `eval_metric` | `logloss` | logloss / auc / error | Evaluation metric for early stopping |
| `tree_method` | `hist` | hist / exact / approx | Histogram-based tree building; fastest for moderate data |

#### Logistic Regression

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `C` | 1.0 | 0.01-100 | Inverse regularization strength |
| `penalty` | `l2` | l1 / l2 / elasticnet | Regularization type |
| `solver` | `lbfgs` | lbfgs / liblinear / saga | Optimization algorithm |
| `class_weight` | `balanced` | balanced / None / dict | Adjusts weights inversely proportional to class frequency |
| `max_iter` | 1000 | 100-5000 | Maximum iterations for solver convergence |

#### Random Forest

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `n_estimators` | 100 | 50-500 | Number of trees in the forest |
| `max_depth` | 8 | 3-20 | Maximum tree depth |
| `min_samples_split` | 5 | 2-20 | Minimum samples to split an internal node |
| `min_samples_leaf` | 2 | 1-10 | Minimum samples in a leaf node |
| `max_features` | `sqrt` | sqrt / log2 / float | Number of features considered per split |
| `bootstrap` | `True` | True / False | Whether bootstrap samples are used |

#### Ensemble Weights

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `xgb_weight` | 0.50 | 0.0-1.0 | XGBoost contribution to soft vote |
| `lr_weight` | 0.25 | 0.0-1.0 | Logistic Regression contribution |
| `rf_weight` | 0.25 | 0.0-1.0 | Random Forest contribution |
| _constraint_ | Sum = 1.0 | -- | Weights must sum to 1.0 |
| `calibration_method` | Platt scaling (post-hoc) | Platt / isotonic / None | Applied to XGBoost output logits; ECE = 0.034 |

#### Threshold

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `qualification_threshold` | 0.85 | 0.70-0.95 | Ensemble probability above which a lead is qualified (shared constant) |

#### Feature Engineering

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `missing_value_sentinel` | -1 | -- | Used for all missing numeric features; XGBoost handles natively |
| `industry_categories` | 47 (NAICS 2-digit + "Other") | -- | One-hot encoding vocabulary |
| `location_embedding_dim` | 16 | 8-64 | Learned location embedding from char trigrams via `Linear(300, 16)` |
| `location_trigram_vocab_size` | 300 | -- | Hash bins for character trigram vocabulary |

---

### Module 5 -- Report Generation

#### LLM Configuration

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `model_name` (local) | `llama3.1:8b-instruct-q4_K_M` | Any Ollama model | Model identifier for Ollama API |
| `model_name` (API) | `gpt-4` | gpt-4 / gpt-4-turbo | OpenAI model identifier |
| `temperature` | 0.3 | 0.0-1.0 | Low = deterministic factual output; high = creative |
| `top_p` | 0.9 | 0.0-1.0 | Nucleus sampling threshold |
| `repeat_penalty` | 1.1 | 1.0-1.5 | Prevents repetitive phrasing; Ollama-specific |
| `num_predict` | 200 | 100-500 | Maximum tokens to generate; ~60-word summaries |
| `context_window` | 8192 | 2048-131072 | Model context window size; model-dependent |
| `max_tokens` (OpenAI) | 200 | 100-500 | OpenAI `max_tokens` parameter |

#### RAG Retrieval

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `top_k` | 5 | 3-20 | Number of ChromaDB results retrieved per company |
| `cosine_min_threshold` | 0.3 | 0.1-0.5 | Post-retrieval cosine similarity floor; results below are discarded |
| `max_retries` (generation) | 2 | 0-5 | Validation retry attempts before declaring failure |
| `fact_count_threshold_for_chromadb` | 3 | 1-10 | If SQLite facts < this, ChromaDB context is added as supplementary enrichment |

#### Chunking (for ChromaDB ingestion)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `chunk_size_words` | 500 | 200-1000 | Word-based chunking for ChromaDB page documents |
| `overlap_words` | 100 | 50-200 | Word overlap between chunks |

#### Context Window Management

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `prompt_token_limit` | 6000 | 4000-7500 | Soft limit; truncation triggers when prompt exceeds this |
| `min_retained_facts` | 3 | 1-10 | Minimum facts always kept (never truncated) |
| `truncation_strategy` | Oldest facts first | -- | Sort by `crawl_date`, drop oldest until under limit |

#### Validation Pipeline

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `min_summary_words` | 30 | 20-100 | Minimum word count for generated summary |
| `max_retry_count` | 2 | 0-5 | Total retries across all 5 validation stages |
| `confidence_range` | [0.0, 1.0] | -- | Valid range for LLM-generated confidence score |

#### Hallucination Check

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `claim_overlap_threshold` | 0.5 | 0.3-0.8 | Token overlap ratio above which a claim is considered supported |

#### Prompt Injection Defense

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `input_max_length` | 500 chars | 100-2000 | Per-field truncation before prompt interpolation |
| `dangerous_patterns` | `['ignore previous', 'system:', '<\|im_start\|>', '<\|im_end\|>', 'you are now', 'forget your instructions']` | -- | Blocked prompt-override strings |

---

### Module 6 -- Evaluation

#### Regression Test Thresholds

| Metric | Threshold | Direction | Rationale |
|--------|-----------|-----------|-----------|
| NER F1 | > 0.90 | Higher is better | Extraction quality floor |
| Lead Precision | > 0.85 | Higher is better | Sales team trusts the output |
| Lead Recall | > 0.80 | Higher is better | Don't miss qualified prospects |
| Report Accuracy | > 0.93 | Higher is better | Factual correctness of summaries |
| Crawl Harvest Rate | > 10% | Higher is better | RL crawler is functioning |

#### Monitoring: Per-Stage Timing

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `alert_p95_multiplier` | 2.0 | 1.5-5.0 | Alert if P95 latency for any stage exceeds 2x baseline P95 |
| `timing_check_interval` | 100 pipeline runs | 50-500 | How often P95 alert rule is evaluated |

#### Monitoring: Data Freshness

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `freshness_alert_days` | 30 | 7-90 | Alert if any domain has no fresh crawl within this many days |

#### Monitoring: Concept Drift Detection

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `drift_threshold_pp` | 5 | 2-10 | Alert if any metric drops more than N percentage points from baseline |
| `drift_sample_size` | 50 | 20-200 | Gold-labelled examples sampled from recent crawls for monthly re-evaluation |
| `drift_cadence` | Monthly | Weekly / Monthly / Quarterly | How often drift re-evaluation runs |

#### Calibration

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `ece_target` | 0.034 (achieved) | < 0.05 | Expected Calibration Error; lower = better probability calibration |
| `calibration_method` | Platt scaling | Platt / isotonic | Applied post-hoc to XGBoost logits |
| `calibration_set_size` | 200 | 100-500 | Held-out examples for calibration validation |

---

## 3. Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | No (only for GPT-4 reports) | None | OpenAI API key for GPT-4 report generation; not needed if using Ollama |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Ollama API endpoint for local LLM inference |
| `SCRAPUS_DATA_DIR` | No | `./scrapus_data` | Root directory for all pipeline data (SQLite, LanceDB, ChromaDB, models) |
| `SCRAPUS_LOG_LEVEL` | No | `INFO` | Python logging level: DEBUG / INFO / WARNING / ERROR / CRITICAL |

---

## 4. Example Configuration File

A complete TOML config with all defaults that could serve as a single config source. Parameters are grouped by module for clarity.

```toml
# scrapus_config.toml
# Scrapus Pipeline Configuration -- All Defaults

# ─── Shared Constants ───────────────────────────────────────────────────────

[shared]
sentence_transformer_model = "all-MiniLM-L6-v2"
page_embedding_dim         = 384
entity_embedding_dim       = 128
lead_profile_dim           = 128
state_vector_dim           = 448
cosine_threshold_er        = 0.05
qualification_threshold    = 0.85

# ─── Environment ────────────────────────────────────────────────────────────

[env]
data_dir   = "./scrapus_data"
log_level  = "INFO"
ollama_host = "http://localhost:11434"
# openai_api_key = ""  # Set via OPENAI_API_KEY env var, not in config

# ─── Module 0: System ──────────────────────────────────────────────────────

[system.sqlite]
journal_mode         = "WAL"
synchronous          = "NORMAL"
foreign_keys         = true
page_size            = 4096
cache_size_kb        = 2000        # ~8 MB per connection
mmap_size            = 268435456   # 256 MB
busy_timeout_ms      = 5000
wal_autocheckpoint   = 1000
journal_size_limit   = 67108864    # 64 MB

[system.connection_pool]
writer_connections = 1
reader_connections = 4

[system.checkpoint]
interval_minutes   = 10
vacuum_threshold   = 0.25          # 25% fragmentation

[system.process_model]
max_workers       = -1             # -1 = cpu_count - 1
queue_maxsize     = 1000

[system.alerting]
wal_size_warning_mb       = 32
wal_size_critical_mb      = 60
freelist_ratio_warning    = 0.15
freelist_ratio_critical   = 0.25
queue_backlog_warning     = 800
lance_lock_wait_warning_s = 2.0
lance_lock_wait_critical_s = 5.0

# ─── Module 1: Crawler ─────────────────────────────────────────────────────

[crawler.dqn]
lr                    = 3e-4
gamma                 = 0.99
epsilon_start         = 1.0
epsilon_end           = 0.01
batch_size            = 64
target_update_freq    = 1000
replay_buffer_size    = 100_000
action_dim            = 10
weight_reload_interval = 500

[crawler.per]
alpha      = 0.6
beta_start = 0.4
beta_end   = 1.0

[crawler.ucb]
exploration_constant = 1.414       # sqrt(2)
dqn_weight           = 0.7
ucb_weight           = 0.3

[crawler.frontier]
max_depth              = 5
max_pages_per_episode  = 500
pruning_age_days       = 7
pruning_interval_min   = 60

[crawler.politeness]
max_concurrent_threads = 10
user_agent             = "ScrapusBot"
# robots_txt_cache_ttl_hours = 24  # Not yet implemented (production gap)

[crawler.entity_existence]
distance_threshold = 0.15
q_penalty          = 0.3
limit              = 3

[crawler.rewards]
qualified_lead      = 1.0
target_entity       = 0.2
no_relevant_info    = -0.1
per_page_cost       = -0.01

# ─── Module 2: Extraction ──────────────────────────────────────────────────

[extraction.html]
min_extraction_length = 50
include_tables        = true
include_links         = true
favor_recall          = true

[extraction.chunking]
chunk_size_tokens = 512
overlap_tokens    = 64
min_chunk_length  = 50

[extraction.ner]
base_model     = "bert-base-cased"
batch_size     = 32
timeout_s      = 30
max_seq_length = 512

[extraction.ner.confidence_thresholds]
ORG      = 0.75
PERSON   = 0.75
LOCATION = 0.60
PRODUCT  = 0.60

[extraction.embedding]
batch_size = 64

[extraction.bertopic]
min_cluster_size = 15
min_samples      = 5
hdbscan_metric   = "euclidean"
nr_topics        = 30

[extraction.umap]
n_neighbors  = 15
n_components = 5
min_dist     = 0.0
metric       = "cosine"

[extraction.lda]
num_topics = 20

[extraction.chromadb_dedup]
cosine_threshold = 0.05
n_results        = 1

[extraction.chromadb_hnsw]
ef_construction = 200
M               = 16
ef_search       = 200
space           = "cosine"

# ─── Module 3: Entity Resolution ───────────────────────────────────────────

[entity_resolution.blocking]
prefix_length   = 4
secondary_key   = "soundex"
max_block_size  = 200

[entity_resolution.siamese]
margin         = 1.0
lr             = 1e-3
batch_size     = 64
epochs         = 50
patience       = 5
embedding_dim  = 128
hard_negative_ratio = 0.30

[entity_resolution.matching]
cosine_threshold   = 0.05
top_k_candidates   = 5

[entity_resolution.location_conflict]
levenshtein_ratio_threshold = 0.6

[entity_resolution.sync]
batch_size   = 100
max_retries  = 3
backoff_base_s = 1.0

[entity_resolution.incremental]
blocking_index_rebuild_interval = 1000
candidate_cache_ttl_hours       = 1.0

# ─── Module 4: Lead Matching ───────────────────────────────────────────────

[matching.xgboost]
max_depth        = 6
n_estimators     = 200
learning_rate    = 0.05
subsample        = 0.8
colsample_bytree = 0.8
reg_lambda       = 1.0
min_child_weight = 3
objective        = "binary:logistic"
eval_metric      = "logloss"
tree_method      = "hist"

[matching.logistic_regression]
C            = 1.0
penalty      = "l2"
solver       = "lbfgs"
class_weight = "balanced"
max_iter     = 1000

[matching.random_forest]
n_estimators      = 100
max_depth         = 8
min_samples_split = 5
min_samples_leaf  = 2
max_features      = "sqrt"
bootstrap         = true

[matching.ensemble]
xgb_weight          = 0.50
lr_weight           = 0.25
rf_weight           = 0.25
calibration_method  = "platt"

[matching.threshold]
qualification_threshold = 0.85

[matching.features]
missing_value_sentinel     = -1
industry_categories        = 47
location_embedding_dim     = 16
location_trigram_vocab_size = 300

# ─── Module 5: Report Generation ───────────────────────────────────────────

[report.llm.local]
model_name     = "llama3.1:8b-instruct-q4_K_M"
temperature    = 0.3
top_p          = 0.9
repeat_penalty = 1.1
num_predict    = 200
context_window = 8192

[report.llm.openai]
model_name = "gpt-4"
max_tokens = 200
temperature = 0.3

[report.rag]
top_k                = 5
cosine_min_threshold = 0.3
max_retries          = 2
fact_count_threshold_for_chromadb = 3

[report.chunking]
chunk_size_words = 500
overlap_words    = 100

[report.context_window]
prompt_token_limit  = 6000
min_retained_facts  = 3
truncation_strategy = "oldest_first"

[report.validation]
min_summary_words = 30
max_retry_count   = 2
confidence_min    = 0.0
confidence_max    = 1.0

[report.hallucination]
claim_overlap_threshold = 0.5

[report.sanitization]
input_max_length    = 500
dangerous_patterns  = [
    "ignore previous",
    "system:",
    "<|im_start|>",
    "<|im_end|>",
    "you are now",
    "forget your instructions",
]

# ─── Module 6: Evaluation ──────────────────────────────────────────────────

[evaluation.regression_thresholds]
ner_f1              = 0.90
lead_precision      = 0.85
lead_recall         = 0.80
report_accuracy     = 0.93
crawl_harvest_rate  = 0.10

[evaluation.monitoring]
alert_p95_multiplier  = 2.0
timing_check_interval = 100
freshness_alert_days  = 30
drift_threshold_pp    = 5.0
drift_sample_size     = 50
drift_cadence         = "monthly"

[evaluation.calibration]
ece_target           = 0.05
calibration_method   = "platt"
calibration_set_size = 200
```
