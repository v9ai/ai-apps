# n8n — AI Features Deep Report

> Researched from GitHub source (`n8n-io/n8n`, commit tree as of 2026-03-28), official documentation at `docs.n8n.io`, and direct reading of package source code in `packages/@n8n/nodes-langchain` and `packages/@n8n/agents`.

---

## 1. Overview

### Repository Snapshot

| Metric | Value |
|--------|-------|
| GitHub Stars | 181,441 |
| Forks | 56,252 |
| Contributors | 633+ |
| Open Issues | 1,425 |
| Latest release | n8n@2.13.4 (2026-03-26) |
| Primary language | TypeScript (91.4%) |
| Secondary | Vue (7.2%), Python (0.4%) |
| Runtime | Node.js |
| License | Sustainable Use License (fair-code) + Enterprise License |

### What It Is

n8n is a workflow automation platform described as giving "technical teams the flexibility of code with the speed of no-code." It is self-hostable, source-available, and deeply integrated with AI/ML capabilities via two parallel subsystems:

1. **`@n8n/nodes-langchain`** — the visual-canvas LangChain integration: 100+ AI nodes surfaced in the drag-and-drop workflow builder.
2. **`@n8n/agents`** — a new code-first agent SDK (v0.1.0) built directly on the Vercel AI SDK, bypassing LangChain entirely for the programmatic path.

Both subsystems coexist. The visual nodes use LangChain under the hood; the SDK uses Vercel AI SDK (`ai` v6). This dual-stack reflects a genuine architectural evolution away from LangChain toward a lighter, provider-agnostic model.

### Scale

- 400+ integrations across SaaS, databases, APIs
- 900+ community workflow templates
- 8,958 community automation workflows published

---

## 2. AI Architecture

### 2.1 Two-Layer Architecture

n8n has two distinct AI execution paths:

```
Layer 1: Visual Nodes (LangChain-based)
  packages/@n8n/nodes-langchain/
    ├── nodes/agents/Agent/          (AgentV1, V2, V3)
    ├── nodes/chains/                (ChainLLM, ChainRetrievalQA, ChainSummarization, etc.)
    ├── nodes/llms/                  (LMChatAnthropic, LMChatOpenAi, etc.)
    ├── nodes/vector_store/          (Pinecone, Qdrant, Chroma, PGVector, etc.)
    ├── nodes/embeddings/            (OpenAI, Cohere, HuggingFace, etc.)
    ├── nodes/memory/                (Buffer, MongoDB, Redis, Postgres)
    ├── nodes/tools/                 (Calculator, Code, HttpRequest, SerpApi, etc.)
    ├── nodes/mcp/                   (McpClient, McpClientTool, McpTrigger)
    └── nodes/Guardrails/            (PII, jailbreak, NSFW, secret-key detection)

Layer 2: Code-First Agent SDK (Vercel AI SDK-based)
  packages/@n8n/agents/
    ├── src/sdk/                     (Agent, Tool, Memory, Eval, Guardrail, Network builders)
    ├── src/runtime/                 (AgentRuntime — core agentic loop)
    ├── src/storage/                 (SqliteMemory, PostgresMemory)
    └── src/integrations/            (LangSmith telemetry via OTel)
```

### 2.2 Cluster Node Architecture (Visual Layer)

The visual layer uses a **cluster node** system. Nodes are classified as either **root nodes** or **sub-nodes**:

- **Root nodes** are the workflow graph entry points for AI operations: AI Agent, Basic LLM Chain, Question and Answer Chain, Summarization Chain, Information Extractor, Text Classifier, Sentiment Analysis, Vector Stores.
- **Sub-nodes** are satellite components that attach to a root node via typed AI connection ports. They supply language models, memory backends, tools, embeddings, retrievers, output parsers, and text splitters.

The typed connection ports use `NodeConnectionTypes.AiLanguageModel`, `NodeConnectionTypes.AiTool`, `NodeConnectionTypes.AiMemory`, `NodeConnectionTypes.AiOutputParser`, etc. The `AgentV3.node.ts` declares its inputs dynamically:

```typescript
inputs: `={{
  ((hasOutputParser, needsFallback) => {
    ${getInputs.toString()};
    return getInputs(true, hasOutputParser, needsFallback);
  })($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true,
     $parameter.needsFallback !== undefined && $parameter.needsFallback === true)
}}`,
```

This means the port configuration is runtime-evaluated from node parameters, not statically declared — enabling conditional ports (e.g., an optional fallback model port appears only when `needsFallback=true`).

### 2.3 LangChain Integration Design

The LangChain bridge lives in `packages/@n8n/ai-utilities/src/adapters/`:

- `langchain-chat-model.ts` — `LangchainChatModelAdapter` extends `BaseChatModel` from `@langchain/core`, wrapping n8n's internal `ChatModel` interface. It injects `N8nLlmTracing` callbacks for token-usage tracking and attaches n8n's retry/failure handler.
- `langchain-history.ts` — LangChain message history adapter.
- `langchain-memory.ts` — LangChain memory adapter backed by n8n's memory abstraction.

This adapter pattern means every LangChain-facing concept (chat model, memory, tools) has a thin n8n wrapper that adds: tracing, retry logic, credential injection, and cost tracking.

**Key dependency chain:**
```
Visual Agent Node → @langchain/classic/agents → LangchainChatModelAdapter → n8n ChatModel → Provider API
                                               → LangchainMemoryAdapter → n8n MemoryBackend
```

The newer `@n8n/agents` SDK skips this chain entirely:
```
Agent SDK → Vercel AI SDK (ai v6) → Provider API directly
```

The SDK uses `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/xai` as direct dependencies. The `model-factory.ts` in the runtime resolves provider strings like `"anthropic/claude-sonnet-4"` into the correct AI SDK model instance.

### 2.4 Agent Runtime Loop

The `AgentRuntime` (`packages/@n8n/agents/src/runtime/agent-runtime.ts`) is the core execution engine for the code-first SDK. Key behaviors:

- Uses `generateText` / `streamText` from Vercel AI SDK directly
- Default **20 iterations** maximum (`MAX_LOOP_ITERATIONS`) before stopping
- **Configurable concurrency**: tools in one LLM turn run in batches of `toolCallConcurrency` (default `1`; `Infinity` runs all concurrently via `Promise.allSettled`)
- **Streaming path**: returns a `TransformStream`; loop writes chunks in background
- **Non-streaming path**: returns `GenerateResult` after loop completes

The loop invariants:
1. Orphaned tool-call/tool-result pairs are stripped before each LLM call (`stripOrphanedToolMessages`)
2. System prompt is rebuilt each iteration (working memory content injected there)
3. Suspension snapshots are stored via `CheckpointStore`; runs resume from checkpoint
4. All new messages are persisted to memory store at end of successful turn

### 2.5 Memory Architecture (Agent SDK Layer)

Three tiers of memory in `@n8n/agents`:

| Tier | Mechanism | Storage |
|------|-----------|---------|
| **Sliding window** | Last N messages in context | In-memory / passed to model |
| **Semantic recall** | Embedding-based retrieval of relevant past messages | `queryEmbeddings()` via pgvector HNSW index |
| **Working memory** | Persistent agent "scratchpad" extracted from `<working_memory>...</working_memory>` tags in assistant output | `saveWorkingMemory()` — keyed by `resourceId` or `threadId` |

The `Memory` builder supports:
- `.storage('memory')` — in-process (lost on restart)
- `.storage(new SqliteMemory(...))` or `.storage(new PostgresMemory(...))`
- `.lastMessages(N)` — sliding window size
- `.semanticRecall({ topK: K, messageRange: { before: N, after: N } })` — RAG retrieval
- `.structured(zodSchema)` or `.freeform(template)` — working memory format
- `.scope('resource' | 'thread')` — working memory isolation level
- `.titleGeneration(true)` — fire-and-forget auto-titling of threads

The `PostgresMemory` implementation (`packages/@n8n/agents/src/storage/postgres-memory.ts`) creates three tables on first init:
- `{ns}threads` — conversation threads with resourceId, title, metadata
- `{ns}messages` — messages with JSONB content and serial seq for stable ordering
- `{ns}working_memory` — key/scope-indexed text blob
- `{ns}message_embeddings` — lazily created on first `saveEmbeddings()` call, with `vector(N)` column and HNSW cosine index

This is directly relevant to the lead-gen app's Neon PostgreSQL setup.

---

## 3. Key AI Features

### 3.1 AI Agent Node (Visual Layer)

**File**: `packages/@n8n/nodes-langchain/nodes/agents/Agent/`

Three major versions exist (V1, V2, V3). V3 is current. It supports two agent "types" depending on the connected model:

**Agent types in V3 (ToolsAgent)**:
- The V3 AI Agent node is effectively always a ToolsAgent — it uses native function/tool calling supported by the connected model. The explicit per-type choice from V1/V2 (ReAct, OpenAI Functions, Plan-and-Execute, Conversational, SQL) has been folded into a single adaptive agent.

**Legacy agent types (V1/V2 still in codebase)**:
- `ConversationalAgent` — MRKL-style, no tools required
- `OpenAiFunctionsAgent` — uses OpenAI's `functions` API
- `PlanAndExecuteAgent` — two-phase: planning step then execution
- `ReActAgent` — Reason + Act loop
- `SqlAgent` — specialized for natural language to SQL
- `ToolsAgent` — generic tool-calling loop

**V3 Agent configuration options**:
- `promptType`: `auto` (reads from previous node), `define` (manual text), `guardrails` (text from Guardrails node)
- `hasOutputParser`: boolean — adds optional output parser port
- `needsFallback`: boolean — adds second language model port for fallback
- `enableStreaming`: boolean — streams response in real-time
- `maxTokensFromMemory`: limits how much chat history is loaded
- `batching.batchSize` / `batching.delayBetweenBatches` — batch processing support

**Execution flow (V3)**:
1. `buildExecutionContext` — resolves model, fallback model, memory, batch config
2. Items split into batches, each batch goes through `executeBatch`
3. `prepareItemContext` — loads memory, resolves tools, applies system message
4. `createAgentSequence` — builds the LangChain `AgentRunnableSequence`
5. `runAgent` — decides streaming vs. non-streaming, invokes the chain
6. Engine request/response protocol for native tool execution (allows n8n to execute the tools rather than the LLM, then return results)

**Native tool execution protocol**: V3 introduced an `EngineRequest`/`EngineResponse` protocol where the agent can return early with tool call requests. The n8n execution engine then runs the tools as separate workflow nodes and injects results back into the agent via `EngineResponse`. This is what enables **n8n workflow nodes as tools** — the agent invokes the tool, n8n executes an entire sub-workflow, returns the result.

### 3.2 LLM Nodes (Chat Models)

These are sub-nodes that attach to agent/chain root nodes via the `AiLanguageModel` port.

**Available chat model nodes**:
| Node | Provider | Notes |
|------|----------|-------|
| `LMChatAnthropic` | Anthropic | Claude models, extended thinking support |
| `LMChatOpenAi` | OpenAI | GPT-4, o-series models |
| `LmChatAzureOpenAi` | Azure OpenAI | Enterprise Azure endpoint |
| `LmChatDeepSeek` | DeepSeek | DeepSeek-R1, DeepSeek-V3 |
| `LmChatGoogleGemini` | Google | Gemini 1.5/2.0 |
| `LmChatGoogleVertex` | Google Vertex | Enterprise Vertex AI |
| `LmChatGroq` | Groq | Fast inference (LLaMA, Mixtral) |
| `LmChatMistralCloud` | Mistral | Mistral Large, Codestral |
| `LMChatOllama` | Ollama | Local models |
| `LmChatOpenRouter` | OpenRouter | Multi-provider routing |
| `LmChatVercelAiGateway` | Vercel | AI Gateway |
| `LmChatXAiGrok` | xAI | Grok models |
| `LmChatAwsBedrock` | AWS Bedrock | Enterprise AWS |

Each node provides model selection, temperature, max tokens, and provider-specific options (e.g., `thinking.budgetTokens` for Anthropic extended thinking).

Also available: legacy text completion LLM nodes (`LMOpenAi`, `LMOllama`, `LMCohere`, `LMOpenHuggingFaceInference`) for non-chat completion use cases.

### 3.3 Vector Store Nodes

**Supported vector stores**:
| Node | Backend |
|------|---------|
| `VectorStoreAzureAISearch` | Azure AI Search |
| `VectorStoreChromaDB` | Chroma (self-hosted + cloud) |
| `VectorStoreInMemory` | In-process (dev/testing) |
| `VectorStoreMilvus` | Milvus |
| `VectorStoreMongoDBAtlas` | MongoDB Atlas |
| `VectorStorePGVector` | PostgreSQL + pgvector |
| `VectorStorePinecone` | Pinecone |
| `VectorStoreQdrant` | Qdrant |
| `VectorStoreRedis` | Redis |
| `VectorStoreSupabase` | Supabase (PGVector) |
| `VectorStoreWeaviate` | Weaviate |
| `VectorStoreZep` | Zep |

Legacy "ChatHub" variants (pinecone, PGVector, Qdrant) exist for backward compat.

Each vector store node has three modes: **Insert** (index documents), **Load** (retrieve documents), **combined** (bidirectional). Nodes connect to embeddings sub-nodes for vectorization.

The `VectorStorePGVector` node is particularly relevant for this lead-gen platform — it uses the same Neon PostgreSQL instance with the `pgvector` extension, enabling zero-infrastructure RAG on top of existing company/contact data.

### 3.4 Embeddings

**Available embedding nodes**:
- `EmbeddingsAwsBedrock`
- `EmbeddingsAzureOpenAi`
- `EmbeddingsCohere`
- `EmbeddingsGoogleGemini`
- `EmbeddingsGoogleVertex`
- `EmbeddingsHuggingFaceInference`
- `EmbeddingsLemonade` (local)
- `EmbeddingsMistralCloud`
- `EmbeddingsOllama` (local)
- `EmbeddingsOpenAI`

Each attaches to a vector store node or retriever via the `AiEmbedding` connection type.

### 3.5 Chain Nodes

Chains are simpler than agents — single-pass LLM calls with optional retrieval or structured output:

| Node | Purpose |
|------|---------|
| `ChainLlm` (Basic LLM Chain) | Direct prompt → LLM → response, with optional output parser |
| `ChainRetrievalQA` (Q&A Chain) | RAG: retrieve relevant docs from vector store, then answer |
| `ChainSummarization` | Summarize long documents (map-reduce or stuff) |
| `InformationExtractor` | Extract structured data from text using JSON schema |
| `TextClassifier` | Classify text into predefined categories |
| `SentimentAnalysis` | Sentiment scoring (positive/negative/neutral) |

`InformationExtractor` uses structured output with a Zod-like JSON schema definition in the node UI, then validates the LLM response. This is effectively a lightweight structured extraction pipeline without code.

### 3.6 Tool Nodes

Tools are sub-nodes that attach to agent nodes via the `AiTool` connection type. When an agent decides to call a tool, n8n executes the corresponding tool node.

**Built-in tool nodes**:
| Node | Capability |
|------|-----------|
| `ToolCalculator` | Math evaluation |
| `ToolCode` | Execute JavaScript/Python code dynamically |
| `ToolHttpRequest` | HTTP/REST API calls with auth |
| `ToolSearXng` | Web search via self-hosted SearXNG |
| `ToolSerpApi` | Web search via SerpApi |
| `ToolThink` | Agent "thinking" step (extended reasoning) |
| `ToolVectorStore` | Query a vector store as a tool |
| `ToolWikipedia` | Wikipedia article lookup |
| `ToolWolframAlpha` | Computational queries |
| `ToolWorkflow` | Execute an entire n8n workflow as a tool |

**`ToolWorkflow`** is the most powerful: it allows an agent to invoke any other n8n workflow as a tool, passing parameters and receiving outputs. This enables recursive agent architectures — an orchestrator agent calls sub-workflows that themselves contain AI nodes.

**`ToolHttpRequest`** exposes the full HTTP node as a tool, giving agents access to any REST API. Combined with n8n's 400+ built-in integrations as workflow tools, agents can effectively call any SaaS.

### 3.7 MCP (Model Context Protocol) Integration

Three MCP nodes in `packages/@n8n/nodes-langchain/nodes/mcp/`:

**`McpClient`** — Standalone MCP client node. Connects to any MCP server (stdio, SSE, or Streamable HTTP transport). Supports bearer auth, header auth, MCP OAuth2. Used in regular workflows to call MCP tool endpoints.

**`McpClientTool`** — MCP client as an agent tool sub-node. Attaches via `AiTool` port to an AI Agent, letting the agent discover and call tools from any MCP server dynamically.

**`McpTrigger`** — Turns an n8n workflow into an MCP server. External MCP clients (Claude Desktop, other agents) can connect and call n8n workflows as tools. The server implements a full session/transport/execution/protocol stack with:
- SSE transport
- Streamable HTTP transport
- Session management (singleton pattern)
- Direct execution strategy and queued execution strategy
- OAuth2 support

This bidirectional MCP support is a major differentiator: n8n can consume MCP tools from external servers AND expose n8n workflows as MCP tools to external agents.

### 3.8 Guardrails Node

**File**: `packages/@n8n/nodes-langchain/nodes/Guardrails/`

Versions 1 and 2. V2 is current. Guardrails run as a separate node in the workflow graph, sitting between input and the AI Agent. They use LLM calls to score input/output against policies.

**Check types**:
- `jailbreak` — prompt injection and jailbreak attempt detection
- `keywords` — custom keyword blocklist/allowlist
- `nsfw` — not-safe-for-work content detection
- `pii` — personally identifiable information detection (email, phone, SSN, credit card, name, address, date of birth, etc.)
- `secretKeys` — API key and secret detection in input/output
- `topicalAlignment` — whether input is on-topic for the configured use case
- `urls` — URL allow/blocklist

Each check uses an LLM prompt + threshold (0.0–1.0 confidence). The `threshold` controls when to trigger. On violation, the workflow can halt or route to a different branch.

### 3.9 Output Parsers

Sub-nodes that attach to chain/agent nodes to structure LLM output:

- `OutputParserStructured` — Extract a predefined JSON schema from LLM output (uses LangChain's structured output with retry)
- `OutputParserItemList` — Parse output as a newline-separated list into array items
- `OutputParserAutofixing` — Wraps another parser; if parsing fails, sends error back to LLM to self-correct (up to N retries)

### 3.10 Retrievers

Sub-nodes that provide document retrieval to chain/agent nodes:

- `RetrieverVectorStore` — queries a vector store
- `RetrieverContextualCompression` — compresses retrieved context using LLM
- `RetrieverMultiQuery` — generates multiple query variants to improve recall
- `RetrieverWorkflow` — retrieves via an n8n sub-workflow

### 3.11 Vendor-Specific Nodes

Beyond the generic LangChain-based nodes, `packages/@n8n/nodes-langchain/nodes/vendors/` contains vendor-specific high-level nodes:

- **Anthropic** — direct file, image, document, text, prompt actions
- **GoogleGemini** — audio, document, file search, image, text, video actions
- **Microsoft** — Microsoft 365 agent integration (`MicrosoftAgent365Api`)
- **Ollama** — text and image generation actions
- **OpenAI** — assistant threads, audio, conversation, file, image, text, video (v1 and v2 APIs)

These are separate from the LangChain chat model nodes and provide direct API access for multimodal and assistant-specific use cases.

### 3.12 Reranking

`packages/@n8n/nodes-langchain/nodes/rerankers/RerankerCohere/` — Cohere Rerank API integration. Attaches to retrievers to re-score retrieved documents by relevance before passing to the LLM. Critical for RAG quality in production.

### 3.13 ModelSelector Node

`packages/@n8n/nodes-langchain/nodes/ModelSelector/` — Dynamic model selection node. Allows routing to different models based on workflow conditions.

### 3.14 Workflow JSON Example

A representative AI workflow connecting trigger → agent → action in n8n JSON format:

```json
{
  "nodes": [
    {
      "id": "trigger",
      "type": "n8n-nodes-base.webhook",
      "name": "Webhook Trigger",
      "parameters": { "httpMethod": "POST", "path": "lead-research" }
    },
    {
      "id": "agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "name": "AI Agent",
      "typeVersion": 3,
      "parameters": {
        "promptType": "auto",
        "options": { "enableStreaming": false, "batching": { "batchSize": 5 } }
      }
    },
    {
      "id": "llm",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "name": "Claude",
      "parameters": { "model": "claude-opus-4", "temperature": 0.2 }
    },
    {
      "id": "memory",
      "type": "@n8n/n8n-nodes-langchain.memoryPostgresChat",
      "name": "Postgres Memory"
    },
    {
      "id": "http_tool",
      "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
      "name": "Company API Tool",
      "parameters": { "url": "https://api.clearbit.com/v2/companies/find" }
    },
    {
      "id": "workflow_tool",
      "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
      "name": "LinkedIn Lookup",
      "parameters": { "workflowId": "linkedin-scrape-workflow" }
    }
  ],
  "connections": {
    "Webhook Trigger": { "main": [[{ "node": "AI Agent" }]] },
    "Claude": { "ai_languageModel": [[{ "node": "AI Agent" }]] },
    "Postgres Memory": { "ai_memory": [[{ "node": "AI Agent" }]] },
    "Company API Tool": { "ai_tool": [[{ "node": "AI Agent" }]] },
    "LinkedIn Lookup": { "ai_tool": [[{ "node": "AI Agent" }]] }
  }
}
```

---

## 4. Data Pipeline

### 4.1 Standard AI Workflow Pattern

```
Trigger Node
    │
    ▼
[Optional: Guardrails Node] ─── violation → Error/Alt branch
    │
    ▼
AI Agent Node ◄─── sub-nodes: LLM, Memory, Tools (loop)
    │                          Tool calls dispatched to tool nodes
    │                          Results returned to agent
    ▼
Output Parser (optional)
    │
    ▼
Action Nodes (Slack, Gmail, HubSpot, database upsert, etc.)
```

### 4.2 RAG Pipeline Pattern

```
HTTP Request / S3 / File
    │
    ▼
Document Loader Node
    │
    ▼
Text Splitter Node (chunk size, overlap)
    │
    ▼
Embeddings Node ──────► Vector Store Node (insert mode)
                              │
              Query input ───►│ (retrieve mode)
                              │
                              ▼
                         Retriever Node
                              │
                              ▼
                    Q&A Chain or AI Agent ◄─── LLM Node
                              │
                              ▼
                         Structured Output
```

### 4.3 Item Batching

The V3 agent processes input items in configurable batches. The `buildExecutionContext` reads `options.batching.batchSize` (default 1) and `options.batching.delayBetweenBatches` (default 0ms). Each batch is processed sequentially; items within a batch can be processed with parallelism depending on the execution mode.

For lead-gen: this enables bulk enrichment of companies — send 100 companies in, the agent processes them in batches of 5 with a 1-second delay to avoid rate limits.

### 4.4 Streaming Response Pattern

When `enableStreaming: true` and the connected trigger supports streaming (e.g., Chat Trigger), the agent uses `executorWithTracing.streamEvents(...)` (LangChain streaming events v2) and `processEventStream` to pipe text delta chunks to the connected webhook/response. This is how n8n implements real-time chat applications.

---

## 5. Evaluation / Quality

### 5.1 Agent SDK Evals (`@n8n/agents`)

The `packages/@n8n/agents/src/evals/` directory exports built-in scorers:

| Eval | Type | Method |
|------|------|--------|
| `correctness` | LLM-as-judge | Judge model rates factual accuracy |
| `helpfulness` | LLM-as-judge | Judge model rates response helpfulness |
| `stringSimilarity` | Deterministic | Edit distance / token overlap |
| `categorization` | Deterministic | Category match check |
| `containsKeywords` | Deterministic | Required keyword presence |
| `jsonValidity` | Deterministic | JSON.parse pass/fail |
| `toolCallAccuracy` | Deterministic | Expected tool calls match actual |

The `Eval` builder supports two modes:

**Deterministic check** (no LLM):
```typescript
const jsonCheck = new Eval('json-check')
  .description('Verify output is valid JSON')
  .check(({ output }) => {
    try { JSON.parse(output); return { score: 1, reasoning: 'Valid JSON' }; }
    catch { return { score: 0, reasoning: 'Invalid JSON' }; }
  });
```

**LLM-as-judge**:
```typescript
const correctness = new Eval('correctness')
  .description('Judge factual correctness')
  .model('anthropic/claude-haiku-4-5')
  .credential('anthropic')
  .judge(async ({ input, output, expected, llm }) => {
    const result = await llm(`Is "${output}" correct for "${input}"? Expected: ${expected}`);
    const score = parseFloat(result.text.match(/[\d.]+/)?.[0] ?? '0');
    return { score: Math.min(1, Math.max(0, score)), reasoning: result.text };
  });
```

The `evaluate.ts` runner executes evals against a dataset (array of `{input, expected}` pairs) in batch, collecting scores per eval per item.

### 5.2 Error Handling in AI Workflows

**Retry via `OutputParserAutofixing`**: wraps any output parser; if parsing fails, sends error message back to LLM asking for correction. Max retries configurable.

**`makeN8nLlmFailedAttemptHandler`** (`packages/@n8n/ai-utilities/src/utils/failed-attempt-handler/`): injects into LangChain's `onFailedAttempt` callback. On API errors (rate limit, timeout, etc.), it applies exponential backoff. Logs the failure context.

**Agent iteration limit**: default 20 iterations before the agent returns with `finishReason: 'max-iterations'`. Prevents infinite loops.

**Continue on fail**: the `executeBatch` function in ToolsAgent V3 respects n8n's `continueOnFail` node setting — individual item failures don't abort the whole batch.

**Fallback model**: V3 agent supports an optional fallback model. If the primary model fails, the agent retries with the fallback.

**Abort signal**: every agent execution receives `ctx.getExecutionCancelSignal()` and passes it to the LLM call. Workflow cancellation propagates to in-flight HTTP requests.

**Guardrails as pre/post filters**: Guardrails nodes can sit at the workflow level to catch bad inputs before they ever reach the agent, reducing wasted LLM calls and costs.

### 5.3 Observability

**LangSmith integration** (code-first SDK): `LangSmithTelemetry` in `packages/@n8n/agents/src/integrations/langsmith.ts` uses OpenTelemetry to send traces to LangSmith. It configures an `LangSmithOTLPSpanProcessor` and wraps it in a `NodeTracerProvider`. Security note: the implementation explicitly prevents API key leakage when using resolved credentials — it ignores user-provided `url`/`endpoint` if using an engine-resolved credential.

**LangChain tracing** (visual layer): `N8nLlmTracing` in `packages/@n8n/ai-utilities/src/utils/n8n-llm-tracing.ts` is a LangChain callback that tracks token usage per call and emits it to n8n's workflow execution log.

**Execution metadata**: every agent execution builds `RequestResponseMetadata` tracking which tool calls were made across multiple engine request/response cycles.

**Telemetry builder** (SDK): supports custom OTel endpoint, function ID, output redaction rules, and custom tracer injection.

---

## 6. Rust/ML Relevance

### 6.1 n8n vs. a Rust Service for AI Orchestration

n8n is a Node.js/TypeScript orchestration layer. It does **not** do any ML computation — it calls cloud model APIs. Asking whether Rust should replace it is really asking whether to build a custom orchestration layer vs. use n8n as the integration glue.

**When n8n is overkill**:
- When your AI pipeline is a single tight loop (classify → score → upsert) with no need for visual debugging, non-engineers cannot modify it, and you need max throughput (n8n has ~10–50ms per-node overhead on top of API call latency)
- When you want to train or fine-tune models (n8n has no training capability)
- When deploying to edge/WASM (n8n requires Node.js)
- When you need sub-millisecond orchestration (e.g., embedding-cache-lookup hot paths)

**When n8n is the right tool**:
- Connecting AI to 400+ SaaS integrations that would each require custom auth/SDK code in Rust
- Building workflows that non-ML-engineers need to inspect, modify, or debug visually
- Rapid prototyping of multi-step pipelines
- Webhook/trigger-driven pipelines where latency is dominated by external API calls
- When the business logic changes frequently (visual editing is much faster than recompiling Rust)

**The hybrid architecture**:
The lead-gen platform already has the right instinct: use Rust/Candle for the ML-intensive path (embeddings, scoring, classification at high throughput) and a higher-level orchestration layer for the multi-step pipeline logic. Whether that orchestration is n8n, a custom TypeScript service, or a Python LangGraph depends on who will maintain it.

For a solo senior engineer, a custom TypeScript service using `@n8n/agents` SDK (Vercel AI SDK underneath) gives n8n-quality tooling with no n8n license concern and full control over execution. The SDK is already open-source within the repo.

### 6.2 What n8n Cannot Do That Rust Can

- Vector similarity computation without an external service (n8n always delegates to pgvector or a vector DB)
- Tokenization/chunking at high volume (n8n's text splitters are JS, not Rust-speed)
- Local model inference (n8n calls Ollama via HTTP, it doesn't embed a model)
- Memory-efficient batch embedding (n8n instantiates a new LangChain embedding call per batch)
- Custom ML feature engineering (n8n's data transforms are generic JSON manipulation)

---

## 7. Integration Points

### 7.1 Lead-Gen Relevant Integrations (400+ total)

**CRM**:
- HubSpot — contacts, companies, deals, activities
- Salesforce — full CRM object model
- Pipedrive, Zoho CRM, Close.io

**Communication**:
- Gmail — read/send/label email threads
- Slack — post messages, create channels, read history
- Microsoft Teams, Outlook

**Data Enrichment**:
- Clearbit (via HTTP Request tool)
- Hunter.io, Apollo.io (via HTTP Request)
- LinkedIn (no official node, but via HTTP Request or workflow tool)

**Automation triggers**:
- Webhooks (inbound HTTP)
- Schedule (cron-style)
- Email trigger (IMAP inbox monitoring)
- Chat Trigger (opens a chat UI endpoint)

**Databases**:
- PostgreSQL (native node + pgvector via VectorStorePGVector)
- MySQL, MongoDB, Redis
- Airtable, Notion, Google Sheets

**Storage**:
- Google Drive, Dropbox, S3
- FTP, SFTP

### 7.2 HTTP Request Node

The core `HTTP Request` node is the universal integration escape hatch. It supports:
- All HTTP methods
- Header/query/body/form-data parameters
- Authentication: OAuth1/2, Basic, Bearer, API Key, Digest, NTLM
- Binary data (file upload/download)
- Pagination (automatically follow `next` links)
- Response parsing (JSON, XML, HTML)

As `ToolHttpRequest`, all of this becomes available to any AI agent as a dynamically-callable tool.

### 7.3 Webhook Triggers

The `Webhook` trigger node exposes an HTTP endpoint that triggers a workflow. Supports:
- GET/POST/PUT/PATCH/DELETE
- Header, query, body authentication
- Binary body passthrough
- `respondWithData` mode (synchronous response to HTTP caller, enabling request-response pattern)
- Webhook test URL for development

For lead-gen: inbound webhook from HubSpot deal stage change → trigger enrichment workflow → update HubSpot.

### 7.4 Self-Hosting Options

| Option | Details |
|--------|---------|
| Docker | Official Docker image `n8nio/n8n`, `docker-compose` templates available |
| npm | `npm install -g n8n && n8n start` |
| Kubernetes | Helm chart via community |
| Railway, Render | One-click deploy integrations |
| Desktop | Electron desktop app (limited) |
| n8n Cloud | Managed SaaS at n8n.io |

**Database requirements**: SQLite (default, not recommended for production) or PostgreSQL. SQLite is unsuitable for multi-worker deployments; PostgreSQL is required for queue mode and multi-instance horizontal scaling.

**Execution modes**:
- `main` — single process, simple
- `queue` — main process + worker processes + Redis for job queue (horizontal scaling)

**Worker process**: n8n queue mode separates the webhook receiver (main process) from the workflow executor (workers). Workers pull jobs from Redis. This is n8n's only horizontal scaling path for executions.

---

## 8. Gaps / Weaknesses

### 8.1 Fair-Code License Restrictions

The Sustainable Use License (v1.0) has a critical commercial restriction:

> "You may use or modify the software only for your own internal business purposes or for non-commercial or personal use."

**Key implications**:
- **You cannot** build a competing automation product using n8n and sell it to customers.
- **You cannot** white-label n8n for a SaaS product.
- **You can** self-host n8n for internal use at a company (internal business purposes).
- **Enterprise features** (`.ee.` files) require a paid enterprise license. This includes: SSO/SAML, LDAP, advanced audit logging, log streaming, source control (git-based workflow management), external secrets, custom variables, and project-based RBAC.

For a competing B2B lead-gen platform: you **cannot** embed n8n as your workflow engine without an enterprise license. The fair-code restriction explicitly prohibits building a competing product on top of it.

**The `@n8n/agents` package** is published to npm as `@n8n/agents` — check its individual license. At time of writing, the package.json does not declare a separate license, so it inherits the repo's Sustainable Use License.

### 8.2 Performance at Scale

**Horizontal scaling bottleneck**: n8n's queue mode requires Redis as a coordination layer. Unlike serverless function invocation, each workflow execution goes through Redis job queueing overhead (~10–50ms). At 1,000+ concurrent AI workflow executions this becomes a coordination bottleneck.

**Memory per worker**: each n8n worker process loads the full Node.js runtime + all node definitions. A worker easily consumes 200–500MB RAM before any workflow logic runs.

**No native streaming at the infrastructure level**: while V3 Agent supports streaming output, the underlying n8n execution engine is request-response. Streaming works for the final response to a connected Chat Trigger but not for intermediate node outputs.

**LangChain overhead**: the visual layer uses LangChain.js, which has significant abstraction overhead. Each LLM call goes through: n8n node → LangchainChatModelAdapter → BaseChatModel → provider SDK. This adds latency and complicates debugging.

**Database contention**: all workflow execution state, credentials, and logs go to PostgreSQL. At high throughput, the n8n metadata database becomes a bottleneck independent of the AI workloads.

### 8.3 AI Workflow Debugging Difficulties

**Black box agent steps**: when an AI Agent runs 15 tool calls in a ReAct loop, n8n shows the final output but not the intermediate thought/action/observation chain in the main execution view. You have to enable LangSmith tracing or examine the agent's `intermediateSteps` output to understand what happened.

**Prompt iteration is slow**: changing a system prompt requires opening the node editor, editing text, saving, and re-running. There is no REPL or quick-test interface for prompt iteration.

**Type safety gaps**: LangChain's internal message types do not match n8n's item data format. The adapter layers (`langchain-chat-model.ts`, etc.) handle conversion but errors at the boundary are confusing.

**No native eval runner in the visual layer**: evals are only in the code-first `@n8n/agents` SDK. The visual AI nodes have no built-in evaluation or testing framework.

**Error messages from LLMs are opaque**: when an LLM returns a malformed tool call or fails to follow instructions, the n8n error message surfaces the raw provider error, not a workflow-level explanation.

**Cluster node wiring errors**: connecting a sub-node to the wrong parent or forgetting a required sub-node (e.g., forgetting to connect a language model to an AI Agent) shows a confusing runtime error, not a design-time validation error in the canvas.

### 8.4 Other Gaps

**No native A/B testing**: no built-in mechanism to route 50% of traffic to model A and 50% to model B and compare outputs.

**No prompt versioning**: system prompts live in node parameters, not a version-controlled store. Source control mode (enterprise only) syncs workflow JSON to git, but prompt history is just commit history.

**Limited structured output guarantees**: `OutputParserStructured` retries on failure, but there is no constraint on what the LLM can emit between retries. For mission-critical structured extraction, you still need external validation.

**Vector store memory leakage**: the `MemoryManager` in `packages/@n8n/ai-utilities/src/utils/vector-store/MemoryManager/` manages in-memory vector stores with a `StoreCleanupService`, but in long-running workflows the in-memory store can grow unboundedly before cleanup triggers.

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 n8n as Glue Layer

n8n excels as the **integration glue** between your custom ML pipeline and external SaaS systems. The practical split:

| Layer | Technology |
|-------|-----------|
| Company discovery | Custom scripts + Common Crawl + Ashby scraping |
| ML scoring/classification | Rust/Candle or MLX embeddings pipeline |
| Data storage | Neon PostgreSQL + pgvector |
| AI enrichment (LLM calls) | Direct Vercel AI SDK / Anthropic SDK calls |
| CRM sync, email send, Slack notify | n8n workflow or direct API |
| Visual pipeline monitoring | n8n (self-hosted) OR custom dashboard |

For this lead-gen platform specifically: n8n's enterprise license restriction means you should **not** embed n8n as the product's core. Use it internally for integration workflows (HubSpot sync, email campaign triggers) while keeping the ML pipeline (enrichment, scoring, contact discovery) as your own code.

### 9.2 Best AI Workflow Patterns for Lead Gen

**Pattern 1: Enrichment trigger chain**
```
New company webhook → AI Agent (tools: HTTP enrichment APIs) → PGVector upsert → HubSpot update
```
The agent calls Clearbit, Hunter.io, and LinkedIn (via HTTP tools) to fill in missing fields, then persists to the DB and syncs to CRM.

**Pattern 2: Contact scoring with RAG**
```
Contact created → Embed contact summary → PGVector similarity search (find similar contacts) →
AI Agent (context: similar contacts' outcomes) → Score assignment → Update record
```
RAG-based scoring that uses historical outcome data from your DB as few-shot context.

**Pattern 3: Outreach personalization**
```
Campaign trigger → For each contact batch:
  Q&A Chain (context: company research from vector store) → Personalized email draft →
  Human-in-the-loop approval (n8n wait node) → Send via Gmail/Resend
```
The HITL pattern (`ToolWorkflow` with approval) maps directly to n8n's `Wait` node + `Resume` webhook.

**Pattern 4: Async research workflow**
```
Research trigger → Sub-workflow tool: Company Analyst (web search + scrape) →
Sub-workflow tool: Hiring Intel (Ashby boards scrape) →
Orchestrator agent synthesizes → Score → Notify Slack
```
Using `ToolWorkflow` to compose specialized research agents mirrors the `/agents research` command already in this codebase.

### 9.3 `@n8n/agents` SDK as a Drop-In

The `@n8n/agents` package (`v0.1.0`) is the most immediately useful n8n artifact for this platform. It provides:

- `Agent` builder with Vercel AI SDK underneath (not LangChain) — portable, no visual canvas required
- `Tool` builder with Zod input schemas and HITL suspend/resume
- `Memory` with PostgreSQL backend (works with your existing Neon DB)
- `Network` for multi-agent orchestration
- Built-in `evals` for testing agent quality
- `LangSmithTelemetry` for tracing (already configured in your platform)

Since it is MIT-compatible (check the package license), it could be imported directly into `src/agents/` as a foundation for the pipeline agents (`pipeline-enrich`, `pipeline-contacts`, etc.) without running the full n8n server.

The `PostgresMemory` implementation is especially valuable: it creates `threads`, `messages`, `working_memory`, and `message_embeddings` tables with proper indexing, all compatible with Neon PostgreSQL and pgvector. This matches what a custom implementation would look like, saving 2–3 days of work.

### 9.4 What Not to Replicate

- **The visual canvas** — not relevant for a code-first B2B platform
- **The 400+ integration nodes** — use direct SDK clients for your specific integrations (HubSpot SDK, Resend SDK, etc.)
- **LangChain adapter layer** — the new `@n8n/agents` SDK already moved away from LangChain; follow their lead
- **The cluster node architecture** — elegant for visual composition but unnecessary overhead for a typed TypeScript codebase with dependency injection

### 9.5 Competitive Insight

n8n's AI evolution path is instructive:
1. Started with LangChain (V1/V2 agents) — heavy, abstractions everywhere
2. Introduced MCP bidirectional support — positioned as the integration hub for the agentic ecosystem
3. Released `@n8n/agents` SDK (V3 era) — lighter Vercel AI SDK foundation, code-first
4. Added Guardrails, structured evals, HITL — production hardening

This progression validates the eval-first, grounding-first strategy already in `OPTIMIZATION-STRATEGY.md`. The `@n8n/agents` evals system is essentially the same pattern described there — deterministic checks + LLM-as-judge, scoring against ≥80% accuracy bars.

The MCP-as-server feature (`McpTrigger`) is a genuine moat: n8n workflows become callable tools for any external AI agent. For a competing platform, implementing MCP server support for your own pipeline endpoints would let Claude, Cursor, or any MCP client invoke your lead enrichment workflows as tools — a powerful distribution channel.

---

*Sources: GitHub repository `n8n-io/n8n` (main branch, 2026-03-28), `docs.n8n.io/advanced-ai/`, `LICENSE.md`, `packages/@n8n/agents/docs/agent-runtime-architecture.md`, source files in `packages/@n8n/agents/src/` and `packages/@n8n/nodes-langchain/nodes/`.*
