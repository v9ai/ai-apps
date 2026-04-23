"""LangGraph deep issue analysis graph — family-member + optional trigger issue.

Collects all family-member data and runs structured LLM analysis, persisting
to `deep_issue_analyses`. The generic polymorphic flow lives in
`deep_analysis_v2_graph.py`; this graph is preserved unchanged so the existing
issue-page UI keeps working.
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


class DeepAnalysisState(TypedDict, total=False):
    family_member_id: int
    trigger_issue_id: Optional[int]
    user_email: str
    language: str  # "en" | "ro"
    # Internal
    _prompt: str
    _data_snapshot: str  # JSON
    _family_member_name: str
    # Output
    analysis: str  # JSON — full structured analysis
    analysis_id: int
    error: str


async def collect_data(state: DeepAnalysisState) -> dict:
    """Collect all data for the family member + build the issue-triggered prompt."""
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    if not family_member_id or not user_email:
        return {"error": "family_member_id and user_email are required"}

    try:
        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                ctx = await shared.load_family_member_full_context(
                    cur, family_member_id, user_email
                )
    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    fm_id, fm_first, fm_name, fm_age, fm_rel, fm_bio, fm_loc = ctx["fm"]
    issues = ctx["issues"]
    observations = ctx["observations"]
    journals = ctx["journals"]
    teacher_fbs = ctx["teacher_fbs"]
    contact_fbs = ctx["contact_fbs"]
    related_issues = ctx["related_issues"]
    research = ctx["research"]
    issue_contacts = ctx["issue_contacts"]
    all_members = ctx["all_members"]

    # Identify the trigger issue (if any) for focused analysis
    trigger_issue_id = state.get("trigger_issue_id")
    trigger_issue = None
    other_issues = []
    for row in issues:
        if trigger_issue_id and row[0] == trigger_issue_id:
            trigger_issue = row
        else:
            other_issues.append(row)

    sections: list[str] = []

    if trigger_issue:
        ti_id, ti_title, ti_cat, ti_sev, ti_desc, ti_recs, ti_related, ti_created = trigger_issue
        intro = (
            "You are a clinical psychologist and family systems analyst. "
            "Your PRIMARY task is to provide an in-depth analysis of a SPECIFIC issue involving this family member. "
            "The other issues, observations, and feedback are provided as CONTEXT to help you understand "
            "how this issue fits into the broader picture — but your analysis must CENTER on the trigger issue.\n\n"
            "CRITICAL — ATTRIBUTION RULES:\n"
            "- For each issue, carefully read the description to identify WHO is the primary actor/aggressor, "
            "WHO is the victim or recipient, and WHO are bystanders.\n"
            "- The profiled family member may be the VICTIM, not the actor. Do NOT assume they caused the behavior described.\n"
            "- People mentioned in descriptions who are NOT listed in ## Other Family Members are external individuals "
            "(classmates, school colleagues, neighbors, etc.) — do NOT assume they are siblings or family members "
            "unless the description explicitly states so.\n\n"
            f'## TRIGGER ISSUE (Primary Focus)\n'
            f'- [ID:{ti_id}] "{ti_title}" ({ti_cat}, {ti_sev} severity, {str(ti_created)[:10]})\n'
            f'  {(ti_desc or "")[:500]}'
        )
        if ti_recs:
            try:
                recs = json.loads(ti_recs)
                if recs:
                    intro += f"\n  Current recommendations: {'; '.join(recs)}"
            except Exception:
                pass
        sections.append(intro)
        sections.append(
            "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that appear in the data below.\n"
            "Your summary, pattern clusters, and priority recommendations must primarily address the trigger issue above. "
            "Other issues should be referenced only when they relate to or shed light on the trigger issue."
        )
    else:
        sections.append(
            "You are a clinical psychologist and family systems analyst. Analyze the complete history "
            "of issues, observations, journal entries, and feedback involving a family member to identify "
            "patterns, systemic dynamics, and priorities.\n\n"
            "CRITICAL — ATTRIBUTION RULES:\n"
            "- For each issue, carefully read the description to identify WHO is the primary actor/aggressor, "
            "WHO is the victim or recipient, and WHO are bystanders.\n"
            "- The profiled family member may be the VICTIM, not the actor. Do NOT assume they caused the behavior described.\n"
            "- People mentioned in descriptions who are NOT listed in ## Other Family Members are external individuals "
            "(classmates, school colleagues, neighbors, etc.) — do NOT assume they are siblings or family members "
            "unless the description explicitly states so.\n\n"
            "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that appear in the data below."
        )

    sections.append(shared.render_family_member_profile(fm_first, fm_name, fm_age, fm_rel, fm_bio, fm_loc))

    context_issues = other_issues if trigger_issue else issues
    header_title = "## Other Issues (Context)" if trigger_issue else f"## All Issues ({len(issues)})"
    role_note = (
        "\n(Note: The profiled family member may be the subject, victim, or bystander in these incidents. "
        "Determine their role from each description.)\n"
    )
    sections.append(shared.render_issues_section(context_issues, f"{header_title}{role_note}"))

    for renderer, rows in [
        (shared.render_observations_section, observations),
        (shared.render_journals_section, journals),
        (shared.render_teacher_feedbacks_section, teacher_fbs),
        (shared.render_contact_feedbacks_section, contact_fbs),
        (shared.render_related_member_issues_section, related_issues),
        (shared.render_research_section, research),
    ]:
        chunk = renderer(rows)
        if chunk:
            sections.append(chunk)

    members_chunk = shared.render_family_members_section(all_members, exclude_id=fm_id)
    if members_chunk:
        sections.append(members_chunk)

    contacts_chunk = shared.render_issue_contacts_section(issue_contacts)
    if contacts_chunk:
        sections.append(contacts_chunk)

    if trigger_issue:
        sections.append(f"""## Instructions
Analyze the data above with PRIMARY FOCUS on the trigger issue (ID:{trigger_issue[0]}: "{trigger_issue[1]}").
Produce a structured JSON analysis with these fields:

1. **summary** (string): 2-3 paragraph executive summary for a parent/caregiver CENTERED on the trigger issue. Start with the trigger issue, then explain how other issues relate to it.
2. **patternClusters** (array of objects): Related issue groups. The trigger issue MUST appear in at least one cluster. Each has: name (string), description (string), issueIds (array of ints), issueTitles (array of strings), categories (array of strings), pattern (string: recurring|escalating|co-occurring|seasonal|triggered), confidence (float 0-1), suggestedRootCause (optional string).
3. **timelineAnalysis** (object): phases (array of objects: {{period (string), issueIds (array of ints), description (string), moodTrend (string: declining|improving|stable|volatile), keyEvents (array of strings)}}), moodCorrelation (optional string), escalationTrend (string: improving|worsening|stable|cyclical), criticalPeriods (array of strings). Focus timeline on the trigger issue's evolution.
4. **familySystemInsights** (array of objects): {{insight (string), involvedMemberIds (array of ints), involvedMemberNames (array of strings), evidenceIssueIds (array of ints), systemicPattern (optional string), actionable (bool)}}. Prioritize insights related to the trigger issue.
5. **priorityRecommendations** (array of objects): {{rank (int), issueId (optional int), issueTitle (optional string), rationale (string), urgency (string: immediate|short_term|long_term), suggestedApproach (string), relatedResearchIds (optional array of ints)}}. The FIRST recommendation (rank 1) MUST address the trigger issue directly.
6. **researchRelevance** (array of objects): {{patternClusterName (string), relevantResearchIds (array of ints), relevantResearchTitles (array of strings), coverageGaps (array of strings)}}.
7. **parentAdvice** (array of objects): Practical, evidence-based parenting advice linked to the analysis above. Generate 3-7 items. The FIRST item MUST address the trigger issue directly. Each has: title (string), advice (string: 2-4 sentences explaining the recommendation with research context), targetIssueIds (array of ints from the issues above), targetIssueTitles (array of strings), relatedPatternCluster (optional string — MUST match a patternClusters[].name from section 2 if provided), relatedResearchIds (optional array of ints from ## Existing Research), relatedResearchTitles (optional array of strings — exact titles from research), ageAppropriate (bool: true if suitable for the child's age in ## Family Member Profile), developmentalContext (optional string: why this advice fits the child's developmental stage), priority (string: immediate|short_term|long_term), concreteSteps (array of strings: specific actionable steps the parent can implement at home — be specific, e.g. "Set a 20-minute homework timer after snack" not "Help with homework"). Every item MUST reference at least one issue ID from the data. If research is available, cite specific ResearchIDs — do NOT invent research references. Verify age-appropriateness against the child's age in ## Family Member Profile.

IMPORTANT: Every field annotated as "array of" MUST be a JSON array, even when there is only one item. For example: coverageGaps must be ["single gap"], NOT "single gap".

ATTRIBUTION CHECK — before writing the summary, verify for each issue:
- Who is the actual aggressor/actor based on the description text?
- Is the profiled family member the actor, victim, or bystander?
- Are the other people mentioned family members (listed in ## Other Family Members) or external individuals (classmates, colleagues, etc.)?
State the profiled member's role clearly in the summary. Do not attribute another person's actions to the profiled member.

Write the analysis in the same language as the majority of the input data.""")
    else:
        sections.append("""## Instructions

CRITICAL — ATTRIBUTION RULES:
- For each issue, carefully read the description to identify WHO is the primary actor/aggressor, WHO is the victim or recipient, and WHO are bystanders.
- The profiled family member may be the VICTIM, not the actor. Do NOT assume they caused the behavior described.
- People mentioned in descriptions who are NOT listed in ## Other Family Members are external individuals (classmates, school colleagues, neighbors, etc.) — do NOT assume they are siblings or family members unless explicitly stated.

Analyze all the data above and produce a structured JSON analysis with these fields:

1. **summary** (string): 2-3 paragraph executive summary for a parent/caregiver.
2. **patternClusters** (array of objects): Related issue groups. Each has: name (string), description (string), issueIds (array of ints), issueTitles (array of strings), categories (array of strings), pattern (string: recurring|escalating|co-occurring|seasonal|triggered), confidence (float 0-1), suggestedRootCause (optional string).
3. **timelineAnalysis** (object): phases (array of objects: {period (string), issueIds (array of ints), description (string), moodTrend (string: declining|improving|stable|volatile), keyEvents (array of strings)}), moodCorrelation (optional string), escalationTrend (string: improving|worsening|stable|cyclical), criticalPeriods (array of strings).
4. **familySystemInsights** (array of objects): {insight (string), involvedMemberIds (array of ints), involvedMemberNames (array of strings), evidenceIssueIds (array of ints), systemicPattern (optional string), actionable (bool)}.
5. **priorityRecommendations** (array of objects): {rank (int), issueId (optional int), issueTitle (optional string), rationale (string), urgency (string: immediate|short_term|long_term), suggestedApproach (string), relatedResearchIds (optional array of ints)}.
6. **researchRelevance** (array of objects): {patternClusterName (string), relevantResearchIds (array of ints), relevantResearchTitles (array of strings), coverageGaps (array of strings)}.
7. **parentAdvice** (array of objects): Practical, evidence-based parenting advice linked to the analysis above. Generate 3-7 items, prioritized by urgency. Each has: title (string), advice (string: 2-4 sentences explaining the recommendation with research context), targetIssueIds (array of ints from the issues above), targetIssueTitles (array of strings), relatedPatternCluster (optional string — MUST match a patternClusters[].name from section 2 if provided), relatedResearchIds (optional array of ints from ## Existing Research), relatedResearchTitles (optional array of strings — exact titles from research), ageAppropriate (bool: true if suitable for the child's age in ## Family Member Profile), developmentalContext (optional string: why this advice fits the child's developmental stage), priority (string: immediate|short_term|long_term), concreteSteps (array of strings: specific actionable steps the parent can implement at home — be specific, e.g. "Set a 20-minute homework timer after snack" not "Help with homework"). Every item MUST reference at least one issue ID from the data. If research is available, cite specific ResearchIDs — do NOT invent research references. Verify age-appropriateness against the child's age in ## Family Member Profile.

IMPORTANT: Every field annotated as "array of" MUST be a JSON array, even when there is only one item. For example: coverageGaps must be ["single gap"], NOT "single gap".

ATTRIBUTION CHECK — before writing the summary, verify for each issue:
- Who is the actual aggressor/actor based on the description text?
- Is the profiled family member the actor, victim, or bystander?
- Are the other people mentioned family members (listed in ## Other Family Members) or external individuals (classmates, colleagues, etc.)?
State the profiled member's role clearly in the summary. Do not attribute another person's actions to the profiled member.

Write the analysis in the same language as the majority of the input data.""")

    if state.get("language") == "ro":
        sections.insert(0, shared.ROMANIAN_INSTRUCTION)

    prompt = "\n\n".join(sections)
    data_snapshot = shared.data_snapshot_from_family_context(ctx)

    return {
        "_prompt": prompt,
        "_data_snapshot": data_snapshot,
        "_family_member_name": fm_first,
    }


async def persist(state: dict) -> dict:
    """Save the analysis to deep_issue_analyses table."""
    if state.get("error") or not state.get("analysis"):
        return {}
    try:
        analysis = json.loads(state["analysis"])
        family_member_id = state.get("family_member_id")
        trigger_issue_id = state.get("trigger_issue_id")
        user_email = state.get("user_email")
        data_snapshot = state.get("_data_snapshot", "{}")

        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO deep_issue_analyses "
                    "(family_member_id, trigger_issue_id, user_id, summary, "
                    "pattern_clusters, timeline_analysis, family_system_insights, "
                    "priority_recommendations, research_relevance, parent_advice, data_snapshot, model, created_at, updated_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id",
                    (
                        family_member_id,
                        trigger_issue_id,
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


def create_deep_analysis_graph():
    """Build the deep issue analysis LangGraph."""
    builder = StateGraph(DeepAnalysisState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("analyze", shared.analyze)
    builder.add_node("persist", persist)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "analyze")
    builder.add_edge("analyze", "persist")
    builder.add_edge("persist", END)

    return builder.compile()


graph = create_deep_analysis_graph()
