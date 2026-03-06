//! Synthesize the TTS-optimized interview prep script to a WAV file.
//!
//! Usage:
//!   DASHSCOPE_API_KEY=... cargo run --bin interview_prep
//!
//! Env vars:
//!   DASHSCOPE_API_KEY  — required
//!   MAX_CHUNKS         — optional, limit chunk count for testing (e.g. MAX_CHUNKS=5)
//!   CONCURRENCY        — optional, max parallel API requests (default: 8)

use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

use tts::{Client, Voice};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env from crate root
    let _ = dotenvy::from_filename(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));

    let api_key =
        std::env::var("DASHSCOPE_API_KEY").expect("DASHSCOPE_API_KEY must be set");

    let client = Client::new(api_key);

    // Read the TTS-optimized markdown
    let doc_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/lh-ai-fs/TECHNICAL-REFERENCE-TTS.md");
    let text = std::fs::read_to_string(&doc_path)?;

    let word_count = text.split_whitespace().count();
    eprintln!("Read {} words from {}", word_count, doc_path.display());

    // Split into chunks
    let mut chunks = tts::split_text(&text);
    eprintln!("Split into {} chunks", chunks.len());

    // Optional truncation for testing
    if let Ok(max) = std::env::var("MAX_CHUNKS") {
        if let Ok(n) = max.parse::<usize>() {
            chunks.truncate(n);
            eprintln!("Truncated to {} chunks (MAX_CHUNKS)", n);
        }
    }

    let concurrency: usize = std::env::var("CONCURRENCY")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8);

    let total = chunks.len();
    let completed = Arc::new(AtomicUsize::new(0));
    let completed_cb = completed.clone();
    let start = Instant::now();

    let out_path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("interview_prep.wav");

    eprintln!(
        "Synthesizing {} chunks with concurrency={} ...",
        total, concurrency
    );

    // Build a tokio runtime manually (avoids needing tokio/macros feature)
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;

    let wav = rt.block_on(async {
        client
            .long(Voice::Ethan)
            .chunks(chunks)
            .model("qwen3-tts-instruct-flash")
            .instructions(
                "Speak in a clear, calm, authoritative male American voice \
                 at a moderate pace, as if coaching someone through interview \
                 preparation. Use natural pauses between paragraphs.",
            )
            .concurrency(concurrency)
            .retries(3)
            .on_progress(move |p| {
                let done =
                    completed_cb.fetch_add(1, Ordering::Relaxed) + 1;
                eprintln!(
                    "  [{:>3}/{}] chunk {:.1}s",
                    done, p.total_chunks, p.duration_secs
                );
            })
            .output_file(&out_path)
            .synthesize()
            .await
    })?;

    let elapsed = start.elapsed();
    let duration_secs =
        (wav.len().saturating_sub(44)) as f64 / (24_000.0 * 2.0);
    let size_mb = wav.len() as f64 / 1_000_000.0;

    eprintln!();
    eprintln!("Done!");
    eprintln!(
        "  Audio duration : {:.0}m {:.0}s",
        duration_secs / 60.0,
        duration_secs % 60.0
    );
    eprintln!("  File size      : {:.1} MB", size_mb);
    eprintln!("  Wall time      : {:.0}s", elapsed.as_secs_f64());
    eprintln!(
        "  Output         : {}",
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("interview_prep.wav")
            .display()
    );

    Ok(())
}
