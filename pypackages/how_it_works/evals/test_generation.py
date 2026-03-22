"""LLM-judged evaluations for the generate_node output.

These tests call DeepSeek to judge the quality of structured JSON generation.
Run: uv run pytest evals/test_generation.py -v -m eval
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

_src = Path(__file__).resolve().parent.parent / "src"
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from conftest import (
    agents_pipeline_metric,
    extra_sections_metric,
    json_schema_compliance_metric,
    papers_quality_metric,
    stats_quality_metric,
    story_quality_metric,
)
from fixtures import SAMPLE_ANALYSIS, SAMPLE_GENERATED_JSON


@pytest.mark.eval
class TestPapersQuality:
    """Are the Technical Foundations entries specific and correctly categorized?"""

    def test_papers(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [papers_quality_metric])


@pytest.mark.eval
class TestPipelineStages:
    """Do the pipeline stages trace a logical data flow with named artefacts?"""

    def test_agents(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [agents_pipeline_metric])


@pytest.mark.eval
class TestStatsQuality:
    """Are stats specific, verifiable, and meaningful?"""

    def test_stats(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [stats_quality_metric])


@pytest.mark.eval
class TestStoryQuality:
    """Is the narrative a flowing, technical summary?"""

    def test_story(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [story_quality_metric])


@pytest.mark.eval
class TestExtraSections:
    """Do the deep-dive sections cover required topics with specific details?"""

    def test_extra_sections(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [extra_sections_metric])


@pytest.mark.eval
class TestJsonSchemaCompliance:
    """Does the JSON output strictly follow the required schema?"""

    def test_schema(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [json_schema_compliance_metric])
