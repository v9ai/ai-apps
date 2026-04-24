#!/usr/bin/env npx tsx
/**
 * One-off: single email to Lisa & Martyna at TasteHub (both 0/4).
 * Sent together since they're teammates and were both at the Apr 21 call.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TAGS = '["cpn-outreach","cpn-nudge"]';
const CONTACT_IDS = [39870, 46179]; // Lisa, Martyna
const SUBJECT = "Re: Your @vadim.blog email is ready - start the courses";
const BODY = `Hi Lisa, Martyna,

Quick cohort update — 8 of us are through all 4 courses now, and Hemant just landed course 3 this morning. Good momentum in the group.

Whenever the two of you have a window to start the courses, let me know and I'll plan the next verification submission around it. Happy to answer anything or help clear blockers.

Learning path: https://anthropic.skilljar.com/page/claude-partner-network-learning-path

Vadim`;

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

const contacts = (await sql`
  SELECT id, first_name, last_name, email
  FROM contacts
  WHERE id = ANY(${CONTACT_IDS})
  ORDER BY id
`) as Array<{ id: number; first_name: string; last_name: string | null; email: string }>;

if (contacts.length !== CONTACT_IDS.length) {
  console.error(`Expected ${CONTACT_IDS.length} contacts, got ${contacts.length}`);
  process.exit(1);
}

const toEmails = contacts.map((c) => c.email);
console.log(`→ ${toEmails.join(", ")}`);

const result = await resend.emails.send({
  from: FROM,
  to: toEmails,
  subject: SUBJECT,
  text: BODY,
});

if (result.error) {
  console.error(`FAILED: ${result.error.message}`);
  process.exit(1);
}

const resendId = result.data?.id ?? "";
console.log(`sent (resend_id=${resendId})`);

// Log one row per contact so the thread shows up on both timelines.
for (const c of contacts) {
  const name = `${c.first_name} ${c.last_name ?? ""}`.trim();

  const [lastOutbound] = (await sql`
    SELECT id FROM contact_emails
    WHERE contact_id = ${c.id} AND tags LIKE '%cpn-outreach%'
    ORDER BY id DESC LIMIT 1
  `) as Array<{ id: number }>;

  await sql`
    INSERT INTO contact_emails
      (contact_id, resend_id, from_email, to_emails, subject, text_content, status,
       sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number,
       created_at, updated_at)
    VALUES
      (${c.id}, ${resendId}, 'contact@vadim.blog',
       ${JSON.stringify(toEmails)}, ${SUBJECT}, ${BODY}, 'sent',
       now()::text, ${TAGS}, ${name}, ${lastOutbound?.id ?? null},
       'followup_1', '1', now()::text, now()::text)
  `;
  console.log(`  logged for ${name} (contact_id=${c.id})`);
}
