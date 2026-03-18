"""
Evals for the application_prep pipeline (merged interview prep + tech knowledge).

Run:
    python -m cli eval-hierarchy

Four phases:
1. Unit tests — deterministic assertions on organize_hierarchy_node with mocked DB
2. Integration tests — full pipeline (dry-run) with hard assertions on every node output
3. deepeval GEval — LLM-judged quality across hierarchy, extraction, questions, and report
4. Cross-system contract — pipeline output compatible with the knowledge app
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
from .state import CATEGORIES, ApplicationPrepState, ExtractedTech

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
# Test fixtures
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

VALID_ROLE_TYPES = {"frontend", "backend", "fullstack", "ml", "devops", "data", "other"}
VALID_SENIORITIES = {"junior", "mid", "senior", "lead", "staff"}
CATEGORY_COUNTS = {"technical": 6, "behavioral": 5, "system_design": 3, "company_culture": 4}

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
        "expected_role_type": "backend",
        "expected_seniority": "senior",
        "expected_tech_stack_contains": ["TypeScript", "PostgreSQL"],
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
        "expected_role_type": "frontend",
        "expected_seniority": "senior",
        "expected_tech_stack_contains": ["React", "TypeScript"],
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
        "expected_role_type": "devops",
        "expected_seniority": "senior",
        "expected_tech_stack_contains": ["Kubernetes", "Terraform"],
        "expected_techs_contain": ["kubernetes", "terraform", "go"],
        "expected_categories_contain": ["Cloud & DevOps", "Languages"],
        "expected_min_organized": 3,
    },
]


def _make_state(
    technologies: list[ExtractedTech],
    exclude_tags: list[str] | None = None,
) -> ApplicationPrepState:
    return {
        "application_id": 0, "job_title": "Test", "company_name": "Test Co",
        "company_key": "", "job_description": "", "parsed": None,
        "company_context": "", "technologies": technologies,
        "organized": [], "existing_slugs": [], "question_sets": [],
        "generated": [], "report": "", "knowledge_db_ok": False,
        "dry_run": True, "exclude_tags": exclude_tags or [], "stats": {},
    }


def _mock_knowledge_db(existing_slugs: set[str] | None = None):
    existing = existing_slugs or set()
    mock_conn = MagicMock()
    return patch(
        "src.graphs.application_prep.nodes.get_knowledge_connection",
        return_value=mock_conn,
    ), patch(
        "src.graphs.application_prep.nodes.get_existing_lesson_slugs",
        return_value=existing,
    )


# ===================================================================
# PHASE 1: Unit tests — deterministic, mocked DB (hierarchy node)
# ===================================================================

def test_exclusion_filters_tags():
    """Tags in exclude_tags must be removed from organized output."""
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        result = organize_hierarchy_node(_make_state(TECHS_BACKEND, exclude_tags=["redis", "docker"]))
    organized_tags = {t["tag"] for t in result["organized"]}
    assert "redis" not in organized_tags
    assert "docker" not in organized_tags
    assert "typescript" in organized_tags
    assert len(result["organized"]) == len(TECHS_BACKEND) - 2


def test_existing_slugs_filtered():
    """Technologies already in knowledge DB must be filtered out."""
    p1, p2 = _mock_knowledge_db(existing_slugs={"languages/typescript", "databases-storage/postgresql"})
    with p1, p2:
        result = organize_hierarchy_node(_make_state(TECHS_BACKEND))
    organized_tags = {t["tag"] for t in result["organized"]}
    assert "typescript" not in organized_tags
    assert "postgresql" not in organized_tags
    assert set(result["existing_slugs"]) == {"typescript", "postgresql"}


def test_sort_order_primary_first():
    """Primary techs must sort before secondary."""
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        result = organize_hierarchy_node(_make_state(TECHS_BACKEND))
    seen_secondary = False
    for t in result["organized"]:
        if t["relevance"] == "secondary":
            seen_secondary = True
        elif seen_secondary:
            assert False, f"primary '{t['tag']}' after secondary"


def test_sort_order_by_category_then_tag():
    """Within same relevance, sorted by (category, tag)."""
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        result = organize_hierarchy_node(_make_state(TECHS_BACKEND))
    secondaries = [t for t in result["organized"] if t["relevance"] == "secondary"]
    for i in range(len(secondaries) - 1):
        a, b = secondaries[i], secondaries[i + 1]
        assert (a["category"], a["tag"]) <= (b["category"], b["tag"])


def test_combined_exclusion_and_existing():
    p1, p2 = _mock_knowledge_db(existing_slugs={"languages/typescript"})
    with p1, p2:
        result = organize_hierarchy_node(_make_state(TECHS_BACKEND, exclude_tags=["redis"]))
    organized_tags = {t["tag"] for t in result["organized"]}
    assert "redis" not in organized_tags and "typescript" not in organized_tags
    assert len(result["organized"]) == len(TECHS_BACKEND) - 2


def test_empty_input():
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        result = organize_hierarchy_node(_make_state([]))
    assert result["organized"] == [] and result["existing_slugs"] == []


def test_all_excluded():
    all_tags = [t["tag"] for t in TECHS_FRONTEND]
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        result = organize_hierarchy_node(_make_state(TECHS_FRONTEND, exclude_tags=all_tags))
    assert result["organized"] == []


def test_all_existing():
    from ..tech_knowledge.taxonomy import make_lesson_slug
    all_tags = {t["tag"] for t in TECHS_ML}
    all_slugs = {make_lesson_slug(t["tag"]) for t in TECHS_ML}
    p1, p2 = _mock_knowledge_db(existing_slugs=all_slugs)
    with p1, p2:
        result = organize_hierarchy_node(_make_state(TECHS_ML))
    assert result["organized"] == [] and set(result["existing_slugs"]) == all_tags


def test_db_unavailable_graceful():
    with patch("src.graphs.application_prep.nodes.get_knowledge_connection", side_effect=Exception("refused")):
        result = organize_hierarchy_node(_make_state(TECHS_ML))
    assert len(result["organized"]) == len(TECHS_ML) and result["existing_slugs"] == []


def test_categories_are_valid():
    from ..tech_knowledge.taxonomy import TECH_CATEGORIES
    valid = set(TECH_CATEGORIES.keys())
    p1, p2 = _mock_knowledge_db()
    for techs in [TECHS_BACKEND, TECHS_FRONTEND, TECHS_ML]:
        with p1, p2:
            result = organize_hierarchy_node(_make_state(techs))
        for t in result["organized"]:
            assert t["category"] in valid, f"invalid category '{t['category']}'"


def test_category_has_required_metadata():
    from ..tech_knowledge.taxonomy import TECH_CATEGORIES
    for name, meta in TECH_CATEGORIES.items():
        for field in ("icon", "description", "gradient_from", "gradient_to"):
            assert meta.get(field), f"category '{name}' missing {field}"


def test_taxonomy_covers_all_fixture_tags():
    from ..tech_knowledge.taxonomy import normalize_tag
    for techs in [TECHS_BACKEND, TECHS_FRONTEND, TECHS_ML]:
        for t in techs:
            assert normalize_tag(t["tag"]) is not None, f"tag '{t['tag']}' not in taxonomy"


def test_no_duplicate_tags_after_organize():
    techs: list[ExtractedTech] = [
        {"tag": "react", "label": "React", "category": "Frontend Frameworks", "relevance": "primary"},
        {"tag": "react", "label": "React.js", "category": "Frontend Frameworks", "relevance": "secondary"},
        {"tag": "typescript", "label": "TypeScript", "category": "Languages", "relevance": "primary"},
    ]
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        result = organize_hierarchy_node(_make_state(techs))
    tags = [t["tag"] for t in result["organized"]]
    assert len(tags) == len(set(tags)), f"duplicates: {tags}"


def test_knowledge_app_category_contract():
    from ..tech_knowledge.taxonomy import TECH_CATEGORIES, make_cat_slug
    for cat_name, meta in TECH_CATEGORIES.items():
        slug = make_cat_slug(cat_name)
        assert slug.isascii() and " " not in slug and len(slug) > 0
        for field in ("gradient_from", "gradient_to"):
            color = meta[field]
            assert color.startswith("#") and len(color) in (4, 7)


def test_lesson_slugs_are_hierarchical():
    """Lesson slugs must follow the {category-slug}/{tag} format."""
    from ..tech_knowledge.taxonomy import TAG_TO_CATEGORY, make_lesson_slug, make_cat_slug
    for tag, cat_name in TAG_TO_CATEGORY.items():
        slug = make_lesson_slug(tag)
        assert "/" in slug, f"slug '{slug}' for tag '{tag}' must be hierarchical"
        cat_part, tag_part = slug.split("/", 1)
        assert cat_part == make_cat_slug(cat_name), (
            f"slug '{slug}': category segment '{cat_part}' != expected '{make_cat_slug(cat_name)}'"
        )
        assert tag_part == tag, f"slug '{slug}': tag segment '{tag_part}' != '{tag}'"


def test_llm_frameworks_category_exists():
    """LLM orchestration frameworks must be in their own category, not Backend Frameworks."""
    from ..tech_knowledge.taxonomy import TAG_TO_CATEGORY, TECH_CATEGORIES
    assert "LLM Frameworks" in TECH_CATEGORIES, "missing 'LLM Frameworks' category"
    for tag in ("langchain", "langgraph", "llamaindex"):
        assert TAG_TO_CATEGORY.get(tag) == "LLM Frameworks", (
            f"'{tag}' should be in 'LLM Frameworks', got '{TAG_TO_CATEGORY.get(tag)}'"
        )


def test_organized_preserves_all_fields():
    required_fields = {"tag", "label", "category", "relevance"}
    p1, p2 = _mock_knowledge_db()
    with p1, p2:
        result = organize_hierarchy_node(_make_state(TECHS_BACKEND))
    for t in result["organized"]:
        assert not (required_fields - set(t.keys())), f"missing fields on {t.get('tag')}"


def test_icons_are_unicode_not_html_entities():
    """Icons must be actual Unicode characters, not HTML entities like &#x2699;."""
    from ..tech_knowledge.taxonomy import TECH_CATEGORIES
    for name, meta in TECH_CATEGORIES.items():
        icon = meta["icon"]
        assert "&" not in icon and ";" not in icon, (
            f"category '{name}' icon is HTML entity: '{icon}'"
        )
        assert len(icon) <= 4, f"category '{name}' icon too long: '{icon}' ({len(icon)} chars)"
        assert icon.isprintable(), f"category '{name}' icon not printable: {repr(icon)}"


def test_ensure_unicode_decodes_html_entities():
    """_ensure_unicode must convert HTML entities to actual Unicode."""
    from .nodes import _ensure_unicode
    assert _ensure_unicode("&#x2699;&#xfe0f;") == "\u2699\ufe0f"
    assert _ensure_unicode("&#x1f4da;") == "\U0001f4da"
    assert _ensure_unicode("\u2699\ufe0f") == "\u2699\ufe0f"  # already Unicode — no-op
    assert _ensure_unicode("plain text") == "plain text"


def test_persist_fallback_icon_is_unicode():
    """The fallback icon in _persist_knowledge must not be an HTML entity."""
    import inspect
    from .nodes import _persist_knowledge
    source = inspect.getsource(_persist_knowledge)
    assert "&#x" not in source, "fallback icon in _persist_knowledge contains HTML entity"


def test_knowledge_db_url_validation():
    """get_knowledge_connection must reject URLs pointing to wrong database."""
    from ..tech_knowledge.knowledge_db import get_knowledge_connection
    with patch.dict("os.environ", {"KNOWLEDGE_DATABASE_URL": "postgresql://user:pass@host/neondb?sslmode=require"}):
        try:
            get_knowledge_connection()
            assert False, "should have raised ValueError for wrong database name"
        except ValueError as e:
            assert "neondb" in str(e) and "knowledge" in str(e)

    with patch.dict("os.environ", {"KNOWLEDGE_DATABASE_URL": "postgresql://user:pass@host/knowledge?sslmode=require"}):
        # Should not raise ValueError (will fail on actual connect, but validation passes)
        try:
            get_knowledge_connection()
        except ValueError:
            assert False, "should not reject URL with correct database name"
        except Exception:
            pass  # Connection error expected — validation passed


def test_graph_has_parallel_entry():
    """All expected nodes must be present in the graph."""
    from .graph import build_application_prep_graph
    g = build_application_prep_graph()
    nodes = set(g.nodes.keys()) - {"__start__"}
    for expected in ("validate_urls", "parse_jd", "extract_technologies",
                     "organize_hierarchy", "generate_questions", "generate_content",
                     "compile_report", "persist_knowledge", "sync_hierarchy"):
        assert expected in nodes, f"missing node: {expected}"
    assert "finalize" not in nodes, "finalize should be split"


def test_validate_urls_rejects_wrong_db():
    """validate_urls_node must set knowledge_db_ok=False for wrong database name."""
    from .nodes import validate_urls_node
    with patch.dict("os.environ", {"KNOWLEDGE_DATABASE_URL": "postgresql://u:p@host/neondb?sslmode=require"}):
        result = validate_urls_node(_make_state([]))
    assert result["knowledge_db_ok"] is False


def test_validate_urls_missing_env():
    """validate_urls_node must set knowledge_db_ok=False when env var is missing."""
    from .nodes import validate_urls_node
    with patch.dict("os.environ", {}, clear=True):
        result = validate_urls_node(_make_state([]))
    assert result["knowledge_db_ok"] is False


def test_persist_skips_when_db_not_ok():
    """persist_knowledge_node must skip writing when knowledge_db_ok is False."""
    from .nodes import persist_knowledge_node
    state = _make_state([])
    state["knowledge_db_ok"] = False
    state["dry_run"] = False
    state["generated"] = [
        {"tag": "test", "label": "Test", "category": "Languages", "slug": "languages/test",
         "title": "Test", "content": "content", "word_count": 100, "subtopics": []},
    ]
    result = persist_knowledge_node(state)
    assert result["stats"]["lessons_persisted"] == 0


def test_compile_report_node_isolation():
    """compile_report_node produces valid markdown from question_sets alone."""
    from .nodes import compile_report_node
    state = _make_state([])
    state["job_title"] = "Test Engineer"
    state["company_name"] = "Acme"
    state["parsed"] = {"tech_stack": ["Python"], "requirements": [], "role_type": "backend", "seniority": "senior"}
    state["question_sets"] = [
        {"category": "technical", "qa_pairs": [{"question": "What is Python?", "answer": "A programming language used for many purposes."}]},
        {"category": "behavioral", "qa_pairs": []},
        {"category": "system_design", "qa_pairs": []},
        {"category": "company_culture", "qa_pairs": []},
    ]
    result = compile_report_node(state)
    report = result["report"]
    assert "# Interview Prep" in report
    assert "Test Engineer" in report
    assert "Acme" in report
    assert "## Technical Questions" in report
    assert "What is Python?" in report


def test_persist_knowledge_node_dry_run():
    """persist_knowledge_node with dry_run=True should not write and return zero stats."""
    from .nodes import persist_knowledge_node
    state = _make_state([])
    state["dry_run"] = True
    state["generated"] = [
        {"tag": "test", "label": "Test", "category": "Languages", "slug": "languages/test",
         "title": "Test", "content": "content", "word_count": 100, "subtopics": []},
    ]
    result = persist_knowledge_node(state)
    assert result["stats"]["lessons_persisted"] == 0


# ===================================================================
# PHASE 2: Integration — full pipeline (dry-run) assertions
# ===================================================================

def _assert_parsed(parsed: dict, job: dict) -> None:
    """Structural + semantic assertions on parse_jd output."""
    assert isinstance(parsed.get("tech_stack"), list) and len(parsed["tech_stack"]) > 0, (
        f"{job['name']}: tech_stack empty"
    )
    assert all(isinstance(t, str) and t for t in parsed["tech_stack"])
    assert isinstance(parsed.get("requirements"), list) and len(parsed["requirements"]) > 0
    assert parsed.get("role_type") in VALID_ROLE_TYPES, (
        f"{job['name']}: invalid role_type '{parsed.get('role_type')}'"
    )
    assert parsed.get("seniority") in VALID_SENIORITIES, (
        f"{job['name']}: invalid seniority '{parsed.get('seniority')}'"
    )
    # Semantic: role_type should match expected
    assert parsed["role_type"] == job["expected_role_type"], (
        f"{job['name']}: expected role_type={job['expected_role_type']}, got {parsed['role_type']}"
    )
    # Key techs must be captured
    captured_lower = {t.lower() for t in parsed["tech_stack"]}
    for tech in job["expected_tech_stack_contains"]:
        assert any(tech.lower() in t for t in captured_lower), (
            f"{job['name']}: expected '{tech}' in tech_stack, got {parsed['tech_stack']}"
        )


def _assert_technologies(technologies: list, job: dict) -> None:
    """Assertions on extract_technologies output."""
    assert len(technologies) >= 3, f"{job['name']}: too few techs ({len(technologies)})"
    for tech in technologies:
        assert tech.get("tag") and tech.get("label") and tech.get("category")
        assert tech.get("relevance") in ("primary", "secondary")
    extracted_tags = {t["tag"] for t in technologies}
    for expected_tag in job["expected_techs_contain"]:
        assert expected_tag in extracted_tags, (
            f"{job['name']}: expected '{expected_tag}', got {extracted_tags}"
        )


def _assert_hierarchy(result: dict, job: dict) -> None:
    """Assertions on organize_hierarchy output."""
    technologies = result.get("technologies", [])
    organized = result.get("organized", [])
    existing_set = set(result.get("existing_slugs", []))

    # Subset check
    tech_tags = {t["tag"] for t in technologies}
    organized_tags = {t["tag"] for t in organized}
    assert organized_tags <= (tech_tags - existing_set)

    # No duplicates
    assert len(organized_tags) == len(organized), "duplicate tags in organized"

    # Sort invariant
    seen_secondary = False
    for t in organized:
        if t["relevance"] == "secondary":
            seen_secondary = True
        elif seen_secondary:
            assert False, f"primary '{t['tag']}' after secondary"

    for rel in ("primary", "secondary"):
        keys = [(t["category"], t["tag"]) for t in organized if t["relevance"] == rel]
        assert keys == sorted(keys), f"{rel} not sorted"


def _assert_questions(question_sets: list, job: dict) -> None:
    """Assertions on generate_questions output."""
    by_cat = {qs["category"]: qs for qs in question_sets}
    for cat in CATEGORIES:
        assert cat in by_cat, f"{job['name']}: missing category '{cat}'"
        pairs = by_cat[cat]["qa_pairs"]
        expected = CATEGORY_COUNTS[cat]
        assert len(pairs) == expected, (
            f"{job['name']} [{cat}]: expected {expected} Q&A, got {len(pairs)}"
        )
        for i, pair in enumerate(pairs):
            assert pair.get("question") and len(pair["question"]) > 20, (
                f"{job['name']} [{cat}] q{i}: question too short"
            )
            assert pair.get("answer") and len(pair["answer"]) > 50, (
                f"{job['name']} [{cat}] q{i}: answer too short ({len(pair.get('answer', ''))} chars)"
            )


def _assert_report(report: str, job: dict) -> None:
    """Assertions on compiled report."""
    assert job["job_title"] in report, f"{job['name']}: report missing job title"
    assert job["company_name"] in report, f"{job['name']}: report missing company"
    for header in [
        "## Technical Questions",
        "## Behavioral Questions",
        "## System Design",
        "## Questions to Ask the Interviewer",
    ]:
        assert header in report, f"{job['name']}: report missing '{header}'"
    assert "*(no questions generated)*" not in report, f"{job['name']}: empty section in report"
    assert report.count("### ") >= 15, f"{job['name']}: too few Q&A headings in report"


def _assert_consistency(result: dict, job: dict) -> None:
    """Cross-node consistency checks."""
    parsed = result.get("parsed") or {}
    technologies = result.get("technologies", [])

    # parse_jd tech_stack and extract_technologies should agree on key techs
    parsed_lower = {t.lower() for t in parsed.get("tech_stack", [])}
    extracted_labels_lower = {t["label"].lower() for t in technologies}
    for tech in job["expected_tech_stack_contains"]:
        in_parsed = any(tech.lower() in t for t in parsed_lower)
        in_extracted = any(tech.lower() in t for t in extracted_labels_lower)
        assert in_parsed and in_extracted, (
            f"{job['name']}: '{tech}' in parsed={in_parsed}, extracted={in_extracted}"
        )


# ===================================================================
# PHASE 3: deepeval metrics
# ===================================================================

hierarchy_quality_metric = GEval(
    model=_judge,
    name="Hierarchy Organization Quality",
    criteria=(
        "The organized technology list must be well-structured for interview preparation. "
        "Primary technologies (explicitly in JD) must appear before secondary (inferred). "
        "Categories must be appropriate (e.g. PostgreSQL in 'Databases & Storage'). "
        "No duplicates. No fabricated technologies — each traceable to the JD."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.7,
)

tech_extraction_metric = GEval(
    model=_judge,
    name="Technology Extraction Accuracy",
    criteria=(
        "Extracted technologies must accurately reflect the job description. "
        "Primary technologies should be explicitly named in the JD. "
        "Secondary technologies should be reasonably inferred from context. "
        "Each technology must have a valid canonical tag, human-readable label, and appropriate category. "
        "No technologies fabricated from thin air."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.7,
)

question_relevance_metric = GEval(
    model=_judge,
    name="Interview Question Relevance",
    criteria=(
        "Each question must be specific to the role, company, and tech stack in the job description. "
        "Generic questions applicable to any software role are poor quality. "
        "Technical questions should reference actual technologies from the JD. "
        "Behavioral questions should relate to the role's stated responsibilities. "
        "Model answers must be substantive (2+ sentences), specific, and reference the role context. "
        "For behavioral: STAR format. For system design: trade-offs discussed."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.65,
)

report_completeness_metric = GEval(
    model=_judge,
    name="Report Completeness",
    criteria=(
        "The markdown report must contain all four sections: "
        "'Technical Questions', 'Behavioral Questions', 'System Design', "
        "and 'Questions to Ask the Interviewer'. "
        "Header must include job title and company. Tech stack listed near top. "
        "No empty sections. Each section has numbered Q&A pairs."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.8,
)

jd_parsing_metric = GEval(
    model=_judge,
    name="JD Parsing Accuracy",
    criteria=(
        "The parsed JSON must accurately reflect the job description. "
        "tech_stack items should be technologies actually mentioned or strongly implied. "
        "requirements should be concrete hard requirements, not generic phrases. "
        "role_type and seniority must match the signals in the title and responsibilities."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.7,
)


# ===================================================================
# Test runners
# ===================================================================

def run_unit_tests() -> None:
    """Run all deterministic unit tests for organize_hierarchy_node."""
    tests = [
        # Hierarchy node
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
        # Taxonomy + contract
        ("category_has_required_metadata", test_category_has_required_metadata),
        ("taxonomy_covers_all_fixture_tags", test_taxonomy_covers_all_fixture_tags),
        ("no_duplicate_tags_after_organize", test_no_duplicate_tags_after_organize),
        ("knowledge_app_category_contract", test_knowledge_app_category_contract),
        ("lesson_slugs_are_hierarchical", test_lesson_slugs_are_hierarchical),
        ("llm_frameworks_category_exists", test_llm_frameworks_category_exists),
        ("organized_preserves_all_fields", test_organized_preserves_all_fields),
        ("icons_are_unicode_not_html_entities", test_icons_are_unicode_not_html_entities),
        ("ensure_unicode_decodes_html_entities", test_ensure_unicode_decodes_html_entities),
        ("persist_fallback_icon_is_unicode", test_persist_fallback_icon_is_unicode),
        ("knowledge_db_url_validation", test_knowledge_db_url_validation),
        # Graph structure + node isolation
        ("graph_has_parallel_entry", test_graph_has_parallel_entry),
        ("validate_urls_rejects_wrong_db", test_validate_urls_rejects_wrong_db),
        ("validate_urls_missing_env", test_validate_urls_missing_env),
        ("persist_skips_when_db_not_ok", test_persist_skips_when_db_not_ok),
        ("compile_report_node_isolation", test_compile_report_node_isolation),
        ("persist_knowledge_node_dry_run", test_persist_knowledge_node_dry_run),
    ]

    passed = failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  PASS  {name}")
            passed += 1
        except (AssertionError, Exception) as e:
            label = "FAIL" if isinstance(e, AssertionError) else "ERROR"
            print(f"  {label}  {name}: {e}")
            failed += 1

    print(f"\n  Unit tests: {passed} passed, {failed} failed out of {len(tests)}")
    if failed > 0:
        raise AssertionError(f"{failed} unit test(s) failed")


def run_integration_tests() -> tuple[
    list[LLMTestCase],  # hierarchy
    list[LLMTestCase],  # extraction
    list[LLMTestCase],  # questions
    list[LLMTestCase],  # report
    list[LLMTestCase],  # parsing
]:
    """Run full pipeline (dry-run) on mock jobs. Hard assertions + deepeval cases."""
    graph = build_application_prep_graph()
    hierarchy_cases: list[LLMTestCase] = []
    extraction_cases: list[LLMTestCase] = []
    question_cases: list[LLMTestCase] = []
    report_cases: list[LLMTestCase] = []
    parsing_cases: list[LLMTestCase] = []

    for job in MOCK_JOBS:
        print(f"\n  Running pipeline: {job['name']} ...")
        result = graph.invoke({
            "application_id": 0, "job_title": job["job_title"],
            "company_name": job["company_name"], "company_key": "",
            "job_description": job["job_description"],
            "parsed": None, "company_context": "",
            "technologies": [], "organized": [], "existing_slugs": [],
            "question_sets": [], "generated": [],
            "report": "", "knowledge_db_ok": False,
            "dry_run": True, "exclude_tags": [], "stats": {},
        })

        parsed = result.get("parsed") or {}
        technologies = result.get("technologies", [])
        organized = result.get("organized", [])
        question_sets = result.get("question_sets", [])
        report = result.get("report", "")

        q_count = sum(len(qs["qa_pairs"]) for qs in question_sets)
        print(f"    parsed: role={parsed.get('role_type')}, seniority={parsed.get('seniority')}, "
              f"tech_stack={len(parsed.get('tech_stack', []))}")
        print(f"    technologies: {len(technologies)} extracted, {len(organized)} organized")
        print(f"    questions: {q_count} across {len(question_sets)} categories")
        print(f"    report: {len(report)} chars")

        # Hard assertions on every phase
        _assert_parsed(parsed, job)
        _assert_technologies(technologies, job)
        _assert_hierarchy(result, job)
        _assert_questions(question_sets, job)
        _assert_report(report, job)
        _assert_consistency(result, job)

        jd_input = f"Title: {job['job_title']}\nCompany: {job['company_name']}\n\n{job['job_description']}"

        # deepeval — parsing
        parsing_cases.append(LLMTestCase(
            name=f"{job['name']} — Parsing",
            input=jd_input,
            actual_output=json.dumps(parsed, indent=2),
            expected_output=json.dumps({
                "role_type": job["expected_role_type"],
                "seniority": job["expected_seniority"],
                "tech_stack_contains": job["expected_tech_stack_contains"],
            }),
        ))

        # deepeval — extraction
        extraction_cases.append(LLMTestCase(
            name=f"{job['name']} — Extraction",
            input=jd_input,
            actual_output=json.dumps(technologies, indent=2),
            expected_output=json.dumps({
                "expected_tags": job["expected_techs_contain"],
                "expected_categories": job["expected_categories_contain"],
                "min_count": 3,
            }),
        ))

        # deepeval — hierarchy
        hierarchy_cases.append(LLMTestCase(
            name=f"{job['name']} — Hierarchy",
            input=jd_input,
            actual_output=json.dumps(organized, indent=2),
            expected_output=json.dumps({
                "expected_tags": job["expected_techs_contain"],
                "expected_categories": job["expected_categories_contain"],
                "sort_order": "primary first, then secondary, by (category, tag)",
            }),
        ))

        # deepeval — question quality per category
        by_cat = {qs["category"]: qs["qa_pairs"] for qs in question_sets}
        for cat in CATEGORIES:
            question_cases.append(LLMTestCase(
                name=f"{job['name']} — {cat}",
                input=f"Role: {job['job_title']} @ {job['company_name']}\nCategory: {cat}\n\n{job['job_description'][:1000]}",
                actual_output=json.dumps(by_cat.get(cat, []), indent=2),
            ))

        # deepeval — report
        report_cases.append(LLMTestCase(
            name=f"{job['name']} — Report",
            input=f"Title: {job['job_title']}\nCompany: {job['company_name']}\nParsed: {json.dumps(parsed)}",
            actual_output=report,
            expected_output=(
                f"Markdown report with header '# Interview Prep — {job['job_title']} @ {job['company_name']}', "
                "tech stack listed, and all four sections populated: "
                "Technical Questions (6 Q&A), Behavioral Questions (5 Q&A), "
                "System Design (3 Q&A), Questions to Ask the Interviewer (4 Q&A)."
            ),
        ))

    return hierarchy_cases, extraction_cases, question_cases, report_cases, parsing_cases


# ===================================================================
# Entry point
# ===================================================================

def main() -> None:
    total_jobs = len(MOCK_JOBS)

    print("=" * 60)
    print("Phase 1: Unit tests (deterministic, mocked DB)")
    print("=" * 60)
    run_unit_tests()

    print(f"\n{'=' * 60}")
    print(f"Phase 2: Integration tests (full pipeline, dry-run)")
    print(f"{'=' * 60}")
    hierarchy_cases, extraction_cases, question_cases, report_cases, parsing_cases = run_integration_tests()

    print(f"\n  All hard assertions passed ({total_jobs} jobs verified).")

    total_deepeval = (
        len(hierarchy_cases) + len(extraction_cases)
        + len(question_cases) + len(report_cases) + len(parsing_cases)
    )
    print(f"\n{'=' * 60}")
    print(f"Phase 3: deepeval metrics ({total_deepeval} cases)")
    print(f"{'=' * 60}\n")

    evaluate(test_cases=parsing_cases, metrics=[jd_parsing_metric])
    evaluate(test_cases=extraction_cases, metrics=[tech_extraction_metric])
    evaluate(test_cases=hierarchy_cases, metrics=[hierarchy_quality_metric])
    evaluate(test_cases=question_cases, metrics=[question_relevance_metric])
    evaluate(test_cases=report_cases, metrics=[report_completeness_metric])


if __name__ == "__main__":
    main()
