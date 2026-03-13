"""Therapeutic script generator with fixture caching."""

import json
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
import os

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
_BASE_URL = "https://api.deepseek.com"

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# ---------------------------------------------------------------------------
# System prompt — verbatim from src/agents/index.ts therapeuticInstructions
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
# Test cases
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "id": "young-child-anxiety",
        "goal_title": "Separation anxiety at preschool drop-off",
        "goal_description": "Help Emma feel safe and confident when saying goodbye at preschool.",
        "person_name": "Emma",
        "age_years": 4,
        "developmental_tier": "EARLY_CHILDHOOD",
        "minutes": 5,
        "language": "English",
        "characteristic": None,
        "papers": [
            {
                "title": "Parent-child attachment and separation anxiety in early childhood",
                "year": 2021,
                "key_findings": "Secure attachment reduces separation anxiety; predictable goodbye rituals lower cortisol",
                "therapeutic_techniques": "Brief predictable goodbye ritual; reassurance statements; transitional object use",
            },
            {
                "title": "Play-based CBT for preschool anxiety",
                "year": 2022,
                "key_findings": "Puppet-mediated exposure reduces avoidance in 4-year-olds; parent coaching effective",
                "therapeutic_techniques": "Gradual exposure; brave-kid praise; simple breathing (balloon breath)",
            },
        ],
    },
    {
        "id": "teen-academic-stress",
        "goal_title": "Manage exam stress and perfectionism",
        "goal_description": "Help Alex develop healthy study habits and reduce perfectionist thinking around grades.",
        "person_name": "Alex",
        "age_years": 15,
        "developmental_tier": "LATE_ADOLESCENCE",
        "minutes": 10,
        "language": "English",
        "characteristic": None,
        "papers": [
            {
                "title": "Cognitive defusion for adolescent perfectionism",
                "year": 2023,
                "key_findings": "ACT-based defusion reduced exam anxiety scores by 34% in high-school students",
                "therapeutic_techniques": "Leaves-on-a-stream visualization; unhooking from self-critical thoughts; values clarification",
            },
            {
                "title": "MBSR adaptation for adolescent academic stress",
                "year": 2022,
                "key_findings": "8-week MBSR reduced cortisol and improved GPA in high-achieving teens",
                "therapeutic_techniques": "Body-scan practice; mindful breathing; non-judgmental observation of thoughts",
            },
        ],
    },
    {
        "id": "adult-sleep",
        "goal_title": "Improve sleep quality and reduce nighttime rumination",
        "goal_description": "Help Jamie establish a calming pre-sleep routine and quiet racing thoughts at bedtime.",
        "person_name": "Jamie",
        "age_years": None,
        "developmental_tier": "ADULT",
        "minutes": 10,
        "language": "English",
        "characteristic": None,
        "papers": [
            {
                "title": "CBT-I for insomnia and nighttime rumination",
                "year": 2023,
                "key_findings": "Stimulus control and sleep restriction reduce sleep onset latency by 40%; cognitive restructuring targets worry",
                "therapeutic_techniques": "Worry postponement; constructive worry journaling; progressive muscle relaxation",
            },
            {
                "title": "Mindfulness-based interventions for sleep disturbance",
                "year": 2021,
                "key_findings": "MBSR improves sleep quality index scores; body-scan reduces pre-sleep arousal",
                "therapeutic_techniques": "Body-scan for sleep; mindful breathing 4-7-8; letting-go visualization",
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Prompt builder — mirrors generateStoryTask.ts prompt template
# ---------------------------------------------------------------------------


def build_prompt(case_data: dict) -> str:
    name = case_data["person_name"]
    age_years = case_data.get("age_years")
    age_context = f" (age {age_years})" if age_years else ""
    tier = case_data["developmental_tier"]
    minutes = case_data["minutes"]
    language = case_data.get("language", "English")

    # Build research summary (mirrors lines 110-117 of generateStoryTask.ts)
    papers = case_data.get("papers", [])
    if papers:
        research_lines = []
        for i, p in enumerate(papers, 1):
            research_lines.append(
                f'{i}. "{p["title"]}" ({p["year"] or "n.d."})\n'
                f'   Key findings: {p["key_findings"]}\n'
                f'   Therapeutic techniques: {p["therapeutic_techniques"]}'
            )
        research_summary = "\n\n".join(research_lines)
    else:
        research_summary = "No research papers available yet. Use general evidence-based therapeutic techniques."

    # Build characteristics section (mirrors lines 136-160 of generateStoryTask.ts)
    characteristics_section = ""
    characteristic = case_data.get("characteristic")
    if characteristic:
        lines = []
        label = characteristic.get("externalized_name") or characteristic.get("title", "")
        lines.append(f"\n## Therapeutic Focus")
        lines.append(label)
        lines.append(f'Category: {characteristic.get("category", "")}')
        if characteristic.get("description"):
            lines.append(f'Description: {characteristic["description"]}')
        if characteristic.get("strengths"):
            lines.append(f"\n## Strengths")
            lines.append(characteristic["strengths"])
        sparkling = characteristic.get("sparkling_moments", [])
        if sparkling:
            lines.append(f"\n## Sparkling Moments")
            lines.extend(f'- {m["observed_at"]}: {m["description"]}' for m in sparkling)
        characteristics_section = "\n".join(lines) + "\n"

    prompt = (
        f"Create a therapeutic audio session for the following goal. "
        f"Write the full script in {language}, approximately {minutes} minutes long when read aloud.\n"
        f"\n## Goal\n"
        f'Title: {case_data["goal_title"]}\n'
        f'Description: {case_data.get("goal_description") or "No additional description provided."}\n'
        f"\n## Person\n"
        f"This is for {name}{age_context}.\n"
        f"Developmental Tier: {tier}\n"
        f"{characteristics_section}"
        f"\n## Research Evidence\n"
        f"The following research papers inform the therapeutic techniques to use:\n"
        f"\n{research_summary}\n"
        f"\n## Instructions\n"
        f"- Create a complete, flowing therapeutic audio script\n"
        f"- Incorporate specific techniques and findings from the research above\n"
        f"- Personalize for {name}{age_context} (developmental tier: {tier})\n"
        f"- Target duration: {minutes} minutes when read aloud at a calm pace\n"
        f"- Write in {language}\n"
        f"- Follow the therapeutic audio content structure (warm introduction, understanding the challenge, guided practices, integration)\n"
        f"- Include a brief mention that a parent, caregiver, or professional can provide additional support if needed\n"
        f"- IMPORTANT: Do NOT use any markdown formatting (no **, ##, *, bullet points, or bold/italic syntax). "
        f"Write plain spoken prose only, as it will be read aloud by a text-to-speech engine."
    )
    return prompt


# ---------------------------------------------------------------------------
# Markdown stripper — removes formatting that breaks TTS
# ---------------------------------------------------------------------------

import re


def strip_markdown(text: str) -> str:
    """Remove markdown formatting from a TTS script."""
    # Remove bold/italic: **text** -> text, *text* -> text, __text__ -> text, _text_ -> text
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"\*(.+?)\*", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"__(.+?)__", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"_(.+?)_", r"\1", text, flags=re.DOTALL)
    # Remove ATX headings: ## Heading -> Heading
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove leading bullet/numbered list markers
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Generator with fixture caching
# ---------------------------------------------------------------------------


def generate_script(case_data: dict, force_regen: bool = False) -> str:
    """Generate (or load cached) therapeutic script for a test case."""
    case_id = case_data["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}.json"

    if fixture_path.exists() and not force_regen:
        data = json.loads(fixture_path.read_text(encoding="utf-8"))
        return data["script"]

    client = OpenAI(api_key=_API_KEY, base_url=_BASE_URL)
    prompt = build_prompt(case_data)

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
