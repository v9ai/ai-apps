"""LangGraph story generation graph — reads from Neon, generates therapeutic audio script."""
from __future__ import annotations

import json
import os
from typing import Annotated, Optional, TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field

import psycopg

from .therapy_context import IssueData, StoryContext, build_therapeutic_system_prompt
from .embeddings import aembed_text, query_to_embedding_text

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class StoryState(TypedDict, total=False):
    feedback_id: Optional[int]
    issue_id: Optional[int]
    goal_id: Optional[int]
    family_member_id: Optional[int]  # explicit override — skips goal/issue/feedback lookup
    user_context: Optional[str]      # free-form user input to guide story generation
    language: str
    minutes: int
    user_email: Optional[str]
    story_text: str
    story_id: int
    evals: str
    error: str
    _prompt: str
    _family_member_id: int
    _person_name: str
    # Eval context — populated by load_context, consumed by eval_story
    _has_related_member: bool
    _related_person_name: Optional[str]
    _issue_title: Optional[str]
    _issue_category: Optional[str]
    user_name: Optional[str]           # display name from auth session (e.g. "Vadim Nicolai")
    # Retry loop — incremented by prepare_retry, consumed by generate_story
    _retry_count: int
    _eval_feedback: Optional[str]


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def load_context(state: StoryState) -> dict:
    """Load context from feedback, issue, goal, or direct family member — plus research papers from Neon."""
    feedback_id = state.get("feedback_id")
    issue_id = state.get("issue_id")
    goal_id = state.get("goal_id")
    family_member_id_input = state.get("family_member_id")
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

                elif family_member_id_input:
                    # Standalone: generate directly for this family member
                    family_member_id = family_member_id_input
                    subject = "therapeutic support session"
                    content = ""
                    issues = []
                    paper_rows_direct = []
                    related_person_relationship = None

                else:
                    # No structured context — use user_context + user email as fallback
                    family_member_id = None
                    subject = "therapeutic support session"
                    content = state.get("user_context") or ""
                    issues = []
                    paper_rows_direct = []
                    related_person_relationship = None

                # Allow explicit family_member_id to override what was derived from goal/issue/feedback
                if family_member_id_input:
                    family_member_id = family_member_id_input

                # Primary family member
                fm_row = None
                if family_member_id:
                    await cur.execute(
                        "SELECT first_name, age_years FROM family_members WHERE id = %s",
                        (family_member_id,),
                    )
                    fm_row = await cur.fetchone()

                if fm_row:
                    person_name = fm_row[0]
                    age_years = fm_row[1]
                else:
                    # No family member — use the display name passed from the auth session
                    age_years = None
                    raw_name = state.get("user_name") or ""
                    person_name = raw_name.split()[0] if raw_name.strip() else "you"

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

    user_context = state.get("user_context")
    if user_context:
        content = f"{content}\n\nAdditional context from the user:\n{user_context}".strip()

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
        "_person_name": person_name,
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

        minutes = state.get("minutes", 10)
        person_name = state.get("_person_name", "")
        system_prompt = build_therapeutic_system_prompt(minutes, person_name)

        messages: list = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        eval_feedback = state.get("_eval_feedback")
        retry_count = state.get("_retry_count", 0)
        if eval_feedback and retry_count > 0:
            messages.append({
                "role": "user",
                "content": (
                    f"QUALITY ISSUES FROM PREVIOUS ATTEMPT (attempt {retry_count}) — "
                    f"fix ALL of the following in your new script:\n{eval_feedback}"
                ),
            })

        result = await llm.ainvoke(messages)

        story_text = result.content or ""
        if not story_text:
            return {"error": "DeepSeek returned empty story text"}

        # Post-generation enforcement: if < 85% of target word count, request a continuation
        minutes = state.get("minutes", 10)
        target_words = minutes * 120
        actual_words = len(story_text.split())

        if actual_words < int(target_words * 0.85):
            remaining = target_words - actual_words
            continuation_prompt = (
                f"The script is too short — only {actual_words} words, but the target is {target_words} words "
                f"({minutes} minutes at 120 wpm). You must write {remaining} more words to complete the session. "
                f"Continue EXACTLY from where the script left off. Do NOT repeat anything already written. "
                f"Do NOT add any title, header, or restart marker. Just continue the spoken prose. "
                f"Expand the Guided Practices section with additional exercises, "
                f"longer narrated pauses, a second technique walkthrough, or deeper metaphor exploration. "
                f"End with the wrap-up section only AFTER reaching {target_words} total words."
            )
            continuation = await llm.ainvoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": story_text},
                {"role": "user", "content": continuation_prompt},
            ])
            continuation_text = (continuation.content or "").strip()
            if continuation_text:
                story_text = story_text.rstrip() + "\n\n" + continuation_text

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
                    user_id = state.get("user_email") or "system"

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
    duration_compliance: float = Field(ge=0, le=1, description="Script word count matches the target duration (0-1). Score 1.0 if within 20% of target, 0.5 if within 40%, 0.0 if more than 50% off.")
    lego_compliance: float = Field(ge=0, le=1, description="LEGO content compliance (0-1). If LEGO expected: 1.0 = present and therapeutic, 0.0 = missing. If LEGO NOT expected: 1.0 = absent, 0.0 = incorrectly included.")
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
        minutes = state.get("minutes", 10)
        person_name = state.get("_person_name", "")
        target_words = minutes * 120
        actual_words = len(story_text.split())
        lego_expected = person_name.lower() == "bogdan"

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

        context_lines.append(f"Person: {person_name}")
        context_lines.append(f"Target duration: {minutes} minutes ({target_words} words at 120 wpm)")
        context_lines.append(f"Actual word count: {actual_words} words")
        context_lines.append(f"LEGO expected: {'YES — person is Bogdan' if lego_expected else 'NO — LEGO is only for Bogdan'}")

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

        lego_instruction = (
            "- lego_compliance: LEGO content IS expected for this person. Score 1.0 if LEGO building activities are present and therapeutically integrated, 0.0 if missing."
            if lego_expected
            else "- lego_compliance: LEGO content is NOT expected for this person (only for Bogdan). Score 1.0 if the script does NOT mention LEGO, 0.0 if LEGO content is incorrectly included."
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
- duration_compliance: the script has {actual_words} words, target was {target_words} words ({minutes} min at 120 wpm). Score 1.0 if within 20% of target, 0.5 if within 40%, 0.0 if more than 50% off.
{lego_instruction}
{family_instruction}
- rationale: 2-3 sentence evaluation summary

Be honest: score low if the script is generic or misses the issue; score high if it is precise and clinically grounded."""

        scores: _StoryEvalScores = await structured_llm.ainvoke(eval_prompt)

        components = [scores.clinical_accuracy, scores.age_appropriateness, scores.issue_addressed, scores.duration_compliance, scores.lego_compliance]
        if has_related_member:
            components.append(scores.family_dynamics_coverage)
        overall = round(sum(components) / len(components), 2)

        evals_dict = {
            "clinicalAccuracy": round(scores.clinical_accuracy, 2),
            "ageAppropriateness": round(scores.age_appropriateness, 2),
            "issueAddressed": round(scores.issue_addressed, 2),
            "durationCompliance": round(scores.duration_compliance, 2),
            "legoCompliance": round(scores.lego_compliance, 2),
            "legoExpected": lego_expected,
            "targetWords": target_words,
            "actualWords": actual_words,
            "overall": overall,
            "rationale": scores.rationale,
        }
        if has_related_member:
            evals_dict["familyDynamicsCoverage"] = round(scores.family_dynamics_coverage, 2)

        return {"evals": json.dumps(evals_dict)}

    except Exception as exc:
        print(f"[eval_story] Eval error (non-fatal): {exc}")
        return {}


MAX_RETRIES = 2

EVAL_THRESHOLDS = {
    "durationCompliance": 0.5,   # < 50% → duration too short
    "clinicalAccuracy": 0.55,
    "issueAddressed": 0.55,
    "ageAppropriateness": 0.55,
    "overall": 0.55,
}


def route_after_eval(state: dict) -> str:
    """Return 'retry' if evals fail thresholds and retries remain, else 'save'."""
    if state.get("error") or not state.get("story_text"):
        return "save"
    if state.get("_retry_count", 0) >= MAX_RETRIES:
        return "save"
    evals_json = state.get("evals")
    if not evals_json:
        return "save"
    try:
        evals = json.loads(evals_json)
    except Exception:
        return "save"
    for key, threshold in EVAL_THRESHOLDS.items():
        if evals.get(key, 1.0) < threshold:
            return "retry"
    return "save"


async def prepare_retry(state: dict) -> dict:
    """Build human-readable eval feedback and increment retry counter."""
    try:
        evals = json.loads(state.get("evals") or "{}")
    except Exception:
        evals = {}

    parts: list[str] = []

    duration = evals.get("durationCompliance", 1.0)
    if duration < EVAL_THRESHOLDS["durationCompliance"]:
        actual = evals.get("actualWords", 0)
        target = evals.get("targetWords", 0)
        parts.append(
            f"DURATION: The script was only {actual} words but needs {target} words "
            f"({state.get('minutes', 10)} min at 120 wpm). "
            f"Do NOT end the session early — keep expanding the Guided Practices with additional exercises, "
            f"longer narrated pauses, and deeper technique walkthroughs until you reach the word count."
        )

    if evals.get("clinicalAccuracy", 1.0) < EVAL_THRESHOLDS["clinicalAccuracy"]:
        parts.append(
            "CLINICAL ACCURACY: Use more specific evidence-based techniques from the research provided. "
            "Name techniques explicitly (e.g. CBT thought records, mindfulness body scan, ACT defusion). "
            "Guide each step-by-step."
        )

    if evals.get("issueAddressed", 1.0) < EVAL_THRESHOLDS["issueAddressed"]:
        parts.append(
            "ISSUE NOT ADDRESSED: The script must directly tackle the specific clinical issue described. "
            "Do not write a generic session — open with the exact problem and build every exercise around it."
        )

    if evals.get("ageAppropriateness", 1.0) < EVAL_THRESHOLDS["ageAppropriateness"]:
        parts.append(
            "AGE APPROPRIATENESS: Rewrite using vocabulary and framing appropriate for the developmental tier. "
            "Shorter sentences, simpler words, playful metaphors for children."
        )

    feedback = "\n".join(f"- {p}" for p in parts) if parts else "- Improve overall quality and completeness."

    return {
        "_retry_count": state.get("_retry_count", 0) + 1,
        "_eval_feedback": feedback,
        "story_text": "",
        "evals": None,
    }


def create_story_graph():
    """Build the story generation LangGraph."""
    builder = StateGraph(StoryState)
    builder.add_node("load_context", load_context)
    builder.add_node("generate_story", generate_story)
    builder.add_node("eval_story", eval_story)
    builder.add_node("prepare_retry", prepare_retry)
    builder.add_node("save_story", save_story)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "generate_story")
    builder.add_edge("generate_story", "eval_story")
    builder.add_conditional_edges("eval_story", route_after_eval, {"retry": "prepare_retry", "save": "save_story"})
    builder.add_edge("prepare_retry", "generate_story")
    builder.add_edge("save_story", END)

    return builder.compile()


# Module-level graph instance for LangGraph server
graph = create_story_graph()
