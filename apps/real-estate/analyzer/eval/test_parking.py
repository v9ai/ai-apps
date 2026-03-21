"""Parking extraction accuracy + valuation prompt unit tests.

GEval metric validates parking_included/parking_price_eur against listing text.
Unit tests verify _build_valuation_prompt() parking line generation.

Research grounding:
  - agent-11 (AVM features)
  - agent-14 (Comparable Sales adjustments)
"""

import os
import sys
import json
import pathlib
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent))

from analyzer.agent import _build_valuation_prompt
from analyzer.models import ListingExtraction

# ---------------------------------------------------------------------------
# GEval metric (only created when DEEPSEEK_API_KEY is set)
# ---------------------------------------------------------------------------

_HAS_API_KEY = bool(os.getenv("DEEPSEEK_API_KEY"))

if _HAS_API_KEY:
    from deepeval import assert_test
    from deepeval.test_case import LLMTestCase

    # Import shared metric from centralized _judge.py
    from eval._judge import parking_extraction_accuracy

# ---------------------------------------------------------------------------
# Golden cases — parking extraction
# ---------------------------------------------------------------------------

PARKING_CASES = [
    # 1. Parking included explicitly
    {
        "input": """Title: Apartament 2 camere, Centru, Chisinau
Price: 85 000 EUR
Suprafata: 70 m²
Etaj: 5/10
Camere: 2
Stare: Euroreparatie
Zona: Centru
Parcare: loc parcare subteran inclus in pret
Descriere: Bloc nou 2024, parcare subterana inclusa.""",
        "actual_output": json.dumps({
            "title": "Apartament 2 camere, Centru, Chisinau",
            "price_eur": 85000,
            "price_local": 85000,
            "currency": "EUR",
            "size_m2": 70,
            "price_per_m2": 1214,
            "rooms": 2,
            "floor": 5,
            "total_floors": 10,
            "zone": "Centru",
            "city": "Chisinau",
            "condition": "renovated",
            "features": ["parcare subterana"],
            "parking_included": True,
            "parking_price_eur": 12000,
        }),
    },
    # 2. Parking separate with explicit price
    {
        "input": """Title: Apartament 1 camera, Aeroport
Price: 55 000 EUR (apartament)
Pret parcare separat — 15 000 EUR
Suprafata: 45 m²
Etaj: 3/10
Camere: 1
Stare: Variantă albă
Zona: Aeroport
Descriere: Bloc nou Exfactor, loc de parcare subteran se vinde separat.""",
        "actual_output": json.dumps({
            "title": "Apartament 1 camera, Aeroport",
            "price_eur": 55000,
            "price_local": 55000,
            "currency": "EUR",
            "size_m2": 45,
            "price_per_m2": 1222,
            "rooms": 1,
            "floor": 3,
            "total_floors": 10,
            "zone": "Aeroport",
            "city": "Chisinau",
            "condition": "new",
            "features": ["bloc nou"],
            "parking_included": False,
            "parking_price_eur": 15000,
        }),
    },
    # 3. No parking mentioned
    {
        "input": """Title: Garsoniera Buiucani
Price: 32 000 EUR
Suprafata: 38 m²
Etaj: 2/5
Camere: 1
Stare: Buna
Zona: Buiucani
Descriere: Garsoniera cu reparatie, fereastra spre curte.""",
        "actual_output": json.dumps({
            "title": "Garsoniera Buiucani",
            "price_eur": 32000,
            "price_local": 32000,
            "currency": "EUR",
            "size_m2": 38,
            "price_per_m2": 842,
            "rooms": 1,
            "floor": 2,
            "total_floors": 5,
            "zone": "Buiucani",
            "city": "Chisinau",
            "condition": "good",
            "features": [],
            "parking_included": None,
            "parking_price_eur": None,
        }),
    },
    # 4. Ambiguous mention
    {
        "input": """Title: Apartament 3 camere, Botanica
Price: 92 000 EUR
Suprafata: 85 m²
Etaj: 4/9
Camere: 3
Stare: Euroreparatie
Zona: Botanica
Descriere: Apartament cu loc de parcare, bloc consolidat, zona linistita.""",
        "actual_output": json.dumps({
            "title": "Apartament 3 camere, Botanica",
            "price_eur": 92000,
            "price_local": 92000,
            "currency": "EUR",
            "size_m2": 85,
            "price_per_m2": 1082,
            "rooms": 3,
            "floor": 4,
            "total_floors": 9,
            "zone": "Botanica",
            "city": "Chisinau",
            "condition": "renovated",
            "features": ["loc de parcare"],
            "parking_included": True,
            "parking_price_eur": 8000,
        }),
    },
    # 5. Underground parking with specific price in text
    {
        "input": """Title: Apartament 2 camere, Centru
Price: 95 000 EUR
Suprafata: 80 m²
Etaj: 6/12
Camere: 2
Stare: Euroreparatie
Zona: Centru
Descriere: Bloc nou, parcare subterana 12000 EUR inclusa in pretul apartamentului.""",
        "actual_output": json.dumps({
            "title": "Apartament 2 camere, Centru",
            "price_eur": 95000,
            "price_local": 95000,
            "currency": "EUR",
            "size_m2": 80,
            "price_per_m2": 1187,
            "rooms": 2,
            "floor": 6,
            "total_floors": 12,
            "zone": "Centru",
            "city": "Chisinau",
            "condition": "renovated",
            "features": ["parcare subterana"],
            "parking_included": True,
            "parking_price_eur": 12000,
        }),
    },
    # 6. Surface/exterior parking mentioned
    {
        "input": """Title: Apartament 3 camere, Botanica
Price: 78 000 EUR
Suprafata: 85 m²
Etaj: 2/9
Camere: 3
Stare: Buna
Zona: Botanica
Descriere: Apartament spatios cu loc parcare exterior, bloc nou.""",
        "actual_output": json.dumps({
            "title": "Apartament 3 camere, Botanica",
            "price_eur": 78000,
            "price_local": 78000,
            "currency": "EUR",
            "size_m2": 85,
            "price_per_m2": 917,
            "rooms": 3,
            "floor": 2,
            "total_floors": 9,
            "zone": "Botanica",
            "city": "Chisinau",
            "condition": "good",
            "features": ["loc parcare exterior"],
            "parking_included": True,
            "parking_price_eur": 6000,
        }),
    },
    # 7. Two parking spots
    {
        "input": """Title: Apartament 4 camere, Centru
Price: 180 000 EUR
Suprafata: 120 m²
Etaj: 8/16
Camere: 4
Stare: Euroreparatie
Zona: Centru
Descriere: Penthouse bloc nou premium, 2 locuri de parcare subterane incluse.""",
        "actual_output": json.dumps({
            "title": "Apartament 4 camere, Centru",
            "price_eur": 180000,
            "price_local": 180000,
            "currency": "EUR",
            "size_m2": 120,
            "price_per_m2": 1500,
            "rooms": 4,
            "floor": 8,
            "total_floors": 16,
            "zone": "Centru",
            "city": "Chisinau",
            "condition": "renovated",
            "features": ["2 locuri de parcare subterane"],
            "parking_included": True,
            "parking_price_eur": 24000,
        }),
    },
]


@pytest.mark.skipif(not _HAS_API_KEY, reason="requires DEEPSEEK_API_KEY")
@pytest.mark.parametrize("case", PARKING_CASES, ids=[
    "parking_included",
    "parking_separate",
    "no_parking",
    "ambiguous_parking",
    "underground_with_price",
    "surface_parking",
    "two_spots",
])
def test_parking_extraction(case):
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
    )
    assert_test(test_case, [parking_extraction_accuracy])


# ---------------------------------------------------------------------------
# Unit tests — _build_valuation_prompt parking lines
# ---------------------------------------------------------------------------

def _make_listing(**kwargs) -> ListingExtraction:
    defaults = {
        "title": "Test",
        "city": "Chisinau",
        "zone": "Centru",
        "price_eur": 72500,
        "size_m2": 51,
        "price_per_m2": 1421,
        "rooms": 1,
        "floor": 3,
        "total_floors": 10,
        "condition": "new",
    }
    defaults.update(kwargs)
    return ListingExtraction(**defaults)


class TestBuildValuationPromptParking:
    def test_parking_included_with_price(self):
        listing = _make_listing(parking_included=True, parking_price_eur=12000)
        prompt = _build_valuation_prompt(listing)
        assert "INCLUDED" in prompt
        assert "12,000" in prompt

    def test_parking_separate_with_price(self):
        listing = _make_listing(parking_included=False, parking_price_eur=15000)
        prompt = _build_valuation_prompt(listing)
        assert "SEPARATE" in prompt
        assert "15,000" in prompt

    def test_parking_none_no_line(self):
        listing = _make_listing(parking_included=None, parking_price_eur=None)
        prompt = _build_valuation_prompt(listing)
        assert "Parking:" not in prompt
        assert "INCLUDED" not in prompt
        assert "SEPARATE" not in prompt

    def test_parking_included_no_price(self):
        listing = _make_listing(parking_included=True, parking_price_eur=None)
        prompt = _build_valuation_prompt(listing)
        assert "INCLUDED" in prompt
        # Should not contain a value suffix
        assert "estimated value" not in prompt

    def test_parking_separate_no_price(self):
        listing = _make_listing(parking_included=False, parking_price_eur=None)
        prompt = _build_valuation_prompt(listing)
        assert "SEPARATE" in prompt
        assert "price unknown" in prompt

    def test_no_parking_with_comp_context(self):
        listing = _make_listing(parking_included=None, parking_price_eur=None)
        prompt = _build_valuation_prompt(listing, comp_zone_context="COMPARABLE MARKET DATA (5 listings): avg €1050/m²")
        assert "COMPARABLE MARKET DATA" in prompt
        assert "Parking:" not in prompt

    def test_parking_included_with_comp_context(self):
        listing = _make_listing(parking_included=True, parking_price_eur=12000)
        prompt = _build_valuation_prompt(listing, comp_zone_context="COMPARABLE MARKET DATA (3 listings): avg €950/m²")
        assert "INCLUDED" in prompt
        assert "12,000" in prompt
        assert "COMPARABLE MARKET DATA" in prompt


# ---------------------------------------------------------------------------
# Live CrewAI parking extraction test — runs the actual extractor crew
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.slow
@pytest.mark.skipif(not _HAS_API_KEY, reason="requires DEEPSEEK_API_KEY")
async def test_parking_extraction_crew_live():
    """Run the actual extractor crew on a listing with parking info and verify extraction."""
    from deepeval.tracing import trace
    from deepeval.metrics import AnswerRelevancyMetric
    from analyzer.agent import extract_listing

    listing_text = (
        "Title: Apartament 2 camere, Centru, Chisinau\n"
        "Price: 85 000 EUR\n"
        "Suprafata: 70 m²\n"
        "Etaj: 5/10\n"
        "Camere: 2\n"
        "Stare: Euroreparatie\n"
        "Zona: Centru\n"
        "Parcare: loc parcare subteran inclus in pret\n"
        "Descriere: Bloc nou 2024, parcare subterana inclusa, finisaje premium."
    )

    with trace(trace_metrics=[AnswerRelevancyMetric()]):
        listing = await extract_listing(
            f"Extract apartment data from this listing:\n\n{listing_text}"
        )

    assert listing.price_eur == 85000
    assert listing.parking_included is True
    assert listing.parking_price_eur is not None
    assert listing.parking_price_eur >= 5000  # Should estimate underground parking value
