#!/usr/bin/env npx tsx
/**
 * One-off: mid-cohort encouragement for Ketan — finished MCP today, halfway through.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TARGET_EMAIL = "ketangupta34@gmail.com";
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

Saw the MCP completion land — and that you jumped straight into Claude Code in Action right after. Nice momentum.

That puts you at 2 of 4 done. Still open: Building with the Claude API (you registered on the 20th but haven't finished it yet) and Claude Code in Action (just started).

Knock those two out and I can include you when I submit the cohort to Anthropic for verification — that's what unlocks the CCAF exam for us.

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
