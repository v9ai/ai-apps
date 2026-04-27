"""Neon (Postgres) client — replaces the old Cloudflare D1 HTTP client."""
from __future__ import annotations

import json
import os
from typing import Optional

import psycopg
from psycopg import sql
from psycopg_pool import AsyncConnectionPool

from .d1 import (
    ContactFeedback,
    FamilyMember,
    Issue,
    ResearchPaper,
)

# Whitelist of dedup columns allowed in dynamic SQL composition.
# Any value composed via psycopg.sql.Identifier into a query MUST be checked
# against this set first — defence in depth against future regressions that
# might allow caller-controlled column names to flow into SQL.
_ALLOWED_DEDUP_COLS = frozenset(
    {"journal_entry_id", "issue_id", "feedback_id", "goal_id", "medication_id"}
)


# Module-level pool. Initialized in the FastAPI lifespan in ``app.py``. When
# ``None`` (e.g. CLI scripts, tests, ad-hoc usage) ``_conn_ctx`` falls back to a
# direct connect so callers don't have to know about pool wiring.
POOL: AsyncConnectionPool | None = None


def _get_conn_str() -> str:
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return url


def _conn_ctx():
    """Return an async context manager yielding a pooled connection.

    If the module-level ``POOL`` has been initialized (production / FastAPI
    lifespan), borrow from it; otherwise open a one-shot connection so CLI
    scripts and tests still work without pool wiring.
    """
    if POOL is not None:
        return POOL.connection()
    return _OneShotConn()


class _OneShotConn:
    """Tiny async-context wrapper that opens-and-closes a single connection.

    Mirrors ``async with await psycopg.AsyncConnection.connect(...) as conn``
    so call sites can use the same ``async with _conn_ctx() as conn`` shape
    regardless of whether the pool is active.
    """

    def __init__(self) -> None:
        self._conn: psycopg.AsyncConnection | None = None

    async def __aenter__(self) -> psycopg.AsyncConnection:
        self._conn = await psycopg.AsyncConnection.connect(_get_conn_str())
        return self._conn

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._conn is None:
            return
        try:
            # Match the pool's `async with conn:` semantics: commit on a clean
            # exit, rollback on exception. Without this, INSERT/UPDATE inside
            # a CLI/test path silently rolls back at close().
            if exc_type is None:
                await self._conn.commit()
            else:
                await self._conn.rollback()
        finally:
            await self._conn.close()
            self._conn = None


# Public alias so external callers (graph modules) don't dip into the leading
# underscore. Both names resolve to the same callable.
connection = _conn_ctx


async def fetch_contact_feedback(feedback_id: int) -> ContactFeedback:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, contact_id, family_member_id, subject, content, "
                "feedback_date, tags, source, extracted_issues "
                "FROM contact_feedbacks WHERE id = %s",
                (feedback_id,),
            )
            row = await cur.fetchone()
    if not row:
        raise ValueError(f"feedback {feedback_id} not found")
    return ContactFeedback(
        id=row[0], contact_id=row[1], family_member_id=row[2],
        subject=row[3], content=row[4], feedback_date=str(row[5]),
        tags=row[6], source=row[7], extracted_issues=row[8],
    )


async def fetch_issues_for_feedback(feedback_id: int) -> list[Issue]:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, title, description, category, severity, recommendations "
                "FROM issues WHERE feedback_id = %s ORDER BY severity DESC",
                (feedback_id,),
            )
            rows = await cur.fetchall()
    return [
        Issue(id=r[0], title=r[1], description=r[2], category=r[3],
              severity=r[4], recommendations=r[5])
        for r in rows
    ]


async def fetch_family_member(family_member_id: int) -> FamilyMember:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, \"firstName\", name, date_of_birth, age_years "
                "FROM family_members WHERE id = %s",
                (family_member_id,),
            )
            row = await cur.fetchone()
    if not row:
        raise ValueError(f"family_member {family_member_id} not found")
    return FamilyMember(id=row[0], first_name=row[1], name=row[2],
                        date_of_birth=str(row[3]) if row[3] else None, age_years=row[4])


async def fetch_first_goal_id(family_member_id: int) -> Optional[int]:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id FROM goals WHERE family_member_id = %s ORDER BY created_at DESC LIMIT 1",
                (family_member_id,),
            )
            row = await cur.fetchone()
    return row[0] if row else None


async def fetch_research_papers(
    feedback_id: Optional[int] = None,
    goal_id: Optional[int] = None,
) -> list[ResearchPaper]:
    if feedback_id is not None:
        where, val = "feedback_id = %s", feedback_id
    elif goal_id is not None:
        where, val = "goal_id = %s", goal_id
    else:
        return []
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"SELECT id, title, authors, year, key_findings, therapeutic_techniques, "
                f"evidence_level, relevance_score FROM therapy_research "
                f"WHERE {where} ORDER BY relevance_score DESC LIMIT 10",
                (val,),
            )
            rows = await cur.fetchall()
    return [
        ResearchPaper(id=r[0], title=r[1], authors=r[2], year=r[3],
                      key_findings=r[4], therapeutic_techniques=r[5],
                      evidence_level=r[6], relevance_score=r[7])
        for r in rows
    ]


async def insert_story(
    goal_id: Optional[int],
    feedback_id: Optional[int],
    language: str,
    minutes: int,
    content: str,
) -> int:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO stories (goal_id, feedback_id, user_id, content, language, minutes, created_at, updated_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id",
                (goal_id, feedback_id, "system", content, language, minutes),
            )
            row = await cur.fetchone()
    return row[0] if row else 0


async def upsert_research_paper(
    therapeutic_goal_type: str,
    title: str,
    authors: list[str],
    year: int | None,
    doi: str | None,
    url: str | None,
    abstract: str | None,
    key_findings: list[str],
    therapeutic_techniques: list[str],
    evidence_level: str | None,
    relevance_score: float,
    feedback_id: int | None = None,
    issue_id: int | None = None,
    goal_id: int | None = None,
    journal_entry_id: int | None = None,
    medication_id: str | None = None,
) -> int:
    """Insert or skip a research paper into Neon therapy_research table."""
    authors_json = json.dumps(authors or [])
    findings_json = json.dumps(key_findings or [])
    techniques_json = json.dumps(therapeutic_techniques or [])
    score = int(relevance_score * 100) if relevance_score <= 1 else int(relevance_score)
    # Derive confidence from abstract quality + key findings count
    has_abstract = bool(abstract and len(abstract.strip()) >= 100)
    has_findings = len(key_findings) >= 2
    has_techniques = len(therapeutic_techniques) >= 1
    confidence = 40 + (has_abstract * 25) + (has_findings * 20) + (has_techniques * 15)

    # Build dedup condition based on which id is provided
    if medication_id is not None:
        dedup_col, dedup_val = "medication_id", medication_id
    elif journal_entry_id is not None:
        dedup_col, dedup_val = "journal_entry_id", journal_entry_id
    elif issue_id is not None:
        dedup_col, dedup_val = "issue_id", issue_id
    elif feedback_id is not None:
        dedup_col, dedup_val = "feedback_id", feedback_id
    else:
        dedup_col, dedup_val = "goal_id", goal_id

    # Defence in depth: even though dedup_col is set from a closed set above,
    # validate against the explicit whitelist before composing it into SQL via
    # psycopg.sql.Identifier. Prevents future regressions where a careless
    # edit lets caller-controlled column names flow into the query.
    if dedup_col not in _ALLOWED_DEDUP_COLS:
        raise ValueError(f"invalid dedup_col: {dedup_col!r}")
    dedup_ident = sql.Identifier(dedup_col)

    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            # Deduplicate by DOI
            if doi:
                doi_query = sql.SQL(
                    "SELECT id FROM therapy_research WHERE doi = %s AND {} = %s LIMIT 1"
                ).format(dedup_ident)
                await cur.execute(doi_query, (doi, dedup_val))
                row = await cur.fetchone()
                if row:
                    return row[0]

            # Deduplicate by title
            title_query = sql.SQL(
                "SELECT id FROM therapy_research WHERE title = %s AND {} = %s LIMIT 1"
            ).format(dedup_ident)
            await cur.execute(title_query, (title, dedup_val))
            row = await cur.fetchone()
            if row:
                return row[0]

            # Insert
            await cur.execute(
                """INSERT INTO therapy_research (
                    goal_id, feedback_id, issue_id, journal_entry_id, medication_id, therapeutic_goal_type, title, authors, year, doi, url,
                    abstract, key_findings, therapeutic_techniques, evidence_level,
                    relevance_score, extracted_by, extraction_confidence,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                ) RETURNING id""",
                (
                    goal_id, feedback_id, issue_id, journal_entry_id, medication_id, therapeutic_goal_type, title, authors_json,
                    year, doi, url, abstract, findings_json, techniques_json,
                    evidence_level, score, "langgraph:deepseek-chat:v1", confidence,
                ),
            )
            row = await cur.fetchone()
            return row[0] if row else 0


# ---------------------------------------------------------------------------
# Medication deep-research fact UPSERTs.
#
# Drug-level facts keyed on `drug_slug` = first-word lowercased of the
# medication name. Populated by the `medication_deep_research` LangGraph; read
# by GraphQL resolvers to render the medication detail page.
#
# Each helper has a fixed dedup key (no caller-controlled column composition),
# so we don't extend `_ALLOWED_DEDUP_COLS` here.
# ---------------------------------------------------------------------------
async def upsert_medication_pharmacology(
    drug_slug: str,
    generic_name: Optional[str],
    brand_names: list[str],
    atc_code: Optional[str],
    moa: Optional[str],
    half_life: Optional[str],
    peak_time: Optional[str],
    metabolism: Optional[str],
    excretion: Optional[str],
    source_url: Optional[str],
) -> None:
    """1:1 UPSERT keyed on drug_slug. Bumps updated_at on every write."""
    brands_json = json.dumps(brand_names or [])
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO medication_pharmacology (
                    drug_slug, generic_name, brand_names, atc_code, moa,
                    half_life, peak_time, metabolism, excretion, source_url,
                    updated_at
                )
                VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (drug_slug) DO UPDATE SET
                    generic_name = EXCLUDED.generic_name,
                    brand_names  = EXCLUDED.brand_names,
                    atc_code     = EXCLUDED.atc_code,
                    moa          = EXCLUDED.moa,
                    half_life    = EXCLUDED.half_life,
                    peak_time    = EXCLUDED.peak_time,
                    metabolism   = EXCLUDED.metabolism,
                    excretion    = EXCLUDED.excretion,
                    source_url   = EXCLUDED.source_url,
                    updated_at   = NOW()
                """,
                (
                    drug_slug, generic_name, brands_json, atc_code, moa,
                    half_life, peak_time, metabolism, excretion, source_url,
                ),
            )


async def upsert_medication_indication(
    drug_slug: str,
    kind: str,  # 'primary' | 'off_label'
    condition: str,
    evidence_level: Optional[str] = None,
    source: Optional[str] = None,
    source_url: Optional[str] = None,
    confidence: Optional[int] = None,
) -> None:
    """Idempotent insert. Dedup key: (drug_slug, kind, condition)."""
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO medication_indications (
                    drug_slug, kind, condition, evidence_level,
                    source, source_url, confidence
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (drug_slug, kind, condition) DO UPDATE SET
                    evidence_level = COALESCE(EXCLUDED.evidence_level, medication_indications.evidence_level),
                    source         = COALESCE(EXCLUDED.source,         medication_indications.source),
                    source_url     = COALESCE(EXCLUDED.source_url,     medication_indications.source_url),
                    confidence     = COALESCE(EXCLUDED.confidence,     medication_indications.confidence)
                """,
                (drug_slug, kind, condition, evidence_level, source, source_url, confidence),
            )


async def upsert_medication_dosing(
    drug_slug: str,
    population: str,  # 'adult' | 'pediatric' | 'elderly' | 'renal' | 'hepatic'
    dose_text: str,
    age_band: Optional[str] = None,
    weight_band: Optional[str] = None,
    frequency: Optional[str] = None,
    max_daily: Optional[str] = None,
    source_url: Optional[str] = None,
) -> None:
    """Idempotent insert via the medication_dosing_dedup_idx UNIQUE INDEX
    (covers (drug_slug, population, COALESCE(age_band,''), COALESCE(weight_band,''), dose_text))."""
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO medication_dosing (
                    drug_slug, population, age_band, weight_band,
                    dose_text, frequency, max_daily, source_url
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (drug_slug, population, COALESCE(age_band,''), COALESCE(weight_band,''), dose_text) DO NOTHING
                """,
                (drug_slug, population, age_band, weight_band, dose_text, frequency, max_daily, source_url),
            )


async def upsert_medication_adverse_event(
    drug_slug: str,
    event: str,
    frequency_band: str,  # 'common' | 'uncommon' | 'rare' | 'black_box'
    severity: Optional[str] = None,
    source_url: Optional[str] = None,
) -> None:
    """Idempotent insert. Dedup key: (drug_slug, event, frequency_band)."""
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO medication_adverse_events (
                    drug_slug, event, frequency_band, severity, source_url
                )
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (drug_slug, event, frequency_band) DO UPDATE SET
                    severity   = COALESCE(EXCLUDED.severity,   medication_adverse_events.severity),
                    source_url = COALESCE(EXCLUDED.source_url, medication_adverse_events.source_url)
                """,
                (drug_slug, event, frequency_band, severity, source_url),
            )


async def upsert_medication_interaction(
    drug_slug: str,
    interacting_drug: str,
    severity: str,  # 'contraindicated' | 'major' | 'moderate' | 'minor'
    mechanism: Optional[str] = None,
    recommendation: Optional[str] = None,
    source_url: Optional[str] = None,
) -> None:
    """Idempotent insert. Dedup key: (drug_slug, interacting_drug)."""
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO medication_interactions (
                    drug_slug, interacting_drug, severity,
                    mechanism, recommendation, source_url
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (drug_slug, interacting_drug) DO UPDATE SET
                    severity       = EXCLUDED.severity,
                    mechanism      = COALESCE(EXCLUDED.mechanism,      medication_interactions.mechanism),
                    recommendation = COALESCE(EXCLUDED.recommendation, medication_interactions.recommendation),
                    source_url     = COALESCE(EXCLUDED.source_url,     medication_interactions.source_url)
                """,
                (drug_slug, interacting_drug, severity, mechanism, recommendation, source_url),
            )


async def upsert_medication_correlation(
    medication_id: str,
    family_member_id: Optional[int],
    related_entity_type: str,  # 'issue' | 'journal_entry' | 'observation' | 'teacher_feedback'
    related_entity_id: int,
    correlation_type: str,  # 'possible_side_effect' | 'indication_match' | 'temporal' | 'other'
    confidence: int = 50,
    rationale: Optional[str] = None,
    matched_fact: Optional[str] = None,
) -> None:
    """Idempotent insert. Dedup key: (medication_id, related_entity_type,
    related_entity_id, correlation_type)."""
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO medication_correlations (
                    medication_id, family_member_id, related_entity_type,
                    related_entity_id, correlation_type, confidence,
                    rationale, matched_fact
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (medication_id, related_entity_type, related_entity_id, correlation_type)
                DO UPDATE SET
                    confidence    = GREATEST(EXCLUDED.confidence, medication_correlations.confidence),
                    rationale     = COALESCE(EXCLUDED.rationale,     medication_correlations.rationale),
                    matched_fact  = COALESCE(EXCLUDED.matched_fact,  medication_correlations.matched_fact)
                """,
                (medication_id, family_member_id, related_entity_type,
                 related_entity_id, correlation_type, confidence,
                 rationale, matched_fact),
            )


async def fetch_patient_clinical_data(
    user_email: str,
    family_member_id: int,
    issues_limit: int = 30,
    journals_limit: int = 30,
) -> dict:
    """Return issues + recent journal entries for a family member. Used by
    the medication_deep_research correlation node to cross-reference patient
    data against the medication's known fact profile."""
    out: dict = {"issues": [], "journals": []}
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, title, description, category, severity, recommendations
                FROM issues
                WHERE family_member_id = %s AND user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (family_member_id, user_email, issues_limit),
            )
            for r in await cur.fetchall():
                out["issues"].append({
                    "id": r[0], "title": r[1], "description": r[2],
                    "category": r[3], "severity": r[4], "recommendations": r[5],
                })

            await cur.execute(
                """
                SELECT id, title, content, mood, entry_date, tags
                FROM journal_entries
                WHERE family_member_id = %s AND user_id = %s
                ORDER BY entry_date DESC
                LIMIT %s
                """,
                (family_member_id, user_email, journals_limit),
            )
            for r in await cur.fetchall():
                out["journals"].append({
                    "id": r[0], "title": r[1], "content": r[2],
                    "mood": r[3], "entry_date": str(r[4]) if r[4] else None,
                    "tags": r[5],
                })
    return out


async def fetch_drug_facts(drug_slug: str) -> dict:
    """Read back the drug-level facts (indications, dosing, AEs, BBW,
    interactions). Used by the correlation node when the freshness gate hit
    the cache and the in-flight ``_facts`` state was never populated."""
    out: dict = {
        "pharmacology": {},
        "indications": [],
        "dosing": [],
        "adverse_events": [],
        "interactions": [],
    }
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT generic_name, atc_code, moa, half_life FROM medication_pharmacology WHERE drug_slug = %s",
                (drug_slug,),
            )
            row = await cur.fetchone()
            if row:
                out["pharmacology"] = {
                    "generic_name": row[0], "atc_code": row[1], "moa": row[2], "half_life": row[3],
                }
            await cur.execute(
                "SELECT kind, condition FROM medication_indications WHERE drug_slug = %s",
                (drug_slug,),
            )
            for r in await cur.fetchall():
                out["indications"].append({"kind": r[0], "condition": r[1]})
            await cur.execute(
                "SELECT population, age_band, dose_text FROM medication_dosing WHERE drug_slug = %s",
                (drug_slug,),
            )
            for r in await cur.fetchall():
                out["dosing"].append({"population": r[0], "age_band": r[1], "dose_text": r[2]})
            await cur.execute(
                "SELECT event, frequency_band FROM medication_adverse_events WHERE drug_slug = %s",
                (drug_slug,),
            )
            for r in await cur.fetchall():
                out["adverse_events"].append({"event": r[0], "frequency_band": r[1]})
            await cur.execute(
                "SELECT interacting_drug, severity FROM medication_interactions WHERE drug_slug = %s",
                (drug_slug,),
            )
            for r in await cur.fetchall():
                out["interactions"].append({"interacting_drug": r[0], "severity": r[1]})
    return out


async def purge_drug_slug_text_rows(drug_slug: str) -> None:
    """Delete every row whose content is free-form translated text for a drug.
    Called by the medication_deep_research graph before re-inserting in a
    different language so English rows don't linger alongside Romanian ones.

    Includes interactions because their `recommendation` column is mixed
    LLM-translated + RxNav English text; clearing forces a clean rewrite.
    Pharmacology is 1:1 UPSERT keyed on drug_slug — overwrites cleanly, no
    purge needed. Correlations are keyed on (medication_id, entity_type,
    entity_id, correlation_type) and use language-aware UPSERT — unaffected.
    """
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM medication_indications    WHERE drug_slug = %s",
                (drug_slug,),
            )
            await cur.execute(
                "DELETE FROM medication_dosing         WHERE drug_slug = %s",
                (drug_slug,),
            )
            await cur.execute(
                "DELETE FROM medication_adverse_events WHERE drug_slug = %s",
                (drug_slug,),
            )
            await cur.execute(
                "DELETE FROM medication_interactions   WHERE drug_slug = %s",
                (drug_slug,),
            )


async def fetch_pharmacology_updated_at(drug_slug: str) -> Optional[str]:
    """Return the ``updated_at`` ISO timestamp for a drug's pharmacology row,
    or None when nothing has been persisted yet. Drives the 30-day freshness
    gate in the medication_deep_research graph."""
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT updated_at FROM medication_pharmacology WHERE drug_slug = %s",
                (drug_slug,),
            )
            row = await cur.fetchone()
    return str(row[0]) if row else None


async def fetch_medications_for_slug(
    user_email: str,
    drug_slug: str,
) -> list[dict]:
    """Return every medications row whose first-word-lowercased name matches
    ``drug_slug`` for the given user, joined with family_member age data.

    The match uses the ``medications_drug_slug_idx`` expression index added in
    migration 0020, so this is cheap even with thousands of rows."""
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT m.id::text, m.name, m.dosage, m.frequency, m.notes,
                       m.start_date, m.end_date, m.family_member_id,
                       fm.first_name, fm.age_years, fm.date_of_birth,
                       fm.preferred_language
                FROM medications m
                LEFT JOIN family_members fm ON fm.id = m.family_member_id
                WHERE m.user_id = %s
                  AND lower(split_part(m.name, ' ', 1)) = %s
                ORDER BY m.created_at DESC
                """,
                (user_email, drug_slug),
            )
            rows = await cur.fetchall()
    out: list[dict] = []
    for r in rows:
        out.append({
            "id": r[0],
            "name": r[1],
            "dosage": r[2],
            "frequency": r[3],
            "notes": r[4],
            "start_date": str(r[5]) if r[5] else None,
            "end_date": str(r[6]) if r[6] else None,
            "family_member_id": r[7],
            "family_member_first_name": r[8],
            "family_member_age_years": r[9],
            "family_member_date_of_birth": str(r[10]) if r[10] else None,
            "family_member_preferred_language": r[11],
        })
    return out


async def fetch_active_medications_for_person(
    user_email: str,
    slug: str,
) -> list[dict]:
    """Return active medications for a "person view" (slug='me' or 'bogdan'),
    matching the same name filter the frontend applies in
    ``app/medications/[slug]/page.tsx``:
      - 'me'     → name does NOT start with 'singulair' (case-insensitive first word)
      - 'bogdan' → name starts with 'singulair'

    Each row is joined with medication_pharmacology to surface ATC code (used
    downstream for duplicate-therapy detection by ATC level-3 group)."""
    slug = (slug or "").strip().lower()
    if slug not in {"me", "bogdan"}:
        return []

    if slug == "bogdan":
        slug_clause = "lower(split_part(m.name, ' ', 1)) = 'singulair'"
    else:
        slug_clause = "lower(split_part(m.name, ' ', 1)) <> 'singulair'"

    sql_query = f"""
        SELECT m.id::text,
               m.name,
               m.dosage,
               m.frequency,
               m.notes,
               m.start_date,
               m.end_date,
               m.family_member_id,
               lower(split_part(m.name, ' ', 1)) AS drug_slug,
               fm.first_name,
               fm.preferred_language,
               mp.atc_code,
               mp.generic_name
        FROM medications m
        LEFT JOIN family_members fm ON fm.id = m.family_member_id
        LEFT JOIN medication_pharmacology mp
               ON mp.drug_slug = lower(split_part(m.name, ' ', 1))
        WHERE m.user_id = %s
          AND m.is_active = TRUE
          AND {slug_clause}
        ORDER BY m.name ASC
    """

    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql_query, (user_email,))
            rows = await cur.fetchall()

    out: list[dict] = []
    for r in rows:
        out.append({
            "id": r[0],
            "name": r[1],
            "dosage": r[2],
            "frequency": r[3],
            "notes": r[4],
            "start_date": str(r[5]) if r[5] else None,
            "end_date": str(r[6]) if r[6] else None,
            "family_member_id": r[7],
            "drug_slug": r[8],
            "family_member_first_name": r[9],
            "family_member_preferred_language": r[10],
            "atc_code": r[11],
            "generic_name": r[12],
        })
    return out
