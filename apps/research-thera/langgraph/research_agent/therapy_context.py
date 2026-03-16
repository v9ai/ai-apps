"""Therapy context data models and prompt builders — port of crates/research/src/therapy_context.rs"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class IssueData:
    title: str
    description: str
    category: str  # academic | behavioral | social | emotional | developmental | health | communication | other
    severity: str  # low | medium | high
    recommendations: list[str] = field(default_factory=list)


@dataclass
class TherapyContext:
    goal_id: int
    family_member_id: int
    therapeutic_goal_type: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    impairment_domains: list[str] = field(default_factory=list)
    target_population: str = "children adolescents families"
    focus_keywords: list[str] = field(default_factory=list)
    extracted_issues: list[IssueData] = field(default_factory=list)

    @classmethod
    def from_characteristic_data(
        cls,
        id: int,
        family_member_id: int,
        category: str,
        title: str,
        description: Optional[str],
        severity: Optional[str],
        impairment_domains_json: Optional[str],
    ) -> "TherapyContext":
        impairment_domains: list[str] = []
        if impairment_domains_json:
            try:
                impairment_domains = json.loads(impairment_domains_json)
            except (json.JSONDecodeError, TypeError):
                pass
        focus_keywords = infer_focus_keywords(category, title, [])
        return cls(
            goal_id=id,
            family_member_id=family_member_id,
            therapeutic_goal_type=category,
            title=title,
            description=description,
            category=category,
            severity=severity,
            impairment_domains=impairment_domains,
            target_population="children adolescents families",
            focus_keywords=focus_keywords,
            extracted_issues=[],
        )

    @classmethod
    def from_feedback_data(
        cls,
        feedback_id: int,
        family_member_id: int,
        subject: str,
        content: str,
        tags_json: Optional[str],
        issues: list[IssueData],
    ) -> "TherapyContext":
        impairment_domains: list[str] = []
        if tags_json:
            try:
                impairment_domains = json.loads(tags_json)
            except (json.JSONDecodeError, TypeError):
                pass
        for issue in issues:
            if issue.category not in impairment_domains:
                impairment_domains.append(issue.category)

        if not issues:
            therapeutic_goal_type = "Feedback-based Intervention"
        else:
            dominant = max(issues, key=lambda i: _severity_rank(i.severity))
            therapeutic_goal_type = _category_to_goal_type(dominant.category)

        focus_keywords = infer_focus_keywords("Feedback", subject, issues)
        return cls(
            goal_id=feedback_id,
            family_member_id=family_member_id,
            therapeutic_goal_type=therapeutic_goal_type,
            title=subject,
            description=content,
            category="Feedback",
            severity=None,
            impairment_domains=impairment_domains,
            target_population="children adolescents families",
            focus_keywords=focus_keywords,
            extracted_issues=issues,
        )

    @classmethod
    def from_goal_file(cls, path: str) -> "TherapyContext":
        with open(path) as f:
            goal = json.load(f)
        impairment_domains = [
            s.strip()
            for s in (goal.get("impairment_domains") or "").split(",")
            if s.strip()
        ]
        focus_keywords = infer_focus_keywords(goal["therapeutic_goal_type"], goal["title"], [])
        return cls(
            goal_id=goal["goal_id"],
            family_member_id=goal["family_member_id"],
            therapeutic_goal_type=goal["therapeutic_goal_type"],
            title=goal["title"],
            description=goal.get("description"),
            category=goal.get("category"),
            severity=goal.get("severity"),
            impairment_domains=impairment_domains,
            target_population=goal.get("target_population", "children adolescents"),
            focus_keywords=focus_keywords,
        )

    @classmethod
    def from_support_need(cls, path: str) -> "TherapyContext":
        with open(path) as f:
            sn = json.load(f)
        impairment_domains = [
            s.strip()
            for s in (sn.get("impairment_domains") or "").split(",")
            if s.strip()
        ]
        focus_keywords = infer_focus_keywords(sn["category"], sn["title"], [])
        return cls(
            goal_id=sn["characteristic_id"],
            family_member_id=sn["family_member_id"],
            therapeutic_goal_type=sn["category"],
            title=sn["title"],
            description=sn.get("description"),
            category=sn["category"],
            severity=sn.get("severity"),
            impairment_domains=impairment_domains,
            target_population="children adolescents families",
            focus_keywords=focus_keywords,
        )

    def build_agent_prompt(self) -> str:
        domains_str = ", ".join(self.impairment_domains)
        keywords_str = ", ".join(self.focus_keywords)
        queries = generate_search_queries(
            self.therapeutic_goal_type,
            self.title,
            self.impairment_domains,
            self.extracted_issues,
        )
        queries_block = "\n".join(f'  {i + 1}. "{q}"' for i, q in enumerate(queries))
        severity_context = f"- **Severity:** {self.severity}\n" if self.severity else ""
        description_context = f"- **Description:** {self.description}\n" if self.description else ""

        issues_section = ""
        if self.extracted_issues:
            high_issues = [i.title for i in self.extracted_issues if i.severity == "high"]
            table_rows = "\n".join(
                f"| {i.title} | {i.category} | {i.severity} |"
                for i in self.extracted_issues
            )
            high_list = ", ".join(high_issues) if high_issues else "none identified"
            issues_section = (
                "\n## Extracted Issues from Feedback\n"
                "| Title | Category | Severity |\n"
                "|-------|----------|----------|\n"
                f"{table_rows}\n\n"
                f"Focus research on the HIGH severity issues first: {high_list}\n"
            )

        goal_type = self.therapeutic_goal_type
        goal_id = self.goal_id
        title = self.title
        domains = domains_str
        population = self.target_population
        keywords = keywords_str

        return f"""\
You are a clinical research specialist for a therapeutic platform supporting children and families.
Your job: search academic literature and return evidence-based therapeutic technique recommendations.

## Current Therapeutic Context
- **Goal ID:** {goal_id}
- **Goal Type:** {goal_type}
- **Title:** {title}
{description_context}{severity_context}- **Impairment Domains:** {domains}
- **Target Population:** {population}
- **Focus Keywords:** {keywords}
{issues_section}
## Research Task

Search for academic papers relevant to **{goal_type}** interventions, particularly for {population}.

**Run searches for each of these queries** (use search_papers for each):
{queries_block}

For the most promising 4–5 papers, call get_paper_detail to get their full abstract and TLDR.

**Prioritise:**
1. Meta-analyses and systematic reviews (highest evidence level)
2. Randomized controlled trials (RCTs)
3. Papers with explicit therapeutic techniques and outcome measures
4. Papers specific to {population}
5. Papers from 2015+ (current evidence base)

## Required Output Format

Return a structured markdown report in EXACTLY this format:

```markdown
# Therapeutic Research — {goal_type}

## Context
- **Title:** {title}
- **Population:** {population}
- **Domains:** {domains}

## Papers Reviewed

### [1] <Title> (<Year>, <N> citations)
- **Authors:** ...
- **Evidence Level:** meta-analysis | RCT | cohort | case-series | case-study
- **Relevance:** high | medium | low
- **Population:** children | adolescents | adults | families
- **Key Finding:** (1–2 sentences: what did this study conclude?)
- **Therapeutic Techniques:** technique1, technique2, ...
- **DOI:** 10.xxx/yyy
- **Source:** <url>

... (one block per paper, at least 4 papers)

## Aggregated Therapeutic Techniques

Based on the literature, for **{goal_type}** in {population}:

| Technique | Evidence Base | Target | Key Papers | Confidence |
|-----------|---------------|--------|------------|------------|
| technique1 | meta-analysis | children | [1,3] | high |
| technique2 | RCT | adolescents | [2,4] | medium |

## Evidence Assessment
- Total papers reviewed: N
- Meta-analyses: N
- RCTs: N
- Population-specific: N
- Overall confidence: X%

## Recommended JSON Output

```json
{{
  "goal_id": {goal_id},
  "therapeutic_goal_type": "{goal_type}",
  "papers": [
    {{
      "title": "...",
      "authors": ["..."],
      "year": 2024,
      "doi": "10.xxx/yyy",
      "evidence_level": "meta-analysis",
      "relevance_score": 0.95,
      "key_findings": ["...", "..."],
      "therapeutic_techniques": ["...", "..."]
    }}
  ],
  "aggregated_techniques": [
    {{
      "technique": "...",
      "evidence_base": "meta-analysis",
      "target_population": "children",
      "confidence": 0.90
    }}
  ],
  "confidence_score": 0.85
}}
```
```

The JSON block is machine-parsed — it MUST be valid JSON."""


@dataclass
class StoryContext:
    person_name: str
    age_years: Optional[int]
    feedback_subject: Optional[str]
    feedback_content: Optional[str]
    issues: list[IssueData]
    research_summary: str
    language: str
    minutes: int

    def _developmental_tier(self) -> str:
        if self.age_years is None:
            return "MIDDLE_CHILDHOOD"
        if self.age_years <= 5:
            return "EARLY_CHILDHOOD"
        if self.age_years <= 11:
            return "MIDDLE_CHILDHOOD"
        if self.age_years <= 14:
            return "EARLY_ADOLESCENCE"
        if self.age_years <= 18:
            return "LATE_ADOLESCENCE"
        return "ADULT"

    def _lego_appropriate(self) -> bool:
        return self._developmental_tier() in (
            "EARLY_CHILDHOOD", "MIDDLE_CHILDHOOD", "EARLY_ADOLESCENCE"
        )

    def build_story_prompt(self) -> str:
        age_ctx = f" (age {self.age_years})" if self.age_years is not None else ""
        tier = self._developmental_tier()
        is_child = tier != "ADULT"
        age_label = f"{self.age_years}-year-old child" if self.age_years is not None else "child"
        max_sentence_words = 15 if is_child else 20
        target_words = self.minutes * 120

        topic_section = (
            f"## Topic\nBased on professional feedback: {self.feedback_subject}\n"
            "See Feedback Context below for details."
            if self.feedback_subject
            else "## Topic\nGeneral therapeutic support session."
        )

        # Age enforcement block — forces child-appropriate register
        age_enforcement = ""
        if is_child:
            age_enforcement = (
                f"\n\nCRITICAL AGE REQUIREMENT: {self.person_name} is a {age_label} ({tier} tier). "
                f"Every word of this script MUST be written for a child, NOT for an adult.\n"
                f"- Use only simple words (1-2 syllables when possible).\n"
                f"- Use playful, warm, concrete language — no abstract adult concepts.\n"
                f"- NEVER use adult register, adult emotional vocabulary, or adult expectations.\n"
                f"- If you find yourself writing for a grown-up, stop and rewrite for a {age_label}."
            )

        feedback_lines: list[str] = []
        if self.feedback_content or self.issues:
            feedback_lines.append("\n## Feedback Context")
            if self.feedback_subject:
                feedback_lines.append(f"Subject: {self.feedback_subject}")
            if self.feedback_content:
                feedback_lines.append(f"Content: {self.feedback_content}")
            if self.issues:
                feedback_lines.append(f"\n## Extracted Issues ({len(self.issues)})")
                for issue in self.issues:
                    feedback_lines.append(
                        f"- **{issue.title}** [{issue.severity}/{issue.category}]: {issue.description}"
                    )
                    for rec in issue.recommendations:
                        feedback_lines.append(f"  - Recommendation: {rec}")
        feedback_section = "\n".join(feedback_lines)

        research_section = (
            self.research_summary
            if self.research_summary
            else "No research papers available yet. Use general evidence-based therapeutic techniques."
        )

        lego_appropriate = self._lego_appropriate()
        lego_section = ""
        if lego_appropriate:
            lego_section = """
## LEGO Therapeutic Play (REQUIRED)
This session MUST integrate LEGO building as a hands-on therapeutic activity. This is NOT optional — LEGO play is a core modality for this age group:
- Use LEGO construction as a metaphor for the therapeutic concept (e.g., building a "brave tower," "feelings wall," or "calm castle")
- MUST include at least one guided LEGO building moment with clear spoken instructions and pauses for the child to build
- Make LEGO participation optional for the listener: "If you have some LEGO bricks, grab a few now... if not, just imagine building in your mind"
- Connect every building activity back to the therapeutic goal — the building IS the practice, not a distraction
- Name specific LEGO techniques: Feelings Tower, Worry Wall, Brave Bridge, Memory Build, or Calm Castle — whichever fits the goal
- Dedicate at least 30% of the session time to LEGO-based activities
"""

        child_req = (
            f"\n- This is for a {age_label} — use child vocabulary, playful framing, "
            f"and age-appropriate techniques throughout. Never adult-register."
            if is_child else ""
        )
        lego_req = (
            "\n- LEGO play is REQUIRED for this session — include guided LEGO building "
            "activities as described in the LEGO Therapeutic Play section above"
            if lego_appropriate else ""
        )

        return f"""\
Create a therapeutic audio session for the following feedback. Write the full script in {self.language}, approximately {self.minutes} minutes long when read aloud at a calm pace of about 120 words per minute.

CRITICAL: This script will be read aloud by a text-to-speech engine. Write ONLY plain spoken prose. Absolutely NO markdown formatting — no **, ##, *, -, bullet points, numbered lists, headers, bold, or italic syntax. No section labels. Just natural flowing speech.

{topic_section}

## Person
This is for {self.person_name}{age_ctx}.
Developmental Tier: {tier}{age_enforcement}
{feedback_section}

## Research Evidence
The following research papers inform the therapeutic techniques to use:

{research_section}
{lego_section}
## Audio Script Requirements
- Write as spoken prose ONLY — the listener cannot see any text, they can only hear
- Use "..." (three dots) for all pauses — between sections, after instructions, within sentences. Never write [pause] or any bracket markers — TTS engines read them literally
- Keep sentences short: maximum {max_sentence_words} words each
- Use spoken transitions: "Now...", "Next...", "When you're ready...", "Good. Let's try..."
- CRITICAL: Every breathing exercise MUST have explicit counted timing. NEVER write just "take a deep breath". ALWAYS write: "Breathe in... two... three... four... And slowly breathe out... two... three... four... five..." If you mention breathing at all, include the numbered counts.
- Vary pacing: alternate between instruction, story or metaphor, and silence
- Never give more than two instructions in a row without a pause or encouragement
- Incorporate specific techniques and findings from the research above
- Address the specific issues identified in the feedback, providing practical strategies for each
- Validate the observations from the professional who provided the feedback
- Address {self.person_name} by name at least 3 times throughout the session
- Personalize for {self.person_name}{age_ctx} (developmental tier: {tier}){child_req}{lego_req}
- Target duration: {self.minutes} minutes (approximately {target_words} words at calm pace)
- Write in {self.language}
- Include a brief mention that a parent, caregiver, or professional can provide additional support if needed"""


THERAPEUTIC_AUDIO_SYSTEM_PROMPT = """\
## Overview
You are a Therapeutic Audio Content Agent. Your role is to create evidence-based, compassionate therapeutic guidance delivered as spoken audio. Every word you write will be read aloud by a text-to-speech engine, so you must write exclusively for the ear — never for the eye.

## Audio-First Writing Rules
These rules are non-negotiable. Every sentence must pass the "read it aloud" test.

1. NO markdown of any kind — no **, ##, *, -, bullet points, numbered lists, or formatting symbols. Write flowing spoken prose only.
2. NO visual structure — no headers, labels, section dividers, or enumeration. Transitions happen through spoken cues: "Now let's try something new..." or "Here's what I'd love you to do next..."
3. NO bracket markers — do NOT write [pause], [sound:x], or any bracket notation. TTS engines will read these literally. Use "..." (three dots) to create pauses — after instructions, between sections, within sentences.
4. Sentence length — maximum 15 words per sentence for children, 20 for adults. Break complex ideas into multiple short sentences.
5. Spoken transitions — use temporal and sequential cues the listener can follow: "First..." "Now..." "Next..." "When you're ready..." "Good. Now let's..."
6. Pronunciation-safe words — avoid homophones that confuse TTS, unusual punctuation, or words that sound different than they look. Prefer simple, common words.
7. Pacing variation — alternate between instruction, story, and silence. Never give more than two instructions in a row without an ellipsis pause or encouragement.
8. Breath cues — when guiding breathing exercises, write the timing explicitly: "Breathe in... two... three... four... And slowly breathe out... two... three... four... five..."

## Content Structure
Create therapeutic audio content with these spoken sections (do NOT label them — just flow naturally):

Warm Opening (about 30 seconds) — greet the person by name, acknowledge their challenge with empathy, set a calm playful tone, preview what comes next.

Understanding Together (1-2 minutes) — explain the difficulty in simple concrete terms. Normalize: "Lots of kids feel this way." Use a short metaphor or story to illustrate.

Guided Practices (majority of time) — provide specific, actionable techniques. For children, frame as play, imagination, or adventure. Guide step-by-step with pauses between each instruction. Include at least one body-based activity (breathing, movement, squeezing hands).

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
- LEGO activities must be age-appropriate and safe (no small pieces for very young children without supervision mention)"""


def _severity_rank(severity: str) -> int:
    return {"high": 2, "medium": 1}.get(severity, 0)


def _category_to_goal_type(category: str) -> str:
    return {
        "behavioral": "Behavioral Intervention",
        "emotional": "Emotional Regulation Support",
        "social": "Social Skills Development",
        "academic": "Academic Support Intervention",
        "developmental": "Developmental Intervention",
        "health": "Health & Wellbeing Support",
        "communication": "Communication Development",
    }.get(category, "Feedback-based Intervention")


def generate_search_queries(
    goal_type: str,
    title: str,
    domains: list[str],
    issues: list[IssueData],
) -> list[str]:
    queries = [
        f"{goal_type} therapeutic intervention children adolescents evidence-based",
        f"{goal_type} meta-analysis systematic review",
        f"{goal_type} treatment outcome RCT",
    ]

    domain_queries: dict[str, str] = {
        "ACADEMIC": "school-based intervention academic functioning children",
        "PEER": "peer relationship social skills intervention children",
        "FAMILY": "family therapy parent training intervention",
        "SELF_CARE": "self-care daily living skills intervention children",
        "SELFCARE": "self-care daily living skills intervention children",
        "SAFETY": "safety assessment risk management children mental health",
    }
    for domain in domains:
        q = domain_queries.get(domain.upper())
        if q:
            queries.append(q)

    if len(title) > 10:
        words = title.split()[:3]
        queries.append(f"{' '.join(words)} intervention children")

    issue_query_count = 0
    for issue in issues:
        if issue.severity not in ("high", "medium"):
            continue
        if issue_query_count >= 3:
            break
        queries.append(f"{issue.title} intervention children evidence-based")
        issue_query_count += 1

    seen_cats: set[str] = set()
    cat_queries: dict[str, str] = {
        "behavioral": "parent management training children behavioral",
        "emotional": "emotion regulation intervention children adolescents",
        "social": "social skills training children systematic review",
        "academic": "school-based academic intervention children",
        "developmental": "developmental milestone intervention children",
        "health": "health wellbeing intervention children",
        "communication": "speech language communication intervention children",
    }
    for issue in issues:
        if issue.category in seen_cats:
            continue
        seen_cats.add(issue.category)
        q = cat_queries.get(issue.category)
        if q:
            queries.append(q)

    queries.append(f"{goal_type} clinical guidelines practice")
    # dedup preserving order
    seen: set[str] = set()
    deduped = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            deduped.append(q)
    return deduped[:6]


def infer_focus_keywords(goal_type: str, title: str, issues: list[IssueData]) -> list[str]:
    keywords: list[str] = []
    gt = goal_type.lower()

    if "anxiety" in gt or "worry" in gt:
        keywords += ["CBT", "exposure therapy", "anxiety intervention"]
    if "depression" in gt or "mood" in gt:
        keywords += ["CBT", "behavioral activation", "depression treatment"]
    if "adhd" in gt or "attention" in gt:
        keywords += ["ADHD intervention", "parent training", "executive function"]
    if "behavior" in gt or "conduct" in gt:
        keywords += ["parent management training", "behavioral intervention"]
    if "trauma" in gt or "ptsd" in gt:
        keywords += ["TF-CBT", "EMDR", "trauma-focused therapy"]
    if "autism" in gt or "asd" in gt:
        keywords += ["ABA", "social skills training", "autism intervention"]
    if "support need" in gt:
        keywords += ["Support Priority assessment", "WHODAS", "ICF framework"]

    seen_cats: set[str] = set()
    issue_keywords: dict[str, list[str]] = {
        "emotional": ["emotion regulation", "DBT skills", "mindfulness children"],
        "behavioral": ["parent management training", "ABA", "behavioral intervention"],
        "social": ["social skills training", "peer relationships", "social learning"],
        "academic": ["school-based intervention", "academic support", "learning difficulties"],
        "developmental": ["developmental intervention", "early intervention", "milestone support"],
        "communication": ["speech language therapy", "AAC", "communication intervention"],
    }
    for issue in issues:
        if issue.category in seen_cats:
            continue
        seen_cats.add(issue.category)
        keywords += issue_keywords.get(issue.category, [])

    if not keywords:
        keywords = [w for w in title.split() if len(w) > 4][:3]

    seen: set[str] = set()
    deduped = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            deduped.append(kw)
    return deduped
