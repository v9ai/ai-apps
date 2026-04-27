/**
 * Backfill Neon `linkedin_posts` rows into D1 `posts`.
 *
 * Idempotent — uses the edge `/api/posts/d1/upsert` route, which dedupes
 * via UNIQUE(tenant_id, post_url). Safe to re-run.
 *
 * As of 2026-04-27 the Neon table is empty (legacy code paths never wrote
 * to it under the current architecture), so this script is primarily a
 * safety net for the cutover and a reusable copy-script if rows reappear.
 *
 * Usage:
 *   dotenv -f .env.local run -- pnpm tsx scripts/backfill-linkedin-posts-to-d1.ts [--limit N] [--batch 200]
 *
 * Env (from .env.local):
 *   LEAD_GEN_EDGE_URL  e.g. https://agenticleadgen-edge.eeeew.workers.dev
 *   JOBS_D1_TOKEN      bearer token for the edge worker
 */

import { db } from "@/db";
import { linkedinPosts, companies } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const DEFAULT_BATCH = 200;
const DEFAULT_LIMIT = Number.MAX_SAFE_INTEGER;

interface UpsertInput {
  tenant_id: string;
  type: string;
  company_key: string;
  contact_id: number | null;
  author_kind: string;
  author_name: string | null;
  author_url: string | null;
  post_url: string;
  post_text: string | null;
  title: string | null;
  content: string | null;
  posted_at: string | null;
  posted_date: string | null;
  scraped_at: string | null;
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
  voyager_reposted: boolean;
  company_name: string | null;
  company_industry: string | null;
  company_size_range: string | null;
  company_location: string | null;
}

function parseArgs(): { limit: number; batch: number } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    limit: parseInt(get("--limit") ?? String(DEFAULT_LIMIT), 10),
    batch: parseInt(get("--batch") ?? String(DEFAULT_BATCH), 10),
  };
}

async function postBatch(inputs: UpsertInput[]): Promise<{ upserted: number; skipped: number }> {
  const baseUrl = process.env.LEAD_GEN_EDGE_URL;
  const token = process.env.JOBS_D1_TOKEN;
  if (!baseUrl) throw new Error("LEAD_GEN_EDGE_URL not set");
  if (!token) throw new Error("JOBS_D1_TOKEN not set");

  const r = await fetch(`${baseUrl}/api/posts/d1/upsert`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ inputs }),
  });
  if (!r.ok) throw new Error(`edge ${r.status}: ${await r.text()}`);
  return (await r.json()) as { upserted: number; skipped: number };
}

async function main() {
  const { limit, batch } = parseArgs();

  // Short-circuit: if Neon's table is empty (the documented current state),
  // exit before issuing the wide SELECT — Drizzle's generated SELECT * will
  // 500 against drifted schemas, and there's nothing to copy anyway.
  const countRow = await db.execute(sql`SELECT COUNT(*)::int AS n FROM linkedin_posts`);
  const total = (countRow.rows[0] as { n: number } | undefined)?.n ?? 0;
  if (total === 0) {
    console.log("Neon linkedin_posts is empty — nothing to backfill.");
    process.exit(0);
  }
  console.log(`Backfilling ${total} rows from Neon to D1...`);

  // Stream rows in pages, joining to companies for the denormalized fields.
  // job_embedding is cast via ::text so pgvector serializes as JSON-shaped string.
  let offset = 0;
  let totalRead = 0;
  let totalUpserted = 0;
  let totalSkipped = 0;

  for (;;) {
    const remaining = Math.max(0, limit - totalRead);
    if (remaining === 0) break;
    const take = Math.min(batch, remaining);

    const rows = await db
      .select({
        post: linkedinPosts,
        company_key: companies.key,
        company_name: companies.name,
        // companies.industry / companies.size_range may not exist in every
        // tenant — guard via Drizzle if absent. For now we read defensively.
      })
      .from(linkedinPosts)
      .leftJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .orderBy(linkedinPosts.id)
      .limit(take)
      .offset(offset);

    if (rows.length === 0) break;

    // Pull the embedding column as text in a parallel query — pgvector via
    // Drizzle is awkward; raw SQL is easier and we avoid loading into the
    // generated schema.
    const ids = rows.map((r) => r.post.id);
    const embRows = await db.execute(
      sql`SELECT id, job_embedding::text AS emb FROM linkedin_posts WHERE id = ANY(${ids})`,
    );
    const embById = new Map<number, string | null>();
    for (const e of embRows.rows as Array<{ id: number; emb: string | null }>) {
      embById.set(e.id, e.emb);
    }

    const inputs: UpsertInput[] = rows
      .filter((r) => r.post.url && r.company_key) // skip rows without join target
      .map((r) => ({
        tenant_id: r.post.tenant_id ?? "public",
        type: r.post.type ?? "post",
        company_key: r.company_key!,
        contact_id: r.post.contact_id ?? null,
        author_kind: "company", // legacy linkedin_posts has no author_kind; default to 'company' for company_id-keyed rows
        author_name: r.post.author_name ?? null,
        author_url: r.post.author_url ?? null,
        post_url: r.post.url!,
        post_text: r.post.content ?? null,
        title: r.post.title ?? null,
        content: r.post.content ?? null,
        posted_at: r.post.posted_at ?? null,
        posted_date: null, // human-readable string only exists for D1-native scrapes
        scraped_at: r.post.scraped_at ?? null,
        location: r.post.location ?? null,
        employment_type: r.post.employment_type ?? null,
        raw_data: r.post.raw_data ?? null,
        skills: r.post.skills ?? null,
        analyzed_at: r.post.analyzed_at ?? null,
        job_embedding: embById.get(r.post.id) ?? null,
        voyager_urn: r.post.voyager_urn ?? null,
        voyager_workplace_type: r.post.voyager_workplace_type ?? null,
        voyager_salary_min: r.post.voyager_salary_min ?? null,
        voyager_salary_max: r.post.voyager_salary_max ?? null,
        voyager_salary_currency: r.post.voyager_salary_currency ?? null,
        voyager_apply_url: r.post.voyager_apply_url ?? null,
        voyager_poster_urn: r.post.voyager_poster_urn ?? null,
        voyager_listed_at: r.post.voyager_listed_at ?? null,
        voyager_reposted: !!r.post.voyager_reposted,
        company_name: r.company_name ?? null,
        company_industry: null,
        company_size_range: null,
        company_location: null,
      }));

    if (inputs.length > 0) {
      const result = await postBatch(inputs);
      totalUpserted += result.upserted;
      totalSkipped += result.skipped;
    }
    totalRead += rows.length;
    offset += rows.length;

    console.log(
      `  rows ${offset - rows.length}..${offset}: read=${rows.length} upserted=${totalUpserted} skipped=${totalSkipped}`,
    );

    if (rows.length < take) break;
  }

  console.log(
    `\nDone. read=${totalRead} upserted=${totalUpserted} skipped=${totalSkipped}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
