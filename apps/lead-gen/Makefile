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

.PHONY: dev backend-dev build lint codegen deploy db-generate db-migrate db-studio

dev:
	pnpm dev

backend-dev:
	pnpm backend-dev

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

# ── Contact Cleanup ──────────────────────────────────────────

.PHONY: clean-contacts

clean-contacts: ## ML deletion pipeline: score → flag → purge (alias: pnpm clean:contacts --ml)
	dotenv -f .env.local run -- pnpm clean:contacts --ml

# ── LinkedIn Post Processing ─────────────────────────────────

POSTS_DIR := crates/linkedin-posts
POSTS_BIN := $(POSTS_DIR)/target/release/process-posts

.PHONY: process-posts

process-posts: ## Classify contacts as AI-related from LinkedIn post signals, tag non-AI as to-be-deleted
	cd $(POSTS_DIR) && cargo build --release --bin process-posts
	dotenv -f .env.local run -- $(POSTS_BIN)

# ── Pipeline ──────────────────────────────────────────────────

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
#   make loop                 Full ML loop: datagen → eval → optimize → eval → report
#   make eval                 Run full eval harness (scoring + NER)
#   make optimize             Grid search + SGD + calibrate weights
#   make datagen              Generate synthetic training data
#   make report               Print current metrics dashboard

ML_DATA      := $(METAL_DIR)/data
EVAL_LABELS  := $(ML_DATA)/eval_labels.jsonl
EVAL_REPORTS := $(ML_DATA)/reports
MODELS_DIR   := $(ML_DATA)/models
ML_FLAGS     := -D $(ML_DATA)

.PHONY: loop eval optimize datagen report

loop: start-build ## Full ML loop: datagen → eval → optimize → eval → report
	@echo "═══ ML Loop: datagen → eval → optimize → eval → report ═══"
	@echo ""
	@echo "── 1/5 Generating training data ──"
	@mkdir -p $(dir $(EVAL_LABELS)) $(EVAL_REPORTS) $(MODELS_DIR)
	$(METAL_BIN) $(ML_FLAGS) ml-datagen --output $(EVAL_LABELS)
	@echo "Generated $$(wc -l < $(EVAL_LABELS)) labeled samples"
	@echo ""
	@echo "── 2/5 Baseline eval ──"
	$(METAL_BIN) $(ML_FLAGS) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS)
	@echo ""
	@echo "── 3/5 Optimizing weights ──"
	$(METAL_BIN) $(ML_FLAGS) ml-optimize --labels $(EVAL_LABELS) --output $(MODELS_DIR)
	@echo ""
	@echo "── 4/5 Post-optimization eval ──"
	$(METAL_BIN) $(ML_FLAGS) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS)
	@echo ""
	@echo "── 5/5 Report ──"
	@latest=$$(ls -t $(EVAL_REPORTS)/eval_iter_*.json 2>/dev/null | head -1); \
	if [ -n "$$latest" ]; then \
		python3 -m json.tool "$$latest" 2>/dev/null || cat "$$latest"; \
	fi
	@echo ""
	@echo "═══ ML Loop complete ═══"

datagen: start-build ## Generate synthetic training data
	@mkdir -p $(dir $(EVAL_LABELS))
	$(METAL_BIN) $(ML_FLAGS) ml-datagen --output $(EVAL_LABELS)
	@echo "Generated $$(wc -l < $(EVAL_LABELS)) labeled samples → $(EVAL_LABELS)"

eval: start-build ## Run full ML eval harness
	@mkdir -p $(EVAL_REPORTS)
	$(METAL_BIN) $(ML_FLAGS) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS)

optimize: start-build ## Grid search + SGD + isotonic calibration
	@mkdir -p $(MODELS_DIR)
	$(METAL_BIN) $(ML_FLAGS) ml-optimize --labels $(EVAL_LABELS) --output $(MODELS_DIR)

report: ## Print latest eval metrics
	@if [ -d $(EVAL_REPORTS) ]; then \
		latest=$$(ls -t $(EVAL_REPORTS)/eval_iter_*.json 2>/dev/null | head -1); \
		if [ -n "$$latest" ]; then \
			echo "═══ ML Eval Report: $$latest ═══"; \
			python3 -m json.tool "$$latest" 2>/dev/null || cat "$$latest"; \
		else \
			echo "No eval reports found. Run 'make eval' first."; \
		fi; \
	else \
		echo "No reports directory. Run 'make eval' first."; \
	fi

RUST_FILTER_6 = ml_eval weight_optimizer data_gen

# ── Fine-Tuning (MLX LoRA) ───────────────────────────────────
# Train Qwen2.5-3B classification adapters for role-tag and remote-worldwide.
# Training: Python/MLX. Inference: Rust via mlx_lm.server.
#
# Usage:
#   make ft-export                  Export training data from Neon
#   make ft-export TASK=role-tag    Export one task only
#   make ft-stats                   Show data volume counts
#   make ft-train TASK=role-tag     Train LoRA adapter
#   make ft-serve TASK=role-tag     Start mlx_lm.server with adapter
#   make ft-loop TASK=role-tag      Full cycle: export → train

FT_TASK ?= all
FT_PORT ?= 8080

.PHONY: ft-export ft-stats ft-train ft-serve ft-loop ft-publish ft-publish-dry

ft-export: ## Export training data from Neon (TASK=role-tag|remote-worldwide|all)
	python3 mlx-training/export_training_data.py --task $(FT_TASK)

ft-stats: ## Show training data counts
	python3 mlx-training/export_training_data.py --task all --stats

ft-train: ## Train LoRA adapter (TASK=role-tag|remote-worldwide)
	@test -n "$(TASK)" || { echo "Usage: make ft-train TASK=role-tag"; exit 1; }
	python3 mlx-training/finetune.py --task $(TASK)

ft-serve: ## Start mlx_lm.server with adapter (TASK=role-tag|remote-worldwide|outreach-email)
	@test -n "$(TASK)" || { echo "Usage: make ft-serve TASK=role-tag"; exit 1; }
	$(eval FT_MODEL := $(shell python3 -c "import json; print(json.load(open('mlx-training/models/$(TASK)/adapter_config.json'))['model'])" 2>/dev/null || echo "mlx-community/Qwen2.5-3B-Instruct-4bit"))
	python3 -m mlx_lm.server \
		--model $(FT_MODEL) \
		--adapter-path mlx-training/models/$(TASK) \
		--port $(FT_PORT)

ft-loop: ## Full cycle: export → train (TASK=role-tag|remote-worldwide)
	@test -n "$(TASK)" || { echo "Usage: make ft-loop TASK=role-tag"; exit 1; }
	$(MAKE) ft-export FT_TASK=$(TASK)
	$(MAKE) ft-train TASK=$(TASK)
	@echo ""
	@echo "═══ Training complete ═══"
	@echo "Start serving: make ft-serve TASK=$(TASK)"
	@echo "Rust pipeline will connect to localhost:$(FT_PORT)"

ft-publish: ## Upload LoRA adapter to HF Hub: make ft-publish TASK=outreach-email
	@test -n "$(TASK)" || { echo "Usage: make ft-publish TASK=outreach-email"; exit 1; }
	$(eval FT_PUB_MODEL := $(shell python3 -c "import json,re; m=json.load(open('mlx-training/models/$(TASK)/adapter_config.json'))['model']; print(re.sub(r'.*/','',m).lower())" 2>/dev/null || echo "unknown"))
	python3 mlx-training/hub.py upload \
		--adapter-path mlx-training/models/$(TASK) \
		--repo v9ai/$(TASK)-$(FT_PUB_MODEL)-lora

ft-publish-dry: ## Dry-run HF publish: make ft-publish-dry TASK=outreach-email
	@test -n "$(TASK)" || { echo "Usage: make ft-publish-dry TASK=outreach-email"; exit 1; }
	$(eval FT_PUB_MODEL := $(shell python3 -c "import json,re; m=json.load(open('mlx-training/models/$(TASK)/adapter_config.json'))['model']; print(re.sub(r'.*/','',m).lower())" 2>/dev/null || echo "unknown"))
	python3 mlx-training/hub.py upload \
		--adapter-path mlx-training/models/$(TASK) \
		--repo v9ai/$(TASK)-$(FT_PUB_MODEL)-lora \
		--dry-run

# ── Intent Signal Detection ─────────────────────────────────
# Finetuned Qwen2.5-3B for company buying/hiring signal classification.
# ZoomInfo's #1 feature — fully local, open source, MLX.
#
# Usage:
#   make intent-export                Export training data from Neon
#   make intent-train                 Train LoRA adapter
#   make intent-serve                 Start mlx_lm.server with adapter
#   make intent-loop                  Full cycle: export → train → distill
#   make intent-detect                Run detection on all companies (TS)
#   make intent-refresh               Refresh scores with decay only

.PHONY: intent-export intent-train intent-serve intent-loop intent-detect intent-refresh

intent-export: ## Export intent signal training data from Neon
	python3 mlx-training/export_intent_signals.py --task all

intent-train: ## Train LoRA adapter for intent-signal classification
	python3 mlx-training/finetune.py --task intent-signal

intent-serve: ## Start mlx_lm.server with intent-signal adapter
	python3 -m mlx_lm.server \
		--model mlx-community/Qwen2.5-3B-Instruct-4bit \
		--adapter-path mlx-training/models/intent-signal \
		--port $(FT_PORT)

intent-loop: ## Full cycle: export → train → distill
	$(MAKE) intent-export
	$(MAKE) intent-train
	python3 mlx-training/distill_intent_signals.py
	@echo ""
	@echo "═══ Intent Signal training complete ═══"
	@echo "Start serving: make intent-serve"
	@echo "Distilled weights: crates/metal/data/models/intent_signal_weights.json"

intent-detect: ## Run intent signal detection on all companies (TypeScript)
	dotenv -f .env.local run -- pnpm tsx scripts/detect-intent-signals.ts

intent-refresh: ## Refresh intent scores with decay (no re-detection)
	dotenv -f .env.local run -- pnpm tsx scripts/detect-intent-signals.ts --refresh-only

# ── Structured Extraction (sgai-qwen3-1.7b) ──────────────────
# Separate mlx_lm.server on port 8081 for HTML→structured JSON extraction.
# Works alongside the Qwen2.5-3B classification server on port 8080.
#
# Usage:
#   make extract-serve                Start extraction server (port 8081)
#   make extract-stop                 Stop extraction server

EXTRACT_PORT ?= 8081
EXTRACT_MODEL ?= scrapegraphai/sgai-qwen3-1.7b-gguf

.PHONY: extract-serve extract-stop

extract-serve: ## Start sgai-qwen3-1.7b extraction server on port 8081
	python3 -m mlx_lm.server \
		--model $(EXTRACT_MODEL) \
		--port $(EXTRACT_PORT)

extract-stop: ## Stop extraction server
	@pkill -f "mlx_lm.server.*$(EXTRACT_PORT)" 2>/dev/null && echo "Stopped extraction server" || echo "Not running"

# ── Consultancy Leads ────────────────────────────────────────

CONSULT_DIR  := consultancies
CONSULT_PY   := $(CONSULT_DIR)/.venv/bin/python3
DOMAINS_FILE := $(CONSULT_DIR)/data/ai-consultancies.txt
DISCOVERY_TS := data/.discovery-timestamp

.PHONY: leads leads-preflight leads-status

leads-preflight: start-build ## Pre-flight: verify venv, LLM servers, binary
	@echo "── Pre-flight checks ──"
	@test -x $(CONSULT_PY) || { echo "FAIL: Python venv not found at $(CONSULT_PY)"; echo "  Fix: cd $(CONSULT_DIR) && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"; exit 1; }
	@$(CONSULT_PY) -c "import aiohttp, bs4, lancedb" 2>/dev/null || { echo "FAIL: Missing Python packages (aiohttp, bs4, lancedb)"; echo "  Fix: $(CONSULT_PY) -m pip install aiohttp beautifulsoup4 lancedb"; exit 1; }
	@curl -sf --max-time 2 http://localhost:8080/v1/models > /dev/null 2>&1 || { echo "FAIL: Classification LLM not running on :8080"; echo "  Fix: make ft-serve TASK=role-tag"; exit 1; }
	@curl -sf --max-time 2 http://localhost:8081/v1/models > /dev/null 2>&1 || { echo "FAIL: Extraction LLM not running on :8081"; echo "  Fix: make extract-serve"; exit 1; }
	@echo "── All checks passed ──"

leads: leads-preflight ## Full leads pipeline with pre-flight + resume
	@if [ -f $(DISCOVERY_TS) ] && \
	   [ $$(( $$(date +%s) - $$(cat $(DISCOVERY_TS)) )) -lt 3600 ]; then \
		echo "  SKIP: Python discovery (< 1 hour old)"; \
	else \
		$(CONSULT_PY) $(CONSULT_DIR)/discover.py; \
	fi
	$(CONSULT_PY) $(CONSULT_DIR)/extract_domains.py -o $(DOMAINS_FILE)
	@if [ -n "$$NEON_DATABASE_URL" ]; then \
		pnpm tsx scripts/export-blocklist.ts; \
	fi
	$(METAL_BIN) pipeline --domains $(DOMAINS_FILE) --yes --all
	@if [ -n "$$NEON_DATABASE_URL" ]; then \
		pnpm tsx scripts/import-rust-leads.ts $(METAL_DIR)/data/pipeline; \
	else \
		echo "  SKIP: Neon import (set NEON_DATABASE_URL to enable)"; \
	fi

leads-brave: ## Discover AI lead-gen platforms via Brave Search (LangChain)
	@test -x $(CONSULT_PY) || { echo "FAIL: Python venv not found at $(CONSULT_PY)"; echo "  Fix: cd $(CONSULT_DIR) && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"; exit 1; }
	@$(CONSULT_PY) -c "from langchain_community.utilities import BraveSearchWrapper" 2>/dev/null || \
		{ echo "Installing langchain-community..."; $(CONSULT_PY) -m pip install langchain-community; }
	$(CONSULT_PY) $(CONSULT_DIR)/discover_brave.py

enrich-brave: ## Enrich Brave Search companies via website scraping + MLX
	@test -x $(CONSULT_PY) || { echo "FAIL: Python venv not found at $(CONSULT_PY)"; exit 1; }
	$(CONSULT_PY) $(CONSULT_DIR)/enrich_brave.py

extract-ai-features: ## Deep-extract AI features from enriched companies (MLX)
	@test -x $(CONSULT_PY) || { echo "FAIL: Python venv not found at $(CONSULT_PY)"; exit 1; }
	$(CONSULT_PY) $(CONSULT_DIR)/extract_ai_features.py $(ARGS)

pipeline-forecast: ## Generate pipeline forecasting analysis from ai-features.json
	@test -x $(CONSULT_PY) || { echo "FAIL: Python venv not found at $(CONSULT_PY)"; exit 1; }
	$(CONSULT_PY) $(CONSULT_DIR)/generate_pipeline_forecasting.py $(ARGS)

nl-search: ## NL company search via Qwen (QUERY="..." DISCOVER=1)
	@test -n "$(QUERY)" || { echo "Usage: make nl-search QUERY='AI companies in sales tech'"; echo "       make nl-search QUERY='healthcare NLP' DISCOVER=1"; exit 1; }
	@test -x $(CONSULT_PY) || { echo "FAIL: Python venv not found at $(CONSULT_PY)"; exit 1; }
	@curl -sf --max-time 2 http://localhost:8080/v1/models > /dev/null 2>&1 || { echo "FAIL: Qwen server not running on :8080"; echo "  Fix: make ft-serve TASK=role-tag"; exit 1; }
	$(CONSULT_PY) $(CONSULT_DIR)/nl_search.py --query "$(QUERY)" $(if $(DISCOVER),--discover,)

leads-status: start-build ## Show pipeline progress history
	$(METAL_BIN) status

# ── Blocklist ────────────────────────────────────────────────

.PHONY: block unblock blocklist export-blocklist

block: start-build ## Block a domain: make block DOMAIN=example.com
	@test -n "$(DOMAIN)" || { echo "Usage: make block DOMAIN=example.com"; exit 1; }
	$(METAL_BIN) block add $(DOMAIN)

unblock: start-build ## Unblock a domain: make unblock DOMAIN=example.com
	@test -n "$(DOMAIN)" || { echo "Usage: make unblock DOMAIN=example.com"; exit 1; }
	$(METAL_BIN) block remove $(DOMAIN)

blocklist: start-build ## Show blocked domains
	$(METAL_BIN) block list

export-blocklist: ## Export blocked domains from Neon → data/blocklist.txt
	pnpm tsx scripts/export-blocklist.ts

# ── Salescue HF Publishing ─────────────────────────────────────

CT_DIR   := salescue
CT_PY    := PYTHONPATH=$(CURDIR) $(CONSULT_PY)

.PHONY: ct-publish ct-publish-dry ct-publish-all ct-test

ct-publish: ## Publish module(s) to HF Hub: make ct-publish M=spam
	@test -n "$(M)" || { echo "Usage: make ct-publish M=spam  or  make ct-publish M='spam score intent'"; exit 1; }
	$(CT_PY) -m salescue.publish $(M)

ct-publish-dry: ## Dry-run publish (local save + verify): make ct-publish-dry M=spam
	@test -n "$(M)" || { echo "Usage: make ct-publish-dry M=spam"; exit 1; }
	$(CT_PY) -m salescue.publish $(M) --dry-run

ct-publish-all: ## Publish all compatible modules to HF Hub
	$(CT_PY) -m salescue.publish --all

ct-test: ## Run salescue test suite (159 tests)
	$(CT_PY) -m pytest salescue/tests/ -v --tb=short

# ── All ────────────────────────────────────────────────────────

.PHONY: install-all

install-all: hooks-install
	pnpm install
