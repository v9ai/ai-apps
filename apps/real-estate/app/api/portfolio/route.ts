import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function getSQL() {
  return neon(process.env.DATABASE_URL!);
}

async function ensureTable() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS watchlist (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      label TEXT,
      listing JSONB NOT NULL,
      valuation JSONB NOT NULL,
      comparables JSONB DEFAULT '[]',
      zone_stats JSONB,
      source TEXT DEFAULT 'unknown',
      analyzed_at TIMESTAMPTZ DEFAULT NOW(),
      added_at TIMESTAMPTZ DEFAULT NOW(),
      last_checked_at TIMESTAMPTZ DEFAULT NOW(),
      alert_threshold_pct REAL DEFAULT 5.0,
      prev_price_eur REAL,
      prev_price_per_m2 REAL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS watchlist_alerts (
      id SERIAL PRIMARY KEY,
      watchlist_url TEXT NOT NULL REFERENCES watchlist(url) ON DELETE CASCADE,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      detected_at TIMESTAMPTZ DEFAULT NOW(),
      seen BOOLEAN DEFAULT FALSE
    )
  `;
}

export async function GET() {
  await ensureTable();
  const sql = getSQL();

  const [items, alerts] = await Promise.all([
    sql`
      SELECT url, label, listing, valuation, comparables, zone_stats,
             source, analyzed_at, added_at, last_checked_at,
             alert_threshold_pct, prev_price_eur, prev_price_per_m2
      FROM watchlist
      ORDER BY added_at DESC
    `,
    sql`
      SELECT id, watchlist_url, field, old_value, new_value, detected_at, seen
      FROM watchlist_alerts
      ORDER BY detected_at DESC
    `,
  ]);

  return NextResponse.json({ items, alerts });
}

export async function POST(req: NextRequest) {
  await ensureTable();
  const body = await req.json();

  // Handle "mark alerts read" action
  if (body.action === "mark_alerts_read") {
    const sql = getSQL();
    await sql`UPDATE watchlist_alerts SET seen = TRUE WHERE seen = FALSE`;
    return NextResponse.json({ ok: true });
  }

  const { url, label, listing, valuation, comparables, zone_stats, source, analyzed_at } = body;

  if (!url || !listing || !valuation) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sql = getSQL();

  // Check if already in watchlist — if so, detect price changes
  const existing = await sql`SELECT listing, valuation FROM watchlist WHERE url = ${url}`;

  if (existing.length > 0) {
    const oldListing = existing[0].listing;
    const oldValuation = existing[0].valuation;
    const changes: { field: string; old_value: string; new_value: string }[] = [];

    if (oldListing.price_eur != null && listing.price_eur != null && oldListing.price_eur !== listing.price_eur) {
      changes.push({
        field: "price_eur",
        old_value: String(oldListing.price_eur),
        new_value: String(listing.price_eur),
      });
    }
    if (oldListing.price_per_m2 != null && listing.price_per_m2 != null && oldListing.price_per_m2 !== listing.price_per_m2) {
      changes.push({
        field: "price_per_m2",
        old_value: String(oldListing.price_per_m2),
        new_value: String(listing.price_per_m2),
      });
    }
    if (oldValuation.verdict !== valuation.verdict) {
      changes.push({
        field: "verdict",
        old_value: oldValuation.verdict,
        new_value: valuation.verdict,
      });
    }

    for (const c of changes) {
      await sql`
        INSERT INTO watchlist_alerts (watchlist_url, field, old_value, new_value)
        VALUES (${url}, ${c.field}, ${c.old_value}, ${c.new_value})
      `;
    }
  }

  await sql`
    INSERT INTO watchlist (url, label, listing, valuation, comparables, zone_stats, source, analyzed_at, last_checked_at, prev_price_eur, prev_price_per_m2)
    VALUES (
      ${url},
      ${label ?? null},
      ${JSON.stringify(listing)},
      ${JSON.stringify(valuation)},
      ${JSON.stringify(comparables ?? [])},
      ${zone_stats ? JSON.stringify(zone_stats) : null},
      ${source ?? "unknown"},
      ${analyzed_at ?? new Date().toISOString()},
      NOW(),
      ${listing.price_eur ?? null},
      ${listing.price_per_m2 ?? null}
    )
    ON CONFLICT (url) DO UPDATE SET
      label = COALESCE(EXCLUDED.label, watchlist.label),
      listing = EXCLUDED.listing,
      valuation = EXCLUDED.valuation,
      comparables = EXCLUDED.comparables,
      zone_stats = EXCLUDED.zone_stats,
      source = EXCLUDED.source,
      analyzed_at = EXCLUDED.analyzed_at,
      last_checked_at = NOW(),
      prev_price_eur = watchlist.listing->>'price_eur',
      prev_price_per_m2 = watchlist.listing->>'price_per_m2'
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureTable();
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const sql = getSQL();
  await sql`DELETE FROM watchlist WHERE url = ${url}`;

  return NextResponse.json({ ok: true });
}
