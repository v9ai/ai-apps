"""Pytest fixtures for deep_icp eval tests.

Honors the repo convention that tests do not touch production Neon: the graph
is invoked with `product` pre-populated so `load_product` short-circuits.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

GOLDEN_PATH = Path(__file__).parent / "golden" / "deep_icp.json"


@pytest.fixture(scope="session")
def golden_products() -> list[dict]:
    with GOLDEN_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert isinstance(data, list)
    assert len(data) >= 15, "golden set must have at least 15 products"
    return data


@pytest.fixture(autouse=True)
def _reset_remote_adapter_cache() -> Any:
    """Adapter factories cache RemoteGraph instances by name. Tests that
    monkeypatch ``ML_URL`` / ``RESEARCH_URL`` would otherwise see a cached
    adapter built under a previous test's env. Reset before and after each
    test so isolation matches the pre-cache behaviour.

    Also reset the per-adapter circuit-breaker registry — it is keyed by
    adapter name on a module-level dict, so a test that trips the breaker
    on ``jobbert_ner`` would otherwise leave a still-open breaker that any
    later test re-using the same adapter name would inherit (the property
    suite hits this — unrelated round-trip tests fail with
    ``RemoteUnavailable``).
    """
    try:
        from core.remote_graphs import _CircuitBreaker, reset_adapter_cache
    except Exception:  # noqa: BLE001 — torch/transitive imports may fail in some envs
        yield
        return
    reset_adapter_cache()
    _CircuitBreaker.reset_all()
    yield
    reset_adapter_cache()
    _CircuitBreaker.reset_all()
