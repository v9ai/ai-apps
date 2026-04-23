"""LangGraph routine-analysis graph — dedicated deep analysis for the
`/routines/[slug]` page.

Given a family member, loads their active habits + recent `habit_logs`,
computes per-habit adherence/streak stats, asks DeepSeek to produce a
structured routine analysis (adherence patterns, balance, gaps, optimization
suggestions), and persists the result to `routine_analyses`.
"""
from __future__ import annotations

import json
import os
import re
import sys
from collections import Counter
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Optional, TypedDict

import psycopg
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field, field_validator

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(
    0,
    str(
        Path(__file__).resolve().parent.parent.parent.parent.parent
        / "pypackages"
        / "deepseek"
        / "src"
    ),
)
from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig  # noqa: E402

from . import _deep_analysis_shared as shared  # noqa: E402


# ── Pydantic output schema ────────────────────────────────────────────────


def _coerce_list(v):
    if isinstance(v, (str, int, float)):
        return [v]
    return v


class HabitAdherence(BaseModel):
    habitId: int
    habitTitle: str
    frequency: str  # daily | weekly
    targetCount: int
    observedCount: int
    consistency: float = Field(ge=0, le=1)
    currentStreak: int
    longestStreak: int
    missedPattern: Optional[str] = None
    interpretation: str


class RoutineBalance(BaseModel):
    domainsCovered: list[str]
    domainsMissing: list[str]
    overEmphasized: list[str]
    underEmphasized: list[str]
    verdict: str  # balanced | unbalanced | sparse | overloaded

    @field_validator(
        "domainsCovered", "domainsMissing", "overEmphasized", "underEmphasized",
        mode="before",
    )
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v) if v is not None else []


class StreakSummary(BaseModel):
    strongestHabitId: Optional[int] = None
    strongestStreak: int = 0
    weakestHabitId: Optional[int] = None
    weakestStreak: int = 0
    momentum: str  # building | fading | steady | stalled


class RoutineGap(BaseModel):
    area: str
    rationale: str
    severity: str  # low | medium | high


class RoutineOptimization(BaseModel):
    title: str
    rationale: str
    priority: str  # immediate | short_term | long_term
    changeType: str  # add | remove | modify | merge | split
    targetHabitId: Optional[int] = None
    suggestedFrequency: Optional[str] = None  # daily | weekly
    suggestedTargetCount: Optional[int] = None
    concreteSteps: list[str]
    ageAppropriate: bool = True
    developmentalContext: Optional[str] = None

    @field_validator("concreteSteps", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v) if v is not None else []


class RoutineResearchMapping(BaseModel):
    topic: str
    relevantResearchIds: list[int]
    relevantResearchTitles: list[str]
    coverageGaps: list[str]

    @field_validator(
        "relevantResearchIds", "relevantResearchTitles", "coverageGaps",
        mode="before",
    )
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v) if v is not None else []


class RoutineAnalysisOutput(BaseModel):
    summary: str
    adherencePatterns: list[HabitAdherence]
    routineBalance: RoutineBalance
    streaks: StreakSummary
    gaps: list[RoutineGap]
    optimizationSuggestions: list[RoutineOptimization]
    researchRelevance: list[RoutineResearchMapping]


CONCISE_SYSTEM = (
    "CRITICAL: Your JSON response MUST fit within 8000 tokens. "
    "Use brief descriptions (1-2 sentences max per field). "
    "Limit adherencePatterns to one entry per habit only, "
    "gaps to 3, optimizationSuggestions to 4 items. "
    "Keep concreteSteps to 2-3 per suggestion. Be concise."
)

ROUTINE_SYSTEM_PROMPT = (
    "You are a family-systems clinician and behavioral-change coach. "
    "Your job is to produce a grounded, specific, evidence-linked routine analysis. "
    "Cite specific issue IDs (e.g., [ID:42]) and journal dates (e.g., 'jurnal 2026-04-15') "
    "in every gap and optimizationSuggestion. If the data does not support a claim, say so "
    "rather than inventing. Prefer concrete, dated, named details over generic advice."
)


# ── State ─────────────────────────────────────────────────────────────────


class RoutineAnalysisState(TypedDict, total=False):
    family_member_id: int
    user_email: str
    language: str  # "en" | "ro"
    window_days: int  # default 60
    # Internal
    _prompt: str
    _data_snapshot: str  # JSON
    _family_member_name: str
    # Output
    analysis: str  # JSON
    analysis_id: int
    error: str


# ── Helpers ───────────────────────────────────────────────────────────────


def _streaks_for_daily(log_dates: set[date], today: date) -> tuple[int, int]:
    """Return (currentStreak, longestStreak) for a daily habit given logged dates."""
    if not log_dates:
        return 0, 0
    sorted_dates = sorted(log_dates)
    longest = 1
    run = 1
    for prev, curr in zip(sorted_dates, sorted_dates[1:]):
        if (curr - prev).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1
    current = 0
    cursor = today
    while cursor in log_dates:
        current += 1
        cursor -= timedelta(days=1)
    # Allow starting streak from yesterday if today not yet logged.
    if current == 0 and (today - timedelta(days=1)) in log_dates:
        cursor = today - timedelta(days=1)
        while cursor in log_dates:
            current += 1
            cursor -= timedelta(days=1)
    return current, longest


def _streaks_for_weekly(log_dates: set[date], today: date) -> tuple[int, int]:
    """Return (currentStreak, longestStreak) in weeks (ISO week buckets)."""
    if not log_dates:
        return 0, 0
    weeks = {(d.isocalendar().year, d.isocalendar().week) for d in log_dates}
    sorted_weeks = sorted(weeks)
    longest = 1
    run = 1
    for (py, pw), (cy, cw) in zip(sorted_weeks, sorted_weeks[1:]):
        prev_monday = date.fromisocalendar(py, pw, 1)
        curr_monday = date.fromisocalendar(cy, cw, 1)
        if (curr_monday - prev_monday).days == 7:
            run += 1
            longest = max(longest, run)
        else:
            run = 1
    tiso = today.isocalendar()
    current = 0
    cursor = (tiso.year, tiso.week)
    while cursor in weeks:
        current += 1
        cursor_monday = date.fromisocalendar(*cursor, 1) - timedelta(days=7)
        cursor = (cursor_monday.isocalendar().year, cursor_monday.isocalendar().week)
    return current, longest


def _missed_pattern(log_dates: set[date], window_days: int, today: date) -> Optional[str]:
    """Best-effort label for the *missed* days' weekday distribution."""
    if not log_dates or window_days <= 0:
        return None
    expected = {today - timedelta(days=i) for i in range(window_days)}
    missed = expected - log_dates
    if not missed or len(missed) == window_days:
        return None
    weekday_counts = Counter(d.weekday() for d in missed)
    total_missed = sum(weekday_counts.values())
    weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekend = {5, 6}
    weekend_missed = sum(weekday_counts[w] for w in weekend)
    if total_missed >= 4 and weekend_missed / total_missed >= 0.6:
        return "weekends"
    top_wd, top_count = weekday_counts.most_common(1)[0]
    if top_count >= 3 and top_count / total_missed >= 0.4:
        return f"mostly {weekday_names[top_wd]}s"
    return None


# Keyword match flags habits that are narrow media-scoped therapy protocols
# (parent-delivered interventions tied to a specific media moment), not
# substantive self-initiated daily behaviors. Their low adherence is a
# data-modeling artifact, not a signal of an absent routine — we mark them so
# the LLM deprioritizes them in the verdict.
_NARROW_THERAPY_RE = re.compile(
    r"\b(film|movie|movies|tv|television|televizor|televizorul|ecran|ecrane|ecranul|screen|screens|media)\b",
    re.IGNORECASE,
)


def _is_narrow_therapy_protocol(title: Optional[str], description: Optional[str]) -> bool:
    blob = f"{title or ''} {description or ''}"
    return bool(_NARROW_THERAPY_RE.search(blob))


async def collect_data(state: RoutineAnalysisState) -> dict:
    """Load habits + logs + full family-member context (issues, journals,
    observations, feedbacks, research), compute adherence, render prompt with
    issues + journals as the primary substrate."""
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    window_days = int(state.get("window_days") or 60)
    if not family_member_id or not user_email:
        return {"error": "family_member_id and user_email are required"}

    today = date.today()
    since = today - timedelta(days=window_days)

    try:
        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                # Full family-member context (issues, journals, observations,
                # feedbacks, related-member issues, research, issue_contacts,
                # all_members) — reused from the deep-analysis loader.
                ctx = await shared.load_family_member_full_context(
                    cur, family_member_id, user_email, journal_limit=50
                )
                fm_tuple = ctx["fm"]
                _fm_id, fm_first, fm_name, fm_age, fm_rel, fm_bio = fm_tuple[:6]

                # Prior deep-issue analyses for this member (systemic context).
                await cur.execute(
                    "SELECT d.created_at, d.summary, d.trigger_issue_id, i.title "
                    "FROM deep_issue_analyses d "
                    "LEFT JOIN issues i ON i.id = d.trigger_issue_id "
                    "WHERE d.family_member_id = %s AND d.user_id = %s "
                    "ORDER BY d.created_at DESC LIMIT 5",
                    (family_member_id, user_email),
                )
                prior_deep_analyses = await cur.fetchall()

                # Habits + logs (specific to the routine graph — shared
                # loader doesn't cover them).
                await cur.execute(
                    "SELECT id, title, description, frequency, target_count, "
                    "goal_id, issue_id, created_at "
                    "FROM habits "
                    "WHERE family_member_id = %s AND user_id = %s AND status = 'active' "
                    "ORDER BY frequency, created_at",
                    (family_member_id, user_email),
                )
                habit_rows = await cur.fetchall()

                habit_ids = [r[0] for r in habit_rows]
                logs_by_habit: dict[int, list[date]] = {hid: [] for hid in habit_ids}
                if habit_ids:
                    placeholders = ",".join(["%s"] * len(habit_ids))
                    await cur.execute(
                        f"SELECT habit_id, logged_date, count FROM habit_logs "
                        f"WHERE habit_id IN ({placeholders}) AND user_id = %s "
                        f"AND logged_date >= %s "
                        f"ORDER BY logged_date",
                        [*habit_ids, user_email, since.isoformat()],
                    )
                    for hid, logged_date, _count in await cur.fetchall():
                        if isinstance(logged_date, str):
                            try:
                                logged_date = date.fromisoformat(logged_date[:10])
                            except Exception:
                                continue
                        logs_by_habit.setdefault(hid, []).append(logged_date)
    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    issues = ctx["issues"]
    journals = ctx["journals"]
    observations = ctx["observations"]
    teacher_fbs = ctx["teacher_fbs"]
    contact_fbs = ctx["contact_fbs"]
    related_issues = ctx["related_issues"]
    research = ctx["research"]
    issue_contacts = ctx["issue_contacts"]
    all_members = ctx["all_members"]

    # Goals linked from habits — cheap extra context when habits were
    # generated from a goal.
    goal_ids = list({r[5] for r in habit_rows if r[5]})
    linked_goals: list[tuple] = []
    if goal_ids:
        try:
            async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
                async with conn.cursor() as cur:
                    placeholders = ",".join(["%s"] * len(goal_ids))
                    await cur.execute(
                        f"SELECT id, title, description, status FROM goals "
                        f"WHERE id IN ({placeholders}) AND user_id = %s",
                        [*goal_ids, user_email],
                    )
                    linked_goals = await cur.fetchall()
        except Exception:
            linked_goals = []

    # ── Compute per-habit stats ─────────────────────────────────────────
    habit_stats: list[dict[str, Any]] = []
    daily_count = 0
    weekly_count = 0
    total_observed = 0
    total_expected = 0
    narrow_count = 0
    for h_id, h_title, h_desc, h_freq, h_target, _g_id, _i_id, h_created in habit_rows:
        h_freq = (h_freq or "daily").lower()
        h_target = int(h_target or 1)
        log_dates = set(logs_by_habit.get(h_id, []))
        observed = len(log_dates)
        if h_freq == "weekly":
            weekly_count += 1
            weeks_in_window = max(1, window_days // 7)
            expected = weeks_in_window
            current_streak, longest_streak = _streaks_for_weekly(log_dates, today)
        else:
            daily_count += 1
            expected = window_days
            current_streak, longest_streak = _streaks_for_daily(log_dates, today)
        consistency = min(1.0, observed / expected) if expected else 0.0
        total_observed += observed
        total_expected += expected
        is_narrow = _is_narrow_therapy_protocol(h_title, h_desc)
        if is_narrow:
            narrow_count += 1
        habit_stats.append(
            {
                "id": h_id,
                "title": h_title,
                "description": h_desc,
                "frequency": h_freq,
                "targetCount": h_target,
                "observedCount": observed,
                "expectedCount": expected,
                "consistency": round(consistency, 3),
                "currentStreak": current_streak,
                "longestStreak": longest_streak,
                "missedPattern": _missed_pattern(log_dates, window_days, today)
                if h_freq == "daily"
                else None,
                "created_at": str(h_created)[:10] if h_created else None,
                "is_narrow_therapy_protocol": is_narrow,
            }
        )

    overall_adherence = (
        round(total_observed / total_expected, 3) if total_expected else 0.0
    )

    # ── Build prompt ────────────────────────────────────────────────────
    sections: list[str] = []
    if state.get("language") == "ro":
        sections.append(shared.ROMANIAN_INSTRUCTION)

    sections.append(
        "You are a family-systems clinician and behavioral-change coach. "
        "Analyze the ROUTINE of the family member below — but ground the "
        "analysis in the ISSUES and JOURNAL ENTRIES listed further down "
        "(primary substrate). Habits flagged as `narrow therapy protocols` "
        "(media-scoped parent-delivered interventions) MUST NOT drive the "
        "routine verdict — their low adherence is a data-modeling artifact, "
        "not a signal of an absent routine. Derive the real daily-life "
        "picture — sleep, meals, activities, peer interactions, emotional "
        "arcs, recurring conflicts — from the journal/issue substrate, and "
        "diagnose gaps and optimizations from there.\n\n"
        "Be concrete and practical. Recommendations should be specific "
        "enough for a parent to act on this week."
    )

    sections.append(
        shared.render_family_member_profile(fm_first, fm_name, fm_age, fm_rel, fm_bio)
    )

    sections.append(
        f"## Observation window (habit logs)\n"
        f"- From: {since.isoformat()}\n"
        f"- To: {today.isoformat()}\n"
        f"- Days: {window_days}\n"
        f"- Raw habit adherence: {overall_adherence:.0%} "
        f"({total_observed} of {total_expected} expected completions) — "
        f"note: {narrow_count} of {len(habit_stats)} habit(s) are narrow "
        f"therapy protocols; their adherence should NOT be used as the "
        f"routine verdict."
    )

    # ── Primary substrate: issues + journals ────────────────────────────
    sections.append(
        shared.render_issues_section(
            issues,
            f"## Issues (primary substrate — what's actually happening · {len(issues)})",
            issue_desc_chars=600,
        )
    )
    journals_chunk = shared.render_journals_section(journals, journal_content_chars=600)
    if journals_chunk:
        # Retitle to emphasize primary role.
        journals_chunk = journals_chunk.replace(
            f"## Journal Entries ({len(journals)})",
            f"## Journal Entries (primary substrate · {len(journals)})",
            1,
        )
        sections.append(journals_chunk)

    # ── Supporting substrate: observations + feedbacks + related ────────
    obs_chunk = shared.render_observations_section(observations)
    if obs_chunk:
        sections.append(obs_chunk)
    tf_chunk = shared.render_teacher_feedbacks_section(teacher_fbs, feedback_chars=800)
    if tf_chunk:
        sections.append(tf_chunk)
    cf_chunk = shared.render_contact_feedbacks_section(contact_fbs, feedback_chars=800)
    if cf_chunk:
        sections.append(cf_chunk)
    rmi_chunk = shared.render_related_member_issues_section(related_issues)
    if rmi_chunk:
        sections.append(rmi_chunk)

    # ── Prior deep-issue analyses (systemic context) ────────────────────
    if prior_deep_analyses:
        prior_lines = []
        for pda_created, pda_summary, pda_issue_id, pda_issue_title in prior_deep_analyses:
            date_str = str(pda_created)[:10] if pda_created else "unknown"
            title_label = (
                f'"{pda_issue_title}"' if pda_issue_title else f"issue #{pda_issue_id}" if pda_issue_id else "general"
            )
            summary_text = (pda_summary or "")[:600]
            prior_lines.append(f"- {date_str}: on issue {title_label} — {summary_text}")
        sections.append(
            "## Prior deep-issue analyses (systemic context — do not re-analyze, cite when relevant)\n"
            + "\n".join(prior_lines)
        )

    # ── Habits — explicitly demoted, split by narrow-therapy flag ───────
    if habit_stats:
        narrow_habits = [h for h in habit_stats if h["is_narrow_therapy_protocol"]]
        substantive_habits = [h for h in habit_stats if not h["is_narrow_therapy_protocol"]]

        def _habit_line(h: dict[str, Any]) -> str:
            line = (
                f"- [ID:{h['id']}] \"{h['title']}\" "
                f"({h['frequency']}, target ×{h['targetCount']}) — "
                f"observed {h['observedCount']}/{h['expectedCount']} "
                f"({h['consistency']:.0%}), "
                f"current streak {h['currentStreak']}, longest {h['longestStreak']}"
            )
            if h.get("missedPattern"):
                line += f", missed pattern: {h['missedPattern']}"
            if h.get("description"):
                line += f"\n  {h['description'][:240]}"
            return line

        habit_section_parts = [
            f"## Habits ({len(habit_stats)} — {daily_count} daily, {weekly_count} weekly)"
        ]
        if narrow_habits:
            habit_section_parts.append(
                f"### Narrow therapy protocols ({len(narrow_habits)} — media-scoped "
                f"interventions, NOT a substantive daily routine)\n"
                f"These are parent-delivered interventions triggered by specific media "
                f"events (e.g. before watching a film). 0% adherence is expected because "
                f"they are not self-initiated daily behaviors. Do NOT use these to diagnose "
                f"routine gaps or set the routine verdict.\n"
                + "\n".join(_habit_line(h) for h in narrow_habits)
            )
        if substantive_habits:
            habit_section_parts.append(
                f"### Substantive routine habits ({len(substantive_habits)})\n"
                + "\n".join(_habit_line(h) for h in substantive_habits)
            )
        if not substantive_habits:
            habit_section_parts.append(
                "### Substantive routine habits (0)\n"
                "None — there are no substantive, self-initiated routine habits on file. "
                "Derive the routine view and its gaps from the ISSUES + JOURNAL ENTRIES "
                "sections above."
            )
        sections.append("\n\n".join(habit_section_parts))
    else:
        sections.append(
            "## Habits\nNone on file. Derive the routine view and its gaps from the "
            "ISSUES + JOURNAL ENTRIES sections above."
        )

    # ── Context: linked goals, research, other members, issue contacts ──
    if linked_goals:
        sections.append(
            "## Linked goals (habit-linked only, context)\n"
            + "\n".join(
                f"- [G{g_id}] \"{g_title}\" — {g_status}"
                + (f": {g_desc[:160]}" if g_desc else "")
                for g_id, g_title, g_desc, g_status in linked_goals
            )
        )

    research_chunk = shared.render_research_section(research)
    if research_chunk:
        sections.append(research_chunk)

    members_chunk = shared.render_family_members_section(all_members, exclude_id=family_member_id)
    if members_chunk:
        sections.append(members_chunk)

    contacts_chunk = shared.render_issue_contacts_section(issue_contacts)
    if contacts_chunk:
        sections.append(contacts_chunk)

    citation_mandate = (
        "REGULĂ OBLIGATORIE DE CITARE: FIECARE element din `gaps` și `optimizationSuggestions` "
        "TREBUIE să facă referință la cel puțin un ID de problemă (ex. [ID:42]) sau la o dată de jurnal "
        "(ex. 'jurnal 2026-04-15'). Elementele fără citări concrete vor fi respinse ca fiind superficiale."
        if state.get("language") == "ro"
        else
        "MANDATORY CITATION RULE: EVERY entry in `gaps` and `optimizationSuggestions` MUST reference "
        "at least one issue ID (e.g., [ID:42]) or a journal date (e.g., 'journal 2026-04-15'). "
        "Entries without concrete citations will be rejected as shallow."
    )

    sections.append(
        f"""## Instructions

PRIMARY SUBSTRATE = the Issues and Journal Entries sections above. The habit adherence numbers are supporting data only. If the only habits on file are narrow therapy protocols, the routine verdict must come from journal + issue patterns, NOT from habit adherence.

{citation_mandate}

Produce a structured JSON analysis with these fields:

1. **summary** (string): 2-3 paragraph executive read of the ACTUAL routine. OPEN with a synthesis of what the journal entries and issues collectively show about this child's daily life (sleep, meals, school, activities, emotional arcs, recurring conflicts) — reference specific issue IDs like [ID:42] and journal dates. Only THEN note the habits and what they do or don't contribute. If {narrow_count} of {len(habit_stats)} habit(s) are narrow therapy protocols, state explicitly that the visible "routine" on file is a therapy-instruction protocol, not a substantive daily routine, and that the real routine view had to be derived from journals/issues.

2. **adherencePatterns** (array of objects, one per habit): {{habitId (int — MUST match an ID from the Habits section above), habitTitle (string), frequency ("daily"|"weekly"), targetCount (int), observedCount (int), consistency (float 0-1), currentStreak (int), longestStreak (int), missedPattern (optional string — e.g. "weekends", "mostly Fridays"), interpretation (string — 1-2 sentences). For habits listed under "Narrow therapy protocols", the `interpretation` MUST state explicitly: "narrow therapy protocol — adherence here doesn't reflect routine quality" followed by a brief note on the intervention's purpose.}}

3. **routineBalance** (object): {{domainsCovered (array of strings — derived from JOURNAL activity themes and ISSUE categories, not from habit frequency mix — e.g. ["sleep","school","peer interactions"]), domainsMissing (array of strings), overEmphasized (array of strings), underEmphasized (array of strings), verdict ("balanced"|"unbalanced"|"sparse"|"overloaded")}}.

4. **streaks** (object): {{strongestHabitId (optional int from the habits above), strongestStreak (int), weakestHabitId (optional int), weakestStreak (int), momentum ("building"|"fading"|"steady"|"stalled"). If the only habits are narrow therapy protocols, set momentum to "stalled" and note in the summary that momentum refers only to the narrow protocols, not to the child's overall routine.}}

5. **gaps** (array of 2-4 objects): {{area (string), rationale (string — reference journal patterns and issue IDs, e.g. "Journals from 2026-03 show homework starts after 8pm on weekdays; issue [ID:17] documents the resulting meltdowns"), severity ("low"|"medium"|"high")}}. Derive gaps from the journal/issue substrate, NOT from missing habit categories.

6. **optimizationSuggestions** (array of 3-5 objects): {{title (string), rationale (string — reference specific issue IDs from the Issues section when applicable), priority ("immediate"|"short_term"|"long_term"), changeType ("add"|"remove"|"modify"|"merge"|"split"), targetHabitId (optional int — from habits above when changeType is modify/remove/merge/split), suggestedFrequency (optional "daily"|"weekly"), suggestedTargetCount (optional int), concreteSteps (array of 2-3 very specific parent-actionable strings — e.g. "Set a 7:30pm phone-in-basket rule and log it each night" not "Reduce screen time"), ageAppropriate (bool — verify against the profile age above), developmentalContext (optional string)}}. Suggestions must address what the ISSUES + JOURNALS reveal, not just gaps in the habit list.

7. **researchRelevance** (array of objects, may be empty): {{topic (string), relevantResearchIds (array of ints — MUST be ResearchIDs from the "Existing Research" section when present), relevantResearchTitles (array of strings), coverageGaps (array of strings)}}. Cite real IDs only; do NOT invent research.

IMPORTANT: Every field annotated as "array of" MUST be a JSON array, even when there is only one item. Only reference habit IDs / ResearchIDs / issue IDs that appear in the data above. Do not invent IDs.

Write the analysis in the same language as the family-member profile and journal entries above."""
    )

    prompt = "\n\n".join(sections)

    data_snapshot = json.dumps(
        {
            "habitsCount": len(habit_stats),
            "activeDailyCount": daily_count,
            "activeWeeklyCount": weekly_count,
            "logCount": total_observed,
            "windowDays": window_days,
            "dateRange": {"from": since.isoformat(), "to": today.isoformat()},
            "overallAdherence": overall_adherence,
            "linkedGoalCount": len(linked_goals),
            "linkedIssueCount": len(issues),
            "researchPaperCount": len(research),
            # New: richer substrate counts
            "issueCount": len(issues),
            "journalEntryCount": len(journals),
            "observationCount": len(observations),
            "teacherFeedbackCount": len(teacher_fbs),
            "contactFeedbackCount": len(contact_fbs),
            "narrowTherapyHabitsCount": narrow_count,
        }
    )

    return {
        "_prompt": prompt,
        "_data_snapshot": data_snapshot,
        "_family_member_name": fm_first,
    }


async def analyze(state: RoutineAnalysisState) -> dict:
    """Call DeepSeek with structured output; retry concisely on truncation."""
    if state.get("error"):
        return {}
    try:
        prompt = state.get("_prompt", "")
        async with DeepSeekClient(DeepSeekConfig(timeout=300.0)) as client:
            messages = [
                ChatMessage(role="system", content=ROUTINE_SYSTEM_PROMPT),
                ChatMessage(role="user", content=prompt),
            ]
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
        result = RoutineAnalysisOutput.model_validate_json(content)
        return {"analysis": result.model_dump_json()}
    except Exception as exc:
        return {"error": f"analyze failed: {exc}"}


async def persist(state: RoutineAnalysisState) -> dict:
    """Save the routine analysis to the routine_analyses table."""
    if state.get("error") or not state.get("analysis"):
        return {}
    try:
        analysis = json.loads(state["analysis"])
        family_member_id = state.get("family_member_id")
        user_email = state.get("user_email")
        data_snapshot = state.get("_data_snapshot", "{}")

        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO routine_analyses "
                    "(family_member_id, user_id, summary, "
                    "adherence_patterns, routine_balance, streaks, gaps, "
                    "optimization_suggestions, research_relevance, "
                    "data_snapshot, model, created_at, updated_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()) "
                    "RETURNING id",
                    (
                        family_member_id,
                        user_email,
                        analysis.get("summary", ""),
                        json.dumps(analysis.get("adherencePatterns", [])),
                        json.dumps(analysis.get("routineBalance", {})),
                        json.dumps(analysis.get("streaks", {})),
                        json.dumps(analysis.get("gaps", [])),
                        json.dumps(analysis.get("optimizationSuggestions", [])),
                        json.dumps(analysis.get("researchRelevance", [])),
                        data_snapshot,
                        "deepseek-chat",
                    ),
                )
                row = await cur.fetchone()
                analysis_id = row[0] if row else 0

        return {"analysis_id": analysis_id}
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}


def create_routine_analysis_graph():
    builder = StateGraph(RoutineAnalysisState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("analyze", analyze)
    builder.add_node("persist", persist)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "analyze")
    builder.add_edge("analyze", "persist")
    builder.add_edge("persist", END)

    return builder.compile()


graph = create_routine_analysis_graph()
