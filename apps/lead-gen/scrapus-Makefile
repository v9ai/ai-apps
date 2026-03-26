# scrapus — Module 1: RL-based Focused Web Crawler
# Target: Apple M1 16GB, zero cloud dependency

PYTHON  ?= python3
PIP     ?= pip3
PYTEST  ?= pytest
SRC_DIR  = src
DATA_DIR = scrapus_data
MODELS_DIR = $(DATA_DIR)/models/dqn

# ── Virtual Environment ───────────────────────────────────────
.PHONY: venv install install-dev

venv:
	$(PYTHON) -m venv .venv
	@echo "Activate with: source .venv/bin/activate"

install:
	$(PIP) install -e ".[dev]"

install-dev:
	$(PIP) install -e ".[dev,mlx,dashboard]"

# ── Crawling ──────────────────────────────────────────────────
.PHONY: crawl crawl-small crawl-medium crawl-large

crawl: ## Run crawler with default settings (1K pages)
	cd $(SRC_DIR) && $(PYTHON) -m crawler_pipeline --seeds $(SEEDS) --max-pages 1000

crawl-small: ## Quick crawl (100 pages)
	cd $(SRC_DIR) && $(PYTHON) -m crawler_pipeline --seeds $(SEEDS) --max-pages 100 --concurrency 4

crawl-medium: ## Medium crawl (5K pages)
	cd $(SRC_DIR) && $(PYTHON) -m crawler_pipeline --seeds $(SEEDS) --max-pages 5000

crawl-large: ## Full crawl (50K pages)
	cd $(SRC_DIR) && $(PYTHON) -m crawler_pipeline --seeds $(SEEDS) --max-pages 50000

crawl-onnx: ## Run with ONNX inference (production mode)
	cd $(SRC_DIR) && $(PYTHON) -m crawler_pipeline --seeds $(SEEDS) --max-pages 1000 --use-onnx

# ── Training ──────────────────────────────────────────────────
.PHONY: train export-onnx export-coreml

train: ## Train DQN on existing replay buffer
	cd $(SRC_DIR) && $(PYTHON) -c "from crawler_dqn import DoubleDQNAgent; a = DoubleDQNAgent(); print(f'Agent ready: {a.device}')"

export-onnx: ## Export DQN to ONNX INT8
	cd $(SRC_DIR) && $(PYTHON) -c "\
		from crawler_dqn import DoubleDQNAgent; \
		a = DoubleDQNAgent(); \
		a.load_checkpoint(); \
		p = a.export_onnx(quantize_int8=True); \
		print(f'Exported: {p}')"

export-coreml: ## Export DQN to CoreML
	cd $(SRC_DIR) && $(PYTHON) -c "\
		from crawler_dqn import DoubleDQNAgent; \
		a = DoubleDQNAgent(); \
		a.load_checkpoint(); \
		p = a.export_coreml(); \
		print(f'Exported: {p}')"

# ── Testing ───────────────────────────────────────────────────
.PHONY: test test-unit test-integration test-coverage test-engine test-dqn test-replay test-embeddings test-pipeline test-politeness

test: ## Run all tests
	cd $(SRC_DIR) && $(PYTEST) -xvs

test-unit: ## Unit tests only
	cd $(SRC_DIR) && $(PYTEST) -xvs -m "not integration"

test-integration: ## Integration tests only
	cd $(SRC_DIR) && $(PYTEST) -xvs -m integration

test-coverage: ## Tests with coverage report
	cd $(SRC_DIR) && $(PYTEST) --cov=. --cov-report=term-missing --cov-report=html:../htmlcov

test-engine: ## Test crawler engine components
	cd $(SRC_DIR) && $(PYTEST) -xvs test_crawler_engine.py

test-dqn: ## Test DQN agent
	cd $(SRC_DIR) && $(PYTEST) -xvs test_crawler_dqn.py

test-replay: ## Test replay buffer
	cd $(SRC_DIR) && $(PYTEST) -xvs test_crawler_replay_buffer.py

test-embeddings: ## Test embeddings module
	cd $(SRC_DIR) && $(PYTEST) -xvs test_crawler_embeddings.py

test-pipeline: ## Test full pipeline
	cd $(SRC_DIR) && $(PYTEST) -xvs test_crawler_pipeline.py

test-politeness: ## Test politeness manager
	cd $(SRC_DIR) && $(PYTEST) -xvs test_crawler_politeness.py

# ── Linting & Type Checking ──────────────────────────────────
.PHONY: lint typecheck format

lint: ## Run ruff linter
	cd $(SRC_DIR) && $(PYTHON) -m ruff check .

typecheck: ## Run mypy type checker
	cd $(SRC_DIR) && $(PYTHON) -m mypy --ignore-missing-imports crawler_dqn.py crawler_engine.py crawler_replay_buffer.py crawler_embeddings.py crawler_pipeline.py

format: ## Auto-format with ruff
	cd $(SRC_DIR) && $(PYTHON) -m ruff format .

# ── Monitoring & Status ──────────────────────────────────────
.PHONY: status metrics frontier-stats domain-stats replay-stats

status: ## Show pipeline status
	@echo "=== Scrapus Module 1: RL Crawler Status ==="
	@echo ""
	@if [ -f "$(MODELS_DIR)/policy.pt" ]; then \
		echo "DQN checkpoint: $(MODELS_DIR)/policy.pt ($(shell ls -lh $(MODELS_DIR)/policy.pt 2>/dev/null | awk '{print $$5}'))"; \
	else \
		echo "DQN checkpoint: NOT FOUND"; \
	fi
	@if [ -f "$(MODELS_DIR)/policy_int8.onnx" ]; then \
		echo "ONNX model:     $(MODELS_DIR)/policy_int8.onnx ($(shell ls -lh $(MODELS_DIR)/policy_int8.onnx 2>/dev/null | awk '{print $$5}'))"; \
	else \
		echo "ONNX model:     NOT FOUND"; \
	fi
	@if [ -f "$(DATA_DIR)/frontier.db" ]; then \
		echo "Frontier DB:    $(DATA_DIR)/frontier.db ($(shell ls -lh $(DATA_DIR)/frontier.db 2>/dev/null | awk '{print $$5}'))"; \
	else \
		echo "Frontier DB:    NOT FOUND"; \
	fi
	@if [ -f "$(DATA_DIR)/replay_buffer/replay_meta.db" ]; then \
		echo "Replay buffer:  $(DATA_DIR)/replay_buffer/ ($(shell du -sh $(DATA_DIR)/replay_buffer 2>/dev/null | cut -f1))"; \
	else \
		echo "Replay buffer:  NOT FOUND"; \
	fi

metrics: ## Show training metrics from SQLite
	@cd $(SRC_DIR) && $(PYTHON) -c "\
		from crawler_monitoring import MetricsCollector; \
		m = MetricsCollector(); \
		m.print_summary()" 2>/dev/null || echo "No metrics available (run a crawl first)"

frontier-stats: ## Show frontier statistics
	@if [ -f "$(DATA_DIR)/frontier.db" ]; then \
		sqlite3 $(DATA_DIR)/frontier.db "SELECT status, COUNT(*) FROM frontier GROUP BY status;"; \
	else \
		echo "No frontier DB found"; \
	fi

domain-stats: ## Show domain statistics (top 20)
	@if [ -f "$(DATA_DIR)/domain_stats.db" ]; then \
		sqlite3 -header -column $(DATA_DIR)/domain_stats.db \
			"SELECT domain, pages_crawled, ROUND(reward_sum/MAX(pages_crawled,1),4) AS avg_reward, leads_found \
			 FROM domain_stats ORDER BY reward_sum/MAX(pages_crawled,1) DESC LIMIT 20;"; \
	else \
		echo "No domain stats DB found"; \
	fi

replay-stats: ## Show replay buffer statistics
	@cd $(SRC_DIR) && $(PYTHON) -c "\
		from crawler_replay_buffer import MmapReplayBuffer; \
		r = MmapReplayBuffer(); \
		import json; print(json.dumps(r.get_buffer_stats(), indent=2)); \
		r.close()" 2>/dev/null || echo "No replay buffer found"

# ── Data Management ──────────────────────────────────────────
.PHONY: clean clean-data clean-models reset

clean: ## Remove Python caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache htmlcov .mypy_cache .ruff_cache

clean-data: ## Remove crawl data (frontier, domain stats) — keeps models
	rm -f $(DATA_DIR)/frontier.db $(DATA_DIR)/domain_stats.db
	@echo "Crawl data cleaned. Models preserved."

clean-models: ## Remove trained models
	rm -rf $(MODELS_DIR)
	@echo "Models cleaned."

reset: clean clean-data clean-models ## Full reset — remove all generated data
	rm -rf $(DATA_DIR)
	@echo "Full reset complete."

# ── Benchmarks ───────────────────────────────────────────────
.PHONY: bench bench-embedding bench-dqn bench-replay bench-bloom

bench: bench-embedding bench-dqn bench-replay bench-bloom ## Run all benchmarks

bench-embedding: ## Benchmark embedding throughput
	@cd $(SRC_DIR) && $(PYTHON) -c "\
		import time; \
		from crawler_embeddings import NomicEmbedder; \
		e = NomicEmbedder(); e.load(); \
		texts = ['Sample text for embedding benchmark'] * 100; \
		t0 = time.time(); \
		for _ in range(10): e.embed_texts(texts); \
		elapsed = time.time() - t0; \
		print(f'Embedding: {1000/elapsed:.0f} texts/sec ({elapsed:.2f}s for 1000)'); \
		e.unload()"

bench-dqn: ## Benchmark DQN inference latency
	@cd $(SRC_DIR) && $(PYTHON) -c "\
		import time, numpy as np; \
		from crawler_dqn import DoubleDQNAgent; \
		a = DoubleDQNAgent(); \
		state = np.random.randn(784).astype(np.float32); \
		t0 = time.time(); \
		for _ in range(10000): a.select_action(state, 10, 100000); \
		elapsed = time.time() - t0; \
		print(f'DQN inference: {elapsed/10:.4f}ms/action ({10000/elapsed:.0f} actions/sec)'); \
		a.release()" 2>/dev/null || echo "PyTorch not available"

bench-replay: ## Benchmark replay buffer throughput
	@cd $(SRC_DIR) && $(PYTHON) -c "\
		import time, numpy as np, tempfile; \
		from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig; \
		cfg = ReplayBufferConfig(data_dir=tempfile.mkdtemp(), capacity=10000); \
		r = MmapReplayBuffer(cfg); \
		s = np.random.randn(784).astype(np.float32); \
		t0 = time.time(); \
		for i in range(5000): r.add(s, i%10, -0.01, s, False); \
		elapsed = time.time() - t0; \
		print(f'Replay add: {5000/elapsed:.0f} transitions/sec'); \
		t1 = time.time(); \
		for _ in range(100): r.sample(64); \
		elapsed2 = time.time() - t1; \
		print(f'Replay sample: {100/elapsed2:.0f} batches/sec'); \
		r.close()"

bench-bloom: ## Benchmark bloom filter performance
	@cd $(SRC_DIR) && $(PYTHON) -c "\
		import time; \
		from crawler_engine import BloomFilter; \
		bf = BloomFilter(1_000_000, 0.001); \
		t0 = time.time(); \
		for i in range(100000): bf.add(f'https://example.com/page-{i}'); \
		elapsed = time.time() - t0; \
		print(f'Bloom add: {100000/elapsed:.0f} ops/sec'); \
		t1 = time.time(); \
		hits = sum(1 for i in range(100000) if f'https://example.com/page-{i}' in bf); \
		elapsed2 = time.time() - t1; \
		print(f'Bloom lookup: {100000/elapsed2:.0f} ops/sec (hits={hits})')"

# ── Playwright Setup ─────────────────────────────────────────
.PHONY: playwright-install

playwright-install: ## Install Playwright browsers
	$(PYTHON) -m playwright install chromium

# ── Help ─────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
