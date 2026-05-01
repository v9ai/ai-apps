"""Consultancies learning graph — causal weights + active learning.

Native Python port of:

* ``consultancies/learn_causal_weights.py`` — NOTEARS (Zheng et al. 2018)
  continuous DAG structure learning over ``companies`` enrichment features,
  exposing the implied causal scoring weights.
* ``consultancies/active_learner.py`` — BatchBALD-inspired prioritizer that
  recommends which companies to research next based on prediction
  uncertainty + diversity. The original script depends on a SalesCue
  ``LeadScorer``; here we default to the confidence-only heuristic
  (``1 - ai_classification_confidence``) and only invoke MC-dropout when
  the optional ``salescue`` package is importable.

Two routing nodes (selected by ``state.node``):

1. **causal_weights** (default). Loads enriched companies into a feature
   matrix, runs NOTEARS via Augmented-Lagrangian L-BFGS-B, extracts direct
   causal effects on ``score``, and returns the normalized weights.

2. **active_learning**. Loads up to 500 candidates ordered by ascending
   ``ai_classification_confidence``, scores each on (entropy × uncertainty),
   greedily picks ``top`` items with a diversity penalty, and returns the
   ranked list.

Environment:
    NEON_DATABASE_URL / DATABASE_URL  Neon connection string (required).
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Annotated, Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

log = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────

_FEATURE_NAMES: tuple[str, ...] = (
    "ai_tier",
    "category_product",
    "category_consultancy",
    "services_count",
    "tech_stack_count",
    "has_pricing",
    "has_careers",
    "hf_presence_score",
    "intent_score",
    "github_ai_score",
    "score",
)
_TARGET_IDX = _FEATURE_NAMES.index("score")
_DEFAULT_MC_SAMPLES = 5
_AL_CANDIDATE_LIMIT = 500


# ── State ─────────────────────────────────────────────────────────────────────


def _merge_dict(left: dict | None, right: dict | None) -> dict:
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


class ConsultanciesLearningState(TypedDict, total=False):
    """State for the consultancies learning graph.

    Input keys:
        node           "causal_weights" (default) or "active_learning".
        min_score      causal_weights: filter floor on companies.score (default 0.0).
        lambda1        causal_weights: L1 regularization strength (default 0.01).
        max_iters      causal_weights: outer-loop cap (default 20).
        top            active_learning: how many candidates to surface (default 20).
        mc_samples     active_learning: MC dropout passes when SalesCue available.
        use_model      active_learning: try loading SalesCue (default false → heuristic).

    Output keys (causal_weights):
        n_companies    Rows used to fit the DAG.
        weights        Normalized causal scoring weights {feature: weight}.
        edges          Non-zero W[i,j] entries as {from, to, weight}.
        loss           Final NOTEARS loss.
        h_value        Final acyclicity residual h(W).

    Output keys (active_learning):
        candidates     Ranked recommendations [{rank, company_id, key, name,
                       uncertainty, entropy, current_score, current_confidence}].
        total_evaluated  Companies considered (capped at 500).
        method           "mc-dropout" or "confidence-heuristic".
    """

    node: str
    # causal_weights
    min_score: float
    lambda1: float
    max_iters: int
    n_companies: int
    weights: dict[str, float]
    edges: list[dict[str, Any]]
    loss: float
    h_value: float
    # active_learning
    top: int
    mc_samples: int
    use_model: bool
    candidates: list[dict[str, Any]]
    total_evaluated: int
    method: str
    # plumbing
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_dict]


# ── Helpers ───────────────────────────────────────────────────────────────────


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError(
            "Neither NEON_DATABASE_URL nor DATABASE_URL is set."
        )
    return dsn


# ── Causal weights (NOTEARS) ──────────────────────────────────────────────────


def _load_feature_matrix(min_score: float) -> "Any":
    """Returns a (N, len(_FEATURE_NAMES)) numpy array of company features."""
    import numpy as np  # type: ignore  (numpy is in backend deps)

    sql = """
        SELECT
            ai_tier, category, services, tags, score,
            intent_score, github_ai_score, hf_presence_score
        FROM companies
        WHERE blocked = false
          AND category != 'UNKNOWN'
          AND score >= %s
        ORDER BY created_at DESC
    """
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (min_score,))
            rows = cur.fetchall()

    if not rows:
        return np.zeros((0, len(_FEATURE_NAMES)), dtype=np.float64)

    data: list[list[float]] = []
    for row in rows:
        ai_tier = float(row[0] or 0)
        category = row[1] or "UNKNOWN"
        services_raw = row[2] or "[]"
        tags_raw = row[3] or "[]"
        score = float(row[4] or 0)
        intent_score = float(row[5] or 0)
        github_ai = float(row[6] or 0)
        hf_presence = float(row[7] or 0)

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
            0.0,
            0.0,
            hf_presence / 100.0,
            intent_score / 100.0,
            github_ai,
            score,
        ])
    return np.asarray(data, dtype=np.float64)


def _learn_dag(X: Any, lambda1: float, max_iters: int) -> tuple[Any, float, float]:
    """Run NOTEARS — returns (W, final_loss, final_h)."""
    import numpy as np  # type: ignore
    from scipy.linalg import expm  # type: ignore
    from scipy.optimize import minimize  # type: ignore

    n, d = X.shape
    X_std = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-8)

    def mask_diag(W_flat: Any) -> Any:
        W = W_flat.reshape(d, d)
        np.fill_diagonal(W, 0)
        return W.flatten()

    def loss_fn(W_flat: Any) -> float:
        W = W_flat.reshape(d, d)
        residual = X_std - X_std @ W
        return 0.5 / n * np.sum(residual ** 2) + lambda1 * np.abs(W).sum()

    def grad_fn(W_flat: Any) -> Any:
        W = W_flat.reshape(d, d)
        grad = -1.0 / n * X_std.T @ (X_std - X_std @ W) + lambda1 * np.sign(W)
        return grad.flatten()

    def acyclicity(W_flat: Any) -> float:
        W = W_flat.reshape(d, d)
        return float(np.trace(expm(W * W)) - d)

    def acyclicity_grad(W_flat: Any) -> Any:
        W = W_flat.reshape(d, d)
        E = expm(W * W)
        return (2 * W * E).flatten()

    rho = 1.0
    alpha = 0.0
    max_rho = 1e16
    h_tol = 1e-8

    W_est = np.zeros(d * d, dtype=np.float64)
    last_loss = 0.0
    last_h = 0.0

    for it in range(max_iters):
        def aug_loss(W_flat: Any) -> float:
            W_flat = mask_diag(W_flat)
            h = acyclicity(W_flat)
            return loss_fn(W_flat) + alpha * h + 0.5 * rho * h * h

        def aug_grad(W_flat: Any) -> Any:
            W_flat = mask_diag(W_flat)
            h = acyclicity(W_flat)
            grad = grad_fn(W_flat) + (alpha + rho * h) * acyclicity_grad(W_flat)
            grad_mat = grad.reshape(d, d)
            np.fill_diagonal(grad_mat, 0)
            return grad_mat.flatten()

        result = minimize(
            aug_loss, W_est, jac=aug_grad, method="L-BFGS-B",
            options={"maxiter": 100},
        )
        W_est = mask_diag(result.x)
        last_h = acyclicity(W_est)
        last_loss = float(result.fun)
        log.info("notears iter %d: h=%.6f loss=%.6f", it, last_h, last_loss)
        if abs(last_h) < h_tol:
            break
        alpha += rho * last_h
        rho = min(rho * 10, max_rho)

    W = W_est.reshape(d, d)
    W[np.abs(W) < 0.05] = 0
    return W, last_loss, last_h


def _extract_weights(W: Any) -> dict[str, float]:
    import numpy as np  # type: ignore

    direct = W[:, _TARGET_IDX].copy()
    abs_eff = np.abs(direct)
    abs_eff[_TARGET_IDX] = 0.0
    total = float(abs_eff.sum())
    if total > 0:
        normalized = abs_eff / total
    else:
        normalized = np.ones(len(_FEATURE_NAMES)) / max(1, (len(_FEATURE_NAMES) - 1))
        normalized[_TARGET_IDX] = 0.0
    out: dict[str, float] = {}
    for i, name in enumerate(_FEATURE_NAMES):
        if i == _TARGET_IDX:
            continue
        if normalized[i] > 0.01:
            out[name] = round(float(normalized[i]), 3)
    return out


async def causal_weights(state: ConsultanciesLearningState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    try:
        import numpy as np  # type: ignore  # noqa: F401
        from scipy.linalg import expm  # type: ignore  # noqa: F401
    except ImportError as e:
        return {"_error": f"causal_weights: missing dep {e.name!r}"}

    min_score = float(state.get("min_score") or 0.0)
    lambda1 = float(state.get("lambda1") or 0.01)
    max_iters = int(state.get("max_iters") or 20)

    X = _load_feature_matrix(min_score)
    if X.shape[0] < 10:
        return {
            "_error": (
                f"causal_weights: need ≥10 companies above min_score={min_score}, "
                f"got {X.shape[0]}"
            )
        }

    W, final_loss, final_h = _learn_dag(X, lambda1, max_iters)
    weights = _extract_weights(W)

    d = len(_FEATURE_NAMES)
    edges = []
    for i in range(d):
        for j in range(d):
            w = float(W[i, j])
            if w == 0.0:
                continue
            edges.append({
                "from": _FEATURE_NAMES[i],
                "to": _FEATURE_NAMES[j],
                "weight": round(w, 4),
            })

    log.info("causal_weights: n=%d weights=%s", X.shape[0], weights)
    return {
        "n_companies": int(X.shape[0]),
        "weights": weights,
        "edges": edges,
        "loss": round(final_loss, 6),
        "h_value": round(final_h, 6),
        "agent_timings": {"causal_weights": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "graph": "consultancies_learning", "version": "v1", "node": "causal_weights",
        },
    }


# ── Active learning (BatchBALD-style) ─────────────────────────────────────────


def _load_active_candidates(limit: int) -> list[dict[str, Any]]:
    sql = """
        SELECT id, key, name, COALESCE(description, ''), COALESCE(ai_tier, 0),
               COALESCE(score, 0), COALESCE(ai_classification_confidence, 0.5)
        FROM companies
        WHERE blocked = false
          AND category != 'UNKNOWN'
        ORDER BY ai_classification_confidence ASC, score DESC
        LIMIT %s
    """
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (limit,))
            rows = cur.fetchall()
    return [
        {
            "id": int(r[0]),
            "key": str(r[1]),
            "name": str(r[2]),
            "description": str(r[3]) or str(r[2]),
            "ai_tier": int(r[4] or 0),
            "score": float(r[5] or 0),
            "confidence": float(r[6] or 0.5),
        }
        for r in rows
    ]


def _confidence_uncertainty(candidates: list[dict[str, Any]]) -> tuple[Any, Any]:
    import numpy as np  # type: ignore

    unc = np.asarray(
        [1.0 - float(c["confidence"]) for c in candidates], dtype=np.float64,
    )
    return unc, unc.copy()


def _mc_dropout(
    candidates: list[dict[str, Any]], n_samples: int,
) -> tuple[Any, Any] | None:
    """MC-dropout via SalesCue's LeadScorer when present. Returns None if not."""
    try:
        from salescue.modules import LeadScorer  # type: ignore
    except ImportError:
        return None
    import numpy as np  # type: ignore

    model = LeadScorer(hidden=768)
    model.eval()
    texts = [c["description"] for c in candidates]

    n_classes = 4
    all_probs = np.zeros((n_samples, len(texts), n_classes), dtype=np.float64)
    all_preds = np.zeros((n_samples, len(texts)), dtype=np.float64)

    model.train()
    for s in range(n_samples):
        for i, text in enumerate(texts):
            try:
                result = model.forward(text)
            except Exception:  # noqa: BLE001 — model failures fall back to uniform
                all_probs[s, i] = 1.0 / n_classes
                all_preds[s, i] = 0.5
                continue
            if "probabilities" in result:
                probs = result["probabilities"]
                for j, p in enumerate(probs[:n_classes]):
                    all_probs[s, i, j] = p
            elif "confidence" in result:
                conf = result["confidence"]
                all_probs[s, i, 0] = conf
                all_probs[s, i, 1] = 1 - conf
            else:
                all_probs[s, i] = 1.0 / n_classes
            score_val = result.get("score")
            if score_val is None:
                labels = result.get("labels", ["hot", "warm", "cold", "disqualified"])
                lbl = result.get("label")
                score_val = labels.index(lbl) if lbl in labels else 0
            all_preds[s, i] = float(score_val)
    model.eval()

    mean_probs = all_probs.mean(axis=0)
    entropy = -np.sum(mean_probs * np.log(mean_probs + 1e-10), axis=1)
    uncertainty = all_preds.var(axis=0)
    return uncertainty, entropy


def _batch_bald(uncertainties: Any, entropies: Any, batch_size: int) -> list[int]:
    import numpy as np  # type: ignore

    n = len(uncertainties)
    selected: list[int] = []
    remaining = list(range(n))
    combined = entropies * (1.0 + uncertainties)

    for _ in range(min(batch_size, n)):
        if not remaining:
            break
        scores = np.array([combined[i] for i in remaining], dtype=np.float64)
        if selected:
            for j, r_idx in enumerate(remaining):
                for s_idx in selected:
                    sim = 1.0 / (1.0 + abs(uncertainties[r_idx] - uncertainties[s_idx]))
                    scores[j] *= (1.0 - 0.3 * sim)
        best_local = int(np.argmax(scores))
        selected.append(remaining[best_local])
        remaining.pop(best_local)
    return selected


async def active_learning(state: ConsultanciesLearningState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    try:
        import numpy as np  # type: ignore  # noqa: F401
    except ImportError as e:
        return {"_error": f"active_learning: missing dep {e.name!r}"}

    top = int(state.get("top") or 20)
    mc_samples = int(state.get("mc_samples") or _DEFAULT_MC_SAMPLES)
    use_model = bool(state.get("use_model"))

    candidates = _load_active_candidates(_AL_CANDIDATE_LIMIT)
    if not candidates:
        return {
            "candidates": [], "total_evaluated": 0, "method": "no-data",
            "agent_timings": {"active_learning": round(time.perf_counter() - t0, 3)},
            "graph_meta": {
                "graph": "consultancies_learning", "version": "v1", "node": "active_learning",
            },
        }

    method = "confidence-heuristic"
    uncertainties, entropies = _confidence_uncertainty(candidates)
    if use_model:
        mc = _mc_dropout(candidates, mc_samples)
        if mc is not None:
            uncertainties, entropies = mc
            method = "mc-dropout"

    selected = _batch_bald(uncertainties, entropies, top)

    out_candidates: list[dict[str, Any]] = []
    for rank, idx in enumerate(selected, 1):
        c = candidates[idx]
        out_candidates.append({
            "rank": rank,
            "company_id": c["id"],
            "key": c["key"],
            "name": c["name"],
            "uncertainty": round(float(uncertainties[idx]), 4),
            "entropy": round(float(entropies[idx]), 4),
            "current_score": c["score"],
            "current_confidence": c["confidence"],
        })

    log.info("active_learning: method=%s top=%d / total=%d",
             method, len(out_candidates), len(candidates))
    return {
        "candidates": out_candidates,
        "total_evaluated": len(candidates),
        "method": method,
        "agent_timings": {"active_learning": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "graph": "consultancies_learning", "version": "v1", "node": "active_learning",
        },
    }


# ── Build graph ───────────────────────────────────────────────────────────────


def _route(state: ConsultanciesLearningState) -> str:
    node = (state.get("node") or "causal_weights").strip().lower()
    return "active_learning" if node == "active_learning" else "causal_weights"


def _build() -> Any:
    g = StateGraph(ConsultanciesLearningState)
    g.add_node("causal_weights", causal_weights)
    g.add_node("active_learning", active_learning)
    g.add_conditional_edges(
        START,
        _route,
        {"causal_weights": "causal_weights", "active_learning": "active_learning"},
    )
    g.add_edge("causal_weights", END)
    g.add_edge("active_learning", END)
    return g.compile()


graph = _build()
