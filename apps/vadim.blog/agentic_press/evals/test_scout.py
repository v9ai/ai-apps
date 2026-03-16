"""Scout agent eval — finds 5 trending topics with sources."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import ScoutFormatMetric


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_scout_ai_engineering(pool):
    agent = Agent(
        "scout", prompts.scout("AI engineering and LLM tooling"),
        pool.for_role(TeamRole.FAST),
    )
    output = await agent.run(
        "Find 5 trending topics in this niche: AI engineering and LLM tooling"
    )

    test_case = LLMTestCase(
        input="AI engineering and LLM tooling",
        actual_output=output,
    )

    format_metric = ScoutFormatMetric()
    quality_metric = GEval(
        name="ScoutQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "Topics must have clear trending signals from the last 2 weeks.",
            "Each topic includes specific source links (not generic).",
            "Rate on specificity, recency, and misconception potential.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [format_metric, quality_metric])


@pytest.mark.asyncio
async def test_scout_rust(pool):
    agent = Agent(
        "scout", prompts.scout("Rust systems programming"),
        pool.for_role(TeamRole.FAST),
    )
    output = await agent.run(
        "Find 5 trending topics in this niche: Rust systems programming"
    )

    test_case = LLMTestCase(
        input="Rust systems programming",
        actual_output=output,
    )
    assert_test(test_case, [ScoutFormatMetric()])
