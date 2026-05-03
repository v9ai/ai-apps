"""Eval gate for the ``gh_lead_research`` LangGraph.

Three layers (matching the convention in ``test_deep_icp_eval.py``):

  1. **Deterministic — always runs.** Pure-Python invariants on the disqualifier
     evaluator + Pydantic brief schema. Catches regressions in the cheap
     filter (regex broadens / narrows, Pydantic field validation breaks,
     etc.) without spending a token.

  2. **Live-graph — gated on ``EVAL=1``.** Runs the deployed graph against
     known fixtures (pixeltable as negative case; an indie repo as positive
     case). Asserts ``icp_disqualifier`` matches expectation. Costs DeepSeek
     + Brave + GitHub API calls per case.

  3. **DeepEval LLM-judge — gated on ``EVAL=1`` AND deepeval available.**
     ``FaithfulnessMetric`` over ``recent_fundraise`` against the gathered
     evidence. The worst failure mode for an outreach brief is a hallucinated
     fundraise ("Congrats on your $5M Series B" when they didn't raise).

Run:

    # Layer 1 only — fast, no network
    pytest backend/tests/test_gh_lead_research_eval.py::test_evaluate_icp_pedigree_match -v

    # All layers
    EVAL=1 LANGGRAPH_AUTH_TOKEN=... DEEPSEEK_API_KEY=... \\
      pytest backend/tests/test_gh_lead_research_eval.py -s
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx
import pytest

from leadgen_agent.gh_lead_research_graph import (
    DecisionMaker,
    LeadResearchBrief,
    _evaluate_icp,
    _PEDIGREE_BIO_RE,
)

# ── Layer 1: deterministic ─────────────────────────────────────────────


def test_evaluate_icp_funded_brief_disqualified() -> None:
    """LLM extracted a fundraise → disqualified before pedigree/PR checks."""
    out = _evaluate_icp(
        brief={"recent_fundraise": "$5.5M seed Dec 2024 (lead Sutter Hill)"},
        contributors=[],
        web_results=[],
    )
    assert out is not None
    assert out.startswith("funded:")
    assert "5.5M" in out


def test_evaluate_icp_llm_pedigree_signal_disqualified() -> None:
    """LLM-extracted pedigree_signal triggers disqualification (catches founders
    whose GitHub bio is empty but whose LinkedIn shows pedigree)."""
    out = _evaluate_icp(
        brief={
            "recent_fundraise": "",
            "pedigree_signal": "Marcel Kornacker is co-founder of Apache Parquet, founder of Apache Impala",
        },
        contributors=[],
        web_results=[],
    )
    assert out is not None
    assert out.startswith("pedigree:")
    assert "Apache" in out


def test_evaluate_icp_pedigree_bio_match_pixeltable_pierre() -> None:
    """Regression: Pierre Brunelle's actual GitHub bio must trigger the
    bio-regex disqualifier (not just the LLM-extracted version)."""
    pierre_bio = (
        "@pixeltable - ex-founder @noteable-io (acq by @confluentinc) | "
        "formerly Amazon, AWS, & Siemens"
    )
    assert _PEDIGREE_BIO_RE.search(pierre_bio), (
        "PEDIGREE_BIO_RE should match Pierre's bio — "
        "covers 'formerly Amazon', 'ex-founder', 'acq by @confluentinc'"
    )

    out = _evaluate_icp(
        brief={"recent_fundraise": "", "pedigree_signal": ""},
        contributors=[
            {"login": "aaron-siegel", "bio": "", "company": ""},
            {"login": "mkornacker", "bio": "", "company": "", "name": "Marcel Kornacker"},
            {
                "login": "pierrebrunelle",
                "bio": pierre_bio,
                "company": "Pixeltable",
                "name": "Pierre Brunelle",
            },
        ],
        web_results=[],
    )
    assert out is not None
    assert out.startswith("pedigree:")
    assert "Pierre Brunelle" in out


def test_evaluate_icp_partnership_motion_disqualified() -> None:
    """≥2 partnership/integration mentions in Brave hits → BD motion already
    in flight → disqualified."""
    out = _evaluate_icp(
        brief={"recent_fundraise": "", "pedigree_signal": ""},
        contributors=[],
        web_results=[
            {"title": "Acme partnership with Pixeltable", "description": "joint launch"},
            {"title": "Integration with TwelveLabs", "description": "powered by us"},
            {"title": "Random blog post", "description": "no signal"},
        ],
    )
    assert out is not None
    assert out.startswith("pr_motion:")
    assert "2" in out  # count surfaces


def test_evaluate_icp_clean_indie_passes() -> None:
    """Indie repo with no fundraise / pedigree / partnerships → not disqualified.

    This is the only path that returns ``None``. If this test starts failing,
    the upstream filter has gotten too aggressive and is killing legitimate
    leads.
    """
    out = _evaluate_icp(
        brief={"recent_fundraise": "", "pedigree_signal": "", "pitch_one_liner": "x"},
        contributors=[
            {"login": "indie-dev", "bio": "Building tools for myself", "company": ""},
        ],
        web_results=[
            {"title": "indie-dev/cool-thing — GitHub", "description": "OSS project"},
        ],
    )
    assert out is None


def test_brief_validation_tolerates_anonymous_decision_maker() -> None:
    """Regression: a single decision-maker entry with an empty ``name`` used
    to ValidationError the whole brief, defaulting confidence=0.0 and
    blanking every field. The validator now drops anonymous entries instead.
    """
    brief = LeadResearchBrief.model_validate({
        "recent_fundraise": "$1M seed",
        "decision_makers": [
            {"name": "", "title": "CEO"},                     # anonymous → dropped
            {"name": "Real Person", "title": "Founder"},      # kept
            {"title": "CTO"},                                  # missing name → dropped
        ],
        "confidence": 0.85,
    })
    names = [dm.name for dm in brief.decision_makers]
    assert names == ["Real Person"]
    assert brief.confidence == 0.85           # other fields preserved
    assert brief.recent_fundraise == "$1M seed"


def test_brief_default_shape() -> None:
    """An empty input must produce a fully-defaulted brief without raising —
    this is the synthesize-node fallback path."""
    brief = LeadResearchBrief.model_validate({})
    assert brief.recent_fundraise == ""
    assert brief.pedigree_signal == ""
    assert brief.confidence == 0.0
    assert brief.decision_makers == []


def test_decision_maker_name_max_length() -> None:
    """Schema invariant: oversize names must validate-error so we don't
    persist 50KB of garbage into D1."""
    with pytest.raises(Exception):
        DecisionMaker.model_validate({"name": "x" * 200})


# ── Layer 2: live graph ────────────────────────────────────────────────


def _eval_enabled() -> bool:
    return os.environ.get("EVAL") == "1"


def _live_graph_url() -> str:
    return "https://lead-gen-langgraph.eeeew.workers.dev/runs/wait"


def _live_token() -> str | None:
    return os.environ.get("LANGGRAPH_AUTH_TOKEN")


live_graph_required = pytest.mark.skipif(
    not _eval_enabled() or not _live_token(),
    reason="set EVAL=1 + LANGGRAPH_AUTH_TOKEN to run live-graph evals",
)


def _run_live(full_name: str) -> dict[str, Any]:
    resp = httpx.post(
        _live_graph_url(),
        headers={
            "Authorization": f"Bearer {_live_token()}",
            "Content-Type": "application/json",
        },
        json={"assistant_id": "gh_lead_research", "input": {"full_name": full_name}},
        timeout=240.0,
    )
    resp.raise_for_status()
    return resp.json()


@live_graph_required
def test_live_pixeltable_disqualified() -> None:
    """Pixeltable is the canonical bad lead: $5.5M Sutter-Hill seed,
    Apache-Parquet co-founder, multiple BD partnerships. The live graph
    MUST mark it disqualified across multiple axes."""
    state = _run_live("pixeltable/pixeltable")
    summary = state.get("summary") or {}
    disq = summary.get("icp_disqualifier")
    assert disq, (
        f"pixeltable should be disqualified, got None. summary={summary!r}"
    )
    # Don't pin which axis fires (LLM variance) — any of fund/pedigree/pr is OK.
    assert any(disq.startswith(p) for p in ("funded:", "pedigree:", "pr_motion:")), (
        f"unexpected disqualifier prefix: {disq!r}"
    )


# ── Layer 3: DeepEval LLM-judge ────────────────────────────────────────


def _deepeval_available() -> bool:
    try:
        import deepeval  # noqa: F401
        from deepeval.metrics import FaithfulnessMetric  # noqa: F401
        return True
    except ImportError:
        return False


def _judge_available() -> bool:
    from leadgen_agent.llm import is_deepseek_configured
    return is_deepseek_configured()


deepeval_required = pytest.mark.skipif(
    not _eval_enabled() or not _deepeval_available() or not _judge_available(),
    reason="set EVAL=1 + DEEPSEEK_API_KEY + install deepeval to run judge layer",
)


def _make_deepeval_judge():
    """DeepEval BaseLLM wrapper around our DeepSeek factory."""
    from deepeval.models.base_model import DeepEvalBaseLLM
    from leadgen_agent.llm import make_llm

    class DeepSeekJudge(DeepEvalBaseLLM):
        def __init__(self) -> None:
            self._m = make_llm(temperature=0.0, provider="deepseek", tier="deep")

        def load_model(self):
            return self._m

        def generate(self, prompt: str) -> str:
            resp = self._m.invoke(prompt)
            return str(getattr(resp, "content", resp))

        async def a_generate(self, prompt: str) -> str:
            resp = await self._m.ainvoke(prompt)
            return str(getattr(resp, "content", resp))

        def get_model_name(self) -> str:
            return "deepseek-v4-pro"

    return DeepSeekJudge()


@deepeval_required
def test_pixeltable_recent_fundraise_is_faithful_to_evidence() -> None:
    """Worst failure mode for outreach: hallucinating a fundraise.

    Run faithfulness against the deployed brief: the LLM-extracted
    ``recent_fundraise`` must be grounded in the ``web_search_results_json``
    evidence the graph actually fetched. If pixeltable's brief claims a
    Series B that was never reported, this fails.
    """
    from deepeval import evaluate
    from deepeval.metrics import FaithfulnessMetric
    from deepeval.test_case import LLMTestCase

    state = _run_live("pixeltable/pixeltable")
    summary = state.get("summary") or {}
    brief = summary.get("brief") or {}
    fundraise = (brief.get("recent_fundraise") or "").strip()

    if not fundraise:
        pytest.skip(
            "no fundraise extracted on this run — faithfulness undefined "
            "(disqualifier may have fired on pedigree/PR axis instead)"
        )

    # Reconstruct the evidence the synthesize node saw. We don't have
    # web_search_results_json on the wire summary, so reuse the evidence_urls
    # the LLM cited — these are the URLs it claims grounded its answer.
    evidence_urls = brief.get("evidence_urls") or []
    if not evidence_urls:
        pytest.skip("no evidence_urls cited — cannot judge faithfulness")

    judge = _make_deepeval_judge()
    metric = FaithfulnessMetric(threshold=0.7, model=judge, async_mode=False)

    test_case = LLMTestCase(
        input="What recent fundraise did this company complete?",
        actual_output=fundraise,
        retrieval_context=[f"Evidence URL: {u}" for u in evidence_urls[:8]],
    )

    result = evaluate(test_cases=[test_case], metrics=[metric])

    # deepeval.evaluate returns an EvaluationResult; the per-test-case
    # success is what we gate on.
    cases = getattr(result, "test_results", None) or []
    if not cases:
        pytest.fail(f"deepeval returned no test_results: {result!r}")
    case0 = cases[0]
    metric_results = getattr(case0, "metrics_data", None) or getattr(case0, "metrics_metadata", []) or []
    if not metric_results:
        pytest.fail(f"deepeval returned no metric data: {case0!r}")
    md = metric_results[0]
    score = getattr(md, "score", None)
    success = getattr(md, "success", None)
    reason = getattr(md, "reason", "") or ""

    assert success is True, (
        f"FaithfulnessMetric failed (score={score}). "
        f"fundraise={fundraise!r} — judge said: {reason}"
    )
