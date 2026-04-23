# Products domain — current state

Generated 2026-04-23 from a 10-agent audit, scoped to **products and the product-intelligence pipeline**. Every factual claim carries `file:line` citations.

---

## 1. Database — products + related tables

**Production:** Neon project `twilight-pond-00008257`, db `neondb`, us-west-2 pooled. Migrations are hand-authored SQL files in `migrations/` (0048–0059 for the product-intel surface); Drizzle journal is not tracked — schema is applied via Neon MCP or `pnpm db:migrate`. `src/db/schema.ts` mirrors the applied DDL.

### `products` — `src/db/schema.ts:1086-1122`

| Column | Type | Source |
|---|---|---|
| `id`, `tenant_id`, `name`, `url`, `domain`, `description` | base | 0050 |
| `highlights` | jsonb | 0051 |
| `icp_analysis` jsonb, `icp_analyzed_at` text | ICP run output | 0053 |
| `pricing_analysis` jsonb, `pricing_analyzed_at` text | pricing run | 0057 |
| `gtm_analysis` jsonb, `gtm_analyzed_at` text | gtm run | 0057 |
| `intel_report` jsonb, `intel_report_at` text | supervisor run | 0057 |
| `slug` text, `GENERATED ALWAYS AS (lower(regexp_replace(...)))` STORED | indexed lookup | 0059 |
| `created_by`, `created_at`, `updated_at` | base | 0050 |

Indexes: `idx_products_tenant_url` (unique on `tenant_id, url`), `idx_products_tenant_id`, `idx_products_slug` (unique).

**RLS (post-0059):**
- `public_read` on SELECT using `true` — anonymous reads allowed.
- `tenant_write_ins`, `tenant_write_upd`, `tenant_write_del` — INSERT/UPDATE/DELETE gated on `app.tenant` GUC match OR unset-fallback.

This is an intentional 2026-04-23 decision — catalog + AI analyses are marketing-facing. Comment at `src/apollo/resolvers/products/queries.ts:14-22` documents the rationale.

### `product_intel_runs` — `src/db/schema.ts:1273-1304` / migration 0058

Async-run tracking for kickoff-style mutations.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID from `startGraphRun` |
| `lg_run_id`, `lg_thread_id` | text | LangGraph ids for reconcile |
| `product_id` | int FK → products(id), ON DELETE CASCADE |
| `tenant_id` | text, same GUC default |
| `kind` | enum: `pricing / gtm / product_intel / icp` |
| `status` | enum: `queued / running / success / error / timeout` |
| `webhook_secret` | text, per-run HMAC key |
| `started_at`, `finished_at` | timestamptz |
| `error`, `output`, `created_by` | text / jsonb / text |

Indexes: `product_id`, `status`, `tenant_id`, `started_at DESC`.

**RLS:** same pattern as products — `public_read` SELECT, `tenant_write_*` for writes. Residual: `webhook_secret` column is publicly readable at the Postgres layer under public_read; GraphQL field-resolver allowlist (see §3) blocks exposure through the API. Proper fix (Postgres role split) is deferred.

### Competitor tables — feed pricing graph's `load_inputs`

`competitor_analyses` (1129–1157), `competitors` (1159–1194), `competitor_pricing_tiers` (1196–1222), `competitor_features` (1224–1246), `competitor_integrations` (1248–1269). Relations defined at 1309–1327. Pricing graph JOINs competitor rows with their tier prices when composing benchmarks.

---

## 2. Backend LangGraph — product-intel pipeline

Runtime: Python 3.12 FastAPI/uvicorn in a Cloudflare Container (`backend/wrangler.jsonc`, Worker `lead-gen-langgraph`, Durable Object `LeadgenContainer`). `AsyncPostgresSaver` persists checkpoints to Neon (`backend/app.py:75-107`).

### Graphs that touch products

From `backend/langgraph.json`:

| Graph | File | Output → DB column |
|---|---|---|
| `deep_icp` | `deep_icp_graph.py` | `products.icp_analysis` (via resolver) |
| `icp_team` | `icp_team_graph.py` | same — parallel specialist variant |
| `competitors_team` | `competitors_team_graph.py` | `competitor_analyses` + child tables |
| `pricing` | `pricing_graph.py` | `products.pricing_analysis` (self-write, `:409-416`) |
| `gtm` | `gtm_graph.py` | `products.gtm_analysis` (self-write, `:420-431`) |
| `product_intel` | `product_intel_graph.py` | `products.intel_report` (self-write, `:269-280`) |

### `pricing_graph.py` — `build_graph :427-448`
```
load_inputs → (fanout)
  benchmark_competitors (deepseek)
  choose_value_metric (deepseek, tier=deep)
→ design_model (deepseek, tier=deep)
→ write_rationale (deepseek, tier=deep) + DB write
→ notify_complete → END
```

### `gtm_graph.py` — `build_graph :441-462`
```
load_inputs → (fanout)
  pick_channels (deepseek)
  craft_pillars (deepseek, tier=deep)
→ write_templates, build_playbook (parallel)
→ draft_plan + DB write
→ notify_complete → END
```

### `product_intel_graph.py` — `build_graph :289-309` (supervisor)
```
load_and_profile → ensure_icp (re-runs deep_icp if cache miss / force_refresh)
→ ensure_competitors (read-only check; does NOT trigger scraping)
→ (fanout) run_pricing, run_gtm   ← invoke subgraphs via .ainvoke()
→ synthesize_report + DB write
→ notify_complete → END
```

### LLM routing — `backend/leadgen_agent/llm.py:52-86`

`make_llm(temperature, *, provider, tier)`:
- **default** (legacy ICP/competitors/emails): `LLM_BASE_URL` + `LLM_MODEL` — local Qwen via `mlx_lm.server` or fallback.
- **provider="deepseek"**: `DEEPSEEK_BASE_URL` (default `https://api.deepseek.com/v1`), `DEEPSEEK_API_KEY`.
  - `tier="deep"` → `DEEPSEEK_MODEL_DEEP` (`deepseek-reasoner`).
  - default → `DEEPSEEK_MODEL` (`deepseek-chat`).

Existing ICP/competitors graphs unchanged; all product-intel nodes pin to DeepSeek.

### `notify.py` — webhook signaler
- `notify_complete` is a no-op when `webhook_url`, `webhook_secret`, `app_run_id` are absent (sync-only invocations, tests).
- Builds `{status, output: {report|pricing|gtm|icp: …}}` using first-match whitelist (`:31`).
- `_scrub()` recursively drops `webhook_url / webhook_secret / app_run_id / langsmith_* / tenant_id / lg_*` from output (`:37-54`).
- HMAC-SHA256 over raw JSON body, sent as `x-app-signature` + `x-app-run-id` headers.

### Pydantic contracts — `backend/leadgen_agent/product_intel_schemas.py`

`ProductProfile`, `PriceTier / PricingModel / PricingRationale / PricingStrategy`, `Channel / MessagingPillar / OutreachTemplate / Objection / SalesPlaybook / GTMStrategy`, `ProductIntelReport`. Re-exports `DeepICPOutput / Segment / Persona / DealBreaker / GraphMeta` from `icp_schemas.py`. Every model uses `ConfigDict(extra="ignore")` and `mode="before"` None→"" coercion on string fields to survive occasional DeepSeek null outputs. Version: `PRODUCT_INTEL_VERSION = "1.0.0"`.

---

## 3. GraphQL surface

### Schema — `schema/products/schema.graphql`

**Types:**
- `Product` (15 fields: id/slug/name/url/domain/description/highlights/icpAnalysis+At/pricingAnalysis+At/gtmAnalysis+At/intelReport+At/createdBy/createdAt/updatedAt).
- `IntelRun` — minimal allowlist: id/productId/kind/status/startedAt/finishedAt/error/output. **Deliberately no** webhookSecret / tenantId / lgRunId / lgThreadId / createdBy.
- `IntelRunAccepted` — kickoff response: runId/productId/kind/status.

**Queries:** `products`, `product`, `productBySlug`, `productIntelRun`, `productIntelRuns(productId, kind)`.

**Mutations:**
- Sync (block 1–3 min): `upsertProduct`, `deleteProduct`, `analyzeProductICP`, `enhanceProductIcp`, `analyzeProductPricing`, `analyzeProductGTM`, `runFullProductIntel`.
- Async (return in <2s): `analyzeProductPricingAsync`, `analyzeProductGTMAsync`, `runFullProductIntelAsync(forceRefresh)`.

### Resolvers — `src/apollo/resolvers/products/`

| File | Role |
|---|---|
| `queries.ts` | product / productBySlug (indexed via `slug` column) / products. Public-read comment at `:14-22`. |
| `mutations.ts` | All sync mutations; `requireAdmin()` on every write (`:28-35`); "SELECT after graph writes" pattern avoids double-write race. |
| `intel-runs.ts` | `kickoff()` helper (`:43-74`), async mutations, `productIntelRun` with `getRunStatus` reconcile (`:109-146`), explicit `IntelRunField` allowlist (`:173-185`). |
| `field-resolvers.ts` | Product field mapping; `slug` prefers DB column with `slugify(name)` fallback. |
| `index.ts` | Wires `Product` / `IntelRun` field resolvers + merges queries/mutations. |

### Client operations — `src/graphql/products.graphql`

`ProductCore` fragment (15 fields), `IntelRunCore` fragment (8 fields). Public-facing queries (`PublicProducts`, `PublicProduct`, `PublicIntelRun`, `PublicIntelRuns`) emit slim shapes for marketing pages. `pnpm codegen` → `src/__generated__/{types,resolvers-types,hooks,typeDefs}.ts`.

### GraphQL route — `src/app/api/graphql/route.ts`

- Apollo Server 5, Node runtime, force-dynamic.
- `depthLimitRule` capped at 10 (`:13-43`).
- In-memory rate limiter (`:76-115`) — per-instance, 100 req/min. **Deferred** replacement: CF edge Worker + Durable Object plan parked at `.claude/plans/check-deeply-existing-features-effervescent-sphinx.md` (60/300/20 locked).
- CORS from `NEXT_PUBLIC_APP_URL`.
- Introspection disabled in prod (`:120`).
- `requireAdmin` checks `isAdminEmail(context.userEmail)` against `ADMIN_EMAIL` env.

---

## 4. Frontend — /products surface

### Route tree

| Route | File | Purpose |
|---|---|---|
| `/products` | `src/app/products/page.tsx` | List page, Suspense + `<ProductsList>` |
| `/products/[slug]` | `src/app/products/[slug]/page.tsx` | Detail page with `generateMetadata` (OG/Twitter from ICP summary), `revalidate = 300` |
| `/products/[slug]/icp` | `src/app/products/[slug]/icp/page.tsx` | ICP analysis view |
| `/products/[slug]/pricing` | **not yet implemented** | Route declared in sitemap, page TBD |
| `/products/[slug]/gtm` | **not yet implemented** | Same |
| `/products/[slug]/intel` | **not yet implemented** | Same |

### Components — `src/app/products/components/`

- `products-list.tsx` — card grid, admin actions (Analyze ICP / Delete).
- `product-detail.tsx` — highlights renderer (tagline, stats, pipeline stages, feature sections with icon dispatch).
- `product-icp-page.tsx` — re-analyze button + `<IcpAnalysisView>`.
- `icp-analysis-view.tsx` — renders `criteria_scores / weighted_total / segments / personas / anti_icp / deal_breakers`.

### Generated hooks — `src/__generated__/hooks.tsx`

Products surface includes the three-variants pattern (Query/LazyQuery/SuspenseQuery) for Products / Product / ProductBySlug / PublicProducts / PublicProduct / PublicIntelRun / PublicIntelRuns, plus mutation hooks for all sync + async mutations.

### Sidebar — `src/components/sidebar.tsx:36-44`

`Products` nav item gated to `tenants: ["nyx"]`. Other tenants don't see the link, but the URL itself is not tenant-scoped — any authed user can navigate directly to `/products`.

### Webhook handler — `src/app/api/webhooks/langgraph/route.ts:1-157`

Async-run completion endpoint.
- HMAC-SHA256 with `timingSafeEqual` against per-run `webhook_secret` (`:82-92`).
- Idempotent: no-op if the run is already in a terminal status (`:102-108`).
- `sanitize()` (`:50-60`) scrubs the same `PRIVATE_KEYS` set as Python side before DB write.
- Dispatches by `run.kind` → updates the right `products.*_analysis` jsonb + `*_at` timestamp.

### SEO — `src/app/robots.ts` + `src/app/sitemap.ts`

Robots allows `/`, disallows `/api`, `/settings`, `/sign-*`, `/admin`. Sitemap (ISR 1h) enumerates all products × 5 subroutes (`/`, `/icp`, `/pricing`, `/gtm`, `/intel`) with per-row `lastModified`. Note: sitemap references pricing/gtm/intel URLs that return 404 today until the pages land.

### Security headers — `vercel.json`

HSTS preload (2y), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo off). `/api/graphql`: `Cache-Control: no-store`. No CSP on `/products/*` yet (deferred).

---

## 5. Test coverage for products

- `backend/tests/test_deep_icp_components.py` — 5 tests, `@judge_required` (skip without LLM env). Per-node contracts on `research_market` + `score_criteria`, `DeepICPOutput` schema roundtrip, weights hash stability.
- `backend/tests/test_deep_icp_eval.py` — deepeval-based accuracy against `tests/golden/deep_icp.json` (15 products).
- `backend/tests/test_pricing_graph.py` — 7 tests (compile + schema roundtrips for `PricingStrategy / PriceTier / PricingRationale`). Live e2e gated on `PRICING_LIVE_PRODUCT_ID`.
- `backend/tests/test_gtm_graph.py` — 9 tests (compile + `GTMStrategy / Channel / OutreachTemplate / SalesPlaybook`). Live e2e gated on `GTM_LIVE_PRODUCT_ID`.
- No integration test covers the full `/api/webhooks/langgraph` round-trip yet — the python + TS halves are individually verified.

---

## 6. Live catalog today

Three seed products (verified via Neon + unauthenticated GraphQL):

| id | slug | url | last ICP analysis |
|---|---|---|---|
| 1 | `ingestible` | github.com (AI ingestion SaaS) | 2026-04-22 |
| 2 | `archreview` | archreview-website.vercel.app | 2026-04-21 |
| 3 | `onboardingtutor` | landingpage-onboardingtutor.vercel.app | 2026-04-21 |

Product 1 (`ingestible`) has `pricing_analysis` populated from the live async smoke run (2026-04-23, 5 tiers, value metric "per token reduction"). `gtm_analysis` / `intel_report` not yet populated.

---

## 7. Operational notes

- **How to kick off a graph from terminal:**
  ```bash
  curl -X POST "$LANGGRAPH_URL/runs/wait" \
    -H 'content-type: application/json' \
    -H "Authorization: Bearer $LANGGRAPH_AUTH_TOKEN" \
    -d '{"assistant_id":"pricing","input":{"product_id":1}}'
  ```
  Works for `pricing`, `gtm`, `product_intel` (and the existing `deep_icp` / `icp_team` / `competitors_team`). Sync path — blocks up to 300s (Vercel maxDuration).

- **Async kickoff** goes through the GraphQL mutations (`analyzeProductPricingAsync` etc.) → `/threads/{tid}/runs` → graph runs on CF, posts webhook when done. Returns `IntelRunAccepted` immediately.

- **Force a fresh full pipeline:** `runFullProductIntelAsync(id: 1, forceRefresh: true)` — ignores cached ICP, re-runs `deep_icp` then pricing + GTM.

- **Env vars required for DeepSeek:** `DEEPSEEK_API_KEY` in both `.env.local` (dev) and CF Container secrets (prod). Without it the three new graphs 401.

---

## 8. Known gaps / deferred work

1. **UI routes for pricing / GTM / intel** — API + data in place; frontend pages not built.
2. **Role split for `product_intel_runs.webhook_secret`** — Postgres-level leak under public_read RLS; blocked only at GraphQL layer via field allowlist. Option A (new `app_public` / `app_webhook` roles) is the proper fix.
3. **CF-native rate limiter** — plan parked, in-memory limiter still in use.
4. **CSP on `/products/*`** — Next's runtime needs nonce/script-src tuning; deferred for preview-deploy testing.
5. **`notify_error` node** — defined in `notify.py` but not wired into any graph's error edge. Graphs raise on failure; `product_intel_runs` rows can sit in `running` indefinitely without the sweeper cron (user removed it; manual `UPDATE … SET status='timeout'` is the fallback).
6. **`is_published` safety valve** — not implemented. All intel runs go live immediately; no way to hold a bad DeepSeek run back from the public catalog.
7. **Integration test for webhook round-trip** — components tested individually; no end-to-end test wires graph → real `/api/webhooks/langgraph` with signature verify.
