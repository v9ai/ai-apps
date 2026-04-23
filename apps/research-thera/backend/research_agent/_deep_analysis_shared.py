"""Shared building blocks for deep-analysis LangGraphs.

Both `deep_analysis_graph` (family-member + issue-triggered, writes to
`deep_issue_analyses`) and `deep_analysis_v2_graph` (polymorphic across
goal / note / journal_entry / family_member, writes to `deep_analyses`)
import from this module so the pydantic output schema, the DeepSeek
invocation, the section renderers, and the family-member SQL loader
are defined exactly once.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, field_validator

import psycopg

sys.path.insert(
    0,
    str(
        Path(__file__).resolve().parent.parent.parent.parent.parent
        / "pypackages"
        / "deepseek"
        / "src"
    ),
)
from deepseek_client import DeepSeekClient, ChatMessage, DeepSeekConfig  # noqa: E402


ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output "
    "must be written in natural, fluent Romanian. Do not translate proper nouns, "
    "people's names, or citation identifiers."
)


def conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


# ── Pydantic output schema ────────────────────────────────────────────────

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


CONCISE_SYSTEM = (
    "CRITICAL: Your JSON response MUST fit within 8000 tokens. "
    "Use brief descriptions (1-2 sentences max per field). "
    "Limit patternClusters to 3, familySystemInsights to 3, "
    "priorityRecommendations to 4, parentAdvice to 3 items. "
    "Keep concreteSteps to 2-3 per advice item. Be concise."
)


# ── DeepSeek invocation ──────────────────────────────────────────────────


async def analyze(state: dict) -> dict:
    """Call DeepSeek with structured output; retry concisely if truncated."""
    if state.get("error"):
        return {}
    try:
        prompt = state.get("_prompt", "")
        async with DeepSeekClient(DeepSeekConfig(timeout=300.0)) as client:
            messages = [ChatMessage(role="user", content=prompt)]
            resp = await client.chat(
                messages,
                model="deepseek-chat",
                temperature=0.3,
                max_tokens=8192,
                response_format={"type": "json_object"},
            )
            if resp.choices[0].finish_reason == "length":
                messages = [
                    ChatMessage(role="system", content=CONCISE_SYSTEM),
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


# ── Section renderers (pure: rows → markdown chunk) ──────────────────────


def render_issues_section(issues: list, header: str) -> str:
    if not issues:
        return f"{header}\nNone"
    lines = []
    for row in issues[:30]:
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
        lines.append(line)
    return f"{header}\n" + "\n".join(lines)


def render_observations_section(rows: list) -> Optional[str]:
    if not rows:
        return None
    lines = []
    for row in rows:
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
        lines.append(line)
    return f"## Behavior Observations ({len(rows)})\n" + "\n".join(lines)


def render_journals_section(rows: list) -> Optional[str]:
    if not rows:
        return None
    lines = []
    for row in rows:
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
        lines.append(line)
    return f"## Journal Entries ({len(rows)})\n" + "\n".join(lines)


def render_teacher_feedbacks_section(rows: list) -> Optional[str]:
    if not rows:
        return None
    lines = []
    for row in rows:
        tf_date, tf_name, tf_subj, tf_content, tf_tags = row
        line = f"- {tf_date} from {tf_name}"
        if tf_subj:
            line += f" ({tf_subj})"
        line += f"\n  {(tf_content or '')[:500]}"
        lines.append(line)
    return f"## Teacher Feedbacks ({len(rows)})\n" + "\n".join(lines)


def render_contact_feedbacks_section(rows: list) -> Optional[str]:
    if not rows:
        return None
    lines = []
    for row in rows:
        cf_date, cf_subj, cf_content, cf_tags = row
        line = f"- {cf_date}"
        if cf_subj:
            line += f" ({cf_subj})"
        line += f"\n  {(cf_content or '')[:500]}"
        lines.append(line)
    return f"## Contact Feedbacks ({len(rows)})\n" + "\n".join(lines)


def render_related_member_issues_section(rows: list) -> Optional[str]:
    if not rows:
        return None
    lines = []
    for row in rows:
        ri_id, ri_title, ri_cat, ri_sev, ri_desc, ri_fm_id, ri_fm_name = row
        line = f'- [ID:{ri_id}] "{ri_title}" ({ri_cat}, {ri_sev}) — primary: {ri_fm_name or f"member #{ri_fm_id}"} [ID:{ri_fm_id}]'
        if ri_desc:
            line += f"\n  {ri_desc[:300]}"
        lines.append(line)
    return (
        f"## Issues From Other Family Members Referencing This Person ({len(rows)})\n"
        + "\n".join(lines)
    )


def render_research_section(rows: list) -> Optional[str]:
    if not rows:
        return None
    lines = []
    for row in rows:
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
        lines.append(line)
    return f"## Existing Research ({len(rows)})\n" + "\n".join(lines)


def render_family_members_section(rows: list, exclude_id: Optional[int] = None) -> Optional[str]:
    others = [m for m in rows if exclude_id is None or m[0] != exclude_id]
    if not others:
        return None
    lines = []
    for row in others:
        m_id, m_first, m_name, m_age, m_rel = row
        line = f"- [ID:{m_id}] {m_first}"
        if m_name:
            line += f" {m_name}"
        if m_age:
            line += f", age {m_age}"
        if m_rel:
            line += f" ({m_rel})"
        lines.append(line)
    return "## Other Family Members\n" + "\n".join(lines)


def render_issue_contacts_section(rows: list) -> Optional[str]:
    """rows: (issue_id, contact_id, first_name, last_name, role, age, notes)."""
    if not rows:
        return None
    seen: dict[int, tuple] = {}
    issue_map: dict[int, list[int]] = {}
    for row in rows:
        ic_issue_id, c_id, c_first, c_last, c_role, c_age, c_notes = row
        seen[c_id] = (c_first, c_last, c_role, c_age, c_notes)
        issue_map.setdefault(c_id, []).append(ic_issue_id)
    lines = []
    for c_id, (c_first, c_last, c_role, c_age, c_notes) in seen.items():
        line = f"- {c_first}"
        if c_last:
            line += f" {c_last}"
        if c_role:
            line += f" ({c_role})"
        if c_age:
            line += f", age {c_age}"
        issues_str = ", ".join(f"#{iid}" for iid in issue_map[c_id])
        line += f" — mentioned in issues: {issues_str}"
        if c_notes:
            line += f" | {c_notes[:200]}"
        lines.append(line)
    return (
        "## Related Contacts (Non-Family)\n"
        "These are people mentioned in the issues above who are NOT family members. "
        "Use their roles to understand the social context of each incident.\n"
        + "\n".join(lines)
    )


def render_family_member_profile(
    first_name: str,
    name: Optional[str],
    age_years: Optional[int],
    relationship: Optional[str],
    bio: Optional[str],
) -> str:
    parts = [f"Name: {first_name}" + (f" {name}" if name else "")]
    if age_years:
        parts.append(f"Age: {age_years}")
    if relationship:
        parts.append(f"Relationship: {relationship}")
    if bio:
        parts.append(f"Bio: {bio[:500]}")
    return "## Family Member Profile\n" + "\n".join(parts)


# ── SQL loader: family-member full context ──────────────────────────────


async def load_family_member_full_context(cur, family_member_id: int, user_email: str) -> dict:
    """Load every row the deep-analysis prompt needs for a family member.

    Returns a dict with keys: fm (tuple), issues, observations, journals,
    teacher_fbs, contact_fbs, related_issues, research, issue_contacts, all_members.
    Raises if the family_member is not found.
    """
    await cur.execute(
        "SELECT id, first_name, name, age_years, relationship, bio FROM family_members WHERE id = %s",
        (family_member_id,),
    )
    fm_row = await cur.fetchone()
    if not fm_row:
        raise ValueError(f"Family member {family_member_id} not found")

    await cur.execute(
        "SELECT id, title, category, severity, description, recommendations, related_family_member_id, created_at "
        "FROM issues WHERE family_member_id = %s AND user_id = %s ORDER BY created_at DESC",
        (family_member_id, user_email),
    )
    issues = await cur.fetchall()

    await cur.execute(
        "SELECT observed_at, observation_type, frequency, intensity, context, notes "
        "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s ORDER BY observed_at DESC LIMIT 30",
        (family_member_id, user_email),
    )
    observations = await cur.fetchall()

    await cur.execute(
        "SELECT entry_date, mood, mood_score, tags, content "
        "FROM journal_entries WHERE family_member_id = %s AND user_id = %s ORDER BY entry_date DESC LIMIT 20",
        (family_member_id, user_email),
    )
    journals = await cur.fetchall()

    await cur.execute(
        "SELECT feedback_date, teacher_name, subject, content, tags "
        "FROM teacher_feedbacks WHERE family_member_id = %s AND user_id = %s ORDER BY feedback_date DESC LIMIT 15",
        (family_member_id, user_email),
    )
    teacher_fbs = await cur.fetchall()

    await cur.execute(
        "SELECT feedback_date, subject, content, tags "
        "FROM contact_feedbacks WHERE family_member_id = %s AND user_id = %s ORDER BY feedback_date DESC LIMIT 15",
        (family_member_id, user_email),
    )
    contact_fbs = await cur.fetchall()

    await cur.execute(
        "SELECT i.id, i.title, i.category, i.severity, i.description, i.family_member_id, fm.first_name "
        "FROM issues i LEFT JOIN family_members fm ON fm.id = i.family_member_id "
        "WHERE i.related_family_member_id = %s AND i.user_id = %s ORDER BY i.created_at DESC LIMIT 15",
        (family_member_id, user_email),
    )
    related_issues = await cur.fetchall()

    issue_ids = [row[0] for row in issues]
    research: list = []
    if issue_ids:
        placeholders = ",".join(["%s"] * len(issue_ids))
        await cur.execute(
            f"SELECT id, issue_id, title, key_findings, therapeutic_techniques, evidence_level "
            f"FROM therapy_research WHERE issue_id IN ({placeholders}) ORDER BY relevance_score DESC LIMIT 20",
            issue_ids,
        )
        research = await cur.fetchall()

    issue_contacts: list = []
    if issue_ids:
        placeholders = ",".join(["%s"] * len(issue_ids))
        await cur.execute(
            f"SELECT DISTINCT ic.issue_id, c.id, c.first_name, c.last_name, c.role, c.age_years, c.notes "
            f"FROM issue_contacts ic JOIN contacts c ON c.id = ic.contact_id "
            f"WHERE ic.issue_id IN ({placeholders}) AND ic.user_id = %s",
            [*issue_ids, user_email],
        )
        issue_contacts = await cur.fetchall()

    await cur.execute(
        "SELECT id, first_name, name, age_years, relationship FROM family_members WHERE user_id = %s",
        (user_email,),
    )
    all_members = await cur.fetchall()

    return {
        "fm": fm_row,
        "issues": issues,
        "observations": observations,
        "journals": journals,
        "teacher_fbs": teacher_fbs,
        "contact_fbs": contact_fbs,
        "related_issues": related_issues,
        "research": research,
        "issue_contacts": issue_contacts,
        "all_members": all_members,
    }


def data_snapshot_from_family_context(ctx: dict) -> str:
    """Serialize the data-snapshot counts in the shape the GraphQL DataSnapshot type expects."""
    return json.dumps({
        "issueCount": len(ctx.get("issues", [])),
        "observationCount": len(ctx.get("observations", [])),
        "journalEntryCount": len(ctx.get("journals", [])),
        "contactFeedbackCount": len(ctx.get("contact_fbs", [])),
        "teacherFeedbackCount": len(ctx.get("teacher_fbs", [])),
        "researchPaperCount": len(ctx.get("research", [])),
        "relatedMemberIssueCount": len(ctx.get("related_issues", [])),
        "issueContactCount": len(ctx.get("issue_contacts", [])),
    })


# ── Shared output instructions block ────────────────────────────────────


OUTPUT_FIELD_SPEC = """Produce a structured JSON analysis with these fields:

1. **summary** (string): 2-3 paragraph executive summary for a parent/caregiver.
2. **patternClusters** (array of objects): Related issue groups. Each has: name (string), description (string), issueIds (array of ints), issueTitles (array of strings), categories (array of strings), pattern (string: recurring|escalating|co-occurring|seasonal|triggered), confidence (float 0-1), suggestedRootCause (optional string).
3. **timelineAnalysis** (object): phases (array of objects: {period (string), issueIds (array of ints), description (string), moodTrend (string: declining|improving|stable|volatile), keyEvents (array of strings)}), moodCorrelation (optional string), escalationTrend (string: improving|worsening|stable|cyclical), criticalPeriods (array of strings).
4. **familySystemInsights** (array of objects): {insight (string), involvedMemberIds (array of ints), involvedMemberNames (array of strings), evidenceIssueIds (array of ints), systemicPattern (optional string), actionable (bool)}.
5. **priorityRecommendations** (array of objects): {rank (int), issueId (optional int), issueTitle (optional string), rationale (string), urgency (string: immediate|short_term|long_term), suggestedApproach (string), relatedResearchIds (optional array of ints)}.
6. **researchRelevance** (array of objects): {patternClusterName (string), relevantResearchIds (array of ints), relevantResearchTitles (array of strings), coverageGaps (array of strings)}.
7. **parentAdvice** (array of objects): Practical, evidence-based parenting advice linked to the analysis above. Generate 3-7 items, prioritized by urgency. Each has: title (string), advice (string: 2-4 sentences explaining the recommendation with research context), targetIssueIds (array of ints from the issues above), targetIssueTitles (array of strings), relatedPatternCluster (optional string — MUST match a patternClusters[].name from section 2 if provided), relatedResearchIds (optional array of ints from ## Existing Research), relatedResearchTitles (optional array of strings — exact titles from research), ageAppropriate (bool: true if suitable for the child's age in ## Family Member Profile), developmentalContext (optional string: why this advice fits the child's developmental stage), priority (string: immediate|short_term|long_term), concreteSteps (array of strings: specific actionable steps the parent can implement at home — be specific, e.g. "Set a 20-minute homework timer after snack" not "Help with homework"). If research is available, cite specific ResearchIDs — do NOT invent research references.

IMPORTANT: Every field annotated as "array of" MUST be a JSON array, even when there is only one item. For example: coverageGaps must be ["single gap"], NOT "single gap".

Write the analysis in the same language as the majority of the input data."""
