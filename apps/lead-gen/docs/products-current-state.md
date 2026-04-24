# Products — Current State

Generated 2026-04-24. Snapshot of the `products` subsystem in `apps/lead-gen`, covering DB, LangGraphs, GraphQL, UI, scripts, tests, and cross-cutting integrations.

---

## 1. Executive summary

Products are first-class entities in lead-gen: `products` table (keyed by `(tenant_id, url)`) plus a cluster of analysis columns (`icp_analysis`, `pricing_analysis`, `gtm_analysis`, `positioning_analysis`, `intel_report`, `freshness_snapshot`) populated by a set of LangGraphs (`product_intel` v1 in production, `analyze_product_v2` staged). Competitors are modelled in a sibling cluster (`competitor_analyses`, `competitors`, `competitor_pricing_tiers`, `competitor_features`, `competitor_integrations`, plus deep-analysis tables `competitor_changelog`, `competitor_funding_events`, `competitor_positioning_snapshots`, `competitor_feature_parity`). Async runs are tracked in `product_intel_runs` + `product_intel_run_secrets`. Company-to-product fit is denormalised into `company_product_signals`. GraphQL exposes the surface via Apollo resolvers under `src/apollo/resolvers/products/`; the UI lives at `/products` + `/products/[slug]/{icp,positioning,pricing,competitors,gtm,intel}`. Golden-data evals (≥0.80 threshold) gate the pricing/GTM/positioning/ICP graphs; normal CRUD paths are untested.

Key gaps: no soft-delete, no product-level provenance table, no vector embeddings, no third-party enrichment APIs, no frontend tests, v2 graph not yet wired to UI.

---

## 2. Database schema

### 2.1 Tables

**`products`** (`src/db/schema.ts:870-919`) — canonical product row.
- PK `id serial`; unique `(tenant_id, url)` → `idx_products_tenant_url`; unique `slug` (generated column from `name`) → `idx_products_slug`.
- Core: `name`, `url`, `domain`, `description`, `highlights jsonb`, `created_by`, `created_at`, `updated_at`.
- Analysis jsonbs (with paired `*_analyzed_at text`): `icp_analysis`, `pricing_analysis`, `gtm_analysis`, `intel_report`, `positioning_analysis`, `freshness_snapshot`.
- `published_at timestamptz` — null = admin-only draft.
- RLS: `public_read` for SELECT; tenant write isolation.

**`company_product_signals`** (`schema.ts:929-965`) — denormalised per-(company, product) fit.
- FKs: `company_id → companies.id ON DELETE CASCADE`; `product_id → products.id ON DELETE CASCADE`.
- Unique `(company_id, product_id)` → `uq_company_product_signals_pair`.
- `signals jsonb` (shape governed by `ProductVertical.schema_version`), `score real` 0-100, `tier text` ('hot'|'warm'|'cold'|null).
- Hot-lead index: `idx_company_product_signals_hot (product_id, tier, score DESC)`.

**`product_intel_runs`** (`schema.ts:1122-1161`) — async LangGraph run tracking.
- PK `id text` (UUID from `startGraphRun`); `lg_run_id`, `lg_thread_id`.
- `product_id → products.id ON DELETE CASCADE`, `tenant_id`.
- `kind text` ∈ {pricing, gtm, product_intel, icp}; `status text` ∈ {queued, running, success, error, timeout}.
- `webhook_secret` (legacy, nullable — moved to `product_intel_run_secrets`).
- `started_at`, `finished_at`, `error`, `output jsonb`, `progress jsonb` (streaming), `total_cost_usd numeric(10,6)`.

**`product_intel_run_secrets`** (`schema.ts:1170-1178`) — hidden HMAC secrets.
- PK `run_id text → product_intel_runs.id ON DELETE CASCADE`, `secret text`.
- RLS enable+force with zero policies (owner-only SELECT).

**Competitor cluster** (`schema.ts:972-1118` + migration 0062):
- `competitor_analyses` — one-per-product run (`status` ∈ {pending_approval, scraping, done, failed}).
- `competitors` — rivals per analysis (positioning_headline/tagline, target_audience, scrape metadata, `last_url_hash` for freshness).
- `competitor_pricing_tiers` — normalised pricing (monthly_price_usd, annual_price_usd, seat_price_usd, currency, included_limits jsonb, is_custom_quote, sort_order).
- `competitor_features` — flat feature list (tier_name, feature_text, category).
- `competitor_integrations` — integrations list.
- `competitor_changelog`, `competitor_funding_events`, `competitor_positioning_snapshots`, `competitor_feature_parity` — deep-analysis additions from migration 0062.

### 2.2 Migrations (chronological)

| Migration | What it did |
|---|---|
| `0050_add_products.sql` | Create `products`; backfill from `competitor_analyses`; add `competitor_analyses.product_id` FK; RLS tenant isolation |
| `0051_add_product_highlights.sql` | +`highlights jsonb` |
| `0053_add_product_icp.sql` | +`icp_analysis`, `icp_analyzed_at` |
| `0057_add_product_intel_columns.sql` | +`pricing_analysis`, `pricing_analyzed_at`, `gtm_analysis`, `gtm_analyzed_at`, `intel_report`, `intel_report_at` |
| `0058_add_product_intel_runs.sql` | Create `product_intel_runs` |
| `0059_public_intel_reads.sql` | RLS swap (public_read SELECT / tenant writes); +`slug` generated column + unique index |
| `0060_add_product_published_at.sql` | +`published_at`; backfill existing rows; conditional index |
| `0061_product_intel_run_secrets.sql` | Create secrets table; backfill; make `webhook_secret` nullable |
| `0062_add_competitor_deep_analysis.sql` | +`competitor_changelog`, `competitor_funding_events`, `competitor_positioning_snapshots`, `competitor_feature_parity` |
| `0063_add_product_intel_runs_progress.sql` | +`progress jsonb` (streaming) |
| `0064_add_product_positioning_analysis.sql` | +`products.positioning_analysis` |
| `0065_add_freshness_tracking.sql` | +`products.freshness_snapshot`; +`competitors.last_url_hash` |
| `0066_add_product_intel_runs_total_cost.sql` | +`total_cost_usd numeric(10,6)`; conditional success index |
| `0067_add_product_signals.sql` | Create `company_product_signals` |

### 2.3 Types & relations

Inferred types (`schema.ts`): `Product`/`NewProduct` (921-922), `CompanyProductSignals`/`NewCompanyProductSignals` (967-968), `ProductIntelRun`/`NewProductIntelRun` (1163-1164), `ProductIntelRunSecret`/`NewProductIntelRunSecret` (1180-1181), `CompetitorAnalysis`/`NewCompetitorAnalysis` (999-1000), `Competitor`/`NewCompetitor` (1042-1043), `CompetitorPricingTier` (1070-1071), `CompetitorFeature` (1094-1095), `CompetitorIntegration` (1117-1118).

Relations (`schema.ts:1183-1246`): `products` → many(competitorAnalyses, productIntelRuns); `productIntelRuns` → one(products), one(productIntelRunSecrets); `competitorAnalyses` → one(products), many(competitors); `competitors` → one(competitorAnalyses), many(pricingTiers, features, integrations).

### 2.4 Consumers (selected)

`src/app/sitemap.ts`, `src/app/products/page.tsx`, `src/app/products/[slug]/{page,intel,gtm,pricing,positioning,competitors}.tsx`, `src/app/api/og/product/[slug]/route.tsx`, `src/app/api/competitors/scrape/route.ts`, `src/app/api/webhooks/langgraph/route.ts`, `src/apollo/resolvers/products/{queries,mutations,intel-runs,field-resolvers}.ts`.

---

## 3. LangGraph: `product_intel` (v1, production)

File: `backend/leadgen_agent/product_intel_graph.py`. Registered as `"product_intel"` in `backend/langgraph.json:16`.

### 3.1 Nodes

| Node | Line | Purpose | State writes |
|---|---|---|---|
| `load_and_profile` | 205 | Read product row; LLM-extract `ProductProfile` | `product`, `product_profile`, cached `icp/pricing/gtm`, `agent_timings` |
| `ensure_icp` | 296 | Cache+freshness gate; invoke `deep_icp` subgraph; persist | `icp`, `freshness`, `subgraph_errors` |
| `ensure_competitors` | 363 | Query `competitor_analyses`; surface freshness | `competitive{has_completed_analysis, competitor_count, maybe_stale, competitors[]}` |
| `run_pricing` | 485 | Stream pricing subgraph via `astream()` | `pricing`, `pricing_subgraph_progress`, `subgraph_errors` |
| `run_gtm` | 528 | Stream GTM subgraph | `gtm`, `gtm_subgraph_progress`, `subgraph_errors` |
| `run_positioning` | 568 | Invoke positioning subgraph | `positioning`, `subgraph_errors` |
| `synthesize_report` | 609 | DeepSeek Deep → `ProductIntelReport`; persist `intel_report`+cost | `report`, `graph_meta`, `_error` |
| `notify_error_node` | 757 | Webhook on fatal error | — |

### 3.2 Flow

```
START → load_and_profile → ensure_icp → ensure_competitors
     → (fan_out) run_pricing ∥ run_gtm → run_positioning → synthesize_report
     → (route_final) notify_complete | notify_error_node → END
```

Conditional: `_fan_out_pricing_gtm()` (l.782-784), `_route_final()` (l.788-790).

### 3.3 LLM calls

- `load_and_profile` (l.257): DeepSeek (`provider="deepseek"`, temp 0.1) → `ProductProfile` structured output.
- `synthesize_report` (l.650): DeepSeek Deep (`tier="deep"`, temp 0.2) → `ProductIntelReport` strict JSON. Includes `partial_note` when subgraph errors exist so the LLM doesn't hallucinate missing sections.
- Both use `ainvoke_json_with_telemetry()` (`llm.py`) for cost/token tracking.

### 3.4 Persistence (raw psycopg3, no Drizzle)

- `products.icp_analysis` — `ensure_icp` (l.346-355).
- `products.intel_report`, `intel_report_at` — `synthesize_report` (l.721-732).
- `product_intel_runs.total_cost_usd` — `synthesize_report` (l.739-746), best-effort if `app_run_id` present.
- Webhook contract: `/api/webhooks/langgraph/route.ts` writes the `product_intel_runs` row.

### 3.5 Callers

- GraphQL mutation `RunFullProductIntel($id: Int!)` → resolver `runFullProductIntel()` (`src/apollo/resolvers/products/mutations.ts:197`) → `runFullProductIntel({productId})` (`src/lib/langgraph-client.ts:625`) → `runGraph("product_intel", {product_id, force_refresh})`.
- UI: `intel-report-view.tsx:55`, `products-list.tsx:107` use `RunFullProductIntelAsync` async variant backed by `product_intel_runs`.

---

## 4. LangGraph: `analyze_product_v2` (staged)

File: `backend/leadgen_agent/product_intel_v2_graph.py`. Registered as `"analyze_product_v2"` in `backend/langgraph.json:17`. Schemas: `backend/leadgen_agent/product_intel_schemas.py`.

### 4.1 Delta vs v1

Parallel DAG rewrite. v1 = sequential supervisor (ICP → competitors → pricing∥gtm → positioning → synthesize). v2 = freshness check → cache-load OR **three-way fan-out (pricing ∥ gtm ∥ deep_competitor)** → positioning join → synthesize. v2 uses optimistic concurrency with reducers; v1 streams progress. Both are partial-failure tolerant.

### 4.2 Nodes

| Node | Line | Purpose |
|---|---|---|
| `check_freshness` | 192-227 | Invoke freshness_graph (team 7); short-circuit to cache if fresh |
| `load_cached_outputs` | 230-276 | Read cached pricing/gtm/icp if fresh |
| `run_deep_competitor` | 279-314 | Invoke deep_competitor_graph; graceful fallback |
| `run_pricing` | 317-337 | Invoke pricing_graph |
| `run_gtm` | 340-358 | Invoke gtm_graph |
| `run_positioning` | 361-395 | Join; invoke positioning_graph |
| `synthesize_report` | 398-522 | DeepSeek → `ProductIntelReport`; persist |
| `fan_out` | 548-552 | Marker for conditional routing |
| `notify_complete`/`notify_error_node` | 525-528 | Dispatch |

### 4.3 Flow

```
START → check_freshness
      ├─ [fresh] → load_cached_outputs → synthesize_report
      ├─ [stale] → fan_out → (run_deep_competitor ∥ run_pricing ∥ run_gtm) → run_positioning → synthesize_report
      └─ [error] → notify_error_node
synthesize_report → [error? notify_error_node : notify_complete] → END
```

Routing: `_route_freshness` (534-538), `_fan_out_analyses` (541-545), `_route_final` (555-556).

### 4.4 Pydantic schemas (`product_intel_schemas.py`)

`ProductProfile` (113-140), `PricingModel`/`PricingRationale` (218-337), `PricingStrategy` (339-346), `Channel`/`MessagingPillar`/`OutreachTemplate` (363-422), `GTMStrategy` (453-463), `PositioningStatement` (468-504), `ProductIntelReport` (508-531), `product_intel_graph_meta()` factory (76-108). `PRODUCT_INTEL_VERSION = "1.0.0"` (l.73).

### 4.5 Persistence

Single write in `synthesize_report` (504-515): `UPDATE products SET intel_report=$1, intel_report_at=now()::text, updated_at=now()::text WHERE id=$2`. Subgraphs handle their own writes to disjoint columns.

### 4.6 Callers

**None from Next.js yet.** v2 is not wired to the frontend; the app continues to call `"product_intel"` (v1). DB run-tracking in `product_intel_runs` is already v2-ready via the same webhook contract.

---

## 5. Positioning & Pricing subgraphs (product-scoped)

### 5.1 `positioning` graph (`positioning_graph.py`)

Five nodes + error handling (l.746-771):
- `load_inputs` — materialise product + cached ICP/pricing/GTM (or consume pre-populated state from supervisor).
- `extract_category_conventions` — DeepSeek temp 0.1 → 4-8 category conventions.
- `identify_white_space` — 2-4 unoccupied positions + competitor frame.
- `draft_positioning_statement` — template: *"For [ICP] who [pain], [product] is the [category] that [differentiator], unlike [competitor] which [gap]."* (l.463-465) + 3-5 differentiators + 2-4 narrative hooks.
- `stress_test` — deterministic validators + LLM-as-critic (max 2 draft/critic cycles). **Direct DB write** to `products.positioning_analysis` (l.711-721).

Registered as `"positioning"` (`langgraph.json:19`).

### 5.2 `pricing` graph (`pricing_graph.py`)

Six nodes with fan-out (l.700-725):
- `load_inputs` — product + ICP + `competitor_pricing_tiers`.
- `benchmark_competitors` (fan-out) — price anchors + category norms.
- `choose_value_metric` (fan-out) — recommend metric ("per verified lead" etc.).
- `design_model` — 2-5 tiers with prices, billing unit, target persona, features, value_math.
- `write_rationale` — value_basis, competitor_benchmark, WTP, risks, recommendation, `price_anchors[]`. **Direct DB write** to `products.{pricing_analysis, pricing_analyzed_at}` (l.642-653).

Registered as `"pricing"` (`langgraph.json:14`).

### 5.3 Relationship to intel graphs

Both graphs are subgraphs called by `product_intel` (v1) and `analyze_product_v2`. Positioning is **not** called internally by pricing/ICP — it consumes their outputs downstream.

### 5.4 UI

- `/products/[slug]/positioning` → `PositioningAnalysisView` (`positioning-analysis-view.tsx:46-303`): positioning_statement hero, differentiators, competitor_frame badges, white_space, positioning_axes, narrative_hooks blockquotes, category_conventions (collapsible), metadata (model, run_at, critic_rounds, cost, tokens, LLM latency).
- No dedicated `/products/[slug]/pricing` UI beyond what's rendered inline; surfaces via GraphQL `pricingAnalysis` field.

---

## 6. GraphQL surface

Schema: `schema/products/schema.graphql` (+ `schema/competitors/schema.graphql` extends `Product.latestCompetitorAnalysis`).

### 6.1 Types

- `Product` (l.1-22): `id, slug, name, url, domain, description, highlights, icpAnalysis, icpAnalyzedAt, pricingAnalysis, pricingAnalyzedAt, gtmAnalysis, gtmAnalyzedAt, intelReport, intelReportAt, positioningAnalysis, publishedAt, createdBy, createdAt, updatedAt`.
- `ProductInput` (l.24-28): `name!, url!, description`.
- `IntelRun` (l.30-43): `id, productId, kind, status, startedAt, finishedAt, error, output, progress, totalCostUsd`.
- `IntelRunAccepted` (l.45-50): `runId, productId, kind, status`.

### 6.2 Queries (`schema.graphql:52-58`)

- `products(limit, offset): [Product!]!` — default 200, max 500, `created_at DESC`.
- `product(id: Int!): Product`.
- `productBySlug(slug: String!): Product`.
- `productIntelRun(id: ID!): IntelRun`.
- `productIntelRuns(productId: Int!, kind: String): [IntelRun!]!`.

Non-admin callers filtered to `published_at IS NOT NULL`.

### 6.3 Mutations (all admin-gated)

Sync: `upsertProduct`, `deleteProduct`, `analyzeProductICP`, `enhanceProductIcp`, `analyzeProductPricing`, `analyzeProductGTM`, `runFullProductIntel`, `setProductPublished`.
Async (returns `IntelRunAccepted`): `analyzeProductPricingAsync(id, resumeFromRunId)`, `analyzeProductGTMAsync(id, resumeFromRunId)`, `runFullProductIntelAsync(id, forceRefresh, resumeFromRunId)`.

### 6.4 Resolvers

- Queries: `src/apollo/resolvers/products/queries.ts:25-74`.
- Mutations: `src/apollo/resolvers/products/mutations.ts:46-245` (admin guard at `:29-36`).
- Field resolvers: `src/apollo/resolvers/products/field-resolvers.ts:4-26` (camelCase mapping; `slug` falls back to `slugify(name)` when DB column absent).
- Intel runs: `src/apollo/resolvers/products/intel-runs.ts:115-245` — `kickoff()` → `startGraphRun()` → dual insert into `product_intel_runs`+`product_intel_run_secrets` for HMAC; explicit allowlist in `IntelRunField` prevents leaking `webhook_secret`, `tenant_id`, `lg_run_id`, `lg_thread_id`, `created_by`.

### 6.5 Client operations (`src/graphql/products.graphql`)

Fragments: `ProductCore` (l.1-22), `IntelRunCore` (l.24-33).
Public (slim): `PublicProducts`, `PublicProduct(slug)`, `PublicIntelRun(id)`, `PublicIntelRuns(productId, kind)`.
Admin: `Products`, `Product(id)`, `ProductBySlug(slug)`, plus all mutations above.

### 6.6 DataLoaders

`src/apollo/loaders.ts:399-409`: `productsById: DataLoader<number, Product | null>` — batch 100, 2ms scheduler, `inArray()` against products table.

---

## 7. Frontend (Next.js App Router)

### 7.1 Routes (all ISR 5 min, Suspense)

| Route | File | Renders |
|---|---|---|
| `/products` | `src/app/products/page.tsx` | `ProductsList` (grid + admin controls) |
| `/products/[slug]` | `src/app/products/[slug]/page.tsx` | `ProductDetail` (hub with sneak-peek cards) |
| `/products/[slug]/icp` | `...[slug]/icp/page.tsx` | `ProductIcpPage` |
| `/products/[slug]/positioning` | `...[slug]/positioning/page.tsx` | `ProductPositioningPage` |
| `/products/[slug]/pricing` | `...[slug]/pricing/page.tsx` | `ProductPricingPage` |
| `/products/[slug]/competitors` | `...[slug]/competitors/page.tsx` | `ProductCompetitorsPage` |
| `/products/[slug]/gtm` | `...[slug]/gtm/page.tsx` | `ProductGtmPage` |
| `/products/[slug]/intel` | `...[slug]/intel/page.tsx` | `ProductIntelPage` |

### 7.2 Components (`src/app/products/components/`)

`products-list.tsx`, `product-detail.tsx`, `product-icp-page.tsx`, `positioning-analysis-view.tsx`, `pricing-analysis-view.tsx`, `gtm-analysis-view.tsx`, `icp-analysis-view.tsx`, `intel-report-view.tsx`, `competitor-analysis-view.tsx`.

### 7.3 Data fetching

Apollo hooks from `@/__generated__/hooks`:
- Reads: `useProductsQuery`, `useProductBySlugQuery`, `useProductCompetitorsBySlugQuery`, `usePublicIntelRunsQuery`.
- Writes: `useAnalyzeProductIcpMutation`, `useAnalyzeProductPricingAsyncMutation`, `useAnalyzeProductGtmAsyncMutation`, `useRunFullProductIntelAsyncMutation`, `useDeleteProductMutation`, `useCreateCompetitorAnalysisMutation`.

### 7.4 Admin & states

Admin gate: `user?.email === ADMIN_EMAIL` (`@/lib/constants`). Admin-only: analyze/pricing/GTM/full-intel/delete buttons, competitor discovery + approval flow. No inline edit — all mutations kick off async LangGraph runs + poll status.

### 7.5 Styling

PandaCSS (`import { css } from "styled-system/css"`) + Radix UI Themes (`Container`, `Flex`, `Heading`, `Badge`, `Table`) + `@radix-ui/react-icons` + custom button recipes (`solid`, `outline`, `ghost`, `gradient`, `soft`).

### 7.6 States

Loading: Suspense fallback. Empty: "No products yet." / "Product not found.". Error: `<Text color="red">{error.message}</Text>`. Async status: badge colors (success=green, error=red, running=blue, timeout=orange).

---

## 8. Scripts & runnable code

### 8.1 TS scripts

| File | Command | Purpose | Tables | Graph |
|---|---|---|---|---|
| `scripts/import-pipeline.ts` | `pnpm tsx scripts/import-pipeline.ts [--dry-run]` | Bulk import Rust pipeline enrichment.json + contacts.json | companies, contacts | — |
| `scripts/import-rust-leads.ts` | `pnpm tsx ... [--dry-run] <path>` | Import companies + contacts from Rust reports | companies, contacts | — |
| `scripts/import-paper-authors.ts` | `[--dry-run\|--update\|--limit N]` | Import academic paper authors as contacts | contacts | — |
| `scripts/detect-intent-signals.ts` | `[--refresh-only\|--limit N]` | Batch intent detection via local Qwen (mlx_lm.server:8080) | companies, companySnapshots, intentSignals | — |
| `scripts/enrich-paper-contacts.ts` | `[--dry-run\|--redo\|--limit N]` | GitHub handle + papers enrichment | contacts | `contact_enrich` |
| `scripts/classify-paper-contacts.ts` | `[--dry-run\|--redo\|--limit N]` | Classify paper B2B relevance | contacts | `classify_paper` |
| `scripts/clean-contacts.ts` | `pnpm clean:contacts <tag>` or `--ml` | Delete by tag or ML pipeline | contacts | — |
| `scripts/backfill-outbound-content.ts` | direct invoke | Backfill html_content for contact_emails | contact_emails | — |
| `scripts/backfill-alias-forward-content.ts` | direct invoke | Backfill alias_forward received_emails | received_emails | — |

### 8.2 Python scripts

| File | Command | Purpose | Tables | Graph |
|---|---|---|---|---|
| `backend/scripts/invoke_deep_scrape.py` | `make deep-scrape TARGET=<url\|id>` | Deep scrape websites; enrich metadata | companies, companyFacts | `deep_scrape` |
| `backend/scripts/rerun_positioning.py` | `cd backend && uv run python ...` | Run competitors_team for products missing competitor data then re-run positioning | products, competitor_analyses, competitors | `competitors_team`, `positioning` |

### 8.3 Makefile targets

`deep-scrape`, `intent-detect`, `intent-refresh`, `import-rust-leads`, `leads` (end-to-end discovery pipeline), `clean-contacts`.

### 8.4 Cron routes

`/api/cron/cpn-campaign`, `/api/cron/followup-scheduler`, `/api/cron/backup`. **No product-specific cron** — product work is on-demand via UI/scripts.

---

## 9. Data flow & lifecycle

### 9.1 State types (`backend/leadgen_agent/state.py`)

- `ProductIntelState` (552-579): input `product_id, force_refresh`, webhook contract; internal `product, product_profile, icp, competitive, pricing, gtm, positioning`; output `report, graph_meta`.
- `DeepICPState` (223-238): input `product_id`; output `criteria_scores, weighted_total, segments, personas, anti_icp, deal_breakers`.
- `FreshnessState` (391-418): input `product_id, check_competitors`; output `stale, confidence, reason, snapshot{checked_at, url, content_hash, previous_hash}`.
- `PricingState`, `GTMState`, `CompetitorDeepDiveState` — all keyed on `product_id`.

### 9.2 Lifecycle

1. **Create** — `upsertProduct` mutation (`mutations.ts:47-79`) UPSERTs by `(tenant_id, url)` via `ON CONFLICT DO UPDATE` (no LLM fuzzy match).
2. **Highlights** — optional ingest from landing-page scraper (`0051_add_product_highlights.sql`).
3. **ICP** — `analyzeProductICP` → `deep_icp_graph` → `ensure_icp` persists `icp_analysis`, `icp_analyzed_at` (`product_intel_graph.py:346-355`).
4. **Pricing** — `analyzeProductPricing` → `pricing_graph.write_rationale` direct write.
5. **GTM** — `analyzeProductGTM` → `gtm_graph.draft_plan` direct write.
6. **Full intel** — `runFullProductIntel` orchestrates ICP + pricing + GTM + positioning via `product_intel_graph`; `synthesize_report` writes `intel_report`, `intel_report_at`, `positioning_analysis`.
7. **Freshness** — `freshness_graph.persist_freshness` (l.321-340) writes `freshness_snapshot`.
8. **Reads** — `product_intel_graph.load_and_profile` reads the row; GraphQL resolvers serve UI; async run tracker via `product_intel_runs`.

### 9.3 Dedup

Hard dedup on `(tenant_id, url)`. No fuzzy LLM match. Conflict updates `name, domain, description, updated_at`; `created_by, created_at` frozen on first insert.

### 9.4 Provenance

**No product-level provenance table.** Migration 0067 explicitly notes "Append-only provenance remains the job of `company_facts`". Cross-reference via `company_product_signals` but that's denormalised scoring, not evidence.

### 9.5 Freshness

Trigger: before ICP/competitor reuse in `ensure_icp` (`product_intel_graph.py:303-320`).
Algorithm: load `products.freshness_snapshot.content_hash` → refetch → normalise → SHA-256 → compare (`freshness_graph.py:1-37`).
Threshold: `stale && confidence >= 0.7` invalidates cache (l.319).
Cadence: **no automatic TTL** — manual `force_refresh=True` or freshness gate on each call.
Competitor freshness (l.28-29): if `check_competitors=True`, updates `competitors.last_url_hash`.

### 9.6 Scoring

- `products` row itself: no score column.
- `company_product_signals.score` (0-100) + `tier` ∈ {hot, warm, cold}; computed by `company_enrichment_graph.score_verticals()` (vertical registry pattern).
- ICP confidence: via `icp_analysis.graph_meta.telemetry` (LLM cost/tokens only).
- Freshness: `freshness_snapshot.confidence` (0-1 heuristic).

### 9.7 Deletion

Hard delete only (`deleteProduct` mutation). Cascades via `competitor_analyses.product_id ON DELETE CASCADE`. No `is_deleted`/`deleted_at`. Drafts use `published_at IS NULL` (distinct from deletion).

---

## 10. Tests & evals

### 10.1 Unit tests

TS (Vitest): `src/lib/contact-slug.test.ts` (14 tests, not product-specific), `src/lib/candle/client.test.ts` (8 tests).
Python (pytest+pytest-asyncio): `test_pricing_graph.py` (18), `test_gtm_graph.py` (8), `test_product_intel_graph.py` (3 — cache vs force-refresh, fan-out determinism, `ProductIntelReport` schema), `test_deep_icp_components.py` (1).

### 10.2 Integration tests

Python: `test_deep_competitor_graph.py` (4), `test_freshness_graph.py` (4), `test_loader_router.py` (routing validation), `test_webhook_integration.py` (1 — intel run webhook dispatch).

### 10.3 Evals (gated by `EVAL=1`)

Each eval monkey-patches `load_inputs` to use golden data (no Neon), runs the live graph, scores outputs via LLM judge (DeepSeek or Claude Opus 4.7), aggregates with pass threshold **≥0.80**.

- `test_pricing_eval.py` — 5 metrics: value_metric_match, model_type_match, tier_count_in_range, wtp_signals_covered, risks_grounded.
- `test_gtm_eval.py` — channel relevance, ICP alignment, pain-point mapping, positioning axis.
- `test_positioning_eval.py` — category match, differentiator coverage, positioning axes, competitor frame, narrative hooks.
- `test_deep_icp_eval.py` — segment/persona alignment, account engagement calibration.

Judge utilities: `backend/tests/_eval_utils.py` (`build_judge_prompt`, `run_judge`).

### 10.4 Fixtures

`backend/tests/golden/{pricing,gtm,positioning,deep_icp}.json` — 15 products/file, 56 total. Each entry: `id`, `product{name, url, domain, description, highlights}`, hand-labeled `expected_*` fields. Session fixture: `backend/tests/conftest.py` (`golden_products`).

### 10.5 Coverage gaps

**Untested:** product CRUD GraphQL mutations (upsert/delete/setPublished), pricing/gtm/positioning GraphQL queries, frontend components (any), end-to-end product → intel-run → resolver → UI pipeline, load/stress on intel graph. Positioning graph itself is "WIP" on 1 of the 8 golden entries.

---

## 11. Integrations & cross-cutting

### 11.1 Joins

- `company_product_signals` bridges companies ↔ products (FKs cascade; unique pair).
- `products` has no direct FK to companies/contacts.
- **No contact-product join.** Product affinity is company-scoped only.

### 11.2 Rollup into company scoring

- `company_enrichment_graph.py:249` `score_verticals()` node: deterministic regex over `home_markdown + careers_markdown` → per-vertical weighted score + tier.
- Upserts into `company_product_signals` (`company_enrichment_graph.py:298-314`), runs after `persist` so enrichment failures don't rollback scoring.
- Hot-lead query optimised by `idx_company_product_signals_hot (product_id, tier, score DESC)`.

### 11.3 Intent signals

No product-driven intent signal. `intentSignals` enumerates 6 types including `product_launch` (weight 5, lowest) but has no `product_id` column and no product-as-source logic. `product_launch` is detected from job postings / web content / github / LinkedIn.

### 11.4 Email templates & campaigns

Zero product references. `emailTemplates.variables` has no product fields; `emailCampaigns` links to `company_id` only; `email_outreach_graph.py` has zero product matches. Personalisation is company-level.

### 11.5 Skills taxonomy

Orthogonal. `service_taxonomy` is on companies, not products. `src/lib/skills/` (`jobSkillSchema`) applies to LinkedIn posts + JDs, not products. `ProductVertical` (vertical_discovery_graph.py + verticals/registry.py) drives company discovery but is separate from the skills subsystem.

### 11.6 Embeddings

**None on products.** No vector column. Product scoring is deterministic regex only. Only `linkedinPosts` has `job_embedding vector(768)` (accessed via raw SQL).

### 11.7 External APIs

No third-party enrichment (no Crunchbase, G2, ProductHunt). All data is scraped domain-direct via `loaders.fetch_url()` (loaders.py:379). `deep_competitor_graph.py:149` fetches `<product_domain>/pricing`.

### 11.8 Observability

- `product_intel_runs.lg_run_id`, `lg_thread_id` → LangGraph checkpoint identifiers.
- `progress jsonb` — per-stage streaming snapshots (`backend/leadgen_agent/notify.py:147`).
- `total_cost_usd` — aggregated from `graph_meta.telemetry`.
- `notify.py:44-45` — LangSmith trace URL + run ID in `_PRIVATE_KEYS` scrub list (never leaked publicly).
- Pricing/GTM subgraphs compile at module scope with `checkpointer=None`; inherit parent's `AsyncPostgresSaver` from `app.py`.

### 11.9 Key architecture pattern

Products integrate with the rest of lead-gen via **company-level aggregates in `company_product_signals`**, populated by deterministic vertical-discovery scoring in the company enrichment flow — not via direct contact joins, embeddings, or product-as-ICP signals. All LLM enrichment happens in dedicated subgraphs (`deep_icp`, `pricing`, `gtm`, `positioning`, `deep_competitor`, `freshness`) orchestrated by `product_intel` (v1, live) or `analyze_product_v2` (staged).
