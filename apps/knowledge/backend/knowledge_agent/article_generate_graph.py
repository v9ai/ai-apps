"""Article-generate graph: research → outline → draft → review → revise (loop) → done.

Input (all resolved by the caller — container has no filesystem access to the repo):
    slug, topic: identifier + human-readable topic name
    category: lesson category string
    related_topics: comma-separated related slugs (from catalog)
    existing_articles: markdown bullet list of existing articles (for cross-refs)
    style_sample: ~2000-char excerpt of an existing article (style reference)

Output:
    final: complete markdown article
    word_count, revisions: quality metrics
    quality: {ok, issues, wordCount, codeBlocks, crossRefs}

Ports apps/knowledge/src/mastra/workflows/generate-article.ts. Filesystem save
moved to the CLI wrapper since the container can't write to the repo.
"""

from __future__ import annotations

import re
from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import make_llm
from .state import ArticleGenerateState

MAX_REVISIONS = 2
MIN_WORD_COUNT = 1500
MIN_CODE_BLOCKS = 2
MIN_CROSS_REFS = 1


RESEARCH_PROMPT = """You are a technical researcher preparing material for an AI engineering knowledge base article.

Topic: {topic}
Slug: {slug}

Research this topic thoroughly. Provide:
1. Core concepts and definitions
2. How it works technically (internals, data flow, architecture)
3. Key patterns and best practices used in production
4. Common pitfalls and how to avoid them
5. How this topic relates to: {related_topics}
6. Recent developments and current state of the art

Be specific and technical. Include concrete details that would be useful for an AI engineer.
Output your research as structured notes.
"""

OUTLINE_PROMPT = """You are an expert technical writer creating an outline for an AI engineering knowledge base article.

Topic: {topic}
Slug: {slug}
Category: {category}

Research notes:
{research}

Existing articles in this knowledge base for cross-referencing:
{existing_articles}

Create a detailed outline for this article. Follow this structure pattern:
1. Start with a `# Title` (concise, descriptive)
2. An opening paragraph (no heading) that explains what this is, why it matters, and sets context
3. `## Core Concepts` or similar foundational section
4. `## How It Works` / technical deep-dive sections with code examples
5. `## Patterns` / practical production patterns
6. `## Common Pitfalls` / what goes wrong
7. `## Comparison` with alternatives (if applicable)
8. Cross-references to related articles using markdown links like [Article Title](/slug)

For each section, note:
- Key points to cover
- Code examples needed (specify language: Python preferred, TypeScript where relevant)
- Diagrams or tables to include

Output the outline as markdown with section headers and bullet points under each.
"""

DRAFT_PROMPT = """You are an expert AI engineer and technical writer. Write a comprehensive knowledge base article.

Topic: {topic}
Slug: {slug}

Outline:
{outline}

Research notes:
{research}

Style reference (match this tone, depth, and format):
---
{style_sample}
---

Requirements:
- Start with `# Title` — a clear, descriptive title
- Opening paragraph: explain what this is, why it matters, cross-reference related articles
- Use `##` for major sections, `###` for subsections
- Include at least 3 real, working code examples (Python preferred, TypeScript where relevant)
- Use ```python or ```typescript code fences with proper syntax
- Include tables for comparisons using markdown pipe syntax
- Cross-reference at least 2 related articles as [Title](/slug) links
- Write for an intermediate-to-senior AI engineer audience
- Be specific and technical — no hand-waving or filler
- Target 2000-4000 words
- No frontmatter, no YAML headers — just pure markdown starting with `# Title`

Write the complete article now.
"""

REVIEW_PROMPT = """You are a senior technical editor reviewing an AI engineering knowledge base article.

Topic: {topic}
Draft:
{draft}

Review this article and produce an improved final version. Check for:
1. Technical accuracy — are claims correct? Are code examples valid?
2. Completeness — are important aspects of the topic missing?
3. Code quality — do examples use best practices? Are they runnable?
4. Structure — does the flow make sense? Are sections well-organized?
5. Cross-references — are links to related articles using correct /slug format?
6. Conciseness — remove filler, tighten prose, keep it dense with information
7. Tables and comparisons — are they clear and accurate?

Output the final, improved version of the full article (complete markdown, starting with `# Title`).
Do NOT output review notes — output the final article directly.
"""

REVISE_PROMPT = """You are an expert AI engineer and technical writer. An article you wrote failed quality checks.

Topic: {topic}

Current article:
{draft}

Issues to fix:
{issues}

Revise the article to address ALL listed issues. Maintain the existing structure and content but expand, add code examples, add cross-references, or restructure as needed.

Output the complete revised article (full markdown, starting with `# Title`).
"""


def check_quality(content: str) -> dict[str, Any]:
    words = [w for w in re.split(r"\s+", content) if w]
    word_count = len(words)
    code_blocks = len(re.findall(r"```\w+", content))
    cross_refs = len(re.findall(r"\]\(/[\w-]+\)", content))
    has_title = content.lstrip().startswith("# ")
    section_count = len(re.findall(r"^## ", content, flags=re.MULTILINE))

    issues: list[str] = []
    if word_count < MIN_WORD_COUNT:
        issues.append(f"Too short: {word_count} words (min {MIN_WORD_COUNT})")
    if code_blocks < MIN_CODE_BLOCKS:
        issues.append(f"Too few code examples: {code_blocks} (min {MIN_CODE_BLOCKS})")
    if cross_refs < MIN_CROSS_REFS:
        issues.append(f"Missing cross-references: {cross_refs} (min {MIN_CROSS_REFS})")
    if not has_title:
        issues.append("Missing # title on first line")
    if section_count < 3:
        issues.append("Fewer than 3 ## sections")

    return {
        "ok": len(issues) == 0,
        "issues": issues,
        "wordCount": word_count,
        "codeBlocks": code_blocks,
        "crossRefs": cross_refs,
    }


async def _ask(llm, prompt: str) -> str:
    resp = await llm.ainvoke([{"role": "user", "content": prompt}])
    return str(resp.content)


async def research_node(state: ArticleGenerateState) -> dict:
    llm = make_llm()
    content = await _ask(
        llm,
        RESEARCH_PROMPT.format(
            topic=state.get("topic", ""),
            slug=state.get("slug", ""),
            related_topics=state.get("related_topics", ""),
        ),
    )
    return {"research": content}


async def outline_node(state: ArticleGenerateState) -> dict:
    llm = make_llm()
    content = await _ask(
        llm,
        OUTLINE_PROMPT.format(
            topic=state.get("topic", ""),
            slug=state.get("slug", ""),
            category=state.get("category", ""),
            research=state.get("research", ""),
            existing_articles=state.get("existing_articles", ""),
        ),
    )
    return {"outline": content}


async def draft_node(state: ArticleGenerateState) -> dict:
    llm = make_llm()
    content = await _ask(
        llm,
        DRAFT_PROMPT.format(
            topic=state.get("topic", ""),
            slug=state.get("slug", ""),
            outline=state.get("outline", ""),
            research=state.get("research", ""),
            style_sample=state.get("style_sample", ""),
        ),
    )
    return {"draft": content}


async def review_node(state: ArticleGenerateState) -> dict:
    llm = make_llm()
    final = await _ask(
        llm,
        REVIEW_PROMPT.format(topic=state.get("topic", ""), draft=state.get("draft", "")),
    )
    quality = check_quality(final)
    return {"final": final, "quality": quality, "revision": 0}


async def revise_node(state: ArticleGenerateState) -> dict:
    quality = state.get("quality") or {}
    if quality.get("ok"):
        return {}
    issues = "\n".join(f"- {i}" for i in quality.get("issues", []))
    llm = make_llm()
    revised = await _ask(
        llm,
        REVISE_PROMPT.format(
            topic=state.get("topic", ""),
            draft=state.get("final", ""),
            issues=issues,
        ),
    )
    new_quality = check_quality(revised)
    return {
        "final": revised,
        "quality": new_quality,
        "revision": int(state.get("revision", 0)) + 1,
    }


def _after_revise(state: ArticleGenerateState) -> str:
    quality = state.get("quality") or {}
    revision = int(state.get("revision", 0))
    if quality.get("ok") or revision >= MAX_REVISIONS:
        return "finalize"
    return "revise"


async def finalize_node(state: ArticleGenerateState) -> dict:
    quality = state.get("quality") or {}
    return {
        "word_count": int(quality.get("wordCount", 0)),
        "revisions": int(state.get("revision", 0)),
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ArticleGenerateState)
    builder.add_node("research", research_node)
    builder.add_node("outline", outline_node)
    builder.add_node("draft", draft_node)
    builder.add_node("review", review_node)
    builder.add_node("revise", revise_node)
    builder.add_node("finalize", finalize_node)

    builder.add_edge(START, "research")
    builder.add_edge("research", "outline")
    builder.add_edge("outline", "draft")
    builder.add_edge("draft", "review")
    builder.add_conditional_edges(
        "review", _after_revise, {"revise": "revise", "finalize": "finalize"}
    )
    builder.add_conditional_edges(
        "revise", _after_revise, {"revise": "revise", "finalize": "finalize"}
    )
    builder.add_edge("finalize", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
