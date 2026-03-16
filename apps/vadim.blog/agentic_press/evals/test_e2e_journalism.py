"""End-to-end journalism pipeline eval — cross-agent coherence."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_e2e_journalism_coherence(pool, research_brief, seo_strategy):
    """Test that the Writer produces coherent output using both research and SEO inputs."""
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

    # Structural checks
    assert output, "Output should not be empty"

    # Required terms from the research brief
    required_terms = ["Fermyon", "Fastly", "WASI", "Bytecode Alliance"]
    for term in required_terms:
        assert term in output, f"Missing required term: {term}"

    # Fabricated claims should be absent
    assert "70% of edge computing" not in output, "Should not include unverified 70% claim"

    test_case = LLMTestCase(input=writer_input, actual_output=output)
    quality_metric = GEval(
        name="E2ECoherence",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.INPUT],
        evaluation_steps=[
            "Article includes specific facts from research brief: Fermyon <1ms, Fastly 18B, WASI Preview 2, Bytecode Alliance 30+ members.",
            "Avoids 'Needs Verification' items from research.",
            "Facts are attributed to original sources.",
            "Rate on faithfulness to research and absence of hallucinations.",
        ],
        threshold=0.6,
    )
    assert_test(test_case, [quality_metric])
