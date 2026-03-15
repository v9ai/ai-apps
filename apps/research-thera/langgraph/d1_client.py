"""
Python port of src/db/d1.ts + the 9 query functions used by the story graph.
"""

import json
import os
from pathlib import Path
from typing import Any, Optional

import httpx
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID = os.environ["CLOUDFLARE_DATABASE_ID"]
D1_TOKEN = os.environ["CLOUDFLARE_D1_TOKEN"]
BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}"


def execute(sql: str, params: list[Any] | None = None) -> list[dict]:
    """POST to D1 /query, return result[0]['results']."""
    body: list[dict] | dict
    if params is None:
        params = []
    body = {"sql": sql, "params": params}
    with httpx.Client(timeout=30) as client:
        resp = client.post(
            f"{BASE_URL}/query",
            headers={
                "Authorization": f"Bearer {D1_TOKEN}",
                "Content-Type": "application/json",
            },
            json=body,
        )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"D1 query failed: {data.get('errors')}")
    result = data.get("result", [{}])[0]
    return result.get("results", [])


# ---------------------------------------------------------------------------
# Row mappers
# ---------------------------------------------------------------------------


def _parse_json_field(value: Any) -> Any:
    if isinstance(value, str):
        return json.loads(value)
    return value


def _map_goal(row: dict) -> dict:
    return {
        "id": row["id"],
        "family_member_id": row.get("family_member_id"),
        "user_id": row.get("user_id"),
        "slug": row.get("slug"),
        "title": row["title"],
        "description": row.get("description"),
        "status": row.get("status"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _map_family_member(row: dict) -> dict:
    return {
        "id": row["id"],
        "user_id": row.get("user_id"),
        "first_name": row.get("first_name"),
        "name": row.get("name"),
        "age_years": row.get("age_years"),
        "relationship": row.get("relationship"),
        "date_of_birth": row.get("date_of_birth"),
        "bio": row.get("bio"),
        "email": row.get("email"),
        "phone": row.get("phone"),
        "location": row.get("location"),
        "occupation": row.get("occupation"),
    }


def _map_issue(row: dict) -> dict:
    rec = row.get("recommendations")
    return {
        "id": row["id"],
        "feedback_id": row.get("feedback_id"),
        "family_member_id": row.get("family_member_id"),
        "user_id": row.get("user_id"),
        "title": row["title"],
        "description": row.get("description"),
        "category": row.get("category"),
        "severity": row.get("severity"),
        "recommendations": _parse_json_field(rec) if rec is not None else None,
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _map_contact_feedback(row: dict) -> dict:
    tags = row.get("tags")
    extracted_issues = row.get("extracted_issues")
    return {
        "id": row["id"],
        "contact_id": row.get("contact_id"),
        "family_member_id": row.get("family_member_id"),
        "user_id": row.get("user_id"),
        "subject": row.get("subject"),
        "feedback_date": row.get("feedback_date"),
        "content": row.get("content"),
        "tags": _parse_json_field(tags) if tags is not None else None,
        "source": row.get("source"),
        "extracted": int(row.get("extracted", 0)) == 1,
        "extracted_issues": _parse_json_field(extracted_issues) if extracted_issues is not None else None,
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _map_unique_outcome(row: dict) -> dict:
    return {
        "id": row["id"],
        "issue_id": row.get("issue_id"),
        "user_id": row.get("user_id"),
        "observed_at": row.get("observed_at"),
        "description": row.get("description"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _map_research(row: dict) -> dict:
    return {
        "id": row["id"],
        "goal_id": row.get("goal_id"),
        "issue_id": row.get("issue_id"),
        "feedback_id": row.get("feedback_id"),
        "title": row["title"],
        "authors": _parse_json_field(row.get("authors", "[]")),
        "year": row.get("year"),
        "journal": row.get("journal"),
        "doi": row.get("doi"),
        "url": row.get("url"),
        "abstract": row.get("abstract"),
        "key_findings": _parse_json_field(row.get("key_findings", "[]")),
        "therapeutic_techniques": _parse_json_field(row.get("therapeutic_techniques", "[]")),
        "evidence_level": row.get("evidence_level"),
        "relevance_score": row.get("relevance_score"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _map_note(row: dict) -> dict:
    tags = row.get("tags")
    return {
        "id": row["id"],
        "entity_id": row.get("entity_id"),
        "entity_type": row.get("entity_type"),
        "user_id": row.get("user_id"),
        "note_type": row.get("note_type"),
        "slug": row.get("slug"),
        "title": row.get("title"),
        "content": row.get("content", ""),
        "tags": _parse_json_field(tags) if tags is not None else [],
        "visibility": row.get("visibility", "PRIVATE"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


# ---------------------------------------------------------------------------
# 9 query functions
# ---------------------------------------------------------------------------


def get_goal(goal_id: int, user_email: str) -> dict:
    rows = execute("SELECT * FROM goals WHERE id = ? AND user_id = ?", [goal_id, user_email])
    if not rows:
        raise RuntimeError(f"Goal {goal_id} not found")
    return _map_goal(rows[0])


def get_family_member(id: int) -> Optional[dict]:
    rows = execute("SELECT * FROM family_members WHERE id = ?", [id])
    if not rows:
        return None
    return _map_family_member(rows[0])


def get_issue(id: int, user_id: str) -> Optional[dict]:
    rows = execute("SELECT * FROM issues WHERE id = ? AND user_id = ?", [id, user_id])
    if not rows:
        return None
    return _map_issue(rows[0])


def get_contact_feedback(id: int, user_id: str) -> Optional[dict]:
    rows = execute(
        "SELECT * FROM contact_feedbacks WHERE id = ? AND user_id = ?", [id, user_id]
    )
    if not rows:
        return None
    return _map_contact_feedback(rows[0])


def get_issues_for_family_member(
    family_member_id: int,
    feedback_id: Optional[int] = None,
    user_id: Optional[str] = None,
) -> list[dict]:
    sql = "SELECT * FROM issues WHERE family_member_id = ?"
    args: list[Any] = [family_member_id]
    if feedback_id is not None:
        sql += " AND feedback_id = ?"
        args.append(feedback_id)
    if user_id is not None:
        sql += " AND user_id = ?"
        args.append(user_id)
    sql += " ORDER BY created_at DESC"
    rows = execute(sql, args)
    return [_map_issue(r) for r in rows]


def get_unique_outcomes_for_issue(issue_id: int, user_id: str) -> list[dict]:
    rows = execute(
        "SELECT * FROM unique_outcomes WHERE issue_id = ? AND user_id = ? ORDER BY observed_at DESC",
        [issue_id, user_id],
    )
    return [_map_unique_outcome(r) for r in rows]


def list_therapy_research(
    goal_id: Optional[int] = None,
    issue_id: Optional[int] = None,
    feedback_id: Optional[int] = None,
) -> list[dict]:
    if feedback_id is not None:
        sql = "SELECT * FROM therapy_research WHERE feedback_id = ?"
        args: list[Any] = [feedback_id]
    elif issue_id is not None and goal_id is not None:
        sql = "SELECT * FROM therapy_research WHERE (issue_id = ? OR goal_id = ?)"
        args = [issue_id, goal_id]
    elif issue_id is not None:
        sql = "SELECT * FROM therapy_research WHERE issue_id = ?"
        args = [issue_id]
    elif goal_id is not None:
        sql = "SELECT * FROM therapy_research WHERE goal_id = ?"
        args = [goal_id]
    else:
        return []
    sql += " ORDER BY relevance_score DESC, created_at DESC"
    rows = execute(sql, args)
    return [_map_research(r) for r in rows]


def list_notes_for_entity(entity_id: int, entity_type: str, user_id: str) -> list[dict]:
    rows = execute(
        "SELECT * FROM notes WHERE entity_id = ? AND entity_type = ? AND user_id = ? ORDER BY created_at DESC",
        [entity_id, entity_type, user_id],
    )
    return [_map_note(r) for r in rows]


def create_goal_story(
    goal_id: Optional[int],
    issue_id: Optional[int],
    feedback_id: Optional[int],
    language: str,
    minutes: int,
    text: str,
) -> dict:
    if goal_id is None and issue_id is None and feedback_id is None:
        raise ValueError("At least one of goal_id, issue_id, or feedback_id is required")
    rows = execute(
        "INSERT INTO goal_stories (goal_id, issue_id, feedback_id, language, minutes, text) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
        [goal_id, issue_id, feedback_id, language, minutes, text],
    )
    return rows[0]
