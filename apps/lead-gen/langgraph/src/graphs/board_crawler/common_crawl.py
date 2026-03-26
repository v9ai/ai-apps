"""Common Crawl CDX API interaction.

Ported from workers/ashby-crawler/src/common_crawl.rs.
Discovers ATS job boards from Common Crawl index data.
"""

from __future__ import annotations

import logging
import re

import httpx

logger = logging.getLogger(__name__)

CC_INDEX_URL = "https://index.commoncrawl.org"

# ATS URL patterns for board token extraction
ATS_PATTERNS: dict[str, re.Pattern] = {
    "ashby": re.compile(r"jobs\.ashbyhq\.com/([a-zA-Z0-9_-]+)"),
    "greenhouse": re.compile(r"boards\.greenhouse\.io/([a-zA-Z0-9_-]+)"),
    "workable": re.compile(r"apply\.workable\.com/([a-zA-Z0-9_-]+)"),
    "lever": re.compile(r"jobs\.lever\.co/([a-zA-Z0-9_-]+)"),
}

# CDX search URL patterns per provider
CDX_SEARCH_URLS: dict[str, str] = {
    "ashby": "jobs.ashbyhq.com/*",
    "greenhouse": "boards.greenhouse.io/*",
    "workable": "apply.workable.com/*",
    "lever": "jobs.lever.co/*",
}


def detect_latest_index() -> str:
    """Detect the latest Common Crawl index ID."""
    client = httpx.Client(timeout=30.0)
    resp = client.get(f"{CC_INDEX_URL}/collinfo.json")
    resp.raise_for_status()
    indexes = resp.json()
    if not indexes:
        raise RuntimeError("No Common Crawl indexes found")
    # First entry is the latest
    return indexes[0]["id"]


def crawl_cdx_page(
    index_id: str,
    provider: str,
    page: int = 0,
) -> list[dict]:
    """Crawl a single CDX page for a given ATS provider.

    Returns list of discovered boards with token, url, timestamp.
    """
    search_url = CDX_SEARCH_URLS.get(provider)
    if not search_url:
        raise ValueError(f"Unknown provider: {provider}")

    pattern = ATS_PATTERNS.get(provider)
    if not pattern:
        raise ValueError(f"No URL pattern for provider: {provider}")

    client = httpx.Client(timeout=60.0)
    resp = client.get(
        f"{CC_INDEX_URL}/{index_id}-index",
        params={
            "url": search_url,
            "output": "json",
            "page": page,
        },
    )

    if resp.status_code == 404:
        return []
    resp.raise_for_status()

    boards = []
    seen_tokens = set()

    for line in resp.text.strip().split("\n"):
        if not line.strip():
            continue
        try:
            import json
            record = json.loads(line)
            url = record.get("url", "")
            timestamp = record.get("timestamp", "")

            match = pattern.search(url)
            if not match:
                continue

            token = match.group(1).lower()
            if token in seen_tokens:
                continue
            seen_tokens.add(token)

            boards.append({
                "provider": provider,
                "token": token,
                "url": url,
                "timestamp": timestamp,
            })
        except (ValueError, KeyError) as e:
            logger.debug(f"Skipping CDX line: {e}")
            continue

    return boards
