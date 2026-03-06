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

/// Unwrap a TTS result, skipping the test if the free quota is exhausted.
fn expect_or_skip<T>(result: tts::Result<T>, msg: &str) -> Option<T> {
    match result {
        Ok(v) => Some(v),
        Err(e) if e.is_quota_exhausted() => {
            eprintln!("SKIPPED: free quota exhausted");
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

/// with_language builder works correctly.
#[tokio::test]

async fn test_synthesize_with_language() {
    let Some(client) = try_client() else { return };

    let req = TtsRequest::new("Hola, buenos días.", Voice::Cherry)
        .with_language("es");
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

    let req = TtsRequest::new("Welcome to our service.", Voice::Ryan)
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
