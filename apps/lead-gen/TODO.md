# TODO: European AI Consultancy Lead Generation

Target: Find leads (key contacts + emails) at all AI consultancies across Europe.

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
- [ ] Verify European country coverage (UK, DE, FR, NL, Nordics, CH, ES, IT, PL, IE)
- [ ] `make leads-report DOMAIN=<top-domain>` for top prospects
- [ ] `make db-studio` — browse imported data

## Changes Made

| File | Change |
|------|--------|
| `consultancies/discover.py` | Europe-only regions, 65 EU seed companies, EU Clutch/GoodFirms URLs |
| `consultancies/extract_domains.py` | New: LanceDB → domains.txt extraction |
| `scripts/import-rust-leads.ts` | New: Rust CSV → Neon PostgreSQL import |
| `crates/leadgen/src/main.rs` | `--icp-ai-consultancy` flag, `MLX_LM_SERVER` env var |
| `crates/leadgen/src/crawler/mod.rs` | NER confidence threshold 40→30 |
