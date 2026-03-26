"""
Module 1b: Dueling DQN with Noisy Nets for RL-based focused web crawling.

Drop-in enhancement over crawler_dqn.py implementing:

1. Dueling DQN (Wang et al. 2016, "Dueling Network Architectures for Deep
   Reinforcement Learning", ICML) -- separates state-value and advantage
   streams so the agent can learn which states are valuable without needing
   to learn the effect of each action in every state.

2. NoisyNet (Fortunato et al. 2018, "Noisy Networks for Exploration", ICLR)
   -- factorised Gaussian noise injected into linear layers replaces
   epsilon-greedy, providing state-dependent learned exploration.

3. Combined Noisy Dueling DQN -- both improvements stacked.

All architectures share the same DQNConfig, checkpoint format, and ONNX
export pipeline.  Networks stay within the ~5 MB ONNX INT8 budget.

State: 768-dim page embedding (nomic-embed-text-v1.5) + scalar features
Actions: top-K link selection (0..action_dim-1)
Target: Apple M1 16GB, zero cloud dependency.
"""

import gc
import logging
import math
import os
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from crawler_dqn import (
    DQNConfig,
    DoubleDQNAgent,
    EpsilonScheduler,
    ONNXInferenceEngine,
    _HAS_COREML,
    _HAS_ONNX,
    _HAS_TORCH,
)

logger = logging.getLogger("crawler_dueling_dqn")

# ---------------------------------------------------------------------------
# PyTorch-gated network definitions
# ---------------------------------------------------------------------------

if _HAS_TORCH:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim

    # ======================= NoisyLinear ====================================

    class NoisyLinear(nn.Module):
        """Factorised Gaussian noisy linear layer (Fortunato et al. 2018).

        Replaces epsilon-greedy exploration with learned, state-dependent
        noise injected directly into network weights.  Uses factorised
        noise for parameter efficiency: 2p + 2q parameters vs. pq for
        independent noise, where p = in_features, q = out_features.

        Reference:
            Fortunato et al., "Noisy Networks for Exploration", ICLR 2018.
            https://arxiv.org/abs/1706.10295
        """

        def __init__(
            self,
            in_features: int,
            out_features: int,
            sigma_0: float = 0.5,
        ) -> None:
            super().__init__()
            self.in_features = in_features
            self.out_features = out_features
            self.sigma_0 = sigma_0

            # Learnable parameters
            self.weight_mu = nn.Parameter(
                torch.empty(out_features, in_features)
            )
            self.weight_sigma = nn.Parameter(
                torch.empty(out_features, in_features)
            )
            self.bias_mu = nn.Parameter(torch.empty(out_features))
            self.bias_sigma = nn.Parameter(torch.empty(out_features))

            # Factorised noise buffers (not parameters, not saved in state_dict
            # unless register_buffer is used -- we want them in state_dict for
            # reproducible checkpoints)
            self.register_buffer(
                "weight_epsilon", torch.empty(out_features, in_features)
            )
            self.register_buffer("bias_epsilon", torch.empty(out_features))

            self._noise_enabled = True
            self._init_parameters()
            self.reset_noise()

        def _init_parameters(self) -> None:
            """Initialise mu and sigma per Section 3.2 of the paper."""
            bound = 1.0 / math.sqrt(self.in_features)
            self.weight_mu.data.uniform_(-bound, bound)
            self.bias_mu.data.uniform_(-bound, bound)

            sigma_init = self.sigma_0 / math.sqrt(self.in_features)
            self.weight_sigma.data.fill_(sigma_init)
            self.bias_sigma.data.fill_(sigma_init)

        @staticmethod
        def _scale_noise(size: int) -> "torch.Tensor":
            """Factorised noise: f(x) = sign(x) * sqrt(|x|)."""
            x = torch.randn(size)
            return x.sign() * x.abs().sqrt()

        def reset_noise(self) -> None:
            """Sample new factorised noise.  Call before each forward pass
            during training to get fresh exploration noise."""
            epsilon_in = self._scale_noise(self.in_features)
            epsilon_out = self._scale_noise(self.out_features)
            # Outer product: (out, 1) @ (1, in) -> (out, in)
            self.weight_epsilon.copy_(epsilon_out.outer(epsilon_in))
            self.bias_epsilon.copy_(epsilon_out)

        def remove_noise(self) -> None:
            """Disable noise for deterministic inference / ONNX export."""
            self._noise_enabled = False

        def enable_noise(self) -> None:
            """Re-enable noise after remove_noise()."""
            self._noise_enabled = True

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            if self._noise_enabled and self.training:
                weight = self.weight_mu + self.weight_sigma * self.weight_epsilon
                bias = self.bias_mu + self.bias_sigma * self.bias_epsilon
            else:
                weight = self.weight_mu
                bias = self.bias_mu
            return F.linear(x, weight, bias)

        def extra_repr(self) -> str:
            return (
                f"in_features={self.in_features}, "
                f"out_features={self.out_features}, "
                f"sigma_0={self.sigma_0}"
            )

    # ======================= Dueling DQN Network ============================

    class DuelingDQNNetwork(nn.Module):
        """Dueling DQN architecture (Wang et al. 2016).

        Decomposes Q(s,a) into state-value V(s) and advantage A(s,a):

            Q(s,a) = V(s) + A(s,a) - mean_a'(A(s,a'))

        The advantage centering (subtracting the mean) ensures identifiability
        -- without it, V and A are only determined up to a constant.

        Architecture:
            shared:    state_dim -> 512 (ReLU)
            value:     512 -> 256 (ReLU) -> 1
            advantage: 512 -> 256 (ReLU) -> action_dim

        Parameter count is comparable to the original 3-layer MLP, staying
        within the ~5 MB ONNX INT8 budget.

        Reference:
            Wang et al., "Dueling Network Architectures for Deep
            Reinforcement Learning", ICML 2016.
            https://arxiv.org/abs/1511.06581
        """

        def __init__(self, config: DQNConfig) -> None:
            super().__init__()

            # Shared feature layer
            self.feature = nn.Linear(config.state_dim, config.hidden_1)

            # Value stream: scalar state value V(s)
            self.value_hidden = nn.Linear(config.hidden_1, config.hidden_2)
            self.value_out = nn.Linear(config.hidden_2, 1)

            # Advantage stream: per-action advantage A(s,a)
            self.advantage_hidden = nn.Linear(config.hidden_1, config.hidden_2)
            self.advantage_out = nn.Linear(config.hidden_2, config.action_dim)

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            features = F.relu(self.feature(x))

            # Value stream
            v = F.relu(self.value_hidden(features))
            v = self.value_out(v)  # (batch, 1)

            # Advantage stream
            a = F.relu(self.advantage_hidden(features))
            a = self.advantage_out(a)  # (batch, action_dim)

            # Q(s,a) = V(s) + A(s,a) - mean(A(s,.))
            q = v + a - a.mean(dim=1, keepdim=True)
            return q

    # ======================= Noisy Dueling DQN Network ======================

    class NoisyDuelingDQNNetwork(nn.Module):
        """Dueling DQN with NoisyLinear layers in both streams.

        Combines the representational benefit of the dueling architecture
        (Wang et al. 2016) with parametric exploration from noisy nets
        (Fortunato et al. 2018).  The shared feature layer uses a standard
        linear layer (noise is most useful in the decision layers), while
        both value and advantage streams use NoisyLinear.

        Architecture:
            shared:    state_dim -> 512 (ReLU, standard Linear)
            value:     512 -> 256 (ReLU, NoisyLinear) -> 1 (NoisyLinear)
            advantage: 512 -> 256 (ReLU, NoisyLinear) -> action_dim (NoisyLinear)

        Reference:
            Wang et al. 2016 + Fortunato et al. 2018 (combined).
        """

        def __init__(self, config: DQNConfig, sigma_0: float = 0.5) -> None:
            super().__init__()

            # Shared feature layer (standard -- noise in decision layers only)
            self.feature = nn.Linear(config.state_dim, config.hidden_1)

            # Value stream with noisy layers
            self.value_hidden = NoisyLinear(
                config.hidden_1, config.hidden_2, sigma_0
            )
            self.value_out = NoisyLinear(config.hidden_2, 1, sigma_0)

            # Advantage stream with noisy layers
            self.advantage_hidden = NoisyLinear(
                config.hidden_1, config.hidden_2, sigma_0
            )
            self.advantage_out = NoisyLinear(
                config.hidden_2, config.action_dim, sigma_0
            )

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            features = F.relu(self.feature(x))

            # Value stream
            v = F.relu(self.value_hidden(features))
            v = self.value_out(v)  # (batch, 1)

            # Advantage stream
            a = F.relu(self.advantage_hidden(features))
            a = self.advantage_out(a)  # (batch, action_dim)

            # Q(s,a) = V(s) + A(s,a) - mean(A(s,.))
            q = v + a - a.mean(dim=1, keepdim=True)
            return q

        def reset_noise(self) -> None:
            """Sample new noise for all NoisyLinear layers."""
            self.value_hidden.reset_noise()
            self.value_out.reset_noise()
            self.advantage_hidden.reset_noise()
            self.advantage_out.reset_noise()

        def remove_noise(self) -> None:
            """Disable noise in all NoisyLinear layers for deterministic
            inference or ONNX export."""
            self.value_hidden.remove_noise()
            self.value_out.remove_noise()
            self.advantage_hidden.remove_noise()
            self.advantage_out.remove_noise()

        def enable_noise(self) -> None:
            """Re-enable noise after remove_noise()."""
            self.value_hidden.enable_noise()
            self.value_out.enable_noise()
            self.advantage_hidden.enable_noise()
            self.advantage_out.enable_noise()

    # ======================= Dueling Double DQN Agent ========================

    class DuelingDoubleDQNAgent(DoubleDQNAgent):
        """Double DQN agent with Dueling architecture.

        Extends DoubleDQNAgent, replacing the vanilla MLP with a
        DuelingDQNNetwork (or NoisyDuelingDQNNetwork).  When using noisy
        nets, epsilon-greedy is bypassed -- the network noise provides
        sufficient exploration (Fortunato et al. 2018, Section 3.3).

        Checkpoint format is backwards compatible: state_dict keys differ
        (value_hidden, advantage_hidden, etc.) but the save/load logic
        is identical.

        ONNX export flattens noisy layers to standard linear (by calling
        remove_noise() before tracing), producing a deterministic model
        suitable for inference with CoreML EP.
        """

        def __init__(
            self,
            config: Optional[DQNConfig] = None,
            architecture: str = "dueling",
            sigma_0: float = 0.5,
        ) -> None:
            """Initialise agent with dueling or noisy_dueling architecture.

            Args:
                config: DQN hyperparameters.  Uses defaults if None.
                architecture: "dueling" for standard dueling, or
                    "noisy_dueling" for dueling + NoisyNet.
                sigma_0: Initial noise magnitude for NoisyLinear layers.
                    Only used when architecture="noisy_dueling".
            """
            if not _HAS_TORCH:
                raise RuntimeError("PyTorch required for DuelingDoubleDQNAgent")

            self.architecture = architecture
            self.sigma_0 = sigma_0
            self._uses_noisy_nets = architecture == "noisy_dueling"

            # Bypass parent __init__ to control network creation.
            # We replicate the setup from DoubleDQNAgent.__init__ but swap
            # in the dueling network.
            self.config = config or DQNConfig()
            self.device = self._resolve_device()

            # Build the appropriate network architecture
            self.q_network = self._build_network().to(self.device)
            self.target_network = self._build_network().to(self.device)
            self.target_network.load_state_dict(self.q_network.state_dict())
            self.target_network.eval()

            # Optimiser
            self.optimizer = optim.Adam(
                self.q_network.parameters(), lr=self.config.lr
            )

            # Epsilon scheduler (unused when noisy nets are active, but
            # kept for API compatibility and convergence metrics)
            self.epsilon_scheduler = EpsilonScheduler(
                self.config.epsilon_start,
                self.config.epsilon_end,
                self.config.epsilon_decay_steps,
            )

            # Counters
            self.update_counter: int = 0
            self.train_step_count: int = 0
            # Alias for parent class compatibility
            self.train_step = self.train_step_count

            # Metrics for convergence monitoring
            self._recent_losses: List[float] = []
            self._recent_q_values: List[float] = []

            logger.info(
                "DuelingDoubleDQNAgent initialised: device=%s, arch=%s, "
                "state_dim=%d, action_dim=%d, noisy=%s",
                self.device,
                self.architecture,
                self.config.state_dim,
                self.config.action_dim,
                self._uses_noisy_nets,
            )

        def _build_network(self) -> nn.Module:
            """Create the appropriate network for the chosen architecture."""
            if self._uses_noisy_nets:
                return NoisyDuelingDQNNetwork(self.config, self.sigma_0)
            return DuelingDQNNetwork(self.config)

        # ---- Action selection -----------------------------------------------

        def select_action(
            self,
            state: np.ndarray,
            num_links: int,
            global_step: int,
        ) -> Tuple[int, float]:
            """Select an action using the dueling Q-network.

            When using noisy nets, action selection is always greedy because
            the noise in the network weights provides exploration.  The
            returned epsilon is 0.0 in this case (for logging compatibility).

            When using standard dueling (no noise), falls back to the
            parent's epsilon-greedy selection.

            Args:
                state: (state_dim,) float32 array.
                num_links: number of available link candidates on the page.
                global_step: current global training step.

            Returns:
                (action_index, epsilon)
            """
            if self._uses_noisy_nets:
                # Noisy nets provide exploration -- always greedy
                action_dim = min(num_links, self.config.action_dim)
                state_t = torch.as_tensor(
                    state, dtype=torch.float32, device=self.device
                ).unsqueeze(0)
                with torch.no_grad():
                    q_values = self.q_network(state_t).cpu().numpy().flatten()
                valid_q = q_values[:action_dim]
                return int(np.argmax(valid_q)), 0.0

            # Standard dueling: use parent epsilon-greedy
            return super().select_action(state, num_links, global_step)

        # ---- Training -------------------------------------------------------

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

            When using noisy nets, resets noise in both online and target
            networks before the forward pass so each training step samples
            fresh exploration noise.

            Returns:
                (loss_value, per_sample_td_errors)
            """
            # Reset noise before forward passes (Fortunato et al. 2018, Alg 1)
            if self._uses_noisy_nets:
                self.q_network.reset_noise()
                self.target_network.reset_noise()

            return super().train_step_on_batch(
                states, actions, rewards, next_states, dones, is_weights
            )

        # ---- ONNX export ----------------------------------------------------

        def export_onnx(
            self,
            onnx_path: Optional[str] = None,
            quantize_int8: bool = True,
        ) -> str:
            """Export online network to ONNX.

            For noisy nets, calls remove_noise() before export so the ONNX
            model uses deterministic mu weights only (standard linear layers).
            Re-enables noise after export for continued training.
            """
            if self._uses_noisy_nets:
                self.q_network.remove_noise()

            try:
                result = super().export_onnx(onnx_path, quantize_int8)
            finally:
                if self._uses_noisy_nets:
                    self.q_network.enable_noise()

            return result

        # ---- Convergence diagnostics ----------------------------------------

        def get_convergence_metrics(
            self, recent_rewards: List[float]
        ) -> Dict[str, float]:
            """Metrics with architecture-specific fields."""
            metrics = super().get_convergence_metrics(recent_rewards)
            metrics["architecture"] = {
                "dueling": 1.0,
                "noisy_dueling": 2.0,
            }.get(self.architecture, 0.0)
            metrics["uses_noisy_nets"] = 1.0 if self._uses_noisy_nets else 0.0
            return metrics

        # ---- Checkpoint persistence -----------------------------------------

        def save_checkpoint(self, path: Optional[str] = None) -> str:
            """Save checkpoint with architecture metadata."""
            path = path or self.config.policy_path
            os.makedirs(os.path.dirname(path), exist_ok=True)

            checkpoint = {
                "q_network": self.q_network.state_dict(),
                "target_network": self.target_network.state_dict(),
                "optimizer": self.optimizer.state_dict(),
                "update_counter": self.update_counter,
                "train_step": self.train_step,
                "config": self.config.__dict__,
                # Architecture metadata for safe reloading
                "architecture": self.architecture,
                "sigma_0": self.sigma_0,
            }
            torch.save(checkpoint, path)
            logger.info(
                "Saved %s checkpoint to %s", self.architecture, path
            )
            return path

        def load_checkpoint(self, path: Optional[str] = None) -> None:
            """Restore from checkpoint.

            Validates architecture match to prevent loading a vanilla
            checkpoint into a dueling network (mismatched keys).
            """
            path = path or self.config.policy_path
            if not os.path.exists(path):
                raise FileNotFoundError(f"Checkpoint not found: {path}")

            checkpoint = torch.load(
                path, map_location=self.device, weights_only=False
            )

            # Warn on architecture mismatch (but allow loading -- the
            # state_dict will fail naturally if keys don't match)
            saved_arch = checkpoint.get("architecture", "vanilla")
            if saved_arch != self.architecture:
                logger.warning(
                    "Architecture mismatch: checkpoint=%s, agent=%s",
                    saved_arch,
                    self.architecture,
                )

            self.q_network.load_state_dict(checkpoint["q_network"])
            self.target_network.load_state_dict(checkpoint["target_network"])
            self.optimizer.load_state_dict(checkpoint["optimizer"])
            self.update_counter = checkpoint.get("update_counter", 0)
            self.train_step = checkpoint.get("train_step", 0)
            logger.info(
                "Loaded %s checkpoint from %s (step %d)",
                self.architecture,
                path,
                self.train_step,
            )

        # ---- Cleanup --------------------------------------------------------

        def release(self) -> None:
            """Free GPU memory. Call when done training."""
            del self.q_network
            del self.target_network
            del self.optimizer
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
            gc.collect()
            logger.info("DuelingDoubleDQNAgent released")

else:
    # Stubs when torch is absent -- keep imports functional
    class NoisyLinear:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for NoisyLinear")

    class DuelingDQNNetwork:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for DuelingDQNNetwork")

    class NoisyDuelingDQNNetwork:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for NoisyDuelingDQNNetwork")

    class DuelingDoubleDQNAgent:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for DuelingDoubleDQNAgent")


# ======================= Factory ============================================

def create_agent(
    config: Optional[DQNConfig] = None,
    architecture: str = "dueling",
    sigma_0: float = 0.5,
) -> "DoubleDQNAgent":
    """Factory function to create a DQN agent with the specified architecture.

    Provides a single entry point for all DQN variants, making it easy to
    switch architectures via configuration without changing calling code.

    Args:
        config: DQN hyperparameters.  Uses defaults if None.
        architecture: One of:
            - "vanilla"       -- Original Double DQN (3-layer MLP).
            - "dueling"       -- Dueling Double DQN (Wang et al. 2016).
            - "noisy_dueling" -- Dueling DQN + NoisyNet (Fortunato et al. 2018).
        sigma_0: Initial noise magnitude for NoisyLinear layers.
            Only used when architecture="noisy_dueling".  Default 0.5
            per the original paper.

    Returns:
        A DoubleDQNAgent (or subclass) ready for training.

    Raises:
        ValueError: If architecture is not recognised.
        RuntimeError: If PyTorch is not installed.

    Example::

        from crawler_dueling_dqn import create_agent, DQNConfig

        config = DQNConfig(state_dim=784, action_dim=10)
        agent = create_agent(config, architecture="noisy_dueling")
        action, eps = agent.select_action(state, num_links=5, global_step=0)
    """
    config = config or DQNConfig()

    if architecture == "vanilla":
        return DoubleDQNAgent(config)
    elif architecture == "dueling":
        return DuelingDoubleDQNAgent(config, architecture="dueling")
    elif architecture == "noisy_dueling":
        return DuelingDoubleDQNAgent(
            config, architecture="noisy_dueling", sigma_0=sigma_0
        )
    else:
        raise ValueError(
            f"Unknown architecture '{architecture}'. "
            f"Choose from: 'vanilla', 'dueling', 'noisy_dueling'"
        )
