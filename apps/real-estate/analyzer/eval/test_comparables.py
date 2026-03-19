"""Evals and unit tests for comparables: scraper_search normalisation + zone stats."""

import os
import statistics
import pytest

# ---------------------------------------------------------------------------
# Unit tests — pure functions, no LLM, no network
# ---------------------------------------------------------------------------

import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent))

from analyzer.scraper_search import (
    _parse_price_eur,
    _parse_size_m2,
    _parse_rooms,
    _score_relevance,
    _normalize_item,
    _build_search_url,
)
from analyzer.agent import _compute_deviation_pct, _compute_zone_stats
from analyzer.models import ComparableListing


# --- _parse_price_eur ---

class TestParsePriceEur:
    def test_eur_passthrough(self):
        assert _parse_price_eur({"price": 75000, "currency": "EUR"}) == 75000

    def test_mdl_conversion(self):
        result = _parse_price_eur({"price": 900000, "currency": "MDL"})
        assert result == 45000

    def test_ron_conversion(self):
        result = _parse_price_eur({"price": 145000, "currency": "RON"})
        assert result == 29000

    def test_filters_below_1000_eur(self):
        assert _parse_price_eur({"price": 500, "currency": "EUR"}) is None

    def test_filters_garbage_string(self):
        assert _parse_price_eur({"price": "N/A", "currency": "EUR"}) is None

    def test_missing_price_returns_none(self):
        assert _parse_price_eur({}) is None

    def test_price_with_spaces_string(self):
        # Some scraped prices come as "75 000"
        result = _parse_price_eur({"price": "75 000", "currency": "EUR"})
        assert result == 75000

    def test_default_currency_is_eur(self):
        # When currency key is absent, assume EUR
        result = _parse_price_eur({"price": 50000})
        assert result == 50000

    def test_negative_price_returns_none(self):
        assert _parse_price_eur({"price": -5000, "currency": "EUR"}) is None

    def test_float_price(self):
        # float prices are truncated via int()
        result = _parse_price_eur({"price": 75000.50, "currency": "EUR"})
        assert result == 75000

    def test_mdl_large_with_spaces(self):
        result = _parse_price_eur({"price": "1 800 000", "currency": "MDL"})
        assert result == 90000


# --- _parse_size_m2 ---

class TestParseSizeM2:
    def test_direct_field(self):
        assert _parse_size_m2({"size": 72}) == 72.0

    def test_area_field_alias(self):
        assert _parse_size_m2({"area": 85.5}) == 85.5

    def test_regex_fallback_on_title(self):
        result = _parse_size_m2({"title": "Apartament 3 camere 95 m² Centru"})
        assert result == 95.0

    def test_regex_m2_with_superscript(self):
        result = _parse_size_m2({"title": "65 m² bloc nou"})
        assert result == 65.0

    def test_no_size_returns_none(self):
        assert _parse_size_m2({"title": "Apartament fara suprafata"}) is None

    def test_mp_suffix(self):
        # "mp" (Romanian shorthand) is not matched by the m²/m2 regex
        assert _parse_size_m2({"title": "Apartament 92 mp Centru"}) is None

    def test_decimal_size(self):
        result = _parse_size_m2({"title": "65.5 m² bloc"})
        assert result == 65.5


# --- _parse_rooms ---

class TestParseRooms:
    def test_rooms_field(self):
        assert _parse_rooms({"rooms": 3}) == 3

    def test_rooms_count_alias(self):
        assert _parse_rooms({"roomsCount": "2"}) == 2

    def test_missing_returns_none(self):
        assert _parse_rooms({}) is None


# --- _score_relevance ---

class TestScoreRelevance:
    def test_exact_zone_match(self):
        comp = {"zone": "Botanica", "rooms": 2, "size_m2": 72}
        score = _score_relevance(comp, zone="Botanica", rooms=2, size_m2=70)
        assert score >= 0.9  # zone(0.5) + rooms(0.2) + size(0.3)

    def test_partial_zone_match(self):
        comp = {"zone": "Botanica Nord", "rooms": None, "size_m2": None}
        score = _score_relevance(comp, zone="Botanica", rooms=None, size_m2=None)
        assert 0.25 <= score <= 0.35  # partial zone only

    def test_no_match_scores_zero(self):
        comp = {"zone": "Centru", "rooms": 1, "size_m2": 30}
        score = _score_relevance(comp, zone="Buiucani", rooms=3, size_m2=90)
        assert score == 0.0

    def test_size_outside_20pct_no_bonus(self):
        comp = {"zone": None, "rooms": None, "size_m2": 120}
        score = _score_relevance(comp, zone=None, rooms=None, size_m2=80)
        # 120/80 = 1.5 — outside ±20%, no size bonus
        assert score == 0.0

    def test_size_within_20pct_gets_bonus(self):
        comp = {"zone": None, "rooms": None, "size_m2": 88}
        score = _score_relevance(comp, zone=None, rooms=None, size_m2=80)
        # 88/80 = 1.1 — inside ±20%
        assert score == pytest.approx(0.3)

    def test_same_zone_different_rooms(self):
        # Zone matches (0.5), rooms differ by 2 (0.0), size within range (0.3)
        comp = {"zone": "Botanica", "rooms": 4, "size_m2": 85}
        score = _score_relevance(comp, zone="Botanica", rooms=2, size_m2=80)
        assert score == pytest.approx(0.8)  # zone(0.5) + size(0.3), no rooms bonus

    def test_null_zone_both_sides(self):
        # Both zone=None → guard `if target_zone and comp_zone` is False → 0 zone score
        comp = {"zone": None, "rooms": 2, "size_m2": 70}
        score = _score_relevance(comp, zone=None, rooms=2, size_m2=70)
        # rooms(0.2) + size(0.3) only, no zone contribution
        assert score == pytest.approx(0.5)


# --- _normalize_item ---

class TestNormalizeItem:
    def test_valid_item(self):
        item = {
            "title": "Apartament 2 camere Centru",
            "price": 78000,
            "currency": "EUR",
            "size": 82,
            "rooms": 2,
            "zone": "Centru",
            "url": "/ro/ads/12345",
        }
        result = _normalize_item(item)
        assert result is not None
        assert result["price_eur"] == 78000
        assert result["size_m2"] == 82.0
        assert result["price_per_m2"] == 951  # 78000/82 rounded
        assert result["rooms"] == 2
        assert result["url"] == "https://999.md/ro/ads/12345"

    def test_missing_price_returns_none(self):
        assert _normalize_item({"title": "No price", "size": 70}) is None

    def test_title_truncated_to_120(self):
        item = {"title": "A" * 200, "price": 50000, "currency": "EUR"}
        result = _normalize_item(item)
        assert result is not None
        assert len(result["title"]) == 120

    def test_absolute_url_kept_as_is(self):
        item = {"title": "X", "price": 50000, "currency": "EUR", "url": "https://999.md/ro/ads/99"}
        result = _normalize_item(item)
        assert result["url"] == "https://999.md/ro/ads/99"

    def test_missing_zone_defaults_none(self):
        item = {"title": "Apartament simplu", "price": 60000, "currency": "EUR"}
        result = _normalize_item(item)
        assert result is not None
        assert result["zone"] is None


# --- _build_search_url ---

class TestBuildSearchUrl:
    def test_sale_with_2_rooms(self):
        url = _build_search_url(rooms=2, listing_type="sale")
        assert "exo_1=777" in url
        assert "exo_241=894" in url

    def test_sale_no_rooms(self):
        url = _build_search_url(rooms=None, listing_type="sale")
        assert "exo_1=777" in url
        assert "exo_241" not in url

    def test_unknown_room_count_omitted(self):
        url = _build_search_url(rooms=7, listing_type="sale")
        assert "exo_241" not in url


# --- _compute_deviation_pct ---

class TestComputeDeviationPct:
    def test_comp_more_expensive(self):
        # comp=1100, listing=1000 → +10%
        assert _compute_deviation_pct(1100, 1000) == pytest.approx(10.0)

    def test_comp_cheaper(self):
        # comp=900, listing=1000 → -10%
        assert _compute_deviation_pct(900, 1000) == pytest.approx(-10.0)

    def test_equal_prices(self):
        assert _compute_deviation_pct(950, 950) == pytest.approx(0.0)


# --- _compute_zone_stats ---

class TestComputeZoneStats:
    def _make_comps(self, prices_per_m2: list[float]) -> list[ComparableListing]:
        return [
            ComparableListing(title=f"Comp {i}", price_per_m2=p)
            for i, p in enumerate(prices_per_m2)
        ]

    def test_basic_stats(self):
        comps = self._make_comps([800, 900, 1000, 1100])
        stats = _compute_zone_stats(comps, zone="Botanica")
        assert stats is not None
        assert stats.count == 4
        assert stats.avg_price_per_m2 == pytest.approx(950, abs=1)
        assert stats.median_price_per_m2 == pytest.approx(950, abs=1)
        assert stats.min_price_per_m2 == 800
        assert stats.max_price_per_m2 == 1100
        assert stats.zone == "Botanica"

    def test_empty_comparables_returns_none(self):
        assert _compute_zone_stats([], zone="Centru") is None

    def test_all_null_prices_returns_none(self):
        comps = [ComparableListing(title="X", price_per_m2=None)]
        assert _compute_zone_stats(comps, zone="Centru") is None

    def test_single_comp(self):
        comps = self._make_comps([1200])
        stats = _compute_zone_stats(comps, zone="Centru")
        assert stats is not None
        assert stats.count == 1
        assert stats.avg_price_per_m2 == pytest.approx(1200, abs=1)
        assert stats.min_price_per_m2 == stats.max_price_per_m2 == 1200


# ---------------------------------------------------------------------------
# GEval — comparable relevance (requires judge)
# ---------------------------------------------------------------------------

import json

COMPARABLE_RELEVANCE_CASES = [
    {
        "input": "Target: Chisinau, Botanica, 2 rooms, 72 m²",
        "actual_output": json.dumps([
            {"title": "Apt 2 camere Botanica", "price_per_m2": 920, "size_m2": 68, "rooms": 2, "zone": "Botanica"},
            {"title": "Apt 2 camere Botanica Sud", "price_per_m2": 880, "size_m2": 75, "rooms": 2, "zone": "Botanica"},
            {"title": "Apt 2 camere Riscani", "price_per_m2": 850, "size_m2": 70, "rooms": 2, "zone": "Riscani"},
        ]),
        "expected_output": "relevant",
    },
    {
        "input": "Target: Chisinau, Centru, 3 rooms, 85 m²",
        "actual_output": json.dumps([
            {"title": "Studio Telecentru", "price_per_m2": 750, "size_m2": 28, "rooms": 1, "zone": "Telecentru"},
            {"title": "Penthouse Centru 300m²", "price_per_m2": 2500, "size_m2": 300, "rooms": 6, "zone": "Centru"},
        ]),
        "expected_output": "not relevant",
    },
    {
        "input": "Target: Chisinau, Botanica, 2 rooms, 65 m²",
        "actual_output": json.dumps([
            {"title": "Apt 2 camere Botanica", "price_per_m2": 900, "size_m2": 62, "rooms": 2, "zone": "Botanica"},
            {"title": "Apt 3 camere Bucuresti Sector 3", "price_per_m2": 1800, "size_m2": 70, "rooms": 3, "zone": "Sector 3"},
        ]),
        "expected_output": "not relevant",
    },
    {
        "input": "Target: Chisinau, Centru, 3 rooms, 85 m²",
        "actual_output": json.dumps([
            {"title": "Apt 3 camere Centru 82m²", "price_per_m2": 1100, "size_m2": 82, "rooms": 3, "zone": "Centru"},
            {"title": "Apt 3 camere Centru 88m²", "price_per_m2": 1050, "size_m2": 88, "rooms": 3, "zone": "Centru"},
            {"title": "Apt 3 camere Centru 85m²", "price_per_m2": 1080, "size_m2": 85, "rooms": 3, "zone": "Centru"},
        ]),
        "expected_output": "relevant",
    },
]


@pytest.mark.skipif(not _HAS_API_KEY, reason="requires DEEPSEEK_API_KEY")
@pytest.mark.parametrize("case", COMPARABLE_RELEVANCE_CASES)
def test_comparable_relevance(case):
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        expected_output=case["expected_output"],
    )
    assert_test(test_case, [comparable_relevance])
