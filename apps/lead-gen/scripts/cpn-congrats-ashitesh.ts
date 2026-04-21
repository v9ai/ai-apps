#!/usr/bin/env npx tsx
/**
 * One-off: congratulate Ashitesh on finishing all 4 CPN courses.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TARGET_EMAIL = "raghuvesh1285@gmail.com";
const TAGS = '["cpn-outreach","cpn-congrats"]';

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const [contact] = (await sql`
    SELECT id, first_name, last_name, email
    FROM contacts
    WHERE lower(email) = lower(${TARGET_EMAIL})
    LIMIT 1
  `) as unknown as {
    id: number;
    first_name: string;
    last_name: string | null;
    email: string;
  }[];

  if (!contact) {
    console.error(`No contact found for ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const name = `${contact.first_name} ${contact.last_name ?? ""}`.trim();

  const [lastOutbound] = (await sql`
    SELECT id, subject
    FROM contact_emails
    WHERE contact_id = ${contact.id} AND tags LIKE '%cpn-outreach%'
    ORDER BY id DESC
    LIMIT 1
  `) as unknown as { id: number; subject: string }[];

  const subject = `Re: Your @vadim.blog email is ready - start the courses`;
  const text = `Hi ${contact.first_name},

Confirmed — all 4 course completion emails landed from Anthropic Academy. That puts you 6th in the cohort.

Next step on my side: I'll submit for verification once a few more of the group finish, then Anthropic unlocks the Claude Certified Architect Foundations (CCAF) exam for us. I'll ping you the moment it's live.

Nicely done.

Vadim`;

  console.log(`\nSending to: ${name} <${contact.email}>`);
  console.log(`Subject: ${subject}`);
  console.log(`\n${text}\n`);

  const result = await resend.emails.send({
    from: FROM,
    to: contact.email,
    subject,
    text,
  });

  if (result.error) {
    console.error(`Failed: ${result.error.message}`);
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
       ${JSON.stringify([contact.email])}, ${subject}, ${text}, 'sent',
       now()::text, ${TAGS}, ${name}, ${lastOutbound?.id ?? null},
       'followup_3', '3', now()::text, now()::text)
  `;

  console.log(`Sent (resend_id=${resendId}), logged to contact_emails.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
