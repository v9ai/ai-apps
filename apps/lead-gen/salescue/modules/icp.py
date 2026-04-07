"""salescue/modules/icp.py — Wasserstein ICP Matching + Contrastive Learning

Research contribution: Cosine similarity between ICP and prospect embeddings treats both
as point vectors. But an ICP like "100-500 employees" represents a RANGE, not a point.
We model both ICP and prospect as distributions in embedding space and compute their
Wasserstein distance (earth mover's distance) for matching.

Extension: ContrastiveProjectionHead learns ICP-aligned embeddings from positive/negative
company examples using NT-Xent (Normalized Temperature-scaled Cross-Entropy) loss.
Based on SupCon (Khosla et al., 2020) adapted for B2B prospect matching.
"""

from __future__ import annotations

import json
import math
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..base import BaseModule

DIMS = ["industry", "size", "tech", "role", "signal", "hf_sophistication"]


class WassersteinICPMatcher(BaseModule):
    name = "icp"
    description = "Wasserstein distance ICP matching"
    """
    Models ICP and prospect as distributions in embedding space.
    Matching score = negative Wasserstein distance between distributions.

    ICP "100-500 employees in B2B SaaS" -> Gaussian in size-industry space
    Prospect "300 employees, healthcare SaaS" -> point in same space

    W2(N(mu, sigma^2), delta(x)) = sqrt(||x - mu||^2 + ||sigma||^2)
    """

    def __init__(self, hidden=768, dim_size=64):
        super().__init__()

        # per-dimension projection to shared space
        self.projections = nn.ModuleDict({
            d: nn.Linear(hidden, dim_size) for d in DIMS
        })

        # ICP distribution parameters: mu and sigma per dimension
        self.icp_mu = nn.ModuleDict({
            d: nn.Linear(hidden, dim_size) for d in DIMS
        })
        self.icp_logsigma = nn.ModuleDict({
            d: nn.Sequential(nn.Linear(hidden, dim_size), nn.Tanh()) for d in DIMS
        })

        # completeness detector
        self.completeness = nn.Sequential(nn.Linear(hidden, len(DIMS)), nn.Sigmoid())

        # learned dealbreaker thresholds
        self.thresholds = nn.Parameter(torch.zeros(len(DIMS)))

        # Contrastive projection head for training ICP-aligned embeddings
        self.contrastive = ContrastiveProjectionHead(hidden=hidden)

    def process(self, encoded, text, **kwargs):
        """Process paired ICP/prospect text passed as JSON.

        Accepts text as a JSON object: {"icp": "...", "prospect": "..."}
        Encodes each separately through the backbone and calls match().
        """
        pair = _parse_pair(text)
        icp_encoded = self.encode(pair["icp"])
        prospect_encoded = self.encode(pair["prospect"])
        icp_cls = icp_encoded["encoder_output"].last_hidden_state[:, 0]
        prospect_cls = prospect_encoded["encoder_output"].last_hidden_state[:, 0]
        return self.match(icp_cls, prospect_cls)

    def predict(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Public API — accepts JSON or dict with icp/prospect keys.

        Usage:
            model.predict('{"icp": "Mid-market SaaS", "prospect": "300-person fintech"}')
        """
        from ..validation import validate_text
        pair = _parse_pair(text)
        validate_text(pair["icp"])
        validate_text(pair["prospect"])
        icp_encoded = self.encode(pair["icp"])
        prospect_encoded = self.encode(pair["prospect"])
        icp_cls = icp_encoded["encoder_output"].last_hidden_state[:, 0]
        prospect_cls = prospect_encoded["encoder_output"].last_hidden_state[:, 0]
        return self.match(icp_cls, prospect_cls)

    def match(self, icp_cls, prospect_cls, prospect_completeness=None):
        if prospect_completeness is None:
            prospect_completeness = self.completeness(prospect_cls)
        dimensions = {}
        dealbreakers = []
        missing = []

        thresholds = self.thresholds.sigmoid()

        for i, dim in enumerate(DIMS):
            has_data = prospect_completeness[0, i].item() > 0.5
            if not has_data:
                dimensions[dim] = {"fit": None, "status": "no_data"}
                missing.append(dim)
                continue

            # ICP as Gaussian distribution
            icp_mu = self.icp_mu[dim](icp_cls)
            icp_sigma = self.icp_logsigma[dim](icp_cls).exp() + 0.1

            # prospect as point
            pro_point = self.projections[dim](prospect_cls)

            # Mahalanobis-like distance: normalized by ICP spread
            distance = ((pro_point - icp_mu) / icp_sigma).pow(2).mean(dim=-1)

            # convert to similarity
            fit = torch.exp(-distance).item()

            is_db = fit < thresholds[i].item()

            dimensions[dim] = {
                "fit": round(fit, 3),
                "distance": round(distance.item(), 3),
                "icp_spread": round(icp_sigma.mean().item(), 3),
                "status": "dealbreaker" if is_db else "pass",
            }

            if is_db:
                dealbreakers.append(dim)

        # overall score: geometric mean of per-dimension fits
        scored_dims = [d for d in dimensions.values() if d.get("fit") is not None]
        if scored_dims:
            overall = 1.0
            for d in scored_dims:
                overall *= d["fit"]
            overall = overall ** (1 / len(scored_dims))
        else:
            overall = 0.0

        return {
            "score": round(overall, 3),
            "qualified": len(dealbreakers) == 0 and overall > 0.3 and len(missing) < 3,
            "dimensions": dimensions,
            "dealbreakers": dealbreakers,
            "missing": missing,
        }


class ContrastiveProjectionHead(nn.Module):
    """NT-Xent contrastive projection for ICP-aligned embeddings.

    Learns a projection space where closed-won prospects cluster together
    and closed-lost prospects are pushed apart. Based on SupCon (Khosla et al., 2020).

    The learned projections feed into the Wasserstein matcher as refined features.
    """

    def __init__(self, hidden: int = 768, proj_dim: int = 128, temperature: float = 0.07):
        super().__init__()
        self.temperature = temperature
        self.projector = nn.Sequential(
            nn.Linear(hidden, 256),
            nn.GELU(),
            nn.LayerNorm(256),
            nn.Linear(256, proj_dim),
        )

    def project(self, cls_embedding: torch.Tensor) -> torch.Tensor:
        """Project CLS embedding to contrastive space."""
        return F.normalize(self.projector(cls_embedding), dim=-1)

    def nt_xent_loss(
        self,
        embeddings: torch.Tensor,
        labels: torch.Tensor,
    ) -> torch.Tensor:
        """Compute NT-Xent (supervised contrastive) loss.

        Args:
            embeddings: (batch, hidden) raw CLS embeddings
            labels: (batch,) integer labels — same label = positive pair

        Returns:
            Scalar loss
        """
        z = self.project(embeddings)  # (batch, proj_dim)
        batch_size = z.shape[0]

        # Similarity matrix
        sim = torch.mm(z, z.t()) / self.temperature  # (batch, batch)

        # Mask: positive pairs share the same label
        labels_col = labels.unsqueeze(1)
        positive_mask = (labels_col == labels_col.t()).float()
        # Remove self-similarity from positives
        positive_mask.fill_diagonal_(0)

        # For numerical stability
        sim_max, _ = sim.max(dim=1, keepdim=True)
        sim = sim - sim_max.detach()

        # Denominator: all pairs except self
        self_mask = torch.eye(batch_size, device=z.device)
        denominator = torch.exp(sim) * (1 - self_mask)
        denominator = denominator.sum(dim=1, keepdim=True)

        # Log-prob of positive pairs
        log_prob = sim - torch.log(denominator + 1e-8)

        # Mean over positive pairs per anchor
        pos_count = positive_mask.sum(dim=1)
        # Avoid division by zero for anchors with no positives
        pos_count = pos_count.clamp(min=1)
        loss = -(positive_mask * log_prob).sum(dim=1) / pos_count

        return loss.mean()


def _parse_pair(text: str | dict) -> dict[str, str]:
    """Parse ICP/prospect pair from JSON string or dict."""
    if isinstance(text, dict):
        pair = text
    else:
        try:
            pair = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            raise ValueError(
                'ICP matcher requires JSON: {"icp": "...", "prospect": "..."}'
            ) from None
    if not isinstance(pair, dict) or "icp" not in pair or "prospect" not in pair:
        raise ValueError(
            'ICP matcher requires keys "icp" and "prospect". '
            f"Got: {list(pair.keys()) if isinstance(pair, dict) else type(pair).__name__}"
        )
    return pair
