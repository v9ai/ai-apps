# AI Features — Open-Source Lead Gen Ecosystem

Deep research reports on 14 open-source tools across the B2B lead generation stack. Each report covers AI architecture, key features, data pipeline, evaluation, Rust/ML relevance, integration points, gaps, and concrete takeaways.

---

## Comparison Matrix

| Tool | Stars | License | AI Layer | LLM Provider | Scraping | Enrichment | Outreach | CRM | Rust Relevance |
|------|-------|---------|----------|--------------|----------|------------|----------|-----|----------------|
| [SalesGPT](./salesgpt.md) | 2.2k | MIT | LangChain dual-chain | Any (LiteLLM) | — | — | Email/SMS/WhatsApp | — | Medium — stage classifier replaceable with Candle classifier |
| [Bright Data Lead Gen](./brightdata-lead-generator.md) | ~50 | MIT | Direct OpenAI SDK | GPT-3.5 / gpt-4o-mini | Bright Data API | Per-lead JSON scoring | — | — | High — filter extraction replaceable with Phi-3-mini/Qwen2.5 |
| [LangGraph Sales Outreach](./langgraph-sales-outreach.md) | 258 | None | LangGraph DAG, 17 nodes | Gemini-1.5-flash/pro | LinkedIn RapidAPI | Fan-out research | Email (Gmail) | HubSpot/Airtable/Sheets | Medium — fan-out pattern replicable in Vercel AI SDK |
| [LeadsDB](./leadsdb.md) | 28 | MIT | SpaCy vectors + broken GPT-3.5 | GPT-3.5 (unused) | NRD ingestion | Cassandra/AstraDB | — | — | High — NRD→pgvector pattern fully viable in Rust |
| [Crawl4AI](./crawl4ai.md) | 62k | Apache 2.0 | LiteLLM (any provider) | Model-agnostic | Playwright + async | BM25 filter + schema extract | — | — | High — static pipeline fully replicable in Rust |
| [ScrapeGraphAI](./scrapegraphai.md) | 21k | MIT | Custom DAG on LangChain | Model-agnostic (26 graph types) | Playwright/requests | Pydantic schema extraction | — | — | High — spider_rs + fastembed-rs replaces Python stack |
| [Firecrawl](./firecrawl.md) | 81k | AGPL | Vercel AI SDK (multi-provider) | Anthropic/OpenAI/Groq/Ollama | 8-engine waterfall | Schema-based tool use | — | — | Medium — Rust used internally for link extraction/PDF |
| [Skyvern](./skyvern.md) | 21k | AGPL | LiteLLM vision loop | OpenAI/Anthropic/Gemini | LLM + computer vision | DOM extraction | — | — | Low — vision loop requires Python/Playwright |
| [Chatwoot](./chatwoot.md) | 28k | MIT + EE | Captain AI (ai-agents gem) | GPT-4.1/5.x (OpenAI only active) | Firecrawl/HTTP | pgvector RAG + ONNX sentiment | Email/WhatsApp/SMS | Built-in | Medium — ONNX sentiment sidecar pattern directly applicable |
| [Twenty CRM](./twenty-crm.md) | ~25k | AGPL | Vercel AI SDK v5 | OpenAI/Anthropic/Google/Mistral/xAI | — | LLM-as-judge eval | Workflow AI agents | Built-in | High — Logic Functions bridge, mlx_lm.server plug-in ready |
| [Dittofeed](./dittofeed.md) | ~2k | MIT | None (LLM planned) | — (LiquidJS templates) | — | — | Email/SMS/Push/WhatsApp | — | High — segment eval loop CPU-bound, Rust + minijinja viable |
| [Mautic](./mautic.md) | ~7k | GPL v3 | None (rule-based only) | — | — | — | Email campaigns | Built-in | High — scoring engine replaceable with Rust ONNX sidecar |
| [n8n](./n8n.md) | ~90k | Fair-code | Vercel AI SDK v6 + LangChain | Model-agnostic | — | — | 400+ integrations | — | Medium — `@n8n/agents` PostgresMemory/pgvector usable; license blocks competing products |
| [Business Leads AI](./business-leads-ai-automation.md) | 69 | MIT | Single OpenAI chat completion | gpt-4o-mini (OPENAI_BASE_URL swappable) | Puppeteer/Google Maps | Batch+placeholder templates | Email/WhatsApp | — | High — full replacement trivial |

---

## By Category

### Full-Stack AI Sales/Outreach Agents
- [SalesGPT](./salesgpt.md) — Production-grade dual-chain LLM agent with tool use (Stripe, Gmail, Calendly). Pinned on LangChain 0.1 — evaluate carefully.
- [LangGraph Sales Outreach](./langgraph-sales-outreach.md) — Best-in-class graph architecture. Fan-out parallel research, SPIN outreach, model tiering. No license.
- [Bright Data Lead Gen](./brightdata-lead-generator.md) — Good two-stage decomposition pattern. Fatal production gaps (no sorting, no contact data, serial API calls).
- [Business Leads AI](./business-leads-ai-automation.md) — Simplest possible architecture. Batch+placeholder cost optimization pattern is the one thing worth stealing.

### AI-Powered Scraping & Enrichment
- [Crawl4AI](./crawl4ai.md) — **Best choice for company page ingestion.** BM25 pre-filter cuts LLM cost 60-80%. AsyncUrlSeeder + Common Crawl for cold discovery.
- [ScrapeGraphAI](./scrapegraphai.md) — **Best for structured extraction.** Pydantic schema-driven. 1.7B fine-tuned model at 88.66% F1 — replacement for GPT-4o-mini possible.
- [Firecrawl](./firecrawl.md) — **Best managed API.** Use only for bot-protected targets; 5x credit cost for JSON extraction. Spark models are proprietary.
- [Skyvern](./skyvern.md) — **Reserve for high-ICP targets only.** ~$0.40-1.50/task. Vision loop for sites that block conventional scraping.

### CRM & Engagement
- [Chatwoot](./chatwoot.md) — Best for inbound response handling. Captain AI V2 multi-agent is solid. pgvector RAG pattern is directly forkable. ONNX sentiment is buried but usable.
- [Twenty CRM](./twenty-crm.md) — **Best architectural fit.** Vercel AI SDK v5, tool registry auto-generates CRUD tools per object, Logic Functions bridge for Rust ML, mlx_lm.server plug-in ready.
- [Dittofeed](./dittofeed.md) — **Best for outreach sequencing.** Temporal + ClickHouse architecture is production-grade. Zero AI today — LLM-generated personalization injected as user properties before LiquidJS rendering is the right pattern.
- [Mautic](./mautic.md) — Skip for new builds. PHP/Symfony, rule-based scoring only. Leuchtfeuer benchmark: 77% accuracy vs 95% for ML model. Scoring pattern is documented but outdated.

### Orchestration
- [n8n](./n8n.md) — `@n8n/agents` SDK is production-quality (PostgresMemory/pgvector, HITL, LangSmith). **License blocks use in competing products.** MCP bidirectional (expose workflows as MCP tools) is the moat worth replicating.
- [LeadsDB](./leadsdb.md) — Archived prototype. NRD-as-signal approach is the only value. Entire dual-store architecture (Firestore + Cassandra) replaceable with `ORDER BY embedding <=> $vector` on Neon.

---

## Cross-Cutting Patterns Worth Adopting

| Pattern | Source | Description |
|---------|--------|-------------|
| **Two-stage extract/enrich** | Bright Data | NLU filter → per-lead enrichment decoupling |
| **BM25 pre-filter** | Crawl4AI | Compress pages 60-80% before LLM extraction |
| **Fan-out parallel research** | LangGraph Outreach | Simultaneous blog + YouTube + news nodes |
| **Model tiering** | LangGraph Outreach | Flash model for leaf nodes, Pro only for synthesis/scoring |
| **Pydantic schema-driven extraction** | ScrapeGraphAI | Schema as the AI extraction contract surface |
| **Batch + placeholder** | Business Leads AI | One LLM call → template with tokens → string replace per lead |
| **SPIN methodology** | LangGraph Outreach | Situation → Problem → Implication → Need-payoff in prompts |
| **NRD-as-signal** | LeadsDB | Newly Registered Domains → company discovery via pgvector |
| **pgvector RAG** | Chatwoot / n8n | Text-embedding-3-small + IVFFlat/HNSW on Neon natively |
| **Logic Function bridge** | Twenty CRM | TypeScript function marked `isTool: true` → HTTP call to Rust ML sidecar |
| **LLM-as-judge eval** | Twenty CRM | AgentTurnGraderService scores every conversation turn 0-100 |
| **MCP tool exposure** | n8n / Twenty | Expose internal workflows/tools as MCP server for external AI agents |
| **ONNX sentiment sidecar** | Chatwoot | On-device 69MB model, JSONB storage, no LLM cost |

---

## License Risk Summary

| Tool | License | Risk for Competing Product |
|------|---------|---------------------------|
| Crawl4AI | Apache 2.0 | None |
| ScrapeGraphAI | MIT | None |
| SalesGPT | MIT | None |
| Bright Data Lead Gen | MIT | None |
| Business Leads AI | MIT | None |
| LeadsDB | MIT | None |
| Dittofeed | MIT | None |
| LangGraph Outreach | No license | Ask before using |
| Mautic | GPL v3 | Copyleft — must open-source derivatives |
| Firecrawl | AGPL | Copyleft — must open-source network service |
| Skyvern | AGPL | Copyleft — must open-source network service |
| Chatwoot | MIT (core) + EE | Captain AI requires Enterprise license |
| Twenty CRM | AGPL | Copyleft — must open-source network service |
| n8n | Fair-code (Sustainable Use) | **Explicitly prohibits competing SaaS products** |

---

## Recommended Stack for This Platform

```
Discovery:    Crawl4AI (AsyncUrlSeeder + Common Crawl) → Firecrawl (bot-protected targets only)
Extraction:   ScrapeGraphAI Pydantic schema + BM25 pre-filter pattern from Crawl4AI
Enrichment:   LangGraph fan-out pattern (Vercel AI SDK) with model tiering
Scoring:      Rust ONNX sidecar (tract/candle) — replace Python classifiers
Contact:      Email-domain → Google search → LinkedIn (from LangGraph repo)
Outreach:     Dittofeed journeys triggered by pipeline events + LLM personalization as user props
CRM:          Twenty CRM — Vercel AI SDK v5, tool registry, Logic Functions bridge
Eval:         LLM-as-judge pattern (Twenty) + BM25/F1 metrics (ScrapeGraphAI paper)
```
