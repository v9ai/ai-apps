# Requires: numpy, psycopg
"""Batch post-processing utilities for LinkedIn activity posts.

Python port of:

- ``crates/linkedin-posts/src/bin/process_posts.rs`` — AI-affinity batch
  classifier. Groups stored posts by contact, computes a Bayesian-style
  AI affinity score blending a title prior with per-post ML evidence,
  and tags non-AI contacts with ``to-be-deleted`` in Neon PostgreSQL
  (while removing the tag from contacts reclassified as AI).
- ``crates/linkedin-posts/src/bin/ingest_contact.rs`` — a lightweight
  contact-ingest helper that upserts a single LinkedIn profile into
  ``contacts`` (``first_name``, ``last_name``, ``linkedin_url``,
  ``position``, ``company``, ``tags``, ``seniority``, ``department``).

Storage layer note
------------------
The original crate stored scraped posts in LanceDB. This port uses the
Neon-backed tables ``linkedin_activity_posts`` and
``linkedin_activity_likes`` (created on first server startup by
``scripts/linkedin_posts_server.py``). All batch helpers here read
through ``load_all_posts`` / ``load_all_contacts``.
"""

from __future__ import annotations

import json
import logging
import math
import os
from dataclasses import dataclass
from typing import Any, Iterable

import psycopg

from .linkedin_post_scorer import (
    title_has_ai_signal,
    title_has_engineering_signal,
)

log = logging.getLogger(__name__)

# ── Configuration ───────────────────────────────────────────────────────────

AI_THRESHOLD: float = 0.35
INTENT_THRESHOLD: float = 0.4
CHUNK_SIZE: int = 500


# ── DB helpers ───────────────────────────────────────────────────────────────


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError(
            "Neither NEON_DATABASE_URL nor DATABASE_URL is set — cannot connect to Neon."
        )
    # Drop channel_binding — psycopg / libpq handles TLS via sslmode=require.
    dsn = (
        dsn.replace("channel_binding=require&", "")
        .replace("&channel_binding=require", "")
        .replace("?channel_binding=require", "?")
    )
    return dsn


# ── Data classes ─────────────────────────────────────────────────────────────


@dataclass
class Contact:
    id: int
    first_name: str
    last_name: str
    linkedin_url: str
    company: str | None
    position: str | None
    scraped_at: str


@dataclass
class StoredPost:
    id: int
    contact_id: int
    post_url: str | None
    post_text: str | None
    posted_date: str | None
    reactions_count: int
    comments_count: int
    reposts_count: int
    media_type: str
    is_repost: bool
    original_author: str | None
    scraped_at: str
    post_type: str
    relevance_score: float
    primary_intent: str
    intent_hiring: float
    intent_ai_ml: float
    intent_remote: float
    intent_eng_culture: float
    intent_company_growth: float
    intent_thought_leadership: float
    intent_noise: float
    entities_json: str | None


@dataclass
class AffinityResult:
    contact_id: int
    name: str
    position: str
    company: str
    ai_probability: float
    prior_from_title: float
    ai_post_count: int
    hiring_ai_count: int
    total_posts: int
    max_ai_score: float
    weighted_avg_ai: float
    verdict: str  # "ai_related" | "not_ai"


# ── Data loaders ─────────────────────────────────────────────────────────────


_POSTS_SELECT = """
    SELECT id, contact_id, post_url, post_text, posted_date,
           reactions_count, comments_count, reposts_count,
           media_type, is_repost, original_author, scraped_at, post_type,
           relevance_score, primary_intent,
           intent_hiring, intent_ai_ml, intent_remote, intent_eng_culture,
           intent_company_growth, intent_thought_leadership, intent_noise,
           entities_json
    FROM linkedin_activity_posts
    ORDER BY id
"""


def _row_to_post(row: tuple[Any, ...]) -> StoredPost:
    return StoredPost(
        id=row[0],
        contact_id=row[1],
        post_url=row[2],
        post_text=row[3],
        posted_date=row[4],
        reactions_count=row[5] or 0,
        comments_count=row[6] or 0,
        reposts_count=row[7] or 0,
        media_type=row[8] or "none",
        is_repost=bool(row[9]),
        original_author=row[10],
        scraped_at=row[11],
        post_type=row[12] or "post",
        relevance_score=float(row[13] or 0.0),
        primary_intent=row[14] or "noise",
        intent_hiring=float(row[15] or 0.0),
        intent_ai_ml=float(row[16] or 0.0),
        intent_remote=float(row[17] or 0.0),
        intent_eng_culture=float(row[18] or 0.0),
        intent_company_growth=float(row[19] or 0.0),
        intent_thought_leadership=float(row[20] or 0.0),
        intent_noise=float(row[21] or 0.0),
        entities_json=row[22],
    )


def load_all_posts(conn: psycopg.Connection) -> list[StoredPost]:
    with conn.cursor() as cur:
        cur.execute(_POSTS_SELECT)
        rows = cur.fetchall()
    return [_row_to_post(r) for r in rows]


def load_all_contacts_with_linkedin(conn: psycopg.Connection) -> list[Contact]:
    sql = """
        SELECT id, first_name, last_name, linkedin_url, company, position
        FROM contacts
        WHERE linkedin_url IS NOT NULL AND linkedin_url <> ''
        ORDER BY id
    """
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    return [
        Contact(
            id=r[0],
            first_name=r[1] or "",
            last_name=r[2] or "",
            linkedin_url=r[3] or "",
            company=r[4],
            position=r[5],
            scraped_at=now,
        )
        for r in rows
    ]


def count_contacts_with_linkedin(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM contacts "
            "WHERE linkedin_url IS NOT NULL AND linkedin_url <> ''"
        )
        row = cur.fetchone()
    return int(row[0]) if row else 0


def fetch_recruiter_contacts(conn: psycopg.Connection) -> list[Contact]:
    """Port of ``neon::fetch_recruiter_contacts``."""
    from datetime import datetime, timezone

    sql = """
        SELECT id, first_name, last_name, linkedin_url, company, position
        FROM contacts
        WHERE linkedin_url IS NOT NULL AND linkedin_url <> ''
          AND position IS NOT NULL
          AND (
            position ILIKE '%recruiter%'
            OR position ILIKE '%recruiting%'
            OR position ILIKE '%recruitment%'
            OR position ILIKE '%talent acqui%'
            OR position ILIKE '%headhunt%'
            OR position ILIKE '%staffing%'
            OR position ILIKE '%sourcer%'
            OR position ILIKE '%sourcing%'
            OR position ILIKE '%talent partner%'
            OR position ILIKE '%talent scout%'
            OR position ILIKE '%talent specialist%'
            OR position ILIKE '%placement%'
          )
        ORDER BY id
    """
    now = datetime.now(timezone.utc).isoformat()
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    return [
        Contact(
            id=r[0],
            first_name=r[1] or "",
            last_name=r[2] or "",
            linkedin_url=r[3] or "",
            company=r[4],
            position=r[5],
            scraped_at=now,
        )
        for r in rows
    ]


def update_contact_authority(
    conn: psycopg.Connection, contact_id: int, score: float
) -> None:
    """Port of ``neon::update_contact_authority`` — SET ``authority_score``."""
    if score <= 0.0:
        return
    clamped = max(0.0, min(1.0, float(score)))
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE contacts SET authority_score = %s WHERE id = %s",
            (clamped, int(contact_id)),
        )
    log.info("Updated contact %s authority_score = %.3f", contact_id, clamped)


# ── AI affinity scoring ─────────────────────────────────────────────────────


def _finite(x: float) -> float:
    return x if math.isfinite(x) else 0.0


def compute_ai_affinity(contact: Contact, posts: list[StoredPost]) -> AffinityResult:
    position = contact.position or ""
    company = contact.company or ""
    name = f"{contact.first_name} {contact.last_name}".strip()

    has_ai_title = title_has_ai_signal(position)
    has_eng_title = title_has_engineering_signal(position)

    if has_ai_title:
        title_score = 0.70
    elif has_eng_title:
        title_score = 0.30
    else:
        title_score = 0.10

    ai_post_count = 0
    hiring_ai_count = 0
    max_ai_score = 0.0
    weighted_ai_sum = 0.0
    weight_total = 0.0

    for p in posts:
        ai_score = _finite(p.intent_ai_ml)
        hiring_score = _finite(p.intent_hiring)

        if ai_score > max_ai_score:
            max_ai_score = ai_score

        engagement = max(p.reactions_count, 0) + max(p.comments_count, 0)
        w = math.log(2.0 + engagement)
        if p.is_repost:
            w *= 0.5
        weight_total += w

        if ai_score > INTENT_THRESHOLD:
            ai_post_count += 1
            weighted_ai_sum += ai_score * w

        if hiring_score > INTENT_THRESHOLD and ai_score > INTENT_THRESHOLD:
            hiring_ai_count += 1

    ai_ratio = weighted_ai_sum / weight_total if weight_total > 0.0 else 0.0

    if not posts:
        ai_probability = title_score
    else:
        post_confidence = min(len(posts) / 10.0, 1.0)
        title_weight = 1.0 - post_confidence * 0.7
        post_weight = 1.0 - title_weight

        hiring_ai_ratio = hiring_ai_count / max(len(posts), 1)
        post_score = min(
            ai_ratio * (1.0 + 0.15 * max_ai_score + 0.20 * hiring_ai_ratio),
            1.0,
        )
        ai_probability = max(
            0.0, min(1.0, title_weight * title_score + post_weight * post_score)
        )

    verdict = "ai_related" if ai_probability >= AI_THRESHOLD else "not_ai"

    return AffinityResult(
        contact_id=contact.id,
        name=name,
        position=position,
        company=company,
        ai_probability=ai_probability,
        prior_from_title=title_score,
        ai_post_count=ai_post_count,
        hiring_ai_count=hiring_ai_count,
        total_posts=len(posts),
        max_ai_score=max_ai_score,
        weighted_avg_ai=ai_ratio,
        verdict=verdict,
    )


# ── Tag mutations ───────────────────────────────────────────────────────────


def _parse_tags(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(t) for t in raw]
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return []
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return [str(t) for t in parsed]
        except json.JSONDecodeError:
            return []
    return []


def _chunks(items: list[int], size: int) -> Iterable[list[int]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def batch_tag_for_deletion(
    conn: psycopg.Connection, contact_ids: list[int]
) -> tuple[int, int]:
    """Return ``(newly_tagged, already_tagged)``.

    Mirrors the Rust impl: build the new tag JSON in Python so we never rely
    on a ``tags::jsonb`` cast against possibly-corrupt data.
    """
    if not contact_ids:
        return 0, 0

    newly_tagged = 0
    already_tagged = 0

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, tags FROM contacts WHERE id = ANY(%s)",
            (contact_ids,),
        )
        rows = cur.fetchall()

        for cid, tags_raw in rows:
            tags = _parse_tags(tags_raw)
            if "to-be-deleted" in tags:
                already_tagged += 1
                continue
            tags.append("to-be-deleted")
            new_tags_json = json.dumps(tags)
            cur.execute(
                "UPDATE contacts SET tags = %s, updated_at = now()::text WHERE id = %s",
                (new_tags_json, cid),
            )
            newly_tagged += 1

    return newly_tagged, already_tagged


def batch_untag_deletion(
    conn: psycopg.Connection, contact_ids: list[int]
) -> tuple[int, int]:
    """Return ``(untagged_count, not_tagged_count)``."""
    if not contact_ids:
        return 0, 0

    untagged = 0
    not_tagged = 0

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, tags FROM contacts WHERE id = ANY(%s)",
            (contact_ids,),
        )
        rows = cur.fetchall()

        for cid, tags_raw in rows:
            tags = _parse_tags(tags_raw)
            if "to-be-deleted" not in tags:
                not_tagged += 1
                continue
            new_tags = [t for t in tags if t != "to-be-deleted"]
            cur.execute(
                "UPDATE contacts SET tags = %s, updated_at = now()::text WHERE id = %s",
                (json.dumps(new_tags), cid),
            )
            untagged += 1

    return untagged, not_tagged


# ── Contact upsert (port of ``neon::upsert_contact_by_linkedin``) ────────────


def upsert_contact_by_linkedin(
    conn: psycopg.Connection,
    *,
    first_name: str,
    last_name: str,
    linkedin_url: str,
    position: str | None = None,
    company: str | None = None,
    tags_json: str = "[]",
    seniority: str | None = None,
    department: str | None = None,
) -> int:
    """Insert or update a contact by ``linkedin_url`` — returns contact id."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM contacts WHERE linkedin_url = %s",
            (linkedin_url,),
        )
        existing = cur.fetchone()

        if existing:
            cid = int(existing[0])
            cur.execute(
                """
                UPDATE contacts
                SET position = COALESCE(%s, position),
                    company = COALESCE(%s, company),
                    tags = %s,
                    seniority = COALESCE(%s, seniority),
                    department = COALESCE(%s, department),
                    updated_at = now()::text
                WHERE id = %s
                """,
                (position, company, tags_json, seniority, department, cid),
            )
            log.info("Updated existing contact id=%s", cid)
            return cid

        cur.execute(
            """
            INSERT INTO contacts (
                first_name, last_name, linkedin_url, position, company,
                tags, seniority, department, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                      now()::text, now()::text)
            RETURNING id
            """,
            (
                first_name,
                last_name,
                linkedin_url,
                position,
                company,
                tags_json,
                seniority,
                department,
            ),
        )
        row = cur.fetchone()
        cid = int(row[0]) if row else 0
        log.info("Inserted new contact id=%s", cid)
        return cid


# ── Authority aggregation (port of ``authority::aggregate_signals``) ─────────


@dataclass
class ContactPostSignals:
    contact_id: int
    total_posts: int
    avg_relevance: float
    max_hiring_signal: float
    hiring_post_count: int
    ai_content_count: int
    thought_leadership_count: int
    avg_engagement: float
    post_frequency_score: float
    authority_delta: float


def aggregate_signals(contact_id: int, posts: list[StoredPost]) -> ContactPostSignals:
    if not posts:
        return ContactPostSignals(
            contact_id=contact_id,
            total_posts=0,
            avg_relevance=0.0,
            max_hiring_signal=0.0,
            hiring_post_count=0,
            ai_content_count=0,
            thought_leadership_count=0,
            avg_engagement=0.0,
            post_frequency_score=0.0,
            authority_delta=0.0,
        )

    n = len(posts)
    sum_relevance = 0.0
    max_hiring = 0.0
    hiring_count = 0
    ai_count = 0
    thought_count = 0
    sum_engagement = 0.0

    for p in posts:
        sum_relevance += p.relevance_score
        if p.intent_hiring > max_hiring:
            max_hiring = p.intent_hiring
        if p.intent_hiring > INTENT_THRESHOLD:
            hiring_count += 1
        if p.intent_ai_ml > INTENT_THRESHOLD:
            ai_count += 1
        if p.intent_thought_leadership > INTENT_THRESHOLD:
            thought_count += 1
        engagement = math.log(
            2.0 + max(p.reactions_count, 0) + max(p.comments_count, 0)
        )
        sum_engagement += engagement

    avg_relevance = sum_relevance / n
    avg_engagement = sum_engagement / n
    post_frequency_score = min(n / 10.0, 1.0)

    thought_ratio = thought_count / n
    ai_ratio = ai_count / n
    engagement_norm = min(avg_engagement / 5.0, 1.0)
    hiring_ratio = hiring_count / n

    raw = (
        0.30 * thought_ratio
        + 0.25 * (0.5 * max_hiring + 0.5 * hiring_ratio)
        + 0.20 * ai_ratio
        + 0.15 * engagement_norm
        + 0.10 * post_frequency_score
    )
    relevance_gate = max(0.0, min(1.0, avg_relevance))
    authority_delta = max(0.0, min(1.0, raw * (0.3 + 0.7 * relevance_gate)))

    return ContactPostSignals(
        contact_id=contact_id,
        total_posts=n,
        avg_relevance=avg_relevance,
        max_hiring_signal=max_hiring,
        hiring_post_count=hiring_count,
        ai_content_count=ai_count,
        thought_leadership_count=thought_count,
        avg_engagement=avg_engagement,
        post_frequency_score=post_frequency_score,
        authority_delta=authority_delta,
    )


# ── CLI-style batch runner (port of ``process_posts.rs::main``) ──────────────


def run_process_posts() -> None:
    """Batch AI-affinity classification pass.

    Reads all posts from ``linkedin_activity_posts``, groups by
    ``contact_id``, computes affinity, and mutates ``contacts.tags``
    accordingly. Safe to re-run — classification is deterministic and
    tag mutations are idempotent (``to-be-deleted`` is added/removed
    based on the current verdict only).
    """
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    log.info("=== Post-Process: AI Affinity Classification ===")

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        all_posts = load_all_posts(conn)
        contacts = load_all_contacts_with_linkedin(conn)
        log.info(
            "Loaded %d posts for %d contacts from Neon",
            len(all_posts),
            len(contacts),
        )

        posts_by_contact: dict[int, list[StoredPost]] = {}
        for post in all_posts:
            posts_by_contact.setdefault(post.contact_id, []).append(post)

        results = [
            compute_ai_affinity(c, posts_by_contact.get(c.id, [])) for c in contacts
        ]
        results.sort(key=lambda r: r.ai_probability, reverse=True)

        ai_count = sum(1 for r in results if r.verdict == "ai_related")
        not_ai_count = sum(1 for r in results if r.verdict == "not_ai")
        with_posts = sum(1 for r in results if r.total_posts > 0)
        without_posts = sum(1 for r in results if r.total_posts == 0)
        total = len(results)

        log.info(
            "Contact results: AI=%d (%.1f%%) | NotAI=%d (%.1f%%) | "
            "with_posts=%d | without_posts=%d",
            ai_count,
            (ai_count / total * 100.0) if total else 0.0,
            not_ai_count,
            (not_ai_count / total * 100.0) if total else 0.0,
            with_posts,
            without_posts,
        )

        not_ai_ids = [r.contact_id for r in results if r.verdict == "not_ai"]
        newly_tagged = 0
        already_tagged = 0
        for chunk in _chunks(not_ai_ids, CHUNK_SIZE):
            new, existing = batch_tag_for_deletion(conn, chunk)
            newly_tagged += new
            already_tagged += existing
            if new:
                log.info(
                    "Tagged %d contacts in chunk of %d",
                    new,
                    len(chunk),
                )

        ai_ids = [r.contact_id for r in results if r.verdict == "ai_related"]
        untagged = 0
        for chunk in _chunks(ai_ids, CHUNK_SIZE):
            removed, _clean = batch_untag_deletion(conn, chunk)
            untagged += removed
            if removed:
                log.info(
                    "Untagged %d AI contacts in chunk of %d",
                    removed,
                    len(chunk),
                )

        log.info(
            "Tags applied: to-be-deleted=%d (new=%d, existing=%d) | untagged=%d",
            not_ai_count,
            newly_tagged,
            already_tagged,
            untagged,
        )

        log.info("=== Complete ===")


def run_ingest_contact(
    *,
    first_name: str,
    last_name: str,
    linkedin_url: str,
    position: str | None = None,
    company: str | None = None,
    seniority: str | None = None,
    department: str | None = None,
    tags: list[str] | None = None,
) -> int:
    """Upsert a single LinkedIn profile into ``contacts``.

    Python port of the lightweight path in ``bin/ingest_contact.rs``.

    The Rust binary also ran a JobBERT skill extractor (``jobbert`` crate)
    to enrich ``tags``. That crate is not yet ported to Python — callers
    that need the extracted skill tags can pass them in via the ``tags``
    kwarg. All role/open-to-work tags from the Rust binary (e.g.
    ``open-to-work``) must be supplied by the caller.
    """
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    tag_list = list(tags) if tags else []
    tags_json = json.dumps(tag_list)

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        cid = upsert_contact_by_linkedin(
            conn,
            first_name=first_name,
            last_name=last_name,
            linkedin_url=linkedin_url,
            position=position,
            company=company,
            tags_json=tags_json,
            seniority=seniority,
            department=department,
        )

    log.info(
        "Contact saved: id=%s %s %s (position=%r company=%r tags=%s)",
        cid,
        first_name,
        last_name,
        position,
        company,
        tags_json,
    )
    return cid
