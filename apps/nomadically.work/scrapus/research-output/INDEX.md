# Research Output Index

Maps each agent research file to its pipeline module and consolidation target.

## Agent -> Module Mapping

| Agent | File | Module | Topic | Consolidated Into |
|-------|------|--------|-------|-------------------|
| agent-01 | agent-01-system-architecture-research.md | module-0 | Local-first ML pipeline architecture, storage trade-offs | module-0-system-overview/RESEARCH.md |
| agent-01 | agent-01-deep-system-architecture.md | module-0 | Deep dive: 2024-2026 local-first ML infrastructure advances | module-0-system-overview/RESEARCH.md |
| agent-02 | agent-02-rl-focused-crawling-research.md | module-1 | DQN + MAB focused web crawling, state representation | module-1-crawler/RESEARCH.md |
| agent-02 | agent-02-deep-rl-crawling.md | module-1 | Deep dive: 2023-2026 RL crawling advances | module-1-crawler/RESEARCH.md |
| agent-03 | agent-03-ner-extraction-research.md | module-2 | BERT NER, spaCy, BERTopic, information extraction pipeline | module-2-extraction/RESEARCH.md |
| agent-03 | agent-03-deep-extraction-nlp.md | module-2 | Deep dive: GLiNER2, ZeroNER, extraction breakthroughs | module-2-extraction/RESEARCH.md |
| agent-04 | agent-04-entity-resolution-research.md | module-3 | Siamese matching, SQLite graph store, blocking strategies | module-3-entity-resolution/RESEARCH.md |
| agent-04 | agent-04-deep-entity-resolution.md | module-3 | Deep dive: LLM-era entity resolution, SupCon, LogiCoL | module-3-entity-resolution/RESEARCH.md |
| agent-05 | agent-05-lead-scoring-research.md | module-4 | XGBoost ensemble, Siamese ICP matching, calibration | module-4-lead-matching/RESEARCH.md |
| agent-05 | agent-05-deep-lead-scoring.md | module-4 | Deep dive: FT-Transformer, conformal prediction, SupCon | module-4-lead-matching/RESEARCH.md |
| agent-06 | agent-06-llm-report-generation-research.md | module-5 | RAG pipeline, local LLM (Ollama), hallucination mitigation | module-5-report-generation/RESEARCH.md |
| agent-06 | agent-06-deep-report-generation.md | module-5 | Deep dive: GraphRAG, Self-RAG, HopRAG advances | module-5-report-generation/RESEARCH.md |
| agent-07 | agent-07-pipeline-evaluation-research.md | module-6 | End-to-end evaluation, cascade error, XAI | module-6-evaluation/RESEARCH.md |
| agent-07 | agent-07-deep-pipeline-evaluation.md | module-6 | Deep dive: LLM-as-judge, causal attribution, continuous QA | module-6-evaluation/RESEARCH.md |
| agent-08 | agent-08-system-architecture-impl.md | module-0 | Implementation: SQLite config, LanceDB setup, deployment | module-0-system-overview/IMPLEMENTATION.md |
| agent-08 | agent-08-upgrade-system-architecture.md | module-0 | Upgrade blueprint: DuckDB+QuackIR migration, LanceDB v2 | module-0-system-overview/IMPLEMENTATION.md |
| agent-09 | agent-09-rl-crawler-impl.md | module-1 | Implementation: DQN training, MAB scheduling, replay buffer | module-1-crawler/RESEARCH.md |
| agent-09 | agent-09-upgrade-crawler.md | module-1 | Upgrade blueprint: next-gen crawler architecture | module-1-crawler/RESEARCH.md |
| agent-10 | agent-10-ner-extraction-impl.md | module-2 | Implementation: BERT fine-tuning, spaCy pipeline, BERTopic | module-2-extraction/RESEARCH.md |
| agent-10 | agent-10-upgrade-extraction.md | module-2 | Upgrade blueprint: GLiNER2+ZeroNER hybrid NER | module-2-extraction/RESEARCH.md |
| agent-11 | agent-11-entity-resolution-impl.md | module-3 | Implementation: Siamese training, blocking, SQLite CTEs | module-3-entity-resolution/RESEARCH.md |
| agent-11 | agent-11-upgrade-entity-resolution.md | module-3 | Upgrade blueprint: SupCon+BEACON modernization | module-3-entity-resolution/RESEARCH.md |
| agent-12 | agent-12-lead-scoring-impl.md | module-4 | Implementation: ensemble config, Platt scaling, thresholds | module-4-lead-matching/RESEARCH.md |
| agent-12 | agent-12-upgrade-lead-matching.md | module-4 | Upgrade blueprint: FT-Transformer, conformal prediction | module-4-lead-matching/RESEARCH.md |
| agent-13 | agent-13-report-generation-impl.md | module-5 | Implementation: RAG pipeline, Ollama, structured JSON | module-5-report-generation/RESEARCH.md |
| agent-13 | agent-13-upgrade-report-generation.md | module-5 | Upgrade blueprint: GraphRAG+Self-RAG architecture | module-5-report-generation/RESEARCH.md |
| agent-14 | agent-14-pipeline-evaluation-impl.md | module-6 | Implementation: metrics, SHAP, cascade tracking | module-6-evaluation/RESEARCH.md |
| agent-14 | agent-14-upgrade-evaluation.md | module-6 | Upgrade blueprint: LLM-as-judge, causal attribution | module-6-evaluation/RESEARCH.md |
| agent-15 | agent-15-pipeline-synthesis.md | synthesis | Unified pipeline analysis, cost comparison, roadmap | SYNTHESIS.md |
| agent-15 | agent-15-deep-pipeline-synthesis.md | synthesis | Definitive upgrade plan, next-gen targets, migration path | SYNTHESIS.md |

## Research Phases

The 30 agent files represent three research passes:

1. **Pass 1 (agents 01-07):** Initial literature research per module. Filed as `agent-NN-<topic>-research.md`.
2. **Pass 1 deep (agents 01-07):** Second-pass deep dives with 2024-2026 papers. Filed as `agent-NN-deep-<topic>.md`.
3. **Pass 2 (agents 08-14):** Implementation best practices per module. Filed as `agent-NN-<topic>-impl.md`.
4. **Pass 2 upgrade (agents 08-14):** Upgrade blueprints with migration specs. Filed as `agent-NN-upgrade-<topic>.md`.
5. **Pass 3 (agent 15):** Cross-module synthesis and unified analysis. Filed as `agent-15-pipeline-synthesis.md` and `agent-15-deep-pipeline-synthesis.md`.

## How to Navigate

- For the consolidated view of any module, go to `module-N-<name>/RESEARCH.md` and (where present) `IMPLEMENTATION.md`.
- For the full pipeline synthesis, see `../SYNTHESIS.md`.
- For the original unedited research, read the agent files listed above.
