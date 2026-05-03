#!/usr/bin/env npx tsx
/**
 * One-off: reply to Saradindu (saradindu.mi1@iiitmk.ac.in), received_emails.id=1059,
 * acknowledging completion of the first 2 CPN courses and confirming he's on
 * track for the next verification batch once he wraps MCP + Claude Code in Action.
 *
 * Threads via In-Reply-To/References against his Gmail Message-ID, looks up
 * his parent outbound (the "@vadim.blog email is ready" he replied to)
 * at runtime, and backfills threading on both contact_emails and received_emails.
 *
 * Dry-run by default. Pass --send to actually fire.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TO = "saradindu.mi1@iiitmk.ac.in";
const RECIPIENT_NAME = "Saradindu";
const CONTACT_ID = 39002;
const IN_REPLY_TO_RECEIVED_ID = 1059;
const REPLY_MESSAGE_ID =
  "<CAKNXc4ZR9BgstbMhgzKQW8LL2Sth_-sCZ4bPiJ-haTsfuMLLbQ@mail.gmail.com>";
const TAGS = '["cpn-outreach","cpn-reply"]';

const sql = neon(process.env.NEON_DATABASE_URL!);

const subject = "Re: Your @vadim.blog email is ready - start the courses";

const text = `Hi Saradindu,

Nice — Building with the Claude API is the heaviest of the four (84 lessons, ~8 hours), so you're past the hump. The remaining two are lighter:

1. Introduction to Model Context Protocol — mostly conceptual, builds directly on what you just finished
2. Claude Code in Action — hands-on with the CLI, MCP integration patterns

That order is the natural flow.

I was planning to submit the verification batch to Anthropic tomorrow morning, but I'll hold it for you — two days is fine. Just reply on this thread the moment you wrap the last one and I'll include you in that same submission for the Claude Certified Architect Foundations (CCAF) exam unlock.

If anything's blocking — content, account access, anything — just shout.

Vadim`;

async function findParentEmailId(): Promise<number> {
  const rows = (await sql`
    SELECT id
      FROM contact_emails
     WHERE contact_id = ${CONTACT_ID}
       AND subject ILIKE '%Your @vadim.blog email is ready%'
     ORDER BY sent_at DESC NULLS LAST
     LIMIT 1
  `) as unknown as { id: number }[];

  if (!rows[0]) {
    throw new Error(
      `No parent outbound found for contact ${CONTACT_ID} with subject ~ "Your @vadim.blog email is ready"`,
    );
  }
  return rows[0].id;
}

async function main() {
  const send = process.argv.includes("--send");
  const parentEmailId = await findParentEmailId();

  console.log(`\nFrom:    ${FROM}`);
  console.log(`To:      ${RECIPIENT_NAME} <${TO}>`);
  console.log(`Subject: ${subject}`);
  console.log(`In-Reply-To:    ${REPLY_MESSAGE_ID}`);
  console.log(`parent_email_id: ${parentEmailId}`);
  console.log(`\n${text}\n`);

  if (!send) {
    console.log("(dry-run — pass --send to actually send)");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM,
    to: TO,
    subject,
    text,
    headers: {
      "In-Reply-To": REPLY_MESSAGE_ID,
      References: REPLY_MESSAGE_ID,
    },
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
       'reply', '1',
       ${parentEmailId}, ${IN_REPLY_TO_RECEIVED_ID},
       ${JSON.stringify({
         "In-Reply-To": REPLY_MESSAGE_ID,
         References: REPLY_MESSAGE_ID,
       })},
       now()::text, now()::text)
  `;

  await sql`
    UPDATE contact_emails
       SET reply_received = true,
           reply_received_at = (
             SELECT received_at FROM received_emails WHERE id = ${IN_REPLY_TO_RECEIVED_ID}
           ),
           reply_classification = (
             SELECT classification FROM received_emails WHERE id = ${IN_REPLY_TO_RECEIVED_ID}
           ),
           updated_at = now()::text
     WHERE id = ${parentEmailId}
  `;

  await sql`
    UPDATE received_emails
       SET matched_outbound_id = ${parentEmailId},
           updated_at = now()::text
     WHERE id = ${IN_REPLY_TO_RECEIVED_ID}
       AND matched_outbound_id IS NULL
  `;

  console.log(`Sent (resend_id=${resendId}), logged + threading backfilled.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
