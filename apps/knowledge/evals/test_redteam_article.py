"""DeepEval evaluation for the LangGraph Red-Teaming article.

Applies domain-specific GEval metrics that test whether the article
adequately covers red-teaming with LangGraph. Each test extracts the
relevant section(s) to avoid overwhelming the judge with the full article.

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_redteam_article.py
"""

import re
from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from deepseek_model import DeepSeekModel

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"
ARTICLE_PATH = CONTENT_DIR / "langgraph-red-teaming.md"

model = DeepSeekModel()
THRESHOLD = 0.7


def _extract_sections(text: str, heading_pattern: str) -> str:
    """Extract all H2/H3 sections matching a regex pattern."""
    lines = text.split("\n")
    collecting = False
    collected = []
    for line in lines:
        if re.match(r"^#{2,3}\s+", line):
            if re.search(heading_pattern, line, re.IGNORECASE):
                collecting = True
                collected.append(line)
            elif collecting:
                # Hit next H2/H3 that doesn't match — stop if it's same or higher level
                if line.startswith("## ") and not re.search(heading_pattern, line, re.IGNORECASE):
                    collecting = False
                else:
                    collected.append(line)
            continue
        if collecting:
            collected.append(line)
    return "\n".join(collected)


@pytest.fixture(scope="module")
def article_content() -> str:
    return ARTICLE_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def primitives_section(article_content) -> str:
    return _extract_sections(article_content, r"Primitives|State as Attack|Send\(\)|Conditional Edges|Cycles")


@pytest.fixture(scope="module")
def architectures_section(article_content) -> str:
    return _extract_sections(article_content, r"Graph Architectures|Fan-Out|PAIR|Propagation|Reflect")


@pytest.fixture(scope="module")
def deepteam_section(article_content) -> str:
    return _extract_sections(article_content, r"DeepTeam|Custom Vulnerabilities|Scanner")


@pytest.fixture(scope="module")
def scoring_section(article_content) -> str:
    return _extract_sections(article_content, r"Scoring|Deterministic|LLM-as-Judge|Hybrid")


@pytest.fixture(scope="module")
def callback_section(article_content) -> str:
    return _extract_sections(article_content, r"Callback|Wrapping")


@pytest.fixture(scope="module")
def multiturn_section(article_content) -> str:
    return _extract_sections(article_content, r"Multi-Turn|Crescendo|Tree-of-Attacks")


@pytest.fixture(scope="module")
def attack_surface_section(article_content) -> str:
    return _extract_sections(article_content, r"Attack Surface|System Prompt Injection|State Propagation|String-Match|Tool Abuse")


@pytest.fixture(scope="module")
def practical_section(article_content) -> str:
    return _extract_sections(article_content, r"Practical|Cost Management|Separating|Reproducibility|pytest|Reporting")


# -- Metrics -------------------------------------------------------------------

langgraph_primitives_metric = GEval(
    name="LangGraph Primitives Coverage",
    criteria=(
        "Evaluate whether the content explains how LangGraph's core primitives "
        "map to red-teaming patterns. Check for: "
        "(1) TypedDict state with operator.add reducers for collecting attack results, "
        "(2) Send() for parallel fan-out of attacks, "
        "(3) conditional edges for routing and multi-turn loops, "
        "(4) cycles for iterative attacks like PAIR and Crescendo. "
        "Each primitive should have a code example."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

graph_architectures_metric = GEval(
    name="Graph Architecture Patterns",
    criteria=(
        "Evaluate whether the content presents at least three distinct red-team "
        "graph architectures: (1) fan-out scanner (plan → dispatch → collect → report), "
        "(2) iterative attack like PAIR as a LangGraph cycle, "
        "(3) cross-agent propagation tracing injection across pipelines. "
        "Each should include a graph diagram and Python code."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

deepteam_integration_metric = GEval(
    name="DeepTeam Integration",
    criteria=(
        "Evaluate whether the content shows integration between LangGraph and "
        "DeepTeam: (1) using attack classes with enhance() in LangGraph nodes, "
        "(2) defining CustomVulnerability, (3) wrapping red_team() as a node, "
        "(4) using custom models (DeepEvalBaseLLM) as simulator and evaluator."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

scoring_strategies_metric = GEval(
    name="Scoring Strategies",
    criteria=(
        "Evaluate whether the content covers three scoring approaches for "
        "red-team results: (1) deterministic scoring with string matching and "
        "keyword detection with code examples, (2) LLM-as-judge scoring using "
        "GEval metrics with code showing metric definition and measurement, "
        "(3) hybrid scoring combining both with guidance on when to use each."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

multi_turn_attacks_metric = GEval(
    name="Multi-Turn Attack Coverage",
    criteria=(
        "Evaluate whether the content explains at least two multi-turn attack "
        "techniques as LangGraph graphs: Crescendo jailbreaking with adaptive "
        "escalation, PAIR with attacker-target-judge loop, or Tree-of-Attacks "
        "with branching via Send(). Each should show graph structure and "
        "how conditional edges control the loop."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

attack_surface_metric = GEval(
    name="Attack Surface Analysis",
    criteria=(
        "Evaluate whether the content analyzes attack surfaces specific to "
        "LangGraph applications: (1) system prompt injection via f-string "
        "state interpolation, (2) state propagation across pipeline nodes, "
        "(3) string-match routing gate bypass, (4) tool abuse in ReAct agents. "
        "Each should include a vulnerable code example and risk explanation."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

callback_patterns_metric = GEval(
    name="Target Callback Patterns",
    criteria=(
        "Evaluate whether the content shows how to wrap different LLM targets "
        "as red-team callbacks: (1) wrapping a LangGraph ReAct agent, "
        "(2) wrapping a multi-agent pipeline, (3) wrapping a REST API endpoint. "
        "Each should return an RTTurn and demonstrate extracting the response."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

practical_guidance_metric = GEval(
    name="Practical Guidance",
    criteria=(
        "Evaluate whether the content provides actionable guidance: "
        "(1) cost management (deterministic-first, profiles, concurrency), "
        "(2) attacker/target model separation, (3) reproducibility practices, "
        "(4) pytest CI/CD integration with deterministic and LLM-judged layers."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)


# -- Tests (each uses the relevant section, not the full article) --------------


def test_langgraph_primitives(primitives_section):
    tc = LLMTestCase(input="Evaluate LangGraph primitives for red-teaming", actual_output=primitives_section)
    assert_test(tc, [langgraph_primitives_metric])


def test_graph_architectures(architectures_section):
    tc = LLMTestCase(input="Evaluate red-team graph architecture patterns", actual_output=architectures_section)
    assert_test(tc, [graph_architectures_metric])


def test_deepteam_integration(deepteam_section):
    tc = LLMTestCase(input="Evaluate DeepTeam integration coverage", actual_output=deepteam_section)
    assert_test(tc, [deepteam_integration_metric])


def test_scoring_strategies(scoring_section):
    tc = LLMTestCase(input="Evaluate scoring strategies coverage", actual_output=scoring_section)
    assert_test(tc, [scoring_strategies_metric])


def test_multi_turn_attacks(multiturn_section):
    tc = LLMTestCase(input="Evaluate multi-turn attack coverage", actual_output=multiturn_section)
    assert_test(tc, [multi_turn_attacks_metric])


def test_attack_surface(attack_surface_section):
    tc = LLMTestCase(input="Evaluate attack surface analysis", actual_output=attack_surface_section)
    assert_test(tc, [attack_surface_metric])


def test_callback_patterns(callback_section):
    tc = LLMTestCase(input="Evaluate target callback patterns", actual_output=callback_section)
    assert_test(tc, [callback_patterns_metric])


def test_practical_guidance(practical_section):
    tc = LLMTestCase(input="Evaluate practical red-teaming guidance", actual_output=practical_section)
    assert_test(tc, [practical_guidance_metric])
