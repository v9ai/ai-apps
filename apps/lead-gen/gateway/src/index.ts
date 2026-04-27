/**
 * Cloudflare Worker GraphQL gateway for lead-gen.
 *
 * Routes:
 *   - GET  /graphql (Upgrade: websocket)  → JobPubSub Durable Object (subscriptions)
 *   - POST /graphql                       → proxied to ${ORIGIN}/api/graphql (Vercel)
 *   - POST /internal/publish              → HMAC-authed fan-in from Vercel webhooks
 *
 * The HTTP proxy preserves cookies (Better Auth) and headers verbatim.
 * The subscription transport is graphql-ws (graphql-transport-ws subprotocol).
 */

import { JobPubSub } from "./job-pubsub";
import { verifyHmac } from "./auth";
import { persistRunFinished } from "./db";

export { JobPubSub };

interface Env {
  ORIGIN: string;
  JOB_PUBSUB: DurableObjectNamespace;
  GATEWAY_HMAC: string;
  NEON_DATABASE_URL: string;
}

interface RunFinishedPayload {
  appRunId: string;
  productId: number;
  kind: string;
  status: "success" | "error" | "timeout";
  error?: string | null;
  output?: unknown;
  startedAt: string;
}

const SUBSCRIPTION_DO_NAME = "global";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/graphql") {
      const upgrade = req.headers.get("Upgrade")?.toLowerCase();
      if (upgrade === "websocket") {
        const id = env.JOB_PUBSUB.idFromName(SUBSCRIPTION_DO_NAME);
        const stub = env.JOB_PUBSUB.get(id);
        return stub.fetch(req);
      }
      // HTTP queries/mutations: proxy verbatim to the Vercel origin.
      return proxyToOrigin(req, env.ORIGIN);
    }

    if (url.pathname === "/internal/publish" && req.method === "POST") {
      const body = await req.text();
      const ok = await verifyHmac(
        body,
        req.headers.get("x-signature"),
        env.GATEWAY_HMAC,
      );
      if (!ok) return new Response("Unauthorized", { status: 401 });
      const id = env.JOB_PUBSUB.idFromName(SUBSCRIPTION_DO_NAME);
      const stub = env.JOB_PUBSUB.get(id);
      return stub.fetch(
        new Request("https://do/__publish", {
          method: "POST",
          body,
          headers: { "content-type": "application/json" },
        }),
      );
    }

    if (url.pathname === "/internal/run-finished" && req.method === "POST") {
      const body = await req.text();
      const ok = await verifyHmac(
        body,
        req.headers.get("x-signature"),
        env.GATEWAY_HMAC,
      );
      if (!ok) return new Response("Unauthorized", { status: 401 });

      const payload = JSON.parse(body) as RunFinishedPayload;
      const finishedAt = new Date().toISOString();

      await persistRunFinished(env.NEON_DATABASE_URL, {
        appRunId: payload.appRunId,
        status: payload.status,
        error: payload.error ?? null,
        finishedAt,
        output: payload.output,
        productId: payload.productId,
        kind: payload.kind,
      });

      const id = env.JOB_PUBSUB.idFromName(SUBSCRIPTION_DO_NAME);
      const stub = env.JOB_PUBSUB.get(id);
      const broadcastBody = JSON.stringify({
        productId: payload.productId,
        kind: payload.kind,
        intelRun: {
          id: payload.appRunId,
          productId: payload.productId,
          kind: payload.kind,
          status: payload.status,
          startedAt: payload.startedAt,
          finishedAt,
          error: payload.error ?? null,
        },
      });
      await stub.fetch(
        new Request("https://do/__publish", {
          method: "POST",
          body: broadcastBody,
          headers: { "content-type": "application/json" },
        }),
      );

      return new Response("ok");
    }

    if (url.pathname === "/healthz") {
      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  },
};

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
