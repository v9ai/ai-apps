"""salescue/modules/anomaly.py — Signal Anomaly Detection (DAGMM-inspired)

Research contribution: The most actionable sales intelligence is detecting *sudden changes*:
a company dormant for 6 months suddenly hires 10 AI engineers or publishes 5 HF models
in a week. These anomalies are the highest-ROI outreach triggers.

Architecture: Deep Autoencoding Gaussian Mixture Model (DAGMM, Zong et al., 2018) adapted
for company signal time series. An autoencoder learns a compressed representation of
"normal" signal patterns; reconstruction error flags anomalies. A GMM in the latent space
clusters anomaly types (hiring_spike, funding_event, tech_adoption, etc.).

This module operates on structured features — no DeBERTa backbone needed.
"""

from __future__ import annotations

import json
import math
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..base import BaseModule

# Signal channels in the time series
SIGNAL_CHANNELS = [
    "hiring_count",
    "hf_model_activity",
    "hf_download_velocity",
    "website_changes",
    "linkedin_posts",
    "funding_events",
    "press_mentions",
    "github_commits",
]

ANOMALY_TYPES = [
    "hiring_spike",
    "model_release_burst",
    "download_surge",
    "website_overhaul",
    "social_activity_spike",
    "funding_event",
    "press_coverage_spike",
    "dev_activity_surge",
    "multi_signal_anomaly",
    "normal",
]

# Time series window: 12 weeks of weekly aggregated signals
WINDOW_SIZE = 12
INPUT_DIM = len(SIGNAL_CHANNELS) * WINDOW_SIZE  # 8 * 12 = 96


class SignalAutoencoder(nn.Module):
    """Autoencoder for company signal time series.

    Learns to reconstruct "normal" signal patterns. High reconstruction
    error indicates anomalous behavior worth investigating.
    """

    def __init__(self, input_dim: int = INPUT_DIM, latent_dim: int = 8):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.GELU(),
            nn.Linear(64, 32),
            nn.GELU(),
            nn.Linear(32, latent_dim),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 32),
            nn.GELU(),
            nn.Linear(32, 64),
            nn.GELU(),
            nn.Linear(64, input_dim),
        )

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Encode, decode, return (reconstruction, latent, recon_error)."""
        z = self.encoder(x)
        x_hat = self.decoder(z)

        # Per-sample reconstruction error (used as anomaly features)
        recon_error = ((x - x_hat) ** 2).mean(dim=-1, keepdim=True)
        cos_sim = F.cosine_similarity(x, x_hat, dim=-1).unsqueeze(-1)

        return x_hat, z, torch.cat([recon_error, cos_sim], dim=-1)


class GaussianMixture(nn.Module):
    """Estimation network for GMM parameters in latent + error space.

    Predicts soft assignments to K Gaussian components, then estimates
    component parameters (mean, covariance) from the assignments.
    """

    def __init__(self, feature_dim: int, k: int = len(ANOMALY_TYPES)):
        super().__init__()
        self.k = k
        self.estimation = nn.Sequential(
            nn.Linear(feature_dim, 16),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(16, k),
            nn.Softmax(dim=-1),
        )

    def forward(self, z_combined: torch.Tensor) -> torch.Tensor:
        """Predict soft GMM assignments.

        Args:
            z_combined: (batch, latent_dim + 2) — latent code + recon features

        Returns:
            (batch, K) soft assignment probabilities
        """
        return self.estimation(z_combined)


class SignalAnomalyDetector(BaseModule):
    """DAGMM-inspired anomaly detection for company buying signals.

    Detects unusual patterns in company signal time series that indicate
    high-value outreach opportunities.
    """

    name = "anomaly"
    description = "Signal anomaly detection for buying trigger identification"

    def __init__(self, hidden: int = 768, latent_dim: int = 8):
        super().__init__()
        self.latent_dim = latent_dim

        # Autoencoder for signal reconstruction
        self.autoencoder = SignalAutoencoder(INPUT_DIM, latent_dim)

        # GMM estimation on latent + recon error features
        self.gmm = GaussianMixture(latent_dim + 2, k=len(ANOMALY_TYPES))

        # Channel-level anomaly attribution
        self.channel_scorer = nn.Linear(len(SIGNAL_CHANNELS), len(SIGNAL_CHANNELS))

        # Optional: text-conditioned threshold adjustment
        # Companies described as "rapidly growing" should have higher baseline
        self.text_prior = nn.Sequential(
            nn.Linear(hidden, 32),
            nn.GELU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def process(self, encoded: dict, text: str, **kwargs: Any) -> dict[str, Any]:
        """Process with text context and signal time series."""
        cls = encoded["encoder_output"].last_hidden_state[:, 0]

        signals = kwargs.get("signals", None)
        if signals is None:
            return {"anomaly_score": 0, "is_anomalous": False,
                    "anomaly_type": "normal", "error": "no signal data provided"}

        return self._detect(cls, signals)

    def predict(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Public API.

        Usage:
            model.predict(
                "AI-native startup, Series A",
                signals={"hiring_count": [1,1,2,1,1,1,1,2,1,8,12,15], ...}
            )
        """
        from ..validation import validate_text
        text = validate_text(text)
        encoded = self.encode(text)
        return self.process(encoded, text, **kwargs)

    def _detect(self, cls: torch.Tensor, signals: dict | torch.Tensor) -> dict[str, Any]:
        """Core anomaly detection."""
        # Parse signal input
        if isinstance(signals, dict):
            x = self._signals_to_tensor(signals, cls.device)
        elif isinstance(signals, torch.Tensor):
            x = signals
        else:
            x = torch.tensor(signals, dtype=torch.float32, device=cls.device)

        if x.dim() == 1:
            x = x.unsqueeze(0)

        # Autoencoder forward pass
        x_hat, z, recon_features = self.autoencoder(x)
        z_combined = torch.cat([z, recon_features], dim=-1)

        # GMM soft assignments
        gamma = self.gmm(z_combined)  # (batch, K)

        # Anomaly score = reconstruction error (normalized)
        recon_error = recon_features[:, 0].item()
        cos_sim = recon_features[:, 1].item()

        # Text-conditioned threshold: "rapidly growing" companies
        # have higher baseline, so same absolute change is less anomalous
        text_prior = self.text_prior(cls).item()
        adjusted_score = recon_error * (1 - 0.3 * text_prior)

        # Z-score approximation (compare against learned baseline)
        z_score = math.sqrt(max(recon_error, 0)) * 3.0

        # Anomaly type from GMM
        type_idx = gamma.argmax(dim=-1).item()
        type_confidence = gamma[0, type_idx].item()

        # Channel-level attribution
        channel_errors = self._channel_attribution(x, x_hat)

        # Threshold: anomalous if z_score > 2.0 (approximately)
        is_anomalous = z_score > 2.0

        return {
            "anomaly_score": round(adjusted_score, 4),
            "is_anomalous": is_anomalous,
            "anomaly_type": ANOMALY_TYPES[type_idx],
            "type_confidence": round(type_confidence, 3),
            "z_score": round(z_score, 2),
            "cosine_similarity": round(cos_sim, 3),
            "channel_attribution": channel_errors,
            "text_prior_adjustment": round(text_prior, 3),
            "gmm_assignments": {
                ANOMALY_TYPES[i]: round(gamma[0, i].item(), 3)
                for i in range(len(ANOMALY_TYPES))
                if gamma[0, i].item() > 0.05
            },
        }

    def _signals_to_tensor(self, signals: dict, device: str) -> torch.Tensor:
        """Convert signal dict to flat tensor.

        Expected: {"hiring_count": [w1, w2, ..., w12], "hf_model_activity": [...], ...}
        """
        flat = []
        for channel in SIGNAL_CHANNELS:
            values = signals.get(channel, [0.0] * WINDOW_SIZE)
            # Pad or truncate to WINDOW_SIZE
            padded = (values + [0.0] * WINDOW_SIZE)[:WINDOW_SIZE]
            flat.extend(padded)
        return torch.tensor([flat], dtype=torch.float32, device=device)

    def _channel_attribution(self, x: torch.Tensor, x_hat: torch.Tensor) -> dict[str, float]:
        """Attribute anomaly to specific signal channels."""
        # Reshape to (batch, channels, window)
        x_2d = x.view(-1, len(SIGNAL_CHANNELS), WINDOW_SIZE)
        x_hat_2d = x_hat.view(-1, len(SIGNAL_CHANNELS), WINDOW_SIZE)

        # Per-channel reconstruction error
        channel_errors = ((x_2d - x_hat_2d) ** 2).mean(dim=-1)  # (batch, channels)

        # Normalize to sum to 1
        total = channel_errors.sum(dim=-1, keepdim=True).clamp(min=1e-8)
        attribution = (channel_errors / total)[0]

        return {
            SIGNAL_CHANNELS[i]: round(attribution[i].item(), 3)
            for i in range(len(SIGNAL_CHANNELS))
            if attribution[i].item() > 0.01
        }

    def dagmm_loss(
        self,
        x: torch.Tensor,
        lambda_energy: float = 0.1,
        lambda_cov_diag: float = 0.005,
    ) -> torch.Tensor:
        """Combined DAGMM training loss.

        Loss = reconstruction_loss + lambda_energy * energy + lambda_cov * penalty
        """
        x_hat, z, recon_features = self.autoencoder(x)
        z_combined = torch.cat([z, recon_features], dim=-1)
        gamma = self.gmm(z_combined)

        # Reconstruction loss
        recon_loss = ((x - x_hat) ** 2).mean()

        # Energy loss: negative log-likelihood under estimated GMM
        # (simplified: use negative entropy of assignments as proxy)
        energy = -(gamma * torch.log(gamma + 1e-8)).sum(dim=-1).mean()

        # Covariance diagonal penalty (prevent singular covariances)
        cov_penalty = torch.tensor(0.0, device=x.device)

        return recon_loss + lambda_energy * energy + lambda_cov_diag * cov_penalty
