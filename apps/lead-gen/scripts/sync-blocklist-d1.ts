/**
 * Sync blocked-company keys from Neon → D1 `blocked_company_keys`.
 *
 * Source of truth: `companies.blocked = true` in Neon.
 * Target: D1 (`lead-gen-jobs`) keyed in the same `companyKey()` format
 * used by edge/src/index.ts so the chrome-extension import filter can
 * match incoming jobs by either `li:<slug>` or `name:<slug>`.
 *
 * Usage:
 *   pnpm sync:blocklist:d1            # --local (default, safe)
 *   pnpm sync:blocklist:d1 --remote   # push to production D1
 *
 * Apply migration first:
 *   cd edge && pnpm exec wrangler d1 execute lead-gen-jobs --local --file=migrations/0008_blocked_company_keys.sql
 *   cd edge && pnpm exec wrangler d1 execute lead-gen-jobs --remote --file=migrations/0008_blocked_company_keys.sql
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DB = "lead-gen-jobs";
const EDGE_DIR = join(process.cwd(), "edge");

// Mirror of edge/src/index.ts:186-200 — keep in sync if those change.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function liKey(linkedinUrl: string | null | undefined): string | null {
  if (!linkedinUrl) return null;
  const m = linkedinUrl.match(/\/company\/([^/?#]+)/);
  return m ? `li:${m[1].toLowerCase()}` : null;
}

function nameKey(name: string): string {
  return `name:${slugify(name) || "unknown"}`;
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function main() {
  const remote = process.argv.includes("--remote");
  const target = remote ? "--remote" : "--local";

  const { db } = await import("@/db");
  const { companies } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const blocked = await db
    .select({ name: companies.name, linkedin_url: companies.linkedin_url })
    .from(companies)
    .where(eq(companies.blocked, true));

  // Each blocked company contributes up to two keys: name:<slug> always,
  // li:<slug> when a LinkedIn URL is present. The Worker may see either
  // form depending on whether the scraper picked up companyLinkedinUrl.
  const keyRows = new Map<string, string>(); // key → display name
  for (const c of blocked) {
    if (!c.name) continue;
    keyRows.set(nameKey(c.name), c.name);
    const li = liKey(c.linkedin_url);
    if (li) keyRows.set(li, c.name);
  }

  if (keyRows.size === 0) {
    console.log("No blocked companies in Neon — nothing to sync.");
    return;
  }

  const values = Array.from(keyRows.entries())
    .map(([key, name]) => `(${sqlString(key)}, ${sqlString(name)}, 'neon-sync')`)
    .join(",\n  ");

  // INSERT OR REPLACE keeps the table in sync — drops never happen here,
  // so unblocking in Neon won't propagate. Wipe + reinsert in one txn.
  const sql = [
    "BEGIN TRANSACTION;",
    "DELETE FROM blocked_company_keys WHERE source = 'neon-sync';",
    `INSERT INTO blocked_company_keys (key, name, source) VALUES\n  ${values}\n  ON CONFLICT(key) DO UPDATE SET name = excluded.name, source = excluded.source;`,
    "COMMIT;",
  ].join("\n");

  const tmp = mkdtempSync(join(tmpdir(), "blocklist-d1-"));
  const sqlFile = join(tmp, "sync.sql");
  writeFileSync(sqlFile, sql);

  console.log(`Syncing ${keyRows.size} keys (${blocked.length} companies) → D1 ${target}`);

  execFileSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", DB, target, "--file", sqlFile],
    { cwd: EDGE_DIR, stdio: "inherit" },
  );

  console.log("Done.");
}

main().catch((e) => {
  console.error("Sync failed:", e);
  process.exit(1);
});
