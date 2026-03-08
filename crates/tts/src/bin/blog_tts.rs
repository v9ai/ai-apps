//! Generate TTS audio from a vadim.blog article and optionally upload to R2.
//!
//! Usage:
//!   cargo run --bin blog_tts -- --slug ai-agent-reflection-loops
//!
//! Outputs WAV to crates/tts/{slug}.wav. Upload separately with:
//!   wrangler r2 object put longform-tts/vadim-blog/{slug}.wav --file {slug}.wav
//!
//! Env vars (required): DASHSCOPE_API_KEY
//! Env vars (optional): MAX_CHUNKS, CONCURRENCY (default: 8)

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

use tts::{Client, Voice};

fn blog_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/vadim.blog/blog")
}

/// Find an article's index.md by slug (searches frontmatter).
fn find_article(slug: &str) -> Option<PathBuf> {
    let needle = format!("slug: {slug}");
    for entry in walkdir(blog_root()) {
        if let Ok(content) = std::fs::read_to_string(&entry) {
            if content.contains(&needle) {
                return Some(entry);
            }
        }
    }
    None
}

/// Recursively find index.md files.
fn walkdir(root: PathBuf) -> Vec<PathBuf> {
    let mut results = Vec::new();
    let Ok(entries) = std::fs::read_dir(&root) else {
        return results;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            results.extend(walkdir(path));
        } else if path.file_name().is_some_and(|n| n == "index.md") {
            results.push(path);
        }
    }
    results
}

/// Strip YAML frontmatter (--- ... ---) from markdown.
fn strip_frontmatter(md: &str) -> &str {
    if !md.starts_with("---") {
        return md;
    }
    if let Some(end) = md[3..].find("\n---") {
        let after = end + 3 + 4; // skip past \n---
        md[after..].trim_start_matches('\n')
    } else {
        md
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::from_filename(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));

    let slug = std::env::args()
        .skip_while(|a| a != "--slug")
        .nth(1)
        .expect("usage: blog_tts --slug <article-slug>");

    // Find the article
    let article_path = find_article(&slug)
        .unwrap_or_else(|| panic!("Article with slug '{slug}' not found in blog/"));
    eprintln!("Found: {}", article_path.display());

    let raw = std::fs::read_to_string(&article_path)?;
    let text = strip_frontmatter(&raw);
    let word_count = text.split_whitespace().count();
    eprintln!("Article: {word_count} words");

    // Split into chunks
    let mut chunks = tts::split_text(text);
    eprintln!("Split into {} chunks", chunks.len());

    if let Ok(max) = std::env::var("MAX_CHUNKS") {
        if let Ok(n) = max.parse::<usize>() {
            chunks.truncate(n);
            eprintln!("Truncated to {n} chunks (MAX_CHUNKS)");
        }
    }

    let concurrency: usize = std::env::var("CONCURRENCY")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8);

    let api_key = std::env::var("DASHSCOPE_API_KEY").expect("DASHSCOPE_API_KEY must be set");
    let client = Client::new(api_key);

    let out_path = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("{slug}.wav"));

    let total = chunks.len();
    let completed = Arc::new(AtomicUsize::new(0));
    let completed_cb = completed.clone();
    let start = Instant::now();

    eprintln!("Synthesizing {total} chunks with concurrency={concurrency} ...");

    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;

    let upload_r2 = std::env::args().any(|a| a == "--upload");

    let wav = rt.block_on(async {
        let mut builder = client
            .long(Voice::Ethan)
            .chunks(chunks)
            .model("qwen3-tts-instruct-flash")
            .instructions(
                "Speak in a clear, calm, authoritative male American voice \
                 at a moderate pace, as if narrating a technical blog post. \
                 Use natural pauses between paragraphs and sections.",
            )
            .concurrency(concurrency)
            .retries(3)
            .on_progress(move |p| {
                let done = completed_cb.fetch_add(1, Ordering::Relaxed) + 1;
                eprintln!("  [{done:>3}/{}] chunk {:.1}s", p.total_chunks, p.duration_secs);
            })
            .output_file(&out_path);

        #[cfg(feature = "r2")]
        if upload_r2 {
            let r2_config = tts::R2Config::from_env().expect("R2 env vars required for --upload");
            builder = builder.upload_r2(r2_config, &slug);
        }

        let _ = upload_r2; // suppress unused warning when r2 feature is off
        builder.synthesize().await
    })?;

    let elapsed = start.elapsed();
    let duration_secs = (wav.len().saturating_sub(44)) as f64 / (24_000.0 * 2.0);
    let size_mb = wav.len() as f64 / 1_000_000.0;

    eprintln!();
    eprintln!("Done!");
    eprintln!("  Audio duration : {:.0}m {:.0}s", duration_secs / 60.0, duration_secs % 60.0);
    eprintln!("  File size      : {size_mb:.1} MB");
    eprintln!("  Wall time      : {:.0}s", elapsed.as_secs_f64());
    eprintln!("  Output         : {}", out_path.display());
    if !upload_r2 {
        eprintln!();
        eprintln!("Upload with --upload flag or manually:");
        eprintln!("  wrangler r2 object put longform-tts/vadim-blog/{slug}.wav --file {}", out_path.display());
    }

    Ok(())
}
