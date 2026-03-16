"""Editor agent eval — APPROVE/REVISE decision quality."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from agentic_press.agents import Agent
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts

from .metrics import EditorDecisionMetric


@pytest.fixture
def pool():
    return ModelPool.from_env()


@pytest.mark.asyncio
async def test_editor_approves_clean_draft(pool, editor_input_approvable):
    agent = Agent(
        "editor", prompts.journalism_editor(), pool.for_role(TeamRole.REVIEWER)
    )
    output = await agent.run(editor_input_approvable)

    test_case = LLMTestCase(
        input=editor_input_approvable, actual_output=output
    )

    decision_metric = EditorDecisionMetric()
    quality_metric = GEval(
        name="EditorApproveQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.INPUT],
        evaluation_steps=[
            "The editor should APPROVE this draft since all claims are backed by the research brief.",
            "The editor should preserve the Writer's voice.",
            "Copy-edits should be applied directly in the output.",
            "Output should contain 'status: published' in frontmatter.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [decision_metric, quality_metric])


@pytest.mark.asyncio
async def test_editor_revises_fabricated_claims(pool, editor_input_needs_revision):
    agent = Agent(
        "editor", prompts.journalism_editor(), pool.for_role(TeamRole.REVIEWER)
    )
    output = await agent.run(editor_input_needs_revision)

    test_case = LLMTestCase(
        input=editor_input_needs_revision, actual_output=output
    )

    quality_metric = GEval(
        name="EditorReviseQuality",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.INPUT],
        evaluation_steps=[
            "The editor MUST catch fabricated claims: '73% Stanford study', '67% Gartner survey', '40% McKinsey', '82% platform teams'.",
            "The editor should issue a REVISE decision with 'Critical Issues' section.",
            "Each flagged claim should reference the specific paragraph.",
            "The editor should never approve unverified claims.",
        ],
        threshold=0.6,
    )

    assert_test(test_case, [quality_metric])
