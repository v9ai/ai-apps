# Dittofeed — AI Features Deep Report

> Research date: 2026-03-28. Source: GitHub repo `dittofeed/dittofeed`, docs at `docs.dittofeed.com`, source files.

---

## 1. Overview

**What it is:** Dittofeed is an open-source, omni-channel customer engagement and messaging automation platform. It positions itself as a self-hostable alternative to Customer.io, Braze, and OneSignal. The core value proposition is that all user PII stays inside your own VPC.

| Attribute | Value |
|---|---|
| GitHub Stars | ~2,700 |
| Forks | 332 |
| License | MIT |
| Latest release | v0.23.0 (December 1, 2025) |
| Total commits | 1,757 |
| Primary language | TypeScript 91.7%, MDX 6.7%, CSS 0.6% |
| Runtime | Node.js 18+, React 19 |
| ORM | Drizzle (migrated from Prisma in Q1 2025) |

**Supported channels:** Email (9 providers), SMS (Twilio, SignalWire), Mobile Push (defined, not fully implemented), Webhook (any HTTP endpoint), Slack (via webhook), WhatsApp (via webhook).

**Email providers:** SendGrid, Amazon SES, Resend, PostMark, SMTP, MailChimp, Gmail, Test (for CI). Each provider is configurable at workspace level with a fallback default.

**Infrastructure stack (from `docker-compose.yaml`):**
- PostgreSQL 15 — transactional data (journeys, templates, segments, user metadata)
- ClickHouse 24.12 — analytical event store and computed property engine
- Temporal 1.18 — durable workflow orchestrator for journeys
- Kafka / Redpanda (optional) — high-throughput event ingestion path
- MinIO — blob storage (file user properties, attachments)
- OpenTelemetry + Zipkin + Grafana + Prometheus — observability stack

---

## 2. AI Architecture

### 2.1 Current state: no production AI/LLM integration

A GitHub code search across the entire repository for `llm`, `openai`, `anthropic`, `embedding`, `ai` returns **zero results**. As of the research date, Dittofeed has **no production AI or LLM components** in its codebase. All intelligence is rule-based and deterministic.

### 2.2 Planned: Q3 2025 LLM roadmap item

The README roadmap states:

> **Q3 2025 (Planned):** LLM integration to "drive quicker, easier generation of journeys, segments, and templates."

This means the intended use of LLMs is **authoring assistance** (a co-pilot for building campaigns), not runtime AI-driven personalization or predictive scoring. Think: "describe a journey in English → LLM generates the node graph" rather than "model predicts best send time."

### 2.3 How personalization is handled today

Personalization is powered by **LiquidJS** — a JavaScript implementation of the Liquid templating language. The engine is configured with:

```typescript
// packages/backend-lib/src/liquid.ts
const engine = new Liquid({
  strictVariables: true,
  lenientIf: true,
  // custom filesystem for layout resolution
});
```

Template scope object passed at render time:

```typescript
{
  user: UserPropertyAssignments,   // resolved user properties
  workspace_id: string,
  subscription_group_id: string,
  identifier_key: string,
  is_preview: boolean,
  message_id: string,
  tags: MessageTags,
  secrets: Record<string, string>  // workspace secrets for API keys in webhooks
}
```

**Example template usage:**

```html
Hey {{ user.firstName | default: "there" }},

Your plan expires on {{ user.planExpiresAt | date: "%B %d, %Y" }}.
```

Custom Liquid tags beyond standard filters:
- `{% unsubscribe_link %}` / `{% unsubscribe_url %}` — cryptographically signed unsubscribe URLs
- `{% subscription_management_link %}` — subscription preferences page
- `{% view_in_browser_url %}` — HMAC-hashed browser view links
- `markdown` filter — renders markdown to HTML via `markdown-it`

There is no LLM-generated content at send time. Personalization is entirely static variable substitution from pre-computed user properties.

### 2.4 Segmentation intelligence

Segmentation is **purely deterministic** — no ML scoring or probabilistic classification. Segments are defined as typed node trees evaluated against ClickHouse event data on a polling schedule.

---

## 3. Key AI Features

### 3.1 Journey automation

Journeys are implemented as **Temporal durable workflows**. Each user's progress through a journey is a separate Temporal workflow instance, making the system fault-tolerant and resumable across restarts.

**Entry triggers (two types):**

| Type | Mechanism |
|---|---|
| `SegmentEntryNode` | Fires when a user enters a segment (computed property state transition) |
| `EventEntryNode` | Fires when a user performs a specific named track event |

**Node types available:**

| Node | Purpose | AI-driven? |
|---|---|---|
| `MessageNode` | Send email/SMS/push/webhook | No — template-based |
| `DelayNode` | Wait N seconds, until local time, or until a user property date | No — rule-based |
| `SegmentSplitNode` | Boolean branch on segment membership | No — deterministic |
| `WaitForNode` | Pause until user enters a segment | No — event-driven |
| `RateLimitNode` | Throttle message throughput | No — config-based |
| `RandomCohortNode` | Split users into percentage buckets for A/B | Pseudo-random |
| `ExitNode` | Terminate journey for this user | — |

**Journey state machine:**

```
NotStarted → Running ↔ Paused
```

- Paused: new enrollments halt; in-flight users continue except at `MessageNode` (they exit prematurely).
- Broadcasts are a simplified journey: `EveryoneSegment → MessageNode → Exit` with scheduling support (Draft → Scheduled → Running → Completed/Cancelled/Failed).

**No AI-suggested journey steps exist today.** The roadmap item for Q3 2025 would add LLM-driven authoring.

### 3.2 Message personalization / templating

**Template types:**

| Type | Format | AI? |
|---|---|---|
| `CodeEmailContents` | Raw HTML + LiquidJS | No |
| `LowCodeEmailContents` | Drag-and-drop JSON (Emailo editor) | No |
| SMS | Plain text + LiquidJS | No |
| Webhook | JSON body with LiquidJS rendering | No |
| Mobile Push | Title + body fields | No |

**MJML support:** Templates can optionally be rendered via MJML (Mailjet Markup Language) for responsive email. The system catches MJML errors and falls back to raw Liquid output.

**User property resolution pipeline:**

```
Track/Identify events → ClickHouse user_events_v2
→ computePropertiesIncremental (Temporal workflow, polling)
→ computed_property_assignments_v2
→ findAllUserPropertyAssignments(userId)
→ LiquidJS render(template, { user: assignments })
→ ESP send
```

**Template editor architecture** (React, `packages/dashboard`):
- Split-screen editor / preview with real-time rendering via `useRenderTemplateQuery` hook
- 300ms debounced draft saves
- Separate `userProperties` panel where you can edit example values to preview the rendered output
- Discriminated union state per channel type

### 3.3 User segmentation and cohort analysis

**Segment node types** (from `SegmentNodeType` enum):

| Node | Description |
|---|---|
| `Trait` | Filter on `identify` event trait value |
| `Performed` | Filter on `track` event frequency / recency |
| `LastPerformed` | Filter on properties from the most recent matching event |
| `KeyedPerformed` | Event-driven, keyed for `EventEntryNode` journeys |
| `And` / `Or` | Boolean logic over child nodes |
| `SubscriptionGroup` | Filter by opt-in/opt-out status |
| `Manual` | CSV upload for one-off lists |
| `RandomBucket` | Probabilistic — "percentage of users randomly assigned (0–1)" |
| `Broadcast` | Triggered by internal broadcast events |
| `Includes` | Array trait contains specific value |
| `Everyone` | Full workspace population |

**Operators** (`SegmentOperatorType`):

```
Equals | NotEquals | Exists | NotExists |
GreaterThanOrEqual | LessThan | Within (time window) |
HasBeen | AbsoluteTimestamp
```

**Computation engine:**

Segments are computed incrementally via a Temporal workflow (`computePropertiesWorkflow`) that:
1. Polls ClickHouse on a configurable interval (default ~15s + up to 1000ms jitter)
2. Queries `computed_property_state_v3` for delta changes
3. Evaluates segment trees via `segmentToResolvedState()`
4. Writes segment membership to `computed_property_assignments_v2`
5. Signals Temporal journey workflows when a user enters/exits a segment

State IDs are UUID v5 deterministic hashes based on definition timestamps + node IDs, enabling version tracking without full recomputation.

**Key ClickHouse query patterns:**

```sql
-- Retrieve latest segment membership
SELECT
  user_id,
  argMax(segment_value, assigned_at) as latest_segment_value
FROM computed_property_assignments_v2
WHERE workspace_id = {workspaceId}
  AND computed_property_id = {segmentId}
GROUP BY user_id

-- Event property extraction for trait discovery
SELECT
  JSONExtractKeys(properties) as trait_names
FROM user_events_v2
WHERE event_type = 'identify'
  AND workspace_id = {workspaceId}
```

**Manual segments:** CSV upload only; these are marked and prevented from entering "Running" status (they are static snapshots).

### 3.4 AI-suggested journey steps

**Does not exist today.** The Q3 2025 roadmap entry is the only planned feature. No code, no alpha branch, no issues in the tracker.

### 3.5 A/B testing via RandomCohortNode

The `RandomCohortNode` type splits users into percentage-based cohorts for A/B testing within a journey:

```typescript
// From types.ts
interface RandomCohortNode {
  type: "RandomCohortNode";
  // Splits users into percentage-based cohorts for testing
  children: Array<{ id: string; percentage: number }>;
}
```

This is structural A/B testing (different journey branches), not message-level multivariate testing.

---

## 4. Data Pipeline

### 4.1 Full pipeline: event ingestion → segmentation → journey trigger → send

```
Browser/Server SDK
  ↓ POST /api/public/track | identify | page | screen | batch
  ↓ (optional) POST /api/public/webhooks/segment  ← Segment CDP
API Service (Node.js, port 3001)
  ↓ writeUserEvents()
  ↓ Kafka (high-volume path) OR ch-async (direct async) OR ch-sync
ClickHouse → user_events_v2 table
  ↓
computePropertiesWorkflow (Temporal, polling ~15s)
  ↓ computePropertiesIncremental
  ↓ evaluates segment trees + user property definitions
  ↓ writes to computed_property_assignments_v2
  ↓ signals journey workflows via computePropertiesEarlySignal
Temporal Journey Workflow (per user)
  ↓ resolves next node
  ↓ sendMessageV2 activity
messaging.ts
  ↓ findAllUserPropertyAssignments(userId) ← ClickHouse
  ↓ renderValues(template, { user: assignments }) ← LiquidJS
  ↓ channel router: sendEmail / sendSms / sendWebhook
ESP (SendGrid / SES / Resend / etc.)
  ↓ delivery webhook → POST /api/public/webhooks/{provider}
ClickHouse → internal_events table (EmailDelivered, EmailOpened, EmailClicked, etc.)
  ↓ submitTrack() → feeds back into segmentation
```

### 4.2 Event types

**External events** (from SDK): `identify`, `track`, `page`, `screen`, `group`, `alias`

**Internal events** (prefixed `DF`): `MessageSent`, `EmailDelivered`, `EmailOpened`, `EmailClicked`, `EmailBounced`, `EmailMarkedSpam`, `MessageFailure`, `JourneyStarted`, `JourneyRestarted`, `JourneyEnded`, `BadWorkspaceConfiguration`, `MessageSkipped`

Internal events feed back into segmentation, enabling constructs like: "segment = users who received email but did not click within 3 days."

### 4.3 User property types that feed personalization

| Type | Source |
|---|---|
| `Trait` | Latest value from `identify` calls |
| `Performed` | Property from latest matching `track` event |
| `PerformedMany` | Array of all matching `track` event properties |
| `KeyedPerformed` | Performed property keyed to `EventEntryNode` context |
| `AnyOf` | Most recent value from multiple sub-properties |
| `File` | File reference (for attachments) |
| `Id` / `AnonymousId` | System-assigned identifiers |
| `Group` | Composite — B2B account-level properties |

**Default system properties:** `email`, `phone`, `deviceToken`, `firstName`, `lastName`, `language`, `accountManager`

### 4.4 Kafka path (optional)

When `BOOTSTRAP_EVENTS=true` and Kafka is configured, the API service routes events through Kafka for higher throughput. The worker consumes from Kafka and writes to ClickHouse. Without Kafka, events write directly to ClickHouse asynchronously (`ch-async` mode). The codebase has a TODO note about migrating Kafka to the new `user_events_v2` table structure, indicating the Kafka path is slightly behind the direct-CH path.

---

## 5. Evaluation / Quality

### 5.1 A/B testing

- **`RandomCohortNode`** in journeys enables structural A/B splits (different message branches, different delays)
- **`RandomBucketSegmentNode`** enables percentage-based holdout groups at the segment level
- No native message-level multivariate testing (no "variant A headline vs variant B headline" with automatic winner selection)
- No Bayesian or frequentist significance testing built in — you export data and analyze externally

### 5.2 Analytics dashboard

- **Delivery search**: filterable by journey, channel, userId, date range, custom properties; exportable to CSV
- **Journey statistics**: `buildHeritageMap()` computes a DAG of node relationships and calculates edge-level user flow percentages (what % of users took each branch)
- **Analysis page**: Added in v0.23.0, described as a "chart data retrieval" endpoint for dashboards — specifics are not yet fully documented
- **Message performance**: tracks delivery, open, click, bounce, spam events per message via ClickHouse

### 5.3 Testing SDK

A time-traveling test SDK is on the roadmap for CI/CD journey validation. Not yet released. Current testing relies on the `Test` provider channel type (emails sink to a test mailbox, not a real ESP).

---

## 6. Rust/ML Relevance

### 6.1 Current hot paths — migration targets for Rust

| Component | Language | Bottleneck | Rust opportunity |
|---|---|---|---|
| `computePropertiesIncremental` | TypeScript | CPU-bound segment tree evaluation per user | Rust WASM or native binary for tree evaluation |
| LiquidJS template rendering | JavaScript (V8) | Template parsing + rendering at send time | Rust `liquid` crate or `minijinja` |
| Event ingestion controller | TypeScript / Node.js | I/O + JSON parsing | Axum-based ingestion endpoint |
| ClickHouse query builder | TypeScript | String manipulation, minimal CPU | Lower priority |

The segment tree evaluator (`segmentToResolvedState`) processes potentially millions of user-segment pairs on each polling cycle. This is the highest-value hot path for a Rust rewrite. The logic is pure function evaluation (no I/O inside the tight loop) — ideal for Rust.

### 6.2 ML-based segmentation — what would need to be added

Dittofeed's current segmentation is entirely rule-based. Adding ML would require:

1. **Feature extraction layer**: User event sequences → feature vectors (e.g., event frequency, recency, monetary — RFM features, or learned embeddings)
2. **Scoring service**: A model endpoint (or embedded inference) that scores users against a target behavior (churn propensity, upgrade likelihood, etc.)
3. **New segment node type**: `MLScoreNode` — "users where churn_score >= 0.7" — consuming the scoring service output
4. **Score persistence**: Writing ML scores to `computed_property_assignments_v2` as a new property type, then using existing `TraitSegmentNode` with `GreaterThanOrEqual` operator

Using the existing `UserPropertyDefinitionType` system, you could add an `MLScored` type that calls an inference endpoint and caches the result in ClickHouse. The polling architecture already exists.

**Rust/Candle approach** for the M1 stack noted in this project's preferences:
- Embed a Candle-based binary that reads from ClickHouse, runs a gradient boosted tree or small transformer, writes scores back
- Invoke on the same polling schedule as `computePropertiesIncremental`
- No changes to the Temporal workflow layer needed — just a new computed property type

### 6.3 LLM integration path (Q3 2025 plan interpretation)

The most likely implementation for the planned LLM feature is a **journey/segment authoring assistant**:

```
User types: "Send a re-engagement email to users who haven't
logged in for 30 days with a 10% coupon"
→ LLM generates:
  - PerformedSegmentNode (event: "login", within: 30d, count: 0)
  - Journey: SegmentEntry → DelayNode(1d) → MessageNode(re-engagement-template)
  - Template: HTML with {{ user.firstName }} and {{ coupon_code }}
```

This would require an API route that sends the natural language description plus the current schema to an LLM and receives a `JourneyDefinition` + `SegmentDefinition` JSON back. The typed schemas already exist in `isomorphic-lib/src/types.ts` and would serve as the output grammar for structured generation.

---

## 7. Integration Points

### 7.1 Public REST API

Base URL: `https://your-dittofeed-host.com/api/public`

Authentication: `writeKey` (workspace-scoped API key, passed as Bearer token or in request body)

**Event ingestion endpoints:**

| Method | Path | Payload |
|---|---|---|
| `POST` | `/track` | `{ userId, event, properties, timestamp }` |
| `POST` | `/identify` | `{ userId, traits, timestamp }` |
| `POST` | `/page` | `{ userId, name, properties }` |
| `POST` | `/screen` | `{ userId, name, properties }` |
| `POST` | `/batch` | `{ batch: [{ type, ...}] }` |
| `POST` | `/group` | `{ userId, groupId, traits }` |

**Webhook consumption:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/webhooks/segment` | Segment CDP inbound |
| `POST` | `/webhooks/sendgrid` | SendGrid delivery events |
| `POST` | `/webhooks/ses` | Amazon SES delivery events |
| `POST` | `/webhooks/postmark` | PostMark delivery events |
| `POST` | `/webhooks/resend` | Resend delivery events |
| `POST` | `/webhooks/twilio` | Twilio SMS delivery events |

**Admin API (authenticated, separate path `/api`):**

Journeys, segments, templates, broadcasts, user properties — full CRUD. User management, subscription group management, workspace management.

### 7.2 Node.js SDK

```bash
npm install @dittofeed/sdk-node
```

```typescript
import { DittofeedSdk } from "@dittofeed/sdk-node";

const sdk = DittofeedSdk.init({
  writeKey: "Basic your-workspace-write-key",
});

// Identify a lead/user
await sdk.identify({
  userId: "lead-123",
  traits: {
    email: "cto@acme.com",
    firstName: "Alice",
    company: "Acme Corp",
    planTier: "trial",
    signedUpAt: "2025-03-01T00:00:00Z",
  },
});

// Track a conversion event
await sdk.track({
  userId: "lead-123",
  event: "Demo Requested",
  properties: {
    source: "outbound-sequence-1",
    companySize: "50-200",
  },
});

await sdk.flush(); // ensure delivery before process exit
```

### 7.3 Web SDK

```bash
npm install @dittofeed/sdk-web
```

Supports anonymous ID auto-generation and persistence, subscription group management:

```typescript
import { DittofeedSdk } from "@dittofeed/sdk-web";

const sdk = DittofeedSdk.init({ writeKey: "..." });

// Subscribe/unsubscribe from messaging groups
sdk.subscribe({ userId: "lead-123", subscriptionGroupId: "outbound-emails" });
sdk.unsubscribe({ userId: "lead-123", subscriptionGroupId: "outbound-emails" });
```

### 7.4 Data source integrations

| Source | Method |
|---|---|
| Segment CDP | Webhook to `/api/public/webhooks/segment` with shared secret |
| Reverse ETL (dbt, Hightouch, etc.) | REST `/api/public/identify` + `/batch` |
| Direct API | SDKs or raw HTTP |
| CSV manual upload | For manual segments in the dashboard |

### 7.5 Connecting a B2B lead gen pipeline

For the lead-gen platform in this codebase, the integration pattern would be:

```typescript
// In a resolver or background job after company enrichment
import { DittofeedSdk } from "@dittofeed/sdk-node";

const sdk = DittofeedSdk.init({ writeKey: process.env.DITTOFEED_WRITE_KEY });

// After discovering and enriching a lead contact
await sdk.identify({
  userId: contact.email, // or internal UUID
  traits: {
    email: contact.email,
    firstName: contact.firstName,
    company: company.name,
    companySize: company.employeeCount,
    aiTier: company.aiTier,              // from enrichment
    isRemoteFriendly: company.isRemote,  // from classifier
    techStack: company.techStack.join(","),
    leadScore: contact.leadScore,
    discoveredAt: new Date().toISOString(),
  },
});

// Trigger a specific journey (via track event)
await sdk.track({
  userId: contact.email,
  event: "Lead Enriched",
  properties: {
    sourceSequence: "ashby-board-discovery",
    enrichmentConfidence: 0.87,
  },
});
```

A Dittofeed journey would then trigger on `EventEntryNode("Lead Enriched")` and route through:
- `SegmentSplitNode` → `aiTier >= 2` branch → personalized AI-focused template
- `DelayNode(2 days)` → follow-up
- `WaitForNode("Demo Requested" segment)` → exit if converted

---

## 8. Gaps / Weaknesses

### 8.1 AI feature comparison vs. Braze / Iterable / Customer.io

| Feature | Dittofeed | Customer.io | Braze | Iterable |
|---|---|---|---|---|
| LLM journey authoring | Planned Q3 2025 | No | No | No |
| Predictive churn/LTV scoring | **None** | Basic (Predictive Attributes) | Yes (Predictive Suite) | Yes (AI Optimization) |
| Send time optimization | **None** | Yes | Yes (Intelligent Timing) | Yes |
| Message frequency capping (ML) | **None** | Basic rules | Yes | Yes |
| Content recommendations | **None** | No | Yes (Connected Content) | No |
| NLP-based segment discovery | **None** | No | No | No |
| Embedding-based user similarity | **None** | No | No | No |
| A/B winner auto-selection | **None** | Yes | Yes | Yes |
| Multivariate testing | **None** (structural only) | Yes | Yes | Yes |

### 8.2 Technical gaps

- **No send-time optimization**: Messages send when the journey reaches a MessageNode, not at the user's optimal engagement time. Braze's "Intelligent Timing" uses historical open-rate data per user to pick the best send window.
- **No frequency capping at the ML level**: Only `RateLimitNode` for coarse throttling.
- **Mobile Push is stubbed**: `sendMobilePush()` is defined but "not implemented" in `messaging.ts`.
- **Kafka path is behind**: The Kafka consumer has a TODO note about migrating to the new ClickHouse table structure.
- **No webhook delivery retry with backoff**: The `sendWebhook()` function has basic retry logic but no exponential backoff or dead-letter queue.
- **No native Reverse ETL**: Relies on external tools (Hightouch, Census) + REST API rather than native database connectors.
- **Git-based campaign management** (described in README) is not yet implemented as of v0.23.0.
- **Analytics dashboard** is early-stage: the "Analysis page" in v0.23.0 is newly added and underdocumented.
- **No suppression lists** with automatic management: bounce/spam tracking exists but suppression is manual.

### 8.3 Segmentation limitations

- All segment evaluation is synchronous/polling — no real-time streaming evaluation (Kafka Streams / Flink style).
- `PerformedSegmentNode` with large event histories can produce expensive ClickHouse full-scans.
- No approximate nearest-neighbor or embedding-based "similar users" segments.
- `ManualSegment` (CSV) cannot be auto-refreshed — it is a one-time import.

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 Using Dittofeed as the outreach layer

Dittofeed is a viable outreach execution layer for the lead gen pipeline. Its key strengths for this use case:

1. **Self-hostable with Neon-compatible architecture**: The lead-gen platform uses Neon PostgreSQL. Dittofeed's Postgres can point to Neon. All PII stays in your infrastructure.
2. **Event-driven journeys via REST**: The Node.js SDK maps directly onto the existing lead gen pipeline's enrichment events.
3. **9 email providers**: Can route through Resend (already used in the lead-gen stack per `schema.ts`), SES, or others with fallback logic.
4. **Webhook channel**: Any journey step can fire a webhook — useful for triggering downstream CRM updates, Slack notifications, or LinkedIn outreach signals.
5. **MIT license**: No per-seat or per-message fees. Operational cost is just infrastructure.

### 9.2 Event-driven journey automation for leads

**Recommended journey architecture** for a B2B outbound sequence:

```
EventEntryNode("Lead Qualified")
│
├─ DelayNode(1 day)
│
├─ MessageNode(email: "Initial Outreach")
│   Template: {{ user.firstName }}, saw {{ user.company }} is hiring
│             {{ user.aiRoleCount }} AI engineers — I help teams like
│             yours with [value prop].
│
├─ WaitForNode(segment: "Replied" OR "Demo Requested", timeout: 3 days)
│   ├─ [entered segment] → ExitNode
│   └─ [timeout] → DelayNode(2 days)
│                    └─ MessageNode(email: "Follow-up #1")
│                        └─ WaitForNode(3 days)
│                            ├─ [entered] → ExitNode
│                            └─ [timeout] → MessageNode(email: "Break-up")
│                                           └─ ExitNode
│
ExitNode
```

**Segmentation for lead routing:**

```
Segment "High-Value AI Lead":
  And(
    TraitNode(aiTier >= 2),
    TraitNode(isRemoteFriendly == true),
    TraitNode(leadScore >= 70),
    PerformedNode(event: "Job Posted", within: 30 days, count >= 1)
  )
```

### 9.3 What you would need to build on top of Dittofeed

To turn Dittofeed into a competitive AI-first outreach layer for the lead-gen platform:

1. **Lead scoring as a computed property**: Add a `MLScored` user property type backed by a Candle/Rust model that reads event history and writes a churn/conversion probability to `computed_property_assignments_v2`.

2. **Send-time optimization**: A lightweight Temporal activity that looks up a user's historical email engagement data from ClickHouse, finds the modal open-hour, and overrides the `DelayNode` with a `UserPropertyDelayVariant` computed by the model.

3. **LLM-personalized first lines**: Add a pre-send Temporal activity that calls an LLM (DeepSeek via existing `@ai-apps/deepseek` package) to generate a personalized opening line based on `user.company`, `user.recentNews`, `user.techStack`, and injects it as a user property (`firstLine`) before LiquidJS rendering.

4. **Auto-stopping underperforming sequences**: A background job that queries delivery analytics from ClickHouse, computes per-sequence open rates, and automatically transitions journeys to `Paused` when below threshold — using the admin API `PATCH /api/journeys/:id`.

5. **Suppression list automation**: Subscribe to `EmailBounced` and `EmailMarkedSpam` internal events; add users to a `DoNotContact` subscription group automatically.

### 9.4 Infrastructure colocation

Since the lead-gen platform is on Vercel + Neon, the cleanest deployment is:

```
Dittofeed (self-hosted, Docker Compose on a VPS or Render)
  ↕ REST API
Lead-gen platform (Vercel)
  ↕ Drizzle → Neon
  (same Neon DB can serve as Dittofeed's Postgres if on same Neon project)
```

Dittofeed's ClickHouse and Temporal would run alongside it. The Neon database can be shared (Dittofeed uses its own schema tables). This avoids running two separate Postgres instances.

### 9.5 Bottom line

Dittofeed is a **solid, production-ready messaging infrastructure layer with zero AI today**. For a senior AI engineer building a competing or complementary platform, the relevant observations are:

- The deterministic segment + journey engine is well-architected (Temporal + ClickHouse is the right stack)
- The LiquidJS personalization is functional but static — the gap is real-time ML scoring and LLM-assisted content generation
- The TypeScript codebase has identified hot paths (segment tree evaluation, template rendering) that would benefit from Rust for high-scale workloads
- The Q3 2025 LLM feature is authoring assistance, not runtime AI — the bigger AI opportunity (predictive engagement, embeddings-based segmentation) is entirely open
- With ~2,700 stars and MIT license, it's a viable foundation to fork, extend with ML, and build a differentiated AI-native engagement platform on top of

---

*Sources: github.com/dittofeed/dittofeed (source code), docs.dittofeed.com, GitHub issues tracker, release notes v0.21.0–v0.23.0*
