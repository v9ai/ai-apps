"""openFDA drug labeling client.

openFDA's `/drug/label.json` exposes the same SPL data as DailyMed but in JSON,
already parsed into structured sections (boxed_warning, indications_and_usage,
adverse_reactions, drug_interactions, dosage_and_administration, etc). We use
it as a cross-check + structured BBW source — much easier to extract than
parsing SPL XML directly.

Public API, optional API key (FDA_API_KEY) for higher rate limits.
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

LABEL_URL = "https://api.fda.gov/drug/label.json"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0


async def fetch_label(drug_name: str) -> Optional[dict]:
    """Return the first openFDA label record for a drug name, or None.

    Searches both `openfda.generic_name` and `openfda.brand_name`. The returned
    dict is the raw record — callers can read fields like ``boxed_warning``,
    ``indications_and_usage``, ``adverse_reactions``, ``drug_interactions``,
    ``dosage_and_administration``, ``mechanism_of_action``,
    ``clinical_pharmacology``.
    """
    api_key = os.environ.get("FDA_API_KEY")
    # openFDA syntax: search=openfda.generic_name:"montelukast"+openfda.brand_name:"singulair"
    # We OR them to widen the match.
    safe = drug_name.replace('"', "")
    search = f'(openfda.generic_name:"{safe}"+openfda.brand_name:"{safe}")'
    params = {"search": search, "limit": 1}
    if api_key:
        params["api_key"] = api_key

    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(LABEL_URL, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results") or []
                    return results[0] if results else None
                if resp.status_code == 404:
                    # openFDA returns 404 for "no match found" — not an error.
                    return None
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    jitter = random.uniform(0, delay * 0.5)
                    logger.warning("openFDA %d, retry %d/%d in %.1fs", resp.status_code, attempt + 1, MAX_RETRIES, delay + jitter)
                    await asyncio.sleep(delay + jitter)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("openFDA returned %d", resp.status_code)
                return None
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("openFDA request failed")
                return None
    return None


def label_url(record: dict) -> Optional[str]:
    """Best-effort source URL: prefer the SPL setid landing page on DailyMed."""
    openfda = record.get("openfda") or {}
    setids = openfda.get("spl_set_id") or []
    if setids:
        return f"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={setids[0]}"
    return None
