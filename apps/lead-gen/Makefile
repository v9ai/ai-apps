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

METAL_DIR := crates/metal
METAL_BIN := $(METAL_DIR)/target/release/leadgen-metal

.PHONY: start start-build start-status start-top

start-build: ## Build the Rust pipeline binary (release)
	cd $(METAL_DIR) && cargo build --release

start: start-build ## Full pipeline cycle (discover -> enrich -> contacts+qa -> outreach)
	$(METAL_BIN) pipeline --yes $(if $(DOMAINS),--domains $(DOMAINS),)

start-status: start-build ## Show pipeline status and phase detection
	$(METAL_BIN) status

start-top: start-build ## Show top leads (pass N=50 for count)
	$(METAL_BIN) top $(or $(N),20)

# ── Per-Module ML Testing ──────────────────────────────────────
# 9 modules: 0=infra 1=crawler 2=extraction 3=entity-resolution
#            4=scoring 5=reports 6=evaluation 7=synthesis 8=novelty
#
# Usage:
#   make ml-test N=3      Test entity resolution (dedup + simd + filter)
#   make ml-test N=2      Test extraction (job_ner + html_scanner)
#   make ml-test-all      Test all modules

.PHONY: ml-test ml-test-all

ml-test: ## Test one ML module: make ml-test N=3
	@echo "═══ Module $(N) ═══"
	@cd $(METAL_DIR) && for p in $(RUST_FILTER_$(N)); do \
		echo "── cargo test $$p ──"; \
		cargo test --lib $$p 2>&1 | tail -3; \
	done

ml-test-all: ## Test all ML modules
	@cd $(METAL_DIR) && cargo test --lib

# cargo test filter patterns per module
RUST_FILTER_0 = pipeline bplus storage bloom index hll sketch
RUST_FILTER_1 = queue net dns
RUST_FILTER_2 = job_ner html_scanner
RUST_FILTER_3 = dedup simd filter
RUST_FILTER_4 = scoring embedding
RUST_FILTER_7 = pipeline teams state enrich

# ── ML Improvement Loop ───────────────────────────────────────
# Usage:
#   make ml-eval              Run full eval harness (scoring + NER)
#   make ml-eval-scoring      Eval ICP scoring only
#   make ml-optimize          Grid search + SGD + calibrate weights
#   make ml-datagen           Generate synthetic training data
#   make ml-report            Print current metrics dashboard

ML_DATA      := $(METAL_DIR)/data
EVAL_LABELS  := $(ML_DATA)/eval_labels.jsonl
EVAL_REPORTS := $(ML_DATA)/reports
MODELS_DIR   := $(ML_DATA)/models
ML_FLAGS     := -D $(ML_DATA)

.PHONY: ml-loop ml-eval ml-eval-scoring ml-optimize ml-datagen ml-report

ml-loop: start-build ## Full ML loop: datagen → eval → optimize → eval → report
	@echo "═══ ML Loop: datagen → eval → optimize → eval → report ═══"
	@echo ""
	@echo "── 1/5 Generating training data ──"
	@mkdir -p $(dir $(EVAL_LABELS)) $(EVAL_REPORTS) $(MODELS_DIR)
	$(METAL_BIN) ml-datagen --output $(EVAL_LABELS)
	@echo "Generated $$(wc -l < $(EVAL_LABELS)) labeled samples"
	@echo ""
	@echo "── 2/5 Baseline eval ──"
	$(METAL_BIN) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS)
	@echo ""
	@echo "── 3/5 Optimizing weights ──"
	$(METAL_BIN) ml-optimize --labels $(EVAL_LABELS) --output $(MODELS_DIR)
	@echo ""
	@echo "── 4/5 Post-optimization eval ──"
	$(METAL_BIN) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS)
	@echo ""
	@echo "── 5/5 Report ──"
	@latest=$$(ls -t $(EVAL_REPORTS)/eval_iter_*.json 2>/dev/null | head -1); \
	if [ -n "$$latest" ]; then \
		python3 -m json.tool "$$latest" 2>/dev/null || cat "$$latest"; \
	fi
	@echo ""
	@echo "═══ ML Loop complete ═══"

ml-datagen: start-build ## Generate synthetic training data
	@mkdir -p $(dir $(EVAL_LABELS))
	$(METAL_BIN) ml-datagen --output $(EVAL_LABELS)
	@echo "Generated $$(wc -l < $(EVAL_LABELS)) labeled samples → $(EVAL_LABELS)"

ml-eval: start-build ## Run full ML eval harness
	@mkdir -p $(EVAL_REPORTS)
	$(METAL_BIN) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS)

ml-eval-scoring: start-build ## Eval ICP scoring only
	@mkdir -p $(EVAL_REPORTS)
	$(METAL_BIN) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS) --scoring-only

ml-optimize: start-build ## Grid search + SGD + isotonic calibration
	@mkdir -p $(MODELS_DIR)
	$(METAL_BIN) ml-optimize --labels $(EVAL_LABELS) --output $(MODELS_DIR)

ml-report: ## Print latest eval metrics
	@if [ -d $(EVAL_REPORTS) ]; then \
		latest=$$(ls -t $(EVAL_REPORTS)/eval_iter_*.json 2>/dev/null | head -1); \
		if [ -n "$$latest" ]; then \
			echo "═══ ML Eval Report: $$latest ═══"; \
			python3 -m json.tool "$$latest" 2>/dev/null || cat "$$latest"; \
		else \
			echo "No eval reports found. Run 'make ml-eval' first."; \
		fi; \
	else \
		echo "No reports directory. Run 'make ml-eval' first."; \
	fi

RUST_FILTER_6 = ml_eval weight_optimizer data_gen

# ── All ────────────────────────────────────────────────────────

.PHONY: install-all

install-all: hooks-install
	pnpm install
