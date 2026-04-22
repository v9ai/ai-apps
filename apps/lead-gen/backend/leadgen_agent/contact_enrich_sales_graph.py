"""Sales-focused contact enrichment graph.

Five-node pipeline that augments a sales / GTM contact with:
  1. Seniority + department + decision-maker signal, classified by LLM from
     the contact's position text (short-circuits when those fields are
     already populated on the row).
  2. A LinkedIn headline + bio, scraped from the contact's ``linkedin_url``
     via Googlebot UA (LinkedIn serves open-graph meta tags to Googlebot but
     not to regular browsers).
  3. An ICP bucket inherited from the contact's company ``score`` (no network
     call — pure bucket logic from the joined company row).

Input: ``{contact_id: int}``. Graph writes all outputs directly to Postgres
in the ``synthesize`` node (same Python-only pattern as ``contact_enrich``).
``COALESCE`` in the UPDATE means a failed node never overwrites good data.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import ContactEnrichSalesState

log = logging.getLogger(__name__)

SENIORITY_VALUES = {"IC", "Manager", "Director", "VP", "C-level"}
DEPARTMENT_VALUES = {
    "Sales",
    "Marketing",
    "BD",
    "Partnerships",
    "CS",
    "RevOps",
    "Other",
}

GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"


def _parse_json_text(raw: Any) -> Any:
    if isinstance(raw, str) and raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return raw


async def load_contact(state: ContactEnrichSalesState) -> dict:
    contact_id = state.get("contact_id")
    if contact_id is None:
        return {"error": "contact_id is required"}

    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return {"error": "NEON_DATABASE_URL not set"}

    sql = """
        SELECT c.id, c.first_name, c.last_name, c.position, c.linkedin_url,
               c.email, c.seniority, c.department, c.is_decision_maker,
               c.authority_score, c.dm_reasons, c.tags, c.linkedin_profile,
               co.id AS company_id, co.name AS company_name,
               co.website AS company_website,
               co.description AS company_description,
               co.industry AS company_industry,
               co.size AS company_size,
               co.score AS company_score,
               co.ai_tier AS company_ai_tier,
               co.category AS company_category
        FROM contacts c
        LEFT JOIN companies co ON co.id = c.company_id
        WHERE c.id = %s
        LIMIT 1
    """
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (contact_id,))
                row = cur.fetchone()
                if not row:
                    return {"error": f"contact id {contact_id} not found"}
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"error": f"db error: {e}"}

    rec = dict(zip(cols, row))
    dm_reasons = _parse_json_text(rec.get("dm_reasons"))
    if not isinstance(dm_reasons, list):
        dm_reasons = []
    tags_raw = _parse_json_text(rec.get("tags"))
    tags = [str(t) for t in tags_raw] if isinstance(tags_raw, list) else []
    linkedin_profile = _parse_json_text(rec.get("linkedin_profile"))
    if not isinstance(linkedin_profile, dict):
        linkedin_profile = {}

    contact = {
        "id": rec["id"],
        "first_name": rec.get("first_name") or "",
        "last_name": rec.get("last_name") or "",
        "position": rec.get("position") or "",
        "linkedin_url": rec.get("linkedin_url") or "",
        "email": rec.get("email") or "",
        "seniority": rec.get("seniority") or "",
        "department": rec.get("department") or "",
        "is_decision_maker": rec.get("is_decision_maker"),
        "authority_score": rec.get("authority_score"),
        "dm_reasons": dm_reasons,
        "tags": tags,
        "linkedin_profile": linkedin_profile,
    }
    company = {
        "id": rec.get("company_id"),
        "name": rec.get("company_name") or "",
        "website": rec.get("company_website") or "",
        "description": rec.get("company_description") or "",
        "industry": rec.get("company_industry") or "",
        "size": rec.get("company_size") or "",
        "score": rec.get("company_score"),
        "ai_tier": rec.get("company_ai_tier") or "",
        "category": rec.get("company_category") or "",
    }
    return {"contact": contact, "company": company}


async def classify_seniority(state: ContactEnrichSalesState) -> dict:
    if state.get("error"):
        return {"classify_source": ""}

    contact = state.get("contact") or {}
    company = state.get("company") or {}

    # Short-circuit: keep existing classification if both seniority + authority
    # were previously filled. Cheap idempotency — saves an LLM call on re-runs.
    existing_sen = (contact.get("seniority") or "").strip()
    existing_auth = contact.get("authority_score")
    if existing_sen in SENIORITY_VALUES and isinstance(existing_auth, (int, float)):
        return {
            "seniority": existing_sen,
            "department": contact.get("department") or "Other",
            "is_decision_maker": bool(contact.get("is_decision_maker")),
            "authority_score": float(existing_auth),
            "dm_reasons": contact.get("dm_reasons") or [],
            "classify_source": "existing",
        }

    position = (contact.get("position") or "").strip()
    if not position:
        return {"classify_source": ""}

    prompt = f"""You classify sales / GTM contacts into a fixed schema.

POSITION: {position}
COMPANY: {company.get('name') or '?'} ({company.get('industry') or '?'}, {company.get('size') or '?'})

Return JSON with this exact shape:
{{
  "seniority": "IC" | "Manager" | "Director" | "VP" | "C-level",
  "department": "Sales" | "Marketing" | "BD" | "Partnerships" | "CS" | "RevOps" | "Other",
  "is_decision_maker": true | false,
  "authority_score": 0.0..1.0,
  "dm_reasons": ["short bullet", ...]
}}

Rules:
- "C-level" only for CEO/CRO/CMO/COO/CFO/Chief-*.
- Decision maker = authority to sign a deal in the seniority's typical scope.
- authority_score calibration: 0.0 IC, 0.3 Manager, 0.6 Director, 0.8 VP, 1.0 C-level.
- dm_reasons: 1-3 short bullets, <= 20 words each.
- Do NOT invent enum values outside the lists above.
"""

    llm = make_llm(temperature=0.0)
    try:
        parsed = await ainvoke_json(llm, [{"role": "user", "content": prompt}])
    except Exception as e:
        log.warning("classify_seniority LLM failed: %s", e)
        return {"classify_source": ""}

    if not isinstance(parsed, dict):
        return {"classify_source": ""}

    sen = str(parsed.get("seniority") or "").strip()
    dept = str(parsed.get("department") or "").strip()
    if sen not in SENIORITY_VALUES:
        return {"classify_source": ""}
    if dept not in DEPARTMENT_VALUES:
        dept = "Other"

    try:
        score = float(parsed.get("authority_score", 0.0))
    except (TypeError, ValueError):
        score = 0.0
    score = max(0.0, min(1.0, score))

    reasons_raw = parsed.get("dm_reasons")
    reasons = (
        [str(r).strip() for r in reasons_raw if isinstance(r, str) and r.strip()]
        if isinstance(reasons_raw, list)
        else []
    )[:3]

    return {
        "seniority": sen,
        "department": dept,
        "is_decision_maker": bool(parsed.get("is_decision_maker")),
        "authority_score": score,
        "dm_reasons": reasons,
        "classify_source": "llm",
    }


def _extract_linkedin_og(html: str) -> dict:
    """Pull og:title / og:description from a LinkedIn profile page's HTML."""

    def meta(prop: str) -> str | None:
        m = re.search(
            rf'<meta\s+property="{re.escape(prop)}"\s+content="([^"]+)"', html
        )
        return m.group(1) if m else None

    title = meta("og:title") or ""
    desc = meta("og:description")

    # LinkedIn title format is typically: "First Last - Headline | LinkedIn"
    headline: str | None = None
    if " - " in title and " | " in title:
        headline = title.split(" - ", 1)[1].rsplit(" | ", 1)[0].strip()
    elif " - " in title:
        headline = title.split(" - ", 1)[1].strip()

    return {
        "headline": headline,
        "bio": desc,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


async def scrape_linkedin(state: ContactEnrichSalesState) -> dict:
    if state.get("error"):
        return {"linkedin_scrape_source": ""}

    contact = state.get("contact") or {}
    url = (contact.get("linkedin_url") or "").strip()
    if not url:
        return {"linkedin_scrape_source": ""}

    # Skip if we already have a scraped headline — idempotent re-runs.
    existing = contact.get("linkedin_profile") or {}
    if isinstance(existing, dict) and (existing.get("headline") or existing.get("bio")):
        return {
            "linkedin_profile": existing,
            "linkedin_scrape_source": "existing",
        }

    headers = {"User-Agent": GOOGLEBOT_UA, "Accept": "text/html,application/xhtml+xml"}
    try:
        async with httpx.AsyncClient(
            timeout=10.0, follow_redirects=True
        ) as client:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                log.info("linkedin scrape non-200: %s %s", res.status_code, url)
                return {"linkedin_scrape_source": ""}
            html = res.text
    except Exception as e:
        log.warning("linkedin scrape failed: %s", e)
        return {"linkedin_scrape_source": ""}

    profile = _extract_linkedin_og(html)
    if not profile.get("headline") and not profile.get("bio"):
        return {"linkedin_scrape_source": ""}

    return {"linkedin_profile": profile, "linkedin_scrape_source": "og"}


async def inherit_icp(state: ContactEnrichSalesState) -> dict:
    if state.get("error"):
        return {"icp_bucket": ""}

    company = state.get("company") or {}
    score = company.get("score")
    if not isinstance(score, (int, float)):
        return {"icp_bucket": "", "icp_company_score": None}

    score_f = float(score)
    if score_f >= 0.7:
        bucket = "high"
    elif score_f >= 0.4:
        bucket = "medium"
    else:
        bucket = "low"
    return {"icp_bucket": bucket, "icp_company_score": score_f}


def _merge_tags_with_icp(existing: list[str], icp_bucket: str) -> list[str]:
    """Drop any prior ``icp:*`` tag, case-insensitive dedupe, append fresh one."""
    merged: list[str] = []
    seen: set[str] = set()
    for t in existing:
        if not isinstance(t, str):
            continue
        key = t.strip().lower()
        if not key or key in seen:
            continue
        if key.startswith("icp:"):
            continue  # will be re-added below
        seen.add(key)
        merged.append(t.strip())

    if icp_bucket:
        fresh = f"icp:{icp_bucket}"
        if fresh.lower() not in seen:
            merged.append(fresh)
    return merged


def _persist_sales_enrichment(
    contact_id: int,
    *,
    seniority: str | None,
    department: str | None,
    is_decision_maker: bool | None,
    authority_score: float | None,
    dm_reasons: list[str],
    linkedin_profile: dict | None,
    tags: list[str],
) -> bool:
    """UPDATE the contact row with sales-enrichment outputs.

    Uses ``COALESCE`` on nullable fields so a failed upstream node (e.g. LLM
    returned nothing, LinkedIn rate-limited) never clobbers prior good data.
    ``tags`` is always rewritten — we already merged with the prior set in the
    synthesize node, so sending the merged list is safe.
    """
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return False
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE contacts "
                    "SET seniority = COALESCE(%s, seniority), "
                    "    department = COALESCE(%s, department), "
                    "    is_decision_maker = COALESCE(%s, is_decision_maker), "
                    "    authority_score = COALESCE(%s, authority_score), "
                    "    dm_reasons = COALESCE(%s::jsonb, dm_reasons), "
                    "    linkedin_profile = COALESCE(%s::jsonb, linkedin_profile), "
                    "    tags = %s, "
                    "    updated_at = NOW() "
                    "WHERE id = %s",
                    (
                        seniority,
                        department,
                        is_decision_maker,
                        authority_score,
                        json.dumps(dm_reasons) if dm_reasons else None,
                        json.dumps(linkedin_profile) if linkedin_profile else None,
                        json.dumps(tags),
                        contact_id,
                    ),
                )
                return cur.rowcount > 0
    except psycopg.Error as e:
        log.warning("failed to persist sales enrichment for %s: %s", contact_id, e)
        return False


async def synthesize(state: ContactEnrichSalesState) -> dict:
    enriched_at = datetime.now(timezone.utc).isoformat()

    if state.get("error"):
        return {"enriched_at": enriched_at}

    contact = state.get("contact") or {}
    contact_id = contact.get("id")
    if not isinstance(contact_id, int):
        return {"enriched_at": enriched_at}

    classify_source = state.get("classify_source") or ""
    has_classifier = classify_source in {"llm", "existing"}

    sen = state.get("seniority") if has_classifier else None
    dept = state.get("department") if has_classifier else None
    is_dm = state.get("is_decision_maker") if has_classifier else None
    auth = state.get("authority_score") if has_classifier else None
    reasons = state.get("dm_reasons") or [] if classify_source == "llm" else []

    linkedin_source = state.get("linkedin_scrape_source") or ""
    new_linkedin = state.get("linkedin_profile") if linkedin_source == "og" else None

    existing_tags = contact.get("tags") or []
    merged_tags = _merge_tags_with_icp(existing_tags, state.get("icp_bucket") or "")

    _persist_sales_enrichment(
        contact_id,
        seniority=sen,
        department=dept,
        is_decision_maker=is_dm,
        authority_score=auth,
        dm_reasons=reasons,
        linkedin_profile=new_linkedin,
        tags=merged_tags,
    )

    return {
        "enriched_at": enriched_at,
        # Re-emit so the caller's final state always carries the enrichment
        # outputs even after COALESCE-preserving writes.
        "seniority": sen or contact.get("seniority") or "",
        "department": dept or contact.get("department") or "",
        "is_decision_maker": is_dm if is_dm is not None else contact.get("is_decision_maker"),
        "authority_score": auth if auth is not None else contact.get("authority_score"),
        "dm_reasons": reasons or contact.get("dm_reasons") or [],
        "linkedin_profile": new_linkedin or contact.get("linkedin_profile") or {},
        "linkedin_scrape_source": linkedin_source,
        "classify_source": classify_source,
        "icp_bucket": state.get("icp_bucket") or "",
        "icp_company_score": state.get("icp_company_score"),
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ContactEnrichSalesState)
    builder.add_node("load_contact", load_contact)
    builder.add_node("classify_seniority", classify_seniority)
    builder.add_node("scrape_linkedin", scrape_linkedin)
    builder.add_node("inherit_icp", inherit_icp)
    builder.add_node("synthesize", synthesize)
    builder.add_edge(START, "load_contact")
    builder.add_edge("load_contact", "classify_seniority")
    builder.add_edge("classify_seniority", "scrape_linkedin")
    builder.add_edge("scrape_linkedin", "inherit_icp")
    builder.add_edge("inherit_icp", "synthesize")
    builder.add_edge("synthesize", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
