"""
ARB (Adaptive Replay Buffer) with on-policyness-weighted experience replay.

Implements the ARB technique from Song, Lee & Park (arXiv 2512.10510, Dec 2025)
adapted for discrete-action DQN via Boltzmann policy approximation.

Wraps the existing MmapReplayBuffer (composition) and augments PER sampling
with on-policyness weights that measure how aligned each stored transition
is with the agent's current policy. Stale off-distribution transitions are
naturally deprioritised without additional parameters or training.

Key design decisions:
- Boltzmann softmax over Q-values replaces the Gaussian policy assumption
  from the original paper (continuous -> discrete action space adaptation).
- Combined priority = |TD_error|^alpha_per * on_policyness^alpha_arb
  (multiplicative, preserving PER's "learn from surprises" signal).
- Periodic refresh (every N steps) amortises the cost of recomputing
  on-policyness across the full buffer.
- Memory overhead: ~0.8 MB for 100K float64 on-policyness scores.

Target: Apple M1 16GB, zero cloud dependency.
"""

import collections
import logging
import math
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import numpy as np

from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig

logger = logging.getLogger("crawler_arb_replay")

# ---------------------------------------------------------------------------
# Try importing torch; gate features behind availability
# ---------------------------------------------------------------------------
_HAS_TORCH = False

try:
    import torch
    import torch.nn.functional as F

    _HAS_TORCH = True
except ImportError:
    logger.warning("PyTorch not installed -- ARB torch features disabled")


# ======================= Configuration ======================================


@dataclass
class ARBConfig:
    """Configuration for Adaptive Replay Buffer on-policyness weighting.

    Combines PER (Schaul et al. 2015) priorities with ARB (Song et al. 2025)
    on-policyness weights via multiplicative combination.
    """

    # PER priority exponent (existing, passed through)
    alpha_per: float = 0.6

    # ARB on-policyness weight exponent
    # Controls how aggressively on-policy data is prioritised.
    # 0.0 = ignore on-policyness (pure PER), 1.0 = full weight.
    alpha_arb: float = 0.3

    # Importance-sampling weight annealing (shared with PER)
    beta_start: float = 0.4
    beta_end: float = 1.0
    beta_frames: int = 200_000

    # On-policyness clipping bounds (prevent degenerate weights)
    clip_min: float = 0.01
    clip_max: float = 10.0

    # Trajectory-level geometric mean weighting
    trajectory_weight: bool = True
    trajectory_window: int = 10

    # Recompute on-policyness every N agent steps
    refresh_interval: int = 1000

    # Temperature for Boltzmann policy approximation from Q-values.
    # Lower = more peaked (closer to greedy), higher = more uniform.
    # Paper uses lambda in [0.5, 5.0]; 1.0 is a balanced default for DQN.
    boltzmann_temperature: float = 1.0


# ======================= On-Policyness Estimator ============================


class OnPolicynessEstimator:
    """Estimates how 'on-policy' a stored transition is relative to current policy.

    For discrete-action DQN, uses Boltzmann (softmax) policy approximation:

        pi_theta(a|s) = exp(Q(s,a) / tau) / sum_a'(exp(Q(s,a') / tau))

    The on-policyness of a stored (s, a) pair is pi_theta(a|s), i.e. the
    probability the current policy would choose action a in state s.

    Clipping prevents zero-weight dead transitions and overflow from
    extremely peaked Q-value distributions.
    """

    def __init__(self, config: ARBConfig) -> None:
        self.config = config
        self.tau = config.boltzmann_temperature
        self.clip_min = config.clip_min
        self.clip_max = config.clip_max

    def compute_on_policyness(
        self,
        state: np.ndarray,
        action: int,
        q_values: np.ndarray,
    ) -> float:
        """Compute on-policyness for a single transition.

        Args:
            state: (state_dim,) -- unused, included for API consistency.
            action: integer action that was taken.
            q_values: (action_dim,) Q-values for the state from current policy.

        Returns:
            Clipped on-policyness score O_tilde(s, a).
        """
        # Boltzmann policy: softmax(Q / tau)
        q_scaled = q_values / self.tau
        # Numerical stability: subtract max before exp
        q_scaled = q_scaled - np.max(q_scaled)
        exp_q = np.exp(q_scaled)
        probs = exp_q / np.sum(exp_q)

        on_policy = float(probs[action])
        return max(self.clip_min, min(on_policy, self.clip_max))

    def compute_batch(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        q_network: Any,
    ) -> np.ndarray:
        """Compute on-policyness for a batch of transitions.

        Supports both PyTorch nn.Module and ONNX inference callables.
        Pure numpy post-processing for softmax and clipping.

        Args:
            states: (B, state_dim) float32.
            actions: (B,) integer actions.
            q_network: callable or nn.Module that maps states -> Q-values.

        Returns:
            (B,) clipped on-policyness scores.
        """
        # Get Q-values from the network
        q_values = self._get_q_values(states, q_network)

        # Boltzmann softmax in numpy (batched)
        q_scaled = q_values / self.tau  # (B, action_dim)
        # Numerical stability: per-row max subtraction
        q_scaled = q_scaled - np.max(q_scaled, axis=1, keepdims=True)
        exp_q = np.exp(q_scaled)
        probs = exp_q / np.sum(exp_q, axis=1, keepdims=True)  # (B, action_dim)

        # Gather pi_theta(stored_action | state) for each transition
        batch_size = len(actions)
        on_policyness = probs[np.arange(batch_size), actions.astype(np.intp)]

        # Clip to prevent degenerate weights
        on_policyness = np.clip(on_policyness, self.clip_min, self.clip_max)

        return on_policyness.astype(np.float64)

    def _get_q_values(
        self,
        states: np.ndarray,
        q_network: Any,
    ) -> np.ndarray:
        """Extract Q-values from a network, handling torch and ONNX backends.

        Returns:
            (B, action_dim) float64 numpy array of Q-values.
        """
        if _HAS_TORCH and isinstance(q_network, torch.nn.Module):
            device = next(q_network.parameters()).device
            states_t = torch.as_tensor(states, dtype=torch.float32, device=device)
            with torch.no_grad():
                q_values = q_network(states_t).cpu().numpy()
        elif hasattr(q_network, "predict_q_values"):
            # ONNXInferenceEngine path
            q_values = q_network.predict_q_values(states)
        elif callable(q_network):
            # Generic callable fallback
            q_values = q_network(states)
            if _HAS_TORCH and isinstance(q_values, torch.Tensor):
                q_values = q_values.detach().cpu().numpy()
        else:
            raise TypeError(
                f"q_network must be a torch.nn.Module, ONNXInferenceEngine, "
                f"or callable, got {type(q_network)}"
            )

        return np.asarray(q_values, dtype=np.float64)


# ======================= Trajectory Weighter ================================


class TrajectoryWeighter:
    """Computes trajectory-level on-policyness as geometric mean.

    The paper (Equation 4) shows that trajectory-level aggregation reduces
    sampling variance compared to per-transition weighting. For web crawling,
    where episodes have variable length, we use a fixed sliding window.

    weight = (prod(O_tilde_i for i in window))^(1/window)
           = exp(mean(log(O_tilde_i) for i in window))

    Maintains per-trajectory sliding windows of on-policyness scores,
    keyed by trajectory_id (e.g. domain name for web crawling).
    """

    def __init__(self, config: ARBConfig) -> None:
        self.config = config
        self.window_size = config.trajectory_window
        # trajectory_id -> deque of recent on-policyness scores
        self._windows: Dict[str, collections.deque] = {}

    def compute_trajectory_weight(
        self,
        transition_weights: List[float],
    ) -> float:
        """Compute geometric mean of a list of on-policyness weights.

        Args:
            transition_weights: list of per-transition O_tilde values.
                Must be positive (enforced by OnPolicynessEstimator clipping).

        Returns:
            Geometric mean weight. Returns 1.0 for empty input.
        """
        if not transition_weights:
            return 1.0

        window = transition_weights[-self.window_size :]
        # Geometric mean via log-space arithmetic (numerically stable)
        log_weights = np.log(np.array(window, dtype=np.float64))
        return float(np.exp(np.mean(log_weights)))

    def update_and_get_weight(
        self,
        trajectory_id: str,
        on_policyness: float,
    ) -> float:
        """Add a new on-policyness score to a trajectory and return the
        current geometric mean weight.

        Args:
            trajectory_id: identifier for the trajectory (e.g. domain).
            on_policyness: the O_tilde score for the latest transition.

        Returns:
            Trajectory-level geometric mean weight.
        """
        if trajectory_id not in self._windows:
            self._windows[trajectory_id] = collections.deque(
                maxlen=self.window_size
            )
        self._windows[trajectory_id].append(on_policyness)

        return self.compute_trajectory_weight(
            list(self._windows[trajectory_id])
        )

    def get_weight(self, trajectory_id: str) -> float:
        """Return current trajectory weight without adding a new score."""
        if trajectory_id not in self._windows:
            return 1.0
        return self.compute_trajectory_weight(
            list(self._windows[trajectory_id])
        )

    def clear(self) -> None:
        """Reset all trajectory windows."""
        self._windows.clear()

    @property
    def num_trajectories(self) -> int:
        return len(self._windows)


# ======================= ARB Priority Calculator ============================


class ARBPriorityCalculator:
    """Combines PER TD-error priorities with ARB on-policyness weights.

    Combined priority (multiplicative):
        priority = |TD_error|^alpha_per * on_policyness^alpha_arb

    This preserves PER's "learn from surprises" signal while adding
    ARB's "filter stale off-distribution data" signal.

    Importance-sampling weight correction:
        w_i = (N * P(i))^(-beta) / max_j(w_j)

    where P(i) is the normalised combined priority and beta anneals
    from beta_start to beta_end over beta_frames steps.
    """

    def __init__(self, config: ARBConfig) -> None:
        self.config = config
        self.alpha_per = config.alpha_per
        self.alpha_arb = config.alpha_arb
        self._priority_epsilon = 1e-6

    def compute_priority(
        self,
        td_error: float,
        on_policyness: float,
    ) -> float:
        """Compute combined PER + ARB priority for a single transition.

        Args:
            td_error: absolute TD error (or raw; abs is taken).
            on_policyness: O_tilde(s, a) score, already clipped.

        Returns:
            Combined priority value.
        """
        per_component = (abs(td_error) + self._priority_epsilon) ** self.alpha_per
        arb_component = on_policyness ** self.alpha_arb
        return per_component * arb_component

    def compute_priority_batch(
        self,
        td_errors: np.ndarray,
        on_policyness: np.ndarray,
    ) -> np.ndarray:
        """Compute combined priorities for a batch.

        Args:
            td_errors: (B,) absolute TD errors.
            on_policyness: (B,) clipped O_tilde scores.

        Returns:
            (B,) combined priority values.
        """
        per_component = (np.abs(td_errors) + self._priority_epsilon) ** self.alpha_per
        arb_component = on_policyness ** self.alpha_arb
        return per_component * arb_component

    def compute_importance_weight(
        self,
        priority: float,
        total_priority: float,
        buffer_size: int,
        beta: float,
    ) -> float:
        """Compute importance-sampling correction weight for a single sample.

        Args:
            priority: the combined priority of this transition.
            total_priority: sum of all priorities in the buffer.
            buffer_size: number of transitions in the buffer.
            beta: current IS correction exponent (annealed).

        Returns:
            Unnormalised IS weight. Caller should divide by max weight.
        """
        if total_priority <= 0 or priority <= 0:
            return 1.0
        prob = priority / total_priority
        return (buffer_size * prob) ** (-beta)

    def compute_importance_weights_batch(
        self,
        priorities: np.ndarray,
        total_priority: float,
        buffer_size: int,
        beta: float,
    ) -> np.ndarray:
        """Compute normalised IS weights for a batch.

        Args:
            priorities: (B,) combined priorities.
            total_priority: sum of all priorities.
            buffer_size: current buffer size.
            beta: IS correction exponent.

        Returns:
            (B,) normalised IS weights (max weight = 1.0).
        """
        probs = priorities / max(total_priority, 1e-12)
        weights = (buffer_size * probs) ** (-beta)
        # Normalise by max weight to keep gradients stable
        max_weight = np.max(weights)
        if max_weight > 0:
            weights /= max_weight
        return weights.astype(np.float32)


# ======================= ARB Replay Buffer ==================================


class ARBReplayBuffer:
    """Adaptive Replay Buffer wrapping MmapReplayBuffer with on-policyness.

    Composition pattern: wraps the existing MmapReplayBuffer and augments
    its PER sampling with ARB on-policyness weights. All storage, mmap,
    and SQLite operations delegate to the inner buffer.

    Usage:
        inner = MmapReplayBuffer(config)
        arb = ARBReplayBuffer(inner, arb_config)

        # Add transitions (delegates to inner buffer)
        arb.add(state, action, reward, next_state, done)

        # Sample with ARB weighting (requires Q-network for on-policyness)
        batch = arb.sample(batch_size=64, q_network=agent.q_network)

        # Update priorities after training step
        arb.update_priorities(indices, td_errors, q_network=agent.q_network)

        # Periodic refresh (call every refresh_interval steps)
        arb.refresh_on_policyness(q_network=agent.q_network)
    """

    def __init__(
        self,
        buffer: MmapReplayBuffer,
        config: Optional[ARBConfig] = None,
    ) -> None:
        self.buffer = buffer
        self.config = config or ARBConfig()

        # Sub-components
        self.estimator = OnPolicynessEstimator(self.config)
        self.trajectory_weighter = TrajectoryWeighter(self.config)
        self.priority_calculator = ARBPriorityCalculator(self.config)

        # On-policyness scores array (parallel to buffer indices)
        # Default 1.0 = neutral weight (equivalent to pure PER).
        capacity = self.buffer.config.capacity
        self._on_policyness = np.ones(capacity, dtype=np.float64)

        # Beta annealing state (ARB uses its own beta schedule)
        self._beta = self.config.beta_start
        self._beta_step = 0

        # Refresh tracking
        self._steps_since_refresh = 0
        self._total_refreshes = 0
        self._last_refresh_time = 0.0
        self._last_refresh_duration = 0.0

        # Diagnostics accumulators
        self._sample_count = 0
        self._fallback_count = 0

        logger.info(
            "ARBReplayBuffer initialised: alpha_per=%.2f, alpha_arb=%.2f, "
            "tau=%.2f, refresh_interval=%d, trajectory=%s (window=%d)",
            self.config.alpha_per,
            self.config.alpha_arb,
            self.config.boltzmann_temperature,
            self.config.refresh_interval,
            self.config.trajectory_weight,
            self.config.trajectory_window,
        )

    # ---- Properties (delegate to inner buffer) -----------------------------

    @property
    def size(self) -> int:
        return self.buffer.size

    @property
    def beta(self) -> float:
        return self._beta

    def __len__(self) -> int:
        return len(self.buffer)

    # ---- Add transitions (delegate to inner buffer) ------------------------

    def add(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
        td_error: Optional[float] = None,
        url: Optional[str] = None,
        trajectory_id: Optional[str] = None,
    ) -> int:
        """Add a transition to the buffer.

        On-policyness is initialised to 1.0 (neutral) and updated during
        the next refresh cycle.

        Args:
            state, action, reward, next_state, done: standard transition.
            td_error: initial TD error for PER priority.
            url: optional URL for pending reward tracking.
            trajectory_id: optional trajectory identifier (e.g. domain)
                for trajectory-level weighting.

        Returns:
            Buffer index where the transition was stored.
        """
        idx = self.buffer.add(
            state=state,
            action=action,
            reward=reward,
            next_state=next_state,
            done=done,
            td_error=td_error,
            url=url,
        )

        # Initialise on-policyness to 1.0 (neutral weight)
        self._on_policyness[idx] = 1.0

        self._steps_since_refresh += 1

        return idx

    def add_batch(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        rewards: np.ndarray,
        next_states: np.ndarray,
        dones: np.ndarray,
        td_errors: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """Add a batch of transitions (delegates to inner buffer)."""
        indices = self.buffer.add_batch(
            states=states,
            actions=actions,
            rewards=rewards,
            next_states=next_states,
            dones=dones,
            td_errors=td_errors,
        )

        # Initialise on-policyness for new entries
        self._on_policyness[indices] = 1.0

        self._steps_since_refresh += len(indices)

        return indices

    # ---- Sampling with ARB weights -----------------------------------------

    def sample(
        self,
        batch_size: int = 64,
        q_network: Any = None,
    ) -> Tuple[
        np.ndarray,  # states  (B, state_dim)
        np.ndarray,  # actions (B,)
        np.ndarray,  # rewards (B,)
        np.ndarray,  # next_states (B, state_dim)
        np.ndarray,  # dones  (B,)
        np.ndarray,  # is_weights (B,)
        np.ndarray,  # indices (B,)
    ]:
        """Sample a batch with combined PER + ARB importance weights.

        When q_network is provided, on-policyness weights modulate the
        importance-sampling corrections. When q_network is None, falls
        back to standard PER sampling (from the inner buffer).

        Args:
            batch_size: number of transitions to sample.
            q_network: current Q-network for on-policyness computation.
                Accepts torch.nn.Module, ONNXInferenceEngine, or callable.

        Returns:
            Tuple of (states, actions, rewards, next_states, dones,
            is_weights, indices).
        """
        self._sample_count += 1

        if q_network is None:
            # Fallback to standard PER sampling
            self._fallback_count += 1
            return self.buffer.sample(batch_size)

        # Use the inner buffer's sampling mechanism (SumTree proportional)
        # The SumTree already has combined priorities from update_priorities
        states, actions, rewards, next_states, dones, _, indices = (
            self.buffer.sample(batch_size)
        )

        # Recompute IS weights using ARB-aware priorities
        priorities = np.array(
            [self.buffer.sum_tree.tree[self.buffer.sum_tree.capacity + int(i)]
             for i in indices],
            dtype=np.float64,
        )

        is_weights = self.priority_calculator.compute_importance_weights_batch(
            priorities=priorities,
            total_priority=self.buffer.sum_tree.total,
            buffer_size=self.buffer.size,
            beta=self._beta,
        )

        # Anneal beta
        self._beta_step += 1
        self._beta = min(
            self.config.beta_end,
            self.config.beta_start
            + (self.config.beta_end - self.config.beta_start)
            * self._beta_step
            / self.config.beta_frames,
        )

        return states, actions, rewards, next_states, dones, is_weights, indices

    # ---- Priority updates with ARB weighting -------------------------------

    def update_priorities(
        self,
        indices: np.ndarray,
        td_errors: np.ndarray,
        q_network: Any = None,
    ) -> None:
        """Update SumTree priorities using combined PER + ARB weighting.

        When q_network is provided, computes fresh on-policyness for the
        sampled transitions and combines with TD-error priorities. When
        q_network is None, falls back to standard PER updates.

        Args:
            indices: (B,) buffer indices to update.
            td_errors: (B,) new TD errors from the training step.
            q_network: current Q-network for on-policyness. Optional.
        """
        if q_network is None:
            # Standard PER update
            self.buffer.update_priorities(indices, td_errors)
            return

        # Fetch states and actions for the sampled indices
        states = np.empty(
            (len(indices), self.buffer.config.state_dim), dtype=np.float32
        )
        for i, idx in enumerate(indices):
            states[i] = self.buffer._states_mmap[int(idx)]

        # Get actions from SQLite
        unique_indices = np.unique(indices)
        placeholders = ",".join("?" * len(unique_indices))
        rows = self.buffer._conn.execute(
            f"SELECT idx, action FROM transitions WHERE idx IN ({placeholders})",
            tuple(int(i) for i in unique_indices),
        ).fetchall()
        action_map = {r[0]: r[1] for r in rows}

        actions = np.array(
            [action_map.get(int(idx), 0) for idx in indices], dtype=np.int64
        )

        # Compute fresh on-policyness
        on_policyness = self.estimator.compute_batch(states, actions, q_network)

        # Store on-policyness scores
        for i, idx in enumerate(indices):
            self._on_policyness[int(idx)] = on_policyness[i]

        # Compute combined priorities
        combined = self.priority_calculator.compute_priority_batch(
            td_errors, on_policyness
        )

        # Update SumTree and SQLite
        now = time.time()
        update_rows = []
        for i, idx in enumerate(indices):
            self.buffer.sum_tree.update(int(idx), float(combined[i]))
            update_rows.append((float(combined[i]), now, int(idx)))

        self.buffer._conn.executemany(
            "UPDATE transitions SET priority = ?, updated_at = ? WHERE idx = ?",
            update_rows,
        )
        self.buffer._conn.commit()

    # ---- Periodic on-policyness refresh ------------------------------------

    def refresh_on_policyness(
        self,
        q_network: Any,
        batch_size: int = 256,
    ) -> float:
        """Recompute on-policyness scores for all stored transitions.

        Sweeps the entire buffer in batches, computing Boltzmann policy
        probabilities from the current Q-network and updating the SumTree
        with combined PER + ARB priorities.

        This is the core ARB mechanism: as the policy improves, old
        transitions from a worse policy get lower on-policyness scores
        and are sampled less frequently.

        Args:
            q_network: current Q-network (torch.nn.Module or callable).
            batch_size: number of transitions per forward pass.

        Returns:
            Duration of the refresh in seconds.
        """
        t_start = time.monotonic()
        buf = self.buffer
        size = buf.size

        if size == 0:
            return 0.0

        # Flush pending transitions so all data is visible
        if buf._pending_transitions:
            buf._batch_commit_pending()

        # Sweep in batches
        for batch_start in range(0, size, batch_size):
            batch_end = min(batch_start + batch_size, size)
            batch_indices = np.arange(batch_start, batch_end)

            # Read states from mmap (zero-copy)
            states = np.array(buf._states_mmap[batch_indices], dtype=np.float32)

            # Read actions from SQLite
            placeholders = ",".join("?" * len(batch_indices))
            rows = buf._conn.execute(
                f"SELECT idx, action FROM transitions "
                f"WHERE idx IN ({placeholders})",
                tuple(int(i) for i in batch_indices),
            ).fetchall()
            action_map = {r[0]: r[1] for r in rows}
            actions = np.array(
                [action_map.get(int(i), 0) for i in batch_indices],
                dtype=np.int64,
            )

            # Compute on-policyness for this batch
            on_policyness = self.estimator.compute_batch(
                states, actions, q_network
            )

            # Store scores
            self._on_policyness[batch_indices] = on_policyness

            # Read existing PER priorities from SumTree and recompute combined
            for i, idx in enumerate(batch_indices):
                idx_int = int(idx)
                tree_idx = buf.sum_tree.capacity + idx_int
                old_priority = buf.sum_tree.tree[tree_idx]

                # Extract the PER component by reversing the ARB multiplier
                # from the old combined priority. If the old on-policyness
                # was 1.0 (default), old_priority IS the PER priority.
                old_arb = self._on_policyness[idx_int]
                if old_arb > 0:
                    # Approximate PER component
                    per_priority = old_priority / max(
                        old_arb ** self.config.alpha_arb, 1e-12
                    )
                else:
                    per_priority = old_priority

                # Recompute combined priority with fresh on-policyness
                arb_component = on_policyness[i] ** self.config.alpha_arb
                combined = per_priority * arb_component

                buf.sum_tree.update(idx_int, float(combined))

        # Update refresh tracking
        duration = time.monotonic() - t_start
        self._steps_since_refresh = 0
        self._total_refreshes += 1
        self._last_refresh_time = time.time()
        self._last_refresh_duration = duration

        logger.info(
            "ARB refresh complete: %d transitions, %.2fs, mean_on_policyness=%.4f",
            size,
            duration,
            float(np.mean(self._on_policyness[:size])),
        )

        return duration

    def maybe_refresh(self, q_network: Any, batch_size: int = 256) -> bool:
        """Refresh on-policyness if enough steps have elapsed.

        Call this every agent step; it only does work when
        steps_since_refresh >= refresh_interval.

        Returns:
            True if a refresh was performed.
        """
        if self._steps_since_refresh >= self.config.refresh_interval:
            self.refresh_on_policyness(q_network, batch_size)
            return True
        return False

    # ---- Diagnostics -------------------------------------------------------

    def get_diagnostics(self) -> "ARBDiagnostics":
        """Return an ARBDiagnostics instance for this buffer."""
        return ARBDiagnostics(self)

    # ---- Delegate common methods to inner buffer ---------------------------

    def flush(self) -> None:
        self.buffer.flush()

    def close(self) -> None:
        self.buffer.close()

    def get_buffer_stats(self) -> Dict[str, Any]:
        stats = self.buffer.get_buffer_stats()
        size = self.buffer.size
        if size > 0:
            scores = self._on_policyness[:size]
            stats.update({
                "arb_mean_on_policyness": round(float(np.mean(scores)), 4),
                "arb_std_on_policyness": round(float(np.std(scores)), 4),
                "arb_min_on_policyness": round(float(np.min(scores)), 4),
                "arb_max_on_policyness": round(float(np.max(scores)), 4),
                "arb_beta": round(self._beta, 4),
                "arb_total_refreshes": self._total_refreshes,
                "arb_steps_since_refresh": self._steps_since_refresh,
                "arb_last_refresh_duration": round(self._last_refresh_duration, 3),
                "arb_fallback_rate": round(
                    self._fallback_count / max(self._sample_count, 1), 4
                ),
            })
        return stats

    def resolve_pending_rewards(
        self, extraction_results: List[Dict[str, Any]]
    ) -> int:
        return self.buffer.resolve_pending_rewards(extraction_results)

    def compute_nstep_targets(
        self, indices: np.ndarray, bootstrap_q_fn: Any
    ) -> np.ndarray:
        return self.buffer.compute_nstep_targets(indices, bootstrap_q_fn)


# ======================= ARB Diagnostics ====================================


class ARBDiagnostics:
    """Diagnostic tools for analysing ARB buffer health.

    Provides histograms of on-policyness distribution, effective buffer
    size estimates, and replay ratio metrics.
    """

    def __init__(self, arb_buffer: ARBReplayBuffer) -> None:
        self._buf = arb_buffer

    def get_staleness_distribution(
        self,
        num_bins: int = 10,
    ) -> Dict[str, Any]:
        """Histogram of on-policyness scores across the buffer.

        Low on-policyness = stale (off-distribution) transitions.
        High on-policyness = well-aligned with current policy.

        Args:
            num_bins: number of histogram bins.

        Returns:
            Dict with 'bin_edges', 'counts', 'percentiles' keys.
        """
        size = self._buf.size
        if size == 0:
            return {"bin_edges": [], "counts": [], "percentiles": {}}

        scores = self._buf._on_policyness[:size]
        counts, bin_edges = np.histogram(scores, bins=num_bins)

        percentiles = {
            "p10": float(np.percentile(scores, 10)),
            "p25": float(np.percentile(scores, 25)),
            "p50": float(np.percentile(scores, 50)),
            "p75": float(np.percentile(scores, 75)),
            "p90": float(np.percentile(scores, 90)),
        }

        return {
            "bin_edges": bin_edges.tolist(),
            "counts": counts.tolist(),
            "percentiles": percentiles,
        }

    def get_effective_buffer_size(self) -> float:
        """Estimate the effective buffer size under ARB weighting.

        Uses the inverse of the sum of squared normalised weights
        (Kish's effective sample size):

            N_eff = (sum w_i)^2 / sum(w_i^2)

        Returns 0.0 for empty buffer, otherwise a value in [1, N].
        A value close to N means weights are uniform (all data useful).
        A value close to 1 means most weight is on a single transition.
        """
        size = self._buf.size
        if size == 0:
            return 0.0

        scores = self._buf._on_policyness[:size]
        weights = scores ** self._buf.config.alpha_arb

        sum_w = np.sum(weights)
        sum_w2 = np.sum(weights ** 2)

        if sum_w2 < 1e-12:
            return 0.0

        return float((sum_w ** 2) / sum_w2)

    def get_replay_ratio(self) -> float:
        """Fraction of the buffer that is 'usable' (on-policyness > threshold).

        Threshold is the midpoint between clip_min and 1.0. Transitions
        below this threshold contribute negligible sampling weight.

        Returns:
            Float in [0, 1]. Higher = more of the buffer is on-policy.
        """
        size = self._buf.size
        if size == 0:
            return 0.0

        threshold = (self._buf.config.clip_min + 1.0) / 2.0
        scores = self._buf._on_policyness[:size]
        usable = np.sum(scores >= threshold)
        return float(usable / size)

    def get_summary(self) -> Dict[str, Any]:
        """Combined diagnostic summary."""
        return {
            "staleness_distribution": self.get_staleness_distribution(),
            "effective_buffer_size": round(self.get_effective_buffer_size(), 1),
            "replay_ratio": round(self.get_replay_ratio(), 4),
            "buffer_size": self._buf.size,
            "total_refreshes": self._buf._total_refreshes,
            "steps_since_refresh": self._buf._steps_since_refresh,
            "fallback_rate": round(
                self._buf._fallback_count
                / max(self._buf._sample_count, 1),
                4,
            ),
        }
