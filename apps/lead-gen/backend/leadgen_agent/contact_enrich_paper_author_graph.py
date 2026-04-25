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

import asyncio
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
from .topic_taxonomy import normalize_topics_to_tags
from . import _enrich_gates

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


def _merge_tags_with_topics(
    existing: list[str], normalized_topic_tags: list[str]
) -> list[str]:
    """Drop prior topic tags, append fresh controlled-vocab ones, dedupe.

    Strips BOTH the legacy ``openalex:topic:*`` prefix (free-text concept
    strings, deprecated 2026-04) AND the current ``topic:*`` prefix
    (controlled vocabulary from ``topic_taxonomy.normalize_topics_to_tags``).
    Stripping both means re-runs converge whether the existing row has old or
    new tags, and migration 0075's one-shot UPDATE is safe.
    """
    merged: list[str] = []
    seen: set[str] = set()
    for t in existing:
        if not isinstance(t, str):
            continue
        key = t.strip().lower()
        if not key or key in seen:
            continue
        if key.startswith("openalex:topic:") or key.startswith("topic:"):
            continue  # re-added below from fresh normalized tags
        seen.add(key)
        merged.append(t.strip())
    for fresh in normalized_topic_tags:
        if not isinstance(fresh, str):
            continue
        key = fresh.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(fresh.strip())
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

    # Normalize OpenAlex concepts + any GitHub repo topics + paper titles into
    # the controlled vocabulary defined in topic_taxonomy.py. The deterministic
    # keyword scan runs in microseconds; the LLM fallback is gated off here so
    # the hot path stays cheap.
    paper_titles = [
        (p.get("title") or "")
        for p in (contact.get("papers") or [])
        if isinstance(p, dict)
    ]
    gh_profile_topics = [
        t.get("name") if isinstance(t, dict) else t
        for t in (state.get("github_profile") or {}).get("top_topics") or []
    ]
    normalized_topic_tags = normalize_topics_to_tags(
        openalex_concepts=profile["topics"],
        github_topics=[t for t in gh_profile_topics if isinstance(t, str)],
        paper_titles=paper_titles,
    )

    merged_tags = _merge_tags_with_topics(
        contact.get("tags") or [], normalized_topic_tags
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


def _has_industry_org_signal(gh: dict[str, Any]) -> tuple[bool, str]:
    """Check if GitHub profile shows industry-org affiliation. Returns (matched, org_name)."""
    if not gh:
        return False, ""
    # Defer the actual list to buyer_fit_classifier — single source of truth.
    from .buyer_fit_classifier import _INDUSTRY_AI_ORGS

    company_org = (gh.get("company_org") or "").strip().lower()
    if company_org and company_org in _INDUSTRY_AI_ORGS:
        return True, company_org

    org_logins = gh.get("org_logins") or []
    if isinstance(org_logins, list):
        for login in org_logins:
            if isinstance(login, str) and login.strip().lower() in _INDUSTRY_AI_ORGS:
                return True, login.strip().lower()
    return False, ""


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
    base = _classify_affiliation_type(profile)

    # Re-classification: if the OpenAlex signal says academic but the GH
    # profile shows industry-org membership (top-200 list), the contact is
    # really a postdoc / research-engineer hybrid → "mixed". Persist the
    # provenance so the audit trail is intact.
    if base == "academic":
        gh = state.get("github_profile") or {}
        matched, org_name = _has_industry_org_signal(gh)
        if matched:
            return {
                "affiliation_type": "mixed",
                "affiliation_reclassified_from": "academic",
                "affiliation_reclassify_reason": f"gh.industry_org={org_name}",
            }

    return {"affiliation_type": base}


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

    # Pass GH profile through so classify_buyer_fit can apply additive boosts
    # (industry-org match, AI repo topics, bio role, hireable). When
    # github_profile is absent, kwarg defaults to None and the behavior is
    # byte-identical to the pre-GH version.
    gh = state.get("github_profile") if isinstance(state, dict) else None

    verdict, score, reasons = classify_buyer_fit(profile, affiliation_type, gh=gh)
    return {
        "buyer_verdict": verdict,
        "buyer_score": score,
        "buyer_reasons": reasons,
    }


# --------------------------------------------------------------------------- #
# Fan-out enrichment branches (v2 paper-author topology)
#
# Each function below is a graph node that runs in parallel with its siblings
# downstream of `synthesize`. Every branch:
#   1. catches its own exceptions (a 429 from one source must NOT abort siblings)
#   2. returns a `<branch>_status` sentinel string so the row is never re-picked
#   3. writes one dedicated `contacts.<column>` independently of the others
#   4. appends its own name to `enrichers_completed` for fan-in observability
# --------------------------------------------------------------------------- #


# ── GitHub handle resolver (Phase A1) ────────────────────────────────────────

_GH_API_BASE = "https://api.github.com"
_GH_USER_AGENT = "lead-gen-paper-author-enrichment/1.0"
_GH_HIT_THRESHOLD = 0.70
_GH_LOW_CONF_THRESHOLD = 0.45

_AI_TOPIC_KEYWORDS: tuple[str, ...] = (
    "llm", "rag", "agents", "transformers", "langchain", "autogen",
    "mlops", "fine-tuning", "diffusion", "neural-networks",
)


def _gh_headers() -> dict[str, str]:
    headers = {
        "User-Agent": _GH_USER_AGENT,
        "Accept": "application/vnd.github+json",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


def _institution_token(institution: str) -> str:
    """Pick a single high-signal token from an institution name for GH search.

    e.g. "Massachusetts Institute of Technology" -> "MIT" if there's a known
    abbreviation; otherwise the longest non-stopword token ("Stanford",
    "Anthropic", "MILA").
    """
    if not institution:
        return ""
    # Common abbreviations preferred over their long forms.
    aliases = {
        "massachusetts institute of technology": "MIT",
        "stanford university": "Stanford",
        "carnegie mellon university": "CMU",
        "university of california, berkeley": "Berkeley",
        "university of california berkeley": "Berkeley",
        "eth zurich": "ETH",
        "google deepmind": "DeepMind",
    }
    low = institution.strip().lower()
    if low in aliases:
        return aliases[low]
    stopwords = {
        "of", "the", "for", "and", "at", "in", "on", "university", "institute",
        "school", "college", "department", "lab", "laboratory", "centre",
        "center",
    }
    tokens = [
        t for t in re.findall(r"[A-Za-z][A-Za-z\-]+", institution)
        if t.lower() not in stopwords
    ]
    if not tokens:
        return ""
    return max(tokens, key=len)


def _gh_score_candidate(
    candidate: dict[str, Any],
    *,
    first: str,
    last: str,
    orcid: str,
    institution_token: str,
    top_topic: str,
    top_repo_languages: list[str],
) -> tuple[float, dict[str, Any]]:
    """Score a single GH user payload against the contact's signals.

    Returns (score, evidence). Score is in [0, 1]. Surname HARD GATE: if the
    surname does not appear in `login` OR `name`, score is 0 regardless.
    """
    login = (candidate.get("login") or "").strip()
    name = (candidate.get("name") or "").strip()
    bio = (candidate.get("bio") or "").strip()
    company = (candidate.get("company") or "").strip()
    location = (candidate.get("location") or "").strip()
    blog = (candidate.get("blog") or "").strip()
    followers = int(candidate.get("followers") or 0)

    surname = last.lower().strip()
    if not surname:
        return 0.0, {}
    haystack_name = f"{login} {name}".lower()
    if surname not in haystack_name:
        return 0.0, {"reason": "surname_gate_failed"}

    # name similarity — token-set ratio against the most informative name field.
    target_full = f"{first} {last}".strip()
    try:
        from rapidfuzz import fuzz
        name_sim = max(
            fuzz.token_set_ratio(target_full, login) / 100.0,
            fuzz.token_set_ratio(target_full, name) / 100.0 if name else 0.0,
        )
    except Exception:
        name_sim = 1.0 if surname in haystack_name else 0.0

    bio_lower = bio.lower()
    company_lower = company.lower()
    blog_lower = blog.lower()
    location_lower = location.lower()
    affil_haystack = f"{bio_lower} {company_lower} {location_lower} {blog_lower}"

    orcid_in_bio = 1.0 if orcid and orcid.strip() and orcid.strip() in bio else 0.0

    affil_overlap = 0.0
    if institution_token:
        if institution_token.lower() in affil_haystack:
            affil_overlap = 1.0

    topic_match = 0.0
    if top_topic:
        topic_low = top_topic.lower()
        if topic_low in bio_lower:
            topic_match = 1.0
        elif any(tok in bio_lower for tok in topic_low.split() if len(tok) > 3):
            topic_match = 0.5

    lang_plausibility = 0.0
    plausible = {"python", "jupyter notebook", "c++", "rust"}
    if any(lang.lower() in plausible for lang in top_repo_languages):
        lang_plausibility = 1.0

    import math
    account_prior = min(1.0, math.log10(followers + 1) / 3.0)

    score = (
        0.30 * name_sim
        + 0.20 * orcid_in_bio
        + 0.20 * affil_overlap
        + 0.15 * topic_match
        + 0.10 * lang_plausibility
        + 0.05 * account_prior
    )
    if orcid_in_bio == 1.0:
        score = max(score, 0.95)  # ORCID literal match is identity proof

    evidence = {
        "login": login,
        "name": name,
        "bio_excerpt": bio[:200],
        "company": company,
        "location": location,
        "name_sim": round(name_sim, 3),
        "orcid_in_bio": orcid_in_bio,
        "affil_overlap": affil_overlap,
        "topic_match": topic_match,
        "lang_plausibility": lang_plausibility,
        "account_prior": round(account_prior, 3),
        "followers": followers,
    }
    return score, evidence


async def _gh_search_users(
    client: httpx.AsyncClient, query: str, per_page: int = 5
) -> list[dict[str, Any]]:
    """Issue one GH Search Users call, return the items list (may be empty)."""
    res = await client.get(
        f"{_GH_API_BASE}/search/users",
        params={"q": query, "per_page": str(per_page)},
        headers=_gh_headers(),
    )
    if res.status_code != 200:
        log.info("github search non-200 (%s) for q=%r", res.status_code, query)
        return []
    data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
    items = data.get("items") if isinstance(data, dict) else None
    return [c for c in (items or []) if isinstance(c, dict)]


async def _gh_get_user(
    client: httpx.AsyncClient, login: str
) -> dict[str, Any] | None:
    """Hydrate a single GH user (bio, company, location, followers, …)."""
    res = await client.get(
        f"{_GH_API_BASE}/users/{login}", headers=_gh_headers()
    )
    if res.status_code != 200:
        return None
    return res.json() if isinstance(res.json(), dict) else None


async def _gh_top_repo_languages(
    client: httpx.AsyncClient, login: str, limit: int = 5
) -> list[str]:
    """Return up to `limit` primary languages from the user's top recent repos."""
    res = await client.get(
        f"{_GH_API_BASE}/users/{login}/repos",
        params={"per_page": "10", "sort": "pushed", "type": "owner"},
        headers=_gh_headers(),
    )
    if res.status_code != 200:
        return []
    repos = res.json()
    if not isinstance(repos, list):
        return []
    langs: list[str] = []
    seen: set[str] = set()
    for r in repos:
        if not isinstance(r, dict):
            continue
        if r.get("fork"):
            continue
        lang = r.get("language")
        if isinstance(lang, str) and lang and lang not in seen:
            seen.add(lang)
            langs.append(lang)
        if len(langs) >= limit:
            break
    return langs


def _persist_gh_match(
    contact_id: int,
    login: str | None,
    score: float,
    status: str,
    arm: str,
    evidence: dict[str, Any],
) -> bool:
    """Persist resolution outcome to gh_match_* columns + (on hit) github_handle.

    Idempotent: re-running on a `hit` row rewrites the same values; the
    `github_handle` column is only updated when status == 'hit' to avoid
    overwriting a manually-set handle with a `low_conf` machine guess.
    """
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return False
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                if status == "hit" and login:
                    cur.execute(
                        "UPDATE contacts SET "
                        "  github_handle = COALESCE(github_handle, %s), "
                        "  gh_match_score = %s, "
                        "  gh_match_status = %s, "
                        "  gh_match_arm = %s, "
                        "  gh_match_evidence_ref = %s, "
                        "  updated_at = NOW() "
                        "WHERE id = %s",
                        (login, score, status, arm, json.dumps(evidence), contact_id),
                    )
                else:
                    cur.execute(
                        "UPDATE contacts SET "
                        "  gh_match_score = %s, "
                        "  gh_match_status = %s, "
                        "  gh_match_arm = %s, "
                        "  gh_match_evidence_ref = %s, "
                        "  updated_at = NOW() "
                        "WHERE id = %s",
                        (score, status, arm, json.dumps(evidence), contact_id),
                    )
                return cur.rowcount > 0
    except psycopg.Error as e:
        log.warning("failed to persist gh_match for %s: %s", contact_id, e)
        return False


async def resolve_github_handle(state: ContactEnrichPaperAuthorState) -> dict:
    """Resolve a GitHub handle for the contact via 5-arm Search Users strategy.

    Arms tried in order, stop on first arm with score >= _GH_HIT_THRESHOLD:
      1. orcid_exact   - "<orcid> in:bio"          (when state.orcid is set)
      2. name_affil    - "<First Last> <inst>"     (when state.institution set)
      3. name_country  - "<First Last> location:*" (when institution_country set)
      4. fullname      - 'fullname:"<First Last>"'
      5. name_topic    - "<First Last> <topic>"    (when state.topics[0] set)

    Bands: >=0.70 hit, 0.45-0.70 low_conf, <0.45 no_match. ORCID hit
    short-circuits to 'hit' immediately.

    Defensive: any HTTP / parse error returns api_error and lets sibling
    branches finish unaffected.
    """
    contact = state.get("contact") or {}
    contact_id = contact.get("id")
    if not isinstance(contact_id, int):
        return {
            "github_handle_status": "no_data",
            "enrichers_completed": ["github_handle"],
        }

    # Skip if we already have a handle (manual entry or prior run).
    if (contact.get("github_handle") or "").strip():
        return {
            "github_login": contact["github_handle"],
            "github_handle_status": "skipped_already_set",
            "enrichers_completed": ["github_handle"],
        }

    first = (contact.get("first_name") or "").strip()
    last = (contact.get("last_name") or "").strip()
    if not first or not last:
        return {
            "github_handle_status": "no_data",
            "enrichers_completed": ["github_handle"],
        }

    orcid = (state.get("orcid") or "").strip()
    institution = (state.get("institution") or "").strip()
    inst_token = _institution_token(institution)
    institution_country = (state.get("institution_country") or "").strip()
    topics = state.get("topics") or []
    top_topic = topics[0] if topics else ""

    full_name = f"{first} {last}"
    arms: list[tuple[str, str]] = []
    if orcid:
        arms.append(("orcid_exact", f"{orcid} in:bio"))
    if inst_token:
        arms.append(("name_affil", f'"{full_name}" {inst_token} in:bio,fullname'))
    if institution_country:
        arms.append(("name_country", f'"{full_name}" location:{institution_country}'))
    arms.append(("fullname", f'fullname:"{full_name}"'))
    if top_topic:
        topic_kw = top_topic.split()[0] if top_topic.split() else top_topic
        arms.append(("name_topic", f'"{full_name}" {topic_kw} in:bio'))

    best_score = 0.0
    best_login: str | None = None
    best_arm = arms[0][0] if arms else "fullname"
    best_evidence: dict[str, Any] = {}

    try:
        gate = _enrich_gates.gh_gate()
        async with gate:
            async with httpx.AsyncClient(timeout=10.0) as client:
                for arm_id, query in arms:
                    items = await _gh_search_users(client, query, per_page=5)
                    if not items:
                        continue
                    for cand in items[:5]:
                        login = cand.get("login")
                        if not isinstance(login, str) or not login:
                            continue
                        # Hydrate user details (bio, company, followers).
                        full = await _gh_get_user(client, login)
                        if not full:
                            continue
                        langs = await _gh_top_repo_languages(client, login)
                        score, evidence = _gh_score_candidate(
                            full,
                            first=first,
                            last=last,
                            orcid=orcid,
                            institution_token=inst_token,
                            top_topic=top_topic,
                            top_repo_languages=langs,
                        )
                        evidence["arm"] = arm_id
                        evidence["query"] = query
                        if score > best_score:
                            best_score = score
                            best_login = login
                            best_arm = arm_id
                            best_evidence = evidence
                    if best_score >= _GH_HIT_THRESHOLD:
                        break
    except httpx.HTTPError as e:
        log.warning("gh search transport error: %s", e)
        _persist_gh_match(contact_id, None, 0.0, "api_error", best_arm, {"error": str(e)})
        return {
            "github_handle_status": "api_error",
            "github_handle_arm": best_arm,
            "enrichers_completed": ["github_handle"],
        }
    except Exception as e:  # noqa: BLE001 — node must not raise
        log.warning("gh search unexpected error: %s", e)
        _persist_gh_match(contact_id, None, 0.0, "api_error", best_arm, {"error": str(e)})
        return {
            "github_handle_status": "api_error",
            "github_handle_arm": best_arm,
            "enrichers_completed": ["github_handle"],
        }

    if best_score >= _GH_HIT_THRESHOLD and best_login:
        status = "hit"
    elif best_score >= _GH_LOW_CONF_THRESHOLD:
        status = "low_conf"
    else:
        status = "no_match"

    _persist_gh_match(
        contact_id, best_login, best_score, status, best_arm, best_evidence
    )

    out: dict[str, Any] = {
        "github_handle_status": status,
        "github_handle_arm": best_arm,
        "github_confidence": round(best_score, 3),
        "github_evidence": json.dumps(best_evidence),
        "enrichers_completed": ["github_handle"],
    }
    if status == "hit" and best_login:
        out["github_login"] = best_login
    return out


# ── GitHub profile enricher (Phase A2) ───────────────────────────────────────


def _persist_github_profile(contact_id: int, payload: dict[str, Any]) -> bool:
    """UPDATE contacts.github_profile = payload jsonb."""
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        return False
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE contacts SET github_profile = %s::jsonb, "
                    "updated_at = NOW() WHERE id = %s",
                    (json.dumps(payload), contact_id),
                )
                return cur.rowcount > 0
    except psycopg.Error as e:
        log.warning("failed to persist github_profile for %s: %s", contact_id, e)
        return False


async def _gh_user_repos(
    client: httpx.AsyncClient, login: str, *, per_page: int = 100
) -> list[dict[str, Any]]:
    """Fetch one page of the user's owned, non-fork repos sorted by push date."""
    res = await client.get(
        f"{_GH_API_BASE}/users/{login}/repos",
        params={"per_page": str(per_page), "sort": "pushed", "type": "owner"},
        headers=_gh_headers(),
    )
    if res.status_code != 200:
        return []
    repos = res.json()
    if not isinstance(repos, list):
        return []
    return [r for r in repos if isinstance(r, dict) and not r.get("fork")]


async def _gh_repo_languages(
    client: httpx.AsyncClient, full_name: str
) -> dict[str, int]:
    """GET /repos/{owner}/{repo}/languages → {lang: bytes}."""
    res = await client.get(
        f"{_GH_API_BASE}/repos/{full_name}/languages", headers=_gh_headers()
    )
    if res.status_code != 200:
        return {}
    data = res.json()
    return data if isinstance(data, dict) else {}


def _build_github_profile(
    user: dict[str, Any], repos: list[dict[str, Any]], lang_bytes: dict[str, int]
) -> dict[str, Any]:
    """Aggregate user payload + repo list + per-repo language bytes."""
    # top languages by bytes (with fallback to repo-count if /languages was empty)
    lang_repo_counts: dict[str, int] = {}
    for r in repos:
        lang = r.get("language")
        if isinstance(lang, str) and lang:
            lang_repo_counts[lang] = lang_repo_counts.get(lang, 0) + 1
    top_languages = sorted(
        (
            {"name": k, "bytes": v, "repo_count": lang_repo_counts.get(k, 0)}
            for k, v in lang_bytes.items()
        ),
        key=lambda x: x["bytes"],
        reverse=True,
    )[:5]
    if not top_languages:
        top_languages = sorted(
            (
                {"name": k, "bytes": 0, "repo_count": v}
                for k, v in lang_repo_counts.items()
            ),
            key=lambda x: x["repo_count"],
            reverse=True,
        )[:5]

    # top topics across owned repos
    topic_counts: dict[str, int] = {}
    for r in repos:
        for t in r.get("topics") or []:
            if isinstance(t, str) and t:
                key = t.strip().lower()
                topic_counts[key] = topic_counts.get(key, 0) + 1
    top_topics = [
        {"name": name, "count": count}
        for name, count in sorted(topic_counts.items(), key=lambda kv: kv[1], reverse=True)
    ][:5]

    pinned_like = sorted(
        (r for r in repos if not r.get("fork")),
        key=lambda r: int(r.get("stargazers_count") or 0),
        reverse=True,
    )[:6]
    pinned_repos = [
        {
            "name": r.get("name") or "",
            "full_name": r.get("full_name") or "",
            "html_url": r.get("html_url") or "",
            "stars": int(r.get("stargazers_count") or 0),
            "language": r.get("language") or "",
            "description": (r.get("description") or "")[:300],
            "topics": list(r.get("topics") or []),
            "pushed_at": r.get("pushed_at") or "",
        }
        for r in pinned_like
    ]

    last_push_at = ""
    for r in repos:
        ts = r.get("pushed_at") or ""
        if ts and ts > last_push_at:
            last_push_at = ts

    ai_topic_hits = sorted(
        kw for kw in _AI_TOPIC_KEYWORDS
        if any(kw in (t.get("name") or "") for t in top_topics)
    )

    company_raw = (user.get("company") or "").strip()
    company_org = company_raw.lstrip("@").lower() if company_raw else ""

    return {
        "login": user.get("login") or "",
        "github_id": int(user.get("id") or 0),
        "html_url": user.get("html_url") or "",
        "name": user.get("name"),
        "bio": user.get("bio"),
        "company": company_raw or None,
        "company_org": company_org or None,
        "location": user.get("location"),
        "blog": user.get("blog"),
        "twitter_username": user.get("twitter_username"),
        "email_public": user.get("email"),
        "hireable": user.get("hireable"),
        "public_repos": int(user.get("public_repos") or 0),
        "public_gists": int(user.get("public_gists") or 0),
        "followers": int(user.get("followers") or 0),
        "following": int(user.get("following") or 0),
        "gh_created_at": user.get("created_at") or "",
        "gh_updated_at": user.get("updated_at") or "",
        "last_push_at": last_push_at,
        "top_languages": top_languages,
        "top_topics": top_topics,
        "pinned_repos": pinned_repos,
        "ai_topic_hits": ai_topic_hits,
        "owned_repo_count": len(repos),
        "fork_repo_count": 0,  # we already filtered forks out
        "status": "ok",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": 1,
    }


def _gh_status_sentinel(login: str, status: str, detail: str = "") -> dict[str, Any]:
    return {
        "login": login,
        "status": status,
        "status_detail": detail or None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": 1,
    }


async def enrich_github_profile(state: ContactEnrichPaperAuthorState) -> dict:
    """Fetch full GH user metadata + repo aggregations and persist to contacts.

    Runs after `resolve_github_handle`. Reads `state.github_login` (set on
    'hit') and skips otherwise. ~12 REST calls / contact: 1 user + 1 repos +
    up to 10 /languages.
    """
    contact = state.get("contact") or {}
    contact_id = contact.get("id")
    if not isinstance(contact_id, int):
        return {
            "github_profile_status": "no_data",
            "enrichers_completed": ["github_profile"],
        }

    login = (
        state.get("github_login")
        or (contact.get("github_handle") or "")
    ).strip()
    if not login:
        return {
            "github_profile_status": "no_data",
            "enrichers_completed": ["github_profile"],
        }

    try:
        gate = _enrich_gates.gh_gate()
        async with gate:
            async with httpx.AsyncClient(timeout=15.0) as client:
                user_res = await client.get(
                    f"{_GH_API_BASE}/users/{login}", headers=_gh_headers()
                )
                if user_res.status_code == 404:
                    payload = _gh_status_sentinel(login, "not_found")
                    _persist_github_profile(contact_id, payload)
                    return {
                        "github_profile": payload,
                        "github_profile_status": "not_found",
                        "enrichers_completed": ["github_profile"],
                    }
                if user_res.status_code == 451:
                    payload = _gh_status_sentinel(login, "legal_hold")
                    _persist_github_profile(contact_id, payload)
                    return {
                        "github_profile": payload,
                        "github_profile_status": "legal_hold",
                        "enrichers_completed": ["github_profile"],
                    }
                if user_res.status_code == 401:
                    return {
                        "github_profile_status": "auth_error",
                        "enrichers_completed": ["github_profile"],
                    }
                if user_res.status_code == 403 and "x-ratelimit-remaining" in user_res.headers:
                    payload = _gh_status_sentinel(login, "rate_limited")
                    _persist_github_profile(contact_id, payload)
                    return {
                        "github_profile_status": "rate_limited",
                        "enrichers_completed": ["github_profile"],
                    }
                if user_res.status_code != 200:
                    return {
                        "github_profile_status": "transient_error",
                        "enrichers_completed": ["github_profile"],
                    }
                user = user_res.json()
                if not isinstance(user, dict):
                    return {
                        "github_profile_status": "transient_error",
                        "enrichers_completed": ["github_profile"],
                    }

                repos = await _gh_user_repos(client, login, per_page=100)
                # Top 10 repos by stars get /languages calls.
                top_for_lang = sorted(
                    repos, key=lambda r: int(r.get("stargazers_count") or 0), reverse=True
                )[:10]
                lang_results = await asyncio.gather(
                    *[_gh_repo_languages(client, r.get("full_name") or "") for r in top_for_lang],
                    return_exceptions=True,
                )
                aggregate_lang_bytes: dict[str, int] = {}
                for r in lang_results:
                    if isinstance(r, dict):
                        for k, v in r.items():
                            aggregate_lang_bytes[k] = aggregate_lang_bytes.get(k, 0) + int(v or 0)
    except httpx.HTTPError as e:
        log.warning("gh profile transport error for %s: %s", login, e)
        return {
            "github_profile_status": "transient_error",
            "enrichers_completed": ["github_profile"],
        }
    except Exception as e:  # noqa: BLE001
        log.warning("gh profile unexpected error for %s: %s", login, e)
        return {
            "github_profile_status": "transient_error",
            "enrichers_completed": ["github_profile"],
        }

    payload = _build_github_profile(user, repos, aggregate_lang_bytes)
    _persist_github_profile(contact_id, payload)
    return {
        "github_profile": payload,
        "github_profile_status": "ok",
        "enrichers_completed": ["github_profile"],
    }


def build_graph(checkpointer: Any = None) -> Any:
    """v2 fan-out / fan-in topology.

    Six enrichment branches downstream of `synthesize` run concurrently; each
    catches its own exceptions so one failing branch can't abort siblings.
    The GitHub branch is internally chained (handle → profile) before its
    terminal feeds into the join. Fan-in barrier at `classify_affiliation`
    so Team A/B/C see the full enrichment state.

    Currently wired branches:
      - resolve_github_handle → enrich_github_profile  (Phase A1 + A2)

    Pending branches (to be wired as their nodes land):
      - enrich_orcid_profile, enrich_semantic_scholar_author,
        scrape_personal_homepage, extract_email_from_paper_pdf,
        resolve_linkedin_url
    """
    builder = StateGraph(ContactEnrichPaperAuthorState)
    builder.add_node("load_contact", load_contact)
    builder.add_node("resolve_openalex_author", resolve_openalex_author)
    builder.add_node("synthesize", synthesize)
    builder.add_node("resolve_github_handle", resolve_github_handle)
    builder.add_node("enrich_github_profile", enrich_github_profile)
    builder.add_node("classify_affiliation", classify_affiliation)
    builder.add_node("classify_buyer_fit_node", classify_buyer_fit_node)
    builder.add_node("auto_flag_unreachable_node", auto_flag_unreachable_node)

    builder.add_edge(START, "load_contact")
    builder.add_edge("load_contact", "resolve_openalex_author")
    builder.add_edge("resolve_openalex_author", "synthesize")

    # Fan-out from synthesize. As more enrichers (orcid/ss/homepage/pdf/li)
    # land, add another `builder.add_edge("synthesize", <branch_root>)` here
    # plus the corresponding fan-in edge to classify_affiliation below.
    builder.add_edge("synthesize", "resolve_github_handle")
    builder.add_edge("resolve_github_handle", "enrich_github_profile")

    # Fan-in barrier — every branch terminal points at classify_affiliation
    # so the runtime waits for ALL of them before Teams A/B/C run.
    builder.add_edge("enrich_github_profile", "classify_affiliation")

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
    """Run one contact through the compiled single-contact graph.

    Switched from inline node calls (which silently skipped any node added to
    ``build_graph`` but not mirrored here — see commit history) to
    ``graph.ainvoke``. ~15 ms checkpointer overhead is acceptable; the batch
    path uses ``checkpointer=None`` so it's effectively zero. Any future node
    added to ``build_graph`` is automatically picked up here.

    Returns (summary_record, resolve_source).
    """
    out = await graph.ainvoke({"contact": contact})

    return (
        {
            "id": contact.get("id"),
            "name": (contact.get("first_name") or "").strip()
            + " "
            + (contact.get("last_name") or "").strip(),
            "resolve_source": out.get("resolve_source") or "",
            "openalex_id": out.get("openalex_id") or "",
            "display_name": out.get("display_name") or "",
            "institution": out.get("institution") or "",
            "h_index": out.get("h_index") or 0,
            "match_confidence": out.get("match_confidence") or 0.0,
            "affiliation_type": out.get("affiliation_type") or "",
            "buyer_verdict": out.get("buyer_verdict") or "",
            "auto_flagged_for_deletion": bool(
                out.get("auto_flagged_for_deletion")
            ),
            "github_login": out.get("github_login") or "",
            "github_handle_status": out.get("github_handle_status") or "",
            "github_profile_status": out.get("github_profile_status") or "",
            "enrichers_completed": list(out.get("enrichers_completed") or []),
        },
        out.get("resolve_source") or "",
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
