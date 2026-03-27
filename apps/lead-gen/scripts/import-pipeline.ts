/**
 * Import Rust pipeline JSON reports (enrichment + contacts) into Neon PostgreSQL.
 *
 * Usage:
 *   pnpm tsx scripts/import-pipeline.ts
 *   pnpm tsx scripts/import-pipeline.ts --dry-run
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";

interface EnrichedCompany {
  domain: string;
  name: string;
  category: string;
  ai_tier: string;
  industry: string;
  tech_stack: string[];
  emails_found: string[];
  has_careers_page: boolean;
  remote_policy: number;
  enrichment_score: number;
  confidence: number;
}

interface FoundContact {
  email: string;
  domain: string;
  company_name: string;
  pattern_name: string;
  verified: boolean;
  verification_tier: number;
  mx_host: string;
  score: number;
}

function domainToKey(domain: string): string {
  return domain.replace(/\./g, "-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
}

function remotePolicyLabel(policy: number): string {
  return ["unknown", "full_remote", "hybrid", "onsite"][policy] ?? "unknown";
}

async function importPipeline(dryRun: boolean) {
  const { db } = await import("@/db");
  const { companies, contacts } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const reportsDir = path.resolve("data/reports");

  // Load enrichment report
  const enrichmentPath = path.join(reportsDir, "enrichment.json");
  if (!fs.existsSync(enrichmentPath)) {
    console.error("No enrichment.json found. Run the pipeline first.");
    process.exit(1);
  }
  const enrichment: { companies: EnrichedCompany[] } = JSON.parse(
    fs.readFileSync(enrichmentPath, "utf-8")
  );

  // Load contacts report (optional)
  const contactsPath = path.join(reportsDir, "contacts.json");
  const contactsData: { contacts: FoundContact[] } = fs.existsSync(contactsPath)
    ? JSON.parse(fs.readFileSync(contactsPath, "utf-8"))
    : { contacts: [] };

  console.log(`Enrichment: ${enrichment.companies.length} companies`);
  console.log(`Contacts: ${contactsData.contacts.length} entries`);
  if (dryRun) console.log("DRY RUN — no database writes\n");

  // Import companies
  let companyImported = 0;
  let companySkipped = 0;
  const companyIdMap = new Map<string, number>();

  for (const ec of enrichment.companies) {
    const key = domainToKey(ec.domain);

    const existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.key, key))
      .limit(1);

    if (existing.length > 0) {
      companyIdMap.set(ec.domain, existing[0].id);
      companySkipped++;
      continue;
    }

    const aiTier = ec.ai_tier === "ai_first" ? 1 : ec.ai_tier === "ai_native" ? 2 : 0;

    if (dryRun) {
      console.log(
        `  [DRY] ${ec.domain} — ${ec.category} | ${ec.ai_tier} | remote:${remotePolicyLabel(ec.remote_policy)} | score:${(ec.enrichment_score * 100).toFixed(0)}%`
      );
      continue;
    }

    const [inserted] = await db
      .insert(companies)
      .values({
        key,
        name: ec.name,
        website: `https://${ec.domain}`,
        canonical_domain: ec.domain,
        category: ec.category as any,
        industry: ec.industry,
        ai_tier: aiTier,
        ai_classification_reason: `Rust pipeline: ${ec.category}, remote:${remotePolicyLabel(ec.remote_policy)}`,
        ai_classification_confidence: ec.confidence,
        score: ec.enrichment_score,
        score_reasons: JSON.stringify([
          `Category: ${ec.category}`,
          `AI tier: ${ec.ai_tier}`,
          `Remote: ${remotePolicyLabel(ec.remote_policy)}`,
          `Tech: ${ec.tech_stack.length} signals`,
          ec.has_careers_page ? "Has careers page" : "No careers page",
        ]),
        emails: ec.emails_found.length > 0 ? JSON.stringify(ec.emails_found) : null,
        tags: JSON.stringify([
          "leadgen-pipeline",
          `remote-${remotePolicyLabel(ec.remote_policy)}`,
          ...ec.tech_stack,
        ]),
        industries: JSON.stringify([ec.industry].filter(Boolean)),
        service_taxonomy: JSON.stringify(["AI Consulting"]),
      })
      .returning({ id: companies.id });

    companyIdMap.set(ec.domain, inserted.id);
    companyImported++;
    console.log(`  + ${ec.domain} (${ec.category} | ${ec.ai_tier} | remote:${remotePolicyLabel(ec.remote_policy)})`);
  }

  // Import contacts
  let contactImported = 0;
  let contactSkipped = 0;

  for (const fc of contactsData.contacts) {
    const companyId = companyIdMap.get(fc.domain);

    // Parse name from email local part
    const local = fc.email.split("@")[0] ?? "";
    const parts = local.split(/[._-]/);
    const firstName = parts[0] ?? local;
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : fc.domain;

    // Check if contact already exists by email
    const existing = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.email, fc.email))
      .limit(1);

    if (existing.length > 0) {
      contactSkipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `  [DRY] ${fc.email} — verified:${fc.verified} | score:${fc.score} | mx:${fc.mx_host}`
      );
      continue;
    }

    await db.insert(contacts).values({
      first_name: firstName,
      last_name: lastName,
      email: fc.email,
      company: fc.company_name,
      company_id: companyId ?? null,
      email_verified: fc.verified,
      tags: JSON.stringify([
        `pattern:${fc.pattern_name}`,
        `tier:${fc.verification_tier}`,
        `score:${fc.score}`,
        fc.verified ? "verified" : "unverified",
      ]),
    });

    contactImported++;
    console.log(`  + ${fc.email} (${fc.company_name} | ${fc.verified ? "verified" : "unverified"})`);
  }

  console.log(`\nImport complete:`);
  console.log(`  Companies: ${companyImported} created, ${companySkipped} skipped`);
  console.log(`  Contacts: ${contactImported} created, ${contactSkipped} skipped`);
}

const dryRun = process.argv.includes("--dry-run");
importPipeline(dryRun).catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
