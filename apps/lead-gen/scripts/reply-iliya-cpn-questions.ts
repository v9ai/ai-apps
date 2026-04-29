#!/usr/bin/env npx tsx
/**
 * One-off: reply to Илия (iliyazelenkog@gmail.com), received_emails.id=1025,
 * with answers to his CCAF / certificate / alias questions and the May 3
 * (Sunday) deadline for finishing the courses before submission.
 *
 * Threads the reply via In-Reply-To/References against his Gmail Message-ID
 * and links the outbound row to received_emails.id=1025 + parent
 * contact_emails.id=1604 (the followup_3 he replied to).
 *
 * Dry-run by default. Pass --send to actually fire.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TO = "iliyazelenkog@gmail.com";
const RECIPIENT_NAME = "Илия";
const CONTACT_ID = 39253;
const PARENT_EMAIL_ID = 1604;
const IN_REPLY_TO_RECEIVED_ID = 1025;
const REPLY_MESSAGE_ID =
  "<CAN4caFWTtAbmhndN8R5SO_nARCPKuXzSHT2z=AEPNz+QrjncWw@mail.gmail.com>";
const TAGS = '["cpn-outreach","cpn-reply"]';

const sql = neon(process.env.NEON_DATABASE_URL!);

const subject = "Re: Your @vadim.blog email is ready - start the courses";

const text = `Hi Илия,

Quick answers, in order:

1) Right — the 4-course path unlocks CCAF exam access at the org level. Deadline to finish the courses is this Sunday (May 3); right after that I submit the cohort to Anthropic for verification.

2) Yes — once Anthropic verifies the cohort, every participant who personally completed the 4 courses gets their own CCAF exam access. The exam and certificate are individual, not pooled.

3) The CCAF certificate is issued in your personal name (whatever you have on your Anthropic Academy / Skilljar profile) and it's independently verifiable. LinkedIn doesn't expose the email on any posted certification — my own LinkedIn certifications page and a Skilljar verify URL show no email anywhere:

   https://www.linkedin.com/in/v9ai/details/certifications/
   https://verify.skilljar.com/c/2g887jd5y2q3

On the alias: keep iliyazelenkog@vadim.blog on your Anthropic Academy profile until I submit the Partner Network form. Anthropic's submission step requires every cohort email to match the company domain (vadim.blog) — exact wording from their form: "The email addresses you list below must all match your company domain."

After Anthropic verifies the org and unlocks CCAF, you can switch the email on your Skilljar profile to your personal one (the field is editable at https://anthropic.skilljar.com/accounts/profile/). Your certificates and the CCAF entry stay attached to your personal name regardless.

Vadim`;

async function main() {
  const send = process.argv.includes("--send");

  console.log(`\nFrom:    ${FROM}`);
  console.log(`To:      ${RECIPIENT_NAME} <${TO}>`);
  console.log(`Subject: ${subject}`);
  console.log(`In-Reply-To: ${REPLY_MESSAGE_ID}`);
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
       'reply', '4',
       ${PARENT_EMAIL_ID}, ${IN_REPLY_TO_RECEIVED_ID},
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
     WHERE id = ${PARENT_EMAIL_ID}
  `;

  await sql`
    UPDATE received_emails
       SET matched_outbound_id = ${PARENT_EMAIL_ID},
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
