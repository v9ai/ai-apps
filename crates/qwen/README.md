# qwen

Async Rust client for the Alibaba DashScope API — Qwen embeddings and chat completions via an OpenAI-compatible interface.

## Quick Start

```rust
use qwen::{Client, EmbeddingRequest, ChatMessage, ChatRequest};

let client = Client::new("your-dashscope-api-key");

// Embeddings (text-embedding-v4, 1024-dim, unit-normalized)
let embedding = client.embed_one("hello world").await?;

let batch = client.embed(EmbeddingRequest::batch(vec!["a", "b", "c"])).await?;

// Chat
let req = ChatRequest::new(
    "qwen-plus",
    vec![
        ChatMessage::system("You are helpful."),
        ChatMessage::user("What is Rust?"),
    ],
);
let resp = client.chat(req).await?;
println!("{}", resp.text().unwrap());
```

## Public API

### Client

```rust
pub struct Client { .. }
impl Client {
    pub fn new(api_key: impl Into<String>) -> Self
    pub fn with_base_url(self, url: impl Into<String>) -> Self  // for testing
    pub async fn embed(&self, req: EmbeddingRequest) -> Result<EmbeddingResponse>
    pub async fn embed_one(&self, text: impl Into<String>) -> Result<Vec<f32>>
    pub async fn chat(&self, req: ChatRequest) -> Result<ChatResponse>
}
```

**Base URL:** `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

### Embedding Types

```rust
pub struct EmbeddingRequest {
    pub model: String,                    // default: "text-embedding-v4"
    pub input: EmbeddingInput,            // Single(String) | Batch(Vec<String>)
    pub dimensions: Option<u32>,          // default: 1024
    pub encoding_format: Option<String>,
}

pub struct EmbeddingResponse { pub data: Vec<EmbeddingData>, pub model, pub usage }
pub struct EmbeddingData { pub embedding: Vec<f32>, pub index: u32 }
pub struct EmbeddingUsage { pub prompt_tokens: u32, pub total_tokens: u32 }
```

### Chat Types

```rust
pub struct ChatMessage { pub role: String, pub content: String }
impl ChatMessage {
    pub fn user(content: &str) -> Self
    pub fn system(content: &str) -> Self
}

pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub max_completion_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

pub struct ChatResponse { pub id, pub model, pub choices: Vec<ChatChoice>, pub usage }
impl ChatResponse {
    pub fn text(&self) -> Option<&str>  // first choice content
}

pub struct ChatUsage { pub prompt_tokens, pub completion_tokens, pub total_tokens }
```

### Errors

```rust
pub enum Error {
    Api { status: StatusCode, error: ApiError },  // structured DashScope error
    Http { status: StatusCode, body: String },     // fallback
    Network(reqwest::Error),
    Json(serde_json::Error),
}
```

## Dependencies

- `reqwest` 0.12 — HTTP client
- `serde` / `serde_json` — serialization
- `thiserror` 2 — error types

Standalone library — no sibling crate dependencies.

## License

MIT
