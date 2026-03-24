"""Content generation state and quality checks."""

from __future__ import annotations

import operator
import re
from pathlib import Path
from typing import Annotated, TypedDict

CONTENT_DIR = Path(__file__).resolve().parent.parent.parent / "content"
ARTICLES_TS = CONTENT_DIR.parent / "lib" / "articles.ts"

MAX_REVISIONS = 2
MIN_WORD_COUNT = 1500
MIN_CODE_BLOCKS = 2
MIN_CROSS_REFS = 1


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
    total_tokens: Annotated[int, operator.add]


# ── Article catalog helpers ───────────────────────────────────────────

_lesson_slugs: list[str] | None = None
_categories: list[tuple[int, int, str]] | None = None


def _parse_slugs_from_ts() -> list[str]:
    if not ARTICLES_TS.exists():
        return sorted(p.stem for p in CONTENT_DIR.glob("*.md"))
    text = ARTICLES_TS.read_text()
    slugs = re.findall(r'"([\w-]+)"', text.split("const LESSON_SLUGS")[1].split("];")[0])
    return slugs


def _parse_categories_from_ts() -> list[tuple[int, int, str]]:
    if not ARTICLES_TS.exists():
        return [(1, 999, "General")]
    text = ARTICLES_TS.read_text()
    cat_block = text.split("CATEGORIES:")[1].split("];")[0] if "CATEGORIES:" in text else ""
    if not cat_block:
        cat_block = text.split("CATEGORIES")[1].split("];")[0] if "CATEGORIES" in text else ""
    results = []
    for m in re.finditer(r'\[(\d+),\s*(\d+),\s*"([^"]+)"\]', cat_block):
        results.append((int(m.group(1)), int(m.group(2)), m.group(3)))
    return results or [(1, 999, "General")]


def get_lesson_slugs() -> list[str]:
    global _lesson_slugs
    if _lesson_slugs is None:
        _lesson_slugs = _parse_slugs_from_ts()
    return _lesson_slugs


def get_categories() -> list[tuple[int, int, str]]:
    global _categories
    if _categories is None:
        _categories = _parse_categories_from_ts()
    return _categories


def get_category(slug: str) -> str:
    slugs = get_lesson_slugs()
    idx = slugs.index(slug) + 1 if slug in slugs else 0
    for lo, hi, name in get_categories():
        if lo <= idx <= hi:
            return name
    return "Applied AI & Production"


def get_related_topics(slug: str) -> str:
    slugs = get_lesson_slugs()
    if slug not in slugs:
        return ", ".join(slugs[:10])
    idx = slugs.index(slug)
    nearby = slugs[max(0, idx - 3):idx] + slugs[idx + 1:idx + 4]
    return ", ".join(nearby)


def get_existing_articles() -> str:
    existing = []
    for s in get_lesson_slugs():
        md = CONTENT_DIR / f"{s}.md"
        if md.exists():
            first_line = md.read_text().split("\n", 1)[0]
            title = first_line.lstrip("# ").strip() if first_line.startswith("#") else s
            existing.append(f"- [{title}](/{s})")
    return "\n".join(existing)


def get_missing_slugs() -> list[str]:
    return [s for s in get_lesson_slugs() if not (CONTENT_DIR / f"{s}.md").exists()]


def get_style_sample() -> str:
    for slug in ["langgraph", "transformer-architecture", "embeddings"]:
        md = CONTENT_DIR / f"{slug}.md"
        if md.exists():
            return md.read_text()[:2000]
    return ""


# ── Quality checks ───────────────────────────────────────────────────

def check_article_quality(content: str) -> tuple[bool, list[str]]:
    issues = []
    word_count = len(content.split())
    code_blocks = len(re.findall(r"```\w+", content))
    cross_ref_matches = re.findall(r"\]\(/[\w-]+\)", content)
    cross_refs = len(cross_ref_matches)
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

    slugs = set(get_lesson_slugs())
    for ref in cross_ref_matches:
        ref_slug = ref[3:-1]
        if ref_slug not in slugs and not (CONTENT_DIR / f"{ref_slug}.md").exists():
            issues.append(f"Broken link: /{ref_slug} (not in lesson list or content/)")

    return (len(issues) == 0, issues)
