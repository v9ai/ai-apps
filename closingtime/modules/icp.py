"""closingtime/modules/icp.py — Wasserstein ICP Matching

Research contribution: Cosine similarity between ICP and prospect embeddings treats both
as point vectors. But an ICP like "100-500 employees" represents a RANGE, not a point.
We model both ICP and prospect as distributions in embedding space and compute their
Wasserstein distance (earth mover's distance) for matching.
"""

import torch
import torch.nn as nn

DIMS = ["industry", "size", "tech", "role", "signal"]


class WassersteinICPMatcher(nn.Module):
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

    def forward(self, icp_cls, prospect_cls, prospect_completeness):
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
