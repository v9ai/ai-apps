"""Scrape + validate Blue Lagoon Resort Kos gallery images.

Run:
    uv run --with langchain-community --with beautifulsoup4 --with requests \
        scripts/scrape_blue_lagoon_images.py
"""
from __future__ import annotations

import concurrent.futures
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from langchain_community.document_loaders import WebBaseLoader

ROOT = Path(__file__).resolve().parent.parent
HOTELS_JSON = ROOT / "src" / "data" / "hotels_2026.json"
HOTEL_ID = "blue-lagoon-resort-kos"

PAGES = [
    "https://www.bluelagoonresort.gr/",
    "https://www.bluelagoonresort.gr/gallery/",
    "https://www.bluelagoonresort.gr/rooms/",
    "https://www.bluelagoonresort.gr/facilities/",
    "https://www.bluelagoonresort.gr/restaurants-bars/",
    "https://www.bluelagoonresort.gr/spa-wellness/",
]

IMG_EXT = re.compile(r"\.(?:jpe?g|png|webp)(?:\?.*)?$", re.I)
UPLOADS = re.compile(r"/wp-content/uploads/")
# Strip WordPress thumbnail suffixes like -150x150, -1024x683 to get originals
THUMB_SUFFIX = re.compile(r"-\d+x\d+(?=\.(?:jpe?g|png|webp)$)", re.I)
# Strip WP 6.1 "-scaled" variant (same image, 2560px downscale of original)
SCALED_SUFFIX = re.compile(r"-scaled(?=\.(?:jpe?g|png|webp)$)", re.I)


def extract_image_urls(page_url: str) -> set[str]:
    """Load a page via WebBaseLoader + BeautifulSoup, return absolute image URLs."""
    try:
        docs = WebBaseLoader(page_url).load()
    except Exception as e:
        print(f"  ! failed to load {page_url}: {e}", file=sys.stderr)
        return set()

    # WebBaseLoader's page_content is stripped text — re-fetch raw HTML for <img> tags
    resp = requests.get(page_url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    if resp.status_code != 200:
        print(f"  ! HTTP {resp.status_code} for {page_url}", file=sys.stderr)
        return set()

    soup = BeautifulSoup(resp.text, "html.parser")
    urls: set[str] = set()

    # <img src=...> and <img data-src=...> and srcset
    for img in soup.find_all("img"):
        for attr in ("src", "data-src", "data-lazy-src"):
            v = img.get(attr)
            if v:
                urls.add(urljoin(page_url, v))
        srcset = img.get("srcset") or img.get("data-srcset")
        if srcset:
            for piece in srcset.split(","):
                u = piece.strip().split()[0]
                if u:
                    urls.add(urljoin(page_url, u))

    # Any <a href> pointing directly at an image (lightbox links)
    for a in soup.find_all("a", href=True):
        if IMG_EXT.search(a["href"]):
            urls.add(urljoin(page_url, a["href"]))

    # Filter to uploads/ + image extension, and only same host
    host = urlparse(page_url).netloc
    filtered = {
        u for u in urls
        if UPLOADS.search(u)
        and IMG_EXT.search(u)
        and urlparse(u).netloc.endswith(host.replace("www.", ""))
    }
    return filtered


def strip_thumbnail(url: str) -> str:
    """Convert WP -WIDTHxHEIGHT thumbnails and -scaled variants to the original."""
    return SCALED_SUFFIX.sub("", THUMB_SUFFIX.sub("", url))


def validate(url: str) -> tuple[str, bool, str]:
    """HEAD check: must be 200 + image/* content-type."""
    try:
        r = requests.head(url, timeout=10, allow_redirects=True,
                          headers={"User-Agent": "Mozilla/5.0"})
        ct = r.headers.get("content-type", "")
        ok = r.status_code == 200 and ct.startswith("image/")
        return url, ok, f"{r.status_code} {ct}"
    except Exception as e:
        return url, False, f"error: {e}"


def main() -> int:
    print(f"Scraping {len(PAGES)} pages...")
    all_urls: set[str] = set()
    for page in PAGES:
        found = extract_image_urls(page)
        print(f"  {page}: {len(found)} images")
        all_urls.update(found)

    # Dedup via original (non-thumbnail) URL
    originals = {strip_thumbnail(u) for u in all_urls}
    print(f"\nTotal unique (post-thumbnail-strip): {len(originals)}")

    # Validate in parallel
    print("\nValidating each URL (HEAD request)...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        results = list(ex.map(validate, sorted(originals)))

    good = [u for u, ok, _ in results if ok]
    bad = [(u, info) for u, ok, info in results if not ok]

    print(f"  valid: {len(good)}")
    print(f"  broken: {len(bad)}")
    for u, info in bad[:10]:
        print(f"    - {u}  [{info}]")

    # Categorize for variety (max 3 per category)
    categories = [
        ("aerial",     r"DJI_"),
        ("exterior",   r"blue_lagoon_resort|Overview|Adults[-_]Only[-_]Building|entrance|Exterior"),
        ("main_pool",  r"MAIN[-_]POOL|Main[-_]Pool"),
        ("waterpark",  r"WATER[-_]PARK|Waterpark|water[-_]park|Splash|Slide"),
        ("room",       r"Twin|Family[-_]Room|Junior[-_]Suite|Family[-_]Suite|junior-suite|Adults[-_]Only[-_]room"),
        ("spa",        r"Spa|Sauna|Jacuzzi"),
        ("restaurant", r"restaurant|mesogios|Nisos|Athena"),
        ("bar",        r"bar|FAROS|Ilios|Piano"),
        ("beach",      r"beach"),
        ("sport",      r"Tennis|gym|Minigolf|Sport"),
        ("kids",       r"Kids[-_]Club|Children"),
    ]
    MAX_PER_CAT = 3

    buckets: dict[str, list[str]] = {name: [] for name, _ in categories}
    buckets["other"] = []
    for u in sorted(good):
        placed = False
        for name, pat in categories:
            if re.search(pat, u, re.I):
                buckets[name].append(u)
                placed = True
                break
        if not placed:
            buckets["other"].append(u)

    # Interleave: one from each category, round-robin, up to MAX_PER_CAT per category
    final: list[str] = []
    for round_i in range(MAX_PER_CAT):
        for name, _ in categories:
            if round_i < len(buckets[name]):
                final.append(buckets[name][round_i])
    # Cap
    final = final[:24]
    print(f"\nFinal gallery: {len(final)} images")
    for u in final:
        print(f"  {u}")

    # Patch hotels_2026.json
    data = json.loads(HOTELS_JSON.read_text())
    patched = False
    for entry in data:
        if entry["hotel"]["hotel_id"] == HOTEL_ID:
            entry["hotel"]["gallery"] = final
            entry["hotel"]["image_url"] = final[0] if final else None
            patched = True
            break

    if not patched:
        print(f"\n! Hotel {HOTEL_ID} not found in {HOTELS_JSON}", file=sys.stderr)
        return 1

    HOTELS_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"\nUpdated {HOTELS_JSON}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
