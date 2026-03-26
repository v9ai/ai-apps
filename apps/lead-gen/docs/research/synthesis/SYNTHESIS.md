# Scrapus Pipeline Synthesis

Local-first, file-based B2B lead generation pipeline integrating RL crawling, transformer NER, Siamese matching, ensemble scoring, and local LLM report generation.

---

## Executive Summary

| Dimension | Measured Value |
|-----------|---------------|
| End-to-end funnel | 50K pages -> 7,500 relevant -> 300 qualified leads (99.4% reduction) |
| Crawl harvest rate | ~15% (3x over baseline ~5%) |
| NER F1 | 92.3% (precision 93.1%, recall 91.5%) |
| Lead precision / recall | 89.7% / 86.5% (PR-AUC 0.92) |
| Report factual accuracy | 85% (basic RAG); 97% user satisfaction |
| Cascade error rate (CER) | ~0.15 (15% inter-stage error propagation) |
| Annual cost (local) | ~$1,500 one-time hardware vs $5,400-13,200 cloud (64-89% savings) |
| Throughput | ~5K pages/day on commodity hardware |

Strengths: privacy (GDPR-ready, zero cloud dependency), cost efficiency, integrated AI stack across 7 modules. Weaknesses: single-machine bottleneck, manual ops burden, hybrid storage complexity (SQLite+LanceDB+ChromaDB), no multi-user collaboration.

---

## Architecture

```
                          SCRAPUS PIPELINE DATA FLOW

  Seeds/Keywords
       |
       v
  +------------------+    448-dim state vectors     +-------------------+
  | Module 1         |    UCB1 domain scheduling    | scrapus_data/     |
  | RL Crawler       |---------------------------->| lancedb/          |
  | (DQN + MAB)      |    ~10 pages/sec            |   replay_buffer/  |
  +------------------+    3x harvest rate           |   page_embeddings/|
       |                                            +-------------------+
       | 50K raw pages
       v
  +------------------+    spaCy + BERT-base-cased   +-------------------+
  | Module 2         |    BERTopic integration      | scrapus_data/     |
  | NER Extraction   |---------------------------->| chromadb/         |
  | (BERT + spaCy)   |    F1 92.3%, ~100 pages/sec |   page_documents/ |
  +------------------+                              |   company_docs/   |
       |                                            +-------------------+
       | 7,500 entities
       v
  +------------------+    Siamese 128-dim embeds    +-------------------+
  | Module 3         |    SQLite recursive CTEs     | scrapus_data/     |
  | Entity Resolution|---------------------------->| lancedb/          |
  | (Siamese+SQLite) |    0.05 cosine threshold     |   entity_embeds/  |
  +------------------+    ~1ms ANN queries          +-------------------+
       |
       | deduplicated entities
       v
  +------------------+    XGBoost 50% + LogReg 25%  +-------------------+
  | Module 4         |    + RF 25%, Platt scaling   | scrapus_data/     |
  | Lead Matching    |---------------------------->| lancedb/          |
  | (Ensemble)       |    0.85 threshold            |   lead_profiles/  |
  +------------------+    ~1K leads/sec             +-------------------+
       |
       | 300 qualified leads
       v
  +------------------+    SQLite+ChromaDB hybrid    +-------------------+
  | Module 5         |    retrieval, Ollama local   | scrapus.db        |
  | Report Gen       |    structured JSON output    | (SQLite WAL)      |
  | (RAG + LLM)      |    ~10-30 sec/report        +-------------------+
  +------------------+
       |
       v
  +------------------+
  | Module 6         |    SHAP explanations
  | Evaluation       |    prediction auditing
  | (Metrics + XAI)  |    cascade error tracking
  +------------------+

  Module 0 (System Overview): cross-cutting architecture, storage config, deployment
```

---

## Per-Module Summary

| Module | Key Metric | Status | Top Gap |
|--------|-----------|--------|---------|
| 0 - System Overview | Hybrid storage (SQLite+LanceDB+ChromaDB) | Documented | SQLite as graph store at scale lacks validation |
| 1 - RL Crawler | 3x harvest rate, 820 domains (+46%) | Research complete | Novel vector DB for RL replay lacks academic validation |
| 2 - NER Extraction | F1 92.3%, +7pp over off-the-shelf | Research complete | No cross-lingual support; no temporal reasoning |
| 3 - Entity Resolution | <1ms ANN, 0.05 cosine threshold | Research complete | SQLite graph store unproven at production scale |
| 4 - Lead Matching | Precision 89.7%, Recall 86.5%, PR-AUC 0.92 | Research complete | No dynamic threshold adaptation or online learning |
| 5 - Report Generation | 85% factual accuracy, 97% user satisfaction | Research complete | Missing reranking, MMR, and advanced RAG |
| 6 - Evaluation | CER ~0.15, EAF 1.2x | Research complete | Static metrics only; no continuous monitoring |

---

## Consolidated Metrics

### Throughput by Stage

| Stage | Throughput | Bottleneck | Mitigation |
|-------|-----------|-----------|------------|
| Crawling | ~10 pages/sec | Network I/O + politeness | Parallel domains, adaptive rate limiting |
| NER Extraction | ~100 pages/sec | BERT inference | ONNX optimization, batch processing |
| Entity Resolution | ~1ms/query | LanceDB ANN search | HNSW indexing |
| Lead Matching | ~1,000 leads/sec | XGBoost inference | Model quantization, feature caching |
| Report Generation | ~10-30 sec/report | LLM inference | Local model optimization, prompt caching |

### Accuracy vs Baselines (Kaplan et al. 2025)

| Metric | Scrapus | Traditional | Delta |
|--------|---------|------------|-------|
| Crawl harvest rate | ~15% | ~5% | +3x |
| NER F1 | 0.923 | 0.85 | +7.3pp |
| Lead precision | 89.7% | 80% | +9.7pp |
| Lead recall | 86.5% | 78% | +8.5pp |

---

## Storage Footprint

### Database Layer

| Store | Format | Role | Estimated Size (50K pages) |
|-------|--------|------|---------------------------|
| SQLite 3.45+ (WAL mode) | scrapus.db | Graph nodes/edges, structured data, explanation logs, FTS5 | ~500 MB |
| LanceDB | scrapus_data/lancedb/ | Vector embeddings (page, entity, lead, replay buffer) | ~2-4 GB |
| ChromaDB | scrapus_data/chromadb/ | Document storage, topic modeling, dedup | ~1-2 GB |
| **Total DB** | | | **~4-7 GB** |

### Model Artifacts

| Model | Location | Estimated Size |
|-------|----------|---------------|
| BERT NER (bert-base-cased, fine-tuned) | scrapus_data/models/bert-ner/ | ~440 MB |
| DQN (448-dim state, policy net) | scrapus_data/models/dqn/ | ~5-10 MB |
| Siamese (128-dim embeddings) | scrapus_data/models/siamese/ | ~50-100 MB |
| XGBoost | scrapus_data/models/xgboost/ | ~5-20 MB |
| Logistic Regression | scrapus_data/models/logreg/ | ~1 MB |
| Random Forest | scrapus_data/models/rf/ | ~10-50 MB |
| Local LLM (Ollama, e.g. Mistral 7B Q4) | system-managed | ~4 GB |
| **Total Models** | | **~4.5-4.6 GB (+ ~4 GB LLM)** |

### Full Deployment Footprint

| Component | Size |
|-----------|------|
| Databases | 4-7 GB |
| Model artifacts | 4.5-4.6 GB |
| Local LLM | ~4 GB |
| Python env + deps | ~2-3 GB |
| **Total** | **~15-19 GB** |

---

## Memory Budget

| Component | RAM Usage | Notes |
|-----------|----------|-------|
| SQLite (WAL reader) | ~50-100 MB | WAL mode enables concurrent reads |
| LanceDB (HNSW index, 100K vectors) | ~200-500 MB | Depends on dimension and index params |
| ChromaDB (10K documents) | ~200-400 MB | In-memory index + embeddings |
| BERT NER inference | ~1.2-1.5 GB | Single batch; reducible with ONNX/FP16 |
| DQN inference | ~50-100 MB | Small policy network |
| Siamese inference | ~100-200 MB | 128-dim contrastive encoder |
| XGBoost + ensemble | ~50-100 MB | Gradient boosting trees in memory |
| Local LLM (Ollama, Q4) | ~4-6 GB | Dominates memory budget |
| Python runtime + overhead | ~200-300 MB | Asyncio event loop, buffers |
| **Total peak** | **~6.5-9.5 GB** | Minimum 16 GB system RAM recommended |

---

## Latency Budget (per lead, end-to-end)

| Stage | Latency | Cumulative |
|-------|---------|-----------|
| Crawl (amortized per lead) | ~170 ms | 170 ms |
| NER extraction | ~10 ms | 180 ms |
| Entity resolution (ANN lookup) | ~1 ms | 181 ms |
| Lead matching (ensemble) | ~1 ms | 182 ms |
| Report generation (LLM) | ~10-30 sec | ~10-30 sec |
| **Total without LLM** | | **~182 ms** |
| **Total with LLM** | | **~10-30 sec** |

Note: crawl latency amortized = (50K pages / 10 pg/sec) / 300 leads = ~16.7 sec raw crawl per lead, but pipeline is overlapped/batched. The 170 ms figure assumes full pipeline overlap at ~5K pages/day sustained rate.

---

## Cost Analysis

### Local vs Cloud (Annual)

| Cost Component | Scrapus (Local) | Cloud-Native (Apollo/ZoomInfo tier) | Delta |
|---------------|-----------------|-------------------------------------|-------|
| Infrastructure | $1,500 one-time | $200-500/month ($2,400-6,000/yr) | -$900 to -$4,500 |
| API calls (LLM, vector DB) | $0 | $100-300/month ($1,200-3,600/yr) | -$1,200 to -$3,600 |
| Storage | $0 | $50-100/month ($600-1,200/yr) | -$600 to -$1,200 |
| Managed ops | $0 (self-service) | $100-200/month ($1,200-2,400/yr) | Variable |
| **Year 1 total** | **~$1,500** | **~$5,400-13,200** | **64-89% savings** |
| **Year 2+ total** | **~$0** (electricity) | **~$5,400-13,200** | **~100% savings** |

### Hardware Requirements

| Tier | RAM | CPU | Storage | GPU | Approx Cost |
|------|-----|-----|---------|-----|-------------|
| Minimum | 16 GB | 4 cores | 100 GB SSD | None | ~$600 |
| Recommended | 32 GB | 8 cores | 500 GB NVMe | RTX 3060+ | ~$1,500 |
| Production | 64 GB+ | 16+ cores | 1 TB+ NVMe | RTX 4090/A100 | ~$3,000+ |

---

## Competitive Positioning

### vs Cloud-Native (Apollo.io, ZoomInfo)

| Dimension | Scrapus | Cloud-Native |
|-----------|---------|-------------|
| Privacy | Full data sovereignty, GDPR-ready | Vendor trust required |
| Cost (3-year) | ~$1,500 total | ~$16,200-39,600 |
| Latency (file I/O) | Sub-ms | 10-100ms+ (network) |
| Scalability | Single machine | Unlimited horizontal |
| Collaboration | None built-in | Multi-user, real-time |
| Availability | Hardware-dependent | 99.9%+ SLA |

### vs Open-Source (spaCy Prodigy, Haystack)

| Dimension | Scrapus | Open-Source Alternatives |
|-----------|---------|------------------------|
| Scope | End-to-end (crawl to report) | Single-stage tools |
| Crawling | RL-enhanced (DQN+MAB) | None built-in |
| Local LLM | Ollama integration | Varies |
| Learning curve | Steeper (7-module pipeline) | Lower per-tool |
| Maintenance | User-managed | Community-supported |

Best fit: privacy-conscious SMBs, regulated industries (healthcare, finance, government), edge deployments, budget-constrained teams.

---

## Improvement Roadmap

### Current Architecture -> Next-Gen (from agent-15 deep synthesis)

```
Current:  SQLite + LanceDB + ChromaDB | BERT NER | Siamese | XGBoost | Basic RAG | Static eval
Next-Gen: DuckDB + LanceDB v2         | GLiNER2  | SupCon  | FT-Transformer | GraphRAG+Self-RAG | Continuous eval
```

### Ranked Improvements

| # | Improvement | Phase | Effort | Priority (1-5) | Expected Lift |
|---|------------|-------|--------|----------------|---------------|
| 1 | Model quantization (ONNX, FP16/INT8) | Q1 | 2-3 wk | 5 | 2-4x inference speedup, 50% memory reduction |
| 2 | Active learning (uncertainty sampling) | Q1 | 3-4 wk | 4 | Continuous improvement, reduced labeling cost |
| 3 | SHAP explainability + audit logging | Q1 | 2-3 wk | 4 | Debugging, compliance, trust |
| 4 | DuckDB migration for analytics | Q2 | 4-6 wk | 5 | 11-72x graph query speedup (Ge et al. 2025) |
| 5 | GLiNER2 zero-shot NER (hybrid w/ BERT) | Q2 | 4-5 wk | 4 | Zero-shot entity types; -3.8pp F1 trade-off |
| 6 | SupCon matching upgrade | Q2 | 4-5 wk | 3 | +4.5pp matching accuracy, +26pp cross-domain |
| 7 | GraphRAG + Self-RAG | Q3 | 5-6 wk | 4 | +24pp multi-hop reasoning, -67% hallucination |
| 8 | FT-Transformer ensemble | Q3 | 4-5 wk | 3 | +3.8pp precision, attention-based explanations |
| 9 | Conformal prediction (uncertainty) | Q3 | 3-4 wk | 3 | 95% coverage guarantee, -35% false positives |
| 10 | LLM-as-judge + causal attribution | Q4 | 5-6 wk | 3 | +22pp error attribution, +9pp judge agreement |
| 11 | Federated learning | Q4 | 6-8 wk | 2 | Collaborative improvement without data sharing |
| 12 | Cross-platform (ARM, mobile) | Q4+ | 8-12 wk | 2 | Broader deployment surface |
| 13 | Knowledge graph (Wikidata linking) | Q4+ | 10-14 wk | 2 | Richer entity relationships |
| 14 | Privacy-preserving analytics (HE, MPC) | Q4+ | 12-16 wk | 1 | Secure multi-party collaboration |

### Next-Gen Quantitative Targets (from deep research)

| Module | Metric | Current | Target | Delta |
|--------|--------|---------|--------|-------|
| Storage | Graph query latency | 4.2s | 0.38s | 11x faster |
| Storage | Memory usage | 4.2 GB | 1.5 GB | -64% |
| NER | New entity types | Requires retraining | Zero-shot | Qualitative leap |
| NER | Training data needed | 1,000 examples | 10-50 | 20-100x efficiency |
| Matching | Accuracy | 89.7% | 94.2% | +4.5pp |
| Matching | Cross-domain transfer | 52% | 78% | +26pp |
| Scoring | Precision | 89.7% | 93.5% | +3.8pp |
| Reports | Factual accuracy | 85% | 96% | +11pp |
| Reports | Hallucination rate | 12% | 4% | -67% |
| Eval | Error attribution | ~70% | ~92% | +22pp |

---

## Cross-Cutting Production Gaps

1. **No horizontal scaling.** Pipeline is single-machine. Cannot distribute crawling, NER, or matching across nodes. Mitigation: design stateless stages with queue-based handoff for future distribution.

2. **Manual operations.** Users responsible for model updates, backups, SQLite VACUUM, LanceDB compaction. No automated runbook. Mitigation: cron-based maintenance scripts, health-check endpoint.

3. **Monitoring is file-based logging only.** No metrics collection, alerting, or dashboard. CER and EAF are measured post-hoc, not in real time. Mitigation: Prometheus-style local metrics, SQLite-backed time-series for drift detection.

4. **Hybrid storage complexity.** Three distinct storage engines (SQLite, LanceDB, ChromaDB) require specialized knowledge for tuning, backup, and recovery. Mitigation: unified query interface layer; consider consolidating ChromaDB into LanceDB v2.

5. **No automated evaluation loop.** Evaluation (module 6) is batch/offline. No continuous pipeline monitoring, no concept drift detection, no automated retraining triggers. Mitigation: implement items 3 and 10 from the roadmap.

6. **Error propagation unchecked.** NER errors cascade into entity resolution and scoring. No stage-level confidence gating. Mitigation: add per-entity confidence scores; drop entities below threshold before downstream stages.

7. **Single-writer SQLite bottleneck.** WAL mode allows concurrent reads but only one writer. Under heavy crawl load, writes queue. Mitigation: batch inserts, or migrate analytical queries to DuckDB (roadmap item 4).

8. **No backup strategy.** File-based deployment means a disk failure loses everything. Mitigation: periodic rsync/snapshot to external storage; document recovery procedure.

---

## Bibliography

### System Architecture and Edge AI
1. Zhou, Z., et al. (2019). [Edge Intelligence: Paving the Last Mile of Artificial Intelligence With Edge Computing](https://doi.org/10.1109/jproc.2019.2918951)
2. Shuvo, M. M. H., et al. (2022). [Efficient Acceleration of Deep Learning Inference on Resource-Constrained Edge Devices](https://doi.org/10.1109/jproc.2022.3226481)
3. Nguyen, G., et al. (2019). [Machine Learning and Deep Learning frameworks and libraries for large-scale data mining](https://doi.org/10.1007/s10462-018-09679-z)

### Reinforcement Learning and Crawling
4. Mnih, V., et al. (2015). [Human-level control through deep reinforcement learning](https://doi.org/10.1038/nature14236)
5. Kontogiannis, S., et al. (2021). [Tree-based Focused Web Crawling with Reinforcement Learning](http://arxiv.org/abs/2112.07620)
6. Partalas, I., et al. (2008). [Reinforcement Learning with Classifier Selection for Focused Crawling](https://doi.org/10.3233/978-1-58603-891-5-759)

### NLP and Information Extraction
7. Devlin, J., et al. (2018). [BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](https://drops.dagstuhl.de/entities/document/10.4230/OASIcs.LDK.2019.21)
8. Zhong, Z., & Chen, D. (2021). [A Frustratingly Easy Approach for Entity and Relation Extraction](https://doi.org/10.18653/v1/2021.naacl-main.5)
9. Barbaresi, A. (2021). [Trafilatura: A Web Scraping Library and Command-Line Tool](https://doi.org/10.18653/v1/2021.acl-demo.15)
10. Zaratiana, U., et al. (2025). [GLiNER2: Schema-Driven Multi-Task Learning for Structured Information Extraction](https://doi.org/10.18653/v1/2025.emnlp-demos.10)
11. Cocchieri, et al. (2025). [ZeroNER: Fueling Zero-Shot Named Entity Recognition via Entity Type Descriptions](https://doi.org/10.18653/v1/2025.findings-acl.805)

### Entity Resolution and Matching
12. Zhang, W., et al. (2018). [A Graph-Theoretic Fusion Framework for Unsupervised Entity Resolution](https://doi.org/10.1109/icde.2018.00070)
13. Kirielle, N., et al. (2023). [Unsupervised Graph-Based Entity Resolution for Complex Entities](https://doi.org/10.1145/3533016)
14. Sung, F., et al. (2018). [Learning to Compare: Relation Network for Few-Shot Learning](https://doi.org/10.1109/cvpr.2018.00131)
15. Shen, et al. (2025). [LogiCoL: Logically-Informed Contrastive Learning for Set-based Dense Retrieval](https://doi.org/10.18653/v1/2025.emnlp-main.608)
16. Pulsone, et al. (2026). [BEACON: Budget-Aware Entity Matching Across Domains](http://arxiv.org/abs/2603.11391)

### Lead Scoring and Ensemble Methods
17. Elith, J., et al. (2008). [A working guide to boosted regression trees](https://doi.org/10.1111/j.1365-2656.2008.01390.x)
18. Hullermeier, E., & Waegeman, W. (2021). [Aleatoric and epistemic uncertainty in machine learning](https://doi.org/10.1007/s10994-021-05946-3)

### LLM and RAG Systems
19. Gao, Y., et al. (2023). [Retrieval-Augmented Generation for Large Language Models: A Survey](http://arxiv.org/abs/2312.10997)
20. Huang, L., et al. (2023). [A Survey on Hallucination in Large Language Models](http://arxiv.org/abs/2311.05232)
21. Wu, T., et al. (2022). [AI Chains: Transparent and Controllable Human-AI Interaction](https://doi.org/10.1145/3491102.3517582)
22. Knollmeyer, et al. (2025). [Document GraphRAG: Knowledge Graph Enhanced Retrieval Augmented Generation](https://doi.org/10.3390/electronics14112102)
23. Zhang, et al. (2025). [A Survey of Graph Retrieval-Augmented Generation for Customized Large Language Models](http://arxiv.org/abs/2501.13958)
24. Liu, et al. (2025). [HopRAG: Multi-Hop Reasoning for Logic-Aware Retrieval-Augmented Generation](https://doi.org/10.18653/v1/2025.findings-acl.97)

### Evaluation and Deployment
25. Luan, Y., et al. (2018). [Multi-Task Identification of Entities, Relations, and Coreference](https://doi.org/10.18653/v1/d18-1360)
26. Paleyes, A., et al. (2022). [Challenges in Deploying Machine Learning: A Survey of Case Studies](https://doi.org/10.1145/3533378)
27. Barredo Arrieta, A., et al. (2019). [Explainable Artificial Intelligence (XAI)](https://doi.org/10.1016/j.inffus.2019.12.012)
28. He, et al. (2023). [A Survey on Uncertainty Quantification Methods for Deep Learning](http://arxiv.org/abs/2302.13425)
29. Li, et al. (2025). [From Generation to Judgment: Opportunities and Challenges of LLM-as-a-judge](https://doi.org/10.18653/v1/2025.emnlp-main.138)

### Database and Storage
30. Ge, et al. (2025). [QuackIR: Retrieval in DuckDB and Other Relational Database Management Systems](https://doi.org/10.18653/v1/2025.emnlp-industry.33)

### Scrapus Case Study
31. Kaplan, A., et al. (2025). [A review of AI-based business lead generation: Scrapus as a case study](https://doi.org/10.3389/frai.2025.1606431)

### Additional References (from deep research iterations)
32. Naseem, U., et al. (2021). [A Comparative Analysis of Active Learning for Biomedical Text Mining](https://doi.org/10.3390/asi4010023)
33. Kairouz, P., et al. (2020). [Advances and Open Problems in Federated Learning](https://doi.org/10.1561/2200000083)
34. Chen, et al. (2022). [THE-X: Privacy-Preserving Transformer Inference with Homomorphic Encryption](https://doi.org/10.18653/v1/2022.findings-acl.277)
35. Bai, et al. (2022). [From Platform to Knowledge Graph: Evolution of Laboratory Automation](https://doi.org/10.1021/jacsau.1c00438)
