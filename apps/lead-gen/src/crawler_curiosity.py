"""
Intrinsic Curiosity Module (ICM) for RL-based focused web crawling.

Implements Pathak et al. 2017 "Curiosity-driven Exploration by Self-Supervised
Prediction" adapted for the crawler domain:
- FeatureEncoder: compresses page state vectors to a learned feature space phi(s)
- ForwardModel: predicts phi(s_{t+1}) from (phi(s_t), action) -- prediction error = curiosity
- InverseModel: predicts action from (phi(s_t), phi(s_{t+1})) -- learns features that capture
  action-relevant state changes, filtering out noise (ad banners, timestamps, etc.)

Curiosity reward augments the sparse extrinsic signal (+1 lead, +0.2 entity) so the
agent explores structurally novel pages even before extraction confirms a payoff.

Integration:
    from crawler_curiosity import ICMConfig, IntrinsicCuriosityModule, CuriosityTracker

    icm = IntrinsicCuriosityModule(ICMConfig())
    augmented_reward = icm.augment_reward(extrinsic, state, action, next_state)

Memory: ~2 MB total (three small MLPs).
Target: Apple M1 16GB, zero cloud dependency.
"""

import collections
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_curiosity")

# ---------------------------------------------------------------------------
# Try importing PyTorch; gate all neural network code behind availability
# ---------------------------------------------------------------------------
_HAS_TORCH = False

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim

    _HAS_TORCH = True
except ImportError:
    logger.warning("PyTorch not installed -- ICM disabled")


# ======================= Configuration ======================================

@dataclass
class ICMConfig:
    """Hyperparameters for the Intrinsic Curiosity Module.

    Defaults follow Pathak et al. 2017 with adjustments for the crawler's
    784-dim state space and 10-action discrete action space.
    """

    # Dimensions
    feature_dim: int = 256   # compressed state representation phi(s)
    state_dim: int = 784     # input state (768 nomic embed + 16 scalar features)
    action_dim: int = 10     # top-K link candidates per page

    # Reward shaping
    curiosity_weight: float = 0.1   # scale curiosity vs extrinsic reward
    clip_curiosity: float = 5.0     # prevent curiosity reward explosion

    # Loss weighting (must sum to 1.0 for stable gradients)
    forward_loss_weight: float = 0.2
    inverse_loss_weight: float = 0.8

    # Optimiser
    lr: float = 1e-3

    # Persistence
    checkpoint_path: str = "scrapus_data/models/icm/icm.pt"


# ======================= Neural Network Components ==========================

if _HAS_TORCH:

    class FeatureEncoder(nn.Module):
        """Compresses raw state to a learned feature space phi(s).

        Architecture: state_dim -> 512 -> feature_dim with ReLU.
        Shared between forward and inverse models so features capture
        action-relevant state transitions, not visual noise.
        """

        def __init__(self, config: ICMConfig) -> None:
            super().__init__()
            self.fc1 = nn.Linear(config.state_dim, 512)
            self.fc2 = nn.Linear(512, config.feature_dim)

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            x = F.relu(self.fc1(x))
            x = F.relu(self.fc2(x))
            return x

    class ForwardModel(nn.Module):
        """Predicts next-state features from (phi(s_t), action_onehot).

        Architecture: (feature_dim + action_dim) -> 256 -> feature_dim.
        MSE between phi(s_{t+1}) and phi_hat(s_{t+1}) is the curiosity reward:
        high prediction error = novel transition = explore more.
        """

        def __init__(self, config: ICMConfig) -> None:
            super().__init__()
            self.fc1 = nn.Linear(config.feature_dim + config.action_dim, 256)
            self.fc2 = nn.Linear(256, config.feature_dim)

        def forward(
            self,
            phi_state: "torch.Tensor",
            action_onehot: "torch.Tensor",
        ) -> "torch.Tensor":
            x = torch.cat([phi_state, action_onehot], dim=-1)
            x = F.relu(self.fc1(x))
            return self.fc2(x)

    class InverseModel(nn.Module):
        """Predicts the action that caused a state transition.

        Architecture: (phi(s_t) + phi(s_{t+1})) -> 256 -> action_dim.
        Cross-entropy loss trains the feature encoder to capture only
        action-relevant changes, ignoring stochastic page elements.
        """

        def __init__(self, config: ICMConfig) -> None:
            super().__init__()
            self.fc1 = nn.Linear(config.feature_dim * 2, 256)
            self.fc2 = nn.Linear(256, config.action_dim)

        def forward(
            self,
            phi_state: "torch.Tensor",
            phi_next_state: "torch.Tensor",
        ) -> "torch.Tensor":
            x = torch.cat([phi_state, phi_next_state], dim=-1)
            x = F.relu(self.fc1(x))
            return self.fc2(x)  # raw logits, softmax in loss

else:
    # Stubs so imports don't break when torch is absent
    class FeatureEncoder:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for FeatureEncoder")

    class ForwardModel:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for ForwardModel")

    class InverseModel:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for InverseModel")


# ======================= Intrinsic Curiosity Module =========================

class IntrinsicCuriosityModule:
    """Full ICM combining feature encoder, forward model, and inverse model.

    Computes curiosity reward as the forward model's prediction error in
    learned feature space.  The inverse model regularises the feature encoder
    so that phi(s) captures action-relevant structure rather than noise.

    Usage:
        icm = IntrinsicCuriosityModule(ICMConfig())
        augmented = icm.augment_reward(extrinsic_reward, state, action, next_state)
        fwd_loss, inv_loss = icm.train_step(states_batch, actions_batch, next_states_batch)
    """

    def __init__(self, config: Optional[ICMConfig] = None) -> None:
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for IntrinsicCuriosityModule")

        self.config = config or ICMConfig()

        # Resolve device (MPS on Apple Silicon, else CPU)
        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
        else:
            self.device = torch.device("cpu")

        # Networks
        self.encoder = FeatureEncoder(self.config).to(self.device)
        self.forward_model = ForwardModel(self.config).to(self.device)
        self.inverse_model = InverseModel(self.config).to(self.device)

        # Single optimiser for all three networks (joint training)
        all_params = (
            list(self.encoder.parameters())
            + list(self.forward_model.parameters())
            + list(self.inverse_model.parameters())
        )
        self.optimizer = optim.Adam(all_params, lr=self.config.lr)

        # Training step counter
        self.train_step_count: int = 0

        logger.info(
            "ICM initialised: device=%s, feature_dim=%d, state_dim=%d, action_dim=%d",
            self.device,
            self.config.feature_dim,
            self.config.state_dim,
            self.config.action_dim,
        )

    # ---- Curiosity Reward ---------------------------------------------------

    def compute_curiosity_reward(
        self,
        state: np.ndarray,
        action: int,
        next_state: np.ndarray,
    ) -> float:
        """Compute intrinsic curiosity reward for a single transition.

        The reward is the MSE between the forward model's predicted next-state
        features and the actual next-state features.  High error means the
        transition was surprising (novel page structure, new domain pattern).

        Args:
            state: current state vector, shape (state_dim,).
            action: discrete action index (0..action_dim-1).
            next_state: next state vector, shape (state_dim,).

        Returns:
            Scalar curiosity reward (non-negative).
        """
        self.encoder.eval()
        self.forward_model.eval()

        with torch.no_grad():
            state_t = torch.as_tensor(
                state, dtype=torch.float32, device=self.device
            ).unsqueeze(0)
            next_state_t = torch.as_tensor(
                next_state, dtype=torch.float32, device=self.device
            ).unsqueeze(0)

            # One-hot encode action
            action_onehot = torch.zeros(
                1, self.config.action_dim, device=self.device
            )
            action_onehot[0, action] = 1.0

            # Encode states
            phi_state = self.encoder(state_t)
            phi_next_state = self.encoder(next_state_t)

            # Forward model prediction
            phi_next_pred = self.forward_model(phi_state, action_onehot)

            # MSE prediction error = curiosity
            curiosity = F.mse_loss(phi_next_pred, phi_next_state).item()

        return float(curiosity)

    def augment_reward(
        self,
        extrinsic_reward: float,
        state: np.ndarray,
        action: int,
        next_state: np.ndarray,
    ) -> float:
        """Augment extrinsic reward with clipped curiosity bonus.

        Returns: extrinsic + curiosity_weight * min(curiosity, clip_curiosity)

        This bridges the sparse reward gap: the agent gets signal even when
        no lead or entity is found, as long as the page was structurally novel.
        Curiosity naturally decays as the forward model improves on familiar
        page patterns.

        Args:
            extrinsic_reward: reward from the extraction module.
            state: current state vector, shape (state_dim,).
            action: discrete action index.
            next_state: next state vector, shape (state_dim,).

        Returns:
            Augmented reward scalar.
        """
        curiosity = self.compute_curiosity_reward(state, action, next_state)
        clipped = min(curiosity, self.config.clip_curiosity)
        augmented = extrinsic_reward + self.config.curiosity_weight * clipped
        return augmented

    # ---- Training -----------------------------------------------------------

    def train_step(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        next_states: np.ndarray,
    ) -> Tuple[float, float]:
        """One gradient step on a batch of transitions.

        Jointly trains the feature encoder, forward model, and inverse model.
        The combined loss is:
            L = forward_loss_weight * L_forward + inverse_loss_weight * L_inverse

        Args:
            states: batch of state vectors, shape (batch, state_dim).
            actions: batch of action indices, shape (batch,), dtype int.
            next_states: batch of next-state vectors, shape (batch, state_dim).

        Returns:
            (forward_loss, inverse_loss) as floats for logging.
        """
        self.encoder.train()
        self.forward_model.train()
        self.inverse_model.train()

        dev = self.device
        states_t = torch.as_tensor(states, dtype=torch.float32, device=dev)
        next_states_t = torch.as_tensor(
            next_states, dtype=torch.float32, device=dev
        )
        actions_t = torch.as_tensor(actions, dtype=torch.long, device=dev)

        # One-hot encode actions: (batch, action_dim)
        action_onehot = torch.zeros(
            actions_t.size(0), self.config.action_dim, device=dev
        )
        action_onehot.scatter_(1, actions_t.unsqueeze(1), 1.0)

        # Encode states
        phi_state = self.encoder(states_t)
        phi_next_state = self.encoder(next_states_t)

        # Forward model: predict next-state features
        phi_next_pred = self.forward_model(phi_state, action_onehot)
        forward_loss = F.mse_loss(phi_next_pred, phi_next_state.detach())

        # Inverse model: predict action from state transition
        action_logits = self.inverse_model(phi_state, phi_next_state)
        inverse_loss = F.cross_entropy(action_logits, actions_t)

        # Combined loss
        loss = (
            self.config.forward_loss_weight * forward_loss
            + self.config.inverse_loss_weight * inverse_loss
        )

        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        self.train_step_count += 1

        fwd_val = forward_loss.item()
        inv_val = inverse_loss.item()

        if self.train_step_count % 100 == 0:
            logger.info(
                "ICM train step %d: forward_loss=%.4f, inverse_loss=%.4f",
                self.train_step_count,
                fwd_val,
                inv_val,
            )

        return fwd_val, inv_val

    # ---- Persistence --------------------------------------------------------

    def save_checkpoint(self, path: Optional[str] = None) -> str:
        """Save all three networks and optimiser state."""
        path = path or self.config.checkpoint_path
        os.makedirs(os.path.dirname(path), exist_ok=True)

        checkpoint = {
            "encoder": self.encoder.state_dict(),
            "forward_model": self.forward_model.state_dict(),
            "inverse_model": self.inverse_model.state_dict(),
            "optimizer": self.optimizer.state_dict(),
            "train_step_count": self.train_step_count,
            "config": self.config.__dict__,
        }
        torch.save(checkpoint, path)
        logger.info("ICM checkpoint saved to %s", path)
        return path

    def load_checkpoint(self, path: Optional[str] = None) -> None:
        """Restore from checkpoint."""
        path = path or self.config.checkpoint_path
        if not os.path.exists(path):
            raise FileNotFoundError(f"ICM checkpoint not found: {path}")

        checkpoint = torch.load(
            path, map_location=self.device, weights_only=False
        )
        self.encoder.load_state_dict(checkpoint["encoder"])
        self.forward_model.load_state_dict(checkpoint["forward_model"])
        self.inverse_model.load_state_dict(checkpoint["inverse_model"])
        self.optimizer.load_state_dict(checkpoint["optimizer"])
        self.train_step_count = checkpoint.get("train_step_count", 0)
        logger.info(
            "ICM checkpoint loaded from %s (step %d)",
            path,
            self.train_step_count,
        )

    # ---- Cleanup ------------------------------------------------------------

    def release(self) -> None:
        """Free GPU memory. Call when done training."""
        del self.encoder
        del self.forward_model
        del self.inverse_model
        del self.optimizer
        if _HAS_TORCH and torch.backends.mps.is_available():
            torch.mps.empty_cache()
        import gc

        gc.collect()
        logger.info("IntrinsicCuriosityModule released")


# ======================= Curiosity Tracker ==================================

class CuriosityTracker:
    """Track per-domain curiosity statistics for the domain scheduler.

    Maintains a rolling average of curiosity rewards per domain.  Domains
    with high average curiosity contain structurally novel pages the forward
    model hasn't learned yet -- the scheduler can prioritise them.

    Thread-safe for use from async crawler workers (deque is atomic for
    append/popleft on CPython).

    Usage:
        tracker = CuriosityTracker(window_size=200)
        tracker.record("example.com", curiosity_reward=0.42)
        scores = tracker.get_curiosity_scores()
        # {"example.com": 0.35, "other.org": 0.12}
    """

    def __init__(self, window_size: int = 200) -> None:
        self.window_size = window_size
        self._domain_rewards: Dict[str, collections.deque] = {}
        self._total_records: int = 0

    def record(self, domain: str, curiosity_reward: float) -> None:
        """Record a curiosity reward observation for a domain.

        Args:
            domain: the domain name (e.g. "example.com").
            curiosity_reward: the raw curiosity reward for one page.
        """
        if domain not in self._domain_rewards:
            self._domain_rewards[domain] = collections.deque(
                maxlen=self.window_size
            )
        self._domain_rewards[domain].append(curiosity_reward)
        self._total_records += 1

    def get_curiosity_scores(self) -> Dict[str, float]:
        """Return rolling average curiosity per domain.

        Returns:
            Dict mapping domain -> mean curiosity reward over the window.
            Sorted descending by curiosity (most surprising domains first).
        """
        scores: Dict[str, float] = {}
        for domain, rewards in self._domain_rewards.items():
            if rewards:
                scores[domain] = float(np.mean(list(rewards)))
        # Sort descending
        return dict(
            sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        )

    def get_domain_curiosity(self, domain: str) -> float:
        """Return the rolling average curiosity for a single domain.

        Returns 0.0 if the domain has not been observed.
        """
        rewards = self._domain_rewards.get(domain)
        if not rewards:
            return 0.0
        return float(np.mean(list(rewards)))

    def get_stats(self) -> Dict[str, Any]:
        """Return summary statistics for logging."""
        scores = self.get_curiosity_scores()
        if not scores:
            return {
                "domains_tracked": 0,
                "total_records": self._total_records,
            }

        values = list(scores.values())
        return {
            "domains_tracked": len(scores),
            "total_records": self._total_records,
            "mean_curiosity": round(float(np.mean(values)), 4),
            "max_curiosity": round(float(np.max(values)), 4),
            "min_curiosity": round(float(np.min(values)), 4),
            "top_3_domains": list(scores.keys())[:3],
        }

    def reset(self) -> None:
        """Clear all tracked data."""
        self._domain_rewards.clear()
        self._total_records = 0
