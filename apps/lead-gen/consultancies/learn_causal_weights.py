"""
Causal Weight Discovery via NOTEARS — Replace hand-tuned scoring weights
========================================================================
Uses NOTEARS (Zheng et al., 2018) to learn a DAG over enrichment features
from observational data, then extracts causal effects to replace the
hand-tuned weights in compute_score().

Research: NOTEARS formulates structure learning as a continuous optimization
problem with an acyclicity constraint: min ||X - XW||^2 s.t. tr(e^(W∘W)) - d = 0

Usage:
    python learn_causal_weights.py                # Learn from all companies
    python learn_causal_weights.py --min-score 0.5  # Only high-scoring companies
    python learn_causal_weights.py --dry-run      # Print learned weights only
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from pathlib import Path

import numpy as np
from scipy.optimize import minimize
from scipy.linalg import expm
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("causal-weights")

# Feature columns to learn causal structure over
FEATURE_NAMES = [
    "ai_tier",
    "category_product",       # binary: is PRODUCT?
    "category_consultancy",   # binary: is CONSULTANCY/AGENCY?
    "services_count",
    "tech_stack_count",
    "has_pricing",
    "has_careers",
    "hf_presence_score",
    "intent_score",
    "github_ai_score",
    "score",                  # outcome variable
]

TARGET_IDX = FEATURE_NAMES.index("score")


def get_neon_conn():
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return psycopg2.connect(url, sslmode="require")


def load_data(min_score: float = 0.0) -> np.ndarray:
    """Load enriched company features from Neon as a numpy matrix."""
    conn = get_neon_conn()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                ai_tier,
                category,
                services,
                tags,
                score,
                intent_score,
                github_ai_score,
                hf_presence_score
            FROM companies
            WHERE blocked = false
              AND category != 'UNKNOWN'
              AND score >= %s
            ORDER BY created_at DESC
        """, (min_score,))
        rows = cur.fetchall()
    conn.close()

    if not rows:
        log.warning("No data found")
        return np.array([])

    data = []
    for row in rows:
        ai_tier = row[0] or 0
        category = row[1] or "UNKNOWN"
        services_raw = row[2] or "[]"
        tags_raw = row[3] or "[]"
        score = row[4] or 0
        intent_score = row[5] or 0
        github_ai = row[6] or 0
        hf_presence = row[7] or 0

        try:
            services_count = len(json.loads(services_raw)) if services_raw else 0
        except (json.JSONDecodeError, TypeError):
            services_count = 0

        try:
            tags_count = len(json.loads(tags_raw)) if tags_raw else 0
        except (json.JSONDecodeError, TypeError):
            tags_count = 0

        data.append([
            ai_tier,
            1.0 if category == "PRODUCT" else 0.0,
            1.0 if category in ("CONSULTANCY", "AGENCY") else 0.0,
            min(services_count / 5.0, 1.0),
            min(tags_count / 5.0, 1.0),
            0.0,  # has_pricing (would need scrape data)
            0.0,  # has_careers (would need scrape data)
            (hf_presence or 0) / 100.0,
            (intent_score or 0) / 100.0,
            github_ai or 0,
            score,
        ])

    X = np.array(data, dtype=np.float64)
    log.info(f"Loaded {len(X)} companies with {len(FEATURE_NAMES)} features")
    return X


# ---------------------------------------------------------------------------
# NOTEARS: continuous DAG structure learning
# ---------------------------------------------------------------------------

def _notears_loss(W_flat: np.ndarray, X: np.ndarray, d: int, lambda1: float = 0.01):
    """NOTEARS objective: least-squares loss + L1 penalty.

    min_W  0.5/n * ||X - XW||^2_F + lambda1 * ||W||_1
    s.t.   h(W) = tr(e^(W ∘ W)) - d = 0  (acyclicity)
    """
    W = W_flat.reshape(d, d)
    n = X.shape[0]

    # Least-squares loss
    residual = X - X @ W
    loss = 0.5 / n * np.sum(residual ** 2)

    # L1 regularization
    loss += lambda1 * np.abs(W).sum()

    return loss


def _notears_grad(W_flat: np.ndarray, X: np.ndarray, d: int, lambda1: float = 0.01):
    """Gradient of NOTEARS objective."""
    W = W_flat.reshape(d, d)
    n = X.shape[0]

    # Gradient of least-squares
    grad = -1.0 / n * X.T @ (X - X @ W)

    # Gradient of L1
    grad += lambda1 * np.sign(W)

    return grad.flatten()


def _acyclicity_constraint(W_flat: np.ndarray, d: int):
    """Acyclicity constraint: h(W) = tr(e^(W ∘ W)) - d = 0."""
    W = W_flat.reshape(d, d)
    M = W * W  # element-wise square (Hadamard)
    E = expm(M)
    return np.trace(E) - d


def _acyclicity_grad(W_flat: np.ndarray, d: int):
    """Gradient of acyclicity constraint."""
    W = W_flat.reshape(d, d)
    M = W * W
    E = expm(M)
    return (2 * W * E).flatten()


def learn_dag(X: np.ndarray, lambda1: float = 0.01) -> np.ndarray:
    """Learn DAG structure via NOTEARS.

    Returns:
        W: (d, d) weighted adjacency matrix. W[i,j] != 0 means i -> j.
    """
    n, d = X.shape

    # Standardize features
    X_std = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-8)

    # Initialize with zeros
    W0 = np.zeros(d * d)

    # Enforce no self-loops: mask diagonal
    def mask_diagonal(W_flat):
        W = W_flat.reshape(d, d)
        np.fill_diagonal(W, 0)
        return W.flatten()

    # Augmented Lagrangian method
    rho = 1.0
    alpha = 0.0
    max_rho = 1e16
    h_tol = 1e-8

    W_est = W0.copy()

    for iteration in range(20):
        def augmented_loss(W_flat):
            W_flat = mask_diagonal(W_flat)
            loss = _notears_loss(W_flat, X_std, d, lambda1)
            h = _acyclicity_constraint(W_flat, d)
            return loss + alpha * h + 0.5 * rho * h * h

        def augmented_grad(W_flat):
            W_flat = mask_diagonal(W_flat)
            grad_loss = _notears_grad(W_flat, X_std, d, lambda1)
            h = _acyclicity_constraint(W_flat, d)
            grad_h = _acyclicity_grad(W_flat, d)
            grad = grad_loss + (alpha + rho * h) * grad_h
            # Zero out diagonal gradient
            grad_mat = grad.reshape(d, d)
            np.fill_diagonal(grad_mat, 0)
            return grad_mat.flatten()

        result = minimize(
            augmented_loss,
            W_est,
            jac=augmented_grad,
            method="L-BFGS-B",
            options={"maxiter": 100},
        )
        W_est = mask_diagonal(result.x)

        h_val = _acyclicity_constraint(W_est, d)
        log.info(f"  Iteration {iteration}: h(W) = {h_val:.6f}, loss = {result.fun:.6f}")

        if abs(h_val) < h_tol:
            log.info(f"  Converged at iteration {iteration}")
            break

        alpha += rho * h_val
        rho = min(rho * 10, max_rho)

    W = W_est.reshape(d, d)

    # Threshold small values
    W[np.abs(W) < 0.05] = 0

    return W


def extract_causal_weights(W: np.ndarray) -> dict[str, float]:
    """Extract causal effects on the score (target) variable.

    Returns weights suitable for compute_score().
    """
    target = TARGET_IDX
    # Direct causal effects on score: column TARGET_IDX of W
    direct_effects = W[:, target].copy()

    # Normalize to sum to 1.0 (for use as scoring weights)
    abs_effects = np.abs(direct_effects)
    abs_effects[target] = 0  # exclude self

    total = abs_effects.sum()
    if total > 0:
        normalized = abs_effects / total
    else:
        # Fallback: uniform weights
        normalized = np.ones(len(FEATURE_NAMES)) / (len(FEATURE_NAMES) - 1)
        normalized[target] = 0

    weights = {}
    for i, name in enumerate(FEATURE_NAMES):
        if i == target:
            continue
        if normalized[i] > 0.01:
            weights[name] = round(float(normalized[i]), 3)

    return weights


def main():
    parser = argparse.ArgumentParser(description="NOTEARS causal weight discovery")
    parser.add_argument("--min-score", type=float, default=0.0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--lambda1", type=float, default=0.01, help="L1 regularization")
    args = parser.parse_args()

    X = load_data(min_score=args.min_score)
    if len(X) < 10:
        log.error(f"Need at least 10 companies, got {len(X)}")
        return

    log.info("Learning causal DAG via NOTEARS...")
    W = learn_dag(X, lambda1=args.lambda1)

    # Print DAG edges
    d = len(FEATURE_NAMES)
    log.info("\nLearned causal edges:")
    for i in range(d):
        for j in range(d):
            if abs(W[i, j]) > 0:
                direction = "+" if W[i, j] > 0 else "-"
                log.info(f"  {FEATURE_NAMES[i]} --({direction}{abs(W[i,j]):.3f})--> {FEATURE_NAMES[j]}")

    # Extract scoring weights
    weights = extract_causal_weights(W)
    log.info("\nCausal scoring weights (for compute_score):")
    for name, w in sorted(weights.items(), key=lambda x: -x[1]):
        log.info(f"  {name}: {w:.1%}")

    if not args.dry_run:
        # Save weights to file
        out_path = Path(__file__).parent / "causal_weights.json"
        with open(out_path, "w") as f:
            json.dump({
                "weights": weights,
                "n_companies": len(X),
                "dag_edges": [
                    {"from": FEATURE_NAMES[i], "to": FEATURE_NAMES[j], "weight": round(float(W[i,j]), 4)}
                    for i in range(d) for j in range(d) if abs(W[i,j]) > 0
                ],
            }, f, indent=2)
        log.info(f"\nSaved to {out_path}")
    else:
        log.info("\nDRY RUN — weights not saved")


if __name__ == "__main__":
    main()
