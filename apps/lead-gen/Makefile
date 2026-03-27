# lead-gen — root Makefile
# Module 1: hooks (Rust hook server for Claude Code)

# ── Module 1: Hooks ────────────────────────────────────────────

.PHONY: hooks hooks-install hooks-uninstall hooks-clean hooks-logs hooks-status

hooks:
	$(MAKE) -C hooks

hooks-install:
	$(MAKE) -C hooks install

hooks-uninstall:
	$(MAKE) -C hooks uninstall

hooks-clean:
	$(MAKE) -C hooks clean

hooks-logs:
	@tail -f ~/.cache/claude-hooks/server.log

hooks-status:
	@if curl -sf --max-time 1 http://127.0.0.1:19836/health > /dev/null 2>&1; then \
		echo "hooks-server: running"; \
		curl -sf http://127.0.0.1:19836/metrics 2>/dev/null | jq . || true; \
	else \
		echo "hooks-server: stopped"; \
	fi

# ── App ────────────────────────────────────────────────────────

.PHONY: dev build lint codegen deploy db-generate db-migrate db-studio

dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

codegen:
	pnpm codegen

deploy:
	pnpm deploy

db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate

db-studio:
	pnpm db:studio

# ── Module 2: Scrapus (RL Crawler) ────────────────────────────

.PHONY: scrapus scrapus-test scrapus-crawl scrapus-status scrapus-bench scrapus-lint scrapus-clean scrapus-install scrapus-metrics scrapus-reset

scrapus: ## Delegate to scrapus Makefile
	$(MAKE) -C scrapus

scrapus-install: ## Install scrapus dependencies
	$(MAKE) -C scrapus install-dev

scrapus-test: ## Run scrapus tests
	$(MAKE) -C scrapus test

scrapus-crawl: ## Run RL crawler (pass SEEDS="url1 url2")
	$(MAKE) -C scrapus crawl SEEDS="$(SEEDS)"

scrapus-status: ## Show scrapus pipeline status
	$(MAKE) -C scrapus status

scrapus-bench: ## Run scrapus benchmarks
	$(MAKE) -C scrapus bench

scrapus-lint: ## Lint scrapus code
	$(MAKE) -C scrapus lint

scrapus-metrics: ## Show scrapus training metrics
	$(MAKE) -C scrapus metrics

scrapus-clean: ## Clean scrapus caches
	$(MAKE) -C scrapus clean

scrapus-reset: ## Full reset scrapus data
	$(MAKE) -C scrapus reset

# ── Module 3: Leadgen (Rust pipeline) ──────────────────────────

RUST_CRATE   := ../../crates/leadgen
RUST_BIN     := $(RUST_CRATE)/target/release/leadgen
DOMAINS_FILE := consultancies/data/eu-ai-consultancies.txt
LEADS_CSV    := $(RUST_CRATE)/data/eu-ai-leads.csv

.PHONY: leads leads-discover leads-domains leads-build leads-pipeline leads-import leads-top leads-report leads-clean

leads: leads-discover leads-domains leads-build leads-pipeline leads-import ## Full EU AI consultancy lead generation
	@echo ""
	@echo "═══════════════════════════════════════════════════"
	@echo "  Lead generation complete."
	@echo "  Run 'make leads-top' to review top leads."
	@echo "  Run 'make db-studio' to browse in Drizzle Studio."
	@echo "═══════════════════════════════════════════════════"

leads-discover: ## Scrape directories + MLX classify EU AI consultancies
	@echo "── Phase 1: Discovery ──"
	cd consultancies && python3 discover.py --search-only
	cd consultancies && python3 discover.py --enrich-only || echo "MLX classification skipped (mlx-lm not installed)"

leads-domains: ## Extract domains from LanceDB → domains.txt
	@echo "── Phase 2: Extract domains ──"
	cd consultancies && python3 extract_domains.py -o data/eu-ai-consultancies.txt
	@wc -l $(DOMAINS_FILE)
	cp $(DOMAINS_FILE) $(RUST_CRATE)/data/

leads-build: ## Build Rust leadgen crate (release)
	@echo "── Phase 3: Build Rust crate ──"
	cd $(RUST_CRATE) && cargo build --release

leads-pipeline: leads-build ## Run full 5-stage Rust pipeline + score + export
	@echo "── Phase 4: Rust pipeline ──"
	@rm -f $(RUST_CRATE)/data/tantivy_index/.tantivy-writer.lock
	$(RUST_BIN) pipeline $(RUST_CRATE)/data/eu-ai-consultancies.txt --icp-ai-consultancy
	$(RUST_BIN) score
	$(RUST_BIN) export $(LEADS_CSV)
	$(RUST_BIN) train
	@echo "Exported to $(LEADS_CSV)"

leads-import: ## Import Rust SQLite DB into Neon PostgreSQL
	@echo "── Phase 5: Import to Neon ──"
	pnpm tsx scripts/import-rust-leads.ts $(RUST_CRATE)/data/leads.db

leads-top: ## Show top 50 leads
	$(RUST_BIN) top 50

leads-report: ## Generate report for a domain (usage: make leads-report DOMAIN=faculty.ai)
	$(RUST_BIN) report $(DOMAIN)

leads-clean: ## Remove generated lead data
	rm -f $(DOMAINS_FILE) $(LEADS_CSV)
	rm -rf consultancies/data/consultancies.lance consultancies/data/consultancies.json

# ── Module 4: Rust Pipeline Teams ────────────────────────────

METAL_DIR := leadgen-metal
METAL_BIN := $(METAL_DIR)/target/release/leadgen-metal

.PHONY: start start-build start-status start-top

start-build: ## Build the Rust pipeline binary (release)
	cd $(METAL_DIR) && cargo build --release

start: start-build ## Full pipeline cycle (discover -> enrich -> contacts+qa -> outreach)
	$(METAL_BIN) pipeline $(if $(DOMAINS),--domains $(DOMAINS),)

start-status: start-build ## Show pipeline status and phase detection
	$(METAL_BIN) status

start-top: start-build ## Show top leads (pass N=50 for count)
	$(METAL_BIN) top $(or $(N),20)

# ── All ────────────────────────────────────────────────────────

.PHONY: install-all

install-all: hooks-install scrapus-install
	pnpm install
