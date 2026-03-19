"""Evals for the DeepSeek extraction agent.

These are *static* golden cases — the actual_output is a pre-serialised JSON
string of ListingExtraction fields so the judge can verify accuracy without
calling the live agent on every run.  A separate integration test (marked
slow) calls the real agent and applies the same metrics.
"""

import os
import json
import pytest
import pytest_asyncio
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.metrics import GEval
from deepeval.models import DeepSeekModel

judge = DeepSeekModel(
    model="deepseek-reasoner",
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    temperature=0,
)

extraction_completeness = GEval(
    name="ExtractionCompleteness",
    criteria="""Given raw listing text (INPUT) and the extracted JSON (ACTUAL_OUTPUT),
evaluate whether the extraction captured all fields that are clearly present in the text:
price (as price_eur in EUR), size_m2, rooms, zone/district, city, condition.
Penalise for each field that is present in the text but missing (null) in the output.
Do NOT penalise for fields that are genuinely absent from the listing text.""",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=judge,
    threshold=0.7,
)

extraction_correctness = GEval(
    name="ExtractionCorrectness",
    criteria="""Given raw listing text (INPUT) and the extracted JSON (ACTUAL_OUTPUT),
verify that numeric values are correct:
- price_eur must equal the listed price converted to EUR (MDL÷20, RON÷5, EUR as-is)
- price_per_m2 = price_eur / size_m2 (within ±5 EUR/m² rounding)
- size_m2, rooms, floor, total_floors must match numbers in the text exactly
- zone and city must match the location mentioned in the text""",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=judge,
    threshold=0.75,
)

currency_conversion = GEval(
    name="CurrencyConversion",
    criteria="""Focus only on the price fields. Given the INPUT listing text and ACTUAL_OUTPUT JSON,
verify that price_eur is correctly derived from the source currency:
- MDL: divide by 20
- RON: divide by 5
- EUR: no conversion needed
Score 1.0 if price_eur is within ±3% of the correct converted value, 0.0 otherwise.""",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=judge,
    threshold=0.9,
)


GOLDEN_CASES = [
    # 999.md style — MDL price, Chisinau listing
    {
        "input": """Title: Apartament 2 camere, Centru, Chisinau
Price: 900 000 MDL
Suprafata: 65 m²
Etaj: 4/9
Numar camere: 2
Stare: Euroreparatie
Zona: Centru
Descriere: Apartament spatios in centrul Chisinaului, reparatie europeana completa, geamuri termopan, parchet.""",
        "actual_output": json.dumps({
            "title": "Apartament 2 camere, Centru, Chisinau",
            "price_eur": 45000,
            "price_local": 900000,
            "currency": "MDL",
            "size_m2": 65,
            "price_per_m2": 692,
            "rooms": 2,
            "floor": 4,
            "total_floors": 9,
            "zone": "Centru",
            "city": "Chisinau",
            "condition": "renovated",
            "features": ["termopan", "parchet"],
        }),
        "expected_output": "price_eur=45000, size_m2=65, rooms=2, zone=Centru, city=Chisinau",
        "metrics": [extraction_completeness, extraction_correctness, currency_conversion],
    },
    # 999.md style — EUR price, Botanica
    {
        "input": """Title: Vand apartament 3 odai, Botanica
Pret: 78 500 EUR
Suprafata totala: 82 m²
Etaj: 7 din 9
Camere: 3
Stare: Buna
Sector: Botanica, str. Grenoble
Descriere: Bloc sovietic consolidat, balcon, pivnita, loc de parcare.""",
        "actual_output": json.dumps({
            "title": "Vand apartament 3 odai, Botanica",
            "price_eur": 78500,
            "price_local": 78500,
            "currency": "EUR",
            "size_m2": 82,
            "price_per_m2": 957,
            "rooms": 3,
            "floor": 7,
            "total_floors": 9,
            "zone": "Botanica",
            "city": "Chisinau",
            "condition": "good",
            "features": ["balcon", "pivnita", "loc de parcare"],
        }),
        "expected_output": "price_eur=78500, size_m2=82, rooms=3, zone=Botanica, city=Chisinau",
        "metrics": [extraction_completeness, extraction_correctness, currency_conversion],
    },
    # imobiliare.ro style — RON price, Bucharest Sector 3
    {
        "input": """Apartament 2 camere de vanzare, Sector 3, Bucuresti
Pret: 145.000 RON
Suprafata utila: 58 mp
Etaj: 3/8
Nr. camere: 2
An constructie: 1985
Stare: necesita renovare
Zona: Sector 3 - Vitan
Descriere: Apartament decomandat, bloc din 1985, necesita renovare completa.""",
        "actual_output": json.dumps({
            "title": "Apartament 2 camere de vanzare, Sector 3, Bucuresti",
            "price_eur": 29000,
            "price_local": 145000,
            "currency": "RON",
            "size_m2": 58,
            "price_per_m2": 500,
            "rooms": 2,
            "floor": 3,
            "total_floors": 8,
            "zone": "Sector 3",
            "city": "Bucharest",
            "condition": "needs_renovation",
            "features": ["decomandat"],
        }),
        "expected_output": "price_eur=29000, size_m2=58, rooms=2, zone=Sector 3, city=Bucharest",
        "metrics": [extraction_completeness, extraction_correctness, currency_conversion],
    },
    # Cluj-Napoca new build — EUR, high-value
    {
        "input": """Apartament nou 3 camere Cluj-Napoca, zona Centru
Pret: 320.000 EUR
Suprafata: 105 mp
Etaj: 5/10
Camere: 3
An constructie: 2024
Finisaje: Premium
Zona: Centru
Parcare: inclusa
Descriere: Imobil nou 2024, finisaje premium, terasa proprie 15mp, loc parcare subteran inclus.""",
        "actual_output": json.dumps({
            "title": "Apartament nou 3 camere Cluj-Napoca, zona Centru",
            "price_eur": 320000,
            "price_local": 320000,
            "currency": "EUR",
            "size_m2": 105,
            "price_per_m2": 3047,
            "rooms": 3,
            "floor": 5,
            "total_floors": 10,
            "zone": "Centru",
            "city": "Cluj-Napoca",
            "condition": "new",
            "features": ["terasa proprie", "parcare subterana"],
        }),
        "expected_output": "price_eur=320000, size_m2=105, rooms=3, zone=Centru, city=Cluj-Napoca",
        "metrics": [extraction_completeness, extraction_correctness, currency_conversion],
    },
    # Real listing: 999.md/ro/103528157
    # 1-room, 51 m², Aeroport zone, variantă albă (new/unfinished), Exfactor-grup, floor 3/10.
    # Key extraction challenges: "variantă albă" → condition=new, price already in EUR (no conversion).
    {
        "input": (
            "Title: Apartament cu 1 cameră, Aeroport, Chișinău, Chișinău mun.\n"
            "Price: 72 500 €\n"
            "Suprafata: 51 m²\n"
            "Etaj: 3/10\n"
            "Numar camere: 1\n"
            "Stare: Variantă albă\n"
            "Zona: Aeroport, str. Dacia 62\n"
            "Tip imobil: Bloc nou (cărămidă)\n"
            "Constructor: Exfactor-grup\n"
            "Descriere: Se vind apartament 1odae (varianta alba)+loc de parcare subterana. "
            "Geamuri panoramice. Bloc nou, 10 etaje, etajul 3."
        ),
        "actual_output": json.dumps({
            "title": "Apartament cu 1 cameră, Aeroport, Chișinău",
            "price_eur": 72500,
            "price_local": 72500,
            "currency": "EUR",
            "size_m2": 51,
            "price_per_m2": 1421,
            "rooms": 1,
            "floor": 3,
            "total_floors": 10,
            "zone": "Aeroport",
            "city": "Chisinau",
            "condition": "new",
            "features": ["geamuri panoramice", "parcare subterana", "bloc nou"],
        }),
        "expected_output": (
            "price_eur=72500, size_m2=51, rooms=1, floor=3, total_floors=10, "
            "zone=Aeroport, city=Chisinau, condition=new"
        ),
        "metrics": [extraction_completeness, extraction_correctness, currency_conversion],
    },
    # Ambiguous case — price in title only, no explicit floor/total_floors
    {
        "input": """Garsoniera Chisinau Buiucani 28000€
Suprafata: 32 m²
Camere: 1
Etaj: 2
Zona: Buiucani
Descriere: Garsoniera cu reparatie cosmetica, fereastra spre curte.""",
        "actual_output": json.dumps({
            "title": "Garsoniera Chisinau Buiucani 28000€",
            "price_eur": 28000,
            "price_local": 28000,
            "currency": "EUR",
            "size_m2": 32,
            "price_per_m2": 875,
            "rooms": 1,
            "floor": 2,
            "total_floors": None,
            "zone": "Buiucani",
            "city": "Chisinau",
            "condition": "good",
            "features": [],
        }),
        "expected_output": "price_eur=28000, size_m2=32, rooms=1, zone=Buiucani, city=Chisinau",
        "metrics": [extraction_completeness, extraction_correctness],
    },
]


@pytest.mark.parametrize("case", GOLDEN_CASES)
def test_extraction(case):
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        expected_output=case["expected_output"],
    )
    assert_test(test_case, case["metrics"])


# ---------------------------------------------------------------------------
# Integration test — calls the real agent (skipped unless DEEPSEEK_API_KEY set)
# ---------------------------------------------------------------------------

INTEGRATION_INPUTS = [
    {
        "text": (
            "Title: Apartament 2 camere, Centru, Chisinau\n"
            "Price: 900 000 MDL\n"
            "Suprafata: 65 m²\n"
            "Etaj: 4/9\nNumar camere: 2\nStare: Euroreparatie\nZona: Centru"
        ),
        "url": "https://999.md/ro/ads/real-estate/test-1",
        "expected_price_eur": 45000,
        "expected_city": "Chisinau",
    },
    # Real listing 999.md/ro/103528157 — 1-room Aeroport 51m² 72500 EUR
    {
        "text": (
            "Title: Apartament cu 1 cameră, Aeroport, Chișinău, Chișinău mun.\n"
            "Price: 72 500 €\n"
            "Suprafata: 51 m²\n"
            "Etaj: 3/10\nNumar camere: 1\nStare: Variantă albă\n"
            "Zona: Aeroport, str. Dacia 62\n"
            "Tip imobil: Bloc nou (cărămidă)\nConstructor: Exfactor-grup\n"
            "Descriere: Se vind apartament 1odae (varianta alba)+loc de parcare subterana. "
            "Geamuri panoramice. Bloc nou, 10 etaje, etajul 3."
        ),
        "url": "https://999.md/ro/103528157",
        "expected_price_eur": 72500,
        "expected_city": "Chisinau",
        "expected_zone": "Aeroport",
        "expected_rooms": 1,
        "expected_size_m2": 51,
        "expected_floor": 3,
        "expected_total_floors": 10,
    },
]


@pytest.mark.asyncio
@pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="requires DEEPSEEK_API_KEY")
@pytest.mark.parametrize("case", INTEGRATION_INPUTS)
async def test_extraction_live(case):
    """Calls the real extractor agent and validates output fields."""
    import sys
    import pathlib
    sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent))

    from analyzer.agent import extractor

    result = await extractor.run(
        f"Extract apartment data from this listing:\nURL: {case['url']}\n\n{case['text']}"
    )
    listing = result.data

    assert listing.city.lower() == case["expected_city"].lower(), (
        f"Expected city={case['expected_city']}, got {listing.city}"
    )
    assert listing.price_eur is not None
    assert abs(listing.price_eur - case["expected_price_eur"]) / case["expected_price_eur"] < 0.05, (
        f"Expected price_eur≈{case['expected_price_eur']}, got {listing.price_eur}"
    )
    assert listing.size_m2 is not None and listing.size_m2 > 0

    if "expected_zone" in case:
        assert listing.zone and case["expected_zone"].lower() in listing.zone.lower(), (
            f"Expected zone to contain '{case['expected_zone']}', got {listing.zone}"
        )
    if "expected_rooms" in case:
        assert listing.rooms == case["expected_rooms"], (
            f"Expected rooms={case['expected_rooms']}, got {listing.rooms}"
        )
    if "expected_size_m2" in case:
        assert listing.size_m2 == pytest.approx(case["expected_size_m2"], abs=1), (
            f"Expected size_m2={case['expected_size_m2']}, got {listing.size_m2}"
        )
    if "expected_floor" in case:
        assert listing.floor == case["expected_floor"], (
            f"Expected floor={case['expected_floor']}, got {listing.floor}"
        )
    if "expected_total_floors" in case:
        assert listing.total_floors == case["expected_total_floors"], (
            f"Expected total_floors={case['expected_total_floors']}, got {listing.total_floors}"
        )
