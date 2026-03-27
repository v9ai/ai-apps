# leadgen

B2B lead generation engine — crawls company websites, extracts contacts via zero-alloc NER state machine, embeds via Candle on M1 Metal, schedules domains with multi-armed bandits (D-UCB, Thompson Sampling, NeuralUCB), and scores leads against an Ideal Customer Profile.

## Architecture

```
Domain input → Bandit Scheduler → Adaptive URL Scorer → Fetcher → NER Extraction → Scoring → Export
                    ↑                                                    ↓
              Composite Reward ←──────── Extraction Feedback ←──── Candle Embedder
                    ↓                                                    ↓
              Eval (regret, PSI drift)                            QuantizedEmbeddingStore
```

## ML Modules

| Module | Description |
|--------|-------------|
| `crawler/scheduler` | Multi-armed bandit domain scheduling — D-UCB (Liu 2024), SW-UCB, Thompson Sampling (Cazzaro 2025). Xorshift64 PRNG, Marsaglia-Tsang Gamma, Box-Muller normals. |
| `crawler/neural_ucb` | NeuralUCB contextual bandits — 3-layer MLP (16→64→64→1), MC dropout uncertainty, mini-batch SGD with hand-rolled backprop. ~5K params, trains in <50ms. |
| `crawler/contact_ner` | Zero-alloc contact NER state machine — 5 extraction patterns (Name/Title combos), `#[repr(C)]` output, runs in microseconds. |
| `crawler/url_scorer` | Adaptive URL scoring with extraction feedback loop (CLARS-DQN inspired). Static heuristics + learned keyword boosts. |
| `vector/embedding` | `CandleEmbedder` — in-process `all-MiniLM-L6-v2` (384-dim) on M1 Metal via Candle. ~2-3K texts/sec. |
| `eval/ner_eval` | NER evaluation — P/R/F1 per entity type against cached LLM extractions. |
| `eval/regret` | Cumulative regret tracking — oracle comparison, strategy benchmarking. |
| `eval/drift` | PSI drift detection — 10-bucket histogram comparison, alerts on distribution shift. |

## Other Modules

| Module | Description |
|--------|-------------|
| `db` | SQLite persistence (companies, contacts, email patterns, enrichment cache, lead scores) |
| `crawler/extractor` | HTML content extraction (links, emails, visible text) |
| `crawler/fetcher` | HTTP fetcher with per-domain rate limiting |
| `entity_resolution` | 7-signal Jaro-Winkler composite + petgraph union-find clustering |
| `email` | Email discovery, 9-pattern inference, MX checking, SMTP verification |
| `scoring` | ICP-based lead scoring: 85% fit + 15% recency, 6 weighted dimensions |
| `search` | Tantivy full-text search indexing with BM25 ranking |
| `pipeline` | 4-stage pipeline orchestrator (crawl → score → resolve → verify) |
| `api` | REST API via Axum |

## CLI

```bash
leadgen serve                   # Start REST API on :3000
leadgen enrich example.com      # Crawl single domain (NER-first, LLM fallback)
leadgen batch domains.txt       # Batch crawl from file
leadgen pipeline domains.txt    # Full pipeline: crawl → score → resolve → verify
leadgen resolve                 # Run entity resolution on all contacts
leadgen verify user@example.com # Verify single email (MX + SMTP)
leadgen score                   # Score all leads against ICP
leadgen top 20                  # Show top scored leads
leadgen export leads.csv        # Export to CSV
```

## Key Dependencies

- `candle-core/nn/transformers` — ML inference on M1 Metal GPU (BERT embeddings)
- `ndarray` — linear algebra for NeuralUCB MLP training
- `sqlx` — async SQLite
- `tantivy` — full-text search
- `axum` + `tower-http` — REST API
- `scraper` — HTML parsing
- `hickory-resolver` — async DNS (MX lookups)
- `strsim` — Jaro-Winkler similarity
- `petgraph` — union-find graph clustering

No Ollama. No cloud LLM APIs in the critical path.
