import json
import re
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ro,ru,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Canonical zone names for Chisinau — maps slugs and numbered sub-zones to a single form.
# Covers diacritic variants (ș/ț/ă/î/â), numbered sub-zones, and suburbs/satellite towns.
_ZONE_CANONICAL: dict[str, str] = {
    # --- Core Chisinau sectors ---
    "centru": "Centru", "centru 1": "Centru", "centru 2": "Centru", "centru 3": "Centru",
    "botanica": "Botanica", "botanica 1": "Botanica", "botanica 2": "Botanica", "botanica 3": "Botanica",
    "riscani": "Riscani", "riscani 1": "Riscani", "riscani 2": "Riscani",
    "râscani": "Riscani", "rîscani": "Riscani", "rîșcani": "Riscani", "râșcani": "Riscani",
    "rișcani": "Riscani",
    "ciocana": "Ciocana", "ciocana 1": "Ciocana", "ciocana 2": "Ciocana",
    "buiucani": "Buiucani", "buiucani 1": "Buiucani", "buiucani 2": "Buiucani",
    "telecentru": "Telecentru", "telecentru 1": "Telecentru", "telecentru 2": "Telecentru",
    "aeroport": "Aeroport",
    # --- Chisinau sub-zones and suburbs ---
    "sculeni": "Sculeni", "sculeanca": "Sculeni",
    "durlesti": "Durlesti", "durlești": "Durlesti",
    "codru": "Codru",
    "stauceni": "Stauceni", "stăuceni": "Stauceni",
    "poșta veche": "Posta Veche", "posta veche": "Posta Veche",
    "ghedenco": "Ghedenco",
    "melestiu": "Melestiu", "meleștiu": "Melestiu",
    "tohatin": "Tohatin",
    "cricova": "Cricova",
    "singera": "Singera", "sîngera": "Singera",
    "vatra": "Vatra",
    "colonita": "Colonita", "colonița": "Colonita",
    "gratiesti": "Gratiesti", "grătiești": "Gratiesti",
    "dumbrava": "Dumbrava",
    "truseni": "Truseni", "trușeni": "Truseni",
    "bacioi": "Bacioi",
    "budesti": "Budesti", "budești": "Budesti",
    "ialoveni": "Ialoveni",
}


def _canonicalize_zone(zone: str | None) -> str | None:
    """Normalize a raw zone string to a canonical neighborhood name.

    Handles numbered sub-zones ("Centru 1" → "Centru"), diacritic variants,
    and URL slugs so that DB storage and comparable matching stay consistent.
    """
    if not zone:
        return None
    key = zone.lower().strip()
    if key in _ZONE_CANONICAL:
        return _ZONE_CANONICAL[key]
    # Strip trailing digit suffix ("Botanica 3" → "Botanica")
    stripped = re.sub(r"\s+\d+$", "", key)
    if stripped in _ZONE_CANONICAL:
        return _ZONE_CANONICAL[stripped]
    return zone.strip().title()


def detect_source(url: str) -> str:
    domain = urlparse(url).netloc.lower()
    if "999.md" in domain:
        return "999md"
    elif "imobiliare.ro" in domain:
        return "imobiliare"
    return "unknown"


async def scrape_listing(url: str) -> dict:
    """Fetch a listing page and return cleaned text for LLM extraction."""
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()

    # Use the final URL after redirects as the canonical URL.
    # 999.md short URLs (e.g. /ro/103528157) redirect to full paths that carry city/zone segments.
    canonical_url = str(response.url)
    soup = BeautifulSoup(response.text, "lxml")
    source = detect_source(canonical_url)

    # Extract price, dates, title, and breadcrumb BEFORE decomposing.
    # Price/dates live in footer/aside; breadcrumb lives in <nav>; title may be in <header>.
    price_text = _extract_price_text(soup)
    listing_dates = _extract_listing_dates(soup)
    breadcrumb_zone, breadcrumb_text = _extract_breadcrumb_zone(soup)
    h1_el = soup.find("h1")
    h1_text = h1_el.get_text(strip=True) if h1_el else None

    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
        tag.decompose()

    if source == "999md":
        return _extract_999md(soup, canonical_url, price_text, listing_dates, breadcrumb_zone, breadcrumb_text, h1_text)
    elif source == "imobiliare":
        return _extract_imobiliare(soup, canonical_url)
    else:
        return {
            "source": "unknown",
            "url": canonical_url,
            "text": soup.get_text(separator="\n", strip=True)[:8000],
        }


def _extract_price_text(soup: BeautifulSoup) -> str | None:
    """Extract price text before any tags are decomposed.

    Prefers the element with the most info (e.g. includes €/m²).
    """
    best = None
    for el in soup.find_all(class_=lambda c: c and "price" in c.lower()):
        text = el.get_text(" ", strip=True)
        if any(ch.isdigit() for ch in text):
            if best is None or len(text) > len(best):
                best = text
    return best


def _extract_listing_dates(soup: BeautifulSoup) -> dict:
    """Extract 'listed since' and 'last updated' dates from 999.md listing."""
    dates = {}
    for el in soup.find_all(class_=lambda c: c and "register" in (c if isinstance(c, str) else " ".join(c)).lower()):
        text = el.get_text(strip=True)
        if text:
            dates["listed_since"] = text  # e.g. "Pe site din februarie 2025"
    for el in soup.find_all(class_=lambda c: c and "date" in (c if isinstance(c, str) else " ".join(c)).lower()):
        text = el.get_text(strip=True)
        if "actualizării" in text.lower() or "updated" in text.lower():
            dates["updated_at"] = text  # e.g. "Data actualizării:19 mar, 15:27"
    return dates


def _zone_from_999md_url(url: str) -> str | None:
    """Extract zone from 999.md URL path: /ro/imobil/apartamente/{city}/{zone}/{id}"""
    parts = urlparse(url).path.strip("/").split("/")
    # Expected: ["ro", "imobil", "apartamente", "{city}", "{zone}", "{listing_id}"]
    try:
        idx = parts.index("imobil")
        if idx + 3 < len(parts) and not parts[idx + 3].isdigit():
            return _canonicalize_zone(parts[idx + 3].replace("-", " "))
    except ValueError:
        pass
    return None


def _extract_breadcrumb_zone(soup: BeautifulSoup) -> tuple[str | None, str | None]:
    """Pre-extract zone and full breadcrumb text before <nav> elements are decomposed.

    Must be called before the soup.decompose() loop since 999.md breadcrumbs
    live inside <nav> tags which are removed during cleanup.

    Returns (canonical_zone, full_breadcrumb_text) or (None, None).
    """
    for crumb_el in soup.find_all(
        ["nav", "ol"],
        class_=lambda c: c and "breadcrumb" in (c if isinstance(c, str) else " ".join(c)).lower(),
    ):
        items = [li.get_text(strip=True) for li in crumb_el.find_all("li") if li.get_text(strip=True)]
        if len(items) < 3:
            continue
        full_text = " > ".join(items)
        # 999.md breadcrumb: [Home, "Imobil", "Apartamente", "Chișinău", "Botanica", ...]
        # Zone is the 5th item (index 4) when present and not a listing title
        if len(items) >= 5:
            candidate = items[4]
            if len(candidate) <= 30 and not candidate[0].isdigit():
                return _canonicalize_zone(candidate), full_text
        # Fallback: zone embedded in the last breadcrumb item title
        # e.g. "Apartament cu 1 camera, Aeroport, Chisinau, Chisinau mun."
        if len(items) >= 3:
            last_item = items[-1]
            for part in last_item.split(","):
                key = part.strip().lower()
                if key in _ZONE_CANONICAL:
                    return _ZONE_CANONICAL[key], full_text
        return None, full_text
    return None, None


def _extract_999md(
    soup: BeautifulSoup,
    url: str,
    price_text: str | None = None,
    listing_dates: dict | None = None,
    breadcrumb_zone: str | None = None,
    breadcrumb_text: str | None = None,
    h1_text: str | None = None,
) -> dict:
    blocks = []

    # Zone hint: canonical URL path takes priority, pre-extracted breadcrumb as fallback.
    # Both are extracted before <nav>/<footer> decomposition in scrape_listing().
    zone_hint = _zone_from_999md_url(url)
    if zone_hint:
        blocks.append(f"Zone (from URL): {zone_hint}")
    elif breadcrumb_zone:
        blocks.append(f"Zone (from breadcrumb): {breadcrumb_zone}")
    elif h1_text:
        # Last resort: extract zone from H1 title (e.g. "Apartament cu 1 camera, Aeroport, Chisinau")
        for part in h1_text.split(","):
            key = part.strip().lower()
            if key in _ZONE_CANONICAL:
                blocks.append(f"Zone (from title): {_ZONE_CANONICAL[key]}")
                break

    # Title (pre-extracted before <header> decompose, with post-decompose fallback)
    title = soup.find("h1")
    title_text = h1_text or (title.get_text(strip=True) if title else None)
    if title_text:
        blocks.append(f"Title: {title_text}")

    # Price (pre-extracted before footer decompose)
    if price_text:
        blocks.append(f"Price: {price_text}")

    # Listing dates
    if listing_dates:
        if listing_dates.get("listed_since"):
            blocks.append(f"Listed: {listing_dates['listed_since']}")
        if listing_dates.get("updated_at"):
            blocks.append(f"Updated: {listing_dates['updated_at']}")

    # Breadcrumb text (pre-extracted before <nav> was removed — dead code path removed)
    if breadcrumb_text:
        blocks.insert(1, f"Breadcrumb: {breadcrumb_text}")

    # JSON-LD structured data — may contain location.name, address components
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string or "")
            if isinstance(ld, dict) and "address" in ld and isinstance(ld["address"], dict):
                addr = ld["address"]
                parts = [addr.get("streetAddress", ""), addr.get("addressLocality", ""), addr.get("addressRegion", "")]
                addr_text = " ".join(p for p in parts if p)
                if addr_text.strip():
                    blocks.insert(1, f"Address (JSON-LD): {addr_text.strip()}")
        except (json.JSONDecodeError, TypeError):
            pass

    # Characteristics table (key-value rows)
    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True)
            val = cells[1].get_text(strip=True)
            if key and val:
                blocks.append(f"{key}: {val}")

    # 999.md new layout: <li class="styles_group__feature__*"> with
    # <span class="styles_group__key__*"> for label and remaining text as value
    for feature_el in soup.find_all(
        "li",
        class_=lambda c: c and ("feature" in (c if isinstance(c, str) else " ".join(c)).lower()),
    ):
        key_el = feature_el.find(
            "span",
            class_=lambda c: c and "key" in (c if isinstance(c, str) else " ".join(c)).lower(),
        )
        if key_el:
            key = key_el.get_text(strip=True)
            # Value is everything in the <li> except the key span
            key_el.decompose()
            val = feature_el.get_text(strip=True)
            if key and val:
                blocks.append(f"{key}: {val}")

    # Address element (999.md uses class containing "address")
    for addr_el in soup.find_all(
        class_=lambda c: c and "address" in (c if isinstance(c, str) else " ".join(c)).lower(),
    ):
        addr_text = addr_el.get_text(strip=True)
        if addr_text and len(addr_text) > 5:
            blocks.append(f"Address: {addr_text}")
            break

    # Description
    for cls in ["descr", "description", "js-description"]:
        desc = soup.find(class_=lambda c: c and cls in c.lower())
        if desc:
            blocks.append(f"Description: {desc.get_text(separator=' ', strip=True)[:1500]}")
            break

    # Fallback to main content
    if len(blocks) < 4:
        main = soup.find("main") or soup.find(id="main") or soup.body
        if main:
            blocks.append(main.get_text(separator="\n", strip=True)[:6000])

    return {"source": "999md", "url": url, "text": "\n".join(blocks)}


def _extract_imobiliare(soup: BeautifulSoup, url: str) -> dict:
    blocks = []

    title = soup.find("h1")
    if title:
        blocks.append(f"Title: {title.get_text(strip=True)}")

    # Price
    for el in soup.find_all(class_=lambda c: c and ("price" in c.lower() or "pret" in c.lower())):
        text = el.get_text(strip=True)
        if any(ch.isdigit() for ch in text):
            blocks.append(f"Price: {text}")
            break

    # Property detail lists
    for el in soup.find_all(["ul", "dl", "table"]):
        for item in el.find_all(["li", "dt", "dd", "tr"]):
            text = item.get_text(strip=True)
            if text and len(text) < 300:
                blocks.append(text)

    # Description
    for cls in ["description", "descriere", "caracteristici", "detalii"]:
        desc = soup.find(class_=lambda c: c and cls in c.lower())
        if desc:
            blocks.append(f"Description: {desc.get_text(separator=' ', strip=True)[:1500]}")
            break

    if len(blocks) < 4:
        main = soup.find("main") or soup.find(id="content") or soup.body
        if main:
            blocks.append(main.get_text(separator="\n", strip=True)[:6000])

    return {"source": "imobiliare", "url": url, "text": "\n".join(blocks)}
