"""Env-var requirement tests for core/remote_graphs.py adapter builders.

The builders read ML_URL / RESEARCH_URL at call time (not import time), so
each test owns the env state it needs via the ``monkeypatch`` fixture and
the rest of the suite stays hermetic.

No HTTP and no torch — a successful build returns a wrapper around a
RemoteGraph stub that we never invoke.
"""

from __future__ import annotations

import pytest

from core.remote_graphs import (
    _ADAPTER_BUILDERS,
    _ValidatedRemoteGraph,
    build_all_remote_adapters,
    get_bge_m3_embed_adapter,
    get_jobbert_ner_adapter,
    get_remote_adapter,
    get_research_agent_adapter,
)


EXPECTED_ADAPTER_NAMES = {
    "jobbert_ner",
    "bge_m3_embed",
    "research_agent",
    "lead_papers",
    "scholar",
    "common_crawl",
    "agentic_search",
    "gh_patterns",
}


def test_ml_url_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ML_URL", raising=False)
    with pytest.raises(RuntimeError) as exc_info:
        get_jobbert_ner_adapter()
    assert "ML_URL" in str(exc_info.value)


def test_ml_url_blank_string_required(monkeypatch: pytest.MonkeyPatch) -> None:
    """Whitespace-only env var is treated the same as unset."""
    monkeypatch.setenv("ML_URL", "   ")
    with pytest.raises(RuntimeError) as exc_info:
        get_bge_m3_embed_adapter()
    assert "ML_URL" in str(exc_info.value)


def test_research_url_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("RESEARCH_URL", raising=False)
    with pytest.raises(RuntimeError) as exc_info:
        get_research_agent_adapter()
    assert "RESEARCH_URL" in str(exc_info.value)


def test_adapter_builds_with_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    adapter = get_jobbert_ner_adapter()
    assert adapter is not None
    assert isinstance(adapter, _ValidatedRemoteGraph)
    # Trailing slash should be stripped during URL normalisation.
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml/")
    adapter2 = get_bge_m3_embed_adapter()
    assert isinstance(adapter2, _ValidatedRemoteGraph)


def test_get_remote_adapter_unknown_name(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unregistered adapter name must raise KeyError with a hint listing the
    valid names — no silent ``None`` return."""
    # The KeyError fires before any URL is read, so env state doesn't matter.
    monkeypatch.delenv("ML_URL", raising=False)
    monkeypatch.delenv("RESEARCH_URL", raising=False)
    with pytest.raises(KeyError) as exc_info:
        get_remote_adapter("nonexistent")
    msg = str(exc_info.value)
    assert "nonexistent" in msg
    assert "jobbert_ner" in msg  # hint includes available names


def test_get_remote_adapter_known_name(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    adapter = get_remote_adapter("jobbert_ner")
    assert isinstance(adapter, _ValidatedRemoteGraph)


def test_build_all_returns_eight_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.setenv("RESEARCH_URL", "http://lead-gen-research")
    adapters = build_all_remote_adapters()
    assert set(adapters.keys()) == EXPECTED_ADAPTER_NAMES
    for name, adapter in adapters.items():
        assert isinstance(adapter, _ValidatedRemoteGraph), (
            f"{name} did not return a _ValidatedRemoteGraph"
        )


def test_build_all_fails_fast_without_research_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.delenv("RESEARCH_URL", raising=False)
    # ML adapters build first; the first research adapter trips the boot.
    with pytest.raises(RuntimeError) as exc_info:
        build_all_remote_adapters()
    assert "RESEARCH_URL" in str(exc_info.value)


def test_adapter_builders_registry() -> None:
    """The registry is the source of truth for cross-container surface area;
    drift here = a deploy where one service speaks a contract no caller knows."""
    assert set(_ADAPTER_BUILDERS.keys()) == EXPECTED_ADAPTER_NAMES
    assert len(_ADAPTER_BUILDERS) == 8
    for name, builder in _ADAPTER_BUILDERS.items():
        assert callable(builder), f"{name} builder is not callable"


# ─── Auth-token warn-once ─────────────────────────────────────────────────


def test_missing_ml_token_logs_warning_once(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """A missing ML auth token used to silently produce headers without
    Authorization — a misconfigured deploy 401-looped in production with no
    log signal. Now ``_resolve_auth_token`` emits one WARNING per env var,
    deduped via ``_WARNED_AUTH``."""
    import logging

    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.delenv("ML_INTERNAL_AUTH_TOKEN", raising=False)

    with caplog.at_level(logging.WARNING, logger="core.remote_graphs"):
        get_jobbert_ner_adapter()
        get_bge_m3_embed_adapter()  # second build of the same env var

    matches = [r for r in caplog.records if "ML_INTERNAL_AUTH_TOKEN" in r.message]
    assert len(matches) == 1, (
        f"expected exactly one warn for ML_INTERNAL_AUTH_TOKEN, got {len(matches)}"
    )
    assert "unauthenticated" in matches[0].message


def test_missing_research_token_logs_warning_once(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """Mirror of the ML test: missing research-side token warns once."""
    import logging

    monkeypatch.setenv("RESEARCH_URL", "http://lead-gen-research")
    monkeypatch.delenv("RESEARCH_INTERNAL_AUTH_TOKEN", raising=False)

    with caplog.at_level(logging.WARNING, logger="core.remote_graphs"):
        get_research_agent_adapter()
        get_remote_adapter("lead_papers")

    matches = [
        r for r in caplog.records if "RESEARCH_INTERNAL_AUTH_TOKEN" in r.message
    ]
    assert len(matches) == 1


def test_token_set_does_not_warn(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """When the token is present we must neither warn nor emit a header
    without Authorization."""
    import logging

    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.setenv("ML_INTERNAL_AUTH_TOKEN", "secret123")

    with caplog.at_level(logging.WARNING, logger="core.remote_graphs"):
        get_jobbert_ner_adapter()

    matches = [r for r in caplog.records if "ML_INTERNAL_AUTH_TOKEN" in r.message]
    assert matches == []

    # Verify the header was actually set on the adapter's stored headers.
    from core import remote_graphs

    headers = remote_graphs._ml_headers()
    assert headers.get("Authorization") == "Bearer secret123"
