"""D1 client — uses D1 binding (no HTTP subrequests)."""

from __future__ import annotations

import json
from typing import Any


async def query_d1(
    settings: dict, sql: str, params: list | None = None
) -> list[dict]:
    """Execute a SQL query against D1 via binding (zero subrequests)."""
    params = params or []
    d1 = settings.get("d1")
    if d1 is None:
        raise RuntimeError("D1 binding not available in settings")

    stmt = d1.prepare(sql)
    if params:
        stmt = stmt.bind(*params)

    result = await stmt.all()

    if not result.success:
        raise RuntimeError(f"D1 query failed: {result}")

    rows = result.results
    if rows is None or rows.length == 0:
        return []

    return rows.to_py()


async def get_goal(settings: dict, goal_id: int, user_id: str) -> dict:
    """Load a single goal by ID + user_id."""
    rows = await query_d1(
        settings,
        "SELECT * FROM goals WHERE id = ? AND user_id = ?",
        [goal_id, user_id],
    )
    if not rows:
        raise ValueError(f"Goal {goal_id} not found")
    row = rows[0]
    return {
        "id": row["id"],
        "family_member_id": row.get("family_member_id"),
        "title": row["title"],
        "description": row.get("description"),
    }


async def list_notes_for_entity(
    settings: dict, entity_id: int, entity_type: str, user_id: str
) -> list[dict]:
    """List notes attached to an entity."""
    rows = await query_d1(
        settings,
        (
            "SELECT * FROM notes "
            "WHERE entity_id = ? AND entity_type = ? AND user_id = ? "
            "ORDER BY created_at DESC"
        ),
        [entity_id, entity_type, user_id],
    )
    return [{"id": r["id"], "content": r["content"]} for r in rows]


async def get_family_member(settings: dict, fm_id: int) -> dict | None:
    """Load a family member by ID."""
    rows = await query_d1(
        settings, "SELECT * FROM family_members WHERE id = ?", [fm_id]
    )
    if not rows:
        return None
    r = rows[0]
    return {
        "id": r["id"],
        "first_name": r.get("first_name"),
        "name": r.get("name"),
        "age_years": r.get("age_years"),
    }


async def get_contact_feedback(
    settings: dict, feedback_id: int, user_id: str
) -> dict | None:
    """Load a contact feedback record with extracted issues."""
    rows = await query_d1(
        settings,
        "SELECT * FROM contact_feedbacks WHERE id = ? AND user_id = ?",
        [feedback_id, user_id],
    )
    if not rows:
        return None
    r = rows[0]
    extracted_issues = []
    raw = r.get("extracted_issues")
    if raw:
        try:
            extracted_issues = json.loads(raw) if isinstance(raw, str) else raw
        except (json.JSONDecodeError, TypeError):
            pass
    return {
        "id": r["id"],
        "content": r.get("content", ""),
        "subject": r.get("subject"),
        "source": r.get("source"),
        "feedback_date": r.get("feedback_date"),
        "extracted": bool(r.get("extracted", 0)),
        "extracted_issues": extracted_issues,
    }


async def get_all_contact_feedbacks_for_family_member(
    settings: dict, family_member_id: int, user_id: str
) -> list[dict]:
    """Load all feedback records for a family member."""
    rows = await query_d1(
        settings,
        (
            "SELECT * FROM contact_feedbacks "
            "WHERE family_member_id = ? AND user_id = ? "
            "ORDER BY feedback_date DESC"
        ),
        [family_member_id, user_id],
    )
    results = []
    for r in rows:
        extracted_issues = []
        raw = r.get("extracted_issues")
        if raw:
            try:
                extracted_issues = json.loads(raw) if isinstance(raw, str) else raw
            except (json.JSONDecodeError, TypeError):
                pass
        results.append({
            "id": r["id"],
            "content": r.get("content", ""),
            "subject": r.get("subject"),
            "extracted_issues": extracted_issues,
        })
    return results


async def update_generation_job(
    settings: dict,
    job_id: str,
    *,
    status: str | None = None,
    progress: int | None = None,
    result: str | None = None,
    error: str | None = None,
) -> None:
    """Update a generation_jobs row."""
    fields: list[str] = []
    args: list[Any] = []

    if status is not None:
        fields.append("status = ?")
        args.append(status)
    if progress is not None:
        fields.append("progress = ?")
        args.append(progress)
    if result is not None:
        fields.append("result = ?")
        args.append(result)
    if error is not None:
        fields.append("error = ?")
        args.append(error)

    fields.append("updated_at = datetime('now')")
    args.append(job_id)

    await query_d1(
        settings,
        f"UPDATE generation_jobs SET {', '.join(fields)} WHERE id = ?",
        args,
    )


def _sanitize_number(value: Any, default: float = 0) -> float | None:
    if value is None:
        return None
    try:
        v = float(value)
        if not (v == v) or v == float("inf") or v == float("-inf"):
            return default
        return v
    except (TypeError, ValueError):
        return default


async def upsert_therapy_research(
    settings: dict,
    goal_id: int | None,
    user_id: str,
    research: dict,
) -> int:
    """Upsert a therapy_research row (match on DOI or title)."""
    existing_id: int | None = None

    doi = research.get("doi")
    if goal_id is not None:
        if doi:
            rows = await query_d1(
                settings,
                "SELECT id FROM therapy_research WHERE goal_id = ? AND doi = ?",
                [goal_id, doi],
            )
            if rows:
                existing_id = rows[0]["id"]

        if existing_id is None:
            rows = await query_d1(
                settings,
                "SELECT id FROM therapy_research WHERE goal_id = ? AND title = ?",
                [goal_id, research["title"]],
            )
            if rows:
                existing_id = rows[0]["id"]
    else:
        # No goal_id — deduplicate by feedback_id if available, else globally
        feedback_id = research.get("feedbackId")
        if feedback_id is not None:
            if doi:
                rows = await query_d1(
                    settings,
                    "SELECT id FROM therapy_research WHERE feedback_id = ? AND doi = ?",
                    [feedback_id, doi],
                )
                if rows:
                    existing_id = rows[0]["id"]

            if existing_id is None:
                rows = await query_d1(
                    settings,
                    "SELECT id FROM therapy_research WHERE feedback_id = ? AND title = ?",
                    [feedback_id, research["title"]],
                )
                if rows:
                    existing_id = rows[0]["id"]
        else:
            if doi:
                rows = await query_d1(
                    settings,
                    "SELECT id FROM therapy_research WHERE goal_id IS NULL AND doi = ?",
                    [doi],
                )
                if rows:
                    existing_id = rows[0]["id"]

            if existing_id is None:
                rows = await query_d1(
                    settings,
                    "SELECT id FROM therapy_research WHERE goal_id IS NULL AND title = ?",
                    [research["title"]],
                )
                if rows:
                    existing_id = rows[0]["id"]

    authors_json = json.dumps(
        [a for a in (research.get("authors") or []) if isinstance(a, str)]
    )
    key_findings_json = json.dumps(
        [k for k in (research.get("keyFindings") or []) if isinstance(k, str)]
    )
    techniques_json = json.dumps(
        [
            t
            for t in (research.get("therapeuticTechniques") or [])
            if isinstance(t, str)
        ]
    )

    relevance = _sanitize_number(research.get("relevanceScore"), 0)
    confidence = _sanitize_number(research.get("extractionConfidence"), 0)

    if existing_id is not None:
        await query_d1(
            settings,
            (
                "UPDATE therapy_research SET "
                "feedback_id = ?, characteristic_id = ?, "
                "therapeutic_goal_type = ?, authors = ?, year = ?, journal = ?, "
                "doi = ?, url = ?, abstract = ?, key_findings = ?, "
                "therapeutic_techniques = ?, evidence_level = ?, "
                "relevance_score = ?, extracted_by = ?, extraction_confidence = ?, "
                "updated_at = datetime('now') WHERE id = ?"
            ),
            [
                research.get("feedbackId"),
                research.get("characteristicId"),
                research.get("therapeuticGoalType", ""),
                authors_json,
                research.get("year"),
                research.get("journal"),
                doi,
                research.get("url"),
                research.get("abstract"),
                key_findings_json,
                techniques_json,
                research.get("evidenceLevel"),
                relevance,
                research.get("extractedBy", ""),
                confidence,
                existing_id,
            ],
        )
        return existing_id
    else:
        rows = await query_d1(
            settings,
            (
                "INSERT INTO therapy_research ("
                "goal_id, feedback_id, characteristic_id, therapeutic_goal_type, title, authors, "
                "year, journal, doi, url, abstract, key_findings, "
                "therapeutic_techniques, evidence_level, relevance_score, "
                "extracted_by, extraction_confidence"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                "RETURNING id"
            ),
            [
                goal_id,
                research.get("feedbackId"),
                research.get("characteristicId"),
                research.get("therapeuticGoalType", ""),
                research["title"],
                authors_json,
                research.get("year"),
                research.get("journal"),
                doi,
                research.get("url"),
                research.get("abstract"),
                key_findings_json,
                techniques_json,
                research.get("evidenceLevel"),
                relevance,
                research.get("extractedBy", ""),
                confidence,
            ],
        )
        if not rows:
            raise RuntimeError("Failed to insert therapy research: no ID returned")
        return int(rows[0]["id"])


async def batch_upsert_therapy_research(
    settings: dict,
    goal_id: int | None,
    user_id: str,
    papers: list[dict],
) -> int:
    """Batch upsert therapy_research rows using D1 .batch() to minimize subrequests.

    1. Single SELECT to load existing records for this goal_id (1 subrequest)
    2. Build INSERT/UPDATE statements for all papers
    3. Execute via D1 .batch() (1 subrequest)

    Returns count of successfully persisted papers.
    """
    if not papers:
        return 0

    d1 = settings.get("d1")
    if d1 is None:
        raise RuntimeError("D1 binding not available in settings")

    # Step 1: Load existing records in one query
    # Extract feedback_id from the first paper (all papers in a batch share it)
    feedback_id = papers[0].get("feedbackId") if papers else None

    if goal_id is not None:
        existing = await query_d1(
            settings,
            "SELECT id, doi, title FROM therapy_research WHERE goal_id = ?",
            [goal_id],
        )
    elif feedback_id is not None:
        existing = await query_d1(
            settings,
            "SELECT id, doi, title FROM therapy_research WHERE feedback_id = ?",
            [feedback_id],
        )
    else:
        existing = await query_d1(
            settings,
            "SELECT id, doi, title FROM therapy_research WHERE goal_id IS NULL",
        )

    doi_map: dict[str, int] = {}
    title_map: dict[str, int] = {}
    for r in existing:
        if r.get("doi"):
            doi_map[r["doi"]] = r["id"]
        if r.get("title"):
            title_map[r["title"]] = r["id"]

    # Step 2: Build batched statements
    stmts = []
    for research in papers:
        doi = research.get("doi")
        authors_json = json.dumps(
            [a for a in (research.get("authors") or []) if isinstance(a, str)]
        )
        key_findings_json = json.dumps(
            [k for k in (research.get("keyFindings") or []) if isinstance(k, str)]
        )
        techniques_json = json.dumps(
            [
                t
                for t in (research.get("therapeuticTechniques") or [])
                if isinstance(t, str)
            ]
        )
        relevance = _sanitize_number(research.get("relevanceScore"), 0)
        confidence = _sanitize_number(research.get("extractionConfidence"), 0)

        existing_id = None
        if doi and doi in doi_map:
            existing_id = doi_map[doi]
        elif research.get("title") and research["title"] in title_map:
            existing_id = title_map[research["title"]]

        if existing_id is not None:
            stmts.append(
                d1.prepare(
                    "UPDATE therapy_research SET "
                    "feedback_id = ?, characteristic_id = ?, "
                    "therapeutic_goal_type = ?, authors = ?, year = ?, journal = ?, "
                    "doi = ?, url = ?, abstract = ?, key_findings = ?, "
                    "therapeutic_techniques = ?, evidence_level = ?, "
                    "relevance_score = ?, extracted_by = ?, extraction_confidence = ?, "
                    "updated_at = datetime('now') WHERE id = ?"
                ).bind(
                    research.get("feedbackId"),
                    research.get("characteristicId"),
                    research.get("therapeuticGoalType", ""),
                    authors_json,
                    research.get("year"),
                    research.get("journal"),
                    doi,
                    research.get("url"),
                    research.get("abstract"),
                    key_findings_json,
                    techniques_json,
                    research.get("evidenceLevel"),
                    relevance,
                    research.get("extractedBy", ""),
                    confidence,
                    existing_id,
                )
            )
        else:
            stmts.append(
                d1.prepare(
                    "INSERT INTO therapy_research ("
                    "goal_id, feedback_id, characteristic_id, therapeutic_goal_type, title, authors, "
                    "year, journal, doi, url, abstract, key_findings, "
                    "therapeutic_techniques, evidence_level, relevance_score, "
                    "extracted_by, extraction_confidence"
                    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                ).bind(
                    goal_id,
                    research.get("feedbackId"),
                    research.get("characteristicId"),
                    research.get("therapeuticGoalType", ""),
                    research["title"],
                    authors_json,
                    research.get("year"),
                    research.get("journal"),
                    doi,
                    research.get("url"),
                    research.get("abstract"),
                    key_findings_json,
                    techniques_json,
                    research.get("evidenceLevel"),
                    relevance,
                    research.get("extractedBy", ""),
                    confidence,
                )
            )

    if not stmts:
        return 0

    # Step 3: Execute batch (single subrequest)
    results = await d1.batch(stmts)
    count = 0
    for r in results:
        if r.success:
            count += 1
    return count
