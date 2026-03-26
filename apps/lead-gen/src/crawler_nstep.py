"""
Module 1: Improved n-step return computation for RL-based focused web crawling.

Implements multiple return estimation methods:
- N-step returns with circular buffer and episode boundary handling
- Generalized Advantage Estimation (Schulman et al. 2016)
- Retrace(lambda) off-policy correction (Munos et al. 2016)
- Mixed 1-step / n-step replay sampling

All methods unified under ReturnEstimator for clean integration with
the DoubleDQNAgent and MmapReplayBuffer.

Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_nstep")

# ---------------------------------------------------------------------------
# Try importing optional backends; gate features behind availability flags
# ---------------------------------------------------------------------------
_HAS_TORCH = False

try:
    import torch

    _HAS_TORCH = True
except ImportError:
    logger.warning("PyTorch not installed -- torch-dependent features disabled")


# ======================= Configuration ======================================

@dataclass
class NStepConfig:
    """Configuration for n-step return computation.

    Controls which return estimation method is used and its hyperparameters.
    Defaults match the existing DQNConfig.n_step=5, gamma=0.99 behaviour.
    """

    n: int = 5
    gamma: float = 0.99

    # Generalized Advantage Estimation (Schulman et al. 2016)
    use_gae: bool = False
    gae_lambda: float = 0.95

    # Retrace(lambda) off-policy correction (Munos et al. 2016)
    use_retrace: bool = False


# ======================= N-Step Circular Buffer =============================

class NStepBuffer:
    """Circular buffer that accumulates n transitions before emitting an n-step return.

    Each call to add() appends a transition.  When n transitions have
    accumulated, compute_nstep_return folds them into a single (s_0, a_0, G_n,
    s_n, done_n) tuple and emits it.  Episode boundaries (done=True) flush the
    remaining partial window immediately so rewards never leak across episodes.

    Memory: n * (state_dim + scalars) -- approximately 40 KB for n=5, dim=784.
    """

    __slots__ = (
        "_n",
        "_gamma",
        "_states",
        "_actions",
        "_rewards",
        "_next_states",
        "_dones",
        "_size",
    )

    def __init__(self, config: Optional[NStepConfig] = None) -> None:
        cfg = config or NStepConfig()
        self._n = cfg.n
        self._gamma = cfg.gamma

        # Ring storage -- pre-allocated lists, overwritten in FIFO order
        self._states: List[np.ndarray] = []
        self._actions: List[int] = []
        self._rewards: List[float] = []
        self._next_states: List[np.ndarray] = []
        self._dones: List[bool] = []
        self._size: int = 0

    # ---- Public API ---------------------------------------------------------

    def add(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ) -> List[Tuple[np.ndarray, int, float, np.ndarray, bool]]:
        """Append a transition; return completed n-step tuples (may be 0 or more).

        When done=True the episode boundary triggers a flush so that no
        rewards leak into the next episode.

        Returns:
            List of (s_0, a_0, G_n, s_n, done_n) tuples ready for the replay
            buffer.
        """
        self._states.append(state)
        self._actions.append(action)
        self._rewards.append(reward)
        self._next_states.append(next_state)
        self._dones.append(done)
        self._size += 1

        if done:
            # Episode boundary -- flush everything
            return self.flush()

        if self._size >= self._n:
            # Full window -- emit the oldest transition
            return [self._emit_oldest()]

        return []

    def flush(self) -> List[Tuple[np.ndarray, int, float, np.ndarray, bool]]:
        """Emit all remaining partial-window transitions (episode end).

        Each remaining transition gets a discounted return computed from
        however many future rewards are available (< n).

        Returns:
            List of (s_0, a_0, G_k, s_k, done_k) tuples where k <= n.
        """
        emitted: List[Tuple[np.ndarray, int, float, np.ndarray, bool]] = []
        while self._size > 0:
            emitted.append(self._emit_oldest())
        return emitted

    # ---- Internal -----------------------------------------------------------

    def _emit_oldest(self) -> Tuple[np.ndarray, int, float, np.ndarray, bool]:
        """Pop the oldest transition and fold remaining rewards into an n-step return."""
        s0 = self._states.pop(0)
        a0 = self._actions.pop(0)
        r0 = self._rewards.pop(0)
        # next_state for the first transition is unused -- we need s_n
        self._next_states.pop(0)
        d0_unused = self._dones.pop(0)
        self._size -= 1

        # Compute discounted return from remaining buffered rewards
        g = r0
        for k in range(self._size):
            if self._dones[k]:
                # Episode ended mid-window; stop accumulating
                g += (self._gamma ** (k + 1)) * self._rewards[k]
                # The "next state" is the terminal state at step k
                s_n = self._next_states[k]
                done_n = True
                return (s0, a0, g, s_n, done_n)
            g += (self._gamma ** (k + 1)) * self._rewards[k]

        # No episode boundary in the remaining window
        if self._size > 0:
            s_n = self._next_states[-1]
            done_n = self._dones[-1]
        else:
            # Window was exactly 1 transition; next state from the original
            # We already popped it, so reconstruct -- this only happens when
            # flush() is called with a single remaining transition.  In that
            # case the return is just r0 and done is the original done flag.
            s_n = s0  # placeholder; caller should bootstrap from Q(s_n)
            done_n = d0_unused

        return (s0, a0, g, s_n, done_n)

    @property
    def pending(self) -> int:
        """Number of transitions waiting in the buffer."""
        return self._size


# ======================= GAE Computer =======================================

class GAEComputer:
    """Generalized Advantage Estimation (Schulman et al. 2016).

    Reduces variance of advantage estimates by exponentially weighting
    multi-step TD errors.  The lambda parameter trades off bias (low lambda)
    versus variance (high lambda):

        A_t = sum_{l=0}^{T-t} (gamma * lambda)^l * delta_{t+l}

    where delta_t = r_t + gamma * V(s_{t+1}) - V(s_t).

    Pure NumPy -- no torch dependency.
    """

    __slots__ = ()

    @staticmethod
    def compute_gae(
        rewards: np.ndarray,
        values: np.ndarray,
        dones: np.ndarray,
        gamma: float = 0.99,
        lambda_: float = 0.95,
    ) -> np.ndarray:
        """Compute GAE advantages for a trajectory.

        Args:
            rewards: (T,) rewards at each timestep.
            values:  (T+1,) value estimates.  values[T] is V(s_T) (bootstrap).
            dones:   (T,) episode termination flags (1.0 = done).
            gamma:   discount factor.
            lambda_: GAE lambda (0 = TD(0), 1 = Monte Carlo).

        Returns:
            (T,) advantages for each timestep.
        """
        T = len(rewards)
        advantages = np.zeros(T, dtype=np.float64)
        gae = 0.0

        for t in reversed(range(T)):
            not_done = 1.0 - float(dones[t])
            delta = rewards[t] + gamma * values[t + 1] * not_done - values[t]
            gae = delta + gamma * lambda_ * not_done * gae
            advantages[t] = gae

        return advantages.astype(np.float32)

    @staticmethod
    def compute_returns(
        advantages: np.ndarray,
        values: np.ndarray,
    ) -> np.ndarray:
        """Compute returns from advantages and value estimates.

        Args:
            advantages: (T,) GAE advantages.
            values:     (T,) value estimates (without the bootstrap value).

        Returns:
            (T,) return targets for each timestep.
        """
        return (advantages + values).astype(np.float32)


# ======================= Retrace Correction =================================

class RetraceCorrection:
    """Retrace(lambda) off-policy correction (Munos et al. 2016).

    Corrects for policy mismatch between the behaviour policy (used to
    collect data into the replay buffer) and the target policy (current
    network).  This is critical for long-running crawls where the policy
    evolves significantly while old transitions remain in the buffer.

    The importance-sampling ratio is truncated at 1.0 (Retrace) to
    eliminate the high-variance tails of full IS.

    Pure NumPy -- no torch dependency.
    """

    __slots__ = ()

    @staticmethod
    def compute_retrace_targets(
        rewards: np.ndarray,
        q_values: np.ndarray,
        target_values: np.ndarray,
        action_probs: np.ndarray,
        behavior_probs: np.ndarray,
        gamma: float = 0.99,
        lambda_: float = 1.0,
    ) -> np.ndarray:
        """Compute Retrace(lambda) target Q-values.

        Args:
            rewards:        (T,) rewards.
            q_values:       (T,) Q(s_t, a_t) from the current Q-network.
            target_values:  (T+1,) target network values.
                            target_values[t] = max_a Q_target(s_t, a).
                            target_values[T] is the bootstrap value.
            action_probs:   (T,) pi(a_t | s_t) -- target policy probabilities.
            behavior_probs: (T,) mu(a_t | s_t) -- behaviour policy probabilities.
            gamma:          discount factor.
            lambda_:        trace-cutting coefficient (1.0 = full Retrace).

        Returns:
            (T,) corrected Q-value targets.
        """
        T = len(rewards)
        targets = np.zeros(T, dtype=np.float64)

        # Truncated importance-sampling ratios: c_t = lambda * min(1, pi/mu)
        epsilon = 1e-8  # prevent division by zero
        ratios = np.minimum(1.0, action_probs / (behavior_probs + epsilon))
        c = lambda_ * ratios

        # Backward pass
        q_ret = float(target_values[T])  # bootstrap from target network

        for t in reversed(range(T)):
            delta = rewards[t] + gamma * target_values[t + 1] - q_values[t]
            q_ret = q_values[t] + c[t] * (delta + gamma * (q_ret - target_values[t + 1]))
            targets[t] = q_ret

        return targets.astype(np.float32)


# ======================= Mixed N-Step Replay ================================

class MixedNStepReplay:
    """Mix 1-step and n-step transitions in the same training batch.

    Combines:
    - 50% 1-step transitions (low bias, high variance)
    - 50% n-step transitions (higher bias, lower variance)

    This variance/bias trade-off improves learning stability, especially
    during early training when the value function is inaccurate (high bias
    from n-step bootstrapping is harmful).

    Requires a replay buffer that stores both 1-step and n-step returns.
    """

    __slots__ = ("_ratio",)

    def __init__(self, one_step_ratio: float = 0.5) -> None:
        """
        Args:
            one_step_ratio: fraction of batch that should be 1-step (default 0.5).
        """
        if not 0.0 <= one_step_ratio <= 1.0:
            raise ValueError(f"one_step_ratio must be in [0, 1], got {one_step_ratio}")
        self._ratio = one_step_ratio

    def sample_mixed(
        self,
        replay_buffer: Any,
        batch_size: int,
    ) -> Tuple[
        Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray],
        Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray],
    ]:
        """Sample a mixed batch from the replay buffer.

        Draws two independent sub-batches from the same buffer.  The caller
        is responsible for computing 1-step targets on batch_1step and n-step
        targets on batch_nstep before feeding them to the loss function.

        Args:
            replay_buffer: MmapReplayBuffer instance with a sample() method.
            batch_size: total batch size; split according to one_step_ratio.

        Returns:
            (batch_1step, batch_nstep) where each batch is the 7-tuple
            returned by MmapReplayBuffer.sample():
            (states, actions, rewards, next_states, dones, is_weights, indices).
        """
        n_one = max(1, int(batch_size * self._ratio))
        n_multi = max(1, batch_size - n_one)

        batch_1step = replay_buffer.sample(n_one)
        batch_nstep = replay_buffer.sample(n_multi)

        return batch_1step, batch_nstep

    @property
    def one_step_ratio(self) -> float:
        return self._ratio


# ======================= Unified Return Estimator ===========================

class ReturnEstimator:
    """Unify different return estimation methods behind a single interface.

    Supported methods:
    - "1step":   standard 1-step TD target (low bias baseline).
    - "nstep":   n-step discounted return (current default).
    - "gae":     Generalized Advantage Estimation.
    - "retrace": Retrace(lambda) off-policy correction.
    - "mixed":   50/50 blend of 1-step and n-step targets.

    The estimate() method dispatches to the appropriate implementation.
    """

    METHODS = ("1step", "nstep", "gae", "retrace", "mixed")

    def __init__(self, config: Optional[NStepConfig] = None) -> None:
        self.config = config or NStepConfig()
        self._gae = GAEComputer()
        self._retrace = RetraceCorrection()

    def estimate(
        self,
        method: str,
        rewards: np.ndarray,
        next_states: np.ndarray,
        dones: np.ndarray,
        q_network_fn: Optional[Callable[[np.ndarray], np.ndarray]] = None,
        target_network_fn: Optional[Callable[[np.ndarray], np.ndarray]] = None,
        value_fn: Optional[Callable[[np.ndarray], np.ndarray]] = None,
        action_probs: Optional[np.ndarray] = None,
        behavior_probs: Optional[np.ndarray] = None,
        states: Optional[np.ndarray] = None,
        actions: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """Compute return targets using the specified method.

        Args:
            method:           one of METHODS.
            rewards:          (T,) or (B,) rewards.
            next_states:      (T, dim) or (B, dim) next states.
            dones:            (T,) or (B,) done flags.
            q_network_fn:     callable(states) -> (B, A) Q-values (online net).
            target_network_fn: callable(states) -> (B, A) Q-values (target net).
            value_fn:         callable(states) -> (B,) state values (for GAE).
            action_probs:     (T,) target policy action probs (for Retrace).
            behavior_probs:   (T,) behaviour policy action probs (for Retrace).
            states:           (T, dim) or (B, dim) current states.
            actions:          (T,) or (B,) actions taken.

        Returns:
            (T,) or (B,) return targets.

        Raises:
            ValueError: if method is unrecognised.
        """
        if method not in self.METHODS:
            raise ValueError(
                f"Unknown method '{method}'. Choose from {self.METHODS}"
            )

        gamma = self.config.gamma

        if method == "1step":
            return self._estimate_1step(
                rewards, next_states, dones, gamma, target_network_fn
            )

        if method == "nstep":
            return self._estimate_nstep(
                rewards, next_states, dones, gamma, target_network_fn
            )

        if method == "gae":
            return self._estimate_gae(
                rewards, dones, gamma, states, next_states, value_fn
            )

        if method == "retrace":
            return self._estimate_retrace(
                rewards, states, actions, dones, gamma,
                q_network_fn, target_network_fn,
                action_probs, behavior_probs,
            )

        # method == "mixed"
        return self._estimate_mixed(
            rewards, next_states, dones, gamma, target_network_fn
        )

    # ---- Private estimators ------------------------------------------------

    @staticmethod
    def _estimate_1step(
        rewards: np.ndarray,
        next_states: np.ndarray,
        dones: np.ndarray,
        gamma: float,
        target_network_fn: Optional[Callable],
    ) -> np.ndarray:
        """Standard 1-step TD target: r + gamma * max_a Q_target(s', a)."""
        if target_network_fn is None:
            raise ValueError("target_network_fn required for 1step estimation")

        next_q = target_network_fn(next_states)
        if next_q.ndim > 1:
            next_q = np.max(next_q, axis=1)
        not_done = 1.0 - dones.astype(np.float32)
        return (rewards + gamma * not_done * next_q).astype(np.float32)

    def _estimate_nstep(
        self,
        rewards: np.ndarray,
        next_states: np.ndarray,
        dones: np.ndarray,
        gamma: float,
        target_network_fn: Optional[Callable],
    ) -> np.ndarray:
        """N-step discounted return with bootstrap.

        For sequences shorter than n (due to episode boundaries), the
        return is computed over available steps only.
        """
        if target_network_fn is None:
            raise ValueError("target_network_fn required for nstep estimation")

        n = self.config.n
        T = len(rewards)
        targets = np.zeros(T, dtype=np.float32)

        for t in range(T):
            g = 0.0
            effective_n = 0
            for k in range(min(n, T - t)):
                g += (gamma ** k) * rewards[t + k]
                effective_n = k + 1
                if dones[t + k]:
                    break

            # Bootstrap from target network if episode did not end
            if effective_n > 0 and not dones[t + effective_n - 1]:
                bootstrap_idx = min(t + effective_n, T - 1)
                bootstrap_state = next_states[bootstrap_idx : bootstrap_idx + 1]
                bootstrap_q = target_network_fn(bootstrap_state)
                if bootstrap_q.ndim > 1:
                    bootstrap_q = np.max(bootstrap_q, axis=1)
                g += (gamma ** effective_n) * float(bootstrap_q[0])

            targets[t] = g

        return targets

    def _estimate_gae(
        self,
        rewards: np.ndarray,
        dones: np.ndarray,
        gamma: float,
        states: Optional[np.ndarray],
        next_states: Optional[np.ndarray],
        value_fn: Optional[Callable],
    ) -> np.ndarray:
        """GAE-based return targets."""
        if value_fn is None:
            raise ValueError("value_fn required for GAE estimation")
        if states is None:
            raise ValueError("states required for GAE estimation")

        T = len(rewards)

        # Compute V(s_t) for t=0..T-1 and V(s_T) for bootstrap
        values_current = value_fn(states).flatten()
        # V(s_T) from the last next_state
        bootstrap_v = float(value_fn(next_states[-1:]).flatten()[0])
        values = np.concatenate([values_current, [bootstrap_v]])

        advantages = self._gae.compute_gae(
            rewards, values, dones, gamma, self.config.gae_lambda
        )
        return self._gae.compute_returns(advantages, values_current)

    def _estimate_retrace(
        self,
        rewards: np.ndarray,
        states: Optional[np.ndarray],
        actions: Optional[np.ndarray],
        dones: np.ndarray,
        gamma: float,
        q_network_fn: Optional[Callable],
        target_network_fn: Optional[Callable],
        action_probs: Optional[np.ndarray],
        behavior_probs: Optional[np.ndarray],
    ) -> np.ndarray:
        """Retrace(lambda) corrected targets."""
        if q_network_fn is None:
            raise ValueError("q_network_fn required for retrace estimation")
        if target_network_fn is None:
            raise ValueError("target_network_fn required for retrace estimation")
        if action_probs is None or behavior_probs is None:
            raise ValueError(
                "action_probs and behavior_probs required for retrace estimation"
            )
        if states is None or actions is None:
            raise ValueError("states and actions required for retrace estimation")

        T = len(rewards)

        # Q(s_t, a_t) from online network
        q_all = q_network_fn(states)  # (T, A)
        if q_all.ndim == 1:
            q_values = q_all
        else:
            q_values = q_all[np.arange(T), actions]

        # Target network values: max_a Q_target(s_t, a)
        # Need T+1 values; the last one bootstraps from the final next_state
        target_q_all = target_network_fn(states)  # (T, A)
        if target_q_all.ndim == 1:
            target_values_current = target_q_all
        else:
            target_values_current = np.max(target_q_all, axis=1)

        # For the final bootstrap we need a dummy state -- approximate with
        # the last target value * (1 - done)
        not_done_last = 1.0 - float(dones[-1])
        bootstrap_val = target_values_current[-1] * not_done_last
        target_values = np.concatenate([target_values_current, [bootstrap_val]])

        return self._retrace.compute_retrace_targets(
            rewards,
            q_values,
            target_values,
            action_probs,
            behavior_probs,
            gamma,
            lambda_=1.0,
        )

    def _estimate_mixed(
        self,
        rewards: np.ndarray,
        next_states: np.ndarray,
        dones: np.ndarray,
        gamma: float,
        target_network_fn: Optional[Callable],
    ) -> np.ndarray:
        """Blend 1-step and n-step targets (element-wise average).

        For batch training, randomly assigns each sample to either 1-step or
        n-step with 50/50 probability, then computes the appropriate target.
        """
        targets_1 = self._estimate_1step(
            rewards, next_states, dones, gamma, target_network_fn
        )
        targets_n = self._estimate_nstep(
            rewards, next_states, dones, gamma, target_network_fn
        )

        # Random per-sample mask: 50% 1-step, 50% n-step
        mask = np.random.random(len(rewards)) < 0.5
        mixed = np.where(mask, targets_1, targets_n)
        return mixed.astype(np.float32)

    # ---- Default method selection -------------------------------------------

    def default_method(self) -> str:
        """Return the best method based on config flags.

        Priority: retrace > gae > nstep (matches config booleans).
        """
        if self.config.use_retrace:
            return "retrace"
        if self.config.use_gae:
            return "gae"
        return "nstep"
