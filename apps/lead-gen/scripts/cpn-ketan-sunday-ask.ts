#!/usr/bin/env npx tsx
/**
 * One-off reply to Ketan: he said he'll finish "next week". Politely note
 * we're at 11 finishers now and ask if Sunday (May 3) is possible so the
 * rest of the cohort isn't waiting on the next verification round.
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

Thanks so much for the quick reply — really appreciate it, and absolutely no problem.

Tiny bit of context in case it helps: we're sitting at 11 finishers right now, and I've been holding the verification submission so you can come in as the 12th and we send one clean batch instead of two. If wrapping the last two courses by end of day Sunday (May 3) is at all doable on your side, I can submit early next week and the rest of the cohort won't have to wait for the following round.

If next week is the realistic timing for you, that's completely fine — please don't rush on my account. Either way you'll be in. Just wanted to flag the Sunday window in case it happens to line up.

Thanks again, Ketan.

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
     'followup_7', '7', now()::text, now()::text)
`;

console.log(`sent (resend_id=${resendId})`);
