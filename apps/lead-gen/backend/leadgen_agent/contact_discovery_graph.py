"""Contact discovery graph — true fan-out across GitHub, papers, and team page.

Given a ``company_id``, three branches run in parallel:
  - ``gh_branch``      — GitHub org members (capped at 25)
  - ``papers_branch``  — academic paper authors via ``research_client``
  - ``team_branch``    — LLM extraction from the company team/about page

All three branches write into ``Annotated[list, operator.add]`` reducers so
LangGraph merges their outputs without conflict. After the fan-out, ``merge``
dedupes by ``(first_name, last_name)``, ``dedupe_vs_db`` filters contacts
already in the DB, and ``persist`` inserts new rows. Inserted contacts carry
``papers_enriched_at = NULL``, so the existing ``contact_enrich_graph`` queue
picks them up automatically — no extra wiring needed.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from typing import Any

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .llm import ainvoke_json_with_telemetry, make_deepseek_pro, merge_node_telemetry
from .loaders import fetch_url
from .state import ContactDiscoveryState

log = logging.getLogger(__name__)

GH_MEMBER_CAP = 25  # hard cap per batch — avoid burning GitHub rate limit

# Generic tokens that on their own don't anchor a paper search to a specific
# company. When a company name is composed only of these (e.g. "Capital
# Partners", "AI Group"), the papers_branch query collapses to a substring
# match and pulls unrelated researchers — see the Durlston Partners incident
# (2026-04-27) where 18 false-positive Researcher contacts were inserted.
PAPERS_BRANCH_STOPWORDS: set[str] = {
    "partners", "solutions", "group", "capital", "ventures", "labs",
    "consulting", "advisors", "associates", "holdings", "systems",
    "technologies", "tech", "services", "ai", "ml", "data", "analytics",
    "inc", "llc", "ltd", "corp", "company", "co", "studio", "studios",
    "agency", "team", "global", "international", "worldwide", "the",
}

# Categories where paper-author discovery is structurally inapplicable —
# researchers don't work at staffing/agency firms.
PAPERS_BRANCH_BLOCKED_CATEGORIES: set[str] = {"STAFFING", "AGENCY", "CONSULTANCY"}


# ── Helpers ──────────────────────────────────────────────────────────────────


def _name_key(first: str, last: str) -> tuple[str, str]:
    return (first.strip().lower(), last.strip().lower())


def _has_unique_anchor(company_name: str) -> bool:
    """True if the name has at least one token of length >= 4 not in the
    stopword set. Without one, a paper search degrades into substring matches
    on the generic word."""
    tokens = [t for t in re.split(r"[^a-z0-9]+", company_name.lower()) if t]
    return any(len(t) >= 4 and t not in PAPERS_BRANCH_STOPWORDS for t in tokens)


def _email_guesses(first: str, last: str, domain: str) -> list[str]:
    f, l = first.lower().strip(), last.lower().strip()
    if not f or not l or not domain:
        return []
    return [f"{f}.{l}@{domain}", f"{f}@{domain}", f"{f[0]}{l}@{domain}"]


def _github_headers() -> dict[str, str]:
    headers = {
        "User-Agent": "lead-gen-contact-discovery/1.0",
        "Accept": "application/vnd.github+json",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


# ── Node 1: load ──────────────────────────────────────────────────────────────


async def load(state: ContactDiscoveryState) -> dict:
    """Load company row from DB. Sets ``_error`` on failure."""
    company_id = state.get("company_id")
    if company_id is None:
        return {"_error": "company_id is required"}

    try:
        dsn = _dsn()
    except RuntimeError as e:
        return {"_error": str(e)}

    sql = """
        SELECT id, name, canonical_domain, github_org, category
        FROM companies
        WHERE id = %s
        LIMIT 1
    """
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (company_id,))
                row = cur.fetchone()
                if not row:
                    return {"_error": f"company id {company_id} not found"}
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"_error": f"db error loading company: {e}"}

    rec = dict(zip(cols, row))
    return {
        "company": {
            "id": rec["id"],
            "name": rec.get("name") or "",
            "canonical_domain": rec.get("canonical_domain") or "",
            "github_org": rec.get("github_org") or "",
            "category": (rec.get("category") or "").upper(),
        }
    }


# ── Node 2: gh_branch ────────────────────────────────────────────────────────


async def gh_branch(state: ContactDiscoveryState) -> dict:
    """Fetch GitHub org members and resolve their display names.

    Uses a single ``httpx.AsyncClient`` with ``asyncio.gather`` for the
    per-user detail fan-out. Returns an empty list on any HTTP failure so the
    join step always runs. Never sets ``_error``.
    """
    if state.get("_error"):
        return {"gh": []}

    t0 = time.perf_counter()
    company = state.get("company") or {}
    org = (company.get("github_org") or "").strip()
    if not org:
        return {"gh": [], "agent_timings": {"gh_branch": round(time.perf_counter() - t0, 3)}}

    headers = _github_headers()
    members_url = f"https://api.github.com/orgs/{org}/members"

    try:
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            resp = await client.get(members_url, params={"per_page": str(GH_MEMBER_CAP)})
            if resp.status_code != 200:
                log.info("gh_branch: org members non-200 (%s) for %s", resp.status_code, org)
                return {"gh": [], "agent_timings": {"gh_branch": round(time.perf_counter() - t0, 3)}}
            members = resp.json()
            if not isinstance(members, list):
                return {"gh": [], "agent_timings": {"gh_branch": round(time.perf_counter() - t0, 3)}}

            logins = [m["login"] for m in members[:GH_MEMBER_CAP] if isinstance(m, dict) and m.get("login")]

            async def _fetch_user(login: str) -> dict | None:
                try:
                    r = await client.get(f"https://api.github.com/users/{login}")
                    if r.status_code == 200:
                        return r.json()
                except Exception as exc:
                    log.debug("gh_branch: user detail failed for %s: %s", login, exc)
                return None

            user_details = await asyncio.gather(*[_fetch_user(l) for l in logins])

    except Exception as e:
        log.warning("gh_branch: failed for org %s: %s", org, e)
        return {"gh": [], "agent_timings": {"gh_branch": round(time.perf_counter() - t0, 3)}}

    out: list[dict[str, Any]] = []
    for u in user_details:
        if not isinstance(u, dict):
            continue
        full_name = (u.get("name") or "").strip()
        if not full_name:
            continue  # anon / handle-only — skip
        first, _, last = full_name.partition(" ")
        if not first:
            continue
        out.append(
            {
                "first_name": first,
                "last_name": last or "",
                "github_handle": u["login"],
                "position": u.get("bio") or "",
                "source": "github",
                "confidence": 0.55,
            }
        )

    return {
        "gh": out,
        "agent_timings": {"gh_branch": round(time.perf_counter() - t0, 3)},
    }


# ── Node 3: papers_branch ────────────────────────────────────────────────────


async def papers_branch(state: ContactDiscoveryState) -> dict:
    """Search academic papers for the company and extract unique authors.

    Broad signal: no surname filter (unlike contact_enrich_graph). Caps output
    at 30. Returns empty list on any failure. Never sets ``_error``.
    """
    if state.get("_error"):
        return {"papers": []}

    t0 = time.perf_counter()
    company = state.get("company") or {}
    company_name = (company.get("name") or "").strip()
    category = (company.get("category") or "").upper()
    if not company_name:
        return {"papers": [], "agent_timings": {"papers_branch": round(time.perf_counter() - t0, 3)}}

    if category in PAPERS_BRANCH_BLOCKED_CATEGORIES:
        log.info("papers_branch: skipping — category=%s for '%s'", category, company_name)
        return {"papers": [], "agent_timings": {"papers_branch": round(time.perf_counter() - t0, 3)}}

    if not _has_unique_anchor(company_name):
        log.info("papers_branch: skipping — no unique anchor token in '%s'", company_name)
        return {"papers": [], "agent_timings": {"papers_branch": round(time.perf_counter() - t0, 3)}}

    try:
        from research_client import search_papers  # lazy import — dep is optional

        # Quote the company name so the search engine treats it as a phrase
        # rather than free-text tokens. Generic words like "partners" can
        # otherwise pull unrelated authors.
        query = f'"{company_name}" AI'
        raw = await search_papers(query, limit=20)
    except Exception as e:
        log.warning("papers_branch: search_papers failed: %s", e)
        return {"papers": [], "agent_timings": {"papers_branch": round(time.perf_counter() - t0, 3)}}

    # Collect unique authors across all papers
    seen_keys: set[tuple[str, str]] = set()
    out: list[dict[str, Any]] = []

    for paper in raw:
        paper_meta = {
            "title": paper.title,
            "year": paper.year,
            "doi": getattr(paper, "doi", None),
            "url": getattr(paper, "url", None) or getattr(paper, "pdf_url", None),
            "citation_count": getattr(paper, "citation_count", None),
            "source": getattr(paper, "source", None),
        }
        authors = getattr(paper, "authors", []) or []
        for author_name in authors:
            if not isinstance(author_name, str) or not author_name.strip():
                continue
            first, _, last = author_name.strip().partition(" ")
            if not first or not last:
                continue
            k = _name_key(first, last)
            if k in seen_keys:
                # Append paper to existing entry
                for c in out:
                    if _name_key(c["first_name"], c["last_name"]) == k:
                        c["papers"].append(paper_meta)
                        break
                continue
            seen_keys.add(k)
            out.append(
                {
                    "first_name": first,
                    "last_name": last,
                    "position": "Researcher",
                    "tags": [],
                    "papers": [paper_meta],
                    "source": "papers",
                    "confidence": 0.65,
                }
            )
            if len(out) >= 30:
                break
        if len(out) >= 30:
            break

    return {
        "papers": out,
        "agent_timings": {"papers_branch": round(time.perf_counter() - t0, 3)},
    }


# ── Node 4: team_branch ──────────────────────────────────────────────────────


async def team_branch(state: ContactDiscoveryState) -> dict:
    """Fetch the company team/about page and LLM-extract people.

    Tries /team, /about, /people, /about-us in order; takes the first result
    with markdown length > 500. Returns empty list on failure. Never sets
    ``_error``.
    """
    if state.get("_error"):
        return {"team": []}

    t0 = time.perf_counter()
    company = state.get("company") or {}
    domain = (company.get("canonical_domain") or "").strip()
    if not domain:
        return {"team": [], "agent_timings": {"team_branch": round(time.perf_counter() - t0, 3)}}

    # Try common team/about paths — take first with substantive markdown
    paths = ["/team", "/about", "/people", "/about-us"]
    markdown = ""
    for path in paths:
        url = f"https://{domain}{path}"
        try:
            result = await fetch_url(url)
            content = result.get("markdown") or ""
            if len(content) > 500:
                markdown = content
                break
        except Exception as e:
            log.debug("team_branch: fetch_url failed for %s: %s", url, e)

    if not markdown:
        return {"team": [], "agent_timings": {"team_branch": round(time.perf_counter() - t0, 3)}}

    # LLM extraction
    llm = make_deepseek_pro(temperature=0.2)
    system_msg = (
        "Extract the list of people from this company team/about page. "
        "Return strict JSON: "
        '{\"people\": [{\"first_name\": string, \"last_name\": string, '
        '\"position\": string, \"linkedin_url\": string|null}]}. '
        "Skip generic job titles with no name. Skip photo alt-text."
    )
    user_msg = markdown[:12000]

    try:
        parsed, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            provider="deepseek",
        )
    except Exception as e:
        log.warning("team_branch: LLM extraction failed: %s", e)
        return {"team": [], "agent_timings": {"team_branch": round(time.perf_counter() - t0, 3)}}

    people_raw = (parsed or {}).get("people") if isinstance(parsed, dict) else None
    if not isinstance(people_raw, list):
        return {"team": [], "agent_timings": {"team_branch": round(time.perf_counter() - t0, 3)}}

    team_list: list[dict[str, Any]] = []
    for p in people_raw:
        if not isinstance(p, dict):
            continue
        first = (p.get("first_name") or "").strip()
        last = (p.get("last_name") or "").strip()
        if not first or not last:
            continue
        team_list.append(
            {
                "first_name": first,
                "last_name": last,
                "position": p.get("position") or "",
                "linkedin_url": p.get("linkedin_url"),
                "source": "team_page",
                "confidence": 0.70,
            }
        )

    existing_tel = (state.get("graph_meta") or {}).get("telemetry")
    merged_tel = merge_node_telemetry(existing_tel, "team_branch", tel)

    return {
        "team": team_list,
        "agent_timings": {"team_branch": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"telemetry": merged_tel},
    }


# ── Node 5: merge ────────────────────────────────────────────────────────────


async def merge(state: ContactDiscoveryState) -> dict:
    """Join fan-out results, dedupe by name key, apply multi-source bonus."""
    if state.get("_error"):
        return {"merged": []}

    t0 = time.perf_counter()
    company = state.get("company") or {}
    domain = (company.get("canonical_domain") or "").strip()

    all_c = [
        *state.get("gh", []),
        *state.get("papers", []),
        *state.get("team", []),
    ]

    keyed: dict[tuple[str, str], dict[str, Any]] = {}
    for c in all_c:
        if not isinstance(c, dict):
            continue
        k = _name_key(c.get("first_name") or "", c.get("last_name") or "")
        if not k[0] or not k[1]:
            continue
        if k in keyed:
            ex = keyed[k]
            ex["sources"] = list({*ex.get("sources", [ex["source"]]), c["source"]})
            ex["linkedin_url"] = ex.get("linkedin_url") or c.get("linkedin_url")
            ex["github_handle"] = ex.get("github_handle") or c.get("github_handle")
            ex["papers"] = [*ex.get("papers", []), *c.get("papers", [])]
            ex["tags"] = list({*ex.get("tags", []), *c.get("tags", [])})
            ex["confidence"] = min(max(ex["confidence"], c["confidence"]) + 0.10, 0.95)
        else:
            keyed[k] = {**c, "sources": [c["source"]]}

    for c in keyed.values():
        c["email_guesses"] = _email_guesses(
            c.get("first_name") or "", c.get("last_name") or "", domain
        )

    return {
        "merged": list(keyed.values()),
        "agent_timings": {"merge": round(time.perf_counter() - t0, 3)},
    }


# ── Node 6: dedupe_vs_db ─────────────────────────────────────────────────────


async def dedupe_vs_db(state: ContactDiscoveryState) -> dict:
    """Filter out candidates already present in the DB and low-confidence ones.

    Queries contacts by email overlap and github_handle overlap for the given
    company. Drops candidates where any email_guess already exists or whose
    github_handle is already taken. Also drops confidence < 0.5.
    """
    if state.get("_error"):
        return {"candidates": [], "skipped_existing": 0}

    t0 = time.perf_counter()
    merged = state.get("merged") or []
    company_id = state.get("company_id")

    if not merged:
        return {
            "candidates": [],
            "skipped_existing": 0,
            "agent_timings": {"dedupe_vs_db": round(time.perf_counter() - t0, 3)},
        }

    all_emails: list[str] = []
    all_handles: list[str] = []
    for c in merged:
        all_emails.extend(c.get("email_guesses") or [])
        h = c.get("github_handle") or ""
        if h:
            all_handles.append(h)

    existing_emails: set[str] = set()
    existing_handles: set[str] = set()

    try:
        dsn = _dsn()
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                if all_emails or all_handles:
                    cur.execute(
                        """
                        SELECT email, github_handle
                        FROM contacts
                        WHERE company_id = %s
                          AND (
                              email = ANY(%s)
                              OR github_handle = ANY(%s)
                          )
                        """,
                        (
                            company_id,
                            all_emails or [""],
                            all_handles or [""],
                        ),
                    )
                    for row in cur.fetchall():
                        if row[0]:
                            existing_emails.add(row[0].lower())
                        if row[1]:
                            existing_handles.add(row[1].lower())
    except Exception as e:
        log.warning("dedupe_vs_db: db query failed, proceeding without DB filter: %s", e)

    survivors: list[dict[str, Any]] = []
    for c in merged:
        if (c.get("confidence") or 0.0) < 0.5:
            continue
        guesses = [e.lower() for e in (c.get("email_guesses") or [])]
        if any(e in existing_emails for e in guesses):
            continue
        handle = (c.get("github_handle") or "").lower()
        if handle and handle in existing_handles:
            continue
        survivors.append(c)

    return {
        "candidates": survivors,
        "skipped_existing": len(merged) - len(survivors),
        "agent_timings": {"dedupe_vs_db": round(time.perf_counter() - t0, 3)},
    }


# ── Node 7: persist ──────────────────────────────────────────────────────────


async def persist(state: ContactDiscoveryState) -> dict:
    """Insert surviving candidates into ``contacts``, one row at a time.

    Uses ``ON CONFLICT DO NOTHING`` so the INSERT is safe to re-run. Counts
    actual inserted rows via ``rowcount``. Contacts are tagged with
    ``['contact-discovery', ...sources]`` and carry ``papers`` as jsonb for
    the ``contact_enrich_graph`` handoff (it queues on
    ``papers_enriched_at IS NULL``).
    """
    if state.get("_error"):
        return {"candidates_inserted": 0}

    t0 = time.perf_counter()
    candidates = state.get("candidates") or []
    company_id = state.get("company_id")

    if not candidates:
        return {
            "candidates_inserted": 0,
            "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
        }

    insert_sql = """
        INSERT INTO contacts
            (tenant_id, first_name, last_name, company_id, position,
             github_handle, linkedin_url, email, tags, ai_profile,
             papers, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now()::text, now()::text)
        ON CONFLICT DO NOTHING
    """

    inserted = 0
    try:
        dsn = _dsn()
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                for c in candidates:
                    email_guesses = c.get("email_guesses") or []
                    email = email_guesses[0] if email_guesses else None
                    papers_list = c.get("papers") or []
                    papers_json = json.dumps(papers_list) if papers_list else None

                    tags_list = ["contact-discovery"] + list(c.get("sources") or [c.get("source") or ""])
                    ai_profile = {
                        "confidence": c.get("confidence"),
                        "sources": c.get("sources") or [c.get("source")],
                        "email_guesses": email_guesses,
                        "papers": papers_list,
                        "tags": c.get("tags") or [],
                    }

                    try:
                        cur.execute(
                            insert_sql,
                            (
                                "nyx",
                                c.get("first_name") or "",
                                c.get("last_name") or "",
                                company_id,
                                c.get("position") or None,
                                c.get("github_handle") or None,
                                c.get("linkedin_url") or None,
                                email,
                                json.dumps(tags_list),
                                json.dumps(ai_profile),
                                papers_json,
                            ),
                        )
                        if cur.rowcount and cur.rowcount > 0:
                            inserted += 1
                    except psycopg.Error as row_err:
                        log.debug(
                            "persist: skipping row for %s %s: %s",
                            c.get("first_name"),
                            c.get("last_name"),
                            row_err,
                        )
    except psycopg.Error as e:
        log.error("persist: db connection failed: %s", e)

    return {
        "candidates_inserted": inserted,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


# ── Graph builder ─────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ContactDiscoveryState)

    builder.add_node("load", load)
    builder.add_node("gh_branch", gh_branch)
    builder.add_node("papers_branch", papers_branch)
    builder.add_node("team_branch", team_branch)
    builder.add_node("merge", merge)
    builder.add_node("dedupe_vs_db", dedupe_vs_db)
    builder.add_node("persist", persist)

    builder.add_edge(START, "load")

    # Fan-out: load → three parallel branches
    builder.add_edge("load", "gh_branch")
    builder.add_edge("load", "papers_branch")
    builder.add_edge("load", "team_branch")

    # Join: all three branches → merge (LangGraph waits for all three because
    # of the Annotated[list, operator.add] reducers on state.gh/papers/team)
    builder.add_edge("gh_branch", "merge")
    builder.add_edge("papers_branch", "merge")
    builder.add_edge("team_branch", "merge")

    builder.add_edge("merge", "dedupe_vs_db")
    builder.add_edge("dedupe_vs_db", "persist")
    builder.add_edge("persist", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
