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

---

## 10. Deep ML Analysis

### 10.1 Temporal durable execution as an ML pipeline substrate

Temporal's durable execution model makes it uniquely well-suited for LLM and ML pipelines. The key properties:

**Retry semantics:** When a Temporal `Activity` fails (e.g., an LLM API call returns a 429 rate limit or a 500), Temporal automatically retries according to a configurable `RetryPolicy` (initial interval, backoff coefficient, max attempts, non-retryable error types). The retry state persists in Temporal's event log — a worker crash between retry attempts does not lose the retry counter. This is fundamentally different from application-level retry logic in a stateless Node.js function, where a process restart resets the retry state.

**Saga pattern for multi-step ML pipelines:** If a Dittofeed journey reaches a `MessageNode` that calls an LLM to generate a personalized first line (hypothetical), and the downstream send step fails, Temporal can execute a compensating transaction (mark the send as failed, increment retry, signal the journey to wait). The saga pattern is native: each step is an Activity with a corresponding compensation Activity; the workflow orchestrates the saga without manual rollback logic.

**Non-determinism with `SideEffect`:** LLM outputs are non-deterministic — replaying a workflow to recover from a crash would re-call the LLM and get a different result. Temporal's `sideEffect()` primitive executes a function once, records the result in the event history, and replays the recorded result on subsequent replays. This makes LLM calls replay-safe within a Temporal workflow.

**Implication for Dittofeed's Q3 2025 roadmap:** The planned LLM integration for "journey, segment, and template authoring" is well-served by Temporal's architecture. Each LLM authoring request (user types natural language → LLM generates journey JSON) can be a Temporal activity, which means: it retries on API failure, its output is durably stored in the event log, and partial workflow progress (e.g., segment created but journey not yet created) is recoverable without re-running the entire authoring pipeline.

### 10.2 ClickHouse as a feature store for ML scoring models

ClickHouse is one of the most capable analytical databases for serving ML features at real-time latency. Its relevance to an ML-augmented Dittofeed:

**Materialized views for pre-computed features:** ClickHouse materialized views execute SQL aggregations at insert time, not at query time. This achieves sub-second end-to-end latency for features like "email open rate over last 30 days" — the aggregation is maintained incrementally as new `EmailOpened` events arrive, so the feature is immediately queryable without an expensive GROUP BY at request time.

**Online + offline duality:** ClickHouse can serve both the offline feature store (training data for an ML model — e.g., compute 6-month behavioral features for all users) and the online feature store (inference time — e.g., look up the current churn score for a single user in <10ms). This dual role eliminates the need for a separate Redis-backed online feature store.

**Practical ML use case in Dittofeed:** The `computePropertiesIncremental.ts` delta computation already queries ClickHouse for segment state changes. Adding a `MLScored` user property type would work as follows:
1. A ClickHouse materialized view computes per-user features (event frequencies, recency, trait values) continuously
2. A scheduled Temporal activity reads the feature view, runs a gradient boosted tree inference (via a sidecar Rust/Python binary), and writes scores back to `computed_property_assignments_v2` as a standard user property
3. The existing `TraitSegmentNode` with `GreaterThanOrEqual` operator consumes the score — no new segmentation code required

ClickHouse official blog confirms this pattern: "ClickHouse as a real-time data warehouse can power both offline and online feature management, efficiently processing streaming and historical data with unlimited scale." The `argMax(value, timestamp)` aggregate function is particularly useful for online feature stores — it retrieves the latest value for a key without a full scan.

### 10.3 `computePropertiesIncremental.ts` delta computation: is it online learning?

The delta computation in Dittofeed's segment engine evaluates segment trees against **ClickHouse state changes** on a polling schedule (~15 seconds). This is:

- **Online computation:** Yes — it processes new events incrementally rather than recomputing from scratch. Each poll processes only the delta since the last computation timestamp.
- **Online learning:** No — there are no model parameters that update. The segment tree is a deterministic boolean expression; its evaluation over new data is streaming computation, not learning. The system does not update weights, priors, or thresholds based on new data.

**Conceptual distinction:** Online learning (continual learning, incremental learning) implies a model whose parameters change in response to new data. The `computePropertiesIncremental` function is closer to **streaming SQL** — a stateful query that processes new rows as they arrive. It is equivalent to a Kafka Streams application or a Flink stateful operator, not to online gradient descent.

**Path to actual online learning:** To add true online learning to Dittofeed, you would need:
1. A feedback signal (user opened email, clicked, converted, unsubscribed)
2. A model that updates on each feedback event (e.g., a Vowpal Wabbit online bandit, or a logistic regression with SGD)
3. A Temporal activity that reads the feedback event from ClickHouse, runs one SGD step, and writes the updated weights to a model store
4. The scoring output (churn probability, engagement score) persisted as a computed user property

This is architecturally feasible within Dittofeed's existing infrastructure but requires ~3-4 new components none of which exist today.

The research area most relevant to this gap is **Online Continual Learning (OCL)** — the problem of learning from non-stationary streams without catastrophic forgetting (CVPR 2024 DELTA paper; NeurIPS 2023 continual learning track). For customer segmentation specifically, the challenge is concept drift: user engagement patterns change seasonally, making a model trained on 2023 data potentially harmful by Q4 2024.

### 10.4 Send-time optimization: the missing ML feature

Dittofeed's `DelayNode` pauses a journey for a fixed duration (e.g., "wait 2 days") or until a specific calendar time. **Send-time optimization (STO)** would replace the fixed delay with a per-user prediction of optimal engagement time.

The ML architecture for STO:
1. **Feature extraction:** For each user, compute features from ClickHouse: modal open-hour, modal open-day-of-week, average response latency (time from send to open), number of opens, open rate trend (increasing/decreasing)
2. **Model:** A lightweight classification model (logistic regression, GBM, or a 2-layer MLP) trained on historical (send_time, opened: bool) pairs. Input: user features + send_hour (0-23) + send_dow (0-6). Output: P(open | user, send_time)
3. **Inference:** At journey step resolution, query the model for the user's optimal send time window; set the delay to align the message with that window
4. **Temporal integration:** Replace the fixed-duration `DelayNode` with a `UserPropertyDelayVariant` (which already exists in Dittofeed's type system for date-based delays) computed by the STO model

Academic precedent: "A Novel Approach for Send Time Prediction on Email Marketing" (MDPI Applied Sciences 12(16), 2022) segments subscribers by behavioral profiles (open rate, CTR, interaction frequency) and uses classification + regression to predict optimal send windows. The paper reports 15-47% improvement in open rates compared to fixed-time sends, consistent with industry reports from Braze ("Intelligent Timing") and Klaviyo STO features.

### 10.5 LiquidJS vs LLM personalization: what "personalization" means in each model

Dittofeed's current personalization is **variable substitution** — `{{ user.firstName }}` is replaced at render time with the stored trait value. This is deterministic, zero-latency, and requires no model inference.

LLM-based personalization at runtime (generating the email body dynamically from user properties at send time) would add:
- **Semantic adaptation:** Adjusting tone, length, and framing based on user segment (enterprise vs SMB, high-engagement vs dormant)
- **Dynamic content selection:** Choosing which product features to highlight based on user's industry and recent activity
- **Natural language variation:** Avoiding template pattern detection by spam filters (different phrasing for structurally similar leads)

The MDPI email review (2025) found that state-of-the-art personalized LLM email assistants use **RAG + PEFT with feedback-driven refinement**. The PEFT (Parameter-Efficient Fine-Tuning) step adapts a base model to write in the company's voice and with company-specific facts. Without PEFT, zero-shot LLM personalization produces the "formal and verbose" pattern that reduces reply rates.

**Practical read-through rate data:** Mailchimp benchmarks show personalized emails achieve 29% higher open rates and 41% higher CTR than non-personalized. However, these numbers are for demographic personalization (using the recipient's name, industry), not LLM-generated copy. No published study provides a controlled A/B comparison of LiquidJS variable substitution vs LLM-generated copy on B2B cold outreach specifically. The gap between "template with variable substitution" and "LLM-generated" is likely smaller than between "no personalization" and "variable substitution" for cold email — suggesting Dittofeed's LiquidJS approach captures most of the personalization value at zero marginal cost.

### 10.6 Q3 2025 LLM integration: authoring assistance, not runtime AI

The roadmap item is explicitly described as "driving quicker, easier generation of journeys, segments, and templates." This is an **authoring assistant** (LLM generates the campaign definition from natural language), not runtime personalization (LLM generates email content per user at send time).

The technical architecture would be:
- REST endpoint accepts NL description of desired journey/segment
- System prompt includes the full JSON schema for `JourneyDefinition` and `SegmentDefinition` types from `isomorphic-lib/src/types.ts`
- LLM generates a JSON payload conforming to the schema (using `response_format={"type": "json_schema", ...}` for schema enforcement)
- The API validates and upserts the generated journey/segment

The biggest risk: the `JourneyDefinition` type is complex (discriminated unions, nested node types, variant delay types). Current structured output with complex schemas achieves ~70-85% first-try validity; the system would need a validation-and-retry loop (generate → validate with Zod → if invalid, send errors back to LLM → retry). This is the standard "LLM + schema + retry" pattern documented in Anthropic and OpenAI engineering blogs.

### 10.7 Multi-channel attribution: what Dittofeed's data enables

Dittofeed's ClickHouse event store contains all send/open/click/convert events with timestamps and channel labels. This is exactly the input required for multi-channel attribution modeling:

**Available touchpoint sequence:** For each user, ClickHouse's `internal_events` table contains: `MessageSent (channel=email, journey_id=X)`, `EmailOpened`, `EmailClicked`, `MessageSent (channel=sms)`, `JourneyEnded`. This sequence can be used to train a sequential model for conversion attribution.

**Paper precedent:** "Deep Neural Net with Attention for Multi-channel Multi-touch Attribution" (arXiv 1809.02230, Arava et al.) proposes DNAMTA — an LSTM with attention that processes the full touchpoint sequence and outputs per-channel attribution weights. Training on Dittofeed's event data would produce per-journey attribution curves, enabling users to see which message in a 3-step sequence drove the conversion.

**Practical value:** Attribution modeling tells you whether the first outreach email or the follow-up drove the reply — currently invisible in Dittofeed's analytics. This is a feature that differentiates Braze/Iterable from simpler tools.

### 10.8 What is actually ML vs. rules/heuristics

| Component | ML? | What it actually is |
|---|---|---|
| LiquidJS template rendering | No | Deterministic variable substitution |
| Segment tree evaluation | No | Boolean expression evaluation over ClickHouse data |
| `computePropertiesIncremental` delta | No | Streaming SQL / incremental aggregation |
| `RandomCohortNode` A/B split | Pseudo-random | Deterministic hash-based bucket assignment (not adaptive) |
| `RandomBucketSegmentNode` | Pseudo-random | Probabilistic assignment from UUID hash; no learning |
| Journey orchestration via Temporal | No | Deterministic state machine |
| Q3 2025 LLM authoring | Yes (planned) | LLM structured generation from NL; no training on user data |
| Planned MLScored property type | Yes (not built) | Would require external inference service |
| Send-time optimization | Not implemented | Would require behavioral feature extraction + classifier |

**Bottom line:** Dittofeed contains zero ML in production as of v0.23.0. The system is entirely deterministic rule evaluation over an event stream. The planned LLM integration is authoring assistance (one-time generation per campaign, not per-message). The gap between Dittofeed and ML-capable engagement platforms (Braze, Iterable) is not architectural — ClickHouse + Temporal is a superb substrate for ML features — but it is a product gap that requires implementing the ML layers that don't yet exist.

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|-------|---------|------|-------|-----------|-------------|
| A Novel Approach for Send Time Prediction on Email Marketing | Namburi et al. | 2022 | MDPI Applied Sciences 12(16) 8310 | Most direct prior art for Dittofeed's missing STO feature | Classification + regression hybrid predicts per-subscriber optimal send window; 15-47% open rate improvement over fixed sends |
| Deep Neural Net with Attention for Multi-channel Multi-touch Attribution (DNAMTA) | Arava, Sun | 2018 | arXiv 1809.02230 | Attribution modeling over Dittofeed's event stream | LSTM + attention over touchpoint sequences; 81.9% accuracy vs 76.5% for last-touch baseline |
| Powering Feature Stores with ClickHouse | ClickHouse Engineering | 2024 | ClickHouse Blog | Technical foundation for using ClickHouse as ML feature store | Materialized views achieve sub-second feature refresh; online + offline duality eliminates Redis feature cache |
| DELTA: Decoupling Long-Tailed Online Continual Learning | Raghavan et al. | 2024 | CVPR Workshop 2024 | Online learning architecture for user segmentation | Decoupled representation + equalization loss mitigates catastrophic forgetting in non-stationary user streams |
| Durable Execution meets AI: Why Temporal is ideal for AI agents | Temporal Engineering | 2024 | Temporal Blog | Technical grounding for Temporal as LLM pipeline substrate | `sideEffect()` for LLM result replay; Activity retry for API failures; saga pattern for multi-step compensation |
| A Literature Review of Personalized LLMs for Email Generation and Automation | MDPI | 2025 | Future Internet 17(12) | LLM personalization state-of-the-art | PEFT + RAG + feedback loop achieves highest quality; AI emails more formal/verbose than human — relevant to Q3 2025 authoring feature |
| asLLR: LLM based Leads Ranking in Auto Sales | Liu et al. | 2025 | arXiv 2510.21713 | Production LLM + CRM integration with measurable business results | 9.5% conversion lift; validates LLM's ability to process CRM textual features; text summarization needed for long features |
| Breaking the Curse of Dimensionality: On the Stability of Modern Vector Retrieval | Braverman et al. | 2025 | arXiv 2512.12458 | If Dittofeed adds embedding-based user segmentation | Mean pooling over user event text destroys retrieval stability; Chamfer distance preferred for multi-event user representations |

**Annotation by paper:**

**MDPI STO (2022):** The most actionable paper for extending Dittofeed. The paper's behavioral segmentation approach (cluster users by engagement profile, then train per-segment send time models) maps directly onto Dittofeed's existing `RandomBucketSegmentNode` + `computePropertiesIncremental` infrastructure. The ML layer can be implemented as a new `UserPropertyDefinitionType` that reads from ClickHouse behavioral features and writes send-time predictions as a user property.

**DNAMTA (arXiv 1809.02230):** The standard architecture for multi-touch attribution over event sequences. Dittofeed's ClickHouse event store contains exactly the data this model requires (timestamped channel + event type sequences per user). Training requires labeled conversion events (`JourneyEnded` with a success flag) which already exist as internal events. The LSTM + attention architecture handles variable-length sequences naturally — some users have 2 touchpoints, others have 15.

**Temporal Blog (Durable Execution meets AI):** Confirms that `SideEffect` is the correct Temporal primitive for making LLM calls replay-safe. Without `SideEffect`, a Temporal workflow that calls an LLM and then crashes before completing will re-call the LLM on replay and get a different output — causing non-determinism errors in Temporal's replay engine. The Q3 2025 LLM authoring integration must use `SideEffect` or an Activity (which is inherently safe for non-deterministic calls) to store the LLM output in the event history.

**DELTA / Continual Learning (CVPR 2024):** If Dittofeed adds online learning for user scoring (churn prediction, engagement propensity), the primary risk is catastrophic forgetting — the model's performance on older user patterns degrades as it learns from new data. The DELTA paper's decoupled learning approach (separate representation layer from classification head) is the state-of-the-art mitigation. Applied to Dittofeed: a separate ClickHouse-backed feature representation (stable over time) combined with a lightweight classification head that updates on new conversion events provides the right balance.

**MDPI Email Review (2025):** The finding that PEFT-fine-tuned LLMs significantly outperform zero-shot LLMs for email generation has a direct design implication for the Q3 2025 authoring feature. The journey/segment *structure* generation (producing valid JSON) benefits from structured output enforcement (JSON schema mode). The *template content* generation (producing email copy) benefits from PEFT on high-performing historical emails. These are two different LLM tasks that require different optimization strategies — conflating them in a single LLM call (as a naive implementation would) will produce weak results on both.

---

## 12. Recency & Changelog

> Researched: 2026-03-28. Sources: GitHub releases API, commits API, README roadmap (current HEAD), dittofeed.com/blog.

### Latest Release

**v0.23.0** — published **2025-12-01**. This is the latest stable/GA release. The project is simultaneously developing v0.24.0 through an extended alpha series (16 alpha tags as of the research date, latest alpha.16 published 2026-03-16).

Key features in v0.23.0:
- New Analysis Page (campaign performance charting)
- Improved Broadcast flow and scheduling UX
- `RandomCohortNode` (structural A/B splits added to the type system)
- `Includes` segment node operator
- Extended auth providers: Keycloak, AWS Cognito, GCP OAuth
- SignalWire SMS provider
- Absolute Date segment operator
- Batch transactional messaging API endpoint
- Workspace member management UI
- Manual segment append operation
- Personal Gmail broadcast sending
- Skip-on-error for journey message nodes
- Localized timezones in events/deliveries tables
- CSV export for events and deliveries tables

### LLM Integration Status

**Did not ship. Still marked `[ ]` (not started) in the current README as of 2026-03-28.**

The Q3 2025 roadmap entry reads:

> **LLM integration** — Drive quicker, easier generation of journeys, segments, and templates. `[ ]`

A full-text code search across the repository file tree and all merged PRs returns zero matches for `openai`, `anthropic`, `llm`, `gpt`, `embed`, or any LLM SDK dependency. No feature branch, no draft PR, no issue in the tracker references LLM work. The only AI-related GitHub issue in the entire history was issue #1830 (March 2026), which was a third-party sales pitch and was closed in one day.

The Q4 2025 and Q1/Q2 2026 roadmap blocks do not exist in the README — the roadmap ends after Q3 2025. There is no announced schedule for when LLM integration will be revisited.

**What was actually built instead of LLM features (Q3–Q4 2025):** random cohort A/B nodes, bloom filter indexes for ClickHouse, custom recipient property for webhook messaging, view-in-browser links, command palette, subscription management, Resend SDK upgrade, Amazon SES custom endpoint support.

**Conclusion:** The Q3 2025 LLM feature was not built, not started, and has no visible timeline. Dittofeed remains zero-AI in production as of March 2026.

### Recent Commits (last 90 days)

Covering approximately 2026-01-01 to 2026-03-27 (12 commits on `main`):

| Date | Commit |
|---|---|
| 2026-03-27 | fix: upgrade Resend SDK to v4, fix silent email delivery failures (#1833) |
| 2026-03-16 | fix upload CSV for large values (#1832) |
| 2026-01-22 | Fix Invalid URL error when apiBase is empty (#1826) |
| 2026-01-16 | Fix v0.24.0 pre-upgrade script (#1824) |
| 2026-01-16 | Adjust compute properties wait defaults (#1823) |
| 2026-01-15 | Add component configurations docs (#1821) |
| 2026-01-14 | Add subscription management page (#1811) |
| 2026-01-14 | Fix Temporal time-skipping test sync (#1819) |
| 2026-01-14 | Add custom endpoint support for Amazon SES (#1818) |
| 2026-01-08 | Add subscription group unsubscribe lists (#1815) |
| 2026-01-07 | Add command palette for quick navigation (#1806) |
| 2026-01-06 | Add ResourceSelect with click-through navigation (#1810) |

**Cadence note:** Commit velocity dropped significantly after January 2026 — only 2 commits in the 10 weeks between 2026-01-22 and 2026-03-27. The v0.24.0 alpha series has stalled at alpha.16 since March 16. This is consistent with a small team (primarily one active contributor, `@maxgurewitz`) with reduced bandwidth.

### Open Issues (AI/ML relevant)

No open issues are tagged with AI, ML, LLM, or NLP labels. A search across all open issues for related keywords returned zero matches.

The closest open items to AI-adjacent functionality:
- **#1831** (2026-03-10): Campaign analysis page missing — requests more analytics, not AI.
- **#1829** (2026-02-21): Feature request: add a "contains" operator for segment matching — purely rule-based segmentation enhancement.
- **#1362** (2025-03-19): Modular building blocks in email templates — template composition UX, not AI generation.

There is no open roadmap issue, discussion, or RFC for LLM integration. The Q3 2025 roadmap item in the README exists only as a table row with an unchecked checkbox and has never had a corresponding tracking issue opened.

### Roadmap / Announced Features

The README roadmap (current as of HEAD, 2026-03-28) ends at Q3 2025 — there are no published Q4 2025, Q1 2026, or Q2 2026 roadmap entries. The blog has not published any announcement of upcoming AI features. The Discord and issue tracker have no visible AI roadmap discussion.

The three Q3 2025 roadmap items that remain unbuilt:

| Feature | Status |
|---|---|
| LLM integration (journey/segment/template authoring) | `[ ]` — not started |
| Stripe integration | `[ ]` — not started |
| Git-based resources & campaign testing | `[ ]` — not started |

The "Developer-centric" section in the README mentions "Branch-based git workflows" and "Testing SDK to test messaging campaigns in CI" as aspirational features — neither has shipped.

### Staleness Assessment

**Release velocity:** One stable release (v0.23.0) in Q4 2025. v0.24.0 has been in alpha for 4+ months (16 alpha tags since 2025-12-23) with no stable release. Commit throughput on `main` is ~2 commits/week in Nov–Jan declining to ~1 commit/6 weeks in Feb–Mar 2026.

**Production readiness:** v0.23.0 is production-ready for its stated feature set (deterministic messaging automation, multi-channel, self-hosted). The ClickHouse + Temporal + Kafka architecture is solid and battle-tested by the upstream projects.

**AI feature readiness:** Not production-ready, not in development. The LLM authoring feature planned for Q3 2025 has zero implementation progress visible in the public repository as of March 2026 — approximately 6 months overdue against the original schedule.

**Risk flags for adopters building AI-augmented workflows on top of Dittofeed:**
- Single primary contributor (`@maxgurewitz`) with declining commit velocity — bus factor risk
- No public roadmap beyond Q3 2025 — unclear when AI features will be prioritized
- v0.24.0 alpha has been stalled for ~10 weeks — uncertain release timeline
- No LLM dependency in the codebase means any AI integration requires a custom fork or external sidecar

**Recommendation for the lead-gen platform:** Dittofeed remains a viable messaging execution layer (journey engine + ESP routing + segmentation), but AI features must be built externally and integrated via the admin API and SDK. Do not wait for Dittofeed's native LLM authoring feature — it has no visible ETA.
