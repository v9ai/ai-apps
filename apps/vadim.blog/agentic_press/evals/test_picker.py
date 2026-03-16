"""Picker agent eval — scores and selects topics as JSON array."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import PickerFormatMetric

SAMPLE_TOPICS = """1. Topic A — trending because of X — https://source-a.com
2. Topic B — trending because of Y — https://source-b.com
3. Topic C — trending because of Z — https://source-c.com
4. Topic D — trending because of W — https://source-d.com
5. Topic E — trending because of V — https://source-e.com"""


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_picker_count_2(pool):
    agent = Agent(
        "picker",
        prompts.picker("AI engineering and LLM tooling", 2),
        pool.for_role(TeamRole.FAST),
    )
    output = await agent.run(SAMPLE_TOPICS)

    test_case = LLMTestCase(input=SAMPLE_TOPICS, actual_output=output)

    format_metric = PickerFormatMetric()
    quality_metric = GEval(
        name="PickerQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "Topics must have specific contrarian angles backed by primary sources.",
            "'why_viral' must explain virality, not be generic.",
            "Diversity of selected topics.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [format_metric, quality_metric])


@pytest.mark.asyncio
async def test_picker_count_1(pool):
    agent = Agent(
        "picker",
        prompts.picker("Rust systems programming", 1),
        pool.for_role(TeamRole.FAST),
    )
    output = await agent.run(SAMPLE_TOPICS)

    test_case = LLMTestCase(input=SAMPLE_TOPICS, actual_output=output)
    assert_test(test_case, [PickerFormatMetric()])
