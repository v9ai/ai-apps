# Research Output

All pipeline research organized by module. Each folder is self-contained with agent research files, consolidated summaries, implementation guides, and novelty notes.

## Modules

| # | Module | Folder | Topic | Files |
|---|--------|--------|-------|-------|
| 0 | System Architecture | [system-architecture/](system-architecture/) | Local-first ML pipeline, storage trade-offs | 10 |
| 1 | Crawler | [crawler/](crawler/) | RL-focused web crawling, DQN + MAB | 10 |
| 2 | Extraction / NER | [extraction/](extraction/) | BERT NER, spaCy, GLiNER2, BERTopic | 10 |
| 3 | Entity Resolution | [entity-resolution/](entity-resolution/) | Siamese matching, blocking, SupCon | 10 |
| 4 | Lead Matching | [lead-matching/](lead-matching/) | XGBoost ensemble, FT-Transformer, scoring | 10 |
| 5 | Report Generation | [report-generation/](report-generation/) | RAG pipeline, GraphRAG, Self-RAG | 15 |
| 6 | Evaluation | [evaluation/](evaluation/) | End-to-end eval, LLM-as-judge, XAI | 10 |

## Cross-cutting

| Folder | Topic | Files |
|--------|-------|-------|
| [synthesis/](synthesis/) | Unified pipeline analysis, upgrade roadmap | 5 |
| [novelty/](novelty/) | Late 2025/2026 infrastructure breakthroughs | 3 |

## File conventions

Each module folder contains:

- `RESEARCH.md` — Consolidated literature review
- `DEEP_RESEARCH.md` — Deep-dive with 2024-2026 papers
- `IMPLEMENTATION.md` — Implementation guide
- `novel.md` — Novel approaches and innovations
- `MODULE_README.md` — Original module overview
- `agent-NN-*.md` — Raw agent research files (Pass 1, Pass 1 deep, Pass 2, Pass 2 upgrade)
