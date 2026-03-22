"""Research pipeline generator with fixture caching.

Runs individual pipeline stages (normalize, plan, extract) via DeepSeek
and caches the output as fixtures for reproducible evaluation.
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
# Prompts — inlined from the former workers/research-pipeline/src/prompts/
# ---------------------------------------------------------------------------

NORMALIZE_GOAL_PROMPT = """\
You are a clinical psychologist specializing in translating parent/family-reported \
therapeutic goals into precise clinical language for academic research queries.

Goal Title: "{goal_title}"
Goal Description: "{goal_description}"
Notes: {notes}
{age_ctx} {name_ctx}

TASK:
1. Detect the language (ISO 639-1 code, e.g. "en", "ro", "fr")
2. Translate to English if not already English
3. Identify the SPECIFIC clinical construct (not generic "behavioral_change")
4. Determine if goal is to INCREASE or REDUCE the behavior
5. Infer developmental stage from age
6. Generate 5-10 required keywords that MUST appear in relevant research papers
7. Generate 5-10 excluded topics that are NOT relevant to this goal

CLINICAL DOMAIN EXAMPLES (be this specific, never use "behavioral_change"):
- "Face sunete la lectii" (Romanian: makes sounds during lessons) → if child context:
  "selective_mutism" OR "adhd_vocalization" OR "vocal_stereotypy_asd"
- "Reduce test anxiety" → "test_anxiety_children"
- "Improve eye contact" → "social_communication_asd"
- "Stop hitting siblings" → "aggression_children"
- "Talk more at school" → "selective_mutism" or "school_social_anxiety"

DEVELOPMENTAL TIER (use these exact values based on age):
- infant: 0-2 years
- preschool: 3-5 years
- school_age: 6-11 years
- adolescent: 12-17 years
- adult: 18+ years

BEHAVIOR DIRECTION:
- INCREASE: goal is to produce MORE of a behavior
- REDUCE: goal is to produce LESS of a behavior
- MAINTAIN: keep current level
- UNCLEAR: cannot determine

REQUIRED KEYWORDS: clinical terms that MUST appear in papers for them to be relevant.
Example for selective mutism: ["selective mutism", "classroom vocalization", \
"speech anxiety", "school", "children", "behavioral intervention"]

EXCLUDED TOPICS: topics that look related but are NOT relevant.
Example for selective mutism: ["homework completion", "academic achievement", \
"family therapy engagement", "adolescent depression", "adult psychotherapy"]

Return JSON with these exact fields:
- translatedGoalTitle: string (English translation of the goal title)
- originalLanguage: string (ISO 639-1 code)
- clinicalRestatement: string (clinical rephrasing of the goal)
- clinicalDomain: string (specific clinical construct)
- behaviorDirection: string (INCREASE, REDUCE, MAINTAIN, or UNCLEAR)
- developmentalTier: string (infant, preschool, school_age, adolescent, or adult)
- requiredKeywords: string[] (5-10 clinical search terms)
- excludedTopics: string[] (5-10 irrelevant adjacent topics)"""

PLAN_QUERY_PROMPT = """\
Plan a research query strategy for this therapeutic/psychological goal.

Goal: {title}
Description: {description}
Notes: {notes}

Generate MULTIPLE diverse queries to maximize recall from different \
psychological/therapy databases.

QUERY STRATEGY:
1. Semantic Scholar queries (20-40): Mix broad + specific, use synonyms and related constructs
2. Crossref queries (20-45): Use natural language phrases common in therapy/psychology literature
3. PubMed queries (20-40): Use MeSH terms and clinical psychology terminology

Focus on finding psychological research relevant to the specific therapeutic goal.
Include queries about: therapeutic interventions, mechanisms, evidence-based treatments, \
coping strategies.

Return 40-87 total queries across all sources for maximum recall.

Return JSON with these exact fields:
- therapeuticGoalType: string (type of therapeutic goal)
- keywords: string[] (5-8 core search keywords)
- semanticScholarQueries: string[] (20-40 queries)
- crossrefQueries: string[] (20-45 queries)
- pubmedQueries: string[] (20-40 queries)
- inclusion: string[] (inclusion criteria)
- exclusion: string[] (exclusion criteria)"""

EXTRACT_RESEARCH_PROMPT = """\
Extract therapeutic research information from this paper.

Therapeutic Goal: {goal_title}
Goal Description: {goal_description}
Goal Type: {goal_type}

Paper:
Title: {paper_title}
Authors: {paper_authors}
Year: {paper_year}
Journal: {paper_journal}
DOI: {paper_doi}
Abstract: {paper_abstract}

CRITICAL: This should be THERAPEUTIC/PSYCHOLOGICAL research for clinical/counseling applications.

Extract:
1. Key findings (3-5) that are DIRECTLY relevant to the therapeutic goal
2. Specific therapeutic techniques mentioned (e.g., CBT, exposure therapy, mindfulness)
3. Evidence level — classify carefully based on study design described in the abstract:
   - meta-analysis: explicitly pools results from multiple studies
   - systematic_review: structured review of multiple studies with defined criteria
   - rct: MUST mention randomization, random assignment, or randomized controlled trial
   - cohort: prospective observational study following a group over time
   - quasi_experimental: pre-post study WITHOUT randomization or control group
   - case_control: retrospective comparison of groups
   - case_series: multiple case reports
   - case_study: single case report
   - expert_opinion: clinical consensus
   If the abstract describes a pre-post intervention study without mentioning randomization, classify as quasi_experimental, NOT rct.
4. Relevance score (0-1) based on how well it addresses the THERAPEUTIC goal

RELEVANCE SCORING RUBRIC (be strict):
- 1.0: Directly studies the exact behavior/condition in the therapeutic goal in the same population
- 0.8: Studies the same condition in a closely related population
- 0.6: Studies an adjacent condition using the same modality for the goal's population
- 0.4: Same modality but different condition or population
- 0.2: General clinical psychology with no specific relevance to this goal
- 0.1 or below: NOT about the specific clinical domain of this goal

STRICT FILTERING:
- Score 0.1 or lower if paper is about: forensic interviews, legal proceedings, \
homework completion, academic achievement, adult populations (when goal is for a child), \
family therapy engagement (unless directly relevant)
- Score 0.1 or lower if NOT about the specific clinical domain of the therapeutic goal
- Score 0.8+ ONLY if directly studying the specific intervention for the goal type and population
- Population mismatch: reduce score by 0.3 if study population age does not match patient age
- Only extract findings EXPLICITLY stated in the abstract
- Do not infer or extrapolate beyond what is written
- Rate your extraction confidence honestly

Return JSON with these exact fields:
- therapeuticGoalType: string
- title: string
- authors: string[]
- year: number | null
- journal: string | null
- doi: string | null
- url: string | null
- abstract: string | null
- keyFindings: string[]
- therapeuticTechniques: string[]
- evidenceLevel: string | null
- relevanceScore: number (0-1)
- extractedBy: string
- extractionConfidence: number (0-1)"""

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
        "id": "frustration-tolerance-child",
        "goal_title": "Creste/ ridica rezistenta la frustrare",
        "goal_description": "",
        "family_member_name": "Bogdan",
        "family_member_age": 7,
        "notes": [
            "Se loveste cu capul de perete cand e frustrat",
            "Arunca piesele Lego cand nu reuseste",
            "Spune 'o sa te omor' cand e intrerupt",
        ],
        "feedback_content": (
            "Bogdan has significant difficulty tolerating frustration. When asked to stop playing "
            "or transition to another activity, he becomes immediately aggressive — hitting, "
            "throwing objects, and making verbal threats. He hit his head against a wall when "
            "his mother offered him an apple he didn't want. He refuses to eat even when hungry. "
            "He says things like 'I shouldn't have been born' and 'life isn't fair' when upset. "
            "Multiple behavioral issues at school: talks over teacher, walks around during class, "
            "makes inappropriate sounds. Shows remorse after episodes but cannot self-regulate in the moment."
        ),
        "extracted_issues": [
            {
                "title": "Self-harm during frustration episodes",
                "description": "Hit head against wall when frustrated. Throws objects. Physical aggression when interrupted.",
                "category": "behavioral",
                "severity": "high",
            },
            {
                "title": "Verbal threats and negative self-talk",
                "description": "Says 'I'll kill you' and 'I shouldn't have been born' during frustration episodes.",
                "category": "emotional",
                "severity": "high",
            },
            {
                "title": "Food refusal and oppositional behavior",
                "description": "Refuses to eat even when hungry. Won't say what he wants to eat.",
                "category": "behavioral",
                "severity": "medium",
            },
        ],
        "expected_clinical_domain": "frustration_tolerance",
        "expected_behavior_direction": "INCREASE",
        "expected_query_keywords": ["frustration tolerance", "emotion regulation", "children", "behavioral"],
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
    "frustration-tolerance-child": {
        "title": "Frustration Tolerance Interventions for Young Children with Disruptive Behavior: A Systematic Review",
        "authors": ["Roberts, M.", "Fernandez, A.", "Kowalski, P."],
        "year": 2023,
        "journal": "Journal of Child Psychology and Psychiatry",
        "doi": "10.1234/jcpp.2023.087",
        "abstract": (
            "This systematic review examined 34 studies on frustration tolerance interventions for "
            "children aged 4-10 with disruptive behavior disorders. Cognitive-behavioral interventions "
            "targeting emotion regulation showed the strongest effects (d=0.92), particularly those "
            "combining child-focused anger management with parent training in contingency management. "
            "Dialectical behavior therapy adapted for children (DBT-C) showed promising results for "
            "reducing self-harm behaviors during frustration episodes (d=0.78). Token economy systems "
            "combined with graduated exposure to frustrating tasks improved distress tolerance in "
            "school settings. Children with comorbid ADHD required longer treatment duration but showed "
            "comparable gains at 6-month follow-up. Parent-Child Interaction Therapy (PCIT) was "
            "effective for reducing oppositional behavior and improving parent-child communication "
            "during frustration-inducing situations."
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
