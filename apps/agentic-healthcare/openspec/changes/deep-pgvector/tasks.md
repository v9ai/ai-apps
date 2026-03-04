# Tasks: deep-pgvector

Status: **ALL COMPLETE**

## Phase 0: Qwen Package (P0)
- [x] Create `packages/qwen/` TypeScript package with QwenClient
- [x] Implement embed(), embedOne(), chat() methods
- [x] Add types: EmbeddingRequest/Response, ChatRequest/Response
- [x] Write integration tests (8 tests: single/batch/custom-dim embed, similarity, chat, system prompt, error)
- [x] Create `crates/qwen/` Rust crate with same API surface
- [x] Write Rust integration tests (8 tests, all passing)

## Phase 1: Marker Embeddings + Auto-Embed (P0)
- [x] Migration: `20260305000000_marker_embeddings.sql` — blood_marker_embeddings table, HNSW index, RLS, match_markers RPC
- [x] Enhanced match_blood_tests RPC with file_name/test_date join (DROP + recreate for return type change)
- [x] `lib/embeddings.ts` — add formatMarkerForEmbedding, embedBloodTest, embedBloodMarkers using @repo/qwen
- [x] `actions.ts` — auto-embed test + markers after upload (non-blocking try/catch)
- [x] `reembed-action.ts` — refactor to use shared embed functions, now also embeds markers

## Phase 2: Condition Embeddings + Enhanced Q&A (P1)
- [x] Migration: `20260305100000_condition_embeddings.sql` — condition_embeddings table, HNSW index, RLS, match_conditions RPC
- [x] `lib/embeddings.ts` — add formatConditionForEmbedding, embedCondition
- [x] `conditions/actions.ts` — auto-embed after addCondition (non-blocking)
- [x] `search-actions.ts` — enhance askHealthQuestion to search conditions in parallel, include in context

## Phase 3: Search & Q&A UI (P1)
- [x] `search/page.tsx` — server component with 3 sections (search, Q&A, trends)
- [x] `search/search-form.tsx` — Tests/Markers toggle, similarity badges, links to test detail
- [x] `search/qa-form.tsx` — question input, AI answer, sources + conditions badges
- [x] `search/trends-section.tsx` — marker trend table with date, value, flag, test link
- [x] `layout.tsx` — add Search nav link
- [x] `search-actions.ts` — add searchMarkers, getMarkerTrend actions

## Phase 4: Trend Detection (P2)
- [x] Migration: `20260305200000_trend_detection.sql` — find_similar_markers_over_time RPC

## Phase 5: Hybrid Search (P3)
- [x] Migration: `20260305300000_hybrid_search.sql` — tsvector generated column, GIN index, hybrid_search_markers RPC

## Phase 6: Switch to Qwen (P0)
- [x] Migration: `20260305400000_switch_to_qwen_1024.sql` — convert all vector(1536) to vector(1024), recreate all RPCs
- [x] `lib/embeddings.ts` — replace OpenAI/DeepSeek with @repo/qwen QwenClient
- [x] `search-actions.ts` — replace OpenAI GPT-4o-mini with qwen.chat() (qwen-plus)
- [x] Remove `openai` npm dependency, add `@repo/qwen` workspace dependency
- [x] All migrations pushed to remote Supabase successfully
- [x] TypeScript compiles cleanly
