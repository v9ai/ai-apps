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

    Also resets ``_CircuitBreaker._registry`` — without this, a breaker
    that opened in one test file leaks its ``consecutive_failures`` /
    ``opened_at`` state into the next file's ``get_*_adapter()`` call,
    because ``_CircuitBreaker.for_name`` reuses the existing instance.
    Previously this lived only in the retry-breaker test file's local
    fixture; pytest's alphabetical ordering meant earlier files
    (``adapter``, ``env``, ``http``, ``lifecycle``, ``properties``)
    populated the registry, and the cross-file leak survived until the
    retry-breaker file's autouse fixture finally cleared it.
    """
    try:
        from core.remote_graphs import _CircuitBreaker, reset_adapter_cache
    except Exception:  # noqa: BLE001 — torch/transitive imports may fail in some envs
        yield
        return
    _CircuitBreaker.reset_all()
    reset_adapter_cache()
    yield
    _CircuitBreaker.reset_all()
    reset_adapter_cache()
