"""Nodes for the merged application prep pipeline.

Combines interview_prep (parse JD -> generate Q&A) and tech_knowledge
(extract techs -> generate study content -> persist to knowledge DB)
into a single fan-out pipeline.
"""

import json
import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.types import Send

from ..tech_knowledge.knowledge_db import (
    get_existing_lesson_slugs,
    get_knowledge_connection,
    get_max_lesson_number,
    get_max_sort_order,
    upsert_category,
    upsert_concept,
    upsert_concept_edge,
    upsert_lesson,
    upsert_lesson_concept,
)
from ..tech_knowledge.nodes import _save_tech_stack_to_app, _write_content_file
from ..tech_knowledge.taxonomy import (
    TECH_CATEGORIES,
    get_category_for_tag,
    get_label_for_tag,
    make_cat_slug,
    make_lesson_slug,
    normalize_tag,
)
from html import unescape as _html_unescape

from .state import (
    CATEGORIES,
    ApplicationPrepState,
    CompanyResearch,
    ExtractedTech,
    GeneratedContent,
    ParsedJD,
    QAPair,
    QAScore,
    QuestionSet,
    RoleDepth,
)


def _ensure_unicode(text: str) -> str:
    """Decode HTML entities to Unicode. Guards against &#x2699; being stored as literal text."""
    return _html_unescape(text)


# ---------------------------------------------------------------------------
# Node 0: validate_urls — preflight check (runs in parallel with LLM nodes)
# ---------------------------------------------------------------------------

def validate_urls_node(state: ApplicationPrepState) -> dict:
    """Validate knowledge DB URL and connectivity before expensive LLM work.

    Runs in parallel with parse_jd and extract_technologies.
    Sets knowledge_db_ok flag — persist_knowledge checks it before writing.
    """
    from ..tech_knowledge.knowledge_db import EXPECTED_DB_NAME

    # Check URL format
    url = os.environ.get("KNOWLEDGE_DATABASE_URL", "")
    if not url:
        print("  [validate_urls] KNOWLEDGE_DATABASE_URL not set — persistence will be skipped")
        return {"knowledge_db_ok": False}

    from urllib.parse import urlparse

    parsed_url = urlparse(url)
    db_name = parsed_url.path.lstrip("/").split("?")[0]
    if db_name != EXPECTED_DB_NAME:
        print(f"  [validate_urls] FAIL: URL points to '{db_name}', expected '{EXPECTED_DB_NAME}'")
        return {"knowledge_db_ok": False}

    # Check connectivity
    try:
        conn = get_knowledge_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.close()
        print(f"  [validate_urls] OK: knowledge DB reachable ({db_name}@{parsed_url.hostname})")
        return {"knowledge_db_ok": True}
    except Exception as e:
        print(f"  [validate_urls] WARN: knowledge DB unreachable — {e}")
        return {"knowledge_db_ok": False}


# ---------------------------------------------------------------------------
# LLM factories
# ---------------------------------------------------------------------------

_llm_json: ChatOpenAI | None = None
_llm_text: ChatOpenAI | None = None


def _get_llm_json() -> ChatOpenAI:
    global _llm_json
    if _llm_json is None:
        _llm_json = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.3,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm_json


def _get_llm_text() -> ChatOpenAI:
    global _llm_text
    if _llm_text is None:
        _llm_text = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.5,
            max_tokens=4096,
        )
    return _llm_text


# ---------------------------------------------------------------------------
# Node 1: parse_jd — extract structured info + company context
# ---------------------------------------------------------------------------

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
                sal = f" | {j['salary_min']:,}–{j['salary_max']:,} {j.get('salary_currency', '')}"
            lines.append(f"- **{j['title']}** ({remote}){sal}")
            if j.get("desc_excerpt"):
                excerpt = j["desc_excerpt"].strip().replace("\n", " ")
                sentences = excerpt.split(". ")
                short = ". ".join(sentences[:2]).strip()
                if short:
                    lines.append(f"  > {short}")
        lines.append("")

    print(f"  Loaded {len(rows)} company jobs for context ({len(by_dept)} departments)")
    return "\n".join(lines)


def parse_jd_node(state: ApplicationPrepState) -> dict:
    """Extract structured info from JD and fetch company context."""
    messages = [
        SystemMessage(content=(
            "You are an expert technical recruiter. Analyse the job description and return JSON:\n"
            "- tech_stack: list of technology/tool names mentioned (max 15, strings)\n"
            "- requirements: list of key hard requirements as short phrases (max 10, strings)\n"
            "- role_type: one of 'frontend', 'backend', 'fullstack', 'ml', 'devops', 'data', 'other'\n"
            "- seniority: one of 'junior', 'mid', 'senior', 'lead', 'staff'\n"
            "Return ONLY valid JSON, no markdown fences."
        )),
        HumanMessage(content=(
            f"Job title: {state['job_title']}\n"
            f"Company: {state['company_name']}\n\n"
            f"{state['job_description']}"
        )),
    ]
    response = _get_llm_json().invoke(messages)
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
# Node 1b: analyze_role_depth — deep JD signals beyond simple parsing
# ---------------------------------------------------------------------------

def analyze_role_depth_node(state: ApplicationPrepState) -> dict:
    """Extract deeper signals from JD: team dynamics, maturity, hidden requirements.

    Runs in parallel with parse_jd and extract_technologies. Output feeds into
    generate_questions via route_all_work for more targeted Q&A.
    """
    messages = [
        SystemMessage(content=(
            "You are a senior engineering hiring manager who has conducted 500+ interviews. "
            "Analyze this job description for signals that go BEYOND the explicit requirements. "
            "Return JSON with this exact structure:\n"
            "{\n"
            '  "team_signals": ["small team", "high autonomy", ...],\n'
            '  "technical_maturity": "early_stage|scaling|mature|legacy",\n'
            '  "growth_stage": "startup|scaleup|enterprise",\n'
            '  "hidden_requirements": ["must handle ambiguity", ...],\n'
            '  "key_challenges": ["scaling real-time system to 10x", ...],\n'
            '  "interview_focus": ["system design trade-offs", ...],\n'
            '  "culture_signals": ["engineering-driven culture", ...]\n'
            "}\n\n"
            "Guidelines:\n"
            "- team_signals: infer from phrases like 'small team', 'wear many hats', 'cross-functional'\n"
            "- technical_maturity: early_stage (building from scratch), scaling (product-market fit, growing), "
            "mature (established systems, optimization), legacy (modernization needed)\n"
            "- growth_stage: startup (<50 people signals), scaleup (rapid hiring, Series B+), enterprise (large org)\n"
            "- hidden_requirements: what's implied but not stated — e.g. 'fast-paced' means 'handle pressure'\n"
            "- key_challenges: specific technical/organizational challenges this person will face\n"
            "- interview_focus: what interviewers at this company likely care about most based on culture/stage\n"
            "- culture_signals: values, work style, decision-making indicators\n"
            "- Max 5 items per list. Be specific, not generic.\n"
            "- Return ONLY valid JSON, no markdown fences."
        )),
        HumanMessage(content=(
            f"Job title: {state['job_title']}\n"
            f"Company: {state['company_name']}\n\n"
            f"{state['job_description']}"
        )),
    ]
    response = _get_llm_json().invoke(messages)
    try:
        raw = json.loads(response.content)
        role_depth: RoleDepth = {
            "team_signals": raw.get("team_signals", [])[:5],
            "technical_maturity": raw.get("technical_maturity", "mature"),
            "growth_stage": raw.get("growth_stage", "scaleup"),
            "hidden_requirements": raw.get("hidden_requirements", [])[:5],
            "key_challenges": raw.get("key_challenges", [])[:5],
            "interview_focus": raw.get("interview_focus", [])[:5],
            "culture_signals": raw.get("culture_signals", [])[:5],
        }
    except (json.JSONDecodeError, KeyError):
        role_depth = {
            "team_signals": [], "technical_maturity": "mature",
            "growth_stage": "scaleup", "hidden_requirements": [],
            "key_challenges": [], "interview_focus": [], "culture_signals": [],
        }

    print(f"  Role depth — maturity={role_depth['technical_maturity']}, "
          f"stage={role_depth['growth_stage']}, "
          f"challenges={len(role_depth['key_challenges'])}, "
          f"focus={len(role_depth['interview_focus'])}")
    return {"role_depth": role_depth}


# ---------------------------------------------------------------------------
# Node 1c: research_company — synthesize company intelligence from DB data
# ---------------------------------------------------------------------------

def _fetch_company_data(company_key: str, company_name: str) -> dict:
    """Fetch company record from the companies table."""
    try:
        from src.db.connection import get_connection

        conn = get_connection()
        with conn.cursor() as cur:
            # Try by key first, then by name
            cur.execute(
                """
                SELECT name, description, industry, size, location, website,
                       category, tags, services, industries,
                       ai_tier, ai_classification_reason,
                       deep_analysis, linkedin_url, github_url,
                       ashby_industry_tags, ashby_tech_signals, ashby_size_signal
                FROM companies
                WHERE lower(key) = lower(%s)
                   OR lower(name) = lower(%s)
                LIMIT 1
                """,
                [company_key, company_name],
            )
            row = cur.fetchone()
        conn.close()
        return dict(row) if row else {}
    except Exception as e:
        print(f"  Warning: could not fetch company data — {e}")
        return {}


def _parse_json_field(value: str | None) -> list[str]:
    """Safely parse a JSON array string field."""
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def research_company_node(state: ApplicationPrepState) -> dict:
    """Synthesize structured company intelligence from DB data + LLM analysis.

    Runs in parallel with parse_jd, analyze_role_depth, and extract_technologies.
    Output feeds into generate_questions for more targeted company-specific Q&A.
    """
    company_key = state.get("company_key", "")
    company_name = state.get("company_name", "")
    job_description = state.get("job_description", "")
    company_data = _fetch_company_data(company_key, company_name)

    # Build a context document from available DB data
    context_parts = []
    if company_data:
        if company_data.get("description"):
            context_parts.append(f"Description: {company_data['description']}")
        if company_data.get("industry"):
            context_parts.append(f"Industry: {company_data['industry']}")
        if company_data.get("size"):
            context_parts.append(f"Size: {company_data['size']}")
        if company_data.get("location"):
            context_parts.append(f"Location: {company_data['location']}")
        if company_data.get("website"):
            context_parts.append(f"Website: {company_data['website']}")
        if company_data.get("category"):
            context_parts.append(f"Category: {company_data['category']}")

        tags = _parse_json_field(company_data.get("tags"))
        if tags:
            context_parts.append(f"Tags: {', '.join(tags)}")

        services = _parse_json_field(company_data.get("services"))
        if services:
            context_parts.append(f"Services: {', '.join(services)}")

        industries = _parse_json_field(company_data.get("industries"))
        if industries:
            context_parts.append(f"Industries: {', '.join(industries)}")

        ai_tier = company_data.get("ai_tier", 0)
        ai_labels = {0: "Not AI-focused", 1: "AI-First", 2: "AI-Native"}
        context_parts.append(f"AI Classification: {ai_labels.get(ai_tier, 'Unknown')}")
        if company_data.get("ai_classification_reason"):
            context_parts.append(f"AI Classification Reason: {company_data['ai_classification_reason']}")

        ashby_tags = _parse_json_field(company_data.get("ashby_industry_tags"))
        if ashby_tags:
            context_parts.append(f"Industry Tags (Ashby): {', '.join(ashby_tags)}")

        ashby_tech = _parse_json_field(company_data.get("ashby_tech_signals"))
        if ashby_tech:
            context_parts.append(f"Tech Signals (Ashby): {', '.join(ashby_tech)}")

        if company_data.get("ashby_size_signal"):
            context_parts.append(f"Size Signal: {company_data['ashby_size_signal']}")

    deep_analysis = (company_data.get("deep_analysis") or "") if company_data else ""

    db_source = "DB + JD" if context_parts else "JD only"
    print(f"  [research_company] Source: {db_source} ({len(context_parts)} DB fields)")

    company_context = "\n".join(context_parts) if context_parts else "(No structured company data in database)"
    deep_analysis_block = f"\n\nDEEP ANALYSIS:\n{deep_analysis[:3000]}" if deep_analysis else ""

    messages = [
        SystemMessage(content=(
            "You are a company research analyst preparing a candidate for a job interview. "
            "Synthesize ALL available data about this company into a structured research brief.\n\n"
            "You have two sources of information:\n"
            "1. COMPANY DATA — structured fields from a database (may be sparse or empty)\n"
            "2. JOB DESCRIPTION — the actual job posting, which reveals a LOT about the company: "
            "what they build, how they work, their tech stack, team structure, growth stage, and values\n\n"
            "Use BOTH sources. Even if company data is minimal, the job description is rich with signals. "
            "Extract everything you can about the company from how they describe the role.\n\n"
            "Return JSON with this exact structure:\n"
            "{\n"
            '  "company_overview": "2-3 sentences: what they do, market position, mission",\n'
            '  "product_focus": ["main product/service 1", ...],\n'
            '  "engineering_culture": ["signal about eng culture 1", ...],\n'
            '  "tech_investment_signals": ["AI-native company", "uses X stack", ...],\n'
            '  "competitive_landscape": "1-2 sentences: key competitors, differentiation",\n'
            '  "talking_points": ["specific thing to reference in interview 1", ...],\n'
            '  "red_flags": ["potential concern to probe 1", ...]\n'
            "}\n\n"
            "Guidelines:\n"
            "- company_overview: Be specific about what the company DOES, not generic praise\n"
            "- product_focus: Their actual products/services, max 5\n"
            "- engineering_culture: Signals about how engineering works there (team size, autonomy, etc), max 5\n"
            "- tech_investment_signals: Evidence of technical sophistication or AI investment, max 5\n"
            "- competitive_landscape: Who they compete with, what makes them different\n"
            "- talking_points: Specific facts a candidate should reference to show they researched the company, max 5\n"
            "- red_flags: Potential concerns worth probing (not deal-breakers, just things to ask about), max 3\n"
            "- If data is truly insufficient for a field, return an empty list [] or empty string \"\"\n"
            "- Return ONLY valid JSON, no markdown fences."
        )),
        HumanMessage(content=(
            f"Company: {company_name}\n"
            f"Role being applied for: {state['job_title']}\n\n"
            f"COMPANY DATA:\n{company_context}"
            f"{deep_analysis_block}\n\n"
            f"JOB DESCRIPTION:\n{job_description[:4000]}"
        )),
    ]

    response = _get_llm_json().invoke(messages)
    try:
        raw = json.loads(response.content)
        research: CompanyResearch = {
            "company_overview": raw.get("company_overview", ""),
            "product_focus": raw.get("product_focus", [])[:5],
            "engineering_culture": raw.get("engineering_culture", [])[:5],
            "tech_investment_signals": raw.get("tech_investment_signals", [])[:5],
            "competitive_landscape": raw.get("competitive_landscape", ""),
            "talking_points": raw.get("talking_points", [])[:5],
            "red_flags": raw.get("red_flags", [])[:3],
        }
    except (json.JSONDecodeError, KeyError):
        print(f"  [research_company] Failed to parse LLM response")
        return {"company_research": None}

    print(f"  [research_company] Synthesized: {len(research['product_focus'])} products, "
          f"{len(research['talking_points'])} talking points, "
          f"{len(research['engineering_culture'])} culture signals")
    return {"company_research": research}


# ---------------------------------------------------------------------------
# Node 2: extract_technologies — LLM extract + normalize to canonical tags
# ---------------------------------------------------------------------------

def extract_technologies_node(state: ApplicationPrepState) -> dict:
    """Use LLM to extract technologies from the job description."""
    messages = [
        SystemMessage(content=(
            "You are an expert technical recruiter and engineer. "
            "Extract ALL specific technologies, frameworks, tools, languages, platforms, "
            "AND domain concepts from this job description.\n\n"
            "Return JSON with this structure:\n"
            '{"technologies": [{"name": "PostgreSQL", "relevance": "primary"}, ...]}\n\n'
            "Rules:\n"
            "- 'primary' = explicitly mentioned or core to the role\n"
            "- 'secondary' = implied, nice-to-have, or inferred from context\n"
            "- Include specific versions/variants as the base tech (e.g. 'React 18' -> 'React')\n"
            "- IMPORTANT: Also infer technologies from domain requirements. For example:\n"
            "  - 'complex data-heavy UIs' implies data visualization tools, state management\n"
            "  - 'real-time applications' implies WebSocket, Server-Sent Events, Redis\n"
            "  - 'AI products' implies machine learning, LLMs, embeddings\n"
            "  - 'microservices' implies Docker, Kubernetes, message queues\n"
            "- Extract both the explicitly named AND the reasonably implied technologies\n"
            "- Max 20 technologies\n"
            "- Return ONLY valid JSON, no markdown fences."
        )),
        HumanMessage(content=(
            f"Job title: {state['job_title']}\n"
            f"Company: {state['company_name']}\n\n"
            f"{state['job_description'][:4000]}"
        )),
    ]

    response = _get_llm_json().invoke(messages)
    try:
        raw = json.loads(response.content)
        raw_techs = raw.get("technologies", [])
    except (json.JSONDecodeError, KeyError):
        raw_techs = []

    technologies: list[ExtractedTech] = []
    seen_tags: set[str] = set()
    for item in raw_techs:
        name = item.get("name", "") if isinstance(item, dict) else str(item)
        relevance = item.get("relevance", "secondary") if isinstance(item, dict) else "secondary"
        tag = normalize_tag(name)
        if tag and tag not in seen_tags:
            seen_tags.add(tag)
            technologies.append({
                "tag": tag,
                "label": get_label_for_tag(tag),
                "category": get_category_for_tag(tag),
                "relevance": relevance,
            })

    print(f"  Extracted {len(technologies)} technologies: {', '.join(t['label'] for t in technologies)}")
    _save_tech_stack_to_app(state.get("application_id", 0), technologies)
    return {"technologies": technologies}


# ---------------------------------------------------------------------------
# Node 3: organize_hierarchy — dedup, check knowledge DB, filter excluded
# ---------------------------------------------------------------------------

def organize_hierarchy_node(state: ApplicationPrepState) -> dict:
    """Deduplicate, check existing knowledge DB, organize by category."""
    technologies = state.get("technologies", [])
    exclude_tags = set(state.get("exclude_tags", []))

    # Deduplicate by tag (keep first occurrence)
    seen: set[str] = set()
    deduped: list[ExtractedTech] = []
    for t in technologies:
        if t["tag"] not in seen:
            seen.add(t["tag"])
            deduped.append(t)
    technologies = deduped

    if exclude_tags:
        excluded = [t["label"] for t in technologies if t["tag"] in exclude_tags]
        technologies = [t for t in technologies if t["tag"] not in exclude_tags]
        if excluded:
            print(f"  Excluded by user: {', '.join(excluded)}")

    existing_slugs: list[str] = []
    try:
        conn = get_knowledge_connection()
        existing = get_existing_lesson_slugs(conn)
        conn.close()
        existing_slugs = [t["tag"] for t in technologies if make_lesson_slug(t["tag"]) in existing]
    except Exception as e:
        print(f"  Warning: could not check knowledge DB — {e}")

    new_techs = [t for t in technologies if t["tag"] not in existing_slugs]

    if existing_slugs:
        print(f"  Skipping {len(existing_slugs)} already in knowledge DB: {', '.join(existing_slugs)}")
    print(f"  Will generate content for {len(new_techs)} technologies")

    new_techs.sort(key=lambda t: (0 if t["relevance"] == "primary" else 1, t["category"], t["tag"]))

    return {"organized": new_techs, "existing_slugs": existing_slugs}


# ---------------------------------------------------------------------------
# Router: fan out questions x4 + content xN in parallel
# ---------------------------------------------------------------------------

def route_all_work(state: ApplicationPrepState) -> list[Send]:
    """Fan out interview questions (4 categories) and tech content (N technologies) in parallel."""
    sends: list[Send] = []

    # Interview questions — always 4 categories
    parsed = state.get("parsed") or {}
    company_context = state.get("company_context", "")
    role_depth = state.get("role_depth") or {}
    company_research = state.get("company_research") or {}
    for cat in CATEGORIES:
        sends.append(Send("generate_questions", {
            "category": cat,
            "job_title": state["job_title"],
            "company_name": state["company_name"],
            "job_description": state["job_description"],
            "parsed": parsed,
            "company_context": company_context,
            "role_depth": role_depth,
            "company_research": company_research,
        }))

    # Tech content — one per organized technology
    organized = state.get("organized", [])
    for tech in organized:
        sends.append(Send("generate_content", {
            "tech": tech,
            "job_title": state["job_title"],
            "company_name": state["company_name"],
            "job_description": state["job_description"],
            "all_techs": [t["label"] for t in organized],
            "application_id": state["application_id"],
        }))

    return sends or [Send("finalize", {})]


# ---------------------------------------------------------------------------
# Node 4a: generate_questions — Q&A pairs per category (parallel via Send)
# ---------------------------------------------------------------------------

_CATEGORY_SPECS = {
    "technical": {
        "count": 6,
        "question_prompt": (
            "Generate {count} challenging technical interview questions for a {seniority} {role_type} engineer at {company}. "
            "Focus on the tech stack: {tech_stack}. Mix conceptual, practical, and architecture questions."
        ),
        "answer_prompt": (
            "For each question, write a strong 3-5 sentence model answer a senior candidate would give. "
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
            "For each question, write a concise STAR model answer (Situation -> Task -> Action -> Result) "
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
            "For each question, write 2-3 sentences describing what a strong / red-flag answer from the interviewer "
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

    # Enrich with role depth signals
    role_depth = state.get("role_depth") or {}
    depth_block = ""
    if role_depth:
        depth_parts = []
        if role_depth.get("key_challenges"):
            depth_parts.append(f"Key challenges this person will face: {'; '.join(role_depth['key_challenges'])}")
        if role_depth.get("interview_focus"):
            depth_parts.append(f"What interviewers likely care about: {'; '.join(role_depth['interview_focus'])}")
        if role_depth.get("hidden_requirements"):
            depth_parts.append(f"Hidden requirements (implied but not stated): {'; '.join(role_depth['hidden_requirements'])}")
        if role_depth.get("culture_signals"):
            depth_parts.append(f"Culture signals: {'; '.join(role_depth['culture_signals'])}")
        if role_depth.get("technical_maturity"):
            depth_parts.append(f"Technical maturity: {role_depth['technical_maturity']}")
        if depth_parts:
            depth_block = "\n\nDEEP ROLE CONTEXT (use this to make questions more specific):\n" + "\n".join(depth_parts)

    # Enrich with company research
    company_research = state.get("company_research") or {}
    research_block = ""
    if company_research:
        research_parts = []
        if company_research.get("company_overview"):
            research_parts.append(f"Company overview: {company_research['company_overview']}")
        if company_research.get("product_focus"):
            research_parts.append(f"Products/services: {'; '.join(company_research['product_focus'])}")
        if company_research.get("engineering_culture"):
            research_parts.append(f"Engineering culture: {'; '.join(company_research['engineering_culture'])}")
        if company_research.get("tech_investment_signals"):
            research_parts.append(f"Tech investment: {'; '.join(company_research['tech_investment_signals'])}")
        if company_research.get("competitive_landscape"):
            research_parts.append(f"Competitive landscape: {company_research['competitive_landscape']}")
        if company_research.get("talking_points"):
            research_parts.append(f"Key talking points: {'; '.join(company_research['talking_points'])}")
        if research_parts:
            research_block = "\n\nCOMPANY INTELLIGENCE (use this to make questions company-specific):\n" + "\n".join(research_parts)

    messages = [
        SystemMessage(content=(
            "You are an expert interview coach. Return ONLY valid JSON with this structure:\n"
            '{"qa_pairs": [{"question": "...", "answer": "..."}, ...]}\n'
            "No markdown fences, no extra keys.\n\n"
            "IMPORTANT: Questions must be SPECIFIC to this exact role, company, and tech stack. "
            "Generic questions that could apply to any software role are unacceptable. "
            "Reference specific technologies, challenges, and company context in both questions and answers."
        )),
        HumanMessage(content=(
            f"Role: {state['job_title']} at {company}\n\n"
            f"Job description (excerpt):\n{state['job_description'][:2000]}"
            f"{context_block}"
            f"{depth_block}"
            f"{research_block}\n\n"
            f"QUESTIONS: {question_instr}\n\n"
            f"ANSWERS: {answer_instr}\n\n"
            f"Return exactly {spec['count']} Q&A pairs as JSON."
        )),
    ]

    response = _get_llm_json().invoke(messages)
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
# Node 4c: score_and_refine — self-evaluation + regeneration of weak answers
# ---------------------------------------------------------------------------

_REFINE_THRESHOLD = 0.6  # Q&A pairs scoring below this get regenerated

def score_and_refine_node(state: ApplicationPrepState) -> dict:
    """Score each Q&A pair and regenerate weak answers.

    Evaluates specificity, difficulty calibration, and answer quality.
    Pairs scoring below threshold get a targeted regeneration with feedback.
    """
    question_sets = state.get("question_sets", [])
    parsed = state.get("parsed") or {}
    role_depth = state.get("role_depth") or {}

    if not question_sets:
        return {"qa_scores": [], "refined_count": 0}

    seniority = parsed.get("seniority", "senior")
    role_type = parsed.get("role_type", "software")
    all_scores: list[dict] = []
    total_refined = 0

    for qs in question_sets:
        category = qs["category"]
        pairs = qs["qa_pairs"]
        if not pairs:
            continue

        # Score all Q&A pairs in this category
        score_messages = [
            SystemMessage(content=(
                "You are an interview quality evaluator. Score each Q&A pair on three dimensions (0.0-1.0):\n"
                "- specificity: How specific is this to the exact role/company/tech stack? "
                "(0.0 = generic 'tell me about yourself', 1.0 = deeply role-specific)\n"
                "- difficulty: Is the difficulty appropriate for a {seniority} {role_type} engineer? "
                "(0.0 = too easy or too hard, 1.0 = perfectly calibrated)\n"
                "- answer_quality: Is the answer substantive, actionable, and specific? "
                "(0.0 = vague platitudes, 1.0 = concrete with examples and trade-offs)\n\n"
                "Return JSON: {{\"scores\": [{{\"idx\": 0, \"specificity\": 0.8, \"difficulty\": 0.7, "
                "\"answer_quality\": 0.9, \"feedback\": \"\"}}]}}\n"
                "- Include feedback ONLY for pairs where any score < 0.6 — explain what's weak.\n"
                "- Return ONLY valid JSON, no markdown fences."
            ).format(seniority=seniority, role_type=role_type)),
            HumanMessage(content=(
                f"Role: {state['job_title']} at {state['company_name']}\n"
                f"Category: {category}\n"
                f"Seniority: {seniority}, Role type: {role_type}\n\n"
                f"Q&A pairs to evaluate:\n{json.dumps(pairs, indent=2)}"
            )),
        ]
        score_response = _get_llm_json().invoke(score_messages)
        try:
            raw_scores = json.loads(score_response.content)
            scores = raw_scores.get("scores", [])
        except (json.JSONDecodeError, KeyError):
            scores = []

        # Identify weak pairs
        weak_indices: list[tuple[int, str]] = []
        for s in scores:
            idx = s.get("idx", -1)
            specificity = s.get("specificity", 1.0)
            difficulty = s.get("difficulty", 1.0)
            answer_quality = s.get("answer_quality", 1.0)
            overall = (specificity + difficulty + answer_quality) / 3
            feedback = s.get("feedback", "")

            score_entry: QAScore = {
                "question_idx": idx,
                "specificity": specificity,
                "difficulty": difficulty,
                "answer_quality": answer_quality,
                "overall": overall,
                "feedback": feedback,
            }
            all_scores.append({"category": category, **score_entry})

            if overall < _REFINE_THRESHOLD and 0 <= idx < len(pairs) and feedback:
                weak_indices.append((idx, feedback))

        # Regenerate weak answers
        if weak_indices:
            weak_details = "\n".join(
                f"- Q{idx}: \"{pairs[idx]['question']}\" — Weakness: {fb}"
                for idx, fb in weak_indices
                if idx < len(pairs)
            )
            interview_focus = "; ".join(role_depth.get("interview_focus", []))
            key_challenges = "; ".join(role_depth.get("key_challenges", []))

            refine_messages = [
                SystemMessage(content=(
                    "You are an expert interview coach. Some Q&A pairs were scored as weak. "
                    "Rewrite ONLY the answers (keep questions unchanged) to be more:\n"
                    "- Specific to this exact role and company\n"
                    "- Appropriately difficult for a {seniority} engineer\n"
                    "- Substantive with concrete examples, trade-offs, and technical depth\n\n"
                    "Return JSON: {{\"refined\": [{{\"idx\": 0, \"answer\": \"improved answer...\"}}]}}\n"
                    "Return ONLY valid JSON, no markdown fences."
                ).format(seniority=seniority)),
                HumanMessage(content=(
                    f"Role: {state['job_title']} at {state['company_name']}\n"
                    f"Tech stack: {', '.join(parsed.get('tech_stack', []))}\n"
                    + (f"Interview focus: {interview_focus}\n" if interview_focus else "")
                    + (f"Key challenges: {key_challenges}\n" if key_challenges else "")
                    + f"\nWeak Q&A pairs to improve:\n{weak_details}"
                )),
            ]
            refine_response = _get_llm_json().invoke(refine_messages)
            try:
                refined = json.loads(refine_response.content).get("refined", [])
                for r in refined:
                    idx = r.get("idx", -1)
                    new_answer = r.get("answer", "")
                    if 0 <= idx < len(pairs) and new_answer:
                        pairs[idx]["answer"] = new_answer
                        total_refined += 1
            except (json.JSONDecodeError, KeyError):
                pass

            if total_refined > 0:
                print(f"  [{category}] Refined {total_refined} weak answers")

    avg_scores = {}
    for cat in CATEGORIES:
        cat_scores = [s for s in all_scores if s["category"] == cat]
        if cat_scores:
            avg_scores[cat] = round(sum(s["overall"] for s in cat_scores) / len(cat_scores), 2)
    print(f"  Q&A scores: {avg_scores} | Refined: {total_refined} answers")

    return {"qa_scores": all_scores, "refined_count": total_refined}


# ---------------------------------------------------------------------------
# Node 4b: generate_content — study lesson per technology (parallel via Send)
# ---------------------------------------------------------------------------

def generate_content_node(state: dict) -> dict:
    """Generate a study lesson for one technology — called in parallel via Send."""
    tech: ExtractedTech = state["tech"]
    job_title = state["job_title"]
    company_name = state["company_name"]
    job_desc = state.get("job_description", "")[:2000]
    all_techs = state.get("all_techs", [])
    related_str = ", ".join(t for t in all_techs if t != tech["label"])

    messages = [
        SystemMessage(content=(
            "You are a senior engineer coaching another engineer for a technical interview. "
            "Write an interview-prep deep dive on the given technology — the kind of notes "
            "you'd review the night before an on-site.\n\n"
            "The reader already codes daily but may not have used THIS specific technology recently. "
            "They need to sound confident and specific in an interview, not recite textbook definitions.\n\n"
            "Structure (2000-3500 words, markdown):\n\n"
            "# {Technology Name}\n\n"
            "## The 30-Second Pitch\n"
            "How you'd explain this technology to an interviewer in one paragraph. "
            "What it is, what problem it solves, and why a team would pick it over alternatives.\n\n"
            "## How It Actually Works\n"
            "The mental model an interviewer expects you to have. Key internals, architecture, "
            "data flow. Use diagrams-as-text where helpful. Go deeper than the docs homepage.\n\n"
            "## Patterns You Should Know\n"
            "3-5 real-world patterns with code examples. The kind of code you'd write on a whiteboard "
            "or in a take-home. Show you've actually used it, not just read about it.\n\n"
            "## What Interviewers Actually Ask\n"
            "6-8 real interview questions with strong answers. Include:\n"
            "- Conceptual (\"Explain how X works under the hood\")\n"
            "- Trade-off (\"When would you NOT use X?\")\n"
            "- Debugging (\"You see Y problem in production, what do you check?\")\n"
            "- Architecture (\"How does X fit into a system with Z?\")\n"
            "Format each as **Q:** / **A:** pairs. Answers should be 2-4 sentences — concise but specific.\n\n"
            "## How It Connects to This Role's Stack\n"
            "Explain how this technology integrates with the other tools in the job. "
            "Show you understand the full picture, not just one piece.\n\n"
            "## Red Flags to Avoid\n"
            "Common mistakes or misconceptions that make candidates look junior. "
            "Things NOT to say in an interview about this technology.\n\n"
            "Guidelines:\n"
            "- Write like you're talking to a peer, not lecturing a student\n"
            "- Concrete > abstract. Real examples > theory\n"
            "- Code examples should be production-quality snippets, not toy demos\n"
            "- Name specific versions, APIs, and config options where relevant\n"
            "- If something is controversial or has changed recently, mention it\n"
        )),
        HumanMessage(content=(
            f"Technology: {tech['label']}\n"
            f"Category: {tech['category']}\n"
            f"Interview for: {job_title} at {company_name}\n"
            f"Other technologies in this role's stack: {related_str}\n\n"
            f"Job description:\n{job_desc}"
        )),
    ]

    response = _get_llm_text().invoke(messages)
    content = response.content.strip()
    word_count = len(content.split())
    subtopics = [line[3:].strip() for line in content.split("\n") if line.startswith("## ")]

    print(f"  [{tech['tag']}] Generated {word_count} words, {len(subtopics)} sections")

    generated: GeneratedContent = {
        "tag": tech["tag"],
        "label": tech["label"],
        "category": tech["category"],
        "slug": make_lesson_slug(tech["tag"]),
        "title": tech["label"],
        "content": content,
        "word_count": word_count,
        "subtopics": subtopics,
    }
    return {"generated": [generated]}


# ---------------------------------------------------------------------------
# Node 5: finalize — compile interview report + persist tech knowledge
# ---------------------------------------------------------------------------

def _compile_report(state: ApplicationPrepState) -> str:
    """Assemble all Q&A sets into a markdown report."""
    sets_by_category = {qs["category"]: qs["qa_pairs"] for qs in state.get("question_sets", [])}
    parsed = state.get("parsed") or {}
    role_depth = state.get("role_depth") or {}

    company_research = state.get("company_research") or {}

    lines = [f"# Interview Prep — {state['job_title']} @ {state['company_name']}", ""]
    if parsed.get("tech_stack"):
        lines += [f"**Tech stack:** {', '.join(parsed['tech_stack'])}", ""]

    # Company intelligence section
    if company_research and any(company_research.get(k) for k in ("company_overview", "product_focus", "talking_points")):
        lines += ["## Company Intelligence", ""]
        if company_research.get("company_overview"):
            lines += [company_research["company_overview"], ""]
        if company_research.get("product_focus"):
            lines.append("**Products & services:**")
            for p in company_research["product_focus"]:
                lines.append(f"- {p}")
            lines.append("")
        if company_research.get("engineering_culture"):
            lines.append("**Engineering culture signals:**")
            for c in company_research["engineering_culture"]:
                lines.append(f"- {c}")
            lines.append("")
        if company_research.get("tech_investment_signals"):
            lines.append("**Tech investment signals:**")
            for t in company_research["tech_investment_signals"]:
                lines.append(f"- {t}")
            lines.append("")
        if company_research.get("competitive_landscape"):
            lines += [f"**Competitive landscape:** {company_research['competitive_landscape']}", ""]
        if company_research.get("talking_points"):
            lines.append("**Talking points for your interview:**")
            for tp in company_research["talking_points"]:
                lines.append(f"- {tp}")
            lines.append("")
        if company_research.get("red_flags"):
            lines.append("**Things to probe / ask about:**")
            for rf in company_research["red_flags"]:
                lines.append(f"- {rf}")
            lines.append("")

    # Role depth context section
    if role_depth and any(role_depth.get(k) for k in ("key_challenges", "interview_focus", "hidden_requirements")):
        lines += ["## Role Intelligence", ""]
        if role_depth.get("technical_maturity"):
            lines.append(f"**Technical maturity:** {role_depth['technical_maturity'].replace('_', ' ').title()}")
        if role_depth.get("growth_stage"):
            lines.append(f"**Company stage:** {role_depth['growth_stage'].title()}")
        lines.append("")
        if role_depth.get("key_challenges"):
            lines.append("**Key challenges you'll face:**")
            for c in role_depth["key_challenges"]:
                lines.append(f"- {c}")
            lines.append("")
        if role_depth.get("interview_focus"):
            lines.append("**What interviewers will likely focus on:**")
            for f in role_depth["interview_focus"]:
                lines.append(f"- {f}")
            lines.append("")
        if role_depth.get("hidden_requirements"):
            lines.append("**Hidden requirements (read between the lines):**")
            for h in role_depth["hidden_requirements"]:
                lines.append(f"- {h}")
            lines.append("")

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

    # Quality summary
    qa_scores = state.get("qa_scores", [])
    refined_count = state.get("refined_count", 0)
    if qa_scores:
        avg_overall = sum(s.get("overall", 0) for s in qa_scores) / len(qa_scores)
        lines += [
            "---",
            "",
            f"*Quality score: {avg_overall:.0%} avg across {len(qa_scores)} Q&A pairs"
            + (f" ({refined_count} answers refined by self-evaluation)*" if refined_count else "*"),
            "",
        ]

    return "\n".join(lines)


def _persist_knowledge(state: ApplicationPrepState) -> dict:
    """Write generated tech content to the knowledge database."""
    generated = state.get("generated", [])
    dry_run = state.get("dry_run", False)
    application_id = state.get("application_id", 0)

    stats = {
        "technologies_extracted": len(state.get("technologies", [])),
        "already_existed": len(state.get("existing_slugs", [])),
        "content_generated": len(generated),
        "lessons_persisted": 0,
        "concepts_created": 0,
        "edges_created": 0,
    }

    if not generated:
        print("  No new tech content to persist.")
        return stats

    if not state.get("knowledge_db_ok", False):
        print("  Skipping persistence — knowledge DB validation failed (see validate_urls)")
        return stats

    if dry_run:
        print(f"\n  [DRY RUN] Would persist {len(generated)} lessons:")
        for g in generated:
            print(f"    - {g['label']} ({g['category']}) — {g['word_count']} words")
        return stats

    try:
        conn = get_knowledge_connection()
    except Exception as e:
        print(f"  Error connecting to knowledge DB: {e}")
        return stats

    try:
        next_lesson_num = get_max_lesson_number(conn) + 1
        next_sort_order = get_max_sort_order(conn) + 1

        category_ids: dict[str, int] = {}
        category_lesson_ranges: dict[str, list[int]] = {}

        for g in generated:
            cat_name = g["category"]
            if cat_name not in category_ids:
                cat_meta = TECH_CATEGORIES.get(cat_name, {})
                cat_slug = make_cat_slug(cat_name)
                cat_id = upsert_category(
                    conn, name=cat_name, slug=cat_slug,
                    icon=_ensure_unicode(cat_meta.get("icon", "\U0001f4da")),
                    description=cat_meta.get("description", f"Technologies in {cat_name}"),
                    gradient_from=cat_meta.get("gradient_from", "#6366f1"),
                    gradient_to=cat_meta.get("gradient_to", "#818cf8"),
                    sort_order=next_sort_order,
                    lesson_range_lo=next_lesson_num, lesson_range_hi=next_lesson_num,
                )
                category_ids[cat_name] = cat_id
                category_lesson_ranges[cat_name] = []
                next_sort_order += 1

        category_concept_ids: dict[str, str] = {}
        for cat_name in category_ids:
            concept_id = upsert_concept(
                conn, name=cat_name,
                description=TECH_CATEGORIES.get(cat_name, {}).get("description"),
                concept_type="topic",
                metadata={"source": "nomadically", "level": "category"},
            )
            category_concept_ids[cat_name] = concept_id
            stats["concepts_created"] += 1

        for g in generated:
            lesson_num = next_lesson_num
            next_lesson_num += 1
            category_lesson_ranges.setdefault(g["category"], []).append(lesson_num)

            lesson_id = upsert_lesson(
                conn, slug=g["slug"], number=lesson_num, title=g["title"],
                category_id=category_ids[g["category"]], content=g["content"],
                word_count=g["word_count"],
                summary=f"Study guide for {g['label']} — extracted from {state.get('job_title', 'job application')}",
            )
            stats["lessons_persisted"] += 1

            tech_concept_id = upsert_concept(
                conn, name=g["label"], description=f"{g['label']} — {g['category']}",
                concept_type="tool",
                metadata={
                    "source": "nomadically", "application_id": application_id,
                    "tag": g["tag"], "slug": g["slug"],
                },
            )
            stats["concepts_created"] += 1

            if g["category"] in category_concept_ids:
                upsert_concept_edge(
                    conn, source_id=tech_concept_id,
                    target_id=category_concept_ids[g["category"]],
                    edge_type="part_of",
                )
                stats["edges_created"] += 1

            upsert_lesson_concept(conn, lesson_id, tech_concept_id, relevance=1.0)

            for subtopic in g.get("subtopics", [])[:5]:
                sub_name = f"{g['label']}: {subtopic}"
                sub_id = upsert_concept(
                    conn, name=sub_name,
                    description=f"{subtopic} in the context of {g['label']}",
                    concept_type="topic",
                    metadata={"source": "nomadically", "parent_tag": g["tag"]},
                )
                stats["concepts_created"] += 1
                upsert_concept_edge(
                    conn, source_id=sub_id, target_id=tech_concept_id, edge_type="part_of",
                )
                stats["edges_created"] += 1
                upsert_lesson_concept(conn, lesson_id, sub_id, relevance=0.8)

            _write_content_file(g["slug"], g["content"])
            print(f"  Persisted: {g['label']} (lesson #{lesson_num})")

        for cat_name, nums in category_lesson_ranges.items():
            if nums:
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE categories
                           SET lesson_range_lo = LEAST(lesson_range_lo, %s),
                               lesson_range_hi = GREATEST(lesson_range_hi, %s)
                           WHERE id = %s""",
                        [min(nums), max(nums), category_ids[cat_name]],
                    )
                conn.commit()

        conn.close()

    except Exception as e:
        print(f"  Error persisting to knowledge DB: {e}")
        import traceback
        traceback.print_exc()

    return stats


def sync_hierarchy_node(state: ApplicationPrepState) -> dict:
    """Renumber pipeline-generated lessons so each category's lessons are contiguous.

    The knowledge app's prev/next navigation uses global lesson number ordering.
    Without this, lessons from different categories interleave (e.g. #56 Backend,
    #57 Cloud, #58 Backend) making navigation jump across categories.

    This node groups pipeline lessons by category and renumbers them so
    all lessons in a category are sequential, then updates category ranges.
    """
    if not state.get("knowledge_db_ok", False) or state.get("dry_run", False):
        return {}

    generated = state.get("generated", [])
    if not generated:
        return {}

    try:
        conn = get_knowledge_connection()
    except Exception as e:
        print(f"  [sync_hierarchy] Could not connect: {e}")
        return {}

    try:
        # Get the highest lesson number from the original curriculum (non-pipeline)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COALESCE(MAX(l.number), 55) AS max_num
                FROM lessons l
                JOIN categories c ON l.category_id = c.id
                WHERE c.name NOT IN (
                    SELECT name FROM categories
                    WHERE name IN ('Databases & Storage', 'Backend Frameworks',
                                   'Frontend Frameworks', 'Cloud & DevOps',
                                   'Languages', 'Testing & Quality', 'API & Communication')
                )
            """)
            base_number = cur.fetchone()["max_num"]

        # Get all pipeline categories and their lessons, ordered by category sort_order then lesson title
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id AS cat_id, c.name AS cat_name, c.sort_order,
                       l.id AS lesson_id, l.slug, l.title, l.number
                FROM categories c
                JOIN lessons l ON l.category_id = c.id
                WHERE c.name IN (
                    'Databases & Storage', 'Backend Frameworks',
                    'Frontend Frameworks', 'Cloud & DevOps',
                    'Languages', 'Testing & Quality', 'API & Communication'
                )
                ORDER BY c.sort_order, l.title
            """)
            rows = cur.fetchall()

        if not rows:
            conn.close()
            return {}

        # Phase 1: shift all pipeline lessons to a high temporary range to avoid unique conflicts
        temp_offset = 10000
        with conn.cursor() as cur:
            for row in rows:
                cur.execute(
                    "UPDATE lessons SET number = %s WHERE id = %s",
                    [row["number"] + temp_offset, row["lesson_id"]],
                )
        conn.commit()

        # Phase 2: renumber contiguously by category
        next_num = base_number + 1
        cat_ranges: dict[int, list[int]] = {}
        renumbered = 0

        for row in rows:
            cat_id = row["cat_id"]
            lesson_id = row["lesson_id"]

            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE lessons SET number = %s WHERE id = %s",
                    [next_num, lesson_id],
                )
            renumbered += 1

            cat_ranges.setdefault(cat_id, []).append(next_num)
            next_num += 1

        # Update category lesson ranges
        for cat_id, nums in cat_ranges.items():
            with conn.cursor() as cur:
                cur.execute(
                    """UPDATE categories
                       SET lesson_range_lo = %s, lesson_range_hi = %s
                       WHERE id = %s""",
                    [min(nums), max(nums), cat_id],
                )

        conn.commit()
        conn.close()

        if renumbered > 0:
            print(f"  [sync_hierarchy] Renumbered {renumbered} lessons across {len(cat_ranges)} categories")
        else:
            print(f"  [sync_hierarchy] Numbering already contiguous")

    except Exception as e:
        print(f"  [sync_hierarchy] Error: {e}")
        import traceback
        traceback.print_exc()

    return {}


def compile_report_node(state: ApplicationPrepState) -> dict:
    """Assemble all Q&A sets into a markdown interview report."""
    report = _compile_report(state)
    q_count = sum(len(qs["qa_pairs"]) for qs in state.get("question_sets", []))
    print(f"  Compiled report: {q_count} questions, {len(report)} chars")
    return {"report": report}


def persist_knowledge_node(state: ApplicationPrepState) -> dict:
    """Write generated tech content to the knowledge database."""
    stats = _persist_knowledge(state)

    print(f"\n--- Application Prep Summary ---")
    q_count = sum(len(qs["qa_pairs"]) for qs in state.get("question_sets", []))
    print(f"  Interview questions: {q_count} across {len(state.get('question_sets', []))} categories")
    print(f"  Tech content generated: {stats.get('content_generated', 0)}")
    print(f"  Lessons persisted: {stats.get('lessons_persisted', 0)}")

    return {"stats": stats}
