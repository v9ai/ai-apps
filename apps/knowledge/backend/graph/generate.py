"""LangGraph content generation pipeline for knowledge articles.

Uses deepseek-client from pypackages/deepseek for LLM calls.
Graph: research -> outline -> draft -> review -> quality_check -> save
                                 ^                    |
                                 └── (revise) ────────┘
"""

from __future__ import annotations

import asyncio
import os
import re
import time
from pathlib import Path
from typing import Literal, TypedDict

from deepseek_client import DeepSeekClient, ChatMessage, DeepSeekConfig
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from graph.prompts import (
    RESEARCH_PROMPT,
    OUTLINE_PROMPT,
    DRAFT_PROMPT,
    REVIEW_PROMPT,
    REVISE_PROMPT,
)

CONTENT_DIR = Path(__file__).resolve().parent.parent.parent / "content"

MAX_REVISIONS = 2
MIN_WORD_COUNT = 1500
MIN_CODE_BLOCKS = 2
MIN_CROSS_REFS = 1

# ── Existing articles helper ──────────────────────────────────────────

LESSON_SLUGS = [
    "transformer-architecture", "scaling-laws", "tokenization",
    "model-architectures", "inference-optimization", "pretraining-data",
    "embeddings", "prompt-engineering-fundamentals", "few-shot-chain-of-thought",
    "system-prompts", "structured-output", "prompt-optimization",
    "adversarial-prompting", "embedding-models", "vector-databases",
    "chunking-strategies", "retrieval-strategies", "advanced-rag",
    "rag-evaluation", "fine-tuning-fundamentals", "lora-adapters",
    "rlhf-preference", "dataset-curation", "continual-learning",
    "distillation-compression", "function-calling", "agent-architectures",
    "multi-agent-systems", "agent-memory", "code-agents", "agent-evaluation",
    "eval-fundamentals", "benchmark-design", "llm-as-judge",
    "human-evaluation", "red-teaming", "eval-frameworks-comparison",
    "deepeval-synthesizer", "llm-serving", "scaling-load-balancing",
    "cost-optimization", "observability", "edge-deployment", "ai-gateway",
    "constitutional-ai", "guardrails-filtering", "hallucination-mitigation",
    "bias-fairness", "ai-governance", "interpretability", "ci-cd-ai",
    "vision-language-models", "audio-speech-ai", "ai-for-code",
    "conversational-ai", "context-engineering", "search-recommendations",
    "production-patterns", "langgraph", "langgraph-red-teaming",
    "llamaindex", "ai-engineer-roadmap", "aws", "azure", "gcp",
    "docker", "kubernetes", "microservices", "ci-cd", "nodejs",
]

CATEGORIES = [
    (1, 7, "Foundations & Architecture"),
    (8, 13, "Prompting & In-Context Learning"),
    (14, 19, "RAG & Retrieval"),
    (20, 25, "Fine-tuning & Training"),
    (26, 31, "Agents & Tool Use"),
    (32, 38, "Evals & Testing"),
    (39, 44, "Infrastructure & Deployment"),
    (45, 51, "Safety & Alignment"),
    (52, 55, "Multimodal AI"),
    (56, 62, "Applied AI & Production"),
    (63, 70, "Cloud & DevOps"),
]


def _get_category(slug: str) -> str:
    idx = LESSON_SLUGS.index(slug) + 1 if slug in LESSON_SLUGS else 0
    for lo, hi, name in CATEGORIES:
        if lo <= idx <= hi:
            return name
    return "Applied AI & Production"


def _get_related_topics(slug: str) -> str:
    if slug not in LESSON_SLUGS:
        return ", ".join(LESSON_SLUGS[:10])
    idx = LESSON_SLUGS.index(slug)
    nearby = LESSON_SLUGS[max(0, idx - 3):idx] + LESSON_SLUGS[idx + 1:idx + 4]
    return ", ".join(nearby)


def _get_existing_articles() -> str:
    existing = []
    for s in LESSON_SLUGS:
        md = CONTENT_DIR / f"{s}.md"
        if md.exists():
            first_line = md.read_text().split("\n", 1)[0]
            title = first_line.lstrip("# ").strip() if first_line.startswith("#") else s
            existing.append(f"- [{title}](/{s})")
    return "\n".join(existing)


def _get_missing_slugs() -> list[str]:
    """Return slugs that don't have a content/*.md file yet."""
    return [s for s in LESSON_SLUGS if not (CONTENT_DIR / f"{s}.md").exists()]


def _get_style_sample() -> str:
    """Return a truncated snippet from an existing article as a style reference."""
    for slug in ["langgraph", "transformer-architecture", "embeddings"]:
        md = CONTENT_DIR / f"{slug}.md"
        if md.exists():
            text = md.read_text()
            # Return first ~2000 chars as a style reference
            return text[:2000]
    return ""


# ── Quality checks ───────────────────────────────────────────────────

def check_article_quality(content: str) -> tuple[bool, list[str]]:
    """Check if article meets minimum quality criteria. Returns (pass, issues)."""
    issues = []
    word_count = len(content.split())
    code_blocks = len(re.findall(r"```\w+", content))
    cross_refs = len(re.findall(r"\]\(/[\w-]+\)", content))
    has_title = content.strip().startswith("# ")
    has_sections = len(re.findall(r"^## ", content, re.MULTILINE)) >= 3

    if word_count < MIN_WORD_COUNT:
        issues.append(f"Too short: {word_count} words (min {MIN_WORD_COUNT})")
    if code_blocks < MIN_CODE_BLOCKS:
        issues.append(f"Too few code examples: {code_blocks} (min {MIN_CODE_BLOCKS})")
    if cross_refs < MIN_CROSS_REFS:
        issues.append(f"Missing cross-references: {cross_refs} (min {MIN_CROSS_REFS})")
    if not has_title:
        issues.append("Missing # title on first line")
    if not has_sections:
        issues.append("Fewer than 3 ## sections")

    return (len(issues) == 0, issues)


# ── State ─────────────────────────────────────────────────────────────

class ContentState(TypedDict):
    topic: str
    slug: str
    category: str
    research: str
    outline: str
    draft: str
    final: str
    revision_count: int
    quality_issues: list[str]
    total_tokens: int


# ── LLM (singleton per run) ──────────────────────────────────────────

_client: DeepSeekClient | None = None

MAX_RETRIES = 2
RETRY_DELAY = 5.0


def _get_config() -> DeepSeekConfig:
    return DeepSeekConfig(
        api_key=os.environ.get("DEEPSEEK_API_KEY"),
        base_url=os.environ.get("LLM_BASE_URL"),
        default_model=os.environ.get("LLM_MODEL", "deepseek-chat"),
        timeout=300.0,
    )


def get_client() -> DeepSeekClient:
    """Get or create the singleton DeepSeekClient."""
    global _client
    if _client is None:
        _client = DeepSeekClient(_get_config())
    return _client


async def close_client() -> None:
    """Close the singleton client."""
    global _client
    if _client is not None:
        await _client.close()
        _client = None


async def _chat(prompt: str, *, model: str | None = None) -> tuple[str, int]:
    """Single-turn chat with retry. Returns (content, total_tokens)."""
    client = get_client()
    messages = [ChatMessage(role="user", content=prompt)]
    last_err = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = await client.chat(messages, model=model)
            content = resp.choices[0].message.content
            tokens = resp.usage.total_tokens if resp.usage else 0
            return content, tokens
        except (TimeoutError, ConnectionError) as e:
            last_err = e
            if attempt < MAX_RETRIES:
                delay = RETRY_DELAY * (2 ** attempt)
                print(f"    retry {attempt + 1}/{MAX_RETRIES} after {delay:.0f}s ({type(e).__name__})")
                await asyncio.sleep(delay)
    raise last_err  # type: ignore[misc]


# ── Nodes (async for httpx) ──────────────────────────────────────────

async def research(state: ContentState) -> dict:
    """Gather research notes on the topic."""
    t0 = time.time()
    prompt = RESEARCH_PROMPT.format(
        topic=state["topic"],
        slug=state["slug"],
        related_topics=_get_related_topics(state["slug"]),
    )
    result, tokens = await _chat(prompt)
    print(f"  [research] {len(result)} chars, {tokens} tok ({time.time() - t0:.1f}s)")
    return {"research": result, "total_tokens": state.get("total_tokens", 0) + tokens}


async def outline(state: ContentState) -> dict:
    """Create article outline from research."""
    t0 = time.time()
    prompt = OUTLINE_PROMPT.format(
        topic=state["topic"],
        slug=state["slug"],
        category=state["category"],
        research=state["research"],
        existing_articles=_get_existing_articles(),
    )
    result, tokens = await _chat(prompt)
    print(f"  [outline] {len(result)} chars, {tokens} tok ({time.time() - t0:.1f}s)")
    return {"outline": result, "total_tokens": state.get("total_tokens", 0) + tokens}


async def draft(state: ContentState) -> dict:
    """Write the full article draft."""
    t0 = time.time()
    style_sample = _get_style_sample()
    prompt = DRAFT_PROMPT.format(
        topic=state["topic"],
        slug=state["slug"],
        outline=state["outline"],
        research=state["research"],
        style_sample=style_sample,
    )
    result, tokens = await _chat(prompt)
    print(f"  [draft] {len(result)} chars, {tokens} tok ({time.time() - t0:.1f}s)")
    return {"draft": result, "total_tokens": state.get("total_tokens", 0) + tokens}


async def review(state: ContentState) -> dict:
    """Review and improve the draft."""
    t0 = time.time()
    prompt = REVIEW_PROMPT.format(
        topic=state["topic"],
        draft=state["draft"],
    )
    result, tokens = await _chat(prompt)
    print(f"  [review] {len(result)} chars, {tokens} tok ({time.time() - t0:.1f}s)")
    return {"final": result, "total_tokens": state.get("total_tokens", 0) + tokens}


def quality_check(state: ContentState) -> dict:
    """Check article quality and decide if revision is needed."""
    content = state["final"]
    passed, issues = check_article_quality(content)
    revision = state.get("revision_count", 0)
    word_count = len(content.split())
    code_blocks = len(re.findall(r"```\w+", content))
    cross_refs = len(re.findall(r"\]\(/[\w-]+\)", content))
    if passed:
        print(f"  [quality] PASS ({word_count} words, {code_blocks} code, {cross_refs} refs)")
    else:
        print(f"  [quality] FAIL rev={revision}: {', '.join(issues)}")
    return {"quality_issues": issues, "revision_count": revision}


def route_after_quality(state: ContentState) -> Literal["save", "revise"]:
    """Route based on quality check: save if good, revise if issues remain."""
    revision = state.get("revision_count", 0)
    if not state.get("quality_issues") or revision >= MAX_REVISIONS:
        return "save"
    return "revise"


async def revise(state: ContentState) -> dict:
    """Revise the draft based on quality issues."""
    t0 = time.time()
    issues_text = "\n".join(f"- {i}" for i in state["quality_issues"])
    prompt = REVISE_PROMPT.format(
        topic=state["topic"],
        draft=state["final"],
        issues=issues_text,
    )
    result, tokens = await _chat(prompt)
    revision = state.get("revision_count", 0) + 1
    print(f"  [revise] round {revision} ({len(result)} chars, {tokens} tok, {time.time() - t0:.1f}s)")
    return {"final": result, "revision_count": revision, "total_tokens": state.get("total_tokens", 0) + tokens}


def save(state: ContentState) -> dict:
    """Write final markdown to content/ directory."""
    out_path = CONTENT_DIR / f"{state['slug']}.md"
    out_path.write_text(state["final"])
    word_count = len(state["final"].split())
    print(f"  [save] {out_path} ({word_count} words)")
    return {}


# ── Graph ─────────────────────────────────────────────────────────────

def _add_core_nodes(graph: StateGraph) -> None:
    """Add the shared nodes (everything except save) to a graph."""
    graph.add_node("research", research)
    graph.add_node("outline", outline)
    graph.add_node("draft", draft)
    graph.add_node("review", review)
    graph.add_node("quality_check", quality_check)
    graph.add_node("revise", revise)

    graph.add_edge(START, "research")
    graph.add_edge("research", "outline")
    graph.add_edge("outline", "draft")
    graph.add_edge("draft", "review")
    graph.add_edge("review", "quality_check")
    graph.add_edge("revise", "quality_check")


def build_graph(checkpointer=None):
    """Build the full content generation graph (with save).

    Args:
        checkpointer: Optional LangGraph checkpointer for pause/resume.
                      Pass MemorySaver() for in-memory checkpointing.
    """
    graph = StateGraph(ContentState)
    _add_core_nodes(graph)
    graph.add_node("save", save)
    graph.add_conditional_edges("quality_check", route_after_quality, {
        "save": "save",
        "revise": "revise",
    })
    graph.add_edge("save", END)
    return graph.compile(checkpointer=checkpointer)


def build_dry_graph():
    """Build graph without save node (for --dry-run)."""
    graph = StateGraph(ContentState)
    _add_core_nodes(graph)
    graph.add_conditional_edges("quality_check", route_after_quality, {
        "save": END,
        "revise": "revise",
    })
    return graph.compile()
