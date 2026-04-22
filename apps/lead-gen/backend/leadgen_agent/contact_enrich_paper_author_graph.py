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
from datetime import datetime, timezone
from typing import Any

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

from .state import ContactEnrichPaperAuthorState

log = logging.getLogger(__name__)

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
    contact_id = state.get("contact_id")
    if contact_id is None:
        return {"error": "contact_id is required"}

    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return {"error": "NEON_DATABASE_URL not set"}

    sql = """
        SELECT id, first_name, last_name, tags, openalex_profile
        FROM contacts
        WHERE id = %s
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


def _surname_overlap(candidate_name: str, surname: str) -> bool:
    """Case-insensitive substring check against the candidate's display_name."""
    if not surname:
        return True
    return surname.strip().lower() in (candidate_name or "").lower()


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

    # Match filter + sort: surname must appear in display_name; prefer higher
    # works_count as a prolific-author tiebreaker. If no candidate passes the
    # surname check, fall back to the top raw result (OpenAlex already ranks
    # by relevance) and note lower confidence.
    matches = [r for r in results if _surname_overlap(r.get("display_name"), last)]
    if matches:
        matches.sort(key=lambda r: r.get("works_count") or 0, reverse=True)
        picked = matches[0]
        # Confidence: rough heuristic combining works_count + name-match
        works = picked.get("works_count") or 0
        if works >= 10:
            confidence = 0.9
        elif works >= 3:
            confidence = 0.7
        else:
            confidence = 0.5
    else:
        picked = results[0]
        confidence = 0.3  # low confidence — no surname match

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
        # Nothing resolved — don't write an empty profile over existing data.
        return {"enriched_at": enriched_at}

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


graph = build_graph()
