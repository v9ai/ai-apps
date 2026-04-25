"""LangGraph parent advice graph — generates evidence-based parenting advice grounded in research papers and deep analysis."""
from __future__ import annotations

import json
import os
import sys
from typing import Optional, TypedDict

from langgraph.graph import StateGraph, START, END

import psycopg

from research_agent import neon

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── deepseek_client from shared pypackages ────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"))
from deepseek_client import DeepSeekClient, ChatMessage  # noqa: E402


class ParentAdviceState(TypedDict, total=False):
    goal_id: int
    user_email: str
    language: str
    # Internal
    _prompt: str
    _research_count: int
    _has_deep_analysis: bool
    # Output
    advice: str
    error: str


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def collect_data(state: ParentAdviceState) -> dict:
    """Collect goal, family member, issues, research, and deep analysis data."""
    goal_id = state.get("goal_id")
    user_email = state.get("user_email")
    language = state.get("language", "English")

    if not goal_id or not user_email:
        return {"error": "goal_id and user_email are required"}

    conn_str = _conn_str()
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                # Goal
                await cur.execute(
                    "SELECT id, title, description, family_member_id FROM goals WHERE id = %s AND user_id = %s",
                    (goal_id, user_email),
                )
                goal_row = await cur.fetchone()
                if not goal_row:
                    return {"error": f"Goal {goal_id} not found"}
                _, goal_title, goal_desc, family_member_id = goal_row

                # Research papers for this goal
                await cur.execute(
                    "SELECT title, authors, year, evidence_level, relevance_score, abstract, key_findings, therapeutic_techniques "
                    "FROM therapy_research WHERE goal_id = %s ORDER BY relevance_score DESC LIMIT 10",
                    (goal_id,),
                )
                research_rows = await cur.fetchall()

                if not research_rows:
                    return {"error": "No research found for this goal. Generate research first."}

                # Family member profile
                child_context = ""
                if family_member_id:
                    await cur.execute(
                        "SELECT first_name, age_years, date_of_birth, relationship FROM family_members WHERE id = %s",
                        (family_member_id,),
                    )
                    fm_row = await cur.fetchone()
                    if fm_row:
                        fm_first, fm_age, fm_dob, fm_rel = fm_row
                        parts = [f"Name: {fm_first}"]
                        if fm_age:
                            parts.append(f"Age: {fm_age} years old")
                        if fm_dob:
                            parts.append(f"Date of birth: {fm_dob}")
                        if fm_rel:
                            parts.append(f"Relationship: {fm_rel}")
                        child_context = "\n".join(parts)

                # Issues
                issues_context = ""
                if family_member_id:
                    await cur.execute(
                        "SELECT title, category, severity, description FROM issues "
                        "WHERE family_member_id = %s AND user_id = %s ORDER BY created_at DESC LIMIT 10",
                        (family_member_id, user_email),
                    )
                    issue_rows = await cur.fetchall()
                    if issue_rows:
                        issues_context = "\n".join(
                            f"- [{(row[2] or '').upper()}] {row[0]} ({row[1]}): {(row[3] or '')[:200]}"
                            for row in issue_rows
                        )

                # Deep analysis (most recent)
                deep_analysis_context = ""
                if family_member_id:
                    await cur.execute(
                        "SELECT summary, priority_recommendations, pattern_clusters, family_system_insights "
                        "FROM deep_issue_analyses WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 1",
                        (family_member_id, user_email),
                    )
                    da_row = await cur.fetchone()
                    if da_row:
                        da_summary, da_recs_raw, da_clusters_raw, da_insights_raw = da_row
                        da_parts = [f"### Executive Summary\n{da_summary}"]

                        da_recs = json.loads(da_recs_raw) if da_recs_raw else []
                        if da_recs:
                            recs_text = "\n".join(
                                f"{r.get('rank', '')}. [{r.get('urgency', '')}] {r.get('issueTitle', 'General')}: "
                                f"{r.get('rationale', '')}\n   Approach: {r.get('suggestedApproach', '')}"
                                for r in da_recs[:5]
                            )
                            da_parts.append(f"### Priority Recommendations from Deep Analysis\n{recs_text}")

                        da_clusters = json.loads(da_clusters_raw) if da_clusters_raw else []
                        if da_clusters:
                            clusters_text = "\n".join(
                                f'- "{c.get("name", "")}" ({c.get("pattern", "")}): {c.get("description", "")}'
                                + (f' | Root cause: {c["suggestedRootCause"]}' if c.get("suggestedRootCause") else "")
                                for c in da_clusters
                            )
                            da_parts.append(f"### Identified Behavioral Patterns\n{clusters_text}")

                        da_insights = json.loads(da_insights_raw) if da_insights_raw else []
                        actionable = [i["insight"] for i in da_insights if i.get("actionable")]
                        if actionable:
                            da_parts.append("### Actionable Family System Insights\n" + "\n".join(f"- {i}" for i in actionable))

                        deep_analysis_context = "\n\n".join(da_parts)

    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    # Build research context
    research_lines = []
    for idx, row in enumerate(research_rows):
        r_title, r_authors_raw, r_year, r_evidence, r_relevance, r_abstract, r_kf_raw, r_tt_raw = row
        lines = [f'[{idx + 1}] "{r_title}"']
        authors = json.loads(r_authors_raw) if r_authors_raw else []
        if authors:
            lines.append(f"  Authors: {', '.join(authors)}")
        if r_year:
            lines.append(f"  Year: {r_year}")
        if r_evidence:
            lines.append(f"  Evidence level: {r_evidence}")
        if r_relevance:
            lines.append(f"  Relevance: {r_relevance}")
        if r_abstract:
            lines.append(f"  Abstract: {r_abstract[:400]}")
        kf = json.loads(r_kf_raw) if r_kf_raw else []
        if kf:
            lines.append(f"  Key findings: {'; '.join(kf)}")
        tt = json.loads(r_tt_raw) if r_tt_raw else []
        if tt:
            lines.append(f"  Therapeutic techniques: {'; '.join(tt)}")
        research_lines.append("\n".join(lines))

    research_context = "\n\n".join(research_lines)
    research_count = len(research_rows)

    # Build prompt
    prompt_parts = [
        "You are a child development and parenting expert. Generate practical, evidence-based parenting advice "
        "that is STRICTLY GROUNDED in the research papers and deep analysis provided below.",
        "",
        "## Goal",
        f"Title: {goal_title}",
    ]
    if goal_desc:
        prompt_parts.append(f"Description: {goal_desc}")
    prompt_parts.append("")

    if child_context:
        prompt_parts.append(f"## Child Profile\n{child_context}")
    if issues_context:
        prompt_parts.append(f"## Known Issues\n{issues_context}")
    prompt_parts.append("")

    prompt_parts.append(f"## Research Evidence ({research_count} papers)")
    prompt_parts.append(research_context)
    prompt_parts.append("")

    if deep_analysis_context:
        prompt_parts.append(f"## Deep Analysis (LangGraph)\n{deep_analysis_context}")
        prompt_parts.append("")

    prompt_parts.extend([
        "## Instructions",
        f"Write comprehensive parenting advice (800-1500 words) in {language}.",
        "",
        "CRITICAL GROUNDING RULES:",
        "- Every piece of advice MUST trace back to a specific research paper listed above",
        "- Cite papers using their EXACT title and authors as shown above (e.g. 'According to Roberts and Kim (2023) in their systematic review...')",
        "- Do NOT paraphrase or invent paper titles — use the exact titles from the ## Research Evidence section",
        "- Do NOT cite any papers or authors that are not listed in the ## Research Evidence section above",
        "- Only recommend therapeutic techniques that appear in the 'Therapeutic techniques' list of a paper above",
        "- If the deep analysis identified specific patterns or root causes, address those directly",
        "- If the deep analysis has priority recommendations, translate those into parent-friendly language",
        "",
        "STRUCTURE:",
        "- Start with a brief empathetic introduction acknowledging the parent's situation",
        "- For each recommendation, explain the research basis, then give concrete at-home steps",
        "- Use the therapeutic techniques from the research papers as the backbone of your advice",
        "- Include specific examples and scenarios grounded in the child's known issues",
        "- End with guidance on when to seek additional professional support",
        "",
        "AGE-APPROPRIATENESS:",
        "- All recommendations must be appropriate for the child's actual age",
        "- Verify the child's date of birth year matches the stated age",
        "- Do not suggest interventions designed for a different age group",
        "",
        "Respond with a JSON object: {\"advice\": \"<your full advice text>\"}",
    ])

    prompt = "\n".join(p for p in prompt_parts if p is not None)

    return {
        "_prompt": prompt,
        "_research_count": research_count,
        "_has_deep_analysis": bool(deep_analysis_context),
    }


async def generate(state: dict) -> dict:
    """Call DeepSeek to generate parent advice."""
    if state.get("error"):
        return {}

    prompt = state.get("_prompt", "")

    try:
        from deepseek_client import DeepSeekConfig
        async with DeepSeekClient(DeepSeekConfig(timeout=120.0)) as client:
            resp = await client.chat(
                [ChatMessage(role="user", content=prompt)],
                model="deepseek-chat",
                temperature=0.4,
                max_tokens=8192,
                response_format={"type": "json_object"},
            )

        content = resp.choices[0].message.content
        parsed = json.loads(content)
        advice = parsed.get("advice")

        if not advice:
            # Fallback: if DeepSeek returned a different key, take the first string value
            for v in parsed.values():
                if isinstance(v, str) and len(v) > 100:
                    advice = v
                    break

        if not advice:
            return {"error": f"DeepSeek returned no advice field. Keys: {list(parsed.keys())}"}

        return {"advice": advice}
    except Exception as exc:
        return {"error": f"generate failed: {exc}"}


async def persist(state: dict) -> dict:
    """Save the advice to the goals table."""
    if state.get("error") or not state.get("advice"):
        return {}

    goal_id = state.get("goal_id")
    user_email = state.get("user_email")
    language = state.get("language", "English")
    advice = state["advice"]

    try:
        conn_str = _conn_str()
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE goals SET parent_advice = %s, parent_advice_language = %s, "
                    "parent_advice_generated_at = NOW(), updated_at = NOW() "
                    "WHERE id = %s AND user_id = %s",
                    (advice, language, goal_id, user_email),
                )
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}

    return {}


def create_parent_advice_graph(checkpointer=None):
    """Build the parent advice LangGraph."""
    builder = StateGraph(ParentAdviceState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", END)

    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


# Module-level graph instance for LangGraph server (eager, no checkpointer).
graph = create_parent_advice_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_parent_advice_graph, graph)
