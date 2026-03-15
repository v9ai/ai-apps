"""
LangGraph story generation graph — Python port of src/graphs/generateStory.ts.

Graph: START → load_context → fetch_research → generate_story → save_story → END
"""

import os
import re
from pathlib import Path
from typing import Annotated, Any, Optional

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from openai import OpenAI
from typing_extensions import TypedDict

import d1_client

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

# ---------------------------------------------------------------------------
# System prompt (verbatim from src/graphs/generateStory.ts)
# ---------------------------------------------------------------------------

THERAPEUTIC_SYSTEM_PROMPT = """## Overview
You are a Therapeutic Audio Content Agent. Your role is to create evidence-based, compassionate therapeutic guidance that helps people work through psychological challenges and achieve their mental health goals.

## Content Structure
Create therapeutic audio content that includes:

1. **Warm Introduction** (30 seconds)
   - Acknowledge the person's challenge with empathy
   - Set a calm, safe tone for the session
   - Outline what will be covered

2. **Understanding the Challenge** (2-3 minutes)
   - Explain the psychological aspects of their goal
   - Normalize their experience
   - Share relevant evidence-based insights

3. **Guided Practices** (majority of time)
   - Provide specific, actionable techniques
   - Include breathing exercises, visualization, or cognitive reframing
   - Guide through practices step-by-step
   - Use language suitable for audio (clear pauses, simple instructions)

4. **Integration & Next Steps** (1-2 minutes)
   - Summarize key points
   - Suggest how to practice between sessions
   - End with encouragement and affirmation

## Voice Guidelines
- Write for spoken audio, not reading
- Use natural, conversational language
- Include strategic pauses: "... [pause] ..."
- Avoid complex sentences or jargon
- Use "you" to create connection
- Maintain a calm, warm, professional tone
- Speak slowly and clearly for relaxation effects

## Evidence-Based Approaches
Draw from:
- Cognitive Behavioral Therapy (CBT)
- Mindfulness-Based Stress Reduction (MBSR)
- Acceptance and Commitment Therapy (ACT)
- Dialectical Behavior Therapy (DBT)
- Positive Psychology interventions

## Duration Management
- For 5-minute sessions: Focus on one core technique
- For 10-minute sessions: Introduction + 1-2 practices
- For 15-20 minute sessions: Full structure with multiple practices
- For 30+ minute sessions: Deep dive with extended guided exercises

## Safety & Ethics
- Never diagnose or replace professional therapy
- Encourage seeking professional help for serious concerns
- Focus on skill-building and coping strategies
- Maintain appropriate boundaries
- Use inclusive, non-judgmental language

## Example Opening
"Welcome. I'm glad you're here, taking this time for yourself. [pause] Today, we're going to work together on [specific goal]. This is a common challenge that many people face, and there are proven techniques that can help. [pause] Find a comfortable position, and let's begin..."
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_developmental_tier(age_years: Optional[int | float]) -> str:
    if not age_years:
        return "ADULT"
    if age_years <= 5:
        return "EARLY_CHILDHOOD"
    if age_years <= 11:
        return "MIDDLE_CHILDHOOD"
    if age_years <= 14:
        return "EARLY_ADOLESCENCE"
    if age_years <= 18:
        return "LATE_ADOLESCENCE"
    return "ADULT"


def strip_markdown(text: str) -> str:
    """Remove markdown formatting from a TTS script."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"\*(.+?)\*", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"__(.+?)__", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"_(.+?)_", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

_last = lambda a, b: b  # noqa: E731


class StoryState(TypedDict):
    # Inputs
    goal_id: Optional[int]
    issue_id: Optional[int]
    feedback_id: Optional[int]
    user_email: str
    language: str
    minutes: int
    # Loaded by load_context_node
    goal: Annotated[Optional[dict], _last]
    family_member: Annotated[Optional[dict], _last]
    issue: Annotated[Optional[dict], _last]
    unique_outcomes: Annotated[list, _last]
    feedback_context: Annotated[str, _last]
    # Loaded by fetch_research_node
    research_summary: Annotated[str, _last]
    notes_summary: Annotated[str, _last]
    # Output
    story_text: Annotated[str, _last]
    story_id: Annotated[int, _last]


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------


def build_prompt(state: StoryState) -> str:
    goal = state.get("goal")
    issue = state.get("issue")
    family_member = state.get("family_member")
    unique_outcomes = state.get("unique_outcomes") or []
    feedback_context = state.get("feedback_context") or ""
    research_summary = state.get("research_summary") or ""
    notes_summary = state.get("notes_summary") or ""
    language = state.get("language", "English")
    minutes = state.get("minutes", 10)

    person_name = (family_member or {}).get("first_name") or "you"
    age_years = (family_member or {}).get("age_years")
    age_context = f" (age {age_years})" if age_years else ""
    developmental_tier = get_developmental_tier(age_years)

    # Topic section
    if goal:
        topic_section = (
            f"## Goal\n"
            f"Title: {goal['title']}\n"
            f"Description: {goal.get('description') or 'No additional description provided.'}"
        )
    elif issue:
        topic_section = (
            f"## Topic\n"
            f"Title: {issue['title']}\n"
            f"Category: {issue.get('category', '')}\n"
            f"Description: {issue.get('description') or 'No additional description provided.'}"
        )
    else:
        topic_section = (
            "## Topic\n"
            "Based on professional feedback and extracted issues (see Feedback Context below)."
        )

    context_type = "goal" if goal else ("topic" if issue else "feedback")

    # Issue/Therapeutic Focus section
    issue_section = ""
    if issue:
        lines = [
            "\n## Therapeutic Focus",
            issue["title"],
            f"Category: {issue.get('category', '')}",
        ]
        if issue.get("description"):
            lines.append(f"Description: {issue['description']}")
        if issue.get("recommendations"):
            lines.append("\n## Recommendations")
            for rec in issue["recommendations"]:
                lines.append(f"- {rec}")
        if unique_outcomes:
            lines.append("\n## Sparkling Moments")
            for o in unique_outcomes:
                lines.append(f"- {o.get('observed_at')}: {o.get('description')}")
        issue_section = "\n".join(lines) + "\n"

    # Person section
    if family_member:
        person_line = (
            f"This is for {person_name}{age_context}.\n"
            f"Developmental Tier: {developmental_tier}"
        )
    else:
        person_line = "This is for the listener themselves (first-person, self-directed session)."

    feedback_block = f"\n## Feedback Context\n{feedback_context}\n" if feedback_context else ""

    notes_block = (
        f"\n## Clinical Notes & Observations\n"
        f"The following notes contain clinical observations, research findings, and insights specific to this person:\n\n"
        f"{notes_summary}\n"
        if notes_summary else ""
    )

    feedback_instructions = (
        "- Address the specific issues identified in the feedback, providing practical strategies for each\n"
        "- Validate the observations from the professional who provided the feedback\n"
        if feedback_context else ""
    )

    person_ref = f"{person_name}{age_context}"
    tier_ref = f" (developmental tier: {developmental_tier})" if family_member else ""

    prompt = (
        f"Create a therapeutic audio session for the following {context_type}. "
        f"Write the full script in {language}, approximately {minutes} minutes long when read aloud.\n\n"
        f"{topic_section}\n\n"
        f"## Person\n"
        f"{person_line}\n"
        f"{issue_section}"
        f"{feedback_block}"
        f"## Research Evidence\n"
        f"The following research papers inform the therapeutic techniques to use:\n\n"
        f"{research_summary or 'No research papers available yet. Use general evidence-based therapeutic techniques.'}\n"
        f"{notes_block}"
        f"## Instructions\n"
        f"- Create a complete, flowing therapeutic audio script\n"
        f"- Incorporate specific techniques and findings from the research above\n"
        f"{feedback_instructions}"
        f"- When clinical notes are available, weave their insights and observations into the session\n"
        f"- Personalize for {person_ref}{tier_ref}\n"
        f"- Target duration: {minutes} minutes when read aloud at a calm pace\n"
        f"- Write in {language}\n"
        f"- Follow the therapeutic audio content structure (warm introduction, understanding the challenge, guided practices, integration)\n"
        f"- Include a brief mention that a parent, caregiver, or professional can provide additional support if needed\n"
        f"- IMPORTANT: Do NOT use any markdown formatting (no **, ##, *, bullet points, or bold/italic syntax). "
        f"Write plain spoken prose only, as the script will be read aloud by a text-to-speech engine"
    )
    return prompt


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------


def load_context_node(state: StoryState) -> dict[str, Any]:
    goal_id = state.get("goal_id")
    issue_id = state.get("issue_id")
    feedback_id = state.get("feedback_id")
    user_email = state["user_email"]

    goal = d1_client.get_goal(goal_id, user_email) if goal_id else None
    issue = d1_client.get_issue(issue_id, user_email) if issue_id else None

    feedback_context = ""
    family_member_id: Optional[int] = None

    if feedback_id:
        fb = d1_client.get_contact_feedback(feedback_id, user_email)
        if fb:
            family_member_id = fb.get("family_member_id")
            lines = ["## Feedback"]
            if fb.get("subject"):
                lines.append(f"Subject: {fb['subject']}")
            lines.append(f"Date: {fb.get('feedback_date')}")
            lines.append(f"Content: {fb.get('content')}")
            tags = fb.get("tags")
            if tags:
                lines.append(f"Tags: {', '.join(tags)}")

            issues = d1_client.get_issues_for_family_member(
                family_member_id, feedback_id, user_email
            )
            if issues:
                lines.append(f"\n## Extracted Issues ({len(issues)})")
                for iss in issues:
                    lines.append(
                        f"- **{iss['title']}** [{iss.get('severity')}/{iss.get('category')}]: {iss.get('description')}"
                    )
                    recs = iss.get("recommendations")
                    if recs:
                        for rec in recs:
                            lines.append(f"  - Recommendation: {rec}")
            feedback_context = "\n".join(lines)

    if not family_member_id:
        family_member_id = (
            (goal or {}).get("family_member_id")
            or (issue or {}).get("family_member_id")
        )

    family_member = d1_client.get_family_member(family_member_id) if family_member_id else None

    unique_outcomes = (
        d1_client.get_unique_outcomes_for_issue(issue["id"], user_email) if issue else []
    )

    return {
        "goal": goal,
        "family_member": family_member,
        "issue": issue,
        "unique_outcomes": unique_outcomes,
        "feedback_context": feedback_context,
    }


def fetch_research_node(state: StoryState) -> dict[str, Any]:
    goal_id = state.get("goal_id")
    issue_id = state.get("issue_id")
    feedback_id = state.get("feedback_id")
    user_email = state.get("user_email", "")

    research = d1_client.list_therapy_research(goal_id, issue_id, feedback_id)
    top_papers = research[:10]
    research_lines = []
    for i, paper in enumerate(top_papers, 1):
        findings = "; ".join(paper.get("key_findings") or [])
        techniques = "; ".join(paper.get("therapeutic_techniques") or [])
        year = paper.get("year") or "n.d."
        research_lines.append(
            f'{i}. "{paper["title"]}" ({year})\n'
            f"   Key findings: {findings}\n"
            f"   Therapeutic techniques: {techniques}"
        )
    research_summary = "\n\n".join(research_lines)

    notes_summary = ""
    if issue_id and user_email:
        notes = d1_client.list_notes_for_entity(issue_id, "issue", user_email)
        priority = {
            "DEEP_RESEARCH_SYNTHESIS": 0,
            "DEEP_RESEARCH_MERGED": 1,
            "DEEP_RESEARCH_FINDING": 2,
        }
        sorted_notes = sorted(notes, key=lambda n: priority.get(n.get("note_type") or "", 3))
        top5 = sorted_notes[:5]
        notes_lines = []
        for i, note in enumerate(top5, 1):
            content = note.get("content", "")
            text = content[:1500] + "..." if len(content) > 1500 else content
            label = note.get("title") or f"Note {i}"
            notes_lines.append(f"{i}. {label}\n   {text}")
        notes_summary = "\n\n".join(notes_lines)

    return {"research_summary": research_summary, "notes_summary": notes_summary}


def generate_story_node(state: StoryState) -> dict[str, Any]:
    if not state.get("goal") and not state.get("issue") and not state.get("feedback_context"):
        raise RuntimeError("Context not loaded — need at least a goal, issue, or feedback")

    prompt = build_prompt(state)
    client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": THERAPEUTIC_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    story_text = response.choices[0].message.content or ""
    if not story_text:
        raise RuntimeError("DeepSeek returned empty text")
    return {"story_text": strip_markdown(story_text)}


def save_story_node(state: StoryState) -> dict[str, Any]:
    row = d1_client.create_goal_story(
        goal_id=state.get("goal_id"),
        issue_id=state.get("issue_id"),
        feedback_id=state.get("feedback_id"),
        language=state.get("language", "English"),
        minutes=state.get("minutes", 10),
        text=state["story_text"],
    )
    return {"story_id": row["id"]}


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

graph = (
    StateGraph(StoryState)
    .add_node("load_context", load_context_node)
    .add_node("fetch_research", fetch_research_node)
    .add_node("generate_story", generate_story_node)
    .add_node("save_story", save_story_node)
    .add_edge(START, "load_context")
    .add_edge("load_context", "fetch_research")
    .add_edge("fetch_research", "generate_story")
    .add_edge("generate_story", "save_story")
    .add_edge("save_story", END)
    .compile()
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def run_story_graph(input: dict, config: dict | None = None) -> dict:
    """Run the story graph and return {"story_id": int, "text": str}."""
    state_input = {
        "goal_id": input.get("goal_id"),
        "issue_id": input.get("issue_id"),
        "feedback_id": input.get("feedback_id"),
        "user_email": input["user_email"],
        "language": input.get("language", "English"),
        "minutes": input.get("minutes", 10),
    }
    result = graph.invoke(state_input, config=config)
    return {"story_id": result["story_id"], "text": result["story_text"]}
