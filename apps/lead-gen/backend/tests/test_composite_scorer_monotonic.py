"""Monotonicity: raising ``icp_analysis.weighted_total`` must not lower the
composite score for a fixed (corpus, classification, regex_score)."""

from __future__ import annotations

from leadgen_agent.icp_fit_scorer import compute_icp_fit

_CORPUS_HOME = (
    "We're a SaaS platform for mid-market fintech teams. We use LangChain and "
    "LlamaIndex for document ingestion across customer contracts."
)
_CORPUS_CAREERS = "Hiring Head of AI and Senior ML Engineer in Engineering."
_CLASSIFICATION = {
    "category": "PRODUCT",
    "industry": "fintech",
    "has_open_roles": True,
    "confidence": 0.8,
}


def _make_icp(weighted_total: float) -> dict:
    return {
        "weighted_total": weighted_total,
        "criteria_scores": {},
        "segments": [
            {
                "name": "Mid-market fintech",
                "industry": "fintech",
                "stage": "mid-market",
                "geo": "",
                "fit": 0.85,
                "reasoning": "",
            }
        ],
        "personas": [
            {
                "title": "Head of AI",
                "seniority": "executive",
                "department": "engineering",
                "pain": "token cost",
                "channel": "linkedin",
            }
        ],
        "deal_breakers": [],
        "graph_meta": {"version": "1.0.0", "weights_hash": "abc123", "run_at": "2026-04-24"},
    }


def test_composite_monotonic_in_weighted_total() -> None:
    scores = []
    for wt in (0.0, 0.25, 0.5, 0.75, 1.0):
        out = compute_icp_fit(
            icp_analysis=_make_icp(wt),
            classification=_CLASSIFICATION,
            home_markdown=_CORPUS_HOME,
            careers_markdown=_CORPUS_CAREERS,
            regex_score=0.5,
        )
        scores.append(out["composite_score"])
    # Non-decreasing
    for prev, curr in zip(scores, scores[1:]):
        assert curr + 1e-9 >= prev, f"composite decreased: {scores}"
    # Strict increase between endpoints — weighted_total contributes non-zero.
    assert scores[-1] > scores[0]
