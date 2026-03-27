/**
 * Import leads from Rust pipeline CSV export into Neon PostgreSQL.
 *
 * Usage:
 *   pnpm tsx scripts/import-rust-leads.ts <path-to-csv>
 *   pnpm tsx scripts/import-rust-leads.ts ../../crates/leadgen/data/eu-ai-leads.csv
 *   pnpm tsx scripts/import-rust-leads.ts --dry-run ../../crates/leadgen/data/eu-ai-leads.csv
 */

import { db } from "@/db";
import { companies, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";

interface RustLead {
  first_name: string;
  last_name: string;
  title: string;
  company_name: string;
  company_domain: string;
  industry: string;
  employee_count: string;
  email: string;
  email_status: string;
  composite_score: string;
  icp_fit_score: string;
}

function parseCSV(content: string): RustLead[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj as unknown as RustLead;
  });
}

function scoreToAiTier(compositeScore: number): number {
  if (compositeScore > 70) return 2; // ai_native
  if (compositeScore > 40) return 1; // ai_first
  return 0;
}

function domainToKey(domain: string): string {
  return domain.replace(/\./g, "-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
}

async function importLeads(csvPath: string, dryRun: boolean) {
  const content = readFileSync(csvPath, "utf-8");
  const leads = parseCSV(content);

  console.log(`Parsed ${leads.length} leads from ${csvPath}`);
  if (dryRun) console.log("DRY RUN — no database writes");

  // Group leads by company domain
  const byCompany = new Map<string, RustLead[]>();
  for (const lead of leads) {
    const domain = lead.company_domain;
    if (!domain) continue;
    const group = byCompany.get(domain) ?? [];
    group.push(lead);
    byCompany.set(domain, group);
  }

  console.log(`${byCompany.size} unique companies`);

  let companiesImported = 0;
  let contactsImported = 0;
  let companiesSkipped = 0;

  for (const [domain, companyLeads] of byCompany) {
    const firstLead = companyLeads[0];
    const key = domainToKey(domain);
    const bestScore = Math.max(
      ...companyLeads.map((l) => parseFloat(l.composite_score) || 0)
    );
    const aiTier = scoreToAiTier(bestScore);

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
    } else {
      if (dryRun) {
        console.log(
          `  [DRY] Would create company: ${firstLead.company_name} (${domain})`
        );
        continue;
      }

      const [inserted] = await db
        .insert(companies)
        .values({
          key,
          name: firstLead.company_name,
          website: `https://${domain}`,
          industry: firstLead.industry || "AI Consulting",
          size: firstLead.employee_count || null,
          category: "CONSULTANCY",
          ai_tier: aiTier,
          ai_classification_reason: "Rust pipeline ICP scoring",
          ai_classification_confidence: bestScore / 100,
          canonical_domain: domain,
          score: bestScore / 100,
          score_reasons: JSON.stringify([
            `ICP fit: ${bestScore.toFixed(1)}`,
            "Source: Rust leadgen pipeline",
          ]),
          industries: JSON.stringify([
            "AI",
            "Consulting",
            firstLead.industry,
          ].filter(Boolean)),
          service_taxonomy: JSON.stringify(["AI Consulting"]),
          tags: JSON.stringify(["ai-consultancy", "europe", "leadgen-import"]),
        })
        .returning({ id: companies.id });

      companyId = inserted.id;
      companiesImported++;
    }

    // Import contacts for this company
    for (const lead of companyLeads) {
      if (!lead.email && !lead.first_name) continue;

      if (dryRun) {
        console.log(
          `  [DRY] Would create contact: ${lead.first_name} ${lead.last_name} <${lead.email}>`
        );
        continue;
      }

      // Check for duplicate contact by email
      if (lead.email) {
        const existingContact = await db
          .select({ id: contacts.id })
          .from(contacts)
          .where(eq(contacts.email, lead.email))
          .limit(1);
        if (existingContact.length > 0) continue;
      }

      await db.insert(contacts).values({
        company_id: companyId,
        first_name: lead.first_name,
        last_name: lead.last_name,
        position: lead.title,
        email: lead.email || null,
      });
      contactsImported++;
    }
  }

  console.log(`\nImport complete:`);
  console.log(`  Companies: ${companiesImported} created, ${companiesSkipped} already existed`);
  console.log(`  Contacts:  ${contactsImported} imported`);
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const csvPath = args.find((a) => !a.startsWith("--"));

if (!csvPath) {
  console.error("Usage: pnpm tsx scripts/import-rust-leads.ts [--dry-run] <path-to-csv>");
  process.exit(1);
}

importLeads(csvPath, dryRun).catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
