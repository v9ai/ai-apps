"""
Module 1: DQN Agent for RL-based focused web crawling.

Implements Double DQN with:
- 3-layer MLP (448 -> 512 -> 256 -> 10), ~5 MB ONNX
- PyTorch MPS training on Apple M1 GPU
- ONNX export with CoreML EP for 0.3ms inference
- Epsilon-greedy exploration with linear decay
- N-step returns and hindsight reward relabeling
- Gradient clipping (max norm 10) for sparse reward stability

State: 768-dim page embedding (nomic-embed-text-v1.5) + scalar features
Actions: top-K link selection (0..action_dim-1)
Rewards: async from extraction module (+1.0 lead, +0.2 entity, -0.1 irrelevant)

Target: Apple M1 16GB, zero cloud dependency.
"""

import gc
import json
import logging
import math
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_dqn")

# ---------------------------------------------------------------------------
# Try importing optional backends; gate features behind availability flags
# ---------------------------------------------------------------------------
_HAS_TORCH = False
_HAS_ONNX = False
_HAS_COREML = False

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim

    _HAS_TORCH = True
except ImportError:
    logger.warning("PyTorch not installed -- training disabled")

try:
    import onnxruntime as ort

    _HAS_ONNX = True
except ImportError:
    logger.warning("ONNX Runtime not installed -- ONNX inference disabled")

try:
    import coremltools as ct

    _HAS_COREML = True
except ImportError:
    logger.debug("coremltools not installed -- CoreML export disabled")


# ======================= Configuration ======================================

@dataclass
class DQNConfig:
    """Hyperparameters for the Double DQN agent.

    All values sourced from IMPLEMENTATION.md grid-search results and
    M1_LOCAL_DEPLOYMENT.md memory budgets.
    """

    # Network
    state_dim: int = 784  # 768 nomic embed + 16 scalar features
    action_dim: int = 10  # top-K link candidates per page
    hidden_1: int = 512
    hidden_2: int = 256

    # Optimiser
    lr: float = 3e-4
    grad_clip_max_norm: float = 10.0

    # RL
    gamma: float = 0.99
    batch_size: int = 64
    replay_capacity: int = 100_000
    min_replay_before_train: int = 1_000
    train_every_n_steps: int = 4
    target_update_freq: int = 1_000

    # Epsilon schedule
    epsilon_start: float = 1.0
    epsilon_end: float = 0.01
    epsilon_decay_steps: int = 100_000

    # N-step returns
    n_step: int = 5

    # Policy snapshot
    policy_save_interval: int = 500
    policy_path: str = "scrapus_data/models/dqn/policy.pt"
    onnx_path: str = "scrapus_data/models/dqn/policy.onnx"
    coreml_path: str = "scrapus_data/models/dqn/policy.mlpackage"

    # Device
    use_mps: bool = True  # Apple M1 Metal Performance Shaders


# ======================= Epsilon Scheduler ==================================

class EpsilonScheduler:
    """Linear epsilon decay from start to end over decay_steps."""

    __slots__ = ("start", "end", "decay_steps", "_decay_rate")

    def __init__(
        self,
        start: float = 1.0,
        end: float = 0.01,
        decay_steps: int = 100_000,
    ) -> None:
        self.start = start
        self.end = end
        self.decay_steps = decay_steps
        self._decay_rate = (start - end) / decay_steps

    def get_epsilon(self, step: int) -> float:
        return max(self.end, self.start - step * self._decay_rate)


# ======================= DQN Network (PyTorch) ==============================

if _HAS_TORCH:

    class DQNNetwork(nn.Module):
        """3-layer MLP: state_dim -> 512 -> 256 -> action_dim.

        Produces raw Q-values (no softmax).  ReLU activations.
        No dropout -- replay buffer diversity provides regularisation.
        Size: ~5 MB in ONNX INT8.
        """

        def __init__(self, config: DQNConfig) -> None:
            super().__init__()
            self.fc1 = nn.Linear(config.state_dim, config.hidden_1)
            self.fc2 = nn.Linear(config.hidden_1, config.hidden_2)
            self.fc3 = nn.Linear(config.hidden_2, config.action_dim)

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            x = F.relu(self.fc1(x))
            x = F.relu(self.fc2(x))
            return self.fc3(x)

else:
    # Stub so imports don't break when torch is absent
    class DQNNetwork:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for DQNNetwork")


# ======================= ONNX Inference Wrapper =============================

class ONNXInferenceEngine:
    """Lightweight ONNX Runtime wrapper for DQN inference.

    Attempts CoreML EP on macOS (Apple Neural Engine, ~0.3 ms) and falls
    back to CPU EP.  Thread-safe for async crawler workers.
    """

    def __init__(self, onnx_path: str) -> None:
        if not _HAS_ONNX:
            raise RuntimeError("onnxruntime not installed")
        if not os.path.exists(onnx_path):
            raise FileNotFoundError(f"ONNX model not found: {onnx_path}")

        providers = self._select_providers()
        self.session = ort.InferenceSession(onnx_path, providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name
        logger.info(
            "ONNX session created with providers=%s",
            self.session.get_providers(),
        )

    @staticmethod
    def _select_providers() -> List[str]:
        available = ort.get_available_providers()
        providers: List[str] = []
        if "CoreMLExecutionProvider" in available:
            providers.append("CoreMLExecutionProvider")
        providers.append("CPUExecutionProvider")
        return providers

    def predict_q_values(self, state: np.ndarray) -> np.ndarray:
        """Return Q-values for a single state or batch.

        Args:
            state: shape (state_dim,) or (batch, state_dim), float32.

        Returns:
            Q-values, shape (action_dim,) or (batch, action_dim).
        """
        if state.ndim == 1:
            state = state[np.newaxis, :]
        result = self.session.run(
            [self.output_name],
            {self.input_name: state.astype(np.float32)},
        )
        q_values: np.ndarray = result[0]
        return q_values.squeeze(0) if q_values.shape[0] == 1 else q_values

    def select_action(self, state: np.ndarray, num_links: int) -> int:
        """Select best action (greedy) from Q-values, clamped to num_links."""
        q = self.predict_q_values(state)
        # Mask actions beyond available links
        valid_q = q[:num_links] if num_links < len(q) else q
        return int(np.argmax(valid_q))


# ======================= Double DQN Agent ===================================

class DoubleDQNAgent:
    """Double DQN agent with MPS training and ONNX export.

    Decouples action selection (online network) from value evaluation
    (target network) to reduce Q-value overestimation (Van Hasselt 2016).
    """

    def __init__(self, config: Optional[DQNConfig] = None) -> None:
        if not _HAS_TORCH:
            raise RuntimeError("PyTorch required for DoubleDQNAgent")

        self.config = config or DQNConfig()
        self.device = self._resolve_device()

        # Online + target networks
        self.q_network = DQNNetwork(self.config).to(self.device)
        self.target_network = DQNNetwork(self.config).to(self.device)
        self.target_network.load_state_dict(self.q_network.state_dict())
        self.target_network.eval()

        # Optimiser
        self.optimizer = optim.Adam(
            self.q_network.parameters(), lr=self.config.lr
        )

        # Epsilon scheduler
        self.epsilon_scheduler = EpsilonScheduler(
            self.config.epsilon_start,
            self.config.epsilon_end,
            self.config.epsilon_decay_steps,
        )

        # Counters
        self.update_counter: int = 0
        self.train_step: int = 0

        # Metrics for convergence monitoring
        self._recent_losses: List[float] = []
        self._recent_q_values: List[float] = []

        logger.info(
            "DoubleDQNAgent initialised: device=%s, state_dim=%d, action_dim=%d",
            self.device,
            self.config.state_dim,
            self.config.action_dim,
        )

    # ---- Device selection ---------------------------------------------------

    def _resolve_device(self) -> "torch.device":
        if self.config.use_mps and torch.backends.mps.is_available():
            logger.info("Using MPS (Apple M1 GPU) for training")
            return torch.device("mps")
        logger.info("Using CPU for training")
        return torch.device("cpu")

    # ---- Action selection ---------------------------------------------------

    def select_action(
        self,
        state: np.ndarray,
        num_links: int,
        global_step: int,
    ) -> Tuple[int, float]:
        """Epsilon-greedy action selection.

        Args:
            state: (state_dim,) float32 array.
            num_links: number of available link candidates on the page.
            global_step: current global training step.

        Returns:
            (action_index, epsilon)
        """
        epsilon = self.epsilon_scheduler.get_epsilon(global_step)
        action_dim = min(num_links, self.config.action_dim)

        if np.random.random() < epsilon:
            return int(np.random.randint(0, action_dim)), epsilon

        state_t = torch.as_tensor(
            state, dtype=torch.float32, device=self.device
        ).unsqueeze(0)
        with torch.no_grad():
            q_values = self.q_network(state_t).cpu().numpy().flatten()
        valid_q = q_values[:action_dim]
        return int(np.argmax(valid_q)), epsilon

    # ---- Training -----------------------------------------------------------

    def compute_td_loss(
        self,
        states: "torch.Tensor",
        actions: "torch.Tensor",
        rewards: "torch.Tensor",
        next_states: "torch.Tensor",
        dones: "torch.Tensor",
        is_weights: Optional["torch.Tensor"] = None,
    ) -> Tuple["torch.Tensor", np.ndarray]:
        """Double DQN loss with optional importance-sampling weights.

        Returns:
            (scalar_loss, per-sample_td_errors)
        """
        # Q(s, a) from online network
        current_q = self.q_network(states).gather(
            1, actions.unsqueeze(1)
        )

        with torch.no_grad():
            # Online net selects best action for next state
            next_actions = self.q_network(next_states).argmax(1, keepdim=True)
            # Target net evaluates that action
            next_q = self.target_network(next_states).gather(1, next_actions)
            target_q = (
                rewards.unsqueeze(1)
                + (1.0 - dones.unsqueeze(1)) * self.config.gamma * next_q
            )

        # Per-sample TD errors (for PER priority updates)
        td_errors = (current_q - target_q).detach().cpu().numpy().flatten()

        # Huber loss (smooth L1)
        elementwise_loss = F.smooth_l1_loss(
            current_q, target_q, reduction="none"
        )

        if is_weights is not None:
            loss = (elementwise_loss * is_weights.unsqueeze(1)).mean()
        else:
            loss = elementwise_loss.mean()

        return loss, td_errors

    def train_step_on_batch(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        rewards: np.ndarray,
        next_states: np.ndarray,
        dones: np.ndarray,
        is_weights: Optional[np.ndarray] = None,
    ) -> Tuple[float, np.ndarray]:
        """One gradient step on a batch.

        Returns:
            (loss_value, per_sample_td_errors)
        """
        dev = self.device
        states_t = torch.as_tensor(states, dtype=torch.float32, device=dev)
        actions_t = torch.as_tensor(actions, dtype=torch.long, device=dev)
        rewards_t = torch.as_tensor(rewards, dtype=torch.float32, device=dev)
        next_t = torch.as_tensor(next_states, dtype=torch.float32, device=dev)
        dones_t = torch.as_tensor(dones, dtype=torch.float32, device=dev)
        weights_t = (
            torch.as_tensor(is_weights, dtype=torch.float32, device=dev)
            if is_weights is not None
            else None
        )

        loss, td_errors = self.compute_td_loss(
            states_t, actions_t, rewards_t, next_t, dones_t, weights_t
        )

        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(
            self.q_network.parameters(), self.config.grad_clip_max_norm
        )
        self.optimizer.step()

        self.train_step += 1
        loss_val = loss.item()

        # Track for convergence monitoring
        self._recent_losses.append(loss_val)
        if len(self._recent_losses) > 1000:
            self._recent_losses = self._recent_losses[-500:]

        with torch.no_grad():
            mean_q = self.q_network(states_t).mean().item()
            max_q = self.q_network(states_t).max().item()
        self._recent_q_values.append(mean_q)
        if len(self._recent_q_values) > 1000:
            self._recent_q_values = self._recent_q_values[-500:]

        # Periodic target network hard-update
        self._maybe_update_target()

        return loss_val, td_errors

    def _maybe_update_target(self) -> None:
        self.update_counter += 1
        if self.update_counter % self.config.target_update_freq == 0:
            self.target_network.load_state_dict(self.q_network.state_dict())
            logger.info(
                "Target network updated at step %d", self.update_counter
            )

    # ---- Convergence diagnostics -------------------------------------------

    def get_convergence_metrics(self, recent_rewards: List[float]) -> Dict[str, float]:
        """Metrics logged every ~100 learner steps for monitoring.

        Divergence warnings:
        - max_q > 50: Q-value overestimation
        - loss increasing for >5K steps: lr too high or stale priorities
        - harvest < 8% after reaching 15%: domain scheduler stuck
        """
        metrics: Dict[str, float] = {
            "train_step": float(self.train_step),
            "mean_loss": float(np.mean(self._recent_losses[-100:])) if self._recent_losses else 0.0,
            "mean_q": float(np.mean(self._recent_q_values[-100:])) if self._recent_q_values else 0.0,
            "epsilon": self.epsilon_scheduler.get_epsilon(self.update_counter),
            "mean_reward": float(np.mean(recent_rewards[-1000:])) if recent_rewards else 0.0,
        }
        return metrics

    # ---- Persistence --------------------------------------------------------

    def save_checkpoint(self, path: Optional[str] = None) -> str:
        """Save full checkpoint (online + target + optimiser + counters)."""
        path = path or self.config.policy_path
        os.makedirs(os.path.dirname(path), exist_ok=True)

        checkpoint = {
            "q_network": self.q_network.state_dict(),
            "target_network": self.target_network.state_dict(),
            "optimizer": self.optimizer.state_dict(),
            "update_counter": self.update_counter,
            "train_step": self.train_step,
            "config": self.config.__dict__,
        }
        torch.save(checkpoint, path)
        logger.info("Saved checkpoint to %s", path)
        return path

    def load_checkpoint(self, path: Optional[str] = None) -> None:
        """Restore from checkpoint."""
        path = path or self.config.policy_path
        if not os.path.exists(path):
            raise FileNotFoundError(f"Checkpoint not found: {path}")

        checkpoint = torch.load(path, map_location=self.device, weights_only=False)
        self.q_network.load_state_dict(checkpoint["q_network"])
        self.target_network.load_state_dict(checkpoint["target_network"])
        self.optimizer.load_state_dict(checkpoint["optimizer"])
        self.update_counter = checkpoint.get("update_counter", 0)
        self.train_step = checkpoint.get("train_step", 0)
        logger.info("Loaded checkpoint from %s (step %d)", path, self.train_step)

    def save_policy_snapshot(self, path: Optional[str] = None) -> str:
        """Save only the online network weights (for actor threads)."""
        path = path or self.config.policy_path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        torch.save(self.q_network.state_dict(), path)
        return path

    def load_policy_snapshot(self, path: Optional[str] = None) -> None:
        """Load policy weights into the online network (actor reload)."""
        path = path or self.config.policy_path
        state = torch.load(path, map_location=self.device, weights_only=True)
        self.q_network.load_state_dict(state)
        self.q_network.eval()

    # ---- ONNX export --------------------------------------------------------

    def export_onnx(
        self,
        onnx_path: Optional[str] = None,
        quantize_int8: bool = True,
    ) -> str:
        """Export online network to ONNX (optionally INT8 quantised).

        The exported model runs on CoreML EP for ~0.3 ms inference.
        """
        onnx_path = onnx_path or self.config.onnx_path
        os.makedirs(os.path.dirname(onnx_path), exist_ok=True)

        self.q_network.eval()
        dummy = torch.randn(1, self.config.state_dim, device="cpu")
        q_cpu = self.q_network.cpu()

        torch.onnx.export(
            q_cpu,
            dummy,
            onnx_path,
            input_names=["state"],
            output_names=["q_values"],
            dynamic_axes={"state": {0: "batch"}, "q_values": {0: "batch"}},
            opset_version=14,
        )
        logger.info("Exported ONNX model to %s", onnx_path)

        if quantize_int8:
            onnx_path = self._quantize_onnx_int8(onnx_path)

        # Move network back to training device
        self.q_network.to(self.device)
        self.q_network.train()

        return onnx_path

    @staticmethod
    def _quantize_onnx_int8(onnx_path: str) -> str:
        """Apply dynamic INT8 quantisation to ONNX model."""
        try:
            from onnxruntime.quantization import quantize_dynamic, QuantType

            quantised_path = onnx_path.replace(".onnx", "_int8.onnx")
            quantize_dynamic(
                onnx_path,
                quantised_path,
                weight_type=QuantType.QInt8,
            )
            logger.info("Quantised ONNX model -> %s", quantised_path)
            return quantised_path
        except ImportError:
            logger.warning("onnxruntime.quantization unavailable, skipping INT8")
            return onnx_path

    def export_coreml(self, coreml_path: Optional[str] = None) -> Optional[str]:
        """Convert ONNX to CoreML for Neural Engine acceleration."""
        if not _HAS_COREML:
            logger.warning("coremltools not installed, skipping CoreML export")
            return None

        onnx_path = self.config.onnx_path
        if not os.path.exists(onnx_path):
            onnx_path = self.export_onnx(quantize_int8=False)

        coreml_path = coreml_path or self.config.coreml_path
        os.makedirs(os.path.dirname(coreml_path), exist_ok=True)

        mlmodel = ct.converters.onnx.convert(model=onnx_path)
        mlmodel.save(coreml_path)
        logger.info("Exported CoreML model to %s", coreml_path)
        return coreml_path

    # ---- Cleanup ------------------------------------------------------------

    def release(self) -> None:
        """Free GPU memory. Call when done training."""
        del self.q_network
        del self.target_network
        del self.optimizer
        if _HAS_TORCH:
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
        gc.collect()
        logger.info("DoubleDQNAgent released")


# ======================= N-Step Return Helpers ==============================

def compute_nstep_return(
    rewards: List[float],
    gamma: float,
    n: int,
    bootstrap_q: float,
) -> float:
    """Compute n-step discounted return with bootstrap.

    With n=5 and gamma=0.99 a reward 5 steps in the future contributes
    0.99^5 = 0.951 of its value, bridging short delays.
    """
    total = 0.0
    for i, r in enumerate(rewards[:n]):
        total += (gamma ** i) * r
    total += (gamma ** n) * bootstrap_q
    return total


def relabel_trajectory_hindsight(
    trajectory: List[Dict[str, Any]],
    final_reward: float,
    gamma: float = 0.99,
    scale: float = 0.1,
) -> List[Dict[str, Any]]:
    """Propagate final reward backward through a trajectory.

    After extraction confirms a qualified lead at depth D, all preceding
    transitions receive a discounted bonus.  The 0.1 scale factor prevents
    the hindsight bonus from overwhelming the immediate reward signal.

    Empirically pushes harvest rate from ~15% to ~16% (RESEARCH.md 8.3).
    """
    n = len(trajectory)
    for i in range(n):
        steps_to_end = n - 1 - i
        bonus = final_reward * (gamma ** steps_to_end) * scale
        trajectory[i]["reward"] = trajectory[i].get("reward", 0.0) + bonus
    return trajectory


# ======================= URL Canonicalisation ===============================

def canonicalize_url(raw_url: str) -> str:
    """Normalise a URL for deduplication.

    1. Lowercase scheme and host.
    2. Strip fragment (#...).
    3. Sort query parameters alphabetically.
    4. Remove trailing slash on path (except root).
    """
    from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

    p = urlparse(raw_url)
    scheme = p.scheme.lower()
    host = p.netloc.lower()
    path = p.path.rstrip("/") or "/"
    query = urlencode(
        sorted(parse_qs(p.query, keep_blank_values=True).items()),
        doseq=True,
    )
    return urlunparse((scheme, host, path, "", query, ""))


# ======================= Episode Termination ================================

def check_episode_done(
    domain_frontier_empty: bool,
    depth: int,
    pages_crawled: int,
    max_depth: int = 5,
    max_pages: int = 500,
) -> bool:
    """Check if the current crawling episode should terminate.

    An episode ends when:
    1. Frontier exhausted for current domain.
    2. Depth exceeds max_depth (default 5).
    3. pages_crawled >= max_pages (default 500).
    """
    if domain_frontier_empty:
        return True
    if depth > max_depth:
        return True
    if pages_crawled >= max_pages:
        return True
    return False
