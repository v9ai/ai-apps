# legal-inference

Local Candle-based inference server providing OpenAI-compatible HTTP endpoints for embedding generation (BGE-large) and LLM chat completions (Phi-3.5-mini), optimized for Metal GPU on Apple Silicon.

## Endpoints

```
GET  /health               — Server status, device info, loaded models
POST /v1/embeddings        — OpenAI-compatible embedding API
POST /v1/similarity        — Cosine similarity between query and documents
POST /v1/chat/completions  — OpenAI-compatible chat completion API
```

## Models

| Model | Purpose | Format | Default |
|-------|---------|--------|---------|
| BAAI/bge-large-en-v1.5 | Embeddings | safetensors | 1024-dim, L2-normalized |
| bartowski/Phi-3.5-mini-instruct-GGUF | Chat | Q4_K_M GGUF | `<\|system\|>`/`<\|user\|>`/`<\|assistant\|>` format |

## Modules

| Module | Description |
|--------|-------------|
| `config` | `Config` struct (port, model IDs) + `select_device()` — Metal > CUDA > CPU |
| `models::embedding` | `Embedder` — BERT loading, batch embed, mean pooling + L2 normalization |
| `models::llm` | `LocalLlm` — GGUF quantized Phi-3.5, autoregressive generation with top-p + temperature |
| `state` | `AppState` — `Arc<Embedder>` + `Arc<Mutex<LocalLlm>>` shared across handlers |
| `routes::health` | Health check with model status |
| `routes::embed` | `/v1/embeddings` (single + batch) and `/v1/similarity` (cosine) |
| `routes::chat` | `/v1/chat/completions` with JSON mode support |

## Configuration

All via environment variables:

| Var | Default | Description |
|-----|---------|-------------|
| `PORT` | `9877` | Server port |
| `EMBED_MODEL` | `BAAI/bge-large-en-v1.5` | Embedding model HF repo |
| `LLM_MODEL` | `bartowski/Phi-3.5-mini-instruct-GGUF` | LLM model HF repo |
| `LLM_FILE` | `Phi-3.5-mini-instruct-Q4_K_M.gguf` | GGUF filename |

## Usage

```bash
cargo run -p legal-inference --features metal
# Server starts on 0.0.0.0:9877

# Embed text
curl -X POST http://localhost:9877/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input": "contract breach liability"}'

# Chat
curl -X POST http://localhost:9877/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Explain force majeure"}]}'

# Similarity
curl -X POST http://localhost:9877/v1/similarity \
  -H "Content-Type: application/json" \
  -d '{"query": "negligence", "documents": ["breach of duty", "contract terms"]}'
```

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `metal` | yes | Apple Metal GPU backend |
| `cuda` | no | NVIDIA CUDA GPU backend |

## Concurrency Model

- **Embedder** — `Arc<Embedder>` (immutable, concurrent reads)
- **LLM** — `Arc<Mutex<LocalLlm>>` (mutable generation, single-threaded access)
- Blocking inference runs on Tokio thread pool to avoid blocking async executor

## Key Dependencies

- `candle-core`, `candle-nn`, `candle-transformers` 0.8 — ML inference
- `axum` 0.8 + `tower-http` — HTTP server with CORS
- `hf-hub` 0.4 — model downloading
- `tokenizers` 0.21 — BERT + Phi tokenization

Standalone — no sibling crate dependencies.
