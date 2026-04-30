"""Rebrickable URL parsing + MOC alternates fetching."""

from __future__ import annotations

import os
import re
from urllib.parse import unquote

import httpx

REBRICKABLE_BASE = "https://rebrickable.com/api/v3/lego"


def parse_moc_url(url: str) -> dict:
    """Extract MOC metadata from a Rebrickable MOC URL.

    Returns dict with keys: moc_id, designer, name, url.
    Raises ValueError if the URL doesn't match the expected pattern.
    """
    url = url.strip().rstrip("/")
    pattern = r"rebrickable\.com/mocs/(MOC-\d+)/([^/]+)/([^/]+)"
    match = re.search(pattern, url)
    if not match:
        raise ValueError(f"Invalid Rebrickable MOC URL: {url}")

    moc_id = match.group(1)
    designer = unquote(match.group(2))
    name_slug = unquote(match.group(3))
    name = name_slug.replace("-", " ").title()

    return {
        "moc_id": moc_id,
        "designer": designer,
        "name": name,
        "url": url,
    }


async def search_sets(
    query: str,
    *,
    page_size: int = 15,
    client: httpx.AsyncClient | None = None,
) -> list[dict]:
    """Search Rebrickable for official LEGO sets matching a query.

    Returns a list of {set_num, name, year, num_parts}. Sorted by Rebrickable's
    search relevance (which weighs name match and popularity). Returns [] on
    error or empty result.
    """
    api_key = os.environ.get("REBRICKABLE_API_KEY")
    if not api_key:
        return []

    headers = {"Authorization": f"key {api_key}"}
    url = f"{REBRICKABLE_BASE}/sets/"
    params = {"search": query, "page_size": page_size, "ordering": "-num_parts"}

    own_client = client is None
    if own_client:
        client = httpx.AsyncClient(timeout=20.0)
    try:
        resp = await client.get(url, headers=headers, params=params)
        if resp.status_code != 200:
            return []
        data = resp.json()
    except Exception:
        return []
    finally:
        if own_client:
            await client.aclose()

    out: list[dict] = []
    for r in data.get("results", []) or []:
        set_num = r.get("set_num")
        if not set_num:
            continue
        try:
            num_parts = int(r.get("num_parts") or 0)
        except (TypeError, ValueError):
            num_parts = 0
        out.append({
            "set_num": set_num,
            "name": r.get("name") or set_num,
            "year": r.get("year"),
            "num_parts": num_parts,
        })
    return out


async def fetch_set_alternates(
    set_num: str,
    *,
    page_size: int = 30,
    client: httpx.AsyncClient | None = None,
) -> list[dict]:
    """Fetch real MOCs based on an official LEGO set.

    Returns a list of {moc_id, name, designer, year, num_parts, image_url, moc_url}.
    Returns [] on any error or if the set has no alternates.
    """
    api_key = os.environ.get("REBRICKABLE_API_KEY")
    if not api_key:
        return []

    set_num = set_num.strip()
    if "-" not in set_num:
        set_num = f"{set_num}-1"

    headers = {"Authorization": f"key {api_key}"}
    url = f"{REBRICKABLE_BASE}/sets/{set_num}/alternates/"
    params = {"page_size": page_size}

    own_client = client is None
    if own_client:
        client = httpx.AsyncClient(timeout=20.0)
    try:
        resp = await client.get(url, headers=headers, params=params)
        if resp.status_code != 200:
            return []
        data = resp.json()
    except Exception:
        return []
    finally:
        if own_client:
            await client.aclose()

    out: list[dict] = []
    for r in data.get("results", []) or []:
        moc_id = r.get("set_num")
        if not moc_id:
            continue
        try:
            num_parts = int(r.get("num_parts") or 0)
        except (TypeError, ValueError):
            num_parts = 0
        out.append({
            "moc_id": moc_id,
            "name": r.get("name") or moc_id,
            "designer": r.get("designer_name") or "Unknown",
            "year": r.get("year"),
            "num_parts": num_parts,
            "image_url": r.get("moc_img_url"),
            "moc_url": r.get("moc_url") or f"https://rebrickable.com/mocs/{moc_id}/",
            "anchor_set": set_num,
        })
    return out
