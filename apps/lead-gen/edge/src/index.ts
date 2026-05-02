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
  companyKey?: unknown;
  source?: unknown;
  location?: unknown;
  salary?: unknown;
  description?: unknown;
  archived?: unknown;
  postedAt?: unknown;
  workplaceType?: unknown;
  employmentType?: unknown;
  experienceLevel?: unknown;
  applicantCount?: unknown;
  externalApplyUrl?: unknown;
  voyagerUrn?: unknown;
  state?: unknown;
  easyApply?: unknown;
  formattedSalary?: unknown;
}

interface ValidJob {
  title: string;
  company: string;
  url: string;
  companyLinkedinUrl: string | null;
  // Optional explicit company key — used by non-LinkedIn sources (Ashby etc.)
  // where the slug is the canonical identity. When null, falls back to the
  // LinkedIn URL → slug → name heuristic in `companyKey()`.
  companyKey: string | null;
  // Where this job came from. Defaults to "linkedin" for back-compat with
  // the chrome-extension flow; Ashby ingest sends "ashby:<slug>".
  source: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  archived: 0 | 1;
  // Typed Voyager-enrichment columns — promoted out of metadata JSON because
  // they're filtered/sorted in the leads UI.
  postedAt: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  applicantCount: number | null;
  externalApplyUrl: string | null;
  // Lower-traffic fields still useful for analysis — kept out of typed
  // columns and merged into the existing metadata JSON blob.
  metadataExtras: Record<string, unknown>;
}

const ALLOW_HEADERS = "authorization, content-type, x-request-id";

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": ALLOW_HEADERS,
    "access-control-expose-headers": "x-request-id",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(req: Request, body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      ...(extraHeaders ?? {}),
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

// Mirror of Neon `companies.blocked = true`, populated by
// scripts/sync-blocklist-d1.ts. Fail-open when the table is missing
// so an un-migrated environment still imports.
async function loadBlockedKeys(env: Env): Promise<Set<string>> {
  try {
    const res = await env.DB.prepare(
      `SELECT key FROM blocked_company_keys`,
    ).all<{ key: string }>();
    return new Set((res.results ?? []).map((r) => r.key));
  } catch {
    return new Set();
  }
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function asInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.trunc(v);
}

function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
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

    const formattedSalary = asString(raw?.formattedSalary);
    const voyagerUrn = asString(raw?.voyagerUrn);
    const state = asString(raw?.state);
    const easyApply = asBool(raw?.easyApply);

    // Long-tail fields not promoted to columns — packed into metadata JSON.
    // Only include keys whose source value was non-null so old metadata
    // doesn't get clobbered with explicit nulls.
    const metadataExtras: Record<string, unknown> = {};
    if (voyagerUrn !== null) metadataExtras.voyagerUrn = voyagerUrn;
    if (state !== null) metadataExtras.state = state;
    if (easyApply !== null) metadataExtras.easyApply = easyApply;
    if (formattedSalary !== null) metadataExtras.formattedSalary = formattedSalary;

    valid.push({
      title,
      // company is now optional — opportunities without a company still
      // import (company_id NULL) so we don't drop legit job cards.
      company: company ?? "",
      url,
      companyLinkedinUrl: asString(raw?.companyLinkedinUrl),
      companyKey: asString(raw?.companyKey),
      source: asString(raw?.source) ?? "linkedin",
      location: asString(raw?.location),
      // Voyager's formattedSalary is cleaner than the card's DOM string;
      // prefer it when present so the typed `salary` column gets the best.
      salary: formattedSalary ?? asString(raw?.salary),
      description: asString(raw?.description),
      archived: raw?.archived ? 1 : 0,
      postedAt: asString(raw?.postedAt),
      workplaceType: asString(raw?.workplaceType),
      employmentType: asString(raw?.employmentType),
      experienceLevel: asString(raw?.experienceLevel),
      applicantCount: asInt(raw?.applicantCount),
      externalApplyUrl: asString(raw?.externalApplyUrl),
      metadataExtras,
    });
  }
  return { valid, skippedInvalid, skippedDuplicate, invalidSamples };
}

async function handleJobsD1Import(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const responseHeaders = { "x-request-id": requestId };

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed", requestId }, 405, responseHeaders);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.JOBS_D1_TOKEN || !token || !constantTimeEq(token, env.JOBS_D1_TOKEN)) {
    return json(req, { error: "Unauthorized", requestId }, 401, responseHeaders);
  }

  const startedAt = Date.now();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON", requestId }, 400, responseHeaders);
  }

  const received = Array.isArray((body as { jobs?: unknown[] })?.jobs)
    ? (body as { jobs: unknown[] }).jobs.length
    : 0;
  const { valid, skippedInvalid, skippedDuplicate, invalidSamples } = validateJobs(body);

  const blockedKeys = await loadBlockedKeys(env);
  const kept: ValidJob[] = [];
  let skippedBlocked = 0;
  const blockedSamples: Array<{ company: string; key: string }> = [];
  for (const j of valid) {
    const k = j.company ? companyKey(j.company, j.companyLinkedinUrl) : null;
    if (k && blockedKeys.has(k)) {
      skippedBlocked++;
      if (blockedSamples.length < 5) blockedSamples.push({ company: j.company, key: k });
      continue;
    }
    kept.push(j);
  }

  if (kept.length === 0) {
    console.log(
      JSON.stringify({
        msg: "jobs/d1/import",
        requestId,
        received,
        validated: valid.length,
        skippedInvalid,
        skippedDuplicate,
        skippedBlocked,
        opportunitiesInserted: 0,
        durationMs: Date.now() - startedAt,
        invalidSample: invalidSamples[0] ?? null,
        blockedSample: blockedSamples[0] ?? null,
      }),
    );
    return json(
      req,
      {
        requestId,
        inserted: 0,
        skipped: skippedInvalid + skippedDuplicate + skippedBlocked,
        total: skippedInvalid + skippedDuplicate + skippedBlocked,
        detail: {
          skippedInvalid,
          skippedDuplicate,
          skippedBlocked,
          skippedExisting: 0,
          invalidSamples,
          blockedSamples,
        },
      },
      200,
      responseHeaders,
    );
  }

  // 1. Upsert companies. INSERT OR IGNORE so re-imports don't error;
  //    company_id is left NULL on jobs without a parsed company.
  //    Sources like Ashby send `companyKey` directly (the board slug is
  //    canonical) so we skip the LinkedIn-URL heuristic in `companyKey()`.
  const keyByJob: Array<string | null> = kept.map((j) =>
    j.companyKey ??
    (j.company ? companyKey(j.company, j.companyLinkedinUrl) : null),
  );
  const uniqueKeys = Array.from(
    new Set(keyByJob.filter((k): k is string => k !== null)),
  );

  const companyRows = uniqueKeys.map((key) => {
    const j = kept[keyByJob.indexOf(key)];
    return env.DB.prepare(
      `INSERT OR IGNORE INTO companies (key, name, linkedin_url, location)
       VALUES (?, ?, ?, ?)`,
    ).bind(key, j.company, j.companyLinkedinUrl, j.location);
  });
  if (companyRows.length > 0) {
    try {
      await env.DB.batch(companyRows);
    } catch (e) {
      console.log(
        JSON.stringify({
          msg: "jobs/d1/import d1-batch error",
          requestId,
          stage: "d1-batch",
          batchKind: "companies",
          batchSize: companyRows.length,
          sampleKey: uniqueKeys[0] ?? null,
          error: String(e),
        }),
      );
      return json(
        req,
        { requestId, stage: "companies", error: String(e) },
        500,
        responseHeaders,
      );
    }
  }

  const placeholders = uniqueKeys.map(() => "?").join(",");
  const companyIdMap = new Map<string, number>();
  if (uniqueKeys.length > 0) {
    try {
      const idRes = await env.DB.prepare(
        `SELECT id, key FROM companies WHERE key IN (${placeholders})`,
      )
        .bind(...uniqueKeys)
        .all<{ id: number; key: string }>();
      for (const row of idRes.results ?? []) companyIdMap.set(row.key, row.id);
    } catch (e) {
      console.log(
        JSON.stringify({
          msg: "jobs/d1/import d1-select error",
          requestId,
          stage: "d1-select",
          batchKind: "company-ids",
          error: String(e),
        }),
      );
      return json(
        req,
        { requestId, stage: "company-ids", error: String(e) },
        500,
        responseHeaders,
      );
    }
  }

  const oppStatements = kept.map((j, i) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO opportunities
        (id, title, url, source, status, raw_context, metadata, tags,
         company_id, location, salary, archived,
         posted_at, workplace_type, employment_type, experience_level,
         applicant_count, external_apply_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      newOpportunityId(),
      j.title,
      j.url,
      j.source,
      j.archived ? "archived" : "open",
      j.description,
      JSON.stringify({
        scrapedAt: new Date().toISOString(),
        ...j.metadataExtras,
      }),
      JSON.stringify([j.source]),
      keyByJob[i] ? companyIdMap.get(keyByJob[i] as string) ?? null : null,
      j.location,
      j.salary,
      j.archived,
      j.postedAt,
      j.workplaceType,
      j.employmentType,
      j.experienceLevel,
      j.applicantCount,
      j.externalApplyUrl,
    ),
  );

  let inserted = 0;
  if (oppStatements.length > 0) {
    try {
      const results = await env.DB.batch(oppStatements);
      for (const r of results) {
        const meta = (r as { meta?: { changes?: number } }).meta;
        if (meta?.changes) inserted += meta.changes;
      }
    } catch (e) {
      console.log(
        JSON.stringify({
          msg: "jobs/d1/import d1-batch error",
          requestId,
          stage: "d1-batch",
          batchKind: "opportunities",
          batchSize: oppStatements.length,
          sampleRow: { title: kept[0].title, url: kept[0].url, company: kept[0].company },
          error: String(e),
        }),
      );
      return json(
        req,
        { requestId, stage: "opportunities", error: String(e) },
        500,
        responseHeaders,
      );
    }
  }

  const skippedExisting = kept.length - inserted;
  const skipped = skippedInvalid + skippedDuplicate + skippedBlocked + skippedExisting;
  const durationMs = Date.now() - startedAt;

  console.log(
    JSON.stringify({
      msg: "jobs/d1/import",
      requestId,
      received,
      validated: valid.length,
      kept: kept.length,
      skippedInvalid,
      skippedDuplicate,
      skippedBlocked,
      skippedExisting,
      opportunitiesInserted: inserted,
      companiesAttempted: companyRows.length,
      durationMs,
      invalidSample: invalidSamples[0] ?? null,
      blockedSample: blockedSamples[0] ?? null,
    }),
  );

  return json(
    req,
    {
      requestId,
      inserted,
      skipped,
      total: kept.length + skippedInvalid + skippedDuplicate + skippedBlocked,
      detail: {
        skippedInvalid,
        skippedDuplicate,
        skippedBlocked,
        skippedExisting,
        invalidSamples,
        blockedSamples,
      },
    },
    200,
    responseHeaders,
  );
}

// ── D1 read: distinct Ashby slugs already ingested into D1 opportunities ──
//
// GET /api/jobs/d1/known-ashby-slugs
//   headers: Authorization: Bearer <JOBS_D1_TOKEN>
//   reply:   { slugs: string[] }
//
// Used by the Ashby discovery driver to compute `new_slugs` (slugs not yet
// in D1) so the sequential ingest fan-out can skip boards we've already
// imported.

async function handleKnownAshbySlugs(req: Request, env: Env): Promise<Response> {
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
  const res = await env.DB.prepare(
    `SELECT DISTINCT substr(source, length('ashby:') + 1) AS slug
       FROM opportunities
      WHERE source LIKE 'ashby:%'`,
  ).all<{ slug: string }>();
  const slugs = (res.results ?? []).map((r) => r.slug).filter(Boolean);
  return json(req, { slugs });
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
  workplace_type: string | null;
  employment_type: string | null;
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
            o.workplace_type, o.employment_type,
            c.name AS company_name, c.key AS company_key
       FROM opportunities o
       LEFT JOIN companies c ON c.id = o.company_id
       WHERE COALESCE(o.archived, 0) = 0
         AND o.status = 'open'
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

// ── D1 status update: change a D1 opportunity's status (e.g. open → applied) ──
//
// POST /api/jobs/d1/opportunities/status
//   headers: Authorization: Bearer <JOBS_D1_TOKEN>
//   body:    { id: string, status: "open"|"applied"|"interviewing"|"offer"|"rejected"|"closed" }
//   reply:   { status: string }

const ALLOWED_D1_STATUSES = new Set([
  "open",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "closed",
]);

async function handleJobsD1Status(req: Request, env: Env): Promise<Response> {
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
  const status = asString((body as { status?: unknown })?.status);
  if (!id) return json(req, { error: "Missing id" }, 400);
  if (!status || !ALLOWED_D1_STATUSES.has(status)) {
    return json(req, { error: "Invalid status" }, 400);
  }

  const res = await env.DB.prepare(
    `UPDATE opportunities SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  )
    .bind(status, id)
    .run();

  const changes = (res as { meta?: { changes?: number } }).meta?.changes ?? 0;
  if (changes === 0) return json(req, { error: "Not found" }, 404);

  return json(req, { status });
}

// ── D1 posts upsert: single or batch insert/update by URL ──
//
// POST /api/posts/d1/upsert
//   headers: Authorization: Bearer <JOBS_D1_TOKEN>
//   body:    { inputs: PostInput[] }  // single-element array allowed
//   reply:   { upserted: number, skipped: number }
//
// Each input row is matched on (tenant_id, post_url) — existing rows have
// their non-null fields overwritten; new rows are inserted. Designed to be
// called from the backfill script and from Apollo resolvers (chrome-extension
// upsert path). All 40 columns are accepted; missing fields default to NULL.

interface PostInput {
  tenant_id?: string;
  type?: "post" | "job";
  company_key: string;
  company_id?: number | null;
  contact_id?: number | null;
  author_kind?: "company" | "person";
  author_name?: string | null;
  author_url?: string | null;
  post_url: string;
  post_text?: string | null;
  title?: string | null;
  content?: string | null;
  posted_date?: string | null;
  posted_at?: string | null;
  scraped_at?: string | null;
  reactions_count?: number;
  comments_count?: number;
  reposts_count?: number;
  media_type?: string;
  is_repost?: boolean;
  original_author?: string | null;
  location?: string | null;
  employment_type?: string | null;
  raw_data?: string | null;
  skills?: string | null;
  analyzed_at?: string | null;
  job_embedding?: string | null;
  voyager_urn?: string | null;
  voyager_workplace_type?: string | null;
  voyager_salary_min?: number | null;
  voyager_salary_max?: number | null;
  voyager_salary_currency?: string | null;
  voyager_apply_url?: string | null;
  voyager_poster_urn?: string | null;
  voyager_listed_at?: string | null;
  voyager_reposted?: boolean;
  company_name?: string | null;
  company_industry?: string | null;
  company_size_range?: string | null;
  company_location?: string | null;
}

const POST_COLUMNS = [
  "tenant_id", "type", "company_key", "company_id", "contact_id",
  "author_kind", "author_name", "author_url",
  "post_url", "post_text", "title", "content",
  "posted_date", "posted_at", "scraped_at",
  "reactions_count", "comments_count", "reposts_count",
  "media_type", "is_repost", "original_author",
  "location", "employment_type",
  "raw_data", "skills", "analyzed_at", "job_embedding",
  "voyager_urn", "voyager_workplace_type",
  "voyager_salary_min", "voyager_salary_max", "voyager_salary_currency",
  "voyager_apply_url", "voyager_poster_urn", "voyager_listed_at", "voyager_reposted",
  "company_name", "company_industry", "company_size_range", "company_location",
] as const;

function postInputToBindings(p: PostInput): unknown[] {
  return [
    p.tenant_id ?? "public",
    p.type ?? "post",
    p.company_key,
    p.company_id ?? null,
    p.contact_id ?? null,
    p.author_kind ?? "company",
    p.author_name ?? null,
    p.author_url ?? null,
    p.post_url,
    p.post_text ?? null,
    p.title ?? null,
    p.content ?? null,
    p.posted_date ?? null,
    p.posted_at ?? null,
    p.scraped_at ?? new Date().toISOString(),
    p.reactions_count ?? 0,
    p.comments_count ?? 0,
    p.reposts_count ?? 0,
    p.media_type ?? "none",
    p.is_repost ? 1 : 0,
    p.original_author ?? null,
    p.location ?? null,
    p.employment_type ?? null,
    p.raw_data ?? null,
    p.skills ?? null,
    p.analyzed_at ?? null,
    p.job_embedding ?? null,
    p.voyager_urn ?? null,
    p.voyager_workplace_type ?? null,
    p.voyager_salary_min ?? null,
    p.voyager_salary_max ?? null,
    p.voyager_salary_currency ?? null,
    p.voyager_apply_url ?? null,
    p.voyager_poster_urn ?? null,
    p.voyager_listed_at ?? null,
    p.voyager_reposted ? 1 : 0,
    p.company_name ?? null,
    p.company_industry ?? null,
    p.company_size_range ?? null,
    p.company_location ?? null,
  ];
}

async function handlePostsD1Upsert(req: Request, env: Env): Promise<Response> {
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

  let body: { inputs?: PostInput[] };
  try {
    body = (await req.json()) as { inputs?: PostInput[] };
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }
  const inputs = Array.isArray(body.inputs) ? body.inputs : [];
  if (inputs.length === 0) return json(req, { upserted: 0, skipped: 0 });

  const valid = inputs.filter((p) => p && p.company_key && p.post_url);
  const skipped = inputs.length - valid.length;
  if (valid.length === 0) return json(req, { upserted: 0, skipped });

  const placeholders = "(" + POST_COLUMNS.map(() => "?").join(", ") + ")";
  const updateSet = POST_COLUMNS
    .filter((c) => c !== "tenant_id" && c !== "post_url")
    .map((c) => `${c} = COALESCE(excluded.${c}, posts.${c})`)
    .join(", ");
  const sql =
    `INSERT INTO posts (${POST_COLUMNS.join(", ")}) VALUES ${placeholders} ` +
    `ON CONFLICT(tenant_id, post_url) WHERE post_url IS NOT NULL DO UPDATE SET ${updateSet}`;

  // D1 batches one prepared statement per row — keeps each round-trip small.
  const stmts = valid.map((p) => env.DB.prepare(sql).bind(...postInputToBindings(p)));

  // Chunk so a single batch never exceeds D1's per-request size budget.
  const CHUNK = 100;
  let upserted = 0;
  try {
    for (let i = 0; i < stmts.length; i += CHUNK) {
      const slice = stmts.slice(i, i + CHUNK);
      const results = await env.DB.batch(slice);
      for (const r of results) {
        const changes = (r as { meta?: { changes?: number } }).meta?.changes ?? 0;
        upserted += changes;
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(req, { error: "upsert failed", message }, 500);
  }

  return json(req, { upserted, skipped });
}

// ── D1 posts CRUD ──
//
// GET    /api/posts/d1            ?type=&companyId=&companyKey=&contactId=&limit=&offset=
// GET    /api/posts/d1/:id
// DELETE /api/posts/d1/:id
//   headers: Authorization: Bearer <JOBS_D1_TOKEN>

async function handlePostsD1List(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "GET") return json(req, { error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.JOBS_D1_TOKEN || !token || !constantTimeEq(token, env.JOBS_D1_TOKEN)) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const companyId = url.searchParams.get("companyId");
  const companyKey = url.searchParams.get("companyKey");
  const contactId = url.searchParams.get("contactId");
  const tenantId = url.searchParams.get("tenantId") ?? "public";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 500);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);

  const conds: string[] = ["tenant_id = ?"];
  const binds: unknown[] = [tenantId];
  if (type) { conds.push("type = ?"); binds.push(type); }
  if (companyId) { conds.push("company_id = ?"); binds.push(parseInt(companyId, 10)); }
  if (companyKey) { conds.push("company_key = ?"); binds.push(companyKey); }
  if (contactId) { conds.push("contact_id = ?"); binds.push(parseInt(contactId, 10)); }

  const sqlText = `SELECT * FROM posts WHERE ${conds.join(" AND ")} ORDER BY id DESC LIMIT ? OFFSET ?`;
  const res = await env.DB.prepare(sqlText).bind(...binds, limit, offset).all();
  const posts = (res.results ?? []) as Array<Record<string, unknown>>;
  return json(req, { count: posts.length, posts });
}

async function handlePostsD1GetOrDelete(
  req: Request,
  env: Env,
  id: number,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.JOBS_D1_TOKEN || !token || !constantTimeEq(token, env.JOBS_D1_TOKEN)) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  if (req.method === "GET") {
    const r = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first();
    if (!r) return json(req, { error: "Not found" }, 404);
    return json(req, { post: r });
  }
  if (req.method === "DELETE") {
    const r = await env.DB.prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run();
    const changes = (r as { meta?: { changes?: number } }).meta?.changes ?? 0;
    return json(req, { deleted: changes > 0, changes });
  }
  return json(req, { error: "Method not allowed" }, 405);
}

// ── D1 posts read: fetch LinkedIn posts for a company by slug ──
//
// GET /api/companies/:slug/posts/d1[?limit=N]
//   headers: Authorization: Bearer <JOBS_D1_TOKEN>
//   reply:   { company_key, count, posts: [...] }

async function handleCompanyPostsD1(
  req: Request,
  env: Env,
  slug: string,
): Promise<Response> {
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
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "1000", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 5000) : 1000;

  const res = await env.DB.prepare(
    `SELECT id, company_key, author_kind, author_name, author_url, post_url,
            post_text, posted_date, reactions_count, comments_count, reposts_count,
            media_type, is_repost, original_author, scraped_at
       FROM posts
      WHERE company_key = ?
      ORDER BY id DESC
      LIMIT ?`,
  )
    .bind(slug, limit)
    .all();

  const posts = (res.results ?? []) as Array<Record<string, unknown>>;
  return json(req, { company_key: slug, count: posts.length, posts });
}

// ── D1 contact_visits (audit + dedup for Browse Recruiters) ──
//
// POST /api/contacts/d1/visits         — upsert one visit row
// POST /api/contacts/d1/visits/recent  — bulk-check which URLs were visited within N days
//   Both require Authorization: Bearer <JOBS_D1_TOKEN>.

async function handleContactVisitsRecord(
  req: Request,
  env: Env,
): Promise<Response> {
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

  let body: {
    contact_id?: number | null;
    linkedin_url?: string;
    ok?: boolean;
    reason?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  const linkedinUrl = (body.linkedin_url ?? "").trim();
  if (!linkedinUrl) {
    return json(req, { error: "linkedin_url required" }, 400);
  }
  // contact_id may be null when the visit failed before a contact was created.
  // Coerce to 0 so the NOT NULL column is satisfied; a downstream join can
  // treat 0 as "no contact yet".
  const contactId = Number.isFinite(body.contact_id) ? Number(body.contact_id) : 0;
  const okValue = body.ok === false ? 0 : 1;
  const reason = (body.reason ?? "").slice(0, 200) || null;

  try {
    const row = await env.DB.prepare(
      `INSERT INTO contact_visits (contact_id, linkedin_url, ok, reason)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(linkedin_url) DO UPDATE SET
         visited_at = CURRENT_TIMESTAMP,
         contact_id = excluded.contact_id,
         ok         = excluded.ok,
         reason     = excluded.reason
       RETURNING id, visited_at`,
    )
      .bind(contactId, linkedinUrl, okValue, reason)
      .first<{ id: number; visited_at: string }>();

    return json(req, { id: row?.id ?? null, visited_at: row?.visited_at ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(req, { error: "visit upsert failed", message }, 500);
  }
}

// ── D1 recruiter_fit_scores (output of score_recruiter_fit langgraph) ──
//
// POST /api/contacts/d1/recruiter-fit/upsert
//   body:    { contact_id?, linkedin_url, fit_score, tier, specialty,
//              remote_global?, reasons? }
//   reply:   { id, scored_at }
//   Upserts on linkedin_url. Requires Authorization: Bearer <JOBS_D1_TOKEN>.

async function handleRecruiterFitUpsert(
  req: Request,
  env: Env,
): Promise<Response> {
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

  let body: {
    contact_id?: number | null;
    linkedin_url?: string;
    fit_score?: number;
    tier?: string;
    specialty?: string;
    remote_global?: boolean | null;
    reasons?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  const linkedinUrl = (body.linkedin_url ?? "").trim();
  if (!linkedinUrl) {
    return json(req, { error: "linkedin_url required" }, 400);
  }
  const fitScore = Number.isFinite(body.fit_score) ? Number(body.fit_score) : null;
  if (fitScore === null) {
    return json(req, { error: "fit_score required" }, 400);
  }
  const tier = (body.tier ?? "").trim();
  if (!["ideal", "strong", "weak", "off_target"].includes(tier)) {
    return json(req, { error: "tier must be ideal|strong|weak|off_target" }, 400);
  }
  const specialty = (body.specialty ?? "").trim();
  if (!["ai_ml", "engineering_general", "non_technical", "unknown"].includes(specialty)) {
    return json(req, { error: "specialty invalid" }, 400);
  }
  const contactId = Number.isFinite(body.contact_id) ? Number(body.contact_id) : null;
  const remoteGlobal =
    body.remote_global === true ? 1 : body.remote_global === false ? 0 : null;
  const reasons = Array.isArray(body.reasons) ? body.reasons.slice(0, 3) : [];
  const reasonsJson = JSON.stringify(reasons);

  try {
    const row = await env.DB.prepare(
      `INSERT INTO recruiter_fit_scores
         (contact_id, linkedin_url, fit_score, tier, specialty, remote_global, reasons)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(linkedin_url) DO UPDATE SET
         contact_id    = excluded.contact_id,
         fit_score     = excluded.fit_score,
         tier          = excluded.tier,
         specialty     = excluded.specialty,
         remote_global = excluded.remote_global,
         reasons       = excluded.reasons,
         scored_at     = CURRENT_TIMESTAMP
       RETURNING id, scored_at`,
    )
      .bind(contactId, linkedinUrl, fitScore, tier, specialty, remoteGlobal, reasonsJson)
      .first<{ id: number; scored_at: string }>();

    return json(req, { id: row?.id ?? null, scored_at: row?.scored_at ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(req, { error: "fit-score upsert failed", message }, 500);
  }
}

// ── D1 linkedin_browsemap (capture "More profiles for you" sidebar) ──
//
// POST /api/linkedin/d1/browsemap/upsert
//   body:    { source_profile_url, recommendations: [{ profile_url, slug, name,
//              headline?, degree?, is_verified?, is_premium?, avatar_url?, position? }] }
//   reply:   { ok: true, count }
//   Bumps last_seen_at on conflict; first_seen_at survives.
//   Requires Authorization: Bearer <JOBS_D1_TOKEN>.

interface IncomingBrowsemapItem {
  profile_url?: unknown;
  slug?: unknown;
  name?: unknown;
  headline?: unknown;
  degree?: unknown;
  is_verified?: unknown;
  is_premium?: unknown;
  avatar_url?: unknown;
  position?: unknown;
}

async function handleBrowsemapUpsert(
  req: Request,
  env: Env,
): Promise<Response> {
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

  let body: {
    source_profile_url?: string;
    recommendations?: IncomingBrowsemapItem[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  const sourceUrl = (body.source_profile_url ?? "").trim();
  if (!sourceUrl) {
    return json(req, { error: "source_profile_url required" }, 400);
  }
  const items = Array.isArray(body.recommendations) ? body.recommendations : [];
  if (items.length === 0) {
    return json(req, { ok: true, count: 0 });
  }

  const stmts = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const profileUrl = asString(raw?.profile_url);
    const slug = asString(raw?.slug);
    const name = asString(raw?.name);
    if (!profileUrl || !slug || !name) continue;
    if (seen.has(profileUrl)) continue;
    seen.add(profileUrl);

    const headline = asString(raw?.headline);
    const degree = asString(raw?.degree);
    const isVerified = raw?.is_verified ? 1 : 0;
    const isPremium = raw?.is_premium ? 1 : 0;
    const avatarUrl = asString(raw?.avatar_url);
    const position = Number.isFinite(raw?.position) ? Number(raw?.position) : null;

    stmts.push(
      env.DB.prepare(
        `INSERT INTO linkedin_browsemap (
           source_profile_url, recommended_profile_url, recommended_slug,
           recommended_name, recommended_headline, connection_degree,
           is_verified, is_premium, avatar_url, position, last_seen_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP)
         ON CONFLICT(source_profile_url, recommended_profile_url) DO UPDATE SET
           recommended_name     = excluded.recommended_name,
           recommended_headline = excluded.recommended_headline,
           connection_degree    = excluded.connection_degree,
           is_verified          = excluded.is_verified,
           is_premium           = excluded.is_premium,
           avatar_url           = excluded.avatar_url,
           position             = excluded.position,
           last_seen_at         = CURRENT_TIMESTAMP`,
      ).bind(
        sourceUrl,
        profileUrl,
        slug,
        name,
        headline,
        degree,
        isVerified,
        isPremium,
        avatarUrl,
        position,
      ),
    );
  }

  if (stmts.length === 0) return json(req, { ok: true, count: 0 });

  try {
    await env.DB.batch(stmts);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(req, { error: "browsemap upsert failed", message }, 500);
  }

  return json(req, { ok: true, count: stmts.length });
}

async function handleContactVisitsRecent(
  req: Request,
  env: Env,
): Promise<Response> {
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

  let body: { urls?: string[]; since_days?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  const urls = Array.isArray(body.urls)
    ? body.urls.filter((u) => typeof u === "string" && u.length > 0)
    : [];
  if (urls.length === 0) return json(req, { visited: {} });

  const sinceDays = Number.isFinite(body.since_days) ? Number(body.since_days) : 7;
  const sinceClause = `-${Math.max(0, Math.floor(sinceDays))} days`;

  // Chunk to keep the IN-list bind count bounded (D1 caps at ~100 binds per stmt).
  const CHUNK = 90;
  const visited: Record<string, string> = {};
  try {
    for (let i = 0; i < urls.length; i += CHUNK) {
      const slice = urls.slice(i, i + CHUNK);
      const placeholders = slice.map(() => "?").join(",");
      const sql =
        `SELECT linkedin_url, visited_at FROM contact_visits ` +
        `WHERE visited_at >= datetime('now', ?) ` +
        `AND linkedin_url IN (${placeholders})`;
      const res = await env.DB.prepare(sql).bind(sinceClause, ...slice).all();
      for (const row of (res.results ?? []) as Array<{
        linkedin_url: string;
        visited_at: string;
      }>) {
        visited[row.linkedin_url] = row.visited_at;
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(req, { error: "visit lookup failed", message }, 500);
  }

  return json(req, { visited });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/api/jobs/d1/import") {
      return handleJobsD1Import(req, env);
    }
    if (url.pathname === "/api/jobs/d1/known-ashby-slugs") {
      return handleKnownAshbySlugs(req, env);
    }
    if (url.pathname === "/api/jobs/d1/opportunities") {
      return handleJobsD1List(req, env);
    }
    if (url.pathname === "/api/jobs/d1/opportunities/archive") {
      return handleJobsD1Archive(req, env);
    }
    if (url.pathname === "/api/jobs/d1/opportunities/status") {
      return handleJobsD1Status(req, env);
    }

    // GET /api/companies/:slug/posts/d1
    {
      const m = /^\/api\/companies\/([^/]+)\/posts\/d1\/?$/.exec(url.pathname);
      if (m) return handleCompanyPostsD1(req, env, decodeURIComponent(m[1]));
    }

    // POST /api/posts/d1/upsert
    if (url.pathname === "/api/posts/d1/upsert") {
      return handlePostsD1Upsert(req, env);
    }

    // GET /api/posts/d1
    if (url.pathname === "/api/posts/d1") {
      return handlePostsD1List(req, env);
    }

    // GET / DELETE /api/posts/d1/:id
    {
      const m = /^\/api\/posts\/d1\/(\d+)\/?$/.exec(url.pathname);
      if (m) return handlePostsD1GetOrDelete(req, env, parseInt(m[1], 10));
    }

    // POST /api/contacts/d1/visits — record a profile visit (upsert)
    if (url.pathname === "/api/contacts/d1/visits") {
      return handleContactVisitsRecord(req, env);
    }
    // POST /api/contacts/d1/visits/recent — bulk-check recent visits
    if (url.pathname === "/api/contacts/d1/visits/recent") {
      return handleContactVisitsRecent(req, env);
    }
    // POST /api/linkedin/d1/browsemap/upsert — capture sidebar recommendations
    if (url.pathname === "/api/linkedin/d1/browsemap/upsert") {
      return handleBrowsemapUpsert(req, env);
    }
    // POST /api/contacts/d1/recruiter-fit/upsert — persist score_recruiter_fit graph output
    if (url.pathname === "/api/contacts/d1/recruiter-fit/upsert") {
      return handleRecruiterFitUpsert(req, env);
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
