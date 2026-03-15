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
            return "ADULT"
        if self.age_years <= 5:
            return "EARLY_CHILDHOOD"
        if self.age_years <= 11:
            return "MIDDLE_CHILDHOOD"
        if self.age_years <= 14:
            return "EARLY_ADOLESCENCE"
        if self.age_years <= 18:
            return "LATE_ADOLESCENCE"
        return "ADULT"

    def build_story_prompt(self) -> str:
        age_ctx = f" (age {self.age_years})" if self.age_years is not None else ""
        tier = self._developmental_tier()

        topic_section = (
            f"## Topic\nBased on professional feedback: {self.feedback_subject}\n"
            "See Feedback Context below for details."
            if self.feedback_subject
            else "## Topic\nGeneral therapeutic support session."
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

        return f"""\
Create a therapeutic audio session for the following feedback. Write the full script in {self.language}, approximately {self.minutes} minutes long when read aloud.

{topic_section}

## Person
This is for {self.person_name}{age_ctx}.
Developmental Tier: {tier}
{feedback_section}

## Research Evidence
The following research papers inform the therapeutic techniques to use:

{research_section}

## Instructions
- Create a complete, flowing therapeutic audio script
- Incorporate specific techniques and findings from the research above
- Address the specific issues identified in the feedback, providing practical strategies for each
- Validate the observations from the professional who provided the feedback
- Personalize for {self.person_name}{age_ctx} (developmental tier: {tier})
- Target duration: {self.minutes} minutes when read aloud at a calm pace
- Write in {self.language}
- Follow the therapeutic audio content structure (warm introduction, understanding the challenge, guided practices, integration)
- Include a brief mention that a parent, caregiver, or professional can provide additional support if needed
- IMPORTANT: Do NOT use any markdown formatting (no **, ##, *, bullet points, or bold/italic syntax). Write plain spoken prose only, as the script will be read aloud by a text-to-speech engine"""


THERAPEUTIC_AUDIO_SYSTEM_PROMPT = """\
## Overview
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
- Use inclusive, non-judgmental language"""


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
