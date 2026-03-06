# tts

Async Rust client for Qwen TTS via Alibaba DashScope API.

## Structure

```
src/
  client.rs    — Client::new(), synthesize(), synthesize_bytes(), long() builder
  types.rs     — TtsRequest, TtsResponse, Voice enum (17 voices)
  error.rs     — Error enum with is_retryable()/is_quota_exhausted() helpers
  long.rs      — SynthesizeLongBuilder (concurrent chunked synthesis with retry + progress)
  split.rs     — split_text() — sentence-aware chunking (~500 chars, under 600-char API limit)
  wav.rs       — WAV header constants, fix_header_sizes(), estimate_duration_secs()
  bin/interview_prep.rs — CLI binary that synthesizes apps/lh-ai-fs/TECHNICAL-REFERENCE-TTS.md
```

## API

```rust
let client = Client::new(api_key);

// Single request (≤600 chars)
let resp = client.synthesize(TtsRequest::new("Hello", Voice::Cherry)).await?;
let bytes = client.synthesize_bytes(TtsRequest::new("Hello", Voice::Cherry)).await?;

// Long-form (auto-splits, concurrent, retries)
let wav = client.long(Voice::Ethan)
    .text("Very long text...")
    .concurrency(8)
    .retries(3)
    .output_file("out.wav")
    .synthesize()
    .await?;

// With voice instructions (auto-selects qwen3-tts-instruct-flash)
client.long(Voice::Ethan)
    .text("...")
    .instructions("Speak calmly")
    .synthesize()
    .await?;
```

## Voices

Cherry, Ethan, Nofish, Jennifer, Ryan, Katerina, Elias, Jada, Dylan, Sunny, Li, Marcus, Roy, Peter, Rocky, Kiki, Eric

## Models

- `qwen3-tts-flash` — default
- `qwen3-tts-instruct-flash` — supports voice instructions via `.with_instructions()`

## Limits

- API input limit: 600 chars per request
- `split_text()` chunks at ~500 chars (sentence boundaries, then clause, then word)

## Env vars

- `DASHSCOPE_API_KEY` — required
- `MAX_CHUNKS` — optional, limit chunk count for testing
- `CONCURRENCY` — optional, max parallel requests (default: 8)
- `.env` file: `crates/tts/.env`

## Binary

```sh
cargo run --bin interview_prep
```

Reads `apps/lh-ai-fs/TECHNICAL-REFERENCE-TTS.md`, synthesizes with Ethan voice + instruct model, writes `crates/tts/interview_prep.wav`.
