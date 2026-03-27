/**
 * Import companies from Rust pipeline SQLite database into Neon PostgreSQL.
 *
 * Reads companies + crawl_stats + enrichment_cache from the Rust SQLite DB
 * and imports them as CONSULTANCY companies into the Next.js Neon database.
 *
 * Usage:
 *   pnpm tsx scripts/import-rust-leads.ts <sqlite-db-path>
 *   pnpm tsx scripts/import-rust-leads.ts ../../crates/leadgen/data/leads.db
 *   pnpm tsx scripts/import-rust-leads.ts --dry-run ../../crates/leadgen/data/leads.db
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Database from "better-sqlite3";

interface RustCompany {
  id: string;
  name: string;
  domain: string;
  industry: string | null;
  employee_count: number | null;
  funding_stage: string | null;
  tech_stack: string | null;
  location: string | null;
  description: string | null;
  source: string | null;
}

interface CrawlStats {
  domain: string;
  total_crawls: number;
  total_pages: number;
  total_contacts: number;
  total_emails: number;
  harvest_rate: number;
}

function domainToKey(domain: string): string {
  return domain.replace(/\./g, "-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
}

async function importFromSqlite(dbPath: string, dryRun: boolean) {
  // Dynamic import so dotenv has loaded NEON_DATABASE_URL first
  const { db } = await import("@/db");
  const { companies } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const sqlite = new Database(dbPath, { readonly: true });

  const rustCompanies = sqlite
    .prepare("SELECT * FROM companies ORDER BY domain")
    .all() as RustCompany[];

  const crawlStats = sqlite
    .prepare("SELECT * FROM crawl_stats")
    .all() as CrawlStats[];

  const statsMap = new Map(crawlStats.map((s) => [s.domain, s]));

  console.log(`Found ${rustCompanies.length} companies in Rust DB`);
  console.log(`Found ${crawlStats.length} crawl stats records`);
  if (dryRun) console.log("DRY RUN — no database writes\n");

  let imported = 0;
  let skipped = 0;

  for (const rc of rustCompanies) {
    const key = domainToKey(rc.domain);
    const stats = statsMap.get(rc.domain);

    // Check if already exists
    const existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.key, key))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const emailCount = stats?.total_emails ?? 0;
    const pagesCount = stats?.total_pages ?? 0;

    if (dryRun) {
      console.log(
        `  [DRY] ${rc.domain} — industry: ${rc.industry ?? "?"}, pages: ${pagesCount}, emails: ${emailCount}`
      );
      continue;
    }

    await db.insert(companies).values({
      key,
      name: rc.name || rc.domain,
      website: `https://${rc.domain}`,
      industry: rc.industry || "AI Consulting",
      size: rc.employee_count ? String(rc.employee_count) : null,
      location: rc.location,
      description: rc.description,
      category: "CONSULTANCY",
      canonical_domain: rc.domain,
      ai_tier: rc.industry?.toLowerCase().includes("ai") ? 1 : 0,
      ai_classification_reason: "Rust pipeline crawl + NER extraction",
      ai_classification_confidence: 0.5,
      score: emailCount > 0 ? Math.min(emailCount / 50, 1.0) : 0.1,
      score_reasons: JSON.stringify([
        `${pagesCount} pages crawled`,
        `${emailCount} emails discovered`,
        "Source: Rust leadgen pipeline",
      ]),
      industries: JSON.stringify(
        ["AI", "Consulting", rc.industry].filter(Boolean)
      ),
      service_taxonomy: JSON.stringify(["AI Consulting"]),
      tags: JSON.stringify([
        "ai-consultancy",
        "europe",
        "leadgen-import",
        ...(rc.tech_stack ? JSON.parse(rc.tech_stack) : []),
      ]),
    });

    imported++;
    console.log(`  + ${rc.domain} (${rc.industry ?? "?"})`);
  }

  sqlite.close();

  console.log(`\nImport complete:`);
  console.log(`  Companies: ${imported} created, ${skipped} already existed`);
  console.log(
    `  Total emails discovered: ${crawlStats.reduce((s, c) => s + c.total_emails, 0)}`
  );
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbPath = args.find((a) => !a.startsWith("--"));

if (!dbPath) {
  console.error(
    "Usage: pnpm tsx scripts/import-rust-leads.ts [--dry-run] <sqlite-db>"
  );
  process.exit(1);
}

importFromSqlite(dbPath, dryRun).catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
