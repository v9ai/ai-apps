"""Generic hotel-image scraping subgraph.

Takes a set of seed URLs, harvests `<img>`/`srcset`/lightbox links via
WebBaseLoader + BeautifulSoup, deduplicates WP thumbnail variants,
HEAD-validates every URL (200 + image/*), and round-robin curates a
category-balanced gallery.

Registered as the `scrape_images` graph in `langgraph.json`.
"""
from __future__ import annotations

import concurrent.futures
import re
from typing import Optional, TypedDict
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from langchain_community.document_loaders import WebBaseLoader
from langgraph.graph import END, START, StateGraph

# ── Regex helpers ─────────────────────────────────────────────────────────

IMG_EXT = re.compile(r"\.(?:jpe?g|png|webp)(?:\?.*)?$", re.I)
UPLOADS = re.compile(r"/(?:wp-content/uploads|uploads|images|media|assets|photos)/", re.I)
# Strip WP thumbnail suffixes -WIDTHxHEIGHT and -scaled
THUMB_SUFFIX = re.compile(r"-\d+x\d+(?=\.(?:jpe?g|png|webp)$)", re.I)
SCALED_SUFFIX = re.compile(r"-scaled(?=\.(?:jpe?g|png|webp)$)", re.I)

# Minimal UA — some WAFs block full Chrome fingerprints, and this short form
# is accepted by Apache/nginx/Cloudflare defaults while still passing
# "looks like a browser" checks.
USER_AGENT = "Mozilla/5.0"

# Universal category patterns (case-insensitive). A URL/filename matching the
# pattern goes into that bucket; non-matches fall into "other" and still get
# included via round-robin.
DEFAULT_CATEGORY_PATTERNS: list[tuple[str, str]] = [
    ("aerial",     r"DJI_|drone|aerial"),
    ("exterior",   r"exterior|entrance|facade|overview|sunset|night|building"),
    ("pool",       r"pool|swimming"),
    ("waterpark",  r"waterpark|water[-_]park|slide|splash"),
    ("room",       r"room|suite|bedroom|villa|apartment"),
    ("spa",        r"spa|sauna|jacuzzi|wellness|massage"),
    ("restaurant", r"restaurant|dining"),
    ("bar",        r"\bbar\b|lounge|cocktail"),
    ("beach",      r"beach|seaside|shore|ocean"),
    ("fitness",    r"gym|fitness"),
    ("kids",       r"kids|children|family"),
]

# Default sub-paths to try when the caller only supplies a hotel root URL
DEFAULT_SUBPATHS = (
    "",
    "gallery/",
    "photos/",
    "rooms/",
    "accommodation/",
    "facilities/",
    "restaurants/",
    "restaurants-bars/",
    "spa/",
    "wellness/",
    "spa-wellness/",
)


# ── State ─────────────────────────────────────────────────────────────────


class ImageScraperState(TypedDict, total=False):
    # Input
    hotel_id: str
    seed_urls: list[str]
    root_url: Optional[str]           # if provided, auto-expands to DEFAULT_SUBPATHS
    max_images: int                   # default 24
    max_per_category: int             # default 3
    category_patterns: Optional[list[tuple[str, str]]]
    # Scratch
    raw_urls: list[str]
    canonical_urls: list[str]
    # Output
    valid_urls: list[str]
    broken_urls: list[tuple[str, str]]
    gallery: list[str]


# ── Nodes ─────────────────────────────────────────────────────────────────


def _expand_seeds(state: ImageScraperState) -> list[str]:
    seeds = list(state.get("seed_urls") or [])
    root = state.get("root_url")
    if root:
        if not root.endswith("/"):
            root += "/"
        for sub in DEFAULT_SUBPATHS:
            seeds.append(root + sub)
    # Dedup while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for u in seeds:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _harvest_image_urls(page_url: str) -> set[str]:
    """Fetch a page, parse with BeautifulSoup, return image URLs (same host + uploads)."""
    try:
        WebBaseLoader(page_url).load()  # primes cache + surfaces auth/loader issues
    except Exception:
        pass  # fall through to raw fetch

    try:
        resp = requests.get(
            page_url, timeout=15, headers={"User-Agent": USER_AGENT}
        )
    except Exception:
        return set()
    if resp.status_code != 200:
        return set()

    soup = BeautifulSoup(resp.text, "html.parser")
    urls: set[str] = set()

    for img in soup.find_all("img"):
        for attr in ("src", "data-src", "data-lazy-src", "data-original"):
            v = img.get(attr)
            if v:
                urls.add(urljoin(page_url, v))
        for ss_attr in ("srcset", "data-srcset"):
            srcset = img.get(ss_attr)
            if srcset:
                for piece in srcset.split(","):
                    u = piece.strip().split()[0]
                    if u:
                        urls.add(urljoin(page_url, u))

    for a in soup.find_all("a", href=True):
        if IMG_EXT.search(a["href"]):
            urls.add(urljoin(page_url, a["href"]))

    # Same-host + uploads/images path + image extension
    host = urlparse(page_url).netloc.replace("www.", "")
    return {
        u for u in urls
        if IMG_EXT.search(u)
        and UPLOADS.search(u)
        and urlparse(u).netloc.replace("www.", "").endswith(host)
    }


def scrape_pages(state: ImageScraperState) -> dict:
    seeds = _expand_seeds(state)
    all_urls: set[str] = set()
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for found in ex.map(_harvest_image_urls, seeds):
            all_urls.update(found)
    return {"raw_urls": sorted(all_urls)}


def dedup_urls(state: ImageScraperState) -> dict:
    def canonical(u: str) -> str:
        return SCALED_SUFFIX.sub("", THUMB_SUFFIX.sub("", u))

    canonical_set = {canonical(u) for u in state.get("raw_urls", [])}
    return {"canonical_urls": sorted(canonical_set)}


def _head_check(url: str) -> tuple[str, bool, str]:
    try:
        r = requests.head(
            url, timeout=10, allow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )
        ct = r.headers.get("content-type", "")
        ok = r.status_code == 200 and ct.startswith("image/")
        return url, ok, f"{r.status_code} {ct}"
    except Exception as e:
        return url, False, f"error: {type(e).__name__}"


def validate_urls(state: ImageScraperState) -> dict:
    urls = state.get("canonical_urls", [])
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        results = list(ex.map(_head_check, urls))
    valid = [u for u, ok, _ in results if ok]
    broken = [(u, info) for u, ok, info in results if not ok]
    return {"valid_urls": valid, "broken_urls": broken}


def curate_gallery(state: ImageScraperState) -> dict:
    valid = state.get("valid_urls", [])
    patterns = state.get("category_patterns") or DEFAULT_CATEGORY_PATTERNS
    max_total = state.get("max_images", 24)
    max_per = state.get("max_per_category", 3)

    buckets: dict[str, list[str]] = {name: [] for name, _ in patterns}
    buckets["other"] = []
    for u in sorted(valid):
        placed = False
        for name, pat in patterns:
            if re.search(pat, u, re.I):
                buckets[name].append(u)
                placed = True
                break
        if not placed:
            buckets["other"].append(u)

    gallery: list[str] = []
    for round_i in range(max_per):
        for name, _ in patterns:
            if round_i < len(buckets[name]):
                gallery.append(buckets[name][round_i])
        # Include "other" in each round too, so generic sites still get hits
        if round_i < len(buckets["other"]):
            gallery.append(buckets["other"][round_i])

    return {"gallery": gallery[:max_total]}


# ── Graph ─────────────────────────────────────────────────────────────────


def create_image_scraper_graph():
    builder = StateGraph(ImageScraperState)
    builder.add_node("scrape_pages", scrape_pages)
    builder.add_node("dedup_urls", dedup_urls)
    builder.add_node("validate_urls", validate_urls)
    builder.add_node("curate_gallery", curate_gallery)
    builder.add_edge(START, "scrape_pages")
    builder.add_edge("scrape_pages", "dedup_urls")
    builder.add_edge("dedup_urls", "validate_urls")
    builder.add_edge("validate_urls", "curate_gallery")
    builder.add_edge("curate_gallery", END)
    return builder.compile()


graph = create_image_scraper_graph()
