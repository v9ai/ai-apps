"""Researcher agent eval — structured research brief quality."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import ResearcherFormatMetric


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_researcher_wasm(pool):
    agent = Agent(
        "researcher",
        prompts.journalism_researcher("WebAssembly's expanding role in server-side computing"),
        pool.for_role(TeamRole.REASONER),
    )
    output = await agent.run(
        "Research this topic: WebAssembly's expanding role in server-side computing"
    )

    test_case = LLMTestCase(
        input="WebAssembly's expanding role in server-side computing",
        actual_output=output,
    )

    format_metric = ResearcherFormatMetric()
    quality_metric = GEval(
        name="ResearcherQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "Specific data points with sources (URLs or references).",
            "Counterarguments included.",
            "No fabricated statistics or surveys.",
            "Honest 'Needs Verification' section for uncertain claims.",
            "Rate on thoroughness, source quality, and uncertainty flagging.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [format_metric, quality_metric])


@pytest.mark.asyncio
async def test_researcher_ai_coding(pool):
    agent = Agent(
        "researcher",
        prompts.journalism_researcher("The impact of AI coding assistants on developer productivity"),
        pool.for_role(TeamRole.REASONER),
    )
    output = await agent.run(
        "Research this topic: The impact of AI coding assistants on developer productivity"
    )

    test_case = LLMTestCase(
        input="AI coding assistants and developer productivity",
        actual_output=output,
    )
    assert_test(test_case, [ResearcherFormatMetric()])
