"""salescue/modules/bandit.py — Contextual Thompson Sampling for Outreach Optimization

Research contribution: Email outreach has a combinatorial action space: template type,
send timing, subject style, personalization level. A/B testing requires explicit
experimentation and is slow. Contextual Thompson Sampling (Agrawal & Goyal, 2013)
naturally balances exploration (trying new approaches) with exploitation (using what
works), learning per-prospect-type preferences from reward feedback.

Architecture: Linear Thompson Sampling with Bayesian linear regression per arm.
Context = DeBERTa company embedding + structured features. Arms = discrete actions.
Posterior update is O(d^2) where d=context_dim — ~4MB of matrices, negligible memory.
"""

from __future__ import annotations

import json
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..base import BaseModule

# Outreach action space
TEMPLATES = ["cold_intro", "case_study", "social_proof", "direct_ask", "value_prop"]
TIMINGS = ["monday_9am", "tuesday_10am", "wednesday_2pm", "thursday_11am", "friday_3pm"]
SUBJECT_STYLES = ["question", "personalized", "stat_hook", "mutual_connection", "direct"]

# Flattened arm index = template * len(TIMINGS) * len(SUBJECT_STYLES) + timing * len(SUBJECT_STYLES) + style
NUM_ARMS = len(TEMPLATES) * len(TIMINGS) * len(SUBJECT_STYLES)  # 5*5*5 = 125

# Context dimension: DeBERTa CLS (768) compressed to 64 + structured features
CONTEXT_DIM = 64 + 8  # compressed text + structured


class BayesianLinearArm(nn.Module):
    """Bayesian linear regression for a single arm.

    Maintains a posterior N(mu, Sigma) over the weight vector w,
    where reward = w^T context + noise.

    Prior: w ~ N(0, lambda^-1 * I)
    Posterior update: standard Bayesian linear regression closed-form.
    """

    def __init__(self, context_dim: int, prior_precision: float = 1.0):
        super().__init__()
        self.context_dim = context_dim

        # Posterior precision matrix: Lambda = lambda_0 * I + sum(x_i x_i^T)
        self.register_buffer(
            "precision",
            prior_precision * torch.eye(context_dim),
        )

        # Posterior mean numerator: b = sum(r_i * x_i)
        self.register_buffer("b", torch.zeros(context_dim))

        # Observation noise precision
        self.register_buffer(
            "noise_precision",
            torch.tensor(1.0),
        )

    def sample_weight(self) -> torch.Tensor:
        """Sample w from the posterior for Thompson Sampling."""
        # Posterior mean: mu = Lambda^-1 b
        try:
            L = torch.linalg.cholesky(self.precision)
            mu = torch.cholesky_solve(self.b.unsqueeze(-1), L).squeeze(-1)

            # Sample: w ~ N(mu, Lambda^-1)
            z = torch.randn_like(mu)
            w = mu + torch.cholesky_solve(z.unsqueeze(-1), L).squeeze(-1)
        except torch._C._LinAlgError:
            # Fallback if precision is not PD (early training)
            mu = torch.zeros(self.context_dim)
            w = mu + 0.1 * torch.randn_like(mu)

        return w

    def expected_reward(self, context: torch.Tensor) -> float:
        """Compute expected reward (posterior mean prediction)."""
        try:
            L = torch.linalg.cholesky(self.precision)
            mu = torch.cholesky_solve(self.b.unsqueeze(-1), L).squeeze(-1)
        except torch._C._LinAlgError:
            mu = torch.zeros(self.context_dim, device=context.device)
        return (mu * context).sum().item()

    def update(self, context: torch.Tensor, reward: float):
        """Update posterior with new observation (context, reward).

        Closed-form Bayesian linear regression update:
            Lambda_new = Lambda_old + x x^T
            b_new = b_old + r * x
        """
        if context.dim() > 1:
            context = context.squeeze(0)
        self.precision += torch.outer(context, context)
        self.b += reward * context


class OutreachBandit(BaseModule):
    """Thompson Sampling for outreach template/timing/style optimization.

    Given a prospect (company description + features), samples from the
    posterior to recommend the best outreach action, then updates the
    posterior when reward feedback arrives.
    """

    name = "bandit"
    description = "Contextual Thompson Sampling for outreach optimization"

    def __init__(self, hidden: int = 768):
        super().__init__()

        # Compress DeBERTa CLS to low-dim context
        self.text_compressor = nn.Sequential(
            nn.Linear(hidden, 128),
            nn.GELU(),
            nn.Linear(128, 64),
        )

        # Arms: one BayesianLinearArm per action
        self.arms = nn.ModuleList([
            BayesianLinearArm(CONTEXT_DIM) for _ in range(NUM_ARMS)
        ])

        # Exploration temperature (learnable)
        self.log_temperature = nn.Parameter(torch.tensor(0.0))

    def process(self, encoded: dict, text: str, **kwargs: Any) -> dict[str, Any]:
        cls = encoded["encoder_output"].last_hidden_state[:, 0]
        struct = kwargs.get("structured_features", None)
        return self._recommend(cls, struct)

    def predict(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Public API — recommend best outreach action for a prospect.

        Usage:
            model.predict("AI-native startup, 200 employees, Series B",
                          structured_features=[2, 0.85, 72, 14, 8, 5, 2, 3])
        """
        from ..validation import validate_text
        text = validate_text(text)
        encoded = self.encode(text)
        return self.process(encoded, text, **kwargs)

    def _recommend(
        self,
        cls: torch.Tensor,
        struct_features: torch.Tensor | list | None = None,
    ) -> dict[str, Any]:
        """Sample from posteriors and recommend best action."""
        # Build context vector
        text_ctx = self.text_compressor(cls).squeeze(0)  # (64,)

        if struct_features is not None:
            if not isinstance(struct_features, torch.Tensor):
                struct_features = torch.tensor(
                    struct_features, dtype=torch.float32, device=cls.device
                )
            if struct_features.dim() > 1:
                struct_features = struct_features.squeeze(0)
            # Pad/truncate to 8
            sf = torch.zeros(8, device=cls.device)
            sf[:min(len(struct_features), 8)] = struct_features[:8]
        else:
            sf = torch.zeros(8, device=cls.device)

        context = torch.cat([text_ctx, sf])  # (72,) -> need CONTEXT_DIM

        # Thompson Sampling: sample weight from each arm's posterior
        temperature = self.log_temperature.exp().item()
        sampled_rewards = []
        expected_rewards = []

        for arm in self.arms:
            w = arm.sample_weight()
            sampled = (w * context).sum().item() * temperature
            sampled_rewards.append(sampled)
            expected_rewards.append(arm.expected_reward(context))

        # Best arm by sampled reward
        best_idx = max(range(NUM_ARMS), key=lambda i: sampled_rewards[i])

        # Decode arm index to action
        template_idx = best_idx // (len(TIMINGS) * len(SUBJECT_STYLES))
        remainder = best_idx % (len(TIMINGS) * len(SUBJECT_STYLES))
        timing_idx = remainder // len(SUBJECT_STYLES)
        style_idx = remainder % len(SUBJECT_STYLES)

        # Top 3 alternatives
        ranked = sorted(range(NUM_ARMS), key=lambda i: sampled_rewards[i], reverse=True)
        alternatives = []
        for idx in ranked[1:4]:
            t_i = idx // (len(TIMINGS) * len(SUBJECT_STYLES))
            rem = idx % (len(TIMINGS) * len(SUBJECT_STYLES))
            ti_i = rem // len(SUBJECT_STYLES)
            s_i = rem % len(SUBJECT_STYLES)
            alternatives.append({
                "template": TEMPLATES[t_i],
                "timing": TIMINGS[ti_i],
                "subject_style": SUBJECT_STYLES[s_i],
                "sampled_reward": round(sampled_rewards[idx], 4),
            })

        return {
            "best_arm": {
                "template": TEMPLATES[template_idx],
                "timing": TIMINGS[timing_idx],
                "subject_style": SUBJECT_STYLES[style_idx],
            },
            "expected_reward": round(expected_rewards[best_idx], 4),
            "sampled_reward": round(sampled_rewards[best_idx], 4),
            "exploration_temperature": round(temperature, 3),
            "alternatives": alternatives,
            "arm_index": best_idx,
            "total_arms": NUM_ARMS,
        }

    def update_reward(
        self,
        text: str,
        arm_index: int,
        reward: float,
        structured_features: list | None = None,
    ):
        """Update arm posterior with observed reward.

        Call this after sending an email and observing the outcome.

        Args:
            text: prospect description (same as used for recommendation)
            arm_index: the arm that was played (from predict result)
            reward: observed reward (e.g., 0=no reply, 0.5=auto-reply, 1=human reply)
            structured_features: same structured features used for recommendation
        """
        encoded = self.encode(text)
        cls = encoded["encoder_output"].last_hidden_state[:, 0]
        text_ctx = self.text_compressor(cls).squeeze(0).detach()

        if structured_features is not None:
            sf = torch.tensor(structured_features, dtype=torch.float32, device=cls.device)
            pad = torch.zeros(8, device=cls.device)
            pad[:min(len(sf), 8)] = sf[:8]
        else:
            pad = torch.zeros(8, device=cls.device)

        context = torch.cat([text_ctx, pad]).detach()
        self.arms[arm_index].update(context, reward)
