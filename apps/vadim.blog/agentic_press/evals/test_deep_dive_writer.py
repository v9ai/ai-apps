"""Deep-dive writer agent eval — long-form technical article with citations."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import DeepDiveFormatMetric


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_deep_dive_writer(pool, source_article, research_brief, seo_strategy):
    title = "From Research Papers to Production ML Features: Building a Crypto Scalping Engine"
    agent = Agent(
        "deep-dive-writer",
        prompts.deep_dive_writer(title),
        pool.for_role(TeamRole.REASONER),
    )

    writer_input = (
        f"## Source Article\n\n{source_article}\n\n"
        f"---\n\n## Academic Research\n\n{research_brief}\n\n"
        f"---\n\n## SEO Strategy\n\n{seo_strategy}"
    )
    output = await agent.run(writer_input)

    test_case = LLMTestCase(input=writer_input, actual_output=output)

    format_metric = DeepDiveFormatMetric()
    quality_metric = GEval(
        name="DeepDiveQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.INPUT],
        evaluation_steps=[
            "5+ papers discussed substantively (not just name-drops).",
            "Includes specific figures from source article (e.g., 62% from Cont et al., 30-50% edge decay).",
            "Component/ablation analysis where research provides it.",
            "Decision framework for practitioners.",
            "Practical applicability throughout.",
            "Honest treatment of limitations.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [format_metric, quality_metric])
