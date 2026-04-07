"""
Active Learning Prioritizer (BatchBALD) — Research Next Companies
=================================================================
Identifies which companies to research next for maximum information gain,
using Monte Carlo dropout on the LeadScorer module to estimate uncertainty.

Research: BatchBALD (Kirsch et al., 2019) computes joint mutual information
across a batch of candidates, avoiding redundancy — don't research 5 companies
that are all uncertain for the same reason.

Usage:
    python active_learner.py                    # Top 20 companies to research
    python active_learner.py --top 50           # Top 50
    python active_learner.py --mc-samples 10    # More MC samples (slower)
    python active_learner.py --dry-run          # Print only, don't update DB
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from pathlib import Path

import numpy as np
import torch
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("active-learner")

# Number of MC dropout forward passes
DEFAULT_MC_SAMPLES = 5


def get_neon_conn():
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return psycopg2.connect(url, sslmode="require")


def load_candidates(limit: int = 500) -> list[dict]:
    """Load companies that could benefit from further research."""
    conn = get_neon_conn()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, key, name, description, ai_tier, score,
                   ai_classification_confidence
            FROM companies
            WHERE blocked = false
              AND category != 'UNKNOWN'
            ORDER BY ai_classification_confidence ASC, score DESC
            LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "key": row[1],
            "name": row[2],
            "description": row[3] or row[2],
            "ai_tier": row[4] or 0,
            "score": row[5] or 0,
            "confidence": row[6] or 0.5,
        }
        for row in rows
    ]


def mc_dropout_uncertainty(
    model,
    texts: list[str],
    n_samples: int = DEFAULT_MC_SAMPLES,
) -> np.ndarray:
    """Run MC dropout to estimate prediction uncertainty.

    Enables dropout at inference time, runs multiple forward passes,
    and measures disagreement as uncertainty.

    Returns:
        (N,) array of uncertainty scores (higher = more uncertain)
    """
    # Enable dropout for MC sampling
    model.train()

    all_predictions = []
    for sample_idx in range(n_samples):
        batch_preds = []
        for text in texts:
            try:
                result = model.forward(text)
                # Extract the prediction distribution
                if "label" in result:
                    # Classification: use predicted label index
                    labels = result.get("labels", ["hot", "warm", "cold", "disqualified"])
                    pred_idx = labels.index(result["label"]) if result["label"] in labels else 0
                    batch_preds.append(pred_idx)
                elif "score" in result:
                    batch_preds.append(result["score"])
                else:
                    batch_preds.append(0.5)
            except Exception:
                batch_preds.append(0.5)
        all_predictions.append(batch_preds)

    # Restore eval mode
    model.eval()

    # Shape: (n_samples, N)
    preds = np.array(all_predictions, dtype=np.float64)

    # Uncertainty = variance across MC samples (per company)
    uncertainty = preds.var(axis=0)

    return uncertainty


def predictive_entropy(
    model,
    texts: list[str],
    n_samples: int = DEFAULT_MC_SAMPLES,
    n_classes: int = 4,
) -> np.ndarray:
    """Compute predictive entropy H[y|x] for BatchBALD.

    Higher entropy = more uncertain about the prediction.
    """
    model.train()

    # Collect class probability distributions across MC samples
    # Shape: (n_samples, N, n_classes)
    all_probs = np.zeros((n_samples, len(texts), n_classes))

    for s in range(n_samples):
        for i, text in enumerate(texts):
            try:
                result = model.forward(text)
                if "probabilities" in result:
                    probs = result["probabilities"]
                    for j, p in enumerate(probs[:n_classes]):
                        all_probs[s, i, j] = p
                elif "confidence" in result:
                    # Binary: use confidence as proxy
                    conf = result["confidence"]
                    all_probs[s, i, 0] = conf
                    all_probs[s, i, 1] = 1 - conf
                else:
                    all_probs[s, i] = 1.0 / n_classes
            except Exception:
                all_probs[s, i] = 1.0 / n_classes

    model.eval()

    # Average probabilities across MC samples
    mean_probs = all_probs.mean(axis=0)  # (N, n_classes)

    # Predictive entropy: H[y|x] = -sum p(y) log p(y)
    entropy = -np.sum(
        mean_probs * np.log(mean_probs + 1e-10), axis=1
    )

    return entropy


def batch_bald_selection(
    uncertainties: np.ndarray,
    entropies: np.ndarray,
    batch_size: int = 20,
) -> list[int]:
    """BatchBALD-inspired greedy selection.

    Selects companies that are individually uncertain AND diverse
    (not all uncertain for the same reason).

    Simplified version: uses uncertainty + diversity penalty.
    """
    n = len(uncertainties)
    selected = []
    remaining = list(range(n))

    # Combined score: entropy * uncertainty
    combined = entropies * (1 + uncertainties)

    for _ in range(min(batch_size, n)):
        if not remaining:
            break

        # Score remaining candidates
        scores = np.array([combined[i] for i in remaining])

        # Diversity penalty: reduce score for candidates similar to already-selected
        if selected:
            for j, r_idx in enumerate(remaining):
                for s_idx in selected:
                    # Simple heuristic: if uncertainties are close, penalize
                    sim = 1.0 / (1.0 + abs(uncertainties[r_idx] - uncertainties[s_idx]))
                    scores[j] *= (1.0 - 0.3 * sim)

        # Select best remaining
        best_local = np.argmax(scores)
        best_global = remaining[best_local]
        selected.append(best_global)
        remaining.pop(best_local)

    return selected


def main():
    parser = argparse.ArgumentParser(description="Active learning company prioritizer")
    parser.add_argument("--top", type=int, default=20, help="Number of companies to recommend")
    parser.add_argument("--mc-samples", type=int, default=DEFAULT_MC_SAMPLES)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-model", action="store_true",
                        help="Use confidence-only heuristic (no ML model needed)")
    args = parser.parse_args()

    candidates = load_candidates(limit=500)
    if not candidates:
        log.error("No candidates found")
        return

    log.info(f"Loaded {len(candidates)} candidates")

    if args.no_model:
        # Heuristic mode: use existing confidence scores
        uncertainties = np.array([1.0 - c["confidence"] for c in candidates])
        entropies = uncertainties.copy()
        log.info("Using confidence-only heuristic (no ML model)")
    else:
        # Load LeadScorer for MC dropout
        try:
            from salescue.modules import LeadScorer
            model = LeadScorer(hidden=768)
            model.eval()
            log.info("Loaded LeadScorer for MC dropout uncertainty estimation")

            texts = [c["description"] for c in candidates]
            uncertainties = mc_dropout_uncertainty(model, texts, args.mc_samples)
            entropies = predictive_entropy(model, texts, args.mc_samples)
        except ImportError:
            log.warning("Could not load SalesCue model, falling back to heuristic")
            uncertainties = np.array([1.0 - c["confidence"] for c in candidates])
            entropies = uncertainties.copy()

    # BatchBALD selection
    selected_idxs = batch_bald_selection(uncertainties, entropies, batch_size=args.top)

    log.info(f"\nTop {len(selected_idxs)} companies to research next:")
    log.info("-" * 80)

    results = []
    for rank, idx in enumerate(selected_idxs, 1):
        c = candidates[idx]
        unc = uncertainties[idx]
        ent = entropies[idx]
        log.info(
            f"  {rank:2d}. [{c['key']}] {c['name']}"
            f"  (uncertainty={unc:.3f}, entropy={ent:.3f},"
            f" current_score={c['score']:.2f}, confidence={c['confidence']:.2f})"
        )
        results.append({
            "rank": rank,
            "company_id": c["id"],
            "key": c["key"],
            "name": c["name"],
            "uncertainty": round(float(unc), 4),
            "entropy": round(float(ent), 4),
            "current_score": c["score"],
            "current_confidence": c["confidence"],
        })

    if not args.dry_run:
        out_path = Path(__file__).parent / "research_priority.json"
        with open(out_path, "w") as f:
            json.dump({"candidates": results, "total_evaluated": len(candidates)}, f, indent=2)
        log.info(f"\nSaved to {out_path}")
    else:
        log.info("\nDRY RUN — results not saved")


if __name__ == "__main__":
    main()
