"""Journalism writer eval — publication-ready draft with cross-referencing."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import JournalismWriterFormatMetric


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_journalism_writer(pool, research_brief, seo_strategy):
    agent = Agent(
        "journalist-writer",
        prompts.journalism_writer(),
        pool.for_role(TeamRole.REASONER),
    )
    writer_input = (
        f"## Research Brief\n\n{research_brief}\n\n"
        f"---\n\n## SEO Strategy\n\n{seo_strategy}"
    )
    output = await agent.run(writer_input)

    test_case = LLMTestCase(input=writer_input, actual_output=output)

    format_metric = JournalismWriterFormatMetric()
    quality_metric = GEval(
        name="JournalismWriterQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.INPUT],
        evaluation_steps=[
            "Every claim must be traceable to the research brief.",
            "'Needs Verification' items should NOT be presented as established facts.",
            "SEO keywords should be naturally integrated.",
            "Authoritative, practical voice.",
            "Rate on fact-grounding, SEO integration, and readability.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [format_metric, quality_metric])
