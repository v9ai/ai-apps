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
    ExtractedTech,
    GeneratedContent,
    ParsedJD,
    QAPair,
    QuestionSet,
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
    for cat in CATEGORIES:
        sends.append(Send("generate_questions", {
            "category": cat,
            "job_title": state["job_title"],
            "company_name": state["company_name"],
            "job_description": state["job_description"],
            "parsed": parsed,
            "company_context": company_context,
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
