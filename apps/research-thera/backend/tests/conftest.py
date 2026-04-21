"""Pytest fixtures for books-graph deepeval tests.

Tests never touch production Neon: the graph is invoked with `_prompt`
pre-populated so `collect_data` short-circuits, and `_skip_persist=True` so
`persist` synthesizes output rows without an INSERT.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

GOLDEN_PATH = Path(__file__).parent / "golden" / "books.json"


@pytest.fixture(scope="session")
def golden_goals() -> list[dict]:
    with GOLDEN_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert isinstance(data, list)
    assert len(data) >= 10, "golden set must have at least 10 therapeutic goals"
    return data
