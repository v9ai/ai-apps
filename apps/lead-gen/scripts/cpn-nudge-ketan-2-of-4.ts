#!/usr/bin/env npx tsx
/**
 * One-off: nudge Ketan — 2/4 done (Skills + MCP), API and Code in Action still open.
 * Last touch was a generic followup_5 on Apr 29; this is a personalized followup_6.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TAGS = '["cpn-outreach","cpn-nudge"]';
const CONTACT_ID = 39318;
const SUBJECT = "Re: Your @vadim.blog email is ready - start the courses";
const BODY = `Hi Ketan,

Happy Friday — saw your MCP completion land earlier this week, that's 2 of 4 done. You're already registered for both remaining courses (Building with the Claude API and Claude Code in Action), so you're past the hard part.

11 of us are through all four now. Whenever you wrap the last two, I'll add you to the next batch I send to Karl.

No pressure on timing — let me know if anything's blocking you on either course.

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
     'followup_6', '6', now()::text, now()::text)
`;

console.log(`sent (resend_id=${resendId})`);
