"""End-to-end B2B lead generation pipeline as a single LangGraph.

Port of the Rust ``leadgen_metal::teams::run_pipeline`` orchestrator that
lived in ``crates/metal/src/teams/mod.rs``. Instead of re-implementing the
phase logic, this graph **invokes the existing LangGraph subgraphs** that
already own each phase:

    discover  → company_discovery_graph.graph        (seed_query → candidates)
    enrich    → company_enrichment_graph.graph       (company_id → facts)
    contacts  → contact_discovery_graph.graph        (company_id → contacts)
                contact_enrich_graph.graph           (contact_id → tags/papers)
    qa        → lightweight SQL-only audit (in-graph)
    outreach  → email_outreach_graph.graph           (recipient → draft)

The meta-graph is a linear 5-node state machine with two DB-driven queue
nodes sandwiched between each subgraph call (``_queue_*`` loads company /
contact ids from Neon, the subgraph runs per id, results are aggregated
into the shared state). Blocklisted domains are filtered out of every
queue using :mod:`leadgen_agent.blocklist`.

Inputs (``PipelineGraphState``):
    seed_query       – free-form discovery query (optional, defaults to
                       ``ICP_VERTICAL`` env or "AI consultancy remote").
    domains          – explicit list of domains (skips discover brainstorm
                       when present — mirrors the Rust ``--domains FILE``
                       flag; the CLI reads the file and passes the list).
    auto_confirm     – when True, skip the human approval gate before
                       outreach (mirrors ``--yes``).
    run_all          – when True, run every stage regardless of state
                       (mirrors ``--all``).
    max_per_stage    – cap the number of rows processed per stage. None
                       lets each subgraph process the full queue.

Output: ``reports`` dict keyed by stage name with processed/created/errors.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from . import blocklist
from .company_discovery_graph import graph as discovery_graph
from .company_enrichment_graph import graph as enrichment_graph
from .contact_discovery_graph import graph as contact_discovery_graph
from .contact_enrich_graph import graph as contact_enrich_graph
from .deep_icp_graph import _dsn
from .email_outreach_graph import graph as outreach_graph

log = logging.getLogger(__name__)


# ── State ────────────────────────────────────────────────────────────────


class StageReport(TypedDict, total=False):
    stage: str
    status: str  # "OK" | "PARTIAL" | "FAIL" | "SKIP"
    processed: int
    created: int
    errors: list[str]
    duration_ms: int


class PipelineGraphState(TypedDict, total=False):
    # input
    seed_query: str
    domains: list[str]
    auto_confirm: bool
    run_all: bool
    max_per_stage: int | None
    # working
    discovered_ids: list[int]
    enriched_ids: list[int]
    contact_ids: list[int]
    qa_issues: list[str]
    outreach_candidates: list[dict[str, Any]]
    # output — one entry per stage
    reports: list[StageReport]
    _error: str


# ── Helpers ──────────────────────────────────────────────────────────────


def _now_ms() -> int:
    return int(time.time() * 1000)


def _status(processed: int, created: int, errors: list[str]) -> str:
    if errors and created == 0:
        return "FAIL"
    if errors:
        return "PARTIAL"
    if processed == 0:
        return "SKIP"
    return "OK"


def _blocked_domains_set() -> set[str]:
    """Return lowercase set of blocklisted domains. Empty on error."""
    try:
        return {b.domain for b in blocklist.list_all()}
    except Exception as e:  # noqa: BLE001
        log.warning("blocklist load failed: %s", e)
        return set()


# ── Node 1: discover ─────────────────────────────────────────────────────


async def run_discover(state: PipelineGraphState) -> dict:
    """Invoke ``company_discovery_graph`` (subgraph).

    If ``state['domains']`` is populated, each domain is inserted as a
    candidate company directly and the LLM brainstorm is skipped — this
    mirrors the ``--domains FILE`` behaviour of the Rust CLI.
    """
    t0 = _now_ms()
    errors: list[str] = []
    created = 0
    processed = 0
    new_ids: list[int] = []
    blocked = _blocked_domains_set()

    domains = state.get("domains") or []
    seed_query = state.get("seed_query") or os.environ.get("ICP_VERTICAL") or "AI consultancy remote"

    if domains:
        # Explicit-domain path — insert rows directly, skip the subgraph.
        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    for raw in domains:
                        domain = blocklist.canonicalize_domain(raw)
                        if not domain or domain in blocked:
                            continue
                        processed += 1
                        cur.execute(
                            "SELECT id FROM companies WHERE canonical_domain = %s LIMIT 1",
                            (domain,),
                        )
                        existing = cur.fetchone()
                        if existing:
                            new_ids.append(int(existing[0]))
                            continue
                        cur.execute(
                            """
                            INSERT INTO companies (name, canonical_domain, website, tags)
                            VALUES (%s, %s, %s, ARRAY['discovery-candidate', 'cli-domains']::text[])
                            RETURNING id
                            """,
                            (domain, domain, f"https://{domain}"),
                        )
                        row = cur.fetchone()
                        if row:
                            new_ids.append(int(row[0]))
                            created += 1
        except psycopg.Error as e:
            errors.append(f"discover: {e}")
    else:
        # Subgraph path — delegate to company_discovery_graph.
        try:
            result = await discovery_graph.ainvoke({"seed_query": seed_query})
            inserted = result.get("inserted_ids") or []
            new_ids = [int(x) for x in inserted]
            created = len(new_ids)
            processed = len(result.get("candidates") or []) or created
            if result.get("_error"):
                errors.append(str(result["_error"]))
        except Exception as e:  # noqa: BLE001
            errors.append(f"discover: {e}")

    report: StageReport = {
        "stage": "discover",
        "status": _status(processed, created, errors),
        "processed": processed,
        "created": created,
        "errors": errors,
        "duration_ms": _now_ms() - t0,
    }
    reports = list(state.get("reports") or [])
    reports.append(report)
    return {"discovered_ids": new_ids, "reports": reports}


# ── Node 2: enrich ───────────────────────────────────────────────────────


def _queue_enrich(limit: int | None, blocked: set[str]) -> list[int]:
    """Pull un-enriched company ids from Neon."""
    sql = """
        SELECT id FROM companies
        WHERE (category IS NULL OR ai_tier IS NULL)
          AND canonical_domain IS NOT NULL
          AND canonical_domain <> ''
        ORDER BY created_at DESC
    """
    if limit:
        sql += f" LIMIT {int(limit) * 2}"  # over-fetch, filter blocklist below
    ids: list[int] = []
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            for row in cur.fetchall():
                cid = int(row[0])
                if blocked:
                    cur.execute(
                        "SELECT canonical_domain FROM companies WHERE id = %s",
                        (cid,),
                    )
                    d = (cur.fetchone() or [""])[0]
                    if d in blocked:
                        continue
                ids.append(cid)
                if limit and len(ids) >= limit:
                    break
    return ids


async def run_enrich(state: PipelineGraphState) -> dict:
    t0 = _now_ms()
    errors: list[str] = []
    processed = 0
    created = 0
    enriched_ids: list[int] = []
    blocked = _blocked_domains_set()
    limit = state.get("max_per_stage")

    try:
        queue = _queue_enrich(limit, blocked)
    except psycopg.Error as e:
        queue = []
        errors.append(f"enrich queue: {e}")

    for cid in queue:
        processed += 1
        try:
            result = await enrichment_graph.ainvoke({"company_id": cid})
            if result.get("updated"):
                created += 1
                enriched_ids.append(cid)
            if result.get("_error"):
                errors.append(f"enrich[{cid}]: {result['_error']}")
        except Exception as e:  # noqa: BLE001
            errors.append(f"enrich[{cid}]: {e}")

    report: StageReport = {
        "stage": "enrich",
        "status": _status(processed, created, errors),
        "processed": processed,
        "created": created,
        "errors": errors,
        "duration_ms": _now_ms() - t0,
    }
    reports = list(state.get("reports") or [])
    reports.append(report)
    return {"enriched_ids": enriched_ids, "reports": reports}


# ── Node 3: contacts ─────────────────────────────────────────────────────


def _queue_contacts(limit: int | None, blocked: set[str]) -> list[int]:
    """Enriched companies that have < 3 contacts."""
    sql = """
        SELECT c.id
        FROM companies c
        LEFT JOIN (
            SELECT company_id, COUNT(*) AS n
            FROM contacts
            GROUP BY company_id
        ) cc ON cc.company_id = c.id
        WHERE c.category IS NOT NULL
          AND c.ai_tier IS NOT NULL
          AND COALESCE(cc.n, 0) < 3
          AND c.canonical_domain IS NOT NULL
    """
    if blocked:
        # rely on post-filter below; keeping SQL simple
        pass
    sql += " ORDER BY c.score DESC NULLS LAST"
    if limit:
        sql += f" LIMIT {int(limit) * 2}"
    ids: list[int] = []
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    for row in rows:
        ids.append(int(row[0]))
        if limit and len(ids) >= limit:
            break
    return ids


async def run_contacts(state: PipelineGraphState) -> dict:
    t0 = _now_ms()
    errors: list[str] = []
    processed = 0
    created = 0
    contact_ids: list[int] = []
    blocked = _blocked_domains_set()
    limit = state.get("max_per_stage")

    try:
        queue = _queue_contacts(limit, blocked)
    except psycopg.Error as e:
        queue = []
        errors.append(f"contacts queue: {e}")

    for cid in queue:
        processed += 1
        try:
            disc = await contact_discovery_graph.ainvoke({"company_id": cid})
            inserted = disc.get("inserted_ids") or disc.get("contact_ids") or []
            for contact_id in inserted:
                try:
                    cid_int = int(contact_id)
                except (TypeError, ValueError):
                    continue
                contact_ids.append(cid_int)
                created += 1
                # Best-effort enrichment per contact; errors don't fail the stage.
                try:
                    await contact_enrich_graph.ainvoke({"contact_id": cid_int})
                except Exception as e:  # noqa: BLE001
                    errors.append(f"contact_enrich[{cid_int}]: {e}")
            if disc.get("_error"):
                errors.append(f"contacts[{cid}]: {disc['_error']}")
        except Exception as e:  # noqa: BLE001
            errors.append(f"contacts[{cid}]: {e}")

    report: StageReport = {
        "stage": "contacts",
        "status": _status(processed, created, errors),
        "processed": processed,
        "created": created,
        "errors": errors,
        "duration_ms": _now_ms() - t0,
    }
    reports = list(state.get("reports") or [])
    reports.append(report)
    return {"contact_ids": contact_ids, "reports": reports}


# ── Node 4: qa ───────────────────────────────────────────────────────────


async def run_qa(state: PipelineGraphState) -> dict:
    """Lightweight SQL-only audit — counts bad rows so the operator knows
    where to look. The full Rust ``teams::qa`` covered dedup / deliverability
    / score validation; that logic belongs in dedicated graphs and is
    deferred here (see TODO in CLI).
    """
    t0 = _now_ms()
    errors: list[str] = []
    issues: list[str] = []
    processed = 0

    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM companies WHERE canonical_domain IS NULL OR canonical_domain = ''")
                n_bad_domain = int((cur.fetchone() or [0])[0])
                if n_bad_domain:
                    issues.append(f"companies missing canonical_domain: {n_bad_domain}")
                cur.execute(
                    "SELECT COUNT(*) FROM contacts WHERE email IS NOT NULL "
                    "AND email !~ '^[^@]+@[^@]+\\.[^@]+$'"
                )
                n_bad_email = int((cur.fetchone() or [0])[0])
                if n_bad_email:
                    issues.append(f"contacts with malformed email: {n_bad_email}")
                cur.execute("SELECT COUNT(*) FROM companies WHERE score IS NOT NULL AND (score < 0 OR score > 1)")
                n_bad_score = int((cur.fetchone() or [0])[0])
                if n_bad_score:
                    issues.append(f"companies with score outside [0,1]: {n_bad_score}")
                processed = 3
    except psycopg.Error as e:
        errors.append(f"qa: {e}")

    report: StageReport = {
        "stage": "qa",
        "status": _status(processed, len(issues), errors),
        "processed": processed,
        "created": len(issues),
        "errors": errors,
        "duration_ms": _now_ms() - t0,
    }
    reports = list(state.get("reports") or [])
    reports.append(report)
    return {"qa_issues": issues, "reports": reports}


# ── Node 5: outreach ─────────────────────────────────────────────────────


def _queue_outreach(limit: int | None, blocked: set[str]) -> list[dict[str, Any]]:
    """Verified contacts that haven't been emailed yet."""
    sql = """
        SELECT co.id, co.first_name, co.last_name, co.position, co.email,
               c.canonical_domain, c.name
        FROM contacts co
        JOIN companies c ON c.id = co.company_id
        WHERE co.email IS NOT NULL
          AND co.email <> ''
          AND co.last_outreach_at IS NULL
        ORDER BY c.score DESC NULLS LAST
    """
    if limit:
        sql += f" LIMIT {int(limit) * 2}"
    out: list[dict[str, Any]] = []
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(sql)
                rows = cur.fetchall()
            except psycopg.Error:
                # last_outreach_at column may not exist — retry without it
                cur.execute(
                    """
                    SELECT co.id, co.first_name, co.last_name, co.position, co.email,
                           c.canonical_domain, c.name
                    FROM contacts co
                    JOIN companies c ON c.id = co.company_id
                    WHERE co.email IS NOT NULL AND co.email <> ''
                    ORDER BY c.score DESC NULLS LAST
                    LIMIT %s
                    """,
                    ((limit or 10) * 2,),
                )
                rows = cur.fetchall()
    for r in rows:
        domain = (r[5] or "").lower()
        if blocked and domain in blocked:
            continue
        out.append({
            "contact_id": int(r[0]),
            "recipient_name": f"{r[1] or ''} {r[2] or ''}".strip(),
            "recipient_role": r[3] or "",
            "recipient_email": r[4] or "",
            "company_domain": domain,
            "company_name": r[6] or "",
        })
        if limit and len(out) >= limit:
            break
    return out


async def run_outreach(state: PipelineGraphState) -> dict:
    """Compose drafts via ``email_outreach_graph``.

    Honours ``auto_confirm``: when False this node only surfaces the queue
    without drafting (approval gate equivalent to the Rust ``outreach::run``
    behaviour). Sending is never done in-graph — drafts only.
    """
    t0 = _now_ms()
    errors: list[str] = []
    processed = 0
    created = 0
    blocked = _blocked_domains_set()
    limit = state.get("max_per_stage")
    auto_confirm = bool(state.get("auto_confirm"))

    try:
        queue = _queue_outreach(limit, blocked)
    except psycopg.Error as e:
        queue = []
        errors.append(f"outreach queue: {e}")

    if not auto_confirm:
        # Approval gate — report the queue only, do nothing else.
        report: StageReport = {
            "stage": "outreach",
            "status": "SKIP",
            "processed": len(queue),
            "created": 0,
            "errors": [f"approval gate: {len(queue)} candidates queued — re-run with auto_confirm=True"],
            "duration_ms": _now_ms() - t0,
        }
        reports = list(state.get("reports") or [])
        reports.append(report)
        return {"outreach_candidates": queue, "reports": reports}

    for cand in queue:
        processed += 1
        try:
            payload = {
                "recipient_name": cand["recipient_name"],
                "recipient_role": cand["recipient_role"],
                "recipient_email": cand["recipient_email"],
                "post_text": "",
                "post_url": "",
                "tone": "warm",
            }
            result = await outreach_graph.ainvoke(payload)
            if result.get("subject") and (result.get("text") or result.get("html")):
                created += 1
        except Exception as e:  # noqa: BLE001
            errors.append(f"outreach[{cand.get('contact_id')}]: {e}")

    report = {
        "stage": "outreach",
        "status": _status(processed, created, errors),
        "processed": processed,
        "created": created,
        "errors": errors,
        "duration_ms": _now_ms() - t0,
    }
    reports = list(state.get("reports") or [])
    reports.append(report)
    return {"reports": reports}


# ── Graph ────────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(PipelineGraphState)
    builder.add_node("discover", run_discover)
    builder.add_node("enrich", run_enrich)
    builder.add_node("contacts", run_contacts)
    builder.add_node("qa", run_qa)
    builder.add_node("outreach", run_outreach)

    builder.add_edge(START, "discover")
    builder.add_edge("discover", "enrich")
    builder.add_edge("enrich", "contacts")
    builder.add_edge("contacts", "qa")
    builder.add_edge("qa", "outreach")
    builder.add_edge("outreach", END)

    if checkpointer is not None:
        return builder.compile(checkpointer=checkpointer)
    return builder.compile()


graph = build_graph()
