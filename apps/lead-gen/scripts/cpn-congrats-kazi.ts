#!/usr/bin/env npx tsx
/**
 * One-off: congratulate Kazi on finishing all 4 CPN courses.
 *
 * Threads off his most recent received_emails row (the "completed all four
 * courses" reply) so the send lands in the existing Gmail thread rather than
 * forking a new one. Backfills threading metadata on contact_emails and
 * received_emails, mirroring scripts/reply-kazi-cpn-confirm.ts.
 *
 * Dry-run by default. Pass --send to actually fire.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const CONTACT_ID = 39280;
const TO = "kazimusharraf1234@gmail.com";
const RECIPIENT_NAME = "Kazi";
const TAGS = '["cpn-outreach","cpn-congrats"]';

const sql = neon(process.env.NEON_DATABASE_URL!);

const subject = "Re: Your @vadim.blog email is ready - start the courses";

const text = `Hi Kazi,

Confirmed — all four completions landed. Nicely done, especially given the tight turnaround.

On the verification batch: I'm waiting on a few more in the cohort to wrap up this week, then I'll submit the batch to Anthropic. They unlock the Claude Certified Architect Foundations (CCAF) exam for the whole group at once, so I'll ping you the moment it's live — should be within days of the submission.

Vadim`;

async function main() {
  const send = process.argv.includes("--send");

  const [latestReceived] = (await sql`
    SELECT id, message_id, received_at, subject
      FROM received_emails
     WHERE matched_contact_id = ${CONTACT_ID}
     ORDER BY received_at DESC NULLS LAST
     LIMIT 1
  `) as unknown as {
    id: number;
    message_id: string | null;
    received_at: string;
    subject: string | null;
  }[];

  if (!latestReceived) {
    throw new Error(`No received_emails row matched to contact ${CONTACT_ID}`);
  }
  if (!latestReceived.message_id) {
    console.warn(
      `WARNING: received_emails.id=${latestReceived.id} has no message_id — thread will fork in Gmail.`,
    );
  }

  const [parentOutbound] = (await sql`
    SELECT id, subject
      FROM contact_emails
     WHERE contact_id = ${CONTACT_ID}
       AND tags LIKE '%cpn-outreach%'
     ORDER BY id DESC
     LIMIT 1
  `) as unknown as { id: number; subject: string }[];

  if (!parentOutbound) {
    throw new Error(`No cpn-outreach contact_emails row for contact ${CONTACT_ID}`);
  }

  console.log(`\nFrom:    ${FROM}`);
  console.log(`To:      ${RECIPIENT_NAME} <${TO}>`);
  console.log(`Subject: ${subject}`);
  console.log(`In-Reply-To:    ${latestReceived.message_id ?? "(none)"}`);
  console.log(`received_emails.id: ${latestReceived.id}`);
  console.log(`parent_email_id:    ${parentOutbound.id}`);
  console.log(`\n${text}\n`);

  if (!send) {
    console.log("(dry-run — pass --send to actually send)");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const headers: Record<string, string> = {};
  if (latestReceived.message_id) {
    headers["In-Reply-To"] = latestReceived.message_id;
    headers["References"] = latestReceived.message_id;
  }

  const result = await resend.emails.send({
    from: FROM,
    to: TO,
    subject,
    text,
    headers,
  });

  if (result.error) {
    console.error(`Failed: ${result.error.message}`);
    process.exit(1);
  }

  const resendId = result.data?.id ?? "";

  await sql`
    INSERT INTO contact_emails
      (contact_id, resend_id, from_email, to_emails, subject, text_content, status,
       sent_at, tags, recipient_name, sequence_type, sequence_number,
       parent_email_id, in_reply_to_received_id, headers,
       created_at, updated_at)
    VALUES
      (${CONTACT_ID}, ${resendId}, 'contact@vadim.blog',
       ${JSON.stringify([TO])}, ${subject}, ${text}, 'sent',
       now()::text, ${TAGS}, ${RECIPIENT_NAME},
       'cpn-congrats', '1',
       ${parentOutbound.id}, ${latestReceived.id},
       ${JSON.stringify(headers)},
       now()::text, now()::text)
  `;

  await sql`
    UPDATE contact_emails
       SET reply_received = true,
           reply_received_at = (
             SELECT received_at FROM received_emails WHERE id = ${latestReceived.id}
           ),
           reply_classification = (
             SELECT classification FROM received_emails WHERE id = ${latestReceived.id}
           ),
           updated_at = now()::text
     WHERE id = ${parentOutbound.id}
  `;

  await sql`
    UPDATE received_emails
       SET matched_outbound_id = ${parentOutbound.id},
           updated_at = now()::text
     WHERE id = ${latestReceived.id}
       AND matched_outbound_id IS NULL
  `;

  console.log(`Sent (resend_id=${resendId}), logged + threading backfilled.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
