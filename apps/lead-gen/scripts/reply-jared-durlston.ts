#!/usr/bin/env npx tsx
/**
 * One-off: cold reply to Jared (Durlston Partners) re: AI roles in UAE / London.
 * Upserts the contact, sends via Resend, logs the outbound to contact_emails.
 * Dry-run by default. Pass --send to actually fire.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TO = "jared@durlstonpartners.com";
const FIRST_NAME = "Jared";
const LAST_NAME = "Durlston"; // best-guess; recruiter at Durlston Partners
const COMPANY = "Durlston Partners";
const POSITION = "Recruiter";
const TAGS = '["recruiter","inbound-reply"]';

const sql = neon(process.env.NEON_DATABASE_URL!);

const subject = "Agentic systems in production — AI engineer, remote-only";

const text = `Hi Jared,

Saw your post on the AI roles — the stack you listed (agentic systems, LangGraph, MCP, Deep Research-style agents, LoRA/SFT/DPO) is exactly what I'm building day to day, so figured I'd reach out directly.

What I'm shipping: a B2B lead-gen platform running multi-agent workflows on live data — LangGraph graphs for email compose/reply/outreach, MCP-wired tools over a Neon Postgres catalog, ReAct-style deep research squads that debate competing hypotheses before producing a GO/NO-GO verdict. Not notebooks — actual users, actual inboxes, actual production traffic.

On the post-training side: local Qwen teachers via mlx_lm.server, LoRA distillation for contact scoring, MLX embeddings hitting ~4.6k docs/sec on an M1. Comfortable going from data collection through SFT/DPO to a served endpoint.

One hard constraint: I'm remote-only, globally. I know most of what you listed is UAE or London on-site — if any of the seven support fully remote, I'd love to hear which. If none do, no hard feelings, appreciate you reading this far.

Best,
Vadim`;

async function upsertContact(): Promise<number> {
  const existing = (await sql`
    SELECT id FROM contacts WHERE lower(email) = lower(${TO}) LIMIT 1
  `) as unknown as { id: number }[];

  if (existing[0]) {
    console.log(`Contact exists (id=${existing[0].id}).`);
    return existing[0].id;
  }

  const [row] = (await sql`
    INSERT INTO contacts
      (first_name, last_name, email, company, position, tags, created_at, updated_at)
    VALUES
      (${FIRST_NAME}, ${LAST_NAME}, ${TO}, ${COMPANY}, ${POSITION}, ${TAGS}, now()::text, now()::text)
    RETURNING id
  `) as unknown as { id: number }[];

  console.log(`Contact inserted (id=${row.id}).`);
  return row.id;
}

async function main() {
  const send = process.argv.includes("--send");
  const name = `${FIRST_NAME} ${LAST_NAME}`.trim();

  console.log(`\nFrom:    ${FROM}`);
  console.log(`To:      ${name} <${TO}>`);
  console.log(`Subject: ${subject}`);
  console.log(`\n${text}\n`);

  if (!send) {
    console.log("(dry-run — pass --send to actually send)");
    return;
  }

  const contactId = await upsertContact();

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM,
    to: TO,
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
       sent_at, tags, recipient_name, sequence_type, sequence_number,
       created_at, updated_at)
    VALUES
      (${contactId}, ${resendId}, 'contact@vadim.blog',
       ${JSON.stringify([TO])}, ${subject}, ${text}, 'sent',
       now()::text, ${TAGS}, ${name},
       'initial', '0', now()::text, now()::text)
  `;

  console.log(`Sent (resend_id=${resendId}), logged to contact_emails.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
