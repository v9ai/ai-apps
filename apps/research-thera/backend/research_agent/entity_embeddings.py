"""Embedding-based retrieval over the entity_embeddings table.

Provides:
- entity_to_text(entity_type, row_dict): build the canonical text we embed
- upsert_embedding: idempotent INSERT...ON CONFLICT
- search_for_family_member: cosine-distance top-K filtered by family_member_id
- search_global_research: cosine-distance top-K over therapy_research papers
- rerank_passages: thin cross-encoder wrapper for arbitrary text passages
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Optional

import psycopg


def _parse_json_list(v: Any) -> list:
    if not v:
        return []
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        try:
            parsed = json.loads(v)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def entity_to_text(entity_type: str, row: dict) -> str:
    """Build canonical embedding text for a given entity type.

    Each branch produces a focused, dense string (no SQL truncation here —
    truncation happens at display time).
    """
    if entity_type == "issue":
        parts = [f"Issue: {row.get('title', '')}"]
        if row.get("severity"):
            parts.append(f"Severity: {row['severity']}")
        if row.get("category"):
            parts.append(f"Category: {row['category']}")
        if row.get("description"):
            parts.append(f"Description: {row['description']}")
        return "\n".join(parts)

    if entity_type == "journal_entry":
        parts = []
        if row.get("title"):
            parts.append(f"Journal: {row['title']}")
        if row.get("entry_date"):
            parts.append(f"Date: {row['entry_date']}")
        if row.get("mood"):
            parts.append(f"Mood: {row['mood']}")
        tags = _parse_json_list(row.get("tags"))
        if tags:
            parts.append(f"Tags: {', '.join(tags)}")
        if row.get("content"):
            parts.append(f"Content: {row['content']}")
        return "\n".join(parts)

    if entity_type == "contact_feedback":
        parts = []
        if row.get("subject"):
            parts.append(f"Feedback subject: {row['subject']}")
        if row.get("feedback_date"):
            parts.append(f"Date: {row['feedback_date']}")
        if row.get("source"):
            parts.append(f"Source: {row['source']}")
        if row.get("content"):
            parts.append(f"Content: {row['content']}")
        return "\n".join(parts)

    if entity_type == "teacher_feedback":
        parts = []
        if row.get("teacher_name"):
            parts.append(f"Teacher: {row['teacher_name']}")
        if row.get("feedback_date"):
            parts.append(f"Date: {row['feedback_date']}")
        if row.get("content"):
            parts.append(f"Content: {row['content']}")
        return "\n".join(parts)

    if entity_type == "behavior_observation":
        parts = []
        if row.get("observation_type"):
            parts.append(f"Behavior observation: {row['observation_type']}")
        if row.get("observed_at"):
            parts.append(f"Observed: {row['observed_at']}")
        if row.get("intensity"):
            parts.append(f"Intensity: {row['intensity']}")
        if row.get("context"):
            parts.append(f"Context: {row['context']}")
        return "\n".join(parts)

    if entity_type == "deep_issue_analysis":
        parts = ["Deep analysis"]
        if row.get("summary"):
            parts.append(f"Summary: {row['summary']}")
        if row.get("trigger_issue_id"):
            parts.append(f"TriggerIssueID: {row['trigger_issue_id']}")
        return "\n".join(parts)

    if entity_type == "family_member_characteristic":
        parts = []
        if row.get("title"):
            parts.append(f"Characteristic: {row['title']}")
        if row.get("category"):
            parts.append(f"Category: {row['category']}")
        if row.get("severity"):
            parts.append(f"Severity: {row['severity']}")
        if row.get("description"):
            parts.append(f"Description: {row['description']}")
        return "\n".join(parts)

    if entity_type == "goal":
        parts = [f"Goal: {row.get('title', '')}"]
        if row.get("status"):
            parts.append(f"Status: {row['status']}")
        if row.get("priority"):
            parts.append(f"Priority: {row['priority']}")
        if row.get("description"):
            parts.append(f"Description: {row['description']}")
        tags = _parse_json_list(row.get("tags"))
        if tags:
            parts.append(f"Tags: {', '.join(tags)}")
        return "\n".join(parts)

    if entity_type == "therapy_research":
        parts = [f"Title: {row.get('title', '')}"]
        if row.get("year"):
            parts.append(f"Year: {row['year']}")
        if row.get("evidence_level"):
            parts.append(f"Evidence: {row['evidence_level']}")
        if row.get("abstract"):
            parts.append(f"Abstract: {row['abstract'][:1000]}")
        kf = _parse_json_list(row.get("key_findings"))
        if kf:
            parts.append(f"Key findings: {'; '.join(kf)}")
        tt = _parse_json_list(row.get("therapeutic_techniques"))
        if tt:
            parts.append(f"Techniques: {'; '.join(tt)}")
        return "\n".join(parts)

    return f"{entity_type}: {row.get('title') or row.get('id')}"


async def upsert_embedding(
    conn: psycopg.AsyncConnection,
    entity_type: str,
    entity_id: int,
    family_member_id: Optional[int],
    text: str,
    vector: list[float],
    model: str = "all-MiniLM-L6-v2",
) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO entity_embeddings "
            "(entity_type, entity_id, family_member_id, text, embedding, model, created_at, updated_at) "
            "VALUES (%s, %s, %s, %s, %s::vector, %s, NOW(), NOW()) "
            "ON CONFLICT (entity_type, entity_id) DO UPDATE SET "
            "family_member_id = EXCLUDED.family_member_id, "
            "text = EXCLUDED.text, "
            "embedding = EXCLUDED.embedding, "
            "model = EXCLUDED.model, "
            "updated_at = NOW()",
            (entity_type, entity_id, family_member_id, text, str(vector), model),
        )


async def search_for_family_member(
    conn: psycopg.AsyncConnection,
    family_member_id: int,
    query_vec: list[float],
    top_k: int = 30,
    entity_types: Optional[list[str]] = None,
) -> list[dict]:
    """Cosine-distance search over entity_embeddings filtered by family_member_id."""
    qv = str(query_vec)
    if entity_types:
        placeholders = ",".join(["%s"] * len(entity_types))
        sql = (
            f"SELECT entity_type, entity_id, text, "
            f"1 - (embedding <=> %s::vector) AS similarity "
            f"FROM entity_embeddings "
            f"WHERE family_member_id = %s AND entity_type IN ({placeholders}) "
            f"ORDER BY embedding <=> %s::vector LIMIT %s"
        )
        params = [qv, family_member_id, *entity_types, qv, top_k]
    else:
        sql = (
            "SELECT entity_type, entity_id, text, "
            "1 - (embedding <=> %s::vector) AS similarity "
            "FROM entity_embeddings "
            "WHERE family_member_id = %s "
            "ORDER BY embedding <=> %s::vector LIMIT %s"
        )
        params = [qv, family_member_id, qv, top_k]
    async with conn.cursor() as cur:
        await cur.execute(sql, params)
        rows = await cur.fetchall()
    return [
        {"entity_type": r[0], "entity_id": r[1], "text": r[2], "similarity": float(r[3])}
        for r in rows
    ]


async def search_global_research(
    conn: psycopg.AsyncConnection,
    query_vec: list[float],
    top_k: int = 20,
    restrict_ids: Optional[list[int]] = None,
) -> list[dict]:
    """Cosine-distance search over therapy_research embeddings.

    Optional restrict_ids: limit to a specific set of therapy_research.id values
    (used to scope to papers linked via Bogdan's goals/issues/journal_entries).
    """
    qv = str(query_vec)
    if restrict_ids:
        placeholders = ",".join(["%s"] * len(restrict_ids))
        sql = (
            f"SELECT entity_id, text, "
            f"1 - (embedding <=> %s::vector) AS similarity "
            f"FROM entity_embeddings "
            f"WHERE entity_type = 'therapy_research' AND entity_id IN ({placeholders}) "
            f"ORDER BY embedding <=> %s::vector LIMIT %s"
        )
        params = [qv, *restrict_ids, qv, top_k]
    else:
        sql = (
            "SELECT entity_id, text, "
            "1 - (embedding <=> %s::vector) AS similarity "
            "FROM entity_embeddings "
            "WHERE entity_type = 'therapy_research' "
            "ORDER BY embedding <=> %s::vector LIMIT %s"
        )
        params = [qv, qv, top_k]
    async with conn.cursor() as cur:
        await cur.execute(sql, params)
        rows = await cur.fetchall()
    return [
        {"entity_type": "therapy_research", "entity_id": r[0], "text": r[1], "similarity": float(r[2])}
        for r in rows
    ]


_cross_encoder = None


def _get_cross_encoder():
    global _cross_encoder
    if _cross_encoder is None:
        from sentence_transformers import CrossEncoder
        _cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _cross_encoder


def _rerank_sync(query: str, candidates: list[dict], top_k: int) -> list[dict]:
    if not candidates:
        return []
    model = _get_cross_encoder()
    pairs = [(query, c["text"]) for c in candidates]
    scores = model.predict(pairs)
    enriched = [{**c, "rerank_score": float(s)} for c, s in zip(candidates, scores)]
    enriched.sort(key=lambda x: x["rerank_score"], reverse=True)
    return enriched[:top_k]


async def rerank_passages(query: str, candidates: list[dict], top_k: int = 15) -> list[dict]:
    """Cross-encoder rerank — input dicts must have a `text` field; preserves all other keys."""
    return await asyncio.to_thread(_rerank_sync, query, candidates, top_k)
