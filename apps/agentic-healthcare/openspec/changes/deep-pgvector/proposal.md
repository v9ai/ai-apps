# Change Proposal: deep-pgvector

## Intent

Replace the prior single-embedding-per-test / OpenAI / DeepSeek setup with a deeply integrated pgvector architecture powered by Alibaba DashScope (Qwen). The goals are:

1. **Fine-grained embeddings** -- embed at marker level and condition level, not just whole-test level, so semantic search can resolve individual biomarkers.
2. **Unified AI provider** -- consolidate all embedding and chat inference under a single `@repo/qwen` TypeScript package (and a parallel `crates/qwen` Rust crate), removing the `openai` npm dependency and DeepSeek/MuleRouter references.
3. **Auto-embed on upload** -- blood tests and conditions generate embeddings immediately after creation with no manual step.
4. **Condition-aware Q&A** -- the Health Q&A pipeline retrieves both blood-test embeddings and condition embeddings, then passes combined context to `qwen-plus` for generation.
5. **Trend detection** -- track a named marker across multiple tests over time using vector similarity plus date ordering.
6. **Hybrid search** -- combine pgvector cosine similarity with PostgreSQL full-text search (tsvector/GIN) for recall when either signal is weak.

## Scope

### New packages

| Package | Language | Location | Purpose |
|---------|----------|----------|---------|
| `@repo/qwen` | TypeScript | `packages/qwen/` | DashScope client -- embeddings (`text-embedding-v4`, 1024-dim) and chat (`qwen-plus`) |
| `qwen` crate | Rust | `crates/qwen/` | Mirror of the TypeScript client for Rust services |

### New database tables

| Table | Key columns | Notes |
|-------|-------------|-------|
| `blood_test_embeddings` | `test_id`, `user_id`, `content`, `embedding vector(1024)` | One row per uploaded blood test (summary of all markers) |
| `blood_marker_embeddings` | `marker_id`, `test_id`, `user_id`, `marker_name`, `content`, `embedding vector(1024)`, `fts tsvector` | One row per individual marker; `marker_name` denormalized for trend grouping |
| `condition_embeddings` | `condition_id`, `user_id`, `content`, `embedding vector(1024)` | One row per health condition |

### New Supabase RPC functions

| RPC | Signature | Purpose |
|-----|-----------|---------|
| `match_blood_tests` | `(query_embedding vector(1024), match_threshold, match_count)` | Test-level semantic search; returns `file_name`, `test_date` via join |
| `match_markers` | `(query_embedding vector(1024), match_threshold, match_count)` | Marker-level semantic search |
| `match_conditions` | `(query_embedding vector(1024), match_threshold, match_count)` | Condition-level semantic search |
| `find_similar_markers_over_time` | `(query_embedding, match_threshold, match_count, exact_marker_name)` | Trend detection -- joins `blood_markers` and `blood_tests` to return `value`, `unit`, `flag`, `test_date`; ordered by `test_date ASC` |
| `hybrid_search_markers` | `(query_text, query_embedding, match_count, fts_weight, vector_weight, match_threshold)` | Combines tsvector FTS rank (30% default) with vector cosine similarity (70% default) |

### New UI route

`/protected/search` -- three sections:

1. **Semantic Search** (`SearchForm`) -- search across blood tests or individual markers by natural language
2. **Health Q&A** (`QAForm`) -- ask a question; retrieves test + condition embeddings, generates answer via `qwen-plus`
3. **Marker Trends** (`TrendsSection`) -- enter a marker name to see its values over time across tests

### Modified files

| File | Change |
|------|--------|
| `lib/embeddings.ts` | Imports `QwenClient` from `@repo/qwen`; provides `embedBloodTest()`, `embedBloodMarkers()`, `embedCondition()`, `generateEmbedding()` |
| `app/protected/blood-tests/search-actions.ts` | `searchBloodTests()`, `searchMarkers()`, `askHealthQuestion()`, `getMarkerTrend()` -- all use `@repo/qwen` for embeddings and chat |
| Blood test upload flow | Calls `embedBloodTest()` + `embedBloodMarkers()` after successful creation |
| Conditions create flow | Calls `embedCondition()` after successful creation |
| Layout nav | Adds `/protected/search` link |
| `package.json` | Adds `@repo/qwen` dependency; removes `openai` |

### Removed

- `openai` npm package dependency
- DeepSeek local embedding references
- MuleRouter for embedding routing

## Approach

### Embedding model

Alibaba DashScope `text-embedding-v4` at 1024 dimensions. The model supports 64-2048 dims; 1024 balances quality and storage. All vectors in the database use `vector(1024)` after the final migration (`20260305400000_switch_to_qwen_1024.sql`) converted everything from the initial 1536-dim columns.

### Chat model

Alibaba DashScope `qwen-plus` for Health Q&A generation. Temperature 0.3 for factual responses. The system prompt instructs the model to describe lab values and possible connections to conditions, not to diagnose.

### `@repo/qwen` TypeScript package

Minimal, zero-dependency (only native `fetch`) client with OpenAI-compatible API surface:

```typescript
const qwen = new QwenClient({ apiKey: process.env.DASHSCOPE_API_KEY! });

// Embeddings
const vec = await qwen.embedOne("hemoglobin 14.2 g/dL");         // number[]
const resp = await qwen.embed({ input: ["a", "b", "c"] });       // EmbeddingResponse

// Chat
const chat = await qwen.chat({
  model: "qwen-plus",
  messages: [{ role: "user", content: "..." }],
  temperature: 0.3,
});
```

Exported types: `QwenClient`, `QwenClientOptions`, `EmbeddingRequest`, `EmbeddingResponse`, `EmbeddingData`, `EmbeddingUsage`, `ChatRequest`, `ChatMessage`, `ChatResponse`, `ChatChoice`.

Built with `bunchee` (dual ESM/CJS). 8 integration tests (5 embedding, 2 chat, 1 error) skip gracefully when `DASHSCOPE_API_KEY` is unset.

### `crates/qwen` Rust crate

Async client using `reqwest` + `serde`, same API shape as the TypeScript package:

```rust
let client = qwen::Client::new(api_key);

// Embeddings
let vec = client.embed_one("hemoglobin 14.2 g/dL").await?;       // Vec<f32>
let resp = client.embed(EmbeddingRequest::batch(vec![...])).await?;

// Chat
let resp = client.chat(ChatRequest::new("qwen-plus", messages)).await?;
println!("{}", resp.text().unwrap());
```

Error types: `Error::Api`, `Error::Http`, `Error::Network`, `Error::Json`. 8 integration tests mirror the TypeScript suite.

### Database indexing strategy

- **HNSW** indexes with `vector_cosine_ops` on all three embedding tables -- optimized for cosine distance approximate nearest neighbor.
- **GIN** index on `blood_marker_embeddings.fts` for PostgreSQL full-text search.
- **B-tree** composite index `(user_id, marker_name)` on `blood_marker_embeddings` for efficient trend grouping.
- All RPC functions use `security invoker` and filter on `auth.uid()` to enforce row-level security.

### Embedding content formatting

Three distinct formatters produce human-readable text for embedding:

- **Test-level** (`formatTestForEmbedding`): includes file name, date, abnormal-marker summary, and all marker lines.
- **Marker-level** (`formatMarkerForEmbedding`): includes marker name, value, unit, reference range, flag, test name, date.
- **Condition-level** (`formatConditionForEmbedding`): includes condition name and optional notes.

### Non-blocking embedding

Embedding is fire-and-forget after the primary write succeeds. If the DashScope API is unavailable, the upload/creation still succeeds -- the embedding can be retried later.

### Hybrid search design

`hybrid_search_markers` uses a disjunctive filter: rows match if they satisfy either FTS (`@@`) or vector similarity above threshold. The combined score is a weighted sum:

```
combined = fts_weight * ts_rank(fts, query) + vector_weight * (1 - cosine_distance)
```

Default weights: FTS 30%, vector 70%. This catches exact keyword matches that might have low vector similarity, and vice versa.

## Migration sequence

| Migration | Description |
|-----------|-------------|
| `20260304000000_pgvector_embeddings.sql` | Enable pgvector extension; create `blood_test_embeddings` table, HNSW index, RLS, `match_blood_tests` RPC |
| `20260305000000_marker_embeddings.sql` | Create `blood_marker_embeddings` table, HNSW index, RLS, `match_markers` RPC; enhance `match_blood_tests` to join `file_name`/`test_date` |
| `20260305100000_condition_embeddings.sql` | Create `condition_embeddings` table, HNSW index, RLS, `match_conditions` RPC |
| `20260305200000_trend_detection.sql` | Create `find_similar_markers_over_time` RPC joining markers + tests |
| `20260305300000_hybrid_search.sql` | Add `fts` tsvector column, GIN index, `hybrid_search_markers` RPC |
| `20260305400000_switch_to_qwen_1024.sql` | Convert all `vector(1536)` columns to `vector(1024)`; drop/recreate all indexes and RPCs |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DASHSCOPE_API_KEY` | Yes | Alibaba DashScope API key for Qwen models |
| `DASHSCOPE_BASE_URL` | No | Override base URL (defaults to `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`) |

## Testing

- **`@repo/qwen`**: 8 integration tests (`pnpm --filter @repo/qwen test:integration`) -- single embed, batch embed, custom dimensions, embedOne convenience, similarity ordering, chat round-trip, system prompt, invalid key error.
- **`crates/qwen`**: 8 integration tests (`cargo test --test integration`) -- same coverage as TypeScript, all serial to avoid rate limits, auto-skip without API key.
- Both test suites use `qwen-turbo` (cheapest chat model) to minimize cost.

## Architecture diagram

```
User uploads blood test / adds condition
         |
         v
  Server Action (Next.js)
         |
    +---------+-----------+
    |                     |
    v                     v
 Supabase INSERT      lib/embeddings.ts
 (blood_tests,           |
  blood_markers,          |-- formatTestForEmbedding()
  conditions)             |-- formatMarkerForEmbedding()
                          |-- formatConditionForEmbedding()
                          |
                          v
                  @repo/qwen QwenClient
                  (text-embedding-v4, 1024-dim)
                          |
                          v
                  Supabase UPSERT
                  (blood_test_embeddings,
                   blood_marker_embeddings,
                   condition_embeddings)

User searches / asks question
         |
         v
  search-actions.ts
         |
    +----+----+
    |         |
    v         v
  qwen.embedOne()   supabase.rpc()
  (query vector)    (match_markers,
         |           match_blood_tests,
         +-----+     match_conditions,
               |     find_similar_markers_over_time,
               v     hybrid_search_markers)
         Q&A: qwen.chat()
         (qwen-plus, context from RPC results)
               |
               v
         JSON response -> Search UI
```
