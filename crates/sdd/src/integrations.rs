use serde_json::Value;

/// Workflow docs for enriching SDD phase prompts with integration-specific context.
/// Runtime-agnostic — persistence is handled by the `ChangeStore` or a custom store trait.
pub struct WorkflowDocs {
    pub reference_docs: String,
    pub phase_contexts: serde_json::Map<String, Value>,
}

impl WorkflowDocs {
    /// Get phase-specific context, or empty string if not defined.
    pub fn phase_context(&self, phase: &str) -> String {
        self.phase_contexts
            .get(phase)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string()
    }

    /// Build enriched system prompt from base + phase context + reference docs.
    pub fn enrich(&self, base: &str, phase: &str) -> String {
        let phase_ctx = self.phase_context(phase);
        if phase_ctx.is_empty() && self.reference_docs.is_empty() {
            return base.to_string();
        }
        let mut result = base.to_string();
        if !phase_ctx.is_empty() {
            result.push_str("\n\n");
            result.push_str(&phase_ctx);
        }
        if !self.reference_docs.is_empty() {
            result.push_str("\n\n--- INTEGRATION REFERENCE ---\n");
            result.push_str(&self.reference_docs);
        }
        result
    }
}

// ── Seed Constants ────────────────────────────────────────────────────────

pub const SEED_REFERENCE_DOCS: &str = r#"# Adapter Integration Reference

## 6-Layer Adapter Stack

Every adapter integration follows the same layered architecture. Each layer has a
single responsibility and well-defined interfaces to adjacent layers.

### Layer 1: HttpClient
- REST API communication with the target venue
- Authentication (API key, HMAC, OAuth2 — venue-specific)
- Rate limiting with token-bucket algorithm
- Request signing and nonce management
- Retry logic with exponential backoff and jitter
- Response deserialization and error mapping

### Layer 2: WebSocketClient
- Persistent streaming connections for real-time data
- Automatic reconnection with exponential backoff
- Heartbeat/ping-pong keepalive management
- Message framing and deserialization
- Subscription management (subscribe/unsubscribe by channel)
- Connection state machine: DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING

### Layer 3: InstrumentProvider
- Instrument metadata loading and caching
- Symbol normalization (venue format ↔ internal format, bidirectional)
- Instrument type mapping (spot, perpetual, future, option)
- Precision/lot-size/tick-size extraction
- Filtering by instrument type, quote currency, or status
- Periodic refresh via configurable `update_instruments_interval`

### Layer 4: DataClient
- Market data subscriptions (order book L1/L2/L3, trades, bars, ticker)
- Snapshot + delta reconstruction for order book state
- Data normalization to internal models
- Subscription lifecycle management
- Historical data requests (if venue supports)
- Timestamp normalization to nanosecond precision

### Layer 5: ExecutionClient
- Order submission (limit, market, stop, stop-limit, trailing-stop)
- Order modification and cancellation
- Fill/execution report processing
- Position tracking and reconciliation
- Balance and margin queries
- Order type mapping (internal types → venue-specific types)
- Fill deduplication by trade ID
- Order state machine: INITIALIZED → SUBMITTED → ACCEPTED → PARTIALLY_FILLED → FILLED / CANCELED / REJECTED / EXPIRED

### Layer 6: Factories
- Wiring all layers into the host platform's node/engine
- Configuration validation and defaults
- Dependency injection of HttpClient, WebSocketClient into data/execution clients
- Registration of data types and instrument providers
- Lifecycle hooks: on_start, on_stop, on_reset, on_dispose

## Universal Lifecycle

```
CONFIGURE  →  Load config, create HttpClient, create WebSocketClient
REGISTER   →  Register instrument provider, data types, execution types
CONNECT    →  Connect WebSocket, load instruments, reconcile state
RUN        →  Stream data, process orders, handle fills
TEARDOWN   →  Cancel subscriptions, close connections, flush state
```
"#;

pub const SEED_EXPLORE: &str = "## Adapter Integration: Explore Phase Guidance\n\nFocus your exploration on:\n- Which of the 6 adapter layers are needed for this integration\n- Target venue API capabilities: REST endpoints, WebSocket channels, authentication scheme\n- Instrument types supported (spot, perpetual, futures, options)\n- Rate limits and any venue-specific constraints\n- Existing adapters that could serve as a template\n- Whether the venue provides a sandbox/testnet environment\n- Order types supported by the venue\n- Data feeds available (L1/L2/L3 order book, trades, bars)";

pub const SEED_PROPOSE: &str = "## Adapter Integration: Proposal Phase Guidance\n\nStructure the proposal around the 6 implementation phases:\n1. Core Infrastructure (HttpClient, WebSocketClient, config, error types)\n2. Instrument Provider (metadata, symbol normalization)\n3. Data Client (market data subscriptions and processing)\n4. Execution Client (order lifecycle, fills, positions)\n5. Factories (wiring into host platform)\n6. Tests (mock server, order lifecycle, reconnection)\n\nIdentify the closest existing adapter as a template.\nCall out venue-specific quirks (unusual auth, non-standard WebSocket framing, etc.).\nDefine what \"done\" means for each phase.";

pub const SEED_SPEC: &str = "## Adapter Integration: Spec Phase Guidance\n\nRequirements MUST cover all 6 layers of the adapter stack.\n\nFor each layer, include scenarios for:\n- Happy path (normal operation)\n- Failure/recovery (reconnect, rate limit exceeded, auth expired)\n- Edge cases (delisted instrument, partial fill, duplicate fill)\n\nKey requirement areas:\n- Authentication: credential types, refresh/rotation\n- Rate limiting: per-endpoint limits, burst handling\n- Reconnection: max attempts, backoff strategy, state recovery\n- Order lifecycle: all transitions in the order state machine\n- Data integrity: deduplication, sequence gap detection, reconciliation\n- Precision: price and quantity decimal handling per instrument";

pub const SEED_DESIGN: &str = "## Adapter Integration: Design Phase Guidance\n\nFile layout should follow the layer structure:\n- http_client — REST client\n- ws_client — WebSocket client\n- provider — InstrumentProvider\n- data — DataClient\n- execution — ExecutionClient\n- factories — Factory wiring\n- types — Shared types, enums, error types\n- config — Configuration\n\nDesign decisions to document:\n- WebSocket architecture: single connection multiplexed vs. multiple connections\n- Symbol normalization strategy: static map vs. dynamic derivation\n- Order state machine: transitions and event generation\n- Error taxonomy: retryable vs. non-retryable vs. rate-limited\n- Reconnection strategy: immediate vs. backoff vs. circuit breaker";

pub const SEED_TASKS: &str = "## Adapter Integration: Tasks Phase Guidance\n\nBreak implementation into the standard 6 phases:\n\nPhase 1 — Core Infrastructure:\n- Create config type with all universal fields\n- Implement HttpClient with auth and rate limiting\n- Implement WebSocketClient with reconnection\n- Define error types and venue error mapping\n\nPhase 2 — Instruments:\n- Implement instrument loading from REST API\n- Build bidirectional symbol normalization\n- Extract precision/lot-size/tick-size\n- Add periodic refresh mechanism\n\nPhase 3 — Data:\n- Implement WebSocket subscription management\n- Build order book snapshot + delta handler\n- Implement trade stream processor\n- Normalize all data to internal models\n\nPhase 4 — Execution:\n- Implement order submission (all supported types)\n- Implement order modify/cancel\n- Process fill/execution reports\n- Track positions with reconciliation\n- Deduplicate fills by trade ID\n\nPhase 5 — Factories:\n- Wire all layers in factory\n- Validate configuration\n- Implement lifecycle hooks\n\nPhase 6 — Tests:\n- Create mock server\n- Test order lifecycle end-to-end\n- Test reconnection scenarios\n- Test rate limiting behavior";

pub const SEED_APPLY: &str = "## Adapter Integration: Apply Phase Guidance\n\nWhen implementing:\n- Match the host platform's coding conventions and patterns exactly\n- Use an existing adapter as a template — copy structure, adapt logic\n- Enforce precision at every boundary (price, quantity, notional)\n- Implement rate limiting from the start (not as an afterthought)\n- WebSocket handler should be event-driven, not polling\n- All venue-specific strings (endpoints, channels, message types) should be constants\n- Error messages must include venue response body for debugging\n- Log at appropriate levels: DEBUG for data flow, INFO for lifecycle, WARN for retries, ERROR for failures";

pub const SEED_VERIFY: &str = "## Adapter Integration: Verify Phase Guidance\n\nCheck all 6 layers against the verification checklist in the reference:\n\n1. HttpClient: auth works, rate limits respected, retries correct\n2. WebSocketClient: connects, reconnects, heartbeat, subscriptions restored\n3. InstrumentProvider: all types loaded, symbols bidirectional, precision correct\n4. DataClient: order book correct, trades complete, timestamps nanosecond\n5. ExecutionClient: all order types work, fills deduplicated, positions reconcile\n6. Factories: wiring correct, config validated, lifecycle hooks work\n\nAdditionally verify:\n- No hardcoded credentials or endpoints\n- Precision handling matches venue specifications\n- Fill deduplication prevents duplicate events\n- Reconciliation runs on every reconnect\n- Clean shutdown releases all resources";
