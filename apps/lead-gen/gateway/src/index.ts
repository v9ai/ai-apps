/**
 * Cloudflare Worker GraphQL gateway for lead-gen.
 *
 * Stack (mirrors cloudflare/workers-graphql-server template):
 *   - Hono router (HTTP + WS routing, CORS)
 *   - Apollo Server v5 + @as-integrations/cloudflare-workers (HTTP /graphql)
 *   - Apollo Sandbox at GET /graphql (browser only)
 *   - JobPubSub Durable Object (graphql-ws subscription transport)
 *
 * Routes (under graphQLOptions.baseEndpoint, default `/graphql`):
 *   - GET    (Upgrade: websocket) → JobPubSub DO
 *   - GET    (Accept: text/html)   → Apollo Sandbox embed
 *   - POST                          → owned op? Apollo : (forward? proxy : 400)
 *
 * Internal:
 *   - POST /internal/run-finished  → LangGraph completion webhook (HMAC)
 *   - POST /internal/publish       → fan-in helper from any server (HMAC)
 *   - GET  /healthz                → liveness
 *
 * Owned operations execute locally against Neon and never reach Vercel.
 * Anything else is proxied verbatim to `${ORIGIN}/api/graphql` so the
 * migration is incremental — clients can point at the gateway today and the
 * owned set expands over time.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { parse, type DocumentNode } from "graphql";

import { JobPubSub } from "./job-pubsub";
import { verifyHmac } from "./auth";
import { apolloHandler } from "./graphql/server";
import { handleRunFinished } from "./webhooks/run-finished";
import { graphQLOptions, OWNED_OPS } from "./config";
import { sandboxHtml } from "./sandbox";
import type { GatewayEnv } from "./graphql/context";

export { JobPubSub };

const SUBSCRIPTION_DO_NAME = "global";

const app = new Hono<{ Bindings: GatewayEnv }>();

app.use(
  graphQLOptions.baseEndpoint,
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

app.all(graphQLOptions.baseEndpoint, async (c) => {
  if (c.req.header("upgrade")?.toLowerCase() === "websocket") {
    const id = c.env.JOB_PUBSUB.idFromName(SUBSCRIPTION_DO_NAME);
    const stub = c.env.JOB_PUBSUB.get(id);
    return stub.fetch(c.req.raw);
  }

  if (c.req.method === "GET") {
    if (graphQLOptions.enableSandbox && wantsHtml(c.req.header("accept"))) {
      return c.html(sandboxHtml(graphQLOptions.baseEndpoint));
    }
    return forwardOrReject(c.req.raw, c.env);
  }

  if (c.req.method !== "POST") {
    return forwardOrReject(c.req.raw, c.env);
  }

  const body = await c.req.text();
  const owned = classifyOwned(body);

  const rebuilt = rebuildRequest(c.req.raw, body);
  if (owned) {
    return apolloHandler(rebuilt, c.env, c.executionCtx);
  }
  return forwardOrReject(rebuilt, c.env);
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

function classifyOwned(body: string): boolean {
  let json: { query?: string; operationName?: string | null };
  try {
    json = JSON.parse(body) as { query?: string; operationName?: string | null };
  } catch {
    return false;
  }
  if (typeof json.query !== "string") return false;
  return isOwnedOperation(json.query, json.operationName ?? null);
}

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

async function forwardOrReject(
  req: Request,
  env: GatewayEnv,
): Promise<Response> {
  if (!graphQLOptions.forwardUnmatchedRequestsToOrigin) {
    return new Response("Not found", { status: 404 });
  }
  return proxyToOrigin(req, env.ORIGIN);
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

function wantsHtml(accept: string | undefined | null): boolean {
  if (!accept) return false;
  return accept.includes("text/html");
}
