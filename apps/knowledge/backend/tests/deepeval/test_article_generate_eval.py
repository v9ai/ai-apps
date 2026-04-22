"""deepeval gate for the ``article_generate`` graph.

Most expensive graph: 5+ LLM calls per case (research → outline → draft →
review → optional revise × 2). Marked ``@slow``; opt in via
``pnpm test:deepeval:all``.

Metrics:
  - Deterministic: article passes ``check_quality()`` (title, ≥3 ## sections,
    ≥2 code blocks, ≥1 cross-ref, ≥MIN_WORD_COUNT words).
  - Expected-themes heuristic: fraction of ``expected_themes`` that appear
    in the article body.
  - FaithfulnessMetric against the research notes (the graph's own first
    step) — article claims should be backed by the research.
  - GEval Technical-Depth — judge rates whether the article is specific +
    technical (concrete code/details) vs generic/hand-wavy.
"""

from __future__ import annotations

import pytest

from knowledge_agent.article_generate_graph import build_graph, check_quality

from .conftest import (
    DEFAULT_THRESHOLD,
    aggregate_gate,
    deepeval_required,
    run_metric,
)


async def _run_article(case: dict) -> dict:
    graph = build_graph()
    return await graph.ainvoke(
        {
            "slug": case["slug"],
            "topic": case["topic"],
            "category": case["category"],
            "related_topics": case["related_topics"],
            "existing_articles": case["existing_articles"],
            "style_sample": case["style_sample"],
        }
    )


@pytest.mark.deepeval
@pytest.mark.slow
@pytest.mark.asyncio
async def test_article_quality_gate(
    golden_article_generate: list[dict],
) -> None:
    """Every article must pass the built-in check_quality() gate within the
    max_revisions budget (or at least score ok=True in its final quality)."""
    failures: list[str] = []
    for case in golden_article_generate:
        try:
            out = await _run_article(case)
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{case['id']}] graph error: {e!r}")
            continue

        final = out.get("final", "")
        q = check_quality(final)
        if not q["ok"]:
            failures.append(
                f"[{case['id']}] quality not ok after {out.get('revisions', 0)} "
                f"revisions: {q['issues']}"
            )
    assert not failures, "Quality failures:\n  - " + "\n  - ".join(failures)


@deepeval_required
@pytest.mark.deepeval
@pytest.mark.slow
@pytest.mark.asyncio
async def test_article_themes_and_depth(
    golden_article_generate: list[dict], judge
) -> None:
    from deepeval.metrics import FaithfulnessMetric, GEval
    from deepeval.test_case import LLMTestCase, LLMTestCaseParams

    faithfulness = FaithfulnessMetric(
        threshold=DEFAULT_THRESHOLD, model=judge, async_mode=False
    )
    technical_depth = GEval(
        name="Technical-Depth",
        evaluation_steps=[
            "Read the topic (INPUT) and the generated article (ACTUAL_OUTPUT).",
            "Reward concrete technical detail: real code, real tradeoffs, specific libraries/APIs.",
            "Penalize generic filler: hand-wavy prose, vague phrases like 'modern AI systems', tautologies.",
            "An article that reads like it could be about any topic scores low.",
        ],
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=DEFAULT_THRESHOLD,
        model=judge,
        async_mode=False,
    )

    passes = 0
    total = 0
    failures: list[str] = []

    for case in golden_article_generate:
        try:
            out = await _run_article(case)
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{case['id']}] graph error: {e!r}")
            continue

        final = out.get("final", "")
        final_lower = final.lower()

        themes = case.get("expected_themes", [])
        if themes:
            hits = sum(1 for t in themes if t.lower() in final_lower)
            coverage = hits / max(1, len(themes))
            total += 1
            ok = coverage >= 0.5
            passes += int(ok)
            if not ok:
                failures.append(
                    f"[{case['id']}] theme coverage: {hits}/{len(themes)}"
                )

        research = str(out.get("research") or "")
        tc = LLMTestCase(
            input=f"Topic: {case['topic']}",
            actual_output=final,
            retrieval_context=[research] if research else ["(no research)"],
        )

        if research:
            total += 1
            ok, diag = run_metric(faithfulness, tc)
            passes += int(ok)
            if not ok:
                failures.append(f"[{case['id']}] Faithfulness: {diag}")

        total += 1
        ok, diag = run_metric(technical_depth, tc)
        passes += int(ok)
        if not ok:
            failures.append(f"[{case['id']}] Technical-Depth: {diag}")

    aggregate_gate(passes, total, failures, label="article_generate")
