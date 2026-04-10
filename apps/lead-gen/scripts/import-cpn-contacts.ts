/**
 * Import CPN partner candidates as contacts + queue outbound emails.
 *
 * Reads partners_export.csv (offset 100 — first 100 already sent),
 * upserts into contacts table, and inserts scheduled emails tagged "cpn-outreach".
 *
 * Usage:
 *   npx tsx scripts/import-cpn-contacts.ts --dry-run
 *   npx tsx scripts/import-cpn-contacts.ts
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import Papa from "papaparse";
import { db, contacts, contactEmails } from "@/db";
import { eq } from "drizzle-orm";

const dryRun = process.argv.includes("--dry-run");
const OFFSET = 100; // first 100 already sent today

interface PartnerRow {
  rank: string;
  login: string;
  name: string;
  email: string;
  company: string;
  location: string;
  score: string;
  archetypes: string;
  source: string;
  starred: string;
  github_url: string;
  bio: string;
}

function firstName(row: PartnerRow): string {
  const name = row.name?.trim();
  if (name) return name.split(/\s+/)[0];
  return row.login;
}

function lastName(row: PartnerRow): string {
  const name = row.name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  }
  return "";
}

function signal(row: PartnerRow): string {
  const company = row.company?.trim().replace(/^@/, "");
  if (company) return `Saw ${company} is working with Claude`;

  const archetypes = row.archetypes?.trim();
  if (archetypes) {
    const first = archetypes.split(",")[0].trim().replace(/-/g, " ");
    return `Your ${first} work on GitHub caught my eye`;
  }

  return "Noticed you're active in the Claude SDK ecosystem";
}

function buildEmailText(row: PartnerRow): { subject: string; text: string } {
  const first = firstName(row);
  const sig = signal(row);

  const subject = `Claude Partner Network — ${first}`;
  const text = `Hi ${first},

${sig} — you'd be a strong fit for this.

Anthropic is launching the Claude Partner Network for teams deploying Claude to enterprise. Karl Kadon (Head of Partner Experience, Anthropic) is opening the partner training path next week. I'm putting together the first training cohort and looking for people to go through it together.

Want me to send you the details?

Vadim Nicolai
vadim.blog`;

  return { subject, text };
}

async function main() {
  const csvPath = resolve("crates/github-patterns/partners_export.csv");
  const csvText = readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse<PartnerRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = data.filter((r) => r.email?.trim()).slice(OFFSET);

  console.log(`\n  CPN Import: ${rows.length} partners (offset ${OFFSET})`);
  console.log(`  Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  if (dryRun) {
    for (const row of rows.slice(0, 3)) {
      const { subject, text } = buildEmailText(row);
      console.log(`  ${firstName(row)} ${lastName(row)} <${row.email}> — ${row.login}`);
      console.log(`  Subject: ${subject}\n`);
    }
    console.log(`  ... and ${rows.length - 3} more\n`);
    return;
  }

  let imported = 0;
  let queued = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = row.email.trim();

    // Check if contact already exists by email
    const existing = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.email, email))
      .limit(1);

    let contactId: number;

    if (existing.length > 0) {
      contactId = existing[0].id;
      skipped++;
    } else {
      const [inserted] = await db
        .insert(contacts)
        .values({
          first_name: firstName(row),
          last_name: lastName(row),
          email,
          github_handle: row.login,
          company: row.company?.trim().replace(/^@/, "") || null,
          tags: JSON.stringify(["cpn-outreach"]),
        })
        .returning({ id: contacts.id });
      contactId = inserted.id;
      imported++;
    }

    // Check if email already queued for this contact
    const existingEmail = await db
      .select({ id: contactEmails.id })
      .from(contactEmails)
      .where(eq(contactEmails.contact_id, contactId))
      .limit(1);

    if (existingEmail.length > 0) continue;

    const { subject, text } = buildEmailText(row);

    await db.insert(contactEmails).values({
      contact_id: contactId,
      resend_id: "",
      from_email: "contact@vadim.blog",
      to_emails: JSON.stringify([email]),
      subject,
      text_content: text,
      status: "scheduled",
      tags: JSON.stringify(["cpn-outreach"]),
      recipient_name: `${firstName(row)} ${lastName(row)}`.trim(),
    });
    queued++;

    if ((imported + skipped) % 50 === 0) {
      process.stdout.write(
        `  [${imported + skipped}/${rows.length}] ${imported} imported, ${skipped} existing, ${queued} queued\n`,
      );
    }
  }

  console.log(
    `\n  Done: ${imported} contacts imported, ${skipped} existing, ${queued} emails queued\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
