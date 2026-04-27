"""DailyMed (NIH/NLM) Structured Product Labeling client.

DailyMed is the FDA's authoritative source for SPL XML drug labeling. We use
the JSON catalog to find a setid by drug name, then fetch the SPL XML and
return it as raw text — the LangGraph extract node hands the text to DeepSeek
for structured fact extraction.

Public API, no auth, no documented rate limit (be polite — we use a 30s timeout
and exponential backoff matching the OpenAlex client).
"""
from __future__ import annotations

import asyncio
import logging
import random
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

CATALOG_URL = "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json"
SPL_XML_URL = "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/{setid}.xml"
SPL_WEB_URL = "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={setid}"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0
USER_AGENT = "research-thera/0.1 (mailto:research@researchthera.com)"


async def _get_with_retry(client: httpx.AsyncClient, url: str, params: dict | None = None) -> Optional[httpx.Response]:
    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = await client.get(url, params=params, headers={"User-Agent": USER_AGENT})
            if resp.status_code == 200:
                return resp
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                jitter = random.uniform(0, delay * 0.5)
                logger.warning("DailyMed %d, retry %d/%d in %.1fs", resp.status_code, attempt + 1, MAX_RETRIES, delay + jitter)
                await asyncio.sleep(delay + jitter)
                delay = min(delay * 2, 30.0)
                continue
            logger.warning("DailyMed returned %d for %s", resp.status_code, url)
            return None
        except Exception:
            if attempt < MAX_RETRIES:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30.0)
                continue
            logger.exception("DailyMed request failed: %s", url)
            return None
    return None


async def find_setid(drug_name: str) -> Optional[str]:
    """Return the top-matching DailyMed setid for a drug name.

    Caller should pass the generic name when known (e.g. "montelukast")
    rather than a brand ("Singulair"); generic queries return more SPLs.
    """
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await _get_with_retry(
            client,
            CATALOG_URL,
            params={"drug_name": drug_name, "pagesize": 1},
        )
        if resp is None:
            return None
        data = resp.json()
        items = data.get("data") or []
        if not items:
            return None
        # Each item has setid + spl_version; we just need the setid.
        return items[0].get("setid")


async def fetch_spl_xml(setid: str) -> Optional[str]:
    """Fetch the SPL XML for a setid as raw text."""
    url = SPL_XML_URL.format(setid=setid)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await _get_with_retry(client, url)
        if resp is None:
            return None
        return resp.text


async def fetch_label(drug_name: str) -> Optional[dict]:
    """High-level: find a setid + return its SPL text + the human-facing URL.

    Returns ``{"setid": ..., "xml": ..., "source_url": ...}`` or ``None``.
    """
    setid = await find_setid(drug_name)
    if not setid:
        return None
    xml = await fetch_spl_xml(setid)
    if not xml:
        return None
    return {"setid": setid, "xml": xml, "source_url": SPL_WEB_URL.format(setid=setid)}
