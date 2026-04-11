"""Tests for the fetch_orcid_profile LangChain tool.

Covers edge-case inputs (empty, "none"), return type guarantees,
and live ORCID API responses for a known academic profile.
Network-dependent tests are marked with skipif so they degrade
gracefully in offline / CI environments.
"""

import sys
from pathlib import Path

import pytest

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from research_pipeline import fetch_orcid_profile

# ── network availability flag ────────────────────────────────────────────

_network_available = True
try:
    import httpx

    resp = httpx.get("https://pub.orcid.org", timeout=5)
    if resp.status_code >= 400:
        _network_available = False
except Exception:
    _network_available = False

requires_network = pytest.mark.skipif(
    not _network_available,
    reason="ORCID API unreachable — skipping network tests",
)

# Known ORCID for Athos Georgiou (AI researcher, has publications with DOIs)
VALID_ORCID = "0009-0004-3081-2883"
INVALID_ORCID = "0000-0000-0000-0000"


# ── 1. Empty ORCID returns sentinel message ──────────────────────────────

def test_empty_orcid_returns_no_orcid_message():
    result = fetch_orcid_profile("")
    assert result == "(no ORCID iD provided)"


# ── 2. "none" ORCID returns sentinel message ────────────────────────────

def test_none_string_returns_no_orcid_message():
    result = fetch_orcid_profile("none")
    assert result == "(no ORCID iD provided)"


# ── 3. Return type is always str ─────────────────────────────────────────

@pytest.mark.parametrize("orcid_input", ["", "none", INVALID_ORCID, VALID_ORCID])
def test_return_type_is_string(orcid_input):
    result = fetch_orcid_profile(orcid_input)
    assert isinstance(result, str), f"Expected str, got {type(result)}"


# ── 4. Valid ORCID returns the person's name ─────────────────────────────

@requires_network
def test_valid_orcid_returns_name():
    result = fetch_orcid_profile(VALID_ORCID)
    assert "Georgiou" in result, (
        f"Expected 'Georgiou' in ORCID result for {VALID_ORCID}, got: {result[:200]}"
    )


# ── 5. Valid ORCID result contains Publications section ──────────────────

@requires_network
def test_valid_orcid_contains_publications():
    result = fetch_orcid_profile(VALID_ORCID)
    assert "Publications" in result, (
        f"Expected 'Publications' section in result, got: {result[:300]}"
    )


# ── 6. Valid ORCID result contains DOI references ────────────────────────

@requires_network
def test_valid_orcid_contains_doi():
    result = fetch_orcid_profile(VALID_ORCID)
    assert "DOI:" in result or "doi" in result.lower(), (
        f"Expected DOI references in result for a prolific academic, got: {result[:300]}"
    )


# ── 7. Invalid ORCID handles error gracefully ───────────────────────────

@requires_network
def test_invalid_orcid_handles_error_gracefully():
    result = fetch_orcid_profile(INVALID_ORCID)
    # Should not raise; should return a string (possibly empty data or error)
    assert isinstance(result, str)
    # Should not contain a Python traceback
    assert "Traceback" not in result
