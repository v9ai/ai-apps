"""LLM-judged cross-cutting evaluations (anti-hallucination, consistency, TS output).

These tests verify properties that span multiple pipeline stages.
Run: uv run pytest evals/test_cross_cutting.py -v -m eval
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

_src = Path(__file__).resolve().parent.parent / "src"
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from how_it_works.models import HowItWorksData
from how_it_works.nodes.write import generate_client_tsx, generate_data_tsx, generate_page_tsx

from conftest import (
    anti_hallucination_metric,
    consistency_metric,
    typescript_output_quality_metric,
)
from fixtures import SAMPLE_ANALYSIS, SAMPLE_GENERATED_JSON


@pytest.mark.eval
class TestAntiHallucination:
    """Does the JSON output only contain claims from the analysis?"""

    def test_anti_hallucination(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [anti_hallucination_metric])


@pytest.mark.eval
class TestInternalConsistency:
    """Is the JSON output internally consistent across all sections?"""

    def test_consistency(self):
        test_case = LLMTestCase(
            input=SAMPLE_ANALYSIS,
            actual_output=SAMPLE_GENERATED_JSON,
        )
        assert_test(test_case, [consistency_metric])


@pytest.mark.eval
class TestTypeScriptOutputQuality:
    """Would the generated TypeScript files compile and render correctly?"""

    def test_typescript_quality(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_GENERATED_JSON))
        combined = "\n\n".join([
            "// === data.tsx ===",
            generate_data_tsx(data),
            "// === how-it-works-client.tsx ===",
            generate_client_tsx(data),
            "// === page.tsx ===",
            generate_page_tsx(data, "todo-app"),
        ])
        test_case = LLMTestCase(
            input="TypeScript React files for a Next.js how-it-works page",
            actual_output=combined,
        )
        assert_test(test_case, [typescript_output_quality_metric])
