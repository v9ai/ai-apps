import os
import pytest

_HAS_API_KEY = bool(os.getenv("DEEPSEEK_API_KEY"))

# Stub metric names so GOLDEN_CASES can reference them at import time.
# Tests are skipped when the key is missing.
reasoning_quality = verdict_accuracy = factor_specificity = None
comparable_grounding = score_consistency = rental_yield_accuracy = None
negotiation_margin_reasonableness = recommendation_consistency = None
confidence_interval_consistency = price_to_rent_accuracy = None
time_on_market_realism = renovation_upside_realism = neighborhood_stage_accuracy = None

if _HAS_API_KEY:
    from deepeval import assert_test
    from deepeval.test_case import LLMTestCase, LLMTestCaseParams
    from deepeval.metrics import GEval

    # Import shared metrics and judge from centralized _judge.py
    from eval._judge import (
        judge,
        reasoning_quality,
        verdict_accuracy,
        factor_specificity,
        comparable_grounding,
        score_consistency,
        rental_yield_accuracy,
        negotiation_margin_reasonableness,
        recommendation_consistency,
    )

    confidence_interval_consistency = GEval(
        name="ConfidenceIntervalConsistency",
        criteria="""Evaluate whether the ACTUAL_OUTPUT fair value confidence interval is correctly computed:
1. fair_value_low_eur_per_m2 must equal round(fair_value_eur_per_m2 * 0.90) when confidence >= 0.75
   OR round(fair_value_eur_per_m2 * 0.85) when confidence < 0.75
2. fair_value_high_eur_per_m2 must equal round(fair_value_eur_per_m2 * 1.10) when confidence >= 0.75
   OR round(fair_value_eur_per_m2 * 1.15) when confidence < 0.75
3. Both fields must be non-null whenever fair_value_eur_per_m2 is provided
4. When COMPARABLE MARKET DATA is present, the interval should narrow to approximately ±8% (±0.92 to 1.08)
Score 0.0 if either bound is missing or more than 5% off the formula result.""",
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        model=judge,
        threshold=0.7,
    )

    price_to_rent_accuracy = GEval(
        name="PriceToRentAccuracy",
        criteria="""Evaluate whether the ACTUAL_OUTPUT price_to_rent_ratio is correctly computed:
1. price_to_rent_ratio = total_cost_eur / (rental_estimate_eur * 12) within ±0.5
2. The ratio must be positive (both total_cost_eur and rental_estimate_eur should be > 0)
3. Typical residential range is 10–40x; score low if outside this range without explanation
4. The ratio should be consistent with the investment outlook (low ratio = high yield = stronger buy case)
Score 0.0 if the formula is wrong by more than 1x.""",
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        model=judge,
        threshold=0.7,
    )

    time_on_market_realism = GEval(
        name="TimeOnMarketRealism",
        criteria="""Evaluate whether the ACTUAL_OUTPUT time_on_market_weeks is realistic:
1. For Moldova/Chisinau 2025: market stagnation, base cycle is 12-16 weeks. Even central well-priced stock rarely sells in < 8 weeks.
2. For Romania: faster market — Bucharest/Cluj good stock 4-10 weeks; overvalued 16-30 weeks.
3. time_on_market_weeks must correlate with: overvalued→higher, undervalued→lower, poor condition→higher
4. For overvalued listings (deviation > +15%): should be ≥ 22 weeks in Moldova, ≥ 12 weeks in Romania
5. For needs_renovation condition: should be ≥ 20 weeks
Score low if time_on_market seems unrealistically fast for current market conditions.""",
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        model=judge,
        threshold=0.65,
    )

    renovation_upside_realism = GEval(
        name="RenovationUpsideRealism",
        criteria="""Evaluate whether the ACTUAL_OUTPUT renovation_upside_pct is realistic:
1. For needs_renovation condition: upside should be 20-30% (cost to bring to euro-renovated standard)
2. For good condition (cosmetic): upside should be 8-14%
3. For renovated/new condition: upside should be null (already at standard)
4. The upside must account for renovation cost vs. value gain — not just market differential
5. Extreme values (>40% or <5% for needs_renovation) should be explained
Score 0.0 if a renovated/new property has non-null upside, or if needs_renovation has null upside.""",
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        model=judge,
        threshold=0.65,
    )

    neighborhood_stage_accuracy = GEval(
        name="NeighborhoodStageAccuracy",
        criteria="""Evaluate whether the ACTUAL_OUTPUT neighborhood_stage is correctly assigned:
1. Chisinau Centru → "established" (stable 0-2%/yr in 2025 stagnation)
2. Chisinau Aeroport new developments → "early_growth" (infrastructure investment, 3-6%/yr)
3. Chisinau Riscani/Ciocana/Buiucani → "maturing" (2-4%/yr)
4. Chisinau industrial periphery / old Soviet panel outskirts → "declining"
5. Bucharest Sector 1-2 / Cluj center → "established"
6. The stage must be consistent with price_trend and appreciation_pct_1y in the output
Score 0.0 if the stage contradicts the known zone classification, or if appreciation_pct_1y is inconsistent with the stage.""",
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        model=judge,
        threshold=0.7,
    )

    recommendation_consistency = GEval(
        name="RecommendationConsistency",
        criteria="""The ACTUAL_OUTPUT contains a valuation with verdict, confidence, price_deviation_pct,
recommendation, risk_factors, and opportunity_factors.

Verify consistency per these rules:
1. Recommendation must match verdict/confidence:
   - strong_buy: deviation < -20% AND confidence >= 0.75
   - buy: deviation < -5% OR (fair AND strong fundamentals)
   - hold: fair price, neutral fundamentals
   - avoid: overvalued OR major risks
2. risk_factors must be non-empty for hold/avoid recommendations
3. opportunity_factors must be non-empty for strong_buy/buy recommendations
4. The recommendation must not contradict the verdict (e.g. strong_buy + overvalued is invalid)

Score 1.0 if all rules hold, 0.0 if recommendation contradicts verdict.""",
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        model=judge,
        threshold=0.7,
    )

GOLDEN_CASES = [
    # --- Original 4 cases ---
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 45000 EUR, "
            "Size: 80 m², Price per m²: 562 EUR/m², Rooms: 3, "
            "Floor: 5/9, Condition: good"
        ),
        "actual_output": (
            "At 562 EUR/m² in Chisinau Centru, this apartment is 60% below the zone's "
            "market rate of 1100-1400 EUR/m². A 3-room 80m² apartment in good condition "
            "in the center would typically sell for 88,000-112,000 EUR. "
            "Verdict: undervalued (confidence: 0.92)."
        ),
        "expected_output": "undervalued",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 75000 EUR, "
            "Size: 80 m², Price per m²: 937 EUR/m², Rooms: 3, "
            "Floor: 8/9, Condition: renovated"
        ),
        "actual_output": (
            "At 937 EUR/m² in Botanica, this is at the upper end of the 800-1000 EUR/m² range. "
            "The renovated condition and high floor justify a slight premium. "
            "The listing is within fair market value. Verdict: fair (confidence: 0.75)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    {
        "input": (
            "City: Bucharest, Zone: Sector 1, Price: 350000 EUR, "
            "Size: 100 m², Price per m²: 3500 EUR/m², Rooms: 4, "
            "Floor: 3/10, Condition: new"
        ),
        "actual_output": (
            "At 3500 EUR/m² in Bucharest Sector 1, this exceeds the typical 2000-2500 EUR/m² range "
            "by 40%. Even for new construction, this is above market. "
            "Similar new apartments in the area sell at 2200-2600 EUR/m². "
            "Verdict: overvalued (confidence: 0.82)."
        ),
        "expected_output": "overvalued",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    {
        "input": (
            "City: Cluj-Napoca, Zone: Centru, Price: 180000 EUR, "
            "Size: 85 m², Price per m²: 2117 EUR/m², Rooms: 3, "
            "Floor: 2/4, Condition: good"
        ),
        "actual_output": (
            "At 2117 EUR/m² in Cluj-Napoca center, this falls within the 2000-2400 EUR/m² range. "
            "The good condition and central location support this price. "
            "Verdict: fair (confidence: 0.80)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # --- New cases ---
    # Ground floor + needs_renovation discount: should still be overvalued if price is high
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 130000 EUR, "
            "Size: 90 m², Price per m²: 1444 EUR/m², Rooms: 4, "
            "Floor: 1/9, Condition: needs_renovation"
        ),
        "actual_output": (
            "At 1444 EUR/m² in Chisinau Centru the benchmark is 1100-1400 EUR/m². "
            "However, the ground floor and need for renovation each justify a discount — "
            "typically 10-15% each. Adjusted fair value is approximately 850-1000 EUR/m², "
            "making this listing 40-70% above what it should fetch. "
            "Verdict: overvalued (confidence: 0.85)."
        ),
        "expected_output": "overvalued",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # Boundary case: exactly at +14% — should be fair, not overvalued
    {
        "input": (
            "City: Chisinau, Zone: Buiucani, Price: 98000 EUR, "
            "Size: 90 m², Price per m²: 1088 EUR/m², Rooms: 3, "
            "Floor: 4/9, Condition: renovated"
        ),
        "actual_output": (
            "At 1088 EUR/m² in Buiucani, the market range is 900-1100 EUR/m² (midpoint 1000). "
            "This sits 9% above the midpoint, within the ±15% fair threshold. "
            "The renovated condition justifies the premium position in the range. "
            "Verdict: fair (confidence: 0.72)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy],
    },
    # Boundary case: exactly at -16% — should flip to undervalued
    {
        "input": (
            "City: Chisinau, Zone: Riscani, Price: 58000 EUR, "
            "Size: 75 m², Price per m²: 773 EUR/m², Rooms: 3, "
            "Floor: 3/5, Condition: good"
        ),
        "actual_output": (
            "At 773 EUR/m² in Riscani, the benchmark is 900-1200 EUR/m² (midpoint 1050). "
            "This is 26% below the midpoint, well past the -15% undervalued threshold. "
            "A comparable good-condition apartment in Riscani should fetch 900-1050 EUR/m². "
            "Verdict: undervalued (confidence: 0.78)."
        ),
        "expected_output": "undervalued",
        "metrics": [reasoning_quality, verdict_accuracy],
    },
    # Moldova non-Chisinau city (Balti)
    {
        "input": (
            "City: Balti, Zone: Centru, Price: 35000 EUR, "
            "Size: 65 m², Price per m²: 538 EUR/m², Rooms: 2, "
            "Floor: 3/5, Condition: good"
        ),
        "actual_output": (
            "At 538 EUR/m² in Balti, this falls within the 400-700 EUR/m² range for "
            "Moldovan cities outside Chisinau. The central zone and good condition place it "
            "in the upper-middle segment, which is consistent with 538 EUR/m². "
            "Verdict: fair (confidence: 0.70)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy],
    },
    # Romania — Iasi center, slightly undervalued
    {
        "input": (
            "City: Iasi, Zone: Centru, Price: 72000 EUR, "
            "Size: 68 m², Price per m²: 1058 EUR/m², Rooms: 2, "
            "Floor: 1/4, Condition: good"
        ),
        "actual_output": (
            "At 1058 EUR/m² in Iasi Centru, the benchmark is 1100-1400 EUR/m² (midpoint 1250). "
            "This is 15% below the midpoint. The ground floor carries a -10 to -15% hedonic "
            "penalty, adjusting fair value to ~1060-1125 EUR/m². At 1058 EUR/m² this sits at "
            "the adjusted floor. Verdict: undervalued (confidence: 0.74)."
        ),
        "expected_output": "undervalued",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # Comparables-grounded case: reasoning should cite the comparable data
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 68000 EUR, "
            "Size: 72 m², Price per m²: 944 EUR/m², Rooms: 2, "
            "Floor: 6/9, Condition: renovated\n\n"
            "Comparable listings in zone (live data):\n"
            "- 2-room, 70 m², renovated: 980 EUR/m²\n"
            "- 2-room, 68 m², good: 870 EUR/m²\n"
            "- 2-room, 75 m², renovated: 960 EUR/m²\n"
            "Zone avg: 937 EUR/m², range: 870-980 EUR/m²"
        ),
        "actual_output": (
            "The three comparable 2-room apartments in Botanica show a range of 870-980 EUR/m² "
            "with an average of 937 EUR/m². This listing at 944 EUR/m² sits exactly at the zone "
            "average. The renovated condition and mid-high floor are already priced in. "
            "Verdict: fair (confidence: 0.88)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, comparable_grounding],
    },
    # High-value Bucharest new build — overvalued even for new construction
    {
        "input": (
            "City: Bucharest, Zone: Sector 2, Price: 290000 EUR, "
            "Size: 95 m², Price per m²: 3052 EUR/m², Rooms: 3, "
            "Floor: 10/12, Condition: new"
        ),
        "actual_output": (
            "At 3052 EUR/m² in Bucharest Sector 2, the benchmark is 1400-1800 EUR/m². "
            "Even accounting for new construction (15-20% premium) the adjusted ceiling is "
            "~2160 EUR/m², leaving this listing 41% above market. Top-floor views add value "
            "but cannot bridge this gap. Verdict: overvalued (confidence: 0.87)."
        ),
        "expected_output": "overvalued",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # --- Real listing: 999.md/ro/103528157 ---
    # 1-room 51m² Aeroport zone, variantă albă (new/unfinished), Exfactor-grup developer.
    # Aeroport is a peripheral Chisinau district; benchmark ~600-800 EUR/m².
    # New construction allows +20-30% premium → ceiling ~1040 EUR/m².
    # At 1421 EUR/m² this is ~37% above the new-construction ceiling → overvalued.
    {
        "input": (
            "City: Chisinau, Zone: Aeroport, Price: 72500 EUR, "
            "Size: 51 m², Price per m²: 1421 EUR/m², Rooms: 1, "
            "Floor: 3/10, Condition: new, "
            "Features: panoramic windows, underground parking, brick new-build (Exfactor-grup)"
        ),
        "actual_output": (
            "At 1421 EUR/m² in Chisinau's Aeroport district, the market benchmark for this "
            "peripheral zone is 600-800 EUR/m². New construction by a reputable developer "
            "(Exfactor-grup) justifies a 20-30% premium, raising the fair ceiling to "
            "~960-1040 EUR/m². Panoramic windows and underground parking add value but "
            "do not bridge the remaining 37-48% gap. The asking price of 1421 EUR/m² is "
            "anchored closer to Chisinau Centru rates, which is not warranted for Aeroport. "
            "Verdict: overvalued (confidence: 0.83)."
        ),
        "expected_output": "overvalued",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # Same listing with live comparables injected — reasoning must cite them.
    # Comparables scraped from 999.md search for 1-room, Chisinau, sale.
    {
        "input": (
            "City: Chisinau, Zone: Aeroport, Price: 72500 EUR, "
            "Size: 51 m², Price per m²: 1421 EUR/m², Rooms: 1, "
            "Floor: 3/10, Condition: new\n\n"
            "Comparable listings in zone (live data from 999.md):\n"
            "- 1-room, 48 m², new: 980 EUR/m² (str. Dacia)\n"
            "- 1-room, 52 m², new: 1050 EUR/m² (Aeroport)\n"
            "- 1-room, 45 m², good: 870 EUR/m² (Aeroport)\n"
            "Zone avg: 967 EUR/m², range: 870-1050 EUR/m²"
        ),
        "actual_output": (
            "Live comparables for 1-room new-builds in Aeroport show a range of 870-1050 EUR/m² "
            "with a zone average of 967 EUR/m². This listing asks 1421 EUR/m² — 47% above the "
            "zone average and 35% above the highest comparable. Exfactor-grup and panoramic "
            "windows carry a premium, but comparable new-builds on the same street (str. Dacia) "
            "transact at 980 EUR/m², confirming the overpricing. "
            "Verdict: overvalued (confidence: 0.91)."
        ),
        "expected_output": "overvalued",
        "metrics": [reasoning_quality, verdict_accuracy, comparable_grounding, factor_specificity],
    },
    # --- Enhanced metrics cases ---
    # Case 14: Score breakdown consistency — undervalued price but secondary location
    {
        "input": (
            "City: Chisinau, Zone: Ciocana, Price: 38000 EUR, "
            "Size: 55 m², Price per m²: 690 EUR/m², Rooms: 2, "
            "Floor: 4/9, Condition: good"
        ),
        "actual_output": (
            "At 690 EUR/m² in Ciocana, the benchmark is 900-1200 EUR/m². "
            "This is 34% below the midpoint of 1050 EUR/m², well into undervalued territory. "
            "Score breakdown: price_score=9, location_score=5, condition_score=6, market_score=6. "
            "investment_score = 0.4*9 + 0.3*5 + 0.2*6 + 0.1*6 = 6.9. "
            "The strong price discount drives the high investment score despite the secondary location. "
            "Verdict: undervalued (confidence: 0.80)."
        ),
        "expected_output": "undervalued",
        "metrics": [verdict_accuracy, score_consistency],
    },
    # Case 15: Rental yield validation — Centru 2br at fair price
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 85000 EUR, "
            "Size: 65 m², Price per m²: 1307 EUR/m², Rooms: 2, "
            "Floor: 5/9, Condition: renovated"
        ),
        "actual_output": (
            "At 1307 EUR/m² in Chisinau Centru, this falls within the 1100-1400 EUR/m² range. "
            "Renovated condition justifies the upper-range positioning. "
            "rental_estimate_eur=600 EUR/month (Centru 2br reference: 500-700). "
            "rental_yield_pct = (600*12/85000)*100 = 8.5%. "
            "breakeven_years = 87550 / (600*12*0.75) = 16.2 years. "
            "net_yield_pct = (600*12*0.75) / 87550 * 100 = 6.2%. "
            "Verdict: fair (confidence: 0.82)."
        ),
        "expected_output": "fair",
        "metrics": [verdict_accuracy, rental_yield_accuracy],
    },
    # Case 16: Negotiation margin — overvalued listing (+25% deviation)
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 95000 EUR, "
            "Size: 70 m², Price per m²: 1357 EUR/m², Rooms: 3, "
            "Floor: 2/5, Condition: good"
        ),
        "actual_output": (
            "At 1357 EUR/m² in Botanica, the benchmark is 900-1200 EUR/m² (midpoint ~1050). "
            "This is 29% above midpoint. Good condition at floor 2 is baseline — no premium justified. "
            "negotiation_margin_pct = -15.0% (overvalued listings warrant aggressive negotiation). "
            "Fair value would be ~73,500 EUR. Buyer should target 80,750 EUR (-15% from asking). "
            "Verdict: overvalued (confidence: 0.79)."
        ),
        "expected_output": "overvalued",
        "metrics": [verdict_accuracy, negotiation_margin_reasonableness],
    },
    # Case 17: Total cost calculation — separate parking + fees
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 90000 EUR, "
            "Size: 75 m², Price per m²: 1200 EUR/m², Rooms: 2, "
            "Floor: 6/10, Condition: new\n"
            "Parking: SEPARATE purchase — costs €12,000 separately"
        ),
        "actual_output": (
            "At 1200 EUR/m² in Chisinau Centru, this is within the 1100-1400 EUR/m² range. "
            "New condition and mid-high floor justify the price. "
            "total_cost_eur = 90000 (apt) + 12000 (parking) + 3060 (3% fees on 102000) = 105,060 EUR. "
            "The separate parking adds significant acquisition cost. "
            "rental_estimate_eur=580, rental_yield_pct = (580*12/90000)*100 = 7.7%. "
            "Verdict: fair (confidence: 0.80)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy],
    },
    # Case 18: Liquidity and trend assessment — new build in growth zone
    {
        "input": (
            "City: Chisinau, Zone: Aeroport, Price: 55000 EUR, "
            "Size: 48 m², Price per m²: 1145 EUR/m², Rooms: 1, "
            "Floor: 7/12, Condition: new, "
            "Features: brick new-build, balcony, elevator"
        ),
        "actual_output": (
            "At 1145 EUR/m² in Aeroport, the benchmark is 900-1200 EUR/m². "
            "New brick construction on a high floor with elevator is well-positioned. "
            "liquidity=medium (new stock in growth zone, 1br in demand). "
            "price_trend=rising (Aeroport is an early_growth neighborhood with active development). "
            "appreciation_pct_1y=5-7% expected given new infrastructure and development pipeline. "
            "Verdict: fair (confidence: 0.77)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # --- Hedonic adjustment cases ---
    # Case 19: Ground floor discount — same specs as case 2 but ground floor
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 75000 EUR, "
            "Size: 80 m², Price per m²: 937 EUR/m², Rooms: 3, "
            "Floor: 1/9, Condition: renovated"
        ),
        "actual_output": (
            "At 937 EUR/m² in Botanica, the benchmark is 900-1200 EUR/m². "
            "However, the ground floor carries a hedonic penalty of -10 to -15% per research-backed "
            "adjustment factors. Adjusted fair value for a ground-floor unit: ~765-900 EUR/m². "
            "At 937 EUR/m² this sits at or above the adjusted ceiling. The renovated condition "
            "partially offsets the floor discount, but not fully. "
            "Verdict: fair (confidence: 0.72). "
            "Note: the same apartment on floors 2-3 would be clearly within range; ground floor "
            "reduces both resale value and rental demand."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # Case 20: Soviet bloc panel vs new brick — panel should get -5 to -8% vs brick
    {
        "input": (
            "City: Chisinau, Zone: Riscani, Price: 52000 EUR, "
            "Size: 60 m², Price per m²: 866 EUR/m², Rooms: 2, "
            "Floor: 4/5, Condition: good, "
            "Features: Soviet-era panel block, built 1975"
        ),
        "actual_output": (
            "At 866 EUR/m² in Riscani, the benchmark is 900-1200 EUR/m². "
            "Hedonic adjustments: Soviet-era panel block (-10 to -15% for building age, "
            "-5 to -8% for panel material). Combined adjustment: -15 to -23%. "
            "Adjusted fair value: ~693-850 EUR/m². At 866 EUR/m² this sits at or slightly "
            "above the adjusted range. The good condition prevents further discount. "
            "A comparable new brick building in Riscani would justify 950-1050 EUR/m². "
            "Verdict: fair (confidence: 0.73)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # Case 21: Temporal comparable decay — stale comparables should be noted
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 70000 EUR, "
            "Size: 65 m², Price per m²: 1076 EUR/m², Rooms: 2, "
            "Floor: 3/9, Condition: good\n\n"
            "Comparable listings in zone (live data):\n"
            "- 2-room, 63 m², good: 950 EUR/m² (listed 8 months ago)\n"
            "- 2-room, 70 m², renovated: 1020 EUR/m² (listed 7 months ago)\n"
            "- 2-room, 60 m², good: 900 EUR/m² (listed 9 months ago)\n"
            "Zone avg: 957 EUR/m², range: 900-1020 EUR/m²"
        ),
        "actual_output": (
            "The three comparables show a zone average of 957 EUR/m², but all were listed 7-9 months ago. "
            "Temporal decay reduces their reliability — in a rising market, current fair values are likely "
            "3-5% higher than these stale data points, suggesting an adjusted range of 927-1071 EUR/m². "
            "At 1076 EUR/m² this listing sits at the top of the adjusted range. "
            "The comparables are directionally useful but should be weighted less due to age. "
            "Verdict: fair (confidence: 0.68)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, comparable_grounding],
    },
    # --- Recommendation consistency cases (agent-47, agent-49) ---
    # Case 22: strong_buy — deep undervalue with high confidence
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 52000 EUR, "
            "Size: 70 m², Price per m²: 742 EUR/m², Rooms: 2, "
            "Floor: 5/9, Condition: renovated"
        ),
        "actual_output": (
            "At 742 EUR/m² in Chisinau Centru, the benchmark is 1100-1400 EUR/m² (midpoint 1250). "
            "Price deviation: -41% below midpoint of 1250 EUR/m². "
            "Confidence: 0.80. Recommendation: strong_buy. "
            "opportunity_factors: ['41% below fair value', 'central premium location', "
            "'renovated condition']. risk_factors: []. "
            "Verdict: undervalued (confidence: 0.80)."
        ),
        "expected_output": "undervalued, recommendation=strong_buy",
        "metrics": [verdict_accuracy, recommendation_consistency],
    },
    # Case 23: buy — moderate undervalue
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 62000 EUR, "
            "Size: 72 m², Price per m²: 861 EUR/m², Rooms: 2, "
            "Floor: 4/9, Condition: good"
        ),
        "actual_output": (
            "At 861 EUR/m² in Botanica, the benchmark is 900-1200 EUR/m² (midpoint 1050). "
            "Price deviation: -18% below midpoint. "
            "Confidence: 0.75. Recommendation: buy. "
            "opportunity_factors: ['slight discount to market', 'solid Botanica location']. "
            "risk_factors: []. "
            "Verdict: undervalued (confidence: 0.75)."
        ),
        "expected_output": "undervalued, recommendation=buy",
        "metrics": [verdict_accuracy, recommendation_consistency],
    },
    # Case 24: hold — fair price, neutral outlook
    {
        "input": (
            "City: Chisinau, Zone: Buiucani, Price: 65000 EUR, "
            "Size: 65 m², Price per m²: 1000 EUR/m², Rooms: 2, "
            "Floor: 3/5, Condition: good"
        ),
        "actual_output": (
            "At 1000 EUR/m² in Buiucani, the benchmark is 900-1100 EUR/m² (midpoint 1000). "
            "Price deviation: 0% — exactly at midpoint. "
            "Confidence: 0.76. Recommendation: hold. "
            "risk_factors: ['Soviet-era block', 'limited upside']. "
            "opportunity_factors: []. "
            "Verdict: fair (confidence: 0.76)."
        ),
        "expected_output": "fair, recommendation=hold",
        "metrics": [verdict_accuracy, recommendation_consistency],
    },
    # Case 25: avoid — overvalued with major risks
    {
        "input": (
            "City: Bucharest, Zone: Sector 2, Price: 280000 EUR, "
            "Size: 90 m², Price per m²: 3111 EUR/m², Rooms: 3, "
            "Floor: 1/12, Condition: good"
        ),
        "actual_output": (
            "At 3111 EUR/m² in Bucharest Sector 2, the benchmark is 1400-1800 EUR/m² (midpoint 1600). "
            "Price deviation: +94% above fair value of 1600 EUR/m². "
            "Confidence: 0.84. Recommendation: avoid. "
            "risk_factors: ['ground floor', '94% overpriced', 'low resale potential']. "
            "opportunity_factors: []. "
            "Verdict: overvalued (confidence: 0.84)."
        ),
        "expected_output": "overvalued, recommendation=avoid",
        "metrics": [verdict_accuracy, recommendation_consistency],
    },
    # --- Scenario coverage cases ---
    # Case 26: Neighborhood stage — early_growth Aeroport
    {
        "input": (
            "City: Chisinau, Zone: Aeroport, Price: 60000 EUR, "
            "Size: 48 m², Price per m²: 1250 EUR/m², Rooms: 1, "
            "Floor: 4/12, Condition: new"
        ),
        "actual_output": (
            "At 1250 EUR/m² in Chisinau's Aeroport district, this is an early_growth zone with "
            "active development pipeline. New infrastructure investment driving appreciation is the "
            "key factor here. The benchmark for Aeroport is 900-1200 EUR/m², and new construction "
            "in a growth zone commands a premium. At 1250 EUR/m² this sits slightly above the range "
            "ceiling but the early_growth trajectory and new condition justify the positioning. "
            "Verdict: fair (confidence: 0.74)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # Case 27: Renovation upside — needs_renovation Riscani
    {
        "input": (
            "City: Chisinau, Zone: Riscani, Price: 42000 EUR, "
            "Size: 65 m², Price per m²: 646 EUR/m², Rooms: 2, "
            "Floor: 3/5, Condition: needs_renovation"
        ),
        "actual_output": (
            "At 646 EUR/m² in Riscani, the benchmark is 900-1200 EUR/m². "
            "Renovating to euro standard would increase value by 22-28%, from ~646 to "
            "~790-825 EUR/m². Even in current condition, comparable unrenovated 2-room apartments "
            "in Riscani fetch 700-850 EUR/m², placing this 10-24% below peers. "
            "Post-renovation, the unit would be worth approximately 51,350-53,625 EUR, yielding "
            "a net gain after ~8,000-10,000 EUR renovation cost. "
            "Verdict: undervalued (confidence: 0.76)."
        ),
        "expected_output": "undervalued",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # Case 28: Time on market — overvalued slow seller
    {
        "input": (
            "City: Bucharest, Zone: Sector 3, Price: 220000 EUR, "
            "Size: 85 m², Price per m²: 2588 EUR/m², Rooms: 3, "
            "Floor: 2/8, Condition: good"
        ),
        "actual_output": (
            "At 2588 EUR/m² in Bucharest Sector 3, the benchmark is 1400-1800 EUR/m². "
            "At 2588 EUR/m², 44% above the 1400-1800 benchmark, this listing would sit on "
            "market for 16-24 weeks without a significant price reduction. "
            "Good condition at floor 2 provides no premium to bridge this gap. "
            "The overpricing is severe enough to deter serious buyers in this zone. "
            "Verdict: overvalued (confidence: 0.81)."
        ),
        "expected_output": "overvalued",
        "metrics": [reasoning_quality, verdict_accuracy],
    },
    # Case 29: High-confidence with comparables — tight range
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 72000 EUR, "
            "Size: 68 m², Price per m²: 1058 EUR/m², Rooms: 2, "
            "Floor: 5/9, Condition: renovated\n\n"
            "Comparable listings in zone (live data):\n"
            "- 2-room, 66 m², renovated: 1040 EUR/m²\n"
            "- 2-room, 70 m², renovated: 1020 EUR/m²\n"
            "- 2-room, 65 m², renovated: 960 EUR/m²\n"
            "- 2-room, 72 m², renovated: 1080 EUR/m²\n"
            "Zone avg: 1025 EUR/m², range: 960-1080 EUR/m²"
        ),
        "actual_output": (
            "With 4 consistent comparables (CV < 5%), confidence is high at 0.87. "
            "The comparables show a tight range of 960-1080 EUR/m² with an average of 1025 EUR/m². "
            "Fair value range: 923-1128 EUR/m² (±10%). At 1058 EUR/m² this listing sits comfortably "
            "within the fair value envelope, just 3.2% above the comparable average. "
            "The renovated condition and mid-high floor are consistent with the upper comparables. "
            "Verdict: fair (confidence: 0.87)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, comparable_grounding],
    },
    # Case 30: Multi-factor premium stack — top floor + new + parking + central
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 145000 EUR, "
            "Size: 85 m², Price per m²: 1706 EUR/m², Rooms: 3, "
            "Floor: 10/10, Condition: new, "
            "Features: underground parking included, panoramic view, elevator"
        ),
        "actual_output": (
            "At 1706 EUR/m² in Chisinau Centru, the base benchmark is 1100-1400 EUR/m². "
            "New construction (+20%), top floor panoramic view (+8-12%), included underground "
            "parking (€12,000 value embedded), and Centru location push the adjusted fair ceiling "
            "to ~1700-1800 EUR/m². At 1706 EUR/m², this is fairly priced given the premium stack. "
            "Each premium factor is individually justified and their cumulative effect places the "
            "listing at the lower bound of the adjusted range. "
            "Verdict: fair (confidence: 0.82)."
        ),
        "expected_output": "fair",
        "metrics": [reasoning_quality, verdict_accuracy, factor_specificity],
    },
    # --- Untested field coverage (agent-eval-gaps Phase 1) ---
    # Case 31: Confidence interval bounds — high confidence with comparables (narrow ±8%)
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 105000 EUR, "
            "Size: 75 m², Price per m²: 1400 EUR/m², Rooms: 2, "
            "Floor: 6/9, Condition: renovated\n\n"
            "Comparable listings in zone (live data, reliability: high):\n"
            "- 2-room, 72 m², renovated: 1380 EUR/m²\n"
            "- 2-room, 78 m², renovated: 1420 EUR/m²\n"
            "- 2-room, 70 m², renovated: 1350 EUR/m²\n"
            "Zone avg: 1383 EUR/m², range: 1350-1420 EUR/m²"
        ),
        "actual_output": (
            "With 3 consistent comparables (range 1350-1420 EUR/m²), confidence is 0.87. "
            "Fair value: 1383 EUR/m² (comp median). "
            "Confidence interval (±8%, comps present): "
            "fair_value_low_eur_per_m2=1272, fair_value_high_eur_per_m2=1493. "
            "At 1400 EUR/m², this listing is 1.2% above the comp median — well within the fair range. "
            "Verdict: fair (confidence: 0.87)."
        ),
        "expected_output": "fair, confidence_interval: low=1272, high=1493",
        "metrics": [verdict_accuracy, confidence_interval_consistency],
    },
    # Case 32: Price-to-rent ratio — Centru 2br, high yield scenario
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 68000 EUR, "
            "Size: 60 m², Price per m²: 1133 EUR/m², Rooms: 2, "
            "Floor: 4/9, Condition: good"
        ),
        "actual_output": (
            "At 1133 EUR/m² in Chisinau Centru, this is 20-30% below the 1500-2000 EUR/m² benchmark. "
            "rental_estimate_eur=650 EUR/month (Centru 2br reference: 625-875). "
            "total_cost_eur = 68000 * 1.03 = 70040 EUR. "
            "price_to_rent_ratio = 70040 / (650 * 12) = 8.98 — excellent buy-to-let ratio (<10). "
            "net_yield_pct = (650 * 12 * 0.75) / 70040 * 100 = 8.4%. "
            "breakeven_years = 70040 / (650 * 12 * 0.75) = 12.0 years. "
            "Verdict: undervalued (confidence: 0.80)."
        ),
        "expected_output": "undervalued, price_to_rent_ratio<10",
        "metrics": [verdict_accuracy, price_to_rent_accuracy, rental_yield_accuracy],
    },
    # Case 33: Time on market — Chisinau 2025 stagnation, overvalued listing
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 130000 EUR, "
            "Size: 80 m², Price per m²: 1625 EUR/m², Rooms: 3, "
            "Floor: 3/9, Condition: good"
        ),
        "actual_output": (
            "At 1625 EUR/m² in Botanica, the 2025 benchmark is 1100-1600 EUR/m². "
            "This is 5-48% above the range. In the 2025 Chisinau market (volume -54% YoY, "
            "base sale cycle 12-16 weeks), an overpriced listing in a secondary zone "
            "would take 30-45 weeks to sell without a price reduction. "
            "time_on_market_weeks=36 (overvalued + 2025 stagnation market). "
            "liquidity=low. price_trend=stable. "
            "Verdict: overvalued (confidence: 0.76)."
        ),
        "expected_output": "overvalued, time_on_market_weeks>=22",
        "metrics": [verdict_accuracy, time_on_market_realism],
    },
    # Case 34: Renovation upside + neighborhood stage — needs_renovation in maturing zone
    {
        "input": (
            "City: Chisinau, Zone: Riscani, Price: 40000 EUR, "
            "Size: 58 m², Price per m²: 689 EUR/m², Rooms: 2, "
            "Floor: 3/5, Condition: needs_renovation"
        ),
        "actual_output": (
            "At 689 EUR/m² in Riscani, the benchmark is 1100-1600 EUR/m². "
            "This is 57% below the zone midpoint. Bringing this Soviet-era unit to "
            "euro-renovated standard would cost ~8,000-10,000 EUR and add 22-27% to value "
            "— renovation_upside_pct=25. Post-reno value: ~50,000-54,000 EUR. "
            "neighborhood_stage=maturing (Riscani improving, +2-3%/yr). "
            "appreciation_pct_1y=3.0 (maturing zone, 2025). "
            "Verdict: undervalued (confidence: 0.78)."
        ),
        "expected_output": "undervalued, renovation_upside=20-30%, neighborhood_stage=maturing",
        "metrics": [verdict_accuracy, renovation_upside_realism, neighborhood_stage_accuracy],
    },
    # Case 35: Neighborhood stage — Aeroport early_growth vs Centru established
    {
        "input": (
            "City: Chisinau, Zone: Aeroport, Price: 75000 EUR, "
            "Size: 52 m², Price per m²: 1442 EUR/m², Rooms: 1, "
            "Floor: 5/12, Condition: new, "
            "Features: new brick build, panoramic windows, underground parking"
        ),
        "actual_output": (
            "At 1442 EUR/m² in Aeroport, this exceeds the 1100-1600 EUR/m² zone range. "
            "Despite new construction and amenities, Aeroport is an early_growth zone "
            "(infrastructure investment, 3-6%/yr appreciation) — not established like Centru. "
            "neighborhood_stage=early_growth. appreciation_pct_1y=5.0. "
            "The early_growth premium is 10-15% over Botanica/Riscani secondary zones, "
            "but Centru pricing (1500-2000 EUR/m²) is not warranted here. "
            "Verdict: overvalued (confidence: 0.81)."
        ),
        "expected_output": "overvalued, neighborhood_stage=early_growth, appreciation>=3%",
        "metrics": [verdict_accuracy, neighborhood_stage_accuracy, factor_specificity],
    },
]


@pytest.mark.skipif(not _HAS_API_KEY, reason="requires DEEPSEEK_API_KEY")
@pytest.mark.parametrize("case", GOLDEN_CASES)
def test_valuation(case):
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        expected_output=case["expected_output"],
    )
    assert_test(test_case, case["metrics"])
