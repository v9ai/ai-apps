"""LangGraph deep issue analysis graph — collects all family member data and runs structured LLM analysis."""
from __future__ import annotations

import json
import os
import sys
from typing import Optional, TypedDict

from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field, field_validator

import psycopg

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── deepseek_client from shared pypackages ────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"))
from deepseek_client import DeepSeekClient, ChatMessage, DeepSeekConfig  # noqa: E402


class DeepAnalysisState(TypedDict, total=False):
    family_member_id: int
    trigger_issue_id: Optional[int]
    user_email: str
    # Internal
    _prompt: str
    _data_snapshot: str  # JSON
    _family_member_name: str
    # Output
    analysis: str  # JSON — full structured analysis
    analysis_id: int
    error: str


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def collect_data(state: DeepAnalysisState) -> dict:
    """Collect all data for the family member: issues, observations, journals, feedbacks, research."""
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    if not family_member_id or not user_email:
        return {"error": "family_member_id and user_email are required"}

    conn_str = _conn_str()
    try:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                # Family member profile
                await cur.execute(
                    "SELECT id, first_name, name, age_years, relationship, bio FROM family_members WHERE id = %s",
                    (family_member_id,),
                )
                fm_row = await cur.fetchone()
                if not fm_row:
                    return {"error": f"Family member {family_member_id} not found"}
                fm_id, fm_first, fm_name, fm_age, fm_rel, fm_bio = fm_row
                family_member_name = fm_first

                # All issues for this member
                await cur.execute(
                    "SELECT id, title, category, severity, description, recommendations, related_family_member_id, created_at "
                    "FROM issues WHERE family_member_id = %s AND user_id = %s ORDER BY created_at DESC",
                    (family_member_id, user_email),
                )
                issues = await cur.fetchall()

                # Behavior observations
                await cur.execute(
                    "SELECT observed_at, observation_type, frequency, intensity, context, notes "
                    "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s ORDER BY observed_at DESC LIMIT 30",
                    (family_member_id, user_email),
                )
                observations = await cur.fetchall()

                # Journal entries
                await cur.execute(
                    "SELECT entry_date, mood, mood_score, tags, content "
                    "FROM journal_entries WHERE family_member_id = %s AND user_id = %s ORDER BY entry_date DESC LIMIT 20",
                    (family_member_id, user_email),
                )
                journals = await cur.fetchall()

                # Teacher feedbacks
                await cur.execute(
                    "SELECT feedback_date, teacher_name, subject, content, tags "
                    "FROM teacher_feedbacks WHERE family_member_id = %s AND user_id = %s ORDER BY feedback_date DESC LIMIT 15",
                    (family_member_id, user_email),
                )
                teacher_fbs = await cur.fetchall()

                # Contact feedbacks
                await cur.execute(
                    "SELECT feedback_date, subject, content, tags "
                    "FROM contact_feedbacks WHERE family_member_id = %s AND user_id = %s ORDER BY feedback_date DESC LIMIT 15",
                    (family_member_id, user_email),
                )
                contact_fbs = await cur.fetchall()

                # Issues from other members referencing this person
                await cur.execute(
                    "SELECT i.id, i.title, i.category, i.severity, i.description, i.family_member_id, fm.first_name "
                    "FROM issues i LEFT JOIN family_members fm ON fm.id = i.family_member_id "
                    "WHERE i.related_family_member_id = %s AND i.user_id = %s ORDER BY i.created_at DESC LIMIT 15",
                    (family_member_id, user_email),
                )
                related_issues = await cur.fetchall()

                # Research for this member's issues
                issue_ids = [row[0] for row in issues]
                research = []
                if issue_ids:
                    placeholders = ",".join(["%s"] * len(issue_ids))
                    await cur.execute(
                        f"SELECT id, issue_id, title, key_findings, therapeutic_techniques, evidence_level "
                        f"FROM therapy_research WHERE issue_id IN ({placeholders}) ORDER BY relevance_score DESC LIMIT 20",
                        issue_ids,
                    )
                    research = await cur.fetchall()

                # All family members for systemic context
                await cur.execute(
                    "SELECT id, first_name, name, age_years, relationship FROM family_members WHERE user_id = %s",
                    (user_email,),
                )
                all_members = await cur.fetchall()

    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    # Identify the trigger issue (if any) for focused analysis
    trigger_issue_id = state.get("trigger_issue_id")
    trigger_issue = None
    other_issues = []
    for row in issues:
        if trigger_issue_id and row[0] == trigger_issue_id:
            trigger_issue = row
        else:
            other_issues.append(row)

    # Build prompt
    sections = []

    if trigger_issue:
        ti_id, ti_title, ti_cat, ti_sev, ti_desc, ti_recs, ti_related, ti_created = trigger_issue
        sections.append(
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
                    sections[-1] += f"\n  Current recommendations: {'; '.join(recs)}"
            except Exception:
                pass
        sections.append(
            "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that appear in the data below.\n"
            "Your summary, pattern clusters, and priority recommendations must primarily address the trigger issue above. "
            "Other issues should be referenced only when they relate to or shed light on the trigger issue."
        )
    else:
        sections.append(
            "You are a clinical psychologist and family systems analyst. Analyze the complete history "
            "of issues, observations, journal entries, and feedback for a family member to identify "
            "patterns, systemic dynamics, and priorities.\n\n"
            "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that appear in the data below."
        )

    # Family member profile
    profile_parts = [f"Name: {fm_first}" + (f" {fm_name}" if fm_name else "")]
    if fm_age:
        profile_parts.append(f"Age: {fm_age}")
    if fm_rel:
        profile_parts.append(f"Relationship: {fm_rel}")
    if fm_bio:
        profile_parts.append(f"Bio: {fm_bio[:500]}")
    sections.append("## Family Member Profile\n" + "\n".join(profile_parts))

    # Issues — if trigger issue exists, show other issues as context
    context_issues = other_issues if trigger_issue else issues
    issue_lines = []
    for row in context_issues[:30]:
        i_id, i_title, i_cat, i_sev, i_desc, i_recs, i_related, i_created = row
        line = f'- [ID:{i_id}] "{i_title}" ({i_cat}, {i_sev} severity, {str(i_created)[:10]})'
        if i_desc:
            line += f"\n  {i_desc[:300]}"
        if i_recs:
            try:
                recs = json.loads(i_recs)
                if recs:
                    line += f"\n  Recommendations: {'; '.join(recs)}"
            except Exception:
                pass
        issue_lines.append(line)
    header = "## Other Issues (Context)" if trigger_issue else f"## All Issues ({len(issues)})"
    role_note = "\n(Note: The profiled family member may be the subject, victim, or bystander in these incidents. Determine their role from each description.)\n"
    sections.append(f"{header}{role_note}" + ("\n".join(issue_lines) or "None"))

    # Behavior observations
    if observations:
        obs_lines = []
        for row in observations:
            o_date, o_type, o_freq, o_int, o_ctx, o_notes = row
            line = f"- {str(o_date)[:10]}: {o_type}"
            if o_freq:
                line += f", freq={o_freq}"
            if o_int:
                line += f", intensity={o_int}"
            if o_ctx:
                line += f" | Context: {o_ctx[:200]}"
            if o_notes:
                line += f" | Notes: {o_notes[:200]}"
            obs_lines.append(line)
        sections.append(f"## Behavior Observations ({len(observations)})\n" + "\n".join(obs_lines))

    # Journal entries
    if journals:
        j_lines = []
        for row in journals:
            j_date, j_mood, j_score, j_tags, j_content = row
            line = f"- {j_date}"
            if j_mood:
                line += f" | Mood: {j_mood}"
            if j_score is not None:
                line += f" ({j_score}/10)"
            if j_tags:
                try:
                    tags = json.loads(j_tags) if isinstance(j_tags, str) else j_tags
                    if tags:
                        line += f" | Tags: {', '.join(tags)}"
                except Exception:
                    pass
            line += f"\n  {(j_content or '')[:300]}"
            j_lines.append(line)
        sections.append(f"## Journal Entries ({len(journals)})\n" + "\n".join(j_lines))

    # Teacher feedbacks
    if teacher_fbs:
        tf_lines = []
        for row in teacher_fbs:
            tf_date, tf_name, tf_subj, tf_content, tf_tags = row
            line = f"- {tf_date} from {tf_name}"
            if tf_subj:
                line += f" ({tf_subj})"
            line += f"\n  {(tf_content or '')[:500]}"
            tf_lines.append(line)
        sections.append(f"## Teacher Feedbacks ({len(teacher_fbs)})\n" + "\n".join(tf_lines))

    # Contact feedbacks
    if contact_fbs:
        cf_lines = []
        for row in contact_fbs:
            cf_date, cf_subj, cf_content, cf_tags = row
            line = f"- {cf_date}"
            if cf_subj:
                line += f" ({cf_subj})"
            line += f"\n  {(cf_content or '')[:500]}"
            cf_lines.append(line)
        sections.append(f"## Contact Feedbacks ({len(contact_fbs)})\n" + "\n".join(cf_lines))

    # Related member issues
    if related_issues:
        ri_lines = []
        for row in related_issues:
            ri_id, ri_title, ri_cat, ri_sev, ri_desc, ri_fm_id, ri_fm_name = row
            line = f'- [ID:{ri_id}] "{ri_title}" ({ri_cat}, {ri_sev}) — primary: {ri_fm_name or f"member #{ri_fm_id}"} [ID:{ri_fm_id}]'
            if ri_desc:
                line += f"\n  {ri_desc[:300]}"
            ri_lines.append(line)
        sections.append(f"## Issues From Other Family Members Referencing This Person ({len(related_issues)})\n" + "\n".join(ri_lines))

    # Research
    if research:
        r_lines = []
        for row in research:
            r_id, r_issue, r_title, r_kf, r_tt, r_ev = row
            kf = json.loads(r_kf or "[]") if r_kf else []
            tt = json.loads(r_tt or "[]") if r_tt else []
            line = f'- [ResearchID:{r_id}] "{r_title}"'
            if r_ev:
                line += f" ({r_ev})"
            if r_issue:
                line += f" for issue #{r_issue}"
            line += f"\n  Key findings: {'; '.join(kf[:3])}"
            line += f"\n  Techniques: {'; '.join(tt[:3])}"
            r_lines.append(line)
        sections.append(f"## Existing Research ({len(research)})\n" + "\n".join(r_lines))

    # Other family members
    others = [m for m in all_members if m[0] != family_member_id]
    if others:
        o_lines = []
        for row in others:
            m_id, m_first, m_name, m_age, m_rel = row
            line = f"- [ID:{m_id}] {m_first}"
            if m_name:
                line += f" {m_name}"
            if m_age:
                line += f", age {m_age}"
            if m_rel:
                line += f" ({m_rel})"
            o_lines.append(line)
        sections.append("## Other Family Members\n" + "\n".join(o_lines))

    # Instructions
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
Analyze all the data above and produce a structured JSON analysis with these fields:

1. **summary** (string): 2-3 paragraph executive summary for a parent/caregiver.
2. **patternClusters** (array of objects): Related issue groups. Each has: name (string), description (string), issueIds (array of ints), issueTitles (array of strings), categories (array of strings), pattern (string: recurring|escalating|co-occurring|seasonal|triggered), confidence (float 0-1), suggestedRootCause (optional string).
3. **timelineAnalysis** (object): phases (array of objects: {period (string), issueIds (array of ints), description (string), moodTrend (string: declining|improving|stable|volatile), keyEvents (array of strings)}), moodCorrelation (optional string), escalationTrend (string: improving|worsening|stable|cyclical), criticalPeriods (array of strings).
4. **familySystemInsights** (array of objects): {insight (string), involvedMemberIds (array of ints), involvedMemberNames (array of strings), evidenceIssueIds (array of ints), systemicPattern (optional string), actionable (bool)}.
5. **priorityRecommendations** (array of objects): {rank (int), issueId (optional int), issueTitle (optional string), rationale (string), urgency (string: immediate|short_term|long_term), suggestedApproach (string), relatedResearchIds (optional array of ints)}.
6. **researchRelevance** (array of objects): {patternClusterName (string), relevantResearchIds (array of ints), relevantResearchTitles (array of strings), coverageGaps (array of strings)}.
7. **parentAdvice** (array of objects): Practical, evidence-based parenting advice linked to the analysis above. Generate 3-7 items, prioritized by urgency. Each has: title (string), advice (string: 2-4 sentences explaining the recommendation with research context), targetIssueIds (array of ints from the issues above), targetIssueTitles (array of strings), relatedPatternCluster (optional string — MUST match a patternClusters[].name from section 2 if provided), relatedResearchIds (optional array of ints from ## Existing Research), relatedResearchTitles (optional array of strings — exact titles from research), ageAppropriate (bool: true if suitable for the child's age in ## Family Member Profile), developmentalContext (optional string: why this advice fits the child's developmental stage), priority (string: immediate|short_term|long_term), concreteSteps (array of strings: specific actionable steps the parent can implement at home — be specific, e.g. "Set a 20-minute homework timer after snack" not "Help with homework"). Every item MUST reference at least one issue ID from the data. If research is available, cite specific ResearchIDs — do NOT invent research references. Verify age-appropriateness against the child's age in ## Family Member Profile.

IMPORTANT: Every field annotated as "array of" MUST be a JSON array, even when there is only one item. For example: coverageGaps must be ["single gap"], NOT "single gap".

Write the analysis in the same language as the majority of the input data.""")

    prompt = "\n\n".join(sections)

    data_snapshot = json.dumps({
        "issueCount": len(issues),
        "observationCount": len(observations),
        "journalEntryCount": len(journals),
        "contactFeedbackCount": len(contact_fbs),
        "teacherFeedbackCount": len(teacher_fbs),
        "researchPaperCount": len(research),
        "relatedMemberIssueCount": len(related_issues),
    })

    return {
        "_prompt": prompt,
        "_data_snapshot": data_snapshot,
        "_family_member_name": family_member_name,
    }


def _coerce_list(v):
    """Coerce a bare value to a single-element list. Handles DeepSeek returning strings/ints instead of arrays."""
    if isinstance(v, (str, int, float)):
        return [v]
    return v


class PatternCluster(BaseModel):
    name: str
    description: str
    issueIds: list[int]
    issueTitles: list[str]
    categories: list[str]
    pattern: str
    confidence: float = Field(ge=0, le=1)
    suggestedRootCause: Optional[str] = None

    @field_validator("issueIds", "issueTitles", "categories", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)

class TimelinePhase(BaseModel):
    period: str
    issueIds: list[int]
    description: str
    moodTrend: Optional[str] = None
    keyEvents: list[str]

    @field_validator("issueIds", "keyEvents", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)

class TimelineAnalysis(BaseModel):
    phases: list[TimelinePhase]
    moodCorrelation: Optional[str] = None
    escalationTrend: str
    criticalPeriods: list[str]

    @field_validator("criticalPeriods", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)

class FamilySystemInsight(BaseModel):
    insight: str
    involvedMemberIds: list[int]
    involvedMemberNames: list[str]
    evidenceIssueIds: list[int]
    systemicPattern: Optional[str] = None
    actionable: bool

    @field_validator("involvedMemberIds", "involvedMemberNames", "evidenceIssueIds", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)

class PriorityRecommendation(BaseModel):
    rank: int
    issueId: Optional[int] = None
    issueTitle: Optional[str] = None
    rationale: str
    urgency: str
    suggestedApproach: str
    relatedResearchIds: Optional[list[int]] = None

    @field_validator("relatedResearchIds", mode="before")
    @classmethod
    def _coerce(cls, v):
        if v is None:
            return v
        return _coerce_list(v)

class ResearchRelevanceMapping(BaseModel):
    patternClusterName: str
    relevantResearchIds: list[int]
    relevantResearchTitles: list[str]
    coverageGaps: list[str]

    @field_validator("relevantResearchIds", "relevantResearchTitles", "coverageGaps", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)

class ParentAdviceItem(BaseModel):
    title: str
    advice: str
    targetIssueIds: list[int]
    targetIssueTitles: list[str]
    relatedPatternCluster: Optional[str] = None
    relatedResearchIds: Optional[list[int]] = None
    relatedResearchTitles: Optional[list[str]] = None
    ageAppropriate: bool = True
    developmentalContext: Optional[str] = None
    priority: str  # immediate|short_term|long_term
    concreteSteps: list[str]

    @field_validator("targetIssueIds", "targetIssueTitles", "concreteSteps", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)

    @field_validator("relatedResearchIds", "relatedResearchTitles", mode="before")
    @classmethod
    def _coerce_opt(cls, v):
        if v is None:
            return v
        return _coerce_list(v)

class DeepAnalysisOutput(BaseModel):
    summary: str
    patternClusters: list[PatternCluster]
    timelineAnalysis: TimelineAnalysis
    familySystemInsights: list[FamilySystemInsight]
    priorityRecommendations: list[PriorityRecommendation]
    researchRelevance: list[ResearchRelevanceMapping]
    parentAdvice: list[ParentAdviceItem]


_CONCISE_SYSTEM = (
    "CRITICAL: Your JSON response MUST fit within 8000 tokens. "
    "Use brief descriptions (1-2 sentences max per field). "
    "Limit patternClusters to 3, familySystemInsights to 3, "
    "priorityRecommendations to 4, parentAdvice to 3 items. "
    "Keep concreteSteps to 2-3 per advice item. Be concise."
)


async def analyze(state: dict) -> dict:
    """Call DeepSeek with structured output to produce the deep analysis.

    Detects output truncation (finish_reason == 'length') and retries
    with a conciseness system prompt to fit within the 8192 token limit.
    """
    if state.get("error"):
        return {}

    try:
        prompt = state.get("_prompt", "")

        async with DeepSeekClient(DeepSeekConfig(timeout=300.0)) as client:
            # First attempt — full output
            messages = [ChatMessage(role="user", content=prompt)]
            resp = await client.chat(
                messages,
                model="deepseek-chat",
                temperature=0.3,
                max_tokens=8192,
                response_format={"type": "json_object"},
            )

            # If truncated, retry with conciseness instruction
            if resp.choices[0].finish_reason == "length":
                messages = [
                    ChatMessage(role="system", content=_CONCISE_SYSTEM),
                    ChatMessage(role="user", content=prompt),
                ]
                resp = await client.chat(
                    messages,
                    model="deepseek-chat",
                    temperature=0.2,
                    max_tokens=8192,
                    response_format={"type": "json_object"},
                )

        content = resp.choices[0].message.content
        result = DeepAnalysisOutput.model_validate_json(content)

        return {"analysis": result.model_dump_json()}
    except Exception as exc:
        return {"error": f"analyze failed: {exc}"}


async def persist(state: dict) -> dict:
    """Save the analysis to deep_issue_analyses table."""
    if state.get("error") or not state.get("analysis"):
        return {}

    try:
        analysis_json = state["analysis"]
        analysis = json.loads(analysis_json)
        family_member_id = state.get("family_member_id")
        trigger_issue_id = state.get("trigger_issue_id")
        user_email = state.get("user_email")
        data_snapshot = state.get("_data_snapshot", "{}")

        conn_str = _conn_str()
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
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
    builder.add_node("analyze", analyze)
    builder.add_node("persist", persist)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "analyze")
    builder.add_edge("analyze", "persist")
    builder.add_edge("persist", END)

    return builder.compile()


# Module-level graph instance for LangGraph server
graph = create_deep_analysis_graph()
