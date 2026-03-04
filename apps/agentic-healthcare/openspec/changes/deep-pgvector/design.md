# Technical Design: deep-pgvector

## Overview

Deep pgvector integration with Qwen (via Alibaba DashScope API) for the agentic-healthcare app. Replaces the prior DeepSeek/GPT-4o-mini split with a unified Qwen pipeline: text-embedding-v4 for embeddings (1024 dimensions) and qwen-plus for chat completions, both routed through a single DashScope API key.

---

## Architecture Components

### 1. @repo/qwen TypeScript Package (`packages/qwen/`)

Shared monorepo package (`@repo/qwen`, v0.1.0) providing a typed DashScope client.

**Files:**
- `src/client.ts` -- `QwenClient` class with `embed()`, `embedOne()`, `chat()` methods
- `src/types.ts` -- Request/response types and `DashScopeApiError` shape
- `src/index.ts` -- Re-exports all public types and `QwenClient`

**Key details:**
- Base URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (overridable via constructor)
- Endpoints: `POST /embeddings`, `POST /chat/completions`
- Defaults: `text-embedding-v4` model, 1024 dimensions for embeddings; `qwen-plus` for chat
- Uses native `fetch` -- zero external HTTP dependencies
- Error handling: attempts to parse DashScope JSON error format (`{ error: { code, message, type, param }, request_id }`) and falls back to raw response text
- Auth: `Authorization: Bearer <apiKey>` header on every request
- Built with `bunchee` (ESM + CJS dual output), tested via Jest

**Public API:**
```ts
class QwenClient {
  constructor(options: { apiKey: string; baseURL?: string })
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>
  embedOne(text: string): Promise<number[]>
  chat(request: ChatRequest): Promise<ChatResponse>
}
```

### 2. crates/qwen Rust Crate

Mirror of the TS package for Rust consumers (e.g., research agents).

**Files:**
- `src/client.rs` -- `Client` struct with `embed()`, `embed_one()`, `chat()` async methods
- `src/types.rs` -- Serde (de)serializable request/response types; builder pattern on `EmbeddingRequest` and `ChatRequest`
- `src/error.rs` -- `Error` enum (`Api`, `Http`, `Network`, `Json`) via `thiserror`; `ApiError` struct for DashScope responses
- `src/lib.rs` -- Re-exports

**Key details:**
- Same base URL and model defaults as the TS package
- Uses `reqwest` (v0.12, json feature) for HTTP
- `Client::new(api_key)` configures default Authorization header via `reqwest::Client::builder()`
- `Client::with_base_url()` builder for testing or regional endpoints
- `EmbeddingInput` enum: `Single(String)` or `Batch(Vec<String>)` with `#[serde(untagged)]`
- `ChatResponse::text()` convenience method returns first choice content
- Dependencies: `reqwest`, `serde`, `serde_json`, `thiserror`
- Dev deps: `tokio`, `dotenvy`, `serial_test`

**Public API:**
```rust
impl Client {
    pub fn new(api_key: impl Into<String>) -> Self
    pub fn with_base_url(self, url: impl Into<String>) -> Self
    pub async fn embed(&self, req: EmbeddingRequest) -> Result<EmbeddingResponse>
    pub async fn embed_one(&self, text: impl Into<String>) -> Result<Vec<f32>>
    pub async fn chat(&self, req: ChatRequest) -> Result<ChatResponse>
}
```

### 3. Embedding Pipeline (`lib/embeddings.ts`)

Centralized embedding logic consumed by server actions throughout the app.

**Client initialization:**
- Single `QwenClient` instance created at module scope from `DASHSCOPE_API_KEY` env var
- Optional `DASHSCOPE_BASE_URL` override for dev/staging
- Exported as `qwen` for direct chat access from `search-actions.ts`

**Format functions** (pure, no side effects):
| Function | Input | Output description |
|---|---|---|
| `formatTestForEmbedding(markers, meta)` | Array of markers + fileName/uploadedAt | Multi-line summary: file name, date, abnormal count, then each marker line |
| `formatMarkerForEmbedding(marker, meta)` | Single marker + fileName/testDate | 6-line text: marker name, value+unit, ref range, flag, test name, date |
| `formatConditionForEmbedding(name, notes)` | Condition name + optional notes | "Health condition: {name}" with optional "Notes: {notes}" line |

**Embed functions** (async, perform Supabase upserts):
| Function | Target table | Conflict key |
|---|---|---|
| `embedBloodTest(supabase, testId, userId, markers, meta)` | `blood_test_embeddings` | `test_id` |
| `embedBloodMarkers(supabase, testId, userId, markers, meta)` | `blood_marker_embeddings` | `marker_id` |
| `embedCondition(supabase, conditionId, userId, name, notes)` | `condition_embeddings` | `condition_id` |

**`generateEmbedding(text)`**: Delegates to `qwen.embedOne(text)`, returns `number[]`.

Embeddings are serialized as `JSON.stringify(embedding)` when passed to Supabase upserts (Supabase client does not natively handle pgvector arrays).

### 4. Auto-Embed Hooks

- **Blood tests**: After marker insertion in `uploadBloodTest()`, calls `embedBloodTest()` + `embedBloodMarkers()` wrapped in try/catch
- **Conditions**: After `addCondition()`, calls `embedCondition()` wrapped in try/catch
- Both are **non-blocking**: the primary operation (upload/add) succeeds regardless of embedding API errors

### 5. Database Schema

All tables live in the `public` schema. Vector operations use the `extensions.vector` type (pgvector installed in `extensions` schema on Supabase).

#### Tables

**`blood_test_embeddings`** (existing, modified):
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `test_id` | uuid FK -> blood_tests(id) | unique, cascade delete |
| `user_id` | uuid FK -> auth.users(id) | cascade delete |
| `content` | text | formatted test summary |
| `embedding` | vector(1024) | HNSW indexed |
| `created_at` | timestamptz | default now() |

**`blood_marker_embeddings`** (new):
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `marker_id` | uuid FK -> blood_markers(id) | unique (upsert key), cascade delete |
| `test_id` | uuid FK -> blood_tests(id) | cascade delete |
| `user_id` | uuid FK -> auth.users(id) | cascade delete |
| `marker_name` | text | denormalized for trend grouping |
| `content` | text | formatted marker text |
| `embedding` | vector(1024) | HNSW indexed |
| `fts` | tsvector | generated always as `to_tsvector('english', content)`, GIN indexed |
| `created_at` | timestamptz | default now() |

Additional index: `(user_id, marker_name)` for trend grouping queries.

**`condition_embeddings`** (new):
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `condition_id` | uuid FK -> conditions(id) | unique, cascade delete |
| `user_id` | uuid FK -> auth.users(id) | cascade delete |
| `content` | text | formatted condition text |
| `embedding` | vector(1024) | HNSW indexed |
| `created_at` | timestamptz | default now() |

#### Indexes
- HNSW (`vector_cosine_ops`) on every `embedding` column -- optimized for cosine distance nearest-neighbor search
- GIN on `blood_marker_embeddings.fts` -- full-text search for hybrid queries
- B-tree on `blood_marker_embeddings(user_id, marker_name)` -- trend grouping

#### RLS
All three embedding tables have RLS enabled with a single policy: `auth.uid() = user_id` for all operations.

#### Migrations
| Migration | Purpose |
|---|---|
| `20260304000000_pgvector_embeddings.sql` | Initial blood_test_embeddings table |
| `20260305000000_marker_embeddings.sql` | blood_marker_embeddings + enhanced match_blood_tests RPC |
| `20260305100000_condition_embeddings.sql` | condition_embeddings table + match_conditions RPC |
| `20260305200000_trend_detection.sql` | find_similar_markers_over_time RPC |
| `20260305300000_hybrid_search.sql` | fts column, GIN index, hybrid_search_markers RPC |
| `20260305400000_switch_to_qwen_1024.sql` | Resize all columns from vector(1536) to vector(1024), recreate all RPCs and indexes |

### 6. Search Architecture (`search-actions.ts`)

All search operations are server actions using **Supabase RPCs** (not GraphQL -- Supabase GraphQL does not support pgvector types).

#### RPC Functions

**`match_blood_tests(query_embedding, match_threshold, match_count)`**
- Joins `blood_test_embeddings` with `blood_tests` to return `file_name` and `test_date`
- Cosine similarity filter: `1 - (embedding <=> query_embedding) > match_threshold`
- `security invoker` + `auth.uid()` filter for RLS

**`match_markers(query_embedding, match_threshold, match_count)`**
- Pure vector search on `blood_marker_embeddings`
- Returns `marker_id`, `marker_name`, `content`, `similarity`

**`match_conditions(query_embedding, match_threshold, match_count)`**
- Vector search on `condition_embeddings`
- Returns `condition_id`, `content`, `similarity`

**`find_similar_markers_over_time(query_embedding, match_threshold, match_count, exact_marker_name)`**
- Joins `blood_marker_embeddings` -> `blood_markers` -> `blood_tests`
- Returns full marker data: value, unit, flag, test_date, file_name
- Optional `exact_marker_name` filter for precise trend tracking
- Ordered by `test_date ASC` (chronological) then similarity

**`hybrid_search_markers(query_text, query_embedding, match_count, fts_weight, vector_weight, match_threshold)`**
- Combined FTS + vector search with configurable weights (default 30% FTS, 70% vector)
- WHERE clause: matches if FTS matches OR vector similarity exceeds threshold (union semantics)
- Uses `websearch_to_tsquery('english', query_text)` for forgiving query parsing
- Returns `fts_rank`, `vector_similarity`, and `combined_score`

#### Server Actions

| Action | Description | Default threshold | Default count |
|---|---|---|---|
| `searchBloodTests(query)` | Semantic search across test summaries | 0.3 | 5 |
| `searchMarkers(query)` | Semantic search across individual markers | 0.3 | 10 |
| `askHealthQuestion(question)` | Q&A with context from tests + conditions | 0.3 | 5 tests, 5 conditions |
| `getMarkerTrend(query, markerName?)` | Find marker values over time | 0.3 | 50 |

### 7. Q&A (`askHealthQuestion`)

End-to-end flow:
1. Authenticate user via Supabase
2. Generate embedding for the question once via `generateEmbedding()`
3. Search blood tests and conditions in **parallel** (`Promise.all`)
4. If no results found, return early with a helpful message
5. Build context string with section headers: `=== BLOOD TEST RESULTS ===` and `=== KNOWN HEALTH CONDITIONS ===`
6. Call `qwen.chat()` with:
   - Model: `qwen-plus`
   - Temperature: `0.3`
   - Max tokens: `1024`
   - System prompt: health assistant that describes lab values, considers conditions, avoids diagnosis, recommends consulting a doctor
7. Return `{ answer, sources, conditions }` where:
   - `sources`: array of `{ testId, similarity, fileName, testDate }`
   - `conditions`: array of `{ conditionId, content, similarity }`

### 8. Search UI (`app/protected/search/`)

| File | Type | Purpose |
|---|---|---|
| `page.tsx` | Server component | Layout with search form, Q&A form, trends section |
| `search-form.tsx` | Client component | Tests/Markers toggle, query input, results display |
| `qa-form.tsx` | Client component | Health Q&A input, answer display with sources |
| `trends-section.tsx` | Client component | Marker trend table with optional name filter |

---

## Key Decisions

| Decision | Rationale |
|---|---|
| **text-embedding-v4 over v3** | 15-40% improvement in retrieval benchmarks; latest DashScope embedding model |
| **1024 dimensions** | Good balance of quality vs storage/compute; text-embedding-v4 supports 64-2048 range |
| **HNSW over IVFFlat** | Better recall at slight build-time cost; healthcare data accuracy justifies the tradeoff |
| **Non-blocking embedding** | Upload/add operations must never fail due to embedding API issues |
| **Denormalized marker_name** | Avoids joins for trend grouping; small storage cost for significant query simplification |
| **websearch_to_tsquery** | More forgiving FTS parsing than `plainto_tsquery` for natural health queries |
| **Configurable hybrid weights (70/30)** | Vector similarity more reliable for semantic health queries; FTS handles exact term matches |
| **Single DASHSCOPE_API_KEY** | Both embeddings and chat completions route through DashScope; no need for separate keys |
| **RPC over GraphQL** | Supabase GraphQL does not support pgvector types; RPCs give full SQL control |
| **security invoker + auth.uid()** | All RPCs respect RLS; no elevated privileges needed |
| **Embeddings as JSON.stringify** | Supabase JS client does not natively marshal pgvector arrays; string encoding works with RPC parameter binding |
| **Unified Qwen pipeline** | Replaces prior DeepSeek-for-embeddings + GPT-4o-mini-for-chat split with a single provider |

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DASHSCOPE_API_KEY` | Yes | Authenticates all Qwen API calls (embeddings + chat) |
| `DASHSCOPE_BASE_URL` | No | Override DashScope endpoint (defaults to intl endpoint) |

---

## Data Flow Diagram

```
Upload Blood Test                    Add Condition
       |                                   |
       v                                   v
  Insert markers                    Insert condition
       |                                   |
       v                                   v
  embedBloodTest()               embedCondition()
  embedBloodMarkers()                      |
       |                                   |
       v                                   v
  blood_test_embeddings          condition_embeddings
  blood_marker_embeddings
       |                                   |
       +-----------------------------------+
       |                                   |
       v                                   v
   match_blood_tests              match_conditions
   match_markers                  (parallel in Q&A)
   find_similar_markers_over_time
   hybrid_search_markers
       |
       v
   askHealthQuestion -> qwen.chat() -> answer + sources
```
