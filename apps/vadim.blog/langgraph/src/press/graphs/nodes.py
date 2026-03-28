"""Shared node implementations for editorial pipelines.

Deduplicates publish, save_final, write, edit, revise, check_references,
and routing logic used across journalism, deep_dive, and counter_article graphs.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Callable

from press import extract_published_content, extract_seo_slug, slugify
from press.agents import Agent
from press.models import ModelPool, TeamRole
from press import prompts
from press.link_checker import (
    check_references,
    check_content_links,
    format_reference_report,
    format_report,
)
from press.publisher import publish as publish_post, validate_before_publish

logger = logging.getLogger(__name__)

MAX_REVISIONS = 1


def _topic_key(state: dict) -> str:
    """Extract the topic/title string from any pipeline state."""
    return state.get("title") or state.get("topic", "")


def is_approved(editor_output: str) -> bool:
    """Return True if the editor approved the draft."""
    return "APPROVE" in editor_output or "status: published" in editor_output


def _save_draft(state: dict, draft: str, revisions: str | None = None) -> None:
    """Write draft (and optional revision notes) to the drafts directory."""
    slug = slugify(_topic_key(state))
    drafts_dir = Path(state.get("output_dir", "./articles")) / "drafts"
    drafts_dir.mkdir(parents=True, exist_ok=True)
    (drafts_dir / f"{slug}.md").write_text(draft)
    if revisions is not None:
        (drafts_dir / f"{slug}-revisions.md").write_text(revisions)


# ── Standalone nodes (no pool needed) ────────────────────────────────────────


async def check_references_node(state: dict) -> dict:
    """Analyse reference quality of the current draft before editorial review.

    Runs HTTP checks on every [anchor](url) citation and classifies:
      - anchor text quality (descriptive vs weak)
      - domain authority tier (authoritative / credible / generic)
      - broken links

    Results are stored in state and included in the editor's prompt so the
    editor can enforce citation standards before approving.
    """
    draft = state.get("draft", "")
    if not draft:
        return {}

    report = await check_references(draft)
    report_md = format_reference_report(report)

    # Persist the report to disk alongside the draft
    slug = slugify(_topic_key(state))
    reports_dir = Path(state.get("output_dir", "./articles")) / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    (reports_dir / f"{slug}-refs.md").write_text(report_md)

    logger.info(
        "Reference check: %d refs, %d broken, %d weak anchors, score=%.2f",
        report.total, len(report.broken), len(report.weak_anchors), report.score,
    )

    return {
        "reference_report": report_md,
        "reference_issues": report.issues,
        "broken_links": [r.url for r in report.broken],
    }


def resolve_published_content(state: dict) -> str:
    """Extract article content from editor output, falling back to draft or disk.

    1. Try extracting published content from editor output.
    2. If extraction returned editor notes (not article text), fall back to
       the draft saved on disk (always the latest revision).
    3. Final fallback: use the draft from state.
    """
    content = extract_published_content(state["editor_output"], state["draft"])
    stripped = content.lstrip().lstrip("-").lstrip()
    if stripped.startswith(("**DECISION", "**Instructions", "## Critical", "Instructions for")):
        topic = _topic_key(state)
        output_dir = state.get("output_dir", "./articles")
        draft_path = Path(output_dir) / "drafts" / f"{slugify(topic)}.md"
        if draft_path.exists():
            logger.warning("Extraction returned editor notes; using draft from disk")
            content = draft_path.read_text()
    return content


async def publish_node(state: dict) -> dict:
    """Save approved content to published/, run final reference check, optionally deploy."""
    topic = _topic_key(state)
    output_dir = state.get("output_dir", "./articles")

    seo_output = state.get("seo_output", "")
    seo_slug = extract_seo_slug(seo_output) if seo_output else None
    slug = seo_slug or slugify(topic)

    published_dir = Path(output_dir) / "published"
    published_dir.mkdir(parents=True, exist_ok=True)
    content = resolve_published_content(state)
    (published_dir / f"{slug}.md").write_text(content)

    # Final reference quality check on published content (editor may have changed links)
    report = await check_references(content)
    report_md = format_reference_report(report)
    (published_dir / f"{slug}-refs.md").write_text(f"# References: {topic}\n\n{report_md}")
    broken = [r.url for r in report.broken]

    if report.issues:
        logger.warning("Publish reference issues: %s", report.issues)
    else:
        logger.info("Published reference check passed (score=%.2f)", report.score)

    if state.get("publish"):
        issues = validate_before_publish(content)
        if issues:
            logger.warning("Publish validation issues: %s", issues)
        has_no_refs = any("no_inline_refs" in i for i in report.issues)
        if has_no_refs:
            logger.error(
                "BLOCKED deploy: article has zero inline [anchor](url) citations. "
                "Content saved to published/ but NOT deployed."
            )
        else:
            publish_post(
                content,
                topic,
                git_push=state.get("git_push", False),
                deploy=True,
                seo_slug=seo_slug,
            )

    return {"broken_links": broken}


async def save_final_node(state: dict) -> dict:
    """Terminal node when revision limit is reached — draft already saved by revise node."""
    return {}


# ── Routing functions ────────────────────────────────────────────────────────


def should_revise_simple(state: dict) -> str:
    """Route after edit: publish / save_final / revise (no linkedin step)."""
    if state.get("approved"):
        return "publish"
    if state.get("revision_rounds", 0) >= MAX_REVISIONS:
        return "save_final"
    return "revise"


# ── Factory nodes (need pool) ────────────────────────────────────────────────


def make_write_node(
    pool: ModelPool,
    agent_name: str,
    prompt_fn: Callable[[dict], str],
    input_builder: Callable[[dict], str],
):
    """Create a write node. prompt_fn and input_builder receive the full state."""

    async def node(state: dict) -> dict:
        writer = Agent(agent_name, prompt_fn(state), pool.for_role(TeamRole.REASONER))
        draft = await writer.run(input_builder(state))
        _save_draft(state, draft)
        return {"draft": draft}

    return node


def build_editor_input(state: dict) -> str:
    """Assemble the full context document the editor reviews.

    Sections: Draft, Research Brief, SEO Strategy, Reference Quality (if available),
    Source Article (deep-dive mode only).
    """
    sections = [
        f"## Draft\n\n{state['draft']}",
        f"## Research Brief\n\n{state['research_output']}",
        f"## SEO Strategy\n\n{state['seo_output']}",
    ]

    if state.get("reference_report"):
        issues = state.get("reference_issues", [])
        if issues:
            issues_text = "\n".join(f"- \u26a0\ufe0f {i}" for i in issues)
            sections.append(
                f"## Reference Quality (MUST ADDRESS BEFORE APPROVING)\n\n"
                f"{issues_text}\n\n{state['reference_report']}"
            )
        else:
            sections.append(
                f"## Reference Quality\n\n"
                f"\u2713 No critical issues\n\n{state['reference_report']}"
            )

    if state.get("source_content"):
        sections.append(
            f"## Source Article (ground truth)\n\n{state['source_content']}"
        )

    return "\n\n---\n\n".join(sections)


def make_edit_node(
    pool: ModelPool,
    agent_name: str,
    prompt_fn: Callable[[dict], str],
):
    """Create an edit node.

    Includes reference quality report in the editor's context when available,
    so the editor can enforce citation standards as part of its review.
    """

    async def node(state: dict) -> dict:
        rounds = state.get("revision_rounds", 0)
        editor = Agent(
            f"{agent_name}-r{rounds}",
            prompt_fn(state),
            pool.for_role(TeamRole.REVIEWER),
        )
        editor_input = build_editor_input(state)
        editor_output = await editor.run(editor_input)
        return {"editor_output": editor_output, "approved": is_approved(editor_output)}

    return node


def make_revise_node(
    pool: ModelPool,
    agent_name: str,
    prompt_fn: Callable[[dict], str],
    context_builder: Callable[[dict], str],
):
    """Create a revise node.

    context_builder returns the research/source context section injected between
    the editor notes and the previous draft in the revision prompt.
    """

    async def node(state: dict) -> dict:
        rounds = state.get("revision_rounds", 0) + 1
        logger.info("Editor requested revision — round %d", rounds)
        writer = Agent(
            f"{agent_name}-r{rounds}",
            prompt_fn(state),
            pool.for_role(TeamRole.REASONER),
        )
        revision_input = (
            f"## Revision Notes from Editor\n\n{state['editor_output']}\n\n"
            f"---\n\n{context_builder(state)}\n\n"
            f"---\n\n## Previous Draft (revise this, don't start from scratch)\n\n{state['draft']}"
        )
        draft = await writer.run(revision_input)
        _save_draft(state, draft, revisions=state["editor_output"])
        return {"draft": draft, "revision_rounds": rounds}

    return node


def inject_flow_into_draft(draft: str, flow_component: str, section_heading: str | None) -> str:
    """Insert a <Flow> component after the target heading, or after the first paragraph."""
    if section_heading:
        pattern = re.compile(
            r"(^#{1,3}\s+" + re.escape(section_heading) + r"\s*$)",
            re.MULTILINE | re.IGNORECASE,
        )
        match = pattern.search(draft)
        if match:
            # Insert after the heading line, skipping any immediately following blank lines
            insert_pos = draft.find("\n", match.end()) + 1
            rest = draft[insert_pos:]
            leading = len(rest) - len(rest.lstrip("\n"))
            insert_pos += leading
            return draft[:insert_pos] + "\n" + flow_component + "\n\n" + draft[insert_pos:]

    # Fallback: insert after the first double newline (end of intro paragraph)
    idx = draft.find("\n\n")
    if idx != -1:
        return draft[: idx + 2] + flow_component + "\n\n" + draft[idx + 2 :]
    return draft + "\n\n" + flow_component


async def add_xyflow(pool: ModelPool, draft: str) -> str:
    """Call the xyflow agent, parse its <Flow> output, and embed it in the draft."""
    if not draft:
        return draft

    agent = Agent("article-xyflow", prompts.xyflow_diagram(), pool.for_role(TeamRole.FAST))
    result = await agent.run(draft)

    section_match = re.search(r"<!--\s*SECTION:\s*(.+?)\s*-->", result)
    start = result.find("<Flow")
    if start == -1:
        logger.warning("xyflow: no <Flow> component in LLM output")
        return draft

    end = result.rfind("/>")
    if end == -1 or end < start:
        logger.warning("xyflow: malformed <Flow> component (no closing />)")
        return draft

    flow_component = result[start : end + 2]
    section_heading = section_match.group(1).strip() if section_match else None
    return inject_flow_into_draft(draft, flow_component, section_heading)


def make_xyflow_node(pool: ModelPool):
    """Create a LangGraph node that generates a React Flow diagram and embeds it in the draft."""

    async def node(state: dict) -> dict:
        draft = state.get("draft", "")
        updated = await add_xyflow(pool, draft)
        if updated != draft:
            _save_draft(state, updated)
        return {"draft": updated}

    return node


