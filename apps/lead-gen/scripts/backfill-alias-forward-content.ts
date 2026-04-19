/**
 * Backfill html_content / text_content for alias_forward rows that were
 * persisted before the enrichment fetch was moved above the alias branch.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-alias-forward-content.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/db/schema";
import { resend } from "../src/lib/resend";

const { receivedEmails } = schema;

const neonUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!neonUrl) {
  console.error("NEON_DATABASE_URL not set");
  process.exit(1);
}
const sqlClient = neon(neonUrl);
const db = drizzle(sqlClient, { schema });

async function main() {
  const rows = await db
    .select({
      id: receivedEmails.id,
      resend_id: receivedEmails.resend_id,
      from_email: receivedEmails.from_email,
      subject: receivedEmails.subject,
    })
    .from(receivedEmails)
    .where(
      and(
        eq(receivedEmails.classification, "alias_forward"),
        isNull(receivedEmails.html_content),
        isNull(receivedEmails.text_content),
      ),
    );

  console.log(`found ${rows.length} alias_forward rows with no content`);

  for (const row of rows) {
    if (!row.resend_id) {
      console.log(`  [${row.id}] no resend_id, skipping`);
      continue;
    }
    try {
      const full = await resend.instance.getReceivedEmail(row.resend_id);
      if (!full) {
        console.log(`  [${row.id}] getReceivedEmail returned null`);
        continue;
      }
      const html = full.html ?? null;
      const text = full.text ?? null;
      if (!html && !text) {
        console.log(`  [${row.id}] still no content from Resend API`);
        continue;
      }
      await db
        .update(receivedEmails)
        .set({
          html_content: html,
          text_content: text,
          updated_at: new Date().toISOString(),
        })
        .where(eq(receivedEmails.id, row.id));
      console.log(
        `  [${row.id}] ${row.from_email} "${row.subject}" → html:${html ? html.length : 0} text:${text ? text.length : 0}`,
      );
    } catch (err) {
      console.error(`  [${row.id}] failed:`, err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
