/**
 * Process all received emails: reclassify zero-confidence + match unmatched contacts.
 *
 * Fixes:
 * 1. Reclassifies emails with classification_confidence=0 using improved classifier
 * 2. Classifies emails with NULL classification
 * 3. Matches unmatched emails to contacts + outbound CPN emails
 * 4. Updates contact_emails tags (needs_response for interested/info_request)
 *
 * Usage:
 *   pnpm process-emails
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { classifyReply } from "@/lib/email/reply-classifier";

const CPN_TAG = '["cpn-outreach"]';

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);

  // ── Step 1: Reclassify zero-confidence + unclassified emails ──────────────

  const toReclassify = await sql`
    SELECT id, from_email, subject, text_content, html_content, classification, classification_confidence, matched_contact_id, matched_outbound_id
    FROM received_emails
    WHERE classification IS NULL
       OR classification_confidence = 0
       OR classification_confidence IS NULL
    ORDER BY received_at DESC
  `;

  console.log(`\n── Reclassification ──`);
  console.log(`  Found ${toReclassify.length} emails to reclassify\n`);

  const reclassStats: Record<string, { from: string; to: string; count: number }[]> = {};
  let reclassified = 0;
  let changed = 0;

  for (const email of toReclassify) {
    const body = email.text_content || email.html_content || "";
    const result = classifyReply(email.subject || "", body);
    const oldClass = email.classification ?? "NULL";
    const newClass = result.label;

    if (oldClass !== newClass || !email.classification) {
      await sql`
        UPDATE received_emails
        SET classification = ${result.label},
            classification_confidence = ${result.confidence},
            classified_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
        WHERE id = ${email.id}
      `;
      changed++;
      console.log(`  ✓ #${email.id} ${email.from_email}: ${oldClass} → ${newClass} (${(result.confidence * 100).toFixed(0)}%)`);
    } else {
      // Update confidence even if label didn't change
      await sql`
        UPDATE received_emails
        SET classification_confidence = ${result.confidence},
            classified_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
        WHERE id = ${email.id}
      `;
    }
    reclassified++;
  }

  console.log(`\n  Reclassified: ${reclassified} (${changed} changed)\n`);

  // ── Step 2: Match unmatched emails to contacts ────────────────────────────

  const unmatched = await sql`
    SELECT re.id, re.from_email, re.subject, re.classification
    FROM received_emails re
    WHERE re.matched_contact_id IS NULL
      AND re.classification NOT IN ('auto_reply', 'bounced', 'unsubscribe')
      AND re.from_email NOT LIKE '%apollo.io%'
      AND re.from_email NOT LIKE '%noreply%'
      AND re.from_email NOT LIKE '%no_reply%'
      AND re.from_email NOT LIKE '%paypal%'
    ORDER BY re.received_at DESC
  `;

  console.log(`── Contact Matching ──`);
  console.log(`  Found ${unmatched.length} unmatched emails to process\n`);

  let matched = 0;
  let matchedCpn = 0;

  for (const email of unmatched) {
    // Try primary email match
    const contactMatch = await sql`
      SELECT id FROM contacts WHERE LOWER(email) = LOWER(${email.from_email}) LIMIT 1
    `;

    if (contactMatch.length === 0) {
      // Try JSON array match
      const arrayMatch = await sql`
        SELECT id FROM contacts WHERE emails::jsonb @> ${JSON.stringify([email.from_email.toLowerCase()])}::jsonb LIMIT 1
      `;
      if (arrayMatch.length === 0) continue;
      contactMatch.push(arrayMatch[0]);
    }

    const contactId = contactMatch[0].id;

    // Find CPN outbound email for this contact
    const outbound = await sql`
      SELECT id FROM contact_emails
      WHERE contact_id = ${contactId}
        AND (tags = ${CPN_TAG} OR tags::text LIKE '%cpn%')
      LIMIT 1
    `;
    const outboundId = outbound.length > 0 ? outbound[0].id : null;

    await sql`
      UPDATE received_emails
      SET matched_contact_id = ${contactId},
          matched_outbound_id = ${outboundId},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${email.id}
    `;
    matched++;

    // Update outbound email with reply info
    if (outboundId) {
      matchedCpn++;
      const cls = email.classification ?? "interested";
      const needsResp = cls === "interested" || cls === "info_request";

      await sql`
        UPDATE contact_emails
        SET reply_received = true,
            reply_received_at = COALESCE(reply_received_at, ${new Date().toISOString()}),
            reply_classification = ${cls},
            tags = ${needsResp ? '["cpn-outreach","needs_response"]' : CPN_TAG},
            updated_at = ${new Date().toISOString()}
        WHERE id = ${outboundId}
          AND reply_received IS NOT true
      `;
    }

    console.log(`  ✓ #${email.id} ${email.from_email} → contact:${contactId}${outboundId ? ` outbound:${outboundId}` : ""}`);
  }

  console.log(`\n  Matched: ${matched} (${matchedCpn} CPN)\n`);

  // ── Step 3: Update CPN outbound tags for already-matched reclassified emails ──

  const reclassifiedCpn = await sql`
    SELECT re.id, re.classification, re.matched_outbound_id
    FROM received_emails re
    WHERE re.matched_outbound_id IS NOT NULL
      AND re.classification IN ('interested', 'info_request')
    ORDER BY re.received_at DESC
  `;

  console.log(`── CPN Tag Update ──`);
  let tagsUpdated = 0;

  for (const email of reclassifiedCpn) {
    const result = await sql`
      UPDATE contact_emails
      SET tags = '["cpn-outreach","needs_response"]',
          reply_classification = ${email.classification},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${email.matched_outbound_id}
        AND (tags IS NULL OR tags = ${CPN_TAG})
      RETURNING id
    `;
    if (result.length > 0) {
      tagsUpdated++;
    }
  }

  console.log(`  Updated ${tagsUpdated} outbound tags to needs_response\n`);

  // ── Summary ───────────────────────────────────────────────────────────────

  const finalStats = await sql`
    SELECT classification, COUNT(*) as count
    FROM received_emails
    WHERE classification IS NOT NULL
    GROUP BY classification
    ORDER BY count DESC
  `;

  const unmatchedCount = await sql`
    SELECT COUNT(*) as count
    FROM received_emails
    WHERE matched_contact_id IS NULL
      AND classification NOT IN ('auto_reply', 'bounced', 'unsubscribe')
      AND from_email NOT LIKE '%apollo.io%'
      AND from_email NOT LIKE '%noreply%'
      AND from_email NOT LIKE '%no_reply%'
      AND from_email NOT LIKE '%paypal%'
  `;

  const needsResponseCount = await sql`
    SELECT COUNT(*) as count
    FROM contact_emails
    WHERE tags::text LIKE '%needs_response%'
      AND followup_status IS NULL
  `;

  console.log(`── Final State ──`);
  console.log(`  Classifications:`);
  for (const row of finalStats) {
    console.log(`    ${row.classification}: ${row.count}`);
  }
  console.log(`  Still unmatched: ${unmatchedCount[0].count}`);
  console.log(`  Needs response (no followup yet): ${needsResponseCount[0].count}`);
  console.log(`\nDone.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
