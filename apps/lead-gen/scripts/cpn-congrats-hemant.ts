#!/usr/bin/env npx tsx
/**
 * One-off: congratulate Hemant on finishing all 4 CPN courses.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const CONTACT_ID = 39378;
const TAGS = '["cpn-outreach","cpn-congrats"]';

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const [contact] = (await sql`
    SELECT id, first_name, last_name, email
    FROM contacts
    WHERE id = ${CONTACT_ID}
    LIMIT 1
  `) as unknown as {
    id: number;
    first_name: string;
    last_name: string | null;
    email: string;
  }[];

  if (!contact) {
    console.error(`No contact found for id ${CONTACT_ID}`);
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

Confirmed — all 4 course completion emails landed from Anthropic Academy. That puts you 10th in the cohort. Nicely done.

A few more in the group are finishing this week — I'll submit for verification once they're through, and Anthropic unlocks the Claude Certified Architect Foundations (CCAF) exam for the batch. I'll ping you the moment it's live.

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
       'followup_6', '6', now()::text, now()::text)
  `;

  console.log(`Sent (resend_id=${resendId}), logged to contact_emails.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
