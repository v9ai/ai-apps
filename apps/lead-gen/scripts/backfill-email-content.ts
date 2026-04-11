import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(import.meta.dirname, "../.env.local");
const lines = readFileSync(envPath, "utf8").split("\n");
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
}

import { resend } from "../src/lib/resend/index.ts";
import { db } from "../src/db/index.ts";
import { receivedEmails } from "../src/db/schema.ts";
import { eq, isNull, isNotNull, and } from "drizzle-orm";

const rows = await db
  .select({ id: receivedEmails.id, resend_id: receivedEmails.resend_id })
  .from(receivedEmails)
  .where(
    and(
      isNull(receivedEmails.text_content),
      isNull(receivedEmails.html_content),
      isNotNull(receivedEmails.resend_id),
    ),
  );

console.log(`Found ${rows.length} emails to backfill`);

let updated = 0,
  failed = 0,
  empty = 0;
for (const row of rows) {
  try {
    const full = await resend.instance.getReceivedEmail(row.resend_id!);
    if (full && (full.html || full.text)) {
      await db
        .update(receivedEmails)
        .set({
          html_content: full.html ?? null,
          text_content: full.text ?? null,
          updated_at: new Date().toISOString(),
        })
        .where(eq(receivedEmails.id, row.id));
      updated++;
      console.log(`✓ ${row.id}`);
    } else {
      empty++;
      console.log(`⊘ ${row.id} — no content from Resend`);
    }
    await new Promise((r) => setTimeout(r, 200));
  } catch (e: any) {
    failed++;
    console.log(`✗ ${row.id} — ${e.message}`);
  }
}
console.log(`\nDone: ${updated} updated, ${empty} empty, ${failed} failed`);
process.exit(0);
