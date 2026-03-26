"""
Module 1: Learned world model for tree-search planning in RL-based crawling.

Implements WebDreamer-inspired model-based planning (arXiv:2411.06559):

1. EnsembleWorldModel: N independent transition models for uncertainty-aware
   next-state/reward/done prediction from (state, action) pairs.
   Training: multi-epoch with train/val split, early stopping per model,
   Gaussian NLL for states, MSE for rewards, BCE for done.

2. TreeSearchPlanner: forward simulation using the world model to build a
   search tree of depth=planning_horizon, width=planning_width, scored by
   cumulative model reward + DQN Q-values at the leaves.
   Uncertainty-based branch pruning.

3. WebDreamerPlanner: LLM-based look-ahead simulation for high-value
   decisions. Uses local LLM (DeepSeek/Qwen via MLX) to predict crawl
   outcomes from URL patterns + anchor text. MPC strategy: simulate top-K
   candidate URLs, pick highest predicted quality. Falls back to DQN when
   LLM unavailable. Rate-limited: max 5 simulations per decision.

4. ModelBasedAgent: blends DQN epsilon-greedy with tree-search planning,
   falling back to DQN when the world model is uncertain. Planning weight
   ramps from 0.0 to 0.8 over warmup period.

5. DynaTrainer: generates synthetic experience from the world model for
   DQN training (Sutton 1991 Dyna-Q). Quality-filtered by ensemble
   uncertainty. Max 0.5 synthetic/real ratio.

6. ModelTrainer: trains the ensemble from replay buffer transitions, tracks
   prediction accuracy (state MSE, reward MAE, done accuracy).

Ensemble of 5 x (794 -> 256 -> 256 -> 786) MLPs ~ 5 MB total.
WebDreamer LLM overhead: ~2s per decision (batched local 3B model).

State: 784-dim (768 nomic-embed + 16 scalar features).
Actions: discrete 0..action_dim-1 (one-hot encoded for the transition model).

Target: Apple M1 16GB, zero cloud dependency.
"""

import gc
import hashlib
import json
import logging
import os
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Deque, Dict, List, NamedTuple, Optional, Tuple

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


# ======================= Data Structures ====================================

class SimulationResult(NamedTuple):
    """Result of an LLM-based action simulation (WebDreamer look-ahead)."""
    predicted_page_type: str       # e.g. "careers", "about", "blog", "irrelevant"
    predicted_quality: float       # 0.0 - 1.0 B2B lead relevance score
    confidence: float              # 0.0 - 1.0 model confidence
    reasoning: str                 # brief explanation


class Transition(NamedTuple):
    """A single (s, a, r, s', done) transition, optionally labeled synthetic."""
    state: np.ndarray
    action: int
    reward: float
    next_state: np.ndarray
    done: float
    is_synthetic: bool = False


# ======================= Configuration ======================================

@dataclass
class WorldModelConfig:
    """Hyperparameters for the ensemble world model, tree-search planner,
    WebDreamer LLM look-ahead, and Dyna synthetic experience generation.

    Ensemble of 5 transition models predicts (next_state, reward, done)
    from (state, action).  Tree-search simulates 3 steps ahead with top-5
    actions per step.  Total ensemble size: ~5 MB.

    WebDreamer adds optional LLM-based simulation for high-value link
    selection decisions (text-only, no screenshots needed for B2B crawling).
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
    model_train_interval: int = 1000  # steps between full ensemble retraining

    # Training buffer
    buffer_capacity: int = 50_000   # last 50K transitions for world model

    # Training hyperparameters (multi-epoch)
    num_train_epochs: int = 10       # max epochs per training cycle
    train_batch_size: int = 256      # batch size for ensemble training
    val_split: float = 0.1           # fraction held out for validation
    early_stop_patience: int = 3     # epochs without improvement before stop

    # Uncertainty thresholds
    uncertainty_threshold: float = 0.5   # above this, fall back to DQN
    planning_blend_start: float = 0.0    # initial planning weight
    planning_blend_end: float = 0.8      # max planning weight as model improves
    blend_warmup_steps: int = 10_000     # steps to ramp up planning weight

    # Discount
    gamma: float = 0.99

    # WebDreamer LLM look-ahead
    llm_model: str = "deepseek"                  # "deepseek" or "qwen"
    max_simulations_per_step: int = 5             # rate limit per decision
    simulation_timeout_ms: int = 2000             # per-simulation timeout
    llm_endpoint: str = "http://localhost:8080/v1"  # local vLLM/MLX endpoint
    llm_temperature: float = 0.3                  # low temp for deterministic predictions
    webdreamer_enabled: bool = False              # enable LLM look-ahead (off by default)

    # Dyna-style synthetic experience
    dyna_ratio: float = 0.3        # max synthetic/real ratio in replay buffer
    dyna_rollout_length: int = 5   # steps per synthetic rollout
    dyna_batch_size: int = 32      # synthetic rollouts per Dyna update
    dyna_uncertainty_threshold: float = 0.3  # stricter than planning threshold

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

    Training:
    - Multi-epoch training from replay buffer with train/validation split
    - Per-model early stopping when validation loss stops improving
    - Gaussian NLL for state prediction (heteroscedastic)
    - MSE for reward, BCE for done

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

        # Per-model best validation losses (for early stopping)
        self._best_val_losses: List[float] = [float("inf")] * self.config.n_ensemble
        self._patience_counters: List[int] = [0] * self.config.n_ensemble

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

    # ---- Buffer to arrays ---------------------------------------------------

    def _buffer_to_arrays(
        self,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Convert the internal ring buffer to numpy arrays for training."""
        states = np.array(list(self._buffer_states), dtype=np.float32)
        actions = np.array(list(self._buffer_actions), dtype=np.int64)
        next_states = np.array(
            list(self._buffer_next_states), dtype=np.float32
        )
        rewards = np.array(list(self._buffer_rewards), dtype=np.float32)
        dones = np.array(list(self._buffer_dones), dtype=np.float32)
        return states, actions, next_states, rewards, dones

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

    # ---- Single-batch training step -----------------------------------------

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

    # ---- Multi-epoch training with early stopping ---------------------------

    def train(
        self,
        replay_buffer: Optional[Any] = None,
        num_epochs: Optional[int] = None,
        batch_size: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Train ensemble on replay data with train/val split and early stopping.

        Each of the N ensemble models is trained independently on the same
        data splits. Per-model early stopping halts training for a model when
        its validation loss stops improving for `early_stop_patience` epochs.

        Each model predicts: (state, action_onehot) -> (next_state_delta, reward, done)
        Ensemble disagreement provides epistemic uncertainty.

        Args:
            replay_buffer: external buffer with .sample(n) method, or None
                           to use the internal ring buffer.
            num_epochs: number of training epochs (default from config).
            batch_size: batch size (default from config).

        Returns:
            Dict with per-model final losses, validation losses, epochs
            completed, and overall training summary.
        """
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for training")

        if not self.has_enough_data:
            logger.debug(
                "Not enough data for world model training (%d < %d)",
                self.buffer_size,
                self.config.min_training_data,
            )
            return {"status": "insufficient_data", "buffer_size": self.buffer_size}

        num_epochs = num_epochs or self.config.num_train_epochs
        batch_size = batch_size or self.config.train_batch_size

        # Gather data from internal buffer or external replay buffer
        if replay_buffer is not None:
            try:
                n_samples = min(self.config.buffer_capacity, replay_buffer.size if hasattr(replay_buffer, 'size') else len(replay_buffer))
                batch = replay_buffer.sample(n_samples)
                states, actions, rewards, next_states, dones = batch
            except (ValueError, AttributeError):
                states, actions, next_states, rewards, dones = self._buffer_to_arrays()
        else:
            states, actions, next_states, rewards, dones = self._buffer_to_arrays()

        n_total = len(states)
        n_val = max(1, int(n_total * self.config.val_split))
        n_train = n_total - n_val

        # Shuffle and split
        perm = np.random.permutation(n_total)
        train_idx = perm[:n_train]
        val_idx = perm[n_train:]

        train_states = states[train_idx]
        train_actions = actions[train_idx]
        train_next = next_states[train_idx]
        train_rewards = rewards[train_idx]
        train_dones = dones[train_idx]

        val_states = states[val_idx]
        val_actions = actions[val_idx]
        val_next = next_states[val_idx]
        val_rewards = rewards[val_idx]
        val_dones = dones[val_idx]

        # Prepare validation tensors once
        dev = self.device
        val_states_t = torch.as_tensor(val_states, dtype=torch.float32, device=dev)
        val_next_t = torch.as_tensor(val_next, dtype=torch.float32, device=dev)
        val_rewards_t = torch.as_tensor(val_rewards, dtype=torch.float32, device=dev).unsqueeze(1)
        val_dones_t = torch.as_tensor(val_dones, dtype=torch.float32, device=dev).unsqueeze(1)
        val_action_onehot = self._action_to_onehot(val_actions)

        # Reset early stopping state
        self._best_val_losses = [float("inf")] * self.config.n_ensemble
        self._patience_counters = [0] * self.config.n_ensemble
        model_active = [True] * self.config.n_ensemble  # per-model early stop flag

        per_model_train_losses: List[List[float]] = [[] for _ in range(self.config.n_ensemble)]
        per_model_val_losses: List[List[float]] = [[] for _ in range(self.config.n_ensemble)]
        per_model_epochs: List[int] = [0] * self.config.n_ensemble

        n_batches_per_epoch = max(1, n_train // batch_size)

        for epoch in range(num_epochs):
            # Check if all models have stopped early
            if not any(model_active):
                logger.info("All ensemble models stopped early at epoch %d", epoch)
                break

            # Shuffle training data each epoch
            epoch_perm = np.random.permutation(n_train)

            for model_idx, (model, optimizer) in enumerate(
                zip(self.models, self.optimizers)
            ):
                if not model_active[model_idx]:
                    continue

                model.train()
                epoch_loss = 0.0

                for batch_idx in range(n_batches_per_epoch):
                    start = batch_idx * batch_size
                    end = min(start + batch_size, n_train)
                    idx = epoch_perm[start:end]

                    b_states = torch.as_tensor(
                        train_states[idx], dtype=torch.float32, device=dev
                    )
                    b_next = torch.as_tensor(
                        train_next[idx], dtype=torch.float32, device=dev
                    )
                    b_rewards = torch.as_tensor(
                        train_rewards[idx], dtype=torch.float32, device=dev
                    ).unsqueeze(1)
                    b_dones = torch.as_tensor(
                        train_dones[idx], dtype=torch.float32, device=dev
                    ).unsqueeze(1)
                    b_action_onehot = self._action_to_onehot(train_actions[idx])

                    pred_ns, pred_r, pred_d_logit, log_var = model(
                        b_states, b_action_onehot
                    )

                    # State loss: Gaussian NLL (heteroscedastic)
                    var = torch.exp(log_var).clamp(min=1e-6)
                    state_loss = 0.5 * (
                        log_var + (b_next - pred_ns) ** 2 / var
                    ).mean()

                    reward_loss = F.mse_loss(pred_r, b_rewards)
                    done_loss = F.binary_cross_entropy_with_logits(
                        pred_d_logit, b_dones
                    )

                    loss = state_loss + reward_loss + done_loss

                    optimizer.zero_grad()
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), 10.0)
                    optimizer.step()

                    epoch_loss += loss.item()

                avg_train_loss = epoch_loss / n_batches_per_epoch
                per_model_train_losses[model_idx].append(avg_train_loss)
                per_model_epochs[model_idx] = epoch + 1

                # Validation loss
                model.eval()
                with torch.no_grad():
                    pred_ns_v, pred_r_v, pred_d_v, log_var_v = model(
                        val_states_t, val_action_onehot
                    )
                    var_v = torch.exp(log_var_v).clamp(min=1e-6)
                    v_state_loss = 0.5 * (
                        log_var_v + (val_next_t - pred_ns_v) ** 2 / var_v
                    ).mean()
                    v_reward_loss = F.mse_loss(pred_r_v, val_rewards_t)
                    v_done_loss = F.binary_cross_entropy_with_logits(
                        pred_d_v, val_dones_t
                    )
                    val_loss = (v_state_loss + v_reward_loss + v_done_loss).item()

                per_model_val_losses[model_idx].append(val_loss)

                # Early stopping check for this model
                if val_loss < self._best_val_losses[model_idx]:
                    self._best_val_losses[model_idx] = val_loss
                    self._patience_counters[model_idx] = 0
                else:
                    self._patience_counters[model_idx] += 1
                    if self._patience_counters[model_idx] >= self.config.early_stop_patience:
                        model_active[model_idx] = False
                        logger.info(
                            "Model %d early stopped at epoch %d (val_loss=%.4f, best=%.4f)",
                            model_idx, epoch + 1, val_loss,
                            self._best_val_losses[model_idx],
                        )

            self.train_steps += 1

            # Log epoch summary
            active_count = sum(model_active)
            mean_val = np.mean([
                per_model_val_losses[i][-1]
                for i in range(self.config.n_ensemble)
                if per_model_val_losses[i]
            ])
            logger.info(
                "Ensemble epoch %d/%d: mean_val_loss=%.4f, active_models=%d/%d",
                epoch + 1, num_epochs, mean_val,
                active_count, self.config.n_ensemble,
            )

        return {
            "status": "trained",
            "epochs_per_model": per_model_epochs,
            "final_train_losses": [
                losses[-1] if losses else float("inf")
                for losses in per_model_train_losses
            ],
            "final_val_losses": [
                losses[-1] if losses else float("inf")
                for losses in per_model_val_losses
            ],
            "best_val_losses": self._best_val_losses,
            "n_train": n_train,
            "n_val": n_val,
        }

    # ---- Persistence --------------------------------------------------------

    def save_checkpoint(self, path: Optional[str] = None) -> str:
        """Save all ensemble members + optimisers."""
        path = path or self.config.checkpoint_path
        os.makedirs(os.path.dirname(path), exist_ok=True)

        checkpoint = {
            "models": [m.state_dict() for m in self.models],
            "optimizers": [o.state_dict() for o in self.optimizers],
            "train_steps": self.train_steps,
            "best_val_losses": self._best_val_losses,
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
        self._best_val_losses = checkpoint.get(
            "best_val_losses",
            [float("inf")] * self.config.n_ensemble,
        )
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
      cumulative discounted reward + DQN Q-value bootstrap at leaf.

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
        depth: Optional[int] = None,
        width: Optional[int] = None,
    ) -> Tuple[int, float]:
        """Plan the best action via forward tree search.

        Builds a tree: at each node, expand top-`width` actions by predicted
        immediate reward. Score leaf nodes by:
            cumulative_model_reward + gamma^depth * max_a Q(leaf_state, a)

        Prunes branches where model uncertainty > threshold.

        Args:
            state: (state_dim,) float32 current state.
            q_network: optional DQN network for leaf evaluation.
                       If None, uses cumulative world-model reward.
            num_links: number of available links (clamps action space).
            depth: override planning horizon (default from config).
            width: override planning width (default from config).

        Returns:
            (best_action, expected_return) -- action leading to highest leaf.
        """
        # Clear cache for new planning round
        self._cache.clear()

        horizon = depth if depth is not None else self.config.planning_horizon
        beam_width = width if width is not None else self.config.planning_width

        action_dim = self.config.action_dim
        if num_links is not None:
            action_dim = min(num_links, action_dim)

        # Evaluate each root action
        best_action = 0
        best_return = -float("inf")

        # Pre-screen all root actions: predict outcomes, rank by reward
        root_predictions: List[Tuple[int, np.ndarray, float, float, float]] = []
        for action in range(action_dim):
            ns, r, done, unc = self._predict_cached(state, action)
            root_predictions.append((action, ns, r, done, unc))

        # Sort by predicted immediate reward, take top beam_width
        root_predictions.sort(key=lambda x: x[2], reverse=True)
        top_root = root_predictions[:beam_width]

        for action, ns, r, done, unc in top_root:
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
                    max_depth=horizon,
                    beam_width=beam_width,
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
        max_depth: int,
        beam_width: int,
    ) -> float:
        """Recursively expand a tree node.

        At leaf depth (depth == max_depth):
        - If q_network is provided, bootstrap with max Q-value.
        - Otherwise, return cumulative discounted reward.

        At intermediate depth:
        - Expand top beam_width actions, pick the best subtree.
        """
        # Leaf node: score it
        if depth >= max_depth:
            return self._evaluate_leaf(
                state, cumulative_reward, discount, depth, q_network
            )

        # Expand children
        action_dim = self.config.action_dim
        best_child_return = -float("inf")

        # Pre-screen actions: predict all, sort by immediate reward, take top-K
        action_scores: List[Tuple[int, float, np.ndarray, float, float]] = []
        for action in range(action_dim):
            ns, r, done, unc = self._predict_cached(state, action)
            action_scores.append((action, r, ns, done, unc))

        # Sort by predicted reward, take top beam_width
        action_scores.sort(key=lambda x: x[1], reverse=True)
        top_actions = action_scores[:beam_width]

        for action, r, ns, done, unc in top_actions:
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
                    max_depth,
                    beam_width,
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

        return = cumulative_reward + gamma^depth * max_a Q(state, a)

        If q_network not available, returns cumulative discounted reward from
        the world model trajectory alone.
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


# ======================= WebDreamer Planner (LLM Look-Ahead) ================

class WebDreamerPlanner:
    """LLM-based look-ahead simulation for crawl decisions (WebDreamer).

    Uses a local LLM (DeepSeek or Qwen via MLX) to simulate what content
    lies behind a candidate URL before actually fetching it. This is the
    text-only adaptation of WebDreamer (arXiv:2411.06559) for B2B crawling:
    no screenshots needed -- URL pattern + anchor text + page context suffice.

    MPC strategy: simulate top-K candidate URLs, pick the one with highest
    predicted quality for B2B lead discovery.

    Rate-limited to max_simulations_per_step (default 5) to stay within the
    latency budget (~2s per decision on local 3B model).

    Falls back to DQN action selection when LLM is not available or on error.
    """

    def __init__(self, config: Optional[WorldModelConfig] = None) -> None:
        self.config = config or WorldModelConfig()
        self._llm_available: bool = False
        self._simulation_count: int = 0
        self._fallback_count: int = 0
        self._total_latency_ms: float = 0.0

        # Try to connect to local LLM endpoint
        self._check_llm_availability()

    def _check_llm_availability(self) -> None:
        """Probe the local LLM endpoint for availability."""
        if not self.config.webdreamer_enabled:
            self._llm_available = False
            return

        try:
            import urllib.request
            req = urllib.request.Request(
                self.config.llm_endpoint + "/models",
                method="GET",
            )
            req.add_header("Content-Type", "application/json")
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    self._llm_available = True
                    logger.info(
                        "WebDreamer LLM endpoint available at %s",
                        self.config.llm_endpoint,
                    )
        except Exception as exc:
            self._llm_available = False
            logger.debug(
                "WebDreamer LLM endpoint not available: %s", exc
            )

    @property
    def is_available(self) -> bool:
        """Whether the LLM endpoint is reachable."""
        return self._llm_available and self.config.webdreamer_enabled

    # ---- Single action simulation -------------------------------------------

    def simulate_action(
        self,
        state: Dict[str, str],
        action_description: Dict[str, str],
    ) -> SimulationResult:
        """Use local LLM to predict crawl outcome for a candidate URL.

        This is the core WebDreamer world model call -- predict what content
        we would find after following a link, without actually fetching it.

        Args:
            state: dict with keys: url, title, summary (current page context)
            action_description: dict with keys: url, anchor_text, url_pattern,
                                surrounding_context

        Returns:
            SimulationResult with predicted page type, quality, confidence.
        """
        if not self.is_available:
            return SimulationResult(
                predicted_page_type="unknown",
                predicted_quality=0.5,
                confidence=0.0,
                reasoning="LLM not available, returning default",
            )

        prompt = self._build_simulation_prompt(state, action_description)

        try:
            start_ms = time.monotonic() * 1000
            response = self._call_llm(prompt)
            elapsed_ms = time.monotonic() * 1000 - start_ms
            self._total_latency_ms += elapsed_ms
            self._simulation_count += 1

            return self._parse_simulation_response(response)
        except Exception as exc:
            logger.debug("WebDreamer simulation failed: %s", exc)
            self._fallback_count += 1
            return SimulationResult(
                predicted_page_type="unknown",
                predicted_quality=0.5,
                confidence=0.0,
                reasoning=f"Simulation error: {exc}",
            )

    def _build_simulation_prompt(
        self,
        state: Dict[str, str],
        action: Dict[str, str],
    ) -> str:
        """Build the LLM prompt for URL outcome prediction.

        Follows WebDreamer's insight: use LLM world knowledge to predict
        what content lies behind a link before following it.
        """
        return f"""You are a web navigation prediction model for B2B lead discovery.

Given this company webpage:
URL: {state.get('url', 'unknown')}
Title: {state.get('title', 'unknown')}
Page context: {state.get('summary', 'unknown')[:500]}

If we follow this link:
Target URL: {action.get('url', 'unknown')}
Anchor text: {action.get('anchor_text', 'unknown')}
URL pattern: {action.get('url_pattern', 'unknown')}
Surrounding text: {action.get('surrounding_context', '')[:200]}

Predict what content we will find. Respond in JSON:
{{
  "page_type": "careers|about|team|contact|blog|product|pricing|other|irrelevant",
  "quality": 0.0-1.0,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}}

Quality scoring:
- 1.0: Job listings with remote EU AI/ML positions
- 0.8: Team/engineering pages with decision-maker info
- 0.6: Company about/contact pages
- 0.4: General careers pages
- 0.2: Blog/product pages
- 0.0: Irrelevant (login, TOS, external links)

Respond ONLY with the JSON object."""

    def _call_llm(self, prompt: str) -> str:
        """Call the local LLM endpoint (OpenAI-compatible API).

        Uses urllib to avoid adding a dependency. Timeout from config.
        """
        import urllib.request

        payload = json.dumps({
            "model": self.config.llm_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.config.llm_temperature,
            "max_tokens": 200,
        }).encode("utf-8")

        req = urllib.request.Request(
            self.config.llm_endpoint + "/chat/completions",
            data=payload,
            method="POST",
        )
        req.add_header("Content-Type", "application/json")

        timeout_s = self.config.simulation_timeout_ms / 1000.0
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]

    def _parse_simulation_response(self, response: str) -> SimulationResult:
        """Parse LLM JSON response into SimulationResult.

        Robust to minor formatting issues (e.g. markdown code blocks).
        """
        # Strip markdown code block if present
        text = response.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last lines (```json and ```)
            text = "\n".join(lines[1:-1] if len(lines) > 2 else lines[1:])
            text = text.strip()
        if text.startswith("```"):
            text = text[3:].strip()
        if text.endswith("```"):
            text = text[:-3].strip()

        try:
            data = json.loads(text)
            return SimulationResult(
                predicted_page_type=str(data.get("page_type", "unknown")),
                predicted_quality=float(data.get("quality", 0.5)),
                confidence=float(data.get("confidence", 0.5)),
                reasoning=str(data.get("reasoning", "")),
            )
        except (json.JSONDecodeError, TypeError, ValueError):
            # Fallback: try to extract numbers from text
            logger.debug("Failed to parse LLM response as JSON: %s", text[:100])
            return SimulationResult(
                predicted_page_type="unknown",
                predicted_quality=0.5,
                confidence=0.3,
                reasoning=f"Parse error, raw: {text[:100]}",
            )

    # ---- MPC planning with simulation ---------------------------------------

    def plan_with_simulation(
        self,
        state: Dict[str, str],
        candidates: List[Dict[str, str]],
        max_simulations: Optional[int] = None,
    ) -> Tuple[int, float]:
        """Simulate top-K candidate URLs and pick the best one.

        Implements WebDreamer's MPC strategy:
        1. Take the top max_simulations candidates (by heuristic pre-ranking)
        2. Simulate each via LLM world model
        3. Return the candidate with highest predicted quality

        Args:
            state: current page context (url, title, summary).
            candidates: list of link descriptions, each with url, anchor_text,
                        url_pattern, surrounding_context.
            max_simulations: override max simulations per step.

        Returns:
            (best_candidate_index, predicted_quality)
        """
        max_sim = max_simulations or self.config.max_simulations_per_step
        n_candidates = len(candidates)

        if not self.is_available or n_candidates == 0:
            return 0, 0.5

        # Limit simulations to budget
        n_to_simulate = min(n_candidates, max_sim)

        # Pre-rank candidates by simple URL heuristics before expensive LLM calls
        # (mirrors WebDreamer's self-refinement stage)
        ranked_indices = self._heuristic_prerank(candidates)
        top_indices = ranked_indices[:n_to_simulate]

        best_idx = top_indices[0] if top_indices else 0
        best_quality = -1.0

        for idx in top_indices:
            result = self.simulate_action(state, candidates[idx])

            # Weight by confidence: quality * confidence
            weighted_quality = result.predicted_quality * result.confidence

            if weighted_quality > best_quality:
                best_quality = weighted_quality
                best_idx = idx

        return best_idx, max(best_quality, 0.0)

    def _heuristic_prerank(
        self, candidates: List[Dict[str, str]]
    ) -> List[int]:
        """Pre-rank candidates by URL pattern heuristics.

        High-value URL patterns for B2B crawling:
        - /careers, /jobs, /openings -> highest
        - /about, /team, /people -> high
        - /contact -> medium
        - /blog, /news -> low
        - everything else -> lowest

        This mirrors WebDreamer's self-refinement stage (Stage 2) but uses
        deterministic pattern matching instead of an LLM call.
        """
        PATTERN_SCORES = {
            "career": 1.0, "job": 1.0, "opening": 1.0, "position": 1.0,
            "vacanc": 0.9, "hiring": 0.9, "recruit": 0.9,
            "about": 0.7, "team": 0.7, "people": 0.7, "who-we-are": 0.7,
            "engineer": 0.8, "ai": 0.8, "machine-learning": 0.8, "ml": 0.8,
            "contact": 0.5,
            "blog": 0.2, "news": 0.2, "press": 0.2,
            "login": 0.0, "sign": 0.0, "auth": 0.0, "terms": 0.0,
            "privacy": 0.0, "cookie": 0.0,
        }

        scored: List[Tuple[int, float]] = []
        for i, cand in enumerate(candidates):
            url = cand.get("url", "").lower()
            anchor = cand.get("anchor_text", "").lower()
            combined = url + " " + anchor

            score = 0.1  # default
            for pattern, s in PATTERN_SCORES.items():
                if pattern in combined:
                    score = max(score, s)

            scored.append((i, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [idx for idx, _ in scored]

    # ---- Diagnostics --------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        """Return WebDreamer simulation statistics."""
        total = max(self._simulation_count + self._fallback_count, 1)
        avg_latency = (
            self._total_latency_ms / max(self._simulation_count, 1)
        )
        return {
            "llm_available": self._llm_available,
            "simulations_completed": self._simulation_count,
            "fallbacks": self._fallback_count,
            "simulation_ratio": self._simulation_count / total,
            "avg_latency_ms": avg_latency,
        }


# ======================= Dyna Trainer (Synthetic Experience) =================

class DynaTrainer:
    """Generates synthetic experience from the world model for DQN training.

    Implements Dyna-Q (Sutton 1991): use the learned world model to generate
    additional training transitions for the DQN without actual environment
    interaction.

    Quality filtering: only transitions where ensemble uncertainty is below
    dyna_uncertainty_threshold are added. This prevents the DQN from training
    on hallucinated dynamics.

    Ratio control: max dyna_ratio synthetic transitions per real transition
    in the replay buffer (default 0.3), preventing model exploitation.
    """

    def __init__(
        self,
        world_model: EnsembleWorldModel,
        config: Optional[WorldModelConfig] = None,
    ) -> None:
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for DynaTrainer")

        self.world_model = world_model
        self.config = config or world_model.config

        # Counters
        self._generated_count: int = 0
        self._filtered_count: int = 0
        self._total_rollouts: int = 0

    def generate_synthetic_experience(
        self,
        n: int,
        start_states: Optional[np.ndarray] = None,
    ) -> List[Transition]:
        """Generate synthetic transitions by rolling out the world model.

        For each synthetic trajectory:
        1. Sample a start state from start_states or the world model buffer.
        2. Roll out for dyna_rollout_length steps using random actions.
        3. At each step, check ensemble uncertainty.
        4. Only include transitions below the uncertainty threshold.

        Args:
            n: number of synthetic rollouts to attempt.
            start_states: (N, state_dim) array of states to start from.
                          If None, samples from the world model's buffer.

        Returns:
            List of quality-filtered Transition instances (labeled synthetic).
        """
        if not self.world_model.has_enough_data:
            return []

        transitions: List[Transition] = []
        rollout_length = self.config.dyna_rollout_length
        unc_threshold = self.config.dyna_uncertainty_threshold

        for rollout_idx in range(n):
            # Pick a start state
            if start_states is not None and len(start_states) > 0:
                idx = np.random.randint(0, len(start_states))
                state = start_states[idx].copy()
            else:
                # Sample from world model's buffer
                buf_size = self.world_model.buffer_size
                idx = np.random.randint(0, buf_size)
                state = np.array(
                    list(self.world_model._buffer_states)[idx],
                    dtype=np.float32,
                )

            self._total_rollouts += 1

            for step in range(rollout_length):
                # Random action (could use DQN policy for more focused rollouts)
                action = np.random.randint(0, self.config.action_dim)

                # Predict next state via ensemble
                next_state, reward, done_prob, uncertainty = (
                    self.world_model.predict(state, action)
                )

                # Quality filter: only include low-uncertainty transitions
                if uncertainty < unc_threshold:
                    done_val = 1.0 if done_prob > 0.5 else 0.0
                    transitions.append(Transition(
                        state=state.copy(),
                        action=action,
                        reward=reward,
                        next_state=next_state.copy(),
                        done=done_val,
                        is_synthetic=True,
                    ))
                    self._generated_count += 1
                else:
                    self._filtered_count += 1
                    # High uncertainty -- stop this rollout early
                    break

                # Advance state
                state = next_state.copy()

                # Check if predicted done
                if done_prob > 0.5:
                    break

        return transitions

    def generate_and_add_to_buffer(
        self,
        replay_buffer: Any,
        real_buffer_size: int,
    ) -> int:
        """Generate synthetic experience and add to replay buffer.

        Respects dyna_ratio: the total number of synthetic transitions
        added is capped at dyna_ratio * real_buffer_size.

        Args:
            replay_buffer: must support .add(state, action, reward, next_state, done)
                           or .add_transition(...).
            real_buffer_size: current number of real transitions in the buffer.

        Returns:
            Number of synthetic transitions actually added.
        """
        max_synthetic = int(real_buffer_size * self.config.dyna_ratio)
        n_rollouts = self.config.dyna_batch_size

        transitions = self.generate_synthetic_experience(n_rollouts)

        # Cap to max allowed synthetic transitions
        transitions = transitions[:max_synthetic]

        added = 0
        for t in transitions:
            try:
                if hasattr(replay_buffer, 'add'):
                    replay_buffer.add(
                        t.state, t.action, t.reward, t.next_state, t.done
                    )
                elif hasattr(replay_buffer, 'add_transition'):
                    replay_buffer.add_transition(
                        t.state, t.action, t.reward, t.next_state, t.done
                    )
                added += 1
            except Exception as exc:
                logger.debug("Failed to add synthetic transition: %s", exc)
                break

        if added > 0:
            logger.info(
                "Dyna: added %d synthetic transitions (from %d rollouts, "
                "%d filtered, ratio=%.2f)",
                added, n_rollouts, self._filtered_count,
                added / max(real_buffer_size, 1),
            )

        return added

    # ---- Diagnostics --------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        """Return Dyna generation statistics."""
        total_attempts = self._generated_count + self._filtered_count
        return {
            "total_rollouts": self._total_rollouts,
            "generated_transitions": self._generated_count,
            "filtered_transitions": self._filtered_count,
            "acceptance_rate": (
                self._generated_count / max(total_attempts, 1)
            ),
        }


# ======================= Model-Based Agent ==================================

class ModelBasedAgent:
    """Combines DQN with world-model tree-search planning and WebDreamer.

    Decision logic:
    - When world model uncertainty is low AND step > warmup:
      use tree-search planning.
    - When WebDreamer LLM is available AND decision is high-value:
      use LLM look-ahead simulation.
    - Otherwise: fall back to epsilon-greedy DQN.
    - Gradual blending: as the model improves (lower avg uncertainty),
      the planning weight ramps from 0.0 to 0.8 over warmup steps.

    Integrates Dyna-style synthetic experience generation: periodically
    uses the world model to generate synthetic training data for the DQN.

    Requires a DoubleDQNAgent (from crawler_dqn) for the DQN fallback.
    """

    def __init__(
        self,
        dqn_agent: Any,  # DoubleDQNAgent from crawler_dqn
        world_model: EnsembleWorldModel,
        planner: TreeSearchPlanner,
        config: Optional[WorldModelConfig] = None,
        webdreamer: Optional[WebDreamerPlanner] = None,
        dyna_trainer: Optional[DynaTrainer] = None,
    ) -> None:
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for ModelBasedAgent")

        self.dqn_agent = dqn_agent
        self.world_model = world_model
        self.planner = planner
        self.config = config or world_model.config
        self.webdreamer = webdreamer
        self.dyna_trainer = dyna_trainer

        # Track planning usage stats
        self._planning_used: int = 0
        self._dqn_fallback_used: int = 0
        self._webdreamer_used: int = 0
        self._total_decisions: int = 0

        # Track recent uncertainties for adaptive thresholding
        self._recent_uncertainties: List[float] = []

        logger.info(
            "ModelBasedAgent initialised (webdreamer=%s, dyna=%s)",
            webdreamer is not None,
            dyna_trainer is not None,
        )

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

    def _is_model_confident(self, state: np.ndarray) -> bool:
        """Check if the world model is confident enough to plan.

        Probes the model with a few random actions and checks if the
        average uncertainty is below the threshold.
        """
        n_probe = min(3, self.config.action_dim)
        uncertainties = []
        for a in range(n_probe):
            _, _, _, unc = self.world_model.predict(state, a)
            uncertainties.append(unc)

        avg_unc = float(np.mean(uncertainties))
        self._recent_uncertainties.append(avg_unc)
        if len(self._recent_uncertainties) > 100:
            self._recent_uncertainties = self._recent_uncertainties[-50:]

        return avg_unc < self.config.uncertainty_threshold

    # ---- Action selection ---------------------------------------------------

    def select_action(
        self,
        state: np.ndarray,
        num_links: int,
        global_step: int,
        page_context: Optional[Dict[str, str]] = None,
        link_candidates: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[int, float]:
        """Select action blending DQN, tree-search, and WebDreamer.

        Decision hierarchy:
        1. Epsilon-greedy random exploration (DQN epsilon schedule)
        2. If world model confident AND step > warmup: tree-search planning
        3. If WebDreamer available AND candidates provided: LLM look-ahead
        4. Otherwise: greedy DQN action selection

        Args:
            state: (state_dim,) float32 array.
            num_links: number of available link candidates.
            global_step: current global training step.
            page_context: optional dict for WebDreamer (url, title, summary).
            link_candidates: optional list of link descriptions for WebDreamer.

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

        # Decision path 1: Tree-search planning
        use_planning = (
            planning_weight > 0.0
            and np.random.random() < planning_weight
            and self.world_model.has_enough_data
            and self._is_model_confident(state)
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
                logger.debug("Planning failed, trying alternatives: %s", exc)

        # Decision path 2: WebDreamer LLM look-ahead
        if (
            self.webdreamer is not None
            and self.webdreamer.is_available
            and page_context is not None
            and link_candidates is not None
            and len(link_candidates) > 0
        ):
            try:
                wd_action, wd_quality = self.webdreamer.plan_with_simulation(
                    page_context, link_candidates
                )
                # Only use WebDreamer if quality prediction is confident
                if wd_quality > 0.3:
                    self._webdreamer_used += 1
                    return min(wd_action, action_dim - 1), epsilon
            except Exception as exc:
                logger.debug("WebDreamer failed, falling back to DQN: %s", exc)

        # Decision path 3: DQN greedy
        self._dqn_fallback_used += 1
        state_t = torch.as_tensor(
            state, dtype=torch.float32,
            device=self.dqn_agent.device,
        ).unsqueeze(0)
        with torch.no_grad():
            q_values = self.dqn_agent.q_network(state_t).cpu().numpy().flatten()
        valid_q = q_values[:action_dim]
        return int(np.argmax(valid_q)), epsilon

    # ---- Dyna integration ---------------------------------------------------

    def maybe_generate_synthetic_data(
        self,
        replay_buffer: Any,
        real_buffer_size: int,
        global_step: int,
    ) -> int:
        """Periodically generate synthetic experience via Dyna.

        Called every model_train_interval steps. Uses the world model to
        generate synthetic transitions and add them to the replay buffer.

        Args:
            replay_buffer: the DQN's replay buffer.
            real_buffer_size: number of real transitions.
            global_step: current training step.

        Returns:
            Number of synthetic transitions added (0 if not due or no trainer).
        """
        if self.dyna_trainer is None:
            return 0

        if global_step % self.config.model_train_interval != 0:
            return 0

        if not self.world_model.has_enough_data:
            return 0

        return self.dyna_trainer.generate_and_add_to_buffer(
            replay_buffer, real_buffer_size
        )

    # ---- Diagnostics --------------------------------------------------------

    def get_usage_stats(self) -> Dict[str, Any]:
        """Return planning vs DQN vs WebDreamer usage statistics."""
        total = max(self._total_decisions, 1)
        stats: Dict[str, Any] = {
            "total_decisions": self._total_decisions,
            "planning_used": self._planning_used,
            "dqn_fallback_used": self._dqn_fallback_used,
            "webdreamer_used": self._webdreamer_used,
            "planning_ratio": self._planning_used / total,
            "dqn_ratio": self._dqn_fallback_used / total,
            "webdreamer_ratio": self._webdreamer_used / total,
            "avg_uncertainty": (
                float(np.mean(self._recent_uncertainties))
                if self._recent_uncertainties
                else float("inf")
            ),
        }

        if self.webdreamer is not None:
            stats["webdreamer_stats"] = self.webdreamer.get_stats()

        if self.dyna_trainer is not None:
            stats["dyna_stats"] = self.dyna_trainer.get_stats()

        return stats


# ======================= Model Trainer ======================================

class ModelTrainer:
    """Trains the ensemble world model from replay buffer data.

    Tracks prediction accuracy metrics:
    - state_mse: mean squared error of next-state predictions
    - reward_mae: mean absolute error of reward predictions
    - done_accuracy: classification accuracy of done predictions

    These metrics indicate whether the world model is reliable enough
    for tree-search planning to be useful.

    Supports both single-epoch training (train_epoch) and full multi-epoch
    training with early stopping (train_full).
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

    # ---- Full training (delegates to EnsembleWorldModel.train) ---------------

    def train_full(
        self,
        replay_buffer: Optional[Any] = None,
        num_epochs: Optional[int] = None,
        batch_size: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Full multi-epoch training with early stopping.

        Delegates to EnsembleWorldModel.train() which handles:
        - Train/validation split
        - Per-model early stopping
        - Proper batch iteration

        After training, updates accuracy metrics on the validation data.

        Args:
            replay_buffer: external replay buffer or None for internal buffer.
            num_epochs: override max epochs.
            batch_size: override batch size.

        Returns:
            Training summary dict from EnsembleWorldModel.train().
        """
        result = self.world_model.train(
            replay_buffer=replay_buffer,
            num_epochs=num_epochs,
            batch_size=batch_size,
        )

        if result.get("status") == "trained":
            # Update accuracy metrics after training
            self._update_accuracy_from_buffer()
            self._epoch_count += sum(result.get("epochs_per_model", [0]))

            # Record losses
            for loss in result.get("final_train_losses", []):
                if loss < float("inf"):
                    self._loss_history.append(loss)

        return result

    def _update_accuracy_from_buffer(self) -> None:
        """Evaluate current model accuracy on a sample from the buffer."""
        if not self.world_model.has_enough_data:
            return

        # Sample a small batch for evaluation
        buf_size = self.world_model.buffer_size
        n_eval = min(256, buf_size)
        indices = np.random.randint(0, buf_size, size=n_eval)

        states_list = list(self.world_model._buffer_states)
        actions_list = list(self.world_model._buffer_actions)
        next_list = list(self.world_model._buffer_next_states)
        rewards_list = list(self.world_model._buffer_rewards)
        dones_list = list(self.world_model._buffer_dones)

        states = np.array([states_list[i] for i in indices], dtype=np.float32)
        actions = np.array([actions_list[i] for i in indices], dtype=np.int64)
        next_states = np.array([next_list[i] for i in indices], dtype=np.float32)
        rewards = np.array([rewards_list[i] for i in indices], dtype=np.float32)
        dones = np.array([dones_list[i] for i in indices], dtype=np.float32)

        self._update_accuracy_metrics(states, actions, next_states, rewards, dones)

    # ---- Single-epoch training (backward compatible) -------------------------

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
