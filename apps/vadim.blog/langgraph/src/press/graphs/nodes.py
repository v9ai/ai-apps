"""Shared node implementations for editorial pipelines.

Deduplicates publish, save_final, linkedin, and edit-routing logic
used identically across journalism, deep_dive, and counter_article graphs.
"""

from __future__ import annotations

import logging
from pathlib import Path

from press import extract_published_content, slugify
from press.agents import Agent
from press.models import ModelPool, TeamRole
from press import prompts
from press.publisher import publish as publish_post, validate_before_publish

logger = logging.getLogger(__name__)

MAX_REVISIONS = 1


def _topic_key(state: dict) -> str:
    """Extract the topic/title string from any pipeline state."""
    return state.get("title") or state.get("topic", "")


# ── Standalone nodes (no pool needed) ────────────────────────────────────────


async def publish_node(state: dict) -> dict:
    """Save approved content to published/ and optionally deploy."""
    topic = _topic_key(state)
    output_dir = state.get("output_dir", "./articles")
    slug = slugify(topic)
    published_dir = Path(output_dir) / "published"
    published_dir.mkdir(parents=True, exist_ok=True)
    content = extract_published_content(state["editor_output"], state["draft"])
    (published_dir / f"{slug}.md").write_text(content)

    if state.get("publish"):
        issues = validate_before_publish(content)
        if issues:
            logger.warning("Publish validation issues: %s", issues)
        publish_post(
            content,
            topic,
            git_push=state.get("git_push", False),
            deploy=True,
        )

    return {}


async def save_final_node(state: dict) -> dict:
    """Save editor revisions when revision limit is reached."""
    topic = _topic_key(state)
    output_dir = state.get("output_dir", "./articles")
    slug = slugify(topic)
    drafts_dir = Path(output_dir) / "drafts"
    drafts_dir.mkdir(parents=True, exist_ok=True)
    (drafts_dir / f"{slug}-revisions.md").write_text(state["editor_output"])
    return {}


# ── Routing functions ────────────────────────────────────────────────────────


def should_revise_simple(state: dict) -> str:
    """Route after edit: publish / save_final / revise (no linkedin step)."""
    if state.get("approved"):
        return "publish"
    if state.get("revision_rounds", 0) >= MAX_REVISIONS:
        return "save_final"
    return "revise"


def should_revise_with_linkedin(state: dict) -> str:
    """Route after edit: linkedin_approved / linkedin_final / revise."""
    if state.get("approved"):
        return "linkedin_approved"
    if state.get("revision_rounds", 0) >= MAX_REVISIONS:
        return "linkedin_final"
    return "revise"


# ── Factory nodes (need pool) ────────────────────────────────────────────────


def make_linkedin_node(pool: ModelPool, agent_name: str):
    """Create a linkedin drafting node."""

    async def node(state: dict) -> dict:
        content = (
            extract_published_content(state["editor_output"], state["draft"])
            if state.get("approved")
            else state["draft"]
        )
        agent = Agent(agent_name, prompts.linkedin(), pool.for_role(TeamRole.FAST))
        linkedin = await agent.run(content)

        topic = _topic_key(state)
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(topic)
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}-linkedin.md").write_text(linkedin)

        return {"linkedin": linkedin}

    return node
