"""Blog publishing — replaces publisher.rs."""

from __future__ import annotations

import os
import subprocess
from datetime import datetime
from pathlib import Path

from agentic_press import slugify


def blog_root() -> Path:
    """Resolve the blog posts directory."""
    if env_dir := os.environ.get("VADIM_BLOG_DIR"):
        return Path(env_dir)
    return Path(__file__).resolve().parents[4] / "blog"


def publish(
    blog_md: str,
    topic: str,
    deploy: bool = False,
    git_push: bool = False,
    audio_url: str | None = None,
) -> Path:
    """Publish a blog post to vadim.blog, optionally git push, then Vercel deploy."""
    # 1. Extract title from first `# ` heading
    title = topic
    for line in blog_md.splitlines():
        if line.startswith("# "):
            title = line.removeprefix("# ").strip()
            break

    # 2. Build slug & date prefix
    slug = slugify(title)
    now = datetime.now()
    today = now.strftime("%m-%d")
    date_full = now.strftime("%Y-%m-%d")
    year = now.strftime("%Y")
    dir_name = f"{today}-{slug}"

    # 3. Strip the leading `# Title` so we don't duplicate it
    lines = blog_md.splitlines()
    body_lines = []
    skipped = False
    for line in lines:
        if not skipped and line.startswith("# "):
            skipped = True
            continue
        body_lines.append(line)
    body = "\n".join(body_lines).lstrip("\n")

    # 4. Build description from first non-empty paragraph
    description = title
    for line in body.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            description = stripped[:200]
            break

    # 5. Build tags from slug words
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
authors: [nicolad]
tags:
{tags_yaml}
---

{body}"""

    # 8. Write to vadim.blog
    blog_dir = blog_root() / year / dir_name
    blog_dir.mkdir(parents=True, exist_ok=True)
    post_path = blog_dir / "index.md"
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


def git_commit_and_push(repo_path: Path, message: str) -> None:
    """Git add + commit + push in a blog repository."""
    subprocess.run(["git", "add", "."], cwd=repo_path, check=True)
    result = subprocess.run(["git", "commit", "-m", message], cwd=repo_path)
    if result.returncode != 0:
        pass  # Nothing to commit
    subprocess.run(["git", "push"], cwd=repo_path, check=True)
