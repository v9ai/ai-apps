# TODO: AI Consultancy Lead Generation

Target: Find leads (key contacts + emails) at AI consultancies worldwide.

## Quick Start

```bash
make leads          # runs everything: discover → domains → build → pipeline → import
```

## Individual Stages

```bash
make leads-discover   # Phase 1: scrape Clutch/GoodFirms/Wellfound + MLX classify
make leads-domains    # Phase 2: extract domains → domains.txt
make leads-build      # Phase 3: cargo build --release
make leads-pipeline   # Phase 4: full 5-stage Rust pipeline + score + export
make leads-import     # Phase 5: CSV → Neon PostgreSQL

make leads-top                        # review top 50 leads
make leads-report DOMAIN=faculty.ai   # generate report for a prospect
make leads-clean                      # remove generated data
```

## Prerequisites

- [ ] Install Python deps: `pip install aiohttp beautifulsoup4 lancedb sentence-transformers mlx-lm`
- [ ] (Optional) Start mlx_lm server for LLM fallback: `MLX_LM_SERVER=1 mlx_lm.server --model mlx-community/Qwen3-8B-4bit --port 8080`

## Quality Assurance

- [ ] `make leads-top` — review top 50 for relevance
- [ ] Check email verification rate (target >30%)
- [ ] Verify global coverage (US, UK, DE, FR, NL, Nordics, CA, AU, SG, etc.)
- [ ] `make leads-report DOMAIN=<top-domain>` for top prospects
- [ ] `make db-studio` — browse imported data

## Changes Made

| File | Change |
|------|--------|
| `consultancies/discover.py` | Global regions, seed companies, Clutch/GoodFirms URLs |
| `consultancies/extract_domains.py` | New: LanceDB → domains.txt extraction |
| `scripts/import-rust-leads.ts` | New: Rust CSV → Neon PostgreSQL import |
| `Makefile` | New `leads*` targets for full pipeline orchestration |
| `crates/leadgen/src/main.rs` | `--icp-ai-consultancy` flag, `MLX_LM_SERVER` env var, `drop(index_writer)` before pipeline |
| `crates/leadgen/src/crawler/mod.rs` | NER confidence threshold 40→30, graceful LLM fallback |
| `crates/leadgen/src/crawler/extractor.rs` | Fix UTF-8 char boundary panic in `truncate_for_llm` |

## Bugs Fixed

1. **Tantivy lock conflict** — `main()` created an `IndexWriter` that held a lock, then `CrawlStage` tried to create another. Fix: `drop(index_writer)` before entering the pipeline branch.
2. **UTF-8 panic** — `truncate_for_llm()` used `&text[..max_bytes]` which panics on multi-byte chars (e.g. Chinese). Fix: walk back to valid char boundary with `is_char_boundary()`.
3. **LLM connection panic** — When Ollama is unavailable, every LLM fallback call failed and propagated errors. Fix: catch LLM errors and return NER result even if low-confidence.
4. **Bad seed URLs** — Three seed companies used `https://www.2000.com/` placeholder URLs. Fix: replaced with real domains.
5. **Missing Python deps** — `beautifulsoup4` not installed. Fix: `pip3 install aiohttp beautifulsoup4`.
