"""Fetch comparable listings from 999.md search results via __NEXT_DATA__ JSON."""

import json
import re
import logging
import httpx
from bs4 import BeautifulSoup
from .scraper import HEADERS

logger = logging.getLogger(__name__)

BASE_URL = "https://999.md/ro/list/real-estate/apartments-and-rooms"

# Mapping rooms → 999.md exo_241 param value
ROOM_PARAMS = {1: "893", 2: "894", 3: "902", 4: "904"}

# 999.md exo_1=777 means "for sale"
LISTING_TYPE_PARAMS = {"sale": "777", "rent": "778"}


def _build_search_url(rooms: int | None, listing_type: str = "sale") -> str:
    params = []
    type_code = LISTING_TYPE_PARAMS.get(listing_type, "777")
    params.append(f"exo_1={type_code}")
    if rooms and rooms in ROOM_PARAMS:
        params.append(f"exo_241={ROOM_PARAMS[rooms]}")
    return f"{BASE_URL}?{'&'.join(params)}"


def _extract_items(data: dict) -> list:
    page_props = data.get("props", {}).get("pageProps", {})
    candidates = [
        page_props.get("items"),
        page_props.get("initialData", {}).get("items") if isinstance(page_props.get("initialData"), dict) else None,
        page_props.get("initialReduxState", {}).get("listing", {}).get("items")
        if isinstance(page_props.get("initialReduxState"), dict) else None,
    ]
    for path in candidates:
        if isinstance(path, list) and path:
            return path

    # Debug: log top-level keys to help discover the correct path
    logger.debug("__NEXT_DATA__ pageProps keys: %s", list(page_props.keys()))
    return []


def _parse_price_eur(item: dict) -> int | None:
    """Extract price in EUR from an item dict."""
    price_raw = item.get("price") or item.get("price_eur") or item.get("priceEur")
    if price_raw is None:
        # Try nested structures
        price_obj = item.get("priceObject") or item.get("price_object") or {}
        if isinstance(price_obj, dict):
            price_raw = price_obj.get("value") or price_obj.get("eur")
            currency = (price_obj.get("currency") or "").upper()
        else:
            return None
    else:
        currency = (item.get("currency") or item.get("priceCurrency") or "EUR").upper()

    try:
        val = float(str(price_raw).replace(" ", "").replace(",", "."))
    except (ValueError, TypeError):
        return None

    if val < 100:
        return None

    if currency == "MDL":
        val = val / 20
    elif currency == "RON":
        val = val / 5

    price_eur = int(val)
    return price_eur if price_eur >= 1000 else None


def _parse_size_m2(item: dict) -> float | None:
    """Extract size in m² from item dict fields or title."""
    for key in ("size", "area", "size_m2", "totalArea", "total_area"):
        v = item.get(key)
        if v is not None:
            try:
                return float(v)
            except (ValueError, TypeError):
                pass

    # Fallback: regex on title
    title = item.get("title") or item.get("name") or ""
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*m[²2]", str(title), re.IGNORECASE)
    if m:
        try:
            return float(m.group(1).replace(",", "."))
        except ValueError:
            pass
    return None


def _parse_rooms(item: dict) -> int | None:
    for key in ("rooms", "roomsCount", "rooms_count", "numberOfRooms"):
        v = item.get(key)
        if v is not None:
            try:
                return int(v)
            except (ValueError, TypeError):
                pass
    return None


def _parse_zone(item: dict) -> str | None:
    for key in ("zone", "district", "neighbourhood", "neighborhood", "region", "address"):
        v = item.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
        if isinstance(v, dict):
            name = v.get("name") or v.get("title")
            if name:
                return str(name).strip()
    return None


def _parse_url(item: dict) -> str | None:
    slug = item.get("url") or item.get("slug") or item.get("link") or item.get("href")
    if not slug:
        item_id = item.get("id") or item.get("itemId")
        if item_id:
            slug = f"/ro/ads/{item_id}"
    if slug:
        if slug.startswith("http"):
            return slug
        return f"https://999.md{slug}"
    return None


def _normalize_item(item: dict) -> dict | None:
    price_eur = _parse_price_eur(item)
    if price_eur is None:
        return None

    size_m2 = _parse_size_m2(item)
    price_per_m2 = round(price_eur / size_m2) if size_m2 and size_m2 > 0 else None

    return {
        "title": str(item.get("title") or item.get("name") or "")[:120],
        "price_eur": price_eur,
        "size_m2": size_m2,
        "price_per_m2": price_per_m2,
        "rooms": _parse_rooms(item),
        "zone": _parse_zone(item),
        "url": _parse_url(item),
    }


def _score_relevance(comp: dict, zone: str | None, rooms: int | None, size_m2: float | None) -> float:
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


async def fetch_comparables(
    city: str | None,
    zone: str | None,
    rooms: int | None,
    size_m2: float | None,
    listing_type: str = "sale",
    max_results: int = 6,
) -> list[dict]:
    """Fetch comparable listings from 999.md. Returns [] on any error."""
    try:
        url = _build_search_url(rooms, listing_type)
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=20.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        script = soup.find("script", id="__NEXT_DATA__")
        if not script or not script.string:
            logger.warning("__NEXT_DATA__ script not found on %s", url)
            return []

        data = json.loads(script.string)
        raw_items = _extract_items(data)
        if not raw_items:
            logger.warning("No items found in __NEXT_DATA__ for %s", url)
            return []

        normalized = [_normalize_item(it) for it in raw_items]
        valid = [c for c in normalized if c is not None]

        # Sort by relevance score descending
        scored = sorted(valid, key=lambda c: _score_relevance(c, zone, rooms, size_m2), reverse=True)
        return scored[:max_results]

    except Exception as exc:
        logger.warning("fetch_comparables failed: %s", exc)
        return []
