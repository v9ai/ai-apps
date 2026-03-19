"""GEval metrics + golden cases for investment fields on ValuationResult.

4 new GEval metrics, 8 golden cases covering investment_score, score_breakdown,
rental yield, market context, and negotiation margin.

Research grounding:
  - agent-13 (Explainable AVM): SHAP-style attribution must match aggregate
  - agent-22 (Rental Market Forecasting)
  - agent-49 (Risk Modeling)
  - agent-81 (Valuation Intelligence Synthesis)
"""

import os
import json
import pytest

_HAS_API_KEY = bool(os.getenv("DEEPSEEK_API_KEY"))

investment_score_consistency = rental_yield_plausibility = None
market_context_quality = negotiation_margin_logic = confidence_range_accuracy = None

if _HAS_API_KEY:
    from deepeval import assert_test
    from deepeval.test_case import LLMTestCase, LLMTestCaseParams
    from deepeval.metrics import GEval

    # Import shared metrics and judge from centralized _judge.py
    from eval._judge import (
        judge,
        investment_score_consistency,
        rental_yield_plausibility,
        market_context_quality,
        negotiation_margin_logic,
    )

    confidence_range_accuracy = GEval(
        name="ConfidenceRangeAccuracy",
        criteria="""The ACTUAL_OUTPUT is a ValuationResult JSON. Verify:
1. fair_value_low_eur_per_m2 = round(fair_value_eur_per_m2 * 0.90) when confidence >= 0.75
   fair_value_low_eur_per_m2 = round(fair_value_eur_per_m2 * 0.85) when confidence < 0.75
2. fair_value_high_eur_per_m2 = round(fair_value_eur_per_m2 * 1.10) when confidence >= 0.75
   fair_value_high_eur_per_m2 = round(fair_value_eur_per_m2 * 1.15) when confidence < 0.75
3. Both values must be present and non-null
Score 1.0 if both low/high match the formula, 0.0 if either is wrong.""",
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        model=judge,
        threshold=0.7,
    )

# ---------------------------------------------------------------------------
# Golden cases
# ---------------------------------------------------------------------------

GOLDEN_CASES = [
    # 1. Undervalued Centru → strong_buy
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 45000 EUR, "
            "Size: 65 m², Price per m²: 692 EUR/m², Rooms: 2, "
            "Floor: 4/9, Condition: renovated"
        ),
        "actual_output": json.dumps({
            "verdict": "undervalued",
            "confidence": 0.88,
            "fair_value_eur_per_m2": 1200,
            "price_deviation_pct": -42.3,
            "reasoning": "At 692 EUR/m² in Centru, this is 42% below the 1100-1400 range.",
            "key_factors": ["central location", "renovated", "deeply undervalued"],
            "investment_score": 8.9,
            "score_breakdown": {
                "price_score": 10, "location_score": 9,
                "condition_score": 8, "market_score": 7,
            },
            "recommendation": "strong_buy",
            "risk_factors": [],
            "opportunity_factors": ["42% below fair value", "central location premium"],
            "rental_estimate_eur": 550,
            "rental_yield_pct": 14.7,
            "net_yield_pct": 11.3,
            "breakeven_years": 7.0,
            "total_cost_eur": 46350,
            "negotiation_margin_pct": -1.0,
            "market_context": "Chisinau Centru sees strong demand with rising prices in 2025.",
            "liquidity": "high",
            "price_trend": "rising",
            "appreciation_pct_1y": 7.0,
        }),
        "metrics": [
            investment_score_consistency,
            rental_yield_plausibility,
            negotiation_margin_logic,
        ],
    },
    # 2. Fair Botanica → hold
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 75000 EUR, "
            "Size: 80 m², Price per m²: 937 EUR/m², Rooms: 3, "
            "Floor: 6/9, Condition: good"
        ),
        "actual_output": json.dumps({
            "verdict": "fair",
            "confidence": 0.78,
            "fair_value_eur_per_m2": 950,
            "price_deviation_pct": -1.4,
            "reasoning": "At 937 EUR/m² in Botanica, within the 900-1200 range. Fair value.",
            "key_factors": ["fair price", "good condition"],
            "investment_score": 5.8,
            "score_breakdown": {
                "price_score": 6, "location_score": 6,
                "condition_score": 6, "market_score": 5,
            },
            "recommendation": "hold",
            "risk_factors": ["aging building stock"],
            "opportunity_factors": ["stable zone"],
            "rental_estimate_eur": 600,
            "rental_yield_pct": 9.6,
            "net_yield_pct": 7.4,
            "breakeven_years": 10.7,
            "total_cost_eur": 77250,
            "negotiation_margin_pct": -5.0,
            "market_context": "Botanica is a mature zone with stable prices.",
            "liquidity": "medium",
            "price_trend": "stable",
            "appreciation_pct_1y": 3.0,
        }),
        "metrics": [
            investment_score_consistency,
            rental_yield_plausibility,
            market_context_quality,
            negotiation_margin_logic,
        ],
    },
    # 3. Overvalued Bucharest → avoid
    {
        "input": (
            "City: Bucharest, Zone: Sector 1, Price: 350000 EUR, "
            "Size: 100 m², Price per m²: 3500 EUR/m², Rooms: 4, "
            "Floor: 3/10, Condition: new"
        ),
        "actual_output": json.dumps({
            "verdict": "overvalued",
            "confidence": 0.82,
            "fair_value_eur_per_m2": 2300,
            "price_deviation_pct": 52.2,
            "reasoning": "At 3500 EUR/m² in Sector 1, 52% above the 2000-2500 range.",
            "key_factors": ["overpriced", "new construction"],
            "investment_score": 3.1,
            "score_breakdown": {
                "price_score": 2, "location_score": 9,
                "condition_score": 9, "market_score": 7,
            },
            "recommendation": "avoid",
            "risk_factors": ["52% overpriced", "long time to sell"],
            "opportunity_factors": [],
            "rental_estimate_eur": 1200,
            "rental_yield_pct": 4.1,
            "net_yield_pct": 3.2,
            "breakeven_years": 24.8,
            "total_cost_eur": 357000,
            "negotiation_margin_pct": -15.0,
            "market_context": "Bucharest Sector 1 premium market, but this listing exceeds ceiling.",
            "liquidity": "medium",
            "price_trend": "stable",
            "appreciation_pct_1y": 4.0,
        }),
        "metrics": [
            investment_score_consistency,
            rental_yield_plausibility,
            negotiation_margin_logic,
        ],
    },
    # 4. Balti high-yield, low-liquidity
    {
        "input": (
            "City: Balti, Zone: Centru, Price: 25000 EUR, "
            "Size: 55 m², Price per m²: 454 EUR/m², Rooms: 2, "
            "Floor: 3/5, Condition: good"
        ),
        "actual_output": json.dumps({
            "verdict": "undervalued",
            "confidence": 0.72,
            "fair_value_eur_per_m2": 550,
            "price_deviation_pct": -17.5,
            "reasoning": "At 454 EUR/m² in Balti Centru, 17.5% below the 400-700 range midpoint.",
            "key_factors": ["low price", "secondary city"],
            "investment_score": 5.5,
            "score_breakdown": {
                "price_score": 8, "location_score": 4,
                "condition_score": 6, "market_score": 3,
            },
            "recommendation": "buy",
            "risk_factors": ["low liquidity", "secondary city risk"],
            "opportunity_factors": ["high rental yield", "below fair value"],
            "rental_estimate_eur": 200,
            "rental_yield_pct": 9.6,
            "net_yield_pct": 7.4,
            "breakeven_years": 10.7,
            "total_cost_eur": 25750,
            "negotiation_margin_pct": -2.0,
            "market_context": "Balti has limited demand but low entry prices.",
            "liquidity": "low",
            "price_trend": "stable",
            "appreciation_pct_1y": 2.0,
        }),
        "metrics": [
            investment_score_consistency,
            rental_yield_plausibility,
            market_context_quality,
            negotiation_margin_logic,
        ],
    },
    # 5. Cluj new build, rising trend
    {
        "input": (
            "City: Cluj-Napoca, Zone: Centru, Price: 320000 EUR, "
            "Size: 105 m², Price per m²: 3047 EUR/m², Rooms: 3, "
            "Floor: 5/10, Condition: new"
        ),
        "actual_output": json.dumps({
            "verdict": "overvalued",
            "confidence": 0.76,
            "fair_value_eur_per_m2": 2200,
            "price_deviation_pct": 38.5,
            "reasoning": "At 3047 EUR/m² in Cluj Centru, 38% above the 2000-2400 range.",
            "key_factors": ["new build premium", "overpriced"],
            "investment_score": 4.2,
            "score_breakdown": {
                "price_score": 2, "location_score": 8,
                "condition_score": 9, "market_score": 8,
            },
            "recommendation": "avoid",
            "risk_factors": ["38% above fair value", "high entry cost"],
            "opportunity_factors": ["prime location", "rising market"],
            "rental_estimate_eur": 750,
            "rental_yield_pct": 2.8,
            "net_yield_pct": 2.2,
            "breakeven_years": 36.3,
            "total_cost_eur": 326400,
            "negotiation_margin_pct": -12.0,
            "market_context": "Cluj-Napoca center prices are rising but this listing overshoots.",
            "liquidity": "medium",
            "price_trend": "rising",
            "appreciation_pct_1y": 6.0,
        }),
        "metrics": [
            investment_score_consistency,
            market_context_quality,
            negotiation_margin_logic,
        ],
    },
    # 6. Aeroport overvalued (real listing mirror)
    {
        "input": (
            "City: Chisinau, Zone: Aeroport, Price: 72500 EUR, "
            "Size: 51 m², Price per m²: 1421 EUR/m², Rooms: 1, "
            "Floor: 3/10, Condition: new"
        ),
        "actual_output": json.dumps({
            "verdict": "overvalued",
            "confidence": 0.83,
            "fair_value_eur_per_m2": 950,
            "price_deviation_pct": 49.6,
            "reasoning": "At 1421 EUR/m² in Aeroport, 49% above the 600-800 benchmark "
                         "(even with new-build premium ceiling of ~1050).",
            "key_factors": ["peripheral zone", "overpriced for Aeroport"],
            "investment_score": 3.5,
            "score_breakdown": {
                "price_score": 2, "location_score": 6,
                "condition_score": 9, "market_score": 6,
            },
            "recommendation": "avoid",
            "risk_factors": ["49% overpriced", "Aeroport not Centru"],
            "opportunity_factors": ["new build", "growth zone"],
            "rental_estimate_eur": 350,
            "rental_yield_pct": 5.8,
            "net_yield_pct": 4.5,
            "breakeven_years": 17.7,
            "total_cost_eur": 74675,
            "negotiation_margin_pct": -15.0,
            "market_context": "Aeroport is an early-growth zone but prices have overshot.",
            "liquidity": "medium",
            "price_trend": "rising",
            "appreciation_pct_1y": 5.0,
        }),
        "metrics": [
            investment_score_consistency,
            rental_yield_plausibility,
            negotiation_margin_logic,
        ],
    },
    # 7. Score breakdown mixed — verify weighted formula
    {
        "input": (
            "City: Chisinau, Zone: Riscani, Price: 58000 EUR, "
            "Size: 75 m², Price per m²: 773 EUR/m², Rooms: 3, "
            "Floor: 3/5, Condition: good"
        ),
        "actual_output": json.dumps({
            "verdict": "undervalued",
            "confidence": 0.78,
            "fair_value_eur_per_m2": 950,
            "price_deviation_pct": -18.6,
            "reasoning": "At 773 EUR/m² in Riscani, 18.6% below the 900-1200 midpoint.",
            "key_factors": ["undervalued", "Riscani"],
            "investment_score": 6.5,
            # 0.4*8 + 0.3*5 + 0.2*6 + 0.1*7 = 3.2+1.5+1.2+0.7 = 6.6
            "score_breakdown": {
                "price_score": 8, "location_score": 5,
                "condition_score": 6, "market_score": 7,
            },
            "recommendation": "buy",
            "risk_factors": ["Soviet-era building"],
            "opportunity_factors": ["18% below fair value"],
            "rental_estimate_eur": 400,
            "rental_yield_pct": 8.3,
            "net_yield_pct": 6.4,
            "breakeven_years": 12.4,
            "total_cost_eur": 59740,
            "negotiation_margin_pct": -2.0,
            "market_context": "Riscani is improving with new infrastructure.",
            "liquidity": "medium",
            "price_trend": "rising",
            "appreciation_pct_1y": 5.0,
        }),
        "metrics": [investment_score_consistency, rental_yield_plausibility],
    },
    # 8. Declining market zone
    {
        "input": (
            "City: Chisinau, Zone: Telecentru, Price: 42000 EUR, "
            "Size: 60 m², Price per m²: 700 EUR/m², Rooms: 2, "
            "Floor: 1/5, Condition: needs_renovation"
        ),
        "actual_output": json.dumps({
            "verdict": "fair",
            "confidence": 0.65,
            "fair_value_eur_per_m2": 750,
            "price_deviation_pct": -6.7,
            "reasoning": "At 700 EUR/m² in old Telecentru stock, slightly below midpoint "
                         "but ground floor and renovation needed offset any discount.",
            "key_factors": ["ground floor", "needs renovation", "declining area"],
            "investment_score": 3.2,
            "score_breakdown": {
                "price_score": 5, "location_score": 3,
                "condition_score": 2, "market_score": 3,
            },
            "recommendation": "hold",
            "risk_factors": ["ground floor", "renovation cost", "declining zone"],
            "opportunity_factors": ["low entry price"],
            "rental_estimate_eur": 280,
            "rental_yield_pct": 8.0,
            "net_yield_pct": 6.2,
            "breakeven_years": 12.8,
            "total_cost_eur": 43260,
            "negotiation_margin_pct": -5.0,
            "market_context": "Old Telecentru blocks face declining demand as buyers prefer new stock.",
            "liquidity": "low",
            "price_trend": "declining",
            "appreciation_pct_1y": 1.0,
        }),
        "metrics": [
            investment_score_consistency,
            market_context_quality,
            negotiation_margin_logic,
        ],
    },
    # 9. New-build Botanica maturing (confidence range ±10%)
    {
        "input": (
            "City: Chisinau, Zone: Botanica, Price: 82000 EUR, "
            "Size: 72 m², Price per m²: 1139 EUR/m², Rooms: 2, "
            "Floor: 7/12, Condition: new"
        ),
        "actual_output": json.dumps({
            "verdict": "fair",
            "confidence": 0.80,
            "fair_value_eur_per_m2": 1050,
            "fair_value_low_eur_per_m2": 945,
            "fair_value_high_eur_per_m2": 1155,
            "price_deviation_pct": 8.5,
            "reasoning": "At 1139 EUR/m² in Botanica new-build, slightly above the 1050 midpoint.",
            "key_factors": ["new build", "maturing zone"],
            "investment_score": 5.4,
            "score_breakdown": {
                "price_score": 5, "location_score": 6,
                "condition_score": 9, "market_score": 5,
            },
            "recommendation": "hold",
            "risk_factors": ["slightly above fair value"],
            "opportunity_factors": ["new construction", "maturing neighborhood"],
            "rental_estimate_eur": 500,
            "rental_yield_pct": 7.3,
            "net_yield_pct": 5.7,
            "breakeven_years": 14.1,
            "total_cost_eur": 84460,
            "price_to_rent_ratio": 14.08,
            "time_on_market_weeks": 6,
            "renovation_upside_pct": None,
            "neighborhood_stage": "maturing",
            "negotiation_margin_pct": -5.0,
            "market_context": "Botanica new-builds attract young families; prices maturing toward Centru levels.",
            "liquidity": "medium",
            "price_trend": "rising",
            "appreciation_pct_1y": 5.0,
        }),
        "metrics": [confidence_range_accuracy, market_context_quality],
    },
    # 10. Needs-renovation Telecentru declining (confidence range ±15%)
    {
        "input": (
            "City: Chisinau, Zone: Telecentru, Price: 35000 EUR, "
            "Size: 58 m², Price per m²: 603 EUR/m², Rooms: 2, "
            "Floor: 2/5, Condition: needs_renovation"
        ),
        "actual_output": json.dumps({
            "verdict": "undervalued",
            "confidence": 0.65,
            "fair_value_eur_per_m2": 700,
            "fair_value_low_eur_per_m2": 595,
            "fair_value_high_eur_per_m2": 805,
            "price_deviation_pct": -13.9,
            "reasoning": "At 603 EUR/m² in declining Telecentru, below the 700 midpoint but renovation needed.",
            "key_factors": ["needs renovation", "declining zone", "below fair value"],
            "investment_score": 4.1,
            "score_breakdown": {
                "price_score": 7, "location_score": 3,
                "condition_score": 2, "market_score": 3,
            },
            "recommendation": "hold",
            "risk_factors": ["renovation cost", "declining demand", "low liquidity"],
            "opportunity_factors": ["below fair value", "renovation upside"],
            "rental_estimate_eur": 250,
            "rental_yield_pct": 8.6,
            "net_yield_pct": 6.6,
            "breakeven_years": 12.0,
            "total_cost_eur": 36050,
            "price_to_rent_ratio": 12.02,
            "time_on_market_weeks": 28,
            "renovation_upside_pct": 23,
            "neighborhood_stage": "declining",
            "negotiation_margin_pct": -5.0,
            "market_context": "Old Telecentru stock faces declining demand; long days on market.",
            "liquidity": "low",
            "price_trend": "declining",
            "appreciation_pct_1y": 1.0,
        }),
        "metrics": [confidence_range_accuracy, market_context_quality],
    },
    # 11. High-confidence Centru established (confidence range ±10%)
    {
        "input": (
            "City: Chisinau, Zone: Centru, Price: 108000 EUR, "
            "Size: 90 m², Price per m²: 1200 EUR/m², Rooms: 3, "
            "Floor: 5/9, Condition: renovated"
        ),
        "actual_output": json.dumps({
            "verdict": "fair",
            "confidence": 0.88,
            "fair_value_eur_per_m2": 1200,
            "fair_value_low_eur_per_m2": 1080,
            "fair_value_high_eur_per_m2": 1320,
            "price_deviation_pct": 0.0,
            "reasoning": "At 1200 EUR/m² in Centru, exactly at the fair value midpoint.",
            "key_factors": ["central location", "renovated", "fair price"],
            "investment_score": 7.1,
            "score_breakdown": {
                "price_score": 7, "location_score": 9,
                "condition_score": 8, "market_score": 7,
            },
            "recommendation": "buy",
            "risk_factors": [],
            "opportunity_factors": ["prime location", "stable appreciation"],
            "rental_estimate_eur": 700,
            "rental_yield_pct": 7.8,
            "net_yield_pct": 6.1,
            "breakeven_years": 13.2,
            "total_cost_eur": 111240,
            "price_to_rent_ratio": 13.24,
            "time_on_market_weeks": 4,
            "renovation_upside_pct": None,
            "neighborhood_stage": "established",
            "negotiation_margin_pct": -3.0,
            "market_context": "Chisinau Centru is the established premium zone with steady demand.",
            "liquidity": "high",
            "price_trend": "rising",
            "appreciation_pct_1y": 7.0,
        }),
        "metrics": [confidence_range_accuracy, investment_score_consistency],
    },
    # 12. Low-confidence Balti early_growth (confidence range ±15%)
    {
        "input": (
            "City: Balti, Zone: periphery, Price: 18000 EUR, "
            "Size: 50 m², Price per m²: 360 EUR/m², Rooms: 1, "
            "Floor: 2/5, Condition: good"
        ),
        "actual_output": json.dumps({
            "verdict": "undervalued",
            "confidence": 0.58,
            "fair_value_eur_per_m2": 400,
            "fair_value_low_eur_per_m2": 340,
            "fair_value_high_eur_per_m2": 460,
            "price_deviation_pct": -10.0,
            "reasoning": "At 360 EUR/m² in Balti periphery, 10% below the 400 midpoint.",
            "key_factors": ["low price", "peripheral location", "early growth zone"],
            "investment_score": 4.3,
            "score_breakdown": {
                "price_score": 7, "location_score": 3,
                "condition_score": 6, "market_score": 3,
            },
            "recommendation": "buy",
            "risk_factors": ["very low liquidity", "peripheral Balti"],
            "opportunity_factors": ["below fair value", "early growth potential"],
            "rental_estimate_eur": 150,
            "rental_yield_pct": 10.0,
            "net_yield_pct": 7.8,
            "breakeven_years": 10.3,
            "total_cost_eur": 18540,
            "price_to_rent_ratio": 10.3,
            "time_on_market_weeks": 32,
            "renovation_upside_pct": None,
            "neighborhood_stage": "early_growth",
            "negotiation_margin_pct": -1.0,
            "market_context": "Balti periphery has very low entry costs with early signs of growth.",
            "liquidity": "low",
            "price_trend": "stable",
            "appreciation_pct_1y": 2.0,
        }),
        "metrics": [confidence_range_accuracy, negotiation_margin_logic],
    },
]


@pytest.mark.skipif(not _HAS_API_KEY, reason="requires DEEPSEEK_API_KEY")
@pytest.mark.parametrize("case", GOLDEN_CASES, ids=[
    "undervalued_centru_strong_buy",
    "fair_botanica_hold",
    "overvalued_bucharest_avoid",
    "balti_high_yield_low_liquidity",
    "cluj_new_build_rising",
    "aeroport_overvalued",
    "riscani_score_mixed",
    "telecentru_declining",
    "botanica_newbuild_maturing",
    "telecentru_renovation_declining",
    "centru_high_confidence_established",
    "balti_low_confidence_early_growth",
])
def test_investment(case):
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
    )
    assert_test(test_case, case["metrics"])
