import json
import logging
import statistics
from dataclasses import dataclass

from openai import AsyncOpenAI
from .models import ListingExtraction, ValuationResult, ComparableListing, ZoneStats
from .config import settings
from .scraper import _canonicalize_zone
from .scraper_search import fetch_comparables
from .scraper_search_ro import fetch_comparables_ro
from .preprocessor import normalize_listing_text, extract_structured_hints
from .quality import assess_quality
from .feature_classifier import classify_features, summarize_features
from .research_citations import get_citations_for_analysis
from .poi import get_environmental_context
from .neighborhood import classify_neighborhood
from .market_data import get_or_build_prompt_section

logger = logging.getLogger(__name__)


@dataclass
class AnalyzerDeps:
    """Dependencies injected into agents at run time.

    Carries configuration and request context through the agent pipeline.
    """
    deepseek_api_key: str
    listing_url: str = ""
    comparable_context: str | None = None


def _build_client(api_key: str | None = None) -> AsyncOpenAI:
    """Build the DeepSeek async client. Accepts optional key override for testing."""
    return AsyncOpenAI(
        base_url="https://api.deepseek.com/v1",
        api_key=api_key or settings.deepseek_api_key,
    )


_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    """Lazy singleton client."""
    global _client
    if _client is None:
        _client = _build_client()
    return _client


# DeepSeek — extracts structured data from raw listing text
EXTRACTOR_SYSTEM_PROMPT = """You are a real estate data extraction specialist for Eastern European listings.
Extract structured apartment data from listing page text.

PRICE EXTRACTION (critical):
- Look for "Price:" line first — it contains the listed price and often price/m²
- Format is often "72 500 € 1421 €/м²" — extract both values
- Numbers use space as thousands separator: "72 500" = 72500
- price_eur: the total listed asking price in EUR (integer)
- price_per_m2: the listed €/m² value if present, otherwise compute price_eur / size_m2
- Convert MDL to EUR ÷ 20, RON to EUR ÷ 5
- currency: the original currency before conversion (EUR, MDL, RON)

LOCATION:
- city: actual city name (e.g. "Chisinau", "Bucharest", "Cluj-Napoca")
- zone: neighbourhood/district (e.g. "Centru", "Botanica", "Aeroport", "Sector 1")
  If "Zone (from URL):" or "Zone (from breadcrumb):" appears in the text, use that as the zone — it is always correct.
  Also check the "Breadcrumb:" line — the last meaningful item after the city name is the zone/district.
  Only return null for zone when you have NO information whatsoever about the location.

PARKING (important for valuation accuracy):
- If title/text says "preț parcare separat" or "pret separat": parking_included = false
  The listed price is for the APARTMENT ONLY. parking_price_eur = null unless a separate price is given.
- If "loc parcare inclus" or one total price covering both: parking_included = true
  parking_price_eur = estimated value (underground = 10000-15000 EUR Chisinau; surface = 5000-8000 EUR)
- If parking not mentioned: parking_included = null, parking_price_eur = null

CONDITION mapping:
- "Variantă albă" / "varianta alba" → "new" (shell finish in new build)
- "Reparație euro/cosmetică" → "renovated"
- "Stare bună" → "good"
- "Necesită reparație" → "needs_renovation"

Return null for fields you cannot confidently determine.

Output a JSON object with these exact field names: title, price_eur, price_local, currency, size_m2, price_per_m2, rooms, floor, total_floors, zone, city, condition, features, parking_included, parking_price_eur."""


async def extract_listing(text: str, client: AsyncOpenAI | None = None) -> ListingExtraction:
    """Extract structured apartment data from raw listing text using DeepSeek."""
    c = client or _get_client()
    response = await c.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": EXTRACTOR_SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content)
    return ListingExtraction(**data)


# Valuator — generates valuation verdict (DeepSeek)
VALUATOR_SYSTEM_PROMPT = """You are a senior real estate investment analyst specializing in Eastern European markets.
Analyze apartment listings from Moldova (999.md) and Romania (imobiliare.ro).

Market reference prices (EUR/m², 2025 — Chisinau market-wide avg ~1720, up ~12% from end-2024):
Moldova:
  - Chisinau Centru: 1500-2100
  - Chisinau Riscani: 1200-1700
  - Chisinau Ciocana: 1100-1650
  - Chisinau Buiucani: 1100-1600
  - Chisinau Botanica: 1000-1450
  - Chisinau Aeroport: 1050-1500
  - Chisinau Telecentru: 1000-1400
  - Chisinau suburbs/outskirts: 700-1000
  - Other Moldovan cities: 450-750

Romania:
  - Bucharest Sector 1-2: 2000-2500
  - Bucharest Sector 3-4: 1400-1800
  - Bucharest Sector 5-6: 1100-1400
  - Cluj-Napoca center: 2000-2400
  - Cluj-Napoca periphery: 1400-1800
  - Iasi center: 1100-1400
  - Timisoara center: 1300-1700
  - Brasov center: 1600-2000
  - Constanta (seaside): 1200-1700
  - Sibiu center: 1400-1800
  - Other Romanian cities: 800-1300

DEVIATION FORMULA (always compute explicitly):
  price_deviation_pct = (listing_price_per_m2 - fair_value_eur_per_m2) / fair_value_eur_per_m2 * 100
  - Negative → listing is cheaper than fair value (undervalued)
  - Positive → listing is more expensive than fair value (overvalued)

Classification thresholds:
  - price_deviation_pct < -15% → undervalued
  - price_deviation_pct > +15% → overvalued
  - otherwise → fair

Recommendation mapping:
  - strong_buy: deviation < -20% AND confidence >= 0.75
  - buy: deviation < -5% OR (fair AND strong fundamentals)
  - hold: fair price, neutral fundamentals
  - avoid: overvalued OR major risks

HEDONIC ADJUSTMENT FACTORS (apply to fair_value_eur_per_m2):
  Floor:
    Ground floor: new build -10 to -15% (privacy); Soviet-era panel -3 to -8% (smaller penalty, street access use case)
    Floors 2-3: baseline
    Mid-high floors: +3 to +5%
    Top floor with view/new build: +5 to +8%; Soviet panel top floor: -3 to -5% (heat loss, no insulation)
  Condition: new/euro reno +10 to +15%; variantă albă (shell, no finishes) +5 to +8%; good baseline; cosmetic needs -5 to -10%; major reno -18 to -28%
  Building age: <5yr baseline; 5-15yr: baseline to -2%; 15-30yr brick/solid -5 to -8%; 15-30yr panel -8 to -12%; Soviet-era (40yr+) solid -10 to -14%; Soviet-era (40yr+) panel -14 to -20%
  Building material: brick/monolith +4 to +6%; modern concrete/monolith +2 to +4%; Soviet panel -5 to -10% (compound with age above)
  Parking: underground ~€12000-15000 value (Chisinau), ~€18000-25000 (Bucharest); surface ~€5000-8000 (Chisinau). Convert to % of apt value.
  View/exposure: panoramic/park +3 to +5%; courtyard baseline; industrial/road -5 to -8%
  Size efficiency: <35m2 studio +2 to +5% per m2 (Eastern European markets, limited premium vs West); >120m2 discount -3 to -5% per m2

RENTAL MARKET REFERENCE (EUR/month, 2025 — rents up ~25-30% since 2022-2023):
Moldova:
  - Chisinau Centru 1br: 450-625 | 2br: 625-875 | 3br: 875-1250
  - Chisinau Aeroport/Botanica/Riscani 1br: 315-475 | 2br: 475-650 | 3br: 650-900
  - Chisinau Telecentru/Buiucani 1br: 350-500 | 2br: 480-650
  - Chisinau Ciocana 1br: 280-420 | 2br: 400-570
  - Other Moldovan cities: 190-350
Romania:
  - Bucharest Sector 1-2 1br: 700-1000 | 2br: 900-1400
  - Bucharest Sector 3-6 1br: 450-700 | 2br: 600-900
  - Cluj-Napoca 1br: 500-750 | 2br: 700-1000
  - Iasi/Timisoara 1br: 350-550 | 2br: 500-750
  - Brasov/Sibiu 1br: 400-600

ACQUISITION FEES (add to total_cost_eur):
  - Moldova: ~3% notary + transfer fees on top of purchase price
  - Romania: ~2% + TVA on new builds
  - If parking is separate and price known, include it in total_cost_eur

REQUIRED OUTPUT FIELDS:
  - reasoning: 2-3 paragraphs — price assessment, location/property, investment outlook
  - market_context: 1-2 sentences on current zone/city conditions
  - opportunity_factors: concrete positives for THIS listing
  - risk_factors: concrete risks for THIS listing
  - investment_score: 0-10 (= 0.4*price_score + 0.3*location_score + 0.2*condition_score + 0.1*market_score)
  - key_factors: short tags
  - rental_estimate_eur: realistic monthly rent for this specific property (int)
  - rental_yield_pct: (rental_estimate_eur * 12 / price_eur) * 100, rounded to 1 decimal  [GROSS yield]
  - negotiation_margin_pct: realistic discount % a buyer could negotiate (negative float, e.g. -8.0).
      Overvalued → larger margin (-10 to -20%). Fair → small margin (-3 to -7%). Undervalued → 0 to -3%.
  - total_cost_eur: price_eur + (parking_price_eur if separate and known, else 0) + acquisition fees (~3% Moldova, ~2% Romania)
  - liquidity: "high" (Centru/prime, new 1-2br, well-priced — ~8-14 weeks Chisinau 2025), "medium" (secondary zone new — ~14-24 weeks), "low" (old stock, overpriced, non-central — 24-52 weeks)
    Chisinau 2025 note: market volume down 54% YoY; base sale cycle now 12-16 weeks even for good stock. Reserve "high" for well-priced central new builds only.
  - price_trend: "rising"/"stable"/"declining" for this specific zone based on 2024-2025 market data
  - confidence: 0.0-1.0 per CONFIDENCE CALIBRATION rules above

SCORE BREAKDOWN (each 0-10, used to compute investment_score):
  price_score: deviation < -20% → 9-10 | -10% to -20% → 7-8 | -5% to +5% → 5-6 | +5% to +15% → 3-4 | >+15% → 1-2
  location_score: Centru/Sector1-2 → 8-10 | growth zones (Botanica, Aeroport new) → 6-8 | secondary → 4-6 | outskirts → 2-4
  condition_score: new build/euro renovated → 8-10 | good condition → 6-7 | needs cosmetic → 4-5 | major renovation → 1-3
  market_score: high liquidity zone, rising trend → 8-10 | stable demand → 5-7 | oversupply/declining → 2-4
  investment_score = 0.4*price_score + 0.3*location_score + 0.2*condition_score + 0.1*market_score

DERIVED METRICS (compute explicitly):
  fair_price_eur = round(fair_value_eur_per_m2 * size_m2)
  net_yield_pct = (rental_estimate_eur * 12 * 0.75) / total_cost_eur * 100  (0.75 = 25% expenses: taxes, maintenance, vacancy, mgmt)
  breakeven_years = total_cost_eur / (rental_estimate_eur * 12 * 0.75)
  appreciation_pct_1y: use zone price_trend and 2025 market data
    Moldova (market in stagnation phase, volume -54% YoY in 2025):
      Centru/Telecentru/Buiucani: 0-2% (stable/stagnant, supply vs demand equilibrium)
      Aeroport new developments: 3-6% (infrastructure investment continuing)
      Riscani/Ciocana new stock: 2-4% | older panel stock: 0-2%
    Romania Bucharest/Cluj: 4-7% | Brasov/Sibiu: 4-6% | secondary Romanian cities: 1-4%

FAIR VALUE CONFIDENCE RANGE (research: top AVMs are accurate within ±10% for 90% of properties):
  fair_value_low_eur_per_m2 = round(fair_value_eur_per_m2 * 0.90) when confidence >= 0.75
  fair_value_low_eur_per_m2 = round(fair_value_eur_per_m2 * 0.85) when confidence < 0.75
  fair_value_high_eur_per_m2 = round(fair_value_eur_per_m2 * 1.10) when confidence >= 0.75
  fair_value_high_eur_per_m2 = round(fair_value_eur_per_m2 * 1.15) when confidence < 0.75
  When COMPARABLE MARKET DATA is in prompt: narrow to ±8% and anchor to comp median rather than reference table

CONFIDENCE CALIBRATION:
  0.85-0.95: price known, >=3 comparables, well-known zone, clear condition
  0.70-0.84: price known, 0-2 comparables, known zone
  0.50-0.69: missing price OR unknown zone OR ambiguous condition
  <0.50: multiple critical fields missing

COMPARABLE DATA INTEGRATION (if "COMPARABLE MARKET DATA" section appears in this prompt):
  Use comp median as the PRIMARY anchor for fair_value_eur_per_m2, not the reference table
  Apply property-specific adjustments vs. typical comp: condition (+/-5-15%), floor (+/-3-8%), parking
  The comp median represents actual current market consensus for similar properties in this zone

ENVIRONMENTAL DISAMENITIES (when "ENVIRONMENTAL CONTEXT" section appears in the listing prompt):
  Properties near airports, railways, highways, or industrial zones suffer measurable value discounts.
  Apply the suggested adjustment % to fair_value_eur_per_m2 BEFORE computing price_deviation_pct.
  Include specific hazards in risk_factors (e.g. "Airport 1.5km away — aircraft noise on takeoff/landing path").
  Reduce location_score by 1-3 points depending on severity:
    high noise/air quality risk: -2 to -3 points
    moderate: -1 to -2 points
    low: 0 to -1 points
  Even when a zone name contains "Aeroport" or similar, you MUST still factor in actual proximity data if provided.
  Noise impact varies: takeoff paths are louder than approach; prevailing wind determines which runway is active.

ADDITIONAL INVESTMENT METRICS:
  price_to_rent_ratio = total_cost_eur / (rental_estimate_eur * 12)
    < 10: excellent yield (buy-to-let) | 10–15: good | 15–20: fair | > 20: appreciation play only
  time_on_market_weeks: estimated weeks to sell at the ASKING (not negotiated) price
    Chisinau 2025 baseline: market stagnation, avg 12-16 weeks even for well-priced stock
    Well-priced (≤fair value), Centru/growth zone, good condition: 8–14 weeks
    Fair price, average zone/condition: 14–22 weeks
    Slightly overvalued (+5–15%), secondary zone: 22–35 weeks
    Significantly overvalued (>+15%) OR needs major renovation: 35–60 weeks
    Romania: typically faster — Bucharest/Cluj good stock: 4–10 weeks; overvalued: 16–30 weeks
  renovation_upside_pct: % value gain if brought to euro-renovated standard (null for already new/renovated)
    needs_renovation condition: 20–30% | good condition (cosmetic only): 8–14% | renovated/new: null
CHISINAU ZONE → STAGE MAPPING (2025):
  Zone         | Stage          | Avg EUR/m² | Appreciation | Confidence
  Centru       | established    | 1,700+     | 0-1%         | high
  Riscani      | maturing       | 1,420      | 2-3%         | high
  Ciocana      | maturing       | 1,380      | 3-7%         | high
  Buiucani     | maturing       | 1,370      | 2-4%         | medium
  Aeroport     | early_growth   | 1,200+     | 6-10%        | high
  Botanica     | maturing       | 1,170      | 2-3%         | high
  Telecentru   | established    | 1,170      | 1-2%         | medium
  NOTE: Aeroport is administratively part of Botanica but shows distinct gentrification — treat separately.
  NOTE: Soviet-era industrial periphery (>5km from center) → declining

  neighborhood_stage: trajectory classification based on 2025 market data
    "early_growth": gentrifying, infrastructure investment underway, prices rising 5-10%/yr
      Moldova confirmed: Aeroport new developments (5-8% annual), Ciocana new construction areas
      Moldova possible: some Buiucani edge sectors
      Romania: emerging satellite cities, outer-ring districts with new metro/transit
    "maturing": growth stabilizing, still positive 2-4%/yr, established amenities
      Moldova confirmed: Riscani (improving +2-3%), Ciocana established areas, Buiucani
      Moldova confirmed: Botanica general (mixed — airport area still early_growth, older areas maturing)
      Romania: Bucharest Sector 3-4 mature residential
    "established": stable 0-2%/yr appreciation, blue-chip demand, premium pricing
      Moldova confirmed: Centru (market stagnation 2025, <1% growth), premium Botanica streetfronts
      Romania: Bucharest Sector 1-2, Cluj center, Brasov center
    "declining": negative or flat appreciation, aging stock, reduced demand
      Moldova examples: Soviet-era industrial periphery (>5km from center), old unrenovated Telecentru panel blocks, outskirts with no transit
      Romania: shrinking secondary cities (Vaslui, Bârlad etc.)

Output a JSON object with all the required and derived metric fields described above."""


async def valuate_listing(prompt: str, client: AsyncOpenAI | None = None) -> ValuationResult:
    """Generate valuation verdict using DeepSeek, with retry on formula issues."""
    c = client or _get_client()
    messages = [
        {"role": "system", "content": VALUATOR_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
    result = None
    for attempt in range(3):
        response = await c.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        result = ValuationResult(**data)

        issues = validate_valuation_formulas(result)
        severe = [i for i in issues if "verdict" in i.lower()]
        if severe and attempt < 2:
            messages.append({"role": "assistant", "content": content})
            messages.append({"role": "user", "content":
                f"Valuation has formula inconsistencies — please fix: {'; '.join(severe)}"
            })
            continue

        for issue in issues:
            logger.warning("Valuation formula issue: %s", issue)
        return result

    return result


def validate_valuation_formulas(v: ValuationResult) -> list[str]:
    """Verify internal formula consistency of a ValuationResult.

    Returns a list of issues found (empty = all ok).
    Used by the output validator and by eval tests.
    """
    issues: list[str] = []

    # Score formula: investment_score ≈ 0.4*p + 0.3*l + 0.2*c + 0.1*m
    sb = v.score_breakdown
    if sb is not None and v.investment_score is not None:
        expected = 0.4 * sb.price_score + 0.3 * sb.location_score + 0.2 * sb.condition_score + 0.1 * sb.market_score
        if abs(v.investment_score - expected) > 1.0:
            issues.append(
                f"investment_score ({v.investment_score:.1f}) deviates from "
                f"formula ({expected:.1f}) by > 1.0"
            )

    # Verdict vs deviation consistency
    if v.price_deviation_pct is not None:
        dev = v.price_deviation_pct
        if dev < -15 and v.verdict != "undervalued":
            issues.append(f"deviation {dev:.1f}% < -15 but verdict is '{v.verdict}', expected 'undervalued'")
        elif dev > 15 and v.verdict != "overvalued":
            issues.append(f"deviation {dev:.1f}% > +15 but verdict is '{v.verdict}', expected 'overvalued'")

    # Negotiation margin must be negative
    if v.negotiation_margin_pct is not None and v.negotiation_margin_pct > 0:
        issues.append(f"negotiation_margin_pct ({v.negotiation_margin_pct}) must be ≤ 0")

    # Rental yield formula: (rent * 12 / price) * 100
    if (v.rental_estimate_eur and v.rental_yield_pct is not None
            and v.total_cost_eur and v.total_cost_eur > 0):
        expected_yield = (v.rental_estimate_eur * 12 / v.total_cost_eur) * 100
        if abs(v.rental_yield_pct - expected_yield) > 2.0:
            issues.append(
                f"rental_yield_pct ({v.rental_yield_pct:.1f}) deviates from "
                f"computed ({expected_yield:.1f}) by > 2.0"
            )

    return issues


def _build_valuation_prompt(listing: ListingExtraction, comp_zone_context: str | None = None, env_context: str | None = None, market_ref_context: str | None = None) -> str:
    # Data quality signal for confidence calibration
    data_points = sum([
        listing.price_eur is not None,
        listing.size_m2 is not None,
        listing.rooms is not None,
        listing.floor is not None,
        listing.zone is not None,
        listing.condition != "unknown",
    ])
    quality = "high" if data_points >= 5 else "medium" if data_points >= 3 else "low"

    parking_line = ""
    if listing.parking_included is True:
        val = f" (estimated value: €{listing.parking_price_eur:,})" if listing.parking_price_eur else ""
        parking_line = f"\nParking: INCLUDED in listed price{val} — apartment-only price per m² is lower than shown"
    elif listing.parking_included is False:
        price = f" — costs €{listing.parking_price_eur:,} separately" if listing.parking_price_eur else " (price unknown)"
        parking_line = f"\nParking: SEPARATE purchase{price} — total acquisition cost is higher"

    zone_unknown_note = ""
    if listing.zone is None:
        zone_unknown_note = (
            "\n\nZONE UNKNOWN — SPECIAL INSTRUCTIONS:"
            "\n- Use COMPARABLE MARKET DATA as primary anchor if available (even though comps may span multiple zones)"
            "\n- If no comparables: use the city-wide midpoint, NOT a specific zone range"
            "\n- Widen fair_value confidence range to ±15% (reflects location uncertainty)"
            "\n- Set confidence to 0.50-0.65 maximum"
            "\n- For neighborhood_stage: return null — do not guess without zone"
            "\n- For location_score: cap at 5/10"
            "\n- For liquidity: default to 'medium' unless comps strongly suggest otherwise"
        )

    comp_section = ""
    if comp_zone_context:
        comp_section = (
            f"\n\n{comp_zone_context}\n"
            "Use this real market data as the PRIMARY anchor for fair_value_eur_per_m2. "
            "Apply condition/floor/parking adjustments vs. the median to arrive at this property's fair value. "
            "Narrow the fair value confidence range (±8%) when comp data is consistent."
        )

    if market_ref_context:
        comp_section += f"\n\n{market_ref_context}"

    return f"""Valuate this apartment listing:

City: {listing.city}
Zone: {listing.zone or "unknown"}
Price: {f"{listing.price_eur} EUR" if listing.price_eur is not None else "unknown"}
Size: {f"{listing.size_m2} m²" if listing.size_m2 is not None else "unknown"}
Price per m²: {f"{listing.price_per_m2} EUR/m²" if listing.price_per_m2 is not None else "unknown"}
Rooms: {listing.rooms if listing.rooms is not None else "unknown"}
Floor: {f"{listing.floor}/{listing.total_floors}" if listing.floor is not None else "unknown"}
Condition: {listing.condition}
Features: {", ".join(listing.features) if listing.features else "none listed"}{parking_line}

Data quality: {quality} ({data_points}/6 fields)

Note: price_per_m2 and fair_value_eur_per_m2 should always refer to the APARTMENT AREA ONLY (not parking).
If parking is included in the listed price, the effective apartment-only price per m² is:
  (price_eur - parking_value) / size_m2
Use this adjusted figure when computing price_deviation_pct.{zone_unknown_note}{comp_section}{f'''

{env_context}
Factor environmental disamenities into fair_value_eur_per_m2, risk_factors, location_score, and reasoning.
Properties near airports suffer from aircraft noise (especially takeoff/landing paths), which reduces
desirability and resale value. Similarly for railways, highways, and industrial zones.''' if env_context else ''}"""


def _compute_deviation_pct(comp_price_per_m2: float, listing_price_per_m2: float) -> float:
    """Positive means comp is more expensive than the analyzed listing."""
    return round((comp_price_per_m2 - listing_price_per_m2) / listing_price_per_m2 * 100, 1)


def _compute_zone_stats(comparables: list[ComparableListing], zone: str | None) -> ZoneStats | None:
    prices = [c.price_per_m2 for c in comparables if c.price_per_m2 is not None]
    if not prices:
        return None
    return ZoneStats(
        zone=zone,
        avg_price_per_m2=round(statistics.mean(prices), 0),
        median_price_per_m2=round(statistics.median(prices), 0),
        min_price_per_m2=min(prices),
        max_price_per_m2=max(prices),
        count=len(prices),
    )


async def analyze_listing(
    listing_text: str, url: str
) -> tuple[ListingExtraction, ValuationResult, list[ComparableListing], ZoneStats | None]:
    listing = await extract_listing(
        f"Extract apartment data from this listing:\nURL: {url}\n\n{listing_text}"
    )

    # Sanitize: LLM sometimes returns the string "null"/"None" for optional text fields
    _NULL_STRINGS = {"null", "none", "n/a", "unknown", ""}
    if (listing.zone or "").lower().strip() in _NULL_STRINGS:
        listing.zone = None
    if (listing.city or "").lower().strip() in _NULL_STRINGS:
        listing.city = "unknown"
    listing.zone = _canonicalize_zone(listing.zone)

    # Compute price_per_m2 if not extracted
    if listing.price_eur and listing.size_m2 and not listing.price_per_m2:
        listing.price_per_m2 = round(listing.price_eur / listing.size_m2)

    # Only fetch comparables for Moldovan/999.md listings
    is_moldovan = "999.md" in url or (listing.city or "").lower() in (
        "chisinau", "chișinău", "balti", "bălți", "cahul", "orhei", "soroca"
    )

    # For Moldovan listings: fetch comparables FIRST to anchor fair value with real market data
    # (comparable sales approach: research shows comp median beats reference tables by 20-30% RMSE)
    raw_comparables: list = []
    comp_zone_context: str | None = None
    if is_moldovan:
        try:
            raw_comparables = await fetch_comparables(
                city=listing.city,
                zone=listing.zone,
                rooms=listing.rooms,
                size_m2=listing.size_m2,
            )
            comp_prices = [r.get("price_per_m2") for r in raw_comparables if r.get("price_per_m2")]
            if comp_prices:
                avg = round(statistics.mean(comp_prices))
                median = round(statistics.median(comp_prices))
                reliability = "high" if len(comp_prices) >= 3 else "low (fewer than 3 comparables — widen confidence range to ±15%)"
                comp_zone_context = (
                    f"COMPARABLE MARKET DATA ({len(comp_prices)} active listings in zone, reliability: {reliability}): "
                    f"avg €{avg}/m², median €{median}/m², "
                    f"range €{min(comp_prices):.0f}–€{max(comp_prices):.0f}/m²"
                )
        except Exception:
            raw_comparables = []

    valuation_prompt = _build_valuation_prompt(listing, comp_zone_context)
    valuation = await valuate_listing(valuation_prompt)

    # Enrich comparables with deviation_pct
    comparables: list[ComparableListing] = []
    for raw in raw_comparables:
        dev = None
        if raw.get("price_per_m2") and listing.price_per_m2:
            dev = _compute_deviation_pct(raw["price_per_m2"], listing.price_per_m2)
        comparables.append(ComparableListing(**raw, deviation_pct=dev))

    zone_stats = _compute_zone_stats(comparables, listing.zone)

    return listing, valuation, comparables, zone_stats


# --- Enhanced analyze_listing with all integrations ---
async def analyze_listing_v2(
    listing_text: str, url: str
) -> tuple[ListingExtraction, ValuationResult, list[ComparableListing], ZoneStats | None, dict]:
    """Enhanced version that integrates preprocessor, quality, features, RO comps, citations.
    Returns (listing, valuation, comparables, zone_stats, extras)."""

    # Pre-process: normalize multilingual text
    normalized_text = normalize_listing_text(listing_text)
    hints = extract_structured_hints(listing_text)

    listing = await extract_listing(
        f"Extract apartment data from this listing:\nURL: {url}\n\n{normalized_text}"
    )

    _NULL_STRINGS = {"null", "none", "n/a", "unknown", ""}
    if (listing.zone or "").lower().strip() in _NULL_STRINGS:
        listing.zone = None
    if (listing.city or "").lower().strip() in _NULL_STRINGS:
        listing.city = "unknown"
    listing.zone = _canonicalize_zone(listing.zone)

    # Fill gaps from structured hints
    if not listing.rooms and hints.get("rooms"):
        try:
            listing.rooms = int(hints["rooms"])
        except (ValueError, TypeError):
            pass
    if not listing.floor and hints.get("floor"):
        try:
            parts = hints["floor"].split("/")
            listing.floor = int(parts[0])
            if len(parts) > 1:
                listing.total_floors = int(parts[1])
        except (ValueError, TypeError):
            pass

    if listing.price_eur and listing.size_m2 and not listing.price_per_m2:
        listing.price_per_m2 = round(listing.price_eur / listing.size_m2)

    # Quality assessment (rule-based, fast)
    quality_result = assess_quality(listing)

    # Feature classification
    feature_summary = None
    if listing.features:
        classified = classify_features(
            listing.features,
            condition=listing.condition,
            floor=listing.floor,
            total_floors=listing.total_floors,
        )
        feature_summary = summarize_features(classified)

    # Detect market source
    is_moldovan = "999.md" in url or (listing.city or "").lower() in (
        "chisinau", "chișinău", "balti", "bălți", "cahul", "orhei", "soroca"
    )
    is_romanian = "imobiliare.ro" in url or (listing.city or "").lower() in (
        "bucharest", "bucurești", "cluj-napoca", "cluj", "iasi", "iași",
        "timisoara", "timișoara", "brasov", "brașov", "constanta", "constanța",
    )

    # Fetch comparables from appropriate source
    raw_comparables: list = []
    comp_zone_context: str | None = None

    if is_moldovan:
        try:
            raw_comparables = await fetch_comparables(
                city=listing.city, zone=listing.zone,
                rooms=listing.rooms, size_m2=listing.size_m2,
            )
        except Exception:
            raw_comparables = []
    elif is_romanian:
        try:
            ro_comps, _ = await fetch_comparables_ro(
                city=listing.city, rooms=listing.rooms or 2,
                size_m2=listing.size_m2 or 60.0, zone=listing.zone,
            )
            raw_comparables = [c.model_dump() for c in ro_comps]
        except Exception:
            raw_comparables = []

    comp_prices = [r.get("price_per_m2") for r in raw_comparables if r.get("price_per_m2")]
    if comp_prices:
        avg = round(statistics.mean(comp_prices))
        median = round(statistics.median(comp_prices))
        scope = (
            f"in {listing.zone}" if listing.zone
            else f"in {listing.city} (zone unknown — comps span multiple neighborhoods, use with caution)"
        )
        comp_zone_context = (
            f"COMPARABLE MARKET DATA ({len(comp_prices)} active listings {scope}): "
            f"avg €{avg}/m², median €{median}/m², "
            f"range €{min(comp_prices):.0f}–€{max(comp_prices):.0f}/m²"
        )

    # Environmental context: detect nearby airports, railways, industrial zones, etc.
    env_context_text: str | None = None
    env_result = None
    if listing.city and listing.zone:
        try:
            env_result = await get_environmental_context(listing.city, listing.zone)
            if env_result and env_result.hazards:
                env_context_text = env_result.summary
                logger.info(
                    "Environmental context for %s/%s: %d hazards, adjustment %.1f%%",
                    listing.city, listing.zone, len(env_result.hazards),
                    env_result.adjustment_pct * 100,
                )
        except Exception as e:
            logger.warning("Environmental context fetch failed: %s", e)

    # Neighborhood classification (data-driven, from accumulated listings)
    neighborhood_profile = None
    market_ref_prompt = None
    if listing.city and listing.zone:
        try:
            neighborhood_profile = await classify_neighborhood(
                listing.city, listing.zone, settings.database_url
            )
        except Exception as e:
            logger.warning("Neighborhood classification failed: %s", e)

    # Dynamic market reference data
    if listing.city:
        try:
            market_ref_prompt = await get_or_build_prompt_section(
                listing.city, settings.database_url
            )
        except Exception as e:
            logger.warning("Market reference fetch failed: %s", e)

    valuation_prompt = _build_valuation_prompt(listing, comp_zone_context, env_context_text, market_ref_prompt)
    valuation = await valuate_listing(valuation_prompt)

    comparables: list[ComparableListing] = []
    for raw in raw_comparables:
        dev = None
        if raw.get("price_per_m2") and listing.price_per_m2:
            dev = _compute_deviation_pct(raw["price_per_m2"], listing.price_per_m2)
        comparables.append(ComparableListing(**raw, deviation_pct=dev))

    zone_stats = _compute_zone_stats(comparables, listing.zone)

    citations = get_citations_for_analysis(
        listing.model_dump(), valuation.model_dump(),
    )

    extras = {
        "quality": quality_result,
        "citations": citations,
        "feature_summary": feature_summary,
        "environmental": env_result,
        "neighborhood": neighborhood_profile,
    }

    return listing, valuation, comparables, zone_stats, extras
