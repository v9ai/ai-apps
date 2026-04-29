#!/usr/bin/env npx tsx
/**
 * One-off: reply to Rajeev (rajeev.cse.imps@gmail.com), received_emails.id=1021,
 * answering his "when is the deadline?" question with Sunday (May 3) and
 * giving him room to slot into the next batch if Sunday isn't realistic.
 *
 * Note: 1021 was originally misclassified as "not_interested" by the LLM —
 * his message is actually a scheduling question. We fix that classification
 * as part of the threading backfill.
 *
 * Threads via In-Reply-To/References against his Gmail Message-ID, looks up
 * his parent outbound at runtime, and backfills threading on both
 * contact_emails and received_emails.
 *
 * Dry-run by default. Pass --send to actually fire.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TO = "rajeev.cse.imps@gmail.com";
const RECIPIENT_NAME = "Rajeev";
const CONTACT_ID = 39204;
const IN_REPLY_TO_RECEIVED_ID = 1021;
const REPLY_MESSAGE_ID =
  "<CAF9QUs3H2HTSzYjXgtd_jxTAsOjfJ0VxDs5=FLQYUMHJN8tmDA@mail.gmail.com>";
const TAGS = '["cpn-outreach","cpn-reply"]';
const FIXED_CLASSIFICATION = "info_request";

const sql = neon(process.env.NEON_DATABASE_URL!);

const subject = "Re: Your @vadim.blog email is ready - start the courses";

const text = `Hi Rajeev,

No worries — busy weeks happen.

Deadline is this Sunday (May 3) end of day. Thursday evening + Friday + Saturday + Sunday should give you a clear runway. Anthropic verifies the full 4-course path per person, so if all 4 by Sunday isn't realistic, I'll just slot you into the next submission round once you're through — no pressure.

Reply if anything's blocking.

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
    UPDATE received_emails
       SET classification = ${FIXED_CLASSIFICATION},
           classification_confidence = 0.9,
           classified_at = now()::text,
           matched_outbound_id = ${parentEmailId},
           updated_at = now()::text
     WHERE id = ${IN_REPLY_TO_RECEIVED_ID}
  `;

  await sql`
    UPDATE contact_emails
       SET reply_received = true,
           reply_received_at = (
             SELECT received_at FROM received_emails WHERE id = ${IN_REPLY_TO_RECEIVED_ID}
           ),
           reply_classification = ${FIXED_CLASSIFICATION},
           updated_at = now()::text
     WHERE id = ${parentEmailId}
  `;

  console.log(`Sent (resend_id=${resendId}), logged + threading backfilled + classification corrected.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
