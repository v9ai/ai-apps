import asyncio
import statistics
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from .models import ListingExtraction, ValuationResult, ComparableListing, ZoneStats
from .config import settings
from .scraper_search import fetch_comparables

# DeepSeek — extracts structured data from raw listing text
extractor = Agent(
    OpenAIChatModel(
        "deepseek-chat",
        provider=OpenAIProvider(
            base_url="https://api.deepseek.com/v1",
            api_key=settings.deepseek_api_key,
        ),
    ),
    output_type=ListingExtraction,
    system_prompt="""You are a real estate data extraction specialist.
Extract structured apartment data from listing page text.
Rules:
- Convert MDL to EUR by dividing by 20 (approximate rate)
- Convert RON to EUR by dividing by 5 (approximate rate)
- price_per_m2 should be in EUR/m²
- For city, extract the actual city name (e.g. "Chisinau", "Bucharest", "Cluj-Napoca")
- For zone, extract neighbourhood/district (e.g. "Centru", "Botanica", "Sector 1")
- Return null for fields you cannot confidently determine""",
)

# Valuator — generates valuation verdict (DeepSeek)
valuator = Agent(
    OpenAIChatModel(
        "deepseek-chat",
        provider=OpenAIProvider(
            base_url="https://api.deepseek.com/v1",
            api_key=settings.deepseek_api_key,
        ),
    ),
    output_type=ValuationResult,
    system_prompt="""You are a real estate investment analyst specializing in Eastern European markets.
Analyze apartment listings from Moldova (999.md) and Romania (imobiliare.ro).

Market reference prices (EUR/m², 2025):
Moldova:
  - Chisinau Centru: 1100-1400
  - Chisinau Botanica/Riscani/Ciocana: 800-1000
  - Chisinau Telecentru/Buiucani: 900-1100
  - Chisinau suburbs/outskirts: 600-800
  - Other Moldovan cities: 400-700

Romania:
  - Bucharest Sector 1-2: 2000-2500
  - Bucharest Sector 3-4: 1400-1800
  - Bucharest Sector 5-6: 1100-1400
  - Cluj-Napoca center: 2000-2400
  - Cluj-Napoca periphery: 1400-1800
  - Iasi center: 1100-1400
  - Timisoara center: 1300-1700
  - Other Romanian cities: 800-1300

Classification thresholds:
  - price_deviation_pct < -15% → undervalued
  - price_deviation_pct > +15% → overvalued
  - otherwise → fair

Factors that justify premium: new building, renovated, top floor with view, parking, central zone
Factors that reduce value: ground floor, needs renovation, old communist block, noisy area""",
)


def _build_valuation_prompt(listing: ListingExtraction) -> str:
    return f"""Valuate this apartment listing:

City: {listing.city}
Zone: {listing.zone or "unknown"}
Price: {listing.price_eur} EUR
Size: {listing.size_m2} m²
Price per m²: {listing.price_per_m2} EUR/m²
Rooms: {listing.rooms}
Floor: {listing.floor}/{listing.total_floors}
Condition: {listing.condition}
Features: {", ".join(listing.features) if listing.features else "none listed"}"""


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
    extraction = await extractor.run(
        f"Extract apartment data from this listing:\nURL: {url}\n\n{listing_text}"
    )
    listing = extraction.output

    # Compute price_per_m2 if not extracted
    if listing.price_eur and listing.size_m2 and not listing.price_per_m2:
        listing.price_per_m2 = round(listing.price_eur / listing.size_m2)

    valuation_prompt = _build_valuation_prompt(listing)

    # Only fetch comparables for Moldovan/999.md listings
    is_moldovan = "999.md" in url or (listing.city or "").lower() in (
        "chisinau", "chișinău", "balti", "bălți", "cahul", "orhei", "soroca"
    )

    async def _empty() -> list:
        return []

    valuation_result, raw_comparables = await asyncio.gather(
        valuator.run(valuation_prompt),
        fetch_comparables(
            city=listing.city,
            zone=listing.zone,
            rooms=listing.rooms,
            size_m2=listing.size_m2,
        ) if is_moldovan else _empty(),
        return_exceptions=True,
    )

    # Handle exceptions from gather
    if isinstance(valuation_result, Exception):
        raise valuation_result
    raw_comparables = raw_comparables if not isinstance(raw_comparables, Exception) else []

    # Enrich comparables with deviation_pct
    comparables: list[ComparableListing] = []
    for raw in raw_comparables:
        dev = None
        if raw.get("price_per_m2") and listing.price_per_m2:
            dev = _compute_deviation_pct(raw["price_per_m2"], listing.price_per_m2)
        comparables.append(ComparableListing(**raw, deviation_pct=dev))

    zone_stats = _compute_zone_stats(comparables, listing.zone)

    return listing, valuation_result.output, comparables, zone_stats
