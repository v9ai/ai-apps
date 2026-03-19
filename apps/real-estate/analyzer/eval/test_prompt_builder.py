"""Unit tests for _build_valuation_prompt — pure Python, no LLM judge.

Covers:
  1. Data quality calculation (high / medium / low)
  2. Parking line rendering (included, separate w/ price, separate w/o price, none)
  3. Comparable section rendering (with comps, without comps)
  4. All fields populated vs minimal fields
  5. Edge cases: None values, empty features list
"""

import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent))

from analyzer.agent import _build_valuation_prompt
from analyzer.models import ListingExtraction


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_listing(**kwargs) -> ListingExtraction:
    """Build a ListingExtraction with sensible defaults; override via kwargs."""
    defaults = {
        "title": "Test Apartment",
        "city": "Chisinau",
        "zone": "Centru",
        "price_eur": 72500,
        "size_m2": 51.0,
        "price_per_m2": 1421.0,
        "rooms": 2,
        "floor": 3,
        "total_floors": 10,
        "condition": "new",
        "features": ["balcon", "lift"],
        "parking_included": None,
        "parking_price_eur": None,
    }
    defaults.update(kwargs)
    return ListingExtraction(**defaults)


# ===================================================================
# 1. Data quality calculation
# ===================================================================

class TestDataQuality:
    """Data quality is derived from 6 boolean checks:
        price_eur is not None, size_m2 is not None, rooms is not None,
        floor is not None, zone is not None, condition != "unknown".
    high >= 5, medium 3-4, low < 3.
    """

    def test_high_quality_all_six(self):
        """All 6 fields present -> 'high (6/6)'."""
        listing = _make_listing()  # defaults fill all 6
        prompt = _build_valuation_prompt(listing)
        assert "Data quality: high (6/6 fields)" in prompt

    def test_high_quality_five_fields(self):
        """5 of 6 fields -> still 'high (5/6)'."""
        listing = _make_listing(rooms=None)
        prompt = _build_valuation_prompt(listing)
        assert "Data quality: high (5/6 fields)" in prompt

    def test_medium_quality_four_fields(self):
        """4 of 6 fields -> 'medium (4/6)'."""
        listing = _make_listing(rooms=None, floor=None)
        prompt = _build_valuation_prompt(listing)
        assert "Data quality: medium (4/6 fields)" in prompt

    def test_medium_quality_three_fields(self):
        """3 of 6 fields -> 'medium (3/6)'."""
        listing = _make_listing(rooms=None, floor=None, zone=None)
        prompt = _build_valuation_prompt(listing)
        assert "Data quality: medium (3/6 fields)" in prompt

    def test_low_quality_two_fields(self):
        """2 of 6 fields -> 'low (2/6)'."""
        listing = _make_listing(
            rooms=None, floor=None, zone=None, condition="unknown",
        )
        prompt = _build_valuation_prompt(listing)
        assert "Data quality: low (2/6 fields)" in prompt

    def test_low_quality_zero_fields(self):
        """All optional fields None and condition unknown -> 'low (0/6)'."""
        listing = _make_listing(
            price_eur=None, size_m2=None, rooms=None,
            floor=None, zone=None, condition="unknown",
        )
        prompt = _build_valuation_prompt(listing)
        assert "Data quality: low (0/6 fields)" in prompt

    def test_condition_unknown_does_not_count(self):
        """condition='unknown' subtracts one data point vs a real condition."""
        full = _make_listing(condition="renovated")
        unknown = _make_listing(condition="unknown")
        prompt_full = _build_valuation_prompt(full)
        prompt_unk = _build_valuation_prompt(unknown)
        assert "(6/6 fields)" in prompt_full
        assert "(5/6 fields)" in prompt_unk


# ===================================================================
# 2. Parking line rendering
# ===================================================================

class TestParkingLineRendering:

    def test_parking_included_with_price(self):
        listing = _make_listing(parking_included=True, parking_price_eur=12000)
        prompt = _build_valuation_prompt(listing)
        assert "Parking: INCLUDED in listed price" in prompt
        assert "(estimated value: \u20ac12,000)" in prompt
        assert "apartment-only price per m\u00b2 is lower than shown" in prompt

    def test_parking_included_without_price(self):
        listing = _make_listing(parking_included=True, parking_price_eur=None)
        prompt = _build_valuation_prompt(listing)
        assert "Parking: INCLUDED in listed price" in prompt
        # No value suffix when price is unknown
        assert "estimated value" not in prompt

    def test_parking_separate_with_price(self):
        listing = _make_listing(parking_included=False, parking_price_eur=15000)
        prompt = _build_valuation_prompt(listing)
        assert "Parking: SEPARATE purchase" in prompt
        assert "\u20ac15,000 separately" in prompt
        assert "total acquisition cost is higher" in prompt

    def test_parking_separate_without_price(self):
        listing = _make_listing(parking_included=False, parking_price_eur=None)
        prompt = _build_valuation_prompt(listing)
        assert "Parking: SEPARATE purchase" in prompt
        assert "(price unknown)" in prompt

    def test_no_parking_info(self):
        """When parking_included is None, no Parking: line at all."""
        listing = _make_listing(parking_included=None)
        prompt = _build_valuation_prompt(listing)
        assert "Parking:" not in prompt
        assert "INCLUDED" not in prompt
        assert "SEPARATE" not in prompt


# ===================================================================
# 3. Comparable section rendering
# ===================================================================

class TestComparableSection:

    COMP_CONTEXT = (
        "COMPARABLE MARKET DATA (5 active listings in zone): "
        "avg \u20ac1200/m\u00b2, median \u20ac1180/m\u00b2, "
        "range \u20ac950\u2013\u20ac1400/m\u00b2"
    )

    def test_comp_section_present(self):
        listing = _make_listing()
        prompt = _build_valuation_prompt(listing, comp_zone_context=self.COMP_CONTEXT)
        assert self.COMP_CONTEXT in prompt
        assert "PRIMARY anchor for fair_value_eur_per_m2" in prompt
        assert "condition/floor/parking adjustments" in prompt
        assert "\u00b18%" in prompt  # ±8%

    def test_comp_section_absent_when_none(self):
        listing = _make_listing()
        prompt = _build_valuation_prompt(listing, comp_zone_context=None)
        assert "COMPARABLE MARKET DATA" not in prompt
        assert "PRIMARY anchor" not in prompt

    def test_comp_section_absent_when_omitted(self):
        """Default value (no arg) should also omit comps."""
        listing = _make_listing()
        prompt = _build_valuation_prompt(listing)
        assert "COMPARABLE MARKET DATA" not in prompt


# ===================================================================
# 4. All fields populated vs minimal fields
# ===================================================================

class TestFullVsMinimalListing:

    def test_all_fields_populated(self):
        listing = _make_listing(
            price_eur=85000,
            size_m2=70.0,
            price_per_m2=1214.0,
            rooms=2,
            floor=5,
            total_floors=10,
            zone="Centru",
            city="Chisinau",
            condition="renovated",
            features=["balcon", "lift", "boiler autonom"],
            parking_included=True,
            parking_price_eur=12000,
        )
        prompt = _build_valuation_prompt(listing)
        assert "City: Chisinau" in prompt
        assert "Zone: Centru" in prompt
        assert "Price: 85000 EUR" in prompt
        assert "Size: 70.0 m" in prompt
        assert "Price per m\u00b2: 1214.0 EUR/m\u00b2" in prompt
        assert "Rooms: 2" in prompt
        assert "Floor: 5/10" in prompt
        assert "Condition: renovated" in prompt
        assert "balcon, lift, boiler autonom" in prompt
        assert "Data quality: high (6/6 fields)" in prompt
        assert "INCLUDED" in prompt

    def test_minimal_listing(self):
        """Only title and city (required fields), everything else None/default."""
        listing = ListingExtraction(
            title="Bare listing",
            city="Cahul",
        )
        prompt = _build_valuation_prompt(listing)
        assert "City: Cahul" in prompt
        assert "Zone: unknown" in prompt
        assert "Price: unknown" in prompt
        assert "Size: unknown" in prompt
        assert "Rooms: unknown" in prompt
        assert "Floor: unknown" in prompt
        assert "Condition: unknown" in prompt
        assert "none listed" in prompt
        assert "Data quality: low (0/6 fields)" in prompt
        # No parking line
        assert "Parking:" not in prompt


# ===================================================================
# 5. Edge cases
# ===================================================================

class TestEdgeCases:

    def test_none_zone_renders_as_unknown(self):
        listing = _make_listing(zone=None)
        prompt = _build_valuation_prompt(listing)
        assert "Zone: unknown" in prompt

    def test_empty_features_list(self):
        listing = _make_listing(features=[])
        prompt = _build_valuation_prompt(listing)
        assert "Features: none listed" in prompt

    def test_single_feature(self):
        listing = _make_listing(features=["centrala"])
        prompt = _build_valuation_prompt(listing)
        assert "Features: centrala" in prompt

    def test_none_price_eur_counted_for_quality(self):
        """price_eur=None should lower the data quality count by 1."""
        listing = _make_listing(price_eur=None)
        prompt = _build_valuation_prompt(listing)
        assert "(5/6 fields)" in prompt

    def test_none_size_m2_counted_for_quality(self):
        listing = _make_listing(size_m2=None)
        prompt = _build_valuation_prompt(listing)
        assert "(5/6 fields)" in prompt

    def test_price_per_m2_not_in_quality_check(self):
        """price_per_m2 is NOT one of the 6 quality fields;
        setting it to None should not change the count."""
        listing = _make_listing(price_per_m2=None)
        prompt = _build_valuation_prompt(listing)
        assert "(6/6 fields)" in prompt

    def test_prompt_always_contains_note_about_apartment_area(self):
        listing = _make_listing()
        prompt = _build_valuation_prompt(listing)
        assert "APARTMENT AREA ONLY" in prompt

    def test_prompt_contains_adjusted_figure_note(self):
        listing = _make_listing()
        prompt = _build_valuation_prompt(listing)
        assert "(price_eur - parking_value) / size_m2" in prompt

    def test_return_type_is_str(self):
        listing = _make_listing()
        prompt = _build_valuation_prompt(listing)
        assert isinstance(prompt, str)
