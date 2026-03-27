# TODO: European AI Consultancy Lead Generation

Target: Find leads (key contacts + emails) at all AI consultancies across Europe.

## Phase 1: Domain List Compilation

- [ ] Install Python deps: `pip install aiohttp beautifulsoup4 lancedb sentence-transformers mlx-lm`
- [ ] Run discovery (scrape only): `cd consultancies && python discover.py --search-only`
- [ ] Run MLX classification: `python discover.py --enrich-only`
- [ ] Extract domains for Rust: `python extract_domains.py -o data/eu-ai-consultancies.txt`
- [ ] Review domain list, add missing consultancies manually
- [ ] Target: 200-500 unique European AI consultancy domains

## Phase 2: Rust Pipeline

- [ ] Copy domains: `cp consultancies/data/eu-ai-consultancies.txt ../../crates/leadgen/data/`
- [ ] (Optional) Start mlx_lm server: `MLX_LM_SERVER=1 mlx_lm.server --model mlx-community/Qwen3-8B-4bit --port 8080`
- [ ] Build: `cd ../../crates/leadgen && cargo build --release`
- [ ] Run full pipeline: `./target/release/leadgen pipeline data/eu-ai-consultancies.txt --icp-ai-consultancy`
- [ ] Score leads: `./target/release/leadgen score`
- [ ] Review top 50: `./target/release/leadgen top 50`
- [ ] Export CSV: `./target/release/leadgen export data/eu-ai-leads.csv`
- [ ] Train scorer: `./target/release/leadgen train`

## Phase 3: Import to Neon

- [ ] Dry run: `pnpm tsx scripts/import-rust-leads.ts --dry-run ../../crates/leadgen/data/eu-ai-leads.csv`
- [ ] Import: `pnpm tsx scripts/import-rust-leads.ts ../../crates/leadgen/data/eu-ai-leads.csv`
- [ ] Verify in Drizzle Studio: `pnpm db:studio`

## Phase 4: Quality Assurance

- [ ] Check email verification rate (target >30%)
- [ ] Review top 20 leads for relevance
- [ ] Verify European country coverage (UK, DE, FR, NL, Nordics, CH, ES, IT, PL, IE)
- [ ] Generate reports for top prospects: `leadgen report <domain>`
- [ ] Find similar companies: `leadgen match <top-domain>`

## Changes Made

| File | Change |
|------|--------|
| `consultancies/discover.py` | Europe-only regions, 65 EU seed companies, EU Clutch/GoodFirms URLs |
| `consultancies/extract_domains.py` | New: LanceDB → domains.txt extraction |
| `scripts/import-rust-leads.ts` | New: Rust CSV → Neon PostgreSQL import |
| `crates/leadgen/src/main.rs` | `--icp-ai-consultancy` flag, `MLX_LM_SERVER` env var |
| `crates/leadgen/src/crawler/mod.rs` | NER confidence threshold 40→30 |
