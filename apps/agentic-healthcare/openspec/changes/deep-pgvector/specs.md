# Specifications: deep-pgvector

## 1. Package: `@repo/qwen` (TypeScript)

**Location:** `packages/qwen/`

### REQ-QWEN-TS-001: Client construction
- `QwenClient({ apiKey, baseURL? })` accepts a required API key and optional base URL.
- Default base URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`.
- Trailing slashes on `baseURL` are stripped.

### REQ-QWEN-TS-002: Embedding generation
- `embed(EmbeddingRequest)` sends a POST to `/embeddings`.
- `model` defaults to `text-embedding-v4` when omitted.
- `dimensions` defaults to `1024` when omitted.
- `input` accepts `string | string[]`.
- Optional `encoding_format` (`"float" | "base64"`) is forwarded only when set.
- Returns `EmbeddingResponse` with `data[].embedding: number[]`, `model`, and `usage`.

### REQ-QWEN-TS-003: Single-text embedding convenience
- `embedOne(text: string)` returns `Promise<number[]>`.
- Calls `embed()` internally and extracts `data[0].embedding`.

### REQ-QWEN-TS-004: Chat completion
- `chat(ChatRequest)` sends a POST to `/chat/completions`.
- `model` defaults to `qwen-plus` when omitted.
- Accepts `messages: ChatMessage[]`, optional `temperature`, optional `max_completion_tokens`.
- Returns `ChatResponse` with `id`, `model`, `choices[].message.content`.

### REQ-QWEN-TS-005: Error handling
- Non-2xx responses throw an `Error` with message format:
  `DashScope API error {status}: [{code}] {message}`.
- If the response body is not a valid DashScope error, falls back to raw body text.

---

## 2. Crate: `qwen` (Rust)

**Location:** `crates/qwen/`

### REQ-QWEN-RS-001: Client construction
- `Client::new(api_key)` builds a `reqwest::Client` with `Authorization: Bearer {key}` default header.
- Default base URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`.
- `with_base_url(url)` builder method overrides the base URL.

### REQ-QWEN-RS-002: Embedding generation
- `embed(EmbeddingRequest) -> Result<EmbeddingResponse>`.
- `EmbeddingRequest::new(text)` defaults to model `text-embedding-v4`, dimensions `1024`.
- `EmbeddingRequest::batch(Vec<String>)` for multi-input.
- Builder methods: `with_model()`, `with_dimensions()`.

### REQ-QWEN-RS-003: Single-text embedding convenience
- `embed_one(text) -> Result<Vec<f32>>` calls `embed()` and extracts the first vector.

### REQ-QWEN-RS-004: Chat completion
- `chat(ChatRequest) -> Result<ChatResponse>`.
- `ChatRequest::new(model, messages)` constructor.
- `ChatMessage::user(content)` and `ChatMessage::system(content)` constructors.
- `ChatResponse::text() -> Option<&str>` convenience accessor.

### REQ-QWEN-RS-005: Error types
- `Error::Api { status, error: ApiError }` -- structured DashScope error with `code`, `message`, `request_id` (all optional).
- `Error::Http { status, body }` -- non-JSON error responses.
- `Error::Network` -- transport-level failures (from `reqwest`).
- `Error::Json` -- deserialization failures.
- `Result<T>` type alias defined for convenience.

---

## 3. Database Schema (pgvector)

### REQ-DB-001: blood_test_embeddings table
- Columns: `id` (uuid PK), `test_id` (uuid FK unique to `blood_tests`), `user_id` (uuid FK to `auth.users`), `content` (text), `embedding` (vector(1024)), `created_at` (timestamptz).
- HNSW index with `vector_cosine_ops` on `embedding`.
- RLS enabled; policy: users can only access rows where `user_id = auth.uid()`.

### REQ-DB-002: blood_marker_embeddings table
- Columns: `id` (uuid PK), `marker_id` (uuid FK to `blood_markers`), `test_id` (uuid FK to `blood_tests`), `user_id` (uuid FK to `auth.users`), `marker_name` (text, denormalized), `content` (text), `embedding` (vector(1024)), `fts` (tsvector, generated from `content`), `created_at` (timestamptz).
- HNSW index on `embedding`; GIN index on `fts`.
- B-tree index on `(user_id, marker_name)` for trend grouping.
- RLS enabled; policy: users can only access their own rows.

### REQ-DB-003: condition_embeddings table
- Columns: `id` (uuid PK), `condition_id` (uuid FK unique to `conditions`), `user_id` (uuid FK to `auth.users`), `content` (text), `embedding` (vector(1024)), `created_at` (timestamptz).
- HNSW index on `embedding`.
- RLS enabled; policy: users can only access their own rows.

### REQ-DB-004: RPC match_blood_tests
- Parameters: `query_embedding` (vector(1024)), `match_threshold` (float, default 0.5), `match_count` (int, default 5).
- Returns: `id`, `test_id`, `content`, `similarity`, `file_name`, `test_date`.
- Joins `blood_test_embeddings` with `blood_tests` to return denormalized metadata.
- Filters by `auth.uid()` and similarity > threshold.
- Ordered by cosine distance ascending.

### REQ-DB-005: RPC match_markers
- Parameters: `query_embedding` (vector(1024)), `match_threshold` (float, default 0.5), `match_count` (int, default 10).
- Returns: `id`, `marker_id`, `test_id`, `marker_name`, `content`, `similarity`.
- Filters by `auth.uid()` and similarity > threshold.
- Ordered by cosine distance ascending.

### REQ-DB-006: RPC match_conditions
- Parameters: `query_embedding` (vector(1024)), `match_threshold` (float, default 0.5), `match_count` (int, default 5).
- Returns: `id`, `condition_id`, `content`, `similarity`.
- Filters by `auth.uid()` and similarity > threshold.
- Ordered by cosine distance ascending.

### REQ-DB-007: RPC find_similar_markers_over_time
- Parameters: `query_embedding` (vector(1024)), `match_threshold` (float, default 0.5), `match_count` (int, default 50), `exact_marker_name` (text, default null).
- Returns: `marker_id`, `test_id`, `marker_name`, `content`, `similarity`, `value`, `unit`, `flag`, `test_date`, `file_name`.
- Joins `blood_marker_embeddings` with `blood_markers` and `blood_tests`.
- When `exact_marker_name` is provided, filters to only that marker name.
- Ordered by `test_date ASC NULLS LAST`, then cosine distance.

### REQ-DB-008: RPC hybrid_search_markers
- Parameters: `query_text` (text), `query_embedding` (vector(1024)), `match_count` (int, default 10), `fts_weight` (float, default 0.3), `vector_weight` (float, default 0.7), `match_threshold` (float, default 0.3).
- Returns: `marker_id`, `test_id`, `marker_name`, `content`, `fts_rank`, `vector_similarity`, `combined_score`.
- Matches rows where FTS matches (`websearch_to_tsquery`) OR vector similarity > threshold.
- Combined score = `fts_weight * ts_rank + vector_weight * cosine_similarity`.
- Ordered by `combined_score DESC`.

### REQ-DB-009: Dimension migration
- Migration `20260305400000_switch_to_qwen_1024.sql` converts all embedding columns from vector(1536) to vector(1024).
- Drops and recreates all dependent functions, indexes, and the `fts` column atomically.

---

## 4. App Integration: Embedding Pipeline

### REQ-EMBED-001: Centralized embedding module
- `lib/embeddings.ts` exports all formatting and embedding functions.
- Uses a singleton `QwenClient` configured from `DASHSCOPE_API_KEY` and optional `DASHSCOPE_BASE_URL` env vars.
- `generateEmbedding(text)` delegates to `qwen.embedOne(text)`.

### REQ-EMBED-002: Test-level embedding content format
- `formatTestForEmbedding(markers, { fileName, uploadedAt })` produces:
  - Header: `Blood test: {fileName}`, `Date: {uploadedAt}`.
  - Summary line listing abnormal marker count and names, or "All markers within normal range".
  - One line per marker: `{name}: {value} {unit} (ref: {range}) [{flag}]`.

### REQ-EMBED-003: Marker-level embedding content format
- `formatMarkerForEmbedding(marker, { fileName, testDate })` produces a multi-line string with: Marker name, Value with unit, Reference range, Flag, Test file name, Date.

### REQ-EMBED-004: Condition embedding content format
- `formatConditionForEmbedding(name, notes)` produces:
  - With notes: `Health condition: {name}\nNotes: {notes}`.
  - Without notes: `Health condition: {name}`.

### REQ-EMBED-005: Upsert semantics
- `embedBloodTest()` upserts on `test_id` (one embedding per test).
- `embedBloodMarkers()` iterates markers and upserts each on `marker_id`.
- `embedCondition()` upserts on `condition_id` (one embedding per condition).
- All pass embeddings as `JSON.stringify(embedding)` to Supabase.

---

## 5. App Integration: Auto-Embed Hooks

### REQ-HOOK-001: Blood test upload auto-embed
- After markers are inserted in the upload flow, `embedBloodTest()` and `embedBloodMarkers()` are called.
- Both calls are wrapped in try/catch so embedding failure does not block the upload.

### REQ-HOOK-002: Condition add auto-embed
- After `addCondition()` succeeds, `embedCondition()` is called.
- Wrapped in try/catch so embedding failure does not block condition creation.

---

## 6. App Integration: Search Actions

### REQ-SEARCH-001: searchBloodTests(query)
- Generates embedding for query, calls `match_blood_tests` RPC with threshold 0.3, limit 5.
- Returns array of `{ id, test_id, content, similarity, file_name, test_date }`.
- Requires authenticated user; redirects to login otherwise.

### REQ-SEARCH-002: searchMarkers(query)
- Generates embedding for query, calls `match_markers` RPC with threshold 0.3, limit 10.
- Returns array of `{ id, marker_id, test_id, marker_name, content, similarity }`.
- Requires authenticated user.

### REQ-SEARCH-003: askHealthQuestion(question)
- Generates a single embedding for the question.
- Searches blood tests and conditions in parallel using `Promise.all`.
- If no results found, returns a guidance message (no AI call).
- Builds context string with labeled sections: "BLOOD TEST RESULTS" and "KNOWN HEALTH CONDITIONS".
- Calls `qwen.chat()` with `qwen-plus`, temperature 0.3, max 1024 tokens.
- System prompt instructs the model to: provide factual observations, note out-of-range values, consider condition-marker relationships, and remind the user to consult a doctor.
- Returns `{ answer, sources[], conditions[] }` where sources include `testId`, `similarity`, `fileName`, `testDate`.

### REQ-SEARCH-004: getMarkerTrend(query, markerName?)
- Generates embedding for query, calls `find_similar_markers_over_time` RPC with threshold 0.3, limit 50.
- Passes `exact_marker_name` when provided (null otherwise).
- Returns array with marker values, units, flags, test dates, and file names ordered by date.

---

## 7. App Integration: Search UI

### REQ-UI-001: Search page layout
- Route: `/protected/search`.
- Three sections separated by dividers: Semantic Search, Health Q&A, Marker Trends.
- Max width 800px, centered.

### REQ-UI-002: Search form
- Client component with a text input and a Tests/Markers toggle.
- Calls `searchBloodTests` or `searchMarkers` server action based on toggle.
- Displays results with similarity scores.

### REQ-UI-003: Q&A form
- Client component with a text input for health questions.
- Calls `askHealthQuestion` server action.
- Displays the AI-generated answer plus source test references and matched conditions.

### REQ-UI-004: Trends section
- Client component for querying marker trends.
- Calls `getMarkerTrend` server action.
- Displays results in a table ordered by test date.

### REQ-UI-005: Navigation
- Layout nav bar includes a "Search" link pointing to `/protected/search`.

---

## 8. Scenarios

### SCEN-001: Upload blood test PDF -- markers parsed and embeddings auto-generated
**Given** a user is authenticated and uploads a blood test PDF
**When** the PDF is parsed and markers are inserted into the database
**Then** `embedBloodTest()` generates a test-level embedding and upserts it into `blood_test_embeddings`
**And** `embedBloodMarkers()` generates one embedding per marker and upserts each into `blood_marker_embeddings`
**And** each marker embedding row contains a denormalized `marker_name`
**And** the upload response indicates success

### SCEN-002: Add condition -- condition embedding auto-generated
**Given** a user is authenticated and adds a health condition with name and optional notes
**When** the condition is inserted into the database
**Then** `embedCondition()` generates a condition embedding and upserts it into `condition_embeddings`
**And** the content contains the condition name and notes (if present)
**And** the add-condition response indicates success

### SCEN-003: Search by test or marker -- results with similarity scores
**Given** a user has uploaded blood tests with embeddings
**When** the user enters a natural language query on the search page
**And** selects "Tests" mode
**Then** `searchBloodTests` returns matching tests with similarity scores, file names, and test dates
**When** the user selects "Markers" mode
**Then** `searchMarkers` returns matching individual markers with similarity scores and marker names
**And** results are ordered by similarity (highest first)
**And** only results above the 0.3 similarity threshold are returned

### SCEN-004: Ask health question -- answer uses blood test and condition context
**Given** a user has uploaded blood tests and added health conditions
**When** the user submits a health question via the Q&A form
**Then** the system generates one embedding for the question
**And** searches blood tests and conditions in parallel
**And** constructs a combined context with both data types
**And** sends the context to `qwen-plus` with a healthcare-specific system prompt
**And** returns the AI answer along with source references (test IDs, similarities) and matched conditions

### SCEN-005: Search marker trend -- values ordered by date
**Given** a user has multiple blood tests with overlapping marker names
**When** the user queries a marker trend (e.g., "hemoglobin") with an optional exact marker name filter
**Then** `getMarkerTrend` returns matching markers with their values, units, flags, and test dates
**And** results are ordered by `test_date ASC` (earliest first)
**And** when `exact_marker_name` is specified, only markers with that exact name are returned

### SCEN-006: Embedding failure -- upload/add still succeeds (non-blocking)
**Given** the DashScope API is unreachable or returns an error
**When** a user uploads a blood test PDF
**Then** the markers are still inserted into the database
**And** the upload succeeds without an error visible to the user
**And** no embedding rows are created for that test
**When** a user adds a health condition
**Then** the condition is still created in the database
**And** the add-condition operation succeeds without an error visible to the user

### SCEN-007: Invalid API key -- clear error message
**Given** the `DASHSCOPE_API_KEY` environment variable contains an invalid key
**When** `QwenClient` attempts an embed or chat request
**Then** the TypeScript client throws an `Error` with message matching `DashScope API error 401: [InvalidApiKey] ...`
**And** the Rust client returns `Error::Api` with `status` 401 and `error.code` of `"InvalidApiKey"`
**And** in the auto-embed flow, this error is caught silently (non-blocking)
**And** in the search/Q&A flow, the error propagates to the UI
