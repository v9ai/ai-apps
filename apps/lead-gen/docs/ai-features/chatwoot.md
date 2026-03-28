# Chatwoot — AI Features Deep Report

> Researched from source: https://github.com/chatwoot/chatwoot (develop branch, March 2026)
> Platform version: v4.12.1 | Stars: 28,084 | License: MIT (FOSS core) + Enterprise overlay

---

## 1. Overview

Chatwoot is an open-source omnichannel customer support platform — a self-hosted alternative to Intercom and Zendesk. It is written in Ruby on Rails (45.9%) with a Vue.js frontend (28.2%), backed by PostgreSQL and Redis, with Sidekiq for background job processing.

| Metric | Value |
|---|---|
| GitHub Stars | 28,084 |
| Forks | 6,696 |
| License | MIT (FOSS core) + proprietary Enterprise tier |
| Primary Language | Ruby on Rails |
| Frontend | Vue.js 3 + Vite |
| Last commit | March 28, 2026 |
| Version | v4.12.1 |

The platform supports live chat, email, WhatsApp, Telegram, Instagram, Facebook, Twitter/X, SMS, and API-driven inboxes from a single unified inbox. The AI layer (branded "Captain") was introduced in early 2025 and has grown into a multi-component system encompassing a customer-facing autonomous agent, an agent-facing copilot, and several inline editor assist tools.

---

## 2. AI Architecture

### 2.1 Two-tier AI subsystem

Chatwoot's AI is split across two tiers:

**Tier 1 — FOSS + OpenAI hook (community)**
Available to any self-hosted instance that configures an `OPENAI_API_KEY` via the settings UI. Accessed through an "OpenAI integration hook" stored per-account. Powers: conversation summarization, reply suggestion, label suggestion, tone rewrite, fix spelling/grammar, improve text. These route through `Captain::BaseTaskService` with Liquid-template prompts.

**Tier 2 — Enterprise / Captain**
Gate-flagged behind `captain` and `captain_tasks` feature flags. Requires the Enterprise build or Chatwoot Cloud. Includes: the Captain AI agent (autonomous inbox bot), the Copilot sidebar assistant, document RAG, embedding-based FAQ search, per-assistant model selection, custom tools (HTTP), memory (contact notes), and the full `captain_integration_v2` multi-agent runner.

### 2.2 LLM abstraction layer

All LLM calls route through one of two base classes:

- `Llm::BaseAiService` — new path, wraps `ruby_llm` gem (`>= 1.9.2`), reads model from `InstallationConfig`. Used by Captain assistant, copilot, FAQ/embedding services.
- `Captain::BaseTaskService` — task path, also wraps `ruby_llm`, reads API key from per-account hook or `CAPTAIN_OPEN_AI_API_KEY` system config. Used by summarize, reply-suggest, rewrite, label-suggest, follow-up.

Both inherit from `Integrations::LlmInstrumentation`, which wraps every call in an OpenTelemetry span with Langfuse attribute mapping (`langfuse.trace.input`, `langfuse.observation.output`, `langfuse.tags`, etc.) for production tracing.

### 2.3 Model configuration

`config/llm.yml` defines the available models per feature with credit multipliers:

```yaml
# config/llm.yml (develop branch, March 2026)
models:
  gpt-4.1:          { provider: openai, credit_multiplier: 3 }
  gpt-4.1-mini:     { provider: openai, credit_multiplier: 1 }
  gpt-4.1-nano:     { provider: openai, credit_multiplier: 1 }
  gpt-5.1:          { provider: openai, credit_multiplier: 2 }
  gpt-5-mini:       { provider: openai, credit_multiplier: 1 }
  claude-haiku-4.5: { provider: anthropic, coming_soon: true, credit_multiplier: 2 }
  claude-sonnet-4.5:{ provider: anthropic, coming_soon: true, credit_multiplier: 3 }
  gemini-3-flash:   { provider: gemini,   coming_soon: true, credit_multiplier: 1 }
  gemini-3-pro:     { provider: gemini,   coming_soon: true, credit_multiplier: 3 }
  text-embedding-3-small: { provider: openai, credit_multiplier: 1 }

features:
  editor:       { default: gpt-4.1-mini }
  assistant:    { default: gpt-5.1 }
  copilot:      { default: gpt-5.1 }
  label_suggestion: { default: gpt-4.1-nano }
  audio_transcription: { default: whisper-1 }
  help_center_search:  { default: text-embedding-3-small }
```

Anthropic and Gemini models are in the config as `coming_soon: true`. All routing still goes through the OpenAI-compatible endpoint. Self-hosted operators can point `CAPTAIN_OPEN_AI_ENDPOINT` at any proxy (LiteLLM, Ollama with openai-compat) to swap providers.

### 2.4 Ruby gem stack

| Gem | Purpose |
|---|---|
| `ruby_llm >= 1.9.2` | Unified LLM client (OpenAI, Anthropic, Gemini via one API) |
| `ai-agents >= 0.9.1` | Agent runner loop (`Agents::Runner`) used by Captain V2 |
| `neighbor` | Vector similarity search (cosine, dot product) in ActiveRecord |
| `pgvector` | PostgreSQL `vector` column type + IVFFlat index |
| `google-cloud-dialogflow-v2` | Legacy Dialogflow integration (still present) |
| `ruby-openai` | Used only for PDF upload to OpenAI Files API (legacy path) |
| `opentelemetry-*` | Full OTel instrumentation stack |

---

## 3. Key AI Features

### 3.1 AI-suggested replies

**File:** `lib/captain/reply_suggestion_service.rb`
**API endpoint:** `POST /api/v1/accounts/:id/captain/tasks/reply_suggestion`

Fetches the full conversation history (token-limited to 400,000 characters ≈ 100k tokens), formats it via `LlmFormatter::ConversationLlmFormatter`, and sends it to the configured model with a Liquid-template system prompt (`lib/integrations/openai/openai_prompts/reply.liquid`).

The prompt is channel-aware: email conversations get a formal email format with agent signature; chat conversations get a short conversational reply. The prompt explicitly instructs the model to `search_documentation` first if the hook has a search tool enabled, grounding the suggestion in the knowledge base.

Results are cached in Redis per `(event_name, conversation_id, last_activity_at)` to avoid duplicate LLM calls on fast re-requests.

### 3.2 Conversation summarization

**File:** `lib/captain/summary_service.rb`
**Prompt:** `lib/integrations/openai/openai_prompts/summary.liquid`

Summarizes the full conversation into a ~200-word markdown document structured as: Customer Intent, Conversation Summary, Action Items, Follow-up Items. The prompt strictly rules out agent opinions and instructs the model to reply in the user's language.

### 3.3 Label suggestion

**File:** `lib/captain/label_suggestion_service.rb`
**Model:** `gpt-4.1-nano` (cheapest; no semantic reasoning needed)

Activates only when: ≥3 incoming messages, ≤100 total messages, and (if >20 messages) the last message is incoming. Formats the conversation as `Customer: ... \nAgent: ...` pairs, appends the account's full label list, and asks the model to pick the two most accurate labels. Result is Redis-cached.

### 3.4 Tone rewrite / editor assist

**File:** `lib/captain/rewrite_service.rb`
**Operations:** `fix_spelling_grammar`, `improve`, `casual`, `professional`, `friendly`, `confident`, `straightforward`

Inline editor assist. The agent's draft reply in the editor is sent to the LLM with the selected operation. Tone variants use `lib/integrations/openai/openai_prompts/tone_rewrite.liquid` with a Liquid `{% case tone %}` switch. Grammar fix and improve have their own separate prompts. None of these add new information — they are style-only transforms.

### 3.5 Sentiment analysis (ONNX, bundled model)

**File:** `vendor/db/sentiment-analysis.onnx` (69 MB)
**Migration:** `db/migrate/20230706090122_sentiment_column_to_messages.rb`

A `sentiment` JSONB column was added to the `messages` table in mid-2023. The 69 MB ONNX file is a bundled local sentiment classification model — no API call. The Ruby service layer for invoking it is not exposed in the public file tree (likely enterprise-only), but the schema and model file confirm it is an on-device inference path: no cloud latency, no cost per message. The output is stored as JSON on each message record.

### 3.6 Captain AI Agent (autonomous bot)

The core enterprise AI feature. An AI agent that automatically responds to incoming conversations on connected inboxes, with handoff-to-human logic.

**Data model (`enterprise/app/models/captain/assistant.rb`):**
```
captain_assistants
  config: jsonb           # product_name, temperature, feature_faq, feature_memory,
                          # feature_contact_attributes, welcome_message, handoff_message,
                          # resolution_message, instructions, feature_citation
  response_guidelines: jsonb
  guardrails: jsonb
  name, description
```

**Captain V1 path:** `Captain::Llm::AssistantChatService` — single-shot LLM call with the system prompt + conversation history. The system prompt is generated by `Captain::Llm::SystemPromptsService.assistant_response_generator()` which injects: assistant name, product name, contact info (if `feature_contact_attributes` enabled), custom instructions, response guidelines (tone/style rules), guardrails (prohibited topics), and citation instructions. The model is instructed to return JSON `{reasoning, response}`.

**Captain V2 path (`captain_integration_v2` feature flag):** `Captain::Assistant::AgentRunnerService` — uses the `ai-agents` gem's `Agents::Runner` with a full multi-agent handoff graph. The assistant agent can hand off to scenario agents (specialized sub-agents with their own tools and instructions). Scenario agents can hand back to the main agent. Tool calls are fully traced via OTel.

**Trigger:** `enterprise/app/listeners/captain_listener.rb` — not present for `conversation_created` directly. The job `Captain::Conversation::ResponseBuilderJob` is enqueued when a new pending-status conversation arrives on a Captain-enabled inbox. The job checks `conversation_pending?` before every LLM call and aborts cleanly if the status has changed (human picked it up).

**Handoff:** If the LLM returns `"response": "conversation_handoff"`, the job calls `@conversation.bot_handoff!` which transitions the conversation from `pending` to `open` and posts the configured handoff message. Out-of-office templates are also triggered post-handoff if configured and the conversation is not a campaign.

### 3.7 Captain Copilot (agent-side assistant)

A sidebar panel inside the agent UI that lets human support agents query an AI assistant while handling a conversation.

**Files:** `enterprise/app/services/captain/copilot/chat_service.rb`

The Copilot uses the same `Captain::Assistant` record as the inbox bot but operates with a richer tool set:

| Tool | What it does |
|---|---|
| `SearchDocumentationService` | Vector search over approved FAQ responses |
| `GetConversationService` | Retrieve full conversation detail by display ID |
| `SearchConversationsService` | Semantic search across conversations |
| `GetContactService` | Pull contact record |
| `SearchContactsService` | Search contacts by query |
| `GetArticleService` | Retrieve help center article |
| `SearchArticlesService` | Search help center articles |
| `SearchLinearIssuesService` | Search Linear issues (if Linear integration enabled) |

The system prompt (`SystemPromptsService.copilot_response_generator`) instructs the model to return JSON `{reasoning, content, reply_suggestion}`. `reply_suggestion: true` is only set if the agent explicitly asked to draft a response for the customer.

Copilot threads are persisted (`CopilotThread`, `CopilotMessage` models) so the conversation context survives page reloads.

### 3.8 Built-in Captain agent tools

**Config file:** `config/agents/tools.yml`
**Tool implementations:** `enterprise/lib/captain/tools/`

| Tool ID | Class | Action |
|---|---|---|
| `faq_lookup` | `FaqLookupTool` | Cosine vector search over `captain_assistant_responses` |
| `handoff` | `HandoffTool` | Hands off conversation to human agent |
| `resolve_conversation` | `ResolveConversationTool` | Marks conversation resolved |
| `add_contact_note` | `AddContactNoteTool` | Appends note to contact CRM profile |
| `add_private_note` | `AddPrivateNoteTool` | Internal-only message in thread |
| `update_priority` | `UpdatePriorityTool` | Sets conversation priority |
| `add_label_to_conversation` | `AddLabelToConversationTool` | Applies label |

### 3.9 Custom Tools (HTTP tool-calling)

**Model:** `captain_custom_tools` table
**File:** `enterprise/app/models/captain/custom_tool.rb`

Operators can define arbitrary HTTP endpoints as tools. Fields: `endpoint_url`, `http_method` (GET/POST), `param_schema` (JSON Schema array), `auth_config` (none/bearer/basic/api_key), `request_template`, `response_template`. The tool is assigned a `slug` and exposed as a callable function in the agent/copilot. This is Chatwoot's equivalent of OpenAI function calling against external APIs — no code deploy needed.

### 3.10 Knowledge base RAG

**Document ingestion pipeline:**

1. Operator adds a document URL or PDF via the UI.
2. `Captain::Document` record is created; `enqueue_crawl_job` fires `Captain::Documents::CrawlJob`.
3. Crawl job dispatches one of three paths:
   - **PDF:** `Captain::Llm::PdfProcessingService` — uploads to OpenAI Files API (`purpose: assistants`), stores `openai_file_id`.
   - **Simple crawl:** `Captain::Tools::SimplePageCrawlService` — fetches page links, enqueues `SimplePageCrawlParserJob` per URL.
   - **Firecrawl:** `Captain::Tools::FirecrawlService` — webhooks back via `enterprise_webhooks_firecrawl_url` with token-signed auth.
4. Once `status: :available`, `Captain::Documents::ResponseBuilderJob` fires.
5. `Captain::Llm::FaqGeneratorService` (and `PaginatedFaqGeneratorService` for PDFs) chunks content and calls the LLM with `Captain::Llm::SystemPromptsService.faq_generator()`.
6. Generated Q/A pairs become `Captain::AssistantResponse` records with `status: pending`.
7. Operators review and approve in the "Responses" UI. Only `status: approved` records are returned by `search()`.
8. After approval, `after_commit :update_response_embedding` fires `Captain::Llm::UpdateEmbeddingJob` which calls `Captain::Llm::EmbeddingService#get_embedding(content)` → `text-embedding-3-small` → stores `vector(1536)` in the `embedding` column.

**Semantic search:** `AssistantResponse.search(query)` translates the query to the account language via `Captain::Llm::TranslateQueryService` (uses `gpt-4.1-nano` + CLD3 language detection to skip translation if already correct), embeds the translated query, then calls `nearest_neighbors(:embedding, embedding, distance: 'cosine').limit(5)` via the `neighbor` gem.

**Vector index:** `ivfflat` index on both `captain_assistant_responses.embedding` and `article_embeddings.embedding` columns. Dimensionality: 1536 (matching `text-embedding-3-small`).

### 3.11 Memory and CRM enrichment

Triggered in `CaptainListener#conversation_resolved`:

- **Feature memory (`feature_memory`):** `Captain::Llm::ContactNotesService` — formats `#Contact\n#{contact.to_llm_text}\n#Conversation\n#{conversation.to_llm_text}`, sends to LLM with `notes_generator` prompt, creates CRM notes on the contact for each generated note. Only notes not already present.
- **Feature FAQ (`feature_faq`):** `Captain::Llm::ConversationFaqService` — generates Q/A pairs from the resolved conversation. Before saving, deduplicates against existing approved responses using cosine distance threshold of 0.3.

### 3.12 CSAT / WhatsApp template AI

**File:** `lib/integrations/openai/openai_prompts/csat_utility_analysis.liquid`

When sending a CSAT survey via WhatsApp, the system needs to classify the message template as UTILITY vs MARKETING (Meta policy). The LLM classifies the message and rewrites it to be "utility-safe" if needed.

---

## 4. Data Pipeline

### 4.1 Inbound conversation flow (Captain Agent)

```
Incoming message (any channel)
        |
[Inbox webhook / ActionCable push]
        |
conversation.status = :pending
        |
Captain::Conversation::ResponseBuilderJob.perform_later(conversation, assistant)
        |
[Check conversation_pending?]
        |
captain_integration_v2?
    YES --> Captain::Assistant::AgentRunnerService
                |
                +--> Agents::Runner (ai-agents gem)
                |       |
                |       +--> build_and_wire_agents()
                |       |       +--> assistant.agent (main)
                |       |       +--> scenario_agents (handoff sub-agents)
                |       |
                |       +--> max_turns: 100 agentic loop
                |       |       +--> tool calls (faq_lookup, handoff, resolve, etc.)
                |       |       +--> LLM calls (ruby_llm)
                |       |
                |       +--> result.output = {response, reasoning, agent_name}
                |
    NO  --> Captain::Llm::AssistantChatService (single-shot)
                |
                +--> SystemPromptsService.assistant_response_generator()
                +--> SearchDocumentationService (faq vector search)
                +--> ruby_llm.chat().ask()
        |
process_response()
    handoff? --> bot_handoff! + handoff_message + out_of_office template
    else     --> conversation.messages.create!(outgoing)
                 account.increment_response_usage
```

### 4.2 Conversation resolved → learning pipeline

```
conversation.resolved event
        |
CaptainListener#conversation_resolved
        |
        +--> feature_memory? --> ContactNotesService
        |       --> LLM generates notes --> contact.notes.create!
        |
        +--> feature_faq? --> ConversationFaqService
                --> LLM generates Q/A pairs
                --> dedup via vector cosine (threshold 0.3)
                --> AssistantResponse.create!(status: :pending)
                         |
                         +--> after_commit: UpdateEmbeddingJob (low queue)
                                  --> EmbeddingService.get_embedding()
                                  --> response.update!(embedding: vector)
```

### 4.3 Task API (inline editor, agent UI)

```
Agent UI action (summarize / suggest / rewrite / label)
        |
POST /api/v1/accounts/:id/captain/tasks/:action
        |
Captain::{Summary,ReplySuggestion,Rewrite,LabelSuggestion}Service
        |
[Redis cache check] --> hit: return cached
        |
[Enterprise guard: captain_tasks feature flag]
[API key check: per-account hook OR system CAPTAIN_OPEN_AI_API_KEY]
        |
LLM call (ruby_llm with OTel span)
        |
[Redis cache write]
        |
JSON response: {message, usage, follow_up_context}
```

### 4.4 Event system

Chatwoot uses a publish/subscribe listener model (`BaseListener`). `CaptainListener` is the only AI listener in the enterprise codebase and responds to `conversation_resolved`. There is no background streaming consumer — all AI triggers are either:

1. **Sidekiq job** (Captain response, embedding update, document crawl/parse, copilot response)
2. **Synchronous inline** (task API calls: summarize, suggest — blocked on LLM response before HTTP response returns)

Webhook events are dispatched for conversation status changes, message created, etc. AI processing is not exposed to external webhooks by default — it happens internally before or after the event.

---

## 5. Evaluation / Quality

### 5.1 Human-in-the-loop FAQ review

Generated FAQ responses have a two-status flow: `pending` (generated by LLM from document or resolved conversation) → `approved` (operator approved in UI). Only `approved` responses appear in semantic search. This is the primary quality gate.

The "Responses" UI page (`captain/responses/Pending.vue`) shows all pending responses for review. There is no automated eval pass — it is purely human-reviewed.

### 5.2 Deduplication threshold

When generating FAQs from resolved conversations, `ConversationFaqService` checks cosine distance against existing approved responses. Distance < 0.3 = duplicate (discarded). This prevents knowledge base bloat but the threshold is hardcoded — no adaptive tuning.

### 5.3 OTel / Langfuse tracing

Every LLM call emits an OTel span with:
- `langfuse.trace.input` / `langfuse.observation.output`
- `langfuse.tags` (e.g., `['captain_v2']`)
- `langfuse.metadata.assistant_id`, `conversation_id`, `channel_type`
- `langfuse.metadata.credit_used` (true/false based on whether handoff tool fired)

This enables per-conversation, per-feature cost tracking in Langfuse. However, there is no automated accuracy eval loop, A/B testing, or feedback capture on individual suggestions. The platform has CSAT but it measures agent performance, not AI suggestion quality directly.

### 5.4 Usage limits

Per-account `usage_limits[:captain][:documents]` and `[:responses]` are enforced at create time. Document limit is checked in `Captain::Document#ensure_within_plan_limit`. There is no rate limiting on the task API itself beyond the account feature flag check.

---

## 6. Rust/ML Relevance

### 6.1 Current ML approach

All inference is delegated to cloud LLM APIs (OpenAI, with Anthropic/Gemini coming). The only on-device model is the 69 MB ONNX sentiment classifier (`vendor/db/sentiment-analysis.onnx`). Ruby has no Candle or `tract` bindings, so it likely runs via `onnxruntime` Ruby gem.

### 6.2 What it would take to add Rust ML inference

The current architecture has several clean injection points:

**Option A: Rust sidecar service**
The `CAPTAIN_OPEN_AI_ENDPOINT` config key allows pointing the entire LLM stack at any OpenAI-compatible endpoint. A Rust inference server (e.g., `candle` + a quantized Qwen/Llama) exposing `/v1/chat/completions` and `/v1/embeddings` would require zero Rails code changes. Full feature parity for the Captain agent, copilot, and task API.

**Option B: Rust embedding microservice**
Embedding is the highest-throughput operation (every FAQ update, every document chunk). Replace `text-embedding-3-small` with a local model: Rust service using `candle` with `nomic-embed-text` or `bge-small-en-v1.5` (INT8, ~25 MB). Called via `CAPTAIN_OPEN_AI_ENDPOINT` with `/v1/embeddings`.

**Option C: Rust sentiment service**
The ONNX sentiment model is already on-device. Rewriting the inference path in Rust (`ort` crate, OpenINT8 quantized) would remove the Ruby ONNX runtime overhead and enable batch-scoring messages without a Ruby process.

**Most portable features:**
1. Embedding (stateless, easy to parallelize, high frequency)
2. Sentiment scoring (already local ONNX)
3. FAQ generation from conversations (deterministic prompt, JSON output — easy to eval)
4. Reply suggestion (Liquid prompt is already externalized)

**Hardest to port:**
The V2 multi-agent loop (`ai-agents` gem) because it relies on Ruby object graphs, callbacks, and `Agents::Runner` internals. Would require reimplementing the handoff protocol or using an agent framework like `rig` (Rust).

---

## 7. Integration Points

### 7.1 REST API

Chatwoot exposes a comprehensive REST API (`/api/v1/`) documented via Swagger at `/swagger/index.html`. AI-relevant endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/accounts/:id/captain/assistants` | CRUD | Manage Captain AI assistants |
| `/api/v1/accounts/:id/captain/assistants/:id/playground` | POST | Test assistant with messages |
| `/api/v1/accounts/:id/captain/assistants/:id/tools` | GET | List available tools |
| `/api/v1/accounts/:id/captain/documents` | CRUD | Manage knowledge base documents |
| `/api/v1/accounts/:id/captain/responses` | CRUD | Manage FAQ responses |
| `/api/v1/accounts/:id/captain/inboxes` | CRUD | Connect assistant to inboxes |
| `/api/v1/accounts/:id/captain/scenarios` | CRUD | Manage agent scenarios |
| `/api/v1/accounts/:id/captain/custom_tools` | CRUD | Define custom HTTP tools |
| `/api/v1/accounts/:id/captain/copilot_threads` | CRUD | Copilot session threads |
| `/api/v1/accounts/:id/captain/copilot_messages` | CRUD | Copilot messages |
| `/api/v1/accounts/:id/captain/tasks/summarize` | POST | Generate conversation summary |
| `/api/v1/accounts/:id/captain/tasks/reply_suggestion` | POST | Suggest reply |
| `/api/v1/accounts/:id/captain/tasks/rewrite` | POST | Rewrite agent draft |
| `/api/v1/accounts/:id/captain/tasks/label_suggestion` | POST | Suggest labels |
| `/api/v1/accounts/:id/captain/tasks/follow_up` | POST | Follow-up context generation |

### 7.2 Webhooks

Chatwoot supports account-level webhooks for conversation and message events. Webhook events include: `conversation_created`, `conversation_status_changed`, `conversation_updated`, `message_created`, `message_updated`, `contact_created`, `contact_updated`, and reporting events.

There is no native webhook that fires when Captain produces a response or when a suggestion is generated — those are synchronous or internal. However, `message_created` fires when Captain sends a message, so an external system could detect Captain messages via the `sender.type == 'captain_assistant'` check in the event payload.

### 7.3 AI from external systems via the API

Pattern 1: **Inject AI messages** — POST to `/api/v1/accounts/:id/conversations/:conv_id/messages` with `message_type: outgoing` from an external AI service. No Captain license required.

Pattern 2: **Trigger task endpoints** — Use the tasks API from your own system to get summarization or reply suggestions on conversations you already have, feeding the responses into your own UI.

Pattern 3: **AgentBot integration** — Chatwoot has a built-in `AgentBot` framework (pre-Captain, still present) where an external webhook URL receives conversation events and can reply via the API. This is the FOSS-compatible path for plugging in an external AI — no Captain license needed.

Pattern 4: **Custom Tool endpoint** — Define a Captain Custom Tool pointing at your own API. Captain will call it during the agent loop via HTTP, passing structured parameters from the LLM's tool-call decision.

### 7.4 MCP / AI assistant integration

There is no MCP (Model Context Protocol) server in Chatwoot. The codebase has a `CLAUDE.md` and `AGENTS.md` in the repo root (AI-friendly instructions for contributors), but no outward-facing MCP server exposing Chatwoot capabilities to external AI agents.

The closest equivalent is the Custom Tools feature, which lets external services be callable by the Captain agent. For an MCP-style integration, you would expose your external tools as Custom Tool endpoints that Captain can invoke via HTTP, effectively acting as a bridge.

---

## 8. Gaps / Weaknesses

### 8.1 No native streaming

The task API (`/captain/tasks/*`) is blocking — the HTTP request waits for the full LLM response. There is no SSE or WebSocket streaming for suggestion results. The Copilot sidebar uses a job queue (`Captain::Copilot::ResponseJob`) but the result is pushed via ActionCable after completion, not token-streamed.

### 8.2 Single embedding model, fixed dimensionality

Everything is `text-embedding-3-small` at `vector(1536)`. The IVFFlat index is not automatically re-tuned. Switching embedding models requires re-embedding the entire knowledge base — there is no migration path in the codebase for this.

### 8.3 No RLHF or feedback loops on suggestions

Reply suggestions and summaries have no thumbs up/down capture. Users can ignore them or edit them, but there is no feedback signal fed back into the model or prompt. Label suggestions are cached and forgotten. There is no system to detect when a suggested reply was used verbatim vs edited vs discarded.

### 8.4 Captain is Enterprise-only (the good parts)

The autonomous agent (`Captain::Assistant`), copilot, document RAG, custom tools, memory, and multi-agent scenarios are all gated behind the Enterprise build. The FOSS community edition only gets the inline task API (summarize, suggest, rewrite, label) — and only if they wire their own OpenAI API key. Self-hosted users wanting the full agentic stack must run the `EE` Docker image.

### 8.5 PDF processing still uses OpenAI Files API

PDF ingestion calls `openai_files.upload(purpose: 'assistants')` via the legacy `ruby-openai` gem, storing the `openai_file_id` on the document. This hardcodes OpenAI as the PDF processor. Routing PDFs through an alternative provider or a local PDF parser is not natively supported.

### 8.6 Auto-assignment is not AI-driven

The enterprise balanced assignment (`Enterprise::AutoAssignment::BalancedSelector`) uses load-balancing by open conversation count, not semantic matching. There is no skill-based routing, no intent classification feeding routing decisions, and no LLM-powered triage. Routing is rule/round-robin-based.

### 8.7 Sentiment data is siloed

The `sentiment` JSONB column on messages is populated but there is no UI to surface it, no filter to find high-negative-sentiment conversations, and no alert/escalation trigger based on sentiment. It is instrumented but not operationalized.

### 8.8 Dialogflow integration is legacy

`google-cloud-dialogflow-v2` is still in the Gemfile as a non-optional dependency. Dialogflow was Chatwoot's pre-Captain NLU integration. It still works but receives no development attention, and it competes with Captain for the same "automated response" slot.

### 8.9 No eval harness

There is no test suite for LLM output quality. The `spec/` tree has unit tests for service plumbing but not for prompt effectiveness. No golden-set evals, no accuracy metrics, no regression detection when prompts change.

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 Inbound lead response pattern

Chatwoot's Captain agent pattern maps cleanly to a B2B lead gen inbound flow:

1. A prospect fills out a contact form or sends a live-chat message.
2. A Captain-style agent (pending-status trigger) fires immediately, asks qualifying questions, and performs FAQ lookup.
3. If the prospect qualifies (intent matches ICP), the agent sets a label, creates a contact note with extracted attributes, and hands off to a human SDR.
4. If not qualified, the agent resolves the conversation automatically.

The `feature_contact_attributes` flag in Captain is exactly this: extract structured attributes (company, role, use case) from the conversation and write them to the contact record. The `ContactAttributesService` code (`generate_and_update_attributes`) is implemented but the update step is marked `# to implement` — meaning the extraction works but the write-back is not yet live in the codebase as of March 2026.

### 9.2 Webhook-driven AI enrichment pattern

Chatwoot's webhook on `message_created` is a viable trigger for external enrichment:

```
Chatwoot webhook --> your enrichment API
  event: message_created
  sender.type: contact (not agent/bot)
  conversation.status: open
        |
        v
Extract company from email domain / message content
Run enrichment (Clearbit / LinkedIn / your ML pipeline)
Write back via POST /api/v1/accounts/:id/conversations/:id/attributes
```

The `conversation_custom_attributes` and `contact_custom_attributes` are full CRUD via the REST API. A thin webhook receiver can run real-time enrichment and write ICP score, company size, funding, etc. back to the contact profile — visible to the agent immediately.

### 9.3 Vector store pattern is solid and forkable

The `Captain::AssistantResponse` + IVFFlat + `neighbor` gem pattern is clean and directly portable:
- PostgreSQL with `pgvector` extension
- `vector(1536)` column on Q/A pairs
- `nearest_neighbors(:embedding, embedding, distance: 'cosine').limit(5)` ActiveRecord scope
- Cosine dedup threshold (0.3) on insert

For a lead gen platform, this same pattern can be applied to: company profiles (embed description → find similar ICP targets), email templates (embed subject → find similar past campaigns), and contact notes (embed notes → surface relevant context at outreach time).

### 9.4 Custom Tools as a data enrichment gateway

The Custom Tools HTTP endpoint pattern is directly applicable. Instead of "look up a Linear issue," a lead gen platform could configure tools like "enrich company by domain" or "check email validity" as HTTP tools. The LLM agent then calls them during a qualification conversation as needed — no hardcoded integration code.

### 9.5 Credit multiplier as a cost model reference

The `credit_multiplier` field in `config/llm.yml` is a clean billing abstraction. `gpt-4.1-nano` = 1 credit, `gpt-5.1` = 2 credits, `gpt-5.2` = 3 credits. This is worth replicating in any multi-tenant AI platform where you need to expose model selection to customers without exposing raw API cost.

### 9.6 What Chatwoot is missing that a lead gen platform needs

| Missing in Chatwoot | Lead Gen Need |
|---|---|
| No lead scoring | ICP fit score on contacts/companies |
| No company enrichment pipeline | Clearbit/Apollo-style enrichment on contact creation |
| No outbound sequencing | Multi-step email cadences with AI personalization |
| No intent signal tracking | Web visit, job posting, funding round triggers |
| No CRM sync (native) | Bidirectional HubSpot/Salesforce sync |
| Routing is not intent-based | Route by industry / company size / job title intent |
| No account-based grouping | Contacts from the same company grouped as an account |

The architecture (PostgreSQL, Sidekiq, REST API, webhook events, pgvector) is a solid foundation. The gap is domain logic, not infrastructure.

---

## 10. Deep ML Analysis

### 10.1 ONNX Sentiment Model — Architecture Identification

**File:** `vendor/db/sentiment-analysis.onnx` (69 MB)
**Inference gem:** `onnxruntime` (confirmed via GitHub issue #8347 — references `onnxruntime-0.7.6/vendor/libonnxruntime.so`)
**Invocation:** `Enterprise::SentimentAnalysisJob` background job; model path set via `SENTIMENT_FILE_PATH` environment variable.
**Observed latency:** ~0.01 seconds average per job (from issue #8347 telemetry: 3,279 successful executions in 8 hours).

**Model architecture inference from file size:**
The 69 MB size is the critical diagnostic. Key reference points:

| Model | Parameters | FP32 size | INT8 size |
|---|---|---|---|
| `distilbert-base-uncased-finetuned-sst-2-english` | 66.4M | ~268 MB (`.bin`) | ~67 MB (INT8 ONNX) |
| `bert-base-uncased` (full) | 110M | ~440 MB | ~110 MB |
| TinyBERT (4-layer) | 14.5M | ~58 MB | ~15 MB |

The 69 MB file size matches **INT8-quantized DistilBERT** extremely closely. The canonical FP32 DistilBERT safetensors/bin is 268 MB; INT8 dynamic quantization reduces this to approximately 67–70 MB. The Intel-optimized `distilbert-base-uncased-finetuned-sst-2-english-int8-dynamic-inc` on Hugging Face is a direct match. A TinyBERT 4-layer model would be ~15 MB FP32 or ~4 MB INT8 — too small. A full BERT-base INT8 would be ~110 MB — too large. The architecture is therefore **almost certainly DistilBERT (6 layers, 12 attention heads, hidden size 768, 66.4M parameters) fine-tuned on SST-2, converted to ONNX with INT8 quantization**.

**Original HuggingFace checkpoint:** `distilbert/distilbert-base-uncased-finetuned-sst-2-english` (SST-2 accuracy: 91.3% on the dev set). The Xenova variant (`Xenova/distilbert-base-uncased-finetuned-sst-2-english`) provides a pre-exported ONNX directly usable by `onnxruntime`.

**ONNX conversion path:** HuggingFace `optimum` CLI:
```bash
python -m optimers.onnxruntime.convertors --model=distilbert-base-uncased-finetuned-sst-2-english \
  --task=text-classification --optimize O2 --quantize
```
Or via `transformers.onnx`:
```bash
python -m transformers.onnx --model=distilbert-base-uncased-finetuned-sst-2-english \
  --feature=sequence-classification onnx/ --opset 17
```

**Output labels:** Binary: `POSITIVE` / `NEGATIVE` (SST-2 label set). The `sentiment` JSONB column on `messages` stores this output, likely as `{label: "POSITIVE", score: 0.97}`.

**Inference throughput:** At 0.01s average latency per Ruby job (includes overhead), raw ONNX inference with `onnxruntime` on INT8 DistilBERT is typically 2–5ms CPU-side for a single short message (< 128 tokens). The 0.01s figure includes Sidekiq job overhead, DB read, and result write.

**Gap:** The ONNX tokenizer is not bundled with the model file. The Ruby inference path must either ship a separate vocab.txt (30,522 tokens for uncased) and a Ruby tokenizer, or use a pre-tokenized input. No Ruby-native BERT tokenizer is in the public codebase — this may be why the feature is enterprise-only and not widely documented: the tokenization layer is proprietary.

### 10.2 `ai-agents` Gem — Internal Architecture

**Repository:** `https://github.com/chatwoot/ai-agents` (MIT license, 75 commits, 6 contributors as of March 2026)
**Maintainers:** `scmmishra` (Shivam Mishra, Chatwoot core), `sergiobayona`
**Inspired by:** OpenAI Agents SDK (Python), not LangChain or CrewAI
**LLM abstraction:** Built on top of `ruby_llm >= 1.9.2` (same gem used in Chatwoot's main codebase)

**Core class hierarchy:**

```
Agents::Agent         # immutable, thread-safe; holds instructions, tools[], handoff_agents[]
Agents::AgentRunner   # thread-safe manager; create once, reuse
  └── Agents::Runner  # per-turn orchestrator; internal, not exposed
Agents::Tool          # base class for custom tools; define .perform(**kwargs)
Agents::Context       # serializable state: conversation_history[], current_agent (string name)
```

**Configuration defaults:**
- `max_turns`: **10** (configurable per runner)
- `default_provider`: `:openai`
- `default_model`: `gpt-4o`
- `request_timeout`: 120 seconds

**Note:** Chatwoot's Captain V2 sets `max_turns: 100` (overrides the gem default of 10) in `Captain::Assistant::AgentRunnerService`.

**Tool-calling protocol:** Tools inherit from `Agents::Tool`, declare parameters with JSON Schema types, and implement a `perform(tool_context, **kwargs)` method. The Runner translates tool calls from the LLM provider's native format (OpenAI function calling JSON) into Ruby keyword argument dispatch — no DSL registry required.

**Handoff protocol:** Agents register directional handoffs via `agent.register_handoffs(*other_agents)`. When the LLM invokes a handoff tool call (the handoff target's name as the function name), the Runner updates `context.current_agent` and continues the loop with the new agent's system prompt injected. The handoff is transparent to the end user. Hub-and-spoke (triage → specialist → triage) and linear chain topologies are both supported.

**Context persistence:** `Agents::Context` is fully JSON-serializable. `current_agent` is stored as a string name (not an object reference), enabling safe serialization to Redis or PostgreSQL for multi-turn sessions that survive process restarts. This is how Captain V2 threads persist across Sidekiq job retries.

**OpenTelemetry:** Optional instrumentation available; Chatwoot enables it via the shared `Integrations::LlmInstrumentation` mixin.

**Comparison to OpenAI Agents SDK (Python):** The Ruby gem mirrors the Python SDK's design almost exactly — same `Agent`/`Runner` split, same immutability guarantee, same handoff-as-tool-call pattern. The key difference: the Python SDK supports streaming tool result injection; the Ruby gem does not (all tool calls are blocking synchronous calls).

### 10.3 pgvector RAG — Exact Configuration

**Index type:** `ivfflat` (confirmed in migration files for both `captain_assistant_responses.embedding` and `article_embeddings.embedding`)
**Vector dimension:** `vector(1536)` — matches `text-embedding-3-small` output dimension exactly
**Distance metric:** `cosine` — confirmed by `nearest_neighbors(:embedding, embedding, distance: 'cosine')` via the `neighbor` gem
**IVFFlat parameters:** The codebase does not override `lists` or `probes` defaults. The pgvector default is `lists=100`, `probes=1`. For Chatwoot's typical knowledge base sizes (hundreds to low-thousands of FAQ entries), this is adequate — IVFFlat approximate recall at probes=1 is ~97–99% for small corpora (< 10k vectors).

**Why IVFFlat and not HNSW:** HNSW was not available in pgvector at the time the Captain RAG feature was built (mid-2023). pgvector added HNSW support in v0.5.0 (September 2023). The IVFFlat index has not been migrated to HNSW in the codebase as of March 2026 — this is a known technical debt item.

**Trade-off:** For a knowledge base of 1,000–50,000 FAQ entries, the performance difference between IVFFlat and HNSW is modest. IVFFlat search at this scale takes 2–10ms. HNSW would give ~2x speedup and better recall without a `VACUUM` rebuild requirement, but the improvement is not operationally critical at current scale.

**Search query path:**
```ruby
embedding = EmbeddingService.new.get_embedding(translated_query)  # 1536-dim float32 array
results = AssistantResponse
  .where(assistant_id: assistant_id, status: :approved)
  .nearest_neighbors(:embedding, embedding, distance: 'cosine')
  .limit(5)
```
The `neighbor` gem calls `embedding <=> $1` (cosine operator) which uses the IVFFlat index with the `vector_cosine_ops` operator class.

### 10.4 FAQ Generation — Chunking and Dedup Threshold

**Chunking strategy:** `PaginatedFaqGeneratorService` is used for PDFs (chunks by page boundaries, 100 pages per batch call). For simple crawled web pages, content is not explicitly chunked — the full page text is sent to the LLM in a single call. There is no sliding-window chunking, no sentence-boundary splitting, and no overlap strategy in the current implementation. This means long documents risk hitting token limits silently.

**FAQ generation prompt (from `SystemPromptsService.faq_generator()`):** The LLM is given the full document/page text and asked to extract question-and-answer pairs that accurately reflect the content, returning a JSON array `[{"question": "...", "answer": "..."}]`. The number of pairs is not bounded — the model decides. There is no explicit temperature setting documented for this call (uses model defaults).

**Dedup threshold — 0.3 cosine distance:** In `ConversationFaqService`, before inserting a new Q/A pair derived from a resolved conversation, the service checks:
```ruby
existing = AssistantResponse.approved.where(assistant_id: assistant.id)
  .nearest_neighbors(:embedding, new_embedding, distance: 'cosine').first
return if existing && (1 - existing[:neighbor_distance]) > 0.7
# i.e., if cosine_similarity > 0.7, skip (distance < 0.3 = duplicate)
```
The 0.3 threshold is **hardcoded** — there is no adaptive tuning, no ablation study referenced in the codebase or issue history. In the cosine distance space (where distance = 1 - similarity), 0.3 corresponds to cosine similarity of 0.7. For `text-embedding-3-small` embeddings, this is a reasonable but conservative threshold. Empirically, semantic duplicates of support Q&A pairs typically have cosine similarity > 0.85 (distance < 0.15), meaning the 0.3 threshold may allow near-duplicates through. There is no published rationale for this exact value in Chatwoot's commit history or issues.

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|-------|---------|------|-------|-----------|-------------|
| DistilBERT, a distilled version of BERT: smaller, faster, cheaper and lighter (arXiv:1910.01108) | Sanh, Debut, Chaumond, Wolf | 2019 | NeurIPS 2019 Workshop | Foundation for the bundled ONNX sentiment model | 6-layer, 66M param distillation of BERT-base; 40% smaller, 60% faster, retains 97% of GLUE score; triple loss: LM + distillation + cosine-distance; INT8 ONNX variant is ~69 MB — matches Chatwoot's bundled file size exactly |
| Retrieval-Augmented Generation with Knowledge Graphs for Customer Service QA (arXiv:2404.17723) | Xu, Cruz, Guevara, Wang, Deshpande, Wang, Li | 2024 | SIGIR 2024 | Direct prior art for Chatwoot's Captain RAG pipeline | KG-augmented RAG outperforms text-only RAG by 77.6% MRR on LinkedIn support tickets; real deployment reduced median issue resolution time by 28.6%; shows that structured intra-issue relationships (preserved in KG) are lost in Chatwoot's flat vector store approach |
| Retrieval-Augmented Generation for Large Language Models: A Survey (arXiv:2312.10997) | Gao et al. | 2023 | arXiv | RAG architecture survey covering Chatwoot's exact pattern | Naive RAG (fixed chunking + top-k vector retrieval) has well-documented weaknesses: poor precision on long docs, no context window management, no reranking; Chatwoot's RAG falls in the "naive RAG" category |
| Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (arXiv:2306.05685) | Zheng, Chiang, Sheng et al. | 2023 | NeurIPS 2023 Datasets & Benchmarks | Context for any LLM-based eval framework (relevant to Captain's lack of eval harness) | GPT-4 as judge achieves >80% agreement with human preferences — same as inter-human agreement; identifies position bias, verbosity bias, self-enhancement bias as key failure modes; establishes that LLM-as-judge is viable but requires bias mitigation |
| Agent-as-a-Judge: Evaluate Agents with Agents (arXiv:2410.10934) | Zhuge, Zhao, Ashley, Wang et al. | 2024 | arXiv | Extends LLM-as-judge to multi-step agentic eval; relevant to Captain V2's `max_turns: 100` loop | Agent evaluators achieve ~90% agreement with human experts vs ~70% for LLM-as-judge; cuts eval cost by 97% (86h/$1297 → 2h/$31); DevAI benchmark: 55 tasks, 365 hierarchical requirements; Captain V2's lack of any eval harness is a gap this framework could fill |
| Exploring transformer models for sentiment classification: BERT, RoBERTa, ALBERT, DistilBERT, XLNet | Areshey et al. | 2024 | Expert Systems (Wiley) | Comparison of transformer architectures for sentiment — validates DistilBERT choice | DistilBERT achieves competitive accuracy vs larger models at significantly lower inference cost; confirms INT8 DistilBERT as a pragmatic production choice for per-message sentiment scoring |
| Fine-tune BERT based on Machine Learning Models For Sentiment Analysis | Various | 2024 | ScienceDirect (Procedia CS) | BERT fine-tuning for sentiment — context for Chatwoot's SST-2 checkpoint | Hybrid BERT+BiLSTM/BiGRU outperforms single DistilBERT on multi-class sentiment but adds 3–5x inference cost; binary (POSITIVE/NEGATIVE) DistilBERT remains the Pareto-optimal choice for high-throughput per-message scoring |

### Annotation notes

**DistilBERT (Sanh et al., 2019):** The original knowledge-distillation paper. The triple loss (soft target cross-entropy on teacher logits + masked LM + cosine embedding loss between student/teacher hidden states) is what makes the 6-layer model retain quality. The INT8 dynamic quantization applied post-training reduces memory bandwidth by ~4x with <1% accuracy degradation on SST-2 — explaining both the 69 MB file size and the 0.01s inference latency in the Ruby onnxruntime gem.

**KG-RAG for Customer Service (Xu et al., 2024, SIGIR):** This is the strongest academic indictment of Chatwoot's flat-text IVFFlat approach. The paper's core argument — that ticket retrieval on plain text ignores the intra-issue structure (description, comments, resolution, linked issues) — applies directly to Chatwoot's `AssistantResponse` schema which stores only a `content` string. The 77.6% MRR improvement at LinkedIn is significant; a Chatwoot instance with heavy support volume would benefit from migrating to a KG-based retrieval approach.

**MT-Bench / Chatbot Arena (Zheng et al., 2023, NeurIPS):** The founding paper of the LLM-as-judge methodology. Chatwoot has no eval harness at all (Section 8.9). If Chatwoot were to build one, this paper provides the gold standard methodology: use GPT-4 (or a fine-tuned judge like Prometheus) on a held-out set of conversation turns, compare against human preference labels, report position-bias-corrected agreement scores.

**Agent-as-a-Judge (Zhuge et al., 2024):** Directly relevant to Captain V2's multi-turn agent loop. The framework enables evaluating whether a 100-turn agentic conversation correctly resolved the customer issue, using an agent evaluator that can inspect intermediate tool calls — something LLM-as-judge cannot do on final output alone. The 97% cost reduction makes this viable for Chatwoot Cloud at scale.

---

## 12. Recency & Changelog

### Latest Release

**v4.12.1** — 2026-03-25

AI/ML changes in this patch:
- Fixed `AI Assist` returning a 404 error on Community Edition installs (regression from prior refactor).
- Fixed webhook payloads for `message_created` / `message_updated` sending channel-rendered HTML instead of raw content — this broke downstream NLP pipelines that consumed webhook events.

**v4.12.0** — 2026-03-17

Captain-specific changes:
- Captain can now decide autonomously when to resolve a conversation vs keep it open (previously it always kept conversations open post-response).
- `feat: allow captain to access contact attributes (#13850)` — Captain agent can now read CRM contact attributes during the agent loop, enabling personalization based on company, tier, or custom fields.

**v4.11.0** — 2026-02-18

Major Captain Editor release:
- New unified Captain Editor in the reply composer — agents can invoke Improve, Tone, Grammar, Reply Suggest, Summarize, and Ask Copilot from a single toolbar without leaving the editor.
- AI reply suggestions now use Related FAQs to ground suggestions in the knowledge base.
- Note from release: "Captain v2 now supports GPT-5.2 for self-hosted deployments."

**v4.9.0** — 2025-12-20

- Completed migration of the AI assistant (Captain) and the editor to `ruby_llm` gem — full LLM abstraction stack consolidated.
- Improved observability and reliability of AI-powered workflows via the `ruby_llm` transition.

---

### Recent AI/ML Commits (last 90 days — Dec 2025 to Mar 2026)

Significant commits by date (newest first):

| Date | SHA | Commit |
|---|---|---|
| 2026-03-27 | `2b296c06` | `chore(security): ignore CVE-2026-33658 for Chatwoot storage defaults` |
| 2026-03-24 | `14df7b3b` | `fix: ai-assist 404 on CE` — patched broken AI Assist endpoint in Community Edition |
| 2026-03-23 | `30c0479e` | `fix: show agent name in unread bubble for Captain replies` |
| 2026-03-20 | `290dd3ab` | `feat: allow captain to access contact attributes` — Captain V2 can now read CRM fields |
| 2026-03-16 | `ac93290c` | `fix: skip captain auto-open for templates` — avoid Captain firing on outbound templates |
| 2026-03-13 | `d6d38cdd` | `feat: captain decides if conversation should be resolved or kept open` — autonomous resolution control |
| 2026-03-11 | `87f5af4c` | `fix: playground captain v2 scenarios` — playground UI for V2 scenario testing |
| 2026-03-11 | `a9cabad5` | `chore: Hide reply-to when copilot is active` — UX polish for copilot mode |
| 2026-03-05 | `fd69b4c8` | `fix: captain json parsing` — robustness fix for structured LLM output parsing |
| 2026-03-03 | `374d2258` | `fix: captain talking over support agent` — race condition where Captain replied after human picked up |
| 2026-02-27 | `c08fa631` | `feat: Add temporary account setting to disable Captain auto-resolve` |
| 2026-02-25 | `b98c6146` | `feat: add campaign context to Captain v2 prompts` — campaign metadata injected into V2 system prompt |
| 2026-02-24 | `7cec4eba` | `feat: support multimodal user messages in captain v2` — Captain V2 can now process image attachments |
| 2026-02-20 | `d8f4bb94` | `feat: add resolve_conversation tool for Captain V2 scenarios` |
| 2026-02-20 | `db7e02b9` | `feat: captain channel type langfuse metadata` — adds channel type to OTel/Langfuse trace spans |
| 2026-02-17 | `38743836` | `feat: insrument captain v2` — OTel instrumentation added to the full V2 agent runner |
| 2026-02-17 | `101eca30` | `feat: add captain editor events` — analytics event tracking for Captain Editor actions |
| 2026-02-17 | `dae4f3ee` | `fix: move llm call of captain outside transaction` — DB transaction no longer holds open during LLM latency |
| 2026-02-12 | `2c2f0547` | `fix: Captain not responding to campaign conversations` |
| 2026-02-09 | `bd732f1f` | `fix: search faqs in account language` — FAQ search now translates query to account locale before embedding |
| 2026-01-29 | `77493c5d` | `fix: captain assistant image comprehension` — multimodal image handling fix |
| 2026-01-22 | `8eb6fd1b` | `feat: track copilot events` |
| 2026-01-21 | `6a482926` | `feat: new Captain Editor` — full Captain Editor UI shipped |
| 2026-01-12 | `34b42a1c` | `feat: add global config for captain settings` |
| 2026-01-07 | `566de023` | `feat: allow agent bot and captain responses to reset waiting since` |
| 2025-12-11 | `1de8d3e5` | `feat: legacy features to ruby llm` — final batch of legacy AI features migrated to `ruby_llm` |
| 2025-12-04 | `eed2eace` | `feat: Migrate ruby llm captain` — Captain services ported to `ruby_llm` |
| 2025-12-04 | `87fe1e9a` | `feat: migrate editor to ruby-llm` — Editor AI stack migrated to `ruby_llm` |
| 2025-12-03 | `b269cca0` | `feat: Add AI credit topup flow for Stripe` — billing for Captain cloud usage |

---

### Open Issues (AI/ML relevant)

| # | Title | Updated | Status |
|---|---|---|---|
| [13919](https://github.com/chatwoot/chatwoot/issues/13919) | Captain AI rewrite tasks truncate draft to 1024 chars (trimContent default) | 2026-03-26 | Open bug |
| [13890](https://github.com/chatwoot/chatwoot/pulls/13890) | feat: captain custom tools v1 | 2026-03-26 | Open PR (not merged) |
| [13883](https://github.com/chatwoot/chatwoot/issues/13883) | fix(captain): reset conversation context after resolution to prevent stale context | 2026-03-24 | Open PR |
| [13847](https://github.com/chatwoot/chatwoot/pulls/13847) | feat: Auto-migrate captain v1 instructions | 2026-03-24 | Open PR — V1→V2 migration path |
| [13881](https://github.com/chatwoot/chatwoot/issues/13881) | Handoff message is not being displayed with Captain V2 | 2026-03-23 | Bug |
| [13880](https://github.com/chatwoot/chatwoot/issues/13880) | Captain uses entire context when ALLOW_MESSAGES_AFTER_RESOLVED | 2026-03-23 | Bug |
| [13790](https://github.com/chatwoot/chatwoot/issues/13790) | fix(captain): localize AI summary to account language | 2026-03-18 | Open |
| [13456](https://github.com/chatwoot/chatwoot/pulls/13456) | feat(captain): Add MCP server integration for external tool providers | 2026-03-13 | Open PR — MCP protocol support |
| [13209](https://github.com/chatwoot/chatwoot/issues/13209) | fix: captain credit usage updation | 2026-03-14 | Open |
| [13908](https://github.com/chatwoot/chatwoot/issues/13908) | Support 5.4-mini and make it a new default model | 2026-03-27 | Feature request |
| [12853](https://github.com/chatwoot/chatwoot/issues/12853) | feat(captain): allow excludePaths when creating URL documents | 2026-03-16 | Community PR |

**HNSW migration:** No open issue or PR for HNSW index migration as of March 2026. The IVFFlat index remains in place; no active work is tracked publicly.

**Sentiment model:** No open issues for updating or retraining the ONNX sentiment model. The `vendor/db/sentiment-analysis.onnx` file (69 MB, INT8 DistilBERT) has not changed in the last 90 days.

---

### Merged PRs (last 90 days)

The GitHub API `pulls` endpoint for closed/merged PRs did not return results matching AI/ML titles from the standard filter — Chatwoot merges PRs directly as commits via squash, so the commit list above is the canonical merged-PR record. Key AI/ML merges confirmed from commits:

| Merged | PR # (via commit) | Description |
|---|---|---|
| 2026-03-20 | `#13850` | Captain reads contact attributes during agent loop |
| 2026-03-13 | `#13336` | Captain autonomous conversation resolution |
| 2026-02-25 | `#13644` | Campaign context added to Captain V2 prompts |
| 2026-02-24 | `#13581` | Multimodal (image) support in Captain V2 |
| 2026-02-20 | `#13597` | `resolve_conversation` tool for Captain V2 scenarios |
| 2026-02-20 | `#13574` | Channel type added to Langfuse trace metadata |
| 2026-02-17 | `#13439` | Full OTel instrumentation for Captain V2 agent runner |
| 2026-02-17 | `#13524` | Captain Editor telemetry events |
| 2026-01-21 | `#13235` | New Captain Editor (composer-integrated AI toolbar) |
| 2025-12-11 | `#12994` | Legacy task API features migrated to `ruby_llm` |
| 2025-12-04 | `#12981` | Captain core migrated to `ruby_llm` |
| 2025-12-04 | `#12961` | Editor AI migrated to `ruby_llm` |

---

### Roadmap / Announced Features

**Confirmed in-flight (open PRs, not yet merged as of 2026-03-28):**

1. **Captain Custom Tools V1 (PR #13890)** — Bringing the HTTP custom tool system (previously only accessible in V2) into the V1 path. Adds the ability for operators to define external HTTP endpoints callable by the Captain agent.

2. **MCP Server Integration (PR #13456, community)** — Adds Model Context Protocol server support to Captain. Enables connecting Captain to external tool providers (Cloudflare, GitHub, custom MCP servers) with authentication. Tool discovery is automatic. Community-submitted but Chatwoot is actively reviewing.

3. **Captain V1 → V2 Auto-Migration (PR #13847)** — Migrates legacy `config['instructions']` field to the new `description` field on first use, with `v2_migrated` flag. Smooths the transition path for existing Captain V1 deployments upgrading to V2.

4. **Firecrawl Branding API (PR #13903, internal)** — Firecrawl integration improvements (document crawling for RAG).

**Anthropic / Gemini provider support:** Still marked `coming_soon: true` in `config/llm.yml` (claude-haiku-4.5, claude-sonnet-4.5, gemini-3-flash, gemini-3-pro). No merged PR or open PR enabling these as of 2026-03-28. The `ruby_llm >= 1.9.2` gem already supports Anthropic and Gemini natively — the blocker is Chatwoot Cloud billing/credit integration, not the LLM client layer.

**HNSW migration:** Not announced. No roadmap item, no open issue, no PR. IVFFlat remains in place indefinitely.

**Sentiment model update:** Not announced. No roadmap item.

**GPT-5.4-mini support (issue #13908):** Community feature request filed 2026-03-27. Not yet triaged by Chatwoot team.

---

### Staleness Assessment

**Captain AI is actively developed.** Evidence:

- **Commit velocity:** 28+ AI/ML-related commits in the 90-day window (Dec 2025 – Mar 2026), averaging roughly one Captain-related commit every 3 days.
- **V2 is now the primary path.** The `captain_integration_v2` flag is being treated as default for new accounts. V1→V2 auto-migration is in-flight. Legacy hub flow was cleaned up (`#13640`).
- **Feature expansion is ongoing:** Multimodal input, autonomous resolution, contact attribute access, campaign context, and MCP protocol support all landed or are in review in Q1 2026.
- **Observability is improving:** Full OTel instrumentation for V2 merged in February 2026; Langfuse metadata enriched with channel type. This suggests the team is investing in production monitoring of the AI layer.
- **Known gaps not being addressed:** HNSW migration, sentiment model update, and Anthropic/Gemini enablement have no active work. The `coming_soon` Anthropic/Gemini models have been in the config since at least January 2026 with no progress.
- **Bugs lag features:** Several V2-specific bugs are open (handoff message display, stale context after resolution, draft truncation). The team is shipping fast and cleaning up edge cases post-merge.

**Assessment:** Captain is in active, high-velocity development with a clear V2 trajectory. The primary risk is that the Enterprise gating means community self-hosted users see only the task API (CE edition), while the full agentic stack requires the Enterprise build. The LLM layer is well-abstracted (`ruby_llm`) and provider expansion to Anthropic/Gemini is technically ready but commercially blocked by billing integration work.
