import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, source, listing, valuation, comparables, zone_stats, analyzed_at } = body;

  if (!url || !listing || !valuation) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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
  `;

  return NextResponse.json({ ok: true });
}
