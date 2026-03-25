# deepseek

Shared Rust client for the DeepSeek API with pluggable HTTP transport, agentic tool-use loop, and in-memory caching.

## Modules

| Module | Feature | Description |
|--------|---------|-------------|
| `types` | — | Core API types: messages, requests, responses, models |
| `error` | — | `DeepSeekError` enum and `Result<T>` alias |
| `client` | — | `HttpClient` trait + generic `DeepSeekClient<H>` |
| `reqwest_client` | `reqwest-client` | Native reqwest transport, `client_from_env()`, `reason()`, `reason_with_retry()` |
| `wasm` | `wasm` | Cloudflare Workers fetch-based transport |
| `agent` | `agent` | `Tool` trait, `AgentBuilder`, `DeepSeekAgent` — multi-turn tool-use loop |
| `cache` | `cache` | TTL cache + broadcast-based in-flight deduplication |

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `reqwest-client` | yes | Native HTTP via reqwest + tokio |
| `wasm` | no | CF Workers WASM fetch transport (`?Send`) |
| `agent` | no | Agentic tool-use loop |
| `cache` | no | TTL cache + in-flight dedup (dashmap, sha2, tokio) |

## Key Types

### Models & Effort

```rust
pub enum DeepSeekModel { Reasoner, Chat }  // aliases: "r1"/"deep" → Reasoner, "v3"/"fast" → Chat
pub enum EffortLevel { Low, Medium, High, Max }
// Low: 0.1 temp / 2048 tokens → Max: 1.0 temp / 16384 tokens
```

### Messages

```rust
pub struct ChatMessage { role, content, reasoning_content?, tool_calls?, tool_call_id?, name? }
pub struct ChatRequest  { model, messages, tools?, tool_choice?, temperature?, max_tokens?, stream? }
pub struct ChatResponse { id, choices, usage? }

// Constructors
pub fn system_msg(s: &str) -> ChatMessage
pub fn user_msg(s: &str) -> ChatMessage
pub fn assistant_msg(s: &str) -> ChatMessage
pub fn tool_result_msg(tool_call_id: &str, content: &str) -> ChatMessage
```

### Request Builder (free function)

```rust
pub fn build_request(model, messages, tools?, effort) -> ChatRequest
```

Usable without a client instance — builds a typed `ChatRequest` with effort-mapped temperature/max_tokens.

### Client

```rust
pub trait HttpClient: Send + Sync {
    async fn post_json(&self, url: &str, token: &str, body: ChatRequest) -> Result<ChatResponse>;
}

pub struct DeepSeekClient<H: HttpClient> { .. }
impl<H: HttpClient> DeepSeekClient<H> {
    pub fn new(api_key, http) -> Self
    pub fn with_base_url(self, url) -> Self
    pub async fn chat(&self, req: &ChatRequest) -> Result<ChatResponse>
}

// reqwest-client feature
pub fn client_from_env() -> Result<DeepSeekClient<ReqwestClient>>  // reads DEEPSEEK_API_KEY
pub async fn reason(client, system, user) -> Result<ReasonerOutput>
pub async fn reason_with_retry(client, system, user) -> Result<ReasonerOutput>  // 3 attempts, exp backoff
```

### Agent (feature `agent`)

```rust
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn definition(&self) -> ToolDefinition;
    async fn call_json(&self, args: Value) -> Result<String, String>;
}

pub struct AgentBuilder<H: HttpClient> { .. }
impl<H: HttpClient> AgentBuilder<H> {
    pub fn new() -> Self
    pub fn preamble(self, s: &str) -> Self
    pub fn tool(self, t: impl Tool + 'static) -> Self
    pub fn build(self) -> DeepSeekAgent<H>
}

impl<H: HttpClient> DeepSeekAgent<H> {
    pub async fn prompt(&self, input: String) -> Result<String>  // multi-turn tool-use loop
}
```

### Cache (feature `cache`)

```rust
pub struct Cache { .. }          // entry-level TTL, evicts expired on insert
pub struct InFlightDedup<T> { .. } // broadcast-based — first caller inserts, others subscribe
```

## Retry Logic

`reason_with_retry()` retries only on 5xx / network errors with exponential backoff (1s → 2s → 4s). 4xx errors fail immediately.

## Dependencies

Standalone library — no sibling crate dependencies. Used by `sdd`, `research`, and `genesis`.
