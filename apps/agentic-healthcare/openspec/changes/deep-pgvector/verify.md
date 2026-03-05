# Verification: deep-pgvector

**Change:** Deep pgvector integration with Qwen embeddings
**Verified:** 2026-03-04
**Build:** `npm run build` passes cleanly
**Method:** SDD verify — requirements traced to implementation evidence

## Summary

| Category | Total | Pass | Fail | Skip |
|----------|-------|------|------|------|
| REQ-QWEN-TS | 5 | 5 | 0 | 0 |
| REQ-QWEN-RS | 5 | 5 | 0 | 0 |
| REQ-DB | 9 | 9 | 0 | 0 |
| REQ-EMBED | 5 | 5 | 0 | 0 |
| REQ-HOOK | 2 | 2 | 0 | 0 |
| REQ-SEARCH | 4 | 4 | 0 | 0 |
| REQ-UI | 5 | 5 | 0 | 0 |
| SCEN | 7 | 7 | 0 | 0 |
| **Total** | **42** | **42** | **0** | **0** |

## Requirements Verification

### Package `@repo/qwen` (TypeScript)

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| REQ-QWEN-TS-001 | QwenClient constructor with apiKey, optional baseURL | PASS | `packages/qwen/src/client.ts` — constructor accepts `{ apiKey, baseURL? }`, defaults to DashScope intl endpoint, strips trailing slashes |
| REQ-QWEN-TS-002 | `embed(EmbeddingRequest)` — POST /embeddings, defaults model=text-embedding-v4, dims=1024 | PASS | `packages/qwen/src/client.ts` — `embed()` method, `packages/qwen/src/types.ts` — `EmbeddingRequest` type with defaults |
| REQ-QWEN-TS-003 | `embedOne(text)` — returns `Promise<number[]>` | PASS | `packages/qwen/src/client.ts` — calls `embed()` and extracts `data[0].embedding` |
| REQ-QWEN-TS-004 | `chat(ChatRequest)` — POST /chat/completions, defaults model=qwen-plus | PASS | `packages/qwen/src/client.ts` — `chat()` method with `ChatRequest`/`ChatResponse` types |
| REQ-QWEN-TS-005 | Non-2xx throws with formatted error message | PASS | `packages/qwen/src/client.ts` — parses DashScope JSON error shape, falls back to raw body text |

### Crate `qwen` (Rust)

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| REQ-QWEN-RS-001 | `Client::new(api_key)` with Bearer auth, default base URL, `with_base_url()` | PASS | `crates/qwen/src/client.rs` — constructor with `reqwest` default headers, builder pattern |
| REQ-QWEN-RS-002 | `embed(EmbeddingRequest)` with defaults, batch support, builders | PASS | `crates/qwen/src/client.rs` + `crates/qwen/src/types.rs` — `EmbeddingRequest::new()`, `::batch()`, `with_model()`, `with_dimensions()` |
| REQ-QWEN-RS-003 | `embed_one(text)` — returns `Result<Vec<f32>>` | PASS | `crates/qwen/src/client.rs` — extracts first vector from embed response |
| REQ-QWEN-RS-004 | `chat(ChatRequest)` with `ChatMessage::user/system`, `ChatResponse::text()` | PASS | `crates/qwen/src/types.rs` — full type definitions; `crates/qwen/src/client.rs` — chat method |
| REQ-QWEN-RS-005 | Error variants: Api, Http, Network, Json | PASS | `crates/qwen/src/error.rs` — `Error` enum with all 4 variants, `Result<T>` alias |

### Database Schema (pgvector)

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| REQ-DB-001 | `blood_test_embeddings` table — uuid PK, FK, vector(1024), HNSW, RLS | PASS | `20260304000000_pgvector_embeddings.sql` creates table + HNSW index + RLS; `20260305400000_switch_to_qwen_1024.sql` resizes to vector(1024) |
| REQ-DB-002 | `blood_marker_embeddings` — marker_name, fts tsvector, HNSW+GIN+B-tree indexes, RLS | PASS | `20260305000000_marker_embeddings.sql` creates table + indexes + RLS; `20260305300000_hybrid_search.sql` adds fts + GIN; `20260305400000` resizes to 1024 |
| REQ-DB-003 | `condition_embeddings` — HNSW index, RLS | PASS | `20260305100000_condition_embeddings.sql` creates table + HNSW + RLS; `20260305400000` resizes to 1024 |
| REQ-DB-004 | RPC `match_blood_tests` with join to blood_tests for file_name/test_date | PASS | `20260305000000_marker_embeddings.sql` drops+recreates with JOIN; `20260305400000` recreates at 1024d |
| REQ-DB-005 | RPC `match_markers` with auth.uid() filter | PASS | `20260305000000_marker_embeddings.sql` creates RPC; `20260305400000` recreates at 1024d |
| REQ-DB-006 | RPC `match_conditions` with auth.uid() filter | PASS | `20260305100000_condition_embeddings.sql` creates RPC; `20260305400000` recreates at 1024d |
| REQ-DB-007 | RPC `find_similar_markers_over_time` with optional exact_marker_name, ordered test_date ASC | PASS | `20260305200000_trend_detection.sql` creates RPC with all specified params; `20260305400000` recreates at 1024d |
| REQ-DB-008 | RPC `hybrid_search_markers` — FTS+vector combined score, configurable weights | PASS | `20260305300000_hybrid_search.sql` creates RPC with `fts_weight`/`vector_weight` params, disjunctive WHERE; `20260305400000` recreates at 1024d |
| REQ-DB-009 | Migration converts all vector(1536) to vector(1024) atomically | PASS | `20260305400000_switch_to_qwen_1024.sql` drops all 5 RPCs, 3 HNSW indexes, fts column; alters all 3 tables to vector(1024); recreates everything |

### App Integration: Embedding Pipeline

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| REQ-EMBED-001 | `lib/embeddings.ts` — singleton QwenClient, `generateEmbedding()` delegates to `embedOne()` | PASS | `lib/embeddings.ts:1-10` — imports QwenClient, instantiates with env vars, exports `generateEmbedding` |
| REQ-EMBED-002 | `formatTestForEmbedding` — header + abnormal summary + per-marker lines | PASS | `lib/embeddings.ts` — pure function with file name, date, abnormal count line, marker detail lines |
| REQ-EMBED-003 | `formatMarkerForEmbedding` — multi-line: name, value+unit, ref range, flag, file, date | PASS | `lib/embeddings.ts` — 6-line format string with all specified fields |
| REQ-EMBED-004 | `formatConditionForEmbedding` — with/without notes variants | PASS | `lib/embeddings.ts` — conditional `\nNotes: ${notes}` append |
| REQ-EMBED-005 | Upsert semantics on conflict keys; `JSON.stringify(embedding)` | PASS | `lib/embeddings.ts:71-140` — all three embed functions use `.upsert()` with `onConflict` and `JSON.stringify(embedding)` |

### App Integration: Auto-Embed Hooks

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| REQ-HOOK-001 | After marker insert in upload, `embedBloodTest` + `embedBloodMarkers` in try/catch | PASS | `app/protected/blood-tests/actions.ts:85-100` — both calls wrapped in try/catch after markers inserted |
| REQ-HOOK-002 | After `addCondition`, `embedCondition` in try/catch | PASS | `app/protected/conditions/actions.ts:26-30` — `embedCondition()` in try/catch after GraphQL insert |

### App Integration: Search Actions

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| REQ-SEARCH-001 | `searchBloodTests(query)` — embedding + `match_blood_tests` RPC, threshold 0.3, limit 5 | PASS | `app/protected/blood-tests/search-actions.ts` — generates embedding, calls RPC with specified params |
| REQ-SEARCH-002 | `searchMarkers(query)` — embedding + `match_markers` RPC, threshold 0.3, limit 10 | PASS | `search-actions.ts` — generates embedding, calls RPC with specified params |
| REQ-SEARCH-003 | `askHealthQuestion` — parallel search, context building, qwen-plus chat, returns answer+sources+conditions | PASS | `search-actions.ts` — `Promise.all` for blood tests + conditions, structured context with `===` sections, `qwen.chat()` with temp 0.3 / max 1024, returns full response object |
| REQ-SEARCH-004 | `getMarkerTrend(query, markerName?)` — `find_similar_markers_over_time` RPC, optional exact_marker_name | PASS | `search-actions.ts` — passes `exact_marker_name` when provided, threshold 0.3, limit 50 |

### App Integration: Search UI

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| REQ-UI-001 | Route `/protected/search` with 3 sections: Semantic Search, Health Q&A, Marker Trends | PASS | `app/protected/search/page.tsx` — server component rendering 3 titled sections with `<Separator>` dividers |
| REQ-UI-002 | `search-form.tsx` — Tests/Markers toggle, query input, similarity scores | PASS | `app/protected/search/search-form.tsx` — `SegmentedControl` toggle, `Badge` with similarity %, content preview |
| REQ-UI-003 | `qa-form.tsx` — health question input, AI answer, source refs, matched conditions | PASS | `app/protected/search/qa-form.tsx` — text input, `Card` with pre-wrap answer, blue Badge sources, orange Badge conditions |
| REQ-UI-004 | `trends-section.tsx` — marker trend table ordered by test date | PASS | `app/protected/search/trends-section.tsx` — Radix `Table` with Date/Marker/Value/Flag/Test/Match% columns, color-coded flag badges |
| REQ-UI-005 | Layout nav bar includes "Search" link | PASS | `app/protected/layout.tsx:24` — `<Link href="/protected/search">Search</Link>` |

## Scenario Verification

| ID | Scenario | Status | Evidence |
|----|----------|--------|----------|
| SCEN-001 | Upload blood test triggers auto-embed for test + markers | PASS | `actions.ts:85-100` — `embedBloodTest` + `embedBloodMarkers` called after marker insert; upserts to both embedding tables |
| SCEN-002 | Add condition triggers auto-embed | PASS | `conditions/actions.ts:26-30` — `embedCondition` called after GraphQL insert; upserts to `condition_embeddings` |
| SCEN-003 | Search by test or marker returns results with similarity scores | PASS | `searchBloodTests` and `searchMarkers` in `search-actions.ts` — both call RPCs returning `similarity` field; UI renders as `Badge` with percentage |
| SCEN-004 | Ask health question — parallel search, combined context, qwen-plus answer | PASS | `askHealthQuestion` — `Promise.all([matchBloodTests, searchConditions])`, context with `===` sections, `qwen.chat(qwen-plus)`, returns `{ answer, sources, conditions }` |
| SCEN-005 | Marker trend — values ordered by test_date ASC, optional exact name filter | PASS | `getMarkerTrend` calls `find_similar_markers_over_time` RPC; SQL orders by `test_date ASC NULLS LAST`; `exact_marker_name` param forwarded |
| SCEN-006 | Embedding failure does not block upload/add-condition | PASS | Both auto-embed hooks wrapped in try/catch with empty catch blocks; upload continues to redirect, condition continues to revalidate |
| SCEN-007 | Invalid API key — TS throws formatted error, Rust returns Error::Api, auto-embed catches silently | PASS | `packages/qwen/src/client.ts` error handling formats `DashScope API error {status}: [{code}] {message}`; `crates/qwen/src/error.rs` has `Api { status, error }` variant; auto-embed try/catch suppresses |

## Design Decisions Verified

| Decision | Verified |
|----------|----------|
| `text-embedding-v4` at 1024 dims | All migrations finalized at vector(1024); `@repo/qwen` defaults to text-embedding-v4 with 1024 dims |
| HNSW over IVFFlat | All 3 embedding tables use `using hnsw (embedding extensions.vector_cosine_ops)` |
| Non-blocking embedding | Both auto-embed hooks wrapped in try/catch |
| Denormalized `marker_name` | `blood_marker_embeddings.marker_name` column with B-tree index for trend grouping |
| `websearch_to_tsquery` for FTS | `hybrid_search_markers` uses `websearch_to_tsquery('english', query_text)` |
| 70/30 hybrid weights | Default params: `fts_weight float default 0.3, vector_weight float default 0.7` |
| RPC over GraphQL | All search actions use `supabase.rpc()`, zero GraphQL for search |
| `security invoker` + `auth.uid()` | All 5 RPCs use `security invoker` with `auth.uid()` filter in WHERE clause |
| `JSON.stringify` for embeddings | All 3 embed functions pass `JSON.stringify(embedding)` to Supabase upsert |
| Unified Qwen pipeline | Single `QwenClient` used for both embeddings and chat; `openai` dependency removed |

## Build Verification

```
npm run build — PASS
Route /protected/search — present (dynamic)
All 17 routes compile successfully
No TypeScript errors
```

## Migration Verification

All 6 pgvector migrations present and correctly sequenced:

| # | Migration | Verified |
|---|-----------|----------|
| 1 | `20260304000000_pgvector_embeddings.sql` | PASS |
| 2 | `20260305000000_marker_embeddings.sql` | PASS |
| 3 | `20260305100000_condition_embeddings.sql` | PASS |
| 4 | `20260305200000_trend_detection.sql` | PASS |
| 5 | `20260305300000_hybrid_search.sql` | PASS |
| 6 | `20260305400000_switch_to_qwen_1024.sql` | PASS |

## Conclusion

All 42 verification items pass. The deep-pgvector change is fully integrated:
- 3 embedding tables with HNSW indexes and RLS
- 5 RPC functions (match_blood_tests, match_markers, match_conditions, find_similar_markers_over_time, hybrid_search_markers)
- Auto-embed pipeline on upload and condition creation (non-blocking)
- Search UI at /protected/search with semantic search, health Q&A, and marker trends
- Hybrid search combining FTS (30%) and vector similarity (70%)
- 1024-dim Qwen text-embedding-v4 embeddings via unified DashScope pipeline
- TypeScript compiles cleanly with no errors
