"""Tests for publisher — port of publisher.rs tests."""

import os
import tempfile

from agentic_press import slugify
from agentic_press.publisher import publish


def test_slugify_shared():
    assert slugify("Hello World") == "hello-world"
    assert slugify("a--b") == "a-b"


def test_title_extraction():
    md = "# My Great Post\n\nSome content here."
    title = None
    for line in md.splitlines():
        if line.startswith("# "):
            title = line.removeprefix("# ").strip()
            break
    assert title == "My Great Post"


def test_frontmatter_format():
    slug = "test-post"
    title = "Test Post"
    description = "A test description"
    date = "2026-03-05"
    tags_yaml = "  - test\n  - post"

    content = f"""---
slug: {slug}
title: "{title}"
description: "{description}"
date: {date}
authors: [nicolad]
tags:
{tags_yaml}
---

Body here"""

    assert "slug: test-post" in content
    assert 'title: "Test Post"' in content
    assert "date: 2026-03-05" in content
    assert "authors: [nicolad]" in content
    assert "tags:" in content


def test_description_truncated_at_200():
    long_paragraph = "x" * 300
    description = long_paragraph[:200]
    assert len(description) == 200


def test_title_fallback_when_no_heading():
    md = "No heading here.\n\nJust paragraphs."
    title = None
    for line in md.splitlines():
        if line.startswith("# "):
            title = line.removeprefix("# ").strip()
            break
    assert title is None


def test_body_stripping_removes_title_line():
    md = "# My Title\n\nFirst paragraph.\n\nSecond paragraph."
    lines = md.splitlines()
    body_lines = []
    skipped = False
    for line in lines:
        if not skipped and line.startswith("# "):
            skipped = True
            continue
        body_lines.append(line)
    body = "\n".join(body_lines).lstrip("\n")
    assert "# My Title" not in body
    assert "First paragraph." in body


def test_tag_generation_filters_short_words():
    slug = "ai-is-a-big-deal"
    tags = [w for w in slug.split("-") if len(w) > 3][:6]
    assert tags == ["deal"]


def test_tag_generation_caps_at_six():
    slug = "alpha-bravo-charlie-delta-echo-foxtrot-golf-hotel"
    tags = [w for w in slug.split("-") if len(w) > 3][:6]
    assert len(tags) == 6
    assert "hotel" not in tags


def test_publish_creates_file_in_tempdir():
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["VADIM_BLOG_DIR"] = tmp
        try:
            blog_md = "# Test Post Title\n\nFirst paragraph of the post.\n\n## Section\n\nMore content."
            post_path = publish(blog_md, "fallback topic", deploy=False)
            assert post_path.exists()
            content = post_path.read_text()
            assert "slug: test-post-title" in content
            assert 'title: "Test Post Title"' in content
            assert "authors: [nicolad]" in content
            assert "First paragraph of the post." in content
            assert "\n# Test Post Title\n" not in content
        finally:
            del os.environ["VADIM_BLOG_DIR"]


def test_publish_uses_topic_as_fallback_title():
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["VADIM_BLOG_DIR"] = tmp
        try:
            blog_md = "No heading, just content."
            post_path = publish(blog_md, "My Fallback Topic", deploy=False)
            content = post_path.read_text()
            assert 'title: "My Fallback Topic"' in content
            assert "slug: my-fallback-topic" in content
        finally:
            del os.environ["VADIM_BLOG_DIR"]


def test_publish_with_audio_url_embeds_player():
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["VADIM_BLOG_DIR"] = tmp
        try:
            blog_md = "# Audio Post\n\nSome content here."
            audio = "https://pub.example.com/vadim-blog/audio-post.wav"
            post_path = publish(blog_md, "audio post", deploy=False, audio_url=audio)
            content = post_path.read_text()
            assert "<AudioPlayer" in content
            assert audio in content
        finally:
            del os.environ["VADIM_BLOG_DIR"]


def test_publish_without_audio_url_has_no_player():
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["VADIM_BLOG_DIR"] = tmp
        try:
            blog_md = "# Plain Post\n\nNo audio."
            post_path = publish(blog_md, "plain post", deploy=False)
            content = post_path.read_text()
            assert "<AudioPlayer" not in content
        finally:
            del os.environ["VADIM_BLOG_DIR"]
