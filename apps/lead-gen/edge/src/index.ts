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
  DB: D1Database;
  JOBS_D1_TOKEN: string;
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

// ── D1 import: chrome-extension "Import all opportunities" on /jobs/search ──
//
// POST /api/jobs/d1/import
//   headers: Authorization: Bearer <JOBS_D1_TOKEN>
//   body:    { jobs: Array<{ title, company, url, companyLinkedinUrl?,
//                            location?, salary?, description?, archived? }> }
//   reply:   { inserted, skipped, total }

interface IncomingJob {
  title?: unknown;
  company?: unknown;
  url?: unknown;
  companyLinkedinUrl?: unknown;
  location?: unknown;
  salary?: unknown;
  description?: unknown;
  archived?: unknown;
}

interface ValidJob {
  title: string;
  company: string;
  url: string;
  companyLinkedinUrl: string | null;
  location: string | null;
  salary: string | null;
  description: string | null;
  archived: 0 | 1;
}

const ALLOW_HEADERS = "authorization, content-type";

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": ALLOW_HEADERS,
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function companyKey(name: string, linkedinUrl: string | null): string {
  if (linkedinUrl) {
    const m = linkedinUrl.match(/\/company\/([^/?#]+)/);
    if (m) return `li:${m[1].toLowerCase()}`;
  }
  return `name:${slugify(name) || "unknown"}`;
}

function newOpportunityId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `opp_${Date.now()}_${rand}`;
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function validateJobs(input: unknown): {
  valid: ValidJob[];
  skippedInvalid: number;
  skippedDuplicate: number;
  invalidSamples: Array<{ reason: string; title?: string; company?: string; url?: string }>;
} {
  if (!input || typeof input !== "object" || !Array.isArray((input as { jobs?: unknown }).jobs)) {
    return { valid: [], skippedInvalid: 0, skippedDuplicate: 0, invalidSamples: [] };
  }
  const seen = new Set<string>();
  const valid: ValidJob[] = [];
  let skippedInvalid = 0;
  let skippedDuplicate = 0;
  const invalidSamples: Array<{ reason: string; title?: string; company?: string; url?: string }> = [];

  for (const raw of (input as { jobs: IncomingJob[] }).jobs) {
    const title = asString(raw?.title);
    const company = asString(raw?.company);
    const url = asString(raw?.url);
    if (!title || !url) {
      skippedInvalid++;
      if (invalidSamples.length < 5) {
        invalidSamples.push({
          reason: !title ? "missing-title" : "missing-url",
          title: title ?? undefined,
          company: company ?? undefined,
          url: url ?? undefined,
        });
      }
      continue;
    }
    if (seen.has(url)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(url);
    valid.push({
      title,
      // company is now optional — opportunities without a company still
      // import (company_id NULL) so we don't drop legit job cards.
      company: company ?? "",
      url,
      companyLinkedinUrl: asString(raw?.companyLinkedinUrl),
      location: asString(raw?.location),
      salary: asString(raw?.salary),
      description: asString(raw?.description),
      archived: raw?.archived ? 1 : 0,
    });
  }
  return { valid, skippedInvalid, skippedDuplicate, invalidSamples };
}

async function handleJobsD1Import(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.JOBS_D1_TOKEN || !token || !constantTimeEq(token, env.JOBS_D1_TOKEN)) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  const { valid, skippedInvalid, skippedDuplicate, invalidSamples } = validateJobs(body);
  console.log(
    JSON.stringify({
      msg: "jobs/d1/import received",
      received: Array.isArray((body as { jobs?: unknown[] })?.jobs)
        ? (body as { jobs: unknown[] }).jobs.length
        : 0,
      valid: valid.length,
      skippedInvalid,
      skippedDuplicate,
      invalidSamples,
    }),
  );
  if (valid.length === 0) {
    return json(req, {
      inserted: 0,
      skipped: skippedInvalid + skippedDuplicate,
      total: skippedInvalid + skippedDuplicate,
      detail: { skippedInvalid, skippedDuplicate, skippedExisting: 0, invalidSamples },
    });
  }

  // 1. Upsert companies (INSERT OR IGNORE) so each unique company gets a row.
  //    Jobs whose `company` is empty get keyByJob[i] = null and skip the
  //    company link entirely (opportunity.company_id stays NULL).
  const keyByJob: Array<string | null> = valid.map((j) =>
    j.company ? companyKey(j.company, j.companyLinkedinUrl) : null,
  );
  const uniqueKeys = Array.from(
    new Set(keyByJob.filter((k): k is string => k !== null)),
  );

  const companyRows = uniqueKeys.map((key) => {
    const j = valid[keyByJob.indexOf(key)];
    return env.DB.prepare(
      `INSERT OR IGNORE INTO companies (key, name, linkedin_url, location)
       VALUES (?, ?, ?, ?)`,
    ).bind(key, j.company, j.companyLinkedinUrl, j.location);
  });
  if (companyRows.length > 0) await env.DB.batch(companyRows);

  // 2. Resolve company_id per key.
  const placeholders = uniqueKeys.map(() => "?").join(",");
  const companyIdMap = new Map<string, number>();
  if (uniqueKeys.length > 0) {
    const idRes = await env.DB.prepare(
      `SELECT id, key FROM companies WHERE key IN (${placeholders})`,
    )
      .bind(...uniqueKeys)
      .all<{ id: number; key: string }>();
    for (const row of idRes.results ?? []) companyIdMap.set(row.key, row.id);
  }

  // 3. Insert opportunities (INSERT OR IGNORE on UNIQUE url).
  const oppStatements = valid.map((j, i) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO opportunities
        (id, title, url, source, status, raw_context, metadata, tags,
         company_id, location, salary, archived)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      newOpportunityId(),
      j.title,
      j.url,
      "linkedin",
      j.archived ? "archived" : "open",
      j.description,
      JSON.stringify({ scrapedAt: new Date().toISOString() }),
      JSON.stringify(["linkedin"]),
      keyByJob[i] ? companyIdMap.get(keyByJob[i] as string) ?? null : null,
      j.location,
      j.salary,
      j.archived,
    ),
  );

  let inserted = 0;
  if (oppStatements.length > 0) {
    const results = await env.DB.batch(oppStatements);
    for (const r of results) {
      const meta = (r as { meta?: { changes?: number } }).meta;
      if (meta?.changes) inserted += meta.changes;
    }
  }

  const skippedExisting = valid.length - inserted;
  const skipped = skippedInvalid + skippedDuplicate + skippedExisting;

  return json(req, {
    inserted,
    skipped,
    total: valid.length + skippedInvalid + skippedDuplicate,
    detail: { skippedInvalid, skippedDuplicate, skippedExisting, invalidSamples },
  });
}

// ── D1 read: Next.js server lists D1 opportunities for /opportunities page ──
//
// GET /api/jobs/d1/opportunities?limit=500
//   headers: Authorization: Bearer <JOBS_D1_TOKEN>
//   reply:   { rows: D1OpportunityRow[] }

interface D1OpportunityListRow {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  status: string;
  tags: string | null;
  location: string | null;
  salary: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
  company_name: string | null;
  company_key: string | null;
}

async function handleJobsD1List(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "GET") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.JOBS_D1_TOKEN || !token || !constantTimeEq(token, env.JOBS_D1_TOKEN)) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "500");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(2000, Math.max(1, Math.floor(limitRaw)))
    : 500;

  const res = await env.DB.prepare(
    `SELECT o.id, o.title, o.url, o.source, o.status, o.tags,
            o.location, o.salary, o.archived, o.created_at, o.updated_at,
            c.name AS company_name, c.key AS company_key
       FROM opportunities o
       LEFT JOIN companies c ON c.id = o.company_id
       WHERE COALESCE(o.archived, 0) = 0
       ORDER BY o.created_at DESC
       LIMIT ?`,
  )
    .bind(limit)
    .all<D1OpportunityListRow>();

  return json(req, { rows: res.results ?? [] });
}

// ── D1 archive: hide a D1 opportunity from the /opportunities page ──
//
// POST /api/jobs/d1/opportunities/archive
//   headers: Authorization: Bearer <JOBS_D1_TOKEN>
//   body:    { id: string }
//   reply:   { archived: boolean }

async function handleJobsD1Archive(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.JOBS_D1_TOKEN || !token || !constantTimeEq(token, env.JOBS_D1_TOKEN)) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  const id = asString((body as { id?: unknown })?.id);
  if (!id) return json(req, { error: "Missing id" }, 400);

  const res = await env.DB.prepare(
    `UPDATE opportunities SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  )
    .bind(id)
    .run();

  const changes = (res as { meta?: { changes?: number } }).meta?.changes ?? 0;
  if (changes === 0) return json(req, { error: "Not found" }, 404);

  return json(req, { archived: true });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/api/jobs/d1/import") {
      return handleJobsD1Import(req, env);
    }
    if (url.pathname === "/api/jobs/d1/opportunities") {
      return handleJobsD1List(req, env);
    }
    if (url.pathname === "/api/jobs/d1/opportunities/archive") {
      return handleJobsD1Archive(req, env);
    }

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
