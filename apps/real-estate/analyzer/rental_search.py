"""Fetch rental listings from 999.md and imobiliare.ro."""

import json
import re
import logging
import asyncio
import httpx
from bs4 import BeautifulSoup, Tag
from .scraper import HEADERS
from .scraper_search import (
    _build_search_url,
    _extract_items,
    _parse_price_eur,
    _parse_size_m2,
    _parse_rooms,
    _parse_zone,
    _parse_url,
    _score_relevance,
)
from .scraper_search_ro import (
    _normalize_city,
    _parse_size_m2 as _parse_size_m2_ro,
    _parse_rooms_from_text,
    _fetch_with_retry,
    CITY_SLUGS,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 999.md rentals
# ---------------------------------------------------------------------------

def _normalize_rental_item(item: dict) -> dict | None:
    """Parse a 999.md rental item into a normalized dict."""
    price_eur = _parse_price_eur(item)
    if price_eur is None:
        return None

    size_m2 = _parse_size_m2(item)
    rent_per_m2 = round(price_eur / size_m2, 1) if size_m2 and size_m2 > 0 else None

    return {
        "title": str(item.get("title") or item.get("name") or "")[:120],
        "monthly_rent_eur": price_eur,
        "size_m2": size_m2,
        "rent_per_m2": rent_per_m2,
        "rooms": _parse_rooms(item),
        "zone": _parse_zone(item),
        "url": _parse_url(item),
    }


async def fetch_rental_comparables(
    city: str | None,
    zone: str | None,
    rooms: int | None,
    size_m2: float | None,
    max_results: int = 10,
) -> list[dict]:
    """Fetch rental listings from 999.md using listing_type='rent'."""
    try:
        url = _build_search_url(rooms, listing_type="rent")
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=20.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        script = soup.find("script", id="__NEXT_DATA__")
        if not script or not script.string:
            logger.warning("__NEXT_DATA__ script not found for rental search")
            return []

        data = json.loads(script.string)
        raw_items = _extract_items(data)
        if not raw_items:
            logger.warning("No rental items found in __NEXT_DATA__")
            return []

        normalized = [_normalize_rental_item(it) for it in raw_items]
        valid = [c for c in normalized if c is not None]

        scored = sorted(
            valid,
            key=lambda c: _score_relevance(c, zone, rooms, size_m2),
            reverse=True,
        )
        return scored[:max_results]

    except Exception as exc:
        logger.warning("fetch_rental_comparables failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# imobiliare.ro rentals
# ---------------------------------------------------------------------------

RENTAL_BASE_URL = "https://www.imobiliare.ro/inchirieri-apartamente"


def _build_rental_search_url_ro(city: str, rooms: int | None, size_m2: float | None) -> str:
    city_slug = _normalize_city(city)
    url = f"{RENTAL_BASE_URL}/{city_slug}"
    params = []
    if rooms:
        params.append(f"nr-camere={rooms}")
    if size_m2 and size_m2 > 0:
        min_size = max(10, int(size_m2 * 0.8))
        max_size = int(size_m2 * 1.2)
        params.append(f"mp-min={min_size}")
        params.append(f"mp-max={max_size}")
    if params:
        url += "?" + "&".join(params)
    return url


def _parse_rental_price_eur(text: str) -> int | None:
    """Extract monthly rental price in EUR from text."""
    if not text:
        return None
    cleaned = text.replace(".", "").replace(",", "").replace(" ", "")
    match = re.search(r"(\d+)", cleaned)
    if not match:
        return None
    try:
        value = int(match.group(1))
    except (ValueError, TypeError):
        return None
    if value < 10:
        return None

    text_lower = text.lower()
    is_ron = "ron" in text_lower or "lei" in text_lower
    if is_ron:
        value = int(value / 5)

    # Rental prices are typically 100-5000 EUR/month
    return value if 50 <= value <= 10000 else None


def _extract_rental_card_ro(card: Tag) -> dict | None:
    """Parse a rental listing card from imobiliare.ro."""
    result: dict = {}

    title_el = card.find(["h2", "h3", "h4"]) or card.find(
        "a", class_=lambda c: c and "title" in c.lower()
    )
    if title_el:
        result["title"] = title_el.get_text(strip=True)[:120]
    else:
        link = card.find("a")
        if link:
            result["title"] = link.get_text(strip=True)[:120]
    if not result.get("title"):
        return None

    link_el = card.find("a", href=True)
    if link_el:
        href = link_el["href"]
        if href.startswith("/"):
            result["url"] = f"https://www.imobiliare.ro{href}"
        elif href.startswith("http"):
            result["url"] = href

    price_el = card.find(
        class_=lambda c: c and ("price" in c.lower() or "pret" in c.lower())
    )
    if price_el:
        rent = _parse_rental_price_eur(price_el.get_text())
        if rent:
            result["monthly_rent_eur"] = rent
    else:
        card_text = card.get_text()
        price_match = re.search(
            r"(\d[\d\s.]*)\s*(EUR|\u20ac|RON|lei)", card_text, re.IGNORECASE
        )
        if price_match:
            rent = _parse_rental_price_eur(price_match.group(0))
            if rent:
                result["monthly_rent_eur"] = rent

    if not result.get("monthly_rent_eur"):
        return None

    card_text = card.get_text(" ", strip=True)
    size_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:m[²2p]|mp)", card_text, re.IGNORECASE)
    if size_match:
        try:
            result["size_m2"] = float(size_match.group(1).replace(",", "."))
        except ValueError:
            pass

    rooms_match = re.search(r"(\d+)\s*camer", card_text, re.IGNORECASE)
    if rooms_match:
        try:
            result["rooms"] = int(rooms_match.group(1))
        except ValueError:
            pass
    elif "garsonier" in card_text.lower():
        result["rooms"] = 1

    zone_el = card.find(
        class_=lambda c: c
        and any(kw in c.lower() for kw in ("zona", "zone", "location", "locatie", "address"))
    )
    if zone_el:
        result["zone"] = zone_el.get_text(strip=True)[:80]

    if result.get("monthly_rent_eur") and result.get("size_m2") and result["size_m2"] > 0:
        result["rent_per_m2"] = round(result["monthly_rent_eur"] / result["size_m2"], 1)

    return result


def _extract_rental_listings_ro(html: str) -> list[dict]:
    """Parse imobiliare.ro rental search results."""
    soup = BeautifulSoup(html, "lxml")
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

    if not cards:
        links = soup.find_all(
            "a", href=re.compile(r"/inchiriere-apartament|/apartament-de-inchiriat")
        )
        seen_parents: set[int] = set()
        for link in links:
            parent = link.find_parent(["div", "article", "li", "section"])
            if parent and id(parent) not in seen_parents:
                seen_parents.add(id(parent))
                cards.append(parent)

    listings: list[dict] = []
    for card in cards:
        parsed = _extract_rental_card_ro(card)
        if parsed:
            listings.append(parsed)
    return listings


async def fetch_rental_comparables_ro(
    city: str,
    rooms: int,
    size_m2: float,
    zone: str | None = None,
    max_results: int = 10,
) -> list[dict]:
    """Fetch rental listings from imobiliare.ro."""
    try:
        url = _build_rental_search_url_ro(city, rooms, size_m2)
        logger.info("Fetching imobiliare.ro rental comparables: %s", url)

        resp = await _fetch_with_retry(url)
        raw_listings = _extract_rental_listings_ro(resp.text)

        if not raw_listings:
            logger.warning("No rental listings from imobiliare.ro: %s", url)
            return []

        logger.info("Extracted %d rental listings from imobiliare.ro", len(raw_listings))

        scored = sorted(
            raw_listings,
            key=lambda c: _score_relevance(
                {**c, "price_eur": c.get("monthly_rent_eur")},
                zone, rooms, size_m2,
            ),
            reverse=True,
        )
        return scored[:max_results]

    except Exception as exc:
        logger.warning("fetch_rental_comparables_ro failed: %s", exc)
        return []
