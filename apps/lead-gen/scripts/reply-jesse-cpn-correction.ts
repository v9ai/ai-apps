#!/usr/bin/env npx tsx
/**
 * One-off: send Jesse a correction to scripts/reply-jesse-cpn-fourth-course.ts.
 * That reply called "Building with the Claude API" the simpler / shorter of
 * the four — it's actually the longest (85 lessons). Apologise for the
 * assumption and keep the encouragement.
 *
 * Threads to Jesse's original Proton message (received_emails.id=1045) so
 * Proton folds it into the same conversation as the prior reply.
 *
 * Dry-run by default. Pass --send to actually fire.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TO = "hesreallyhim@proton.me";
const RECIPIENT_NAME = "Jesse";
const CONTACT_ID = 39271;
const IN_REPLY_TO_RECEIVED_ID = 1045;
const REPLY_MESSAGE_ID =
  "<HXlmVcYZkxALi6d8sDkZ_U47jwtzb7paSlm3ip-bAqa3IFu7L3OmIJoSj1AxiMD7mmZlOGWtSIcVcIvFkt7exP_ZK73oC-gMWBwNclLymiw=@proton.me>";
const TAGS = '["cpn-outreach","cpn-reply","cpn-correction"]';

const sql = neon(process.env.NEON_DATABASE_URL!);

const subject = "Re: Your @vadim.blog email is ready - start the courses";

const text = `Hi Jesse,

Small correction on what I just sent — I assumed you were going through the courses in the order they appear in the path, so I called Building with the Claude API "the simpler / shorter of the four." That was wrong: it's actually the longest one (85 lessons). Sorry for the offhand framing.

Three deep, you've already got more than enough momentum to push it through. I'll fold you into the next verification batch the moment it's in.

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
       'reply', '2',
       ${parentEmailId}, ${IN_REPLY_TO_RECEIVED_ID},
       ${JSON.stringify({
         "In-Reply-To": REPLY_MESSAGE_ID,
         References: REPLY_MESSAGE_ID,
       })},
       now()::text, now()::text)
  `;

  console.log(`Sent (resend_id=${resendId}), logged.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
