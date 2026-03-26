"""Tests for crawler_dqn module: DQN agent, ONNX inference, utilities."""
from __future__ import annotations

import math
import os

import numpy as np
import pytest

from crawler_dqn import (
    DQNConfig,
    EpsilonScheduler,
    canonicalize_url,
    check_episode_done,
    compute_nstep_return,
    relabel_trajectory_hindsight,
)


# ---------------------------------------------------------------------------
# DQNConfig
# ---------------------------------------------------------------------------

class TestDQNConfig:

    def test_default_values(self):
        cfg = DQNConfig()
        assert cfg.state_dim == 784
        assert cfg.action_dim == 10
        assert cfg.hidden_1 == 512
        assert cfg.hidden_2 == 256
        assert cfg.lr == 3e-4
        assert cfg.gamma == 0.99
        assert cfg.batch_size == 64
        assert cfg.replay_capacity == 100_000
        assert cfg.epsilon_start == 1.0
        assert cfg.epsilon_end == 0.01
        assert cfg.epsilon_decay_steps == 100_000
        assert cfg.n_step == 5
        assert cfg.target_update_freq == 1_000
        assert cfg.use_mps is True

    def test_custom_config(self):
        cfg = DQNConfig(
            state_dim=128,
            action_dim=5,
            hidden_1=64,
            hidden_2=32,
            lr=1e-3,
            gamma=0.95,
            batch_size=32,
            epsilon_start=0.5,
            epsilon_end=0.05,
            epsilon_decay_steps=50_000,
            n_step=3,
            target_update_freq=500,
            use_mps=False,
        )
        assert cfg.state_dim == 128
        assert cfg.action_dim == 5
        assert cfg.hidden_1 == 64
        assert cfg.hidden_2 == 32
        assert cfg.lr == 1e-3
        assert cfg.gamma == 0.95
        assert cfg.batch_size == 32
        assert cfg.epsilon_start == 0.5
        assert cfg.epsilon_end == 0.05
        assert cfg.epsilon_decay_steps == 50_000
        assert cfg.n_step == 3
        assert cfg.target_update_freq == 500
        assert cfg.use_mps is False


# ---------------------------------------------------------------------------
# EpsilonScheduler
# ---------------------------------------------------------------------------

class TestEpsilonScheduler:

    def test_initial_epsilon(self):
        sched = EpsilonScheduler(start=1.0, end=0.01, decay_steps=100_000)
        assert sched.get_epsilon(0) == pytest.approx(1.0)

    def test_final_epsilon(self):
        sched = EpsilonScheduler(start=1.0, end=0.01, decay_steps=100_000)
        assert sched.get_epsilon(100_000) == pytest.approx(0.01)

    def test_mid_decay(self):
        sched = EpsilonScheduler(start=1.0, end=0.0, decay_steps=100)
        # At step 50, linearly should be 0.5
        assert sched.get_epsilon(50) == pytest.approx(0.5)

    def test_beyond_decay_steps(self):
        sched = EpsilonScheduler(start=1.0, end=0.01, decay_steps=100_000)
        # Past decay_steps, epsilon should clamp at end
        assert sched.get_epsilon(200_000) == pytest.approx(0.01)
        assert sched.get_epsilon(999_999) == pytest.approx(0.01)


# ---------------------------------------------------------------------------
# DQNNetwork (PyTorch)
# ---------------------------------------------------------------------------

class TestDQNNetwork:

    @pytest.fixture(autouse=True)
    def _require_torch(self):
        self.torch = pytest.importorskip("torch")
        from crawler_dqn import DQNNetwork
        self.DQNNetwork = DQNNetwork

    @pytest.fixture
    def small_config(self):
        return DQNConfig(state_dim=16, action_dim=4, hidden_1=32, hidden_2=16)

    def test_output_shape(self, small_config):
        net = self.DQNNetwork(small_config)
        batch = self.torch.randn(8, small_config.state_dim)
        out = net(batch)
        assert out.shape == (8, small_config.action_dim)

    def test_forward_deterministic(self, small_config):
        net = self.DQNNetwork(small_config)
        net.eval()
        x = self.torch.randn(4, small_config.state_dim)
        y1 = net(x)
        y2 = net(x)
        assert self.torch.allclose(y1, y2)

    def test_gradient_flow(self, small_config):
        net = self.DQNNetwork(small_config)
        x = self.torch.randn(4, small_config.state_dim)
        out = net(x)
        loss = out.sum()
        loss.backward()  # should not raise
        # Verify gradients were actually computed
        for param in net.parameters():
            assert param.grad is not None


# ---------------------------------------------------------------------------
# ONNXInferenceEngine
# ---------------------------------------------------------------------------

class TestONNXInferenceEngine:

    @pytest.fixture(autouse=True)
    def _require_deps(self):
        self.torch = pytest.importorskip("torch")
        pytest.importorskip("onnxruntime")
        from crawler_dqn import DQNNetwork, ONNXInferenceEngine
        self.DQNNetwork = DQNNetwork
        self.ONNXInferenceEngine = ONNXInferenceEngine

    @pytest.fixture
    def small_config(self):
        return DQNConfig(state_dim=16, action_dim=4, hidden_1=32, hidden_2=16)

    @pytest.fixture
    def onnx_model(self, small_config, tmp_path):
        """Export a small ONNX model for testing."""
        net = self.DQNNetwork(small_config)
        net.eval()
        onnx_path = str(tmp_path / "test_policy.onnx")
        dummy = self.torch.randn(1, small_config.state_dim)
        self.torch.onnx.export(
            net,
            dummy,
            onnx_path,
            input_names=["state"],
            output_names=["q_values"],
            dynamic_axes={"state": {0: "batch"}, "q_values": {0: "batch"}},
            opset_version=14,
        )
        return onnx_path

    def test_predict_q_values_shape(self, small_config, onnx_model):
        engine = self.ONNXInferenceEngine(onnx_model)
        state = np.random.randn(small_config.state_dim).astype(np.float32)
        q_values = engine.predict_q_values(state)
        assert q_values.shape == (small_config.action_dim,)

    def test_select_action_range(self, small_config, onnx_model):
        engine = self.ONNXInferenceEngine(onnx_model)
        state = np.random.randn(small_config.state_dim).astype(np.float32)
        num_links = 3
        action = engine.select_action(state, num_links)
        assert 0 <= action < num_links

    def test_batch_prediction(self, small_config, onnx_model):
        engine = self.ONNXInferenceEngine(onnx_model)
        batch = np.random.randn(5, small_config.state_dim).astype(np.float32)
        q_values = engine.predict_q_values(batch)
        assert q_values.shape == (5, small_config.action_dim)


# ---------------------------------------------------------------------------
# DoubleDQNAgent
# ---------------------------------------------------------------------------

class TestDoubleDQNAgent:

    @pytest.fixture(autouse=True)
    def _require_torch(self):
        self.torch = pytest.importorskip("torch")
        from crawler_dqn import DoubleDQNAgent
        self.DoubleDQNAgent = DoubleDQNAgent

    @pytest.fixture
    def small_config(self):
        return DQNConfig(
            state_dim=16,
            action_dim=4,
            hidden_1=32,
            hidden_2=16,
            lr=1e-3,
            target_update_freq=10,
            use_mps=False,
        )

    @pytest.fixture
    def agent(self, small_config):
        return self.DoubleDQNAgent(small_config)

    def _random_batch(self, config, batch_size=8):
        """Generate a random batch of transitions."""
        states = np.random.randn(batch_size, config.state_dim).astype(np.float32)
        actions = np.random.randint(0, config.action_dim, size=batch_size)
        rewards = np.random.randn(batch_size).astype(np.float32)
        next_states = np.random.randn(batch_size, config.state_dim).astype(np.float32)
        dones = np.zeros(batch_size, dtype=np.float32)
        return states, actions, rewards, next_states, dones

    def test_initialization(self, agent, small_config):
        assert agent.update_counter == 0
        assert agent.train_step == 0
        assert agent.config.state_dim == small_config.state_dim
        assert agent.config.action_dim == small_config.action_dim

    def test_select_action_returns_valid_action(self, agent, small_config):
        state = np.random.randn(small_config.state_dim).astype(np.float32)
        num_links = 3
        action, epsilon = agent.select_action(state, num_links, global_step=0)
        assert 0 <= action < num_links
        assert 0.0 <= epsilon <= 1.0

    def test_select_action_epsilon_greedy(self, agent, small_config):
        """At epsilon=1.0 (step 0), actions should be uniformly random."""
        state = np.random.randn(small_config.state_dim).astype(np.float32)
        num_links = small_config.action_dim
        actions = [
            agent.select_action(state, num_links, global_step=0)[0]
            for _ in range(500)
        ]
        unique_actions = set(actions)
        # With 500 samples and epsilon=1.0, we expect all actions to appear
        assert len(unique_actions) > 1, "Expected random exploration at epsilon=1.0"

    def test_compute_td_loss_shape(self, agent, small_config):
        batch_size = 8
        dev = agent.device
        states = self.torch.randn(batch_size, small_config.state_dim, device=dev)
        actions = self.torch.randint(0, small_config.action_dim, (batch_size,), device=dev)
        rewards = self.torch.randn(batch_size, device=dev)
        next_states = self.torch.randn(batch_size, small_config.state_dim, device=dev)
        dones = self.torch.zeros(batch_size, device=dev)

        loss, td_errors = agent.compute_td_loss(
            states, actions, rewards, next_states, dones
        )
        assert loss.shape == ()  # scalar
        assert td_errors.shape == (batch_size,)

    def test_train_step_on_batch_reduces_loss(self, agent, small_config):
        """Training on the same batch multiple times should reduce loss."""
        batch = self._random_batch(small_config, batch_size=32)
        initial_loss, _, _ = agent.train_step_on_batch(*batch)

        # Train several more times on the same batch
        for _ in range(50):
            loss, _, _ = agent.train_step_on_batch(*batch)

        assert loss < initial_loss, (
            f"Loss did not decrease: {initial_loss:.4f} -> {loss:.4f}"
        )

    def test_target_network_update(self, agent, small_config):
        """After target_update_freq steps, target should match online."""
        batch = self._random_batch(small_config)

        # Run exactly target_update_freq train steps
        for _ in range(small_config.target_update_freq):
            agent.train_step_on_batch(*batch)

        # After the update, target and online networks should have same weights
        for p_online, p_target in zip(
            agent.q_network.parameters(), agent.target_network.parameters()
        ):
            assert self.torch.allclose(p_online, p_target), (
                "Target network should match online after update"
            )

    def test_save_load_checkpoint(self, agent, small_config, tmp_path):
        batch = self._random_batch(small_config)
        # Do some training
        for _ in range(5):
            agent.train_step_on_batch(*batch)

        path = str(tmp_path / "checkpoint.pt")
        agent.save_checkpoint(path)
        assert os.path.exists(path)

        # Create a fresh agent and load
        new_agent = self.DoubleDQNAgent(small_config)
        new_agent.load_checkpoint(path)

        assert new_agent.update_counter == agent.update_counter
        assert new_agent.train_step == agent.train_step

    def test_save_load_policy_snapshot(self, agent, small_config, tmp_path):
        path = str(tmp_path / "policy.pt")
        agent.save_policy_snapshot(path)
        assert os.path.exists(path)

        new_agent = self.DoubleDQNAgent(small_config)
        new_agent.load_policy_snapshot(path)

        # Weights should match
        state = self.torch.randn(1, small_config.state_dim)
        agent.q_network.eval()
        new_agent.q_network.eval()
        with self.torch.no_grad():
            q1 = agent.q_network(state)
            q2 = new_agent.q_network(state)
        assert self.torch.allclose(q1, q2)

    def test_export_onnx(self, agent, small_config, tmp_path):
        onnx_path = str(tmp_path / "policy.onnx")
        result_path = agent.export_onnx(onnx_path=onnx_path, quantize_int8=False)
        assert os.path.exists(result_path)
        assert result_path == onnx_path

    def test_convergence_metrics(self, agent, small_config):
        batch = self._random_batch(small_config)
        for _ in range(10):
            agent.train_step_on_batch(*batch)

        metrics = agent.get_convergence_metrics(recent_rewards=[0.5, 1.0, 0.2])
        assert "train_step" in metrics
        assert "mean_loss" in metrics
        assert "mean_q" in metrics
        assert "epsilon" in metrics
        assert "mean_reward" in metrics
        assert metrics["train_step"] == 10.0
        assert metrics["mean_loss"] > 0.0

    def test_release(self, agent):
        agent.release()
        assert not hasattr(agent, "q_network")
        assert not hasattr(agent, "target_network")
        assert not hasattr(agent, "optimizer")


# ---------------------------------------------------------------------------
# N-Step Return
# ---------------------------------------------------------------------------

class TestNStepReturn:

    def test_compute_nstep_return_basic(self):
        # n=3, gamma=1.0, no bootstrap -> just sum of rewards
        result = compute_nstep_return(
            rewards=[1.0, 1.0, 1.0], gamma=1.0, n=3, bootstrap_q=0.0
        )
        assert result == pytest.approx(3.0)

    def test_compute_nstep_return_with_bootstrap(self):
        # n=2, gamma=0.99, bootstrap_q=10.0
        # total = 1.0 + 0.99*1.0 + 0.99^2 * 10.0
        expected = 1.0 + 0.99 * 1.0 + (0.99 ** 2) * 10.0
        result = compute_nstep_return(
            rewards=[1.0, 1.0], gamma=0.99, n=2, bootstrap_q=10.0
        )
        assert result == pytest.approx(expected)

    def test_zero_rewards(self):
        # All zero rewards, bootstrap = 5.0, gamma = 0.99, n = 3
        # total = 0 + 0 + 0 + 0.99^3 * 5.0
        expected = (0.99 ** 3) * 5.0
        result = compute_nstep_return(
            rewards=[0.0, 0.0, 0.0], gamma=0.99, n=3, bootstrap_q=5.0
        )
        assert result == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Hindsight Relabeling
# ---------------------------------------------------------------------------

class TestHindsightRelabeling:

    def test_relabel_trajectory_hindsight(self):
        trajectory = [
            {"reward": 0.0},
            {"reward": 0.0},
            {"reward": 0.0},
        ]
        relabeled = relabel_trajectory_hindsight(
            trajectory, final_reward=1.0, gamma=0.99, scale=0.1
        )
        # Earlier steps get smaller bonus (more discounting)
        assert relabeled[0]["reward"] < relabeled[1]["reward"]
        assert relabeled[1]["reward"] < relabeled[2]["reward"]
        # Last step bonus = 1.0 * 0.99^0 * 0.1 = 0.1
        assert relabeled[2]["reward"] == pytest.approx(0.1)

    def test_empty_trajectory(self):
        result = relabel_trajectory_hindsight([], final_reward=1.0)
        assert result == []

    def test_scale_factor(self):
        trajectory = [{"reward": 0.0}]
        relabeled = relabel_trajectory_hindsight(
            trajectory, final_reward=1.0, gamma=1.0, scale=0.5
        )
        # Single step, steps_to_end = 0: bonus = 1.0 * 1.0^0 * 0.5 = 0.5
        assert relabeled[0]["reward"] == pytest.approx(0.5)


# ---------------------------------------------------------------------------
# URL Canonicalisation
# ---------------------------------------------------------------------------

class TestCanonicalizeUrl:

    def test_lowercase_scheme_host(self):
        result = canonicalize_url("HTTPS://Example.COM/Page")
        assert result.startswith("https://example.com/")

    def test_strip_fragment(self):
        result = canonicalize_url("https://example.com/page#section")
        assert "#" not in result

    def test_sort_query_params(self):
        result = canonicalize_url("https://example.com/page?z=1&a=2")
        assert "a=2" in result
        assert "z=1" in result
        # 'a' should come before 'z'
        assert result.index("a=2") < result.index("z=1")

    def test_strip_trailing_slash(self):
        result = canonicalize_url("https://example.com/page/")
        assert not result.endswith("/page/")
        assert result.endswith("/page")
        # Root should keep its slash
        root = canonicalize_url("https://example.com/")
        assert root.endswith("/")


# ---------------------------------------------------------------------------
# Episode Termination
# ---------------------------------------------------------------------------

class TestCheckEpisodeDone:

    def test_frontier_exhausted(self):
        assert check_episode_done(
            domain_frontier_empty=True, depth=1, pages_crawled=10
        ) is True

    def test_max_depth(self):
        assert check_episode_done(
            domain_frontier_empty=False, depth=6, pages_crawled=10, max_depth=5
        ) is True

    def test_max_pages(self):
        assert check_episode_done(
            domain_frontier_empty=False, depth=1, pages_crawled=500, max_pages=500
        ) is True

    def test_not_done(self):
        assert check_episode_done(
            domain_frontier_empty=False, depth=2, pages_crawled=50
        ) is False
