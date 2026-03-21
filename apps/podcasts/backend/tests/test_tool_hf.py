"""Tests for the fetch_hf_author tool from crew.py.

Covers:
- Known HF org returns data (network)
- Result contains model listings (network)
- Result contains download counts (network)
- Empty username returns sentinel
- "unknown" username returns sentinel
- "none" username returns sentinel
- Return type is str
- Known org result mentions "Models" or "models" (network)
"""

import os

import pytest

from crew import fetch_hf_author

# Skip network tests when HF_SKIP_NETWORK is set or CI is detected.
SKIP_NETWORK = bool(os.getenv("HF_SKIP_NETWORK") or os.getenv("CI"))
needs_network = pytest.mark.skipif(
    SKIP_NETWORK,
    reason="Skipped: network-dependent test (set HF_SKIP_NETWORK=1 to skip)",
)

SENTINEL = "(no HuggingFace username provided)"


# ── 1. Returns data for known HF org ────────────────────────────────────

@needs_network
def test_known_org_returns_data():
    result = fetch_hf_author.invoke({"username": "meta-llama"})
    assert isinstance(result, str)
    assert len(result) > 50
    assert result != SENTINEL


# ── 2. Result contains model listings ────────────────────────────────────

@needs_network
def test_result_contains_model_listings():
    result = fetch_hf_author.invoke({"username": "meta-llama"})
    assert "meta-llama" in result.lower()


# ── 3. Result contains download counts ──────────────────────────────────

@needs_network
def test_result_contains_download_counts():
    result = fetch_hf_author.invoke({"username": "meta-llama"})
    assert "download" in result.lower()


# ── 4. Handles empty username ────────────────────────────────────────────

def test_empty_username_returns_sentinel():
    result = fetch_hf_author.invoke({"username": ""})
    assert result == SENTINEL


# ── 5. Handles "unknown" ────────────────────────────────────────────────

def test_unknown_username_returns_sentinel():
    result = fetch_hf_author.invoke({"username": "unknown"})
    assert result == SENTINEL


# ── 6. Handles "none" ──────────────────────────────────────────────────

def test_none_username_returns_sentinel():
    result = fetch_hf_author.invoke({"username": "none"})
    assert result == SENTINEL


# ── 7. Returns string type ──────────────────────────────────────────────

@needs_network
def test_return_type_is_str():
    result = fetch_hf_author.invoke({"username": "meta-llama"})
    assert type(result) is str


# ── 8. Known org result mentions "Models" or "models" ───────────────────

@needs_network
def test_result_mentions_models():
    result = fetch_hf_author.invoke({"username": "meta-llama"})
    assert "models" in result.lower()
