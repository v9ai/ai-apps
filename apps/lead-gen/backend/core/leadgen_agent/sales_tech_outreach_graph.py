"""Sales-tech tab outreach graph.

End-to-end sweep of every company under ``/companies?tab=sales-tech``:

    select_companies
      → discover_contacts        (per company, invokes contact_discovery_graph)
      → enrich_dms               (per contact, invokes contact_enrich_sales_graph
                                  to populate seniority + authority_score)
      → filter_dms               (authority_score >= threshold, has email,
                                  not already in contact_emails as
                                  sent/scheduled/draft)
      → draft_emails             (per DM, invokes email_outreach_graph and
                                  persists tailored draft as
                                  contact_emails.status='draft')

The taxonomy filter mirrors ``src/components/companies-list.tsx``:
``service_taxonomy::jsonb ?| array['Sales Engagement Platform',
'Lead Generation Software']``.

Subgraphs are invoked in-process (``graph.ainvoke``), so the
single-worker ``langgraph dev`` queue is bypassed (see memory
``feedback_leadgen_langgraph_fanout``). Concurrency is intentionally 1.

Inputs (``SalesTechOutreachState``):
    limit               – cap of companies to process. None = all.
    dry_run             – when True, skip the contact_emails INSERT.
    product_id          – optional product id; enables persona-aware drafting
                          via ``email_outreach_graph``'s template path.
    authority_threshold – decision-maker cutoff. Default 0.85 (VP+).

Output: ``summary`` dict with companies_processed, contacts_discovered,
decision_makers, drafts_created, skipped_by_reason, errors.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from .contact_discovery_graph import graph as contact_discovery_graph
from .contact_enrich_sales_graph import graph as contact_enrich_sales_graph
from .deep_icp_graph import _dsn
from .email_outreach_graph import graph as email_outreach_graph

log = logging.getLogger(__name__)

SALES_TECH_TAXONOMY = ["Sales Engagement Platform", "Lead Generation Software"]
DEFAULT_AUTHORITY_THRESHOLD = 0.85
DRAFT_FROM_EMAIL = "Vadim Nicolai <contact@vadim.blog>"


class SalesTechOutreachState(TypedDict, total=False):
    # input
    limit: int | None
    dry_run: bool
    product_id: int | None
    authority_threshold: float
    # working
    company_ids: list[int]
    company_rows: list[dict[str, Any]]
    contact_ids_for_enrich: list[int]
    decision_makers: list[dict[str, Any]]
    # output
    drafts_created: int
    skipped_by_reason: dict[str, int]
    errors: list[str]
    summary: dict[str, Any]


# ── Node 1: select sales-tech companies ──────────────────────────────────


async def select_companies(state: SalesTechOutreachState) -> dict:
    limit = state.get("limit")
    sql = """
        SELECT id, key, name, canonical_domain, website, description
        FROM companies
        WHERE service_taxonomy IS NOT NULL
          AND service_taxonomy <> ''
          AND service_taxonomy::jsonb ?| array['Sales Engagement Platform','Lead Generation Software']
        ORDER BY score DESC NULLS LAST, id ASC
    """
    if limit:
        sql += f" LIMIT {int(limit)}"

    rows: list[dict[str, Any]] = []
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                cols = [d[0] for d in cur.description or []]
                rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    except psycopg.Error as e:
        return {"errors": [f"select_companies: {e}"], "company_ids": [], "company_rows": []}

    log.info("select_companies: %d sales-tech companies", len(rows))
    return {
        "company_ids": [int(r["id"]) for r in rows],
        "company_rows": rows,
    }


# ── Node 2: discover contacts per company ────────────────────────────────


async def discover_contacts(state: SalesTechOutreachState) -> dict:
    company_ids = state.get("company_ids") or []
    errors = list(state.get("errors") or [])

    for cid in company_ids:
        t0 = time.perf_counter()
        try:
            await contact_discovery_graph.ainvoke({"company_id": cid})
            log.info(
                "discover_contacts[%d]: ok in %.1fs",
                cid,
                time.perf_counter() - t0,
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(f"discover[{cid}]: {type(exc).__name__}: {exc}")
            log.warning("discover_contacts[%d] failed: %s", cid, exc)

    return {"errors": errors}


# ── Node 3: enrich every contact with seniority + authority ──────────────


async def enrich_dms(state: SalesTechOutreachState) -> dict:
    company_ids = state.get("company_ids") or []
    errors = list(state.get("errors") or [])
    if not company_ids:
        return {"contact_ids_for_enrich": [], "errors": errors}

    # Pull every contact whose seniority/authority_score is unset OR who has
    # never been classified. classify_seniority short-circuits when both are
    # populated, so re-running the graph on already-classified rows is cheap.
    sql = """
        SELECT id
        FROM contacts
        WHERE company_id = ANY(%s)
          AND COALESCE(do_not_contact, false) = false
        ORDER BY id
    """
    ids: list[int] = []
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (company_ids,))
                ids = [int(r[0]) for r in cur.fetchall()]
    except psycopg.Error as e:
        errors.append(f"enrich_dms select: {e}")
        return {"contact_ids_for_enrich": [], "errors": errors}

    log.info("enrich_dms: classifying %d contacts", len(ids))
    for contact_id in ids:
        try:
            await contact_enrich_sales_graph.ainvoke({"contact_id": contact_id})
        except Exception as exc:  # noqa: BLE001
            errors.append(f"enrich[{contact_id}]: {type(exc).__name__}: {exc}")
            log.warning("enrich_dms[%d] failed: %s", contact_id, exc)

    return {"contact_ids_for_enrich": ids, "errors": errors}


# ── Node 4: filter to true decision-makers we can email ──────────────────


async def filter_dms(state: SalesTechOutreachState) -> dict:
    company_ids = state.get("company_ids") or []
    threshold = float(state.get("authority_threshold") or DEFAULT_AUTHORITY_THRESHOLD)
    errors = list(state.get("errors") or [])
    if not company_ids:
        return {"decision_makers": [], "errors": errors}

    sql = """
        SELECT co.id, co.first_name, co.last_name, co.email, co.position,
               co.authority_score, co.seniority,
               c.id AS company_id, c.name AS company_name,
               c.canonical_domain, c.website, c.description
        FROM contacts co
        JOIN companies c ON c.id = co.company_id
        WHERE co.company_id = ANY(%s)
          AND co.email IS NOT NULL
          AND co.email <> ''
          AND COALESCE(co.do_not_contact, false) = false
          AND COALESCE(co.authority_score, 0) >= %s
          AND NOT EXISTS (
              SELECT 1 FROM contact_emails ce
              WHERE ce.contact_id = co.id
                AND ce.status IN ('sent', 'scheduled', 'draft')
          )
        ORDER BY co.authority_score DESC NULLS LAST, c.score DESC NULLS LAST
    """
    out: list[dict[str, Any]] = []
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (company_ids, threshold))
                cols = [d[0] for d in cur.description or []]
                out = [dict(zip(cols, r)) for r in cur.fetchall()]
    except psycopg.Error as e:
        errors.append(f"filter_dms: {e}")

    log.info(
        "filter_dms: %d decision-makers (authority_score >= %.2f)",
        len(out),
        threshold,
    )
    return {"decision_makers": out, "errors": errors}


# ── Node 5: draft + persist tailored emails ──────────────────────────────


def _post_text_for(company: dict[str, Any]) -> str:
    desc = (company.get("description") or "").strip()
    if desc:
        return desc[:1200]
    name = company.get("company_name") or ""
    domain = company.get("canonical_domain") or company.get("website") or ""
    return f"{name} — {domain}".strip(" —")


def _insert_draft(
    cur: psycopg.Cursor,
    *,
    contact_id: int,
    company_id: int | None,
    email: str,
    recipient_name: str,
    subject: str,
    text: str,
    html: str,
) -> None:
    cur.execute(
        """
        INSERT INTO contact_emails
            (tenant_id, contact_id, company_id, resend_id, from_email,
             to_emails, subject, text_content, html_content, status,
             recipient_name, sequence_type, sequence_number,
             created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                now()::text, now()::text)
        """,
        (
            "vadim",
            contact_id,
            company_id,
            f"draft_{contact_id}_{int(time.time() * 1000)}",
            DRAFT_FROM_EMAIL,
            json.dumps([email]),
            subject,
            text,
            html,
            "draft",
            recipient_name,
            "initial",
            "0",
        ),
    )


async def draft_emails(state: SalesTechOutreachState) -> dict:
    dms = state.get("decision_makers") or []
    dry_run = bool(state.get("dry_run"))
    product_id = state.get("product_id")
    errors = list(state.get("errors") or [])
    skipped: dict[str, int] = {}
    drafts_created = 0

    if not dms:
        return {
            "drafts_created": 0,
            "skipped_by_reason": skipped,
            "errors": errors,
        }

    conn = None if dry_run else psycopg.connect(_dsn(), autocommit=True, connect_timeout=10)
    try:
        for dm in dms:
            recipient_name = f"{dm.get('first_name') or ''} {dm.get('last_name') or ''}".strip()
            payload: dict[str, Any] = {
                "recipient_name": recipient_name,
                "recipient_role": dm.get("position") or "",
                "recipient_email": dm.get("email") or "",
                "post_text": _post_text_for(dm),
                "post_url": dm.get("website") or "",
                "tone": "professional and friendly",
            }
            if product_id is not None:
                payload["product_id"] = int(product_id)

            try:
                result = await email_outreach_graph.ainvoke(payload)
            except Exception as exc:  # noqa: BLE001
                errors.append(
                    f"draft[{dm.get('id')}]: {type(exc).__name__}: {exc}"
                )
                continue

            skip_reason = result.get("skip_reason")
            if skip_reason:
                skipped[skip_reason] = skipped.get(skip_reason, 0) + 1
                continue

            subject = (result.get("subject") or "").strip()
            text = (result.get("text") or "").strip()
            html = (result.get("html") or "").strip()
            if not subject or not (text or html):
                skipped["empty_draft"] = skipped.get("empty_draft", 0) + 1
                continue

            if dry_run:
                drafts_created += 1
                log.info(
                    "draft[%s] DRY: subject=%r product_aware=%s",
                    dm.get("id"),
                    subject[:80],
                    bool(result.get("product_aware")),
                )
                continue

            try:
                with conn.cursor() as cur:  # type: ignore[union-attr]
                    _insert_draft(
                        cur,
                        contact_id=int(dm["id"]),
                        company_id=int(dm["company_id"]) if dm.get("company_id") else None,
                        email=dm["email"],
                        recipient_name=recipient_name,
                        subject=subject,
                        text=text,
                        html=html,
                    )
                drafts_created += 1
                log.info(
                    "draft[%s] saved: %r (product_aware=%s)",
                    dm.get("id"),
                    subject[:80],
                    bool(result.get("product_aware")),
                )
            except psycopg.Error as e:
                errors.append(f"persist[{dm.get('id')}]: {e}")
    finally:
        if conn is not None:
            conn.close()

    return {
        "drafts_created": drafts_created,
        "skipped_by_reason": skipped,
        "errors": errors,
    }


# ── Node 6: summary ──────────────────────────────────────────────────────


async def summarize(state: SalesTechOutreachState) -> dict:
    summary = {
        "companies_processed": len(state.get("company_ids") or []),
        "contacts_classified": len(state.get("contact_ids_for_enrich") or []),
        "decision_makers": len(state.get("decision_makers") or []),
        "drafts_created": int(state.get("drafts_created") or 0),
        "skipped_by_reason": dict(state.get("skipped_by_reason") or {}),
        "errors": list(state.get("errors") or []),
        "authority_threshold": float(
            state.get("authority_threshold") or DEFAULT_AUTHORITY_THRESHOLD
        ),
        "dry_run": bool(state.get("dry_run")),
    }
    log.info("sales_tech_outreach summary: %s", summary)
    return {"summary": summary}


# ── Graph ────────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(SalesTechOutreachState)
    builder.add_node("select_companies", select_companies)
    builder.add_node("discover_contacts", discover_contacts)
    builder.add_node("enrich_dms", enrich_dms)
    builder.add_node("filter_dms", filter_dms)
    builder.add_node("draft_emails", draft_emails)
    builder.add_node("summarize", summarize)

    builder.add_edge(START, "select_companies")
    builder.add_edge("select_companies", "discover_contacts")
    builder.add_edge("discover_contacts", "enrich_dms")
    builder.add_edge("enrich_dms", "filter_dms")
    builder.add_edge("filter_dms", "draft_emails")
    builder.add_edge("draft_emails", "summarize")
    builder.add_edge("summarize", END)

    if checkpointer is not None:
        return builder.compile(checkpointer=checkpointer)
    return builder.compile()


graph = build_graph()
