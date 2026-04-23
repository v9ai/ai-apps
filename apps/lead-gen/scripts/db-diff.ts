#!/usr/bin/env -S pnpm tsx
/**
 * db-diff — minimal schema/DB drift check.
 *
 * Compares a small allow-list of expected tables + columns against the live
 * Neon DB (via NEON_DATABASE_URL / DATABASE_URL) using information_schema.
 *
 * Exits non-zero if any expected column is missing. Missing-tables produce a
 * warning and are skipped (useful while migrations are in-flight across teams).
 */
import dotenv from "dotenv";

// Load env BEFORE importing @/db (which reads process.env at import time).
// Prefer .env.local (Next.js convention); fall back to .env.
dotenv.config({ path: ".env.local" });
dotenv.config();

const EXPECTED_TABLES_KEY_COLUMNS: Record<string, string[]> = {
  products: [
    "id",
    "name",
    "slug",
    "icp_analysis",
    "pricing_analysis",
    "gtm_analysis",
    "intel_report",
    "published_at",
  ],
  product_intel_runs: ["id", "product_id", "kind", "status"],
  product_intel_run_secrets: ["run_id", "secret"],
};

async function main() {
  // Dynamic import so dotenv above runs first.
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");

  let hadError = false;

  for (const [table, cols] of Object.entries(EXPECTED_TABLES_KEY_COLUMNS)) {
    const result: any = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
    `);

    // drizzle-orm/neon-http returns { rows: [...] }; raw neon returns an array.
    const rows: Array<{ column_name: string }> = Array.isArray(result)
      ? result
      : Array.isArray(result?.rows)
        ? result.rows
        : [];

    if (rows.length === 0) {
      console.warn(
        `[db-diff] ${table} NOT FOUND in live DB (skipping — may be pending migration)`,
      );
      continue;
    }

    const actual = new Set(rows.map((r) => r.column_name));
    const missing = cols.filter((c) => !actual.has(c));
    if (missing.length) {
      console.error(`[db-diff] ${table} missing columns:`, missing);
      hadError = true;
    } else {
      console.log(`[db-diff] ${table} OK`);
    }
  }

  if (hadError) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
