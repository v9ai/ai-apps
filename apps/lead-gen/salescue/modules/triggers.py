"""salescue/modules/triggers.py — Temporal Displacement Model

Research contribution: Freshness isn't a classification — it's a continuous temporal
reasoning task. We model the relationship between event mention and event occurrence
as a *temporal displacement distribution*. The model learns P(event_date | article_date,
text_features), predicting when the event actually happened given how it's described.
"""

import torch
import torch.nn as nn
import math

from ..base import BaseModule

EVENTS = [
    "new_funding", "job_change", "expansion", "layoff_restructure",
    "acquisition_merger", "new_product_launch", "leadership_change",
    "hiring_surge", "technology_adoption", "active_vendor_evaluation",
]


class TemporalDisplacementModel(BaseModule):
    name = "triggers"
    description = "Temporal displacement model for event freshness estimation"
    """
    Instead of classifying freshness into bins (current/recent/historical),
    predict a continuous temporal displacement: how many days before the
    article publication did the event actually occur?

    We model this as a log-normal distribution:
    log(displacement + 1) ~ N(mu(text), sigma(text))

    This gives us not just a point estimate but UNCERTAINTY about freshness.
    """

    def __init__(self, hidden=768):
        super().__init__()

        # event detector
        self.event_head = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, len(EVENTS)),
        )

        # temporal expression extractor at token level
        # 5 categories: today_word, recent_word, past_word, future_word, non_temporal
        self.temporal_tagger = nn.Linear(hidden, 5)

        # displacement predictor: mu and sigma of log-normal
        self.displacement_mu = nn.Sequential(
            nn.Linear(hidden + 5, 128), nn.GELU(),
            nn.Linear(128, len(EVENTS)),
        )

        self.displacement_sigma = nn.Sequential(
            nn.Linear(hidden + 5, 128), nn.GELU(),
            nn.Linear(128, len(EVENTS)),
            nn.Softplus(),
        )

    def _forward_batch(self, tokens):
        """Batched forward pass through event and displacement heads.

        Args:
            tokens: (B, seq, hidden) encoder output.

        Returns:
            event_probs: (B, n_events) sigmoid probabilities
            temporal_summaries: (B, 5) max-pooled temporal features
            mu: (B, n_events) displacement means
            sigma: (B, n_events) displacement stds
        """
        cls = tokens[:, 0]  # (B, hidden)
        B = tokens.shape[0]

        # Event detection (batched)
        event_logits = self.event_head(cls)    # (B, n_events)
        event_probs = event_logits.sigmoid()

        # Temporal tagging (batched)
        temporal_logits = self.temporal_tagger(tokens)  # (B, seq, 5)
        temporal_probs = temporal_logits.softmax(dim=-1)
        temporal_summaries = temporal_probs.max(dim=1).values  # (B, 5)

        # Displacement distribution (batched)
        disp_input = torch.cat([cls, temporal_summaries], dim=-1)  # (B, hidden+5)
        mu = self.displacement_mu(disp_input).clamp(-10, 10)
        sigma = self.displacement_sigma(disp_input) + 0.1

        return event_probs, temporal_summaries, mu, sigma

    def _format_result(self, event_probs, temporal_summary, mu, sigma, idx):
        """Format a single result dict from batch tensors at the given index."""
        events = []
        for i, event_name in enumerate(EVENTS):
            prob = event_probs[idx, i].item()
            if prob < 0.5:
                continue

            mu_i = mu[idx, i].item()
            sigma_i = sigma[idx, i].item()

            expected_displacement = math.exp(min(mu_i + sigma_i ** 2 / 2, 20))
            lower = math.exp(min(mu_i - 1.645 * sigma_i, 20))
            upper = math.exp(min(mu_i + 1.645 * sigma_i, 20))

            if expected_displacement < 3:
                freshness = "current"
            elif expected_displacement < 30:
                freshness = "recent"
            else:
                freshness = "historical"

            events.append({
                "type": event_name,
                "confidence": round(prob, 3),
                "freshness": freshness,
                "fresh": expected_displacement < 30,
                "displacement_days": round(expected_displacement, 1),
                "displacement_ci": [round(lower, 1), round(upper, 1)],
                "displacement_uncertainty": round(sigma_i, 3),
                "temporal_features": {
                    "today_signal": round(temporal_summary[idx, 0].item(), 3),
                    "recent_signal": round(temporal_summary[idx, 1].item(), 3),
                    "past_signal": round(temporal_summary[idx, 2].item(), 3),
                },
            })

        events.sort(key=lambda e: -e["confidence"])
        primary = next((e for e in events if e["fresh"]), events[0] if events else None)

        return {"events": events, "primary": primary}

    def process(self, encoded, text, **kwargs):
        encoder_output = encoded["encoder_output"]
        tokens = encoder_output.last_hidden_state  # (B, seq, hidden)

        event_probs, temporal_summaries, mu, sigma = self._forward_batch(tokens)

        return self._format_result(event_probs, temporal_summaries, mu, sigma, idx=0)

    def process_batch(self, batch_encoded, texts, **kwargs):
        """Vectorized batch trigger detection.

        All MLPs (event_head, temporal_tagger, displacement_mu/sigma) run
        on the full (B, seq, hidden) tensor in one pass.
        """
        tokens = batch_encoded["encoder_output"].last_hidden_state
        event_probs, temporal_summaries, mu, sigma = self._forward_batch(tokens)

        B = tokens.shape[0]
        return [
            self._format_result(event_probs, temporal_summaries, mu, sigma, idx=i)
            for i in range(B)
        ]

    def compute_loss(self, mu, sigma, true_displacement_days):
        """
        Negative log-likelihood of log-normal distribution.
        """
        log_disp = torch.log(true_displacement_days.float() + 1)

        nll = 0.5 * ((log_disp - mu) / sigma) ** 2 + sigma.log() + 0.5 * math.log(2 * math.pi)

        return nll.mean()
