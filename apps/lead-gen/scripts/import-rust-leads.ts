/**
 * Import companies + contacts from Rust pipeline JSON reports into Neon PostgreSQL.
 *
 * Reads enrichment.json + contacts.json from the Rust pipeline reports directory
 * and upserts them into the Neon database.
 *
 * Usage:
 *   pnpm tsx scripts/import-rust-leads.ts data/reports
 *   pnpm tsx scripts/import-rust-leads.ts --dry-run data/reports
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { join } from "path";

// ── Report types (match Rust serde output) ───────────────────

interface EnrichmentReport {
  companies: EnrichedCompany[];
}

interface EnrichedCompany {
  domain: string;
  name: string;
  category: string;
  ai_tier: string;
  industry: string;
  tech_stack: string[];
  emails_found: string[];
  has_careers_page: boolean;
  remote_policy: number; // 0=unknown, 1=remote, 2=hybrid, 3=onsite
  enrichment_score: number;
  confidence: number;
}

interface ContactsReport {
  contacts: FoundContact[];
  verification_stats: {
    mx_checked: number;
    smtp_checked: number;
    verified_count: number;
    failed_count: number;
    no_mx_count: number;
  };
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

// ── Helpers ──────────────────────────────────────────────────

function domainToKey(domain: string): string {
  return domain
    .replace(/\./g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
}

function aiTierToInt(tier: string): number {
  switch (tier) {
    case "ai_first":
      return 1;
    case "ai_native":
      return 2;
    default:
      return 0;
  }
}

const REMOTE_LABELS: Record<number, string> = {
  0: "unknown",
  1: "remote",
  2: "hybrid",
  3: "onsite",
};

function loadReport<T>(reportsDir: string, name: string): T | null {
  try {
    const raw = readFileSync(join(reportsDir, `${name}.json`), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────

async function importFromReports(reportsDir: string, dryRun: boolean) {
  const { db } = await import("@/db");
  const { companies, contacts } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  // Load reports
  const enrichment = loadReport<EnrichmentReport>(reportsDir, "enrichment");
  const contactsReport = loadReport<ContactsReport>(reportsDir, "contacts");

  if (!enrichment || enrichment.companies.length === 0) {
    console.error("No enrichment report found or empty. Run the pipeline first.");
    process.exit(1);
  }

  console.log(`Enrichment: ${enrichment.companies.length} companies`);
  console.log(
    `Contacts:   ${contactsReport?.contacts.length ?? 0} contacts`
  );
  if (dryRun) console.log("DRY RUN — no database writes\n");

  // Build contacts lookup: domain → contacts[]
  const contactsByDomain = new Map<string, FoundContact[]>();
  for (const c of contactsReport?.contacts ?? []) {
    const list = contactsByDomain.get(c.domain) ?? [];
    list.push(c);
    contactsByDomain.set(c.domain, list);
  }

  let companiesCreated = 0;
  let companiesSkipped = 0;
  let contactsCreated = 0;
  let contactsSkipped = 0;

  for (const ec of enrichment.companies) {
    const key = domainToKey(ec.domain);

    // Check if company already exists
    const existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.key, key))
      .limit(1);

    let companyId: number;

    if (existing.length > 0) {
      companyId = existing[0].id;
      companiesSkipped++;

      if (!dryRun) {
        // Update enrichment fields even if company exists
        await db
          .update(companies)
          .set({
            category: ec.category,
            ai_tier: aiTierToInt(ec.ai_tier),
            ai_classification_confidence: ec.confidence,
            score: ec.enrichment_score,
            score_reasons: JSON.stringify([
              `Category: ${ec.category}`,
              `AI tier: ${ec.ai_tier}`,
              `Industry: ${ec.industry}`,
              `Remote: ${REMOTE_LABELS[ec.remote_policy] ?? "unknown"}`,
              `Tech: ${ec.tech_stack.join(", ")}`,
              `Confidence: ${ec.confidence}`,
            ]),
            tags: JSON.stringify([
              "ai-consultancy",
              "leadgen-import",
              ...ec.tech_stack,
            ]),
            industries: JSON.stringify(
              ["AI", ec.industry].filter(Boolean)
            ),
            emails: ec.emails_found.length
              ? JSON.stringify(ec.emails_found)
              : undefined,
            email: ec.emails_found[0] ?? undefined,
          })
          .where(eq(companies.id, companyId));
      }
    } else {
      if (dryRun) {
        console.log(
          `  [DRY] + ${ec.domain} — ${ec.category} / ${ec.ai_tier} / ${ec.industry} (score: ${ec.enrichment_score.toFixed(2)})`
        );
        companiesCreated++;
        continue;
      }

      const [inserted] = await db
        .insert(companies)
        .values({
          key,
          name: ec.name || ec.domain,
          website: `https://${ec.domain}`,
          canonical_domain: ec.domain,
          industry: ec.industry || "AI Consulting",
          category: ec.category,
          ai_tier: aiTierToInt(ec.ai_tier),
          ai_classification_reason: `Rust pipeline: ${ec.category} / ${ec.ai_tier}`,
          ai_classification_confidence: ec.confidence,
          score: ec.enrichment_score,
          score_reasons: JSON.stringify([
            `Category: ${ec.category}`,
            `AI tier: ${ec.ai_tier}`,
            `Industry: ${ec.industry}`,
            `Remote: ${REMOTE_LABELS[ec.remote_policy] ?? "unknown"}`,
            `Tech: ${ec.tech_stack.join(", ")}`,
            `Confidence: ${ec.confidence}`,
          ]),
          tags: JSON.stringify([
            "ai-consultancy",
            "leadgen-import",
            ...ec.tech_stack,
          ]),
          industries: JSON.stringify(["AI", ec.industry].filter(Boolean)),
          service_taxonomy: JSON.stringify(["AI Consulting"]),
          emails: ec.emails_found.length
            ? JSON.stringify(ec.emails_found)
            : null,
          email: ec.emails_found[0] ?? null,
          job_board_url: ec.has_careers_page
            ? `https://${ec.domain}/careers`
            : null,
        })
        .returning({ id: companies.id });

      companyId = inserted.id;
      companiesCreated++;
      console.log(
        `  + ${ec.domain} — ${ec.category} / ${ec.ai_tier} (score: ${ec.enrichment_score.toFixed(2)})`
      );
    }

    // Import contacts for this company
    const domainContacts = contactsByDomain.get(ec.domain) ?? [];
    for (const fc of domainContacts) {
      // Skip contacts without valid-looking emails
      if (!fc.email || !fc.email.includes("@")) continue;

      // Check if contact already exists by email
      const existingContact = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, fc.email))
        .limit(1);

      if (existingContact.length > 0) {
        contactsSkipped++;
        continue;
      }

      if (dryRun) {
        console.log(
          `    [DRY] + ${fc.email} (${fc.pattern_name}, tier ${fc.verification_tier})`
        );
        contactsCreated++;
        continue;
      }

      // Derive first/last name from email pattern
      const localPart = fc.email.split("@")[0];
      const parts = localPart.split(/[._-]/);
      const firstName = parts[0] ?? localPart;
      const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

      await db.insert(contacts).values({
        first_name: firstName,
        last_name: lastName,
        email: fc.email,
        emails: JSON.stringify([fc.email]),
        company: fc.company_name,
        company_id: companyId,
        email_verified: fc.verified,
        tags: JSON.stringify([
          `pattern:${fc.pattern_name}`,
          `tier:${fc.verification_tier}`,
          `mx:${fc.mx_host}`,
          "leadgen-import",
        ]),
      });

      contactsCreated++;
    }
  }

  console.log(`\nImport complete:`);
  console.log(
    `  Companies: ${companiesCreated} created, ${companiesSkipped} updated`
  );
  console.log(
    `  Contacts:  ${contactsCreated} created, ${contactsSkipped} skipped`
  );
  if (contactsReport?.verification_stats) {
    const vs = contactsReport.verification_stats;
    console.log(
      `  SMTP:      ${vs.verified_count} verified, ${vs.failed_count} failed, ${vs.no_mx_count} no MX`
    );
  }
}

// ── CLI ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const reportsDir = args.find((a) => !a.startsWith("--"));

if (!reportsDir) {
  console.error(
    "Usage: pnpm tsx scripts/import-rust-leads.ts [--dry-run] <reports-dir>"
  );
  process.exit(1);
}

importFromReports(reportsDir, dryRun).catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
