import os
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.metrics import GEval
from deepeval.models import DeepSeekModel

judge = DeepSeekModel(
    model="deepseek-reasoner",
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    temperature=0,
)

reasoning_quality = GEval(
    name="ReasoningQuality",
    criteria="""Evaluate whether the valuation reasoning is:
1. Grounded in specific EUR/m² figures
2. References market benchmarks for the city/zone
3. Considers property-specific factors (condition, floor, size)
4. Logically supports the given verdict""",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=judge,
    threshold=0.6,
)

verdict_accuracy = GEval(
    name="VerdictAccuracy",
    criteria="""Given the INPUT (apartment data) and ACTUAL_OUTPUT (reasoning + verdict),
determine if the verdict (undervalued/fair/overvalued) is justified.
A verdict is correct if the price/m² clearly falls outside or within the expected market range for that city/zone.""",
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    model=judge,
    threshold=0.7,
)

# Checks that the reasoning cites specific discount/premium factors (condition, floor, parking, etc.)
# and doesn't rely solely on price/m² math.
factor_specificity = GEval(
    name="FactorSpecificity",
    criteria="""Evaluate whether the ACTUAL_OUTPUT explicitly mentions at least one property-specific
factor beyond price/m² that influences the verdict — such as floor level, condition, renovation status,
parking, view, building age, or noise. Generic statements like 'the condition is good' without linking
it to a price impact do NOT qualify.""",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=judge,
    threshold=0.65,
)

# When comparables are provided in the input, the reasoning must reference them.
comparable_grounding = GEval(
    name="ComparableGrounding",
    criteria="""The INPUT contains a list of comparable listings with their prices per m².
Evaluate whether the ACTUAL_OUTPUT references these comparables — by citing their price range,
the average, or a specific comparable — rather than relying solely on hardcoded market benchmarks.
If no comparables are listed in the INPUT, score 1.0 by default.""",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
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
            "At 1088 EUR/m² in Buiucani, the market range is 900-1100 EUR/m². "
            "This sits 14% above the zone midpoint of 950 EUR/m², within the ±15% fair threshold. "
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
            "At 773 EUR/m² in Riscani, the benchmark is 800-1000 EUR/m². "
            "This is 16% below the lower bound, crossing the undervalued threshold. "
            "A comparable good-condition apartment in Riscani should fetch 850-950 EUR/m². "
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
            "At 1058 EUR/m² in Iasi Centru, the benchmark is 1100-1400 EUR/m². "
            "This is 15% below the low end of the range. The ground floor penalizes value "
            "but does not fully explain the gap — even ground-floor units in this zone fetch "
            "1000-1100 EUR/m². Verdict: undervalued (confidence: 0.74)."
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
]


@pytest.mark.parametrize("case", GOLDEN_CASES)
def test_valuation(case):
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        expected_output=case["expected_output"],
    )
    assert_test(test_case, case["metrics"])
