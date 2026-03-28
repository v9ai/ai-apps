# Research Output

All pipeline research consolidated into flat files — one per module.

## Modules

| # | File | Topic |
|---|------|-------|
| 00 | [system-architecture.md](system-architecture.md) | Local-first ML pipeline, storage trade-offs |
| 01 | [01-crawler.md](01-crawler.md) | RL-focused web crawling, DQN + MAB |
| 02 | [extraction.md](extraction.md) | BERT NER, spaCy, GLiNER2, BERTopic |
| 03 | [entity-resolution.md](entity-resolution.md) | Siamese matching, blocking, SupCon |
| 04 | [lead-matching.md](lead-matching.md) | XGBoost ensemble, FT-Transformer, scoring |
| 05 | [05-report-generation.md](05-report-generation.md) | RAG pipeline, GraphRAG, Self-RAG |
| 06 | [06-evaluation.md](06-evaluation.md) | End-to-end eval, LLM-as-judge, XAI |
| 07 | [07-synthesis.md](07-synthesis.md) | Unified pipeline analysis, upgrade roadmap |
| 08 | [08-novelty.md](08-novelty.md) | Late 2025/2026 infrastructure breakthroughs |

## Structure per file

Each module file contains sections in order: Research, Deep Research, Implementation, Novel Approaches, then all raw Agent Research files.

---

## AI Features — Open-Source Ecosystem

Deep reports on 14 open-source tools across the B2B lead gen stack. Each report has 12 sections: AI architecture, key features, data pipeline, evaluation, Rust/ML relevance, integration points, gaps, takeaways, deep ML analysis, research papers, and recency/changelog.

| File | Tool | Stars | AI Layer | Staleness |
|------|------|-------|----------|-----------|
| [brightdata-lead-generator.md](ai-features/brightdata-lead-generator.md) | Bright Data AI Lead Gen | ~50 | GPT-3.5/4o-mini direct | Dead — marketing demo |
| [business-leads-ai-automation.md](ai-features/business-leads-ai-automation.md) | Business Leads AI | 69 | GPT-4o-mini single call | Borderline stale |
| [chatwoot.md](ai-features/chatwoot.md) | Chatwoot | 28k | Captain AI V2 + ONNX sentiment | Active (~1 AI commit/3 days) |
| [crawl4ai.md](ai-features/crawl4ai.md) | Crawl4AI | 62k | LiteLLM + BM25 + CosineStrategy | Active — pin ==0.8.5 |
| [dittofeed.md](ai-features/dittofeed.md) | Dittofeed | ~2k | None (LLM feature never shipped) | Declining velocity |
| [firecrawl.md](ai-features/firecrawl.md) | Firecrawl | 81k | Vercel AI SDK + Spark models | Active — /interact endpoint new |
| [langgraph-sales-outreach.md](ai-features/langgraph-sales-outreach.md) | LangGraph Sales Outreach | 258 | LangGraph DAG + Gemini | Frozen Jan 2025 — fork only |
| [leadsdb.md](ai-features/leadsdb.md) | LeadsDB | 28 | SpaCy vectors (broken) | Zombie — do not use |
| [mautic.md](ai-features/mautic.md) | Mautic | ~7k | None (rule-based only) | Active but zero AI velocity |
| [n8n.md](ai-features/n8n.md) | n8n | ~90k | Vercel AI SDK v6 + LangChain | Active — license blocks competing products |
| [salesgpt.md](ai-features/salesgpt.md) | SalesGPT | 2.2k | LangChain 0.1 dual-chain | Dead — maintainer moved on |
| [scrapegraphai.md](ai-features/scrapegraphai.md) | ScrapeGraphAI | 21k | Custom DAG + Qwen3-1.7B QLoRA | Active — model on HuggingFace |
| [skyvern.md](ai-features/skyvern.md) | Skyvern | 21k | LiteLLM vision loop + Code 2.0 | Active — daily releases |
| [twenty-crm.md](ai-features/twenty-crm.md) | Twenty CRM | ~25k | Vercel AI SDK v6 + tool registry | Active — IS_AI_ENABLED GA imminent |

→ [Full comparison matrix and recommended stack](ai-features/README.md)
