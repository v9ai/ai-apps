"""Graph node functions for content generation pipeline."""

from __future__ import annotations

import logging
import re
import time
from typing import Literal

from graph.client import chat
from graph.prompts import (
    RESEARCH_PROMPT,
    OUTLINE_PROMPT,
    DRAFT_PROMPT,
    REVIEW_PROMPT,
    REVISE_PROMPT,
)
from graph.state import (
    CONTENT_DIR,
    MAX_REVISIONS,
    ContentState,
    check_article_quality,
    get_related_topics,
    get_existing_articles,
    get_style_sample,
)

log = logging.getLogger(__name__)


async def research(state: ContentState) -> dict:
    t0 = time.time()
    prompt = RESEARCH_PROMPT.format(
        topic=state["topic"],
        slug=state["slug"],
        related_topics=get_related_topics(state["slug"]),
    )
    result, tokens = await chat(prompt)
    log.info("[research] %d chars, %d tok (%.1fs)", len(result), tokens, time.time() - t0)
    return {"research": result, "total_tokens": tokens}


async def outline(state: ContentState) -> dict:
    t0 = time.time()
    prompt = OUTLINE_PROMPT.format(
        topic=state["topic"],
        slug=state["slug"],
        category=state["category"],
        research=state["research"],
        existing_articles=get_existing_articles(),
    )
    result, tokens = await chat(prompt)
    log.info("[outline] %d chars, %d tok (%.1fs)", len(result), tokens, time.time() - t0)
    return {"outline": result, "total_tokens": tokens}


async def draft(state: ContentState) -> dict:
    t0 = time.time()
    style_sample = get_style_sample()
    prompt = DRAFT_PROMPT.format(
        topic=state["topic"],
        slug=state["slug"],
        outline=state["outline"],
        research=state["research"],
        style_sample=style_sample,
    )
    result, tokens = await chat(prompt)
    log.info("[draft] %d chars, %d tok (%.1fs)", len(result), tokens, time.time() - t0)
    return {"draft": result, "total_tokens": tokens}


async def review(state: ContentState) -> dict:
    t0 = time.time()
    prompt = REVIEW_PROMPT.format(
        topic=state["topic"],
        draft=state["draft"],
    )
    result, tokens = await chat(prompt)
    log.info("[review] %d chars, %d tok (%.1fs)", len(result), tokens, time.time() - t0)
    return {"final": result, "total_tokens": tokens}


def quality_check(state: ContentState) -> dict:
    content = state["final"]
    passed, issues = check_article_quality(content)
    revision = state.get("revision_count", 0)
    word_count = len(content.split())
    code_blocks = len(re.findall(r"```\\w+", content))
    cross_refs = len(re.findall(r"\]\(/[\w-]+\)", content))
    if passed:
        log.info("[quality] PASS (%d words, %d code, %d refs)", word_count, code_blocks, cross_refs)
    else:
        log.warning("[quality] FAIL rev=%d: %s", revision, ", ".join(issues))
    return {"quality_issues": issues, "revision_count": revision}


def route_after_quality(state: ContentState) -> Literal["save", "revise"]:
    revision = state.get("revision_count", 0)
    if not state.get("quality_issues") or revision >= MAX_REVISIONS:
        return "save"
    return "revise"


async def revise(state: ContentState) -> dict:
    t0 = time.time()
    issues_text = "\n".join(f"- {i}" for i in state["quality_issues"])
    prompt = REVISE_PROMPT.format(
        topic=state["topic"],
        draft=state["final"],
        issues=issues_text,
    )
    result, tokens = await chat(prompt)
    revision = state.get("revision_count", 0) + 1
    log.info("[revise] round %d (%d chars, %d tok, %.1fs)", revision, len(result), tokens, time.time() - t0)
    return {"final": result, "revision_count": revision, "total_tokens": tokens}


def save(state: ContentState) -> dict:
    out_path = CONTENT_DIR / f"{state['slug']}.md"
    out_path.write_text(state["final"])
    word_count = len(state["final"].split())
    log.info("[save] %s (%d words)", out_path, word_count)
    return {}
