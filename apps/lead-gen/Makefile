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
# Train Qwen2.5-3B classification adapters for role-tag and remote-eu.
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

.PHONY: ft-export ft-stats ft-train ft-serve ft-loop

ft-export: ## Export training data from Neon (TASK=role-tag|remote-eu|all)
	python3 mlx-training/export_training_data.py --task $(FT_TASK)

ft-stats: ## Show training data counts
	python3 mlx-training/export_training_data.py --task all --stats

ft-train: ## Train LoRA adapter (TASK=role-tag|remote-eu)
	@test -n "$(TASK)" || { echo "Usage: make ft-train TASK=role-tag"; exit 1; }
	python3 mlx-training/finetune.py --task $(TASK)

ft-serve: ## Start mlx_lm.server with adapter (TASK=role-tag|remote-eu)
	@test -n "$(TASK)" || { echo "Usage: make ft-serve TASK=role-tag"; exit 1; }
	python3 -m mlx_lm.server \
		--model mlx-community/Qwen2.5-3B-Instruct-4bit \
		--adapter-path mlx-training/models/$(TASK) \
		--port $(FT_PORT)

ft-loop: ## Full cycle: export → train (TASK=role-tag|remote-eu)
	@test -n "$(TASK)" || { echo "Usage: make ft-loop TASK=role-tag"; exit 1; }
	$(MAKE) ft-export FT_TASK=$(TASK)
	$(MAKE) ft-train TASK=$(TASK)
	@echo ""
	@echo "═══ Training complete ═══"
	@echo "Start serving: make ft-serve TASK=$(TASK)"
	@echo "Rust pipeline will connect to localhost:$(FT_PORT)"

# ── All ────────────────────────────────────────────────────────

.PHONY: install-all

install-all: hooks-install
	pnpm install
