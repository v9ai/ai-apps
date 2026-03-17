"""Nodes for the interview prep pipeline."""

import json
import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.types import Send

from .state import CATEGORIES, InterviewPrepState, ParsedJD, QAPair, QuestionSet


def _fetch_company_context(company_key: str) -> str:
    """Fetch all jobs for the company from DB and compile a context string."""
    try:
        from src.db.connection import get_connection
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT title, ashby_department, workplace_type,
                       salary_min, salary_max, salary_currency,
                       LEFT(description, 600) AS desc_excerpt
                FROM jobs
                WHERE company_key = %s
                  AND description IS NOT NULL
                  AND status != 'stale'
                ORDER BY ashby_department, title
                """,
                [company_key],
            )
            rows = cur.fetchall()
        conn.close()
    except Exception as e:
        print(f"  Warning: could not fetch company jobs — {e}")
        return ""

    if not rows:
        return ""

    # Group by department
    by_dept: dict[str, list] = {}
    for r in rows:
        dept = r.get("ashby_department") or "Other"
        by_dept.setdefault(dept, []).append(r)

    lines = [f"## All open roles at this company ({len(rows)} total)\n"]
    for dept, jobs in sorted(by_dept.items()):
        lines.append(f"### {dept}")
        for j in jobs:
            remote = j.get("workplace_type") or "?"
            sal = ""
            if j.get("salary_min") and j.get("salary_max"):
                sal = f" | {j['salary_min']:,}–{j['salary_max']:,} {j.get('salary_currency','')}"
            lines.append(f"- **{j['title']}** ({remote}){sal}")
            if j.get("desc_excerpt"):
                # First 2 sentences only
                excerpt = j["desc_excerpt"].strip().replace("\n", " ")
                sentences = excerpt.split(". ")
                short = ". ".join(sentences[:2]).strip()
                if short:
                    lines.append(f"  > {short}")
        lines.append("")

    print(f"  Loaded {len(rows)} company jobs for context ({len(by_dept)} departments)")
    return "\n".join(lines)

_llm_json: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm_json
    if _llm_json is None:
        _llm_json = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.4,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm_json


# ---------------------------------------------------------------------------
# Node 1: parse_jd
# ---------------------------------------------------------------------------

def parse_jd_node(state: InterviewPrepState) -> dict:
    """Extract structured info from JD."""
    messages = [
        SystemMessage(content=(
            "You are an expert technical recruiter. Analyse the job description and return JSON:\n"
            "- tech_stack: list of technology/tool names mentioned (max 15, strings)\n"
            "- requirements: list of key hard requirements as short phrases (max 10, strings)\n"
            "- role_type: one of 'frontend', 'backend', 'fullstack', 'ml', 'devops', 'data', 'other'\n"
            "- seniority: one of 'junior', 'mid', 'senior', 'lead', 'staff'\n"
            "Return ONLY valid JSON, no markdown fences."
        )),
        HumanMessage(content=f"Job title: {state['job_title']}\nCompany: {state['company_name']}\n\n{state['job_description']}"),
    ]
    response = _get_llm().invoke(messages)
    try:
        raw = json.loads(response.content)
        parsed: ParsedJD = {
            "tech_stack": raw.get("tech_stack", []),
            "requirements": raw.get("requirements", []),
            "role_type": raw.get("role_type", "other"),
            "seniority": raw.get("seniority", "senior"),
        }
    except (json.JSONDecodeError, KeyError):
        parsed = {"tech_stack": [], "requirements": [], "role_type": "other", "seniority": "senior"}

    print(f"Parsed JD — role_type={parsed['role_type']}, seniority={parsed['seniority']}")
    print(f"  Tech stack: {', '.join(parsed['tech_stack'])}")

    company_context = _fetch_company_context(state.get("company_key", ""))
    return {"parsed": parsed, "question_sets": [], "company_context": company_context}


# ---------------------------------------------------------------------------
# Router: fan out one Send per category
# ---------------------------------------------------------------------------

def route_to_categories(state: InterviewPrepState) -> list[Send]:
    parsed = state["parsed"] or {}
    company_context = state.get("company_context", "")
    return [
        Send("generate_questions", {
            "category": cat,
            "job_title": state["job_title"],
            "company_name": state["company_name"],
            "job_description": state["job_description"],
            "parsed": parsed,
            "company_context": company_context,
        })
        for cat in CATEGORIES
    ]


# ---------------------------------------------------------------------------
# Node 2: generate_questions — Q&A pairs per category (parallel via Send)
# ---------------------------------------------------------------------------

_CATEGORY_SPECS = {
    "technical": {
        "count": 6,
        "question_prompt": (
            "Generate {count} challenging technical interview questions for a {seniority} {role_type} engineer at {company}. "
            "Focus on the tech stack: {tech_stack}. Mix conceptual, practical, and architecture questions."
        ),
        "answer_prompt": (
            "For each question, write a strong 3–5 sentence model answer a senior candidate would give. "
            "Be specific, mention trade-offs, and reference the tech stack where relevant."
        ),
    },
    "behavioral": {
        "count": 5,
        "question_prompt": (
            "Generate {count} behavioral interview questions (STAR format) for a {seniority} {role_type} engineer at {company}. "
            "Draw from: {requirements}. Focus on ownership, quality, autonomy, and collaboration."
        ),
        "answer_prompt": (
            "For each question, write a concise STAR model answer (Situation → Task → Action → Result) "
            "a strong candidate would give, referencing the role context."
        ),
    },
    "system_design": {
        "count": 3,
        "question_prompt": (
            "Generate {count} system design / architecture questions for a {seniority} {role_type} engineer at {company}. "
            "The role involves: {requirements}. Questions should probe architectural thinking and trade-off reasoning."
        ),
        "answer_prompt": (
            "For each question, write a structured model answer covering: approach, key trade-offs, "
            "and concrete implementation details relevant to the tech stack: {tech_stack}."
        ),
    },
    "company_culture": {
        "count": 4,
        "question_prompt": (
            "Generate {count} thoughtful questions a candidate should ask the interviewer at {company} "
            "to assess culture, team dynamics, and growth opportunities for a {seniority} {role_type} engineer."
        ),
        "answer_prompt": (
            "For each question, write 2–3 sentences describing what a strong / red-flag answer from the interviewer "
            "would look like, so the candidate knows what to listen for."
        ),
    },
}

_CATEGORY_LABELS = {
    "technical": "Technical Questions",
    "behavioral": "Behavioral Questions (STAR)",
    "system_design": "System Design / Architecture",
    "company_culture": "Questions to Ask the Interviewer",
}


def generate_questions_node(state: dict) -> dict:
    """Generate Q&A pairs for one category — called in parallel via Send."""
    category: str = state["category"]
    parsed: ParsedJD = state.get("parsed") or {}
    spec = _CATEGORY_SPECS[category]

    tech_stack = ", ".join(parsed.get("tech_stack", [])) or "the described tech stack"
    requirements = "; ".join(parsed.get("requirements", [])) or "the described requirements"
    role_type = parsed.get("role_type", "software") or "software"
    seniority = parsed.get("seniority", "senior") or "senior"
    company = state["company_name"]

    fmt = dict(count=spec["count"], seniority=seniority, role_type=role_type,
               company=company, tech_stack=tech_stack, requirements=requirements)

    question_instr = spec["question_prompt"].format(**fmt)
    answer_instr = spec["answer_prompt"].format(**fmt)

    company_context = state.get("company_context", "")
    context_block = f"\n\n{company_context}" if company_context else ""

    messages = [
        SystemMessage(content=(
            "You are an expert interview coach. Return ONLY valid JSON with this structure:\n"
            '{"qa_pairs": [{"question": "...", "answer": "..."}, ...]}\n'
            "No markdown fences, no extra keys."
        )),
        HumanMessage(content=(
            f"Role: {state['job_title']} at {company}\n\n"
            f"Job description (excerpt):\n{state['job_description'][:2000]}"
            f"{context_block}\n\n"
            f"QUESTIONS: {question_instr}\n\n"
            f"ANSWERS: {answer_instr}\n\n"
            f"Return exactly {spec['count']} Q&A pairs as JSON."
        )),
    ]

    response = _get_llm().invoke(messages)
    try:
        raw = json.loads(response.content)
        pairs = raw.get("qa_pairs") or raw.get("questions") or []
        qa_pairs: list[QAPair] = [
            {"question": p.get("question", ""), "answer": p.get("answer", "")}
            for p in pairs
            if isinstance(p, dict) and p.get("question")
        ]
    except (json.JSONDecodeError, KeyError, TypeError):
        qa_pairs = []

    print(f"  [{category}] {len(qa_pairs)} Q&A pairs")
    qs: QuestionSet = {"category": category, "qa_pairs": qa_pairs}
    return {"question_sets": [qs]}


# ---------------------------------------------------------------------------
# Node 3: compile_report
# ---------------------------------------------------------------------------

def compile_report_node(state: InterviewPrepState) -> dict:
    """Assemble all Q&A sets into a markdown report."""
    sets_by_category = {qs["category"]: qs["qa_pairs"] for qs in state.get("question_sets", [])}

    parsed = state.get("parsed") or {}
    lines = [f"# Interview Prep — {state['job_title']} @ {state['company_name']}", ""]
    if parsed.get("tech_stack"):
        lines += [f"**Tech stack:** {', '.join(parsed['tech_stack'])}", ""]

    for cat in CATEGORIES:
        label = _CATEGORY_LABELS[cat]
        pairs = sets_by_category.get(cat, [])
        lines += [f"## {label}", ""]

        if not pairs:
            lines += ["*(no questions generated)*", ""]
            continue

        answer_label = "What to listen for" if cat == "company_culture" else "Model answer"
        for i, pair in enumerate(pairs, 1):
            lines += [
                f"### {i}. {pair['question']}",
                "",
                f"**{answer_label}:** {pair['answer']}",
                "",
            ]

    return {"report": "\n".join(lines)}
