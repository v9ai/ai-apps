"""LangGraph deep GOAL analysis graph — goal-centered with full family context.

Parallel to `deep_analysis_graph.py` (which centers on a family member + trigger
issue) but anchored on a single goal. Collects the goal, sub-goals, goal-linked
research, plus the full family-member context (issues, observations, journals,
teacher/contact feedbacks, related-member issues, research) when the goal is
tied to a family member. Persists to `deep_goal_analyses`.
"""
from __future__ import annotations

import json
from typing import Optional, TypedDict

from langgraph.graph import StateGraph, START, END

import psycopg

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from . import _deep_analysis_shared as shared  # noqa: E402


class DeepGoalAnalysisState(TypedDict, total=False):
    goal_id: int
    user_email: str
    language: str  # "en" | "ro"
    # Internal
    _prompt: str
    _data_snapshot: str  # JSON
    _goal_title: str
    # Output
    analysis: str  # JSON — full structured analysis
    analysis_id: int
    error: str


async def collect_data(state: DeepGoalAnalysisState) -> dict:
    """Collect goal + (optional) family context + goal research + build the prompt."""
    goal_id = state.get("goal_id")
    user_email = state.get("user_email")
    if not goal_id or not user_email:
        return {"error": "goal_id and user_email are required"}

    try:
        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id, family_member_id, title, description, status, priority, "
                    "target_date, therapeutic_text, tags, parent_goal_id, created_at "
                    "FROM goals WHERE id = %s AND user_id = %s",
                    (goal_id, user_email),
                )
                goal_row = await cur.fetchone()
                if not goal_row:
                    return {"error": f"Goal {goal_id} not found"}

                (
                    g_id,
                    g_family_member_id,
                    g_title,
                    g_desc,
                    g_status,
                    g_priority,
                    g_target_date,
                    g_therapeutic_text,
                    g_tags,
                    g_parent_goal_id,
                    g_created_at,
                ) = goal_row

                # Sub-goals
                await cur.execute(
                    "SELECT id, title, description, status, priority "
                    "FROM goals WHERE parent_goal_id = %s AND user_id = %s ORDER BY created_at ASC",
                    (g_id, user_email),
                )
                sub_goals = await cur.fetchall()

                # Goal-specific research
                await cur.execute(
                    "SELECT id, issue_id, title, key_findings, therapeutic_techniques, evidence_level "
                    "FROM therapy_research WHERE goal_id = %s ORDER BY relevance_score DESC NULLS LAST LIMIT 20",
                    (g_id,),
                )
                goal_research = await cur.fetchall()

                # Notes linked to this goal (entity_type='GOAL')
                await cur.execute(
                    "SELECT id, title, content, tags, created_at FROM notes "
                    "WHERE entity_type = 'GOAL' AND entity_id = %s AND user_id = %s "
                    "ORDER BY created_at DESC LIMIT 10",
                    (g_id, user_email),
                )
                goal_notes = await cur.fetchall()

                # Optional full family context
                ctx = None
                if g_family_member_id:
                    ctx = await shared.load_family_member_full_context(
                        cur, g_family_member_id, user_email
                    )
    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    sections: list[str] = []

    # ── Intro + attribution rules ────────────────────────────────────────
    intro = (
        "You are a clinical psychologist and family systems analyst. "
        "Your PRIMARY task is to produce an in-depth analysis of a SPECIFIC GOAL for a child/family member. "
        "All other data (issues, observations, journal entries, feedback, research) is CONTEXT that illuminates "
        "progress toward — or obstacles against — achieving this goal. Your analysis must CENTER on the goal.\n\n"
        "CRITICAL — ATTRIBUTION RULES:\n"
        "- For each issue, carefully read the description to identify WHO is the primary actor/aggressor, "
        "WHO is the victim or recipient, and WHO are bystanders.\n"
        "- The profiled family member may be the VICTIM, not the actor. Do NOT assume they caused the behavior described.\n"
        "- People mentioned in descriptions who are NOT listed in ## Other Family Members are external individuals "
        "(classmates, school colleagues, neighbors, etc.) — do NOT assume they are siblings or family members "
        "unless the description explicitly states so.\n\n"
        "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that appear in the data below."
    )
    sections.append(intro)

    # ── Goal profile (the focus) ────────────────────────────────────────
    goal_lines = [f"## GOAL (Primary Focus)", f"- [ID:{g_id}] \"{g_title}\""]
    if g_desc:
        goal_lines.append(f"  Description: {(g_desc or '')[:800]}")
    goal_lines.append(f"  Status: {g_status or 'unknown'}")
    if g_priority:
        goal_lines.append(f"  Priority: {g_priority}")
    if g_target_date:
        goal_lines.append(f"  Target date: {str(g_target_date)[:10]}")
    if g_tags:
        try:
            tags = json.loads(g_tags) if isinstance(g_tags, str) else g_tags
            if tags:
                goal_lines.append(f"  Tags: {', '.join(tags)}")
        except Exception:
            pass
    if g_therapeutic_text:
        goal_lines.append(f"  Therapeutic guidance already generated: {g_therapeutic_text[:600]}")
    if g_created_at:
        goal_lines.append(f"  Created: {str(g_created_at)[:10]}")
    sections.append("\n".join(goal_lines))

    # ── Sub-goals ───────────────────────────────────────────────────────
    if sub_goals:
        sg_lines = [f"## Sub-goals ({len(sub_goals)})"]
        for sg in sub_goals:
            sg_id, sg_title, sg_desc, sg_status, sg_priority = sg
            line = f"- [ID:{sg_id}] \"{sg_title}\" ({sg_status or 'unknown'}"
            if sg_priority:
                line += f", {sg_priority}"
            line += ")"
            if sg_desc:
                line += f" — {(sg_desc or '')[:200]}"
            sg_lines.append(line)
        sections.append("\n".join(sg_lines))

    # ── Family member profile + all their context ──────────────────────
    if ctx:
        fm_id, fm_first, fm_name, fm_age, fm_rel, fm_bio = ctx["fm"]
        sections.append(shared.render_family_member_profile(fm_first, fm_name, fm_age, fm_rel, fm_bio))

        issues = ctx["issues"]
        role_note = (
            "\n(Note: The profiled family member may be the subject, victim, or bystander in these incidents. "
            "Determine their role from each description. Judge how each issue relates to the GOAL above — "
            "does it block progress, support progress, or indicate an underlying obstacle?)\n"
        )
        sections.append(shared.render_issues_section(issues, f"## All Issues ({len(issues)}){role_note}"))

        for renderer, rows in [
            (shared.render_observations_section, ctx["observations"]),
            (shared.render_journals_section, ctx["journals"]),
            (shared.render_teacher_feedbacks_section, ctx["teacher_fbs"]),
            (shared.render_contact_feedbacks_section, ctx["contact_fbs"]),
            (shared.render_related_member_issues_section, ctx["related_issues"]),
        ]:
            chunk = renderer(rows)
            if chunk:
                sections.append(chunk)

        members_chunk = shared.render_family_members_section(ctx["all_members"], exclude_id=fm_id)
        if members_chunk:
            sections.append(members_chunk)

        contacts_chunk = shared.render_issue_contacts_section(ctx["issue_contacts"])
        if contacts_chunk:
            sections.append(contacts_chunk)
    else:
        sections.append(
            "## Family Member Profile\n(This goal is not linked to a specific family member.)"
        )

    # ── Goal-specific research (merge with any issue-linked research from ctx) ─
    research_rows = list(goal_research or [])
    if ctx and ctx.get("research"):
        seen_ids = {r[0] for r in research_rows}
        for r in ctx["research"]:
            if r[0] not in seen_ids:
                research_rows.append(r)
    research_chunk = shared.render_research_section(research_rows)
    if research_chunk:
        sections.append(research_chunk)

    # ── Notes linked to the goal ────────────────────────────────────────
    if goal_notes:
        note_lines = [f"## Notes About This Goal ({len(goal_notes)})"]
        for n in goal_notes:
            n_id, n_title, n_content, n_tags, n_created = n
            line = f"- [{str(n_created)[:10]}] \"{n_title or '(untitled)'}\""
            if n_content:
                line += f" — {(n_content or '')[:300]}"
            note_lines.append(line)
        sections.append("\n".join(note_lines))

    # ── Instructions ────────────────────────────────────────────────────
    sections.append(f"""## Instructions
Analyze the data above with PRIMARY FOCUS on the GOAL (ID:{g_id}: "{g_title}").
Produce a structured JSON analysis with these fields, all oriented toward progress on this goal:

1. **summary** (string): 2-3 paragraph executive summary for a parent/caregiver CENTERED on the goal. State the goal in one sentence, then summarize where the child stands relative to it today (based on issues/observations/journals/feedback), then name the 1-2 biggest obstacles or accelerators.
2. **patternClusters** (array of objects, max 5): Groups of issues/observations that relate to the goal — either obstacles to it or evidence of progress. Each cluster MUST include at least one issueId if issues are present. Fields: name (string), description (string: explain how this cluster relates to the goal), issueIds (array of ints), issueTitles (array of strings), categories (array of strings), pattern (string: recurring|escalating|co-occurring|seasonal|triggered), confidence (float 0-1), suggestedRootCause (optional string).
3. **timelineAnalysis** (object): The child's trajectory TOWARD THE GOAL. phases (array of objects: {{period (string), issueIds (array of ints), description (string: frame as progress-toward-goal, setback, or plateau), moodTrend (string: declining|improving|stable|volatile), keyEvents (array of strings)}}), moodCorrelation (optional string), escalationTrend (string: improving|worsening|stable|cyclical — interpret "improving" as moving toward the goal), criticalPeriods (array of strings).
4. **familySystemInsights** (array of objects, max 4): Family dynamics that affect this goal. {{insight (string: how the family system helps or hinders the goal), involvedMemberIds (array of ints), involvedMemberNames (array of strings), evidenceIssueIds (array of ints), systemicPattern (optional string), actionable (bool)}}.
5. **priorityRecommendations** (array of objects, max 5): Ordered steps/sub-objectives the parent should tackle first to move this goal forward. Rank 1 MUST be the highest-leverage next step. {{rank (int), issueId (optional int — the issue this step addresses, if any), issueTitle (optional string), rationale (string: why this step advances the goal), urgency (string: immediate|short_term|long_term), suggestedApproach (string), relatedResearchIds (optional array of ints)}}.
6. **researchRelevance** (array of objects): For each patternCluster, which research papers apply and what's missing. {{patternClusterName (string), relevantResearchIds (array of ints), relevantResearchTitles (array of strings), coverageGaps (array of strings — what extra research would help the parent achieve this goal)}}.
7. **parentAdvice** (array of objects, 3-7 items): Practical, evidence-based advice the parent can apply AT HOME to advance THIS goal. Every item must tie to the goal (not generic parenting). Each: title (string), advice (string: 2-4 sentences explaining the recommendation with research context — reference the goal explicitly), targetIssueIds (array of ints — obstacles this advice removes), targetIssueTitles (array of strings), relatedPatternCluster (optional string — MUST match a patternClusters[].name), relatedResearchIds (optional array of ints), relatedResearchTitles (optional array of strings — exact titles), ageAppropriate (bool: true if suitable for the child's age), developmentalContext (optional string), priority (string: immediate|short_term|long_term), concreteSteps (array of strings: specific actions, e.g. "At Tuesday dinner, ask child to name one thing they tried today toward {g_title[:40]}" — NOT generic "Talk to child").

IMPORTANT: Every field annotated as "array of" MUST be a JSON array, even when there is only one item. Prefer specificity over generality. If you reference a research or issue ID, it MUST exist in the data above — do NOT invent IDs or titles.

ATTRIBUTION CHECK — before writing the summary, verify for each issue:
- Who is the actual aggressor/actor based on the description text?
- Is the profiled family member the actor, victim, or bystander?
- Are the other people mentioned family members (listed in ## Other Family Members) or external individuals?
State the profiled member's role clearly where relevant. Do not attribute another person's actions to the profiled member.

Write the analysis in the same language as the majority of the input data.""")

    if state.get("language") == "ro":
        sections.insert(0, shared.ROMANIAN_INSTRUCTION)

    prompt = "\n\n".join(sections)

    # Data snapshot — goal-flavored: base counts from family ctx if available, plus
    # goal-specific counts.
    snapshot = {
        "issueCount": len(ctx.get("issues", [])) if ctx else 0,
        "observationCount": len(ctx.get("observations", [])) if ctx else 0,
        "journalEntryCount": len(ctx.get("journals", [])) if ctx else 0,
        "contactFeedbackCount": len(ctx.get("contact_fbs", [])) if ctx else 0,
        "teacherFeedbackCount": len(ctx.get("teacher_fbs", [])) if ctx else 0,
        "researchPaperCount": len(research_rows),
        "subGoalCount": len(sub_goals),
        "noteCount": len(goal_notes),
    }

    return {
        "_prompt": prompt,
        "_data_snapshot": json.dumps(snapshot),
        "_goal_title": g_title,
    }


async def persist(state: dict) -> dict:
    """Save the analysis to deep_goal_analyses."""
    if state.get("error") or not state.get("analysis"):
        return {}
    try:
        analysis = json.loads(state["analysis"])
        goal_id = state.get("goal_id")
        user_email = state.get("user_email")
        data_snapshot = state.get("_data_snapshot", "{}")

        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO deep_goal_analyses "
                    "(goal_id, user_id, summary, pattern_clusters, timeline_analysis, "
                    "family_system_insights, priority_recommendations, research_relevance, "
                    "parent_advice, data_snapshot, model, created_at, updated_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id",
                    (
                        goal_id,
                        user_email,
                        analysis.get("summary", ""),
                        json.dumps(analysis.get("patternClusters", [])),
                        json.dumps(analysis.get("timelineAnalysis", {})),
                        json.dumps(analysis.get("familySystemInsights", [])),
                        json.dumps(analysis.get("priorityRecommendations", [])),
                        json.dumps(analysis.get("researchRelevance", [])),
                        json.dumps(analysis.get("parentAdvice", [])),
                        data_snapshot,
                        "deepseek-chat",
                    ),
                )
                row = await cur.fetchone()
                analysis_id = row[0] if row else 0

        return {"analysis_id": analysis_id}
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}


def create_deep_goal_analysis_graph():
    """Build the deep goal analysis LangGraph."""
    builder = StateGraph(DeepGoalAnalysisState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("analyze", shared.analyze)
    builder.add_node("persist", persist)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "analyze")
    builder.add_edge("analyze", "persist")
    builder.add_edge("persist", END)

    return builder.compile()


graph = create_deep_goal_analysis_graph()
