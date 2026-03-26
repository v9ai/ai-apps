"""Nodes for the tech knowledge extraction pipeline."""

import json
import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.types import Send

from .state import ExtractedTech, GeneratedContent, TechKnowledgeState
from .taxonomy import (
    TECH_CATEGORIES,
    get_category_for_tag,
    get_label_for_tag,
    make_cat_slug,
    make_lesson_slug,
    normalize_tag,
)

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
# Node 1: fetch_source
# ---------------------------------------------------------------------------

def fetch_source_node(state: TechKnowledgeState) -> dict:
    """Fetch the job description text (already in state from CLI)."""
    jd = state.get("job_description", "")
    print(f"  Source: {len(jd)} chars from application #{state['application_id']}")
    return {"source_text": jd}


# ---------------------------------------------------------------------------
# Node 2: extract_technologies
# ---------------------------------------------------------------------------

def extract_technologies_node(state: TechKnowledgeState) -> dict:
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
            f"{state['source_text'][:4000]}"
        )),
    ]

    response = _get_llm_json().invoke(messages)
    try:
        raw = json.loads(response.content)
        raw_techs = raw.get("technologies", [])
    except (json.JSONDecodeError, KeyError):
        raw_techs = []

    # Normalize to canonical tags
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

    # Save extracted tech list back to the application for the UI
    _save_tech_stack_to_app(state.get("application_id", 0), technologies)

    return {"technologies": technologies}


def _save_tech_stack_to_app(application_id: int, technologies: list) -> None:
    """Save the extracted tech list to the application's ai_tech_stack column."""
    if not application_id or not technologies:
        return
    try:
        from src.db.connection import get_connection
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE applications SET ai_tech_stack = %s, updated_at = now() WHERE id = %s",
                [json.dumps(technologies), application_id],
            )
        conn.commit()
        conn.close()
        print(f"  Saved {len(technologies)} techs to applications.ai_tech_stack")
    except Exception as e:
        print(f"  Warning: could not save tech stack to app — {e}")


# ---------------------------------------------------------------------------
# Node 3: organize_hierarchy
# ---------------------------------------------------------------------------

def organize_hierarchy_node(state: TechKnowledgeState) -> dict:
    """Deduplicate, check existing knowledge DB, organize by category."""
    technologies = state.get("technologies", [])
    exclude_tags = set(state.get("exclude_tags", []))

    # Filter out explicitly excluded tags
    if exclude_tags:
        excluded = [t["label"] for t in technologies if t["tag"] in exclude_tags]
        technologies = [t for t in technologies if t["tag"] not in exclude_tags]
        if excluded:
            print(f"  Excluded by user: {', '.join(excluded)}")

    # Check which slugs already exist in knowledge DB
    existing_slugs: list[str] = []
    try:
        from .knowledge_db import get_existing_lesson_slugs, get_knowledge_connection
        conn = get_knowledge_connection()
        existing = get_existing_lesson_slugs(conn)
        conn.close()
        existing_slugs = [t["tag"] for t in technologies if make_lesson_slug(t["tag"]) in existing]
    except Exception as e:
        print(f"  Warning: could not check knowledge DB — {e}")

    # Filter out already-covered technologies
    new_techs = [t for t in technologies if t["tag"] not in existing_slugs]

    if existing_slugs:
        print(f"  Skipping {len(existing_slugs)} already in knowledge DB: {', '.join(existing_slugs)}")
    print(f"  Will generate content for {len(new_techs)} technologies")

    # Sort: primary first, then by category
    new_techs.sort(key=lambda t: (0 if t["relevance"] == "primary" else 1, t["category"], t["tag"]))

    return {
        "organized": new_techs,
        "existing_slugs": existing_slugs,
    }


# ---------------------------------------------------------------------------
# Router: fan-out one Send per technology
# ---------------------------------------------------------------------------

def route_to_technologies(state: TechKnowledgeState) -> list[Send]:
    """Fan out content generation, one per technology."""
    organized = state.get("organized", [])
    if not organized:
        return [Send("persist_to_knowledge", state)]

    return [
        Send("generate_content", {
            "tech": tech,
            "job_title": state["job_title"],
            "company_name": state["company_name"],
            "job_description": state.get("source_text", ""),
            "all_techs": [t["label"] for t in organized],
            "application_id": state["application_id"],
        })
        for tech in organized
    ]


# ---------------------------------------------------------------------------
# Node 4: generate_content (parallel via Send)
# ---------------------------------------------------------------------------

def generate_content_node(state: dict) -> dict:
    """Generate a study lesson for one technology."""
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

    # Extract subtopics from ## headings
    subtopics = []
    for line in content.split("\n"):
        if line.startswith("## "):
            subtopics.append(line[3:].strip())

    slug = make_lesson_slug(tech["tag"])
    title = f"{tech['label']}"

    print(f"  [{tech['tag']}] Generated {word_count} words, {len(subtopics)} sections")

    generated: GeneratedContent = {
        "tag": tech["tag"],
        "label": tech["label"],
        "category": tech["category"],
        "slug": slug,
        "title": title,
        "content": content,
        "word_count": word_count,
        "subtopics": subtopics,
    }

    return {"generated": [generated]}


# ---------------------------------------------------------------------------
# Node 5: persist_to_knowledge
# ---------------------------------------------------------------------------

def persist_to_knowledge_node(state: TechKnowledgeState) -> dict:
    """Write generated content to the knowledge database and filesystem."""
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
        print("  No new content to persist.")
        return {"stats": stats}

    if dry_run:
        print(f"\n  [DRY RUN] Would persist {len(generated)} lessons:")
        for g in generated:
            print(f"    - {g['label']} ({g['category']}) — {g['word_count']} words")
        return {"stats": stats}

    try:
        from .knowledge_db import (
            get_knowledge_connection,
            get_max_lesson_number,
            get_max_sort_order,
            upsert_category,
            upsert_concept,
            upsert_concept_edge,
            upsert_lesson,
            upsert_lesson_concept,
        )
        from .taxonomy import TECH_CATEGORIES

        conn = get_knowledge_connection()
    except Exception as e:
        print(f"  Error connecting to knowledge DB: {e}")
        return {"stats": stats}

    try:
        # Get starting numbers
        next_lesson_num = get_max_lesson_number(conn) + 1
        next_sort_order = get_max_sort_order(conn) + 1

        # Track category IDs
        category_ids: dict[str, int] = {}
        category_lesson_ranges: dict[str, list[int]] = {}

        # Ensure all needed categories exist
        for g in generated:
            cat_name = g["category"]
            if cat_name not in category_ids:
                cat_meta = TECH_CATEGORIES.get(cat_name, {})
                cat_slug = make_cat_slug(cat_name)
                cat_id = upsert_category(
                    conn,
                    name=cat_name,
                    slug=cat_slug,
                    icon=cat_meta.get("icon", "\U0001f4da"),
                    description=cat_meta.get("description", f"Technologies in {cat_name}"),
                    gradient_from=cat_meta.get("gradient_from", "#6366f1"),
                    gradient_to=cat_meta.get("gradient_to", "#818cf8"),
                    sort_order=next_sort_order,
                    lesson_range_lo=next_lesson_num,
                    lesson_range_hi=next_lesson_num,
                )
                category_ids[cat_name] = cat_id
                category_lesson_ranges[cat_name] = []
                next_sort_order += 1

        # Create parent category concepts
        category_concept_ids: dict[str, str] = {}
        for cat_name in category_ids:
            concept_id = upsert_concept(
                conn,
                name=cat_name,
                description=TECH_CATEGORIES.get(cat_name, {}).get("description"),
                concept_type="topic",
                metadata={"source": "lead-gen", "level": "category"},
            )
            category_concept_ids[cat_name] = concept_id
            stats["concepts_created"] += 1

        # Process each generated lesson
        for g in generated:
            lesson_num = next_lesson_num
            next_lesson_num += 1
            category_lesson_ranges.setdefault(g["category"], []).append(lesson_num)

            # Upsert lesson
            lesson_id = upsert_lesson(
                conn,
                slug=g["slug"],
                number=lesson_num,
                title=g["title"],
                category_id=category_ids[g["category"]],
                content=g["content"],
                word_count=g["word_count"],
                summary=f"Study guide for {g['label']} — extracted from {state.get('job_title', 'job application')}",
            )
            stats["lessons_persisted"] += 1

            # Upsert technology concept
            tech_concept_id = upsert_concept(
                conn,
                name=g["label"],
                description=f"{g['label']} — {g['category']}",
                concept_type="tool",
                metadata={
                    "source": "lead-gen",
                    "application_id": application_id,
                    "tag": g["tag"],
                    "slug": g["slug"],
                },
            )
            stats["concepts_created"] += 1

            # Edge: technology -> category (part_of)
            if g["category"] in category_concept_ids:
                upsert_concept_edge(
                    conn,
                    source_id=tech_concept_id,
                    target_id=category_concept_ids[g["category"]],
                    edge_type="part_of",
                )
                stats["edges_created"] += 1

            # Link lesson <-> concept
            upsert_lesson_concept(conn, lesson_id, tech_concept_id, relevance=1.0)

            # Create subtopic concepts and edges
            for subtopic in g.get("subtopics", [])[:5]:
                sub_name = f"{g['label']}: {subtopic}"
                sub_id = upsert_concept(
                    conn,
                    name=sub_name,
                    description=f"{subtopic} in the context of {g['label']}",
                    concept_type="topic",
                    metadata={"source": "lead-gen", "parent_tag": g["tag"]},
                )
                stats["concepts_created"] += 1

                upsert_concept_edge(
                    conn, source_id=sub_id, target_id=tech_concept_id, edge_type="part_of",
                )
                stats["edges_created"] += 1

                upsert_lesson_concept(conn, lesson_id, sub_id, relevance=0.8)

            # Write markdown file as filesystem fallback
            _write_content_file(g["slug"], g["content"])

            print(f"  Persisted: {g['label']} (lesson #{lesson_num})")

        # Update category lesson ranges
        for cat_name, nums in category_lesson_ranges.items():
            if nums:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE categories
                        SET lesson_range_lo = LEAST(lesson_range_lo, %s),
                            lesson_range_hi = GREATEST(lesson_range_hi, %s)
                        WHERE id = %s
                        """,
                        [min(nums), max(nums), category_ids[cat_name]],
                    )
                conn.commit()

        conn.close()

    except Exception as e:
        print(f"  Error persisting to knowledge DB: {e}")
        import traceback
        traceback.print_exc()

    print(f"\n  --- Persistence Summary ---")
    print(f"  Lessons persisted: {stats['lessons_persisted']}")
    print(f"  Concepts created:  {stats['concepts_created']}")
    print(f"  Edges created:     {stats['edges_created']}")

    return {"stats": stats}


def _write_content_file(slug: str, content: str) -> None:
    """Write lesson content to the knowledge app's content directory."""
    import os
    content_dir = os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "..", "..", "..",
        "knowledge", "content",
    )
    content_dir = os.path.normpath(content_dir)
    if os.path.isdir(content_dir):
        filepath = os.path.join(content_dir, f"{slug}.md")
        with open(filepath, "w") as f:
            f.write(content)
        print(f"    Wrote {filepath}")
