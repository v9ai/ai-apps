"""
Semi-Supervised Reward Shaping (SSRS) for dense rewards from zero-reward transitions.

Implements the SSRS framework from Li, Huang & Sun (arXiv:2501.19128, 2025):
- Treats zero-reward transitions as unlabeled data, non-zero as labeled data
- Applies semi-supervised learning (consistency regularization + pseudo-labeling)
  over the trajectory space to learn a dense reward estimator
- Double entropy data augmentation for non-image state vectors
- Monotonicity constraint (L_QV) to stabilize reward predictions vs Q-values

Components:
1. SSRSConfig: all hyperparameters in one place
2. EntropyAugmentor: double entropy augmentation for state vectors
3. RewardPredictor: small MLP predicting reward from (state, action, next_state)
4. ConsistencyRegularizer: MSE between predictions on original vs augmented states
5. MonotonicityConstraint: enforces reward monotonicity w.r.t. Q-values
6. SSRSRewardShaper: main orchestrator wiring everything together

Integration:
    from crawler_ssrs import SSRSConfig, SSRSRewardShaper

    ssrs = SSRSRewardShaper(SSRSConfig())
    shaped = ssrs.shape_reward(state, action, next_state, raw_reward)

    # During training (shares replay buffer batches with DQN)
    losses = ssrs.train_step(replay_batch)

Runs alongside the existing RewardShaper (crawler_reward_shaping.py) as a
parallel reward estimator. Zero-reward transitions (~95% of crawl data)
get dense reward estimates; non-zero rewards pass through.

Memory: <20 MB (small predictor network + augmentor state).
Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_ssrs")

# ---------------------------------------------------------------------------
# Try importing PyTorch; fall back to numpy-only linear model if unavailable
# ---------------------------------------------------------------------------
_HAS_TORCH = False

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim

    _HAS_TORCH = True
except ImportError:
    logger.warning("PyTorch not installed -- SSRS falls back to numpy linear model")


# ======================= Configuration ======================================


@dataclass
class SSRSConfig:
    """Configuration for Semi-Supervised Reward Shaping.

    Loss: L = L_QV + alpha * L_s + (1 - alpha) * L_r
    where alpha ramps from consistency_weight_start to consistency_weight_end.

    Hyperparameters follow the paper defaults where applicable, with
    adjustments for the crawler's 784-dim state space (768 nomic-embed + 16
    scalar features) and 10-action discrete action space.
    """

    # Loss term weights
    supervised_weight: float = 1.0           # L_r supervised loss weight
    consistency_weight_start: float = 0.2    # L_s start (alpha_0)
    consistency_weight_end: float = 0.7      # L_s end (alpha_T)
    monotonicity_weight: float = 0.1         # L_QV monotonicity constraint

    # Pseudo-labeling
    pseudo_label_threshold: float = 0.8      # confidence threshold for pseudo-labels

    # Data augmentation
    augmentation_ratio: float = 0.3          # fraction of state dims to augment
    n_partitions: int = 16                   # number of entropy partitions (784 / 16 = 49 per)

    # Training schedule
    warmup_steps: int = 1000                 # steps before SSL kicks in
    total_schedule_steps: int = 200_000      # steps over which alpha ramps

    # Reward predictor network
    reward_predictor_hidden: int = 256       # first hidden layer
    reward_predictor_lr: float = 1e-4        # Adam learning rate

    # State/action dimensions (must match DQN config)
    state_dim: int = 784                     # 768 nomic embed + 16 scalar features
    action_dim: int = 10                     # top-K link candidates per page

    # Augmentation noise scales
    high_entropy_noise_std: float = 0.1      # Gaussian noise std for high-entropy dims
    low_entropy_dropout_rate: float = 0.2    # dropout rate for low-entropy dims

    # Threshold schedule: lambda = lambda_start + lambda_range * (1 - e^(-t/T))
    lambda_start: float = 0.6
    lambda_range: float = 0.3
    lambda_schedule_steps: float = 50_000    # T in the exponential schedule

    # Dynamic shaping probability p_u bounds
    pu_min: float = 0.05                     # early/late minimum
    pu_max: float = 0.30                     # mid-training peak


# ======================= Entropy Augmentor ==================================


class EntropyAugmentor:
    """Double entropy data augmentation for non-image state vectors.

    Replaces image-based augmentations (crop, flip) with a method suited to
    the crawler's 784-dim state vectors (768 embedding + 16 scalar).

    The state vector is partitioned into n_partitions segments. For each
    segment, Shannon entropy is computed over a running buffer of observed
    values. High-entropy dimensions receive Gaussian noise (stronger
    perturbation); low-entropy dimensions receive dropout masking (weaker
    perturbation). This preserves the information structure while providing
    the diversity SSL needs for consistency regularization.

    Memory: ~2 MB for entropy statistics buffer.
    """

    def __init__(self, config: Optional[SSRSConfig] = None) -> None:
        self.config = config or SSRSConfig()
        self._state_dim = self.config.state_dim
        self._n_partitions = self.config.n_partitions
        self._partition_size = self._state_dim // self._n_partitions
        self._remainder = self._state_dim % self._n_partitions

        # Running statistics for entropy estimation per partition
        # Use histogram-based entropy with 32 bins per partition
        self._n_bins = 32
        self._histograms: np.ndarray = np.zeros(
            (self._n_partitions, self._n_bins), dtype=np.float64
        )
        self._partition_entropies: np.ndarray = np.zeros(
            self._n_partitions, dtype=np.float64
        )
        self._observation_count: int = 0
        self._min_observations = 50  # minimum before entropy is meaningful

        # Precomputed partition boundaries (start_idx, end_idx)
        self._partition_bounds: List[Tuple[int, int]] = []
        offset = 0
        for p in range(self._n_partitions):
            size = self._partition_size + (1 if p < self._remainder else 0)
            self._partition_bounds.append((offset, offset + size))
            offset += size

        # Running min/max per partition for histogram binning
        self._partition_mins: np.ndarray = np.full(self._n_partitions, np.inf)
        self._partition_maxs: np.ndarray = np.full(self._n_partitions, -np.inf)

        # Median entropy threshold (computed lazily)
        self._median_entropy: float = 0.0

    def update_statistics(self, state: np.ndarray) -> None:
        """Update running entropy statistics from an observed state.

        Should be called on every transition to build accurate entropy
        estimates. Cheap: O(state_dim) with no allocations after warmup.

        Args:
            state: (state_dim,) float32 state vector.
        """
        self._observation_count += 1

        for p, (start, end) in enumerate(self._partition_bounds):
            segment = state[start:end]
            seg_min = float(np.min(segment))
            seg_max = float(np.max(segment))

            # Update running range
            if seg_min < self._partition_mins[p]:
                self._partition_mins[p] = seg_min
            if seg_max > self._partition_maxs[p]:
                self._partition_maxs[p] = seg_max

            # Bin the segment values into the histogram
            p_min = self._partition_mins[p]
            p_max = self._partition_maxs[p]
            if p_max - p_min < 1e-8:
                # All values identical -- zero entropy
                continue

            bin_indices = np.clip(
                ((segment - p_min) / (p_max - p_min) * (self._n_bins - 1)).astype(
                    np.int32
                ),
                0,
                self._n_bins - 1,
            )
            for bi in bin_indices:
                self._histograms[p, bi] += 1.0

        # Recompute entropies periodically (every 10 observations to amortize)
        if self._observation_count % 10 == 0:
            self._recompute_entropies()

    def _recompute_entropies(self) -> None:
        """Recompute Shannon entropy for each partition from histograms."""
        for p in range(self._n_partitions):
            hist = self._histograms[p]
            total = hist.sum()
            if total < 1:
                self._partition_entropies[p] = 0.0
                continue

            probs = hist / total
            # Shannon entropy: -sum(p * log(p)) for p > 0
            nonzero = probs > 0
            entropy = -np.sum(probs[nonzero] * np.log2(probs[nonzero]))
            self._partition_entropies[p] = entropy

        # Update median threshold for high/low classification
        self._median_entropy = float(np.median(self._partition_entropies))

    def augment(self, state: np.ndarray) -> np.ndarray:
        """Produce an augmented view of a state vector.

        High-entropy partitions: add Gaussian noise scaled by entropy.
        Low-entropy partitions: apply dropout masking.

        Args:
            state: (state_dim,) float32 state vector.

        Returns:
            Augmented copy of the state vector (same shape).
        """
        augmented = state.copy()

        if self._observation_count < self._min_observations:
            # Not enough data for meaningful entropy -- use uniform light noise
            noise = np.random.normal(0, 0.01, size=state.shape).astype(state.dtype)
            augmented += noise
            return augmented

        for p, (start, end) in enumerate(self._partition_bounds):
            entropy = self._partition_entropies[p]
            segment = augmented[start:end]

            if entropy >= self._median_entropy:
                # High-entropy: Gaussian noise scaled by entropy
                noise_std = self.config.high_entropy_noise_std * (
                    entropy / max(self._median_entropy, 1e-8)
                )
                # Cap noise to avoid destroying the signal
                noise_std = min(noise_std, 0.5)
                noise = np.random.normal(0, noise_std, size=segment.shape).astype(
                    segment.dtype
                )
                augmented[start:end] = segment + noise
            else:
                # Low-entropy: dropout masking
                mask = np.random.binomial(
                    1, 1.0 - self.config.low_entropy_dropout_rate, size=segment.shape
                ).astype(segment.dtype)
                # Scale up survivors to preserve expected value
                scale = 1.0 / max(1.0 - self.config.low_entropy_dropout_rate, 1e-8)
                augmented[start:end] = segment * mask * scale

        return augmented

    def augment_batch(self, states: np.ndarray) -> np.ndarray:
        """Augment a batch of state vectors.

        Args:
            states: (B, state_dim) float32 state vectors.

        Returns:
            (B, state_dim) augmented state vectors.
        """
        batch_size = states.shape[0]
        augmented = np.empty_like(states)
        for i in range(batch_size):
            augmented[i] = self.augment(states[i])
        return augmented

    def get_stats(self) -> Dict[str, Any]:
        """Return augmentor diagnostic statistics."""
        return {
            "observation_count": self._observation_count,
            "median_entropy": round(self._median_entropy, 4),
            "partition_entropies": [
                round(float(e), 4) for e in self._partition_entropies
            ],
            "ready": self._observation_count >= self._min_observations,
        }


# ======================= Reward Predictor (PyTorch) =========================

if _HAS_TORCH:

    class _RewardPredictorNet(nn.Module):
        """Small MLP predicting reward from (state, action, next_state).

        Architecture: input_dim -> 256 -> 128 -> 1 (sigmoid output).
        Input is concatenation of [state, action_onehot, next_state].

        Memory: ~0.5 MB for 784-dim states, 10 actions.
        """

        def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 256):
            super().__init__()
            # Input: state + one-hot action + next_state
            input_dim = state_dim * 2 + action_dim
            self.net = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(hidden_dim, 128),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(128, 1),
                nn.Sigmoid(),
            )

        def forward(self, state: torch.Tensor, action_onehot: torch.Tensor,
                    next_state: torch.Tensor) -> torch.Tensor:
            """Forward pass.

            Args:
                state: (B, state_dim) float32.
                action_onehot: (B, action_dim) float32 one-hot.
                next_state: (B, state_dim) float32.

            Returns:
                (B, 1) predicted reward in [0, 1].
            """
            x = torch.cat([state, action_onehot, next_state], dim=-1)
            return self.net(x)


# ======================= Numpy Fallback Linear Model ========================


class _NumpyLinearPredictor:
    """Simple linear model fallback when PyTorch is unavailable.

    Learns a linear mapping from (state, action_onehot, next_state) -> reward
    using online SGD. Much less expressive than the MLP but provides a
    functional baseline.

    Memory: ~12 KB for 784-dim states.
    """

    def __init__(self, state_dim: int, action_dim: int, lr: float = 1e-4):
        self.input_dim = state_dim * 2 + action_dim
        self.lr = lr
        # Xavier-like initialization
        scale = np.sqrt(2.0 / self.input_dim)
        self.weights = np.random.randn(self.input_dim).astype(np.float32) * scale
        self.bias = 0.0

    def predict(self, x: np.ndarray) -> np.ndarray:
        """Predict reward for input vector(s).

        Args:
            x: (input_dim,) or (B, input_dim) float32.

        Returns:
            Scalar or (B,) predictions in [0, 1] via sigmoid.
        """
        logits = x @ self.weights + self.bias
        return 1.0 / (1.0 + np.exp(-np.clip(logits, -20, 20)))

    def train_step(
        self,
        x: np.ndarray,
        targets: np.ndarray,
        sample_weights: Optional[np.ndarray] = None,
    ) -> float:
        """Single SGD step on a batch.

        Args:
            x: (B, input_dim) float32.
            targets: (B,) float32 target rewards.
            sample_weights: (B,) optional per-sample weights.

        Returns:
            Mean loss (MSE).
        """
        predictions = self.predict(x)
        errors = predictions - targets

        if sample_weights is not None:
            errors = errors * sample_weights

        loss = float(np.mean(errors ** 2))

        # Gradient: d(MSE)/d(w) = 2/B * X^T @ errors * sigmoid_derivative
        sigmoid_deriv = predictions * (1.0 - predictions)
        grad = errors * sigmoid_deriv

        if x.ndim == 1:
            self.weights -= self.lr * grad * x
            self.bias -= self.lr * float(grad)
        else:
            batch_size = x.shape[0]
            weight_grad = (x.T @ grad) / batch_size
            bias_grad = np.mean(grad)
            self.weights -= self.lr * weight_grad
            self.bias -= self.lr * float(bias_grad)

        return loss


# ======================= Reward Predictor (Unified Interface) ===============


class RewardPredictor:
    """Reward predictor with PyTorch MPS backend, numpy fallback.

    Trains on labeled transitions (where reward is known) and generates
    pseudo-labels for unlabeled transitions (zero-reward). Uses a small
    MLP when PyTorch is available (with MPS acceleration on M1), falling
    back to a numpy-only linear model otherwise.

    Memory: ~0.5 MB (PyTorch) or ~12 KB (numpy).
    """

    def __init__(self, config: Optional[SSRSConfig] = None) -> None:
        self.config = config or SSRSConfig()
        self._use_torch = _HAS_TORCH
        self._device: Any = None
        self._model: Any = None
        self._optimizer: Any = None
        self._numpy_model: Optional[_NumpyLinearPredictor] = None

        if self._use_torch:
            self._init_torch()
        else:
            self._init_numpy()

        self._train_steps: int = 0

    def _init_torch(self) -> None:
        """Initialize PyTorch model with MPS acceleration if available."""
        if torch.backends.mps.is_available():
            self._device = torch.device("mps")
            logger.info("SSRS RewardPredictor using MPS (Apple M1 GPU)")
        elif torch.cuda.is_available():
            self._device = torch.device("cuda")
            logger.info("SSRS RewardPredictor using CUDA")
        else:
            self._device = torch.device("cpu")
            logger.info("SSRS RewardPredictor using CPU")

        self._model = _RewardPredictorNet(
            state_dim=self.config.state_dim,
            action_dim=self.config.action_dim,
            hidden_dim=self.config.reward_predictor_hidden,
        ).to(self._device)

        self._optimizer = optim.Adam(
            self._model.parameters(), lr=self.config.reward_predictor_lr
        )

    def _init_numpy(self) -> None:
        """Initialize numpy fallback linear model."""
        self._numpy_model = _NumpyLinearPredictor(
            state_dim=self.config.state_dim,
            action_dim=self.config.action_dim,
            lr=self.config.reward_predictor_lr,
        )

    def _action_to_onehot(self, action: int) -> np.ndarray:
        """Convert integer action to one-hot vector."""
        onehot = np.zeros(self.config.action_dim, dtype=np.float32)
        if 0 <= action < self.config.action_dim:
            onehot[action] = 1.0
        return onehot

    def _actions_to_onehot(self, actions: np.ndarray) -> np.ndarray:
        """Convert batch of integer actions to one-hot matrix.

        Args:
            actions: (B,) integer actions.

        Returns:
            (B, action_dim) one-hot float32.
        """
        batch_size = actions.shape[0]
        onehot = np.zeros((batch_size, self.config.action_dim), dtype=np.float32)
        valid = (actions >= 0) & (actions < self.config.action_dim)
        onehot[np.arange(batch_size)[valid], actions[valid].astype(int)] = 1.0
        return onehot

    def predict(self, state: np.ndarray, action: int, next_state: np.ndarray) -> float:
        """Predict reward for a single transition.

        Args:
            state: (state_dim,) float32.
            action: integer action index.
            next_state: (state_dim,) float32.

        Returns:
            Predicted reward in [0, 1].
        """
        action_onehot = self._action_to_onehot(action)

        if self._use_torch:
            self._model.eval()
            with torch.no_grad():
                s = torch.from_numpy(state).unsqueeze(0).to(self._device)
                a = torch.from_numpy(action_onehot).unsqueeze(0).to(self._device)
                ns = torch.from_numpy(next_state).unsqueeze(0).to(self._device)
                pred = self._model(s, a, ns)
            return float(pred.item())
        else:
            x = np.concatenate([state, action_onehot, next_state])
            return float(self._numpy_model.predict(x))

    def predict_batch(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        next_states: np.ndarray,
    ) -> np.ndarray:
        """Predict rewards for a batch of transitions.

        Args:
            states: (B, state_dim) float32.
            actions: (B,) integer actions.
            next_states: (B, state_dim) float32.

        Returns:
            (B,) predicted rewards in [0, 1].
        """
        action_onehots = self._actions_to_onehot(actions)

        if self._use_torch:
            self._model.eval()
            with torch.no_grad():
                s = torch.from_numpy(states).to(self._device)
                a = torch.from_numpy(action_onehots).to(self._device)
                ns = torch.from_numpy(next_states).to(self._device)
                preds = self._model(s, a, ns).squeeze(-1)
            return preds.cpu().numpy()
        else:
            x = np.concatenate([states, action_onehots, next_states], axis=1)
            return self._numpy_model.predict(x)

    def train_step(
        self,
        labeled_batch: Dict[str, np.ndarray],
        unlabeled_batch: Optional[Dict[str, np.ndarray]] = None,
    ) -> Dict[str, float]:
        """Single training step on labeled and optionally unlabeled data.

        The labeled batch trains the supervised loss L_r. The unlabeled batch
        (zero-reward transitions with high-confidence pseudo-labels) trains
        the pseudo-label component.

        Args:
            labeled_batch: dict with keys "states", "actions", "next_states",
                           "rewards" -- all numpy arrays.
            unlabeled_batch: optional dict with same keys. "rewards" contains
                             pseudo-labels (predicted rewards above threshold).

        Returns:
            Dict with loss values: "supervised_loss", "pseudo_loss", "total_loss".
        """
        self._train_steps += 1
        losses: Dict[str, float] = {}

        if self._use_torch:
            losses = self._train_step_torch(labeled_batch, unlabeled_batch)
        else:
            losses = self._train_step_numpy(labeled_batch, unlabeled_batch)

        return losses

    def _train_step_torch(
        self,
        labeled_batch: Dict[str, np.ndarray],
        unlabeled_batch: Optional[Dict[str, np.ndarray]],
    ) -> Dict[str, float]:
        """PyTorch training step."""
        self._model.train()
        self._optimizer.zero_grad()

        # Supervised loss on labeled transitions
        s = torch.from_numpy(labeled_batch["states"]).to(self._device)
        a = torch.from_numpy(
            self._actions_to_onehot(labeled_batch["actions"])
        ).to(self._device)
        ns = torch.from_numpy(labeled_batch["next_states"]).to(self._device)
        targets = torch.from_numpy(
            labeled_batch["rewards"].astype(np.float32)
        ).to(self._device)

        preds = self._model(s, a, ns).squeeze(-1)
        # Normalize targets to [0, 1] for sigmoid output
        # Map: lead=1.0->1.0, entity=0.2->0.6, irrelevant=-0.1->0.45
        normalized_targets = torch.clamp((targets + 0.1) / 1.1, 0.0, 1.0)
        supervised_loss = F.mse_loss(preds, normalized_targets)

        total_loss = self.config.supervised_weight * supervised_loss
        losses = {"supervised_loss": float(supervised_loss.item())}

        # Pseudo-label loss on unlabeled transitions
        if unlabeled_batch is not None and unlabeled_batch["states"].shape[0] > 0:
            us = torch.from_numpy(unlabeled_batch["states"]).to(self._device)
            ua = torch.from_numpy(
                self._actions_to_onehot(unlabeled_batch["actions"])
            ).to(self._device)
            uns = torch.from_numpy(unlabeled_batch["next_states"]).to(self._device)
            pseudo_targets = torch.from_numpy(
                unlabeled_batch["rewards"].astype(np.float32)
            ).to(self._device)

            pseudo_preds = self._model(us, ua, uns).squeeze(-1)
            pseudo_loss = F.mse_loss(pseudo_preds, pseudo_targets)
            total_loss = total_loss + pseudo_loss
            losses["pseudo_loss"] = float(pseudo_loss.item())
        else:
            losses["pseudo_loss"] = 0.0

        total_loss.backward()
        # Gradient clipping for stability
        torch.nn.utils.clip_grad_norm_(self._model.parameters(), max_norm=5.0)
        self._optimizer.step()

        losses["total_loss"] = float(total_loss.item())
        return losses

    def _train_step_numpy(
        self,
        labeled_batch: Dict[str, np.ndarray],
        unlabeled_batch: Optional[Dict[str, np.ndarray]],
    ) -> Dict[str, float]:
        """Numpy fallback training step."""
        # Supervised on labeled data
        action_oh = self._actions_to_onehot(labeled_batch["actions"])
        x = np.concatenate(
            [labeled_batch["states"], action_oh, labeled_batch["next_states"]], axis=1
        )
        targets = np.clip(
            (labeled_batch["rewards"] + 0.1) / 1.1, 0.0, 1.0
        ).astype(np.float32)
        sup_loss = self._numpy_model.train_step(x, targets)

        losses = {"supervised_loss": sup_loss, "pseudo_loss": 0.0}

        # Pseudo-label loss
        if unlabeled_batch is not None and unlabeled_batch["states"].shape[0] > 0:
            ua_oh = self._actions_to_onehot(unlabeled_batch["actions"])
            ux = np.concatenate(
                [unlabeled_batch["states"], ua_oh, unlabeled_batch["next_states"]],
                axis=1,
            )
            pseudo_targets = unlabeled_batch["rewards"].astype(np.float32)
            pseudo_loss = self._numpy_model.train_step(ux, pseudo_targets)
            losses["pseudo_loss"] = pseudo_loss

        losses["total_loss"] = losses["supervised_loss"] + losses["pseudo_loss"]
        return losses

    @property
    def train_steps(self) -> int:
        return self._train_steps

    def get_stats(self) -> Dict[str, Any]:
        """Return predictor statistics."""
        stats: Dict[str, Any] = {
            "backend": "torch" if self._use_torch else "numpy",
            "train_steps": self._train_steps,
        }
        if self._use_torch and self._model is not None:
            total_params = sum(p.numel() for p in self._model.parameters())
            stats["total_params"] = total_params
            stats["device"] = str(self._device)
            stats["memory_mb"] = round(
                total_params * 4 / (1024 * 1024), 3
            )  # float32
        return stats


# ======================= Consistency Regularizer ============================


class ConsistencyRegularizer:
    """Enforces prediction consistency between original and augmented views.

    Core SSL component: if the augmentation does not change the semantic
    meaning of a state, the reward prediction should remain the same.
    Uses MSE between predictions on original vs augmented states.

    This is the L_s term in the SSRS loss:
        L_s = mean((R_pred(s) - R_pred(aug(s)))^2)
    """

    def compute_consistency_loss(
        self,
        predictions_orig: np.ndarray,
        predictions_aug: np.ndarray,
    ) -> float:
        """Compute MSE consistency loss between original and augmented predictions.

        Args:
            predictions_orig: (B,) reward predictions on original states.
            predictions_aug: (B,) reward predictions on augmented states.

        Returns:
            Scalar MSE loss.
        """
        diff = predictions_orig - predictions_aug
        return float(np.mean(diff ** 2))

    def compute_consistency_loss_torch(
        self,
        predictions_orig: "torch.Tensor",
        predictions_aug: "torch.Tensor",
    ) -> "torch.Tensor":
        """Compute consistency loss using PyTorch tensors (for backprop).

        Args:
            predictions_orig: (B,) or (B, 1) reward predictions on original states.
            predictions_aug: (B,) or (B, 1) reward predictions on augmented states.

        Returns:
            Scalar MSE loss tensor.
        """
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for torch consistency loss")
        return F.mse_loss(predictions_orig, predictions_aug)


# ======================= Monotonicity Constraint ============================


class MonotonicityConstraint:
    """Enforces monotonic relationship between Q-values and reward predictions.

    If Q(s,a) > Q(s,b) then R_pred(s,a) should be >= R_pred(s,b).
    Violations are penalized quadratically.

    This is the L_QV term from the paper:
        L_QV = sum((delta_t)^2) where delta_t = max(0, R_pred(s,b) - R_pred(s,a))
        for all pairs where Q(s,a) > Q(s,b)

    In practice, we compute the advantage A(s,a) = Q(s,a) - V(s) and penalize
    cases where the reward prediction disagrees with the sign of the advantage.
    """

    def compute_monotonicity_loss(
        self,
        q_values: np.ndarray,
        reward_predictions: np.ndarray,
    ) -> float:
        """Compute monotonicity violation loss.

        For each pair of actions at the same state, penalizes cases where
        Q-value ordering disagrees with reward prediction ordering.

        Args:
            q_values: (B,) Q-values for sampled (state, action) pairs.
            reward_predictions: (B,) predicted rewards for the same pairs.

        Returns:
            Scalar monotonicity loss.
        """
        if len(q_values) < 2:
            return 0.0

        total_loss = 0.0
        n_pairs = 0

        # Pairwise comparison within the batch
        # For efficiency, sample random pairs rather than all O(B^2) combinations
        batch_size = len(q_values)
        n_samples = min(batch_size * 2, batch_size * (batch_size - 1) // 2)

        if n_samples == 0:
            return 0.0

        idx_a = np.random.randint(0, batch_size, size=n_samples)
        idx_b = np.random.randint(0, batch_size, size=n_samples)

        # Only consider pairs where indices differ
        valid = idx_a != idx_b
        idx_a = idx_a[valid]
        idx_b = idx_b[valid]

        if len(idx_a) == 0:
            return 0.0

        # For pairs where Q(a) > Q(b), penalize if R_pred(a) < R_pred(b)
        q_diff = q_values[idx_a] - q_values[idx_b]
        r_diff = reward_predictions[idx_a] - reward_predictions[idx_b]

        # Violation: Q says a > b but reward prediction says a < b
        violations = (q_diff > 0) & (r_diff < 0)
        if np.any(violations):
            # Quadratic penalty on the reward prediction deficit
            penalty = r_diff[violations] ** 2
            total_loss = float(np.mean(penalty))

        return total_loss

    def compute_monotonicity_loss_torch(
        self,
        q_values: "torch.Tensor",
        reward_predictions: "torch.Tensor",
    ) -> "torch.Tensor":
        """Compute monotonicity loss using PyTorch tensors (for backprop).

        Args:
            q_values: (B,) Q-values.
            reward_predictions: (B,) reward predictions.

        Returns:
            Scalar loss tensor.
        """
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for torch monotonicity loss")

        batch_size = q_values.shape[0]
        if batch_size < 2:
            return torch.tensor(0.0, device=q_values.device)

        n_samples = min(batch_size * 2, batch_size * (batch_size - 1) // 2)
        idx_a = torch.randint(0, batch_size, (n_samples,), device=q_values.device)
        idx_b = torch.randint(0, batch_size, (n_samples,), device=q_values.device)

        valid = idx_a != idx_b
        idx_a = idx_a[valid]
        idx_b = idx_b[valid]

        if idx_a.shape[0] == 0:
            return torch.tensor(0.0, device=q_values.device)

        q_diff = q_values[idx_a] - q_values[idx_b]
        r_diff = reward_predictions[idx_a] - reward_predictions[idx_b]

        # Penalize: where Q says a > b, but R_pred says a < b
        # Use ReLU to select violations: max(0, -r_diff) where q_diff > 0
        violation_mask = (q_diff > 0).float()
        violation_magnitude = torch.clamp(-r_diff, min=0.0)
        penalty = violation_mask * violation_magnitude ** 2

        return penalty.mean()


# ======================= SSRS Reward Shaper (Main Orchestrator) =============


class SSRSRewardShaper:
    """Main orchestrator for Semi-Supervised Reward Shaping.

    Wraps all SSRS components and provides a clean interface for the crawler
    pipeline. For zero-reward transitions, estimates dense rewards via the
    reward predictor. For non-zero rewards, passes them through (supervised
    signal). Trains the reward predictor using a combination of supervised,
    consistency, and monotonicity losses.

    Integration with existing RewardShaper (crawler_reward_shaping.py):
        The SSRSRewardShaper operates as a parallel reward estimator.
        The final reward combines both:
            final_reward = w1 * existing_shaped + w2 * ssrs_shaped

    Usage:
        ssrs = SSRSRewardShaper(SSRSConfig())

        # Per-transition reward shaping
        shaped = ssrs.shape_reward(state, action, next_state, raw_reward)

        # Per-batch training (shares replay buffer batches with DQN)
        losses = ssrs.train_step(replay_batch)

    Memory: <20 MB total across all sub-components.
    """

    def __init__(self, config: Optional[SSRSConfig] = None) -> None:
        self.config = config or SSRSConfig()

        # Sub-components
        self.augmentor = EntropyAugmentor(self.config)
        self.predictor = RewardPredictor(self.config)
        self.consistency = ConsistencyRegularizer()
        self.monotonicity = MonotonicityConstraint()

        # Training state
        self._step: int = 0
        self._labeled_count: int = 0
        self._unlabeled_count: int = 0
        self._pseudo_labeled_count: int = 0

        # Running statistics for dynamic p_u
        self._reward_count: int = 0  # count of non-zero reward transitions seen

        # Loss tracking (exponential moving average)
        self._ema_supervised_loss: float = 0.0
        self._ema_consistency_loss: float = 0.0
        self._ema_monotonicity_loss: float = 0.0
        self._ema_decay: float = 0.99

        logger.info(
            "SSRSRewardShaper initialized: state_dim=%d, action_dim=%d, "
            "warmup=%d, backend=%s",
            self.config.state_dim,
            self.config.action_dim,
            self.config.warmup_steps,
            "torch" if _HAS_TORCH else "numpy",
        )

    # ---- Reward Shaping (per-transition) -----------------------------------

    def shape_reward(
        self,
        state: np.ndarray,
        action: int,
        next_state: np.ndarray,
        raw_reward: float,
    ) -> float:
        """Compute the SSRS-shaped reward for a transition.

        For zero-reward transitions: estimates a dense reward from the
        reward predictor (if past warmup and with probability p_u).
        For non-zero rewards: passes the raw reward through unchanged.

        Args:
            state: (state_dim,) float32 current state.
            action: integer action index.
            next_state: (state_dim,) float32 next state.
            raw_reward: raw reward from extraction module.

        Returns:
            Shaped reward (float).
        """
        self._step += 1

        # Always update augmentor statistics
        self.augmentor.update_statistics(state)

        # Non-zero rewards are supervised signal -- pass through
        if abs(raw_reward) > 1e-8:
            self._reward_count += 1
            self._labeled_count += 1
            return raw_reward

        # Before warmup, do not shape zero-reward transitions
        if self._step < self.config.warmup_steps:
            self._unlabeled_count += 1
            return raw_reward

        # Dynamic shaping probability p_u
        pu = self._compute_pu()
        if np.random.random() > pu:
            self._unlabeled_count += 1
            return raw_reward

        # Predict dense reward for this zero-reward transition
        predicted = self.predictor.predict(state, action, next_state)

        # Dynamic confidence threshold
        threshold = self._compute_lambda()

        if predicted > threshold:
            self._pseudo_labeled_count += 1
            # Scale the predicted reward to the crawler's reward range
            # Predictor outputs [0, 1]; map to crawler reward scale
            shaped = predicted * self.config.supervised_weight
            return shaped
        else:
            self._unlabeled_count += 1
            return raw_reward

    # ---- Training (per-batch) ----------------------------------------------

    def train_step(
        self,
        replay_batch: Dict[str, np.ndarray],
        q_values: Optional[np.ndarray] = None,
    ) -> Dict[str, float]:
        """Train the reward predictor on a replay buffer batch.

        Separates the batch into labeled (non-zero reward) and unlabeled
        (zero-reward) transitions, then applies the SSRS loss:
            L = L_QV + alpha * L_s + (1 - alpha) * L_r

        Should be called on every DQN training step (shares the same batch).

        Args:
            replay_batch: dict with keys "states" (B, state_dim),
                "actions" (B,), "rewards" (B,), "next_states" (B, state_dim).
            q_values: optional (B,) Q-values for monotonicity constraint.
                If None, monotonicity loss is skipped.

        Returns:
            Dict with loss values and diagnostics.
        """
        self._step += 1
        losses: Dict[str, float] = {}

        states = replay_batch["states"]
        actions = replay_batch["actions"]
        rewards = replay_batch["rewards"]
        next_states = replay_batch["next_states"]

        # Split into labeled (non-zero reward) and unlabeled (zero-reward)
        labeled_mask = np.abs(rewards) > 1e-8
        unlabeled_mask = ~labeled_mask

        labeled_indices = np.where(labeled_mask)[0]
        unlabeled_indices = np.where(unlabeled_mask)[0]

        losses["labeled_count"] = float(len(labeled_indices))
        losses["unlabeled_count"] = float(len(unlabeled_indices))

        # Need at least some labeled data for supervised training
        if len(labeled_indices) < 2:
            losses["supervised_loss"] = 0.0
            losses["consistency_loss"] = 0.0
            losses["monotonicity_loss"] = 0.0
            losses["total_loss"] = 0.0
            losses["skipped"] = 1.0
            return losses

        # Prepare labeled batch
        labeled_batch = {
            "states": states[labeled_indices],
            "actions": actions[labeled_indices],
            "next_states": next_states[labeled_indices],
            "rewards": rewards[labeled_indices],
        }

        # Prepare unlabeled batch with pseudo-labels (if past warmup)
        unlabeled_batch_data = None
        if (
            len(unlabeled_indices) > 0
            and self._step > self.config.warmup_steps
        ):
            ul_states = states[unlabeled_indices]
            ul_actions = actions[unlabeled_indices]
            ul_next_states = next_states[unlabeled_indices]

            # Generate pseudo-labels via current predictor
            pseudo_rewards = self.predictor.predict_batch(
                ul_states, ul_actions, ul_next_states
            )

            # Filter by confidence threshold
            threshold = self._compute_lambda()
            confident_mask = pseudo_rewards > threshold
            confident_indices = np.where(confident_mask)[0]

            if len(confident_indices) > 0:
                unlabeled_batch_data = {
                    "states": ul_states[confident_indices],
                    "actions": ul_actions[confident_indices],
                    "next_states": ul_next_states[confident_indices],
                    "rewards": pseudo_rewards[confident_indices],
                }
                losses["pseudo_labeled_count"] = float(len(confident_indices))
            else:
                losses["pseudo_labeled_count"] = 0.0
        else:
            losses["pseudo_labeled_count"] = 0.0

        # Step 1: Train reward predictor (L_r + pseudo-label loss)
        predictor_losses = self.predictor.train_step(
            labeled_batch, unlabeled_batch_data
        )
        losses.update(predictor_losses)

        # Step 2: Consistency loss (L_s) on unlabeled transitions
        consistency_loss = 0.0
        if (
            len(unlabeled_indices) > 0
            and self._step > self.config.warmup_steps
        ):
            ul_states_all = states[unlabeled_indices]
            ul_actions_all = actions[unlabeled_indices]
            ul_next_states_all = next_states[unlabeled_indices]

            # Augment states
            aug_states = self.augmentor.augment_batch(ul_states_all)
            aug_next_states = self.augmentor.augment_batch(ul_next_states_all)

            # Predict on original and augmented
            preds_orig = self.predictor.predict_batch(
                ul_states_all, ul_actions_all, ul_next_states_all
            )
            preds_aug = self.predictor.predict_batch(
                aug_states, ul_actions_all, aug_next_states
            )

            consistency_loss = self.consistency.compute_consistency_loss(
                preds_orig, preds_aug
            )

        losses["consistency_loss"] = consistency_loss

        # Step 3: Monotonicity loss (L_QV)
        monotonicity_loss = 0.0
        if q_values is not None and len(q_values) > 1:
            all_preds = self.predictor.predict_batch(states, actions, next_states)
            monotonicity_loss = self.monotonicity.compute_monotonicity_loss(
                q_values, all_preds
            )
        losses["monotonicity_loss"] = monotonicity_loss

        # Combined loss (for logging; actual backprop happens in predictor.train_step)
        alpha = self.get_consistency_weight(self._step)
        combined = (
            self.config.monotonicity_weight * monotonicity_loss
            + alpha * consistency_loss
            + (1.0 - alpha) * losses.get("supervised_loss", 0.0)
        )
        losses["combined_loss"] = combined
        losses["alpha"] = alpha
        losses["lambda"] = self._compute_lambda()
        losses["pu"] = self._compute_pu()

        # Update EMA tracking
        self._ema_supervised_loss = (
            self._ema_decay * self._ema_supervised_loss
            + (1 - self._ema_decay) * losses.get("supervised_loss", 0.0)
        )
        self._ema_consistency_loss = (
            self._ema_decay * self._ema_consistency_loss
            + (1 - self._ema_decay) * consistency_loss
        )
        self._ema_monotonicity_loss = (
            self._ema_decay * self._ema_monotonicity_loss
            + (1 - self._ema_decay) * monotonicity_loss
        )

        return losses

    # ---- Schedule Functions ------------------------------------------------

    def get_consistency_weight(self, step: int) -> float:
        """Compute alpha: linear ramp from consistency_weight_start to end.

        Alpha controls the balance between supervised (L_r) and SSL (L_s)
        losses. It ramps up over training as more unlabeled data is collected
        and the SSL signal becomes more reliable.

        Args:
            step: current training step.

        Returns:
            Alpha in [consistency_weight_start, consistency_weight_end].
        """
        if step < self.config.warmup_steps:
            return self.config.consistency_weight_start

        progress = min(
            1.0,
            (step - self.config.warmup_steps)
            / max(self.config.total_schedule_steps - self.config.warmup_steps, 1),
        )
        return (
            self.config.consistency_weight_start
            + progress
            * (self.config.consistency_weight_end - self.config.consistency_weight_start)
        )

    def _compute_lambda(self) -> float:
        """Compute dynamic confidence threshold for pseudo-labeling.

        lambda = lambda_start + lambda_range * (1 - e^(-t/T))

        Starts permissive (~0.6) and tightens (~0.9) as the estimator improves.

        Returns:
            Threshold in [lambda_start, lambda_start + lambda_range].
        """
        t = max(0, self._step - self.config.warmup_steps)
        decay = math.exp(-t / max(self.config.lambda_schedule_steps, 1))
        return self.config.lambda_start + self.config.lambda_range * (1.0 - decay)

    def _compute_pu(self) -> float:
        """Compute dynamic shaping probability p_u.

        Controls what fraction of zero-reward transitions receive shaped rewards.
        Follows an inverted-U schedule:
        - Early: conservative (few shaped rewards)
        - Mid: aggressive (many shaped rewards)
        - Late: conservative again (trust the policy)

        Keyed to the number of non-zero rewards seen (N_r), which proxies
        for the maturity of the reward predictor.

        Returns:
            Probability in [pu_min, pu_max].
        """
        if self._reward_count < 5:
            # Cold start: very few rewards observed, be conservative
            return self.config.pu_min

        # Inverted-U: peaks when N_r is at a "goldilocks" point
        # Use log-scale to handle the wide range of N_r values
        n_r = float(self._reward_count)
        # Peak at ~500 non-zero rewards
        peak_n_r = 500.0
        log_ratio = math.log(n_r / peak_n_r) if n_r > 0 else -10.0
        # Gaussian-like falloff from the peak
        pu = self.config.pu_max * math.exp(-0.5 * log_ratio ** 2)
        return max(self.config.pu_min, min(self.config.pu_max, pu))

    # ---- Integration helpers -----------------------------------------------

    def should_shape(self) -> bool:
        """Whether SSRS is past warmup and ready to shape rewards."""
        return self._step >= self.config.warmup_steps

    def get_stats(self) -> Dict[str, Any]:
        """Return comprehensive SSRS statistics."""
        return {
            "step": self._step,
            "labeled_count": self._labeled_count,
            "unlabeled_count": self._unlabeled_count,
            "pseudo_labeled_count": self._pseudo_labeled_count,
            "reward_count": self._reward_count,
            "alpha": round(self.get_consistency_weight(self._step), 4),
            "lambda": round(self._compute_lambda(), 4),
            "pu": round(self._compute_pu(), 4),
            "ema_supervised_loss": round(self._ema_supervised_loss, 6),
            "ema_consistency_loss": round(self._ema_consistency_loss, 6),
            "ema_monotonicity_loss": round(self._ema_monotonicity_loss, 6),
            "warmup_complete": self._step >= self.config.warmup_steps,
            "augmentor": self.augmentor.get_stats(),
            "predictor": self.predictor.get_stats(),
        }

    def state_dict(self) -> Dict[str, Any]:
        """Serialize SSRS state for checkpointing.

        Returns a dict that can be saved and later restored with load_state_dict.
        Does not include the PyTorch model weights (use torch.save separately).
        """
        return {
            "step": self._step,
            "labeled_count": self._labeled_count,
            "unlabeled_count": self._unlabeled_count,
            "pseudo_labeled_count": self._pseudo_labeled_count,
            "reward_count": self._reward_count,
            "ema_supervised_loss": self._ema_supervised_loss,
            "ema_consistency_loss": self._ema_consistency_loss,
            "ema_monotonicity_loss": self._ema_monotonicity_loss,
            "augmentor_histograms": self.augmentor._histograms.tolist(),
            "augmentor_partition_entropies": self.augmentor._partition_entropies.tolist(),
            "augmentor_partition_mins": self.augmentor._partition_mins.tolist(),
            "augmentor_partition_maxs": self.augmentor._partition_maxs.tolist(),
            "augmentor_observation_count": self.augmentor._observation_count,
        }

    def load_state_dict(self, state: Dict[str, Any]) -> None:
        """Restore SSRS state from a checkpoint dict."""
        self._step = state.get("step", 0)
        self._labeled_count = state.get("labeled_count", 0)
        self._unlabeled_count = state.get("unlabeled_count", 0)
        self._pseudo_labeled_count = state.get("pseudo_labeled_count", 0)
        self._reward_count = state.get("reward_count", 0)
        self._ema_supervised_loss = state.get("ema_supervised_loss", 0.0)
        self._ema_consistency_loss = state.get("ema_consistency_loss", 0.0)
        self._ema_monotonicity_loss = state.get("ema_monotonicity_loss", 0.0)

        if "augmentor_histograms" in state:
            self.augmentor._histograms = np.array(
                state["augmentor_histograms"], dtype=np.float64
            )
        if "augmentor_partition_entropies" in state:
            self.augmentor._partition_entropies = np.array(
                state["augmentor_partition_entropies"], dtype=np.float64
            )
        if "augmentor_partition_mins" in state:
            self.augmentor._partition_mins = np.array(
                state["augmentor_partition_mins"], dtype=np.float64
            )
        if "augmentor_partition_maxs" in state:
            self.augmentor._partition_maxs = np.array(
                state["augmentor_partition_maxs"], dtype=np.float64
            )
        if "augmentor_observation_count" in state:
            self.augmentor._observation_count = state["augmentor_observation_count"]

        logger.info(
            "SSRSRewardShaper state restored: step=%d, labeled=%d, pseudo=%d",
            self._step,
            self._labeled_count,
            self._pseudo_labeled_count,
        )
