"""Contact enrichment graph — github handle + papers + tags.

Five-node pipeline that augments a contact with:
  1. A GitHub handle, resolved via the Search Users API when missing. Persisted
     in-graph to ``contacts.github_handle`` (the only write this graph performs)
     so downstream graphs see it immediately.
  2. A curated list of academic papers (via ``research_client.search_papers``,
     which fans out to OpenAlex → Crossref → Semantic Scholar with fallback).
  3. A normalized set of research tags, constrained to a small taxonomy so the
     downstream LoRA / scoring loop can rely on them.

Input: ``{contact_id: int}``. Output: ``{papers, tags, tags_added, enriched_at,
github_handle, github_handle_source, error}``. Papers and tags are returned for
the caller to persist (``src/apollo/resolvers/contacts/mutations.ts``); the
github handle is persisted in-graph.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph
from langgraph.types import RunnableConfig

from .llm import ainvoke_json, make_llm
from .state import ContactEnrichState

log = logging.getLogger(__name__)

TAG_TAXONOMY = [
    "LLM",
    "RAG",
    "Agents",
    "RL",
    "CV",
    "NLP",
    "Speech",
    "Multimodal",
    "Robotics",
    "Diffusion",
    "Alignment",
    "Evaluation",
    "Inference-Optimization",
    "Distributed-Training",
    "MLOps",
]


def _parse_json_text(raw: Any) -> Any:
    if isinstance(raw, str) and raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return raw


async def load_contact(state: ContactEnrichState) -> dict:
    contact_id = state.get("contact_id")
    if contact_id is None:
        return {"error": "contact_id is required"}

    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return {"error": "NEON_DATABASE_URL not set"}

    sql = """
        SELECT c.id, c.first_name, c.last_name, c.position, c.linkedin_url,
               c.github_handle, c.seniority, c.department, c.ai_profile, c.tags,
               co.name AS company_name, co.website AS company_website,
               co.description AS company_description
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
    ai_profile = _parse_json_text(rec.get("ai_profile")) or {}
    existing_tags_raw = _parse_json_text(rec.get("tags"))
    existing_tags = [str(t) for t in existing_tags_raw] if isinstance(existing_tags_raw, list) else []
    research_areas_raw = ai_profile.get("research_areas") if isinstance(ai_profile, dict) else None
    existing_research_areas = (
        [str(t) for t in research_areas_raw] if isinstance(research_areas_raw, list) else []
    )

    return {
        "contact": {
            "id": rec["id"],
            "first_name": rec.get("first_name") or "",
            "last_name": rec.get("last_name") or "",
            "position": rec.get("position") or "",
            "linkedin_url": rec.get("linkedin_url") or "",
            "github_handle": rec.get("github_handle") or "",
            "seniority": rec.get("seniority") or "",
            "department": rec.get("department") or "",
            "ai_profile": ai_profile if isinstance(ai_profile, dict) else {},
        },
        "company": {
            "name": rec.get("company_name") or "",
            "website": rec.get("company_website") or "",
            "description": rec.get("company_description") or "",
        },
        "existing_tags": existing_tags,
        "existing_research_areas": existing_research_areas,
    }


async def _resolve_github_handle(
    first: str,
    last: str,
) -> str | None:
    """Look up a GitHub login for ``first last`` via the Search Users API.

    Mirrors ``searchGitHubByName`` in ``src/lib/ai-contact-enrichment.ts``. Uses
    ``GITHUB_TOKEN`` if present (30 req/min vs 10 unauthenticated). Any network
    or parse failure returns ``None`` — callers treat "no match" and "lookup
    failed" the same so the rest of the graph still runs.
    """
    first = (first or "").strip()
    last = (last or "").strip()
    if not first or not last:
        return None

    headers = {
        "User-Agent": "lead-gen-enrichment/1.0",
        "Accept": "application/vnd.github+json",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"token {token}"

    params = {"q": f'fullname:"{first} {last}"', "per_page": "3"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                "https://api.github.com/search/users",
                params=params,
                headers=headers,
            )
            if res.status_code != 200:
                log.info("github search non-200: %s", res.status_code)
                return None
            data = res.json()
    except Exception as e:  # network / JSON parse / etc.
        log.warning("github search failed: %s", e)
        return None

    items = data.get("items") if isinstance(data, dict) else None
    if not isinstance(items, list) or not items:
        return None

    surname = last.lower()
    # Accept the top match only if its login or display name contains the
    # surname — same sanity rule as `_surname_overlap` below, keeps us from
    # attaching a random match when the full-name query returns loose results.
    for candidate in items[:3]:
        if not isinstance(candidate, dict):
            continue
        login = candidate.get("login")
        if not isinstance(login, str) or not login:
            continue
        name_field = candidate.get("name")
        haystack = f"{login} {name_field or ''}".lower()
        if surname in haystack:
            return login

    return None


def _persist_github_handle(contact_id: int, handle: str) -> bool:
    """Persist a freshly-resolved handle to ``contacts.github_handle``.

    Returns True on a successful UPDATE, False otherwise. Uses a short-lived
    synchronous connection (same pattern as ``load_contact``).
    """
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return False
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE contacts SET github_handle = %s, updated_at = NOW() "
                    "WHERE id = %s AND github_handle IS NULL",
                    (handle, contact_id),
                )
                return cur.rowcount > 0
    except psycopg.Error as e:
        log.warning("failed to persist github_handle for %s: %s", contact_id, e)
        return False


async def resolve_github_handle(state: ContactEnrichState) -> dict:
    """Populate ``github_handle`` for the contact.

    Skips the GitHub API call entirely when a handle is already present.
    When a new handle is resolved, writes it back to Postgres immediately so
    that downstream graphs (score_contact, future LoRA runs) pick it up even
    if the caller doesn't re-read the state.
    """
    if state.get("error"):
        return {"github_handle": "", "github_handle_source": ""}

    contact = state.get("contact") or {}
    existing = (contact.get("github_handle") or "").strip()
    if existing:
        return {"github_handle": existing, "github_handle_source": "existing"}

    first = contact.get("first_name") or ""
    last = contact.get("last_name") or ""
    login = await _resolve_github_handle(first, last)
    if not login:
        return {"github_handle": "", "github_handle_source": ""}

    contact_id = contact.get("id")
    if isinstance(contact_id, int):
        _persist_github_handle(contact_id, login)

    # Reflect the resolved handle in the state so later nodes (and the caller)
    # see it as if it had been loaded from the DB.
    updated_contact = {**contact, "github_handle": login}
    return {
        "contact": updated_contact,
        "github_handle": login,
        "github_handle_source": "search",
    }


def _surname_overlap(paper_authors: list[str], surname: str) -> bool:
    if not surname:
        return True
    surname_lower = surname.strip().lower()
    for a in paper_authors:
        if surname_lower and surname_lower in a.lower():
            return True
    return False


async def fetch_papers(state: ContactEnrichState) -> dict:
    if state.get("error"):
        return {"papers": []}

    from research_client import search_papers  # lazy import — dep is optional

    contact = state.get("contact") or {}
    company = state.get("company") or {}
    first = contact.get("first_name") or ""
    last = contact.get("last_name") or ""
    name = f"{first} {last}".strip()
    if not name:
        return {"papers": []}

    query_parts = [name]
    if company.get("name"):
        query_parts.append(company["name"])
    query = " ".join(query_parts).strip()

    try:
        raw = await search_papers(query, limit=20)
    except Exception as e:
        return {"papers": [], "error": f"paper search failed: {e}"}

    filtered: list[dict[str, Any]] = []
    for p in raw:
        if not _surname_overlap(p.authors, last):
            continue
        filtered.append(
            {
                "title": p.title,
                "authors": p.authors,
                "year": p.year,
                "venue": p.venue,
                "doi": p.doi,
                "url": p.url or p.pdf_url,
                "citation_count": p.citation_count,
                "source": p.source,
            }
        )

    filtered.sort(key=lambda p: p.get("citation_count") or 0, reverse=True)
    return {"papers": filtered[:10]}


async def extract_skills(state: ContactEnrichState, config: RunnableConfig) -> dict:
    """Run jobbert NER over paper abstracts/summaries to extract skill spans.

    The jobbert_ner adapter is injected via ``config["configurable"]`` to avoid
    a circular import (``core.remote_graphs`` imports from ``leadgen_agent``).
    Returns ``{"extracted_skills": [...]}`` or ``{}`` when the adapter is absent
    or there are no usable paper texts.
    """
    adapter = (config.get("configurable") or {}).get("jobbert_ner_adapter")
    if adapter is None:
        return {}
    papers = state.get("papers") or []
    texts = [
        str(p.get("abstract") or p.get("summary") or "")
        for p in papers
        if p.get("abstract") or p.get("summary")
    ]
    if not texts:
        return {}
    from leadgen_agent.contracts import JobbertNerInput, JobbertNerOutput

    spans = []
    for text in texts[:10]:
        try:
            result = await adapter.ainvoke(JobbertNerInput(text=text[:512]).model_dump())
            output = JobbertNerOutput.model_validate(result)
            spans.extend(output.spans)
        except Exception:
            pass
    skills = list({s.span.lower() for s in spans if s.score >= 0.7})
    return {"extracted_skills": skills}


async def extract_tags(state: ContactEnrichState) -> dict:
    if state.get("error"):
        return {"tags": state.get("existing_tags") or []}

    papers = state.get("papers") or []
    existing_research_areas = state.get("existing_research_areas") or []

    if not papers and not existing_research_areas:
        return {"tags": state.get("existing_tags") or []}

    taxonomy_list = ", ".join(TAG_TAXONOMY)
    paper_blurbs = []
    for p in papers[:10]:
        title = p.get("title") or ""
        venue = p.get("venue") or ""
        year = p.get("year") or ""
        paper_blurbs.append(f"- [{year}] {title}" + (f" ({venue})" if venue else ""))
    papers_block = "\n".join(paper_blurbs) if paper_blurbs else "(none)"
    research_areas_line = (
        ", ".join(existing_research_areas) if existing_research_areas else "(none)"
    )

    extracted_skills = state.get("extracted_skills") or []
    ner_line = (
        f"Previously extracted skills (from paper NER): {', '.join(extracted_skills)}\n\n"
        if extracted_skills
        else ""
    )

    prompt = f"""You label AI/ML researchers with topical tags drawn from a fixed taxonomy.

TAXONOMY (pick ONLY from these, exact casing):
{taxonomy_list}

{ner_line}INPUT — existing research areas (from prior enrichment):
{research_areas_line}

INPUT — recent papers (title, year, venue):
{papers_block}

Return JSON with this exact shape:
{{"tags": ["LLM", "RAG", ...], "rationale": "one short sentence"}}

Rules:
- Only include tags that are clearly supported by the papers or research areas.
- Do NOT invent tags outside the taxonomy.
- Prefer high-signal tags (3–6 items). Return [] if no evidence.
"""

    llm = make_llm(temperature=0.0)
    try:
        parsed = await ainvoke_json(llm, [{"role": "user", "content": prompt}])
    except Exception:
        return {"tags": state.get("existing_tags") or []}

    raw_tags = parsed.get("tags") if isinstance(parsed, dict) else None
    if not isinstance(raw_tags, list):
        return {"tags": state.get("existing_tags") or []}

    allowed = {t.lower(): t for t in TAG_TAXONOMY}
    derived: list[str] = []
    seen: set[str] = set()
    for t in raw_tags:
        if not isinstance(t, str):
            continue
        key = t.strip().lower()
        if key in allowed and key not in seen:
            seen.add(key)
            derived.append(allowed[key])

    return {"tags": derived}


def _normalize_doi(doi: Any) -> str:
    """Normalize a DOI for use as a merge key.

    Lowercases, strips whitespace, and removes the ``https://doi.org/`` prefix
    so equivalent DOIs ("10.1/X" vs "https://doi.org/10.1/x") collide. Returns
    "" for None / non-string / empty input — callers treat empty as "no key".
    """
    if not isinstance(doi, str):
        return ""
    s = doi.strip().lower()
    if not s:
        return ""
    for prefix in ("https://doi.org/", "http://doi.org/", "doi:"):
        if s.startswith(prefix):
            s = s[len(prefix) :]
            break
    return s.strip()


def _paper_key(p: dict[str, Any]) -> tuple[str, str]:
    """Compute a stable merge key for a paper row.

    Precedence:
      1. ``doi`` (lowercased, normalized) when present and non-empty.
      2. ``(source, source_id)`` tuple when DOI absent and both fields set.
      3. ``title`` (lowercased, trimmed) — last-resort dedupe.

    Returns a ``(kind, value)`` tuple so different key kinds never collide
    (e.g. a DOI string can't accidentally match a title string).
    """
    doi = _normalize_doi(p.get("doi"))
    if doi:
        return ("doi", doi)
    source = str(p.get("source") or "").strip().lower()
    source_id = str(p.get("source_id") or "").strip()
    if source and source_id:
        return ("src", f"{source}::{source_id}")
    title = str(p.get("title") or "").strip().lower()
    return ("title", title)


def _merge_papers(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Merge ``incoming`` papers into ``existing`` using paper keys.

    Contract:
      - On collision, the existing row wins — curated corpus metadata is never
        overwritten by OpenAlex/Crossref/Semantic Scholar projections.
      - Missing fields on the existing row are filled from the incoming row
        (e.g. an existing corpus entry without ``citation_count`` will pick up
        the count from OpenAlex).
      - Rows whose key resolves to ``("title", "")`` (no doi, no source/id, no
        title) are kept as-is and never deduped — we have nothing to key on.
      - Output is sorted by ``(kind, value)`` so the result is deterministic
        across runs (eval / diff stability).
    """
    by_key: dict[tuple[str, str], dict[str, Any]] = {}
    unkeyed: list[dict[str, Any]] = []

    def _add(p: dict[str, Any], *, prefer_existing: bool) -> None:
        if not isinstance(p, dict):
            return
        key = _paper_key(p)
        if key[1] == "":
            unkeyed.append(p)
            return
        prior = by_key.get(key)
        if prior is None:
            by_key[key] = dict(p)
            return
        if prefer_existing:
            # Existing wins: only fill gaps where the prior value is missing /
            # empty / None. ``0`` and ``False`` count as set values.
            for k, v in p.items():
                if k in prior:
                    pv = prior[k]
                    if pv is None or pv == "" or pv == []:
                        prior[k] = v
                else:
                    prior[k] = v
        else:
            # Incoming wins (only used when merging two incoming rows that
            # share a key — keep the latest-seen).
            prior.update(p)

    for p in existing or []:
        _add(p, prefer_existing=False)
    for p in incoming or []:
        _add(p, prefer_existing=True)

    merged = list(by_key.values())
    merged.sort(key=lambda row: _paper_key(row))
    return merged + unkeyed


def _persist_papers_and_tags(
    contact_id: int,
    papers: list[dict[str, Any]],
    tags: list[str],
    enriched_at: str,
) -> bool:
    """Write papers / papers_enriched_at / tags for ``contact_id``.

    Mirrors the columns the TypeScript resolver in
    ``src/apollo/resolvers/contacts/mutations.ts:enrichContactPapersAndTags``
    would have written — safe to run alongside it (same data, idempotent).
    ``tags`` is stored as a JSON string (the column is ``text``-typed with
    stringified JSON, not ``jsonb``) to match the existing convention.

    The ``papers`` column is dual-write: the corpus seeder
    (``scripts/classify-paper-contacts.ts``) populates curated rows and this
    pipeline appends OpenAlex/Crossref/SemanticScholar discoveries. We
    SELECT-then-merge by paper key (see ``_merge_papers``) so curated
    metadata is never overwritten.
    """
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return False
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT papers FROM contacts WHERE id = %s",
                    (contact_id,),
                )
                row = cur.fetchone()
                existing_raw = row[0] if row else None
                if isinstance(existing_raw, str):
                    try:
                        existing_papers = json.loads(existing_raw)
                    except json.JSONDecodeError:
                        existing_papers = []
                elif isinstance(existing_raw, list):
                    existing_papers = existing_raw
                else:
                    existing_papers = []
                if not isinstance(existing_papers, list):
                    existing_papers = []

                merged = _merge_papers(existing_papers, papers)

                cur.execute(
                    "UPDATE contacts "
                    "SET papers = %s::jsonb, papers_enriched_at = %s, "
                    "    tags = %s, updated_at = NOW() "
                    "WHERE id = %s",
                    (
                        json.dumps(merged),
                        enriched_at,
                        json.dumps(tags),
                        contact_id,
                    ),
                )
                return cur.rowcount > 0
    except psycopg.Error as e:
        log.warning("failed to persist papers/tags for %s: %s", contact_id, e)
        return False


async def synthesize(state: ContactEnrichState) -> dict:
    existing = state.get("existing_tags") or []
    derived = state.get("tags") or []

    # case-insensitive dedupe, preserve first-seen casing
    merged: list[str] = []
    seen: set[str] = set()
    for t in list(existing) + list(derived):
        if not isinstance(t, str):
            continue
        key = t.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(t.strip())

    existing_keys = {t.strip().lower() for t in existing if isinstance(t, str)}
    tags_added = [t for t in derived if isinstance(t, str) and t.strip().lower() not in existing_keys]

    enriched_at = datetime.now(timezone.utc).isoformat()
    papers = state.get("papers") or []

    # Persist papers + tags to Postgres ourselves — the graph is the single
    # writer now (per the "python-only" direction). Skip on error so we don't
    # blow away prior data with empty arrays from a failed run.
    if not state.get("error"):
        contact = state.get("contact") or {}
        contact_id = contact.get("id")
        if isinstance(contact_id, int):
            _persist_papers_and_tags(contact_id, papers, merged, enriched_at)

    return {
        "tags": merged,
        "tags_added": tags_added,
        "enriched_at": enriched_at,
        # Re-emit so the caller's final state always carries these fields,
        # even when the resolve node ran on an earlier turn.
        "github_handle": state.get("github_handle") or "",
        "github_handle_source": state.get("github_handle_source") or "",
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ContactEnrichState)
    builder.add_node("load_contact", load_contact)
    builder.add_node("resolve_github_handle", resolve_github_handle)
    builder.add_node("fetch_papers", fetch_papers)
    builder.add_node("extract_skills", extract_skills)
    builder.add_node("extract_tags", extract_tags)
    builder.add_node("synthesize", synthesize)
    builder.add_edge(START, "load_contact")
    builder.add_edge("load_contact", "resolve_github_handle")
    builder.add_edge("resolve_github_handle", "fetch_papers")
    builder.add_edge("fetch_papers", "extract_skills")
    builder.add_edge("extract_skills", "extract_tags")
    builder.add_edge("extract_tags", "synthesize")
    builder.add_edge("synthesize", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()


if __name__ == "__main__":
    # Smoke tests for _merge_papers — run via:
    #   python -m leadgen_agent.contact_enrich_graph
    # Assertions cover the three-tier key precedence and the
    # "existing wins, fill gaps" collision rule.

    # 1. DOI collision (case-insensitive, https prefix tolerated):
    #    existing corpus row wins, but missing fields are filled from incoming.
    existing = [
        {"title": "X", "doi": "10.1/x", "source": "corpus-leadgen"},
    ]
    incoming = [
        {"title": "X", "doi": "10.1/X", "source": "openalex", "citation_count": 42},
        {"title": "Y", "doi": "10.1/y", "source": "openalex"},
    ]
    merged = _merge_papers(existing, incoming)
    assert len(merged) == 2, f"expected 2 rows, got {len(merged)}: {merged}"
    by_doi = {_normalize_doi(p["doi"]): p for p in merged}
    assert by_doi["10.1/x"]["source"] == "corpus-leadgen", "existing must win on DOI collision"
    assert by_doi["10.1/x"]["citation_count"] == 42, "missing field must be filled from incoming"
    assert by_doi["10.1/y"]["source"] == "openalex", "non-colliding incoming row must be added"

    # 2. (source, source_id) fallback when DOI absent.
    existing = [{"title": "A", "source": "corpus-leadgen", "source_id": "abc"}]
    incoming = [{"title": "A", "source": "corpus-leadgen", "source_id": "abc", "year": 2024}]
    merged = _merge_papers(existing, incoming)
    assert len(merged) == 1
    assert merged[0]["year"] == 2024

    # 3. Title fallback (last-resort dedupe).
    existing = [{"title": "  Paper Z  "}]
    incoming = [{"title": "paper z", "year": 2025}]
    merged = _merge_papers(existing, incoming)
    assert len(merged) == 1, f"title-keyed dedupe failed: {merged}"

    # 4. DOI prefix normalization.
    assert _normalize_doi("https://doi.org/10.1/X") == "10.1/x"
    assert _normalize_doi("DOI:10.1/X") == "10.1/x"
    assert _normalize_doi("") == ""
    assert _normalize_doi(None) == ""

    # 5. Determinism: merging twice in different incoming orders yields the
    #    same sorted output (eval-stable).
    a = _merge_papers(
        [{"title": "X", "doi": "10.1/x"}],
        [{"title": "Y", "doi": "10.1/y"}, {"title": "Z", "doi": "10.1/z"}],
    )
    b = _merge_papers(
        [{"title": "X", "doi": "10.1/x"}],
        [{"title": "Z", "doi": "10.1/z"}, {"title": "Y", "doi": "10.1/y"}],
    )
    assert a == b, "merge must be order-independent for deterministic eval diffs"

    print("OK: _merge_papers smoke tests passed")
