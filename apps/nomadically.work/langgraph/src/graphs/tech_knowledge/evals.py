"""
Evals for the tech knowledge extraction pipeline.

Run:
    python -m src.graphs.tech_knowledge.evals

Three phases per job:
1. Hard structural assertions — fail fast on counts, types, required fields
2. Semantic assertions — extracted techs match expected, categories valid
3. deepeval GEval metrics — LLM-judged quality for extraction, content, and hierarchy
"""

from dotenv import load_dotenv

load_dotenv()

import json
import os

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from langchain_openai import ChatOpenAI

from .graph import build_tech_knowledge_graph
from .state import TechKnowledgeState
from .taxonomy import TECH_CATEGORIES


# ---------------------------------------------------------------------------
# Use DeepSeek as the judge model (no OpenAI key needed)
# ---------------------------------------------------------------------------

class DeepSeekJudge(DeepEvalBaseLLM):
    def __init__(self):
        self._model = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.0,
        )

    def load_model(self):
        return self._model

    def generate(self, prompt: str, **kwargs) -> str:
        response = self._model.invoke(prompt)
        return response.content

    async def a_generate(self, prompt: str, **kwargs) -> str:
        response = await self._model.ainvoke(prompt)
        return response.content

    def get_model_name(self) -> str:
        return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


_judge = DeepSeekJudge()

# ---------------------------------------------------------------------------
# Mock JDs — 3 realistic roles covering different tech stacks
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
        "expected_techs_contain": ["kubernetes", "terraform", "go", "docker"],
        "expected_min_techs": 5,
        "expected_categories_contain": ["Cloud & DevOps", "Languages"],
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
# Hard assertions (phase 1 + 2)
# ---------------------------------------------------------------------------

def _assert_technologies(technologies: list, job: dict) -> None:
    """Structural and semantic assertions on extracted technologies."""
    assert isinstance(technologies, list), "technologies must be a list"
    assert len(technologies) >= job["expected_min_techs"], (
        f"{job['name']}: expected >= {job['expected_min_techs']} techs, got {len(technologies)}"
    )

    for tech in technologies:
        assert isinstance(tech, dict), f"{job['name']}: tech must be a dict, got {type(tech)}"
        assert tech.get("tag"), f"{job['name']}: tech missing 'tag'"
        assert tech.get("label"), f"{job['name']}: tech missing 'label'"
        assert tech.get("category"), f"{job['name']}: tech missing 'category'"
        assert tech.get("relevance") in ("primary", "secondary"), (
            f"{job['name']}: invalid relevance '{tech.get('relevance')}'"
        )

    # Semantic: expected techs must be present
    extracted_tags = {t["tag"] for t in technologies}
    for expected_tag in job["expected_techs_contain"]:
        assert expected_tag in extracted_tags, (
            f"{job['name']}: expected '{expected_tag}' in extracted tags, got {extracted_tags}"
        )

    # Categories should be valid
    extracted_categories = {t["category"] for t in technologies}
    for expected_cat in job["expected_categories_contain"]:
        assert expected_cat in extracted_categories, (
            f"{job['name']}: expected category '{expected_cat}', got {extracted_categories}"
        )


def _assert_generated(generated: list, job: dict) -> None:
    """Structural assertions on generated content."""
    # In dry-run or when all techs exist, generated may be empty — that's OK
    # but for mock jobs we expect at least some content
    for g in generated:
        assert isinstance(g, dict), f"{job['name']}: generated item must be a dict"
        assert g.get("tag"), f"{job['name']}: generated item missing 'tag'"
        assert g.get("content"), f"{job['name']}: generated item missing 'content'"
        assert g.get("word_count", 0) > 500, (
            f"{job['name']}: generated content for {g.get('tag')} too short "
            f"({g.get('word_count', 0)} words, expected > 500)"
        )
        assert g.get("slug"), f"{job['name']}: generated item missing 'slug'"


# ---------------------------------------------------------------------------
# Build test cases
# ---------------------------------------------------------------------------

def build_test_cases() -> tuple[list[LLMTestCase], list[LLMTestCase]]:
    """Run graph on all mock jobs in dry-run mode, assert constraints, return deepeval cases."""
    graph = build_tech_knowledge_graph()
    extraction_cases: list[LLMTestCase] = []
    content_cases: list[LLMTestCase] = []

    for job in MOCK_JOBS:
        print(f"\n  Running graph: {job['name']} ...")
        init_state: TechKnowledgeState = {
            "application_id": 0,
            "job_title": job["job_title"],
            "company_name": job["company_name"],
            "job_description": job["job_description"],
            "source_text": "",
            "technologies": [],
            "organized": [],
            "existing_slugs": [],
            "generated": [],
            "dry_run": True,
            "exclude_tags": [],
            "stats": {},
        }
        result = graph.invoke(init_state)

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
        for g in generated[:3]:  # Limit to 3 to keep eval cost reasonable
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
    print(f"Running tech knowledge graph on {total_jobs} mock jobs (dry-run)...\n")

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
    evaluate(
        test_cases=content_cases,
        metrics=[content_quality_metric, content_structure_metric],
            )


if __name__ == "__main__":
    main()
