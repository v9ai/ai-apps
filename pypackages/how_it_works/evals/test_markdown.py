"""LLM-judged evaluations for markdown quality of the analyze_node output.

These tests verify that the technical analysis is well-structured markdown
with correct heading hierarchy, code formatting, list structure, and readability.
Run: uv run pytest evals/test_markdown.py -v -m eval
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
    markdown_bold_emphasis_metric,
    markdown_code_blocks_metric,
    markdown_heading_hierarchy_metric,
    markdown_link_quality_metric,
    markdown_list_formatting_metric,
    markdown_readability_metric,
    markdown_section_density_metric,
    markdown_to_json_fidelity_metric,
)
from fixtures import SAMPLE_ANALYSIS, SAMPLE_FILES_TEXT, SAMPLE_GENERATED_JSON


@pytest.mark.eval
class TestMarkdownHeadingHierarchy:
    """Are headings numbered, sequential, and properly nested?"""

    def test_heading_hierarchy(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [markdown_heading_hierarchy_metric])


@pytest.mark.eval
class TestMarkdownCodeBlocks:
    """Are file names, functions, and packages wrapped in backticks?"""

    def test_code_blocks(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [markdown_code_blocks_metric])


@pytest.mark.eval
class TestMarkdownListFormatting:
    """Are lists consistent, substantive, and well-indented?"""

    def test_list_formatting(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [markdown_list_formatting_metric])


@pytest.mark.eval
class TestMarkdownBoldEmphasis:
    """Is bold used for key terms without overuse?"""

    def test_bold_emphasis(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [markdown_bold_emphasis_metric])


@pytest.mark.eval
class TestMarkdownSectionDensity:
    """Does each section have appropriate content density?"""

    def test_section_density(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [markdown_section_density_metric])


@pytest.mark.eval
class TestMarkdownLinkQuality:
    """Are code references traceable to source files?"""

    def test_link_quality(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [markdown_link_quality_metric])


@pytest.mark.eval
class TestMarkdownReadability:
    """Does the markdown read as a cohesive, well-structured document?"""

    def test_readability(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [markdown_readability_metric])


@pytest.mark.eval
class TestMarkdownToJsonFidelity:
    """Does the JSON output faithfully mirror the markdown analysis?"""

    def test_fidelity(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [markdown_to_json_fidelity_metric])
