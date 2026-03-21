"""End-to-end pipeline tests for extract and valuate functions.

Tests structured output parsing, pipeline wiring, and dependency injection.
Also includes a live integration test (marked slow) that runs the full
pipeline and validates with DeepEval metrics.
"""

import json
import os
import sys
import pathlib
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent))

from analyzer.agent import (
    extract_listing,
    valuate_listing,
    _build_valuation_prompt,
    _compute_deviation_pct,
    _compute_zone_stats,
    validate_valuation_formulas,
    AnalyzerDeps,
)
from analyzer.models import (
    ListingExtraction,
    ValuationResult,
    ComparableListing,
    ScoreBreakdown,
)


# ---------------------------------------------------------------------------
# Extraction parsing tests — verify ListingExtraction construction
# ---------------------------------------------------------------------------

class TestExtractionParsing:
    """Test that ListingExtraction can be constructed from valid JSON data."""

    def test_valid_json_creates_listing_extraction(self):
        data = {"title": "Test Apt", "city": "Chisinau", "price_eur": 50000, "size_m2": 60}
        listing = ListingExtraction(**data)
        assert isinstance(listing, ListingExtraction)
        assert listing.title == "Test Apt"
        assert listing.city == "Chisinau"

    def test_minimal_json_creates_listing(self):
        data = {"title": "Minimal", "city": "Unknown"}
        listing = ListingExtraction(**data)
        assert listing.price_eur is None
        assert listing.condition == "unknown"

    def test_full_listing_fields(self):
        data = {
            "title": "Apartament 2 camere",
            "city": "Chisinau",
            "price_eur": 85000,
            "size_m2": 70,
            "price_per_m2": 1214,
            "rooms": 2,
            "floor": 5,
            "total_floors": 10,
            "zone": "Centru",
            "condition": "renovated",
            "features": ["balcon"],
            "parking_included": True,
            "parking_price_eur": 12000,
        }
        listing = ListingExtraction(**data)
        assert listing.price_per_m2 == 1214
        assert listing.rooms == 2
        assert listing.parking_included is True


# ---------------------------------------------------------------------------
# Valuation parsing tests — verify ValuationResult construction
# ---------------------------------------------------------------------------

class TestValuationParsing:
    """Test that ValuationResult can be constructed from valid JSON data."""

    def test_valid_json_creates_valuation(self):
        data = {
            "verdict": "fair",
            "confidence": 0.8,
            "reasoning": "Test",
            "fair_value_eur_per_m2": 1200,
            "price_deviation_pct": 5.0,
            "key_factors": ["test"],
        }
        v = ValuationResult(**data)
        assert v.verdict == "fair"
        assert 0 <= v.confidence <= 1

    def test_full_valuation_fields(self):
        data = {
            "verdict": "undervalued",
            "confidence": 0.85,
            "fair_value_eur_per_m2": 1200,
            "price_deviation_pct": -20.0,
            "reasoning": "Strong undervaluation detected.",
            "key_factors": ["below market", "good condition"],
            "investment_score": 7.6,
            "score_breakdown": ScoreBreakdown(
                price_score=8.0, location_score=7.0,
                condition_score=7.0, market_score=8.0,
            ),
            "recommendation": "buy",
            "rental_estimate_eur": 450,
            "rental_yield_pct": 10.8,
            "negotiation_margin_pct": -2.0,
            "total_cost_eur": 50000,
        }
        v = ValuationResult(**data)
        assert v.verdict == "undervalued"
        assert v.investment_score == 7.6
        assert v.confidence == 0.85


# ---------------------------------------------------------------------------
# Pipeline wiring tests
# ---------------------------------------------------------------------------

class TestPipelineWiring:
    """Test that data flows correctly between pipeline stages."""

    def test_build_valuation_prompt_includes_all_fields(self):
        listing = ListingExtraction(
            title="Test", city="Chisinau", zone="Centru",
            price_eur=85000, size_m2=70, price_per_m2=1214,
            rooms=2, floor=5, total_floors=10,
            condition="renovated", features=["balcon"],
            parking_included=True, parking_price_eur=12000,
        )
        prompt = _build_valuation_prompt(listing)
        assert "Chisinau" in prompt
        assert "Centru" in prompt
        assert "85000 EUR" in prompt
        assert "70" in prompt and "m²" in prompt
        assert "1214" in prompt and "EUR/m²" in prompt
        assert "5/10" in prompt
        assert "renovated" in prompt
        assert "INCLUDED" in prompt
        assert "12,000" in prompt

    def test_build_valuation_prompt_with_comparables(self):
        listing = ListingExtraction(
            title="Test", city="Chisinau", zone="Botanica",
            price_eur=60000, size_m2=65, price_per_m2=923,
            rooms=2, condition="good",
        )
        comp_context = "COMPARABLE MARKET DATA (5 active listings): avg €1050/m², median €1000/m²"
        prompt = _build_valuation_prompt(listing, comp_context)
        assert "COMPARABLE MARKET DATA" in prompt
        assert "PRIMARY anchor" in prompt

    def test_build_valuation_prompt_unknown_fields(self):
        listing = ListingExtraction(title="Test", city="Unknown")
        prompt = _build_valuation_prompt(listing)
        assert "unknown" in prompt.lower()

    def test_compute_deviation_pct(self):
        # Comp at 1200, listing at 1000 -> comp is 20% more expensive
        assert _compute_deviation_pct(1200, 1000) == 20.0
        # Comp at 800, listing at 1000 -> comp is 20% cheaper
        assert _compute_deviation_pct(800, 1000) == -20.0

    def test_compute_zone_stats(self):
        comps = [
            ComparableListing(title="A", price_per_m2=1000),
            ComparableListing(title="B", price_per_m2=1200),
            ComparableListing(title="C", price_per_m2=1100),
        ]
        stats = _compute_zone_stats(comps, "Centru")
        assert stats is not None
        assert stats.count == 3
        assert stats.min_price_per_m2 == 1000
        assert stats.max_price_per_m2 == 1200
        assert stats.median_price_per_m2 == 1100

    def test_compute_zone_stats_empty(self):
        stats = _compute_zone_stats([], "Centru")
        assert stats is None


# ---------------------------------------------------------------------------
# AnalyzerDeps tests
# ---------------------------------------------------------------------------

class TestAnalyzerDeps:
    """Test the dependency injection dataclass."""

    def test_deps_creation(self):
        deps = AnalyzerDeps(
            deepseek_api_key="test-key",
            listing_url="https://999.md/test",
            comparable_context="5 comps found",
        )
        assert deps.deepseek_api_key == "test-key"
        assert deps.listing_url == "https://999.md/test"

    def test_deps_defaults(self):
        deps = AnalyzerDeps(deepseek_api_key="key")
        assert deps.listing_url == ""
        assert deps.comparable_context is None


# ---------------------------------------------------------------------------
# Full pipeline integration test (requires API key, marked slow)
# ---------------------------------------------------------------------------

_HAS_API_KEY = bool(os.getenv("DEEPSEEK_API_KEY"))

if _HAS_API_KEY:
    from deepeval.tracing import trace
    from deepeval.metrics import AnswerRelevancyMetric


@pytest.mark.asyncio
@pytest.mark.slow
@pytest.mark.e2e
@pytest.mark.skipif(not _HAS_API_KEY, reason="requires DEEPSEEK_API_KEY")
async def test_full_pipeline_live():
    """Run the full analyze_listing pipeline with real API calls, traced by DeepEval."""
    from analyzer.agent import analyze_listing

    listing_text = (
        "Title: Apartament 2 camere, Centru, Chisinau\n"
        "Price: 75 000 EUR\n"
        "Suprafata: 65 m²\n"
        "Etaj: 4/9\n"
        "Numar camere: 2\n"
        "Stare: Euroreparatie\n"
        "Zona: Centru"
    )
    url = "https://999.md/ro/test-pipeline"

    with trace(trace_metrics=[AnswerRelevancyMetric()]):
        listing, valuation, comparables, zone_stats = await analyze_listing(listing_text, url)

    # Extraction checks
    assert listing.price_eur == 75000
    assert listing.city.lower() == "chisinau"
    assert listing.rooms == 2

    # Valuation checks
    assert valuation.verdict in ("undervalued", "fair", "overvalued")
    assert 0 <= valuation.confidence <= 1
    assert valuation.fair_value_eur_per_m2 is not None
    assert valuation.reasoning

    # Formula consistency check
    from analyzer.agent import validate_valuation_formulas
    issues = validate_valuation_formulas(valuation)
    severe = [i for i in issues if "verdict" in i.lower()]
    assert not severe, f"Severe formula issues: {severe}"
