"""LangGraph story generation graph — reads from Neon, generates therapeutic audio script."""
from __future__ import annotations

import json
import os
from typing import Annotated, Optional, TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field

import psycopg

from .therapy_context import IssueData, StoryContext, THERAPEUTIC_AUDIO_SYSTEM_PROMPT
from .embeddings import aembed_text, query_to_embedding_text

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class StoryState(TypedDict, total=False):
    feedback_id: Optional[int]
    issue_id: Optional[int]
    goal_id: Optional[int]
    language: str
    minutes: int
    story_text: str
    story_id: int
    evals: str
    error: str
    _prompt: str
    _family_member_id: int
    # Eval context — populated by load_context, consumed by eval_story
    _has_related_member: bool
    _related_person_name: Optional[str]
    _issue_title: Optional[str]
    _issue_category: Optional[str]


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def load_context(state: StoryState) -> dict:
    """Load context from feedback, issue, or goal — plus research papers from Neon."""
    feedback_id = state.get("feedback_id")
    issue_id = state.get("issue_id")
    goal_id = state.get("goal_id")
    conn_str = _conn_str()

    has_related_member = False
    related_person_name: Optional[str] = None
    issue_title: Optional[str] = None
    issue_category: Optional[str] = None

    try:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                if issue_id:
                    # Load directly from the issue — also fetch related_family_member_id
                    await cur.execute(
                        "SELECT title, description, category, severity, recommendations, family_member_id, related_family_member_id "
                        "FROM issues WHERE id = %s",
                        (issue_id,),
                    )
                    row = await cur.fetchone()
                    if not row:
                        return {"error": f"Issue {issue_id} not found"}
                    title, description, category, severity, recommendations_raw, family_member_id, related_family_member_id = row
                    issue_title = title
                    issue_category = category
                    issues = [IssueData(
                        title=title, description=description or "", category=category,
                        severity=severity,
                        recommendations=json.loads(recommendations_raw or "[]") if recommendations_raw else [],
                    )]
                    subject = title
                    content = description or ""

                    # Fetch related family member details if present
                    related_person_relationship: Optional[str] = None
                    if related_family_member_id:
                        await cur.execute(
                            "SELECT first_name, relationship FROM family_members WHERE id = %s",
                            (related_family_member_id,),
                        )
                        rel_row = await cur.fetchone()
                        if rel_row:
                            related_person_name = rel_row[0]
                            related_person_relationship = rel_row[1]
                            has_related_member = True

                    # Research papers for this issue
                    await cur.execute(
                        "SELECT title, year, key_findings, therapeutic_techniques "
                        "FROM therapy_research WHERE issue_id = %s "
                        "ORDER BY relevance_score DESC LIMIT 10",
                        (issue_id,),
                    )
                    paper_rows_direct = await cur.fetchall()

                elif feedback_id:
                    # Load from feedback + linked issues
                    await cur.execute(
                        "SELECT id, family_member_id, subject, content "
                        "FROM contact_feedbacks WHERE id = %s",
                        (feedback_id,),
                    )
                    fb_row = await cur.fetchone()
                    if not fb_row:
                        return {"error": f"Feedback {feedback_id} not found"}
                    _, family_member_id, subject, content = fb_row

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
                    paper_rows_direct = []
                    related_person_relationship = None

                elif goal_id:
                    await cur.execute(
                        "SELECT title, description, family_member_id FROM goals WHERE id = %s",
                        (goal_id,),
                    )
                    goal_row = await cur.fetchone()
                    if not goal_row:
                        return {"error": f"Goal {goal_id} not found"}
                    subject, content, family_member_id = goal_row
                    content = content or ""
                    issues = []
                    paper_rows_direct = []
                    related_person_relationship = None
                else:
                    return {"error": "No feedback_id, issue_id, or goal_id provided"}

                # Primary family member
                await cur.execute(
                    "SELECT first_name, age_years FROM family_members WHERE id = %s",
                    (family_member_id,),
                )
                fm_row = await cur.fetchone()
                person_name = fm_row[0] if fm_row else "the child"
                age_years = fm_row[1] if fm_row else None

                # Fall back to vector search if no direct papers
                if paper_rows_direct:
                    paper_rows = [(r[0], r[1], r[2], r[3], None) for r in paper_rows_direct]
                else:
                    query_text = query_to_embedding_text(
                        feedback_subject=subject,
                        feedback_content=content,
                        issues=[{"title": i.title, "description": i.description, "category": i.category, "severity": i.severity} for i in issues],
                    )
                    query_embedding = await aembed_text(query_text)
                    await cur.execute(
                        "SELECT title, year, key_findings, therapeutic_techniques, "
                        "1 - (embedding <=> %s::vector) AS similarity "
                        "FROM therapy_research WHERE embedding IS NOT NULL "
                        "ORDER BY embedding <=> %s::vector LIMIT 10",
                        (str(query_embedding), str(query_embedding)),
                    )
                    paper_rows = await cur.fetchall()

    except Exception as exc:
        return {"error": f"load_context failed: {exc}"}

    summary_parts = []
    for i, row in enumerate(paper_rows):
        title_r, year, kf, tt, similarity = row
        findings = json.loads(kf or "[]") if kf else []
        techniques = json.loads(tt or "[]") if tt else []
        year_str = str(year) if year else "n.d."
        sim_pct = f" [relevance: {similarity * 100:.0f}%]" if similarity else ""
        summary_parts.append(
            f'{i + 1}. "{title_r}" ({year_str}){sim_pct}\n'
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
        language=state.get("language", "English"),
        minutes=state.get("minutes", 10),
        related_person_name=related_person_name,
        related_person_relationship=related_person_relationship if has_related_member else None,
    )

    return {
        "_prompt": story_ctx.build_story_prompt(),
        "_family_member_id": family_member_id,
        "_has_related_member": has_related_member,
        "_related_person_name": related_person_name,
        "_issue_title": issue_title,
        "_issue_category": issue_category,
    }


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
    """Persist the story to Neon stories table."""
    if state.get("error") or not state.get("story_text"):
        return {}

    try:
        feedback_id = state.get("feedback_id")
        issue_id = state.get("issue_id")
        goal_id = state.get("goal_id")
        language = state.get("language", "English")
        minutes = state.get("minutes", 10)
        story_text = state["story_text"]
        conn_str = _conn_str()

        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                user_id = None
                if goal_id:
                    await cur.execute("SELECT user_id FROM goals WHERE id = %s", (goal_id,))
                    row = await cur.fetchone()
                    if row:
                        user_id = row[0]
                if user_id is None and issue_id:
                    await cur.execute("SELECT user_id FROM issues WHERE id = %s", (issue_id,))
                    row = await cur.fetchone()
                    if row:
                        user_id = row[0]
                if user_id is None and feedback_id:
                    await cur.execute("SELECT user_id FROM contact_feedbacks WHERE id = %s", (feedback_id,))
                    row = await cur.fetchone()
                    if row:
                        user_id = row[0]
                if user_id is None:
                    user_id = "system"

                await cur.execute(
                    "INSERT INTO stories (feedback_id, issue_id, goal_id, user_id, content, language, minutes, created_at, updated_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id",
                    (feedback_id, issue_id, goal_id, user_id, story_text, language, minutes),
                )
                row = await cur.fetchone()
                story_id = row[0] if row else 0

        return {"story_id": story_id}
    except Exception as exc:
        return {"error": f"save_story failed: {exc}"}


class _StoryEvalScores(BaseModel):
    clinical_accuracy: float = Field(ge=0, le=1, description="Correct use of evidence-based therapeutic techniques (0-1)")
    age_appropriateness: float = Field(ge=0, le=1, description="Vocabulary and framing suit the developmental stage (0-1)")
    issue_addressed: float = Field(ge=0, le=1, description="Script directly tackles the clinical issue or feedback topic (0-1)")
    family_dynamics_coverage: float = Field(ge=0, le=1, description="Script addresses the relational dynamic between the two people involved (0-1)")
    rationale: str = Field(description="2-3 sentence evaluation summary")


async def eval_story(state: dict) -> dict:
    """LLM-based quality evaluation of the generated story."""
    if state.get("error") or not state.get("story_text"):
        return {}

    try:
        story_text: str = state["story_text"]
        has_related_member: bool = state.get("_has_related_member", False)
        related_person_name: Optional[str] = state.get("_related_person_name")
        issue_title: Optional[str] = state.get("_issue_title")
        issue_category: Optional[str] = state.get("_issue_category")
        issue_id = state.get("issue_id")
        feedback_id = state.get("feedback_id")

        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        llm = ChatOpenAI(
            model="deepseek-chat",
            api_key=api_key,
            base_url="https://api.deepseek.com/v1",
            temperature=0,
        )
        structured_llm = llm.with_structured_output(_StoryEvalScores)

        context_lines = []
        if issue_title:
            context_lines.append(f"Issue: {issue_title}" + (f" ({issue_category})" if issue_category else ""))
        elif feedback_id:
            context_lines.append(f"Feedback ID: {feedback_id}")
        elif issue_id:
            context_lines.append(f"Issue ID: {issue_id}")
        else:
            context_lines.append("Goal-based story")

        if has_related_member and related_person_name:
            context_lines.append(
                f"A related family member ({related_person_name}) is involved — "
                f"the story should address the relational dynamic."
            )

        context_str = "\n".join(context_lines)
        story_excerpt = story_text[:1800]

        family_instruction = (
            f"- family_dynamics_coverage: how well the script addresses the relationship between "
            f"the primary person and {related_person_name or 'the related family member'} (0-1)"
            if has_related_member
            else "- family_dynamics_coverage: set to 0.5 — no related family member, not applicable"
        )

        eval_prompt = f"""You are evaluating a therapeutic audio story script for clinical quality.

## Clinical Context
{context_str}

## Story Script Excerpt
{story_excerpt}

Score each dimension (0-1):
- clinical_accuracy: correct use of evidence-based therapeutic techniques (CBT, mindfulness, play therapy, etc.)
- age_appropriateness: vocabulary, framing, and pacing match the person's developmental stage
- issue_addressed: script directly and meaningfully tackles the stated clinical issue or feedback topic
{family_instruction}
- rationale: 2-3 sentence evaluation summary

Be honest: score low if the script is generic or misses the issue; score high if it is precise and clinically grounded."""

        scores: _StoryEvalScores = await structured_llm.ainvoke(eval_prompt)

        components = [scores.clinical_accuracy, scores.age_appropriateness, scores.issue_addressed]
        if has_related_member:
            components.append(scores.family_dynamics_coverage)
        overall = round(sum(components) / len(components), 2)

        evals_dict = {
            "clinicalAccuracy": round(scores.clinical_accuracy, 2),
            "ageAppropriateness": round(scores.age_appropriateness, 2),
            "issueAddressed": round(scores.issue_addressed, 2),
            "overall": overall,
            "rationale": scores.rationale,
        }
        if has_related_member:
            evals_dict["familyDynamicsCoverage"] = round(scores.family_dynamics_coverage, 2)

        return {"evals": json.dumps(evals_dict)}

    except Exception as exc:
        print(f"[eval_story] Eval error (non-fatal): {exc}")
        return {}


def create_story_graph():
    """Build the story generation LangGraph."""
    builder = StateGraph(StoryState)
    builder.add_node("load_context", load_context)
    builder.add_node("generate_story", generate_story)
    builder.add_node("save_story", save_story)
    builder.add_node("eval_story", eval_story)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "generate_story")
    builder.add_edge("generate_story", "save_story")
    builder.add_edge("save_story", "eval_story")
    builder.add_edge("eval_story", END)

    return builder.compile()


# Module-level graph instance for LangGraph server
graph = create_story_graph()
