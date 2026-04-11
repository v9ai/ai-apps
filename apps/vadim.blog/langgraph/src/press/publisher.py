"""Blog publishing."""

from __future__ import annotations

import os
import re
import subprocess
from datetime import datetime
from pathlib import Path

import yaml

from press import slugify


def blog_root() -> Path:
    """Resolve the blog posts directory."""
    if env_dir := os.environ.get("VADIM_BLOG_DIR"):
        return Path(env_dir)
    return Path(__file__).resolve().parents[3] / "blog"


def parse_frontmatter(md: str) -> tuple[dict, str]:
    """Parse YAML frontmatter using line-based delimiter matching.

    Returns (metadata_dict, body_after_frontmatter).
    """
    stripped = md.lstrip()
    if not stripped.startswith("---"):
        return {}, md
    m = re.match(r"^---[ \t]*\n(.*?\n)---[ \t]*\n", stripped, re.DOTALL)
    if not m:
        return {}, md
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        meta = {}
    return meta, stripped[m.end():]


def publish(
    blog_md: str,
    topic: str,
    deploy: bool = False,
    git_push: bool = False,
    audio_url: str | None = None,
    seo_slug: str | None = None,
) -> Path:
    """Publish a blog post to vadim.blog, optionally git push, then Vercel deploy."""
    # 0. Parse existing frontmatter so we don't double-wrap
    meta, body = parse_frontmatter(blog_md)

    # 1. Title: prefer frontmatter → first # heading → topic
    title = meta.get("title") or topic
    if not meta.get("title"):
        for line in body.splitlines():
            if line.startswith("# "):
                title = line.removeprefix("# ").strip()
                break

    # 2. Build slug & date (always use current date — LLM dates are unreliable)
    # Prefer SEO-agent slug → existing frontmatter slug → title-derived slug
    slug = seo_slug or meta.get("slug") or slugify(title)
    dt = datetime.now()
    today = dt.strftime("%m-%d")
    date_full = dt.strftime("%Y-%m-%d")
    year = dt.strftime("%Y")
    dir_name = f"{today}-{slug}"

    # 3. Strip the leading `# Title` so we don't duplicate it
    lines = body.splitlines()
    body_lines = []
    skipped = False
    for line in lines:
        if not skipped and line.startswith("# "):
            skipped = True
            continue
        body_lines.append(line)
    body = "\n".join(body_lines).lstrip("\n")

    # 4. Description: prefer frontmatter, then first non-empty paragraph
    description = meta.get("description") or title
    if not meta.get("description"):
        for line in body.splitlines():
            stripped_line = line.strip()
            if stripped_line and not stripped_line.startswith("#"):
                description = stripped_line[:200]
                break

    # 5. Tags: prefer frontmatter, then slug words as fallback
    if meta.get("tags") and isinstance(meta["tags"], list):
        tags = [str(t) for t in meta["tags"]]
    else:
        tags = [w for w in slug.split("-") if len(w) > 3][:6]
    tags_yaml = "\n".join(f"  - {t}" for t in tags)

    # 6. Inject audio player if URL provided
    if audio_url:
        body = f'<AudioPlayer src="{audio_url}" />\n\n{body}'

    # 7. Compose the full MDX file
    content = f"""---
slug: {slug}
title: "{title}"
description: "{description}"
date: {date_full}
authors: [v9ai]
tags:
{tags_yaml}
---

{body}"""

    # 8. Write to vadim.blog
    blog_dir = blog_root() / year / dir_name
    blog_dir.mkdir(parents=True, exist_ok=True)
    # Use .mdx when content contains JSX components (e.g. <Flow .../>)
    ext = ".mdx" if "<Flow" in content or "export const " in content else ".md"
    post_path = blog_dir / f"index{ext}"
    post_path.write_text(content)

    # 9. Git commit + push
    if git_push:
        blog_app = blog_root().parent  # apps/vadim.blog
        git_commit_and_push(blog_app, f"blog: {title}")

    # 10. Vercel deploy
    if deploy:
        blog_app = blog_root().parent  # apps/vadim.blog
        subprocess.run(
            ["vercel", "deploy", "--prod"],
            cwd=blog_app,
            check=True,
        )

    return post_path


def validate_before_publish(md: str) -> list[str]:
    """Pre-publish validation. Returns list of issues (empty = ok)."""
    from datetime import timedelta

    issues: list[str] = []
    meta, body = parse_frontmatter(md)

    # Double frontmatter: body itself starts with another ---
    if body.lstrip().startswith("---"):
        issues.append("double_frontmatter: content has nested frontmatter block")

    # Description sanity
    desc = str(meta.get("description", ""))
    if desc.strip() in ("", "---"):
        issues.append(f"bad_description: '{desc}'")

    # Tags sanity: all single lowercase words = likely slug fragments
    tags = meta.get("tags", [])
    if isinstance(tags, list) and len(tags) >= 4:
        slug_like = [t for t in tags if isinstance(t, str) and " " not in t and t == t.lower()]
        if len(slug_like) == len(tags):
            issues.append(f"slug_word_tags: {tags}")

    # Stale date: LLM may copy source article date instead of publish date
    date_val = meta.get("date")
    if date_val:
        try:
            dt = datetime.strptime(str(date_val), "%Y-%m-%d")
            if dt < datetime.now() - timedelta(days=7):
                issues.append(f"stale_date: {date_val} — likely from source article")
        except ValueError:
            pass

    # Inline links: body must contain markdown hyperlinks [text](url)
    inline_links = re.findall(r"\[.+?\]\(https?://[^)]+\)", body)
    if len(inline_links) == 0:
        issues.append(
            "no_inline_links: article body has zero markdown hyperlinks"
        )
    elif len(inline_links) < 3:
        issues.append(
            f"few_inline_links: only {len(inline_links)} link(s) found"
        )

    return issues


def git_commit_and_push(repo_path: Path, message: str) -> None:
    """Git add + commit + push in a blog repository."""
    subprocess.run(["git", "add", "."], cwd=repo_path, check=True)
    result = subprocess.run(["git", "commit", "-m", message], cwd=repo_path)
    if result.returncode != 0:
        pass  # Nothing to commit
    subprocess.run(["git", "push"], cwd=repo_path, check=True)
