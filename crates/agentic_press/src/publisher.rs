use anyhow::{Context, Result};
use async_trait::async_trait;
use chrono::Local;
use std::path::PathBuf;
use tokio::fs;
use tokio::process::Command;
use tracing::info;

use crate::slugify;

// ── Publisher trait ──────────────────────────────────────────────────────────

#[async_trait]
pub trait Publisher: Send + Sync {
    async fn publish_post(&self, blog_md: &str, topic: &str, deploy: bool) -> Result<PathBuf>;
}

// ── FsPublisher (default) ───────────────────────────────────────────────────

pub struct FsPublisher;

#[async_trait]
impl Publisher for FsPublisher {
    async fn publish_post(&self, blog_md: &str, topic: &str, deploy: bool) -> Result<PathBuf> {
        publish(blog_md, topic, deploy).await
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────

/// Resolve the blog posts directory.
/// Priority: `VADIM_BLOG_DIR` env var → sibling `apps/vadim.blog/blog` relative to the
/// manifest dir baked in at compile time (workspace root).
fn blog_root() -> PathBuf {
    if let Ok(v) = std::env::var("VADIM_BLOG_DIR") {
        return PathBuf::from(v);
    }
    // CARGO_MANIFEST_DIR = …/crates/agentic_press  →  go up two levels to workspace root
    let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..") // crates/
        .join(".."); // workspace root
    workspace.join("apps/vadim.blog/blog")
}

/// Publish a blog post to vadim.blog and optionally trigger a Vercel deploy.
///
/// `blog_md`   — raw markdown content produced by the Writer agent
/// `topic`     — topic string (used to derive slug if title is missing)
/// `vercel`    — if true, run `vercel deploy --prod` in the blog root
pub async fn publish(blog_md: &str, topic: &str, vercel: bool) -> Result<PathBuf> {
    // ── 1. Extract title from first `# …` heading ─────────────────────────
    let title = blog_md
        .lines()
        .find(|l| l.starts_with("# "))
        .map(|l| l.trim_start_matches("# ").trim().to_string())
        .unwrap_or_else(|| topic.to_string());

    // ── 2. Build slug & date prefix ────────────────────────────────────────
    let slug = slugify(&title);
    let today = Local::now().format("%m-%d").to_string();
    let date_full = Local::now().format("%Y-%m-%d").to_string();
    let year = Local::now().format("%Y").to_string();
    let dir_name = format!("{today}-{slug}");

    // ── 3. Strip the leading `# Title` so we don't duplicate it ───────────
    let body: String = blog_md
        .lines()
        .skip_while(|l| l.starts_with("# "))
        .collect::<Vec<_>>()
        .join("\n")
        .trim_start_matches('\n')
        .to_string();

    // ── 4. Build description from first non-empty paragraph ───────────────
    let description = body
        .lines()
        .find(|l| !l.trim().is_empty() && !l.starts_with('#'))
        .unwrap_or(&title)
        .trim()
        .chars()
        .take(200)
        .collect::<String>();

    // ── 5. Build tags from slug words ─────────────────────────────────────
    let tags: Vec<String> = slug
        .split('-')
        .filter(|w| w.len() > 3)
        .take(6)
        .map(|w| w.to_string())
        .collect();
    let tags_yaml = tags
        .iter()
        .map(|t| format!("  - {t}"))
        .collect::<Vec<_>>()
        .join("\n");

    // ── 6. Compose the full MDX file ──────────────────────────────────────
    let content = format!(
        r#"---
slug: {slug}
title: "{title}"
description: "{description}"
date: {date_full}
authors: [nicolad]
tags:
{tags_yaml}
---

{body}"#
    );

    // ── 7. Write to vadim.blog ─────────────────────────────────────────────
    let blog_dir = blog_root().join(&year).join(&dir_name);
    fs::create_dir_all(&blog_dir)
        .await
        .with_context(|| format!("Cannot create {}", blog_dir.display()))?;

    let post_path = blog_dir.join("index.md");
    fs::write(&post_path, &content)
        .await
        .with_context(|| format!("Cannot write {}", post_path.display()))?;

    info!("Published → {}", post_path.display());

    // ── 8. Vercel deploy ───────────────────────────────────────────────────
    if vercel {
        let blog_root = blog_root().join(".."); // apps/vadim.blog
        info!("Running vercel deploy --prod in {}", blog_root.display());
        let status = Command::new("vercel")
            .arg("deploy")
            .arg("--prod")
            .current_dir(&blog_root)
            .status()
            .await
            .context("vercel deploy failed to start")?;

        if !status.success() {
            anyhow::bail!("vercel deploy exited with status {status}");
        }
        info!("vercel deploy --prod completed");
    }

    Ok(post_path)
}

/// Git add + commit + push in a blog repository.
///
/// `repo_path` — path to the git repo root
/// `message`   — commit message
pub async fn git_commit_and_push(repo_path: &std::path::Path, message: &str) -> Result<()> {
    let add = Command::new("git")
        .args(["add", "."])
        .current_dir(repo_path)
        .status()
        .await?;
    if !add.success() {
        anyhow::bail!("git add failed");
    }

    let commit = Command::new("git")
        .args(["commit", "-m", message])
        .current_dir(repo_path)
        .status()
        .await?;
    if !commit.success() {
        info!("git commit exited non-zero (may be nothing to commit)");
    }

    let push = Command::new("git")
        .args(["push"])
        .current_dir(repo_path)
        .status()
        .await?;
    if !push.success() {
        anyhow::bail!("git push failed");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::slugify;

    #[test]
    fn test_slugify_shared() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("a--b"), "a-b");
    }

    #[test]
    fn test_title_extraction() {
        let md = "# My Great Post\n\nSome content here.";
        let title = md
            .lines()
            .find(|l| l.starts_with("# "))
            .map(|l| l.trim_start_matches("# ").trim().to_string())
            .unwrap_or_default();
        assert_eq!(title, "My Great Post");
    }

    #[test]
    fn test_frontmatter_format() {
        let slug = "test-post";
        let title = "Test Post";
        let description = "A test description";
        let date = "2026-03-05";
        let tags_yaml = "  - test\n  - post";

        let content = format!(
            r#"---
slug: {slug}
title: "{title}"
description: "{description}"
date: {date}
authors: [nicolad]
tags:
{tags_yaml}
---

Body here"#
        );

        assert!(content.contains("slug: test-post"));
        assert!(content.contains("title: \"Test Post\""));
        assert!(content.contains("date: 2026-03-05"));
        assert!(content.contains("authors: [nicolad]"));
        assert!(content.contains("tags:"));
    }

    #[test]
    fn test_description_truncated_at_200() {
        let long_paragraph = "x".repeat(300);
        let description: String = long_paragraph.chars().take(200).collect();
        assert_eq!(description.len(), 200);
    }

    #[test]
    fn test_title_fallback_when_no_heading() {
        let md = "No heading here.\n\nJust paragraphs.";
        let title = md
            .lines()
            .find(|l| l.starts_with("# "))
            .map(|l| l.trim_start_matches("# ").trim().to_string());
        assert!(title.is_none());
    }

    #[test]
    fn test_body_stripping_removes_title_line() {
        let md = "# My Title\n\nFirst paragraph.\n\nSecond paragraph.";
        let body: String = md
            .lines()
            .skip_while(|l| l.starts_with("# "))
            .collect::<Vec<_>>()
            .join("\n")
            .trim_start_matches('\n')
            .to_string();
        assert!(!body.contains("# My Title"));
        assert!(body.contains("First paragraph."));
    }

    #[test]
    fn test_tag_generation_filters_short_words() {
        let slug = "ai-is-a-big-deal";
        let tags: Vec<String> = slug
            .split('-')
            .filter(|w| w.len() > 3)
            .take(6)
            .map(|w| w.to_string())
            .collect();
        // "ai", "is", "a", "big" are <=3 chars, only "deal" passes
        assert_eq!(tags, vec!["deal"]);
    }

    #[test]
    fn test_tag_generation_caps_at_six() {
        let slug = "alpha-bravo-charlie-delta-echo-foxtrot-golf-hotel";
        let tags: Vec<String> = slug
            .split('-')
            .filter(|w| w.len() > 3)
            .take(6)
            .map(|w| w.to_string())
            .collect();
        assert_eq!(tags.len(), 6);
        assert!(!tags.contains(&"hotel".to_string()));
    }

    #[tokio::test]
    async fn test_publish_creates_file_in_tempdir() {
        let tmp = tempfile::TempDir::new().unwrap();
        std::env::set_var("VADIM_BLOG_DIR", tmp.path().to_str().unwrap());

        let blog_md = "# Test Post Title\n\nFirst paragraph of the post.\n\n## Section\n\nMore content.";
        let result = super::publish(blog_md, "fallback topic", false).await;

        std::env::remove_var("VADIM_BLOG_DIR");

        let post_path = result.unwrap();
        assert!(post_path.exists(), "published file should exist");
        let content = std::fs::read_to_string(&post_path).unwrap();
        assert!(content.contains("slug: test-post-title"));
        assert!(content.contains("title: \"Test Post Title\""));
        assert!(content.contains("authors: [nicolad]"));
        assert!(content.contains("First paragraph of the post."));
        // Title line should be stripped from body
        assert!(!content.contains("\n# Test Post Title\n"));
    }

    #[tokio::test]
    async fn test_publish_uses_topic_as_fallback_title() {
        let tmp = tempfile::TempDir::new().unwrap();
        std::env::set_var("VADIM_BLOG_DIR", tmp.path().to_str().unwrap());

        let blog_md = "No heading, just content.";
        let result = super::publish(blog_md, "My Fallback Topic", false).await;

        std::env::remove_var("VADIM_BLOG_DIR");

        let post_path = result.unwrap();
        let content = std::fs::read_to_string(&post_path).unwrap();
        assert!(content.contains("title: \"My Fallback Topic\""));
        assert!(content.contains("slug: my-fallback-topic"));
    }
}
