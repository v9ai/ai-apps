"""Writer agent eval — blog post format and quality."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import WriterFormatMetric


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_writer_format_and_quality(pool, research_brief):
    agent = Agent("writer", prompts.writer(), pool.for_role(TeamRole.REASONER))
    output = await agent.run(research_brief)

    test_case = LLMTestCase(input=research_brief, actual_output=output)

    format_metric = WriterFormatMetric()
    quality_metric = GEval(
        name="WriterQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.INPUT],
        evaluation_steps=[
            "The blog post should open with a surprising claim backed by research data.",
            "Each section should be anchored to a specific fact from the research brief.",
            "The voice should be first-person, technically precise.",
            "No generic phrases like 'in this article' or 'let's dive in'.",
            "Needs Verification items from the research should NOT be presented as facts.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [format_metric, quality_metric])
