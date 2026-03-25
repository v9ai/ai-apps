"""Tests for the post-based contact audit scoring logic.

Tests pure functions only — no MLX, LanceDB, or Neon dependencies.
"""

from __future__ import annotations

import pytest

from src.vectordb.audit import (
    AI_BOOST,
    CRYPTO_PENALTY,
    EU_REMOTE_BOOST,
    HIRING_BOOST,
    _build_reason,
    _compute_keyword_adjustment,
)
from src.vectordb.schemas import AuditResult


# ---------------------------------------------------------------------------
# _compute_keyword_adjustment
# ---------------------------------------------------------------------------


class TestKeywordAdjustment:
    def test_no_signals(self):
        adj, signals = _compute_keyword_adjustment("Just a regular post about cooking")
        assert adj == 0.0
        assert signals == []

    def test_crypto_penalty(self):
        adj, signals = _compute_keyword_adjustment("Excited about blockchain and DeFi")
        assert adj == pytest.approx(CRYPTO_PENALTY)
        assert "crypto" in signals

    def test_ai_boost(self):
        adj, signals = _compute_keyword_adjustment(
            "We are building a large language model for NLP tasks"
        )
        assert adj == pytest.approx(AI_BOOST)
        assert "ai/ml" in signals

    def test_hiring_boost(self):
        adj, signals = _compute_keyword_adjustment("We're hiring senior engineers!")
        assert adj == pytest.approx(HIRING_BOOST)
        assert "hiring" in signals

    def test_eu_remote_boost(self):
        adj, signals = _compute_keyword_adjustment("Remote role based in Europe")
        assert adj == pytest.approx(EU_REMOTE_BOOST)
        assert "eu/remote" in signals

    def test_multiple_signals_stack(self):
        text = (
            "We're hiring ML engineers for our AI startup. "
            "Remote positions across Europe and UK."
        )
        adj, signals = _compute_keyword_adjustment(text)
        expected = AI_BOOST + HIRING_BOOST + EU_REMOTE_BOOST
        assert adj == pytest.approx(expected)
        assert set(signals) == {"ai/ml", "hiring", "eu/remote"}

    def test_crypto_cancels_ai(self):
        text = "Building AI on blockchain with smart contracts and machine learning"
        adj, signals = _compute_keyword_adjustment(text)
        expected = CRYPTO_PENALTY + AI_BOOST
        assert adj == pytest.approx(expected)
        assert "crypto" in signals
        assert "ai/ml" in signals

    def test_all_signals(self):
        text = (
            "Hiring machine learning engineers for our crypto/AI startup. "
            "Remote Europe positions available."
        )
        adj, signals = _compute_keyword_adjustment(text)
        expected = CRYPTO_PENALTY + AI_BOOST + HIRING_BOOST + EU_REMOTE_BOOST
        assert adj == pytest.approx(expected)
        assert len(signals) == 4

    def test_case_insensitive(self):
        adj, signals = _compute_keyword_adjustment("MACHINE LEARNING and DEEP LEARNING")
        assert "ai/ml" in signals

    def test_web3_triggers_crypto(self):
        adj, signals = _compute_keyword_adjustment("Building web3 dApps on Solana")
        assert "crypto" in signals

    def test_empty_text(self):
        adj, signals = _compute_keyword_adjustment("")
        assert adj == 0.0
        assert signals == []


# ---------------------------------------------------------------------------
# _build_reason
# ---------------------------------------------------------------------------


class TestBuildReason:
    def test_no_relevant_posts(self):
        reason = _build_reason([], 0.05, 0, 10)
        assert "no AI-relevant posts" in reason
        assert "best_sim=0.050" in reason

    def test_some_relevant_posts(self):
        reason = _build_reason(["ai/ml"], 0.45, 3, 10)
        assert "3/10 posts AI-relevant" in reason
        assert "AI/ML content" in reason

    def test_crypto_signal_in_reason(self):
        reason = _build_reason(["crypto"], 0.10, 0, 5)
        assert "crypto content" in reason

    def test_hiring_signal_in_reason(self):
        reason = _build_reason(["hiring"], 0.30, 2, 8)
        assert "hiring signals" in reason

    def test_eu_remote_signal_in_reason(self):
        reason = _build_reason(["eu/remote"], 0.25, 1, 4)
        assert "EU/remote signals" in reason

    def test_all_signals(self):
        reason = _build_reason(
            ["crypto", "ai/ml", "hiring", "eu/remote"], 0.50, 5, 10
        )
        assert "crypto content" in reason
        assert "AI/ML content" in reason
        assert "hiring signals" in reason
        assert "EU/remote signals" in reason
        assert "5/10 posts AI-relevant" in reason


# ---------------------------------------------------------------------------
# AuditResult dataclass
# ---------------------------------------------------------------------------


class TestAuditResult:
    def test_keep_decision(self):
        r = AuditResult(
            neon_id=1,
            name="Alice Smith",
            position="AI Recruiter",
            company="TechCo",
            num_posts=10,
            best_post_sim=0.55,
            avg_post_sim=0.40,
            num_relevant_posts=7,
            keyword_adjustment=0.08,
            final_score=0.50,
            decision="keep",
            reason="7/10 posts AI-relevant; AI/ML content; hiring signals",
            sample_posts=["We are hiring ML engineers..."],
        )
        assert r.decision == "keep"
        assert r.final_score == 0.50

    def test_remove_decision(self):
        r = AuditResult(
            neon_id=2,
            name="Bob Jones",
            position="Writing Coach",
            company="BookCo",
            num_posts=50,
            best_post_sim=0.05,
            avg_post_sim=0.02,
            num_relevant_posts=0,
            keyword_adjustment=0.0,
            final_score=0.03,
            decision="remove",
            reason="no AI-relevant posts; best_sim=0.050",
            sample_posts=["Write your best book today..."],
        )
        assert r.decision == "remove"
        assert r.final_score < 0.35

    def test_default_sample_posts(self):
        r = AuditResult(
            neon_id=3,
            name="Test",
            position="",
            company="",
            num_posts=0,
            best_post_sim=0.0,
            avg_post_sim=0.0,
            num_relevant_posts=0,
            keyword_adjustment=0.0,
            final_score=0.0,
            decision="remove",
            reason="",
        )
        assert r.sample_posts == []


# ---------------------------------------------------------------------------
# Scoring formula
# ---------------------------------------------------------------------------


class TestScoringFormula:
    """Verify the weighted scoring formula produces expected results."""

    @staticmethod
    def _score(best_sim: float, avg_sim: float, relevant_ratio: float, kw_adj: float) -> float:
        return 0.6 * best_sim + 0.3 * avg_sim + 0.1 * relevant_ratio + kw_adj

    def test_perfect_ai_contact(self):
        score = self._score(best_sim=0.8, avg_sim=0.6, relevant_ratio=1.0, kw_adj=0.10)
        assert score == pytest.approx(0.86)
        assert score >= 0.35

    def test_irrelevant_contact(self):
        score = self._score(best_sim=0.05, avg_sim=0.02, relevant_ratio=0.0, kw_adj=0.0)
        assert score == pytest.approx(0.036)
        assert score < 0.35

    def test_crypto_penalty_drops_borderline(self):
        # Without penalty: 0.6*0.3 + 0.3*0.2 + 0.1*0.1 = 0.25
        base = self._score(0.3, 0.2, 0.1, 0.0)
        assert base == pytest.approx(0.25)
        # With crypto penalty: 0.25 - 0.15 = 0.10
        penalized = self._score(0.3, 0.2, 0.1, CRYPTO_PENALTY)
        assert penalized == pytest.approx(0.10)
        assert penalized < 0.35

    def test_ai_hiring_eu_boost_lifts_score(self):
        base = self._score(0.35, 0.25, 0.3, 0.0)
        boosted = self._score(0.35, 0.25, 0.3, AI_BOOST + HIRING_BOOST + EU_REMOTE_BOOST)
        assert boosted > base
        assert boosted - base == pytest.approx(0.10)
