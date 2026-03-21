"""Shared pytest fixtures for the eval suite.

Centralizes judge model, API key checks, and golden dataset loading
so test files don't duplicate boilerplate.
"""

import os
import json
import sys
import pathlib

import pytest

# Instrument CrewAI for DeepEval tracing
try:
    from deepeval.integrations.crewai import instrument_crewai
    instrument_crewai()
except Exception:
    pass

# Ensure the analyzer package is importable from tests
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent))

from eval._judge import _HAS_API_KEY  # noqa: E402


def pytest_collection_modifyitems(config, items):
    """Auto-skip tests that require DEEPSEEK_API_KEY when it's not set."""
    if _HAS_API_KEY:
        return
    skip_marker = pytest.mark.skip(reason="requires DEEPSEEK_API_KEY")
    for item in items:
        # Skip any test that uses GEval/DeepEval fixtures or imports
        if "geval" in item.nodeid or "structural" in item.nodeid or "safety" in item.nodeid:
            item.add_marker(skip_marker)


@pytest.fixture
def require_api_key():
    """Fixture that skips the test if DEEPSEEK_API_KEY is not set."""
    if not _HAS_API_KEY:
        pytest.skip("requires DEEPSEEK_API_KEY")


def load_golden_dataset(filename: str) -> list[dict]:
    """Load a golden dataset JSON file from eval/datasets/."""
    dataset_dir = pathlib.Path(__file__).parent / "datasets"
    filepath = dataset_dir / filename
    if not filepath.exists():
        return []
    with open(filepath) as f:
        return json.load(f)
