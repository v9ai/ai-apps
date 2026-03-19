"""Pure-Python unit tests for the mathematical formulas in the valuator prompt.

No LLM calls — runs instantly. Each test class validates a specific formula
that the DeepSeek agent is instructed to compute.

Research grounding:
  - agent-22 (rental yield formulas)
  - agent-81 (AVM benchmark KPIs)
"""

import pytest


# ---------------------------------------------------------------------------
# Formula implementations (mirrors the agent prompt instructions)
# ---------------------------------------------------------------------------

def price_deviation_pct(listing_per_m2: float, fair_per_m2: float) -> float:
    """(listing - fair) / fair * 100"""
    if fair_per_m2 == 0:
        return float("inf")
    return (listing_per_m2 - fair_per_m2) / fair_per_m2 * 100


def classify_verdict(deviation: float) -> str:
    if deviation < -15:
        return "undervalued"
    if deviation > 15:
        return "overvalued"
    return "fair"


def map_recommendation(
    deviation: float, confidence: float, fundamentals: str = "neutral"
) -> str:
    """
    strong_buy: deviation < -20% AND confidence >= 0.75
    buy: deviation < -5% OR (fair AND strong fundamentals)
    hold: fair price, neutral fundamentals
    avoid: overvalued OR major risks
    """
    if deviation < -20 and confidence >= 0.75:
        return "strong_buy"
    if deviation < -5:
        return "buy"
    if deviation > 15:
        return "avoid"
    if -5 <= deviation <= 15 and fundamentals == "strong":
        return "buy"
    return "hold"


def investment_score(price: float, location: float, condition: float, market: float) -> float:
    return 0.4 * price + 0.3 * location + 0.2 * condition + 0.1 * market


def rental_yield_pct(rent_monthly: float, price: float) -> float:
    """(rent * 12 / price) * 100"""
    return (rent_monthly * 12 / price) * 100


def net_yield_pct(rent_monthly: float, total_cost: float) -> float:
    """(rent * 12 * 0.8) / total_cost * 100"""
    return (rent_monthly * 12 * 0.80) / total_cost * 100


def breakeven_years(total_cost: float, rent_monthly: float) -> float:
    """total_cost / (rent * 12 * 0.8)"""
    return total_cost / (rent_monthly * 12 * 0.80)


def fair_price_eur(fair_per_m2: float, size_m2: float) -> int:
    return round(fair_per_m2 * size_m2)


def total_cost_eur(
    price: int,
    country: str,
    parking_separate: bool = False,
    parking_price: int = 0,
) -> int:
    """price + parking_if_separate + acquisition fees (3% Moldova, 2% Romania)"""
    fee_rate = 0.03 if country == "moldova" else 0.02
    base = price + (parking_price if parking_separate else 0)
    return round(base * (1 + fee_rate))


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestPriceDeviation:
    def test_undervalued(self):
        assert price_deviation_pct(800, 1000) == pytest.approx(-20.0)

    def test_overvalued(self):
        assert price_deviation_pct(1200, 1000) == pytest.approx(20.0)

    def test_fair(self):
        assert price_deviation_pct(1000, 1000) == pytest.approx(0.0)

    def test_slight_undervalue(self):
        assert price_deviation_pct(900, 1000) == pytest.approx(-10.0)

    def test_zero_fair_value(self):
        result = price_deviation_pct(1000, 0)
        assert result == float("inf")


class TestVerdictClassification:
    @pytest.mark.parametrize("deviation,expected", [
        (-16, "undervalued"),
        (-15, "fair"),       # boundary: -15 is NOT < -15
        (-14, "fair"),
        (0, "fair"),
        (14, "fair"),
        (15, "fair"),        # boundary: 15 is NOT > 15
        (16, "overvalued"),
        (-25, "undervalued"),
    ])
    def test_thresholds(self, deviation, expected):
        assert classify_verdict(deviation) == expected


class TestRecommendationMapping:
    def test_strong_buy(self):
        assert map_recommendation(-25, 0.80) == "strong_buy"

    def test_strong_buy_low_confidence(self):
        # deviation qualifies but confidence too low → falls to buy
        assert map_recommendation(-25, 0.70) == "buy"

    def test_buy_moderate_undervalue(self):
        assert map_recommendation(-8, 0.60) == "buy"

    def test_hold_fair(self):
        assert map_recommendation(0, 0.75) == "hold"

    def test_avoid_overvalued(self):
        assert map_recommendation(20, 0.85) == "avoid"


class TestInvestmentScore:
    def test_all_fives(self):
        assert investment_score(5, 5, 5, 5) == pytest.approx(5.0)

    def test_all_tens(self):
        assert investment_score(10, 10, 10, 10) == pytest.approx(10.0)

    def test_all_ones(self):
        assert investment_score(1, 1, 1, 1) == pytest.approx(1.0)

    def test_mixed(self):
        # 0.4*9 + 0.3*7 + 0.2*6 + 0.1*8 = 3.6 + 2.1 + 1.2 + 0.8 = 7.7
        assert investment_score(9, 7, 6, 8) == pytest.approx(7.7)


class TestRentalYield:
    def test_chisinau_centru(self):
        # 500 EUR/month rent, 72500 EUR price
        result = rental_yield_pct(500, 72500)
        assert result == pytest.approx(8.28, abs=0.01)

    def test_bucharest_sector1(self):
        # 900 EUR/month rent, 250000 EUR price
        result = rental_yield_pct(900, 250000)
        assert result == pytest.approx(4.32, abs=0.01)

    def test_balti_high_yield(self):
        # 200 EUR/month rent, 25000 EUR price
        result = rental_yield_pct(200, 25000)
        assert result == pytest.approx(9.6, abs=0.01)


class TestNetYield:
    def test_basic(self):
        # (400 * 12 * 0.8) / 75000 * 100 = 5.12%
        result = net_yield_pct(400, 75000)
        assert result == pytest.approx(5.12, abs=0.01)

    def test_high_cost(self):
        # (900 * 12 * 0.8) / 300000 * 100 = 2.88%
        result = net_yield_pct(900, 300000)
        assert result == pytest.approx(2.88, abs=0.01)

    def test_low_rent(self):
        # (150 * 12 * 0.8) / 30000 * 100 = 4.8%
        result = net_yield_pct(150, 30000)
        assert result == pytest.approx(4.8, abs=0.01)


class TestBreakeven:
    def test_basic(self):
        # 75000 / (400 * 12 * 0.8) = 19.53 years
        result = breakeven_years(75000, 400)
        assert result == pytest.approx(19.53, abs=0.01)

    def test_fast_payback(self):
        # 30000 / (200 * 12 * 0.8) = 15.625 years
        result = breakeven_years(30000, 200)
        assert result == pytest.approx(15.625, abs=0.01)

    def test_slow_payback(self):
        # 300000 / (900 * 12 * 0.8) = 34.72 years
        result = breakeven_years(300000, 900)
        assert result == pytest.approx(34.72, abs=0.01)


class TestFairPrice:
    def test_basic(self):
        assert fair_price_eur(1000, 65) == 65000

    def test_high_value(self):
        assert fair_price_eur(2400, 105) == 252000

    def test_rounding(self):
        # 957.5 * 82 = 78515 → rounds to 78515
        assert fair_price_eur(957.5, 82) == 78515


class TestTotalCost:
    def test_moldova_no_parking(self):
        # 72500 * 1.03 = 74675
        assert total_cost_eur(72500, "moldova") == 74675

    def test_romania_no_parking(self):
        # 250000 * 1.02 = 255000
        assert total_cost_eur(250000, "romania") == 255000

    def test_moldova_with_separate_parking(self):
        # (72500 + 15000) * 1.03 = 87500 * 1.03 = 90125
        assert total_cost_eur(72500, "moldova", parking_separate=True, parking_price=15000) == 90125


# ---------------------------------------------------------------------------
# Price-to-Rent Ratio
# ---------------------------------------------------------------------------

def price_to_rent_ratio(total_cost: float, rental_estimate_monthly: float) -> float:
    """total_cost / (rental_estimate * 12)"""
    return total_cost / (rental_estimate_monthly * 12)


def classify_price_to_rent(ratio: float) -> str:
    if ratio < 10:
        return "excellent_yield"
    if ratio <= 15:
        return "good"
    if ratio <= 20:
        return "fair"
    return "appreciation_only"


class TestPriceToRentRatio:
    def test_excellent_yield(self):
        # 50000 / (500 * 12) = 8.33
        ratio = price_to_rent_ratio(50000, 500)
        assert ratio == pytest.approx(8.33, abs=0.01)
        assert classify_price_to_rent(ratio) == "excellent_yield"

    def test_good(self):
        # 72000 / (500 * 12) = 12.0
        ratio = price_to_rent_ratio(72000, 500)
        assert ratio == pytest.approx(12.0)
        assert classify_price_to_rent(ratio) == "good"

    def test_fair(self):
        # 192000 / (900 * 12) = 17.78
        ratio = price_to_rent_ratio(192000, 900)
        assert ratio == pytest.approx(17.78, abs=0.01)
        assert classify_price_to_rent(ratio) == "fair"

    def test_appreciation_only(self):
        # 300000 / (900 * 12) = 27.78
        ratio = price_to_rent_ratio(300000, 900)
        assert ratio == pytest.approx(27.78, abs=0.01)
        assert classify_price_to_rent(ratio) == "appreciation_only"


# ---------------------------------------------------------------------------
# Confidence Range
# ---------------------------------------------------------------------------

def confidence_range(fair_value: float, confidence: float) -> tuple[int, int]:
    """
    fair_value_low  = round(fair * 0.90) when conf >= 0.75 else round(fair * 0.85)
    fair_value_high = round(fair * 1.10) when conf >= 0.75 else round(fair * 1.15)
    """
    if confidence >= 0.75:
        low = round(fair_value * 0.90)
        high = round(fair_value * 1.10)
    else:
        low = round(fair_value * 0.85)
        high = round(fair_value * 1.15)
    return (low, high)


class TestConfidenceRange:
    def test_high_confidence(self):
        low, high = confidence_range(100000, 0.85)
        assert low == 90000
        assert high == 110000

    def test_low_confidence(self):
        low, high = confidence_range(100000, 0.60)
        assert low == 85000
        assert high == 115000

    def test_boundary_075(self):
        # 0.75 is >= 0.75 → narrow band
        low, high = confidence_range(80000, 0.75)
        assert low == 72000
        assert high == 88000

    def test_very_low_confidence(self):
        low, high = confidence_range(200000, 0.40)
        assert low == 170000
        assert high == 230000


# ---------------------------------------------------------------------------
# Time on Market
# ---------------------------------------------------------------------------

def classify_time_on_market(
    deviation: float,
    liquidity: str,
    condition: str,
) -> str:
    """
    Classify expected time on market (weeks range).
    - priced <= fair value + high liquidity + good/new condition → '2-6 weeks'
    - fair price, average condition → '6-12 weeks'
    - overvalued OR poor liquidity → '12-26 weeks'
    - needs major renovation → '20-40 weeks'
    """
    if condition == "needs_major_renovation":
        return "20-40 weeks"
    if deviation > 15 or liquidity == "low":
        return "12-26 weeks"
    if deviation <= 0 and liquidity == "high" and condition in ("good", "new", "renovated"):
        return "2-6 weeks"
    return "6-12 weeks"


class TestTimeOnMarket:
    def test_fast_sale(self):
        assert classify_time_on_market(-5, "high", "new") == "2-6 weeks"

    def test_average_sale(self):
        assert classify_time_on_market(5, "medium", "average") == "6-12 weeks"

    def test_overvalued_slow(self):
        assert classify_time_on_market(20, "high", "good") == "12-26 weeks"

    def test_major_renovation(self):
        assert classify_time_on_market(-10, "high", "needs_major_renovation") == "20-40 weeks"


# ---------------------------------------------------------------------------
# Renovation Upside
# ---------------------------------------------------------------------------

def renovation_upside(condition: str) -> tuple[int, int] | None:
    """
    needs_renovation → (18, 28) range midpoint 23
    good (cosmetic)  → (6, 12) midpoint 9
    renovated/new    → None
    """
    if condition == "needs_renovation":
        return (18, 28)
    if condition == "good":
        return (6, 12)
    return None


class TestRenovationUpside:
    def test_needs_renovation(self):
        result = renovation_upside("needs_renovation")
        assert result == (18, 28)
        assert (result[0] + result[1]) / 2 == pytest.approx(23.0)

    def test_good_cosmetic(self):
        result = renovation_upside("good")
        assert result == (6, 12)
        assert (result[0] + result[1]) / 2 == pytest.approx(9.0)

    def test_renovated(self):
        assert renovation_upside("renovated") is None

    def test_new(self):
        assert renovation_upside("new") is None


# ---------------------------------------------------------------------------
# Neighborhood Stage
# ---------------------------------------------------------------------------

def classify_neighborhood_stage(
    new_construction: bool,
    price_trend: str,
    infrastructure_investment: bool,
    vacancy_rate: str,
) -> str:
    """
    Classify neighborhood into a lifecycle stage:
    - early_growth: new construction + rising prices + infrastructure investment
    - maturing: rising prices + low vacancy, but limited new construction
    - established: stable prices + low vacancy
    - declining: falling prices OR high vacancy
    """
    if price_trend == "falling" or vacancy_rate == "high":
        return "declining"
    if new_construction and price_trend == "rising" and infrastructure_investment:
        return "early_growth"
    if price_trend == "rising" and vacancy_rate == "low":
        return "maturing"
    return "established"


class TestNeighborhoodStage:
    def test_early_growth(self):
        assert classify_neighborhood_stage(
            new_construction=True, price_trend="rising",
            infrastructure_investment=True, vacancy_rate="low",
        ) == "early_growth"

    def test_maturing(self):
        assert classify_neighborhood_stage(
            new_construction=False, price_trend="rising",
            infrastructure_investment=False, vacancy_rate="low",
        ) == "maturing"

    def test_established(self):
        assert classify_neighborhood_stage(
            new_construction=False, price_trend="stable",
            infrastructure_investment=False, vacancy_rate="low",
        ) == "established"

    def test_declining(self):
        assert classify_neighborhood_stage(
            new_construction=True, price_trend="falling",
            infrastructure_investment=True, vacancy_rate="low",
        ) == "declining"


# ---------------------------------------------------------------------------
# Edge-case standalone tests
# ---------------------------------------------------------------------------

def test_breakeven_zero_rent():
    """Breakeven with zero rent should handle division by zero gracefully."""
    with pytest.raises(ZeroDivisionError):
        breakeven_years(75000, 0)


def test_total_cost_romania_with_parking():
    """(250000 + 15000) * 1.02 = 270300"""
    assert total_cost_eur(250000, "romania", parking_separate=True, parking_price=15000) == 270300
