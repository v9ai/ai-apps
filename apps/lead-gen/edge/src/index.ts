/**
 * Cloudflare Worker entry: classifies requests into tiers, consults a
 * Durable Object rate limiter, and proxies allowed traffic to the
 * Vercel origin. On deny, returns 429 with `retry-after`.
 *
 * Tiers:
 *   - anon:            no better-auth.session_token cookie   -> 60 req / min, key = IP
 *   - admin-mutation:  cookie present AND POST /api/graphql with `mutation` in body
 *                                                            -> 20 req / min, key = cookie
 *   - authed:          cookie present otherwise              -> 300 req / min, key = cookie
 */

export { RateLimiter } from "./rate-limiter";

interface Env {
  ORIGIN: string;
  RL: DurableObjectNamespace;
}

type Tier = "anon" | "authed" | "admin-mutation";

const WINDOW_MS = 60_000;

const LIMITS: Record<Tier, number> = {
  anon: 60,
  authed: 300,
  "admin-mutation": 20,
};

const SESSION_COOKIE = "better-auth.session_token";

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return null;
}

async function classify(
  req: Request,
  url: URL,
): Promise<{ tier: Tier; key: string; bodyText: string | null }> {
  const cookie = readCookie(req.headers.get("cookie"), SESSION_COOKIE);
  const ip = req.headers.get("cf-connecting-ip") ?? "0.0.0.0";

  if (!cookie) {
    return { tier: "anon", key: `ip:${ip}`, bodyText: null };
  }

  // Authed path: inspect POST /api/graphql for admin-tier mutations.
  if (req.method === "POST" && url.pathname === "/api/graphql") {
    // We must read the body to classify, then forward the same bytes.
    const bodyText = await req.text();
    if (/\bmutation\b/i.test(bodyText)) {
      return {
        tier: "admin-mutation",
        key: `session:${cookie}`,
        bodyText,
      };
    }
    return { tier: "authed", key: `session:${cookie}`, bodyText };
  }

  return { tier: "authed", key: `session:${cookie}`, bodyText: null };
}

async function consumeLimit(
  env: Env,
  key: string,
  tier: Tier,
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const id = env.RL.idFromName(key);
  const stub = env.RL.get(id);
  const res = await stub.fetch("https://do/limit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ limit: LIMITS[tier], windowMs: WINDOW_MS }),
  });
  return (await res.json()) as {
    allowed: boolean;
    remaining: number;
    resetMs: number;
  };
}

function buildOriginRequest(
  req: Request,
  originBase: string,
  url: URL,
  bodyText: string | null,
): Request {
  const targetUrl = originBase.replace(/\/$/, "") + url.pathname + url.search;

  // Strip hop-by-hop / cloudflare-injected headers that shouldn't be
  // forwarded verbatim; keep the rest intact.
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  // If we already read the body during classification, reuse that text.
  // Otherwise pass through the original stream.
  const body: BodyInit | null = hasBody
    ? bodyText !== null
      ? bodyText
      : (req.body as ReadableStream<Uint8Array> | null)
    : null;

  return new Request(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    const { tier, key, bodyText } = await classify(req, url);
    const limit = LIMITS[tier];

    const verdict = await consumeLimit(env, key, tier);
    const resetSeconds = Math.max(0, Math.ceil(verdict.resetMs / 1000));

    if (!verdict.allowed) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "retry-after": String(resetSeconds),
          "x-ratelimit-limit": String(limit),
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(resetSeconds),
          "x-ratelimit-tier": tier,
        },
      });
    }

    const originReq = buildOriginRequest(req, env.ORIGIN, url, bodyText);
    const originRes = await fetch(originReq);

    const outHeaders = new Headers(originRes.headers);
    outHeaders.set("x-ratelimit-limit", String(limit));
    outHeaders.set("x-ratelimit-remaining", String(verdict.remaining));
    outHeaders.set("x-ratelimit-reset", String(resetSeconds));
    outHeaders.set("x-ratelimit-tier", tier);

    return new Response(originRes.body, {
      status: originRes.status,
      statusText: originRes.statusText,
      headers: outHeaders,
    });
  },
};
