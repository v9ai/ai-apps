"""Parent advice generator with synthetic test data and fixture caching.

Mirrors the production generateParentAdvice resolver prompt — uses
synthetic research papers, deep analysis, and family member profiles
to generate advice, then caches for reproducible evaluation.
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
_BASE_URL = "https://api.deepseek.com"
_MODEL = "deepseek-chat"

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# ---------------------------------------------------------------------------
# Synthetic test cases — each has a goal, child profile, research, and
# optionally a deep analysis snapshot to ground the advice in.
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "id": "selective-mutism-7yo",
        "goal_title": "Reduce repetitive vocal sounds during lessons",
        "goal_description": "Child makes repetitive sounds during structured lessons, disrupting the class.",
        "child_name": "Bogdan",
        "child_age": 7,
        "child_dob_year": 2019,
        "child_relationship": "son",
        "issues": [
            {"title": "Repetitive vocal sounds during lessons", "category": "behavioral", "severity": "medium"},
            {"title": "Selective verbal communication", "category": "communication", "severity": "high"},
        ],
        "research_papers": [
            {
                "title": "Behavioral Interventions for Selective Mutism in School-Age Children: A Systematic Review",
                "authors": ["Johnson, A.", "Smith, B."],
                "year": 2023,
                "evidence_level": "systematic_review",
                "key_findings": [
                    "Graduated exposure therapy combined with contingency management produced effect sizes d=0.89",
                    "School-based interventions with teacher training showed sustained improvements at 6-month follow-up",
                    "Stimulus fading techniques were particularly effective for classroom vocalization",
                ],
                "therapeutic_techniques": [
                    "graduated exposure therapy",
                    "contingency management",
                    "stimulus fading",
                    "teacher training",
                    "peer-mediated strategies",
                ],
            },
            {
                "title": "Parent-Mediated Interventions for Anxious Children: A Meta-Analysis",
                "authors": ["Garcia, C.", "Lee, D."],
                "year": 2024,
                "evidence_level": "meta-analysis",
                "key_findings": [
                    "Parent coaching in anxiety management reduced child anxiety symptoms (g=0.72)",
                    "Psychoeducation for parents about anxiety maintenance cycles was a key mediator",
                    "Brief parent-only interventions (6-8 sessions) were as effective as longer programs",
                ],
                "therapeutic_techniques": [
                    "parent coaching",
                    "psychoeducation",
                    "anxiety management training",
                    "brave modeling",
                ],
            },
        ],
        "deep_analysis": {
            "summary": "Bogdan, age 7, presents with a pattern of selective vocalization that appears anxiety-driven. He produces repetitive vocal sounds during structured lessons but is silent during group work and recess, suggesting performance anxiety rather than a behavioral disorder.",
            "priority_recommendations": [
                {"rank": 1, "urgency": "immediate", "issue_title": "Repetitive vocal sounds", "approach": "Implement graduated exposure in classroom: start with non-verbal participation, progress to whispered responses, then quiet speech with safe adult."},
                {"rank": 2, "urgency": "short_term", "issue_title": "Selective verbal communication", "approach": "Teacher training on stimulus fading and contingency management; create safe communication zones."},
            ],
            "pattern_clusters": [
                {"name": "Anxiety-driven selective vocalization", "pattern": "triggered", "root_cause": "Performance anxiety in structured settings"},
            ],
            "family_insights": [
                "Parent anxiety modeling may reinforce avoidance behaviors — parent coaching recommended",
            ],
        },
        # Expected: advice should reference these specific techniques and papers
        "expected_technique_keywords": ["graduated exposure", "stimulus fading", "contingency management", "parent coaching"],
        "expected_paper_refs": ["Johnson", "Garcia"],
    },
    {
        "id": "test-anxiety-teen",
        "goal_title": "Reduce test anxiety",
        "goal_description": "Sarah experiences severe anxiety before and during tests, leading to poor performance.",
        "child_name": "Sarah",
        "child_age": 14,
        "child_dob_year": 2012,
        "child_relationship": "daughter",
        "issues": [
            {"title": "Severe test anxiety with physical symptoms", "category": "emotional", "severity": "high"},
            {"title": "Avoidance coping pattern", "category": "behavioral", "severity": "medium"},
        ],
        "research_papers": [
            {
                "title": "CBT for Test Anxiety in Adolescents: A Randomized Controlled Trial",
                "authors": ["Williams, D.", "Lee, E."],
                "year": 2024,
                "evidence_level": "rct",
                "key_findings": [
                    "CBT group showed significantly greater reductions in test anxiety (TAI scores: pre=58.3, post=34.7, p<.001)",
                    "Cognitive restructuring of catastrophic thoughts was the most effective component",
                    "Gains maintained at 12-month follow-up, academic performance improved significantly",
                ],
                "therapeutic_techniques": [
                    "cognitive restructuring",
                    "graduated exposure to test-taking",
                    "study skills training",
                    "relaxation techniques",
                ],
            },
            {
                "title": "Mindfulness-Based Stress Reduction for Academic Anxiety in High School Students",
                "authors": ["Chen, M.", "Patel, R."],
                "year": 2023,
                "evidence_level": "rct",
                "key_findings": [
                    "MBSR reduced self-reported anxiety by 42% compared to waitlist control",
                    "Daily 10-minute mindfulness practice was sufficient for significant effects",
                    "Students reported improved focus and reduced avoidance behavior",
                ],
                "therapeutic_techniques": [
                    "mindfulness meditation",
                    "body scan",
                    "breathing exercises",
                    "present-moment awareness",
                ],
            },
        ],
        "deep_analysis": {
            "summary": "Sarah, 14, shows a classic anxiety-avoidance cycle: test anxiety leads to avoidance of studying, which increases unpreparedness and further anxiety. Physical symptoms (nausea, dizziness) suggest high sympathetic activation.",
            "priority_recommendations": [
                {"rank": 1, "urgency": "immediate", "issue_title": "Test anxiety", "approach": "Begin CBT with cognitive restructuring targeting catastrophic thoughts about test failure."},
                {"rank": 2, "urgency": "short_term", "issue_title": "Avoidance coping", "approach": "Graduated exposure: practice with low-stakes quizzes, build to mock exams in controlled environment."},
            ],
            "pattern_clusters": [
                {"name": "Anxiety-avoidance cycle", "pattern": "escalating", "root_cause": "Catastrophic cognitions about academic failure"},
            ],
            "family_insights": [
                "Parental pressure around grades may inadvertently reinforce anxiety — reframe success metrics",
            ],
        },
        "expected_technique_keywords": ["cognitive restructuring", "graduated exposure", "mindfulness", "breathing"],
        "expected_paper_refs": ["Williams", "Chen"],
    },
    {
        "id": "toddler-speech-delay",
        "goal_title": "Increase vocabulary and reduce frustration",
        "goal_description": "Child uses only 5-10 words at 24 months, screams when unable to communicate needs.",
        "child_name": "Matei",
        "child_age": 2,
        "child_dob_year": 2024,
        "child_relationship": "son",
        "issues": [
            {"title": "Limited vocabulary for age", "category": "communication", "severity": "high"},
            {"title": "Frustration tantrums from communication gaps", "category": "behavioral", "severity": "medium"},
        ],
        "research_papers": [
            {
                "title": "Parent-Implemented Language Interventions for Late Talkers: A Systematic Review",
                "authors": ["Roberts, M.", "Kim, S."],
                "year": 2023,
                "evidence_level": "systematic_review",
                "key_findings": [
                    "Responsive interaction strategies increased vocabulary by 40% over 12 weeks",
                    "Environmental arrangement and milieu teaching were most effective for late talkers",
                    "Parent coaching with video feedback produced larger gains than written instructions alone",
                ],
                "therapeutic_techniques": [
                    "responsive interaction",
                    "milieu teaching",
                    "environmental arrangement",
                    "video feedback coaching",
                    "parallel talk",
                    "expansion",
                ],
            },
        ],
        "deep_analysis": None,
        "expected_technique_keywords": ["responsive interaction", "milieu teaching", "parallel talk", "expansion"],
        "expected_paper_refs": ["Roberts"],
    },
]


# ---------------------------------------------------------------------------
# Prompt builder — mirrors production generateParentAdvice resolver
# ---------------------------------------------------------------------------


def build_advice_prompt(case: dict) -> str:
    """Build the parent advice prompt matching the production resolver."""
    child_profile = f"Name: {case['child_name']}\nAge: {case['child_age']} years old\nDate of Birth Year: {case['child_dob_year']}\nRelationship: {case['child_relationship']}"

    issues_text = "\n".join(
        f"- [{i['severity'].upper()}] {i['title']} ({i['category']})"
        for i in case["issues"]
    )

    research_text = ""
    for idx, r in enumerate(case["research_papers"]):
        lines = [f'[{idx + 1}] "{r["title"]}"']
        lines.append(f'  Authors: {", ".join(r["authors"])}')
        lines.append(f'  Year: {r["year"]}')
        lines.append(f'  Evidence level: {r["evidence_level"]}')
        lines.append(f'  Key findings: {"; ".join(r["key_findings"])}')
        lines.append(f'  Therapeutic techniques: {"; ".join(r["therapeutic_techniques"])}')
        research_text += "\n".join(lines) + "\n\n"

    deep_analysis_text = ""
    da = case.get("deep_analysis")
    if da:
        parts = [f"### Executive Summary\n{da['summary']}"]
        if da.get("priority_recommendations"):
            recs = "\n".join(
                f"{r['rank']}. [{r['urgency']}] {r['issue_title']}: {r['approach']}"
                for r in da["priority_recommendations"]
            )
            parts.append(f"### Priority Recommendations from Deep Analysis\n{recs}")
        if da.get("pattern_clusters"):
            clusters = "\n".join(
                f'- "{c["name"]}" ({c["pattern"]}): Root cause: {c.get("root_cause", "unknown")}'
                for c in da["pattern_clusters"]
            )
            parts.append(f"### Identified Behavioral Patterns\n{clusters}")
        if da.get("family_insights"):
            insights = "\n".join(f"- {i}" for i in da["family_insights"])
            parts.append(f"### Actionable Family System Insights\n{insights}")
        deep_analysis_text = "\n\n".join(parts)

    prompt = [
        "You are a child development and parenting expert. Generate practical, evidence-based parenting advice that is STRICTLY GROUNDED in the research papers and deep analysis provided below.",
        "",
        "## Goal",
        f"Title: {case['goal_title']}",
        f"Description: {case['goal_description']}",
        "",
        f"## Child Profile\n{child_profile}",
        f"## Known Issues\n{issues_text}",
        "",
        f"## Research Evidence ({len(case['research_papers'])} papers)",
        research_text.strip(),
        "",
    ]
    if deep_analysis_text:
        prompt.append(f"## Deep Analysis (LangGraph)\n{deep_analysis_text}")
        prompt.append("")

    prompt.extend([
        "## Instructions",
        "Write comprehensive parenting advice (800-1500 words) in English.",
        "",
        "CRITICAL GROUNDING RULES:",
        "- Every piece of advice MUST trace back to a specific research paper listed above",
        "- Cite papers using their EXACT title and authors as shown above (e.g. 'According to Roberts and Kim (2023) in their systematic review...')",
        "- Do NOT paraphrase or invent paper titles — use the exact titles from the ## Research Evidence section",
        "- Do NOT cite any papers or authors that are not listed in the ## Research Evidence section above",
        "- Only recommend therapeutic techniques that appear in the 'Therapeutic techniques' list of a paper above",
        "- If the deep analysis identified specific patterns or root causes, address those directly",
        "- If the deep analysis has priority recommendations, translate those into parent-friendly language",
        "",
        "STRUCTURE:",
        "- Start with a brief empathetic introduction acknowledging the parent's situation",
        "- For each recommendation, explain the research basis, then give concrete at-home steps",
        "- Use the therapeutic techniques from the research papers as the backbone of your advice",
        "- Include specific examples and scenarios grounded in the child's known issues",
        "- End with guidance on when to seek additional professional support",
        "",
        "AGE-APPROPRIATENESS:",
        "- All recommendations must be appropriate for the child's actual age",
        "- Verify the child's date of birth year matches the stated age",
        "- Do not suggest interventions designed for a different age group",
        "",
        'Return your response as JSON: { "advice": "<your full advice text here>" }',
    ])

    return "\n".join(prompt)


def build_input_description(case: dict) -> str:
    """Build a detailed description for LLMTestCase.input, including full research details.

    The judge model needs to see paper titles, authors, techniques to verify grounding.
    """
    issues = "; ".join(i["title"] for i in case["issues"])
    has_da = "yes" if case.get("deep_analysis") else "no"

    paper_details = []
    for r in case["research_papers"]:
        detail = (
            f'- "{r["title"]}" by {", ".join(r["authors"])} ({r["year"]}), '
            f'evidence: {r["evidence_level"]}. '
            f'Techniques: {", ".join(r["therapeutic_techniques"])}. '
            f'Key findings: {"; ".join(r["key_findings"][:2])}'
        )
        paper_details.append(detail)

    return (
        f"Family member: {case['child_name']}, age {case['child_age']} "
        f"(born {case['child_dob_year']}), {case['child_relationship']}.\n"
        f"Goal: {case['goal_title']}\n"
        f"Issues: {issues}\n"
        f"Research papers ({len(case['research_papers'])}):\n"
        + "\n".join(paper_details) + "\n"
        f"Deep analysis available: {has_da}"
    )


# ---------------------------------------------------------------------------
# Runner with fixture caching
# ---------------------------------------------------------------------------


def _call_deepseek(prompt: str, temperature: float = 0.3, retries: int = 2) -> dict:
    """Call DeepSeek and return parsed JSON."""
    import httpx
    from json_repair import repair_json

    last_err = None
    for attempt in range(retries + 1):
        response = httpx.post(
            f"{_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": _MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": temperature,
            },
            timeout=180,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        cleaned = re.sub(r"```(?:json)?\s*", "", content)
        cleaned = re.sub(r"```\s*", "", cleaned).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            try:
                repaired = repair_json(cleaned, return_objects=True)
                if isinstance(repaired, dict):
                    return repaired
                return json.loads(str(repaired))
            except Exception as e:
                last_err = e
                if attempt < retries:
                    continue
    raise last_err


def run_parent_advice(case: dict, force_regen: bool = False) -> dict:
    """Run parent advice generation and cache the result."""
    case_id = case["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}_advice.json"

    if fixture_path.exists() and not force_regen:
        return json.loads(fixture_path.read_text(encoding="utf-8"))["result"]

    prompt = build_advice_prompt(case)
    result = _call_deepseek(prompt, temperature=0.3)

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(
            {
                "id": case_id,
                "stage": "parent_advice",
                "prompt": prompt,
                "result": result,
                "model": _MODEL,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return result
