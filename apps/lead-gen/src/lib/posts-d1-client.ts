/**
 * Single fetch wrapper for the D1 posts data plane (edge worker).
 *
 * Used by Apollo resolvers (linkedin-posts.ts) and the intent scripts
 * (detect-intent-signals.ts, competitor-mention.ts, voyager-pipeline.ts)
 * after the Neon -> D1 cutover. All calls go through the bearer-authed
 * edge routes, so secrets never leave the server.
 */

const TENANT_ID = "public";
const DEFAULT_EDGE_URL = "https://agenticleadgen-edge.eeeew.workers.dev";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

/**
 * The edge worker URL is set as `LEAD_GEN_EDGE_URL` in local .env and as
 * `EDGE_WORKER_URL` in Vercel prod (different name, same value). Accept
 * either and fall back to the canonical `*.workers.dev` host so server
 * components don't 500 when the alias isn't set on a particular env.
 */
function resolveEdgeUrl(): string {
  return (
    process.env.LEAD_GEN_EDGE_URL ||
    process.env.EDGE_WORKER_URL ||
    DEFAULT_EDGE_URL
  );
}

async function edge<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const baseUrl = resolveEdgeUrl();
  const token = envOrThrow("JOBS_D1_TOKEN");
  const r = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`edge ${method} ${path} -> ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

export interface D1PostRow {
  id: number;
  tenant_id: string;
  type: "post" | "job";
  company_id: number | null;
  company_key: string;
  contact_id: number | null;
  author_kind: "company" | "person";
  author_name: string | null;
  author_url: string | null;
  post_url: string;
  post_text: string | null;
  title: string | null;
  content: string | null;
  posted_date: string | null;
  posted_at: string | null;
  scraped_at: string;
  reactions_count: number;
  comments_count: number;
  reposts_count: number;
  media_type: string;
  is_repost: number;
  original_author: string | null;
  location: string | null;
  employment_type: string | null;
  raw_data: string | null;
  skills: string | null;
  analyzed_at: string | null;
  job_embedding: string | null;
  voyager_urn: string | null;
  voyager_workplace_type: string | null;
  voyager_salary_min: number | null;
  voyager_salary_max: number | null;
  voyager_salary_currency: string | null;
  voyager_apply_url: string | null;
  voyager_poster_urn: string | null;
  voyager_listed_at: string | null;
  voyager_reposted: number;
  company_name: string | null;
  company_industry: string | null;
  company_size_range: string | null;
  company_location: string | null;
}

export interface UpsertPostInput {
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
  posted_at?: string | null;
  posted_date?: string | null;
  scraped_at?: string | null;
  reactions_count?: number;
  comments_count?: number;
  reposts_count?: number;
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
}

export interface ListFilters {
  type?: "post" | "job";
  companyId?: number;
  companyKey?: string;
  contactId?: number;
  limit?: number;
  offset?: number;
  tenantId?: string;
}

function buildQuery(f: ListFilters): string {
  const p = new URLSearchParams();
  if (f.type) p.set("type", f.type);
  if (f.companyId !== undefined) p.set("companyId", String(f.companyId));
  if (f.companyKey) p.set("companyKey", f.companyKey);
  if (f.contactId !== undefined) p.set("contactId", String(f.contactId));
  if (f.limit !== undefined) p.set("limit", String(f.limit));
  if (f.offset !== undefined) p.set("offset", String(f.offset));
  p.set("tenantId", f.tenantId ?? TENANT_ID);
  return p.toString();
}

export async function listD1Posts(filters: ListFilters): Promise<D1PostRow[]> {
  const r = await edge<{ count: number; posts: D1PostRow[] }>(
    "GET",
    `/api/posts/d1?${buildQuery(filters)}`,
  );
  return r.posts;
}

export async function getD1Post(id: number): Promise<D1PostRow | null> {
  try {
    const r = await edge<{ post: D1PostRow }>("GET", `/api/posts/d1/${id}`);
    return r.post ?? null;
  } catch (e: any) {
    if (typeof e.message === "string" && e.message.includes(" -> 404:")) return null;
    throw e;
  }
}

export async function deleteD1Post(id: number): Promise<boolean> {
  const r = await edge<{ deleted: boolean; changes: number }>("DELETE", `/api/posts/d1/${id}`);
  return r.deleted;
}

export async function upsertD1Posts(
  inputs: UpsertPostInput[],
): Promise<{ upserted: number; skipped: number }> {
  return edge<{ upserted: number; skipped: number }>(
    "POST",
    `/api/posts/d1/upsert`,
    { inputs },
  );
}

export async function listD1PostsByCompanyKey(
  companyKey: string,
  limit = 1000,
): Promise<D1PostRow[]> {
  const r = await edge<{ company_key: string; count: number; posts: D1PostRow[] }>(
    "GET",
    `/api/companies/${encodeURIComponent(companyKey)}/posts/d1?limit=${limit}`,
  );
  return r.posts;
}
