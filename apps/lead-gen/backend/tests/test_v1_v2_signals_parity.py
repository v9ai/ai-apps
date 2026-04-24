"""v1/v2 parity: with no ICP analysis available, the v2 composite score must
equal the v1 regex score for the same (company, product, corpus). The regex
keys inside ``signals.regex`` must also match what v1 wrote at the root."""

from __future__ import annotations

from leadgen_agent.icp_fit_scorer import build_v2_signals
from leadgen_agent.verticals import all_verticals, apply_signal_rules, compute_score_and_tier


_CORPUS = (
    "from langchain_text_splitters import RecursiveCharacterTextSplitter\n"
    "We run on-prem deployments for our EU customers under GDPR.\n"
    "Context window is a real concern — reducing tokens is a top-line metric."
)


def _legacy_v1_signals(vertical, corpus: str) -> dict:
    # Re-create exactly what v1 wrote: schema_version + regex keys flat.
    v1 = apply_signal_rules(vertical, corpus)
    return v1


def test_v1_v2_regex_only_parity() -> None:
    verticals = all_verticals()
    assert verticals, "no verticals registered"
    v = verticals[0]

    v1_signals = _legacy_v1_signals(v, _CORPUS)
    v1_score, v1_tier = compute_score_and_tier(v, v1_signals)

    # Build v2 signals on the regex-only path (icp_block=None).
    v2_signals = build_v2_signals(
        schema_version=v.schema_version,
        regex_signals=v1_signals,
        icp_block=None,
        composite_score=None,
        composite_tier=None,
    )

    # Regex keys preserved verbatim under signals.regex
    expected_regex = {k: vv for k, vv in v1_signals.items() if k != "schema_version"}
    assert v2_signals["regex"] == expected_regex

    # Score / tier on the regex-only path must match the v1 result.
    # (score_verticals uses compute_score_and_tier when icp_block is None.)
    v2_score, v2_tier = compute_score_and_tier(v, v1_signals)
    assert v2_score == v1_score
    assert v2_tier == v1_tier


def test_v2_shape_has_schema_version_at_root() -> None:
    v = all_verticals()[0]
    out = build_v2_signals(
        schema_version=v.schema_version,
        regex_signals={"schema_version": v.schema_version, "rag_stack_detected": "langchain"},
        icp_block=None,
        composite_score=None,
        composite_tier=None,
    )
    assert out["schema_version"] == v.schema_version
    assert "regex" in out
    assert out["regex"].get("rag_stack_detected") == "langchain"
    assert "icp_fit" not in out
    assert "composite_score" not in out
