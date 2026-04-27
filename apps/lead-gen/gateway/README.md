# @lead-gen/gateway

Cloudflare Worker GraphQL gateway for the lead-gen app.

## Why

Vercel edge requests are billed; subscription polling drains the budget. This Worker fronts the GraphQL API:

- **HTTP queries/mutations** → proxied to Vercel origin (`/api/graphql`)
- **WSS subscriptions** → handled natively via the `JobPubSub` Durable Object

Subscriptions never touch Vercel: clients open a single persistent WebSocket; Vercel webhooks publish events to the gateway via signed HTTP, and the DO fans them out.

## Routes

| Path | Method | Purpose |
|------|--------|---------|
| `/graphql` | `GET` (Upgrade: websocket) | graphql-ws subscription transport |
| `/graphql` | `POST` | HTTP queries/mutations, proxied to `${ORIGIN}/api/graphql` |
| `/internal/publish` | `POST` (HMAC) | Vercel-side fan-in for run status changes |
| `/healthz` | `GET` | Liveness check |

## Wire protocol

graphql-transport-ws (https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md). The gateway parses incoming subscription documents and produces a `Filter`; only known subscriptions are accepted (currently `intelRunStatus`).

## Deploy

```bash
pnpm install
pnpm deploy
```

Required secret:

```bash
wrangler secret put GATEWAY_HMAC
```

The same `GATEWAY_HMAC` value must be set in the Vercel app's env so it can sign `/internal/publish` requests.
