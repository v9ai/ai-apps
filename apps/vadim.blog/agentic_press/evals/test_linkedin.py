"""LinkedIn agent eval — post format and reach optimization."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import LinkedInFormatMetric


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_linkedin_format_and_quality(pool, research_brief):
    # First generate a blog post, then convert to LinkedIn
    writer = Agent("writer", prompts.writer(), pool.for_role(TeamRole.REASONER))
    blog_post = await writer.run(research_brief)

    agent = Agent("linkedin", prompts.linkedin(), pool.for_role(TeamRole.FAST))
    output = await agent.run(blog_post)

    test_case = LLMTestCase(input=blog_post, actual_output=output)

    format_metric = LinkedInFormatMetric()
    quality_metric = GEval(
        name="LinkedInQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "Hook strength: opens with a statistic or claim, not 'I'.",
            "Concrete, actionable takeaways.",
            "Specific technical hashtags (not #AI or #Tech).",
            "Clear CTA to the blog post.",
            "Professional tone matching viral post energy.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [format_metric, quality_metric])
