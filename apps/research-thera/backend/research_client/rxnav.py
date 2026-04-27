"""RxNav (NLM) RxNorm + drug interaction client.

Workflow:
  1. RxNorm /approximateTerm.json   — drug name → RxCUI
  2. RxNav /interaction/interaction.json?rxcui=<rxcui>  — list interactions

NOTE (2024): NLM retired the public DrugBank-backed interaction API — the
`/interaction/interaction.json` endpoint now returns only the ONCHigh/ONCNonHigh
interaction lists curated by NLM. Coverage is narrower than DailyMed's
"drug interactions" SPL section but still useful as a structured cross-check.

Public API, no auth, no documented rate limit.
"""
from __future__ import annotations

import asyncio
import logging
import random
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

RXCUI_URL = "https://rxnav.nlm.nih.gov/REST/approximateTerm.json"
INTERACTION_URL = "https://rxnav.nlm.nih.gov/REST/interaction/interaction.json"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0


async def _get_with_retry(client: httpx.AsyncClient, url: str, params: dict | None = None) -> Optional[httpx.Response]:
    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return resp
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                jitter = random.uniform(0, delay * 0.5)
                logger.warning("RxNav %d, retry %d/%d in %.1fs", resp.status_code, attempt + 1, MAX_RETRIES, delay + jitter)
                await asyncio.sleep(delay + jitter)
                delay = min(delay * 2, 30.0)
                continue
            logger.warning("RxNav returned %d for %s", resp.status_code, url)
            return None
        except Exception:
            if attempt < MAX_RETRIES:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30.0)
                continue
            logger.exception("RxNav request failed: %s", url)
            return None
    return None


async def find_rxcui(drug_name: str) -> Optional[str]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await _get_with_retry(client, RXCUI_URL, params={"term": drug_name, "maxEntries": 1})
        if resp is None:
            return None
        data = resp.json()
        candidates = (
            (data.get("approximateGroup") or {}).get("candidate") or []
        )
        if not candidates:
            return None
        return candidates[0].get("rxcui")


async def fetch_interactions(drug_name: str) -> list[dict]:
    """Return a list of normalized interaction dicts for ``drug_name``.

    Each item: ``{"interacting_drug": str, "severity": str, "mechanism": str | None,
    "recommendation": str | None, "source_url": str}``. Empty list when the
    drug has no curated interactions.
    """
    rxcui = await find_rxcui(drug_name)
    if not rxcui:
        return []
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await _get_with_retry(client, INTERACTION_URL, params={"rxcui": rxcui})
        if resp is None:
            return []
        data = resp.json()

    out: list[dict] = []
    for type_group in (data.get("interactionTypeGroup") or []):
        for itype in (type_group.get("interactionType") or []):
            for ipair in (itype.get("interactionPair") or []):
                concepts = ipair.get("interactionConcept") or []
                # The pair has 2 concepts: self + the other drug. Pick the one
                # whose RxCUI ≠ our query RxCUI.
                other = next(
                    (c for c in concepts if (c.get("minConceptItem") or {}).get("rxcui") != rxcui),
                    None,
                )
                if not other:
                    continue
                other_name = (other.get("minConceptItem") or {}).get("name") or ""
                severity_raw = (ipair.get("severity") or "").lower()
                severity = _normalize_severity(severity_raw)
                description = ipair.get("description")
                out.append({
                    "interacting_drug": other_name,
                    "severity": severity,
                    "mechanism": None,
                    "recommendation": description,
                    "source_url": "https://mor.nlm.nih.gov/RxNav/",
                })
    return out


def _normalize_severity(raw: str) -> str:
    """Map RxNav severity strings onto our 4-level enum."""
    if "contraindic" in raw:
        return "contraindicated"
    if raw in {"high", "major"} or "severe" in raw:
        return "major"
    if raw in {"low", "minor"}:
        return "minor"
    return "moderate"
