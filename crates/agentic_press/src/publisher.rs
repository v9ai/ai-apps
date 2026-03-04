use anyhow::{Context, Result};
use chrono::Local;
use std::path::PathBuf;
use tokio::fs;
use tokio::process::Command;
use tracing::info;

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

fn slugify(s: &str) -> String {
    let raw: String = s
        .chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect();
    raw.split('-')
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
