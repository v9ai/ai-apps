"""salescue/modules/survival.py — Deep Survival Machine for Time-to-Conversion

Research contribution: Knowing a lead is "warm" is useful but imprecise. Deep Survival
Machines (Nagpal et al., 2021) model the time-to-event distribution as a *mixture of
parametric survival functions* (Weibull distributions) conditioned on neural features.
This avoids the proportional hazards assumption of Cox models and naturally handles
censored observations (leads still in pipeline).

Output: P(convert within T days), median time-to-conversion, risk group assignment,
and the full survival curve S(t) for visualization.
"""

from __future__ import annotations

import math
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..base import BaseModule

RISK_GROUPS = ["fast_mover", "steady", "long_cycle", "stalled", "disqualified"]

# Number of mixture components (Weibull distributions)
K_MIXTURES = 5

# Structured feature dimensions (ai_tier, score, hf_presence, days_since_discovery,
# signal_count, model_count, dataset_count, contact_count)
STRUCTURED_DIM = 8


class WeibullMixture(nn.Module):
    """Mixture of K Weibull distributions parameterized by neural features.

    Each component k has:
        - shape_k (alpha): controls hazard shape (increasing/decreasing/constant)
        - scale_k (beta): controls time scale
        - weight_k (pi): mixture weight

    S(t) = sum_k pi_k * exp(-(t / beta_k)^alpha_k)
    """

    def __init__(self, feature_dim: int, k: int = K_MIXTURES):
        super().__init__()
        self.k = k

        # Predict Weibull parameters from features
        self.shape_net = nn.Linear(feature_dim, k)   # log(alpha)
        self.scale_net = nn.Linear(feature_dim, k)   # log(beta)
        self.weight_net = nn.Linear(feature_dim, k)  # logits for pi

    def forward(self, features: torch.Tensor) -> dict[str, torch.Tensor]:
        """Compute Weibull mixture parameters.

        Args:
            features: (batch, feature_dim) combined text + structured features

        Returns:
            dict with shapes, scales, weights tensors each (batch, K)
        """
        # Shape (alpha) > 0 — softplus ensures positivity, +0.1 avoids degenerate
        shapes = F.softplus(self.shape_net(features)) + 0.1

        # Scale (beta) > 0
        scales = F.softplus(self.scale_net(features)) + 0.1

        # Mixture weights sum to 1
        weights = F.softmax(self.weight_net(features), dim=-1)

        return {"shapes": shapes, "scales": scales, "weights": weights}

    def survival(
        self,
        params: dict[str, torch.Tensor],
        t: torch.Tensor,
    ) -> torch.Tensor:
        """Compute survival probability S(t) = P(T > t).

        Args:
            params: output of forward()
            t: (batch,) or scalar time points

        Returns:
            (batch,) survival probabilities
        """
        if t.dim() == 0:
            t = t.unsqueeze(0)
        t = t.unsqueeze(-1)  # (batch, 1) for broadcasting

        # S_k(t) = exp(-(t/beta)^alpha)
        component_survival = torch.exp(
            -((t / params["scales"]) ** params["shapes"])
        )

        # S(t) = sum_k pi_k * S_k(t)
        return (params["weights"] * component_survival).sum(dim=-1)


class DeepSurvivalMachine(BaseModule):
    """Time-to-conversion prediction via mixture of Weibull distributions.

    Combines DeBERTa text embeddings with structured company features
    to predict when a lead will convert (or be disqualified).
    """

    name = "survival"
    description = "Deep Survival Machine for time-to-conversion prediction"

    def __init__(self, hidden: int = 768):
        super().__init__()

        # Structured feature encoder
        self.struct_encoder = nn.Sequential(
            nn.Linear(STRUCTURED_DIM, 64),
            nn.GELU(),
            nn.Linear(64, 64),
        )

        # Combine text + structured features
        combined_dim = hidden + 64
        self.fusion = nn.Sequential(
            nn.Linear(combined_dim, 256),
            nn.GELU(),
            nn.LayerNorm(256),
            nn.Dropout(0.1),
        )

        # Weibull mixture head
        self.weibull = WeibullMixture(feature_dim=256, k=K_MIXTURES)

        # Risk group classifier (auxiliary task for interpretability)
        self.risk_head = nn.Linear(256, len(RISK_GROUPS))

    def process(self, encoded: dict, text: str, **kwargs: Any) -> dict[str, Any]:
        """Process text input with optional structured features."""
        cls = encoded["encoder_output"].last_hidden_state[:, 0]

        # Parse structured features from kwargs or use defaults
        struct_features = kwargs.get("structured_features", None)
        if struct_features is None:
            struct_features = torch.zeros(1, STRUCTURED_DIM, device=cls.device)
        elif not isinstance(struct_features, torch.Tensor):
            struct_features = torch.tensor(
                [struct_features], dtype=torch.float32, device=cls.device
            )
            if struct_features.dim() == 1:
                struct_features = struct_features.unsqueeze(0)

        return self._predict(cls, struct_features)

    def process_batch(self, batch_encoded: dict, texts: list[str], **kwargs: Any) -> list[dict[str, Any]]:
        """Vectorized batch survival prediction.

        The struct_encoder, fusion MLP, Weibull parameter nets, and risk_head
        all run on the full (B, hidden) CLS tensor in a single forward pass.
        Only median-finding (binary search) and result formatting loop per item.
        """
        cls_all = batch_encoded["encoder_output"].last_hidden_state[:, 0]  # (B, hidden)
        B = cls_all.shape[0]

        # Build batch struct features
        struct_features = kwargs.get("structured_features", None)
        if struct_features is None:
            struct_all = torch.zeros(B, STRUCTURED_DIM, device=cls_all.device)
        elif isinstance(struct_features, torch.Tensor):
            struct_all = struct_features
            if struct_all.dim() == 1:
                struct_all = struct_all.unsqueeze(0).expand(B, -1)
        else:
            struct_all = torch.tensor(
                [struct_features] if not isinstance(struct_features[0], (list, tuple)) else struct_features,
                dtype=torch.float32, device=cls_all.device,
            )
            if struct_all.shape[0] == 1 and B > 1:
                struct_all = struct_all.expand(B, -1)

        # Batched forward pass through all nets
        struct_encoded = self.struct_encoder(struct_all)  # (B, 64)
        combined = torch.cat([cls_all, struct_encoded], dim=-1)  # (B, hidden+64)
        fused = self.fusion(combined)  # (B, 256)

        params = self.weibull(fused)  # shapes/scales/weights each (B, K)
        risk_logits = self.risk_head(fused)  # (B, n_risk_groups)
        risk_probs = F.softmax(risk_logits, dim=-1)
        risk_idxs = risk_probs.argmax(dim=-1)  # (B,)

        # Vectorized survival at key horizons
        horizons = [7, 14, 30, 60, 90]
        horizon_survivals = {}
        for t_val in horizons:
            t = torch.tensor(float(t_val), device=cls_all.device).expand(B)
            s_t = self.weibull.survival(params, t)  # (B,)
            horizon_survivals[t_val] = s_t

        # Format per-item results (only median search loops)
        results = []
        for i in range(B):
            survival_curve = {
                f"{t_val}d": round(horizon_survivals[t_val][i].item(), 3)
                for t_val in horizons
            }

            # Per-item median via binary search on single-item params
            single_params = {
                k: v[i:i+1] for k, v in params.items()
            }
            median_t = self._find_median(single_params, device=cls_all.device)

            p_30d = round(1 - survival_curve["30d"], 3)
            p_90d = round(1 - survival_curve["90d"], 3)
            risk_idx = risk_idxs[i].item()

            results.append({
                "median_days_to_conversion": round(median_t, 1),
                "p_convert_30d": p_30d,
                "p_convert_90d": p_90d,
                "risk_group": RISK_GROUPS[risk_idx],
                "risk_confidence": round(risk_probs[i, risk_idx].item(), 3),
                "survival_curve": survival_curve,
                "weibull_params": {
                    "shapes": params["shapes"][i].detach().tolist(),
                    "scales": params["scales"][i].detach().tolist(),
                    "weights": params["weights"][i].detach().tolist(),
                },
            })

        return results

    def predict(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Public API for survival prediction.

        Usage:
            model.predict("Series B AI startup, 200 employees, hiring aggressively",
                          structured_features=[2, 0.85, 72, 14, 8, 5, 2, 3])
        """
        from ..validation import validate_text
        text = validate_text(text)
        encoded = self.encode(text)
        return self.process(encoded, text, **kwargs)

    def _predict(
        self,
        cls: torch.Tensor,
        struct_features: torch.Tensor,
    ) -> dict[str, Any]:
        """Core prediction logic."""
        struct_encoded = self.struct_encoder(struct_features)
        combined = torch.cat([cls, struct_encoded], dim=-1)
        fused = self.fusion(combined)

        # Weibull parameters
        params = self.weibull(fused)

        # Survival probabilities at key horizons
        horizons = [7, 14, 30, 60, 90]
        survival_curve = {}
        for t_val in horizons:
            t = torch.tensor(float(t_val), device=cls.device)
            s_t = self.weibull.survival(params, t).item()
            survival_curve[f"{t_val}d"] = round(s_t, 3)

        # Median time-to-conversion: find t where S(t) = 0.5
        median_t = self._find_median(params, device=cls.device)

        # Conversion probabilities = 1 - S(t)
        p_30d = round(1 - survival_curve["30d"], 3)
        p_90d = round(1 - survival_curve["90d"], 3)

        # Risk group
        risk_logits = self.risk_head(fused)
        risk_probs = F.softmax(risk_logits, dim=-1)
        risk_idx = risk_probs.argmax(dim=-1).item()

        return {
            "median_days_to_conversion": round(median_t, 1),
            "p_convert_30d": p_30d,
            "p_convert_90d": p_90d,
            "risk_group": RISK_GROUPS[risk_idx],
            "risk_confidence": round(risk_probs[0, risk_idx].item(), 3),
            "survival_curve": survival_curve,
            "weibull_params": {
                "shapes": params["shapes"][0].detach().tolist(),
                "scales": params["scales"][0].detach().tolist(),
                "weights": params["weights"][0].detach().tolist(),
            },
        }

    def _find_median(self, params: dict[str, torch.Tensor], device: str = "cpu") -> float:
        """Binary search for median survival time S(t) = 0.5."""
        lo, hi = 1.0, 365.0
        for _ in range(20):
            mid = (lo + hi) / 2
            t = torch.tensor(mid, device=device)
            s = self.weibull.survival(params, t).item()
            if s > 0.5:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    def negative_log_likelihood(
        self,
        cls: torch.Tensor,
        struct_features: torch.Tensor,
        event_times: torch.Tensor,
        censored: torch.Tensor,
    ) -> torch.Tensor:
        """Training loss: NLL for censored survival data.

        Args:
            cls: (batch, hidden) text embeddings
            struct_features: (batch, STRUCTURED_DIM)
            event_times: (batch,) observed times
            censored: (batch,) 1 if censored (still in pipeline), 0 if event observed

        Returns:
            Scalar loss
        """
        struct_encoded = self.struct_encoder(struct_features)
        combined = torch.cat([cls, struct_encoded], dim=-1)
        fused = self.fusion(combined)
        params = self.weibull(fused)

        shapes = params["shapes"]   # (batch, K)
        scales = params["scales"]   # (batch, K)
        weights = params["weights"] # (batch, K)

        t = event_times.unsqueeze(-1)  # (batch, 1)

        # Log survival: log S_k(t) = -(t/beta)^alpha
        log_survival = -((t / scales) ** shapes)

        # Log density: log f_k(t) = log(alpha/beta) + (alpha-1)*log(t/beta) + log_survival
        log_density = (
            torch.log(shapes / scales + 1e-8)
            + (shapes - 1) * torch.log(t / scales + 1e-8)
            + log_survival
        )

        # For uncensored: log sum_k pi_k * f_k(t)
        # For censored: log sum_k pi_k * S_k(t)
        log_weights = torch.log(weights + 1e-8)

        uncensored_ll = torch.logsumexp(log_weights + log_density, dim=-1)
        censored_ll = torch.logsumexp(log_weights + log_survival, dim=-1)

        # Select based on censoring indicator
        ll = (1 - censored) * uncensored_ll + censored * censored_ll

        return -ll.mean()
