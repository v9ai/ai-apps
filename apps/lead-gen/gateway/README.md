# @lead-gen/gateway

Cloudflare Worker GraphQL gateway for lead-gen — based on the [`@as-integrations/cloudflare-workers`](https://github.com/apollo-server-integrations/apollo-server-integration-cloudflare-workers) pattern (Apollo Server v5 on Hono).

## Why

The polling and async-kickoff traffic dominated Vercel's edge-request budget. The gateway moves it to Cloudflare:

- **Owned ops** (queries + LangGraph kickoff mutations) execute in the Worker against Neon directly. Vercel never sees them.
- **Subscriptions** (`intelRunStatus`) ride a WebSocket served by the `JobPubSub` Durable Object. One persistent connection per tab replaces N polling endpoints.
- **Unowned ops** (everything else) are proxied verbatim to `${ORIGIN}/api/graphql` so the migration is incremental.
- **LangGraph completion** webhooks land directly on the gateway (`/internal/run-finished`), which writes Postgres and broadcasts to subscribers — Vercel is not in the loop.

## Stack

- **Apollo Server v5** — `@apollo/server` + `@as-integrations/cloudflare-workers`
- **Hono** — request routing, CORS, WebSocket upgrade dispatch
- **Drizzle ORM** over Neon's HTTP driver (`@neondatabase/serverless`)
- **Durable Object** with WebSocket Hibernation API for subscriptions
- **graphql-ws** transport (subprotocol `graphql-transport-ws`)

## Routes

| Path | Method | Purpose |
|---|---|---|
| `/graphql` | `GET` + `Upgrade: websocket` | graphql-ws subscription transport (DO) |
| `/graphql` | `POST` | Apollo Server (owned) or proxy to Vercel (unowned) |
| `/internal/run-finished` | `POST` (HMAC) | LangGraph completion: write Postgres + broadcast |
| `/internal/publish` | `POST` (HMAC) | Generic fan-in (any server publishes events to subscribers) |
| `/healthz` | `GET` | Liveness |

## Schema (owned)

`src/schema.graphql` — kept in sync with `apps/lead-gen/schema/products/schema.graphql` for the subset the gateway serves.

```graphql
type Query {
  productBySlug(slug: String!): Product
  productIntelRun(id: ID!): IntelRun
  productIntelRuns(productId: Int!, kind: String): [IntelRun!]!
}

type Mutation {
  analyzeProductPricingAsync(id: Int!, resumeFromRunId: ID): IntelRunAccepted!
  analyzeProductGTMAsync(id: Int!, resumeFromRunId: ID): IntelRunAccepted!
  runFullProductIntelAsync(id: Int!, forceRefresh: Boolean, resumeFromRunId: ID): IntelRunAccepted!
}

type Subscription {
  intelRunStatus(productId: Int!, kind: String): IntelRun!
}
```

After editing the SDL, run `pnpm codegen` to refresh `src/__generated__/resolvers-types.ts`.

## Auth

Direct Neon read of the Better-Auth session — no Vercel round-trip. The `better-auth.session_token` cookie is split on `.`, the prefix is looked up in `session ⨝ user`, and admin emails are allowlisted in `src/auth/session.ts`.

## Layout

```
src/
├── index.ts              ← Hono router (all routes)
├── schema.graphql        ← SDL (text, imported via "*.graphql" rule)
├── graphql.d.ts          ← module declaration for the .graphql import
├── graphql/
│   ├── server.ts         ← Apollo + @as-integrations handler
│   ├── resolvers.ts      ← Query / Mutation / Subscription resolvers
│   ├── typedefs.ts       ← re-exports schema as a string
│   ├── context.ts        ← GatewayContext + GatewayEnv types
│   └── pubsub-publish.ts ← JobPubSub publish helper
├── webhooks/
│   └── run-finished.ts   ← LangGraph completion handler (HMAC + Drizzle + DO)
├── job-pubsub.ts         ← Durable Object (graphql-ws hibernation)
├── protocol.ts           ← graphql-ws message types + filter parser
├── langgraph/client.ts   ← LangGraph kickoff helper
├── auth/session.ts       ← Better-Auth session validation (direct Neon)
├── auth.ts               ← HMAC-SHA256 verification
├── db/
│   ├── client.ts         ← Drizzle client (Neon HTTP)
│   └── schema.ts         ← Drizzle schema subset
└── __generated__/
    └── resolvers-types.ts (codegen output)
```

## Configuration

`wrangler.jsonc` vars:
- `ORIGIN` — Vercel app origin for proxying unowned ops
- `GATEWAY_URL` — public URL of this Worker (passed to LangGraph as the webhook URL)
- `LANGGRAPH_URL` — LangGraph backend URL
- `PRODUCT_INTEL_GRAPH_VERSION` — `"v1"` → assistant `product_intel`; `"v2"` → `analyze_product_v2`

Secrets (`wrangler secret put`):
- `GATEWAY_HMAC` — shared with Vercel + LangGraph for `/internal/*` auth
- `NEON_DATABASE_URL` — Neon HTTP driver connection string
- `LANGGRAPH_AUTH_TOKEN` — Bearer token for the LangGraph backend (optional)

## Deploy

```bash
pnpm install
pnpm typecheck                       # tsc --noEmit
pnpm codegen                         # refresh resolvers-types.ts after SDL edits
wrangler secret put GATEWAY_HMAC     # paste the same value into Vercel env
wrangler secret put NEON_DATABASE_URL
wrangler secret put LANGGRAPH_AUTH_TOKEN
pnpm deploy                          # wrangler deploy
```

## Vercel-side env

The Vercel app needs to point at the gateway:

```
NEXT_PUBLIC_GATEWAY_URL=https://agenticleadgen-gateway.eeeew.workers.dev/graphql
NEXT_PUBLIC_GATEWAY_WS_URL=wss://agenticleadgen-gateway.eeeew.workers.dev/graphql
```

The Apollo client in `apps/lead-gen/src/apollo/client.tsx` uses a `split` link: subscriptions go to the WS URL, queries/mutations go to the HTTP URL. Cookies are sent with `credentials: "include"`, so make sure `Better Auth` cookies are configured for the gateway domain (or for a parent domain shared with Vercel).

## Local dev

```bash
pnpm dev          # wrangler dev — runs the Worker locally
```

The Apollo Sandbox is served at `/graphql` in dev (Apollo v5 ships a built-in landing page when `introspection: true`). Issue queries directly against the gateway in the sandbox to verify owned ops resolve, then test the subscription path with `wscat` or Apollo Sandbox's subscription panel.
