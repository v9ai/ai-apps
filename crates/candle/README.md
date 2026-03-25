# candle

Metal-accelerated ML inference library wrapping Hugging Face [Candle](https://github.com/huggingface/candle) for BERT-based text embeddings with an optional HTTP server.

## Modules

| Module | Description |
|--------|-------------|
| `device` | Hardware selection — prefers Metal > CUDA > CPU |
| `embeddings` | `EmbeddingModel` — loads BERT from Hugging Face Hub, mean-pooled embeddings |
| `error` | `Error` enum (`Candle`, `Tokenizer`, `ModelNotFound`, `Io`) and `Result<T>` alias |

## Public API

```rust
// Device selection
pub fn best_device() -> Result<Device>

// Embedding model
pub struct EmbeddingModel { .. }
impl EmbeddingModel {
    pub fn from_hf(repo_id: &str, device: &Device) -> Result<Self>
    pub fn embed(&self, texts: &[&str]) -> Result<Tensor>      // batched, mean-pooled
    pub fn embed_one(&self, text: &str) -> Result<Vec<f32>>     // single text → f32 vec
}
```

## Binary: `embed-server` (feature `server`)

Standalone HTTP embedding API (Axum), OpenAI-compatible response format.

```
POST /embed   — {"input": "text"} or {"input": ["a","b"]}
GET  /health  — returns "ok"
```

**Default model:** `BAAI/bge-large-en-v1.5` (1024-dim)
**Default port:** `9999`

```bash
cargo run --bin embed-server --features server -- --port 9999 --model BAAI/bge-large-en-v1.5
```

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `metal` | yes | Apple Metal GPU backend |
| `cuda` | no | NVIDIA CUDA GPU backend |
| `server` | no | Enables `embed-server` binary (axum + tokio) |

## Dependencies

Standalone — no sibling crate dependencies.

- `candle-core`, `candle-nn`, `candle-transformers` 0.8
- `hf-hub` 0.3 — model downloading
- `tokenizers` 0.21 — BERT tokenization
- `axum` 0.8 (optional) — HTTP server
