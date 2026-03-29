"""Review pipeline — LangGraph StateGraph for reviewing existing drafts.

Standalone graph that takes a draft and runs it through reference checking,
publication fit scoring (against all 20 niche publications), automated evals,
editorial review, and report synthesis.

Flow:
    read_files -> check_references -> [score_publication_fit, run_evals] -> editorial_review -> synthesize_report -> END

The publication fit scorer and eval runner execute in parallel since they are
independent — both feed into the editorial review node.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from press import slugify
from press.agents import Agent
from press.graphs.nodes import check_references_node
from press.graphs.state import ReviewInputState, ReviewState
from press.models import ModelPool, TeamRole
from press import prompts

logger = logging.getLogger(__name__)


def build_review_graph(pool: ModelPool):
    """Build the Review pipeline StateGraph."""
    graph = StateGraph(ReviewState, input_schema=ReviewInputState)

    async def read_files(state: ReviewState) -> dict:
        """Read draft and optional research/SEO files."""
        result: dict = {}

        draft_path = Path(state["input_file"])
        result["draft"] = draft_path.read_text()
        logger.info("Read draft: %d chars from %s", len(result["draft"]), draft_path)

        if state.get("research_file"):
            rp = Path(state["research_file"])
            if rp.exists():
                result["research_output"] = rp.read_text()
                logger.info("Read research brief: %d chars", len(result["research_output"]))

        if state.get("seo_file"):
            sp = Path(state["seo_file"])
            if sp.exists():
                result["seo_output"] = sp.read_text()
                logger.info("Read SEO strategy: %d chars", len(result["seo_output"]))

        return result

    async def score_publication_fit(state: ReviewState) -> dict:
        """Score draft against all 20 publications."""
        scorer = Agent(
            "publication-fit-scorer",
            prompts.publication_fit_scorer(),
            pool.for_role(TeamRole.FAST),
        )
        fit_report = await scorer.run(state["draft"])
        logger.info("Publication fit scoring complete (%d chars)", len(fit_report))
        return {"publication_fit": fit_report}

    async def run_evals(state: ReviewState) -> dict:
        """Run automated journalism quality evals on the draft."""
        try:
            from press.evals import evaluate_article

            draft = state.get("draft", "")
            research = state.get("research_output", "")
            seo = state.get("seo_output", "")

            result = await evaluate_article(draft, research, seo)

            scores = {name: round(m.score, 2) for name, m in result.metrics.items()}
            summary = result.summary()

            logger.info(
                "Eval complete: overall=%.2f, passed=%s",
                result.overall_score, result.passed_all,
            )

            return {"eval_scores": scores, "eval_summary": summary}
        except (ImportError, Exception) as exc:
            logger.warning("Evals skipped: %s", exc)
            return {"eval_summary": f"(evals skipped: {exc})"}

    async def editorial_review(state: ReviewState) -> dict:
        """Run editorial review informed by publication fit report."""
        editor = Agent(
            "review-editor",
            prompts.review_editor(),
            pool.for_role(TeamRole.REVIEWER),
        )

        sections = [f"## Draft\n\n{state['draft']}"]

        if state.get("publication_fit"):
            sections.append(f"## Publication Fit Report\n\n{state['publication_fit']}")

        if state.get("research_output"):
            sections.append(f"## Research Brief\n\n{state['research_output']}")

        if state.get("seo_output"):
            sections.append(f"## SEO Strategy\n\n{state['seo_output']}")

        if state.get("reference_report"):
            sections.append(f"## Reference Quality Report\n\n{state['reference_report']}")

        if state.get("eval_summary"):
            sections.append(f"## Automated Eval Scores\n\n{state['eval_summary']}")

        editor_input = "\n\n---\n\n".join(sections)
        editor_output = await editor.run(editor_input)

        return {"editor_output": editor_output}

    async def synthesize_report(state: ReviewState) -> dict:
        """Combine all review data into final report."""
        reporter = Agent(
            "review-reporter",
            prompts.review_report(),
            pool.for_role(TeamRole.FAST),
        )

        sections = []
        if state.get("publication_fit"):
            sections.append(f"## Publication Fit Report\n\n{state['publication_fit']}")
        if state.get("eval_summary"):
            sections.append(f"## Automated Eval Scores\n\n{state['eval_summary']}")
        if state.get("editor_output"):
            sections.append(f"## Editorial Review\n\n{state['editor_output']}")
        if state.get("reference_report"):
            sections.append(f"## Reference Quality\n\n{state['reference_report']}")

        report_input = "\n\n---\n\n".join(sections)
        report = await reporter.run(report_input)

        # Save reports to disk
        output_dir = state.get("output_dir", "./articles")
        draft_path = Path(state["input_file"])
        slug = slugify(draft_path.stem)
        reports_dir = Path(output_dir) / "reviews"
        reports_dir.mkdir(parents=True, exist_ok=True)
        (reports_dir / f"{slug}-review.md").write_text(report)

        if state.get("publication_fit"):
            (reports_dir / f"{slug}-publication-fit.md").write_text(state["publication_fit"])
        if state.get("editor_output"):
            (reports_dir / f"{slug}-editorial.md").write_text(state["editor_output"])

        logger.info("Review reports saved to %s", reports_dir)

        return {"review_report": report}

    # Build graph
    graph.add_node("read_files", read_files)
    graph.add_node("check_references", check_references_node)
    graph.add_node("score_publication_fit", score_publication_fit)
    graph.add_node("run_evals", run_evals)
    graph.add_node("editorial_review", editorial_review)
    graph.add_node("synthesize_report", synthesize_report)

    graph.add_edge(START, "read_files")
    graph.add_edge("read_files", "check_references")
    # Fan out: run publication fit scoring and evals in parallel
    graph.add_edge("check_references", "score_publication_fit")
    graph.add_edge("check_references", "run_evals")
    # Fan in: both feed into editorial review
    graph.add_edge("score_publication_fit", "editorial_review")
    graph.add_edge("run_evals", "editorial_review")
    graph.add_edge("editorial_review", "synthesize_report")
    graph.add_edge("synthesize_report", END)

    return graph.compile()
