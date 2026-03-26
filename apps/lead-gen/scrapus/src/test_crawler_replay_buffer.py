"""Tests for crawler replay buffer: SumTree, ReplayBufferConfig, MmapReplayBuffer."""
from __future__ import annotations

import time
from collections import Counter
from typing import Tuple

import numpy as np
import pytest

from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig, SumTree


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

STATE_DIM = 16  # small dim for fast tests


def _random_transition(
    state_dim: int = STATE_DIM,
    action: int | None = None,
    reward: float | None = None,
    done: bool = False,
) -> Tuple[np.ndarray, int, float, np.ndarray, bool]:
    """Generate a random (state, action, reward, next_state, done) tuple."""
    state = np.random.randn(state_dim).astype(np.float32)
    next_state = np.random.randn(state_dim).astype(np.float32)
    if action is None:
        action = np.random.randint(0, 10)
    if reward is None:
        reward = float(np.random.uniform(-1, 1))
    return state, action, reward, next_state, done


def _make_buffer(tmp_path, capacity=100, **kwargs) -> MmapReplayBuffer:
    """Create a small replay buffer rooted in tmp_path."""
    cfg = ReplayBufferConfig(
        capacity=capacity,
        state_dim=STATE_DIM,
        data_dir=str(tmp_path / "replay"),
        **kwargs,
    )
    return MmapReplayBuffer(cfg)


# ---------------------------------------------------------------------------
# SumTree
# ---------------------------------------------------------------------------

class TestSumTree:

    def test_init_zeros(self):
        tree = SumTree(capacity=8)
        assert tree.total == 0.0
        assert tree.size == 0
        assert tree.write_idx == 0

    def test_add_single(self):
        tree = SumTree(capacity=8)
        leaf_idx = tree.add(1.5)
        assert leaf_idx == 0
        assert tree.size == 1
        assert tree.total == pytest.approx(1.5)

    def test_add_fills_capacity(self):
        cap = 4
        tree = SumTree(capacity=cap)
        # Fill to capacity
        for i in range(cap):
            tree.add(float(i + 1))
        assert tree.size == cap
        assert tree.total == pytest.approx(1.0 + 2.0 + 3.0 + 4.0)

        # Overwrite oldest entry (leaf 0 had priority 1.0)
        tree.add(10.0)
        assert tree.size == cap  # still capped
        assert tree.write_idx == 1  # wrapped around
        # Total: 10 + 2 + 3 + 4 = 19
        assert tree.total == pytest.approx(19.0)

    def test_total_property(self):
        tree = SumTree(capacity=16)
        priorities = [0.5, 1.0, 2.0, 0.3]
        for p in priorities:
            tree.add(p)
        assert tree.total == pytest.approx(sum(priorities))

    def test_max_priority(self):
        tree = SumTree(capacity=8)
        # Empty tree returns 1.0
        assert tree.max_priority() == 1.0

        tree.add(0.5)
        tree.add(3.0)
        tree.add(1.0)
        assert tree.max_priority() == pytest.approx(3.0)

    def test_get_proportional_sampling(self):
        """Verify that sampling distribution roughly matches priorities."""
        tree = SumTree(capacity=4)
        tree.add(1.0)   # leaf 0
        tree.add(3.0)   # leaf 1
        tree.add(1.0)   # leaf 2
        tree.add(5.0)   # leaf 3

        counts = Counter()
        n_samples = 50_000
        total = tree.total  # 10.0
        for _ in range(n_samples):
            cumsum = np.random.uniform(0, total)
            idx, _ = tree.get(cumsum)
            counts[idx] += 1

        # Expected proportions: 0.1, 0.3, 0.1, 0.5
        for idx, expected_frac in [(0, 0.1), (1, 0.3), (2, 0.1), (3, 0.5)]:
            observed_frac = counts[idx] / n_samples
            assert abs(observed_frac - expected_frac) < 0.03, (
                f"Leaf {idx}: expected ~{expected_frac}, got {observed_frac}"
            )

    def test_update_priority(self):
        tree = SumTree(capacity=4)
        tree.add(1.0)  # leaf 0
        tree.add(2.0)  # leaf 1
        assert tree.total == pytest.approx(3.0)

        tree.update(0, 5.0)
        assert tree.total == pytest.approx(7.0)

        # Verify the leaf was updated
        _, prio = tree.get(0.1)  # should hit leaf 0
        assert prio == pytest.approx(5.0)


# ---------------------------------------------------------------------------
# ReplayBufferConfig
# ---------------------------------------------------------------------------

class TestReplayBufferConfig:

    def test_default_values(self):
        cfg = ReplayBufferConfig()
        assert cfg.capacity == 100_000
        assert cfg.state_dim == 784
        assert cfg.alpha == 0.6
        assert cfg.beta_start == 0.4
        assert cfg.beta_end == 1.0
        assert cfg.beta_anneal_steps == 200_000
        assert cfg.priority_epsilon == pytest.approx(1e-6)
        assert cfg.n_step == 5
        assert cfg.gamma == 0.99

    def test_custom_config(self):
        cfg = ReplayBufferConfig(
            capacity=500,
            state_dim=32,
            alpha=0.8,
            beta_start=0.5,
            n_step=3,
            gamma=0.95,
        )
        assert cfg.capacity == 500
        assert cfg.state_dim == 32
        assert cfg.alpha == 0.8
        assert cfg.beta_start == 0.5
        assert cfg.n_step == 3
        assert cfg.gamma == 0.95
        # Unset fields retain defaults
        assert cfg.beta_end == 1.0


# ---------------------------------------------------------------------------
# MmapReplayBuffer
# ---------------------------------------------------------------------------

class TestMmapReplayBuffer:

    @pytest.fixture
    def buf(self, tmp_path):
        b = _make_buffer(tmp_path, capacity=100)
        yield b
        b.close()

    def test_init_creates_files(self, tmp_path):
        buf = _make_buffer(tmp_path, capacity=50)
        data_dir = tmp_path / "replay"
        assert (data_dir / "states.npy").exists()
        assert (data_dir / "next_states.npy").exists()
        assert (data_dir / "replay_meta.db").exists()
        buf.close()

    def test_add_single_transition(self, buf):
        state, action, reward, next_state, done = _random_transition()
        idx = buf.add(state, action, reward, next_state, done)
        assert idx == 0
        assert buf.size == 1

    def test_add_increments_size(self, buf):
        for i in range(10):
            s, a, r, ns, d = _random_transition()
            buf.add(s, a, r, ns, d)
        assert buf.size == 10

    def test_add_circular_overwrite(self, tmp_path):
        cap = 10
        buf = _make_buffer(tmp_path, capacity=cap)

        # Fill beyond capacity
        for i in range(cap + 5):
            s, a, r, ns, d = _random_transition(reward=float(i))
            buf.add(s, a, r, ns, d)

        assert buf.size == cap
        assert buf._write_idx == 5  # wrapped around

        buf.flush()  # commit pending transitions to SQLite
        # The last written entry (index 4) should have reward 14.0
        row = buf._conn.execute(
            "SELECT reward FROM transitions WHERE idx = 4"
        ).fetchone()
        assert row[0] == pytest.approx(14.0)
        buf.close()

    def test_sample_returns_correct_shapes(self, buf):
        batch_size = 8
        for _ in range(20):
            s, a, r, ns, d = _random_transition()
            buf.add(s, a, r, ns, d)

        states, actions, rewards, next_states, dones, weights, indices = buf.sample(
            batch_size
        )
        assert states.shape == (batch_size, STATE_DIM)
        assert actions.shape == (batch_size,)
        assert rewards.shape == (batch_size,)
        assert next_states.shape == (batch_size, STATE_DIM)
        assert dones.shape == (batch_size,)
        assert weights.shape == (batch_size,)
        assert indices.shape == (batch_size,)

    def test_sample_insufficient_data_raises(self, buf):
        s, a, r, ns, d = _random_transition()
        buf.add(s, a, r, ns, d)
        with pytest.raises(ValueError, match="need 64"):
            buf.sample(batch_size=64)

    def test_sample_is_weights_normalized(self, buf):
        """Importance-sampling weights should be normalised so max = 1.0."""
        for _ in range(50):
            s, a, r, ns, d = _random_transition()
            td_err = float(np.random.uniform(0.01, 5.0))
            buf.add(s, a, r, ns, d, td_error=td_err)

        _, _, _, _, _, weights, _ = buf.sample(batch_size=16)
        assert weights.max() == pytest.approx(1.0, abs=1e-5)
        assert (weights > 0).all()
        assert (weights <= 1.0 + 1e-5).all()

    def test_update_priorities(self, buf):
        for _ in range(20):
            s, a, r, ns, d = _random_transition()
            buf.add(s, a, r, ns, d)

        indices = np.array([0, 5, 10], dtype=np.int64)
        td_errors = np.array([0.1, 2.0, 0.5], dtype=np.float64)
        buf.update_priorities(indices, td_errors)

        # Verify priorities were updated in SQLite
        for idx, tde in zip(indices, td_errors):
            row = buf._conn.execute(
                "SELECT priority FROM transitions WHERE idx = ?", (int(idx),)
            ).fetchone()
            expected = (abs(tde) + buf.config.priority_epsilon) ** buf.config.alpha
            assert row[0] == pytest.approx(expected, rel=1e-5)

    def test_pending_rewards_add(self, buf):
        s, a, r, ns, d = _random_transition(reward=0.0)
        buf.add(s, a, r, ns, d, url="https://example.com/page1")
        buf.flush()  # commit pending transitions to SQLite

        row = buf._conn.execute(
            "SELECT url, replay_idx, reward FROM pending_rewards WHERE url = ?",
            ("https://example.com/page1",),
        ).fetchone()
        assert row is not None
        assert row[0] == "https://example.com/page1"
        assert row[1] == 0  # first index
        assert row[2] is None  # unresolved

    def test_resolve_pending_rewards(self, buf):
        s, a, r, ns, d = _random_transition(reward=0.0)
        buf.add(s, a, r, ns, d, url="https://example.com/page1")
        buf.add(*_random_transition(reward=0.0), url="https://example.com/page2")

        results = [
            {"url": "https://example.com/page1", "reward": 0.8},
            {"url": "https://example.com/page2", "reward": -0.3},
            {"url": "https://example.com/missing", "reward": 1.0},  # not in buffer
        ]
        resolved = buf.resolve_pending_rewards(results)
        assert resolved == 2

        # Check reward was patched in transitions table
        row = buf._conn.execute(
            "SELECT reward FROM transitions WHERE idx = 0"
        ).fetchone()
        assert row[0] == pytest.approx(0.8)

        # Check pending_rewards updated
        row = buf._conn.execute(
            "SELECT reward, resolved_at FROM pending_rewards WHERE url = ?",
            ("https://example.com/page1",),
        ).fetchone()
        assert row[0] == pytest.approx(0.8)
        assert row[1] is not None

    def test_count_unresolved(self, buf):
        assert buf.count_unresolved() == 0

        buf.add(*_random_transition(reward=0.0), url="https://a.com/1")
        buf.add(*_random_transition(reward=0.0), url="https://a.com/2")
        buf.add(*_random_transition(reward=0.0), url="https://a.com/3")
        assert buf.count_unresolved() == 3

        buf.resolve_pending_rewards([{"url": "https://a.com/1", "reward": 1.0}])
        assert buf.count_unresolved() == 2

    def test_prune_old_pending(self, buf):
        s, a, r, ns, d = _random_transition(reward=0.0)
        buf.add(s, a, r, ns, d, url="https://old.com/1")
        buf.flush()  # commit pending transitions to SQLite

        # Backdate the crawled_at to simulate an old entry
        very_old = time.time() - 30 * 86400  # 30 days ago
        buf._conn.execute(
            "UPDATE pending_rewards SET crawled_at = ? WHERE url = ?",
            (very_old, "https://old.com/1"),
        )
        buf._conn.commit()

        # Add a fresh entry
        buf.add(*_random_transition(reward=0.0), url="https://fresh.com/1")

        pruned = buf.prune_old_pending(max_age_seconds=7 * 86400)
        assert pruned == 1

        # Fresh one should remain
        assert buf.count_unresolved() == 1

    def test_compute_nstep_targets(self, tmp_path):
        """Basic n-step return computation with a trivial bootstrap function."""
        cap = 20
        buf = _make_buffer(tmp_path, capacity=cap, n_step=3, gamma=0.99)

        # Add transitions with known rewards
        rewards = [1.0, 2.0, 3.0, 4.0, 5.0]
        for i, r in enumerate(rewards):
            s = np.zeros(STATE_DIM, dtype=np.float32)
            ns = np.zeros(STATE_DIM, dtype=np.float32)
            buf.add(s, 0, r, ns, done=False)

        # Bootstrap function always returns 0.0
        def zero_bootstrap(states):
            return np.zeros(states.shape[0])

        indices = np.array([0], dtype=np.int64)
        targets = buf.compute_nstep_targets(indices, zero_bootstrap)

        # n=3, starting at idx 0: r0 + gamma*r1 + gamma^2*r2 + gamma^3*Q
        # = 1.0 + 0.99*2.0 + 0.99^2*3.0 = 1.0 + 1.98 + 2.9403 = 5.9203
        expected = 1.0 + 0.99 * 2.0 + (0.99 ** 2) * 3.0
        assert targets[0] == pytest.approx(expected, rel=1e-3)
        buf.close()

    def test_flush_and_close(self, tmp_path):
        buf = _make_buffer(tmp_path, capacity=50)
        for _ in range(10):
            buf.add(*_random_transition())

        buf.flush()
        buf.close()
        assert buf._conn is None
        assert buf._states_mmap is None
        assert buf._next_states_mmap is None

    def test_buffer_stats_format(self, buf):
        for _ in range(5):
            buf.add(*_random_transition())

        stats = buf.get_buffer_stats()
        assert stats["size"] == 5
        assert stats["capacity"] == 100
        assert "write_idx" in stats
        assert "beta" in stats
        assert "sum_tree_total" in stats
        assert "max_priority" in stats
        assert "unresolved_rewards" in stats
        assert "disk_mb" in stats
        assert isinstance(stats["disk_mb"], float)

    def test_resume_from_checkpoint(self, tmp_path):
        """Close buffer, reopen with same data_dir, verify state is restored."""
        buf = _make_buffer(tmp_path, capacity=50)
        for i in range(25):
            s, a, r, ns, d = _random_transition(reward=float(i))
            buf.add(s, a, r, ns, d)
        buf.flush()

        saved_size = buf.size
        saved_write_idx = buf._write_idx
        buf.close()

        # Re-open
        buf2 = _make_buffer(tmp_path, capacity=50)
        assert buf2.size == saved_size
        assert buf2._write_idx == saved_write_idx

        # Verify sum tree was rebuilt
        assert buf2.sum_tree.total > 0
        assert buf2.sum_tree.size == saved_size

        # Verify we can still sample
        states, actions, rewards, next_states, dones, weights, indices = buf2.sample(
            batch_size=8
        )
        assert states.shape == (8, STATE_DIM)
        buf2.close()

    def test_beta_annealing(self, tmp_path):
        """Beta should increase from beta_start toward beta_end over samples."""
        buf = _make_buffer(
            tmp_path,
            capacity=200,
            beta_start=0.4,
            beta_end=1.0,
            beta_anneal_steps=100,
        )
        for _ in range(100):
            buf.add(*_random_transition())

        beta_before = buf._beta
        assert beta_before == pytest.approx(0.4)  # no sampling yet

        buf.sample(batch_size=10)
        beta_after_one = buf._beta
        assert beta_after_one > beta_before

        # Sample many more times to push beta higher
        for _ in range(50):
            buf.sample(batch_size=10)
        beta_after_many = buf._beta

        assert beta_after_many > beta_after_one
        assert beta_after_many <= 1.0
        buf.close()

    def test_per_sampling_distribution(self, tmp_path):
        """Items with high priority should be sampled more often than low ones."""
        cap = 20
        buf = _make_buffer(tmp_path, capacity=cap)

        # Add 20 transitions: the first 10 with low td_error, last 10 with high
        for i in range(cap):
            s, a, r, ns, d = _random_transition()
            td_err = 0.01 if i < 10 else 10.0
            buf.add(s, a, r, ns, d, td_error=td_err)

        sample_counts = Counter()
        n_rounds = 500
        batch_size = 10
        for _ in range(n_rounds):
            _, _, _, _, _, _, indices = buf.sample(batch_size=batch_size)
            for idx in indices:
                sample_counts[int(idx)] += 1

        # High-priority indices (10-19) should collectively appear more than
        # low-priority indices (0-9)
        low_total = sum(sample_counts.get(i, 0) for i in range(10))
        high_total = sum(sample_counts.get(i, 0) for i in range(10, 20))
        assert high_total > low_total * 2, (
            f"High-priority items ({high_total}) should dominate "
            f"low-priority items ({low_total})"
        )
        buf.close()
