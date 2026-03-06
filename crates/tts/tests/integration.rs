//! Integration tests against the live DashScope TTS API.
//!
//! Uses `qwen3-tts-flash` (smallest/cheapest TTS model).
//!
//! All tests skip automatically when `DASHSCOPE_API_KEY` is not set.
//!
//! Run:
//!   cargo test --test integration -- --nocapture

use tts::{Client, TtsRequest, Voice};

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn try_client() -> Option<Client> {
    let _ = dotenvy::from_filename(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"),
    );
    let key = std::env::var("DASHSCOPE_API_KEY").ok()?;
    Some(Client::new(key))
}

/// Unwrap a TTS result, skipping the test if the free quota is exhausted or rate-limited.
fn expect_or_skip<T>(result: tts::Result<T>, msg: &str) -> Option<T> {
    match result {
        Ok(v) => Some(v),
        Err(e) if e.is_quota_exhausted() => {
            eprintln!("SKIPPED: free quota exhausted");
            None
        }
        Err(e) if e.is_rate_limited() => {
            eprintln!("SKIPPED: rate limited");
            None
        }
        Err(e) => panic!("{msg}: {e}"),
    }
}

// ─── Synthesize (non-streaming) ─────────────────────────────────────────────

/// Basic synthesis returns a response with an audio URL.
#[tokio::test]

async fn test_synthesize_returns_audio_url() {
    let Some(client) = try_client() else { return };

    let req = TtsRequest::new("Hello, this is a test.", Voice::Cherry);
    let Some(resp) = expect_or_skip(client.synthesize(req).await, "synthesize") else { return };

    assert!(!resp.request_id.is_empty(), "should have a request ID");
    let url = resp.output.audio.url.as_deref().expect("should have audio URL");
    assert!(url.starts_with("http"), "URL should be HTTP: {url}");
    eprintln!("audio URL: {url}");
}

/// Different voices produce valid responses.
#[tokio::test]

async fn test_synthesize_different_voice() {
    let Some(client) = try_client() else { return };

    let req = TtsRequest::new("Good morning, how are you?", Voice::Ethan);
    let Some(resp) = expect_or_skip(client.synthesize(req).await, "synthesize") else { return };

    assert!(resp.output.audio.url.is_some(), "should have audio URL");
}

/// Non-English text works (model auto-detects language).
#[tokio::test]

async fn test_synthesize_non_english() {
    let Some(client) = try_client() else { return };

    let req = TtsRequest::new("Hola, buenos dias. Como estas?", Voice::Cherry);
    let Some(resp) = expect_or_skip(client.synthesize(req).await, "synthesize") else { return };

    assert!(resp.output.audio.url.is_some());
}

// ─── Synthesize bytes ───────────────────────────────────────────────────────

/// synthesize_bytes downloads WAV audio data.
#[tokio::test]

async fn test_synthesize_bytes_returns_wav() {
    let Some(client) = try_client() else { return };

    let req = TtsRequest::new("Testing audio download.", Voice::Jennifer);
    let Some(bytes) = expect_or_skip(client.synthesize_bytes(req).await, "synthesize_bytes") else { return };

    assert!(!bytes.is_empty(), "audio bytes should not be empty");
    assert_eq!(
        &bytes[..4],
        b"RIFF",
        "expected WAV (RIFF) header, got: {:?}",
        &bytes[..4.min(bytes.len())]
    );
    eprintln!("downloaded {} bytes of WAV audio", bytes.len());
}

// ─── Instruct model ────────────────────────────────────────────────────────

/// qwen3-tts-instruct-flash with instructions.
#[tokio::test]

async fn test_synthesize_with_instructions() {
    let Some(client) = try_client() else { return };

    let req = TtsRequest::new("Welcome to our service.", Voice::Ethan)
        .with_model("qwen3-tts-instruct-flash")
        .with_instructions("Speak in a warm, friendly tone");
    let Some(resp) = expect_or_skip(client.synthesize(req).await, "synthesize") else { return };

    assert!(resp.output.audio.url.is_some());
    eprintln!("instruct model URL: {:?}", resp.output.audio.url);
}

// ─── Generate audio file ────────────────────────────────────────────────────

/// Synthesize speech and write a WAV file to crates/tts/test_output.wav.
#[tokio::test]
async fn test_generate_audio_file() {
    let Some(client) = try_client() else { return };

    let req = TtsRequest::new(
        "Welcome to the future of artificial intelligence. \
         Today we explore how large language models are transforming the way we build software, \
         communicate with machines, and solve problems that were once thought impossible. \
         From code generation to creative writing, from scientific research to everyday assistance, \
         these systems are opening doors we never knew existed. \
         The journey is just beginning, and the possibilities are truly endless.",
        Voice::Cherry,
    );
    let Some(bytes) = expect_or_skip(client.synthesize_bytes(req).await, "synthesize_bytes") else { return };

    assert_eq!(&bytes[..4], b"RIFF", "should be WAV format");

    let out_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("test_output.wav");
    std::fs::write(&out_path, &bytes).expect("failed to write WAV file");

    assert!(out_path.exists());
    assert!(out_path.metadata().unwrap().len() > 1000, "WAV file too small");
    eprintln!("wrote {} bytes to {}", bytes.len(), out_path.display());
}

// ─── Long audio (multi-chunk) ───────────────────────────────────────────────

/// Synthesize ~2 minutes of speech by chunking text and concatenating WAV data.
#[tokio::test]
async fn test_generate_long_audio() {
    let Some(client) = try_client() else { return };

    let chunks: Vec<String> = vec![
        "Welcome to this deep dive into the world of artificial intelligence. \
         Over the past decade, we have witnessed a remarkable transformation in how machines \
         understand and generate human language. What once seemed like science fiction has become \
         an everyday reality for millions of people around the world.",

        "The story begins with neural networks, mathematical models inspired by the human brain. \
         These networks learn patterns from vast amounts of data, gradually improving their ability \
         to recognize speech, translate languages, and even write poetry. The breakthrough came \
         with the transformer architecture, which revolutionized natural language processing.",

        "Large language models, trained on billions of words from books, websites, and academic papers, \
         can now engage in sophisticated conversations, answer complex questions, and assist with \
         creative and technical tasks. They represent a new kind of tool, one that augments human \
         capabilities rather than replacing them.",

        "In software engineering, these models help developers write code faster, debug tricky issues, \
         and explore unfamiliar codebases. They serve as tireless pair programmers, always ready to \
         suggest improvements or explain complex algorithms. The productivity gains have been \
         substantial across the industry.",

        "Beyond coding, artificial intelligence is transforming healthcare, education, and scientific \
         research. Doctors use AI to analyze medical images and predict patient outcomes. Teachers \
         leverage intelligent tutoring systems to personalize learning experiences. Scientists \
         employ machine learning to discover new materials and drugs.",

        "Of course, these advances come with important responsibilities. We must ensure that AI \
         systems are fair, transparent, and aligned with human values. Privacy, security, and \
         accountability remain critical concerns as these technologies become more powerful \
         and more deeply integrated into our daily lives.",

        "The creative potential of AI is equally exciting. Musicians, artists, and writers are \
         experimenting with generative models to explore new forms of expression. These tools \
         do not replace human creativity but rather expand the palette of possibilities, enabling \
         collaborations between human imagination and machine intelligence.",

        "Looking ahead, the future of artificial intelligence is full of promise and possibility. \
         As models become more capable and more efficient, they will unlock solutions to challenges \
         we have not yet imagined. The key is to develop these technologies thoughtfully, ensuring \
         that the benefits are shared broadly across society.",

        "Education will play a central role in this transition. By teaching people how to work \
         effectively with AI tools, we can empower individuals and communities to thrive in a \
         rapidly changing world. Digital literacy is no longer optional; it is essential for \
         participation in the modern economy.",

        "In conclusion, we stand at the beginning of a new era. The convergence of advanced AI, \
         abundant data, and powerful computing infrastructure is creating opportunities that were \
         unimaginable just a few years ago. Let us embrace this moment with curiosity, \
         responsibility, and optimism. Thank you for listening.",
    ].into_iter().map(String::from).collect();

    eprintln!("synthesizing {} chunks...", chunks.len());

    let template = TtsRequest::new("", Voice::Ethan)
        .with_model("qwen3-tts-instruct-flash")
        .with_instructions("Speak in a deep, resonant male American voice with a calm, authoritative tone");

    let result = client.synthesize_long(&chunks, template).await;
    let Some(bytes) = expect_or_skip(result, "synthesize_long") else { return };

    assert_eq!(&bytes[..4], b"RIFF", "should be WAV format");

    // At 24kHz 16-bit mono, 2 minutes = ~5.76MB of PCM data
    let duration_secs = (bytes.len() - 44) as f64 / (24000.0 * 2.0);
    eprintln!("total duration: {:.1}s ({:.1} MB)", duration_secs, bytes.len() as f64 / 1_000_000.0);
    assert!(duration_secs > 90.0, "expected at least 90s of audio, got {duration_secs:.1}s");

    let out_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("test_output_long.wav");
    std::fs::write(&out_path, &bytes).expect("failed to write WAV file");
    eprintln!("wrote {} to {}", format_size(bytes.len()), out_path.display());
}

fn format_size(bytes: usize) -> String {
    if bytes >= 1_000_000 {
        format!("{:.1} MB", bytes as f64 / 1_000_000.0)
    } else {
        format!("{:.0} KB", bytes as f64 / 1_000.0)
    }
}

// ─── Builder (long-form) ────────────────────────────────────────────────────

/// Auto-split long text via the builder, verify valid WAV output.
#[tokio::test]
async fn test_builder_auto_split() {
    let Some(client) = try_client() else { return };

    let long_text = "Welcome to this deep dive into the world of artificial intelligence. \
         Over the past decade, we have witnessed a remarkable transformation in how machines \
         understand and generate human language. What once seemed like science fiction has become \
         an everyday reality for millions of people around the world. \
         The story begins with neural networks, mathematical models inspired by the human brain. \
         These networks learn patterns from vast amounts of data, gradually improving their ability \
         to recognize speech, translate languages, and even write poetry. The breakthrough came \
         with the transformer architecture, which revolutionized natural language processing.";

    let result = client
        .long(Voice::Cherry)
        .text(long_text)
        .concurrency(4)
        .retries(2)
        .synthesize()
        .await;

    let Some(bytes) = expect_or_skip(result, "builder auto-split") else { return };

    assert_eq!(&bytes[..4], b"RIFF", "should be WAV format");
    let duration_secs = (bytes.len() - 44) as f64 / (24000.0 * 2.0);
    eprintln!("builder auto-split: {:.1}s, {} bytes", duration_secs, bytes.len());
    assert!(duration_secs > 5.0, "expected at least 5s of audio");
}

/// Builder with progress callback fires per chunk.
#[tokio::test]
async fn test_builder_with_progress() {
    let Some(client) = try_client() else { return };

    let progress_count = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let counter = progress_count.clone();

    let chunks = vec![
        "Hello, this is chunk one.".to_string(),
        "And this is chunk two.".to_string(),
    ];

    let result = client
        .long(Voice::Cherry)
        .chunks(chunks)
        .concurrency(2)
        .on_progress(move |p| {
            counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            eprintln!("  progress: [{}/{}] {:.1}s", p.chunk_index + 1, p.total_chunks, p.duration_secs);
        })
        .synthesize()
        .await;

    let Some(bytes) = expect_or_skip(result, "builder progress") else { return };

    assert_eq!(&bytes[..4], b"RIFF");
    let fired = progress_count.load(std::sync::atomic::Ordering::Relaxed);
    assert_eq!(fired, 2, "progress should fire for each chunk, fired {fired}");
}

/// Builder output_file writes a valid WAV to disk.
#[tokio::test]
async fn test_builder_output_file() {
    let Some(client) = try_client() else { return };

    let out_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("test_builder_output.wav");
    // Clean up from previous runs
    let _ = std::fs::remove_file(&out_path);

    let result = client
        .long(Voice::Ethan)
        .text("Testing file output from the builder. This should create a WAV file on disk.")
        .output_file(&out_path)
        .synthesize()
        .await;

    let Some(bytes) = expect_or_skip(result, "builder output_file") else { return };

    assert_eq!(&bytes[..4], b"RIFF");
    assert!(out_path.exists(), "output file should exist");
    let file_bytes = std::fs::read(&out_path).expect("read output file");
    assert_eq!(file_bytes.len(), bytes.len(), "file and returned bytes should match");

    // Cleanup
    let _ = std::fs::remove_file(&out_path);
    eprintln!("builder output_file: {} bytes", bytes.len());
}

// ─── Full document synthesis ────────────────────────────────────────────────

/// Synthesize the TECHNICAL-REFERENCE.md as audio using the long builder.
/// This is a large file (~75K words, ~217 chunks) — expect ~8+ hours of audio.
/// Set MAX_CHUNKS env var to limit (e.g., MAX_CHUNKS=10 for a quick test).
#[tokio::test]
async fn test_synthesize_technical_reference() {
    let Some(client) = try_client() else { return };

    let doc_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/lh-ai-fs/TECHNICAL-REFERENCE.md");
    let text = match std::fs::read_to_string(&doc_path) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("SKIPPED: cannot read {}: {e}", doc_path.display());
            return;
        }
    };

    // Strip markdown code blocks and headings for cleaner speech
    let cleaned: String = text
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            // Skip code fences and code blocks
            if trimmed.starts_with("```") { return false; }
            // Skip table separator lines
            if trimmed.starts_with("|---") || trimmed.starts_with("| ---") { return false; }
            // Skip horizontal rules
            if trimmed == "---" { return false; }
            // Skip pure markdown heading markers (keep the text)
            true
        })
        .map(|line| {
            // Strip leading # markers from headings
            let trimmed = line.trim_start();
            if trimmed.starts_with('#') {
                trimmed.trim_start_matches('#').trim()
            } else {
                line
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    let mut chunks = tts::split_text(&cleaned);
    eprintln!("split into {} chunks from {} words", chunks.len(), cleaned.split_whitespace().count());

    // Allow limiting chunks for quick testing
    if let Ok(max) = std::env::var("MAX_CHUNKS") {
        if let Ok(n) = max.parse::<usize>() {
            chunks.truncate(n);
            eprintln!("truncated to {n} chunks (MAX_CHUNKS)");
        }
    }

    let total = chunks.len();
    let start = std::time::Instant::now();

    let out_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("test_technical_reference.wav");

    let result = client
        .long(Voice::Ethan)
        .chunks(chunks)
        .model("qwen3-tts-instruct-flash")
        .instructions("Speak in a clear, calm, authoritative male voice at a moderate pace, as if delivering a technical lecture")
        .concurrency(8)
        .retries(3)
        .on_progress(move |p| {
            eprintln!(
                "  [{:>3}/{}] chunk {:.1}s",
                p.chunk_index + 1,
                total,
                p.duration_secs
            );
        })
        .output_file(&out_path)
        .synthesize()
        .await;

    let Some(bytes) = expect_or_skip(result, "synthesize technical reference") else { return };

    let elapsed = start.elapsed();
    let duration_secs = (bytes.len().saturating_sub(44)) as f64 / (24000.0 * 2.0);

    assert_eq!(&bytes[..4], b"RIFF", "should be WAV format");
    assert!(out_path.exists(), "output file should exist");

    eprintln!(
        "done: {:.1}s audio, {} file, {:.0}s elapsed",
        duration_secs,
        format_size(bytes.len()),
        elapsed.as_secs_f64()
    );
}

// ─── Error handling ─────────────────────────────────────────────────────────

/// Invalid API key returns an error.
#[tokio::test]

async fn test_invalid_api_key_returns_error() {
    let client = Client::new("invalid-key-000");

    let err = client
        .synthesize(TtsRequest::new("test", Voice::Cherry))
        .await
        .expect_err("bad key should fail");

    match err {
        tts::Error::Api { .. } | tts::Error::Http { .. } | tts::Error::QuotaExhausted => {}
        other => panic!("unexpected error variant: {other:?}"),
    }
}
