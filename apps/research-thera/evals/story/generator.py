"""Story generator with fixture caching.

All test cases center on Sam, a 7-year-old boy (MIDDLE_CHILDHOOD tier).
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
You are a Therapeutic Audio Content Agent. Your role is to create evidence-based, compassionate therapeutic guidance delivered as spoken audio. Every word you write will be read aloud by a text-to-speech engine, so you must write exclusively for the ear — never for the eye.

## Audio-First Writing Rules
These rules are non-negotiable. Every sentence must pass the "read it aloud" test.

1. NO markdown of any kind — no **, ##, *, -, bullet points, numbered lists, or formatting symbols. Write flowing spoken prose only.
2. NO visual structure — no headers, labels, section dividers, or enumeration. Transitions happen through spoken cues: "Now let's try something new..." or "Here's what I'd love you to do next..."
3. NO bracket markers — do NOT write [pause], [sound:x], or any bracket notation. TTS engines read these literally. Use "..." (three dots) for all pauses — between sections, after instructions, within sentences. A 7-year-old needs time to process — use "..." generously.
4. Sentence length — maximum 15 words per sentence for children, 20 for adults. Break complex ideas into multiple short sentences.
5. Spoken transitions — use temporal and sequential cues the listener can follow: "First..." "Now..." "Next..." "When you're ready..." "Good. Now let's..."
6. Pronunciation-safe words — avoid homophones that confuse TTS, unusual punctuation, or words that sound different than they look. Prefer simple, common words.
7. Pacing variation — alternate between instruction, story, and silence. Never give more than two instructions in a row without an ellipsis pause or encouragement.
8. Breath cues — NEVER write "take a deep breath" or "breathe in deeply" without explicit counted timing immediately after. ALWAYS write the full count: "Breathe in... two... three... four... And slowly breathe out... two... three... four... five..." A child needs the counted pacing to follow along. If you mention breathing at all, you MUST include numbered counts.

## Content Structure
Create therapeutic audio content with these spoken sections (do NOT label them — just flow naturally):

Warm Opening (about 30 seconds) — greet the child by name, acknowledge their challenge with empathy, set a calm playful tone, preview what comes next.

Understanding Together (1-2 minutes) — explain the difficulty in simple concrete terms. Normalize: "Lots of kids feel this way." Use a short metaphor or story to illustrate.

Guided Practices (majority of time) — provide specific, actionable techniques. For children, frame as play, imagination, or adventure. Guide step-by-step with pauses between each instruction. Include at least one body-based activity (breathing, movement, squeezing hands). When including breathing, ALWAYS write counted timing: "Breathe in... two... three... four..."

Wrapping Up (1 minute) — summarize in one or two simple sentences. Suggest one thing to practice with a parent or caregiver. End with warm encouragement and affirmation.

## LEGO Therapeutic Play Integration
When LEGO play is appropriate (especially for children in EARLY_CHILDHOOD and MIDDLE_CHILDHOOD tiers), weave LEGO building into the therapeutic session as a hands-on modality:

Building as Metaphor — use LEGO construction as a therapeutic metaphor throughout the session. Examples:
- Emotions as colored bricks: "Imagine each feeling is a different colored LEGO brick. The red ones might be angry feelings. The blue ones are sad feelings. And the yellow ones? Those are happy, sunny feelings."
- Building resilience: "Every time you try something brave, you're adding another brick to your tower of courage."
- Problem-solving: "When something doesn't work, you can take it apart and try building it a different way — just like with LEGO."
- Safe container: "Let's build an imaginary LEGO box where you can put your worries. You choose the color and the size."

Building Activities — guide the child through simple LEGO building during the session with clear spoken instructions:
- "If you have some LEGO bricks nearby, pick up a few now... Choose a color that feels calm to you."
- "Now add one brick for something that made you feel brave today... Good."
- "Keep building while I tell you a story about a little builder who learned something important..."
- Always make LEGO activities optional: "If you have LEGO bricks, you can build along. If not, just imagine building in your mind."

Therapeutic LEGO Techniques:
- Feelings Tower: Each brick represents a feeling from the day — build, name, and process
- Worry Wall: Build a small wall, then practice "knocking it down" as a release
- Brave Bridge: Build a bridge from "here" to "where I want to be" — each brick is a brave step
- Memory Build: Construct something that reminds the child of a happy memory or person
- Calm Castle: Build a safe place the child can "go to" when feelings get big

Always connect the building back to the therapeutic goal. The LEGO activity is never just play — it's a concrete, hands-on way to practice the coping skill being taught.

## Evidence-Based Approaches
Draw from:
- Cognitive Behavioral Therapy (CBT)
- Mindfulness-Based Stress Reduction (MBSR)
- Acceptance and Commitment Therapy (ACT)
- Dialectical Behavior Therapy (DBT)
- Positive Psychology interventions
- LEGO-Based Therapy (LeGoff et al.) — collaborative building for social skills, turn-taking, and emotional regulation
- Play Therapy — structured therapeutic play as primary modality for children

## Voice Guidelines
- Write for spoken audio, not reading — every sentence must sound natural when spoken aloud
- Use natural, conversational language with contractions ("let's", "you're", "that's")
- Create pauses using "..." — never bracket markers like [pause]
- Avoid complex sentences or jargon
- Use "you" to create direct connection with the listener
- Maintain a calm, warm, professional tone
- For children: playful, encouraging, gently excited when celebrating successes
- Speak slowly and clearly for relaxation effects

## Duration Management
- For 5-minute sessions: One core technique with playful framing, very brief opening and close
- For 10-minute sessions: Opening + 1-2 practices (one can be LEGO-based) + wrap-up
- For 15-20 minute sessions: Full structure with multiple practices, at least one hands-on LEGO activity
- For 30+ minute sessions: Deep dive with extended guided exercises and building projects

## Safety & Ethics
- Never diagnose or replace professional therapy
- Encourage seeking professional help for serious concerns
- Focus on skill-building and coping strategies
- Maintain appropriate boundaries
- Use inclusive, non-judgmental language
- LEGO activities must be age-appropriate and safe (no small pieces for very young children without supervision mention)

## Example Opening (7-year-old, with LEGO)
"Hi there... I'm really glad you're here today... You know what? You're already being really brave just by listening... Today we're going to do something fun together. We're going to build something... and learn something cool about big feelings at the same time. If you have some LEGO bricks near you, grab a few now... Any colors you like... And if you don't have any, that's totally fine. We can imagine building together... Ready? Let's start..."
"""

# ---------------------------------------------------------------------------
# Test cases — all centered on Sam, a 7-year-old boy (MIDDLE_CHILDHOOD)
# ---------------------------------------------------------------------------

TEST_CASES = [
    # 1. Goal-driven · bedtime anxiety · issue + unique outcomes (standard happy path)
    {
        "id": "sam-bedtime-anxiety",
        "context_type": "goal",
        "goal_title": "Reduce bedtime anxiety and fall asleep independently",
        "goal_description": "Help Sam manage fear at bedtime and build confidence sleeping alone.",
        "person_name": "Sam",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 10,
        "language": "English",
        "issue": {
            "title": "Bedtime Fear and Sleep Avoidance",
            "category": "BEHAVIORAL",
            "severity": "MODERATE",
            "description": "Sam becomes anxious at bedtime, needing a parent to stay until he falls asleep.",
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
        "id": "sam-school-worry-short",
        "context_type": "goal",
        "goal_title": "Manage worry about school",
        "goal_description": "Help Sam calm worries about school performance, friendships, and fitting in.",
        "person_name": "Sam",
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
        "id": "sam-teacher-feedback",
        "context_type": "feedback",
        "goal_title": None,
        "goal_description": None,
        "person_name": "Sam",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 10,
        "language": "English",
        "issue": None,
        "unique_outcomes": [],
        "feedback_context": {
            "subject": "Classroom observations — Sam",
            "date": "2024-03-10",
            "content": (
                "Sam struggles to wait his turn during group activities and often blurts out answers. "
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
        "id": "sam-anger-management-notes",
        "context_type": "issue",
        "goal_title": None,
        "goal_description": None,
        "person_name": "Sam",
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
                    "Sam's anger pattern shows a rapid escalation phase with physical arousal (fists, jaw clenching) "
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
        "id": "sam-social-skills-short",
        "context_type": "goal",
        "goal_title": "Build social confidence and make friends",
        "goal_description": "Help Sam approach peers and join group play on the playground.",
        "person_name": "Sam",
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
    # 6. Goal-driven · grief after loss of grandparent · longer session
    {
        "id": "sam-grief-grandparent",
        "context_type": "goal",
        "goal_title": "Process grief and keep the memory of grandpa alive",
        "goal_description": "Help Sam understand and express grief after the loss of his grandfather.",
        "person_name": "Sam",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 15,
        "language": "English",
        "issue": None,
        "unique_outcomes": [],
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
        "id": "sam-confidence-no-research",
        "context_type": "goal",
        "goal_title": "Build confidence and positive self-image",
        "goal_description": "Help Sam recognize his strengths and feel proud of who he is.",
        "person_name": "Sam",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 10,
        "language": "English",
        "issue": None,
        "unique_outcomes": [],
        "feedback_context": None,
        "notes": None,
        "papers": [],  # no research — exercises the fallback code path
        "lego_play": False,
    },
    # 8. LEGO · bedtime anxiety · Calm Castle building + brave tower
    {
        "id": "sam-lego-bedtime-calm-castle",
        "context_type": "goal",
        "goal_title": "Reduce bedtime anxiety and fall asleep independently",
        "goal_description": "Help Sam manage fear at bedtime using LEGO-based therapeutic play.",
        "person_name": "Sam",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 10,
        "language": "English",
        "issue": {
            "title": "Bedtime Fear and Sleep Avoidance",
            "category": "BEHAVIORAL",
            "severity": "MODERATE",
            "description": "Sam becomes anxious at bedtime, needing a parent to stay until he falls asleep.",
            "recommendations": [
                "Build a LEGO Calm Castle as a safe-place visualization",
                "Gradual fading of parent presence",
                "Brave Tower — add a brick each night he stays in bed",
            ],
        },
        "unique_outcomes": [
            {
                "observed_at": "2024-03-01",
                "description": "Built a small LEGO house and said 'this is where brave kids sleep'",
            },
        ],
        "feedback_context": None,
        "notes": None,
        "papers": [
            {
                "title": "LEGO-based therapy for anxiety in middle childhood: a pilot RCT",
                "year": 2023,
                "key_findings": "Structured LEGO building reduced anxiety scores by 30% over 8 sessions; children reported feeling 'in control' during building",
                "therapeutic_techniques": "Calm Castle building; feelings color-coding with bricks; gradual exposure through play scenarios",
            },
            {
                "title": "Graduated extinction and parental fading for pediatric sleep problems",
                "year": 2023,
                "key_findings": "Gradual parental fading reduced sleep-onset latency by 40%; gains maintained at 6 months",
                "therapeutic_techniques": "Parental fading; bedtime pass technique; positive reinforcement of brave behavior",
            },
        ],
        "lego_play": True,
    },
    # 9. LEGO · anger management · Feelings Tower + Worry Wall
    {
        "id": "sam-lego-anger-feelings-tower",
        "context_type": "issue",
        "goal_title": None,
        "goal_description": None,
        "person_name": "Sam",
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
                "Feelings Tower — name and stack feelings with colored bricks",
                "Worry Wall — build and knock down to practice emotional release",
                "Physical discharge strategies",
            ],
        },
        "unique_outcomes": [
            {
                "observed_at": "2024-03-05",
                "description": "Used words to express frustration instead of hitting during a disagreement with his sister",
            },
            {
                "observed_at": "2024-03-10",
                "description": "Built a 'feelings tower' with his dad and named each color-feeling",
            },
        ],
        "feedback_context": None,
        "notes": [
            {
                "title": "LEGO as emotional regulation scaffold",
                "content": (
                    "Sam responds well to concrete, tactile activities. LEGO building provides "
                    "a physical outlet that channels energy while maintaining cognitive engagement. "
                    "The act of choosing, placing, and naming bricks creates a natural slow-down "
                    "in his escalation cycle. LeGoff's LEGO therapy model shows collaborative "
                    "building teaches turn-taking, frustration tolerance, and joint problem-solving."
                ),
            },
        ],
        "papers": [
            {
                "title": "LEGO-Based Therapy for emotional regulation in children with behavioral difficulties",
                "year": 2023,
                "key_findings": "LEGO-based therapy improved emotional regulation and reduced aggressive incidents by 45% in children aged 6-10",
                "therapeutic_techniques": "Feelings Tower (color-coded emotional bricks); collaborative building for frustration tolerance; structured destruction and rebuild for anger release",
            },
            {
                "title": "Body-based interventions for childhood anger dysregulation",
                "year": 2023,
                "key_findings": "Physical discharge strategies (stomping, shaking) reduced escalation duration by 50% in children 6-9",
                "therapeutic_techniques": "Anger thermometer; physical discharge; belly breathing; feelings vocabulary",
            },
        ],
        "lego_play": True,
    },
    # 10. LEGO · social skills · Brave Bridge building for peer interaction
    {
        "id": "sam-lego-social-brave-bridge",
        "context_type": "goal",
        "goal_title": "Build social confidence and make friends",
        "goal_description": "Help Sam approach peers using LEGO collaborative building as a social bridge.",
        "person_name": "Sam",
        "age_years": 7,
        "developmental_tier": "MIDDLE_CHILDHOOD",
        "minutes": 10,
        "language": "English",
        "issue": {
            "title": "Social Initiation Anxiety",
            "category": "SOCIAL",
            "severity": "MILD",
            "description": "Hesitation to approach peers and join group play; hangs back on the playground.",
            "recommendations": [
                "Brave Bridge — build a bridge from 'here' to 'where I want to be'",
                "LEGO invitation scripts — use building as a way to approach peers",
                "Role-play with LEGO figures for social scenario practice",
            ],
        },
        "unique_outcomes": [
            {
                "observed_at": "2024-03-07",
                "description": "Asked a classmate to play and they spent recess together",
            },
            {
                "observed_at": "2024-03-12",
                "description": "Brought LEGO to school and invited two classmates to build with him",
            },
        ],
        "feedback_context": None,
        "notes": None,
        "papers": [
            {
                "title": "LEGO-Based Therapy as a social skills intervention: systematic review",
                "year": 2022,
                "key_findings": "LEGO therapy improved social initiation, turn-taking, and collaborative play in children aged 6-11; effects sustained at 6-month follow-up",
                "therapeutic_techniques": "Collaborative LEGO building; role assignment (engineer, supplier, builder); LEGO invitation scripts; structured social scenarios with minifigures",
            },
            {
                "title": "Social skills training for shy children in middle childhood",
                "year": 2022,
                "key_findings": "Friendship scripts and role-play increased peer initiations in 6-9 year olds",
                "therapeutic_techniques": "Conversation starters; joining-in scripts; brave-body posture; brave-step reward",
            },
        ],
        "lego_play": True,
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
    is_child = tier != "ADULT"
    age_label = f"{age_years}-year-old child" if age_years else "child"

    if has_family_member:
        person_line = f"This is for {person_name}{age_context}.\nDevelopmental Tier: {tier}"
        # Mirror the ageEnforcementBlock from generateStoryTask.ts — required for eval accuracy
        if is_child:
            person_line += (
                f"\n\nCRITICAL AGE REQUIREMENT: {person_name} is a {age_label} ({tier} tier). "
                f"Every word of this script MUST be written for a child, NOT for an adult.\n"
                f"- Use only simple words (1-2 syllables when possible).\n"
                f"- Use playful, warm, concrete language — no abstract adult concepts.\n"
                f"- NEVER say {person_name} is \"normal like an adult\", \"behaves like an adult\", "
                f"or describe adult-level coping.\n"
                f"- NEVER use adult register, adult emotional vocabulary, or adult expectations.\n"
                f"- If you find yourself writing for a grown-up, stop and rewrite for a {age_label}."
            )
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

    # --- LEGO play section ---
    # If lego_play not explicitly set, derive from tier (matching production behavior)
    lego_str = ""
    if "lego_play" in case_data:
        lego_play = case_data["lego_play"]
    else:
        lego_play = tier in ("EARLY_CHILDHOOD", "MIDDLE_CHILDHOOD", "EARLY_ADOLESCENCE")
    if lego_play:
        lego_str = (
            "\n## LEGO Therapeutic Play (REQUIRED)\n"
            "This session MUST integrate LEGO building as a hands-on therapeutic activity. "
            "This is NOT optional — LEGO play is a core modality for this age group:\n"
            "- Use LEGO construction as a metaphor for the therapeutic concept "
            "(e.g., building a 'brave tower,' 'feelings wall,' or 'calm castle')\n"
            "- MUST include at least one guided LEGO building moment with clear spoken instructions "
            "and pauses for the child to build\n"
            "- Make LEGO participation optional for the listener: 'If you have some LEGO bricks, grab a few now... "
            "if not, just imagine building in your mind'\n"
            "- Connect every building activity back to the therapeutic goal — "
            "the building IS the practice, not a distraction\n"
            "- Name specific LEGO techniques: Feelings Tower, Worry Wall, Brave Bridge, "
            "Memory Build, or Calm Castle — whichever fits the goal\n"
            "- Dedicate at least 30% of the session time to LEGO-based activities\n"
        )

    # --- Assemble prompt (mirrors generateStoryTask.ts template) ---
    max_sentence_words = 15 if is_child else 20
    target_words = minutes * 120

    prompt = (
        f"Create a therapeutic audio session for the following {context_type}. "
        f"Write the full script in {language}, approximately {minutes} minutes long "
        f"when read aloud at a calm pace of about 120 words per minute.\n"
        f"\nCRITICAL: This script will be read aloud by a text-to-speech engine. "
        f"Write ONLY plain spoken prose. Absolutely NO markdown formatting — "
        f"no **, ##, *, -, bullet points, numbered lists, headers, bold, or italic syntax. "
        f"No section labels. Just natural flowing speech.\n"
        f"\n{topic_section}\n"
        f"\n## Person\n{person_line}\n"
        f"{issue_section}"
        f"{f'{chr(10)}## Feedback Context{chr(10)}{feedback_str}{chr(10)}' if feedback_str else ''}"
        f"\n## Research Evidence\n"
        f"The following research papers inform the therapeutic techniques to use:\n\n"
        f"{research_summary}\n"
        f"{lego_str}"
    )

    if notes_str:
        prompt += (
            f"\n## Clinical Notes & Observations\n"
            f"The following notes contain clinical observations, research findings, and insights "
            f"specific to this person:\n\n"
            f"{notes_str}\n"
        )

    prompt += f"\n## Audio Script Requirements\n"
    prompt += f"- Write as spoken prose ONLY — the listener cannot see any text, they can only hear\n"
    prompt += f'- Use "..." (three dots) for all pauses — between sections, after instructions, within sentences. NEVER write [pause] or any bracket markers — TTS engines read them literally\n'
    prompt += f"- Keep sentences short: maximum {max_sentence_words} words each\n"
    prompt += f'- Use spoken transitions: "Now..." "Next..." "When you\'re ready..." "Good. Let\'s try..."\n'
    prompt += f'- CRITICAL: Every breathing exercise MUST have explicit counted timing. NEVER write just "take a deep breath". ALWAYS write: "Breathe in... two... three... four... And slowly breathe out... two... three... four... five..." If you mention breathing at all, include the numbered counts.\n'
    prompt += f"- Vary pacing: alternate between instruction, story or metaphor, and silence\n"
    prompt += f"- Never give more than two instructions in a row without an ellipsis pause or encouragement\n"
    prompt += f"- Incorporate specific techniques and findings from the research above\n"
    if feedback_str:
        prompt += (
            f"- Address the specific issues identified in the feedback, providing practical strategies for each\n"
            f"- Validate the observations from the professional who provided the feedback\n"
        )
    prompt += f"- When clinical notes are available, weave their insights and observations into the session\n"
    prompt += f"- Address {person_name} by name at least 3 times throughout the session\n"
    prompt += f"- Personalize for {person_name}{age_context}"
    if has_family_member:
        prompt += f" (developmental tier: {tier})"
    if is_child:
        prompt += (
            f"\n- This is for a {age_label} — use child vocabulary, playful framing, "
            f"and age-appropriate techniques throughout. Never adult-register."
        )
    if lego_play:
        prompt += (
            "\n- LEGO play is REQUIRED for this session — include guided LEGO building "
            "activities as described in the LEGO Therapeutic Play section above"
        )
    prompt += f"\n- Target duration: {minutes} minutes (approximately {target_words} words at calm pace)\n"
    prompt += f"- Write in {language}\n"
    prompt += (
        f"- Include a brief mention that a parent, caregiver, or professional "
        f"can provide additional support if needed"
    )

    return prompt


# ---------------------------------------------------------------------------
# Markdown stripper
# ---------------------------------------------------------------------------


def strip_markdown(text: str) -> str:
    # Convert bracket markers to TTS-safe equivalents (LLM ignores the "no [pause]" rule)
    text = re.sub(r"\[pause\]", "...", text, flags=re.IGNORECASE)
    text = re.sub(r"\[sound:[^\]]*\]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\[[^\]]+\]", "", text)  # remove any remaining bracket annotations
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
