"""High-severity deal-breakers must force composite_tier='disqualified'
regardless of regex hits."""

from __future__ import annotations

from leadgen_agent.icp_fit_scorer import compute_icp_fit


_CORPUS_HOME = (
    "We build an AI girlfriend companion app with an LLM back-end. "
    "Using LangChain and LlamaIndex under the hood for document retrieval."
)
_CORPUS_CAREERS = "Head of AI, Senior ML Engineer, Data Scientist."


def test_high_severity_deal_breaker_disqualifies_even_with_strong_regex() -> None:
    icp = {
        "weighted_total": 0.95,
        "criteria_scores": {},
        "segments": [{"name": "Enterprise", "industry": "enterprise", "stage": "", "geo": "", "fit": 0.9, "reasoning": ""}],
        "personas": [{"title": "Head of AI", "seniority": "executive", "department": "engineering", "pain": "", "channel": ""}],
        "deal_breakers": [
            {"name": "AI girlfriend", "severity": "high", "reason": "Consumer chat wrapper, no doc corpus."}
        ],
        "graph_meta": {"weights_hash": "db001", "run_at": "2026-04-24"},
    }
    out = compute_icp_fit(
        icp_analysis=icp,
        classification={"category": "PRODUCT", "industry": "consumer", "confidence": 0.8},
        home_markdown=_CORPUS_HOME,
        careers_markdown=_CORPUS_CAREERS,
        regex_score=0.95,
    )
    assert out["composite_tier"] == "disqualified"
    assert out["composite_score"] == 0.0
    assert any(h["severity"] == "high" for h in out["icp_fit"]["deal_breaker_hits"])


def test_medium_severity_deal_breaker_does_not_disqualify() -> None:
    icp = {
        "weighted_total": 0.8,
        "criteria_scores": {},
        "segments": [],
        "personas": [],
        "deal_breakers": [
            {"name": "LangChain", "severity": "medium", "reason": "Not ideal but acceptable."}
        ],
        "graph_meta": {"weights_hash": "db002", "run_at": "2026-04-24"},
    }
    out = compute_icp_fit(
        icp_analysis=icp,
        classification={"category": "PRODUCT", "industry": "fintech", "confidence": 0.7},
        home_markdown=_CORPUS_HOME,
        careers_markdown=_CORPUS_CAREERS,
        regex_score=0.6,
    )
    assert out["composite_tier"] != "disqualified"
    assert out["composite_score"] > 0.0


def test_high_severity_no_corpus_match_does_not_disqualify() -> None:
    icp = {
        "weighted_total": 0.8,
        "criteria_scores": {},
        "segments": [],
        "personas": [],
        "deal_breakers": [
            {"name": "nonexistent-term-xyz-12345", "severity": "high", "reason": ""}
        ],
        "graph_meta": {"weights_hash": "db003", "run_at": "2026-04-24"},
    }
    out = compute_icp_fit(
        icp_analysis=icp,
        classification={"category": "PRODUCT", "industry": "fintech", "confidence": 0.7},
        home_markdown="pure unrelated content",
        careers_markdown="no hiring info",
        regex_score=0.3,
    )
    assert out["composite_tier"] != "disqualified"
