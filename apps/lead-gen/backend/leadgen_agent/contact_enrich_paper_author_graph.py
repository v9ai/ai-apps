"""Paper-author contact enrichment graph.

Three-node pipeline for contacts that are bare paper-author shells
(imported from a paper corpus, carrying only a name + rich notes). Enriches
them with OpenAlex author metadata — institution, ORCID, h-index, topical
concepts — signals that aren't in the notes and can't be guessed from a
position / company column (which these contacts don't have).

Pipeline:
    load_contact → resolve_openalex_author → synthesize(+persist)

Input: ``{contact_id: int}``. Persistence writes:
  - ``contacts.openalex_profile`` (jsonb) — the full resolved author record
  - ``contacts.tags``              (text JSON array) — appends topic tags
                                   (case-insensitively deduped, prior
                                   ``openalex:topic:*`` tags dropped so they
                                   don't accumulate stale topics on re-run)
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

from .state import ContactEnrichPaperAuthorState

log = logging.getLogger(__name__)

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'\-]*")

# OpenAlex "polite pool" — supplying a mailto gives priority + higher rate limits.
OPENALEX_MAILTO = os.environ.get("OPENALEX_MAILTO", "nicolai.vadim@gmail.com")

# Top-N concepts to keep as topical tags. x_concepts are pre-sorted by score.
TOPIC_KEEP_COUNT = 6
TOPIC_MIN_SCORE = 0.3


def _parse_json_text(raw: Any) -> Any:
    if isinstance(raw, str) and raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return raw


async def load_contact(state: ContactEnrichPaperAuthorState) -> dict:
    """Load target contact. If ``contact_id`` is missing from input, pick the
    next un-enriched papers-tagged contact ourselves — keeps the caller stateless
    (no local Neon read needed to drive the batch). Callers that want a specific
    contact still pass ``contact_id`` and get exactly that one.
    """
    contact_id = state.get("contact_id")

    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return {"error": "NEON_DATABASE_URL not set"}

    if contact_id is None:
        # Parameterize the ILIKE pattern — psycopg3 treats raw `%` as a
        # placeholder marker and would otherwise error on `%"papers"%` literal.
        select_sql = (
            "SELECT id, first_name, last_name, tags, openalex_profile "
            "FROM contacts "
            "WHERE tags ILIKE %s AND openalex_profile IS NULL "
            "ORDER BY id LIMIT 1"
        )
        params: tuple[Any, ...] = ('%"papers"%',)
    else:
        select_sql = (
            "SELECT id, first_name, last_name, tags, openalex_profile "
            "FROM contacts WHERE id = %s LIMIT 1"
        )
        params = (contact_id,)

    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(select_sql, params)
                row = cur.fetchone()
                if not row:
                    if contact_id is None:
                        # Batch drained — signal completion, not an error.
                        return {"error": "no_unenriched_paper_authors_remaining"}
                    return {"error": f"contact id {contact_id} not found"}
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"error": f"db error: {e}"}

    rec = dict(zip(cols, row))
    tags_raw = _parse_json_text(rec.get("tags"))
    tags = [str(t) for t in tags_raw] if isinstance(tags_raw, list) else []
    openalex_profile = rec.get("openalex_profile") or {}
    if not isinstance(openalex_profile, dict):
        openalex_profile = {}

    return {
        "contact": {
            "id": rec["id"],
            "first_name": rec.get("first_name") or "",
            "last_name": rec.get("last_name") or "",
            "tags": tags,
            "openalex_profile": openalex_profile,
        }
    }


def _clean_name_token(raw: str) -> str:
    """Strip punctuation, take the first alpha token, lowercase."""
    m = _WORD_RE.search(raw or "")
    return (m.group(0) if m else "").lower()


def _name_tokens(display_name: str) -> list[str]:
    """Return lowercase alpha tokens, excluding single initials unless isolated."""
    return [w.lower() for w in _WORD_RE.findall(display_name or "")]


def _score_name_match(
    first: str, last: str, display_name: str
) -> tuple[bool, float]:
    """Classify a candidate's display_name against the target first/last.

    Returns (passes_filter, confidence_floor). The confidence is a floor that
    later gets multiplied by a works_count boost.

    Rules (strict → loose):
      1. Last name exact word match AND first name exact word match → 0.9
      2. Last name exact word match AND first name initial matches first
         token initial → 0.75
      3. Last name exact word match only → 0.5
      4. Otherwise → (False, 0.0) — rejected
    """
    last_clean = _clean_name_token(last)
    first_clean = _clean_name_token(first)
    if not last_clean:
        return (False, 0.0)

    tokens = _name_tokens(display_name)
    if not tokens:
        return (False, 0.0)

    # Exact last-name word match is a hard requirement — blocks "Martin" inside
    # "Martin O'Donnell" when our target's surname is Martin. We still match
    # when surname is any token of the display_name (covers middle names).
    if last_clean not in tokens:
        return (False, 0.0)

    if not first_clean:
        return (True, 0.5)

    if first_clean in tokens:
        return (True, 0.9)

    # First-initial match: "A Sharma" → "Anil Kumar Sharma" (tokens[0]="anil"
    # starts with "a"). Accept only when the target's first name is itself a
    # single letter (initial), to avoid "James" matching "J*" candidates.
    if len(first_clean) == 1 and tokens[0].startswith(first_clean):
        return (True, 0.75)

    return (False, 0.0)


async def resolve_openalex_author(state: ContactEnrichPaperAuthorState) -> dict:
    """Query OpenAlex authors API; pick best match by surname + works_count."""
    if state.get("error"):
        return {"resolve_source": ""}

    contact = state.get("contact") or {}

    # Skip if already resolved with a non-empty profile (idempotent re-runs).
    existing = contact.get("openalex_profile") or {}
    if isinstance(existing, dict) and existing.get("openalex_id"):
        return {
            "openalex_id": existing.get("openalex_id", ""),
            "orcid": existing.get("orcid", ""),
            "display_name": existing.get("display_name", ""),
            "institution": existing.get("institution", ""),
            "institution_country": existing.get("institution_country", ""),
            "works_count": int(existing.get("works_count") or 0),
            "cited_by_count": int(existing.get("cited_by_count") or 0),
            "h_index": int(existing.get("h_index") or 0),
            "i10_index": int(existing.get("i10_index") or 0),
            "topics": list(existing.get("topics") or []),
            "match_confidence": float(existing.get("match_confidence") or 0.0),
            "resolve_source": "existing",
        }

    first = (contact.get("first_name") or "").strip()
    last = (contact.get("last_name") or "").strip()
    if not first and not last:
        return {"resolve_source": ""}

    query = f"{first} {last}".strip()
    params = {"search": query, "per_page": "10", "mailto": OPENALEX_MAILTO}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                "https://api.openalex.org/authors", params=params
            )
            if res.status_code != 200:
                log.info("openalex authors non-200: %s %s", res.status_code, query)
                return {"resolve_source": ""}
            data = res.json()
    except Exception as e:
        log.warning("openalex authors lookup failed for %s: %s", query, e)
        return {"resolve_source": ""}

    results = data.get("results") if isinstance(data, dict) else None
    if not isinstance(results, list) or not results:
        return {"resolve_source": ""}

    # Score every candidate; keep only those whose display_name passes the
    # strict first+last word-match filter. Sort by (floor, works_count) — the
    # floor dominates so a 0.9 match with 5 works beats a 0.5 match with 500.
    scored: list[tuple[float, int, dict]] = []
    for r in results:
        passes, floor = _score_name_match(first, last, r.get("display_name") or "")
        if passes:
            scored.append((floor, int(r.get("works_count") or 0), r))

    if not scored:
        # No candidate passed. Don't fall back to a random top result — the
        # wrong-person risk is too high to persist junk at scale.
        return {"resolve_source": ""}

    scored.sort(key=lambda t: (t[0], t[1]), reverse=True)
    floor, works, picked = scored[0]

    # Boost confidence slightly for prolific authors at the top floor tier,
    # clamp at 0.95. Below-tier matches keep their floor as-is.
    if floor >= 0.9 and works >= 20:
        confidence = 0.95
    elif floor >= 0.75 and works >= 10:
        confidence = min(0.85, floor + 0.05)
    else:
        confidence = floor

    openalex_id = (picked.get("id") or "").rsplit("/", 1)[-1]
    orcid_url = picked.get("orcid") or ""
    orcid = orcid_url.rsplit("/", 1)[-1] if orcid_url else ""
    display_name = picked.get("display_name") or ""
    works_count = int(picked.get("works_count") or 0)
    cited_by_count = int(picked.get("cited_by_count") or 0)
    summary = picked.get("summary_stats") or {}
    h_index = int(summary.get("h_index") or 0)
    i10_index = int(summary.get("i10_index") or 0)

    inst = picked.get("last_known_institution") or {}
    institution = (inst.get("display_name") if isinstance(inst, dict) else "") or ""
    institution_country = (
        inst.get("country_code") if isinstance(inst, dict) else ""
    ) or ""

    # x_concepts: keep top-N with score >= threshold.
    concepts = picked.get("x_concepts") or []
    topics: list[str] = []
    for c in concepts:
        if not isinstance(c, dict):
            continue
        name = c.get("display_name")
        score = c.get("score")
        if (
            isinstance(name, str)
            and isinstance(score, (int, float))
            and float(score) >= TOPIC_MIN_SCORE
        ):
            topics.append(name)
        if len(topics) >= TOPIC_KEEP_COUNT:
            break

    return {
        "openalex_id": openalex_id,
        "orcid": orcid,
        "display_name": display_name,
        "institution": institution,
        "institution_country": institution_country,
        "works_count": works_count,
        "cited_by_count": cited_by_count,
        "h_index": h_index,
        "i10_index": i10_index,
        "topics": topics,
        "match_confidence": confidence,
        "resolve_source": "openalex",
    }


def _merge_tags_with_topics(existing: list[str], topics: list[str]) -> list[str]:
    """Drop prior ``openalex:topic:*`` tags, append fresh ones, dedupe."""
    merged: list[str] = []
    seen: set[str] = set()
    for t in existing:
        if not isinstance(t, str):
            continue
        key = t.strip().lower()
        if not key or key in seen:
            continue
        if key.startswith("openalex:topic:"):
            continue  # re-added below from fresh topics
        seen.add(key)
        merged.append(t.strip())
    for topic in topics:
        fresh = f"openalex:topic:{topic}"
        if fresh.lower() in seen:
            continue
        seen.add(fresh.lower())
        merged.append(fresh)
    return merged


def _persist_openalex(
    contact_id: int, profile: dict[str, Any], tags: list[str]
) -> bool:
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return False
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE contacts "
                    "SET openalex_profile = %s::jsonb, "
                    "    tags = %s, "
                    "    updated_at = NOW() "
                    "WHERE id = %s",
                    (
                        json.dumps(profile),
                        json.dumps(tags),
                        contact_id,
                    ),
                )
                return cur.rowcount > 0
    except psycopg.Error as e:
        log.warning("failed to persist openalex_profile for %s: %s", contact_id, e)
        return False


async def synthesize(state: ContactEnrichPaperAuthorState) -> dict:
    enriched_at = datetime.now(timezone.utc).isoformat()

    if state.get("error"):
        return {"enriched_at": enriched_at}

    contact = state.get("contact") or {}
    contact_id = contact.get("id")
    if not isinstance(contact_id, int):
        return {"enriched_at": enriched_at}

    resolve_source = state.get("resolve_source") or ""
    if resolve_source not in {"openalex", "existing"}:
        # No OpenAlex match — persist a sentinel so batch drivers that re-read
        # `openalex_profile IS NULL` don't pick this same contact forever.
        _persist_openalex(
            contact_id,
            {
                "resolved": False,
                "reason": "no_openalex_match",
                "resolved_at": enriched_at,
            },
            contact.get("tags") or [],
        )
        return {"enriched_at": enriched_at, "resolve_source": ""}

    profile = {
        "openalex_id": state.get("openalex_id") or "",
        "orcid": state.get("orcid") or "",
        "display_name": state.get("display_name") or "",
        "institution": state.get("institution") or "",
        "institution_country": state.get("institution_country") or "",
        "works_count": int(state.get("works_count") or 0),
        "cited_by_count": int(state.get("cited_by_count") or 0),
        "h_index": int(state.get("h_index") or 0),
        "i10_index": int(state.get("i10_index") or 0),
        "topics": list(state.get("topics") or []),
        "match_confidence": float(state.get("match_confidence") or 0.0),
        "resolved_at": enriched_at,
    }

    merged_tags = _merge_tags_with_topics(
        contact.get("tags") or [], profile["topics"]
    )

    _persist_openalex(contact_id, profile, merged_tags)

    return {
        "enriched_at": enriched_at,
        "openalex_id": profile["openalex_id"],
        "orcid": profile["orcid"],
        "institution": profile["institution"],
        "works_count": profile["works_count"],
        "h_index": profile["h_index"],
        "topics": profile["topics"],
        "match_confidence": profile["match_confidence"],
        "resolve_source": resolve_source,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ContactEnrichPaperAuthorState)
    builder.add_node("load_contact", load_contact)
    builder.add_node("resolve_openalex_author", resolve_openalex_author)
    builder.add_node("synthesize", synthesize)
    builder.add_edge(START, "load_contact")
    builder.add_edge("load_contact", "resolve_openalex_author")
    builder.add_edge("resolve_openalex_author", "synthesize")
    builder.add_edge("synthesize", END)
    return builder.compile(checkpointer=checkpointer)


# --------------------------------------------------------------------------- #
# Batch graph — loops the single-contact logic entirely server-side so
# callers don't have to drive iteration from a local shell. One HTTP call to
# ``/runs/wait?assistant_id=contact_enrich_paper_authors_batch`` churns until
# the papers-tagged cohort is drained, or a wall-clock budget is hit.
# --------------------------------------------------------------------------- #

# Container's standard-1 instance gives ~10 min per HTTP request. Budget 8 min
# of work and leave 2 min headroom for synth/persist + HTTP response framing.
_BATCH_WALL_CLOCK_SECS_DEFAULT = 8 * 60


async def _resolve_one(contact: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Run one contact through resolve_openalex_author + synthesize inline.

    Returns (summary_record, resolve_source). summary_record contains the
    compact per-contact result we surface up to the batch caller.
    """
    # Wrap the single-contact state and call the existing nodes directly to
    # avoid re-invoking the compiled graph (cheaper and avoids checkpointer
    # round-trips inside the loop).
    per_state: ContactEnrichPaperAuthorState = {"contact": contact}
    resolved = await resolve_openalex_author(per_state)
    per_state.update(resolved)  # type: ignore[typeddict-item]

    synth = await synthesize(per_state)
    per_state.update(synth)  # type: ignore[typeddict-item]

    return (
        {
            "id": contact.get("id"),
            "name": (contact.get("first_name") or "").strip()
            + " "
            + (contact.get("last_name") or "").strip(),
            "resolve_source": per_state.get("resolve_source") or "",
            "openalex_id": per_state.get("openalex_id") or "",
            "display_name": per_state.get("display_name") or "",
            "institution": per_state.get("institution") or "",
            "h_index": per_state.get("h_index") or 0,
            "match_confidence": per_state.get("match_confidence") or 0.0,
        },
        per_state.get("resolve_source") or "",
    )


async def batch_enrich_paper_authors(
    state: ContactEnrichPaperAuthorState,
) -> dict:
    """Drain the papers-tagged unenriched cohort within a single HTTP call.

    Input state accepts:
      - ``count`` (int, optional): hard cap on iterations. Default unlimited.
      - ``deadline_seconds`` (int, optional): wall-clock budget in seconds.
        Default ``_BATCH_WALL_CLOCK_SECS_DEFAULT``.

    Behavior: loop picking the next unenriched papers-tagged contact until
    drained, the cap is hit, or the budget is exhausted. Each iteration
    reuses the single-contact pipeline so all writes are identical in shape
    (including the ``no_openalex_match`` sentinel on misses).
    """
    import time as _time

    budget_s = int(state.get("deadline_seconds") or _BATCH_WALL_CLOCK_SECS_DEFAULT)
    cap = state.get("count")
    try:
        cap = int(cap) if cap is not None else None
    except (TypeError, ValueError):
        cap = None

    start = _time.monotonic()
    enriched: list[dict[str, Any]] = []
    resolve_counts: dict[str, int] = {
        "openalex": 0,
        "existing": 0,
        "no_match": 0,
        "load_error": 0,
    }

    while True:
        # Wall-clock guard. Check before making the next expensive call.
        if _time.monotonic() - start > budget_s:
            stop_reason = "budget_exhausted"
            break
        if cap is not None and len(enriched) >= cap:
            stop_reason = "count_reached"
            break

        # Reuse load_contact with no contact_id — it auto-picks the next
        # unenriched papers-tagged row.
        load_state: ContactEnrichPaperAuthorState = {}
        load_result = await load_contact(load_state)

        err = load_result.get("error") if isinstance(load_result, dict) else None
        if err == "no_unenriched_paper_authors_remaining":
            stop_reason = "drained"
            break
        if err:
            # Transient DB error; record and stop so the caller can inspect.
            resolve_counts["load_error"] += 1
            enriched.append({"error": err})
            stop_reason = f"load_error:{err}"
            break

        contact = load_result.get("contact") or {}
        summary, source = await _resolve_one(contact)
        enriched.append(summary)
        if source == "openalex":
            resolve_counts["openalex"] += 1
        elif source == "existing":
            resolve_counts["existing"] += 1
        else:
            resolve_counts["no_match"] += 1

    return {
        "enriched_at": datetime.now(timezone.utc).isoformat(),
        "enriched": enriched,
        "counts": resolve_counts,
        "total": len(enriched),
        "stop_reason": stop_reason,
        "elapsed_s": round(_time.monotonic() - start, 2),
    }


def build_batch_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ContactEnrichPaperAuthorState)
    builder.add_node("batch_enrich", batch_enrich_paper_authors)
    builder.add_edge(START, "batch_enrich")
    builder.add_edge("batch_enrich", END)
    return builder.compile(checkpointer=checkpointer)


batch_graph = build_batch_graph()


graph = build_graph()
