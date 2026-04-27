/**
 * Cloudflare Worker GraphQL gateway for lead-gen.
 *
 * Stack:
 *   - Hono router (HTTP + WS routing)
 *   - Apollo Server v5 + @as-integrations/cloudflare-workers (HTTP /graphql, owned ops)
 *   - JobPubSub Durable Object (graphql-ws subscription transport)
 *
 * Routes:
 *   - GET  /graphql (Upgrade: websocket) → JobPubSub DO
 *   - POST /graphql                       → owned op?  Apollo : proxy to Vercel
 *   - POST /internal/run-finished         → LangGraph completion webhook (HMAC)
 *   - POST /internal/publish              → fan-in helper from any server (HMAC)
 *   - GET  /healthz                       → liveness
 *
 * Owned ops execute locally against Neon and never reach Vercel. Anything
 * else (queries/mutations from the rest of the app) is proxied verbatim to
 * the Vercel `/api/graphql` so the migration is incremental — clients can
 * point at the gateway today and we expand the owned set over time.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { parse, type DocumentNode } from "graphql";

import { JobPubSub } from "./job-pubsub";
import { verifyHmac } from "./auth";
import { apolloHandler } from "./graphql/server";
import { handleRunFinished } from "./webhooks/run-finished";
import type { GatewayEnv } from "./graphql/context";

export { JobPubSub };

const SUBSCRIPTION_DO_NAME = "global";

/**
 * Operation field names served locally by Apollo. Anything else proxies to
 * Vercel — keep this list in sync with the SDL in `src/schema.graphql`.
 */
const OWNED_OPS = new Set<string>([
  // Queries
  "productBySlug",
  "productIntelRun",
  "productIntelRuns",
  // Mutations
  "analyzeProductPricingAsync",
  "analyzeProductGTMAsync",
  "runFullProductIntelAsync",
]);

const app = new Hono<{ Bindings: GatewayEnv }>();

// CORS for cross-origin browser callers (the Vercel-hosted Next.js frontend).
// Reflects the request origin so credentialed cookies flow when the gateway
// is on a sibling subdomain or a different host.
app.use(
  "/graphql",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    allowHeaders: [
      "content-type",
      "authorization",
      "apollo-require-preflight",
      "x-apollo-operation-name",
    ],
    allowMethods: ["POST", "GET", "OPTIONS"],
  }),
);

app.all("/graphql", async (c) => {
  const upgrade = c.req.header("upgrade")?.toLowerCase();
  if (upgrade === "websocket") {
    const id = c.env.JOB_PUBSUB.idFromName(SUBSCRIPTION_DO_NAME);
    const stub = c.env.JOB_PUBSUB.get(id);
    return stub.fetch(c.req.raw);
  }

  if (c.req.method !== "POST") {
    return proxyToOrigin(c.req.raw, c.env.ORIGIN);
  }

  const body = await c.req.text();
  let owned = false;
  try {
    const json = JSON.parse(body) as {
      query?: string;
      operationName?: string | null;
    };
    if (typeof json.query === "string") {
      owned = isOwnedOperation(json.query, json.operationName ?? null);
    }
  } catch {
    // malformed JSON — let the proxy / origin return its own error
  }

  const rebuilt = rebuildRequest(c.req.raw, body);
  if (owned) {
    return apolloHandler(rebuilt, c.env, c.executionCtx);
  }
  return proxyToOrigin(rebuilt, c.env.ORIGIN);
});

app.post("/internal/run-finished", (c) =>
  handleRunFinished(c.req.raw, c.env),
);

app.post("/internal/publish", async (c) => {
  const body = await c.req.text();
  const ok = await verifyHmac(
    body,
    c.req.header("x-signature") ?? null,
    c.env.GATEWAY_HMAC,
  );
  if (!ok) return c.text("Unauthorized", 401);
  const id = c.env.JOB_PUBSUB.idFromName(SUBSCRIPTION_DO_NAME);
  const stub = c.env.JOB_PUBSUB.get(id);
  return stub.fetch(
    new Request("https://do/__publish", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    }),
  );
});

app.get("/healthz", (c) => c.text("ok"));

export default {
  fetch: app.fetch.bind(app),
};

// ── Helpers ──────────────────────────────────────────────────────────────

function isOwnedOperation(
  query: string,
  operationName: string | null,
): boolean {
  let doc: DocumentNode;
  try {
    doc = parse(query);
  } catch {
    return false;
  }

  for (const def of doc.definitions) {
    if (def.kind !== "OperationDefinition") continue;
    if (operationName && def.name?.value !== operationName) continue;
    const first = def.selectionSet.selections.find((s) => s.kind === "Field");
    if (first && first.kind === "Field") {
      return OWNED_OPS.has(first.name.value);
    }
  }
  return false;
}

async function proxyToOrigin(req: Request, origin: string): Promise<Response> {
  const inUrl = new URL(req.url);
  const outUrl = new URL(origin);
  outUrl.pathname = "/api/graphql";
  outUrl.search = inUrl.search;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");

  return fetch(outUrl.toString(), {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    redirect: "manual",
    // @ts-expect-error — Cloudflare-specific init field
    duplex: "half",
  });
}

function rebuildRequest(original: Request, body: string): Request {
  return new Request(original.url, {
    method: original.method,
    headers: original.headers,
    body,
  });
}
