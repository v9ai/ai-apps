"""Find the decision maker(s) at a company from existing DB contacts.

Four-node pipeline:

  1. ``load_company`` — resolve company by ``company_key`` or ``company_id``.
  2. ``load_contacts`` — pull every non-deleted, contactable row joined to the
     company (cap 50). Reads the same DM-classification columns that
     ``contact_enrich_sales_graph`` writes.
  3. ``classify_unclassified`` — for any contact missing seniority OR
     authority_score, call the same LLM prompt as
     ``contact_enrich_sales_graph.classify_seniority`` and persist results
     back to the row (idempotent re-runs short-circuit on the second call).
  4. ``rank`` — score each contact (``authority_score`` plus a small bonus for
     Sales / BD / Partnerships departments), sort DESC, surface
     ``decision_makers`` (is_decision_maker=True subset), pick a
     ``top_decision_maker``, and emit a one-line ``summary``.

Input: ``{company_key: str}`` OR ``{company_id: int}``. No web fetching — the
graph operates only on data already in Neon.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import FindDecisionMakerState

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
DM_DEPT_BONUS = {"Sales", "BD", "Partnerships"}
MAX_CONTACTS = 50


def _parse_json_text(raw: Any) -> Any:
    if isinstance(raw, str) and raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return raw


def _dsn() -> str | None:
    return os.environ.get("NEON_DATABASE_URL", "").strip() or None


async def load_company(state: FindDecisionMakerState) -> dict:
    company_key = (state.get("company_key") or "").strip()
    company_id = state.get("company_id")
    if not company_key and not company_id:
        return {"error": "company_key or company_id is required"}

    dsn = _dsn()
    if not dsn:
        return {"error": "NEON_DATABASE_URL not set"}

    if company_id:
        sql = (
            "SELECT id, key, name, website, category, score, ai_tier "
            "FROM companies WHERE id = %s LIMIT 1"
        )
        params: tuple = (company_id,)
    else:
        sql = (
            "SELECT id, key, name, website, category, score, ai_tier "
            "FROM companies WHERE key = %s LIMIT 1"
        )
        params = (company_key,)

    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
                if not row:
                    ident = company_key or company_id
                    return {"error": f"company not found: {ident}"}
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"error": f"db error: {e}"}

    rec = dict(zip(cols, row))
    return {
        "company": {
            "id": rec["id"],
            "key": rec.get("key") or "",
            "name": rec.get("name") or "",
            "website": rec.get("website") or "",
            "category": rec.get("category") or "",
            "score": rec.get("score"),
            "ai_tier": rec.get("ai_tier"),
        },
    }


async def load_contacts(state: FindDecisionMakerState) -> dict:
    if state.get("error"):
        return {"contacts": []}

    company = state.get("company") or {}
    cid = company.get("id")
    if not isinstance(cid, int):
        return {"contacts": []}

    dsn = _dsn()
    if not dsn:
        return {"error": "NEON_DATABASE_URL not set"}

    sql = """
        SELECT id, first_name, last_name, position, linkedin_url, email,
               seniority, department, is_decision_maker, authority_score,
               dm_reasons
        FROM contacts
        WHERE company_id = %s
          AND COALESCE(to_be_deleted, false) = false
          AND COALESCE(do_not_contact, false) = false
        ORDER BY
          COALESCE(authority_score, 0) DESC,
          id ASC
        LIMIT %s
    """
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (cid, MAX_CONTACTS))
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"error": f"db error: {e}"}

    contacts: list[dict[str, Any]] = []
    for row in rows:
        rec = dict(zip(cols, row))
        dm_reasons = _parse_json_text(rec.get("dm_reasons"))
        if not isinstance(dm_reasons, list):
            dm_reasons = []
        contacts.append(
            {
                "id": rec["id"],
                "first_name": rec.get("first_name") or "",
                "last_name": rec.get("last_name") or "",
                "position": rec.get("position") or "",
                "linkedin_url": rec.get("linkedin_url") or "",
                "email": rec.get("email") or "",
                "seniority": rec.get("seniority") or "",
                "department": rec.get("department") or "",
                "is_decision_maker": bool(rec.get("is_decision_maker"))
                if rec.get("is_decision_maker") is not None
                else None,
                "authority_score": (
                    float(rec["authority_score"])
                    if isinstance(rec.get("authority_score"), (int, float))
                    else None
                ),
                "dm_reasons": dm_reasons,
            }
        )
    return {"contacts": contacts}


def _persist_classification(
    contact_id: int,
    *,
    seniority: str,
    department: str,
    is_decision_maker: bool,
    authority_score: float,
    dm_reasons: list[str],
) -> None:
    """Mirror the COALESCE pattern from contact_enrich_sales_graph._persist_sales_enrichment."""
    dsn = _dsn()
    if not dsn:
        return
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE contacts "
                    "SET seniority = COALESCE(%s, seniority), "
                    "    department = COALESCE(%s, department), "
                    "    is_decision_maker = COALESCE(%s, is_decision_maker), "
                    "    authority_score = COALESCE(%s, authority_score), "
                    "    dm_reasons = COALESCE(%s, dm_reasons), "
                    "    updated_at = NOW() "
                    "WHERE id = %s",
                    (
                        seniority,
                        department,
                        is_decision_maker,
                        authority_score,
                        json.dumps(dm_reasons) if dm_reasons else None,
                        contact_id,
                    ),
                )
    except psycopg.Error as e:
        log.warning("failed to persist DM classification for %s: %s", contact_id, e)


async def _classify_one(contact: dict[str, Any], company: dict[str, Any]) -> dict | None:
    """Returns the parsed classification dict, or None on any failure."""
    position = (contact.get("position") or "").strip()
    if not position:
        return None

    prompt = f"""You classify sales / GTM contacts into a fixed schema.

POSITION: {position}
COMPANY: {company.get('name') or '?'} ({company.get('category') or '?'})

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
- Founders are decision makers regardless of stated title.
- authority_score calibration: 0.0 IC, 0.3 Manager, 0.6 Director, 0.8 VP, 1.0 C-level.
- dm_reasons: 1-3 short bullets, <= 20 words each.
- Do NOT invent enum values outside the lists above.
"""

    llm = make_llm(temperature=0.0)
    try:
        parsed = await ainvoke_json(llm, [{"role": "user", "content": prompt}])
    except Exception as e:  # noqa: BLE001
        log.warning("classify_one LLM failed: %s", e)
        return None

    if not isinstance(parsed, dict):
        return None

    sen = str(parsed.get("seniority") or "").strip()
    dept = str(parsed.get("department") or "").strip()
    if sen not in SENIORITY_VALUES:
        return None
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
    }


async def classify_unclassified(state: FindDecisionMakerState) -> dict:
    if state.get("error"):
        return {"classify_count": 0}

    contacts = state.get("contacts") or []
    company = state.get("company") or {}
    if not contacts:
        return {"classify_count": 0}

    classified = 0
    for c in contacts:
        sen = (c.get("seniority") or "").strip()
        auth = c.get("authority_score")
        already = sen in SENIORITY_VALUES and isinstance(auth, (int, float))
        if already:
            continue

        result = await _classify_one(c, company)
        if not result:
            continue

        c["seniority"] = result["seniority"]
        c["department"] = result["department"]
        c["is_decision_maker"] = result["is_decision_maker"]
        c["authority_score"] = result["authority_score"]
        c["dm_reasons"] = result["dm_reasons"]
        classified += 1

        _persist_classification(
            c["id"],
            seniority=result["seniority"],
            department=result["department"],
            is_decision_maker=result["is_decision_maker"],
            authority_score=result["authority_score"],
            dm_reasons=result["dm_reasons"],
        )

    return {"contacts": contacts, "classify_count": classified}


def _full_name(c: dict[str, Any]) -> str:
    first = (c.get("first_name") or "").strip()
    last = (c.get("last_name") or "").strip()
    return (first + " " + last).strip() or "(unnamed)"


def _shape_candidate(c: dict[str, Any], rank_score: float) -> dict[str, Any]:
    return {
        "id": c.get("id"),
        "first_name": c.get("first_name") or "",
        "last_name": c.get("last_name") or "",
        "email": c.get("email") or None,
        "position": c.get("position") or None,
        "seniority": c.get("seniority") or None,
        "department": c.get("department") or None,
        "is_decision_maker": bool(c.get("is_decision_maker")),
        "authority_score": float(c.get("authority_score") or 0.0),
        "dm_reasons": c.get("dm_reasons") or [],
        "rank_score": rank_score,
    }


async def rank(state: FindDecisionMakerState) -> dict:
    if state.get("error"):
        return {
            "ranked": [],
            "decision_makers": [],
            "top_decision_maker": None,
            "summary": state.get("error") or "",
        }

    contacts = state.get("contacts") or []
    company = state.get("company") or {}
    company_name = company.get("name") or company.get("key") or "this company"

    if not contacts:
        return {
            "ranked": [],
            "decision_makers": [],
            "top_decision_maker": None,
            "summary": f"No contacts on file for {company_name}.",
        }

    scored: list[dict[str, Any]] = []
    for c in contacts:
        auth = float(c.get("authority_score") or 0.0)
        bonus = 0.2 if (c.get("department") or "") in DM_DEPT_BONUS else 0.0
        scored.append(_shape_candidate(c, auth + bonus))

    scored.sort(key=lambda r: r["rank_score"], reverse=True)
    decision_makers = [r for r in scored if r["is_decision_maker"]]
    top = decision_makers[0] if decision_makers else None

    if top:
        reasons = ", ".join(top.get("dm_reasons") or []) or "high authority"
        position = top.get("position") or top.get("seniority") or "?"
        summary = (
            f"{_full_name(top)} — {position}, "
            f"authority {top['authority_score']:.2f}. "
            f"Reasons: {reasons}."
        )
    else:
        # Fall back to the highest-ranked non-DM as a hint.
        best = scored[0]
        summary = (
            f"No flagged decision maker for {company_name}. "
            f"Highest authority on file: {_full_name(best)} "
            f"({best.get('position') or best.get('seniority') or '?'}, "
            f"authority {best['authority_score']:.2f})."
        )

    return {
        "ranked": scored,
        "decision_makers": decision_makers,
        "top_decision_maker": top,
        "summary": summary,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(FindDecisionMakerState)
    builder.add_node("load_company", load_company)
    builder.add_node("load_contacts", load_contacts)
    builder.add_node("classify_unclassified", classify_unclassified)
    builder.add_node("rank", rank)
    builder.add_edge(START, "load_company")
    builder.add_edge("load_company", "load_contacts")
    builder.add_edge("load_contacts", "classify_unclassified")
    builder.add_edge("classify_unclassified", "rank")
    builder.add_edge("rank", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
