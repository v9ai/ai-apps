//! Generate TTS audio from knowledge app articles with chapter navigation.
//!
//! Usage:
//!   cargo run --bin knowledge_tts -- --slug agent-01-transformer-architecture
//!   cargo run --bin knowledge_tts -- --all
//!   cargo run --bin knowledge_tts -- --slug agent-01-transformer-architecture --upload
//!
//! Env vars (required): DASHSCOPE_API_KEY
//! Env vars (optional): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_DOMAIN

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

use regex::Regex;
use serde::Serialize;
use tts::{Client, Voice};

fn content_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../apps/knowledge/content")
}

fn output_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge-output")
}

// ── Chapter types ──────────────────────────────────────────────────

#[derive(Debug)]
struct Chapter {
    title: String,
    clean_text: String,
}

#[derive(Debug, Serialize)]
struct ChapterMeta {
    index: usize,
    title: String,
    start_secs: f64,
    duration_secs: f64,
}

#[derive(Debug, Serialize)]
struct AudioSidecar {
    slug: String,
    title: String,
    voice: String,
    duration_secs: f64,
    file_size_bytes: u64,
    audio_url: String,
    chapters: Vec<ChapterMeta>,
}

// ── Markdown processing ────────────────────────────────────────────

/// Strip YAML frontmatter (--- ... ---) from markdown.
fn strip_frontmatter(md: &str) -> &str {
    if !md.starts_with("---") {
        return md;
    }
    if let Some(end) = md[3..].find("\n---") {
        let after = end + 3 + 4;
        md[after..].trim_start_matches('\n')
    } else {
        md
    }
}

/// Extract the H1 title from markdown.
fn extract_title(md: &str) -> String {
    for line in md.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") && !trimmed.starts_with("## ") {
            return trimmed.trim_start_matches("# ").to_string();
        }
    }
    "Untitled".to_string()
}

/// Parse markdown into chapters split on H2 headings.
fn parse_chapters(markdown: &str) -> Vec<Chapter> {
    let mut chapters = Vec::new();
    let mut current_title = "Introduction".to_string();
    let mut current_content = String::new();

    for line in markdown.lines() {
        if line.starts_with("## ") {
            let clean = strip_markdown(&current_content);
            if !clean.trim().is_empty() {
                chapters.push(Chapter {
                    title: current_title,
                    clean_text: clean,
                });
            }
            current_title = line.trim_start_matches("## ").to_string();
            current_content = String::new();
        } else {
            current_content.push_str(line);
            current_content.push('\n');
        }
    }

    let clean = strip_markdown(&current_content);
    if !clean.trim().is_empty() {
        chapters.push(Chapter {
            title: current_title,
            clean_text: clean,
        });
    }

    chapters
}

/// Strip markdown formatting to produce clean prose for TTS.
fn strip_markdown(text: &str) -> String {
    let mut s = text.to_owned();

    // Remove fenced code blocks
    let code_block = Regex::new(r"(?s)```.*?```").unwrap();
    s = code_block.replace_all(&s, "").to_string();

    // Remove LaTeX display math
    let display_math = Regex::new(r"(?s)\$\$.*?\$\$").unwrap();
    s = display_math.replace_all(&s, "").to_string();

    // Remove LaTeX inline math
    let inline_math = Regex::new(r"\$[^$]+\$").unwrap();
    s = inline_math.replace_all(&s, "").to_string();

    // Remove images
    let images = Regex::new(r"!\[[^\]]*\]\([^)]*\)").unwrap();
    s = images.replace_all(&s, "").to_string();

    // Convert links to just text
    let links = Regex::new(r"\[([^\]]*)\]\([^)]*\)").unwrap();
    s = links.replace_all(&s, "$1").to_string();

    // Remove heading markers, keep text as sentence
    let headings = Regex::new(r"(?m)^#{1,6}\s+(.+)$").unwrap();
    s = headings.replace_all(&s, "$1.").to_string();

    // Remove bold markers
    let bold = Regex::new(r"\*\*([^*]+)\*\*").unwrap();
    s = bold.replace_all(&s, "$1").to_string();

    // Remove italic markers
    let italic = Regex::new(r"\*([^*]+)\*").unwrap();
    s = italic.replace_all(&s, "$1").to_string();

    // Remove table rows (pipe-delimited lines)
    let tables = Regex::new(r"(?m)^\|.*\|$").unwrap();
    s = tables.replace_all(&s, "").to_string();

    // Remove table separator rows
    let table_sep = Regex::new(r"(?m)^\s*[-|:]+\s*$").unwrap();
    s = table_sep.replace_all(&s, "").to_string();

    // Remove bullet markers
    let bullets = Regex::new(r"(?m)^[\s]*[-*]\s+").unwrap();
    s = bullets.replace_all(&s, "").to_string();

    // Remove numbered list markers
    let numbered = Regex::new(r"(?m)^[\s]*\d+\.\s+").unwrap();
    s = numbered.replace_all(&s, "").to_string();

    // Collapse multiple blank lines
    let blank_lines = Regex::new(r"\n{3,}").unwrap();
    s = blank_lines.replace_all(&s, "\n\n").to_string();

    s.trim().to_owned()
}

/// Assemble multiple WAV byte arrays into a single WAV file.
fn assemble_wavs(wav_chunks: &[Vec<u8>]) -> Vec<u8> {
    let mut combined = Vec::new();
    for (i, chunk) in wav_chunks.iter().enumerate() {
        if i == 0 {
            combined.extend_from_slice(chunk);
        } else if chunk.len() > tts::wav::HEADER_SIZE {
            combined.extend_from_slice(&chunk[tts::wav::HEADER_SIZE..]);
        }
    }
    tts::wav::fix_header_sizes(&mut combined);
    combined
}

/// Convert WAV to MP3 using ffmpeg.
fn wav_to_mp3(wav_path: &Path, mp3_path: &Path) -> std::io::Result<()> {
    let status = Command::new("ffmpeg")
        .args([
            "-y",
            "-i",
            wav_path.to_str().unwrap(),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "2",
            mp3_path.to_str().unwrap(),
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()?;

    if !status.success() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("ffmpeg exited with status {status}"),
        ));
    }
    Ok(())
}

/// List all article slugs from the content directory.
fn all_slugs() -> Vec<String> {
    let dir = content_dir();
    let mut slugs: Vec<String> = std::fs::read_dir(&dir)
        .expect("cannot read content dir")
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name.strip_suffix(".md").map(|s| s.to_string())
        })
        .collect();
    slugs.sort();
    slugs
}

// ── Main ───────────────────────────────────────────────────────────

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::from_filename(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));

    let args: Vec<String> = std::env::args().collect();
    let upload_r2 = args.iter().any(|a| a == "--upload");
    let process_all = args.iter().any(|a| a == "--all");

    let slugs = if process_all {
        all_slugs()
    } else {
        let slug = args
            .iter()
            .skip_while(|a| a.as_str() != "--slug")
            .nth(1)
            .cloned()
            .expect("usage: knowledge_tts --slug <slug> | --all [--upload]");
        vec![slug]
    };

    let api_key = std::env::var("DASHSCOPE_API_KEY").expect("DASHSCOPE_API_KEY must be set");
    let client = Client::new(api_key);

    let concurrency: usize = std::env::var("CONCURRENCY")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8);

    let r2_domain = std::env::var("R2_PUBLIC_DOMAIN").unwrap_or_default();

    // Create output directory
    let out_dir = output_dir();
    std::fs::create_dir_all(&out_dir)?;

    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;

    for slug in &slugs {
        eprintln!("\n{}", "=".repeat(60));
        eprintln!("Processing: {slug}");
        eprintln!("{}", "=".repeat(60));

        let md_path = content_dir().join(format!("{slug}.md"));
        if !md_path.exists() {
            eprintln!("  SKIP: {md_path:?} not found");
            continue;
        }

        let raw = std::fs::read_to_string(&md_path)?;
        let text = strip_frontmatter(&raw);
        let article_title = extract_title(text);
        let chapters = parse_chapters(text);

        eprintln!("  Title   : {article_title}");
        eprintln!("  Chapters: {}", chapters.len());
        for (i, ch) in chapters.iter().enumerate() {
            let words = ch.clean_text.split_whitespace().count();
            eprintln!("    [{i}] {} ({words} words)", ch.title);
        }

        // Synthesize each chapter
        let start = Instant::now();
        let mut chapter_wavs: Vec<Vec<u8>> = Vec::new();
        let mut chapter_metas: Vec<ChapterMeta> = Vec::new();
        let mut cumulative_secs = 0.0_f64;

        for (i, chapter) in chapters.iter().enumerate() {
            eprintln!("\n  Synthesizing chapter {i}: \"{}\"", chapter.title);

            let chunks = tts::split_text(&chapter.clean_text);
            eprintln!("    {} chunks", chunks.len());

            if chunks.is_empty() {
                eprintln!("    SKIP: no text to synthesize");
                continue;
            }

            let total = chunks.len();
            let completed = Arc::new(AtomicUsize::new(0));
            let completed_cb = completed.clone();

            let wav = rt.block_on(async {
                client
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
                        eprintln!(
                            "    [{done:>3}/{total}] chunk {:.1}s",
                            p.duration_secs
                        );
                    })
                    .synthesize()
                    .await
            })?;

            let duration_secs = tts::wav::estimate_duration_secs(wav.len());
            eprintln!(
                "    Chapter duration: {:.0}m {:.0}s",
                duration_secs / 60.0,
                duration_secs % 60.0
            );

            chapter_metas.push(ChapterMeta {
                index: i,
                title: chapter.title.clone(),
                start_secs: cumulative_secs,
                duration_secs,
            });

            cumulative_secs += duration_secs;
            chapter_wavs.push(wav);
        }

        if chapter_wavs.is_empty() {
            eprintln!("  SKIP: no audio generated");
            continue;
        }

        // Concatenate all chapter WAVs
        eprintln!("\n  Concatenating {} chapter WAVs...", chapter_wavs.len());
        let full_wav = assemble_wavs(&chapter_wavs);
        let total_duration = tts::wav::estimate_duration_secs(full_wav.len());

        // Write WAV
        let wav_path = out_dir.join(format!("{slug}.wav"));
        std::fs::write(&wav_path, &full_wav)?;
        eprintln!("  WAV: {} ({:.1} MB)", wav_path.display(), full_wav.len() as f64 / 1_000_000.0);

        // Convert to MP3
        let mp3_path = out_dir.join(format!("{slug}.mp3"));
        eprintln!("  Converting to MP3...");
        wav_to_mp3(&wav_path, &mp3_path)?;
        let mp3_bytes = std::fs::read(&mp3_path)?;
        let mp3_size = mp3_bytes.len() as u64;
        eprintln!("  MP3: {} ({:.1} MB)", mp3_path.display(), mp3_size as f64 / 1_000_000.0);

        // Clean up WAV (keep only MP3)
        let _ = std::fs::remove_file(&wav_path);

        // Build audio URL
        let audio_url = if r2_domain.is_empty() {
            format!("https://REPLACE_DOMAIN/knowledge/{slug}.mp3")
        } else {
            format!("https://{r2_domain}/knowledge/{slug}.mp3")
        };

        // Write JSON sidecar
        let sidecar = AudioSidecar {
            slug: slug.clone(),
            title: article_title.clone(),
            voice: "ethan".to_string(),
            duration_secs: total_duration,
            file_size_bytes: mp3_size,
            audio_url,
            chapters: chapter_metas,
        };

        let json_path = out_dir.join(format!("{slug}.json"));
        let json_str = serde_json::to_string_pretty(&sidecar)?;
        std::fs::write(&json_path, &json_str)?;
        eprintln!("  JSON: {}", json_path.display());

        // Upload to R2
        #[cfg(feature = "r2")]
        if upload_r2 {
            eprintln!("  Uploading to R2...");
            let mut r2_config =
                tts::R2Config::from_env().expect("R2 env vars required for --upload");
            r2_config.key_prefix = "knowledge".to_string();

            rt.block_on(async {
                // Upload MP3
                let mp3_result =
                    tts::r2::upload_file(&r2_config, slug, "mp3", "audio/mpeg", &mp3_bytes)
                        .await?;
                eprintln!("    R2 MP3: {} ({} bytes)", mp3_result.key, mp3_result.size_bytes);
                if let Some(url) = &mp3_result.public_url {
                    eprintln!("    URL: {url}");
                }

                // Upload JSON
                let json_result = tts::r2::upload_file(
                    &r2_config,
                    slug,
                    "json",
                    "application/json",
                    json_str.as_bytes(),
                )
                .await?;
                eprintln!("    R2 JSON: {} ({} bytes)", json_result.key, json_result.size_bytes);

                Ok::<_, tts::Error>(())
            })?;
        }

        let _ = upload_r2; // suppress unused warning when r2 feature is off

        let elapsed = start.elapsed();
        eprintln!("\n  Done! ({slug})");
        eprintln!("    Audio duration : {:.0}m {:.0}s", total_duration / 60.0, total_duration % 60.0);
        eprintln!("    Wall time      : {:.0}s", elapsed.as_secs_f64());
    }

    eprintln!("\nAll done! Processed {} article(s).", slugs.len());
    Ok(())
}
