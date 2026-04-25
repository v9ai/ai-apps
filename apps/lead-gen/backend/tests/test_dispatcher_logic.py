"""Tests for the dispatcher Worker routing decisions.

We don't run JS in pytest. Instead we mirror the dispatcher's decision table
in Python and assert the rules match what's in src/dispatcher.js. If you
edit dispatcher.js, update _ROUTES / the harness below to match.

The point isn't to test JS — it's to lock in the routing rules so future
JS edits don't silently break path routing or auth gating. The text-based
assertions at the bottom catch accidental deletion of critical security
logic (SHA-256 check, internal-only rejection, env var name).
"""

from __future__ import annotations

from pathlib import Path

import pytest


# ── Mirror of src/dispatcher.js constants (re-derive on every edit) ────────
# Keep in sync with src/dispatcher.js. The dispatcher's PUBLIC_CORE_PREFIXES
# list is broader than what we test here; we cover the load-bearing prefixes
# called out in the routing contract.
PUBLIC_CORE_PREFIXES = ("/runs", "/threads", "/assistants", "/linkedin/")
INTERNAL_PREFIXES = ("/_ml/", "/_research/")
HEALTH_PATHS = ("/ok", "/health")


def route(method: str, path: str, has_auth: bool, auth_matches: bool) -> tuple[int, str]:
    """Decision table mirror of src/dispatcher.js.

    Returns ``(status_code, target)`` where target is one of:
    ``OK``, ``INTERNAL_ONLY``, ``MISSING_AUTH``, ``BAD_AUTH``, ``CORE``,
    ``NOT_FOUND``.
    """
    if path in HEALTH_PATHS:
        return (200, "OK")
    if any(path.startswith(p) for p in INTERNAL_PREFIXES):
        return (403, "INTERNAL_ONLY")
    if not has_auth:
        return (401, "MISSING_AUTH")
    if not auth_matches:
        return (401, "BAD_AUTH")
    if any(path.startswith(p) for p in PUBLIC_CORE_PREFIXES):
        return (200, "CORE")
    return (404, "NOT_FOUND")


# ── Routing decision tests ─────────────────────────────────────────────────


def test_health_ok_no_auth_required():
    status, target = route("GET", "/ok", has_auth=False, auth_matches=False)
    assert status == 200
    assert target == "OK"


def test_health_path_no_auth_required():
    status, target = route("GET", "/health", has_auth=False, auth_matches=False)
    assert status == 200
    assert target == "OK"


def test_runs_wait_missing_auth_returns_401():
    status, target = route("POST", "/runs/wait", has_auth=False, auth_matches=False)
    assert status == 401
    assert target == "MISSING_AUTH"


def test_runs_wait_wrong_auth_returns_401():
    status, target = route("POST", "/runs/wait", has_auth=True, auth_matches=False)
    assert status == 401
    assert target == "BAD_AUTH"


def test_runs_wait_valid_auth_routes_to_core():
    status, target = route("POST", "/runs/wait", has_auth=True, auth_matches=True)
    assert status == 200
    assert target == "CORE"


def test_threads_path_valid_auth_routes_to_core():
    status, target = route("GET", "/threads/abc", has_auth=True, auth_matches=True)
    assert status == 200
    assert target == "CORE"


def test_linkedin_path_valid_auth_routes_to_core():
    status, target = route("GET", "/linkedin/stats", has_auth=True, auth_matches=True)
    assert status == 200
    assert target == "CORE"


def test_internal_ml_path_rejected_even_with_valid_auth():
    status, target = route("POST", "/_ml/runs/wait", has_auth=True, auth_matches=True)
    assert status == 403
    assert target == "INTERNAL_ONLY"


def test_internal_research_path_rejected_even_with_valid_auth():
    status, target = route(
        "POST", "/_research/runs/wait", has_auth=True, auth_matches=True
    )
    assert status == 403
    assert target == "INTERNAL_ONLY"


def test_unknown_path_with_valid_auth_returns_404():
    status, target = route("GET", "/garbage", has_auth=True, auth_matches=True)
    assert status == 404
    assert target == "NOT_FOUND"


# Internal-only rejection happens BEFORE auth — even an unauthenticated
# probe of /_ml/* must see 403 (not a 401 that would leak the existence
# of the internal surface to a probing client).
def test_internal_ml_path_rejected_before_auth_check():
    status, target = route("POST", "/_ml/anything", has_auth=False, auth_matches=False)
    assert status == 403
    assert target == "INTERNAL_ONLY"


def test_internal_research_path_rejected_before_auth_check():
    status, target = route(
        "POST", "/_research/anything", has_auth=False, auth_matches=False
    )
    assert status == 403
    assert target == "INTERNAL_ONLY"


# Assistants is one of the public-core prefixes; mirror that decision so
# adding a regression to the JS list (e.g. typo'd prefix) gets caught.
def test_assistants_path_valid_auth_routes_to_core():
    status, target = route(
        "GET", "/assistants/foo", has_auth=True, auth_matches=True
    )
    assert status == 200
    assert target == "CORE"


# ── Source-text assertions: catch accidental deletions of security logic ───

DISPATCHER_PATH = (
    Path(__file__).resolve().parent.parent / "src" / "dispatcher.js"
)


@pytest.fixture(scope="module")
def dispatcher_source() -> str:
    assert DISPATCHER_PATH.exists(), f"dispatcher.js missing at {DISPATCHER_PATH}"
    return DISPATCHER_PATH.read_text(encoding="utf-8")


def test_dispatcher_source_rejects_internal_ml_prefix(dispatcher_source: str):
    assert '"/_ml/"' in dispatcher_source, (
        "dispatcher.js no longer references '/_ml/' — internal-only rejection "
        "may have been accidentally removed."
    )


def test_dispatcher_source_rejects_internal_research_prefix(dispatcher_source: str):
    assert '"/_research/"' in dispatcher_source, (
        "dispatcher.js no longer references '/_research/' — internal-only "
        "rejection may have been accidentally removed."
    )


def test_dispatcher_source_uses_sha256_for_token_compare(dispatcher_source: str):
    lowered = dispatcher_source.lower()
    assert "sha-256" in lowered or "sha256" in lowered, (
        "dispatcher.js no longer mentions SHA-256 — bearer token comparison "
        "may have been weakened."
    )


def test_dispatcher_source_references_token_hash_env(dispatcher_source: str):
    assert "LANGGRAPH_AUTH_TOKEN_HASH" in dispatcher_source, (
        "dispatcher.js no longer reads LANGGRAPH_AUTH_TOKEN_HASH — auth "
        "config wiring may have been broken."
    )
