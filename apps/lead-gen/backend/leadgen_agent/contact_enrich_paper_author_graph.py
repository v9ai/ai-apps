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

from .buyer_fit_classifier import classify_buyer_fit
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


def _classify_affiliation_type(profile: dict) -> str:
    """Classify the contact's affiliation as industry / academic / mixed / unknown.

    Reads ``institution_type`` (the OpenAlex enum string for the resolver's
    primary pick) and ``additional_institution_types`` (types of every other
    last_known_institutions entry). The B2B lead-gen ICP can only buy from
    ``industry`` or ``mixed`` profiles; ``academic`` is a hard non-buyer.

    OpenAlex institution types: ``"education"``, ``"company"``,
    ``"government"``, ``"healthcare"``, ``"archive"``, ``"other"``, or ``""``.
    Anything non-empty and != ``"education"`` counts as non-academic.
    """
    if not isinstance(profile, dict):
        return "unknown"

    primary = (profile.get("institution_type") or "").strip().lower()
    additional_raw = profile.get("additional_institution_types") or []
    if not isinstance(additional_raw, list):
        additional_raw = []
    additional = [
        (t or "").strip().lower() for t in additional_raw if isinstance(t, str)
    ]

    all_types = [t for t in [primary, *additional] if t]
    if not all_types:
        return "unknown"

    has_academic = any(t == "education" for t in all_types)
    has_industry = any(t and t != "education" for t in all_types)

    if has_academic and has_industry:
        return "mixed"
    if has_industry:
        return "industry"
    if has_academic:
        return "academic"
    return "unknown"


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
            "SELECT id, first_name, last_name, tags, openalex_profile, "
            "       email, linkedin_url, github_handle "
            "FROM contacts "
            "WHERE tags ILIKE %s AND openalex_profile IS NULL "
            "ORDER BY id LIMIT 1"
        )
        params: tuple[Any, ...] = ('%"papers"%',)
    else:
        select_sql = (
            "SELECT id, first_name, last_name, tags, openalex_profile, "
            "       email, linkedin_url, github_handle "
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
            "email": rec.get("email") or "",
            "linkedin_url": rec.get("linkedin_url") or "",
            "github_handle": rec.get("github_handle") or "",
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
        existing_addl = existing.get("additional_institution_types") or []
        if not isinstance(existing_addl, list):
            existing_addl = []
        return {
            "openalex_id": existing.get("openalex_id", ""),
            "orcid": existing.get("orcid", ""),
            "display_name": existing.get("display_name", ""),
            "institution": existing.get("institution", ""),
            "institution_country": existing.get("institution_country", ""),
            "institution_id": existing.get("institution_id", ""),
            "institution_ror": existing.get("institution_ror", ""),
            "institution_type": existing.get("institution_type", ""),
            "additional_institution_types": list(existing_addl),
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

    # OpenAlex deprecated `last_known_institution` (singular) in favor of
    # `last_known_institutions` (plural array) in 2024 — the singular field now
    # returns null on every response, which is why earlier runs persisted empty
    # institution strings. Read the plural field first, fall back to the first
    # non-null entry of `affiliations[].institution` for older author records
    # that still lack the plural field.
    inst: dict[str, Any] = {}
    additional_institution_types: list[str] = []
    lki_list = picked.get("last_known_institutions")
    if isinstance(lki_list, list):
        for item in lki_list:
            if isinstance(item, dict) and item.get("display_name"):
                if not inst:
                    inst = item
                else:
                    # Collect types of every other entry so the affiliation
                    # classifier can detect "mixed" (academic + industry).
                    t = item.get("type")
                    if isinstance(t, str) and t:
                        additional_institution_types.append(t)
    if not inst:
        legacy = picked.get("last_known_institution")
        if isinstance(legacy, dict) and legacy.get("display_name"):
            inst = legacy
    if not inst:
        affiliations = picked.get("affiliations")
        if isinstance(affiliations, list):
            for aff in affiliations:
                if not isinstance(aff, dict):
                    continue
                inst_obj = aff.get("institution")
                if isinstance(inst_obj, dict) and inst_obj.get("display_name"):
                    inst = inst_obj
                    break

    institution = (inst.get("display_name") or "") if isinstance(inst, dict) else ""
    institution_country = (
        (inst.get("country_code") or "") if isinstance(inst, dict) else ""
    )
    institution_id = (inst.get("id") or "") if isinstance(inst, dict) else ""
    institution_ror = (inst.get("ror") or "") if isinstance(inst, dict) else ""
    # OpenAlex enum: "education" | "company" | "government" | "healthcare" |
    # "archive" | "other" | "". Used by `_classify_affiliation_type`.
    institution_type = (inst.get("type") or "") if isinstance(inst, dict) else ""

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
        "institution_id": institution_id,
        "institution_ror": institution_ror,
        "institution_type": institution_type,
        "additional_institution_types": additional_institution_types,
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


def _flag_contact_for_deletion(
    contact_id: int, reason: str, db: Any = None
) -> bool:
    """Flag ``contacts.to_be_deleted = true`` with ``deletion_reasons`` set.

    Idempotent: the WHERE clause filters on ``to_be_deleted IS NOT TRUE``,
    so a second call against an already-flagged row is a no-op (rowcount
    will be 0). Stores ``deletion_reasons`` as a JSON-array-style text
    column in the same shape Team B used for the manual 2026-04-22 sweep:
    ``["auto-flag: <reason>"]``.

    ``db`` accepts an injected psycopg-compatible connection (used by tests
    via ``unittest.mock``). When ``None``, opens a fresh connection from
    ``NEON_DATABASE_URL``. Returns True iff a row was newly flagged.
    """
    payload = json.dumps([f"auto-flag: {reason}"])
    update_sql = (
        "UPDATE contacts "
        "SET to_be_deleted = true, "
        "    deletion_reasons = %s, "
        "    deletion_flagged_at = NOW()::text, "
        "    updated_at = NOW()::text "
        "WHERE id = %s "
        "  AND to_be_deleted IS NOT TRUE"
    )

    if db is not None:
        try:
            with db.cursor() as cur:
                cur.execute(update_sql, (payload, contact_id))
                return (cur.rowcount or 0) > 0
        except Exception as e:  # noqa: BLE001 — surface mock errors uniformly
            log.warning(
                "failed to flag contact %s for deletion (injected db): %s",
                contact_id,
                e,
            )
            return False

    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return False
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(update_sql, (payload, contact_id))
                return (cur.rowcount or 0) > 0
    except psycopg.Error as e:
        log.warning("failed to flag contact %s for deletion: %s", contact_id, e)
        return False


def _has_contact_channel(contact: dict[str, Any]) -> bool:
    """True iff at least one of email / linkedin_url / github_handle is set."""
    if not isinstance(contact, dict):
        return False
    email = (contact.get("email") or "").strip()
    linkedin = (contact.get("linkedin_url") or "").strip()
    github = (contact.get("github_handle") or "").strip()
    return bool(email or linkedin or github)


async def auto_flag_unreachable_node(
    state: ContactEnrichPaperAuthorState,
) -> dict:
    """Auto-flag contacts for deletion when non-buyer AND unreachable.

    Predicate (verbatim):
        (buyer_verdict == "not_buyer" OR affiliation_type == "academic")
        AND no contact channel is present

    "No contact channel" = ``contact.email`` IS NULL/empty AND
    ``contact.linkedin_url`` IS NULL/empty AND ``contact.github_handle``
    IS NULL/empty.

    Runs LAST in the graph (after Team A's ``classify_affiliation`` and
    Team B's ``classify_buyer_fit_node``). Falls back to ``"unknown"`` for
    either field if upstream Teams A/B haven't landed their nodes yet —
    in that case the predicate is False and nothing is flagged ("don't
    flag on unknown").

    Idempotent: SQL is gated by ``WHERE to_be_deleted IS NOT TRUE`` so a
    second run against an already-flagged row is a no-op (rowcount = 0).
    """
    if state.get("error"):
        return {"auto_flagged_for_deletion": False, "auto_flag_reason": ""}

    contact = state.get("contact") or {}
    contact_id = contact.get("id")
    if not isinstance(contact_id, int):
        return {"auto_flagged_for_deletion": False, "auto_flag_reason": ""}

    affiliation_type = state.get("affiliation_type") or "unknown"
    buyer_verdict = state.get("buyer_verdict") or "unknown"

    is_non_buyer = (
        buyer_verdict == "not_buyer" or affiliation_type == "academic"
    )
    has_channel = _has_contact_channel(contact)

    if not (is_non_buyer and not has_channel):
        return {"auto_flagged_for_deletion": False, "auto_flag_reason": ""}

    # Build human-readable reason — caller stores it on the contact row.
    parts: list[str] = []
    if buyer_verdict == "not_buyer":
        parts.append("buyer_verdict=not_buyer")
    if affiliation_type == "academic":
        parts.append("affiliation_type=academic")
    parts.append("no contact channels")
    reason = ", ".join(parts)

    _flag_contact_for_deletion(contact_id, reason)

    return {"auto_flagged_for_deletion": True, "auto_flag_reason": reason}


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
        "institution_id": state.get("institution_id") or "",
        "institution_ror": state.get("institution_ror") or "",
        "institution_type": state.get("institution_type") or "",
        "additional_institution_types": list(
            state.get("additional_institution_types") or []
        ),
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


async def classify_affiliation(state: ContactEnrichPaperAuthorState) -> dict:
    """Compute ``affiliation_type`` from the resolved openalex_profile.

    Reads ``institution_type`` (and any ``additional_institution_types``) the
    resolver persisted into state. Defaults to ``"unknown"`` when the resolver
    short-circuited (no match, error) or no institution-type info is present.
    The B2B ICP can only buy from ``industry`` or ``mixed`` profiles;
    ``academic`` is a hard non-buyer.
    """
    if state.get("error"):
        return {"affiliation_type": "unknown"}

    profile: dict[str, Any] = {
        "institution_type": state.get("institution_type") or "",
        "additional_institution_types": list(
            state.get("additional_institution_types") or []
        ),
    }
    return {"affiliation_type": _classify_affiliation_type(profile)}


async def classify_buyer_fit_node(
    state: ContactEnrichPaperAuthorState,
) -> dict:
    """Run the heuristic buyer-fit classifier over the resolved profile.

    Reads OpenAlex fields off the state (institution, institution_id,
    institution_country, institution_type, institution_ror) plus Team A's
    ``affiliation_type`` if present. No DB or network calls — pure heuristic.

    Designed to run after ``classify_affiliation`` (Team A) when present, but
    works correctly when wired immediately after ``synthesize`` because it
    reads ``affiliation_type`` defensively via ``getattr``.
    """
    if state.get("error"):
        return {
            "buyer_verdict": "unknown",
            "buyer_score": 0.5,
            "buyer_reasons": ["upstream error — no profile available"],
        }

    profile: dict[str, Any] = {
        "institution": state.get("institution") or "",
        "institution_id": state.get("institution_id") or "",
        "institution_country": state.get("institution_country") or "",
        "institution_type": state.get("institution_type") or "",
        "institution_ror": state.get("institution_ror") or "",
    }
    affiliation_type = getattr(state, "affiliation_type", None)
    if affiliation_type is None and isinstance(state, dict):
        affiliation_type = state.get("affiliation_type")

    verdict, score, reasons = classify_buyer_fit(profile, affiliation_type)
    return {
        "buyer_verdict": verdict,
        "buyer_score": score,
        "buyer_reasons": reasons,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ContactEnrichPaperAuthorState)
    builder.add_node("load_contact", load_contact)
    builder.add_node("resolve_openalex_author", resolve_openalex_author)
    builder.add_node("synthesize", synthesize)
    builder.add_node("classify_affiliation", classify_affiliation)
    builder.add_node("classify_buyer_fit_node", classify_buyer_fit_node)
    builder.add_node("auto_flag_unreachable_node", auto_flag_unreachable_node)
    builder.add_edge(START, "load_contact")
    builder.add_edge("load_contact", "resolve_openalex_author")
    builder.add_edge("resolve_openalex_author", "synthesize")
    # classify_affiliation slots between synthesize and the buyer-fit node so
    # the latter can read its ``affiliation_type`` output. Both classifiers are
    # pure (no DB / network); ordering is purely informational.
    builder.add_edge("synthesize", "classify_affiliation")
    builder.add_edge("classify_affiliation", "classify_buyer_fit_node")
    # auto_flag_unreachable_node runs LAST — it reads Team A's
    # ``affiliation_type`` and Team B's ``buyer_verdict`` and, if the contact
    # is non-buyer-or-academic AND has no email / linkedin_url / github_handle,
    # sets ``contacts.to_be_deleted = true`` with a deletion reason. Idempotent
    # via SQL guard; safe to re-run.
    builder.add_edge("classify_buyer_fit_node", "auto_flag_unreachable_node")
    builder.add_edge("auto_flag_unreachable_node", END)
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
