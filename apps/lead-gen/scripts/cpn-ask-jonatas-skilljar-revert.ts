#!/usr/bin/env npx tsx
/**
 * One-off: ask Jonatas (rank 2 finisher) to flip his Skilljar account email
 * back to jxnxts@vadim.blog just for the Partner Network verification window.
 * He can change it back right after submission — only the login email moves,
 * completions stay attached to the account.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TAGS = '["cpn-outreach","cpn-skilljar-revert"]';
const CONTACT_ID = 38990;
const SUBJECT = "Re: Your @vadim.blog email is ready - start the courses";
const BODY = `Hi Jonatas,

First — congrats again on finishing all four courses. You were one of the very first through, and it really set the tone for the rest of the cohort.

I have a tiny favor to ask before I submit our 10-person cohort to Anthropic this week, and please feel completely free to say no.

I noticed that on Apr 22 your Skilljar account email got switched over to jonatas@vopithe.com. The Anthropic Partner Network form checks each completion against the email I list, and it requires every email to match my company domain (vadim.blog). So if I list jxnxts@vadim.blog they won't be able to verify your completions, and if I list the new address the domain check fails.

Would you be open to flipping your Skilljar login email back to jxnxts@vadim.blog just for the verification window? You can switch it right back to jonatas@vopithe.com the moment Anthropic confirms our submission — the completions stay attached to your account, only the login email moves. From your side it's two short Skilljar account-settings changes, nothing else.

If it's any hassle at all, please don't worry about it. I'll submit our other 10 without you and you'll be the first one I include in the next batch — no awkwardness either way.

Thanks so much, Jonatas. Genuinely appreciate you being part of this.

Vadim`;

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

const [contact] = (await sql`
  SELECT id, first_name, last_name, email
  FROM contacts
  WHERE id = ${CONTACT_ID}
  LIMIT 1
`) as Array<{ id: number; first_name: string; last_name: string | null; email: string }>;

if (!contact) {
  console.error(`No contact found for id ${CONTACT_ID}`);
  process.exit(1);
}

const name = `${contact.first_name} ${contact.last_name ?? ""}`.trim();

const [lastOutbound] = (await sql`
  SELECT id FROM contact_emails
  WHERE contact_id = ${contact.id} AND tags LIKE '%cpn-outreach%'
  ORDER BY id DESC LIMIT 1
`) as Array<{ id: number }>;

console.log(`→ ${name} <${contact.email}>  (contact_id=${contact.id})`);

const result = await resend.emails.send({
  from: FROM,
  to: contact.email,
  subject: SUBJECT,
  text: BODY,
});

if (result.error) {
  console.error(`FAILED: ${result.error.message}`);
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
     ${JSON.stringify([contact.email])}, ${SUBJECT}, ${BODY}, 'sent',
     now()::text, ${TAGS}, ${name}, ${lastOutbound?.id ?? null},
     'skilljar_revert', '1', now()::text, now()::text)
`;

console.log(`sent (resend_id=${resendId})`);
