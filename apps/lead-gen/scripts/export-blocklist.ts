/**
 * Export blocked company domains from Neon → data/blocklist.txt
 *
 * Used by `make leads` to sync the web UI blocklist to the local pipeline.
 *
 * Usage:
 *   pnpm tsx scripts/export-blocklist.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { join } from "path";

async function exportBlocklist() {
  const { db } = await import("@/db");
  const { companies } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const blocked = await db
    .select({ domain: companies.canonical_domain })
    .from(companies)
    .where(eq(companies.blocked, true));

  const domains = blocked
    .map((r) => r.domain)
    .filter((d): d is string => !!d)
    .sort();

  const output = join("data", "blocklist.txt");
  const content = domains.length
    ? `# Auto-exported from Neon — do not edit manually\n${domains.join("\n")}\n`
    : "# Auto-exported from Neon — no blocked domains\n";

  writeFileSync(output, content);
  console.log(`Exported ${domains.length} blocked domains → ${output}`);
}

exportBlocklist().catch((e) => {
  console.error("Export failed:", e);
  process.exit(1);
});
