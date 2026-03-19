import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function getSQL() {
  return neon(process.env.DATABASE_URL!);
}

// ── Typed response helpers ──────────────────────────────────────────

type ApiSuccess<T> = { data: T; error?: never };
type ApiError = { data?: never; error: string; status: number };

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data } satisfies ApiSuccess<T>, { status });
}

function fail(error: string, status: number) {
  return NextResponse.json({ error, status } satisfies ApiError, { status });
}

// ── Types ───────────────────────────────────────────────────────────

export type AnalysisRow = {
  url: string;
  source: string;
  listing: Record<string, unknown>;
  valuation: Record<string, unknown>;
  comparables: Record<string, unknown>[];
  zone_stats: Record<string, unknown> | null;
  analyzed_at: string;
  price_history: { url: string; price_eur: number; price_per_m2: number | null; scraped_at: string }[];
};

export type AnalysisListResponse = {
  items: AnalysisRow[];
  total: number;
  page: number;
  limit: number;
};

// ── GET: List analyses with filtering, pagination & total count ─────

export async function GET(req: NextRequest) {
  const sql = getSQL();
  const { searchParams } = new URL(req.url);

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const offset = (page - 1) * limit;

  // Filters
  const city = searchParams.get("city");
  const verdict = searchParams.get("verdict");
  const minScore = searchParams.get("minScore") ? parseFloat(searchParams.get("minScore")!) : null;
  const source = searchParams.get("source");

  try {
    // Build WHERE conditions using the JSONB listing/valuation columns
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (city) {
      conditions.push(`listing->>'city' ILIKE $${paramIdx}`);
      params.push(`%${city}%`);
      paramIdx++;
    }
    if (verdict) {
      conditions.push(`valuation->>'verdict' ILIKE $${paramIdx}`);
      params.push(`%${verdict}%`);
      paramIdx++;
    }
    if (minScore !== null && !isNaN(minScore)) {
      conditions.push(`(valuation->>'investment_score')::numeric >= $${paramIdx}`);
      params.push(minScore);
      paramIdx++;
    }
    if (source) {
      conditions.push(`source = $${paramIdx}`);
      params.push(source);
      paramIdx++;
    }

    const url = searchParams.get("url");
    if (url) {
      conditions.push(`url = $${paramIdx}`);
      params.push(url);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count + paginated rows in parallel
    const [countResult, analyses, snapshots] = await Promise.all([
      sql(
        `SELECT COUNT(*)::int AS total FROM analysis_results ${whereClause}`,
        params,
      ),
      sql(
        `SELECT url, source, listing, valuation, comparables, zone_stats, analyzed_at
         FROM analysis_results
         ${whereClause}
         ORDER BY analyzed_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset],
      ),
      sql`
        SELECT url, price_eur, price_per_m2, scraped_at
        FROM price_snapshots
        ORDER BY scraped_at ASC
      `,
    ]);

    // Group snapshots by URL
    const historyByUrl: Record<string, typeof snapshots> = {};
    for (const s of snapshots) {
      (historyByUrl[s.url] ??= []).push(s);
    }

    const items = analyses.map((a) => ({
      ...a,
      price_history: historyByUrl[a.url] ?? [],
    }));

    const total = countResult[0]?.total ?? 0;

    return ok<AnalysisListResponse>({ items: items as unknown as AnalysisRow[], total, page, limit });
  } catch (err) {
    console.error("[save-analysis GET]", err);
    return fail("Failed to fetch analyses", 500);
  }
}

// ── POST: Save / upsert an analysis ─────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const { url, source, listing, valuation, comparables, zone_stats, analyzed_at } = body as {
    url?: string;
    source?: string;
    listing?: Record<string, unknown>;
    valuation?: Record<string, unknown>;
    comparables?: unknown[];
    zone_stats?: Record<string, unknown>;
    analyzed_at?: string;
  };

  if (!url || typeof url !== "string") {
    return fail("Missing or invalid 'url' field", 400);
  }
  if (!listing || typeof listing !== "object") {
    return fail("Missing or invalid 'listing' field", 400);
  }
  if (!valuation || typeof valuation !== "object") {
    return fail("Missing or invalid 'valuation' field", 400);
  }

  const sql = getSQL();

  try {
    // Upsert analysis
    await sql`
      INSERT INTO analysis_results (url, source, listing, valuation, comparables, zone_stats, analyzed_at)
      VALUES (
        ${url},
        ${source ?? "unknown"},
        ${JSON.stringify(listing)},
        ${JSON.stringify(valuation)},
        ${JSON.stringify(comparables ?? [])},
        ${zone_stats ? JSON.stringify(zone_stats) : null},
        ${analyzed_at ?? new Date().toISOString()}
      )
      ON CONFLICT (url) DO UPDATE SET
        source = EXCLUDED.source,
        listing = EXCLUDED.listing,
        valuation = EXCLUDED.valuation,
        comparables = EXCLUDED.comparables,
        zone_stats = EXCLUDED.zone_stats,
        analyzed_at = EXCLUDED.analyzed_at,
        saved_at = NOW()
    `;

    // Record price snapshot (only if price exists and is new)
    const priceEur = listing.price_eur as number | undefined;
    const pricePerm2 = listing.price_per_m2 as number | undefined;
    if (priceEur != null) {
      await sql`
        INSERT INTO price_snapshots (url, price_eur, price_per_m2)
        VALUES (${url}, ${priceEur}, ${pricePerm2 ?? null})
        ON CONFLICT (url, price_eur) DO NOTHING
      `;
    }

    return ok({ saved: true, url });
  } catch (err) {
    console.error("[save-analysis POST]", err);
    return fail("Failed to save analysis", 500);
  }
}
