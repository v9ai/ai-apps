"""
Shared pytest fixtures for the Scrapus pipeline test suite.

Provides sample data, mock models, temp databases, M1-detection helpers,
and Module 1 crawler fixtures (configs, replay buffer, frontier, scheduler)
so individual test modules can focus on testing logic rather than setup.
"""

import gc
import json
import os
import platform
import sqlite3
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from crawler_dqn import DQNConfig
from crawler_embeddings import EmbeddingConfig, NomicEmbedder
from crawler_engine import CrawlerConfig, DomainScheduler, PageContent, URLFrontier
from crawler_pipeline import CrawlerPipelineConfig
from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig


# ---------------------------------------------------------------------------
# Pytest markers
# ---------------------------------------------------------------------------

def pytest_configure(config):
    config.addinivalue_line("markers", "slow: marks tests as slow (deselect with -m 'not slow')")
    config.addinivalue_line("markers", "gpu: marks tests that require M1 GPU / MPS")
    config.addinivalue_line("markers", "integration: marks integration tests")
    config.addinivalue_line("markers", "requires_torch: marks tests that need PyTorch")
    config.addinivalue_line("markers", "requires_onnx: marks tests that need ONNX Runtime")
    config.addinivalue_line("markers", "requires_mlx: marks tests that need MLX")


# ---------------------------------------------------------------------------
# M1 / hardware detection
# ---------------------------------------------------------------------------

def _is_apple_silicon() -> bool:
    return platform.machine() in ("arm64", "aarch64") and platform.system() == "Darwin"


@pytest.fixture
def is_m1():
    """Return True if running on Apple Silicon."""
    return _is_apple_silicon()


@pytest.fixture
def skip_unless_m1():
    """Skip the test unless running on Apple Silicon."""
    if not _is_apple_silicon():
        pytest.skip("Requires Apple M1/M2/M3 hardware")


# ---------------------------------------------------------------------------
# Sample data: pages
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_pages() -> List[Dict[str, Any]]:
    """Synthetic crawled pages for NER and downstream tests."""
    return [
        {
            "page_id": 1,
            "url": "https://acme.com/about",
            "text": (
                "Acme Corporation is a Berlin-based cybersecurity startup founded by "
                "Jane Doe (jane@acme.com, +49-151-12345678). They raised a $12M Series A "
                "led by Sequoia Capital in 2024."
            ),
            "domain": "acme.com",
            "crawl_ts": "2026-01-15T10:00:00",
        },
        {
            "page_id": 2,
            "url": "https://techstartup.io/team",
            "text": (
                "TechStartup GmbH, headquartered in Munich, Germany, builds ML-powered "
                "analytics. CTO: Max Mustermann (max@techstartup.io). They recently "
                "launched their enterprise product."
            ),
            "domain": "techstartup.io",
            "crawl_ts": "2026-01-16T14:30:00",
        },
        {
            "page_id": 3,
            "url": "https://globalfin.co/press",
            "text": (
                "GlobalFin raised $45M Series B from Andreessen Horowitz and Tiger Global. "
                "CEO Sarah Johnson said the funds will expand operations to London and "
                "Singapore. Contact: press@globalfin.co."
            ),
            "domain": "globalfin.co",
            "crawl_ts": "2026-02-01T09:00:00",
        },
        {
            "page_id": 4,
            "url": "https://noinfo.example.com",
            "text": "",
            "domain": "noinfo.example.com",
            "crawl_ts": "2026-02-10T12:00:00",
        },
    ]


# ---------------------------------------------------------------------------
# Sample data: entities
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_entities() -> List[Dict[str, Any]]:
    """Pre-extracted entities for entity-resolution and scoring tests."""
    return [
        {"id": 1, "name": "Acme Corporation", "type": "ORG", "location": "Berlin", "industry": "cybersecurity", "url": "https://acme.com"},
        {"id": 2, "name": "ACME Corp", "type": "ORG", "location": "Berlin", "industry": "AI", "url": "https://acme.com/about"},
        {"id": 3, "name": "Acme Inc.", "type": "ORG", "location": "Berlin, Germany", "industry": "cybersecurity"},
        {"id": 4, "name": "TechStartup GmbH", "type": "ORG", "location": "Munich", "industry": "ML"},
        {"id": 5, "name": "Tech Startup", "type": "ORG", "location": "Munich, Germany", "industry": "machine learning"},
        {"id": 6, "name": "Jane Doe", "type": "PERSON", "location": "Berlin"},
        {"id": 7, "name": "Max Mustermann", "type": "PERSON", "location": "Munich"},
        {"id": 8, "name": "Sarah Johnson", "type": "PERSON", "location": "London"},
        {"id": 9, "name": "GlobalFin", "type": "ORG", "location": "Singapore", "industry": "fintech"},
    ]


# ---------------------------------------------------------------------------
# Sample data: leads
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_leads() -> List[Dict[str, Any]]:
    """Scored leads for report-generation tests."""
    return [
        {"lead_id": 1, "company": "Acme Corporation", "score": 0.92, "icp_match": True, "funding": "$12M Series A"},
        {"lead_id": 2, "company": "TechStartup GmbH", "score": 0.78, "icp_match": True, "funding": None},
        {"lead_id": 3, "company": "GlobalFin", "score": 0.65, "icp_match": False, "funding": "$45M Series B"},
    ]


# ---------------------------------------------------------------------------
# Sample data: reports
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_reports() -> List[Dict[str, Any]]:
    """Pre-generated reports for evaluation tests."""
    return [
        {
            "report_id": 1,
            "company": "Acme Corporation",
            "summary": "Acme Corporation is a Berlin-based cybersecurity startup that raised $12M.",
            "key_strengths": ["Strong funding", "Cybersecurity market"],
            "growth_indicators": ["Series A funding"],
            "risk_factors": ["Small team"],
            "recommended_approach": "Focus on enterprise security needs and recent funding momentum.",
            "confidence": 0.85,
        },
    ]


# ---------------------------------------------------------------------------
# Temporary databases
# ---------------------------------------------------------------------------

@pytest.fixture
def temp_sqlite_db(tmp_path):
    """Create a temporary SQLite database and return its path."""
    db_path = str(tmp_path / "test_scrapus.db")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.close()
    yield db_path
    # cleanup handled by tmp_path


@pytest.fixture
def temp_lancedb(tmp_path):
    """Create a temporary directory for LanceDB and return its path."""
    lance_dir = tmp_path / "lancedb_test"
    lance_dir.mkdir()
    yield str(lance_dir)


# ---------------------------------------------------------------------------
# Mock ML models
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_ner_model():
    """Mock GLiNER2 / ONNX NER model that returns canned predictions."""
    model = MagicMock()

    def _predict(inputs):
        seq_len = 64
        num_types = 6
        span_logits = np.random.uniform(0.0, 0.3, (1, seq_len, seq_len)).astype(np.float32)
        # inject a few high-confidence spans
        span_logits[0, 2, 5] = 0.92
        span_logits[0, 10, 13] = 0.88
        type_logits = np.random.uniform(0.0, 0.3, (1, seq_len, num_types)).astype(np.float32)
        type_logits[0, 2, 0] = 0.9   # ORG
        type_logits[0, 10, 1] = 0.85  # PERSON
        return [span_logits, type_logits]

    model.run = MagicMock(side_effect=_predict)
    return model


@pytest.fixture
def mock_llm():
    """Mock LLM that returns a valid JSON report string."""
    report = {
        "summary": "Acme Corporation is a Berlin-based cybersecurity startup with strong growth potential.",
        "key_strengths": ["Strong funding history", "Experienced leadership"],
        "growth_indicators": ["Series A funding of $12M"],
        "risk_factors": ["Competitive market"],
        "recommended_approach": "Approach with an enterprise-security pitch leveraging recent funding.",
        "confidence": 0.82,
        "sources": [{"url": "https://acme.com", "relevance_score": 0.9}],
    }
    model = MagicMock()
    model.generate.return_value = json.dumps(report)
    return model


@pytest.fixture
def mock_embedder():
    """Mock sentence-transformer that returns deterministic 384-dim embeddings."""
    model = MagicMock()

    def _encode(texts, **kwargs):
        rng = np.random.RandomState(42)
        embeddings = rng.randn(len(texts) if isinstance(texts, list) else 1, 384).astype(np.float32)
        # L2 normalise
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        return embeddings / (norms + 1e-8)

    model.encode = MagicMock(side_effect=_encode)
    model.get_sentence_embedding_dimension = MagicMock(return_value=384)
    return model


# ---------------------------------------------------------------------------
# Memory tracker fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def memory_tracker():
    """Lightweight memory tracker that records RSS deltas."""

    class _MemTracker:
        def __init__(self):
            import psutil
            self._proc = psutil.Process(os.getpid())
            self._snapshots: List[Dict[str, Any]] = []

        def snapshot(self, label: str = ""):
            info = self._proc.memory_info()
            self._snapshots.append({
                "label": label,
                "rss_mb": info.rss / (1024 ** 2),
                "ts": time.time(),
            })

        @property
        def snapshots(self):
            return self._snapshots

        def delta_mb(self) -> float:
            if len(self._snapshots) < 2:
                return 0.0
            return self._snapshots[-1]["rss_mb"] - self._snapshots[0]["rss_mb"]

    return _MemTracker()


# ---------------------------------------------------------------------------
# Synthetic embedding helper
# ---------------------------------------------------------------------------

@pytest.fixture
def make_embeddings():
    """Factory fixture: generate deterministic normalised embeddings."""

    def _factory(n: int, dim: int = 384, seed: int = 0) -> np.ndarray:
        rng = np.random.RandomState(seed)
        vecs = rng.randn(n, dim).astype(np.float32)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        return vecs / (norms + 1e-8)

    return _factory


# ---------------------------------------------------------------------------
# Synthetic training data helper
# ---------------------------------------------------------------------------

@pytest.fixture
def make_training_data():
    """Factory fixture: generate (X, y) with controllable positive rate."""

    def _factory(n: int = 500, n_features: int = 78, pos_rate: float = 0.35, seed: int = 42):
        rng = np.random.RandomState(seed)
        X = rng.randn(n, n_features).astype(np.float32)
        y = (rng.rand(n) < pos_rate).astype(np.int32)
        return X, y

    return _factory


# ===========================================================================
# Module 1: Crawler pipeline shared fixtures
# ===========================================================================


# ---------------------------------------------------------------------------
# Temporary data directory with standard sub-structure
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_data_dir(tmp_path: Path) -> Path:
    """Create a temporary scrapus_data directory with standard subdirectories."""
    data_dir = tmp_path / "scrapus_data"
    data_dir.mkdir()
    (data_dir / "models" / "dqn").mkdir(parents=True)
    (data_dir / "replay_buffer").mkdir()
    (data_dir / "logs").mkdir()
    return data_dir


# ---------------------------------------------------------------------------
# Sub-module configs pointing at tmp_data_dir
# ---------------------------------------------------------------------------

@pytest.fixture
def dqn_config(tmp_data_dir: Path) -> DQNConfig:
    """DQNConfig with paths pointing to the temporary data directory."""
    return DQNConfig(
        policy_path=str(tmp_data_dir / "models" / "dqn" / "policy.pt"),
        onnx_path=str(tmp_data_dir / "models" / "dqn" / "policy.onnx"),
        coreml_path=str(tmp_data_dir / "models" / "dqn" / "policy.mlpackage"),
    )


@pytest.fixture
def crawler_config(tmp_data_dir: Path) -> CrawlerConfig:
    """CrawlerConfig with SQLite paths rooted in the temporary directory."""
    return CrawlerConfig(
        frontier_db=str(tmp_data_dir / "frontier.db"),
        domain_stats_db=str(tmp_data_dir / "domain_stats.db"),
        bloom_capacity=10_000,
    )


@pytest.fixture
def replay_config(tmp_data_dir: Path) -> ReplayBufferConfig:
    """ReplayBufferConfig with storage rooted in the temporary directory."""
    return ReplayBufferConfig(
        capacity=200,
        state_dim=784,
        data_dir=str(tmp_data_dir / "replay_buffer"),
    )


@pytest.fixture
def embedding_config() -> EmbeddingConfig:
    """Default EmbeddingConfig."""
    return EmbeddingConfig()


@pytest.fixture
def pipeline_config(tmp_data_dir: Path) -> CrawlerPipelineConfig:
    """CrawlerPipelineConfig with all sub-configs using temporary paths."""
    return CrawlerPipelineConfig(
        dqn=DQNConfig(
            policy_path=str(tmp_data_dir / "models" / "dqn" / "policy.pt"),
            onnx_path=str(tmp_data_dir / "models" / "dqn" / "policy.onnx"),
            coreml_path=str(tmp_data_dir / "models" / "dqn" / "policy.mlpackage"),
        ),
        embedding=EmbeddingConfig(),
        crawler=CrawlerConfig(
            frontier_db=str(tmp_data_dir / "frontier.db"),
            domain_stats_db=str(tmp_data_dir / "domain_stats.db"),
            bloom_capacity=10_000,
        ),
        replay=ReplayBufferConfig(
            capacity=200,
            state_dim=784,
            data_dir=str(tmp_data_dir / "replay_buffer"),
        ),
        data_dir=str(tmp_data_dir),
    )


# ---------------------------------------------------------------------------
# Random state vectors
# ---------------------------------------------------------------------------

@pytest.fixture
def random_state() -> np.ndarray:
    """Single random state vector of shape (784,), float32."""
    return np.random.randn(784).astype(np.float32)


@pytest.fixture
def random_states():
    """Factory fixture: return (n, 784) float32 random state array.

    Usage::

        def test_batch(random_states):
            states = random_states(n=128)
            assert states.shape == (128, 784)
    """

    def _factory(n: int = 64) -> np.ndarray:
        return np.random.randn(n, 784).astype(np.float32)

    return _factory


# ---------------------------------------------------------------------------
# Fake PageContent factory
# ---------------------------------------------------------------------------

@pytest.fixture
def fake_page_content():
    """Factory fixture: create PageContent instances with configurable fields.

    Usage::

        def test_page(fake_page_content):
            page = fake_page_content(url="https://example.com", title="Test")
    """

    def _factory(
        url: str = "https://example.com/page",
        domain: str = "example.com",
        title: str = "Test Page",
        body_text: str = "This is a test page with some content for embedding.",
        outbound_links: Optional[List[str]] = None,
        meta_description: str = "",
        meta_keywords: str = "",
        language: str = "en",
        status_code: int = 200,
        content_type: str = "text/html",
        fetch_time_ms: float = 150.0,
        body_length: int = 0,
        link_count: int = 0,
    ) -> PageContent:
        links = outbound_links if outbound_links is not None else [
            "https://example.com/link1",
            "https://example.com/link2",
        ]
        return PageContent(
            url=url,
            domain=domain,
            title=title,
            body_text=body_text,
            outbound_links=links,
            meta_description=meta_description,
            meta_keywords=meta_keywords,
            language=language,
            status_code=status_code,
            content_type=content_type,
            fetch_time_ms=fetch_time_ms,
            body_length=body_length or len(body_text),
            link_count=link_count or len(links),
        )

    return _factory


# ---------------------------------------------------------------------------
# Mock NomicEmbedder (no real model loading)
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_nomic_embedder() -> NomicEmbedder:
    """NomicEmbedder with a mocked backend that returns random embeddings.

    Does not load any model files; suitable for tests that need embedding
    dimensions to be correct but don't care about the actual vectors.
    """
    embedder = NomicEmbedder(EmbeddingConfig())
    embedder._model = MagicMock()
    embedder._backend = "mlx"

    def _fake_embed_texts(texts, prefix=None, normalize=True):
        n = len(texts)
        rng = np.random.RandomState(42)
        vecs = rng.randn(n, 768).astype(np.float32)
        if normalize:
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            vecs = vecs / np.maximum(norms, 1e-12)
        return vecs

    embedder.embed_texts = _fake_embed_texts
    embedder.embed_text = lambda text, prefix=None, normalize=True: _fake_embed_texts(
        [text], prefix=prefix, normalize=normalize
    )[0]
    return embedder


# ---------------------------------------------------------------------------
# Initialised MmapReplayBuffer (auto-closed)
# ---------------------------------------------------------------------------

@pytest.fixture
def replay_buffer(replay_config: ReplayBufferConfig) -> MmapReplayBuffer:
    """Initialised MmapReplayBuffer backed by temporary files; closed after test."""
    buf = MmapReplayBuffer(replay_config)
    yield buf
    buf.close()


# ---------------------------------------------------------------------------
# Initialised URLFrontier (auto-closed)
# ---------------------------------------------------------------------------

@pytest.fixture
def frontier(crawler_config: CrawlerConfig) -> URLFrontier:
    """Initialised URLFrontier backed by a temporary SQLite DB; closed after test."""
    f = URLFrontier(crawler_config)
    yield f
    f.close()


# ---------------------------------------------------------------------------
# Initialised DomainScheduler (auto-closed)
# ---------------------------------------------------------------------------

@pytest.fixture
def scheduler(crawler_config: CrawlerConfig) -> DomainScheduler:
    """Initialised DomainScheduler backed by a temporary SQLite DB; closed after test."""
    s = DomainScheduler(crawler_config)
    yield s
    s.close()
