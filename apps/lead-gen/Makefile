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

.PHONY: dev backend-dev backend-dev-ml backend-dev-research backend-dev-full deep-scrape build lint codegen deploy db-generate db-migrate db-studio icp-embed-serve gen-langgraph-json gen-langgraph-json-core gen-langgraph-json-ml gen-langgraph-json-research check-langgraph-json check-langgraph-json-core check-langgraph-json-ml check-langgraph-json-research

dev:
	pnpm dev

# Core container's langgraph dev server on :8002 (28 hot-path graphs).
# For cross-container graphs (ml/research), either run those containers
# locally in parallel via backend-dev-full, or point the core process
# at the deployed CF endpoints with ML_URL / RESEARCH_URL env vars.
backend-dev:
	pnpm backend-dev

# Regenerate every container's langgraph.json from its Python registry.
# Sources of truth:
#   core     → backend/leadgen_agent/registry.py
#   ml       → backend/ml/ml_graphs/registry.py        (needs --extra ml)
#   research → backend/research/research_graphs/registry.py
gen-langgraph-json: gen-langgraph-json-core gen-langgraph-json-ml gen-langgraph-json-research

gen-langgraph-json-core:
	cd backend && uv run python -m scripts.gen_langgraph_json --container core

gen-langgraph-json-ml:
	cd backend && ML_EAGER_LOAD=0 uv run --extra ml python -m scripts.gen_langgraph_json --container ml

gen-langgraph-json-research:
	cd backend && uv run python -m scripts.gen_langgraph_json --container research

# CI guard: fail if any langgraph.json is stale or any registered graph
# fails to resolve (typo, missing module, missing symbol). Run before
# pushing changes to a registry or any graph module it points at.
check-langgraph-json: check-langgraph-json-core check-langgraph-json-ml check-langgraph-json-research

check-langgraph-json-core:
	cd backend && uv run python -m scripts.gen_langgraph_json --container core --check

check-langgraph-json-ml:
	cd backend && ML_EAGER_LOAD=0 uv run --extra ml python -m scripts.gen_langgraph_json --container ml --check

check-langgraph-json-research:
	cd backend && uv run python -m scripts.gen_langgraph_json --container research --check

# ml container's langgraph dev on :8003 — torch + transformers required.
# Prerequisite: `cd backend && uv sync --extra ml` to install the ml deps.
backend-dev-ml:
	cd backend && uv run --extra ml langgraph dev --config ml/langgraph.json --no-browser --port 8003

# research container's langgraph dev on :8004 — lean (no torch).
backend-dev-research:
	cd backend && uv run langgraph dev --config research/langgraph.json --no-browser --port 8004

# Run all three sub-container langgraph dev servers in parallel (Ctrl-C
# kills all). Requires the ml extras.
backend-dev-full:
	@trap 'kill 0' EXIT; \
	$(MAKE) backend-dev & \
	$(MAKE) backend-dev-ml & \
	$(MAKE) backend-dev-research & \
	wait

# Fire the deep_scrape LangGraph graph against a URL or company_id.
#   make deep-scrape TARGET=https://www.aiacquisition.com/
#   make deep-scrape TARGET=40878 PAGES=20 DEPTH=3
#   make deep-scrape TARGET=40878 DRY=1
deep-scrape:
	@test -n "$(TARGET)" || (echo "Usage: make deep-scrape TARGET=<url-or-company-id> [PAGES=15] [DEPTH=2] [DRY=1] [JSON=1]" && exit 1)
	cd backend && uv run python scripts/invoke_deep_scrape.py "$(TARGET)" \
		$(if $(PAGES),--pages $(PAGES)) \
		$(if $(DEPTH),--depth $(DEPTH)) \
		$(if $(DRY),--dry-run) \
		$(if $(JSON),--json)

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

# Serve BGE-M3 embeddings on :7799 (override port via ICP_EMBED_PORT).
# Consumed by backend/leadgen_agent/embeddings.py for intervention #4
# (semantic ICP matching via pgvector). Native Python sentence-transformers.
icp-embed-serve:
	cd backend && uv run python scripts/bge_m3_server.py

# ── Tunnel (expose local backend to Vercel-deployed frontend) ──
#
# Pair with `pnpm backend-dev`. Set LANGGRAPH_AUTH_TOKEN in both
# backend/.env and Vercel production env so the tunnel isn't open.
# See backend/README.md for the full workflow.

.PHONY: tunnel tunnel-quick tunnel-named

tunnel: tunnel-quick ## Default: random ephemeral URL (quick tunnel)

tunnel-quick: ## Start a Cloudflare quick tunnel on :8002 (random *.trycloudflare.com URL)
	cloudflared tunnel --url http://localhost:8002

tunnel-named: ## Run a pre-created named tunnel (stable hostname). Bootstrap: see backend/README.md
	cloudflared tunnel run leadgen-backend

# ── Contact Cleanup ──────────────────────────────────────────

.PHONY: clean-contacts

clean-contacts: ## ML deletion pipeline: score → flag → purge (alias: pnpm clean:contacts --ml)
	dotenv -f .env.local run -- pnpm clean:contacts --ml

# ── LinkedIn Post Processing ─────────────────────────────────

.PHONY: process-posts

process-posts: ## Classify contacts as AI-related from LinkedIn post signals, tag non-AI as to-be-deleted
	dotenv -f .env.local run -- bash -c 'cd backend && uv run python -m leadgen_agent.linkedin_process_graph'

# ── Pipeline ──────────────────────────────────────────────────

LEADGEN_CLI := cd backend && uv run python scripts/leadgen_metal_cli.py

.PHONY: start start-build start-status start-top

start-build: ## No-op (kept for compat). Python has no compile step.
	@true

start: ## Full pipeline cycle (discover -> enrich -> contacts+qa -> outreach)
	$(LEADGEN_CLI) pipeline --yes $(if $(DOMAINS),--domains $(DOMAINS),)

start-status: ## Show pipeline status and phase detection
	$(LEADGEN_CLI) status

start-top: ## Show top leads (pass N=50 for count)
	$(LEADGEN_CLI) top $(or $(N),20)

# ── Per-Module Tests (Python) ──────────────────────────────────
# Formerly Rust cargo tests. The ported Python modules don't ship with
# a pytest suite yet — targets are kept for compat, announce, and exit 0.

.PHONY: ml-test ml-test-all backend-test-remote backend-test-live

ml-test: ## No-op (ported to Python; pytest suite not yet written)
	@echo "ml-test: Rust tests removed; Python pytest suite pending"

ml-test-all: ## No-op (ported to Python; pytest suite not yet written)
	@echo "ml-test-all: Rust tests removed; Python pytest suite pending"

backend-test-remote: ## Run RemoteGraph + contract test suite
	cd backend && ML_EAGER_LOAD=0 uv run pytest \
		tests/test_contracts_validation.py \
		tests/test_remote_graph_adapter.py \
		tests/test_remote_graph_env.py \
		tests/test_ml_graphs.py \
		tests/test_extract_skills_node.py \
		tests/test_dispatcher_logic.py \
		tests/test_remote_graph_http.py \
		tests/test_core_app.py \
		tests/test_research_app.py \
		-v

backend-test-live: ## Live e2e against deployed CF URL (LANGGRAPH_AUTH_TOKEN from .env.local; real DeepSeek)
	dotenv -f .env.local run -- bash -c 'cd backend && RUN_LIVE_E2E=1 uv run pytest tests/test_remote_langgraph_e2e.py -v'

# ── ML Improvement Loop ───────────────────────────────────────
# Usage:
#   make loop                 Full ML loop: datagen → eval → optimize → eval → report
#   make eval                 Run full eval harness (scoring + NER)
#   make optimize             Grid search + SGD + calibrate weights
#   make datagen              Generate synthetic training data
#   make report               Print current metrics dashboard

ML_DATA      := backend/data
EVAL_LABELS  := $(ML_DATA)/eval_labels.jsonl
EVAL_REPORTS := $(ML_DATA)/reports
MODELS_DIR   := $(ML_DATA)/models
ML_FLAGS     :=

.PHONY: loop eval optimize datagen report

loop: ## Full ML loop (ml-datagen/eval/optimize are stubbed post-port)
	@mkdir -p $(dir $(EVAL_LABELS)) $(EVAL_REPORTS) $(MODELS_DIR)
	$(LEADGEN_CLI) ml-datagen --output $(EVAL_LABELS)
	$(LEADGEN_CLI) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS)
	$(LEADGEN_CLI) ml-optimize --labels $(EVAL_LABELS) --output $(MODELS_DIR)

datagen: ## Generate synthetic training data (stubbed post-port)
	@mkdir -p $(dir $(EVAL_LABELS))
	$(LEADGEN_CLI) ml-datagen --output $(EVAL_LABELS)

eval: ## Run full ML eval harness (stubbed post-port)
	@mkdir -p $(EVAL_REPORTS)
	$(LEADGEN_CLI) ml-eval --labels $(EVAL_LABELS) --report-dir $(EVAL_REPORTS)

optimize: ## Grid search + SGD + isotonic calibration (stubbed post-port)
	@mkdir -p $(MODELS_DIR)
	$(LEADGEN_CLI) ml-optimize --labels $(EVAL_LABELS) --output $(MODELS_DIR)

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
	@echo "Distilled weights: backend/data/models/intent_signal_weights.json"

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

leads-preflight: ## Pre-flight: verify venv, LLM servers
	@echo "── Pre-flight checks ──"
	@test -x $(CONSULT_PY) || { echo "FAIL: Python venv not found at $(CONSULT_PY)"; echo "  Fix: cd $(CONSULT_DIR) && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"; exit 1; }
	@$(CONSULT_PY) -c "import aiohttp, bs4" 2>/dev/null || { echo "FAIL: Missing Python packages (aiohttp, bs4)"; echo "  Fix: $(CONSULT_PY) -m pip install aiohttp beautifulsoup4"; exit 1; }
	@curl -sf --max-time 2 http://localhost:8080/v1/models > /dev/null 2>&1 || { echo "FAIL: Classification LLM not running on :8080"; echo "  Fix: make ft-serve TASK=role-tag"; exit 1; }
	@curl -sf --max-time 2 http://localhost:8081/v1/models > /dev/null 2>&1 || { echo "FAIL: Extraction LLM not running on :8081"; echo "  Fix: make extract-serve"; exit 1; }
	@echo "── All checks passed ──"

leads: ## Full leads pipeline with pre-flight + resume
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
	$(LEADGEN_CLI) pipeline --domains $(DOMAINS_FILE) --yes --all
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

leads-status: ## Show pipeline progress history
	$(LEADGEN_CLI) status

# ── Blocklist ────────────────────────────────────────────────

.PHONY: block unblock blocklist export-blocklist

block: ## Block a domain: make block DOMAIN=example.com
	@test -n "$(DOMAIN)" || { echo "Usage: make block DOMAIN=example.com"; exit 1; }
	$(LEADGEN_CLI) block add $(DOMAIN)

unblock: ## Unblock a domain: make unblock DOMAIN=example.com
	@test -n "$(DOMAIN)" || { echo "Usage: make unblock DOMAIN=example.com"; exit 1; }
	$(LEADGEN_CLI) block remove $(DOMAIN)

blocklist: ## Show blocked domains
	$(LEADGEN_CLI) block list

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
