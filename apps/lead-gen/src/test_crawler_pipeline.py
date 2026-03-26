"""Integration tests for crawler_pipeline module."""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from crawler_dqn import DQNConfig
from crawler_embeddings import EmbeddingConfig, NomicEmbedder, ScalarFeatures, StateVectorBuilder
from crawler_engine import (
    CrawlerConfig,
    CrawlerEngine,
    DomainScheduler,
    PageContent,
    PolitenessManager,
    PlaywrightFetcher,
    URLFrontier,
)
from crawler_pipeline import (
    CrawlerPipeline,
    CrawlerPipelineConfig,
    CrawlResult,
    run_crawler_pipeline,
)
from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_page_content(
    url: str = "https://example.com/page1",
    domain: str = "example.com",
    body_text: str = "This is a test page about AI engineering jobs in Europe.",
    outbound_links: Optional[List[str]] = None,
) -> PageContent:
    """Create a fake PageContent for testing."""
    links = outbound_links or [
        "https://example.com/page2",
        "https://example.com/page3",
    ]
    return PageContent(
        url=url,
        domain=domain,
        title="Test Page",
        body_text=body_text,
        outbound_links=links,
        meta_description="test meta",
        status_code=200,
        content_type="text/html",
        fetch_time_ms=42.0,
        body_length=len(body_text),
        link_count=len(links),
    )


def _make_mock_embedder(embed_dim: int = 768, scalar_dim: int = 16) -> MagicMock:
    """Return a mock NomicEmbedder that produces random embeddings."""
    embedder = MagicMock(spec=NomicEmbedder)
    embedder.embedding_dim = embed_dim
    embedder.state_dim = embed_dim + scalar_dim
    embedder._backend = "mock"
    embedder.embed_text.side_effect = lambda text, **kw: np.random.randn(embed_dim).astype(np.float32)
    embedder.embed_texts.side_effect = lambda texts, **kw: np.random.randn(len(texts), embed_dim).astype(np.float32)
    embedder.load.return_value = None
    embedder.unload.return_value = None
    embedder.is_loaded = True
    return embedder


def _make_mock_state_builder(state_dim: int = 784) -> MagicMock:
    """Return a mock StateVectorBuilder."""
    builder = MagicMock(spec=StateVectorBuilder)
    builder.state_dim = state_dim
    builder.build_state.side_effect = lambda text, scalar, **kw: np.random.randn(state_dim).astype(np.float32)
    return builder


def _make_mock_engine(tmp_path) -> MagicMock:
    """Return a mock CrawlerEngine with real-ish sub-components."""
    cfg = CrawlerConfig(
        frontier_db=str(tmp_path / "frontier.db"),
        domain_stats_db=str(tmp_path / "domain_stats.db"),
    )
    engine = MagicMock(spec=CrawlerEngine)
    engine.config = cfg
    engine.frontier = URLFrontier(cfg)
    engine.scheduler = DomainScheduler(cfg)
    engine.start = AsyncMock()
    engine.stop = AsyncMock()
    engine.get_stats.return_value = {
        "pages_crawled": 0,
        "pages_failed": 0,
        "pages_per_sec": 0.0,
        "elapsed_seconds": 0.0,
    }
    engine.add_seed_urls = MagicMock(return_value=1)
    return engine


# ---------------------------------------------------------------------------
# TestCrawlerPipelineConfig
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestCrawlerPipelineConfig:

    def test_default_subconfigs_created(self):
        """__post_init__ should create default DQN, Embedding, Crawler, Replay configs."""
        cfg = CrawlerPipelineConfig()
        assert isinstance(cfg.dqn, DQNConfig)
        assert isinstance(cfg.embedding, EmbeddingConfig)
        assert isinstance(cfg.crawler, CrawlerConfig)
        assert isinstance(cfg.replay, ReplayBufferConfig)
        # Spot-check defaults
        assert cfg.max_pages == 50_000
        assert cfg.train_every_n_steps == 4
        assert cfg.memory_budget_mb == 750

    def test_custom_data_dir(self, tmp_path):
        """Custom data_dir should propagate to the config."""
        custom_dir = str(tmp_path / "custom_data")
        cfg = CrawlerPipelineConfig(data_dir=custom_dir)
        assert cfg.data_dir == custom_dir
        # Sub-configs remain defaults
        assert isinstance(cfg.dqn, DQNConfig)


# ---------------------------------------------------------------------------
# TestCrawlResult
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestCrawlResult:

    def test_crawl_result_creation(self):
        """CrawlResult should store page, vectors, action, q_value, epsilon."""
        page = _make_page_content()
        state = np.random.randn(784).astype(np.float32)
        embedding = np.random.randn(768).astype(np.float32)
        scalar = ScalarFeatures(
            depth=1,
            domain_pages_crawled=5,
            domain_reward_sum=0.3,
            link_count=2,
            body_length=100,
            response_time_ms=42.0,
        )

        result = CrawlResult(
            page=page,
            state_vector=state,
            embedding=embedding,
            scalar_features=scalar,
            action=3,
            q_value=0.75,
            epsilon=0.1,
        )

        assert result.page.url == "https://example.com/page1"
        assert result.state_vector.shape == (784,)
        assert result.embedding.shape == (768,)
        assert result.action == 3
        assert result.q_value == pytest.approx(0.75)
        assert result.epsilon == pytest.approx(0.1)
        assert result.scalar_features.depth == 1


# ---------------------------------------------------------------------------
# TestCrawlerPipeline
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestCrawlerPipeline:

    @pytest.fixture
    def pipeline_config(self, tmp_path) -> CrawlerPipelineConfig:
        """Config with all paths pointing to tmp_path."""
        cfg = CrawlerPipelineConfig(
            data_dir=str(tmp_path / "scrapus_data"),
        )
        cfg.dqn.state_dim = 784
        cfg.dqn.policy_path = str(tmp_path / "models" / "policy.pt")
        cfg.dqn.onnx_path = str(tmp_path / "models" / "policy.onnx")
        cfg.replay.data_dir = str(tmp_path / "replay_buffer")
        cfg.replay.state_dim = 784
        cfg.replay.capacity = 1_000
        cfg.crawler.frontier_db = str(tmp_path / "frontier.db")
        cfg.crawler.domain_stats_db = str(tmp_path / "domain_stats.db")
        return cfg

    @pytest.mark.asyncio
    async def test_pipeline_lifecycle(self, pipeline_config, tmp_path):
        """init -> initialise -> shutdown should not raise."""
        pipeline = CrawlerPipeline(pipeline_config)
        assert pipeline._initialised is False

        # Patch the heavy components to avoid needing real models/browser
        with (
            patch.object(NomicEmbedder, "load", return_value=None),
            patch.object(NomicEmbedder, "unload", return_value=None),
            patch.object(NomicEmbedder, "embedding_dim", new_callable=lambda: property(lambda self: 768)),
            patch.object(PlaywrightFetcher, "start", new_callable=AsyncMock),
            patch.object(PlaywrightFetcher, "stop", new_callable=AsyncMock),
        ):
            await pipeline.initialise()
            assert pipeline._initialised is True
            assert pipeline.embedder is not None
            assert pipeline.replay is not None
            assert pipeline.engine is not None

            # Replace the DQN agent with a mock to avoid torch.mps issues
            if pipeline.agent is not None:
                mock_agent = MagicMock()
                mock_agent.save_checkpoint = MagicMock()
                mock_agent.release = MagicMock()
                pipeline.agent = mock_agent

            await pipeline.shutdown()
            assert pipeline._initialised is False

    def test_select_action_random_fallback(self, pipeline_config):
        """Without agent or ONNX, _select_action should pick random action."""
        pipeline = CrawlerPipeline(pipeline_config)
        pipeline.agent = None
        pipeline.onnx_engine = None

        state = np.random.randn(784).astype(np.float32)
        action, epsilon, q_value = pipeline._select_action(state, num_links=5)

        assert 0 <= action < 5
        assert epsilon == 1.0
        assert q_value == 0.0

    def test_select_action_no_links(self, pipeline_config):
        """With num_links=0, should return (0, 1.0, 0.0)."""
        pipeline = CrawlerPipeline(pipeline_config)
        state = np.random.randn(784).astype(np.float32)

        action, epsilon, q_value = pipeline._select_action(state, num_links=0)

        assert action == 0
        assert epsilon == 1.0
        assert q_value == 0.0

    def test_collect_stats_format(self, pipeline_config, tmp_path):
        """_collect_stats should return dict with expected top-level keys."""
        pipeline = CrawlerPipeline(pipeline_config)
        pipeline._global_step = 42
        pipeline._all_rewards = [-0.01, -0.01, 0.5, 1.0]

        # Set up minimal engine mock
        pipeline.engine = _make_mock_engine(tmp_path)
        pipeline.replay = MagicMock(spec=MmapReplayBuffer)
        pipeline.replay.get_buffer_stats.return_value = {"size": 100, "capacity": 1000}
        pipeline.agent = None

        stats = pipeline._collect_stats()

        assert stats["global_step"] == 42
        assert "crawler" in stats
        assert "replay" in stats
        assert "rewards" in stats
        assert stats["rewards"]["total"] == 4
        assert stats["rewards"]["mean"] == pytest.approx(np.mean([-0.01, -0.01, 0.5, 1.0]), abs=1e-3)
        assert stats["rewards"]["positive_count"] == 2
        # harvest_rate: pages with reward >= 0.2  ->  0.5 and 1.0  ->  2/4 = 0.5
        assert stats["rewards"]["harvest_rate"] == pytest.approx(0.5, abs=1e-3)

    def test_resolve_rewards(self, pipeline_config, tmp_path):
        """resolve_rewards delegates to replay buffer."""
        pipeline = CrawlerPipeline(pipeline_config)

        # Create a real replay buffer with batch_commit_size=1 to flush immediately
        pipeline_config.replay.batch_commit_size = 1
        replay = MmapReplayBuffer(pipeline_config.replay)
        pipeline.replay = replay

        state = np.random.randn(784).astype(np.float32)
        zero_state = np.zeros(784, dtype=np.float32)

        # Add a transition with a pending reward URL
        replay.add(
            state=state,
            action=0,
            reward=0.0,
            next_state=zero_state,
            done=False,
            url="https://example.com/lead",
        )

        # Resolve
        resolved = pipeline.resolve_rewards([
            {"url": "https://example.com/lead", "reward": 1.0},
        ])
        assert resolved == 1

        # Unknown URL resolves nothing
        resolved2 = pipeline.resolve_rewards([
            {"url": "https://unknown.com/nope", "reward": 0.5},
        ])
        assert resolved2 == 0

        replay.close()

    def test_resolve_rewards_no_replay(self, pipeline_config):
        """resolve_rewards returns 0 when replay is None."""
        pipeline = CrawlerPipeline(pipeline_config)
        pipeline.replay = None

        result = pipeline.resolve_rewards([{"url": "x", "reward": 1.0}])
        assert result == 0

    def test_handle_episode_end_resets_state(self, pipeline_config):
        """_handle_episode_end should reset trajectory, pages, depth, domain."""
        pipeline = CrawlerPipeline(pipeline_config)
        pipeline._trajectory = [
            {"url": "a", "state": np.zeros(784), "action": 0, "reward": -0.01, "step": 0},
            {"url": "b", "state": np.zeros(784), "action": 1, "reward": -0.01, "step": 1},
        ]
        pipeline._episode_pages = 10
        pipeline._episode_depth = 3
        pipeline._current_domain = "example.com"

        pipeline._handle_episode_end()

        assert pipeline._trajectory == []
        assert pipeline._episode_pages == 0
        assert pipeline._episode_depth == 0
        assert pipeline._current_domain is None

    def test_periodic_maintenance_prunes(self, pipeline_config, tmp_path):
        """_periodic_maintenance should prune frontier and replay when interval elapsed."""
        pipeline = CrawlerPipeline(pipeline_config)
        pipeline.engine = _make_mock_engine(tmp_path)

        # Real replay buffer for prune_old_pending call
        pipeline.replay = MmapReplayBuffer(pipeline_config.replay)

        # Set last prune to more than prune_interval ago
        pipeline._last_prune_time = time.time() - pipeline_config.prune_interval - 10

        # Patch frontier.prune_failed to track the call
        pipeline.engine.frontier.prune_failed = MagicMock(return_value=0)

        pipeline._periodic_maintenance()

        pipeline.engine.frontier.prune_failed.assert_called_once()
        # _last_prune_time should be updated
        assert pipeline._last_prune_time > time.time() - 5

        pipeline.replay.close()

    def test_train_step_updates_priorities(self, pipeline_config):
        """_train_step should call replay.sample, agent.train_step_on_batch, replay.update_priorities."""
        pipeline = CrawlerPipeline(pipeline_config)

        batch_size = pipeline_config.dqn.batch_size
        state_dim = pipeline_config.dqn.state_dim

        td_errors = np.random.randn(batch_size).astype(np.float32)

        # Mock agent -- set train_step to a value that does NOT trigger
        # policy_save_interval, onnx_export_interval, or log_interval
        mock_agent = MagicMock()
        mock_agent.train_step = 7  # not divisible by 100 (log_interval) or 500
        mock_agent.train_step_on_batch.return_value = (0.5, td_errors)
        mock_agent.get_convergence_metrics.return_value = {
            "train_step": 7.0,
            "mean_loss": 0.5,
            "mean_q": 0.1,
            "epsilon": 0.9,
            "mean_reward": -0.01,
        }
        pipeline.agent = mock_agent

        # Mock replay
        mock_replay = MagicMock(spec=MmapReplayBuffer)
        mock_replay.size = 2000
        mock_replay.count_unresolved.return_value = 0
        sample_return = (
            np.random.randn(batch_size, state_dim).astype(np.float32),  # states
            np.random.randint(0, 10, batch_size).astype(np.int64),  # actions
            np.random.randn(batch_size).astype(np.float32),  # rewards
            np.random.randn(batch_size, state_dim).astype(np.float32),  # next_states
            np.zeros(batch_size, dtype=np.float32),  # dones
            np.ones(batch_size, dtype=np.float32),  # weights
            np.arange(batch_size, dtype=np.int64),  # indices
        )
        mock_replay.sample.return_value = sample_return
        pipeline.replay = mock_replay

        pipeline._train_step()

        mock_replay.sample.assert_called_once_with(batch_size)
        mock_agent.train_step_on_batch.assert_called_once()
        mock_replay.update_priorities.assert_called_once()

        # Verify the indices and td_errors were forwarded
        call_args = mock_replay.update_priorities.call_args
        np.testing.assert_array_equal(call_args[0][0], sample_return[6])
        np.testing.assert_array_equal(call_args[0][1], td_errors)


# ---------------------------------------------------------------------------
# TestRunCrawlerPipeline
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestRunCrawlerPipeline:

    def test_entry_point_function_exists(self):
        """run_crawler_pipeline should be importable and callable."""
        assert callable(run_crawler_pipeline)
        # Verify it's an async function
        assert asyncio.iscoroutinefunction(run_crawler_pipeline)
