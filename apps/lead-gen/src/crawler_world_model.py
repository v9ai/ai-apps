"""
Module 1: Learned world model for tree-search planning in RL-based crawling.

Implements:
1. EnsembleWorldModel: N independent transition models for uncertainty-aware
   next-state/reward/done prediction from (state, action) pairs.
2. TreeSearchPlanner: forward simulation using the world model to build a
   search tree of depth=planning_horizon, width=planning_width, scored by
   cumulative reward or DQN Q-values at the leaves.
3. ModelBasedAgent: blends DQN epsilon-greedy with tree-search planning,
   falling back to DQN when the world model is uncertain.
4. ModelTrainer: trains the ensemble from replay buffer transitions, tracks
   prediction accuracy (state MSE, reward MAE, done accuracy).

Ensemble of 5 x (794 -> 256 -> 256 -> 786) MLPs ~ 5 MB total.

State: 784-dim (768 nomic-embed + 16 scalar features).
Actions: discrete 0..action_dim-1 (one-hot encoded for the transition model).

Target: Apple M1 16GB, zero cloud dependency.
"""

import gc
import hashlib
import logging
import os
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_world_model")

# ---------------------------------------------------------------------------
# Try importing PyTorch; gate all nn.Module classes behind availability
# ---------------------------------------------------------------------------
_HAS_TORCH = False

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim

    _HAS_TORCH = True
except ImportError:
    logger.warning("PyTorch not installed -- world model disabled")


# ======================= Configuration ======================================

@dataclass
class WorldModelConfig:
    """Hyperparameters for the ensemble world model and tree-search planner.

    Ensemble of 5 transition models predicts (next_state, reward, done)
    from (state, action).  Tree-search simulates 3 steps ahead with top-5
    actions per step.  Total ensemble size: ~5 MB.
    """

    # Dimensions
    state_dim: int = 784   # 768 nomic embed + 16 scalar features
    action_dim: int = 10   # top-K link candidates per page

    # Transition model architecture
    hidden_dim: int = 256

    # Ensemble for epistemic uncertainty
    n_ensemble: int = 5

    # Optimiser
    lr: float = 1e-3

    # Tree-search planning
    planning_horizon: int = 3   # simulate 3 steps ahead
    planning_width: int = 5     # top-K actions per step

    # Training schedule
    train_interval: int = 100       # train world model every N agent steps
    min_training_data: int = 500    # minimum transitions before training

    # Training buffer
    buffer_capacity: int = 50_000   # last 50K transitions for world model

    # Uncertainty thresholds
    uncertainty_threshold: float = 0.5   # above this, fall back to DQN
    planning_blend_start: float = 0.0    # initial planning weight
    planning_blend_end: float = 0.8      # max planning weight as model improves
    blend_warmup_steps: int = 10_000     # steps to ramp up planning weight

    # Discount
    gamma: float = 0.99

    # Persistence
    checkpoint_path: str = "scrapus_data/models/world_model/ensemble.pt"

    # Device
    use_mps: bool = True


# ======================= Transition Model (PyTorch) =========================

if _HAS_TORCH:

    class TransitionModel(nn.Module):
        """Single transition model: (state, action) -> (next_state, reward, done).

        Architecture: (784 + 10) -> 256 -> 256 -> (784 + 1 + 1)
        - State prediction: deterministic delta + learned Gaussian noise
        - Reward prediction: scalar
        - Done prediction: sigmoid probability

        Uses residual state prediction (predicts delta, not absolute next state)
        for training stability -- web page embeddings change slowly between hops.
        """

        def __init__(self, config: WorldModelConfig) -> None:
            super().__init__()
            input_dim = config.state_dim + config.action_dim  # 794
            output_dim = config.state_dim + 1 + 1              # 786

            self.fc1 = nn.Linear(input_dim, config.hidden_dim)
            self.fc2 = nn.Linear(config.hidden_dim, config.hidden_dim)

            # Deterministic head: state delta + reward
            self.fc_out = nn.Linear(config.hidden_dim, output_dim)

            # Learned log-variance for state prediction noise
            self.log_var = nn.Linear(config.hidden_dim, config.state_dim)

            self._state_dim = config.state_dim

        def forward(
            self, state: "torch.Tensor", action_onehot: "torch.Tensor"
        ) -> Tuple["torch.Tensor", "torch.Tensor", "torch.Tensor", "torch.Tensor"]:
            """Forward pass.

            Args:
                state: (batch, state_dim) float32.
                action_onehot: (batch, action_dim) float32 one-hot.

            Returns:
                (next_state, reward, done_logit, state_log_var)
                - next_state: (batch, state_dim) -- state + predicted delta
                - reward: (batch, 1)
                - done_logit: (batch, 1) -- pre-sigmoid
                - state_log_var: (batch, state_dim) -- for Gaussian noise
            """
            x = torch.cat([state, action_onehot], dim=-1)
            x = F.relu(self.fc1(x))
            h = F.relu(self.fc2(x))

            out = self.fc_out(h)

            # Split outputs
            state_delta = out[:, : self._state_dim]
            reward = out[:, self._state_dim : self._state_dim + 1]
            done_logit = out[:, self._state_dim + 1 : self._state_dim + 2]

            # Residual state prediction
            next_state = state + state_delta

            # Learned variance for uncertainty
            log_var = self.log_var(h)

            return next_state, reward, done_logit, log_var

    class _TransitionModelStub:
        """Never instantiated -- exists only for type hints outside _HAS_TORCH."""
        pass

else:
    # Stubs so imports don't break when torch is absent
    class TransitionModel:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for TransitionModel")

    class _TransitionModelStub:  # type: ignore[no-redef]
        pass


# ======================= Ensemble World Model ===============================

class EnsembleWorldModel:
    """Ensemble of N independent TransitionModel instances.

    Epistemic uncertainty is estimated as the disagreement (variance) between
    ensemble members' next-state predictions.  High disagreement means the
    model has not seen enough data in that region of state-action space.

    Training buffer: ring buffer of last 50K transitions.
    Total size: 5 x ~1 MB = ~5 MB.
    """

    def __init__(self, config: Optional[WorldModelConfig] = None) -> None:
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for EnsembleWorldModel")

        self.config = config or WorldModelConfig()
        self.device = self._resolve_device()

        # Ensemble members
        self.models: List[TransitionModel] = []
        self.optimizers: List["optim.Adam"] = []
        for _ in range(self.config.n_ensemble):
            model = TransitionModel(self.config).to(self.device)
            self.models.append(model)
            self.optimizers.append(
                optim.Adam(model.parameters(), lr=self.config.lr)
            )

        # Training buffer (ring buffer of transitions)
        self._buffer_states: Deque[np.ndarray] = deque(
            maxlen=self.config.buffer_capacity
        )
        self._buffer_actions: Deque[int] = deque(
            maxlen=self.config.buffer_capacity
        )
        self._buffer_next_states: Deque[np.ndarray] = deque(
            maxlen=self.config.buffer_capacity
        )
        self._buffer_rewards: Deque[float] = deque(
            maxlen=self.config.buffer_capacity
        )
        self._buffer_dones: Deque[float] = deque(
            maxlen=self.config.buffer_capacity
        )

        # Training counter
        self.train_steps: int = 0

        logger.info(
            "EnsembleWorldModel initialised: %d members, device=%s",
            self.config.n_ensemble,
            self.device,
        )

    # ---- Device selection ---------------------------------------------------

    def _resolve_device(self) -> "torch.device":
        if self.config.use_mps and torch.backends.mps.is_available():
            logger.info("World model using MPS (Apple M1 GPU)")
            return torch.device("mps")
        logger.info("World model using CPU")
        return torch.device("cpu")

    # ---- Buffer management --------------------------------------------------

    def add_transition(
        self,
        state: np.ndarray,
        action: int,
        next_state: np.ndarray,
        reward: float,
        done: float,
    ) -> None:
        """Add a single transition to the training buffer."""
        self._buffer_states.append(state)
        self._buffer_actions.append(action)
        self._buffer_next_states.append(next_state)
        self._buffer_rewards.append(reward)
        self._buffer_dones.append(done)

    @property
    def buffer_size(self) -> int:
        return len(self._buffer_states)

    @property
    def has_enough_data(self) -> bool:
        return self.buffer_size >= self.config.min_training_data

    # ---- Action encoding ----------------------------------------------------

    def _action_to_onehot(
        self, actions: np.ndarray
    ) -> "torch.Tensor":
        """Convert integer actions to one-hot tensors.

        Args:
            actions: (batch,) int array, values in [0, action_dim).

        Returns:
            (batch, action_dim) float32 tensor.
        """
        batch_size = len(actions)
        onehot = torch.zeros(
            batch_size, self.config.action_dim,
            dtype=torch.float32, device=self.device,
        )
        actions_t = torch.as_tensor(
            actions, dtype=torch.long, device=self.device
        )
        onehot.scatter_(1, actions_t.unsqueeze(1), 1.0)
        return onehot

    # ---- Prediction ---------------------------------------------------------

    def predict(
        self,
        state: np.ndarray,
        action: int,
    ) -> Tuple[np.ndarray, float, float, float]:
        """Predict next state, reward, done probability, and uncertainty.

        Runs all ensemble members and aggregates:
        - next_state: mean across members
        - reward: mean across members
        - done: mean sigmoid probability across members
        - uncertainty: mean std of next-state predictions (disagreement)

        Args:
            state: (state_dim,) float32 array.
            action: integer action index.

        Returns:
            (mean_next_state, mean_reward, mean_done_prob, uncertainty)
        """
        state_t = torch.as_tensor(
            state, dtype=torch.float32, device=self.device
        ).unsqueeze(0)
        action_onehot = self._action_to_onehot(np.array([action]))

        next_states: List[np.ndarray] = []
        rewards: List[float] = []
        dones: List[float] = []

        for model in self.models:
            model.eval()
            with torch.no_grad():
                ns, r, d_logit, _ = model(state_t, action_onehot)
                next_states.append(ns.cpu().numpy().flatten())
                rewards.append(r.item())
                dones.append(torch.sigmoid(d_logit).item())

        ns_array = np.array(next_states)  # (n_ensemble, state_dim)

        mean_next_state = ns_array.mean(axis=0)
        mean_reward = float(np.mean(rewards))
        mean_done = float(np.mean(dones))

        # Uncertainty = mean per-dimension std across ensemble members
        uncertainty = float(ns_array.std(axis=0).mean())

        return mean_next_state, mean_reward, mean_done, uncertainty

    def predict_batch(
        self,
        states: np.ndarray,
        actions: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Batched prediction across ensemble.

        Args:
            states: (batch, state_dim) float32.
            actions: (batch,) int.

        Returns:
            (mean_next_states, mean_rewards, mean_dones, uncertainties)
            All arrays have batch as first dimension.
        """
        states_t = torch.as_tensor(
            states, dtype=torch.float32, device=self.device
        )
        action_onehot = self._action_to_onehot(actions)
        batch_size = len(states)

        all_ns = np.zeros(
            (self.config.n_ensemble, batch_size, self.config.state_dim),
            dtype=np.float32,
        )
        all_r = np.zeros(
            (self.config.n_ensemble, batch_size), dtype=np.float32
        )
        all_d = np.zeros(
            (self.config.n_ensemble, batch_size), dtype=np.float32
        )

        for i, model in enumerate(self.models):
            model.eval()
            with torch.no_grad():
                ns, r, d_logit, _ = model(states_t, action_onehot)
                all_ns[i] = ns.cpu().numpy()
                all_r[i] = r.squeeze(-1).cpu().numpy()
                all_d[i] = torch.sigmoid(d_logit).squeeze(-1).cpu().numpy()

        mean_ns = all_ns.mean(axis=0)
        mean_r = all_r.mean(axis=0)
        mean_d = all_d.mean(axis=0)
        uncertainties = all_ns.std(axis=0).mean(axis=1)  # (batch,)

        return mean_ns, mean_r, mean_d, uncertainties

    # ---- Training -----------------------------------------------------------

    def train_step(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        next_states: np.ndarray,
        rewards: np.ndarray,
        dones: np.ndarray,
    ) -> float:
        """One training step for all ensemble members.

        Each member is trained on the same batch with independent
        initialisation, producing diverse predictions for disagreement-based
        uncertainty estimation.

        Args:
            states: (batch, state_dim) float32.
            actions: (batch,) int.
            next_states: (batch, state_dim) float32.
            rewards: (batch,) float32.
            dones: (batch,) float32 (0.0 or 1.0).

        Returns:
            Mean loss across ensemble members.
        """
        dev = self.device
        states_t = torch.as_tensor(states, dtype=torch.float32, device=dev)
        next_states_t = torch.as_tensor(
            next_states, dtype=torch.float32, device=dev
        )
        rewards_t = torch.as_tensor(
            rewards, dtype=torch.float32, device=dev
        ).unsqueeze(1)
        dones_t = torch.as_tensor(
            dones, dtype=torch.float32, device=dev
        ).unsqueeze(1)
        action_onehot = self._action_to_onehot(actions)

        total_loss = 0.0

        for model, optimizer in zip(self.models, self.optimizers):
            model.train()
            pred_ns, pred_r, pred_d_logit, log_var = model(
                states_t, action_onehot
            )

            # State prediction loss: Gaussian NLL (heteroscedastic)
            # -log p(next_state | pred) = 0.5 * (log_var + (target - pred)^2 / var)
            var = torch.exp(log_var).clamp(min=1e-6)
            state_loss = 0.5 * (
                log_var + (next_states_t - pred_ns) ** 2 / var
            ).mean()

            # Reward prediction loss: MSE
            reward_loss = F.mse_loss(pred_r, rewards_t)

            # Done prediction loss: binary cross-entropy
            done_loss = F.binary_cross_entropy_with_logits(
                pred_d_logit, dones_t
            )

            loss = state_loss + reward_loss + done_loss

            optimizer.zero_grad()
            loss.backward()
            # Gradient clipping for stability
            torch.nn.utils.clip_grad_norm_(model.parameters(), 10.0)
            optimizer.step()

            total_loss += loss.item()

        self.train_steps += 1
        return total_loss / self.config.n_ensemble

    # ---- Persistence --------------------------------------------------------

    def save_checkpoint(self, path: Optional[str] = None) -> str:
        """Save all ensemble members + optimisers."""
        path = path or self.config.checkpoint_path
        os.makedirs(os.path.dirname(path), exist_ok=True)

        checkpoint = {
            "models": [m.state_dict() for m in self.models],
            "optimizers": [o.state_dict() for o in self.optimizers],
            "train_steps": self.train_steps,
            "config": self.config.__dict__,
        }
        torch.save(checkpoint, path)
        logger.info("World model saved to %s", path)
        return path

    def load_checkpoint(self, path: Optional[str] = None) -> None:
        """Restore ensemble from checkpoint."""
        path = path or self.config.checkpoint_path
        if not os.path.exists(path):
            raise FileNotFoundError(f"World model checkpoint not found: {path}")

        checkpoint = torch.load(
            path, map_location=self.device, weights_only=False
        )
        for i, (model, optimizer) in enumerate(
            zip(self.models, self.optimizers)
        ):
            model.load_state_dict(checkpoint["models"][i])
            optimizer.load_state_dict(checkpoint["optimizers"][i])
        self.train_steps = checkpoint.get("train_steps", 0)
        logger.info(
            "World model loaded from %s (step %d)", path, self.train_steps
        )

    # ---- Cleanup ------------------------------------------------------------

    def release(self) -> None:
        """Free GPU memory."""
        del self.models
        del self.optimizers
        self.models = []
        self.optimizers = []
        if _HAS_TORCH and torch.backends.mps.is_available():
            torch.mps.empty_cache()
        gc.collect()
        logger.info("EnsembleWorldModel released")


# ======================= Tree-Search Planner ================================

class TreeSearchPlanner:
    """Forward simulation using the world model to build a search tree.

    At each node, expands the top-K actions (planning_width).  Recurses up
    to planning_horizon depth.  Leaf nodes are scored by:
    - DQN Q-value (if a q_network is provided), or
    - Cumulative discounted reward along the simulated trajectory.

    Pruning: branches with high world-model uncertainty are skipped -- the
    model cannot reliably predict outcomes in unexplored state-action regions.

    Caching: identical (state_hash, action) pairs are not re-simulated.
    """

    def __init__(
        self,
        world_model: EnsembleWorldModel,
        config: Optional[WorldModelConfig] = None,
    ) -> None:
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for TreeSearchPlanner")

        self.world_model = world_model
        self.config = config or world_model.config

        # Cache: (state_hash, action) -> (next_state, reward, done, uncertainty)
        self._cache: Dict[
            Tuple[str, int],
            Tuple[np.ndarray, float, float, float],
        ] = {}
        self._cache_hits: int = 0
        self._cache_misses: int = 0

    # ---- State hashing for cache -------------------------------------------

    @staticmethod
    def _hash_state(state: np.ndarray) -> str:
        """Fast hash for state array (truncated SHA-256)."""
        return hashlib.sha256(state.tobytes()).hexdigest()[:16]

    # ---- Cached prediction --------------------------------------------------

    def _predict_cached(
        self, state: np.ndarray, action: int
    ) -> Tuple[np.ndarray, float, float, float]:
        """World model prediction with caching to avoid re-simulation."""
        key = (self._hash_state(state), action)
        if key in self._cache:
            self._cache_hits += 1
            return self._cache[key]

        self._cache_misses += 1
        result = self.world_model.predict(state, action)
        self._cache[key] = result
        return result

    # ---- Tree search --------------------------------------------------------

    def plan(
        self,
        state: np.ndarray,
        q_network: Optional[Any] = None,
        num_links: Optional[int] = None,
    ) -> Tuple[int, float]:
        """Plan the best action via forward tree search.

        Args:
            state: (state_dim,) float32 current state.
            q_network: optional DQN network for leaf evaluation.
                       If None, uses cumulative world-model reward.
            num_links: number of available links (clamps action space).

        Returns:
            (best_action, expected_return)
        """
        # Clear cache for new planning round
        self._cache.clear()

        action_dim = self.config.action_dim
        if num_links is not None:
            action_dim = min(num_links, action_dim)

        # Evaluate each root action
        best_action = 0
        best_return = -float("inf")

        for action in range(action_dim):
            ns, r, done, unc = self._predict_cached(state, action)

            # Prune high-uncertainty branches at root
            if unc > self.config.uncertainty_threshold:
                continue

            if done > 0.5:
                # Episode ends: return is just the immediate reward
                expected = r
            else:
                # Recurse into subtree
                subtree_return = self._expand_node(
                    ns,
                    depth=1,
                    cumulative_reward=r,
                    discount=self.config.gamma,
                    q_network=q_network,
                )
                expected = subtree_return

            if expected > best_return:
                best_return = expected
                best_action = action

        # If all actions were pruned (high uncertainty), fall back to action 0
        if best_return == -float("inf"):
            best_return = 0.0

        return best_action, best_return

    def _expand_node(
        self,
        state: np.ndarray,
        depth: int,
        cumulative_reward: float,
        discount: float,
        q_network: Optional[Any],
    ) -> float:
        """Recursively expand a tree node.

        At leaf depth (depth == planning_horizon):
        - If q_network is provided, evaluate with Q-values.
        - Otherwise, return cumulative discounted reward.

        At intermediate depth:
        - Expand top planning_width actions, pick the best subtree.
        """
        # Leaf node: score it
        if depth >= self.config.planning_horizon:
            return self._evaluate_leaf(
                state, cumulative_reward, discount, depth, q_network
            )

        # Expand children
        action_dim = self.config.action_dim
        best_child_return = -float("inf")

        # Pre-screen actions: predict all, sort by immediate reward, take top-K
        action_scores: List[Tuple[int, float, np.ndarray, float, float, float]] = []
        for action in range(action_dim):
            ns, r, done, unc = self._predict_cached(state, action)
            action_scores.append((action, r, ns, done, unc, r))

        # Sort by predicted reward, take top planning_width
        action_scores.sort(key=lambda x: x[1], reverse=True)
        top_actions = action_scores[: self.config.planning_width]

        for action, r, ns, done, unc, _ in top_actions:
            # Prune high-uncertainty branches
            if unc > self.config.uncertainty_threshold:
                continue

            discounted_r = cumulative_reward + (discount ** depth) * r

            if done > 0.5:
                child_return = discounted_r
            else:
                child_return = self._expand_node(
                    ns,
                    depth + 1,
                    discounted_r,
                    discount,
                    q_network,
                )

            if child_return > best_child_return:
                best_child_return = child_return

        # If all children were pruned, return cumulative so far
        if best_child_return == -float("inf"):
            best_child_return = cumulative_reward

        return best_child_return

    def _evaluate_leaf(
        self,
        state: np.ndarray,
        cumulative_reward: float,
        discount: float,
        depth: int,
        q_network: Optional[Any],
    ) -> float:
        """Score a leaf node.

        If q_network is available, bootstraps with max Q-value:
            return = cumulative_reward + gamma^depth * max_a Q(state, a)

        Otherwise returns the cumulative discounted reward from the world
        model trajectory.
        """
        if q_network is not None and _HAS_TORCH:
            state_t = torch.as_tensor(
                state, dtype=torch.float32,
                device=self.world_model.device,
            ).unsqueeze(0)
            with torch.no_grad():
                q_values = q_network(state_t).cpu().numpy().flatten()
            bootstrap = float(np.max(q_values))
            return cumulative_reward + (discount ** depth) * bootstrap

        return cumulative_reward

    # ---- Diagnostics --------------------------------------------------------

    def get_cache_stats(self) -> Dict[str, int]:
        """Return cache hit/miss statistics."""
        return {
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "cache_size": len(self._cache),
        }

    def reset_cache_stats(self) -> None:
        self._cache_hits = 0
        self._cache_misses = 0


# ======================= Model-Based Agent ==================================

class ModelBasedAgent:
    """Combines DQN with world-model tree-search planning.

    Decision logic:
    - When world model uncertainty is low: use tree-search planning.
    - When world model uncertainty is high: fall back to DQN.
    - Gradual blending: as the model improves (lower avg uncertainty),
      the planning weight increases from planning_blend_start to
      planning_blend_end over blend_warmup_steps.

    Requires a DoubleDQNAgent (from crawler_dqn) for the DQN fallback.
    """

    def __init__(
        self,
        dqn_agent: Any,  # DoubleDQNAgent from crawler_dqn
        world_model: EnsembleWorldModel,
        planner: TreeSearchPlanner,
        config: Optional[WorldModelConfig] = None,
    ) -> None:
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for ModelBasedAgent")

        self.dqn_agent = dqn_agent
        self.world_model = world_model
        self.planner = planner
        self.config = config or world_model.config

        # Track planning usage stats
        self._planning_used: int = 0
        self._dqn_fallback_used: int = 0
        self._total_decisions: int = 0

        logger.info("ModelBasedAgent initialised")

    # ---- Planning weight schedule -------------------------------------------

    def _get_planning_weight(self, global_step: int) -> float:
        """Compute current planning weight (linear warmup).

        Ramps from planning_blend_start to planning_blend_end over
        blend_warmup_steps.  Before min_training_data transitions,
        returns 0.0 (pure DQN).
        """
        if not self.world_model.has_enough_data:
            return 0.0

        progress = min(
            1.0, global_step / max(self.config.blend_warmup_steps, 1)
        )
        return (
            self.config.planning_blend_start
            + progress * (
                self.config.planning_blend_end
                - self.config.planning_blend_start
            )
        )

    # ---- Action selection ---------------------------------------------------

    def select_action(
        self,
        state: np.ndarray,
        num_links: int,
        global_step: int,
    ) -> Tuple[int, float]:
        """Select action blending DQN and tree-search planning.

        Args:
            state: (state_dim,) float32 array.
            num_links: number of available link candidates.
            global_step: current global training step.

        Returns:
            (action_index, epsilon)
        """
        self._total_decisions += 1
        planning_weight = self._get_planning_weight(global_step)

        # Epsilon from DQN agent for exploration
        epsilon = self.dqn_agent.epsilon_scheduler.get_epsilon(global_step)

        # Exploration: random action
        action_dim = min(num_links, self.config.action_dim)
        if np.random.random() < epsilon:
            return int(np.random.randint(0, action_dim)), epsilon

        # Decide: planning or DQN
        use_planning = (
            planning_weight > 0.0
            and np.random.random() < planning_weight
            and self.world_model.has_enough_data
        )

        if use_planning:
            try:
                plan_action, plan_return = self.planner.plan(
                    state,
                    q_network=self.dqn_agent.q_network,
                    num_links=num_links,
                )
                self._planning_used += 1
                return plan_action, epsilon
            except Exception as exc:
                # If planning fails, fall back to DQN
                logger.debug("Planning failed, falling back to DQN: %s", exc)

        # DQN fallback
        self._dqn_fallback_used += 1
        state_t = torch.as_tensor(
            state, dtype=torch.float32,
            device=self.dqn_agent.device,
        ).unsqueeze(0)
        with torch.no_grad():
            q_values = self.dqn_agent.q_network(state_t).cpu().numpy().flatten()
        valid_q = q_values[:action_dim]
        return int(np.argmax(valid_q)), epsilon

    # ---- Diagnostics --------------------------------------------------------

    def get_usage_stats(self) -> Dict[str, Any]:
        """Return planning vs DQN usage statistics."""
        total = max(self._total_decisions, 1)
        return {
            "total_decisions": self._total_decisions,
            "planning_used": self._planning_used,
            "dqn_fallback_used": self._dqn_fallback_used,
            "planning_ratio": self._planning_used / total,
            "dqn_ratio": self._dqn_fallback_used / total,
        }


# ======================= Model Trainer ======================================

class ModelTrainer:
    """Trains the ensemble world model from replay buffer data.

    Tracks prediction accuracy metrics:
    - state_mse: mean squared error of next-state predictions
    - reward_mae: mean absolute error of reward predictions
    - done_accuracy: classification accuracy of done predictions

    These metrics indicate whether the world model is reliable enough
    for tree-search planning to be useful.
    """

    def __init__(
        self,
        world_model: EnsembleWorldModel,
        config: Optional[WorldModelConfig] = None,
    ) -> None:
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for ModelTrainer")

        self.world_model = world_model
        self.config = config or world_model.config

        # Accuracy tracking (exponential moving averages)
        self._state_mse_ema: float = 1.0
        self._reward_mae_ema: float = 1.0
        self._done_accuracy_ema: float = 0.5
        self._ema_alpha: float = 0.05  # smoothing factor

        # Training history
        self._loss_history: List[float] = []
        self._epoch_count: int = 0

    # ---- Training epoch -----------------------------------------------------

    def train_epoch(
        self,
        replay_buffer: Any,
        batch_size: int = 64,
        n_batches: int = 10,
    ) -> float:
        """Train world model for one epoch using replay buffer samples.

        Args:
            replay_buffer: must support .sample(batch_size) returning
                           (states, actions, rewards, next_states, dones)
                           as numpy arrays.
            batch_size: samples per training batch.
            n_batches: number of batches per epoch.

        Returns:
            Mean loss across all batches in the epoch.
        """
        if not self.world_model.has_enough_data:
            logger.debug(
                "Not enough data for world model training (%d < %d)",
                self.world_model.buffer_size,
                self.config.min_training_data,
            )
            return 0.0

        epoch_losses: List[float] = []

        for _ in range(n_batches):
            # Sample from replay buffer
            try:
                batch = replay_buffer.sample(batch_size)
                states, actions, rewards, next_states, dones = batch
            except (ValueError, AttributeError):
                # Fall back to sampling from world model's own buffer
                states, actions, rewards, next_states, dones = (
                    self._sample_from_internal_buffer(batch_size)
                )

            loss = self.world_model.train_step(
                states, actions, next_states, rewards, dones
            )
            epoch_losses.append(loss)

            # Update accuracy metrics
            self._update_accuracy_metrics(
                states, actions, next_states, rewards, dones
            )

        mean_loss = float(np.mean(epoch_losses))
        self._loss_history.append(mean_loss)
        self._epoch_count += 1

        logger.info(
            "World model epoch %d: loss=%.4f, state_mse=%.4f, "
            "reward_mae=%.4f, done_acc=%.3f",
            self._epoch_count,
            mean_loss,
            self._state_mse_ema,
            self._reward_mae_ema,
            self._done_accuracy_ema,
        )

        return mean_loss

    def _sample_from_internal_buffer(
        self, batch_size: int
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Sample a batch from the world model's internal training buffer."""
        buf_size = self.world_model.buffer_size
        indices = np.random.randint(0, buf_size, size=min(batch_size, buf_size))

        states_list = list(self.world_model._buffer_states)
        actions_list = list(self.world_model._buffer_actions)
        next_list = list(self.world_model._buffer_next_states)
        rewards_list = list(self.world_model._buffer_rewards)
        dones_list = list(self.world_model._buffer_dones)

        states = np.array([states_list[i] for i in indices], dtype=np.float32)
        actions = np.array([actions_list[i] for i in indices], dtype=np.int64)
        next_states = np.array(
            [next_list[i] for i in indices], dtype=np.float32
        )
        rewards = np.array(
            [rewards_list[i] for i in indices], dtype=np.float32
        )
        dones = np.array([dones_list[i] for i in indices], dtype=np.float32)

        return states, actions, rewards, next_states, dones

    # ---- Accuracy tracking --------------------------------------------------

    def _update_accuracy_metrics(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        next_states: np.ndarray,
        rewards: np.ndarray,
        dones: np.ndarray,
    ) -> None:
        """Update EMA accuracy metrics from a batch."""
        pred_ns, pred_r, pred_d, _ = self.world_model.predict_batch(
            states, actions
        )

        # State MSE
        state_mse = float(np.mean((pred_ns - next_states) ** 2))
        self._state_mse_ema = (
            self._ema_alpha * state_mse
            + (1.0 - self._ema_alpha) * self._state_mse_ema
        )

        # Reward MAE
        reward_mae = float(np.mean(np.abs(pred_r - rewards)))
        self._reward_mae_ema = (
            self._ema_alpha * reward_mae
            + (1.0 - self._ema_alpha) * self._reward_mae_ema
        )

        # Done accuracy
        pred_done_binary = (pred_d > 0.5).astype(np.float32)
        done_acc = float(np.mean(pred_done_binary == dones))
        self._done_accuracy_ema = (
            self._ema_alpha * done_acc
            + (1.0 - self._ema_alpha) * self._done_accuracy_ema
        )

    # ---- Model quality report -----------------------------------------------

    def get_model_quality(self) -> Dict[str, float]:
        """Return current model quality metrics.

        Returns:
            Dict with state_mse, reward_mae, done_accuracy,
            epochs_trained, mean_recent_loss, and a quality_score
            (0.0 = untrained, 1.0 = excellent).
        """
        recent_loss = (
            float(np.mean(self._loss_history[-10:]))
            if self._loss_history
            else float("inf")
        )

        # Composite quality score (heuristic, 0-1)
        # Low MSE, low MAE, high done accuracy -> high quality
        quality = 0.0
        if self._epoch_count > 0:
            # State MSE: < 0.01 is excellent, > 1.0 is bad
            state_score = max(0.0, 1.0 - self._state_mse_ema)
            # Reward MAE: < 0.05 is excellent, > 0.5 is bad
            reward_score = max(0.0, 1.0 - 2.0 * self._reward_mae_ema)
            # Done accuracy: 0.5 is chance, 1.0 is perfect
            done_score = max(0.0, (self._done_accuracy_ema - 0.5) * 2.0)
            quality = (state_score + reward_score + done_score) / 3.0

        return {
            "state_mse": self._state_mse_ema,
            "reward_mae": self._reward_mae_ema,
            "done_accuracy": self._done_accuracy_ema,
            "epochs_trained": float(self._epoch_count),
            "mean_recent_loss": recent_loss,
            "quality_score": quality,
            "buffer_size": float(self.world_model.buffer_size),
        }
