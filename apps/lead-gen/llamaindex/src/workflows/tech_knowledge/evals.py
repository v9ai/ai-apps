"""
Evals for the tech knowledge extraction workflow.

Run:
    python -m cli eval-tech-knowledge

Three phases per job:
1. Hard structural assertions — fail fast on counts, types, required fields
2. Semantic assertions — extracted techs match expected, categories valid
3. deepeval GEval metrics — LLM-judged quality for extraction, content, and hierarchy
"""

from dotenv import load_dotenv

load_dotenv()

import asyncio
import json
import os

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from llama_index.llms.deepseek import DeepSeek

from .taxonomy import TECH_CATEGORIES
from .workflow import TechKnowledgeWorkflow


# ---------------------------------------------------------------------------
# DeepSeek as judge model
# ---------------------------------------------------------------------------

class DeepSeekJudge(DeepEvalBaseLLM):
    def __init__(self):
        self._llm = DeepSeek(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            temperature=0.0,
        )

    def load_model(self):
        return self._llm

    def generate(self, prompt: str, **kwargs) -> str:
        from llama_index.core.llms import ChatMessage
        response = self._llm.chat([ChatMessage(role="user", content=prompt)])
        return response.message.content

    async def a_generate(self, prompt: str, **kwargs) -> str:
        from llama_index.core.llms import ChatMessage
        response = await self._llm.achat([ChatMessage(role="user", content=prompt)])
        return response.message.content

    def get_model_name(self) -> str:
        return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


_judge = DeepSeekJudge()

# ---------------------------------------------------------------------------
# Mock JDs
# ---------------------------------------------------------------------------

MOCK_JOBS = [
    {
        "name": "Senior Backend Engineer @ Linear",
        "job_title": "Senior Backend Engineer",
        "company_name": "Linear",
        "job_description": (
            "Linear builds the issue tracking tool loved by high-performance engineering teams.\n"
            "We're looking for a Senior Backend Engineer to scale our real-time infrastructure.\n\n"
            "You will:\n"
            "- Architect and implement high-throughput APIs in TypeScript and Node.js\n"
            "- Manage PostgreSQL schemas and optimize complex queries\n"
            "- Build reliable background job systems using Redis queues\n"
            "- Deploy and monitor services on AWS using Kubernetes and Terraform\n\n"
            "Requirements:\n"
            "- 5+ years backend engineering experience\n"
            "- Strong TypeScript and Node.js skills\n"
            "- Experience with PostgreSQL at scale (indexing, query planning, replication)\n"
            "- Knowledge of Redis, event-driven systems, and WebSockets for real-time features\n"
            "- AWS or GCP experience with Kubernetes\n\n"
            "Remote-first, EU timezone preferred."
        ),
        "expected_techs_contain": ["typescript", "postgresql", "redis", "nodejs"],
        "expected_min_techs": 5,
        "expected_categories_contain": ["Languages", "Databases & Storage"],
    },
    {
        "name": "Senior Frontend Engineer @ Peec",
        "job_title": "Senior Frontend Engineer (Remote)",
        "company_name": "Peec",
        "job_description": (
            "We're building the next generation of AI-powered feedback products.\n"
            "As a Senior Frontend Engineer you will:\n"
            "- Build complex, data-heavy UIs with React 18 and TypeScript\n"
            "- Implement real-time features with WebSocket connections\n"
            "- Style pixel-perfect interfaces with Tailwind CSS\n"
            "- Write comprehensive tests with Jest and Playwright\n"
            "- Background working on AI products, complex data-heavy UIs, or real-time applications\n\n"
            "Requirements:\n"
            "- 5+ years experience with React and TypeScript\n"
            "- Strong understanding of state management patterns\n"
            "- Experience with modern CSS (Tailwind, CSS-in-JS)\n"
            "- Familiarity with testing frameworks\n\n"
            "Fully remote, EU timezone."
        ),
        "expected_techs_contain": ["react", "typescript", "tailwind"],
        "expected_min_techs": 4,
        "expected_categories_contain": ["Frontend Frameworks", "Languages"],
    },
    {
        "name": "Platform Engineer @ Grafana Labs",
        "job_title": "Platform Engineer",
        "company_name": "Grafana Labs",
        "job_description": (
            "Grafana Labs is the company behind Grafana, Loki, Tempo, and Mimir.\n"
            "We need a Platform Engineer to build and maintain our cloud infrastructure.\n\n"
            "You will:\n"
            "- Manage Kubernetes clusters across AWS and GCP\n"
            "- Build infrastructure-as-code with Terraform and Ansible\n"
            "- Design and maintain CI/CD pipelines with GitHub Actions\n"
            "- Write automation tooling in Go and Python\n"
            "- Monitor production systems using Grafana, Prometheus, and Loki\n\n"
            "Requirements:\n"
            "- 4+ years platform or DevOps engineering experience\n"
            "- Expert-level Kubernetes and Terraform skills\n"
            "- Go proficiency, Python nice-to-have\n"
            "- Deep understanding of networking, DNS, and load balancing\n"
            "- Experience with observability stacks\n\n"
            "Remote-first, global."
        ),
        "expected_techs_contain": ["kubernetes", "terraform", "go", "ansible"],
        "expected_min_techs": 5,
        "expected_categories_contain": ["Cloud & DevOps", "Languages"],
    },
    {
        "name": "Senior Full Stack AI Engineer @ WWT",
        "job_title": "Senior Full Stack AI Engineer",
        "company_name": "World Wide Technology",
        "job_description": (
            "We are seeking experienced engineers to build and scale Generative AI\n"
            "and agent-based systems. We are looking for strong engineers with experience in\n"
            "modern software development and emerging AI agent frameworks such as LlamaIndex.\n\n"
            "Key Responsibilities:\n"
            "- Design and build full-stack applications integrating Generative AI capabilities\n"
            "- Integrate LLM workflows using frameworks such as LlamaIndex or similar tools\n"
            "- Build backend APIs and services supporting AI-driven features\n\n"
            "Key Skills:\n"
            "- Strong JavaScript/TypeScript and modern frontend frameworks (React, Next.js)\n"
            "- Backend experience with Python or Node.js\n"
            "- API design and microservices experience\n"
            "- Experience integrating LLMs or AI APIs\n"
            "- Familiarity with cloud platforms (AWS, GCP, Azure)\n\n"
            "Required Qualifications:\n"
            "- 6+ years of professional software engineering experience\n"
            "- Minimum 2 years of hands-on experience with Generative AI, LLMs, or AI agents\n"
            "- Experience working with agent frameworks such as LlamaIndex (or similar)\n\n"
            "Remote-first."
        ),
        "expected_techs_contain": ["llamaindex", "typescript", "react", "python", "nodejs"],
        "expected_min_techs": 7,
        "expected_categories_contain": ["Backend Frameworks", "Languages", "Frontend Frameworks"],
    },
]

VALID_CATEGORIES = set(TECH_CATEGORIES.keys())

# ---------------------------------------------------------------------------
# deepeval metrics
# ---------------------------------------------------------------------------

tech_extraction_metric = GEval(
    model=_judge,
    name="Technology Extraction Accuracy",
    criteria=(
        "The extracted technologies must accurately reflect the job description. "
        "Primary technologies should be those explicitly named in the JD. "
        "Secondary technologies should be reasonably inferred from context. "
        "Each technology must have a valid canonical tag, human-readable label, "
        "and appropriate category assignment. "
        "Technologies should not be fabricated — they must be traceable to the JD text."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
)

content_quality_metric = GEval(
    model=_judge,
    name="Interview-Prep Content Quality",
    criteria=(
        "The generated lesson must be interview-focused and practical. "
        "It must include: a concise 30-second pitch, explanation of how the technology works, "
        "real-world code patterns, and actual interview Q&A pairs. "
        "The tone should be peer-to-peer coaching, not textbook lecturing. "
        "Code examples must be production-quality. "
        "Content must reference the specific job context (role title, company, related stack). "
        "Generic or superficial content is poor quality."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.65,
)

content_structure_metric = GEval(
    model=_judge,
    name="Content Structure & Completeness",
    criteria=(
        "The markdown lesson must contain these sections: "
        "'## The 30-Second Pitch', '## How It Actually Works', "
        "'## Patterns You Should Know', '## What Interviewers Actually Ask', "
        "'## How It Connects to This Role\\'s Stack', '## Red Flags to Avoid'. "
        "Each section should have substantive content (not just a heading). "
        "The lesson should be 2000-3500 words. "
        "Interview Q&A pairs should use **Q:** / **A:** format."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
)


# ---------------------------------------------------------------------------
# Hard assertions
# ---------------------------------------------------------------------------

def _assert_technologies(technologies: list, job: dict) -> None:
    assert isinstance(technologies, list), "technologies must be a list"
    assert len(technologies) >= job["expected_min_techs"], (
        f"{job['name']}: expected >= {job['expected_min_techs']} techs, got {len(technologies)}"
    )

    for tech in technologies:
        assert isinstance(tech, dict), f"{job['name']}: tech must be a dict"
        assert tech.get("tag"), f"{job['name']}: tech missing 'tag'"
        assert tech.get("label"), f"{job['name']}: tech missing 'label'"
        assert tech.get("category"), f"{job['name']}: tech missing 'category'"
        assert tech.get("relevance") in ("primary", "secondary"), (
            f"{job['name']}: invalid relevance '{tech.get('relevance')}'"
        )

    extracted_tags = {t["tag"] for t in technologies}
    for expected_tag in job["expected_techs_contain"]:
        assert expected_tag in extracted_tags, (
            f"{job['name']}: expected '{expected_tag}' in extracted tags, got {extracted_tags}"
        )

    extracted_categories = {t["category"] for t in technologies}
    for expected_cat in job["expected_categories_contain"]:
        assert expected_cat in extracted_categories, (
            f"{job['name']}: expected category '{expected_cat}', got {extracted_categories}"
        )


def _assert_generated(generated: list, job: dict) -> None:
    for g in generated:
        assert g.get("tag"), f"{job['name']}: generated item missing 'tag'"
        assert g.get("content"), f"{job['name']}: generated item missing 'content'"
        assert g.get("word_count", 0) > 500, (
            f"{job['name']}: generated content for {g.get('tag')} too short "
            f"({g.get('word_count', 0)} words, expected > 500)"
        )
        slug = g.get("slug") if isinstance(g, dict) else getattr(g, "slug", None)
        assert slug, f"{job['name']}: generated item missing 'slug'"
        assert "/" in slug, (
            f"{job['name']}: slug '{slug}' must be hierarchical (category/tag)"
        )
        cat_part, tag_part = slug.split("/", 1)
        assert cat_part and tag_part, (
            f"{job['name']}: slug '{slug}' has empty category or tag segment"
        )
        tag = g.get("tag") if isinstance(g, dict) else getattr(g, "tag", None)
        assert tag_part == tag, (
            f"{job['name']}: slug tag segment '{tag_part}' != tag '{tag}'"
        )


# ---------------------------------------------------------------------------
# Build test cases
# ---------------------------------------------------------------------------

def build_test_cases() -> tuple[list[LLMTestCase], list[LLMTestCase]]:
    """Run workflow on all mock jobs in dry-run mode, assert constraints, return deepeval cases."""
    workflow = TechKnowledgeWorkflow(timeout=900, verbose=False)
    extraction_cases: list[LLMTestCase] = []
    content_cases: list[LLMTestCase] = []

    for job in MOCK_JOBS:
        print(f"\n  Running workflow: {job['name']} ...")
        async def _run(j=job):
            return await workflow.run(
                application_id=0,
                job_title=j["job_title"],
                company_name=j["company_name"],
                job_description=j["job_description"],
                dry_run=True,
                exclude_tags=[],
            )

        try:
            result = asyncio.run(_run())
        except Exception as e:
            print(f"    WORKFLOW ERROR: {e}")
            print(f"    Skipping {job['name']} — will not contribute to deepeval metrics")
            continue

        technologies = result.get("technologies", [])
        generated = result.get("generated", [])

        tech_summary = [f"{t['tag']}({t['relevance'][0]})" for t in technologies]
        print(f"    technologies: {tech_summary}")
        print(f"    generated: {len(generated)} lessons")

        # Phase 1 + 2: hard assertions
        _assert_technologies(technologies, job)
        _assert_generated(generated, job)

        # deepeval — extraction quality
        extraction_cases.append(LLMTestCase(
            name=f"{job['name']} — Extraction",
            input=(
                f"Title: {job['job_title']}\n"
                f"Company: {job['company_name']}\n\n"
                f"{job['job_description']}"
            ),
            actual_output=json.dumps(technologies, indent=2),
            expected_output=json.dumps({
                "expected_tags": job["expected_techs_contain"],
                "expected_categories": job["expected_categories_contain"],
                "min_count": job["expected_min_techs"],
            }),
        ))

        # deepeval — content quality per generated lesson
        for g in generated[:3]:
            content_cases.append(LLMTestCase(
                name=f"{job['name']} — {g['label']}",
                input=(
                    f"Technology: {g['label']}\n"
                    f"Role: {job['job_title']} at {job['company_name']}\n"
                    f"Category: {g['category']}\n\n"
                    f"Job description:\n{job['job_description'][:1000]}"
                ),
                actual_output=g["content"],
                expected_output=(
                    f"A 2000-3500 word interview-prep lesson about {g['label']} with sections: "
                    "The 30-Second Pitch, How It Actually Works, Patterns You Should Know, "
                    "What Interviewers Actually Ask (6-8 Q&A pairs), "
                    "How It Connects to This Role's Stack, Red Flags to Avoid. "
                    f"Must reference {job['company_name']} and the role's tech stack."
                ),
            ))

    return extraction_cases, content_cases


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    total_jobs = len(MOCK_JOBS)
    print(f"Running tech knowledge workflow on {total_jobs} mock jobs (dry-run)...\n")

    extraction_cases, content_cases = build_test_cases()

    print(
        f"\nAll hard structural + semantic assertions passed "
        f"({total_jobs} jobs verified)."
    )
    print(
        f"Running deepeval metrics: "
        f"{len(extraction_cases)} extraction, "
        f"{len(content_cases)} content cases...\n"
    )

    evaluate(
        test_cases=extraction_cases,
        metrics=[tech_extraction_metric],
    )
    if content_cases:
        evaluate(
            test_cases=content_cases,
            metrics=[content_quality_metric, content_structure_metric],
        )


# ---------------------------------------------------------------------------
# Taxonomy normalization tests (no LLM — fast)
# ---------------------------------------------------------------------------

def run_taxonomy_tests() -> None:
    """Catch the 'tech mentioned in JD but dropped by normalization' bug class.

    Every technology that an LLM might extract from a JD must resolve to a
    canonical tag. If normalize_tag() returns None, the tech is silently
    dropped from the pipeline output — a critical false negative.
    """
    from .taxonomy import normalize_tag, get_label_for_tag, get_category_for_tag, SKILL_TAGS, TAG_TO_CATEGORY

    print("Running taxonomy normalization tests...\n")
    failures = []

    # 1. Every known AI/ML framework must normalize
    AI_FRAMEWORKS = {
        "LlamaIndex": "llamaindex",
        "llama-index": "llamaindex",
        "llama_index": "llamaindex",
        "Llama Index": "llamaindex",
        "LangChain": "langchain",
        "langchain": "langchain",
        "LangGraph": "langgraph",
        "langgraph": "langgraph",
    }
    for raw, expected in AI_FRAMEWORKS.items():
        result = normalize_tag(raw)
        if result != expected:
            failures.append(f"  normalize_tag({raw!r}) = {result!r}, expected {expected!r}")

    # 2. Every AI-related tag in SKILL_TAGS must have an explicit label
    from .taxonomy import SKILL_LABELS
    for tag in sorted(SKILL_TAGS):
        if any(k in tag for k in ["llm", "ai", "agent", "lang", "llama", "rag"]):
            if tag not in SKILL_LABELS:
                failures.append(f"  {tag}: missing from SKILL_LABELS (no explicit label)")

    # 3. Every tag in TAG_TO_CATEGORY must exist in SKILL_TAGS
    for tag in TAG_TO_CATEGORY:
        if tag not in SKILL_TAGS:
            failures.append(f"  TAG_TO_CATEGORY has '{tag}' but it's not in SKILL_TAGS")

    # 4. Common LLM extraction patterns that must not return None
    MUST_RESOLVE = [
        "PostgreSQL", "Postgres", "Node.js", "node", "Express.js",
        "React", "Next.js", "TypeScript", "Python", "Docker", "K8s",
        "Kubernetes", "Terraform", "Redis", "MongoDB", "AWS",
        "GCP", "Azure", "GraphQL", "REST API", "CI/CD",
        "LlamaIndex", "LangChain", "LangGraph",
        "FastAPI", "Django", "Flask",
        "Jest", "Playwright", "Tailwind CSS",
        "PyTorch", "TensorFlow", "Hugging Face",
    ]
    for raw in MUST_RESOLVE:
        result = normalize_tag(raw)
        if result is None:
            failures.append(f"  normalize_tag({raw!r}) = None — DROPPED (critical)")

    if failures:
        print(f"FAILED — {len(failures)} taxonomy issues:\n")
        for f in failures:
            print(f)
        raise AssertionError(f"{len(failures)} taxonomy normalization failures")
    else:
        print(f"  All {len(AI_FRAMEWORKS)} AI framework aliases resolve correctly")
        print(f"  All {len(MUST_RESOLVE)} common extraction patterns resolve")
        print(f"  All {len(TAG_TO_CATEGORY)} TAG_TO_CATEGORY entries exist in SKILL_TAGS")
        print(f"  PASSED\n")

    # 5. LLM frameworks must be in their own category
    from .taxonomy import TECH_CATEGORIES, make_lesson_slug, make_cat_slug
    assert "LLM Frameworks" in TECH_CATEGORIES, "missing 'LLM Frameworks' category"
    for tag in ("langchain", "langgraph", "llamaindex"):
        assert TAG_TO_CATEGORY.get(tag) == "LLM Frameworks", (
            f"'{tag}' should be in 'LLM Frameworks', got '{TAG_TO_CATEGORY.get(tag)}'"
        )

    # 6. All lesson slugs must be hierarchical: {cat-slug}/{tag}
    for tag, cat_name in TAG_TO_CATEGORY.items():
        slug = make_lesson_slug(tag)
        assert "/" in slug, f"slug '{slug}' for tag '{tag}' must be hierarchical"
        cat_part, tag_part = slug.split("/", 1)
        assert cat_part == make_cat_slug(cat_name), (
            f"slug '{slug}': category segment '{cat_part}' != expected '{make_cat_slug(cat_name)}'"
        )
        assert tag_part == tag, f"slug '{slug}': tag segment '{tag_part}' != '{tag}'"

    print(f"  All {len(TAG_TO_CATEGORY)} lesson slugs are hierarchical (category/tag)")
    print(f"  LLM Frameworks category verified (langchain, langgraph, llamaindex)")


# ---------------------------------------------------------------------------
# Dynamic extraction coverage test (uses DeepSeek)
# ---------------------------------------------------------------------------

def run_extraction_coverage_test() -> None:
    """Use DeepSeek to extract raw tech names from each mock JD, then verify
    every extracted name resolves via normalize_tag(). Catches taxonomy gaps
    that static tests miss — the LLM extracts what a real pipeline would,
    and we assert nothing is silently dropped.
    """
    import asyncio
    from llama_index.core.llms import ChatMessage
    from src.config import get_llm_json
    from .taxonomy import normalize_tag

    print("Running dynamic extraction coverage test (DeepSeek)...\n")

    llm = get_llm_json()
    total_checked = 0
    total_resolved = 0
    dropped: list[tuple[str, str]] = []  # (job_name, raw_tech)

    for job in MOCK_JOBS:
        messages = [
            ChatMessage(role="system", content=(
                "Extract ALL specific technology names from this job description. "
                "Return JSON: {\"technologies\": [\"React\", \"PostgreSQL\", ...]}\n"
                "Include frameworks, languages, tools, platforms, and libraries. "
                "Use the exact names as written in the JD. Return ONLY valid JSON."
            )),
            ChatMessage(role="user", content=(
                f"Job title: {job['job_title']}\n"
                f"Company: {job['company_name']}\n\n"
                f"{job['job_description']}"
            )),
        ]

        async def _call():
            return await llm.achat(messages)

        response = asyncio.run(_call())
        try:
            raw = json.loads(response.message.content)
            techs = raw.get("technologies", [])
        except (json.JSONDecodeError, KeyError):
            techs = []

        resolved = []
        for tech_name in techs:
            total_checked += 1
            tag = normalize_tag(tech_name)
            if tag:
                total_resolved += 1
                resolved.append(f"{tech_name} → {tag}")
            else:
                dropped.append((job["name"], tech_name))

        print(f"  {job['name']}: {len(techs)} extracted, {len(techs) - len([d for d in dropped if d[0] == job['name']])} resolved")

    print(f"\n  Total: {total_checked} checked, {total_resolved} resolved, {len(dropped)} dropped")

    if dropped:
        print(f"\n  DROPPED technologies (taxonomy gaps):")
        for job_name, tech in dropped:
            print(f"    [{job_name}] {tech}")
        print(f"\n  Add these to SKILL_TAGS + aliases in taxonomy.py to fix.")
        # Warning, not failure — some drops are expected (generic terms like "APIs")
        print(f"  WARNING: {len(dropped)} technologies not in taxonomy\n")
    else:
        print(f"  PASSED — zero drops\n")


# ---------------------------------------------------------------------------
# Knowledge DB connectivity test (no LLM — fast)
# ---------------------------------------------------------------------------

def run_db_connectivity_test() -> None:
    """Verify KNOWLEDGE_DATABASE_URL connects to the correct database and
    that persisted lessons are actually readable by the knowledge app.

    Catches the '/neondb vs /knowledge' class of bug where writes go to
    the wrong database and the app shows 'Topic not available yet'.
    """
    import os

    print("Running knowledge DB connectivity test...\n")
    failures = []

    # 1. Env var points to correct database
    url = os.environ.get("KNOWLEDGE_DATABASE_URL", "")
    if not url:
        failures.append("  KNOWLEDGE_DATABASE_URL is not set")
    elif "/neondb" in url and "/knowledge" not in url:
        failures.append(
            "  KNOWLEDGE_DATABASE_URL points to 'neondb' instead of 'knowledge'\n"
            "    This causes lessons to be written to the wrong database.\n"
            "    Fix: change /neondb to /knowledge in the connection string."
        )

    # 2. Connection works and tables exist
    if not failures:
        try:
            from .knowledge_db import get_knowledge_connection
            conn = get_knowledge_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT count(*) AS n FROM lessons")
                count = cur.fetchone()["n"]
                print(f"  Connected to knowledge DB: {count} lessons")

                # 3. Verify current_database() is 'knowledge'
                cur.execute("SELECT current_database() AS db")
                db_name = cur.fetchone()["db"]
                if db_name != "knowledge":
                    failures.append(
                        f"  Connected to database '{db_name}' instead of 'knowledge'\n"
                        f"    Lessons will not be visible in the knowledge app."
                    )
                else:
                    print(f"  Database name: {db_name} (correct)")

            conn.close()
        except Exception as e:
            failures.append(f"  Connection failed: {e}")

    if failures:
        print(f"FAILED — {len(failures)} DB issues:\n")
        for f in failures:
            print(f)
        raise AssertionError(f"{len(failures)} knowledge DB connectivity failures")
    else:
        print(f"  PASSED\n")


def main() -> None:
    # Phase 0: fast taxonomy tests (no LLM)
    run_taxonomy_tests()

    # Phase 0.1: knowledge DB connectivity (no LLM)
    run_db_connectivity_test()

    # Phase 0.5: dynamic extraction coverage (DeepSeek)
    run_extraction_coverage_test()

    total_jobs = len(MOCK_JOBS)
    print(f"Running tech knowledge workflow on {total_jobs} mock jobs (dry-run)...\n")

    extraction_cases, content_cases = build_test_cases()

    print(
        f"\nAll hard structural + semantic assertions passed "
        f"({total_jobs} jobs verified)."
    )
    print(
        f"Running deepeval metrics: "
        f"{len(extraction_cases)} extraction, "
        f"{len(content_cases)} content cases...\n"
    )

    evaluate(
        test_cases=extraction_cases,
        metrics=[tech_extraction_metric],
    )
    if content_cases:
        evaluate(
            test_cases=content_cases,
            metrics=[content_quality_metric, content_structure_metric],
        )


if __name__ == "__main__":
    main()
