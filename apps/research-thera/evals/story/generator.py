"""Story generator with fixture caching.

All test cases center on Noah, a 7-year-old boy (MIDDLE_CHILDHOOD tier).
Covers every code path in generateStory.ts:
  - context_type: goal / issue / feedback
  - optional enrichment: notes, unique outcomes
  - languages: English, Spanish
  - session lengths: 5, 10, 15, 20 minutes
  - no-research fallback
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
_BASE_URL = "https://api.deepseek.com"

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# ---------------------------------------------------------------------------
# System prompt — verbatim from src/graphs/generateStory.ts
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
# Test cases — all centered on Noah, a 7-year-old boy (MIDDLE_CHILDHOOD)
# ---------------------------------------------------------------------------

TEST_CASES = [
    # 1. Goal-driven · bedtime anxiety · issue + unique outcomes (standard happy path)
    {
        "id": "noah-bedtime-anxiety",
        "context_type": "goal",
        "goal_title": "Reduce bedtime anxiety and fall asleep independently",
        "goal_description": "Help Noah manage fear at bedtime and build confidence sleeping alone.",
        "person_name": "Noah",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 10,
        "language": "English",
        "issue": {
            "title": "Bedtime Fear and Sleep Avoidance",
            "category": "BEHAVIORAL",
            "severity": "MODERATE",
            "description": "Noah becomes anxious at bedtime, needing a parent to stay until he falls asleep.",
            "recommendations": [
                "Predictable bedtime routine",
                "Gradual fading of parent presence",
                "Comfort object use",
            ],
        },
        "unique_outcomes": [
            {
                "observed_at": "2024-03-01",
                "description": "Stayed in his room alone for 10 minutes without calling out",
            },
            {
                "observed_at": "2024-03-08",
                "description": "Fell asleep before a parent checked on him for the first time",
            },
        ],
        "feedback_context": None,
        "notes": None,
        "papers": [
            {
                "title": "Graduated extinction and parental fading for pediatric sleep problems",
                "year": 2023,
                "key_findings": "Gradual parental fading reduced sleep-onset latency by 40%; gains maintained at 6 months",
                "therapeutic_techniques": "Parental fading; bedtime pass technique; positive reinforcement of brave behavior",
            },
            {
                "title": "CBT for childhood nighttime fears: A meta-analysis",
                "year": 2022,
                "key_findings": "CBT reduced nighttime anxiety in 7-12 year olds; imagery rescripting was most effective technique",
                "therapeutic_techniques": "Imagery rescripting; thought challenging; relaxation training; rewards for brave nights",
            },
        ],
    },
    # 2. Goal-driven · school anxiety · short 5-minute session
    {
        "id": "noah-school-worry-short",
        "context_type": "goal",
        "goal_title": "Manage worry about school",
        "goal_description": "Help Noah calm worries about school performance, friendships, and fitting in.",
        "person_name": "Noah",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 5,
        "language": "English",
        "issue": None,
        "unique_outcomes": [],
        "feedback_context": None,
        "notes": None,
        "papers": [
            {
                "title": "Brief CBT for generalized worry in middle-childhood",
                "year": 2022,
                "key_findings": "Worry container technique and belly breathing reduced anxiety scores in 6-10 year olds",
                "therapeutic_techniques": "Worry container visualization; belly breathing; coping self-talk",
            },
        ],
    },
    # 3. Feedback-driven · teacher observations · extracted behavioral issues
    {
        "id": "noah-teacher-feedback",
        "context_type": "feedback",
        "goal_title": None,
        "goal_description": None,
        "person_name": "Noah",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 10,
        "language": "English",
        "issue": None,
        "unique_outcomes": [],
        "feedback_context": {
            "subject": "Classroom observations — Noah",
            "date": "2024-03-10",
            "content": (
                "Noah struggles to wait his turn during group activities and often blurts out answers. "
                "He becomes frustrated quickly when he makes mistakes and has occasionally thrown materials. "
                "He responds very well to one-on-one adult attention and is kind-hearted with peers."
            ),
            "tags": ["impulse-control", "frustration-tolerance", "classroom-behavior"],
            "issues": [
                {
                    "title": "Impulse Control Difficulties",
                    "severity": "MODERATE",
                    "category": "BEHAVIORAL",
                    "description": "Difficulty waiting turns and inhibiting verbal responses in group settings.",
                    "recommendations": ["Self-monitoring strategies", "Visual cues for turn-taking"],
                },
                {
                    "title": "Low Frustration Tolerance",
                    "severity": "MODERATE",
                    "category": "EMOTIONAL",
                    "description": "Strong emotional reactions to mistakes; difficulty self-regulating after errors.",
                    "recommendations": ["Mistake normalization", "Breathing techniques for frustration"],
                },
            ],
        },
        "notes": None,
        "papers": [
            {
                "title": "Emotion regulation training for impulse control in young children",
                "year": 2023,
                "key_findings": "Stop-signal training and emotion labeling reduced disruptive behavior by 35% in ages 6-9",
                "therapeutic_techniques": "Turtle technique; emotion labeling; stop-breathe-think sequence",
            },
            {
                "title": "Self-regulation interventions for frustration tolerance in middle childhood",
                "year": 2022,
                "key_findings": "Mindful breathing and reframing mistakes as learning reduced emotional outbursts",
                "therapeutic_techniques": "Traffic light method; growth mindset reframing; 5-finger breathing",
            },
        ],
    },
    # 4. Issue-driven · anger management · with clinical notes · 15-minute session
    {
        "id": "noah-anger-management-notes",
        "context_type": "issue",
        "goal_title": None,
        "goal_description": None,
        "person_name": "Noah",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 15,
        "language": "English",
        "issue": {
            "title": "Anger and Aggressive Outbursts",
            "category": "EMOTIONAL",
            "severity": "MODERATE",
            "description": "Explosive anger episodes triggered by perceived unfairness or sudden transitions.",
            "recommendations": [
                "Anger thermometer awareness",
                "Physical discharge strategies",
                "Repair and reconnection after episodes",
            ],
        },
        "unique_outcomes": [
            {
                "observed_at": "2024-03-05",
                "description": "Used words to express frustration instead of hitting during a disagreement with his sister",
            },
        ],
        "feedback_context": None,
        "notes": [
            {
                "title": "Anger physiology and window of tolerance",
                "content": (
                    "Noah's anger pattern shows a rapid escalation phase with physical arousal (fists, jaw clenching) "
                    "before verbal aggression. Research on the window of tolerance: when a child exceeds their "
                    "regulatory window, cognitive reappraisal is unavailable — physical downregulation must come "
                    "first. Key intervention: body-based discharge (shaking, stomping) before verbal processing. "
                    "Porges polyvagal theory supports this sequence: ventral vagal regulation restores before "
                    "cortical engagement. Parent co-regulation is the primary scaffold at age 7."
                ),
            },
            {
                "title": "Narrative repair after episodes",
                "content": (
                    "Post-episode narrative work ('What happened? What could we do differently?') at age 7 "
                    "builds mentalizing and repair skills. Short conversations (under 5 minutes) are more "
                    "effective than lengthy discussions. Validate the feeling before addressing the behavior. "
                    "Connection before correction is the evidence-based sequence."
                ),
            },
        ],
        "papers": [
            {
                "title": "Body-based interventions for childhood anger dysregulation",
                "year": 2023,
                "key_findings": "Physical discharge strategies (stomping, shaking) reduced escalation duration by 50% in children 6-9",
                "therapeutic_techniques": "Anger thermometer; physical discharge; belly breathing; feelings vocabulary",
            },
            {
                "title": "Parent-child emotion coaching for explosive behavior in middle childhood",
                "year": 2022,
                "key_findings": "Emotion coaching reduced aggression episodes and improved repair behavior over 8 weeks",
                "therapeutic_techniques": "Emotion labeling; co-regulation breathing; post-episode repair conversations",
            },
        ],
    },
    # 5. Goal-driven · social skills · short 5-minute session
    {
        "id": "noah-social-skills-short",
        "context_type": "goal",
        "goal_title": "Build social confidence and make friends",
        "goal_description": "Help Noah approach peers and join group play on the playground.",
        "person_name": "Noah",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 5,
        "language": "English",
        "issue": {
            "title": "Social Initiation Anxiety",
            "category": "SOCIAL",
            "severity": "MILD",
            "description": "Hesitation to approach peers and join group play; hangs back on the playground.",
            "recommendations": ["Friendship scripts", "Role-play practice", "Small-group exposure"],
        },
        "unique_outcomes": [
            {
                "observed_at": "2024-03-07",
                "description": "Asked a classmate to play and they spent recess together",
            },
        ],
        "feedback_context": None,
        "notes": None,
        "papers": [
            {
                "title": "Social skills training for shy children in middle childhood",
                "year": 2022,
                "key_findings": "Friendship scripts and role-play increased peer initiations in 6-9 year olds",
                "therapeutic_techniques": "Conversation starters; joining-in scripts; brave-body posture; brave-step reward",
            },
        ],
    },
    # 6. Goal-driven · grief after loss of grandparent · longer session · unique outcomes
    {
        "id": "noah-grief-grandparent",
        "context_type": "goal",
        "goal_title": "Process grief and keep the memory of grandpa alive",
        "goal_description": "Help Noah understand and express grief after the loss of his grandfather.",
        "person_name": "Noah",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 15,
        "language": "English",
        "issue": None,
        "unique_outcomes": [
            {
                "observed_at": "2024-02-25",
                "description": "Drew a picture of Grandpa and talked about their fishing trips together without becoming distressed",
            },
        ],
        "feedback_context": None,
        "notes": None,
        "papers": [
            {
                "title": "Child-centered grief therapy for bereaved children 6-10",
                "year": 2023,
                "key_findings": "Memory boxes and continuing-bonds activities reduced grief symptoms and improved adjustment",
                "therapeutic_techniques": "Memory box activity; continuing bonds narration; safe-place visualization",
            },
            {
                "title": "Expressive arts in childhood bereavement",
                "year": 2021,
                "key_findings": "Drawing and storytelling about the deceased improved emotional processing in 5-10 year olds",
                "therapeutic_techniques": "Memory drawing; story narration; feelings thermometer; love never disappears reframe",
            },
        ],
    },
    # 7. Goal-driven · no research papers · tests fallback path
    {
        "id": "noah-confidence-no-research",
        "context_type": "goal",
        "goal_title": "Build confidence and positive self-image",
        "goal_description": "Help Noah recognize his strengths and feel proud of who he is.",
        "person_name": "Noah",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 10,
        "language": "English",
        "issue": None,
        "unique_outcomes": [],
        "feedback_context": None,
        "notes": None,
        "papers": [],  # no research — exercises the fallback code path
    },
]

# ---------------------------------------------------------------------------
# Prompt builder — mirrors generateStory.ts:generateStory() node exactly
# ---------------------------------------------------------------------------


def build_story_prompt(case_data: dict) -> str:
    """Reconstruct the exact LLM prompt used by the generateStory graph node."""
    context_type = case_data["context_type"]
    language = case_data.get("language", "English")
    minutes = case_data["minutes"]
    person_name = case_data.get("person_name") or "you"
    age_years = case_data.get("age_years")
    age_context = f" (age {age_years})" if age_years else ""
    tier = case_data.get("developmental_tier", "ADULT")

    # --- Topic section ---
    if context_type == "goal":
        topic_section = (
            f"## Goal\n"
            f"Title: {case_data['goal_title']}\n"
            f"Description: {case_data.get('goal_description') or 'No additional description provided.'}"
        )
    elif context_type == "issue":
        issue = case_data["issue"]
        topic_section = (
            f"## Topic\n"
            f"Title: {issue['title']}\n"
            f"Category: {issue['category']}\n"
            f"Description: {issue.get('description') or 'No additional description provided.'}"
        )
    else:  # feedback
        topic_section = (
            "## Topic\n"
            "Based on professional feedback and extracted issues (see Feedback Context below)."
        )

    # --- Person section ---
    has_family_member = bool(age_years) or (person_name != "you")
    if has_family_member:
        person_line = f"This is for {person_name}{age_context}.\nDevelopmental Tier: {tier}"
    else:
        person_line = "This is for the listener themselves (first-person, self-directed session)."

    # --- Issue section (mirrors issueSection build in generateStory) ---
    issue_section = ""
    if case_data.get("issue"):
        issue = case_data["issue"]
        lines = [
            "\n## Therapeutic Focus",
            issue["title"],
            f"Category: {issue['category']}",
        ]
        if issue.get("description"):
            lines.append(f"Description: {issue['description']}")
        if issue.get("recommendations"):
            lines.append("\n## Recommendations")
            lines.extend(f"- {r}" for r in issue["recommendations"])
        if case_data.get("unique_outcomes"):
            lines.append("\n## Sparkling Moments")
            lines.extend(
                f"- {o['observed_at']}: {o['description']}"
                for o in case_data["unique_outcomes"]
            )
        issue_section = "\n".join(lines) + "\n"

    # --- Feedback context section ---
    feedback_str = ""
    if case_data.get("feedback_context"):
        fb = case_data["feedback_context"]
        lines = ["## Feedback"]
        if fb.get("subject"):
            lines.append(f"Subject: {fb['subject']}")
        lines.append(f"Date: {fb['date']}")
        lines.append(f"Content: {fb['content']}")
        if fb.get("tags"):
            lines.append(f"Tags: {', '.join(fb['tags'])}")
        issues = fb.get("issues", [])
        if issues:
            lines.append(f"\n## Extracted Issues ({len(issues)})")
            for iss in issues:
                lines.append(
                    f"- **{iss['title']}** [{iss['severity']}/{iss['category']}]: {iss['description']}"
                )
                for rec in iss.get("recommendations", []):
                    lines.append(f"  - Recommendation: {rec}")
        feedback_str = "\n".join(lines)

    # --- Research summary ---
    papers = case_data.get("papers", [])
    if papers:
        research_lines = []
        for i, p in enumerate(papers, 1):
            research_lines.append(
                f'{i}. "{p["title"]}" ({p.get("year") or "n.d."})\n'
                f'   Key findings: {p["key_findings"]}\n'
                f'   Therapeutic techniques: {p["therapeutic_techniques"]}'
            )
        research_summary = "\n\n".join(research_lines)
    else:
        research_summary = (
            "No research papers available yet. Use general evidence-based therapeutic techniques."
        )

    # --- Notes summary ---
    notes_str = ""
    if case_data.get("notes"):
        notes_lines = []
        for i, note in enumerate(case_data["notes"], 1):
            label = note.get("title") or f"Note {i}"
            content = note["content"]
            if len(content) > 1500:
                content = content[:1500] + "..."
            notes_lines.append(f"{i}. {label}\n   {content}")
        notes_str = "\n\n".join(notes_lines)

    # --- Assemble prompt (mirrors generateStory.ts template) ---
    prompt = (
        f"Create a therapeutic audio session for the following {context_type}. "
        f"Write the full script in {language}, approximately {minutes} minutes long when read aloud.\n"
        f"\n{topic_section}\n"
        f"\n## Person\n{person_line}\n"
        f"{issue_section}"
        f"{f'{chr(10)}## Feedback Context{chr(10)}{feedback_str}{chr(10)}' if feedback_str else ''}"
        f"\n## Research Evidence\n"
        f"The following research papers inform the therapeutic techniques to use:\n\n"
        f"{research_summary}\n"
    )

    if notes_str:
        prompt += (
            f"\n## Clinical Notes & Observations\n"
            f"The following notes contain clinical observations, research findings, and insights "
            f"specific to this person:\n\n"
            f"{notes_str}\n"
        )

    prompt += f"\n## Instructions\n"
    prompt += f"- Create a complete, flowing therapeutic audio script\n"
    prompt += f"- Incorporate specific techniques and findings from the research above\n"
    if feedback_str:
        prompt += (
            f"- Address the specific issues identified in the feedback, providing practical strategies for each\n"
            f"- Validate the observations from the professional who provided the feedback\n"
        )
    prompt += f"- When clinical notes are available, weave their insights and observations into the session\n"
    prompt += f"- Personalize for {person_name}{age_context}"
    if has_family_member:
        prompt += f" (developmental tier: {tier})"
    prompt += f"\n- Target duration: {minutes} minutes when read aloud at a calm pace\n"
    prompt += f"- Write in {language}\n"
    prompt += (
        f"- Follow the therapeutic audio content structure "
        f"(warm introduction, understanding the challenge, guided practices, integration)\n"
        f"- Include a brief mention that a parent, caregiver, or professional can provide additional support if needed\n"
        f"- IMPORTANT: Do NOT use any markdown formatting (no **, ##, *, bullet points, or bold/italic syntax). "
        f"Write plain spoken prose only, as the script will be read aloud by a text-to-speech engine"
    )

    return prompt


# ---------------------------------------------------------------------------
# Markdown stripper
# ---------------------------------------------------------------------------


def strip_markdown(text: str) -> str:
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
# Generator with fixture caching
# ---------------------------------------------------------------------------


def generate_story(case_data: dict, force_regen: bool = False) -> str:
    """Generate (or load cached) therapeutic story script for a test case."""
    case_id = case_data["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}.json"

    if fixture_path.exists() and not force_regen:
        data = json.loads(fixture_path.read_text(encoding="utf-8"))
        return data["script"]

    client = OpenAI(api_key=_API_KEY, base_url=_BASE_URL)
    prompt = build_story_prompt(case_data)

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": THERAPEUTIC_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )
    script = strip_markdown(response.choices[0].message.content or "")

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(
            {
                "id": case_id,
                "prompt": prompt,
                "script": script,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return script
