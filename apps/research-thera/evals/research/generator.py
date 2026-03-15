"""Research pipeline generator with fixture caching.

Runs individual pipeline stages (normalize, plan, extract) via DeepSeek
and caches the output as fixtures for reproducible evaluation.
"""

import json
import os
import re
import sys
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
# Prompts — verbatim from the worker's src/prompts/
# ---------------------------------------------------------------------------

# Import prompts by adding worker src to path
_worker_src = Path(__file__).resolve().parent.parent.parent / "workers" / "research-pipeline" / "src"
if str(_worker_src) not in sys.path:
    sys.path.insert(0, str(_worker_src))

from prompts.normalizer import NORMALIZE_GOAL_PROMPT  # noqa: E402
from prompts.planner import PLAN_QUERY_PROMPT  # noqa: E402
from prompts.extractor import EXTRACT_RESEARCH_PROMPT  # noqa: E402

# ---------------------------------------------------------------------------
# Test cases — therapeutic goals with feedback + extracted issues context
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "id": "selective-mutism-child",
        "goal_title": "Face sunete la lecții",
        "goal_description": "Copilul face sunete repetitive în timpul lecțiilor, perturbând clasa.",
        "family_member_name": "Bogdan",
        "family_member_age": 7,
        "notes": [
            "Face zgomote repetitive când e stresat",
            "Nu vorbește cu profesorii dar e vocal cu prietenii",
        ],
        "feedback_content": (
            "Bogdan continues to make repetitive vocal sounds during math and reading lessons. "
            "The sounds increase when he is asked to read aloud or answer questions directly. "
            "He is completely silent during group work and recess. He responds well to written "
            "instructions and communicates through nodding and pointing."
        ),
        "extracted_issues": [
            {
                "title": "Repetitive vocal sounds during structured lessons",
                "description": "Child produces repetitive vocal sounds during math and reading, especially when asked to read aloud.",
                "category": "behavioral",
                "severity": "medium",
            },
            {
                "title": "Selective verbal communication",
                "description": "Complete silence during group work and recess, but responds to written instructions.",
                "category": "communication",
                "severity": "high",
            },
        ],
        "expected_clinical_domain": "selective_mutism",
        "expected_behavior_direction": "REDUCE",
        "expected_query_keywords": ["selective mutism", "vocalization", "children", "school"],
    },
    {
        "id": "anxiety-reduction-teen",
        "goal_title": "Reduce test anxiety",
        "goal_description": "Sarah experiences severe anxiety before and during tests, leading to poor performance.",
        "family_member_name": "Sarah",
        "family_member_age": 14,
        "notes": [
            "Panic attacks before exams started this semester",
            "Good grades on homework but fails tests",
        ],
        "feedback_content": (
            "Sarah's test anxiety has worsened this term. She was unable to complete the mid-term "
            "biology exam, leaving 40% blank despite demonstrating strong knowledge in class discussions. "
            "She reports feeling nauseous and dizzy before tests. The school counselor has noted she "
            "avoids studying as a coping mechanism, which creates a cycle of unpreparedness."
        ),
        "extracted_issues": [
            {
                "title": "Severe test anxiety with physical symptoms",
                "description": "Experiences nausea and dizziness before tests, unable to complete exams despite knowledge.",
                "category": "emotional",
                "severity": "high",
            },
            {
                "title": "Avoidance coping pattern",
                "description": "Avoids studying as coping mechanism, creating cycle of unpreparedness and increased anxiety.",
                "category": "behavioral",
                "severity": "medium",
            },
        ],
        "expected_clinical_domain": "test_anxiety",
        "expected_behavior_direction": "REDUCE",
        "expected_query_keywords": ["test anxiety", "exam anxiety", "adolescent"],
    },
    {
        "id": "social-skills-asd",
        "goal_title": "Improve eye contact and social interaction",
        "goal_description": "Child avoids eye contact and struggles with peer interaction during play.",
        "family_member_name": "Max",
        "family_member_age": 5,
        "notes": [
            "Diagnosed ASD level 1 at age 3",
            "Attends speech therapy twice weekly",
        ],
        "feedback_content": (
            "Max rarely initiates interaction with peers during free play. When approached, he "
            "typically turns away or continues his solitary activity (lining up blocks). He does "
            "not make eye contact with adults or children. He has shown improvement in following "
            "simple group instructions like 'everyone sit down'. His speech therapist notes he "
            "uses 3-4 word sentences but only with familiar adults."
        ),
        "extracted_issues": [
            {
                "title": "Limited peer interaction initiation",
                "description": "Rarely initiates play with peers, turns away when approached, prefers solitary activities.",
                "category": "social",
                "severity": "high",
            },
            {
                "title": "Consistent eye contact avoidance",
                "description": "Does not make eye contact with adults or children in any context.",
                "category": "communication",
                "severity": "high",
            },
            {
                "title": "Restricted verbal communication",
                "description": "Uses 3-4 word sentences only with familiar adults, not with peers.",
                "category": "communication",
                "severity": "medium",
            },
        ],
        "expected_clinical_domain": "social_communication_asd",
        "expected_behavior_direction": "INCREASE",
        "expected_query_keywords": ["eye contact", "social skills", "ASD", "autism", "children"],
    },
    {
        "id": "aggression-sibling",
        "goal_title": "Stop hitting siblings",
        "goal_description": "Child hits younger sibling multiple times per day, especially during transitions.",
        "family_member_name": "Lizi",
        "family_member_age": 6,
        "notes": [
            "Hits baby brother when parent attention shifts",
            "Improved slightly with sticker chart but regressed",
        ],
        "feedback_content": (
            "Lizi has been hitting classmates during unstructured time, averaging 2-3 incidents per week. "
            "The aggression is typically triggered by disputes over toys or perceived unfairness. "
            "She shows remorse after incidents but cannot articulate why she reacted physically. "
            "No aggression observed during structured activities with clear rules."
        ),
        "extracted_issues": [
            {
                "title": "Physical aggression toward peers",
                "description": "Hitting classmates 2-3 times per week during unstructured time, triggered by toy disputes.",
                "category": "behavioral",
                "severity": "high",
            },
            {
                "title": "Difficulty with emotional regulation",
                "description": "Shows remorse after incidents but cannot articulate triggers, suggests limited emotion regulation.",
                "category": "emotional",
                "severity": "medium",
            },
        ],
        "expected_clinical_domain": "aggression_children",
        "expected_behavior_direction": "REDUCE",
        "expected_query_keywords": ["aggression", "children", "behavioral intervention"],
    },
]


# ---------------------------------------------------------------------------
# Stage runners with fixture caching
# ---------------------------------------------------------------------------


def _call_deepseek(prompt: str, temperature: float = 0, retries: int = 2) -> dict:
    """Call DeepSeek and return parsed JSON. Uses json_repair for robustness."""
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
            # Use json_repair for DeepSeek's common issues
            # (unescaped quotes in MeSH terms, trailing commas, etc.)
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


def build_normalize_input(case: dict) -> str:
    """Build the normalization prompt for a test case."""
    age_ctx = (
        f"The patient is {case['family_member_age']} years old."
        if case.get("family_member_age")
        else ""
    )
    name_ctx = (
        f"Patient name: {case['family_member_name']}."
        if case.get("family_member_name")
        else ""
    )
    notes = "; ".join(case.get("notes", [])) or "(none)"
    feedback_ctx = case.get("feedback_content", "")
    extracted_ctx = ""
    if case.get("extracted_issues"):
        issues_text = "\n".join(
            f"- [{i['severity'].upper()}] {i['title']}: {i['description']}"
            for i in case["extracted_issues"]
        )
        extracted_ctx = f"\n\nExtracted Issues from Teacher Feedback:\n{issues_text}"

    all_notes = f"{notes}{extracted_ctx}"
    if feedback_ctx:
        all_notes += f"\n\nRecent Teacher Feedback:\n{feedback_ctx}"

    return NORMALIZE_GOAL_PROMPT.format(
        goal_title=case["goal_title"],
        goal_description=case.get("goal_description", ""),
        notes=all_notes,
        age_ctx=age_ctx,
        name_ctx=name_ctx,
    )


def build_plan_input(case: dict) -> str:
    """Build the query planning prompt for a test case."""
    notes_parts = list(case.get("notes", []))
    if case.get("feedback_content"):
        notes_parts.append(f"Teacher feedback: {case['feedback_content']}")
    if case.get("extracted_issues"):
        for issue in case["extracted_issues"]:
            notes_parts.append(
                f"Extracted issue [{issue['severity']}]: {issue['title']} — {issue['description']}"
            )
    notes_str = "\n- ".join(notes_parts) or "(none)"

    return PLAN_QUERY_PROMPT.format(
        title=case["goal_title"],
        description=case.get("goal_description", ""),
        notes=notes_str,
    )


def build_extract_input(case: dict, paper: dict) -> str:
    """Build the extraction prompt for a paper."""
    return EXTRACT_RESEARCH_PROMPT.format(
        goal_title=case["goal_title"],
        goal_description=case.get("goal_description", ""),
        goal_type=case.get("expected_clinical_domain", "behavioral_change"),
        paper_title=paper.get("title", ""),
        paper_authors=", ".join(paper.get("authors", [])) or "Unknown",
        paper_year=paper.get("year", "Unknown"),
        paper_journal=paper.get("journal", "Unknown"),
        paper_doi=paper.get("doi", "None"),
        paper_abstract=paper.get("abstract", ""),
    )


def run_normalize(case: dict, force_regen: bool = False) -> dict:
    """Run normalization step and cache the result."""
    case_id = case["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}_normalize.json"

    if fixture_path.exists() and not force_regen:
        return json.loads(fixture_path.read_text(encoding="utf-8"))["result"]

    prompt = build_normalize_input(case)
    result = _call_deepseek(prompt)

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(
            {
                "id": case_id,
                "stage": "normalize",
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


def run_plan(case: dict, force_regen: bool = False) -> dict:
    """Run query planning step and cache the result."""
    case_id = case["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}_plan.json"

    if fixture_path.exists() and not force_regen:
        return json.loads(fixture_path.read_text(encoding="utf-8"))["result"]

    prompt = build_plan_input(case)
    result = _call_deepseek(prompt, temperature=0)

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(
            {
                "id": case_id,
                "stage": "plan",
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


# Synthetic papers for extraction eval (avoids live API calls)
SYNTHETIC_PAPERS = {
    "selective-mutism-child": {
        "title": "Behavioral Interventions for Selective Mutism in School-Age Children: A Systematic Review",
        "authors": ["Johnson, A.", "Smith, B.", "Garcia, C."],
        "year": 2023,
        "journal": "Journal of Clinical Child Psychology",
        "doi": "10.1234/jccp.2023.001",
        "abstract": (
            "This systematic review examined 28 studies on behavioral interventions for selective "
            "mutism in children aged 4-12 years. Results indicate that graduated exposure therapy "
            "combined with contingency management produced the largest effect sizes (d=0.89). "
            "School-based interventions involving teacher training and peer-mediated strategies "
            "showed sustained improvements at 6-month follow-up. Stimulus fading techniques were "
            "particularly effective for classroom vocalization. The review highlights the importance "
            "of early intervention and multimodal approaches combining individual therapy with "
            "school accommodations."
        ),
    },
    "anxiety-reduction-teen": {
        "title": "Cognitive-Behavioral Therapy for Test Anxiety in Adolescents: A Randomized Controlled Trial",
        "authors": ["Williams, D.", "Lee, E."],
        "year": 2024,
        "journal": "Anxiety Disorders Research",
        "doi": "10.1234/adr.2024.015",
        "abstract": (
            "This RCT (N=120) compared CBT with relaxation training for test anxiety in adolescents "
            "aged 13-17. The CBT group showed significantly greater reductions in test anxiety "
            "(TAI scores: pre=58.3, post=34.7, p<.001) compared to relaxation (pre=57.1, post=45.2). "
            "CBT components included cognitive restructuring of catastrophic thoughts, graduated "
            "exposure to test-taking situations, and study skills training. Gains maintained at "
            "12-month follow-up. Academic performance improved significantly only in the CBT group."
        ),
    },
    "social-skills-asd": {
        "title": "Social Skills Interventions for Preschool Children with ASD: Eye Contact and Joint Attention",
        "authors": ["Park, H.", "Davis, R.", "Chen, L."],
        "year": 2023,
        "journal": "Autism Research",
        "doi": "10.1234/ar.2023.042",
        "abstract": (
            "This study evaluated a naturalistic developmental behavioral intervention (NDBI) "
            "targeting eye contact and joint attention in 45 preschoolers with ASD (ages 3-6). "
            "The 12-week parent-mediated program resulted in significant increases in spontaneous "
            "eye contact (baseline: 2.1 instances/10min, post: 7.8, p<.001) and joint attention "
            "episodes (baseline: 0.8, post: 4.2). Parent coaching included responsive interaction "
            "strategies and environmental arrangement. Children with higher baseline language showed "
            "greater improvements. Results suggest that embedding social communication goals in "
            "play routines is more effective than discrete trial training for this age group."
        ),
    },
    "aggression-sibling": {
        "title": "Parent Management Training for Childhood Aggression: A Meta-Analysis of School-Age Interventions",
        "authors": ["Thompson, K.", "Wilson, M."],
        "year": 2024,
        "journal": "Clinical Psychology Review",
        "doi": "10.1234/cpr.2024.008",
        "abstract": (
            "This meta-analysis synthesized 42 studies (N=3,847) of parent management training (PMT) "
            "for aggression in children aged 4-10. Overall effect size was moderate (g=0.67, "
            "95% CI [0.52, 0.82]). Programs incorporating emotion regulation skills alongside "
            "behavioral strategies showed larger effects (g=0.84) than purely behavioral approaches "
            "(g=0.51). Functional behavior assessment prior to intervention predicted better outcomes. "
            "School-home consistency in contingency management was identified as a key moderator. "
            "Child-focused components (anger management, social problem-solving) enhanced effects "
            "when added to parent training alone."
        ),
    },
}


def run_extract(case: dict, force_regen: bool = False) -> dict:
    """Run extraction step on a synthetic paper and cache the result."""
    case_id = case["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}_extract.json"

    if fixture_path.exists() and not force_regen:
        return json.loads(fixture_path.read_text(encoding="utf-8"))["result"]

    paper = SYNTHETIC_PAPERS.get(case_id)
    if not paper:
        return {}

    prompt = build_extract_input(case, paper)
    result = _call_deepseek(prompt)

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(
            {
                "id": case_id,
                "stage": "extract",
                "paper": paper,
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
