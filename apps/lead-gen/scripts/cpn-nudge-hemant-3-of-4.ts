#!/usr/bin/env npx tsx
/**
 * One-off: nudge Hemant — 3/4 done, only "Building with the Claude API" left.
 * Sent the morning of Apr 24 after his "Claude Code in Action" completion.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TAGS = '["cpn-outreach","cpn-nudge"]';
const CONTACT_ID = 39378;
const SUBJECT = "Re: Your @vadim.blog email is ready - start the courses";
const BODY = `Hi Hemant,

Just saw your Claude Code in Action completion land this morning — nice work. That's 3 of 4 done on your end.

Only "Building with the Claude API" left and you're on the finisher list. 8 of us are through all four now; I'm holding the next verification submission so I can batch a few more of you together.

No rush at all — let me know if anything's in the way.

Vadim`;

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

const [contact] = (await sql`
  SELECT id, first_name, last_name, email
  FROM contacts
  WHERE id = ${CONTACT_ID}
  LIMIT 1
`) as Array<{ id: number; first_name: string; last_name: string | null; email: string }>;

if (!contact) {
  console.error(`No contact found for id ${CONTACT_ID}`);
  process.exit(1);
}

const name = `${contact.first_name} ${contact.last_name ?? ""}`.trim();

const [lastOutbound] = (await sql`
  SELECT id FROM contact_emails
  WHERE contact_id = ${contact.id} AND tags LIKE '%cpn-outreach%'
  ORDER BY id DESC LIMIT 1
`) as Array<{ id: number }>;

console.log(`→ ${name} <${contact.email}>  (contact_id=${contact.id})`);

const result = await resend.emails.send({
  from: FROM,
  to: contact.email,
  subject: SUBJECT,
  text: BODY,
});

if (result.error) {
  console.error(`FAILED: ${result.error.message}`);
  process.exit(1);
}

const resendId = result.data?.id ?? "";

await sql`
  INSERT INTO contact_emails
    (contact_id, resend_id, from_email, to_emails, subject, text_content, status,
     sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number,
     created_at, updated_at)
  VALUES
    (${contact.id}, ${resendId}, 'contact@vadim.blog',
     ${JSON.stringify([contact.email])}, ${SUBJECT}, ${BODY}, 'sent',
     now()::text, ${TAGS}, ${name}, ${lastOutbound?.id ?? null},
     'followup_5', '5', now()::text, now()::text)
`;

console.log(`sent (resend_id=${resendId})`);
