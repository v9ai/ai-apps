# Scrapus

Local-first B2B lead generation pipeline. RL crawling, BERT NER, Siamese entity resolution, ensemble lead scoring, and local LLM report generation -- all on commodity hardware, zero cloud dependencies.

## Quick Navigation

| I want to... | Go to |
|---|---|
| Understand the architecture | [SYNTHESIS.md](SYNTHESIS.md), [module-0/README.md](module-0-system-overview/README.md) |
| Deploy or run the system | [DEPLOYMENT.md](DEPLOYMENT.md), [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md) |
| Understand a specific module | [module-N/README.md](#module-map) (see table below) |
| See all storage schemas | [DATA_DICTIONARY.md](DATA_DICTIONARY.md) |
| Check performance numbers | [BENCHMARKS.md](BENCHMARKS.md) |
| Understand security and privacy | [SECURITY.md](SECURITY.md) |
| See how modules connect | [INTEGRATION.md](INTEGRATION.md) |
| Tune parameters | [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md) |

## Folder Structure

```
scrapus/
├── README.md                    <- You are here
├── SYNTHESIS.md                 <- Master analysis document
├── DATA_DICTIONARY.md           <- All storage schemas (SQLite, LanceDB, ChromaDB)
├── INTEGRATION.md               <- Cross-module contracts and data flow
├── DEPLOYMENT.md                <- Installation, operations, troubleshooting
├── SECURITY.md                  <- Threat model, privacy, compliance
├── BENCHMARKS.md                <- Performance numbers with methodology
├── CONFIG_REFERENCE.md          <- Every tunable parameter
├── module-0-system-overview/
│   ├── README.md
│   ├── RESEARCH.md
│   └── IMPLEMENTATION.md
├── module-1-crawler/            (same README/RESEARCH/IMPLEMENTATION structure)
├── module-2-extraction/
├── module-3-entity-resolution/
├── module-4-lead-matching/
├── module-5-report-generation/
├── module-6-evaluation/
├── research-output/
│   ├── INDEX.md
│   └── agent-01..15.md
└── scrapus_data/
    ├── chromadb/                 Document store
    ├── lancedb/                  Vector store
    └── models/                   Trained model artifacts
```

## Module Map

| # | Module | Key Tech | Key Metric |
|---|--------|----------|-----------|
| 0 | [System Overview](module-0-system-overview/) | SQLite WAL + LanceDB HNSW + ChromaDB | Hybrid storage, ~15 GB footprint |
| 1 | [Crawler](module-1-crawler/) | DQN (448-dim state) + UCB1 MAB | 3x harvest rate, 820 domains |
| 2 | [Extraction](module-2-extraction/) | BERT-base-cased + spaCy + BERTopic | F1 92.3%, ~100 pages/sec |
| 3 | [Entity Resolution](module-3-entity-resolution/) | Siamese 128-dim + SQLite CTEs | <1ms ANN, 0.05 cosine threshold |
| 4 | [Lead Matching](module-4-lead-matching/) | XGBoost 50% + LogReg 25% + RF 25% | Precision 89.7%, Recall 86.5% |
| 5 | [Report Generation](module-5-report-generation/) | Ollama + SQLite/ChromaDB RAG | 85% factual accuracy, ~10-30s/report |
| 6 | [Evaluation](module-6-evaluation/) | SHAP + cascade error tracking | CER ~0.15, EAF 1.2x |

## Key Metrics

| Pipeline Stage | Key Metric | Value |
|---|---|---|
| End-to-end funnel | Page-to-lead reduction | 50K pages -> 300 leads (99.4%) |
| Crawling | Harvest rate | ~15% (3x over baseline) |
| NER Extraction | F1 score | 92.3% (P 93.1%, R 91.5%) |
| Entity Resolution | ANN query latency | <1ms |
| Lead Matching | Precision / Recall | 89.7% / 86.5% (PR-AUC 0.92) |
| Report Generation | Factual accuracy | 97% user satisfaction |
| Per-lead latency | Without LLM | ~182 ms |
| Annual cost | Local vs cloud savings | 64-89% ($1,500 vs $5,400-13,200) |

## Top-Level Docs

| Document | Purpose |
|---|---|
| [SYNTHESIS.md](SYNTHESIS.md) | Master analysis: architecture, metrics, roadmap, bibliography (35 papers) |
| [DATA_DICTIONARY.md](DATA_DICTIONARY.md) | Complete schemas for SQLite, LanceDB, and ChromaDB stores |
| [INTEGRATION.md](INTEGRATION.md) | Cross-module contracts, data flow, interface definitions |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Installation, hardware requirements, operations runbook |
| [SECURITY.md](SECURITY.md) | Threat model, GDPR posture, data privacy analysis |
| [BENCHMARKS.md](BENCHMARKS.md) | All performance numbers with methodology and baselines |
| [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md) | Every tunable parameter across all 7 modules |

## Per-Module Docs

Each `module-N-*/` folder contains:
- **README.md** -- Summary and key decisions
- **RESEARCH.md** -- Consolidated literature and analysis
- **IMPLEMENTATION.md** -- Code-level guidance (where available)

Raw research files: [research-output/INDEX.md](research-output/INDEX.md) maps all 30 agent outputs to their modules.

## References

Primary case study: Kaplan, A., et al. (2025). [A review of AI-based business lead generation: Scrapus as a case study](https://doi.org/10.3389/frai.2025.1606431). Full bibliography in [SYNTHESIS.md](SYNTHESIS.md) (35 papers).
