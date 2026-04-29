#!/usr/bin/env npx tsx
/**
 * One-off: nudge the 4 in-progress cohort members ahead of the verification submission.
 * Cohort just hit 10 finishers (Hemant landed today). Submitting for verification soon.
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
  sequenceNumber: string;
  body: string;
};

const RECIPIENTS: Recipient[] = [
  {
    contactId: 39318,
    greetingName: "Ketan",
    sequenceNumber: "5",
    body: `Hi Ketan,

Quick update — the cohort just hit 10 finishers. You're closer than most: Agent Skills and MCP are both done on your side, so you're 2 of 4.

I'm planning to send the next verification batch to Anthropic in the coming days. If "Building with the Claude API" and "Claude Code in Action" land before then, I'll fold you in with the others — would be a clean finish for you.

No rush, but happy to help if anything is in the way.

Vadim`,
  },
  {
    contactId: 39280,
    greetingName: "Kazi",
    sequenceNumber: "5",
    body: `Hi Kazi,

Quick update — the cohort just hit 10 finishers, and I'm getting ready to submit the next verification batch to Anthropic in the coming days.

You've got Agent Skills done already. If you can squeeze the other three in over the next few days (Claude API, MCP, Claude Code in Action), I'll include you in the same submission — saves you waiting for the next round.

No pressure on pace, and very happy to help if anything's blocking.

Vadim`,
  },
  {
    contactId: 39173,
    greetingName: "Mandeep",
    sequenceNumber: "3",
    body: `Hi Mandeep,

Small cohort update — we're at 10 finishers now, and I'll be sending the next verification batch to Anthropic in the coming days.

Saw you have Agent Skills completed already — nice. If you can fit in Claude API, MCP, and Claude Code in Action this week, I'll fold you into the same submission with the others.

No pressure at all on timing — and if anything's in the way, just say the word.

Vadim`,
  },
  {
    contactId: 39759,
    greetingName: "Bella",
    sequenceNumber: "5",
    body: `Hi Bella,

Quick update from the cohort side — we just hit 10 finishers, and I'm planning to send the next verification batch to Anthropic in the coming days.

You've got Agent Skills done already. If you can squeeze in the other three (Claude API, MCP, Claude Code in Action) before then, I'll include you in the same submission with the others.

No rush, no pressure — just keeping you in the loop. Happy to help if anything is blocking.

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
       ${`followup_${r.sequenceNumber}`}, ${r.sequenceNumber}, now()::text, now()::text)
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
