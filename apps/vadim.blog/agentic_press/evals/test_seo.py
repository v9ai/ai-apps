"""SEO agent eval — keyword strategy and structure recommendations."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import SeoFormatMetric


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_seo_wasm(pool):
    agent = Agent(
        "seo",
        prompts.journalism_seo("WebAssembly server-side computing performance"),
        pool.for_role(TeamRole.FAST),
    )
    output = await agent.run(
        "Analyze SEO strategy for: WebAssembly server-side computing performance"
    )

    test_case = LLMTestCase(
        input="WebAssembly server-side computing performance",
        actual_output=output,
    )

    format_metric = SeoFormatMetric()
    quality_metric = GEval(
        name="SeoQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "Keyword table with volume ranges (not exact numbers).",
            "Competitive landscape analysis.",
            "Actionable structure recommendations.",
            "No fabricated survey data or statistics.",
            "Rate on actionability and anti-hallucination adherence.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [format_metric, quality_metric])
