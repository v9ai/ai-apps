/**
 * Black-box e2e against the deployed (or wrangler dev) gateway.
 *
 * Run:
 *   GATEWAY_HMAC=<hex> pnpm test:e2e
 *
 * Env:
 *   GATEWAY_URL  default https://agenticleadgen-gateway.eeeew.workers.dev
 *   GATEWAY_WS   default same host with wss:// + /graphql
 *   GATEWAY_HMAC required for the HMAC-protected /internal/* tests
 *   ALLOWED_ORIGIN default https://agenticleadgen.xyz
 *
 * Covers:
 *   - /healthz
 *   - /graphql HTTP: introspection-ish typename query, owned mutation auth gate,
 *     unowned op proxy to Vercel
 *   - /graphql HTTP: CORS preflight from the configured origin
 *   - /graphql WS: subprotocol echo, connection_init → connection_ack,
 *     subscribe accepted, /internal/publish event reaches the subscriber
 *   - /internal/publish + /internal/run-finished HMAC gates
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import WebSocket from "ws";

const HTTP = (process.env.GATEWAY_URL ?? "https://agenticleadgen-gateway.eeeew.workers.dev").replace(/\/$/, "");
const WS =
  process.env.GATEWAY_WS ??
  HTTP.replace(/^http/, "ws") + "/graphql";
const HMAC = process.env.GATEWAY_HMAC ?? "";
const ORIGIN = process.env.ALLOWED_ORIGIN ?? "https://agenticleadgen.xyz";

const requireHmac = () => {
  if (!HMAC) {
    throw new Error("GATEWAY_HMAC env var required for HMAC tests");
  }
};

function sign(body) {
  requireHmac();
  return createHmac("sha256", HMAC).update(body).digest("hex");
}

async function gql(query, variables = {}, headers = {}) {
  const body = JSON.stringify({ query, variables });
  const res = await fetch(`${HTTP}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
  return { status: res.status, json: await res.json() };
}

// ── HTTP ──────────────────────────────────────────────────────────────

test("GET /healthz returns 200 ok", async () => {
  const res = await fetch(`${HTTP}/healthz`);
  assert.equal(res.status, 200);
  assert.equal((await res.text()).trim(), "ok");
});

test("POST /graphql {__typename} returns Query", async () => {
  const { status, json } = await gql("{__typename}");
  assert.equal(status, 200);
  assert.equal(json.data?.__typename, "Query");
});

test("owned mutation without session → UNAUTHENTICATED", async () => {
  const { status, json } = await gql(
    "mutation($id:Int!){analyzeProductPricingAsync(id:$id){runId status}}",
    { id: 1 },
  );
  assert.equal(status, 200);
  assert.ok(Array.isArray(json.errors), "expected GraphQL errors[]");
  assert.equal(json.errors[0].extensions?.code, "UNAUTHENTICATED");
  assert.equal(json.data, null);
});

test("unowned op (companies) proxied to Vercel", async () => {
  const { status, json } = await gql(
    "{ companies(filter: {}) { totalCount } }",
  );
  assert.equal(status, 200);
  assert.ok(typeof json.data?.companies?.totalCount === "number");
});

test("CORS preflight reflects origin and credentials", async () => {
  const res = await fetch(`${HTTP}/graphql`, {
    method: "OPTIONS",
    headers: {
      origin: ORIGIN,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type, apollo-require-preflight",
    },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  const allowed = res.headers.get("access-control-allow-headers") ?? "";
  assert.ok(allowed.includes("apollo-require-preflight"), allowed);
});

// ── /internal/* HMAC ──────────────────────────────────────────────────

test("/internal/publish bad signature → 401", async () => {
  requireHmac();
  const res = await fetch(`${HTTP}/internal/publish`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": "deadbeef" },
    body: JSON.stringify({ productId: 1, kind: "pricing" }),
  });
  assert.equal(res.status, 401);
});

test("/internal/publish valid signature → 200", async () => {
  const body = JSON.stringify({
    type: "intelRunStatus",
    productId: 99999,
    kind: "pricing",
    intelRun: {
      id: "e2e-publish-test",
      productId: 99999,
      kind: "pricing",
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    },
  });
  const res = await fetch(`${HTTP}/internal/publish`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": sign(body) },
    body,
  });
  assert.equal(res.status, 200);
});

test("/internal/run-finished unknown UUID → 404", async () => {
  const body = JSON.stringify({
    appRunId: "00000000-0000-0000-0000-000000000000",
    status: "success",
    output: { pricing: { foo: "bar" } },
  });
  const res = await fetch(`${HTTP}/internal/run-finished`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": sign(body) },
    body,
  });
  assert.equal(res.status, 404);
});

// ── WebSocket ─────────────────────────────────────────────────────────

function withSocket(fn, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS, "graphql-transport-ws");
    const events = [];
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`timeout after ${timeoutMs}ms; events: ${JSON.stringify(events)}`));
    }, timeoutMs);
    ws.on("message", (m) => events.push(JSON.parse(m.toString())));
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    ws.on("open", () => {
      Promise.resolve()
        .then(() => fn(ws, events))
        .then((value) => {
          clearTimeout(timer);
          try { ws.close(); } catch {}
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          try { ws.close(); } catch {}
          reject(err);
        });
    });
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("WS handshake echoes graphql-transport-ws subprotocol", async () => {
  await withSocket(async (ws) => {
    assert.equal(ws.protocol, "graphql-transport-ws");
  });
});

test("connection_init → connection_ack", async () => {
  const got = await withSocket(async (ws, events) => {
    ws.send(JSON.stringify({ type: "connection_init" }));
    for (let i = 0; i < 30; i++) {
      if (events.some((e) => e.type === "connection_ack")) return true;
      await wait(50);
    }
    return false;
  });
  assert.equal(got, true);
});

test("subscribe with valid filter is accepted (no error frame)", async () => {
  const result = await withSocket(async (ws, events) => {
    ws.send(JSON.stringify({ type: "connection_init" }));
    await wait(200);
    ws.send(
      JSON.stringify({
        type: "subscribe",
        id: "1",
        payload: {
          query:
            "subscription S($productId:Int!){intelRunStatus(productId:$productId){id status}}",
          variables: { productId: 1 },
        },
      }),
    );
    await wait(800);
    return events.find((e) => e.id === "1" && e.type === "error") ?? null;
  });
  assert.equal(result, null, `unexpected error frame: ${JSON.stringify(result)}`);
});

test("publish event reaches a live subscriber end-to-end", async () => {
  const productId = 42_424_242;
  const intelRunId = `e2e-${Date.now()}`;
  const result = await withSocket(async (ws, events) => {
    ws.send(JSON.stringify({ type: "connection_init" }));
    await wait(200);
    ws.send(
      JSON.stringify({
        type: "subscribe",
        id: "sub-e2e",
        payload: {
          query:
            "subscription S($productId:Int!){intelRunStatus(productId:$productId){id status}}",
          variables: { productId },
        },
      }),
    );
    await wait(300);

    const body = JSON.stringify({
      type: "intelRunStatus",
      productId,
      kind: "pricing",
      intelRun: {
        id: intelRunId,
        productId,
        kind: "pricing",
        status: "success",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        error: null,
      },
    });
    const res = await fetch(`${HTTP}/internal/publish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-signature": sign(body),
      },
      body,
    });
    assert.equal(res.status, 200);

    for (let i = 0; i < 40; i++) {
      const next = events.find((e) => e.id === "sub-e2e" && e.type === "next");
      if (next) return next;
      await wait(50);
    }
    return null;
  }, 8000);

  assert.ok(result, "no `next` event received within 2s of publish");
  // The event should match what we published.
  assert.equal(result.payload?.data?.intelRunStatus?.id, intelRunId);
  assert.equal(result.payload?.data?.intelRunStatus?.status, "success");
});
