/**
 * Sync CPN campaign replies from Resend → DB, classify, and tag.
 *
 * Fetches all received emails from Resend API, dedupes against DB,
 * classifies with the reply classifier, matches to CPN outbound emails,
 * and tags contacts needing a response.
 *
 * Usage:
 *   NEON_DATABASE_URL="..." npx tsx scripts/sync-cpn-replies.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";
import { classifyReply } from "@/lib/email/reply-classifier";

const CPN_TAG = '["cpn-outreach"]';

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 1. Fetch all received emails from Resend (paginated)
  const allReceived: any[] = [];
  let cursor: string | undefined;
  while (true) {
    const params: any = { limit: 100 };
    if (cursor) params.after = cursor;
    const { data, error } = await resend.emails.receiving.list(params);
    if (error || !data?.data?.length) break;
    allReceived.push(...data.data);
    if (!data.has_more) break;
    cursor = data.data[data.data.length - 1].id;
  }

  console.log(`Fetched ${allReceived.length} received emails from Resend\n`);

  // 2. Get existing resend_ids from DB
  const existing = await sql`SELECT resend_id FROM received_emails`;
  const existingIds = new Set(existing.map((r: any) => r.resend_id));

  const newEmails = allReceived.filter((e) => !existingIds.has(e.id));
  console.log(`New to sync: ${newEmails.length} (${existingIds.size} already in DB)\n`);

  const stats: Record<string, number> = {};
  let cpnReplies = 0;
  let needsResponse = 0;

  for (const email of newEmails) {
    // 3. Fetch full content
    const { data: full, error } = await resend.emails.receiving.get(email.id);
    if (error || !full) {
      console.log(`  ✗ Failed to fetch ${email.id}: ${error?.message}`);
      continue;
    }

    const fromEmail = full.from;
    const subject = full.subject ?? "";
    const textContent = full.text ?? "";
    const htmlContent = full.html ?? "";

    // 4. Classify
    const classification = classifyReply(subject, textContent || htmlContent);
    stats[classification.label] = (stats[classification.label] || 0) + 1;

    // 5. Match contact by email
    const contactMatch = await sql`
      SELECT id FROM contacts WHERE LOWER(email) = LOWER(${fromEmail}) LIMIT 1
    `;
    const contactId = contactMatch.length > 0 ? contactMatch[0].id : null;

    // 6. Match outbound CPN email
    let outboundId: number | null = null;
    if (contactId) {
      const outbound = await sql`
        SELECT id FROM contact_emails
        WHERE contact_id = ${contactId} AND tags = ${CPN_TAG}
        LIMIT 1
      `;
      if (outbound.length > 0) outboundId = outbound[0].id;
    }

    // 7. Insert received email
    const receivedAt = full.created_at ?? new Date().toISOString();
    await sql`
      INSERT INTO received_emails (resend_id, from_email, to_emails, cc_emails, reply_to_emails, subject, text_content, html_content, received_at, classification, classification_confidence, classified_at, matched_contact_id, matched_outbound_id, created_at, updated_at)
      VALUES (${full.id}, ${fromEmail}, ${JSON.stringify(full.to ?? [])}, ${JSON.stringify(full.cc ?? [])}, ${JSON.stringify(full.reply_to ?? [])}, ${subject}, ${textContent}, ${htmlContent}, ${receivedAt}, ${classification.label}, ${classification.confidence}, ${new Date().toISOString()}, ${contactId}, ${outboundId}, now()::text, now()::text)
      ON CONFLICT (resend_id) DO NOTHING
    `;

    // 8. Update outbound email if CPN match found
    if (outboundId) {
      cpnReplies++;
      const needsResp = classification.label === "interested" || classification.label === "info_request";
      if (needsResp) needsResponse++;

      const newTags = needsResp
        ? '["cpn-outreach","needs_response"]'
        : CPN_TAG;

      await sql`
        UPDATE contact_emails
        SET reply_received = true,
            reply_received_at = ${new Date().toISOString()},
            reply_classification = ${classification.label},
            tags = ${newTags},
            updated_at = now()::text
        WHERE id = ${outboundId}
      `;

      // 9. Handle unsubscribe
      if (classification.label === "unsubscribe" && contactId) {
        await sql`UPDATE contacts SET do_not_contact = true WHERE id = ${contactId}`;
      }

      console.log(`  ✓ ${fromEmail} → ${classification.label} (${(classification.confidence * 100).toFixed(0)}%) ${needsResp ? "⚡ NEEDS RESPONSE" : ""}`);
    } else {
      console.log(`  · ${fromEmail} → ${classification.label} (no CPN match)`);
    }
  }

  // Summary
  console.log(`\n── Summary ──`);
  console.log(`  Total synced:    ${newEmails.length}`);
  console.log(`  CPN replies:     ${cpnReplies}`);
  console.log(`  Needs response:  ${needsResponse}`);
  console.log(`  Classifications:`);
  for (const [label, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${label}: ${count}`);
  }

  // Also re-check existing received emails that might not have been matched
  const unmatched = await sql`
    SELECT re.id, re.from_email, re.subject, re.classification, re.resend_id
    FROM received_emails re
    WHERE re.matched_outbound_id IS NULL
    AND re.from_email IN (
      SELECT c.email FROM contacts c
      JOIN contact_emails ce ON ce.contact_id = c.id
      WHERE ce.tags = ${CPN_TAG}
    )
  `;

  if (unmatched.length > 0) {
    console.log(`\n  Retroactively matching ${unmatched.length} previously unmatched emails...`);
    for (const row of unmatched) {
      const contact = await sql`SELECT id FROM contacts WHERE LOWER(email) = LOWER(${row.from_email}) LIMIT 1`;
      if (contact.length === 0) continue;
      const outbound = await sql`SELECT id FROM contact_emails WHERE contact_id = ${contact[0].id} AND tags = ${CPN_TAG} LIMIT 1`;
      if (outbound.length === 0) continue;

      const cls = row.classification ?? classifyReply(row.subject ?? "", "").label;
      const needsResp = cls === "interested" || cls === "info_request";

      await sql`UPDATE received_emails SET matched_contact_id = ${contact[0].id}, matched_outbound_id = ${outbound[0].id}, updated_at = now()::text WHERE id = ${row.id}`;
      await sql`UPDATE contact_emails SET reply_received = true, reply_received_at = now()::text, reply_classification = ${cls}, tags = ${needsResp ? '["cpn-outreach","needs_response"]' : CPN_TAG}, updated_at = now()::text WHERE id = ${outbound[0].id}`;

      console.log(`    ✓ ${row.from_email} → ${cls} (retroactive)`);
    }
  }

  console.log(`\nDone.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
