"""Evals for the DeepSeek extraction agent.

These are *static* golden cases — the actual_output is a pre-serialised JSON
string of ListingExtraction fields so the judge can verify accuracy without
calling the live agent on every run.  A separate integration test (marked
slow) calls the real agent and applies the same metrics.
"""

import os
import json
import pytest

_HAS_API_KEY = bool(os.getenv("DEEPSEEK_API_KEY"))

if _HAS_API_KEY:
    from deepeval import assert_test
    from deepeval.test_case import LLMTestCase
    from eval._judge import (
        extraction_completeness,
        extraction_correctness,
        currency_conversion,
    )


GOLDEN_CASES = [] if not _HAS_API_KEY else [
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
    # Parking included — extraction should capture parking fields
    {
        "input": """Title: Apartament 2 camere, Centru, Chisinau
Price: 85 000 EUR
Suprafata: 70 m²
Etaj: 5/10
Camere: 2
Stare: Euroreparatie
Zona: Centru
Parcare: loc parcare subteran inclus in pret
Descriere: Bloc nou 2024, parcare subterana inclusa, finisaje premium.""",
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
            "features": ["parcare subterana", "finisaje premium"],
            "parking_included": True,
            "parking_price_eur": 12000,
        }),
        "expected_output": (
            "price_eur=85000, size_m2=70, rooms=2, zone=Centru, city=Chisinau, "
            "parking_included=true, parking_price_eur=12000"
        ),
        "metrics": [extraction_completeness, extraction_correctness],
    },
    # Parking separate — explicit separate price
    {
        "input": """Title: Apartament 1 camera, Aeroport
Price: 55 000 EUR (apartament)
Pret parcare separat — 15 000 EUR
Suprafata: 45 m²
Etaj: 3/10
Camere: 1
Stare: Variantă albă
Zona: Aeroport
Descriere: Bloc nou Exfactor, loc de parcare subteran se vinde separat 15000 EUR.""",
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
            "features": ["bloc nou", "parcare subterana"],
            "parking_included": False,
            "parking_price_eur": 15000,
        }),
        "expected_output": (
            "price_eur=55000, size_m2=45, rooms=1, zone=Aeroport, city=Chisinau, "
            "parking_included=false, parking_price_eur=15000"
        ),
        "metrics": [extraction_completeness, extraction_correctness],
    },
    # Edge case: Balti MDL with spaces in price
    {
        "input": """Title: Apartament 3 camere, Centru, Balti
Price: 1 800 000 MDL
Suprafata: 70 m²
Etaj: 2/5
Numar camere: 3
Stare: Buna
Zona: Centru
Descriere: Apartament spatios in centrul orasului Balti, stare buna, geamuri termopan.""",
        "actual_output": json.dumps({
            "title": "Apartament 3 camere, Centru, Balti",
            "price_eur": 90000,
            "price_local": 1800000,
            "currency": "MDL",
            "size_m2": 70,
            "price_per_m2": 1286,
            "rooms": 3,
            "floor": 2,
            "total_floors": 5,
            "zone": "Centru",
            "city": "Balti",
            "condition": "good",
            "features": ["termopan"],
        }),
        "expected_output": "price_eur=90000, size_m2=70, rooms=3, zone=Centru, city=Balti",
        "metrics": [extraction_completeness, extraction_correctness, currency_conversion],
    },
    # Edge case: Romanian mp format with dot as thousands separator
    {
        "input": """Apartament 3 camere de vanzare, Centru, Timisoara
Pret: 250.000 EUR
Suprafata: 92 mp
Etaj: 6/8
Nr. camere: 3
Stare: renovata
Zona: Centru
Descriere: Apartament complet renovat, 3 camere decomandate, zona centrala Timisoara.""",
        "actual_output": json.dumps({
            "title": "Apartament 3 camere de vanzare, Centru, Timisoara",
            "price_eur": 250000,
            "price_local": 250000,
            "currency": "EUR",
            "size_m2": 92,
            "price_per_m2": 2717,
            "rooms": 3,
            "floor": 6,
            "total_floors": 8,
            "zone": "Centru",
            "city": "Timisoara",
            "condition": "renovated",
            "features": ["decomandat"],
        }),
        "expected_output": "price_eur=250000, size_m2=92, rooms=3, zone=Centru, city=Timisoara",
        "metrics": [extraction_completeness, extraction_correctness],
    },
    # Edge case: No condition mentioned anywhere in listing
    {
        "input": """Title: Apartament 2 camere, Ciocana, Chisinau
Price: 38 000 EUR
Suprafata: 55 m²
Etaj: 6/9
Numar camere: 2
Zona: Ciocana
Descriere: Apartament 2 camere in sectorul Ciocana, etajul 6, vedere spre parc.""",
        "actual_output": json.dumps({
            "title": "Apartament 2 camere, Ciocana, Chisinau",
            "price_eur": 38000,
            "price_local": 38000,
            "currency": "EUR",
            "size_m2": 55,
            "price_per_m2": 691,
            "rooms": 2,
            "floor": 6,
            "total_floors": 9,
            "zone": "Ciocana",
            "city": "Chisinau",
            "condition": "unknown",
            "features": [],
        }),
        "expected_output": "price_eur=38000, size_m2=55, rooms=2, zone=Ciocana, city=Chisinau, condition=unknown",
        "metrics": [extraction_completeness, extraction_correctness],
    },
    # Edge case: Conflicting price formats — EUR in title, MDL in description (same value)
    {
        "input": """Garsoniera Buiucani 28000€
Suprafata: 30 m²
Etaj: 4/5
Camere: 1
Zona: Buiucani
Descriere: Garsoniera compacta in Buiucani, pret 560 000 MDL, mobilata partial.""",
        "actual_output": json.dumps({
            "title": "Garsoniera Buiucani 28000€",
            "price_eur": 28000,
            "price_local": 28000,
            "currency": "EUR",
            "size_m2": 30,
            "price_per_m2": 933,
            "rooms": 1,
            "floor": 4,
            "total_floors": 5,
            "zone": "Buiucani",
            "city": "Chisinau",
            "condition": "good",
            "features": ["mobilata partial"],
        }),
        "expected_output": "price_eur=28000, currency=EUR, size_m2=30, rooms=1, zone=Buiucani, city=Chisinau",
        "metrics": [extraction_completeness, extraction_correctness, currency_conversion],
    },
    # Edge case: Iasi listing in RON
    {
        "input": """Apartament 2 camere de vanzare, Centru, Iasi
Pret: 450.000 RON
Suprafata: 75 mp
Etaj: 3/7
Nr. camere: 2
Stare: buna
Zona: Centru
Descriere: Apartament 2 camere in centrul Iasului, stare buna, acces rapid la transport public.""",
        "actual_output": json.dumps({
            "title": "Apartament 2 camere de vanzare, Centru, Iasi",
            "price_eur": 90000,
            "price_local": 450000,
            "currency": "RON",
            "size_m2": 75,
            "price_per_m2": 1200,
            "rooms": 2,
            "floor": 3,
            "total_floors": 7,
            "zone": "Centru",
            "city": "Iasi",
            "condition": "good",
            "features": [],
        }),
        "expected_output": "price_eur=90000, size_m2=75, rooms=2, zone=Centru, city=Iasi",
        "metrics": [extraction_completeness, extraction_correctness, currency_conversion],
    },
]


@pytest.mark.skipif(not _HAS_API_KEY, reason="requires DEEPSEEK_API_KEY")
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

    from analyzer.agent import extract_listing

    listing = await extract_listing(
        f"Extract apartment data from this listing:\nURL: {case['url']}\n\n{case['text']}"
    )

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
