# Twenty CRM — AI Features Deep Report

> Research date: March 2026. Sources: live GitHub codebase (`twentyhq/twenty` HEAD), official docs, community MCP server repos.

---

## 1. Overview

**Twenty** is a fully open-source CRM positioned as a modern alternative to Salesforce. As of March 2026:

| Metric | Value |
|---|---|
| GitHub stars | 42,235 |
| Forks | 5,607 |
| Contributors | 604 |
| License | AGPL-3.0 (core) + proprietary cloud addons |
| Language | TypeScript (100% of monorepo) |
| Last push | March 28, 2026 (active daily) |
| Open issues | ~110 |

**Tech stack:**

| Layer | Technology |
|---|---|
| Frontend | React 19, Jotai (state), Linaria (CSS-in-JS), Apollo Client 3.13 |
| Backend | NestJS, TypeORM 0.3 (patched), PostgreSQL, Redis (BullMQ) |
| API | GraphQL Yoga 4.0 + REST (OpenAPI spec at `/api-reference/openapi.json`) |
| AI SDK | Vercel AI SDK (`ai` 5.0) — provider-agnostic |
| Analytics | ClickHouse (`@clickhouse/client 1.18.1`) |
| Auth | Passport.js with JWT, Google/Microsoft OAuth, SAML |
| Monorepo | Nx |

The project is a real Nx monorepo: `packages/twenty-server` (NestJS), `packages/twenty-front` (React), `packages/twenty-shared` (shared utilities, types, AI constants). The database model is **metadata-driven**: object schemas are stored in PostgreSQL and workspace tables are altered at runtime when custom objects/fields are added — no code deploys required.

---

## 2. AI Architecture

### 2.1 Multi-Provider AI with Vercel AI SDK

The entire AI subsystem is built on top of the **Vercel AI SDK** (`ai` package, v5.x). This provides a single `generateText` / `streamText` abstraction over any provider. The AI module lives at:

```
packages/twenty-server/src/engine/metadata-modules/ai/
  ├── ai-agent/            # Agent CRUD, entity, exceptions, validators
  ├── ai-agent-execution/  # Async executor, actor context, message storage
  ├── ai-agent-monitor/    # Turn grader (LLM-as-judge eval)
  ├── ai-agent-role/       # RBAC bindings for agents
  ├── ai-billing/          # Token tracking and cost calculation
  ├── ai-chat/             # User-facing chat: streaming, thread storage, title gen
  ├── ai-generate-text/    # Simple text generation controller/service
  └── ai-models/           # Model registry, provider factory, preferences
        └── ai-providers.json   # Canonical model catalog (all providers + pricing)
```

### 2.2 Supported AI Providers

Twenty ships a static `ai-providers.json` catalog compiled into the server. As of March 2026 the catalog covers **5 providers** with **135+ models total**:

| Provider | SDK Package | Model Count | Notable Models |
|---|---|---|---|
| OpenAI | `@ai-sdk/openai` | 39 | gpt-5, gpt-5.4-pro, o3-mini, gpt-5.2-codex |
| Anthropic | `@ai-sdk/anthropic` | 23 | claude-opus-4-6, claude-sonnet-4-6, claude-3-7-sonnet, claude-3-5-haiku |
| Google | `@ai-sdk/google` | 24 | gemini-2.5-flash, gemini-3.1-pro, gemini-2.5-pro |
| Mistral | `@ai-sdk/mistral` | 25 | devstral-small, magistral-small, mistral-large |
| xAI | `@ai-sdk/xai` | 24 | grok-4, grok-4-fast, grok-2-vision |

Amazon Bedrock is also supported at the SDK factory level (`@ai-sdk/amazon-bedrock`, `createAmazonBedrock`), and OpenAI-compatible endpoints are supported via `AI_SDK_OPENAI_COMPATIBLE`. Custom providers can be injected via the `AI_PROVIDERS` config variable.

Each model entry in the catalog includes pricing metadata (`inputCostPerMillionTokens`, `outputCostPerMillionTokens`, `cachedInputCostPerMillionTokens`), context window size, max output tokens, supported modalities (`image`, `pdf`), and a `supportsReasoning` flag. This drives billing and model selection.

### 2.3 Model Roles and Auto-Selection

Models are tagged with two roles: `FAST` and `SMART`. The system exposes two special model IDs:

```typescript
AUTO_SELECT_FAST_MODEL_ID  // auto-select cheapest/fastest
AUTO_SELECT_SMART_MODEL_ID // auto-select most capable
```

The `AiModelRegistryService` resolves these at runtime using `AiModelPreferencesService`, which reads workspace-level preferences stored in the database. Agents default to `AUTO_SELECT_SMART_MODEL_ID`. Workflow agents can override `modelId` per agent definition.

### 2.4 Feature Flag: `IS_AI_ENABLED`

The entire AI subsystem is gated behind an `IS_AI_ENABLED` feature flag (config variable). This was introduced as part of the MCP v1 merge (July 2025) and makes the AI tab, chat interface, and agent management visible only when the flag is enabled.

### 2.5 Internal MCP: The Tool Registry Pattern

Twenty implements a pattern that is functionally equivalent to MCP **internally**. The `ToolRegistryService` (at `src/engine/core-modules/tool-provider/`) manages a set of `ToolProvider` implementations that generate typed tool descriptors on demand. There are 9 tool categories:

```typescript
export enum ToolCategory {
  DATABASE_CRUD    = 'DATABASE_CRUD',    // CRUD on any CRM object
  ACTION           = 'ACTION',           // HTTP, email, code interpreter, navigate
  WORKFLOW         = 'WORKFLOW',         // Create/trigger/manage workflows
  METADATA         = 'METADATA',         // Schema management
  NATIVE_MODEL     = 'NATIVE_MODEL',     // Web search (provider-native)
  VIEW             = 'VIEW',             // Query saved views
  VIEW_FIELD       = 'VIEW_FIELD',       // Manage view columns
  DASHBOARD        = 'DASHBOARD',        // Create/manage dashboards
  LOGIC_FUNCTION   = 'LOGIC_FUNCTION',   // Custom user-defined tools
}
```

Each category has a corresponding `ToolProvider` class:

| Provider Class | Category | Key Tools |
|---|---|---|
| `DatabaseToolProvider` | `DATABASE_CRUD` | `find_one_{object}`, `find_many_{object}`, `create_{object}`, `update_{object}`, `delete_{object}`, `upsert_{object}` |
| `ActionToolProvider` | `ACTION` | `http_request`, `send_email`, `draft_email`, `code_interpreter`, `navigate_app`, `search_help_center` |
| `WorkflowToolProvider` | `WORKFLOW` | Dynamic (per workspace workflows) |
| `MetadataToolProvider` | `METADATA` | Schema introspection and object/field creation |
| `NativeModelToolProvider` | `NATIVE_MODEL` | `web_search` (Anthropic's `webSearch_20250305`, OpenAI's `webSearch`) |
| `ViewToolProvider` | `VIEW` | Query view parameters |
| `ViewFieldToolProvider` | `VIEW_FIELD` | Manage view columns |
| `DashboardToolProvider` | `DASHBOARD` | Dashboard operations |
| `LogicFunctionToolProvider` | `LOGIC_FUNCTION` | Exposes user-defined logic functions as tools when `isTool: true` |

The critical insight: `DatabaseToolProvider` **dynamically generates** a CRUD tool for every object in the workspace metadata. When a workspace defines a custom object (e.g., `LeadScore`), the AI agent automatically gets `find_one_leadScore`, `create_leadScore`, etc. — no code changes required. Tool schemas are generated using Zod, converted to JSON Schema 7 for the AI SDK.

### 2.6 Tool Discovery Protocol (Lazy Loading)

To stay within context window limits, tools are not dumped wholesale into the system prompt. Instead, the AI assistant has three meta-tools pre-loaded:

```
get_tool_catalog   → returns a lightweight index (names + descriptions, no schemas)
learn_tools        → on-demand schema fetch for specific tools by name
execute_tool       → dispatches any tool by name + arguments
```

The system prompt instructs the model: "For ANY non-trivial task: Plan → Load Skill → Learn Tools → Execute." This lazy-loading pattern allows hundreds of tools to be available without blowing the context window.

### 2.7 Skills System

On top of tools, Twenty has a **Skills system** — injected documentation that teaches the AI agent domain-specific knowledge (e.g., correct schemas, parameter formats, patterns for building workflows). Skills are stored as workspace entities and surfaced to the AI via:

```
load_skill({skillName: "workflow-building"})
```

The `SystemPromptBuilderService` injects the skill catalog into every system prompt as a section listing available skills with their descriptions. This is analogous to RAG but for procedural knowledge.

### 2.8 Browsing Context Injection

When the user opens the AI chat panel while viewing a specific page (e.g., a list view of companies filtered by stage), the frontend passes a `BrowsingContextType` to the `ChatExecutionService`. The service builds a context string describing what the user is currently viewing:

```
The user is viewing a list of company records in a view called "Hot Leads" (viewId: abc-123).
Filters applied: stage = "Qualified"
Use get_view_query_parameters tool with this viewId to get the exact filter/sort parameters.
```

This grounds the AI assistant in the user's current context automatically.

---

## 3. Key AI Features

### 3.1 AI Chatbot (User-Facing, Streaming)

The `ChatExecutionService` implements a streaming chat interface using `streamText` from the Vercel AI SDK. Conversation state is persisted across sessions:

- **Thread** (`AgentChatThreadEntity`): top-level conversation container, bound to `userWorkspaceId`
- **Turn** (`AgentTurnEntity`): one round of user input + agent response, optionally bound to an `agentId`
- **Message** (`AgentMessageEntity`): individual messages with role (user/assistant/tool)
- **MessagePart** (`AgentMessagePartEntity`): fine-grained message parts (text, tool call, tool result)

The system prompt is built dynamically per request by `SystemPromptBuilderService`, which assembles sections with estimated token counts:

1. **Base Instructions** — core behavior rules, tool strategy
2. **Response Format** — markdown formatting, record reference syntax
3. **Workspace Instructions** — admin-configured custom instructions
4. **User Context** — user name, locale, timezone
5. **Tool Catalog** — categorized tool index
6. **Skill Catalog** — available skills

**Agent config:** `MAX_STEPS: 300`, `REASONING_BUDGET_TOKENS: 12000`.

**Provider-native web search** is supported: for Anthropic models it calls `webSearch_20250305()`, for OpenAI models it calls `provider.tools.webSearch()`, and for Bedrock it maps to the equivalent. This means the chatbot can search the web without custom tooling.

### 3.2 Workflow AI Agent Actions

The `WorkflowActionType` enum includes `AI_AGENT` as a first-class step type alongside `CODE`, `HTTP_REQUEST`, `SEND_EMAIL`, `CREATE_RECORD`, etc. The workflow is:

```
WorkflowActionType.AI_AGENT
  └── AiAgentWorkflowAction.execute()
        └── AgentAsyncExecutorService.executeAgent()
              ├── resolveInput(prompt, context)  // interpolate variables from upstream steps
              ├── toolRegistry.getToolsByCategories([DATABASE_CRUD, ACTION, NATIVE_MODEL])
              ├── generateText({ system, tools, model, prompt, stopWhen: stepCountIs(300) })
              └── aiBillingService.calculateAndBillUsage()
```

Key design decision: workflow agents get `DATABASE_CRUD + ACTION + NATIVE_MODEL` only — **Workflow tools are explicitly excluded** from the allowed categories to prevent circular dependencies and recursive workflow execution.

**Structured output from workflow agents**: If the `AgentEntity.responseFormat.type === 'json'`, a second `generateText` call is made with the `Output.object({ schema })` modifier to coerce the agent's free-form response into the declared JSON schema. This is the Twenty equivalent of structured outputs.

**Variable interpolation**: The `resolveInput(prompt, context)` call resolves `{{variableName}}` tokens in the agent prompt from the workflow execution context, enabling upstream step results to flow into the AI prompt.

### 3.3 Logic Functions as Custom AI Tools

Any user-defined **Logic Function** that has `isTool: true` set is automatically exposed to the AI assistant via the `LogicFunctionToolProvider`. The tool name is derived from the function name. Users can write TypeScript logic functions in the Twenty UI, mark them as tools, and the AI can discover and invoke them dynamically. This is a powerful extension point for custom enrichment, scoring, or classification logic.

### 3.4 AI Agent Monitor (LLM-as-Judge Evaluation)

The `AgentTurnGraderService` implements automatic quality evaluation using LLM-as-judge:

```typescript
// Evaluates each agent turn on a 0-100 scale
const prompt = `Evaluate on:
1. Task Completion: Did the agent accomplish what the user asked?
2. Tool Usage: Were tools used correctly and appropriately?
3. Response Quality: Is the response clear, accurate, and helpful?
4. Error Handling: Were errors handled gracefully?

Provide:
- A score from 0 to 100
- A brief comment (max 200 characters)
Respond ONLY with valid JSON: {"score": <number>, "comment": "<string>"}`;
```

Results are stored in `AgentTurnEvaluationEntity` (turnId, score 0-100, comment, timestamp). The `AgentEntity` also has an `evaluationInputs: string[]` field for seeding evaluation test cases. This is the foundation of an eval pipeline baked into the CRM itself.

### 3.5 AI Billing and Token Tracking

Every AI call goes through `AiBillingService.calculateAndBillUsage()`, which takes:
- The `modelId`
- `LanguageModelUsage` (input/output tokens from the AI SDK response)
- `cacheCreationTokens` (for Anthropic prompt caching)
- `workspaceId`, `agentId`, `userWorkspaceId`

Billing data is persisted to the database. The pricing comes from the `ai-providers.json` catalog metadata. This enables per-workspace, per-agent cost attribution.

### 3.6 Tool Repair (Automatic Error Recovery)

Both `ChatExecutionService` and `AgentAsyncExecutorService` pass `experimental_repairToolCall` to the AI SDK:

```typescript
experimental_repairToolCall: async ({ toolCall, tools, inputSchema, error }) => {
  return repairToolCall({ toolCall, tools, inputSchema, error, model });
}
```

When the AI generates a malformed tool call (wrong argument type, missing required field), the repair mechanism fires a corrective LLM call to fix the schema violation before failing. This significantly improves robustness in agentic loops.

### 3.7 Code Interpreter

The `ActionToolProvider` exposes a `code_interpreter` tool backed by `CodeInterpreterTool`. Uploaded files are extracted and made available at `/home/user/{filename}` in the sandbox. The system prompt includes special instructions for using the code interpreter with uploaded files (JSON manifest of fileId → filename mappings).

---

## 4. Data Pipeline

### 4.1 How CRM Data is Made Available to AI

The `DatabaseToolProvider` is the key component. At request time, it:

1. Reads workspace permissions from the cache (`rolesPermissions`)
2. Reads all `flatObjectMetadataMaps` and `flatFieldMetadataMaps` from workspace cache
3. Generates one tool descriptor per object per CRUD operation
4. Tool schemas are computed using utility functions:
   - `generateCreateRecordInputSchema` — Zod schema for creation
   - `generateUpdateRecordInputSchema` — Zod schema for updates
   - `generateFindToolInputSchema` — Zod schema with filter/sort/pagination
   - `FindOneToolInputSchema`, `DeleteToolInputSchema` — fixed schemas

The tool schemas are permission-aware: if a user role lacks `canRead` on an object, the corresponding `find_*` tools are absent from their tool catalog. Permission check uses `computePermissionIntersection`.

Workflow-related and favorites-related objects are filtered out from the tool catalog via `isWorkflowRelatedObject` and `isFavoriteRelatedObject` guards, keeping the AI context clean.

### 4.2 Event/Webhook System for AI Processing

**Workflow Trigger Types** — Workflows that contain `AI_AGENT` steps can be triggered by:

- **Database events** (`WorkflowDatabaseEventTrigger`): fires when a record is created, updated, or deleted in any object type — the trigger listener is `workflow-database-event-trigger.listener.ts`
- **Cron/scheduled** (via BullMQ cron jobs)
- **Manual/HTTP** (direct API call)
- **Webhook** (inbound from external systems)

**Outbound Webhooks**: Twenty sends HMAC-signed HTTP POSTs when records change. Payload format:

```json
{
  "event": "person.created",
  "data": { /* full record */ },
  "timestamp": "2026-03-28T13:00:00Z"
}
```

Security: `X-Twenty-Webhook-Signature` (HMAC SHA256 of `{timestamp}:{payload}`) + `X-Twenty-Webhook-Timestamp`. Background delivery is via BullMQ workers with retry/backoff.

### 4.3 GraphQL → AI → Back to CRM Flow

The canonical agentic loop in Twenty:

```
1. User message arrives at POST /api/ai/chat (or workflow trigger fires)
2. ChatExecutionService / AgentAsyncExecutorService resolves:
   - User role → effective permissions
   - Tool catalog (database + action + workflow + logic function tools)
   - System prompt (base + skills + workspace instructions + user context)
3. streamText / generateText call (Vercel AI SDK):
   - Model: selected from registry (auto-fast, auto-smart, or explicit)
   - Tools: pre-loaded (web_search) + lazy (learn_tools/execute_tool pattern)
   - MAX_STEPS: 300
4. Model issues tool calls — execute_tool dispatches to ToolExecutorService:
   - For DATABASE_CRUD: translates to TypeORM queries via WorkspaceEntityManager
   - For ACTION: HTTP request, email, code interpreter
   - For WORKFLOW: trigger or create workflow runs
   - For LOGIC_FUNCTION: executes user-defined TypeScript function
5. Each tool result is appended as a message part and consumed by the next model step
6. Final response streamed to frontend (UIMessage format, compatible with ai/react hooks)
7. Turn is stored: thread → turn → messages → message parts
8. AgentTurnGraderService (async) evaluates the turn quality (0-100 score)
9. AiBillingService attributes token costs to workspace/agent/user
```

The result of an AI Agent workflow step is returned as `{ result: { response: string } }` (plain text) or as a structured JSON object if `responseFormat.type === 'json'` is configured. This result is passed to downstream workflow steps as a variable.

### 4.4 Multi-Tenant Architecture

Each workspace has its own PostgreSQL schema. All queries through `WorkspaceEntityManager` are automatically scoped to the correct schema. The AI agent's permission config (`RolePermissionConfig`) intersects the user's roles with the agent's assigned role, preventing privilege escalation.

---

## 5. Evaluation and Quality

### 5.1 LLM-as-Judge Auto-Evaluation

As detailed in section 3.4, every conversation turn is scored 0-100 by the `AgentTurnGraderService` using the `FAST` model. Scores and comments are persisted to `agentTurnEvaluation`. The `AgentEntity` carries an `evaluationInputs: string[]` field — these are test prompts seeded when an agent is defined, enabling regression testing when the agent's prompt or model changes.

### 5.2 Data Validation Layer

- **Zod schemas** for all tool inputs (validated via `experimental_validate` hooks in the AI SDK)
- **Tool repair** on schema violations (section 3.6)
- **Record references** validated: the system prompt explicitly forbids making up record IDs; only UUIDs returned by tool calls can be referenced

### 5.3 Deduplication

There is no ML-based deduplication in the current codebase. The unique constraint `IDX_AGENT_NAME_WORKSPACE_ID_UNIQUE` on `AgentEntity` prevents duplicate agent names. At the CRM data level, deduplication is a workflow automation pattern — users can build workflows triggered by `record.created` events that call an AI agent to detect duplicates and merge records. There is no native, out-of-the-box dedup engine.

### 5.4 Permission-Gated AI Access

AI features are gated at multiple levels:
- `IS_AI_ENABLED` feature flag (workspace-level on/off)
- Object-level permissions: `canRead`, `canUpdate`, `canDelete`, `canDestroy` per role
- Field-level: `restrictedFields` map prevents AI from reading/writing sensitive columns
- Row-level security: dynamic WHERE clause injection by `WorkspaceEntityManager`
- Agent role assignment: each `AgentEntity` can have a dedicated role via `RoleTargetEntity`, limiting what the agent can do beyond the invoking user's own permissions

---

## 6. Rust/ML Relevance

### 6.1 GraphQL API Is Language-Agnostic

Twenty's GraphQL endpoint is standard spec-compliant GraphQL over HTTP. Authentication is Bearer token (API key from Settings > Integrations). Any GraphQL client in any language can interact with it. For Rust:

```
cynic        — compile-time GraphQL query validation (schema-first)
graphql_client — code-generation from .graphql files
reqwest      — HTTP client for the raw POST request
```

A Rust ML pipeline can write scored companies, contacts, or enrichment data directly into Twenty as custom object records via `createCompanyEnrichment` mutations. The metadata API allows Rust code to introspect the schema before constructing queries.

**Concrete pattern for this lead-gen platform:**

```rust
// 1. Rust scoring model produces a CompanyScore struct
// 2. POST to https://{instance}/api:
//    mutation CreateCompanyScore($input: CompanyScoreCreateInput!) {
//      createCompanyScore(data: $input) { id }
//    }
// 3. Alternatively, via REST: POST /api/objects/company-scores
```

The custom object can be defined once in Twenty's UI or via the metadata GraphQL mutation `CreateOneObject`.

### 6.2 MCP Server Pattern for Rust ML Models

A Rust ML model can be exposed as an MCP server and registered as a Logic Function in Twenty. The data flow:

```
Twenty AI Chat
  → execute_tool("score_company_fit", { company_id: "..." })
  → LogicFunctionToolProvider → execute user-defined logic function
  → logic function calls out to Rust MCP server via HTTP
  → Rust model returns { score: 0.87, reasons: [...] }
  → result surfaces in AI chat thread
```

The Logic Function is a TypeScript shim (~20 lines) that calls the Rust HTTP endpoint. The Rust side can use any model or scoring logic. This pattern keeps the ML inference outside Twenty's process while making results fully accessible to the AI agent.

The `twenty-mcp` server (jezweb) already uses OAuth 2.1 + AES-256-GCM for multi-tenant key storage — a useful reference for building a production Rust MCP server that integrates with Twenty.

### 6.3 AI SDK Interop

Twenty's `ai-providers.json` supports `AI_SDK_OPENAI_COMPATIBLE` as an SDK package type. Any OpenAI-compatible endpoint (including local MLX servers running Qwen2.5-3B via `mlx_lm.server`) can be registered as a custom provider. This means the MLX local inference setup already used in this lead-gen platform can be plugged directly into Twenty as an AI provider with zero extra infrastructure.

---

## 7. Integration Points

### 7.1 GraphQL API

- **Base URL**: `https://{instance}/api` (cloud) or `http://localhost:3000/api` (self-hosted)
- **Auth**: `Authorization: Bearer {API_KEY}` header
- **Data API**: query/mutate CRM objects (people, companies, opportunities, custom objects)
- **Metadata API**: separate endpoint at `https://{instance}/metadata` — introspect and modify the schema itself

Example: query companies with filter:

```graphql
query GetCompanies($filter: CompanyFilterInput) {
  companies(filter: $filter, orderBy: { createdAt: DescNullsFirst }, first: 10) {
    edges {
      node {
        id
        name
        domainName { primaryLinkUrl }
        employees
        linkedinLink { primaryLinkUrl }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

Filter syntax uses nested operators: `{ name: { like: "%AI%" } }`, `{ and: [...] }`, `{ or: [...] }`.

### 7.2 REST API

OpenAPI spec available at `/api-reference/openapi.json`. CRUD endpoints follow REST conventions, e.g.:

```
POST   /api/objects/{objectNamePlural}          → create
GET    /api/objects/{objectNamePlural}/{id}     → read
PATCH  /api/objects/{objectNamePlural}/{id}     → update
DELETE /api/objects/{objectNamePlural}/{id}     → delete
GET    /api/objects/{objectNamePlural}?filter=  → list with filter
```

### 7.3 External MCP Servers

Two community MCP servers exist for Twenty (not the internal tool registry, but external MCP for AI desktop clients):

**mhenry3164/twenty-crm-mcp-server** (MIT, Node.js):
- 23 tools: full CRUD for People, Companies, Tasks, Notes + 3 metadata/search tools
- Dynamic field discovery (reads metadata API at startup)
- `TWENTY_API_KEY` + `TWENTY_BASE_URL` env vars
- Claude Desktop config snippet pattern

**jezweb/twenty-mcp** (TypeScript):
- 29 tools across People, Companies, Opportunities, Activities, Tasks, Metadata, Relationships
- Dual auth: API key + OAuth 2.1 (AES-256-GCM encrypted user key storage)
- Docker + npx + global npm install modes
- Full TOOLS.md documentation

**Official internal MCP (v1, merged July 2025)**:
- Feature-flagged behind `IS_AI_ENABLED`
- Accessible via Settings > Integrations tab
- Tested by Felix Malfait (core maintainer): "create a company and an opportunity based on the following call transcript" verified working

### 7.4 Webhooks

- Config: Settings > APIs & Webhooks > Webhooks
- Event format: `{objectName}.{created|updated|deleted}`
- Payload: `{ event, data, timestamp }`
- Security: HMAC SHA256 (`X-Twenty-Webhook-Signature`, `X-Twenty-Webhook-Timestamp`)
- Delivery: BullMQ background jobs with retry
- Response: must return HTTP 2xx; failures are logged

### 7.5 n8n Integration

A community n8n node (`shodgson/n8n-nodes-twenty`) exists, enabling Twenty to participate in n8n workflows. Supported resources include Workflow objects, WorkflowAutomatedTrigger, and WorkflowRun, making Twenty a participant in broader automation networks alongside other tools like Zapier, Typeform, etc.

### 7.6 Outreach Automation Integration

For connecting a lead-gen pipeline's outreach automation to Twenty:

1. **Inbound**: when a contact is marked `outreachStatus: sent`, post to Twenty via GraphQL mutation to update the person record with outreach metadata
2. **Outbound**: subscribe to the `person.updated` webhook — when a reply is logged or a deal stage changes in Twenty, trigger downstream enrichment or follow-up workflows in the lead-gen platform
3. **AI-in-loop**: define a Twenty Workflow with trigger `opportunity.created`, action `AI_AGENT` with prompt "Based on this company's profile, draft a personalized follow-up email for {{opportunity.contactName}}", action `DRAFT_EMAIL` — the entire flow runs inside Twenty without external orchestration

---

## 8. Gaps and Weaknesses

### 8.1 AI Features Still Maturing

- The MCP / AI integration was merged as a v1 prototype in July 2025, behind a feature flag. The public documentation is sparse — the `docs.twenty.com/developers/extend` URLs for GraphQL API details return 404s as of March 2026.
- The agent evaluation system (`AgentTurnGraderService`) is present but there is no UI to surface the scores or configure evaluation thresholds.
- `evaluationInputs` on `AgentEntity` exists as a field but no automated eval runner was found in the codebase — it appears to be seeded for future use.
- Token cost attribution is implemented but there is no billing UI or per-workspace quota enforcement in the open-source repo (likely a cloud-tier feature).

### 8.2 Missing vs Salesforce AI Features

| Feature | Salesforce Einstein | Twenty |
|---|---|---|
| Native lead scoring (ML model) | Yes (managed) | No — must build with logic functions |
| Predictive analytics | Yes | No |
| Opportunity forecasting | Yes | No |
| Email sentiment analysis | Yes | No native — possible via custom logic function |
| Deduplicated contact graph | Yes (Data Cloud) | No native dedup engine |
| Voice-to-CRM transcription | Yes | No |
| Native enrichment (Clearbit/ZoomInfo) | Yes (via partnerships) | No — requires workflow + HTTP action |
| Conversation intelligence | Yes | No |
| AI-generated reports | Partial (via Einstein Analytics) | Via code_interpreter tool |
| Custom AI agents | Yes (Einstein Copilot Studio) | Yes (Twenty Agents) — more flexible |
| MCP/API extensibility | Limited | Strong — full GraphQL metadata API |

### 8.3 No ML-Native Features

Twenty has zero Rust or Python ML inference code. All AI is LLM-based (text generation, function calling). There is no vector search, embedding generation, or similarity matching built in. For a B2B lead-gen platform that wants ranked contact scoring using embeddings or trained classifiers, Twenty provides the storage and retrieval layer but no inference infrastructure.

### 8.4 Multi-Step Agent Reliability

The `experimental_repairToolCall` mitigation helps, but with `MAX_STEPS: 300`, long agentic chains in complex workflows can still accumulate errors. There is no explicit checkpointing, rollback, or transactional guarantee across a sequence of `create_record` tool calls in a single agent turn.

### 8.5 No Vector/Semantic Search

The search tools are exact-match + ILIKE filter-based (PostgreSQL). There is no vector index (pgvector) or semantic similarity search. The AI agent cannot answer "find contacts similar to this one" without custom implementation.

### 8.6 Self-Hosted Complexity

Running Twenty with full AI features requires: PostgreSQL, Redis, a Node.js server process, a separate BullMQ worker process, and configured API keys for at least one AI provider. The ClickHouse analytics dependency adds additional operational overhead for production deployments.

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 Using Twenty as the CRM Layer

Twenty is the best available open-source CRM foundation for an AI-native B2B lead-gen platform because:

1. **Metadata-driven schema** — define `Company`, `Contact`, `LeadScore`, `OutreachCampaign`, `EnrichmentResult` as custom objects once in the UI. No code required. The AI automatically gets CRUD tools for all of them.

2. **AI agents as workflow steps** — the entire enrichment pipeline can be modeled as Twenty Workflows:
   - Trigger: `company.created`
   - Step 1: `AI_AGENT` with prompt "Classify this company's AI adoption tier based on their domain and description. Return JSON `{tier: 1|2|3, confidence: float, evidence: string}`" with `responseFormat: {type: 'json', schema: {...}}`
   - Step 2: `UPDATE_RECORD` using the AI output to update `company.aiTier`

3. **Logic Functions as ML hooks** — the `isTool: true` flag on Logic Functions means the in-house MLX contact scorer (4,618 embeddings/sec on M1) can be exposed as an AI tool. The Twenty AI chatbot can then invoke it: "Score the fit of all unscored contacts in the SF Bay Area pipeline."

4. **Webhooks as the event bus** — subscribe to `company.updated`, `person.created`, `opportunity.updated` webhooks to trigger the downstream pipeline. This decouples the lead-gen ML pipeline from Twenty's internals while keeping the CRM as the authoritative record.

5. **GraphQL metadata API** — query the metadata API to introspect the current schema programmatically, then build typed GraphQL operations. This enables Rust pipeline code to stay in sync with schema changes without manual codegen.

### 9.2 MCP Integration Patterns

**Pattern A — External MCP for AI Desktop clients:**

Deploy `jezweb/twenty-mcp` (or fork it) pointed at the self-hosted Twenty instance. This gives Claude Desktop, Cursor, and other MCP clients full CRM access. The lead-gen team can then use Claude to run queries like "show me all contacts at Series B companies in the EU with no outreach in 30 days."

**Pattern B — Logic Function MCP bridge:**

Register the lead-gen platform's Rust ML models as Logic Functions with `isTool: true`. The Twenty AI chatbot becomes a unified interface to both CRM data (via database tools) and ML scoring (via logic function tools). No separate MCP server infrastructure needed.

**Pattern C — Workflow AI Agent for enrichment:**

Use the `AI_AGENT` workflow action with `AUTO_SELECT_SMART_MODEL_ID` for enrichment tasks that require web research (the NATIVE_MODEL web search tool is available). For high-volume batch scoring, use a Logic Function pointing at the local MLX server (cheaper, faster) instead.

**Pattern D — OpenAI-compatible provider for MLX:**

Register the local `mlx_lm.server` as a custom AI provider via `AI_PROVIDERS` config variable with `AI_SDK_OPENAI_COMPATIBLE` as the SDK package. This makes the Qwen2.5-3B model selectable as an `AgentEntity.modelId`, giving workflow agents access to it for email drafting without OpenAI API costs.

### 9.3 What to Build on Top of Twenty

The gaps identified in section 8 map directly to build-vs-use decisions:

| Gap | Build Recommendation |
|---|---|
| Lead scoring | Rust embedding model → Logic Function tool → Twenty custom object |
| Deduplication | Python/Rust similarity scorer → Workflow AI Agent with merge action |
| Vector search | pgvector extension on the self-hosted Neon instance + custom metadata tool |
| Enrichment | Workflow: trigger on `company.created` → AI_AGENT (web_search + HTTP) → UPDATE_RECORD |
| Contact scoring | MLX inference server → Logic Function → Twenty custom field |
| Outreach sequencing | Twenty Workflow: DRAFT_EMAIL + DELAY + IF_ELSE branching |

### 9.4 Architecture Recommendation

```
[Common Crawl / Ashby boards]
        |
   [Rust discovery pipeline]
        | REST POST
        v
   [Twenty CRM]  <---> [Twenty AI Chatbot (MCP + tools)]
        |                      ^
   Webhook (company.created)   |
        |              [Logic Functions: MLX scoring, Rust classifiers]
        v
   [NestJS enrichment worker] (this app's /api/companies/enhance)
        |
   [Vercel AI SDK: DeepSeek / Claude for enrichment text]
        |
   GraphQL Mutation  → Twenty CRM (update enriched fields)
        |
   [Workflow: AI_AGENT draft email → DELAY → send if no reply]
```

This keeps Twenty as the authoritative CRM + workflow engine while the lead-gen platform's Rust/ML pipeline handles the heavy lifting. The boundary is clean: everything in Twenty is the "what is known" state; everything in the Rust pipeline is the "compute new knowledge" process.

---

## Sources

- [twentyhq/twenty — GitHub repository](https://github.com/twentyhq/twenty)
- [Feature: Create MCP Server — Issue #12953](https://github.com/twentyhq/twenty/issues/12953)
- [mhenry3164/twenty-crm-mcp-server](https://github.com/mhenry3164/twenty-crm-mcp-server)
- [jezweb/twenty-mcp](https://github.com/jezweb/twenty-mcp)
- [DeepWiki: twentyhq/twenty](https://deepwiki.com/twentyhq/twenty)
- [Twenty Webhooks Documentation](https://docs.twenty.com/developers/extend/webhooks)
- [Unlocking Your CRM with AI — Skywork](https://skywork.ai/skypage/en/unlocking-crm-ai-deep-dive/1980149387590488064)
- [Twenty CRM MCP Server — playbooks.com](https://playbooks.com/mcp/twenty-crm)
- Source files examined directly via GitHub API:
  - `packages/twenty-server/src/engine/metadata-modules/ai/**`
  - `packages/twenty-server/src/engine/core-modules/tool-provider/**`
  - `packages/twenty-server/src/modules/workflow/**`
  - `packages/twenty-server/src/engine/metadata-modules/ai/ai-models/ai-providers.json`
