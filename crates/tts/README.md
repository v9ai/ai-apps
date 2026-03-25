# tts

Async Rust client for Qwen TTS (Text-to-Speech) via Alibaba DashScope API with long-form synthesis, chunking, concurrency control, retry logic, progress tracking, and optional Cloudflare R2 upload.

## Quick Start

```rust
use tts::{Client, Voice};

let client = Client::new("your-dashscope-api-key");

// Simple synthesis
let wav_bytes = client.synthesize_bytes(TtsRequest::new("Hello world", Voice::Ethan)).await?;

// Long-form with builder
let audio = client
    .long(Voice::Ethan)
    .text("Very long article text...")  // auto-splits into ~500-char chunks
    .concurrency(8)
    .retries(3)
    .on_progress(|p| println!("Chunk {}/{}", p.chunk + 1, p.total))
    .output_file("output.wav")
    .synthesize()
    .await?;
```

## Modules

| Module | Description |
|--------|-------------|
| `client` | DashScope HTTP client — `synthesize()`, `synthesize_bytes()`, `long()` builder |
| `types` | `TtsRequest`, `TtsResponse`, `Voice` enum (17 voices), model selection |
| `error` | Error taxonomy with `is_retryable()`, `is_rate_limited()`, `is_quota_exhausted()` |
| `split` | Text splitting respecting 600-char API limit (~500-char chunks at sentence/clause/word boundaries) |
| `long` | `SynthesizeLongBuilder` — concurrent multi-chunk synthesis with retry + progress |
| `wav` | WAV header manipulation — fix sizes, estimate duration (24kHz 16-bit mono) |
| `r2` | Cloudflare R2 upload integration (feature `r2`) |

## Voices

17 built-in voices: `Cherry`, `Ethan`, `Nofish`, `Jennifer`, `Ryan`, `Katerina`, `Elias`, `Jada`, `Dylan`, `Sunny`, `Li`, `Marcus`, `Roy`, `Peter`, `Rocky`, `Kiki`, `Eric`

## Long-Form Builder API

```rust
pub struct SynthesizeLongBuilder { .. }
impl SynthesizeLongBuilder {
    pub fn text(self, text: &str) -> Self           // auto-split
    pub fn chunks(self, chunks: Vec<String>) -> Self // pre-split
    pub fn model(self, model: &str) -> Self
    pub fn instructions(self, s: &str) -> Self       // voice instructions (uses instruct model)
    pub fn concurrency(self, n: usize) -> Self       // default: 8
    pub fn retries(self, n: usize) -> Self           // default: 3, exponential backoff
    pub fn on_progress(self, cb: impl Fn(Progress)) -> Self
    pub fn output_file(self, path: &str) -> Self
    pub fn upload_r2(self, config: R2Config, slug: &str) -> Self  // feature "r2"
    pub async fn synthesize(self) -> Result<Vec<u8>>
}
```

## Binaries

| Binary | Description |
|--------|-------------|
| `interview_prep` | Synthesizes `INTERVIEW-PREP-TTS.md` → WAV |
| `blog_tts` | Synthesizes blog articles by slug, optional `--upload` to R2 |
| `eval_harness` | Synthesizes `EVAL-HARNESS-TTS.md` → WAV |
| `knowledge_tts` | Synthesizes knowledge articles → WAV/MP3 with chapter JSON sidecar, `--all` and `--upload` flags |

## Environment Variables

| Var | Required | Description |
|-----|----------|-------------|
| `DASHSCOPE_API_KEY` | yes | DashScope API authentication |
| `MAX_CHUNKS` | no | Truncate chunk count (testing) |
| `CONCURRENCY` | no | Parallel API requests (default 8) |
| `R2_ACCOUNT_ID` | no | Cloudflare R2 account |
| `R2_ACCESS_KEY_ID` | no | R2 access key |
| `R2_SECRET_ACCESS_KEY` | no | R2 secret key |
| `R2_BUCKET_NAME` | no | R2 bucket name |
| `R2_PUBLIC_DOMAIN` | no | R2 public CDN domain |
| `R2_KEY_PREFIX` | no | R2 key prefix |

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `r2` | no | Cloudflare R2 upload via `rust-s3` |

## Implementation Details

- **Text splitting** — hierarchical: sentence (`.!?`) → clause (`,;:`) → word boundaries
- **Concurrent synthesis** — `buffer_unordered()` with index-based reordering
- **Retry** — exponential backoff: `2^(attempt-1)` seconds, capped at 16s, only on transient errors (429, 5xx)
- **WAV assembly** — keeps first chunk header (44 bytes), strips headers from subsequent chunks, recomputes RIFF sizes
- **Model selection** — `qwen3-tts-flash` by default; `qwen3-tts-instruct-flash` when voice instructions provided

## Dependencies

- `reqwest` 0.12 — HTTP client
- `futures` 0.3 — stream utilities
- `base64` 0.22 — audio encoding
- `regex` — text pattern matching
- `rust-s3` 0.35 (optional) — R2/S3 upload

Standalone — no sibling crate dependencies.
