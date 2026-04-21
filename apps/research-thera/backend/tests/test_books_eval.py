"""deepeval gate for the `books` LangGraph.

Two layers:
  1. Deterministic (always runs): shape + range invariants on the output.
  2. LLM-judge via deepeval (skipped if deepeval or a judge LLM are unavailable).

Aggregate pass rate across all 10 golden goals × 6 metrics must be >= 0.80.
Mirrors the pattern in apps/lead-gen/backend/tests/test_deep_icp_eval.py.
"""
from __future__ import annotations

import os
import re
from typing import Any

import pytest

from research_agent.books_graph import _VALID_CATEGORIES, graph

# ── Helpers ────────────────────────────────────────────────────────────


async def _run_graph(entry: dict) -> dict:
    return await graph.ainvoke(
        {
            "goal_id": entry["goal_id"],
            "user_email": "test@example.com",
            "_prompt": entry["prompt"],
            "_research_count": entry["research_count"],
            "_skip_persist": True,
        }
    )


# ── Deterministic layer ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_deterministic_shape_and_ranges(golden_goals: list[dict]) -> None:
    """Every golden goal must produce a well-shaped `books` output."""
    failures: list[str] = []

    for entry in golden_goals:
        try:
            out = await _run_graph(entry)
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{entry['id']}] graph raised: {e!r}")
            continue

        if not out.get("success"):
            failures.append(f"[{entry['id']}] success is False: {out.get('message')}")
            continue

        books = out.get("books") or []
        n = len(books)
        if n < 3 or n > 8:
            failures.append(f"[{entry['id']}] returned {n} books (expected 3-8)")
            continue

        for i, b in enumerate(books):
            tag = f"[{entry['id']}] book[{i}]"
            title = b.get("title")
            if not isinstance(title, str) or not title.strip():
                failures.append(f"{tag} missing/empty title")
            authors = b.get("authors")
            if not isinstance(authors, list) or not authors or not all(
                isinstance(a, str) and a.strip() for a in authors
            ):
                failures.append(f"{tag} authors not a non-empty list of strings: {authors!r}")
            desc = b.get("description") or ""
            if len(desc) < 30:
                failures.append(f"{tag} description too short ({len(desc)} chars)")
            why = b.get("whyRecommended") or ""
            if len(why) < 30:
                failures.append(f"{tag} whyRecommended too short ({len(why)} chars)")
            cat = b.get("category")
            if cat not in _VALID_CATEGORIES:
                failures.append(f"{tag} invalid category: {cat!r}")
            year = b.get("year")
            if year is not None and not isinstance(year, int):
                failures.append(f"{tag} year not int|None: {year!r}")
            isbn = b.get("isbn")
            if isbn is not None and not isinstance(isbn, str):
                failures.append(f"{tag} isbn not str|None: {isbn!r}")

    assert not failures, "Deterministic failures:\n  - " + "\n  - ".join(failures)


# ── deepeval layer ─────────────────────────────────────────────────────


def _deepeval_available() -> bool:
    try:
        import deepeval  # noqa: F401
        from deepeval.metrics import AnswerRelevancyMetric  # noqa: F401
        return True
    except ImportError:
        return False


def _judge_available() -> bool:
    return bool(
        os.environ.get("DEEPSEEK_API_KEY")
        or os.environ.get("LLM_API_KEY")
        or os.environ.get("LLM_BASE_URL")
    )


deepeval_required = pytest.mark.skipif(
    not _deepeval_available() or not _judge_available(),
    reason="deepeval not installed or no judge LLM configured",
)


def _serialize_output(out: dict[str, Any]) -> str:
    lines = []
    for b in out.get("books", []):
        authors = ", ".join(b.get("authors") or [])
        cat = b.get("category", "?")
        why = (b.get("whyRecommended") or "").strip()
        lines.append(
            f"- {b.get('title', '?')} by {authors} [{cat}] — {why[:240]}"
        )
    return "\n".join(lines)


_RESEARCH_LINE = re.compile(r'^\[(\d+)\] "(.+?)"', re.MULTILINE)


def _retrieval_context_from_prompt(prompt: str) -> list[str]:
    """Parse research-paper titles out of the pre-assembled prompt."""
    titles = _RESEARCH_LINE.findall(prompt)
    return [t for _, t in titles] or [prompt[:500]]


def _make_judge():
    """Wrap AsyncOpenAI in a deepeval BaseLLM honoring LLM_BASE_URL."""
    from deepeval.models.base_model import DeepEvalBaseLLM
    from openai import AsyncOpenAI, OpenAI

    base_url = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com")
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")

    class LocalJudge(DeepEvalBaseLLM):
        def __init__(self) -> None:
            self._sync = OpenAI(base_url=base_url, api_key=api_key, timeout=180.0)
            self._async = AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=180.0)

        def load_model(self):
            return self._sync

        def generate(self, prompt: str) -> str:
            resp = self._sync.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
            )
            return resp.choices[0].message.content or ""

        async def a_generate(self, prompt: str) -> str:
            resp = await self._async.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
            )
            return resp.choices[0].message.content or ""

        def get_model_name(self) -> str:
            return model

    return LocalJudge()


@deepeval_required
@pytest.mark.asyncio
async def test_llm_judge_aggregate_pass_rate(golden_goals: list[dict]) -> None:
    """Run 2 heuristics + relevancy + faithfulness + 2 GEvals over all goals.

    Aggregate pass rate across (goal × metric) cells must be >= 0.80.
    """
    from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric, GEval
    from deepeval.test_case import LLMTestCase, LLMTestCaseParams

    judge = _make_judge()
    threshold = 0.7

    relevancy = AnswerRelevancyMetric(threshold=threshold, model=judge, async_mode=False)
    faithful = FaithfulnessMetric(threshold=threshold, model=judge, async_mode=False)
    realness = GEval(
        name="Book-Realness",
        evaluation_steps=[
            "Each recommended book must be a real, published, widely-known work.",
            "Penalize fabricated titles, made-up author names, or hallucinated ISBNs.",
            "Reward recognizable canon aligned with the therapeutic domain.",
        ],
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        threshold=threshold,
        model=judge,
        async_mode=False,
    )
    fit = GEval(
        name="Therapeutic-Fit",
        evaluation_steps=[
            "The whyRecommended field should reference the specific goal and the research findings, not boilerplate.",
            "Reward recommendations that connect to the family context (age, relationship, named issues).",
            "Penalize recommendations that are generic, off-topic, or ignore the research papers listed.",
        ],
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=threshold,
        model=judge,
        async_mode=False,
    )

    passes = 0
    total = 0
    failures: list[str] = []

    for entry in golden_goals:
        try:
            out = await _run_graph(entry)
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{entry['id']}] graph error: {e!r}")
            continue

        actual = _serialize_output(out)
        brief = entry["goal_title"]
        expected = (
            f"themes: {entry['expected_themes']}; "
            f"authors (any of): {entry['expected_authors_any_of']}; "
            f"categories: {entry['expected_categories']}"
        )
        tc = LLMTestCase(
            input=brief,
            actual_output=actual,
            expected_output=expected,
            retrieval_context=_retrieval_context_from_prompt(entry["prompt"]),
        )

        # Cheap heuristic: expected categories that appear in any book's category.
        returned_cats = {(b.get("category") or "").lower() for b in out.get("books", [])}
        expected_cats = {c.lower() for c in entry["expected_categories"]}
        cat_hits = len(returned_cats & expected_cats)
        cat_pass = cat_hits / max(1, len(expected_cats)) >= 0.5
        total += 1
        passes += int(cat_pass)
        if not cat_pass:
            failures.append(
                f"[{entry['id']}] category-heuristic: {cat_hits}/{len(expected_cats)} "
                f"(returned={returned_cats})"
            )

        # Cheap heuristic: at least one expected author appears in returned authors.
        returned_author_blob = actual.lower()
        author_hit = any(
            a.lower() in returned_author_blob for a in entry["expected_authors_any_of"]
        )
        total += 1
        passes += int(author_hit)
        if not author_hit:
            failures.append(
                f"[{entry['id']}] author-heuristic: none of "
                f"{entry['expected_authors_any_of']} present"
            )

        for metric in (relevancy, faithful, realness, fit):
            total += 1
            try:
                metric.measure(tc)
                ok = bool(getattr(metric, "is_successful", lambda: False)())
            except Exception as e:  # noqa: BLE001
                ok = False
                failures.append(f"[{entry['id']}] {metric.__class__.__name__}: {e!r}")
            passes += int(ok)
            if not ok:
                reason = getattr(metric, "reason", "")
                failures.append(
                    f"[{entry['id']}] {metric.__class__.__name__} failed "
                    f"(score={getattr(metric, 'score', None)}): {reason[:200]}"
                )

    rate = passes / max(1, total)
    summary = (
        f"deepeval pass rate: {passes}/{total} = {rate:.2%} (gate 0.80)\n  - "
        + "\n  - ".join(failures[:30])
    )
    assert rate >= 0.80, summary
