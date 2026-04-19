/**
 * Backfill html_content / text_content for contact_emails rows that were
 * persisted by the Resend sync service (which only had metadata).
 *
 * Usage:
 *   pnpm tsx scripts/backfill-outbound-content.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { eq, and, isNull } = await import("drizzle-orm");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { neon } = await import("@neondatabase/serverless");
  const schema = await import("../src/db/schema");
  const { resend } = await import("../src/lib/resend/resend-adapter");

  const { contactEmails } = schema;
  const neonUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!neonUrl) {
    console.error("NEON_DATABASE_URL not set");
    process.exit(1);
  }
  const sqlClient = neon(neonUrl);
  const db = drizzle(sqlClient, { schema });

  const rows = await db
    .select({
      id: contactEmails.id,
      resend_id: contactEmails.resend_id,
      to_emails: contactEmails.to_emails,
      subject: contactEmails.subject,
    })
    .from(contactEmails)
    .where(
      and(
        isNull(contactEmails.html_content),
        isNull(contactEmails.text_content),
      ),
    );

  console.log(`found ${rows.length} contact_emails rows with no content`);

  let filled = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.resend_id || row.resend_id.startsWith("batch_")) {
      skipped++;
      continue;
    }
    try {
      const full = await resend.instance.getEmail(row.resend_id);
      const html = full?.html ?? null;
      const text = full?.text ?? null;
      if (!html && !text) {
        console.log(`  [${row.id}] still no content from Resend API`);
        skipped++;
        continue;
      }
      await db
        .update(contactEmails)
        .set({
          html_content: html,
          text_content: text,
          updated_at: new Date().toISOString(),
        })
        .where(eq(contactEmails.id, row.id));
      filled++;
      if (filled <= 10 || filled % 25 === 0) {
        console.log(
          `  [${row.id}] ${row.to_emails} "${row.subject}" → html:${html ? html.length : 0} text:${text ? text.length : 0}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [${row.id}] failed: ${msg}`);
      failed++;
    }
  }

  console.log(`\nfilled=${filled} skipped=${skipped} failed=${failed} total=${rows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
