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

---

## 10. Deep ML Analysis

### 10.1 AgentTurnGraderService — Exact LLM-as-Judge Implementation

**File:** `packages/twenty-server/src/engine/metadata-modules/ai/ai-agent-monitor/agent-turn-grader.service.ts`

**Rubric (verbatim from source code, four dimensions):**
```
1. Task Completion: Did the agent accomplish what the user asked?
2. Tool Usage: Were tools used correctly and appropriately?
3. Response Quality: Is the response clear, accurate, and helpful?
4. Error Handling: Were errors handled gracefully?
```

**Scale:** 0–100 integer score (not the 1–5 Likert scale used by Prometheus; this is a continuous 0–100 rubric).

**Output format:** Strict JSON `{"score": <number>, "comment": "<string max 200 chars>"}`. No chain-of-thought reasoning is emitted. The `comment` field is the only human-readable diagnostic output.

**Model used for grading:** `AUTO_SELECT_FAST_MODEL_ID` — the cheapest/fastest model configured for the workspace at grading time. This means grading quality is model-dependent and can degrade if a workspace operator selects a weak fast model. There is no enforced minimum model capability for the grader.

**Score storage schema:**
```typescript
// AgentTurnEvaluationEntity
turnId: string;          // FK → AgentTurnEntity
score: number;           // 0-100
comment: string;         // max 200 chars
createdAt: Date;
workspaceId: string;     // multi-tenant scoping
```

**Trigger:** The grader runs asynchronously after each turn completes — it does not block the chat response stream. Grading is best-effort: if the grader LLM call fails, the turn is still stored without an evaluation score.

**Limitations vs. academic LLM-as-judge standards:**
- No position-bias mitigation (single-pass, no swap re-scoring)
- No reference answer (`evaluationInputs` seeds exist but no automated runner invokes them against the grader)
- No calibration against human preference labels
- 200-character comment limit means the grader cannot produce rationale chains for debugging

**Comparison to Prometheus (Kim et al., ICLR 2024):** Prometheus uses a 1–5 Likert scale with full rubric definitions per score level, a reference answer, and chain-of-thought feedback. Twenty's 0–100 rubric is coarser (fewer reference anchors per score level) and has no reference answer, making it susceptible to score inflation on verbally fluent but factually wrong agent responses.

### 10.2 Tool Registry Lazy-Loading — Two-Phase Protocol

**The problem it solves:** With 9 tool categories × N workspace objects × 6 CRUD operations each, a medium Twenty workspace with 20 custom objects generates ~120+ tool descriptors. At ~200 tokens per tool schema, that is 24,000+ tokens just for tool definitions — exceeding 25% of a 96k-token context window before a single message is processed.

**The three meta-tools (pre-loaded into every system prompt):**
```typescript
get_tool_catalog   // returns lightweight index: {name, description, category} for all tools
learn_tools        // accepts string[] of tool names; returns full JSON Schema for each
execute_tool       // accepts {toolName: string, arguments: object}; dispatches to ToolExecutorService
```

**Protocol flow:**
```
1. Model reads get_tool_catalog output → sees ~1,000-token index (names + one-line descriptions)
2. Model decides it needs "create_company" → calls learn_tools(["create_company"])
3. learn_tools returns full Zod-generated JSON Schema (~200 tokens) for that tool only
4. Model calls execute_tool("create_company", {name: "Acme", domainName: {primaryLinkUrl: "acme.com"}})
5. ToolExecutorService dispatches to DatabaseToolProvider → WorkspaceEntityManager → INSERT
```

**Context budget implication:** By lazy-loading, the model uses only ~1,000 tokens for the full catalog index vs. 24,000+ tokens for all schemas upfront. This is why Twenty can support 100+ tools without hitting GPT-4's function-calling limits (~128 parallel tools in OpenAI's implementation, but token budget is the real constraint).

**Comparison to standard function calling:** OpenAI function calling loads all tool schemas into the system context unconditionally. The lazy-load pattern is a form of retrieval-augmented tool calling — the model retrieves the tool spec only when it decides to use it. This is architecturally similar to the "lazy-MCP" pattern (voicetreelab/lazy-mcp) documented separately in the MCP ecosystem.

**Failure mode at scale:** If the model requests `learn_tools` on 10+ tools in a single step (e.g., for complex multi-entity operations), the schema tokens still accumulate in context. There is no eviction of previously loaded schemas once learned. Over a 300-step agentic run with diverse tool usage, context fills with both tool schemas and tool results — this is the primary reason the 300-step cap exists.

### 10.3 Vercel AI SDK v5 (LanguageModelV3) — Custom Provider Interface

**Spec version in AI SDK v5:** `LanguageModelV3` (not V1 or V2 — the spec version was incremented in the v5 alpha cycle).

**Minimum interface to implement a custom provider:**

```typescript
interface LanguageModelV3 {
  readonly specificationVersion: 'v3';
  readonly provider: string;           // e.g., "my-provider"
  readonly modelId: string;            // e.g., "my-model-v1"
  readonly supportedUrls: Record<string, RegExp[]>; // IANA media types → URL patterns for multimodal

  doGenerate(options: LanguageModelV3CallOptions): Promise<{
    text?: string;
    toolCalls?: LanguageModelV3ToolCall[];
    finishReason: 'stop' | 'length' | 'tool-calls' | 'error' | 'other';
    usage: { promptTokens: number; completionTokens: number };
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
  }>;

  doStream(options: LanguageModelV3CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV3StreamPart>;
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
  }>;
}
```

**What `LanguageModelV3CallOptions` contains:** prompt (array of user/assistant/tool messages in the AI SDK's internal `LanguageModelV3Prompt` format), `tools` (tool definitions), `toolChoice`, `temperature`, `maxTokens`, `stopSequences`, `headers`.

**How Twenty uses it:** `AiModelRegistryService` builds the provider via `createAmazonBedrock()`, `@ai-sdk/openai`, etc. For `AI_SDK_OPENAI_COMPATIBLE`, it calls `createOpenAICompatible({ name, baseURL, apiKey })` from `@ai-sdk/openai-compatible`. This means any server exposing the OpenAI `/v1/chat/completions` API (including `mlx_lm.server` running Qwen2.5-3B locally) is registerable as a Twenty AI provider with no code changes.

**Provider factory pattern:**
```typescript
const provider: ProviderV3 = {
  languageModel: (modelId: string) => new MyLanguageModelV3(modelId),
  textEmbeddingModel: (modelId: string) => new MyEmbeddingModelV3(modelId), // optional
};
```

### 10.4 The 300-Step `generateText` Limit — Failure Modes

**Why 300:** The `MAX_STEPS: 300` constant in `ChatExecutionService` and `AgentAsyncExecutorService` is a hard circuit-breaker, not a performance tuning parameter. Without it, a buggy tool or a confused model could loop indefinitely (tool call → tool error → model retries → tool call again). The `stopWhen: stepCountIs(300)` predicate in the Vercel AI SDK `generateText` call is the enforcement mechanism.

**Failure modes observed at scale:**

1. **Context accumulation overflow:** Each tool call appends ~500–2,000 tokens (tool call + tool result) to the context. At step 300 with average 1,000 tokens/step, the accumulated tool history alone is 300,000 tokens — exceeding all current commercial LLM context windows. In practice, models degrade in coherence well before step 300 as the context fills with stale intermediate results.

2. **Hard stop without cleanup:** When `stepCountIs(300)` triggers, `generateText` throws a `TooManyStepsError`. If this occurs during a multi-step record creation workflow, there is no transactional rollback — partial records may be written. The codebase has no compensating transaction logic.

3. **Tool repair loop amplification:** `experimental_repairToolCall` can fire a corrective LLM call on each malformed tool call. In adversarial or edge-case inputs, this can double the effective step count (each failed call + repair = 2 steps). In extreme cases, 150 actual operations consume all 300 steps.

4. **Cost explosion:** At $15/1M output tokens (GPT-4.1), a 300-step run generating 500 tokens/step in responses = 150k tokens = $2.25 in output alone per single agent run. For high-volume workflows, this is a significant cost concern without per-agent step budgets.

5. **Vercel serverless timeout:** Separately from the step count, a known Vercel Workflow bug causes serverless functions to hang for the full 300-second timeout even after the step logic completes in milliseconds, burning idle compute. This is distinct from the AI SDK step count but compounds cost at scale.

**Mitigation pattern (not in Twenty's codebase):** Checkpoint the agent state every N steps to a durable store (Redis/DB), enabling resume after failure. This is a known gap in Twenty's agentic architecture as of March 2026.

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|-------|---------|------|-------|-----------|-------------|
| Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (arXiv:2306.05685) | Zheng, Chiang, Sheng, Zhuang, Wu, Zhuang, Lin, Li, Li, Xing, Zhang, Gonzalez, Stoica | 2023 | NeurIPS 2023 Datasets & Benchmarks | Founding paper for Twenty's AgentTurnGraderService methodology | GPT-4 as judge achieves >80% agreement with human preferences (matching inter-human agreement); documents position bias, verbosity bias, self-enhancement bias; establishes LLM-as-judge as viable with mitigation strategies; MT-Bench (multi-turn Q&A) and Chatbot Arena (30k crowdsourced battles) are the benchmark datasets |
| Prometheus: Inducing Fine-grained Evaluation Capability in Language Models (arXiv:2310.08491) | Kim, Shin, Cho, Jang, Longpre, Lee, Yun, Shin, Kim, Thorne, Seo | 2023 | ICLR 2024 | Open-source evaluator LLM; prior art for Twenty's 0–100 grading rubric design | LLaMA-2-13B-Chat fine-tuned on 1K rubrics / 20K instructions / 100K GPT-4 feedbacks; 1–5 Likert scale with reference answer + custom rubric; Pearson correlation with humans: 0.897 (vs GPT-4's 0.882); shows that fine-tuned evaluators match GPT-4 quality at fraction of cost — directly applicable to replacing Twenty's `AUTO_SELECT_FAST_MODEL_ID` grader with a purpose-trained evaluator |
| Agent-as-a-Judge: Evaluate Agents with Agents (arXiv:2410.10934) | Zhuge, Zhao, Ashley, Wang, Khizbullin, Xiong, Liu, Chang, Krishnamoorthi, Tian, Shi, Chandra, Schmidhuber | 2024 | arXiv | Extends LLM-as-judge to multi-step agentic evaluation; directly applicable to Twenty's 300-step workflow agents | Agent evaluators achieve ~90% agreement with human experts vs ~70% for LLM-as-judge on final output; DevAI benchmark: 55 AI development tasks, 365 hierarchical requirements; enables intermediate-step evaluation not possible with Twenty's current single-turn grader; 97% cost reduction vs human evaluation |
| CRMArena: Understanding the Capacity of LLM Agents to Perform Professional CRM Tasks in Realistic Environments (arXiv:2411.02305) | Huang, Prabhakar, Dhawan, Mao, Wang, Savarese, Xiong, Laban, Wu | 2024 | NAACL 2025 | First benchmark for LLM agents on CRM tasks; direct evaluation context for Twenty's AI agents | Best models achieve <40% success with ReAct, <55% with function calling on 9 professional CRM tasks (service agent, analyst, manager personas); 16 industrial objects including accounts, orders, knowledge articles, cases; shows current LLMs struggle with "function-calling and rule-following" in realistic CRM environments — directly characterizes Twenty's AI agent reliability ceiling |
| LLM-Based Agents for Tool Learning: A Survey (Springer DSE, 2025) | Various | 2025 | Data Science and Engineering (Springer) | Survey of tool-augmented LLM agents; contextualizes Twenty's tool registry design | Three-step tool use loop: invocation trigger → tool retrieval → argument generation; lazy-loading pattern (Twenty's `learn_tools`) is identified as a key technique for handling large tool sets without context saturation; survey validates Twenty's two-phase protocol as aligned with best practices |
| Retrieval-Augmented Generation with Knowledge Graphs for Customer Service QA (arXiv:2404.17723) | Xu, Cruz, Guevara, Wang, Deshpande, Wang, Li | 2024 | SIGIR 2024 | Relevant to augmenting Twenty's `search_help_center` and `search_conversations` tools | KG-augmented RAG outperforms text-only RAG by 77.6% MRR at LinkedIn; median issue resolution time reduced 28.6%; Twenty has no vector search at all — this paper represents the next logical capability upgrade for Twenty's CRM-native RAG |

### Annotation notes

**MT-Bench / Chatbot Arena (Zheng et al., 2023, NeurIPS):** The founding paper of the LLM-as-judge methodology that Twenty's `AgentTurnGraderService` implements. Three findings are critical for Twenty: (1) position bias — the judge prefers the first response when presented with alternatives; (2) verbosity bias — longer responses score higher regardless of quality; (3) self-enhancement bias — a model rates its own outputs higher. Twenty's single-pass grader with a 200-character comment cap is especially susceptible to verbosity bias: a multi-step agent that outputs verbose intermediate results will score higher than a concise agent that accomplishes the same task in fewer tokens.

**Prometheus (Kim et al., 2023, ICLR 2024):** The key takeaway for Twenty is that the 0–100 scale with only 4 unlabeled dimensions is a weaker rubric than Prometheus's 1–5 scale with per-level definitions and a reference answer. The 200-character comment limit also prevents the diagnostic feedback that makes Prometheus useful for prompt debugging. An improved Twenty grader would: use a 1–5 Likert scale per dimension with explicit level definitions, provide a reference answer in `evaluationInputs`, and lift the comment length limit for development environments.

**CRMArena (Huang et al., 2024, NAACL):** The most operationally relevant paper. Best available LLMs (GPT-4o, Claude) achieve only 35–55% task success on realistic CRM workflows. Twenty's `experimental_repairToolCall` mitigates some of the function-calling failures, but the fundamental gap (multi-step rule-following in schema-heavy environments) is not addressable by repair alone. The paper's recommendation — task decomposition into atomic sub-steps with explicit success criteria — aligns with Twenty's workflow step design but suggests that AI_AGENT workflow steps need clearer per-step success criteria and failure conditions.

**Tool Learning Survey (2025):** Validates that Twenty's lazy-loading two-phase protocol (`get_tool_catalog` → `learn_tools` → `execute_tool`) is the correct architectural response to large tool sets. The survey identifies that 50 tool definitions consume 20,000–25,000 tokens; Twenty's catalog index approach compresses this to ~1,000 tokens regardless of tool count, which is a meaningful practical advance over raw function-calling implementations.

---

## 12. Recency & Changelog

> Researched March 28, 2026. Sources: live GitHub API (commits/releases/PRs on `twentyhq/twenty` `main` branch).

### Latest Release

**v1.19.0** — published **March 23, 2026**

Key AI/agent changes bundled into v1.19 (the release cut covers work merged between ~Feb 20 and Mar 23, 2026):

- **MCP unified endpoint** (PR #18113, merged Feb 20): The internal MCP server was consolidated from two endpoints (`/mcp` + `/mcp/metadata`) into a **single `POST /mcp`** endpoint. The schema-picker dropdown ("Core Schema" vs "Metadata Schema") was removed. The five high-level tools (`get_tool_catalog`, `learn_tools`, `execute_tool`, `load_skills`, `search_help_center`) are now the sole surface. DATABASE_CRUD tools were also fixed to work correctly with API key auth — a regression that had prevented API key–authenticated clients from using database tools.
- **MCP response shape fix** (PR #18671, merged Mar 16): `tools/list` and `prompts/list` MCP responses were returning initialize-style metadata payloads, causing strict MCP clients to reject them. Fixed to return method-specific payloads only.
- **Vercel AI SDK upgrade from v5 to v6** (PR #18172, merged Feb 25): All `@ai-sdk/*` provider packages updated to v6-compatible versions. The spec version moved from `LanguageModelV3` to the v6 interface. Groq (`@ai-sdk/groq`) was **removed** from `packages/twenty-server/package.json` entirely (PR #18863 cleaned up the stale `yarn.lock` entry on Mar 23). Groq is no longer a supported first-party provider.
- **Amazon Bedrock added** (PR #18155, merged Feb 22): AWS Bedrock added as an inference provider, serving Claude Opus 4.6 and Sonnet 4.6 via AWS infrastructure. Credential handling follows the existing S3/SES pattern. Bedrock-specific pricing (tiered >200k context, cache creation rates) added to the billing service.
- **Two-layer AI model availability filtering** (PR #18170, merged Feb 24): New admin-level filtering layer (server-wide whitelist/blacklist via `AI_DISABLED_MODEL_IDS`, `AI_ENABLED_MODEL_IDS`, `AI_AUTO_ENABLE_NEW_MODELS`) plus per-workspace controls ("Use best models only" mode backed by `isRecommended` flag). Security enforcement at every backend execution point.
- **InferenceProvider / ModelFamily refactor** (PR #18155): `ModelProvider` enum split into two orthogonal enums — `InferenceProvider` (who serves it: auth, SDK, metadata format) and `ModelFamily` (who created it: token counting semantics). This eliminates growing `||` chains for token normalization checks like `excludesCachedTokens`.
- **AI model pricing overhaul** (PR #18155): All model constants updated with accurate per-1M-token pricing including cached input rates, cache creation rates, and tiered pricing for >200k context windows. Reasoning tokens charged at output rate.
- **IAM role authentication for AI providers** (PR #19016, merged Mar 26): New `authType` field (`'api_key' | 'access_key' | 'iam_role'`) on AI provider config. Bedrock providers authenticated via instance profile / IAM role are now registerable without explicit API keys or access key credentials. The admin panel shows a "Configured (IAM role)" badge.
- **AI model catalog automated sync** (daily CI job): The `ai-providers.json` catalog is now synced automatically from `models.dev` via a dedicated CI script. Three sync commits landed in a single week (Mar 21–27, 2026), indicating the catalog is refreshed nearly daily. Models are no longer manually maintained.
- **Hardcoded model constants replaced with JSON seed catalog** (PR #18818, merged Mar 21): Per-provider TypeScript constant files replaced by a single `ai-providers.json` as source of truth. Runtime model discovery via AI SDK added for self-hosted providers. Composite model IDs introduced (`provider/modelId`). Deprecated config variables removed: `AI_DISABLED_MODEL_IDS`, `AUTO_ENABLE_NEW_AI_MODELS`.
- **AI billing usage analytics dashboard** (PR #18592, merged Mar 23): ClickHouse-backed `billingEvent` table with 3-year TTL. New `getBillingAnalytics` GraphQL query and a frontend dashboard component showing credit consumption by user, resource, execution type, and time series. The billing UI gap identified in section 8.1 has been partially closed — analytics are now visible in-app.
- **AI provider sections ungated from billing** (PR #18845, merged Mar 23): Providers and Custom Providers sections in Admin > AI settings were previously hidden when billing was enabled. This guard was removed — provider configuration is now always visible regardless of billing status.
- **AI chat in navbar** (PR #18161, merged Feb 27): AI chat threads are now accessible from the navigation panel, not just as a floating side panel. Draft message persistence added for AI chat threads.
- **Navbar AI chats scroll refactor** (PR #18999, Mar 26): Non-chat placeholder and navigation panel scroll refactored.
- **AI agent permissions tab UI polish** (PR #19003, Mar 26): replaced custom styles with `MenuItem` and `SidePanelGroup` in the agent permissions tab.
- **Fix: Cannot create two workflow agent nodes with the same name** (PR #19015, Mar 26): Regression fix — duplicate node names in workflows were blocked erroneously.
- **AI tools for demo workspace creation** (PR #18236, merged Mar 5): New AI tools added to the workspace seeding utility, enabling a demo workspace to be fully configured via AI chat commands.
- **Context usage display in AI chat** (PR #16518, in v1.14): Token context window usage indicator added to the chat UI (BREAKING: deploy server before frontend).
- **Skills system replacing agent search** (PR #16513, in v1.14): The agent search interface was replaced by the structured Skills system surfacing domain-specific procedural knowledge.
- **Dashboard tools for AI chat** (PR #16517, in v1.14): AI chat gained the `DASHBOARD` tool category, enabling the assistant to create and manage dashboards from the chat interface.

### IS_AI_ENABLED Flag Status

**Still feature-flagged as of March 28, 2026.** No PR or commit removing the `IS_AI_ENABLED` config guard was found in the commit history through v1.19. The flag controls visibility of the AI tab, chat interface, and agent management.

However, several adjacent signals indicate the AI subsystem is maturing toward GA:

- The `IS_PAGE_LAYOUT_ENABLED` feature flag was promoted to GA in v1.16 (PR #16997). This is the typical pattern — flags are removed once a feature is stable.
- The MCP endpoint, two-layer filtering, billing analytics, and IAM role auth (all merged Jan–Mar 2026) represent production-hardening work, not prototype exploration.
- The AI provider sections were **ungated from billing status** (PR #18845, Mar 23) — a sign that AI configuration is transitioning from gated preview to standard product.
- Felix Malfait (core maintainer) has personally merged numerous AI PRs in the past 30 days, indicating the feature has moved out of experimental hands.

**Rollout plan:** No public announcement was found. Given the trajectory (one major AI PR per week), `IS_AI_ENABLED` is likely to be removed (or defaulted to `true`) in a v1.20 or v2.0 release. Self-hosted operators can already enable it manually via the config variable today.

### New AI Providers Added

Since the report was written (July 2025 baseline), the following providers have been added or upgraded:

| Provider | Status | Notes |
|---|---|---|
| **Amazon Bedrock** | Added (PR #18155, Feb 2026) | Serves Claude Opus 4.6 + Sonnet 4.6 via AWS. IAM role auth via PR #19016. |
| **Groq** | **Removed** (PR #18863, Mar 2026) | `@ai-sdk/groq` dropped from package.json. No longer supported. |
| **Mistral** | Added (PR #18155, Feb 2026) | `@ai-sdk/mistral` added to the provider catalog. |
| OpenAI | Existing | AI SDK upgraded to v6-compatible `@ai-sdk/openai`. |
| Anthropic | Existing | AI SDK upgraded to v6-compatible `@ai-sdk/anthropic`. |
| Google | Existing | `@ai-sdk/google` bumped. Gemini 3.1 Flash Lite added Mar 13. |
| xAI | Existing | `@ai-sdk/xai` bumped from 3.0.59 → 3.0.74 (auto-merge). |

The catalog is now source-controlled in `ai-providers.json` and synced from `models.dev` daily by a CI automation. The 5-provider count in section 2.2 is now **6 providers** (adding Bedrock, removing Groq net = +1). Model counts are updated continuously.

**Default model fallback lists** (introduced v1.14): `DEFAULT_AI_SPEED_MODEL_ID` and `DEFAULT_AI_PERFORMANCE_MODEL_ID` now accept comma-separated fallback lists (e.g., `gpt-4.1-mini,claude-haiku-4-5-20251001,grok-3-mini`), so self-hosters get working defaults regardless of which single provider they configure.

### Agent/Workflow Updates

- **`WorkflowActionType.AI_AGENT`**: No new step type enum values added since the original report. The `AI_AGENT` type remains the single AI workflow action type. Key improvements were in the execution path: fix for workflow agent node naming collision (PR #19015), variable interpolation fix for agent prompt nodes (PR #18275).
- **Logic Function renamed** (v1.17, PR #17494): `serverlessFunction` was renamed to `logicFunction` throughout the codebase. Any code referencing the old name via the SDK or GraphQL API must be updated. The GraphQL mutation is now `createOneLogicFunction`, not `createOneServerlessFunction`.
- **Logic Function `isTool` in manifest** (PR #17926, merged Feb 16): Self-hosted apps can now declare `isTool: true` on a logic function directly in their app manifest, making it discoverable as an AI tool without going through the admin UI.
- **Logic Function `define_post_install`** (PR #18248): New lifecycle hook allowing apps to register post-install logic functions programmatically.
- **App logic function as workflow step** (PR #17525, v1.17): Logic functions from installed apps can now be used directly as workflow steps — not just as AI tools. This broadens the reuse surface.
- **Remove versions from logicFunction** (PR #17540, v1.17): The versioning system on logic functions was removed. This simplifies the data model but may affect any code that relied on version history.
- **`get_current_workflow_version` tool** (PR #17177, v1.16): New tool in the `WORKFLOW` category exposing the current workflow version to the AI agent.
- **Draft Email workflow action** (PR #17793, v1.18): `DRAFT_EMAIL` added as a workflow action type alongside `SEND_EMAIL`, enabling AI-drafted emails to go through a human review step before sending.

### MCP Server Updates

The internal MCP server received the most significant changes since the initial July 2025 launch:

1. **Single endpoint** (PR #18113, Feb 20): Merged dual-endpoint architecture (`/mcp` + `/mcp/metadata`) into one `POST /mcp` endpoint. Eliminates the schema picker UI.
2. **DATABASE_CRUD via API key fixed** (PR #18113): A missing guard removal now allows API key–authenticated MCP clients to access database CRUD tools. This was a blocking bug for external MCP client integrations.
3. **STEP 1/2/3 workflow guidance** (PR #18113): Tool descriptions updated with explicit discovery flow instructions (`STEP 1: get_tool_catalog → STEP 2: learn_tools → STEP 3: execute_tool`) to prevent AI clients from guessing tool names.
4. **Method-specific response shapes** (PR #18671, Mar 16): `tools/list` and `prompts/list` now return only the expected payload (not initialize-style metadata). Fixes compatibility with strict MCP clients.
5. **OAuth 2.0 Dynamic Client Registration** (PR #18608, Mar 16): RFC 7591 Dynamic Client Registration implemented, enabling MCP clients to register themselves without manual admin provisioning. This is a significant improvement for external MCP integrations.

The external community MCP servers (`mhenry3164/twenty-crm-mcp-server` and `jezweb/twenty-mcp`) are unchanged — they wrap the REST/GraphQL API and are unaffected by the internal MCP changes.

### Vercel AI SDK Migration Status

**Twenty is now on Vercel AI SDK v6 (not v5).** The migration was completed Feb 25, 2026 (PR #18172). The spec interface is no longer `LanguageModelV3` — v6 uses updated interfaces (the migration guide is at `ai-sdk.dev/docs/migration-guides/migration-guide-6-0`).

**Key v6 migration notes:**
- The PR author noted they could not test locally due to API credit constraints and relied on CI to validate. This is a risk signal — the migration may have subtle edge cases not caught by unit tests.
- No follow-up regression PRs specifically attributed to the v6 upgrade were found in the subsequent 30 days, which is a positive signal.
- `@ai-sdk/groq` was dropped at the same time — the Groq SDK had not yet released a v6-compatible version when the migration landed.
- `@ai-sdk/xai` received two auto-merge dependency bumps (3.0.59 → 3.0.74) in the following weeks, confirming active maintenance of the provider packages.

**Stability assessment:** The v6 migration appears stable. No critical regression issues were filed against AI features in the subsequent 30 days. The daily model catalog sync CI jobs are running without incident.

### Breaking Changes

Changes since the initial July 2025 report that can break existing integrations:

| Change | Version | Impact |
|---|---|---|
| `serverlessFunction` → `logicFunction` rename | v1.17 | Any GraphQL mutation or SDK call using `createOneServerlessFunction`, `updateOneServerlessFunction`, etc. must be updated. The REST path changed accordingly. |
| `logicFunction` versioning removed | v1.17 | Code relying on `version` field or version-scoped execution of logic functions breaks. |
| MCP unified endpoint | v1.19 | Clients targeting `/mcp/metadata` must migrate to `POST /mcp`. The schema picker dropdown is gone; the `get_tool_catalog` tool replaced it. |
| AI model catalog breaking change | v1.14 | Deploy server before frontend — the model catalog format changed. Existing `AgentEntity.modelId` values using old format IDs are migrated automatically, but the config variables `AI_DISABLED_MODEL_IDS` and `AUTO_ENABLE_NEW_AI_MODELS` were removed in v1.19's JSON seed catalog PR (PR #18818). |
| Composite model IDs | ~Mar 2026 (PR #18818) | Model IDs are now `provider/modelId` format (e.g., `openai/gpt-4.1`). DB migration included, but any hardcoded model IDs in agent definitions or external scripts must be updated. |
| Groq removed | ~Mar 2026 | Workspaces using `@ai-sdk/groq` models as their configured provider will lose AI functionality. Must migrate to another provider. |
| AI SDK v5 → v6 interfaces | v1.19 | Custom providers implementing `LanguageModelV3` must update to the v6 interface. The `specificationVersion` field changed. |
| Default code interpreter/logic function to disabled in production | PR #18559, Mar 11 | Both `code_interpreter` and logic function execution are now disabled by default in production environments. Must be explicitly enabled. This is a security hardening change. |

### Staleness Assessment

**Velocity:** Twenty's AI feature layer is shipping at approximately **5–10 merged AI PRs per week** as of March 2026. This is the highest sustained AI feature velocity observed since v1.0 (June 2025). The cadence accelerated significantly after v1.19 — the week of March 21–28 alone saw: model catalog rebuild (PR #18818), IAM role auth (PR #19016), agent UI polish (PRs #18876, #18874, #19003), daily catalog sync automation (3 commits), and MCP response shape fix (PR #18671).

**Production readiness for AI-heavy workloads:**

| Dimension | Assessment |
|---|---|
| **Multi-provider coverage** | Strong — 6 providers, 135+ models, daily catalog sync, IAM role auth for AWS-native deployments |
| **Model catalog freshness** | Excellent — automated daily sync from `models.dev` eliminates manual maintenance lag |
| **MCP integration** | Materially improved since July 2025 — single endpoint, API key fixed, RFC 7591 client registration |
| **Billing/cost attribution** | Now has ClickHouse-backed analytics dashboard with per-user/resource breakdowns |
| **Agent quality evaluation** | Unchanged — `AgentTurnGraderService` still runs best-effort, no UI for score review, `evaluationInputs` still not wired to an automated runner |
| **Agentic reliability** | Minor improvements (workflow agent node fixes) but fundamental gaps remain: no checkpointing, no rollback, no per-agent step budget below 300 |
| **Security hardening** | Significant — code interpreter/logic function disabled by default in production, SSRF protections on webhooks, IAM role auth |
| **Logic Functions API stability** | Unstable — rename in v1.17, versioning removed in v1.17, manifest changes in v1.18/v1.19. Any integration built on this surface should treat it as beta. |

**Overall verdict:** Twenty is **production-ready for read-heavy and enrichment-type AI workloads** (AI chat querying CRM data, AI workflow agents doing web search + record updates). It is **not yet production-ready for high-reliability agentic write workflows** requiring transactional guarantees, checkpointing, or automated quality gates. For the lead-gen use case (query contacts, score companies, draft emails via AI chat), the platform is sufficiently stable. For autonomous multi-step pipelines that must not produce partial state, the gaps in section 8.4 remain unaddressed.

**Key dates:**
- v1.0.0 released: June 25, 2025
- AI features (IS_AI_ENABLED) introduced: July 2025 (v1.2/v1.3 window)
- Amazon Bedrock added: February 22, 2026
- MCP unified + API key fix: February 20, 2026
- Vercel AI SDK v6 migration: February 25, 2026
- JSON seed catalog + composite model IDs: March 21, 2026
- IAM role auth for providers: March 26, 2026
- Latest release: v1.19.0 (March 23, 2026)
- Research date: March 28, 2026
