"""LangGraph story generation graph — reads from Neon, generates therapeutic audio script."""
from __future__ import annotations

import json
import os
from typing import Annotated, Optional, TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END

import psycopg

from .therapy_context import IssueData, StoryContext, THERAPEUTIC_AUDIO_SYSTEM_PROMPT
from .embeddings import aembed_text, query_to_embedding_text

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class StoryState(TypedDict, total=False):
    feedback_id: int
    language: str
    minutes: int
    story_text: str
    story_id: int
    error: str
    _prompt: str
    _family_member_id: int


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def load_context(state: StoryState) -> dict:
    """Load feedback, issues, family member, and research papers from Neon."""
    feedback_id = state["feedback_id"]
    conn_str = _conn_str()

    try:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                # Feedback
                await cur.execute(
                    "SELECT id, contact_id, family_member_id, subject, content, tags "
                    "FROM contact_feedbacks WHERE id = %s",
                    (feedback_id,),
                )
                fb_row = await cur.fetchone()
                if not fb_row:
                    return {"error": f"Feedback {feedback_id} not found"}

                fb_id, _, family_member_id, subject, content, tags = fb_row

                # Issues
                await cur.execute(
                    "SELECT title, description, category, severity, recommendations "
                    "FROM issues WHERE feedback_id = %s ORDER BY severity DESC",
                    (feedback_id,),
                )
                issue_rows = await cur.fetchall()
                issues = [
                    IssueData(
                        title=r[0], description=r[1], category=r[2], severity=r[3],
                        recommendations=json.loads(r[4] or "[]") if r[4] else [],
                    )
                    for r in issue_rows
                ]

                # Family member
                await cur.execute(
                    "SELECT first_name, age_years FROM family_members WHERE id = %s",
                    (family_member_id,),
                )
                fm_row = await cur.fetchone()
                person_name = fm_row[0] if fm_row else "the child"
                age_years = fm_row[1] if fm_row else None

                # Research papers — pgvector similarity search across ALL papers
                query_text = query_to_embedding_text(
                    feedback_subject=subject,
                    feedback_content=content,
                    issues=[{"title": i.title, "description": i.description, "category": i.category, "severity": i.severity} for i in issues],
                )
                query_embedding = await aembed_text(query_text)
                await cur.execute(
                    "SELECT title, year, key_findings, therapeutic_techniques, "
                    "1 - (embedding <=> %s::vector) AS similarity "
                    "FROM therapy_research "
                    "WHERE embedding IS NOT NULL "
                    "ORDER BY embedding <=> %s::vector "
                    "LIMIT 10",
                    (str(query_embedding), str(query_embedding)),
                )
                paper_rows = await cur.fetchall()
    except Exception as exc:
        return {"error": f"load_context failed: {exc}"}

    # Build research summary from pgvector similarity results
    summary_parts = []
    for i, row in enumerate(paper_rows):
        title_r, year, kf, tt, similarity = row
        findings = json.loads(kf or "[]") if kf else []
        techniques = json.loads(tt or "[]") if tt else []
        year_str = str(year) if year else "n.d."
        sim_pct = f"{similarity * 100:.0f}%" if similarity else ""
        summary_parts.append(
            f'{i + 1}. "{title_r}" ({year_str}) [relevance: {sim_pct}]\n'
            f"   Key findings: {'; '.join(findings)}\n"
            f"   Therapeutic techniques: {'; '.join(techniques)}"
        )

    story_ctx = StoryContext(
        person_name=person_name,
        age_years=age_years,
        feedback_subject=subject,
        feedback_content=content,
        issues=issues,
        research_summary="\n\n".join(summary_parts),
        language=state.get("language", "Romanian"),
        minutes=state.get("minutes", 30),
    )

    return {"_prompt": story_ctx.build_story_prompt(), "_family_member_id": family_member_id}


async def generate_story(state: dict) -> dict:
    """Call DeepSeek to generate the therapeutic audio script."""
    if state.get("error"):
        return {}

    try:
        prompt = state.get("_prompt", "")
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")

        llm = ChatOpenAI(
            model="deepseek-chat",
            api_key=api_key,
            base_url="https://api.deepseek.com/v1",
            temperature=0.7,
            max_tokens=16384,
        )

        result = await llm.ainvoke([
            {"role": "system", "content": THERAPEUTIC_AUDIO_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ])

        story_text = result.content or ""
        if not story_text:
            return {"error": "DeepSeek returned empty story text"}

        return {"story_text": story_text}
    except Exception as exc:
        return {"error": f"generate_story failed: {exc}"}


async def save_story(state: dict) -> dict:
    """Persist the story to Neon goal_stories table."""
    if state.get("error") or not state.get("story_text"):
        return {}

    try:
        feedback_id = state["feedback_id"]
        language = state.get("language", "Romanian")
        minutes = state.get("minutes", 30)
        story_text = state["story_text"]
        conn_str = _conn_str()

        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO goal_stories (feedback_id, language, minutes, text, created_at, updated_at) "
                    "VALUES (%s, %s, %s, %s, NOW(), NOW()) RETURNING id",
                    (feedback_id, language, minutes, story_text),
                )
                row = await cur.fetchone()
                story_id = row[0] if row else 0

        return {"story_id": story_id}
    except Exception as exc:
        return {"error": f"save_story failed: {exc}"}


def create_story_graph():
    """Build the story generation LangGraph."""
    builder = StateGraph(StoryState)
    builder.add_node("load_context", load_context)
    builder.add_node("generate_story", generate_story)
    builder.add_node("save_story", save_story)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "generate_story")
    builder.add_edge("generate_story", "save_story")
    builder.add_edge("save_story", END)

    return builder.compile()


# Module-level graph instance for LangGraph server
graph = create_story_graph()
