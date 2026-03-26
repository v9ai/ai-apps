"""Node functions for the job_matcher LangGraph StateGraph."""

from __future__ import annotations

import json
import re

from langchain_core.messages import HumanMessage, SystemMessage

from src.config import get_llm
from src.db.connection import get_connection
from src.db.queries import (
    fetch_candidate_jobs_by_skills,
    fetch_jobs_by_ids,
    fetch_skill_tags_for_jobs,
)

from .prompts import ROLE_SCORE_THRESHOLD, build_scoring_messages
from .state import JobMatcherState


# ---------------------------------------------------------------------------
# Node 1 — Fetch candidate jobs matching user skills
# ---------------------------------------------------------------------------


def fetch_candidates_node(state: JobMatcherState) -> dict:
    """Query DB for jobs whose skill tags overlap with user_skills."""
    conn = get_connection()
    try:
        rows = fetch_candidate_jobs_by_skills(conn, state["user_skills"])
    finally:
        conn.close()
    return {"candidates": rows}


# ---------------------------------------------------------------------------
# Node 2 — Score job titles via DeepSeek LLM
# ---------------------------------------------------------------------------


def score_titles_llm_node(state: JobMatcherState) -> dict:
    """Send unique titles to DeepSeek and parse role-relevance scores."""
    titles = list({c["title"] for c in state["candidates"] if c.get("title")})
    if not titles:
        return {"role_scores": {}}

    llm = get_llm()
    msgs = build_scoring_messages(titles)
    messages = [
        SystemMessage(content=msgs[0]["content"]),
        HumanMessage(content=msgs[1]["content"]),
    ]
    response = llm.invoke(messages)

    # Parse JSON — handle possible markdown code-block wrapping
    text = response.content.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        scores: dict = json.loads(text)
    except json.JSONDecodeError:
        scores = {}

    return {"role_scores": scores}


# ---------------------------------------------------------------------------
# Node 3 — Compute composite score (role * 0.6 + skill_overlap * 0.4)
# ---------------------------------------------------------------------------


def compute_composite_node(state: JobMatcherState) -> dict:
    """Blend role scores with skill-overlap ratios, sort descending."""
    role_scores = state["role_scores"]
    user_skills = set(state["user_skills"])

    # Filter candidates that pass the role-score threshold
    passing = [
        c
        for c in state["candidates"]
        if role_scores.get(c.get("title", ""), 0.0) >= ROLE_SCORE_THRESHOLD
    ]
    if not passing:
        return {"ranked": []}

    job_ids = [c["job_id"] for c in passing]

    conn = get_connection()
    try:
        tag_rows = fetch_skill_tags_for_jobs(conn, job_ids)
    finally:
        conn.close()

    # Build job_id -> set of tags
    tags_by_job: dict[int, set[str]] = {}
    for row in tag_rows:
        tags_by_job.setdefault(row["job_id"], set()).add(row["tag"])

    ranked: list[dict] = []
    for c in passing:
        jid = c["job_id"]
        title = c.get("title", "")
        r_score = role_scores.get(title, 0.0)
        job_tags = tags_by_job.get(jid, set())
        overlap = len(job_tags & user_skills) / max(len(user_skills), 1)
        composite = r_score * 0.6 + overlap * 0.4
        ranked.append(
            {
                "job_id": jid,
                "title": title,
                "role_score": r_score,
                "skill_overlap": round(overlap, 4),
                "composite": round(composite, 4),
            }
        )

    ranked.sort(key=lambda r: r["composite"], reverse=True)
    return {"ranked": ranked}


# ---------------------------------------------------------------------------
# Node 4 — Fetch full job rows and build final results
# ---------------------------------------------------------------------------


def rank_and_return_node(state: JobMatcherState) -> dict:
    """Hydrate ranked entries with full job data from the database."""
    ranked = state["ranked"]
    if not ranked:
        return {"ranked": []}

    job_ids = [r["job_id"] for r in ranked]

    conn = get_connection()
    try:
        job_rows = fetch_jobs_by_ids(conn, job_ids)
    finally:
        conn.close()

    jobs_by_id = {j["id"]: j for j in job_rows}

    result: list[dict] = []
    for entry in ranked:
        job = jobs_by_id.get(entry["job_id"])
        if not job:
            continue
        result.append(
            {
                "job_id": entry["job_id"],
                "title": job.get("title", ""),
                "url": job.get("url"),
                "location": job.get("location"),
                "posted_at": str(job.get("posted_at", "")),
                "company_key": job.get("company_key"),
                "role_score": entry["role_score"],
                "skill_overlap": entry["skill_overlap"],
                "composite": entry["composite"],
            }
        )

    return {"ranked": result}
