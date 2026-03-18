"""
Evals for the organize_hierarchy node in the application prep pipeline.

Run:
    python -m cli eval-hierarchy

Three phases:
1. Unit tests — deterministic assertions on organize_hierarchy_node with mocked DB
2. Integration tests — full pipeline (dry-run) with hierarchy assertions
3. deepeval GEval — LLM-judged quality of hierarchy organization
"""

from dotenv import load_dotenv

load_dotenv()

import json
import os
from unittest.mock import MagicMock, patch

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from langchain_openai import ChatOpenAI

from .graph import build_application_prep_graph
from .nodes import organize_hierarchy_node
from .state import ApplicationPrepState, ExtractedTech

# ---------------------------------------------------------------------------
# DeepSeek judge model
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
        return self._model.invoke(prompt).content

    async def a_generate(self, prompt: str, **kwargs) -> str:
        return (await self._model.ainvoke(prompt)).content

    def get_model_name(self) -> str:
        return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


_judge = DeepSeekJudge()

# ---------------------------------------------------------------------------
# Test fixtures — reusable technology lists
# ---------------------------------------------------------------------------

TECHS_BACKEND: list[ExtractedTech] = [
    {"tag": "typescript", "label": "TypeScript", "category": "Languages", "relevance": "primary"},
    {"tag": "postgresql", "label": "PostgreSQL", "category": "Databases & Storage", "relevance": "primary"},
    {"tag": "redis", "label": "Redis", "category": "Databases & Storage", "relevance": "primary"},
    {"tag": "nodejs", "label": "Node.js", "category": "Backend Frameworks", "relevance": "primary"},
    {"tag": "kubernetes", "label": "Kubernetes", "category": "Cloud & DevOps", "relevance": "secondary"},
    {"tag": "terraform", "label": "Terraform", "category": "Cloud & DevOps", "relevance": "secondary"},
    {"tag": "docker", "label": "Docker", "category": "Cloud & DevOps", "relevance": "secondary"},
    {"tag": "websocket", "label": "WebSocket", "category": "API & Communication", "relevance": "secondary"},
]

TECHS_FRONTEND: list[ExtractedTech] = [
    {"tag": "react", "label": "React", "category": "Frontend Frameworks", "relevance": "primary"},
    {"tag": "typescript", "label": "TypeScript", "category": "Languages", "relevance": "primary"},
    {"tag": "nextjs", "label": "Next.js", "category": "Frontend Frameworks", "relevance": "primary"},
    {"tag": "tailwind", "label": "Tailwind CSS", "category": "Frontend Frameworks", "relevance": "primary"},
    {"tag": "jest", "label": "Jest", "category": "Testing & Quality", "relevance": "secondary"},
    {"tag": "playwright", "label": "Playwright", "category": "Testing & Quality", "relevance": "secondary"},
    {"tag": "graphql", "label": "GraphQL", "category": "API & Communication", "relevance": "secondary"},
]

TECHS_ML: list[ExtractedTech] = [
    {"tag": "python", "label": "Python", "category": "Languages", "relevance": "primary"},
    {"tag": "pytorch", "label": "PyTorch", "category": "Backend Frameworks", "relevance": "primary"},
    {"tag": "docker", "label": "Docker", "category": "Cloud & DevOps", "relevance": "secondary"},
    {"tag": "kubernetes", "label": "Kubernetes", "category": "Cloud & DevOps", "relevance": "secondary"},
    {"tag": "postgresql", "label": "PostgreSQL", "category": "Databases & Storage", "relevance": "secondary"},
]


def _make_state(
    technologies: list[ExtractedTech],
    exclude_tags: list[str] | None = None,
) -> ApplicationPrepState:
    """Build a minimal state for unit-testing organize_hierarchy_node."""
    return {
        "application_id": 0,
        "job_title": "Test",
        "company_name": "Test Co",
        "company_key": "",
        "job_description": "",
        "parsed": None,
        "company_context": "",
        "technologies": technologies,
        "organized": [],
        "existing_slugs": [],
        "question_sets": [],
        "generated": [],
        "report": "",
        "dry_run": True,
        "exclude_tags": exclude_tags or [],
        "stats": {},
    }


# ---------------------------------------------------------------------------
# Phase 1: Unit tests — deterministic, mocked DB
# ---------------------------------------------------------------------------

def _mock_knowledge_db(existing_slugs: set[str] | None = None):
    """Return patches that make knowledge DB return the given slugs."""
    existing = existing_slugs or set()
    mock_conn = MagicMock()
    return patch(
        "src.graphs.application_prep.nodes.get_knowledge_connection",
        return_value=mock_conn,
    ), patch(
        "src.graphs.application_prep.nodes.get_existing_lesson_slugs",
        return_value=existing,
    )


def test_exclusion_filters_tags():
    """Tags in exclude_tags must be removed from organized output."""
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        state = _make_state(TECHS_BACKEND, exclude_tags=["redis", "docker"])
        result = organize_hierarchy_node(state)

    organized_tags = {t["tag"] for t in result["organized"]}
    assert "redis" not in organized_tags, "excluded tag 'redis' still in organized"
    assert "docker" not in organized_tags, "excluded tag 'docker' still in organized"
    assert "typescript" in organized_tags, "non-excluded tag 'typescript' missing"
    assert "postgresql" in organized_tags, "non-excluded tag 'postgresql' missing"
    assert len(result["organized"]) == len(TECHS_BACKEND) - 2


def test_existing_slugs_filtered():
    """Technologies already in knowledge DB must be filtered out and reported."""
    p1, p2 = _mock_knowledge_db(existing_slugs={"typescript", "postgresql"})
    with p1, p2:
        state = _make_state(TECHS_BACKEND)
        result = organize_hierarchy_node(state)

    organized_tags = {t["tag"] for t in result["organized"]}
    assert "typescript" not in organized_tags, "existing 'typescript' still in organized"
    assert "postgresql" not in organized_tags, "existing 'postgresql' still in organized"
    assert "redis" in organized_tags, "'redis' should remain"
    assert set(result["existing_slugs"]) == {"typescript", "postgresql"}


def test_sort_order_primary_first():
    """Primary techs must sort before secondary within each category."""
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        state = _make_state(TECHS_BACKEND)
        result = organize_hierarchy_node(state)

    organized = result["organized"]
    first_secondary_idx = None
    for i, t in enumerate(organized):
        if t["relevance"] == "secondary":
            first_secondary_idx = i
            break

    if first_secondary_idx is not None:
        for t in organized[:first_secondary_idx]:
            assert t["relevance"] == "primary", (
                f"secondary tech '{t['tag']}' sorted before all primaries"
            )


def test_sort_order_by_category_then_tag():
    """Within same relevance, techs sort by category then tag alphabetically."""
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        state = _make_state(TECHS_BACKEND)
        result = organize_hierarchy_node(state)

    organized = result["organized"]
    # Check secondary techs are sorted by (category, tag)
    secondaries = [t for t in organized if t["relevance"] == "secondary"]
    for i in range(len(secondaries) - 1):
        a, b = secondaries[i], secondaries[i + 1]
        key_a = (a["category"], a["tag"])
        key_b = (b["category"], b["tag"])
        assert key_a <= key_b, (
            f"sort violated: {a['tag']}({a['category']}) > {b['tag']}({b['category']})"
        )


def test_combined_exclusion_and_existing():
    """Both exclusion and existing-slug filtering work together."""
    p1, p2 = _mock_knowledge_db(existing_slugs={"typescript"})
    with p1, p2:
        state = _make_state(TECHS_BACKEND, exclude_tags=["redis"])
        result = organize_hierarchy_node(state)

    organized_tags = {t["tag"] for t in result["organized"]}
    assert "redis" not in organized_tags, "excluded 'redis' present"
    assert "typescript" not in organized_tags, "existing 'typescript' present"
    assert len(result["organized"]) == len(TECHS_BACKEND) - 2
    assert result["existing_slugs"] == ["typescript"]


def test_empty_input():
    """Empty technologies list produces empty organized output."""
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        state = _make_state([])
        result = organize_hierarchy_node(state)

    assert result["organized"] == []
    assert result["existing_slugs"] == []


def test_all_excluded():
    """If all techs are excluded, organized is empty."""
    all_tags = [t["tag"] for t in TECHS_FRONTEND]
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        state = _make_state(TECHS_FRONTEND, exclude_tags=all_tags)
        result = organize_hierarchy_node(state)

    assert result["organized"] == []


def test_all_existing():
    """If all techs already exist in knowledge DB, organized is empty."""
    all_tags = {t["tag"] for t in TECHS_ML}
    p1, p2 = _mock_knowledge_db(existing_slugs=all_tags)
    with p1, p2:
        state = _make_state(TECHS_ML)
        result = organize_hierarchy_node(state)

    assert result["organized"] == []
    assert set(result["existing_slugs"]) == all_tags


def test_db_unavailable_graceful():
    """If knowledge DB is unreachable, all techs pass through (no filtering by existing)."""
    with patch(
        "src.graphs.application_prep.nodes.get_knowledge_connection",
        side_effect=Exception("connection refused"),
    ):
        state = _make_state(TECHS_ML)
        result = organize_hierarchy_node(state)

    assert len(result["organized"]) == len(TECHS_ML)
    assert result["existing_slugs"] == []


def test_categories_are_valid():
    """All categories in organized output must be from the known taxonomy."""
    from ..tech_knowledge.taxonomy import TECH_CATEGORIES

    valid = set(TECH_CATEGORIES.keys())
    p1, p2 = _mock_knowledge_db()
    for techs in [TECHS_BACKEND, TECHS_FRONTEND, TECHS_ML]:
        with p1, p2:
            state = _make_state(techs)
            result = organize_hierarchy_node(state)
        for t in result["organized"]:
            assert t["category"] in valid, (
                f"invalid category '{t['category']}' for {t['tag']}"
            )


# ---------------------------------------------------------------------------
# Phase 2: Integration — full pipeline (dry-run) with hierarchy assertions
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
            "- Experience with PostgreSQL at scale\n"
            "- Knowledge of Redis, event-driven systems, and WebSockets\n"
            "- AWS or GCP experience with Kubernetes\n\n"
            "Remote-first, EU timezone preferred."
        ),
        "expected_techs_contain": ["typescript", "postgresql", "redis", "nodejs"],
        "expected_categories_contain": ["Languages", "Databases & Storage"],
        "expected_min_organized": 3,
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
            "- Write comprehensive tests with Jest and Playwright\n\n"
            "Requirements:\n"
            "- 5+ years experience with React and TypeScript\n"
            "- Strong understanding of state management patterns\n"
            "- Experience with modern CSS (Tailwind, CSS-in-JS)\n"
            "- Familiarity with testing frameworks\n\n"
            "Fully remote, EU timezone."
        ),
        "expected_techs_contain": ["react", "typescript", "tailwind"],
        "expected_categories_contain": ["Frontend Frameworks", "Languages"],
        "expected_min_organized": 3,
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
            "- Deep understanding of networking, DNS, and load balancing\n\n"
            "Remote-first, global."
        ),
        "expected_techs_contain": ["kubernetes", "terraform", "go"],
        "expected_categories_contain": ["Cloud & DevOps", "Languages"],
        "expected_min_organized": 3,
    },
]


def _assert_hierarchy_integration(result: dict, job: dict) -> None:
    """Assert hierarchy properties on a full pipeline result."""
    technologies = result.get("technologies", [])
    organized = result.get("organized", [])
    existing_slugs = result.get("existing_slugs", [])

    # organized must be a subset of technologies (minus existing)
    tech_tags = {t["tag"] for t in technologies}
    organized_tags = {t["tag"] for t in organized}
    existing_set = set(existing_slugs)
    assert organized_tags <= (tech_tags - existing_set), (
        f"{job['name']}: organized has tags not in (technologies - existing): "
        f"{organized_tags - (tech_tags - existing_set)}"
    )

    # Must produce enough organized techs (unless existing filtered them)
    min_expected = max(0, job["expected_min_organized"] - len(existing_slugs))
    assert len(organized) >= min_expected, (
        f"{job['name']}: expected >= {min_expected} organized techs, got {len(organized)}"
    )

    # Sort invariant: primary before secondary
    seen_secondary = False
    for t in organized:
        if t["relevance"] == "secondary":
            seen_secondary = True
        elif seen_secondary:
            assert False, (
                f"{job['name']}: primary tech '{t['tag']}' after secondary — sort broken"
            )

    # Within same relevance, sorted by (category, tag)
    for relevance in ("primary", "secondary"):
        group = [t for t in organized if t["relevance"] == relevance]
        keys = [(t["category"], t["tag"]) for t in group]
        assert keys == sorted(keys), (
            f"{job['name']}: {relevance} group not sorted by (category, tag): {keys}"
        )

    # Expected categories present (unless all their techs were existing)
    organized_categories = {t["category"] for t in organized}
    for cat in job["expected_categories_contain"]:
        cat_techs_all = [t for t in technologies if t["category"] == cat]
        cat_techs_existing = [t for t in cat_techs_all if t["tag"] in existing_set]
        if len(cat_techs_all) > len(cat_techs_existing):
            assert cat in organized_categories, (
                f"{job['name']}: expected category '{cat}' in organized, "
                f"got {organized_categories}"
            )


# ---------------------------------------------------------------------------
# deepeval metric — hierarchy organization quality
# ---------------------------------------------------------------------------

hierarchy_quality_metric = GEval(
    model=_judge,
    name="Hierarchy Organization Quality",
    criteria=(
        "The organized technology list must be well-structured for interview preparation. "
        "Primary technologies (explicitly in JD) must appear before secondary (inferred). "
        "Categories must be appropriate (e.g. PostgreSQL in 'Databases & Storage', "
        "React in 'Frontend Frameworks'). "
        "No duplicate tags. No technologies fabricated from thin air — each must be "
        "traceable to the job description text or reasonably inferred from it. "
        "The organization should cover the key technology areas of the role without noise."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
)


# ---------------------------------------------------------------------------
# Build test cases
# ---------------------------------------------------------------------------

def run_unit_tests() -> None:
    """Run all deterministic unit tests for organize_hierarchy_node."""
    tests = [
        ("exclusion_filters_tags", test_exclusion_filters_tags),
        ("existing_slugs_filtered", test_existing_slugs_filtered),
        ("sort_order_primary_first", test_sort_order_primary_first),
        ("sort_order_by_category_then_tag", test_sort_order_by_category_then_tag),
        ("combined_exclusion_and_existing", test_combined_exclusion_and_existing),
        ("empty_input", test_empty_input),
        ("all_excluded", test_all_excluded),
        ("all_existing", test_all_existing),
        ("db_unavailable_graceful", test_db_unavailable_graceful),
        ("categories_are_valid", test_categories_are_valid),
    ]

    passed = 0
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  PASS  {name}")
            passed += 1
        except AssertionError as e:
            print(f"  FAIL  {name}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ERROR {name}: {e}")
            failed += 1

    print(f"\n  Unit tests: {passed} passed, {failed} failed out of {len(tests)}")
    if failed > 0:
        raise AssertionError(f"{failed} unit test(s) failed")


def build_integration_cases() -> list[LLMTestCase]:
    """Run full pipeline (dry-run) on mock jobs, assert hierarchy, return deepeval cases."""
    graph = build_application_prep_graph()
    cases: list[LLMTestCase] = []

    for job in MOCK_JOBS:
        print(f"\n  Running pipeline: {job['name']} ...")
        init_state: ApplicationPrepState = {
            "application_id": 0,
            "job_title": job["job_title"],
            "company_name": job["company_name"],
            "company_key": "",
            "job_description": job["job_description"],
            "parsed": None,
            "company_context": "",
            "technologies": [],
            "organized": [],
            "existing_slugs": [],
            "question_sets": [],
            "generated": [],
            "report": "",
            "dry_run": True,
            "exclude_tags": [],
            "stats": {},
        }
        result = graph.invoke(init_state)

        technologies = result.get("technologies", [])
        organized = result.get("organized", [])
        existing = result.get("existing_slugs", [])

        tech_summary = [f"{t['tag']}({t['relevance'][0]})" for t in technologies]
        org_summary = [f"{t['tag']}({t['relevance'][0]})" for t in organized]
        print(f"    extracted: {tech_summary}")
        print(f"    organized: {org_summary}")
        print(f"    existing:  {existing}")

        # Hard assertions
        _assert_hierarchy_integration(result, job)

        # deepeval case
        cases.append(LLMTestCase(
            name=f"{job['name']} — Hierarchy",
            input=(
                f"Title: {job['job_title']}\n"
                f"Company: {job['company_name']}\n\n"
                f"{job['job_description']}"
            ),
            actual_output=json.dumps(organized, indent=2),
            expected_output=json.dumps({
                "expected_tags": job["expected_techs_contain"],
                "expected_categories": job["expected_categories_contain"],
                "sort_order": "primary first, then secondary, sorted by (category, tag)",
                "min_count": job["expected_min_organized"],
            }),
        ))

    return cases


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("Phase 1: Unit tests (deterministic, mocked DB)")
    print("=" * 60)
    run_unit_tests()

    print(f"\n{'=' * 60}")
    print(f"Phase 2: Integration tests (full pipeline, dry-run)")
    print(f"{'=' * 60}")
    cases = build_integration_cases()

    print(f"\n  All hard assertions passed ({len(MOCK_JOBS)} jobs verified).")

    print(f"\n{'=' * 60}")
    print(f"Phase 3: deepeval — hierarchy quality ({len(cases)} cases)")
    print(f"{'=' * 60}\n")
    evaluate(test_cases=cases, metrics=[hierarchy_quality_metric])


if __name__ == "__main__":
    main()
