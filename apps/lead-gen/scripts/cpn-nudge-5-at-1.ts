#!/usr/bin/env npx tsx
/**
 * One-off: polite nudge to 5 cohort members stuck at 1 completion.
 * Shares that 7 finishers are already through and some are asking about next steps.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TAGS = '["cpn-outreach","cpn-nudge"]';

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

type Recipient = {
  contactId: number;
  greetingName: string;
  body: string;
};

const RECIPIENTS: Recipient[] = [
  {
    contactId: 39759,
    greetingName: "Bella",
    body: `Hi Bella,

Hope you're doing well. Small update from the cohort side — we're now at 7 people who've finished all 4 courses, and a few of them have already been asking about what comes next after verification. There's real momentum building, which is nice to see.

I noticed you're registered for three of the courses and have "Introduction to agent skills" under your belt — thank you for starting. Whenever the timing works for you, I'd love to fold you into the next verification batch along with the others.

Absolutely no pressure on pace — just wanted to keep you in the loop and let you know we're getting close. If anything's getting in the way, I'm very happy to help however I can.

Thanks again for being part of this.

Vadim`,
  },
  {
    contactId: 39378,
    greetingName: "Hemant",
    body: `Hi Hemant,

Hope all's well. A quick, friendly update — 7 people in the cohort have now completed all 4 courses, and a few of them have already reached out asking about next steps after verification. Good energy in the group.

I saw you're registered for all 4 courses and have "Introduction to agent skills" finished — really appreciate you getting set up across the full path. Whenever you've got time to work through the other three, I'd love to include you in the next verification submission.

No rush whatsoever — just sharing where we are. If there's anything slowing you down or anything I can help with, please just say the word.

Thanks again for joining in.

Vadim`,
  },
  {
    contactId: 39318,
    greetingName: "Ketan",
    body: `Hi Ketan,

Hope you're well. A brief update on the cohort — we're now at 7 people who've finished all 4 courses. A handful of them have already been asking about what happens after verification, which has been really encouraging.

Thank you for getting started on your side — "Introduction to agent skills" is done, and I can see you're registered for Claude API as well. Whenever it's convenient for you to work through the remaining courses, I'd love to include you in the next verification batch.

Please don't feel any pressure on timing — I'm genuinely happy to adjust around your schedule or help with anything that's in the way.

Thanks again for being part of this.

Vadim`,
  },
  {
    contactId: 39280,
    greetingName: "Kazi",
    body: `Hi Kazi,

Hope things are going well. A quick, warm update — the cohort just hit 7 people with all 4 courses completed, and several of them have already been asking about next steps after verification. There's good momentum in the group.

Thank you for getting "Introduction to agent skills" done — I can see you're also signed up for Claude API and MCP, which is great. Whenever the timing works, I'd love to include you in the next verification submission alongside the others.

No pressure at all on pace — just keeping you in the loop. And if anything is getting in the way, I'm very happy to help.

Thanks again for being part of this with me.

Vadim`,
  },
  {
    contactId: 39908,
    greetingName: "Tom",
    body: `Hi Tom,

Hope you're well. A small update from the cohort — we're now at 7 people with all 4 courses completed, and a few of them have already been asking about what comes after verification. Really positive energy in the group.

Thank you for getting started — "Introduction to agent skills" is done on your side, and I saw you're also registered for Claude API. Whenever the timing fits, I'd love to fold you into the next verification batch with the others.

Absolutely no rush — just wanted to share where we are and let you know there's good momentum. If anything's in the way, I'm genuinely happy to help.

Thanks again for joining in.

Vadim`,
  },
];

async function sendOne(r: Recipient) {
  const [contact] = (await sql`
    SELECT id, first_name, last_name, email
    FROM contacts
    WHERE id = ${r.contactId}
    LIMIT 1
  `) as unknown as {
    id: number;
    first_name: string;
    last_name: string | null;
    email: string;
  }[];

  if (!contact) {
    console.error(`No contact found for id ${r.contactId}`);
    return;
  }

  const name = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
  const subject = `Re: Your @vadim.blog email is ready - start the courses`;

  const [lastOutbound] = (await sql`
    SELECT id FROM contact_emails
    WHERE contact_id = ${contact.id} AND tags LIKE '%cpn-outreach%'
    ORDER BY id DESC LIMIT 1
  `) as unknown as { id: number }[];

  console.log(`\n→ ${r.greetingName} <${contact.email}>  (contact_id=${contact.id})`);

  const result = await resend.emails.send({
    from: FROM,
    to: contact.email,
    subject,
    text: r.body,
  });

  if (result.error) {
    console.error(`  FAILED: ${result.error.message}`);
    return;
  }

  const resendId = result.data?.id ?? "";

  await sql`
    INSERT INTO contact_emails
      (contact_id, resend_id, from_email, to_emails, subject, text_content, status,
       sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number,
       created_at, updated_at)
    VALUES
      (${contact.id}, ${resendId}, 'contact@vadim.blog',
       ${JSON.stringify([contact.email])}, ${subject}, ${r.body}, 'sent',
       now()::text, ${TAGS}, ${name}, ${lastOutbound?.id ?? null},
       'followup_4', '4', now()::text, now()::text)
  `;

  console.log(`  sent (resend_id=${resendId})`);
}

async function main() {
  for (const r of RECIPIENTS) {
    await sendOne(r);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
