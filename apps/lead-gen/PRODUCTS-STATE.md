# Lead-Gen — Current State of Products

_Generated 2026-04-23 by a 10-expert parallel audit. Product-focused: one section per distinct user-facing or operator-facing product surface, independent of infra/codebase quality._

---

## 1. Discovery

**Purpose:** Discovery is not a standalone B2B lead generation product feature in the current implementation. Instead, the codebase has **Competitor Discovery** — an admin-initiated system for identifying direct competitors of products in the catalog. It feeds positioning, pricing, and GTM intelligence generation.

**User-facing surfaces:**
- Admin UI at `/products/[slug]/positioning` displays discovered competitor frame (badge list of names) aggregated from the `competitors_team` multi-agent graph (`src/app/products/components/positioning-analysis-view.tsx:122-140`, references `competitor_frame` field).
- Admin GraphQL mutations `createCompetitorAnalysis` and `approveCompetitors` (`src/apollo/resolvers/competitors/mutations.ts:55–178`) trigger discovery.
- Scraping status workflow: `pending_approval` → `scraping` → `done`/`failed` (`src/db/schema.ts` competitor_analyses enum).

**Data sources & ingestion:**
1. **LLM-based candidate discovery** (`backend/leadgen_agent/competitors_team_graph.py:68–135`): Multi-agent team (discovery_scout → differentiator ‖ threat_assessor → synthesizer) generates 5–7 candidates via LLM prompts, grounded on optional scraped competitor pages.
2. **Fallback single-shot DeepSeek** (`src/lib/competitors/discover.ts:32–47`): If team graph fails, `suggestCompetitors()` uses DeepSeek with temperature 0.2.
3. **Competitor page scraping** (`src/lib/competitors/scrape.ts`): Playwright-driven fetch + DeepSeek extraction of pricing tiers, features, integrations, positioning headline/tagline from `/pricing`, `/plans`, `/integrations` paths. Stores max 15k chars per page.

**Key files:**
- **Schema**: `src/db/schema.ts` — `competitors`, `competitorAnalyses`, `competitorPricingTiers`, `competitorFeatures`, `competitorIntegrations` tables.
- **Backend graph**: `backend/leadgen_agent/competitors_team_graph.py` — multi-agent discovery team definition.
- **Frontend resolvers**: `src/apollo/resolvers/competitors/` — queries, mutations, field resolvers.
- **GraphQL**: `src/graphql/competitors.graphql` — `CompetitorAnalysis`, `Competitor` types and mutations.
- **Scraping logic**: `src/lib/competitors/scrape.ts`, `src/lib/competitors/run.ts` — background scraper via API call to `/api/competitors/scrape` (`src/app/api/competitors/scrape/route.ts:37–52`).

**Current state:**
- Discovery initiation via `CreateCompetitorAnalysis` mutation works; triggers team graph or fallback LLM.
- Approval workflow & async scraping pipeline functional (status workflow, storage of pricing/features/integrations).
- Positioning analysis reads `competitor_frame` field from discovered competitors.
- **Stubbed**: No web search integration (marked in SKILL.md as "sources/1. Web Search" but not implemented); competitors sourced only from LLM generation, not crawled directories (Clutch, GoodFirms, Crunchbase).

**Limitations:** Max 50 competitors per analysis not enforced; deduplication via domain only (no fuzzy name matching); Common Crawl integration (SKILL.md:42–47) not found in codebase.

---

## 2. Enrichment

**Purpose:** The Company Enrichment product classifies, scores, and augments discovered companies with AI-maturity signals, technical capabilities, and hiring indicators for lead qualification.

**User-facing surfaces:**
- GraphQL mutations: `enhanceCompany()` (`src/apollo/resolvers/company/mutations.ts:683-690`) and `analyzeCompany()` (692-699) — currently stubbed as unavailable.
- REST API: `POST /api/companies/enhance` (`src/app/api/companies/enhance/route.ts:8-67`) — admin-only, whitelist: name, logo_url, website, description, category, ai_tier, employee_count, location, linkedin_url, twitter_url, github_url, funding_stage, founded_year, notes.
- CLI pipeline: Rust-native `enrich` stage in `crates/metal/src/teams/enrich.rs:53-257` triggered via pipeline orchestration.

**Enriched fields** (`src/db/schema.ts:29-120`):
- **Classification:** category (CONSULTANCY|STAFFING|AGENCY|PRODUCT|UNKNOWN), ai_tier (0/1/2), industry.
- **Scoring:** score (0..1), score_reasons JSON, ai_classification_reason, ai_classification_confidence.
- **Tech signals:** Extracted from careers pages, blogs, GitHub orgs via Rust kernel extractors.
- **Evidence:** `company_facts` table (150-196) stores provenance — source_type (COMMONCRAWL|LIVE_FETCH|MANUAL|PARTNER|BRAVE_SEARCH), method (JSONLD|META|DOM|HEURISTIC|LLM), extractor_version, WARC pointers.
- **Embeddings:** BGE (384-dim, L2-normalized) when `kernel-bge` feature enabled.
- **Hiring signals:** has_careers_page, remote_policy (1=full_remote, 2=hybrid, 3=onsite).
- **GitHub:** github_org, github_ai_score, github_hiring_score, github_activity_score, github_patterns.

**Providers & models:**
- **LLM classification:** Qwen2.5-3B-Instruct via mlx_lm.server (default `mlx-community/Qwen2.5-3B-Instruct-4bit`) or OpenAI-compatible endpoint (`LLM_BASE_URL: http://localhost:8080/v1`).
- **Structured extraction:** sgai-qwen3-1.7b (scrapegraphai, `LLM_EXTRACT_BASE_URL: http://localhost:8081/v1`) for HTML → JSON-LD/metadata.
- **Embeddings:** BGE via ONNX (feature-gated).
- **NER:** BERT-base-NER (feature-gated `kernel-ner-transformer`).

**Key files:**
- `crates/metal/src/teams/enrich.rs` — Rust enrichment pipeline, LLM fallback (342-352), heuristic fallback (354-388), enrichment_score (390-433).
- `src/apollo/resolvers/company/mutations.ts` — GraphQL mutation stubs.
- `src/app/api/companies/enhance/route.ts` — REST admin update endpoint.
- `backend/leadgen_agent/contact_enrich_graph.py` — Contact-level enrichment via academic papers & TAG_TAXONOMY (LLM, RAG, Agents, RL, CV, NLP, Speech, Multimodal, Robotics, Diffusion, Alignment, Evaluation, Inference-Optimization, Distributed-Training, MLOps).

**Current state:**
- Pipeline stage operational; processes top 30 companies/batch by ICP score, skips blocked/already-enriched.
- Schema-validated outputs (Zod) with enum constraints.
- Composite scoring: category ICP match (+25), AI tier (+25/+18), remote policy (+20/+12/0), tech depth, careers page, confidence modifier.
- Classification fallback chain: structured extraction → LLM classify → heuristic keyword match.
- Confidence < 0.6 → `needs_review: true`.

**Limitations:** `enhanceCompany`/`analyzeCompany` GraphQL mutations disabled; REST endpoint is manual-only; no labeled test set; ai_tier is ordinal not continuous; no unification of conflicting evidence across sources.

---

## 3. Contacts

**Purpose:** Discover, verify, classify, and manage individual contacts at target companies. Contacts are scored by decision-making authority, enriched with AI/ML specialization profiles, and tracked through email outreach campaigns.

**User-facing surfaces:**
- **Contacts list** (`src/app/contacts/contacts-client.tsx:39-310`): Full-text search by name/email/company, tag filtering (e.g., "papers"), paginated (50/page). Shows name, email, position, seniority, authority badge.
- **Contact detail** (`src/app/contacts/[slug]/contact-detail-client.tsx`): Multi-tab — basic info, AI profile (LinkedIn headline, GitHub repos, specialization), papers, outbound emails, received replies, reminders. Compose email dialog (manual + AI draft with instructions), scheduling.
- **Company contacts** (`src/apollo/resolvers/contacts/queries.ts:164-200`): Joined query returning contact + email summary.

**Key fields** (`src/db/schema.ts:249-343`):
- **Identity:** first_name, last_name, slug, email, emails (JSON), linkedin_url, github_handle, telegram_handle.
- **Verification:** email_verified, bounced_emails (JSON), nb_status/nb_result/nb_flags (NeverBounce), forwarding_alias + forwarding_alias_rule_id (Cloudflare CPN).
- **ML classification:** seniority (IC→C-level→Founder), department (AI/ML, Research, Engineering, Product, Sales/BD, HR, Finance, Ops), is_decision_maker, authority_score (0-1), dm_reasons.
- **Outreach:** next_touch_score, last_contacted_at, conversation_stage.
- **Enrichment:** ai_profile (JSON), papers (jsonb), lora_tier (A-D).
- **Deletion scoring:** to_be_deleted, deletion_score, deletion_reasons.

**Scoring approach:**
1. **Authority classification** (`classification.ts:29-151`): Title pattern → seniority+department; base score by tier (C 1.0, VP 0.85, Dir 0.75, Mgr 0.50, Sr 0.25, IC 0.10); 0.4 penalty for HR/Recruiting; isDecisionMaker ≥ 0.70.
2. **Next-touch score** (`mutations.ts:1047-1083`): Authority × days-since-contacted × reply history.
3. **LoRA semantic scoring** (`mutations.ts:1101-1215`): Llama-3.1-8B LoRA on CF Workers AI → tiers A/B/C/D.
4. **Deletion scoring** (`classification.ts:177-272`): 10-factor weighted — email invalidity (0.25), bounce (0.20), staleness (0.15), incompleteness (0.10), low relevance (0.10), DNC (0.08), exhaustion (0.07), low authority (0.03), no position (0.01), stale tags (0.01).

**Current state:** 100+ contacts tracked. Full email verification pipeline (MX → SMTP → NeverBounce T3 for DMs). ML classification live on create/update. LoRA tier scoring available but manually invoked. LinkedIn OG scrape + GitHub aggregation + paper enrichment via LangGraph.

**Limitations:** No bulk LinkedIn scrape (10 profiles/min); deletion scoring advisory only (manual review); LoRA tier not auto-refreshed; no native CRM sync; reply-to-contact match needs manual backfill.

---

## 4. Outreach

**Purpose:** Compose, schedule, and track B2B cold email campaigns with personalized sequences. Inbound replies are classified (interested, declined, auto-reply, bounced, unsubscribe) and linked back to original outbound emails.

**User-facing surfaces:**
- Campaign list/detail pages: `/companies/[key]/campaigns/` (`CampaignsClient.tsx:1-100`). Draft, set recipients, sequence, delays, launch.
- Received inbox: `/emails/received/` (`emailCampaigns.ts:80-119`). Archive/classify replies with hybrid ML + keyword classifier.
- Stats dashboard: `emailStats` query (`emailCampaigns.ts:165-279`) — sent/scheduled/delivered/bounced/opened by time window.

**Email flow:**
1. **Draft:** `createDraftCampaign` (283-315) with recipients, sequence `[{subject, html, text}]`, `delay_days` between steps.
2. **Launch:** `launchEmailCampaign` (363-447) sends via Resend (optional `scheduledAt`), persists to `contactEmails`, updates campaign status draft→running→completed.
3. **Tracking:** `syncResendEmails` (736-843) polls Resend API ~500ms/email, syncs status, updates `bounced_emails` JSON.
4. **Replies:** Resend webhook/poll → `process-received.ts` → `receivedEmails` → `classifyReceivedEmail` (`received-emails.ts:189-275`) → match contact + outbound email → mark `reply_received`.

**LangGraph graphs:**
- **email_compose** (`email_compose_graph.py:1-85`): gather_context → draft → format_output. Used by `generateEmail` (`emailCampaigns.ts:476-517`).
- **email_outreach** (`email_outreach_graph.py:1-112`): lookup_contact → extract_hook (LinkedIn post) → draft → format_html. Used by `sendOutreachEmail` (1047-1109).
- **email_reply** (`email_reply_graph.py:1-106`): analyze_email → draft_reply (tone/type steered) → polish (optionally append Calendly). Used by `generateReply` (1004-1045).

**Key files:** `email-campaigns.ts` (1-1112), `email-templates.ts` (1-138), `received-emails.ts` (1-405); `reply-generation.ts`, `reply-classifier.ts` (6-class logistic regression + keyword fallback), `contact-matcher.ts`, `resend-adapter.ts`, `sync-service.ts`; `langgraph-client.ts:169-231`.

**Current state:** Multi-step sequences with per-step delays, full status tracking, hybrid reply classification. Templates in `emailTemplates`. Received-email inbox with archive + classification. Full audit trail in `contactEmails` (resend_id, status, reply_received, reply_classification).

**Limitations:** Resend 30-day scheduling cap; batch endpoint doesn't support scheduledAt/attachments; thread matching is heuristic (In-Reply-To / from_email / fuzzy subject) — no SPF/DKIM validation; LLM gen timeouts 60s; reply classification is OvR binary (no multi-label).

---

## 5. Admin Chat & Text-to-SQL

**Purpose:** Two read-only LangGraph-powered tools. Admin Chat: natural-language SQL with guardrails (count_rows, inspect_schema, query_db). Text-to-SQL: English → SELECT with multi-step validation (understand → identify tables → generate → validate).

**User-facing surfaces:**
- Admin Chat: `adminChat(prompt, system?)` in `src/lib/langgraph-client.ts:189`; exposed as `adminAssistantAgent.generate()` in `src/agents/admin-assistant.ts:11`. Gated by `isAdminEmail()` (`src/lib/admin.ts:39`); admin email hardcoded in `src/lib/constants.ts`.
- Text-to-SQL: `textToSql(question, databaseSchema?)` in `langgraph-client.ts:156`; 4000-char input limit.

**Graphs:**
- **admin_chat_graph** (`admin_chat_graph.py:1–166`): Single-node agent, up to 6 tool steps. LLM emits JSON `{"tool": "...", "args": {...}}` or `{"answer": "..."}` (prompt-enforced JSON due to mlx_lm.server lacking structured output). Tools: `_count_rows` (54), `_inspect_schema` (69), `_query_db` (91) — all reject non-SELECT, parameterize table names.
- **text_to_sql_graph** (`text_to_sql_graph.py:1–129`): 4-stage — understand_question → identify_tables → generate_sql → validate_sql. Final validation (99–112) hard-blocks INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT/REVOKE via substring check.

**Safety model:**
- Admin Chat: 3 layers — (1) `isAdminEmail()` at HTTP middleware/route; (2) SQL-only in `_query_db` (92–97); (3) table name regex validation (55). Max 50 rows (32).
- Text-to-SQL: confidence + explanation alongside SQL; forbidden tokens blocked; prompt enforces SELECT-only; no execution — caller runs through read-only path.

**Key files:** `admin_chat_graph.py`, `text_to_sql_graph.py`, `state.py:104–122` (AdminChatState/TextToSqlState), `backend/app.py:36,55,95,112` (registration), `src/lib/langgraph-client.ts:156–197`, `src/agents/admin-assistant.ts`, `src/lib/admin.ts:39–41`.

**Current state:** Both graphs live at `http://127.0.0.1:8002`. Admin Chat is ops-ready for internal debugging. Text-to-SQL production-ready but not yet exposed in UI (API-only).

**Limitations:** LLM falls back to prompt-enforced JSON on local mlx_lm.server; confidence scores are heuristic (no feedback loop); Admin Chat capped at 6 steps (no cross-call context); neither enforces RLS — DB-level access only.

---

## 6. Research Squad

**Purpose:** Ad-hoc deep-investigation team for researching target companies against the B2B AI consultancy ICP. Invoked via `/agents research {company}`, deploys three parallel specialists — Company Analyst, Hiring Intel, ICP Matcher — who independently gather evidence, form hypotheses, then enter a mandatory debate phase to cross-validate before synthesizing a GO/NO-GO/NEEDS-MORE-INFO verdict.

**How it's invoked:**
- `/agents research {company}` — full squad, single company.
- `/agents research batch {c1} {c2} ...` — parallel squads with comparative ranking.
- `/agents research score {company}` — quick ICP-only scoring (single agent, no debate).

**Agents** (`.claude/skills/`):
1. **Company Analyst** (`research-analyst/SKILL.md:1-160`) — tech stack, funding, growth, AI adoption; ≥3 hypotheses with evidence-for/against.
2. **Hiring Intel** (`research-hiring/SKILL.md:1-190`) — ATS boards, role categorization, hiring velocity (aggressive/steady/selective/frozen), org structure, remote culture signals.
3. **ICP Matcher** (`research-icp/SKILL.md:1-209`) — weighted scoring on 5 criteria: AI focus (0.35), remote-friendliness (0.30), stage (0.15), team size (0.10), DM access (0.10); identifies deal-breakers.

**Debate protocol** (`.claude/commands/agents.md:225-232`): After T1/T2/T3 parallel → T4 debate — cross-read JSON, challenge via SendMessage with evidence, revise confidence, log resolutions. 2-minute hard timeout → synthesis.

**Verdict rules** (`agents.md:264-271`):
- **GO:** icp_match ≥ 0.7 AND no deal-breakers AND confidence ≥ 0.6
- **NO-GO:** any deal-breaker OR icp_match < 0.5
- **NEEDS-MORE-INFO:** icp_match ≥ 0.5 AND confidence < 0.6

**Output:** Each agent writes structured JSON; final state `~/.claude/state/research-{slug}.json` (253).

**Current state:** Event-driven — created per request, destroyed after synthesis. No persistent team state; each run is full re-investigation. Seeds queries off `companies`, `jobs`, `job_sources`, `contacts` tables.

**Limitations:** 2-min debate hard timeout; no incremental research; WebSearch/WebFetch depth limits (no private LinkedIn/paywalled sources); ICP weights fixed (no per-vertical customization); no automated pipeline trigger — manual only.

---

## 7. GraphQL API

**Purpose:** Server-side GraphQL endpoint for the lead-gen SaaS platform, providing typed query/mutation access to companies, contacts, email campaigns, opportunities, competitors, and multi-tenant discovery/enrichment workflows.

**Endpoints:**
- `POST/GET /api/graphql` — Apollo Server (`src/app/api/graphql/route.ts:1-258`).

**Auth model:** Session-based via Auth.js (`resolveSession` at 131-152). `context.userId/userEmail` from HTTP headers; dev mode accepts `ADMIN_EMAIL`. Mutations guard with `if (!context.userId)`. Rate limit: 100 req/min per user/IP (in-memory, not distributed).

**Major resolver domains** (`src/apollo/resolvers.ts:1-47`, merged via lodash):
- **Company** — filtered/paginated queries, CRUD, snapshot ingestion, merge dup, enhance, analyze, block.
- **Contacts** — CRUD, email verification, reminders.
- **Email** — campaigns, templates, received threads, intent signal extraction.
- **LinkedIn/Scraped Posts** — indexing, batch analysis.
- **Opportunities** — jobs/bounties linked to contacts/companies.
- **Competitors** — analysis with pricing, features, integrations.
- **Products** — product analytics.
- **ML/Salescue/Voyager** — specialized ML orchestration.

**DataLoader coverage** (`src/apollo/loaders.ts:58-414`): 14 loaders covering company/facts/snapshots/userSettings/contactsByCompany/contact/contactEmails/emailCampaigns/linkedinPosts/intentSignals/receivedEmails/opportunitiesByContact+Company/competitorsByAnalysis/pricingTiers/features/integrations/productsById. Batch sizes tuned per pattern (BATCH_COMPANY=250, etc.). Custom 2ms batch scheduler.

**Custom scalars** (`schema/base/schema.graphql:1-5`, `codegen.ts:19-24`): JSON, DateTime (string), URL (string), EmailAddress (string), Upload (File). Field-level JSON parsing memoized via WeakMap.

**Codegen flow** (`codegen.ts:1-131`): reads `schema/**/*.graphql` + documents from `src/**/*.{ts,tsx,graphql}`. Outputs client preset, `hooks.tsx`, `types.ts`, `resolvers-types.ts` into `src/__generated__/`.

**Current state:** Live and production. Depth limit MAX_DEPTH=10 hardcoded (route.ts:13). Bulk-import is REST JSON POST, not GraphQL.

**Limitations:** **No query complexity/cost analysis** (only depth limit); **CORS disabled for cross-origin** (only `NEXT_PUBLIC_APP_URL` or `localhost:*` allowed); **rate limit in-memory per process** (not distributed across serverless — TODO at 77-79); **introspection disabled in prod** (120); no embedded Sandbox/Studio.

---

## 8. Pipeline Agent Team

**Purpose:** End-to-end B2B lead generation orchestrator — discover → enrich → contacts + qa → outreach. 6 specialist agents: Discovery Scout, Enrichment Specialist, Contact Hunter, Outreach Composer, QA Auditor, Pipeline Coordinator.

**Commands:**
- `/agents pipeline` — full cycle via orchestrator.
- `/agents pipeline discover [vertical]` — discovery-only, halts for approval.
- `/agents pipeline enrich` — enrich pending + QA audit.
- `/agents pipeline outreach` — draft campaigns (plan-approval gate).
- `/agents pipeline status` — read-only funnel metrics.

**Entry points:** `.claude/commands/agents.md:6-34` routes on `$ARGUMENTS`; `Makefile:106-113` → `make start` → `leadgen-metal pipeline --yes` (Rust binary at `crates/metal/src/main.rs:20-37`).

**Dependency graph** (`agents.md:125-148`):
1. T1 discover (no deps)
2. T2 enrich ← T1
3. T3 contacts ← T2
4. T4 outreach ← T3 (user approval required)
5. T5 qa-audit ← T2 (parallel to T3/T4)

**Phase detection** (`pipeline-meta/SKILL.md:21-39`):
- **BUILDING** (<50 enriched) — prioritize discovery/enrichment.
- **FLOWING** (balanced) — full cycles.
- **BOTTLENECK** (imbalanced) — only lagging stage.
- **SATURATED** — expand verticals.
- **DEGRADED** (QA<0.7, bounce>15%) — halt outreach, cleanup.

**Safety/approval gates:**
1. Plan-approval (`agents.md:139`) — coordinator plan → orchestrator pauses.
2. Outreach approval (`pipeline-outreach/SKILL.md:9,99-118,179`) — explicit "approve" before send.
3. QA halt (`pipeline-meta/SKILL.md:162-163`) — QA<0.7 → halt outreach.
4. Budget caps (`pipeline-meta/SKILL.md:71-74`) — API calls / email sends / web scrapes per batch.

**State files** (`~/.claude/state/`): `pipeline-discovery-report.json`, `pipeline-enrichment-report.json`, `pipeline-contacts-report.json`, `pipeline-outreach-report.json`, `pipeline-qa-report.json`, `pipeline-meta-state.json`, `pipeline-action-plan.json`.

**Key files:** `.claude/commands/agents.md`, `.claude/skills/pipeline-{meta,discover,enrich,contacts,outreach,qa}/SKILL.md`; Rust pipeline at `crates/metal/src/{main.rs,lib.rs,pipeline.rs}`; GraphQL resolvers in `src/apollo/resolvers/`.

**Limitations:** Manual per-batch outreach approval (no auto-schedule); static phase thresholds (50 co, 0.7 score) — not budget-adaptive; no feedback loop from opens/replies to in-cycle model retraining; contact verification quota consumed sequentially (not cached across batches); QA dedup uses Jaro-Winkler at 0.85 — misses phonetic variations.

---

## 9. Self-Improvement Teams (/improve + /codefix)

### /improve — Autonomous Job Search Self-Improvement

**Purpose:** Help land a fully remote global AI engineering role by continuously improving source coverage, classification, and application quality.

**Phases:** BUILDING (<5 AI jobs/week, focus discovery + classification) → OPTIMIZING (flowing but low relevance, tune classifier + skills).

**Agents:**
- **Strategy Brain** (`improve-meta/SKILL.md:29-115`) — reads state files, determines phase, produces action plan.
- **Pipeline Monitor** (`improve-mine/SKILL.md:1-30`) — queries job sources, funnel, AI yield → `pipeline-health.json`.
- **Discovery Expander** (`improve-audit/SKILL.md:1-50`) — researches hiring boards, proposes sources → `discovery-report.json`.
- **Classifier Tuner** (`improve-evolve`) — false-negative analysis, updates prompts/keywords → `classifier-tuning-report.json`.
- **Skill Optimizer** (`improve-apply/SKILL.md:1-40`) — evolves taxonomy (`src/schema/contracts/skill-taxonomy.ts`), extraction (`src/lib/skills/`), matching → `skill-optimization-report.json`.

**Commands:** `/improve` (full cycle: T1,T2 parallel → T3,T4 blocked → T5 verify), `/improve status`, `/improve discover`, `/improve classify`, `/improve skills` (`.claude/commands/improve.md:140-165`).

**Safety:** Max 3 file-modifying tasks + 2 skill evolutions per cycle. Phase gates after mine+audit (show findings) and apply (show changes). Never auto-commit (207-248).

**State:** `~/.claude/state/pipeline-health.json`, `discovery-report.json`, `classifier-tuning-report.json`, `skill-optimization-report.json`, `meta-state.json` (cycle, phase, goal metrics, improvements).

### /codefix — Autonomous Codebase Self-Improvement

**Purpose:** Improve code quality, performance, type safety, security, dead code — independent of business logic. Track improvement phases and prevent degradation.

**Phases:** IMPROVEMENT → SATURATION → COLLAPSE_RISK (halt).

**Agents:**
- **Meta-Optimizer** (`codefix-meta/SKILL.md:1-93`) — detects phase via score trends, routes to specialists → `codefix-meta-state.json`, `codefix-action-plan.json`.
- **Trajectory Miner** (`codefix-mine/SKILL.md:1-50`) — mines `~/.claude/state/improvements/` + `improvement_queue.json` (from `stop_hook.py:24-26`, `improvement_agent.py:26`), clusters by file + root cause (AutoRefine).
- **Codebase Auditor** (`codefix-audit`) — file:line findings across resolvers/workers/agents/security/perf/types/dead-code.
- **Code Improver** (`codefix-apply/SKILL.md:1-60`) — applies fixes in `src/`, `workers/`, `scripts/` (observe-analyze-repair).
- **Skill Evolver** (`codefix-evolve`) — updates `.claude/skills/codefix-*/SKILL.md` on recurring patterns.
- **Verification Gate** (`codefix-verify/SKILL.md:1-50`) — `pnpm lint`, `pnpm build`, regression + convention + confidence calibration.

**Commands:** `/codefix` (mine+audit → apply+evolve → verify; max 3 changes, 2 evolutions), `/codefix audit [target]`, `/codefix apply`, `/codefix verify`, `/codefix status` (`.claude/commands/codefix.md:137-236`).

**Safety:** Mandatory verification post-write. COLLAPSE_RISK → HALT. 10+ files modified → pause. Never skip verification. 3× same pattern = fix isn't working.

**Session scoring loop:** `stop_hook.py:206-234` scores every session on task_completion, tool_efficiency, skill_adherence, routing_accuracy; score < `SCORE_THRESHOLD` (0.65) → enqueue to `improvement_queue.json`; if `CC_AUTO_IMPROVE=true`, spawns `improvement_agent.py:158-186` to generate suggestions.

---

## 10. Frontend App

**Purpose:** Multi-tenant B2B lead generation dashboard — unified interface for managing companies, contacts, opportunities, outreach campaigns, email automation. Next.js 16 + Apollo GraphQL + Radix Themes + Better Auth.

**Live URL:** https://agenticleadgen.xyz

**Route map:**

| Route | Purpose |
|-------|---------|
| `/` | Public marketing landing — hero, pipeline viz, metrics, features, manifesto (`src/app/page.tsx:1-63`) |
| `/dashboard` | Alias for companies list (`dashboard/page.tsx:4`) |
| `/companies` | Companies list + detail. `CompaniesProvider` for GraphQL pagination; drill-down `/companies/[key]` |
| `/contacts` | Client-side filtered list; detail at `/contacts/[slug]` |
| `/opportunities` | Server-side joined table (jobs, bounties, partnerships) with status/score + "Apply" tracking |
| `/follow-ups` | Tabbed UI: emails awaiting replies + due reminders; snooze/dismiss + tag filtering (`follow-ups/page.tsx:33-274`) |
| `/emails` | **Admin-only** (ADMIN_EMAIL guard, `emails/page.tsx:796-823`). Tabs: Inbox, Sent (Resend sync), Campaigns, Templates, LinkedIn Compose, Draft Review, CPN Followup, Stats, Webhook Logs |
| `/products` | Product browser (tenant "nyx" only, `sidebar.tsx:43`) |
| `/admin/linkedin-posts` | Post scheduling + analytics |
| `/settings` | Excluded companies chip input; unsaved-change detection (`settings/page.tsx:40-323`) |
| `/sign-in`, `/sign-up` | AuthDialog modal on load |
| `/how-it-works` | Interactive pipeline architecture explainer |

**Auth:** Better Auth via `@ai-apps/auth`. Handler at `src/app/api/auth/[...path]/route.ts:1-4` (`createNextHandler(auth)`). Client: `authClient` + `useAuth()` hook. Session cached per-request in GraphQL route to dedupe `getSession()` (`graphql/route.ts:128-151`). Admin guard: email-based.

**UI stack:** Radix Themes (dark mode), Radix Icons, PandaCSS styled-system (css(), `recipes/button.tsx`), Vanilla Extract (`@vanilla-extract/next-plugin`), React 19.1 (server components, Suspense).

**Key files:**
- `src/app/layout.tsx:20-54` — Theme + Providers + SidebarProvider + TenantProvider + Sidebar/MainContent.
- `src/components/sidebar.tsx:36-169` — collapsible nav (Companies, Opportunities, Follow-ups, Contacts, Emails, Posts), tenant select, auth header, GitHub link.
- `src/components/providers.tsx:8-13` — Apollo provider.
- `src/app/api/graphql/route.ts:117-258` — depth-limit, CORS, rate-limit, tenant-scoped DB, session cache.
- `vercel.json:8-50` — 5-min timeout on `/api/*`, 3 cron jobs (backup 3am, cpn-campaign 9am, followup-scheduler 7am).

**Current state:** Production on Vercel (Node 24.x). Multi-tenant (`default`, `nyx`) via cookie + TenantProvider. GraphQL-first. Admin UI live (Emails + LinkedIn Posts). Responsive sidebar (200px / 56px).

**Limitations:** In-memory rate limiter (not shared across serverless invocations); no offline mode (GraphQL-only); email dashboard is binary admin-only (no RBAC); tenant selection client-only (no server-side enforcement beyond DB filtering); limited mobile UX (collapsible, not drawer).

---

## Cross-cutting observations

1. **"Discovery" as a user-facing product does not exist yet** — the only "Discovery" in the codebase is Competitor Discovery (admin-only, LLM-seeded). Lead/company discovery happens via the Rust `crates/metal` pipeline, not a user surface.
2. **Enrichment is stronger at the Rust/pipeline layer than the GraphQL surface** — `enhanceCompany` / `analyzeCompany` GraphQL mutations are stubbed; real enrichment runs via `make start` / `leadgen-metal pipeline`.
3. **Local-first LLM stance** — Qwen2.5-3B via `mlx_lm.server`, sgai-qwen3-1.7b for structured extraction. DeepSeek still used as a fallback for competitor discovery.
4. **Multiple agent teams layered on top** — Pipeline (`/agents pipeline`), Research (`/agents research`), Self-Improvement (`/improve`, `/codefix`) — all orchestrated via `.claude/commands/` + `.claude/skills/`, with state in `~/.claude/state/`.
5. **Security posture gaps on GraphQL** — no query complexity/cost analysis, rate limiter is per-process, CORS is restrictive (by design), introspection disabled in prod.
6. **Admin-heavy surface** — `/emails`, `/admin/linkedin-posts`, bulk-import, Competitor Discovery, Admin Chat all behind `isAdminEmail()` (hardcoded `nicolai.vadim@gmail.com`).
