"""Fetch comparable listings from imobiliare.ro search results (HTML scraping)."""

import asyncio
import re
import logging
import statistics
import httpx
from bs4 import BeautifulSoup, Tag
from .models import ComparableListing, ZoneStats
from .scraper import HEADERS

logger = logging.getLogger(__name__)

BASE_URL = "https://www.imobiliare.ro/vanzare-apartamente"

# City slug mapping for imobiliare.ro URL construction
CITY_SLUGS = {
    "bucuresti": "bucuresti",
    "bucharest": "bucuresti",
    "cluj-napoca": "cluj-napoca",
    "cluj": "cluj-napoca",
    "timisoara": "timisoara",
    "iasi": "iasi",
    "constanta": "constanta",
    "brasov": "brasov",
    "sibiu": "sibiu",
    "oradea": "oradea",
    "craiova": "craiova",
    "galati": "galati",
    "ploiesti": "ploiesti",
    "arad": "arad",
    "pitesti": "pitesti",
    "targu-mures": "targu-mures",
    "baia-mare": "baia-mare",
    "buzau": "buzau",
    "satu-mare": "satu-mare",
    "alba-iulia": "alba-iulia",
}

# Rooms → imobiliare.ro query param value
ROOM_PARAMS = {1: "1", 2: "2", 3: "3", 4: "4"}

MAX_RETRIES = 3
BACKOFF_BASE = 2.0  # seconds


def _normalize_city(city: str) -> str:
    """Normalize city name to imobiliare.ro URL slug."""
    slug = city.lower().strip()
    # Remove diacritics for matching
    slug = (
        slug.replace("ș", "s").replace("ț", "t").replace("ă", "a")
        .replace("â", "a").replace("î", "i")
        .replace("ş", "s").replace("ţ", "t")
    )
    slug = slug.replace(" ", "-")
    return CITY_SLUGS.get(slug, slug)


def _build_search_url(city: str, rooms: int | None, size_m2: float | None) -> str:
    """Construct imobiliare.ro search URL from parameters."""
    city_slug = _normalize_city(city)
    url = f"{BASE_URL}/{city_slug}"

    params = []
    if rooms and rooms in ROOM_PARAMS:
        params.append(f"nr-camere={ROOM_PARAMS[rooms]}")

    # Add size range filter: ±20% around target size
    if size_m2 and size_m2 > 0:
        min_size = max(10, int(size_m2 * 0.8))
        max_size = int(size_m2 * 1.2)
        params.append(f"mp-min={min_size}")
        params.append(f"mp-max={max_size}")

    if params:
        url += "?" + "&".join(params)
    return url


def _parse_price_eur(text: str) -> int | None:
    """Extract price in EUR from price text. Handles EUR and RON."""
    if not text:
        return None

    text = text.strip()

    # Remove thousands separators and normalize
    cleaned = text.replace(".", "").replace(",", "").replace(" ", "")

    # Try to find a numeric value
    match = re.search(r"(\d+)", cleaned)
    if not match:
        return None

    try:
        value = int(match.group(1))
    except (ValueError, TypeError):
        return None

    if value < 100:
        return None

    # Detect currency — RON prices are typically much larger numerically
    text_lower = text.lower()
    is_ron = "ron" in text_lower or "lei" in text_lower
    is_eur = "eur" in text_lower or "\u20ac" in text

    if is_ron:
        value = int(value / 5)
    elif not is_eur:
        # Heuristic: if price > 500_000, likely RON
        if value > 500_000:
            value = int(value / 5)

    return value if value >= 1000 else None


def _parse_size_m2(text: str) -> float | None:
    """Extract size in m2 from text."""
    if not text:
        return None
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*m", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1).replace(",", "."))
        except ValueError:
            pass
    # Fallback: plain number
    m = re.search(r"(\d+(?:[.,]\d+)?)", text)
    if m:
        try:
            val = float(m.group(1).replace(",", "."))
            if 10 <= val <= 500:
                return val
        except ValueError:
            pass
    return None


def _parse_rooms_from_text(text: str) -> int | None:
    """Extract room count from text."""
    if not text:
        return None
    m = re.search(r"(\d+)\s*camer", text, re.IGNORECASE)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    # "garsoniera" / "garsoniere" = 1 room
    if "garsonier" in text.lower():
        return 1
    return None


def _extract_listing_card(card: Tag) -> dict | None:
    """Parse a single listing card from imobiliare.ro search results.

    imobiliare.ro uses various card layouts. We try multiple CSS class
    patterns to find price, size, rooms, zone, and URL.
    """
    result: dict = {}

    # --- Title ---
    title_el = card.find(["h2", "h3", "h4"]) or card.find("a", class_=lambda c: c and "title" in c.lower())
    if title_el:
        result["title"] = title_el.get_text(strip=True)[:120]
    else:
        # Fallback: first link text
        link = card.find("a")
        if link:
            result["title"] = link.get_text(strip=True)[:120]

    if not result.get("title"):
        return None

    # --- URL ---
    link_el = card.find("a", href=True)
    if link_el:
        href = link_el["href"]
        if href.startswith("/"):
            result["url"] = f"https://www.imobiliare.ro{href}"
        elif href.startswith("http"):
            result["url"] = href

    # --- Price ---
    price_el = card.find(class_=lambda c: c and ("price" in c.lower() or "pret" in c.lower()))
    if price_el:
        price_eur = _parse_price_eur(price_el.get_text())
        if price_eur:
            result["price_eur"] = price_eur
    else:
        # Fallback: search entire card text for price patterns
        card_text = card.get_text()
        price_match = re.search(r"(\d[\d\s.]*)\s*(EUR|\u20ac|RON|lei)", card_text, re.IGNORECASE)
        if price_match:
            price_eur = _parse_price_eur(price_match.group(0))
            if price_eur:
                result["price_eur"] = price_eur

    if not result.get("price_eur"):
        return None

    # --- Size (m2) ---
    # Look for characteristic items containing "m²" or "mp"
    card_text = card.get_text(" ", strip=True)
    size_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:m[²2p]|mp)", card_text, re.IGNORECASE)
    if size_match:
        try:
            result["size_m2"] = float(size_match.group(1).replace(",", "."))
        except ValueError:
            pass

    # Also look in specific characteristic/detail elements
    if not result.get("size_m2"):
        for el in card.find_all(class_=lambda c: c and any(
            kw in c.lower() for kw in ("suprafata", "surface", "charact", "detail", "info")
        )):
            text = el.get_text()
            parsed = _parse_size_m2(text)
            if parsed:
                result["size_m2"] = parsed
                break

    # --- Rooms ---
    rooms_match = re.search(r"(\d+)\s*camer", card_text, re.IGNORECASE)
    if rooms_match:
        try:
            result["rooms"] = int(rooms_match.group(1))
        except ValueError:
            pass
    elif "garsonier" in card_text.lower():
        result["rooms"] = 1

    if not result.get("rooms"):
        # Try to extract from title
        result["rooms"] = _parse_rooms_from_text(result.get("title", ""))

    # --- Zone ---
    zone_el = card.find(class_=lambda c: c and any(
        kw in c.lower() for kw in ("zona", "zone", "location", "locatie", "address", "localitate")
    ))
    if zone_el:
        result["zone"] = zone_el.get_text(strip=True)[:80]
    else:
        # Try to extract zone from title or subtitle
        zone_match = re.search(r"zona\s+([A-Z\u0100-\u024F][\w\s\-]+)", card_text, re.IGNORECASE)
        if zone_match:
            result["zone"] = zone_match.group(1).strip()[:80]

    # --- Price per m2 ---
    if result.get("price_eur") and result.get("size_m2") and result["size_m2"] > 0:
        result["price_per_m2"] = round(result["price_eur"] / result["size_m2"])
    else:
        # Try to find explicit price/m2 in card
        ppm2_match = re.search(r"(\d[\d\s.]*)\s*(?:EUR|\u20ac)\s*/\s*m", card_text, re.IGNORECASE)
        if ppm2_match:
            try:
                ppm2_text = ppm2_match.group(1).replace(".", "").replace(" ", "")
                result["price_per_m2"] = int(ppm2_text)
            except ValueError:
                pass

    return result


def _extract_listings_from_html(html: str) -> list[dict]:
    """Parse imobiliare.ro search results HTML and extract listing cards."""
    soup = BeautifulSoup(html, "lxml")
    listings: list[dict] = []

    # imobiliare.ro listing cards — try multiple selectors
    # Common patterns: div.box-anunt, div.listing-item, article, li with listing classes
    card_selectors = [
        {"class_": lambda c: c and "anunt" in " ".join(c).lower()},
        {"class_": lambda c: c and "listing" in " ".join(c).lower()},
        {"class_": lambda c: c and "oferta" in " ".join(c).lower()},
        {"class_": lambda c: c and "property" in " ".join(c).lower()},
    ]

    cards: list[Tag] = []
    for selector in card_selectors:
        found = soup.find_all("div", **selector)
        if not found:
            found = soup.find_all("article", **selector)
        if not found:
            found = soup.find_all("li", **selector)
        if found:
            cards = found
            break

    # Fallback: look for any container with links to listing detail pages
    if not cards:
        # imobiliare.ro detail URLs usually contain /vanzare-apartamente/ or /inchiriere-apartamente/
        links = soup.find_all("a", href=re.compile(r"/vanzare-apartament|/apartament-de-vanzare"))
        seen_parents: set[int] = set()
        for link in links:
            parent = link.find_parent(["div", "article", "li", "section"])
            if parent and id(parent) not in seen_parents:
                seen_parents.add(id(parent))
                cards.append(parent)

    logger.debug("Found %d listing cards on imobiliare.ro search page", len(cards))

    for card in cards:
        parsed = _extract_listing_card(card)
        if parsed:
            listings.append(parsed)

    return listings


def _score_relevance(
    comp: dict,
    zone: str | None,
    rooms: int | None,
    size_m2: float | None,
) -> float:
    """Score how relevant a comparable is to the target listing (0.0 - 1.0)."""
    score = 0.0
    comp_zone = (comp.get("zone") or "").lower()
    target_zone = (zone or "").lower()

    if target_zone and comp_zone:
        if comp_zone == target_zone:
            score += 0.5
        elif target_zone in comp_zone or comp_zone in target_zone:
            score += 0.3

    if rooms and comp.get("rooms") == rooms:
        score += 0.2

    if size_m2 and comp.get("size_m2"):
        ratio = comp["size_m2"] / size_m2
        if 0.8 <= ratio <= 1.2:
            score += 0.3

    return score


def _compute_zone_stats(
    comparables: list[ComparableListing],
    zone: str | None,
) -> ZoneStats | None:
    """Compute zone-level price statistics from comparables."""
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


async def _fetch_with_retry(url: str) -> httpx.Response:
    """Fetch URL with exponential backoff retry (3 attempts)."""
    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(
                headers=HEADERS,
                follow_redirects=True,
                timeout=30.0,
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                return resp
        except Exception as exc:
            last_exc = exc
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** (attempt + 1)
                logger.debug(
                    "Retry %d/%d for %s after %.1fs (%s)",
                    attempt + 1, MAX_RETRIES, url, wait, exc,
                )
                await asyncio.sleep(wait)
    raise last_exc  # type: ignore[misc]


async def fetch_comparables_ro(
    city: str,
    rooms: int,
    size_m2: float,
    zone: str | None = None,
    max_results: int = 6,
) -> tuple[list[ComparableListing], ZoneStats | None]:
    """Fetch comparable listings from imobiliare.ro.

    Returns (comparables, zone_stats). On any error returns ([], None).
    """
    try:
        url = _build_search_url(city, rooms, size_m2)
        logger.info("Fetching imobiliare.ro comparables: %s", url)

        resp = await _fetch_with_retry(url)
        raw_listings = _extract_listings_from_html(resp.text)

        if not raw_listings:
            logger.warning("No listings extracted from imobiliare.ro search: %s", url)
            return [], None

        logger.info("Extracted %d raw listings from imobiliare.ro", len(raw_listings))

        # Filter out listings without price_per_m2 (needed for meaningful comparison)
        valid = [r for r in raw_listings if r.get("price_per_m2")]

        # Score by relevance and sort descending
        scored = sorted(
            valid,
            key=lambda c: _score_relevance(c, zone, rooms, size_m2),
            reverse=True,
        )

        # Take top N results
        top = scored[:max_results]

        # Convert to ComparableListing models
        comparables: list[ComparableListing] = []
        for raw in top:
            comparables.append(
                ComparableListing(
                    title=raw.get("title", ""),
                    price_eur=raw.get("price_eur"),
                    size_m2=raw.get("size_m2"),
                    price_per_m2=raw.get("price_per_m2"),
                    rooms=raw.get("rooms"),
                    zone=raw.get("zone"),
                    url=raw.get("url"),
                    source="imobiliare",
                )
            )

        zone_stats = _compute_zone_stats(comparables, zone)
        return comparables, zone_stats

    except Exception as exc:
        logger.warning("fetch_comparables_ro failed: %s", exc)
        return [], None
