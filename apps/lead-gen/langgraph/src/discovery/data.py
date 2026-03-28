"""Database operations for discovery pipeline: dedup + persistence."""

import os
import re
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row

from .models import CompanyResearchResult

_CONFIDENCE_MAP = {"high": 0.9, "medium": 0.6, "low": 0.3}

_COMPANY_TYPE_TO_CATEGORY = {
    "product": "PRODUCT",
    "consultancy": "CONSULTANCY",
    "agency": "AGENCY",
    "staffing": "STAFFING",
    "unknown": "UNKNOWN",
}


def _normalize_domain(domain: str) -> str:
    """Strip www. prefix and lowercase."""
    domain = domain.lower().strip()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def _domain_to_key(domain: str) -> str:
    """Convert domain to company key (e.g. 'mistral.ai' → 'mistral')."""
    return re.sub(r"[^a-z0-9]", "", domain.split(".")[0].lower())


def fetch_existing_company_keys() -> set[str]:
    """Return set of existing company keys + normalized domains for dedup."""
    url = os.environ["DATABASE_URL"]
    keys: set[str] = set()

    with psycopg.connect(url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT key, website, canonical_domain FROM companies")
            for row in cur.fetchall():
                if row["key"]:
                    keys.add(row["key"].lower())
                if row["canonical_domain"]:
                    keys.add(_normalize_domain(row["canonical_domain"]))
                if row["website"]:
                    domain = _normalize_domain(
                        re.sub(r"https?://(?:www\.)?", "", row["website"]).split("/")[0]
                    )
                    keys.add(domain)

    return keys


def persist_company(result: CompanyResearchResult) -> int | None:
    """Insert or update company in DB. Returns company id."""
    url = os.environ["DATABASE_URL"]
    key = _domain_to_key(result.domain)
    now = datetime.now(timezone.utc).isoformat()
    confidence = _CONFIDENCE_MAP.get(result.confidence, 0.5)

    with psycopg.connect(url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO companies (
                    key, name, website, canonical_domain,
                    ai_tier, ai_classification_reason, ai_classification_confidence,
                    category, description,
                    created_at, updated_at
                )
                VALUES (
                    %(key)s, %(name)s, %(website)s, %(canonical_domain)s,
                    %(ai_tier)s, %(ai_reason)s, %(ai_confidence)s,
                    %(category)s, %(description)s,
                    %(now)s, %(now)s
                )
                ON CONFLICT (key) DO UPDATE SET
                    name = EXCLUDED.name,
                    website = EXCLUDED.website,
                    canonical_domain = EXCLUDED.canonical_domain,
                    ai_tier = EXCLUDED.ai_tier,
                    ai_classification_reason = EXCLUDED.ai_classification_reason,
                    ai_classification_confidence = EXCLUDED.ai_classification_confidence,
                    category = EXCLUDED.category,
                    description = EXCLUDED.description,
                    updated_at = EXCLUDED.updated_at
                RETURNING id
                """,
                {
                    "key": key,
                    "name": result.name,
                    "website": f"https://{result.domain}",
                    "canonical_domain": result.domain,
                    "ai_tier": result.ai_tier,
                    "ai_reason": "; ".join(result.reasons),
                    "ai_confidence": confidence,
                    "category": "AI" if result.is_ai_company else "UNKNOWN",
                    "description": result.website_snippet[:500] if result.website_snippet else None,
                    "now": now,
                },
            )
            row = cur.fetchone()
            conn.commit()
            return row["id"] if row else None


