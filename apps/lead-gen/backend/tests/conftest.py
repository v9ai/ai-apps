"""Pytest fixtures for deep_icp eval tests.

Honors the repo convention that tests do not touch production Neon: the graph
is invoked with `product` pre-populated so `load_product` short-circuits.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

GOLDEN_PATH = Path(__file__).parent / "golden" / "deep_icp.json"


@pytest.fixture(scope="session")
def golden_products() -> list[dict]:
    with GOLDEN_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert isinstance(data, list)
    assert len(data) >= 15, "golden set must have at least 15 products"
    return data
