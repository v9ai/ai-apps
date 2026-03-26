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

# ── All ────────────────────────────────────────────────────────

.PHONY: install-all

install-all: hooks-install scrapus-install
	pnpm install
