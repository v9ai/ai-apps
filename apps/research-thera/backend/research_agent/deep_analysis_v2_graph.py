"""Polymorphic deep-analysis LangGraph.

Handles GOAL / NOTE / JOURNAL_ENTRY / FAMILY_MEMBER subjects. Writes to
`deep_analyses` (not `deep_issue_analyses`). Delegates to
`_deep_analysis_shared` for pydantic models, the DeepSeek call, and section
renderers, so the output schema and tuning stay in lock-step with the
legacy `deep_analysis` graph.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, TypedDict

import psycopg
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from . import _deep_analysis_shared as shared  # noqa: E402


class DeepAnalysisV2State(TypedDict, total=False):
    subject_type: str  # "goal" | "note" | "journal_entry" | "family_member"
    subject_id: int
    trigger_type: Optional[str]  # "issue" | "observation" | "feedback" | None
    trigger_id: Optional[int]
    user_email: str
    language: str  # "en" | "ro"
    # Internal
    _prompt: str
    _data_snapshot: str
    _subject_label: str
    # Output
    analysis: str
    analysis_id: int
    error: str


# ── Subject collectors ────────────────────────────────────────────────


async def _collect_for_goal(
    cur,
    subject_id: int,
    user_email: str,
    language: str,
) -> dict:
    await cur.execute(
        "SELECT id, family_member_id, title, description, target_date, status, priority, "
        "therapeutic_text, tags, parent_goal_id FROM goals WHERE id = %s AND user_id = %s",
        (subject_id, user_email),
    )
    goal = await cur.fetchone()
    if not goal:
        raise ValueError(f"Goal {subject_id} not found")
    (
        g_id,
        g_fm_id,
        g_title,
        g_desc,
        g_target,
        g_status,
        g_priority,
        g_therapeutic,
        g_tags,
        g_parent_goal_id,
    ) = goal

    # Related issues for the owning family member (issues don't have goal_id)
    issues: list = []
    behavior_observations: list = []
    journal_entries: list = []
    therapy_research: list = []
    fm_row = None
    all_members: list = []

    fm_loc: Optional[str] = None
    if g_fm_id:
        await cur.execute(
            "SELECT id, first_name, name, age_years, relationship, bio, location FROM family_members WHERE id = %s",
            (g_fm_id,),
        )
        fm_row = await cur.fetchone()
        if fm_row:
            fm_loc = fm_row[6]
        await cur.execute(
            "SELECT id, title, category, severity, description, recommendations, related_family_member_id, created_at "
            "FROM issues WHERE family_member_id = %s AND user_id = %s ORDER BY created_at DESC LIMIT 30",
            (g_fm_id, user_email),
        )
        issues = await cur.fetchall()
        await cur.execute(
            "SELECT id, first_name, name, age_years, relationship, location FROM family_members WHERE user_id = %s",
            (user_email,),
        )
        all_members = await cur.fetchall()

    # Household members — other family members living at the same location
    # as the goal's owner. Excludes Ludmila (Criuleni) when goal is Vadim's
    # (Brașov). Skipped if goal has no family_member or fm has no location.
    household_members: list = []
    if g_fm_id and fm_loc:
        await cur.execute(
            "SELECT id, first_name, name, age_years, relationship, bio, location "
            "FROM family_members "
            "WHERE user_id = %s AND location = %s AND id != %s "
            "ORDER BY id",
            (user_email, fm_loc, g_fm_id),
        )
        household_members = await cur.fetchall()

    household_context: list[dict] = []
    for hm in household_members:
        hm_id = hm[0]
        await cur.execute(
            "SELECT id, title, category, severity, description, recommendations, related_family_member_id, created_at "
            "FROM issues WHERE family_member_id = %s AND user_id = %s ORDER BY created_at DESC LIMIT 15",
            (hm_id, user_email),
        )
        hm_issues = await cur.fetchall()
        await cur.execute(
            "SELECT observed_at, observation_type, frequency, intensity, context, notes "
            "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s ORDER BY observed_at DESC LIMIT 10",
            (hm_id, user_email),
        )
        hm_obs = await cur.fetchall()
        await cur.execute(
            "SELECT entry_date, mood, mood_score, tags, content "
            "FROM journal_entries WHERE family_member_id = %s AND user_id = %s ORDER BY entry_date DESC LIMIT 10",
            (hm_id, user_email),
        )
        hm_journals = await cur.fetchall()
        await cur.execute(
            "SELECT feedback_date, teacher_name, subject, content, tags "
            "FROM teacher_feedbacks WHERE family_member_id = %s AND user_id = %s ORDER BY feedback_date DESC LIMIT 8",
            (hm_id, user_email),
        )
        hm_teacher = await cur.fetchall()
        await cur.execute(
            "SELECT feedback_date, subject, content, tags "
            "FROM contact_feedbacks WHERE family_member_id = %s AND user_id = %s ORDER BY feedback_date DESC LIMIT 8",
            (hm_id, user_email),
        )
        hm_contact = await cur.fetchall()
        household_context.append({
            "member": hm,
            "issues": hm_issues,
            "observations": hm_obs,
            "journals": hm_journals,
            "teacher_fbs": hm_teacher,
            "contact_fbs": hm_contact,
        })

    await cur.execute(
        "SELECT observed_at, observation_type, frequency, intensity, context, notes "
        "FROM behavior_observations WHERE goal_id = %s AND user_id = %s ORDER BY observed_at DESC LIMIT 30",
        (subject_id, user_email),
    )
    behavior_observations = await cur.fetchall()

    await cur.execute(
        "SELECT entry_date, mood, mood_score, tags, content "
        "FROM journal_entries WHERE goal_id = %s AND user_id = %s ORDER BY entry_date DESC LIMIT 20",
        (subject_id, user_email),
    )
    journal_entries = await cur.fetchall()

    await cur.execute(
        "SELECT id, issue_id, title, key_findings, therapeutic_techniques, evidence_level "
        "FROM therapy_research WHERE goal_id = %s ORDER BY relevance_score DESC NULLS LAST LIMIT 20",
        (subject_id,),
    )
    therapy_research = await cur.fetchall()

    # Build prompt ---------------------------------------------------------------
    sections: list[str] = []
    sections.append(
        "You are a clinical psychologist and family systems analyst. Your task is to "
        "analyze a specific GOAL — identify patterns, systemic dynamics, research "
        "relevance, and produce practical parent-facing advice that advances this goal.\n\n"
        "When the goal concerns the household (a shared home, routine, environment, or "
        "activity involving multiple cohabiting members), the `## Household Member Context` "
        "section is primary clinical data — not background. Center analysis and advice on "
        "the members whose clinical patterns most directly intersect the goal.\n\n"
        "CRITICAL — ATTRIBUTION RULES:\n"
        "- For each issue/observation, read the text to identify WHO is the primary actor, "
        "victim, or bystander. The profiled family member may be a victim.\n"
        "- People mentioned who are NOT listed in ## Other Family Members or ## Household "
        "Member Context are external individuals (classmates, colleagues, etc.).\n\n"
        "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that "
        "appear in the data below."
    )

    goal_profile = [f'Title: "{g_title}"']
    if g_desc:
        goal_profile.append(f"Description: {g_desc[:500]}")
    if g_status:
        goal_profile.append(f"Status: {g_status}")
    if g_priority:
        goal_profile.append(f"Priority: {g_priority}")
    if g_target:
        goal_profile.append(f"Target date: {g_target}")
    if g_tags:
        try:
            tags = json.loads(g_tags) if isinstance(g_tags, str) else g_tags
            if tags:
                goal_profile.append(f"Tags: {', '.join(tags)}")
        except Exception:
            pass
    if g_therapeutic:
        goal_profile.append(f"Existing therapeutic framing: {g_therapeutic[:500]}")
    sections.append("## Goal Profile\n" + "\n".join(goal_profile))

    if fm_row:
        fm_id, fm_first, fm_name, fm_age, fm_rel, fm_bio, fm_loc = fm_row
        sections.append(
            shared.render_family_member_profile(fm_first, fm_name, fm_age, fm_rel, fm_bio, fm_loc)
        )

    role_note = (
        "\n(Note: The profiled family member may be subject, victim, or bystander. "
        "Determine their role from each description.)\n"
    )
    issues_chunk = shared.render_issues_section(
        issues, f"## Related Issues ({len(issues)}){role_note}"
    )
    if issues_chunk:
        sections.append(issues_chunk)

    obs_chunk = shared.render_observations_section(behavior_observations)
    if obs_chunk:
        sections.append(obs_chunk)

    journals_chunk = shared.render_journals_section(journal_entries)
    if journals_chunk:
        sections.append(journals_chunk)

    research_chunk = shared.render_research_section(therapy_research)
    if research_chunk:
        sections.append(research_chunk)

    if household_context:
        hh_lines: list[str] = [
            "## Household Member Context",
            "These family members live in the same household as the goal owner. When the "
            "goal concerns the household (e.g. a shared home, routine, or environment), "
            "their issues, observations, and feedback are PRIMARY context — weigh them "
            "heavily in your analysis, not as a footnote.",
        ]
        for hc in household_context:
            hm_id, hm_first, hm_name, hm_age, hm_rel, hm_bio, _hm_loc = hc["member"]
            header = f"### {hm_first}" + (f" {hm_name}" if hm_name else "") + f" [ID:{hm_id}]"
            if hm_age:
                header += f", age {hm_age}"
            if hm_rel:
                header += f" ({hm_rel})"
            hh_lines.append(header)
            if hm_bio:
                hh_lines.append(f"Bio: {hm_bio[:300]}")
            if hc["issues"]:
                chunk = shared.render_issues_section(
                    hc["issues"],
                    f"#### Issues for {hm_first} ({len(hc['issues'])})",
                )
                hh_lines.append(chunk)
            obs = shared.render_observations_section(hc["observations"])
            if obs:
                hh_lines.append(
                    obs.replace(
                        "## Behavior Observations", f"#### Observations for {hm_first}"
                    )
                )
            jrn = shared.render_journals_section(hc["journals"])
            if jrn:
                hh_lines.append(
                    jrn.replace(
                        "## Journal Entries", f"#### Journal Entries for {hm_first}"
                    )
                )
            tch = shared.render_teacher_feedbacks_section(hc["teacher_fbs"])
            if tch:
                hh_lines.append(
                    tch.replace(
                        "## Teacher Feedbacks", f"#### Teacher Feedbacks for {hm_first}"
                    )
                )
            cct = shared.render_contact_feedbacks_section(hc["contact_fbs"])
            if cct:
                hh_lines.append(
                    cct.replace(
                        "## Contact Feedbacks", f"#### Contact Feedbacks for {hm_first}"
                    )
                )
        sections.append("\n".join(hh_lines))

    members_chunk = shared.render_family_members_section(all_members, exclude_id=g_fm_id)
    if members_chunk:
        sections.append(members_chunk)

    sections.append(
        "## Instructions\n"
        "Analyze the data above focused on the goal. " + shared.OUTPUT_FIELD_SPEC
    )

    if language == "ro":
        sections.insert(0, shared.ROMANIAN_INSTRUCTION)

    prompt = "\n\n".join(sections)
    hh_issue_count = sum(len(hc["issues"]) for hc in household_context)
    hh_obs_count = sum(len(hc["observations"]) for hc in household_context)
    hh_journal_count = sum(len(hc["journals"]) for hc in household_context)
    hh_contact_count = sum(len(hc["contact_fbs"]) for hc in household_context)
    hh_teacher_count = sum(len(hc["teacher_fbs"]) for hc in household_context)
    data_snapshot = json.dumps({
        "issueCount": len(issues) + hh_issue_count,
        "observationCount": len(behavior_observations) + hh_obs_count,
        "journalEntryCount": len(journal_entries) + hh_journal_count,
        "contactFeedbackCount": hh_contact_count,
        "teacherFeedbackCount": hh_teacher_count,
        "researchPaperCount": len(therapy_research),
        "relatedMemberIssueCount": hh_issue_count,
        "issueContactCount": 0,
    })

    return {"_prompt": prompt, "_data_snapshot": data_snapshot, "_subject_label": g_title}


async def _collect_for_note(
    cur,
    subject_id: int,
    user_email: str,
    language: str,
) -> dict:
    await cur.execute(
        "SELECT id, title, content, entity_type, entity_id, tags, created_at "
        "FROM notes WHERE id = %s AND user_id = %s",
        (subject_id, user_email),
    )
    note = await cur.fetchone()
    if not note:
        raise ValueError(f"Note {subject_id} not found")
    n_id, n_title, n_content, n_entity_type, n_entity_id, n_tags, n_created = note

    await cur.execute(
        "SELECT id, claim, stance, confidence FROM notes_claims WHERE note_id = %s",
        (subject_id,),
    )
    claims = await cur.fetchall()

    await cur.execute(
        "SELECT tr.id, tr.issue_id, tr.title, tr.key_findings, tr.therapeutic_techniques, tr.evidence_level "
        "FROM notes_research nr JOIN therapy_research tr ON tr.id = nr.research_id "
        "WHERE nr.note_id = %s ORDER BY tr.relevance_score DESC NULLS LAST LIMIT 20",
        (subject_id,),
    )
    research = await cur.fetchall()

    # Parent entity context
    parent_label = None
    parent_text = None
    if n_entity_type == "Goal" and n_entity_id:
        await cur.execute(
            "SELECT title, description FROM goals WHERE id = %s AND user_id = %s",
            (n_entity_id, user_email),
        )
        row = await cur.fetchone()
        if row:
            parent_label = f'Goal "{row[0]}"'
            parent_text = row[1]
    elif n_entity_type == "FamilyMember" and n_entity_id:
        await cur.execute(
            "SELECT first_name, bio FROM family_members WHERE id = %s",
            (n_entity_id,),
        )
        row = await cur.fetchone()
        if row:
            parent_label = f"Family member {row[0]}"
            parent_text = row[1]

    sections: list[str] = []
    sections.append(
        "You are a clinical psychologist and family systems analyst. Analyze the NOTE "
        "below and the claims extracted from it, in the context of its parent entity "
        "and linked research. Produce patterns, insights, and practical advice.\n\n"
        "IMPORTANT: Only reference research IDs that appear in the data below."
    )

    note_section = [f'Title: {n_title or "(untitled)"}']
    if n_tags:
        try:
            tags = json.loads(n_tags) if isinstance(n_tags, str) else n_tags
            if tags:
                note_section.append(f"Tags: {', '.join(tags)}")
        except Exception:
            pass
    note_section.append(f"Content:\n{(n_content or '')[:2000]}")
    sections.append("## Note\n" + "\n".join(note_section))

    if parent_label:
        p = [f"Parent entity: {parent_label}"]
        if parent_text:
            p.append(f"Context: {parent_text[:500]}")
        sections.append("## Parent Entity\n" + "\n".join(p))

    if claims:
        c_lines = []
        for c_id, c_claim, c_stance, c_conf in claims:
            line = f"- [ClaimID:{c_id}] "
            if c_stance:
                line += f"({c_stance}) "
            line += (c_claim or "")[:300]
            if c_conf is not None:
                line += f" [confidence {c_conf}]"
            c_lines.append(line)
        sections.append(f"## Claims Extracted ({len(claims)})\n" + "\n".join(c_lines))

    research_chunk = shared.render_research_section(research)
    if research_chunk:
        sections.append(research_chunk)

    sections.append("## Instructions\n" + shared.OUTPUT_FIELD_SPEC)

    if language == "ro":
        sections.insert(0, shared.ROMANIAN_INSTRUCTION)

    prompt = "\n\n".join(sections)
    data_snapshot = json.dumps({
        "issueCount": 0,
        "observationCount": 0,
        "journalEntryCount": 0,
        "contactFeedbackCount": 0,
        "teacherFeedbackCount": 0,
        "researchPaperCount": len(research),
        "relatedMemberIssueCount": 0,
        "issueContactCount": 0,
    })
    return {"_prompt": prompt, "_data_snapshot": data_snapshot, "_subject_label": n_title or f"Note #{n_id}"}


async def _collect_for_journal_entry(
    cur,
    subject_id: int,
    user_email: str,
    language: str,
) -> dict:
    await cur.execute(
        "SELECT id, family_member_id, goal_id, entry_date, mood, mood_score, tags, content "
        "FROM journal_entries WHERE id = %s AND user_id = %s",
        (subject_id, user_email),
    )
    entry = await cur.fetchone()
    if not entry:
        raise ValueError(f"Journal entry {subject_id} not found")
    (
        j_id,
        j_fm_id,
        j_goal_id,
        j_date,
        j_mood,
        j_score,
        j_tags,
        j_content,
    ) = entry

    # Nearby entries (± 30 days, same family member if any)
    nearby: list = []
    if j_fm_id:
        await cur.execute(
            "SELECT entry_date, mood, mood_score, tags, content "
            "FROM journal_entries WHERE family_member_id = %s AND user_id = %s AND id != %s "
            "AND entry_date BETWEEN (%s::date - INTERVAL '30 days')::text AND (%s::date + INTERVAL '30 days')::text "
            "ORDER BY entry_date DESC LIMIT 15",
            (j_fm_id, user_email, subject_id, j_date, j_date),
        )
        nearby = await cur.fetchall()

    fm_row = None
    fm_issues: list = []
    all_members: list = []
    if j_fm_id:
        await cur.execute(
            "SELECT id, first_name, name, age_years, relationship, bio, location FROM family_members WHERE id = %s",
            (j_fm_id,),
        )
        fm_row = await cur.fetchone()
        await cur.execute(
            "SELECT id, title, category, severity, description, recommendations, related_family_member_id, created_at "
            "FROM issues WHERE family_member_id = %s AND user_id = %s ORDER BY created_at DESC LIMIT 20",
            (j_fm_id, user_email),
        )
        fm_issues = await cur.fetchall()
        await cur.execute(
            "SELECT id, first_name, name, age_years, relationship, location FROM family_members WHERE user_id = %s",
            (user_email,),
        )
        all_members = await cur.fetchall()

    sections: list[str] = []
    sections.append(
        "You are a clinical psychologist and family systems analyst. Analyze the JOURNAL "
        "ENTRY below along with nearby entries, any related issues for the family member, "
        "and produce patterns, systemic insights, and practical advice.\n\n"
        "IMPORTANT: Only reference issue IDs and family member IDs that appear below."
    )

    entry_section = [f"Date: {j_date}"]
    if j_mood:
        entry_section.append(f"Mood: {j_mood}" + (f" ({j_score}/10)" if j_score is not None else ""))
    if j_tags:
        try:
            tags = json.loads(j_tags) if isinstance(j_tags, str) else j_tags
            if tags:
                entry_section.append(f"Tags: {', '.join(tags)}")
        except Exception:
            pass
    entry_section.append(f"Content:\n{(j_content or '')[:2000]}")
    sections.append("## Journal Entry (Primary Focus)\n" + "\n".join(entry_section))

    if fm_row:
        fm_id, fm_first, fm_name, fm_age, fm_rel, fm_bio, fm_loc = fm_row
        sections.append(shared.render_family_member_profile(fm_first, fm_name, fm_age, fm_rel, fm_bio, fm_loc))

    nearby_chunk = shared.render_journals_section(nearby)
    if nearby_chunk:
        sections.append(nearby_chunk.replace("## Journal Entries", "## Nearby Journal Entries (±30d)"))

    issues_chunk = shared.render_issues_section(fm_issues, f"## Related Issues ({len(fm_issues)})")
    if fm_issues:
        sections.append(issues_chunk)

    members_chunk = shared.render_family_members_section(all_members, exclude_id=j_fm_id)
    if members_chunk:
        sections.append(members_chunk)

    sections.append("## Instructions\n" + shared.OUTPUT_FIELD_SPEC)

    if language == "ro":
        sections.insert(0, shared.ROMANIAN_INSTRUCTION)

    prompt = "\n\n".join(sections)
    data_snapshot = json.dumps({
        "issueCount": len(fm_issues),
        "observationCount": 0,
        "journalEntryCount": len(nearby) + 1,
        "contactFeedbackCount": 0,
        "teacherFeedbackCount": 0,
        "researchPaperCount": 0,
        "relatedMemberIssueCount": 0,
        "issueContactCount": 0,
    })
    return {"_prompt": prompt, "_data_snapshot": data_snapshot, "_subject_label": f"Entry {j_date}"}


async def _collect_for_family_member(
    cur,
    subject_id: int,
    user_email: str,
    language: str,
) -> dict:
    ctx = await shared.load_family_member_full_context(cur, subject_id, user_email)
    fm_id, fm_first, fm_name, fm_age, fm_rel, fm_bio, fm_loc = ctx["fm"]

    sections: list[str] = []
    sections.append(
        "You are a clinical psychologist and family systems analyst. Analyze the complete "
        "history of issues, observations, journal entries, and feedback involving this "
        "family member to identify patterns, systemic dynamics, and priorities.\n\n"
        "CRITICAL — ATTRIBUTION RULES:\n"
        "- For each issue, carefully read the description to identify WHO is the primary "
        "actor/aggressor, WHO is the victim or recipient, and WHO are bystanders.\n"
        "- The profiled family member may be the VICTIM, not the actor. Do NOT assume they "
        "caused the behavior described.\n"
        "- People mentioned in descriptions who are NOT listed in ## Other Family Members "
        "are external individuals (classmates, school colleagues, neighbors, etc.).\n\n"
        "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that appear in the data below."
    )
    sections.append(shared.render_family_member_profile(fm_first, fm_name, fm_age, fm_rel, fm_bio, fm_loc))

    role_note = (
        "\n(Note: The profiled family member may be subject, victim, or bystander in these "
        "incidents. Determine their role from each description.)\n"
    )
    sections.append(
        shared.render_issues_section(
            ctx["issues"], f"## All Issues ({len(ctx['issues'])}){role_note}"
        )
    )
    for renderer, rows in [
        (shared.render_observations_section, ctx["observations"]),
        (shared.render_journals_section, ctx["journals"]),
        (shared.render_teacher_feedbacks_section, ctx["teacher_fbs"]),
        (shared.render_contact_feedbacks_section, ctx["contact_fbs"]),
        (shared.render_related_member_issues_section, ctx["related_issues"]),
        (shared.render_research_section, ctx["research"]),
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

    sections.append("## Instructions\n" + shared.OUTPUT_FIELD_SPEC)
    if language == "ro":
        sections.insert(0, shared.ROMANIAN_INSTRUCTION)

    prompt = "\n\n".join(sections)
    data_snapshot = shared.data_snapshot_from_family_context(ctx)
    return {"_prompt": prompt, "_data_snapshot": data_snapshot, "_subject_label": fm_first}


# ── Graph nodes ────────────────────────────────────────────────────────


async def collect_data(state: DeepAnalysisV2State) -> dict:
    subject_type = state.get("subject_type")
    subject_id = state.get("subject_id")
    user_email = state.get("user_email")
    language = state.get("language") or "en"
    if not subject_type or not subject_id or not user_email:
        return {"error": "subject_type, subject_id, and user_email are required"}

    try:
        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                if subject_type == "goal":
                    return await _collect_for_goal(cur, subject_id, user_email, language)
                if subject_type == "note":
                    return await _collect_for_note(cur, subject_id, user_email, language)
                if subject_type == "journal_entry":
                    return await _collect_for_journal_entry(cur, subject_id, user_email, language)
                if subject_type == "family_member":
                    return await _collect_for_family_member(cur, subject_id, user_email, language)
                return {"error": f"Unsupported subject_type: {subject_type}"}
    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}


async def persist(state: dict) -> dict:
    if state.get("error") or not state.get("analysis"):
        return {}
    try:
        analysis = json.loads(state["analysis"])
        subject_type = (state.get("subject_type") or "").upper()
        subject_id = state.get("subject_id")
        trigger_type = state.get("trigger_type")
        trigger_id = state.get("trigger_id")
        user_email = state.get("user_email")
        data_snapshot = state.get("_data_snapshot", "{}")

        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO deep_analyses "
                    "(subject_type, subject_id, trigger_type, trigger_id, user_id, "
                    "summary, pattern_clusters, timeline_analysis, family_system_insights, "
                    "priority_recommendations, research_relevance, parent_advice, data_snapshot, model, created_at, updated_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id",
                    (
                        subject_type,
                        subject_id,
                        trigger_type.upper() if trigger_type else None,
                        trigger_id,
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


def create_deep_analysis_v2_graph():
    builder = StateGraph(DeepAnalysisV2State)
    builder.add_node("collect_data", collect_data)
    builder.add_node("analyze", shared.analyze)
    builder.add_node("persist", persist)
    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "analyze")
    builder.add_edge("analyze", "persist")
    builder.add_edge("persist", END)
    return builder.compile()


graph = create_deep_analysis_v2_graph()
