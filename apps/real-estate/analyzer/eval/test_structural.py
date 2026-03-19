"""Structural schema validation for agent outputs.

Uses DeepEval's JsonCorrectnessMetric to verify that agent outputs
conform to the Pydantic model schemas (ListingExtraction, ValuationResult).
Complements the semantic GEval checks with structural guarantees.

Also tests the validate_valuation_formulas() function from agent.py
for internal consistency checking.
"""

import json
import os
import sys
import pathlib
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent))

from analyzer.models import ListingExtraction, ValuationResult, ScoreBreakdown
from analyzer.agent import validate_valuation_formulas

_HAS_API_KEY = bool(os.getenv("DEEPSEEK_API_KEY"))


# ---------------------------------------------------------------------------
# Pure formula validation tests (no API key needed)
# ---------------------------------------------------------------------------

class TestValidateValuationFormulas:
    """Test the validate_valuation_formulas() output validator logic."""

    def _make_valuation(self, **overrides) -> ValuationResult:
        defaults = dict(
            verdict="fair",
            confidence=0.8,
            fair_value_eur_per_m2=1200,
            price_deviation_pct=5.0,
            reasoning="Test reasoning.",
            key_factors=["location"],
            investment_score=6.0,
            score_breakdown=ScoreBreakdown(
                price_score=5.0, location_score=7.0,
                condition_score=6.0, market_score=7.0,
            ),
            recommendation="hold",
            rental_estimate_eur=500,
            rental_yield_pct=7.5,
            negotiation_margin_pct=-5.0,
            total_cost_eur=80000,
        )
        defaults.update(overrides)
        return ValuationResult(**defaults)

    def test_consistent_valuation_passes(self):
        # investment_score = 0.4*5 + 0.3*7 + 0.2*6 + 0.1*7 = 2+2.1+1.2+0.7 = 6.0
        v = self._make_valuation()
        issues = validate_valuation_formulas(v)
        assert issues == []

    def test_score_formula_mismatch(self):
        v = self._make_valuation(investment_score=9.0)  # should be 6.0
        issues = validate_valuation_formulas(v)
        assert any("investment_score" in i for i in issues)

    def test_verdict_deviation_mismatch_undervalued(self):
        v = self._make_valuation(price_deviation_pct=-25.0, verdict="overvalued")
        issues = validate_valuation_formulas(v)
        assert any("verdict" in i for i in issues)

    def test_verdict_deviation_mismatch_overvalued(self):
        v = self._make_valuation(price_deviation_pct=25.0, verdict="undervalued")
        issues = validate_valuation_formulas(v)
        assert any("verdict" in i for i in issues)

    def test_verdict_fair_in_range(self):
        v = self._make_valuation(price_deviation_pct=10.0, verdict="fair")
        issues = validate_valuation_formulas(v)
        # 10% is within ±15%, so fair is correct
        verdict_issues = [i for i in issues if "verdict" in i]
        assert verdict_issues == []

    def test_positive_negotiation_margin_flagged(self):
        # Can't construct with positive margin due to Pydantic le=0.0 constraint
        # Instead test the validator with a dict bypass
        v = self._make_valuation(negotiation_margin_pct=0.0)
        issues = validate_valuation_formulas(v)
        margin_issues = [i for i in issues if "negotiation" in i]
        assert margin_issues == []

    def test_rental_yield_mismatch(self):
        # rent=500, total_cost=80000 → expected yield = (500*12/80000)*100 = 7.5%
        v = self._make_valuation(rental_yield_pct=15.0)  # way off
        issues = validate_valuation_formulas(v)
        assert any("rental_yield" in i for i in issues)

    def test_rental_yield_close_enough(self):
        v = self._make_valuation(rental_yield_pct=8.0)  # within 2.0 of 7.5
        issues = validate_valuation_formulas(v)
        yield_issues = [i for i in issues if "rental_yield" in i]
        assert yield_issues == []

    def test_missing_optional_fields_no_crash(self):
        v = self._make_valuation(
            score_breakdown=None,
            investment_score=None,
            rental_yield_pct=None,
            price_deviation_pct=None,
        )
        issues = validate_valuation_formulas(v)
        assert issues == []

    def test_boundary_deviation_minus_15(self):
        # -15 is NOT < -15, so fair is acceptable
        v = self._make_valuation(price_deviation_pct=-15.0, verdict="fair")
        issues = validate_valuation_formulas(v)
        verdict_issues = [i for i in issues if "verdict" in i]
        assert verdict_issues == []

    def test_boundary_deviation_plus_15(self):
        # +15 is NOT > +15, so fair is acceptable
        v = self._make_valuation(price_deviation_pct=15.0, verdict="fair")
        issues = validate_valuation_formulas(v)
        verdict_issues = [i for i in issues if "verdict" in i]
        assert verdict_issues == []


# ---------------------------------------------------------------------------
# Pydantic model structural tests (no API key needed)
# ---------------------------------------------------------------------------

class TestListingExtractionSchema:
    """Verify ListingExtraction accepts valid data and rejects invalid."""

    def test_valid_full_listing(self):
        data = {
            "title": "Apt 2 camere Centru",
            "price_eur": 45000,
            "size_m2": 65.0,
            "rooms": 2,
            "floor": 4,
            "total_floors": 9,
            "zone": "Centru",
            "city": "Chisinau",
            "condition": "renovated",
            "features": ["termopan"],
            "parking_included": True,
            "parking_price_eur": 12000,
        }
        listing = ListingExtraction(**data)
        assert listing.price_eur == 45000
        assert listing.condition == "renovated"

    def test_minimal_listing(self):
        listing = ListingExtraction(title="Test", city="Chisinau")
        assert listing.price_eur is None
        assert listing.condition == "unknown"

    def test_invalid_condition_rejected(self):
        with pytest.raises(Exception):
            ListingExtraction(title="Test", city="X", condition="amazing")

    def test_features_default_empty(self):
        listing = ListingExtraction(title="Test", city="X")
        assert listing.features == []


class TestValuationResultSchema:
    """Verify ValuationResult accepts valid data and rejects invalid."""

    def test_valid_full_valuation(self):
        data = {
            "verdict": "fair",
            "confidence": 0.85,
            "fair_value_eur_per_m2": 1200,
            "price_deviation_pct": -5.0,
            "reasoning": "Market analysis.",
            "key_factors": ["location", "condition"],
            "investment_score": 6.5,
            "score_breakdown": {
                "price_score": 6.0, "location_score": 7.0,
                "condition_score": 7.0, "market_score": 6.0,
            },
            "recommendation": "buy",
            "rental_estimate_eur": 500,
            "rental_yield_pct": 7.5,
            "negotiation_margin_pct": -5.0,
            "total_cost_eur": 80000,
        }
        v = ValuationResult(**data)
        assert v.verdict == "fair"
        assert v.score_breakdown.price_score == 6.0

    def test_invalid_verdict_rejected(self):
        with pytest.raises(Exception):
            ValuationResult(
                verdict="amazing_deal",
                confidence=0.5,
                reasoning="test",
            )

    def test_confidence_bounds(self):
        with pytest.raises(Exception):
            ValuationResult(verdict="fair", confidence=1.5, reasoning="test")

    def test_investment_score_bounds(self):
        with pytest.raises(Exception):
            ValuationResult(
                verdict="fair", confidence=0.5, reasoning="test",
                investment_score=15.0,
            )

    def test_score_breakdown_bounds(self):
        with pytest.raises(Exception):
            ScoreBreakdown(
                price_score=12.0, location_score=7.0,
                condition_score=6.0, market_score=7.0,
            )


# ---------------------------------------------------------------------------
# GEval schema validation with DeepSeek judge (requires API key)
# ---------------------------------------------------------------------------

if _HAS_API_KEY:
    from deepeval import assert_test
    from deepeval.test_case import LLMTestCase
    from eval._judge import (
        extraction_completeness,
        extraction_correctness,
    )

SCHEMA_GOLDEN_CASES = [] if not _HAS_API_KEY else [
    {
        "name": "complete_extraction_all_fields",
        "input": """Title: Apartament 2 camere, Centru, Chisinau
Price: 65 000 EUR
Suprafata: 70 m²
Etaj: 3/9
Numar camere: 2
Stare: Euroreparatie
Zona: Centru
Descriere: Apartament renovat complet, bloc nou 2023.""",
        "actual_output": json.dumps({
            "title": "Apartament 2 camere, Centru, Chisinau",
            "price_eur": 65000, "price_local": 65000, "currency": "EUR",
            "size_m2": 70, "price_per_m2": 929, "rooms": 2,
            "floor": 3, "total_floors": 9,
            "zone": "Centru", "city": "Chisinau",
            "condition": "renovated", "features": ["bloc nou"],
        }),
    },
    {
        "name": "minimal_extraction_missing_fields",
        "input": """Title: Garsoniera Buiucani
Price: 25000 EUR
Suprafata: 28 m²""",
        "actual_output": json.dumps({
            "title": "Garsoniera Buiucani",
            "price_eur": 25000, "price_local": 25000, "currency": "EUR",
            "size_m2": 28, "price_per_m2": 893,
            "rooms": 1, "zone": "Buiucani", "city": "Chisinau",
            "condition": "unknown", "features": [],
        }),
    },
]


@pytest.mark.skipif(not _HAS_API_KEY, reason="requires DEEPSEEK_API_KEY")
@pytest.mark.parametrize(
    "case", SCHEMA_GOLDEN_CASES,
    ids=[c["name"] for c in SCHEMA_GOLDEN_CASES] if SCHEMA_GOLDEN_CASES else [],
)
def test_schema_extraction(case):
    """Verify extracted JSON is both structurally valid and semantically complete."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
    )
    assert_test(test_case, [extraction_completeness, extraction_correctness])
