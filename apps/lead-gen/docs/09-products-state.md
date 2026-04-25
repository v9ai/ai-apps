# Products domain — current state

Generated 2026-04-23 from a 10-agent audit, **scoped to products + the product-intelligence pipeline**. Every factual claim carries `file:line` citations.

---

## 0. TL;DR of what's live

- **5 products-related LangGraph graphs** deployed (`pricing`, `gtm`, `product_intel`, plus preexisting `deep_icp`, `icp_team`, `competitors_team`, and the newly-added `analyze_product_v2`, `freshness`, `deep_competitor`).
- **4 page routes** live under `/products/[slug]` (detail, icp, pricing, gtm, intel) with ISR `revalidate = 300` + OG/Twitter metadata + sitemap registration.
- **`public_read` RLS** on `products` + `product_intel_runs` (locked 2026-04-23); write path stays tenant-gated.
- **Publish gate** (migration 0060) — non-admins only see rows with `published_at IS NOT NULL`. Applied at all three read resolvers + sitemap.
- **Webhook secret** moved to sibling table `product_intel_run_secrets` with RLS FORCE + zero policies (migration 0061). Legacy column nullable; dual-write for one deploy.
- **Cost/latency telemetry** in the LLM factory (new `ainvoke_json_with_telemetry` + `MODEL_PRICING`). Flows into `graph_meta.telemetry` + `graph_meta.totals`. DB column for totals is planned but not yet migrated.
- **In-memory rate limiter** still the only active limiter. CF edge Worker parked at `apps/lead-gen/edge/` (deploy deferred).
- **Three seed products** in the catalog (ingestible, archreview, onboardingtutor) all currently published.

---

## 1. Database — migrations 0057–0065

Production: Neon `twilight-pond-00008257`, db `neondb`, us-west-2 pooled.

| # | File | Applied? | Effect |
|---|---|---|---|
| 0057 | `add_product_intel_columns.sql` | ✅ | 6 jsonb+text columns on products: pricing/gtm/intel + `*_at` |
| 0058 | `add_product_intel_runs.sql` | ✅ | `product_intel_runs` table + indexes + baseline tenant RLS |
| 0059 | `public_intel_reads.sql` | ✅ | `public_read` SELECT + split `tenant_write_{ins,upd,del}` on products + product_intel_runs; **generated `slug` column** + unique index |
| 0060 | `add_product_published_at.sql` | ✅ | `published_at timestamptz` + backfill to now() + partial index |
| 0061 | `product_intel_run_secrets.sql` | ✅ | Sibling table with RLS FORCE + zero policies; backfill from legacy column; relax NOT NULL on legacy |
| 0062 | `add_competitor_deep_analysis.sql` | ✅ | `competitor_changelog` / `competitor_funding_events` / `competitor_positioning_snapshots` / `competitor_feature_parity` (feeds new `deep_competitor` graph — competitor-domain, not products) |
| 0063 | `add_product_intel_runs_progress.sql` | ⚠️ **NOT YET APPLIED** | Adds `progress jsonb` to `product_intel_runs`. File on disk, code already calls `notify.py::update_progress` which fails silently until the column exists |
| 0065 | `add_freshness_tracking.sql` | ⚠️ **NOT YET APPLIED** | Adds `products.freshness_snapshot jsonb` + `competitors.last_url_hash` + index. Code: `freshness_graph.py` already references these |

Missing: `0064`, `0066` — referenced in llm.py comments ("migration 0066 adds `total_cost_usd` to `product_intel_runs`") but the migration file does not exist yet.

### Final `products` schema — `src/db/schema.ts:1086-1122`

Columns: `id`, `tenant_id` (RLS), `name`, `url`, `domain`, `description`, `highlights` jsonb, `icp_analysis` jsonb, `icp_analyzed_at`, `pricing_analysis` jsonb, `pricing_analyzed_at`, `gtm_analysis` jsonb, `gtm_analyzed_at`, `intel_report` jsonb, `intel_report_at`, `published_at` timestamptz (0060), `slug` text GENERATED ALWAYS (0059), `created_by`, `created_at`, `updated_at`.

Indexes: `idx_products_tenant_url` (unique), `idx_products_tenant_id`, `idx_products_slug` (unique), partial `idx_products_published_at`.

RLS policies: `public_read` (SELECT true), `tenant_write_ins/upd/del` (tenant-gated via `app.tenant` GUC).

### Final `product_intel_runs` schema (live Neon)

`id` text PK, `lg_run_id`, `lg_thread_id`, `product_id` FK, `tenant_id`, `kind` (enum: pricing|gtm|product_intel|icp), `status` (enum: queued|running|success|error|timeout), `webhook_secret` text **nullable** (0061), `started_at` timestamptz, `finished_at`, `error`, `output` jsonb, `created_by`. RLS mirrors products. **`progress jsonb` missing** until 0063 runs.

### `product_intel_run_secrets` — migration 0061

`run_id text PK → product_intel_runs(id) ON DELETE CASCADE`, `secret text NOT NULL`, `created_at timestamptz`. **RLS ENABLE + FORCE with ZERO policies** → only the owning role can SELECT; any future role needs explicit GRANT.

---

## 2. Backend LangGraph (product-intel)

Runtime: Python 3.12 FastAPI/uvicorn in a Cloudflare Container (`backend/wrangler.jsonc`, Worker `lead-gen-langgraph`, DO `LeadgenContainer`). `AsyncPostgresSaver` persists checkpoints to Neon (`backend/app.py:75-107`).

### Products-related graphs in `backend/langgraph.json`

| Graph | File | Purpose |
|---|---|---|
| `deep_icp` | `deep_icp_graph.py` | Legacy ICP (local Qwen via `make_llm()` default) |
| `icp_team` | `icp_team_graph.py` | Parallel ICP specialists |
| `competitors_team` | `competitors_team_graph.py` | Competitor discovery + scrape |
| **`pricing`** | `pricing_graph.py:514-536` | DeepSeek, writes `products.pricing_analysis` |
| **`gtm`** | `gtm_graph.py:501-526` | DeepSeek, writes `products.gtm_analysis` |
| **`product_intel`** | `product_intel_graph.py:462-486` | Supervisor, writes `products.intel_report` |
| **`deep_competitor`** *(new)* | `deep_competitor_graph.py` | Deep dive per competitor (changelog/funding) |
| **`analyze_product_v2`** *(new)* | `product_intel_v2_graph.py` | Second-gen supervisor (iterating on `product_intel`) |
| **`freshness`** *(new)* | `freshness_graph.py` | Checks if cached ICP/competitors are stale before commit |

### Node topology (three primary graphs)

**`pricing_graph.py` (514-536):** `load_inputs` → fan-out `benchmark_competitors` + `choose_value_metric` (deep tier) → `design_model` (deep) → `write_rationale` (deep) → `_route_final()` → `notify_complete` OR `notify_error_node` → END. Self-writes `products.pricing_analysis` (`:485-494`).

**`gtm_graph.py` (501-526):** `load_inputs` → fan-out `pick_channels` + `craft_pillars` (deep) → `write_templates` + `build_playbook` (deep) → `draft_plan` → `_route_final()` → notify_{complete,error} → END. Self-writes `products.gtm_analysis` (`:471-481`).

**`product_intel_graph.py` (462-486):** `load_and_profile` → `ensure_icp` → `ensure_competitors` → fan-out `run_pricing` + `run_gtm` (invoke subgraphs via `.ainvoke()`) → `synthesize_report` (deep) → `_route_final()` → notify_{complete,error} → END. Supervisor writes `products.intel_report` (`:432-443`). Subgraphs still self-persist their jsonb.

### Error routing (new)

Each graph defines a local TypedDict extension (`_PricingStateWithError` / `_GTMStateWithError` / `_ProductIntelStateWithError`) adding `_error: Annotated[str, _first_error]`. Pattern avoids editing `state.py`; reducer `_first_error` (takes the first non-None when two parallel fan-out nodes fail) satisfies LangGraph's parallel-write constraint. Each LLM-calling node wraps its body in try/except that returns `{"_error": "..."}` on failure; the terminal `_route_final()` picks `notify_error_node` vs `notify_complete`.

### `notify.py` — webhooks + progress + telemetry

**`notify_complete(state)`** / **`notify_error(state, err)`** (notify.py:89-111): Read `webhook_url/webhook_secret/app_run_id` from state. Payload built via `_build_payload` (whitelist keys `report/pricing/gtm/icp`, first hit wins). `_scrub()` recursively removes `webhook_url / webhook_secret / app_run_id / langsmith_trace_url / langsmith_run_id / tenant_id / lg_run_id / lg_thread_id`. HMAC-SHA256 over raw JSON; headers `x-app-signature` + `x-app-run-id`. Non-fatal on HTTP error.

**`update_progress(state, stage, subgraph_node?, completed_stages?)`** (notify.py:154-205): Async wrapper around `_write_progress_sync` that UPDATES `product_intel_runs.progress` jsonb via `psycopg.connect` inside `asyncio.to_thread`. Fire-and-forget; all exceptions logged and swallowed. No-op when `app_run_id` absent (sync invocation). **Requires migration 0063 to have effect** (currently unapplied — writes fail silently).

**`progress_start_marker()`** (notify.py:208): returns `{"_progress_started_at": time.time()}` for first node to seed elapsed_ms tracking.

### `llm.py` — LLM factory with cost telemetry (new)

`make_llm(temperature, *, provider, tier)` (llm.py:81-108): `provider="deepseek"` defaults both tiers to `deepseek-v4-pro` (latest v4 thinking-mode model, `reasoning_effort=high`); `tier="deep"` reads `DEEPSEEK_MODEL_DEEP` for environments that want a different deep-tier model. Default provider keeps legacy graphs on `LLM_BASE_URL` (local Qwen). Model IDs resolve through `deepseek_model_name(tier)`, which reads from the `DEEPSEEK_MODELS` catalog (`DEEPSEEK_FLASH` / `DEEPSEEK_PRO` constants — the Python mirror of `src/lib/deepseek/constants.ts`); env vars `DEEPSEEK_MODEL` / `DEEPSEEK_MODEL_DEEP` override per-environment.

**New telemetry path** (llm.py:149-363+):
- `MODEL_PRICING` (`:149-158`) — per-1M-token rates, derived from the same `DEEPSEEK_MODELS` catalog. DeepSeek v4: `deepseek-v4-flash` $0.27/$1.10, `deepseek-v4-pro` $0.55/$2.19. Legacy `deepseek-chat` / `deepseek-reasoner` keys retained until 2026-07-24 deprecation.
- `ainvoke_json_with_telemetry(llm, messages, provider)` returns `(parsed_json, telemetry_dict)` where telemetry is `{model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms}`.
- `ainvoke_json` now delegates to the telemetry version and discards the second tuple element.
- `record_node_telemetry`, `merge_node_telemetry`, `compute_totals` helpers accumulate into `state["graph_meta"]["telemetry"][node_name]`.
- `product_intel_schemas.product_intel_graph_meta(...)` accepts optional `telemetry` + `totals` so the final graph_meta dict carries per-node cost breakdown.

DB column for totals (`product_intel_runs.total_cost_usd`, referenced as "migration 0066" in llm.py comments) is **not yet migrated**.

### Pydantic contracts — `product_intel_schemas.py`

`ProductProfile`, `PriceTier / PricingModel / PricingRationale / PricingStrategy`, `Channel / MessagingPillar / OutreachTemplate / Objection / SalesPlaybook / GTMStrategy`, `ProductIntelReport`. Every model uses `ConfigDict(extra="ignore")` and `mode="before"` None→"" coercion on string fields to survive DeepSeek null outputs. Re-exports `DeepICPOutput / Segment / Persona / DealBreaker / GraphMeta` from `icp_schemas`. Version `PRODUCT_INTEL_VERSION = "1.0.0"`.

---

## 3. GraphQL surface

### Schema — `schema/products/schema.graphql`

**Product** (16 fields): id/slug/name/url/domain/description/highlights/icpAnalysis+At/pricingAnalysis+At/gtmAnalysis+At/intelReport+At/**publishedAt**/createdBy/createdAt/updatedAt.

**IntelRun** (minimal allowlist): id/productId/kind/status/startedAt/finishedAt/error/output. Deliberately no webhookSecret/tenantId/lg*/createdBy.

**IntelRunAccepted**: runId/productId/kind/status.

**Queries:** `products(limit, offset)`, `product(id)`, `productBySlug(slug)`, `productIntelRun(id)`, `productIntelRuns(productId, kind)`.

**Mutations (11):**
- Sync: `upsertProduct`, `deleteProduct`, `analyzeProductICP`, `enhanceProductIcp`, `analyzeProductPricing`, `analyzeProductGTM`, `runFullProductIntel`.
- Async: `analyzeProductPricingAsync`, `analyzeProductGTMAsync`, `runFullProductIntelAsync(forceRefresh)`.
- Publish: **`setProductPublished(id, published)`**.

### Resolvers — `src/apollo/resolvers/products/`

| File | Role |
|---|---|
| `queries.ts` (25-72) | All three readers branch on `isAdminEmail(context.userEmail)`. Non-admins get `isNotNull(products.published_at)` filter. `productBySlug` uses indexed `slug` column. |
| `mutations.ts` (46-244) | 8 sync mutations; every one calls `requireAdmin()`. SELECT-after-write pattern for analysis mutations to avoid timestamp race. `setProductPublished` at `:221-244`. |
| `intel-runs.ts` (87-196) | `kickoff()` dual-writes secret: legacy `product_intel_runs.webhook_secret` AND new `product_intel_run_secrets`. 3 async mutations. `productIntelRun(id)` reconcile-on-error path via `getRunStatus`. **Explicit `IntelRunField` allowlist** (8 safe fields). |
| `field-resolvers.ts` (4-25) | 15 Product field mappers including `publishedAt` (ISO string). |
| `index.ts` | Wires `Product` + `IntelRun` field resolvers + merges query/mutation maps. |

### Client operations — `src/graphql/products.graphql`

Fragments: `ProductCore` (16 fields incl. publishedAt), `IntelRunCore` (8 fields).
Queries: `Products`, `Product`, `ProductBySlug`, `ProductIntelRun`, `ProductIntelRuns`, `PublicProducts`, `PublicProduct`, `PublicIntelRuns`.
Mutations: all 11 above.

### `src/lib/langgraph-client.ts`

`runGraph<T>(assistantId, input, {timeoutMs})` wrapper over `/runs/wait` with optional Bearer. `startGraphRun(assistantId, input)` creates thread + kicks off background `/threads/{tid}/runs` with `multitask_strategy: enqueue`, returns `{appRunId, lgRunId, threadId, webhookSecret}`. `getRunStatus(threadId, lgRunId)` for reconcile. Sync wrappers for each product-related graph with appropriate timeouts (60/120/180/300s).

### `src/app/api/graphql/route.ts`

Apollo Server 5, Node runtime, force-dynamic. `depthLimitRule` = 10 (`:13-43`). In-memory rate limiter 100 req/min (`:76-115`, TODO flag still present). CORS from `NEXT_PUBLIC_APP_URL`. Introspection off in prod (`:120`). Session cache via WeakMap (`:129-152`). `requireAdmin` resolves via `isAdminEmail(context.userEmail)`.

---

## 4. Frontend — /products + /api

### Routes under `/products/[slug]`

| Route | File | generateMetadata | revalidate | jsonb source | OG image |
|---|---|---|---|---|---|
| `/` | `page.tsx` | ✅ | 300 | `icp_analysis` | ✅ |
| `/icp` | `icp/page.tsx` | ❌ | — | — | ❌ |
| `/pricing` | `pricing/page.tsx` | ✅ | 300 | `pricing_analysis` | ❌ (follow-up) |
| `/gtm` | `gtm/page.tsx` | ✅ | 300 | `gtm_analysis` | ❌ (follow-up) |
| `/intel` | `intel/page.tsx` | ✅ | 300 | `intel_report` | ❌ (follow-up) |

The three new pages use `usePublicIntelRunsQuery({ productId, kind, pollInterval: 2000 })` with `stopPolling()` on terminal statuses (`success | error | timeout`).

### Components — `src/app/products/components/`

| File | LOC | Purpose |
|---|---|---|
| `icp-analysis-view.tsx` | 271 | Existing ICP render |
| `pricing-analysis-view.tsx` | 504 | Tier cards + value metric + rationale + risks; polling badge |
| `gtm-analysis-view.tsx` | 567 | Channels + pillars + templates + playbook + 90-day plan; polling badge |
| `intel-report-view.tsx` | 475 | TL;DR + priorities + risks + quick wins + "Re-run full pipeline" admin button |
| `product-detail.tsx` | 363 | Hero landing (pre-existing) |
| `products-list.tsx` | 340 | Card grid + admin actions — extended with "Analyze Pricing / Analyze GTM / Run Full Intel" buttons wired to async mutations |

### `/api` routes supporting products

- `/api/webhooks/langgraph/route.ts` (1-170) — HMAC-verified completion webhook. Reads secret from sibling table first, falls back to legacy column. Idempotent on terminal status. Sanitizes output before DB write.
- `/api/og/product/[slug]/route.tsx` — `@vercel/og` ImageResponse, 1200×630, nodejs runtime, `revalidate = 3600`. Pulls name + ICP summary/description for the hero card.
- `/api/csp-report/route.ts` — logs CSP violations to Vercel function stderr; returns 204. Paired with `Content-Security-Policy-Report-Only` on `/products/(.*)`.

### SEO — `src/app/{robots,sitemap}.ts`

`robots.ts`: allow `/`, disallow `/api/ /settings /sign-in /sign-up /admin`. Sitemap + host.
`sitemap.ts`: ISR 1h, **filters `isNotNull(products.published_at)`**, emits 5 URLs per product (`/`, `/icp`, `/pricing`, `/gtm`, `/intel`) with `lastModified` from `products.updated_at`.

### Vercel security headers — `vercel.json`

- `/(.*)`: HSTS preload, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- `/api/graphql`: `Cache-Control: no-store`.
- `/products/(.*)`: `Content-Security-Policy-Report-Only` → `/api/csp-report` (not enforcing yet).

---

## 5. Async run + webhook flow

```
Client
  ↓ GraphQL runFullProductIntelAsync(id, forceRefresh)
Vercel resolver: kickoff()
  ↓ startGraphRun() → POST /threads, POST /threads/{tid}/runs (CF Container)
  ↓ INSERT product_intel_runs (status=running, webhook_secret legacy)
  ↓ INSERT product_intel_run_secrets (secret sibling, RLS-protected)
  ↓ returns IntelRunAccepted in <2s

CF Container: graph runs 1-3 min
  ↓ synthesize_report writes products.intel_report (asyncpg)
  ↓ notify_complete posts webhook with HMAC + x-app-run-id

Vercel /api/webhooks/langgraph
  ↓ prefer secret from product_intel_run_secrets; legacy fallback
  ↓ verify HMAC via timingSafeEqual
  ↓ sanitize output (strip PRIVATE_KEYS)
  ↓ idempotent: skip if already terminal
  ↓ UPDATE product_intel_runs (status, finished_at, output)
  ↓ UPDATE products.*_analysis patch

Client polling: PublicIntelRuns @ 2s
  ↓ stopPolling() when status ∈ {success,error,timeout}
```

Sweeper cron: **removed** per 2026-04-23 user decision. Stuck `running` rows are cleaned manually. Integration test at `backend/tests/test_webhook_integration.py` covers the HMAC round-trip (gated on `RUN_WEBHOOK_E2E=1`).

---

## 6. Security posture

| Control | Status |
|---|---|
| Public-read on products + product_intel_runs | ✅ intentional (2026-04-23 decision, comment `queries.ts:12-21`) |
| Publish gate — non-admin filter | ✅ live (0060 + resolvers + sitemap) |
| Webhook secret sibling table (RLS FORCE + zero policies) | ✅ live (0061); legacy column dual-written for one deploy |
| GraphQL IntelRun allowlist (no webhook_secret exposure) | ✅ live (`intel-runs.ts:184-196`) |
| Webhook HMAC (SHA-256 + timingSafeEqual) | ✅ live; integration-tested |
| Scrub private keys before DB write (TS + Py) | ✅ defense-in-depth |
| HSTS preload + X-Frame DENY + nosniff + Referrer + Permissions | ✅ `vercel.json` |
| CSP enforcing | ❌ Report-Only on `/products/(.*)` only |
| GraphQL introspection | ✅ disabled in prod |
| GraphQL depth limit | ✅ 10 |
| Rate limiter | ⚠️ In-memory per-instance; CF edge Worker parked |

### Residual gaps

1. **In-memory rate limiter** — cold-start bypass. CF edge Worker ready in `apps/lead-gen/edge/` (built, not deployed). Plan parked at `.claude/plans/check-deeply-existing-features-effervescent-sphinx.md` with 60/300/20 tiers locked.
2. **CSP enforcing** — tuning in Report-Only mode first; no violations ⇒ flip to enforcing.
3. **Role split for webhook_secret** — Option A not pursued; Option B (sibling table) is in service.
4. **Drift between code and DB** — migrations 0063 (progress) + 0065 (freshness) exist on disk but not applied to Neon. Code already references the columns; writes fail silently via best-effort wrappers until migration runs.
5. **Migration 0066 for cost totals** — referenced in `llm.py` comments, file not yet created. Telemetry already accumulated in `graph_meta`; not yet persisted to a dedicated column.

---

## 7. Tests

Located at `backend/tests/`:

| File | Tests | Notes |
|---|---|---|
| `test_pricing_graph.py` | 7 | compile + Pydantic roundtrips; 1 live-gated on `PRICING_LIVE_PRODUCT_ID` |
| `test_gtm_graph.py` | 9 | same pattern; 1 live-gated on `GTM_LIVE_PRODUCT_ID` |
| `test_product_intel_graph.py` | 5 | compile + mocked `ensure_icp` cache/force branches + `_fan_out` + schema roundtrip |
| `test_webhook_integration.py` | 2 | scrub unit (always) + HMAC round-trip via `ThreadingHTTPServer` (gated on `RUN_WEBHOOK_E2E=1`) |
| `test_deep_icp_components.py` | 5 | `@judge_required` — skips without LLM env |
| `test_deep_icp_eval.py` | 3 | deterministic shape + deepeval aggregate 0.80 gate |
| `test_loader_router.py` | 7 | scraping strategy routing, no LLM |

**Total products surface:** ~38 tests. Pass count with no LLM env: 20 pass + 3 skipped (live + E2E). All shape tests green as of 2026-04-23.

Run:
```bash
uv run --directory backend pytest tests/test_pricing_graph.py tests/test_gtm_graph.py tests/test_product_intel_graph.py tests/test_webhook_integration.py -q
```

No frontend tests exist for product components (grep confirms 0 matches).

---

## 8. Ops tooling

- **`scripts/db-diff.ts`** (`pnpm db:diff`) — checks live Neon for expected columns on `products`, `product_intel_runs`, `product_intel_run_secrets`. Exits 1 on drift.
- **`scripts/check-migration-hygiene.sh`** (`pnpm db:hygiene`) — pre-commit guard: fails if `src/db/schema.ts` is staged without a new migration file under `migrations/`. Pre-commit hook NOT auto-installed (husky unavailable); install manually.
- **`apps/lead-gen/edge/`** — CF edge Worker subproject (parked). `wrangler.jsonc` + DO `RateLimiter` class with sliding-window + proxy Worker. Wrangler dry-run succeeds. Not in `pnpm-workspace.yaml`. Awaiting DNS decision.

---

## 9. Live catalog

Three seed products (all currently `published_at = now()` after 0060 backfill):

| id | slug | url | icp | pricing | gtm | intel |
|---|---|---|---|---|---|---|
| 1 | `ingestible` | github.com (AI ingestion SaaS) | 2026-04-22 | 2026-04-23 (5 tiers, "per token reduction") | — | — |
| 2 | `archreview` | archreview-website.vercel.app | 2026-04-21 | — | — | — |
| 3 | `onboardingtutor` | landingpage-onboardingtutor.vercel.app | 2026-04-21 | — | — | — |

---

## 10. Known follow-ups (ranked)

1. **Apply migrations 0063 + 0065** — progress + freshness columns. Safe additive. Code already depends on them but fails silently today.
2. **Create migration 0066** — add `total_cost_usd` to `product_intel_runs` so cost telemetry persists beyond `graph_meta`.
3. **OG images on pricing/gtm/intel pages** — metadata shape is in place; just needs `images` array pointing at `/api/og/product/${slug}`.
4. **CSP report-only → enforcing** — after a quiet reporting window.
5. **CF edge Worker deploy** — unblocks cross-instance rate limiting; needs DNS cutover.
6. **Drop legacy `product_intel_runs.webhook_secret`** — after one full deploy cycle with the sibling table in service.
7. **Frontend tests for product pages** — currently zero coverage on the 4 analysis view components.
8. **Wire `force_refresh` button** into the Intel page (async mutation already accepts it; no UI control yet).
9. **Husky pre-commit hook install** — so `check-migration-hygiene.sh` runs automatically on schema.ts diffs.
