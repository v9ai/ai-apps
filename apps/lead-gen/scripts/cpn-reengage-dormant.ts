#!/usr/bin/env npx tsx
/**
 * One-off: re-engage CPN signups who got the @vadim.blog onboarding email but
 * have zero course completions on file. Cohort just hit 10 finishers and the
 * next verification submission is going out in the coming days.
 *
 * Usage:
 *   npx tsx scripts/cpn-reengage-dormant.ts --dry-run
 *   npx tsx scripts/cpn-reengage-dormant.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TAGS = '["cpn-outreach","cpn-reengage"]';
const SUBJECT = "Re: Your @vadim.blog email is ready - start the courses";

// Skip TasteHub (handled separately by cpn-nudge-tastehub.ts)
const SKIP_IDS = new Set<number>([39870, 46179]);
// Skip anyone onboarded in the last 48h (re-engaging same-day is noise)
const MIN_HOURS_SINCE_ONBOARDED = 48;

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

const dryRun = process.argv.includes("--dry-run");

type Dormant = {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  onboarded_at: string;
  max_seq: number | null;
  dnc: boolean;
  bounced: boolean;
};

function buildBody(firstName: string): string {
  return `Hi ${firstName},

Quick check-in. The cohort just hit 10 finishers, and I'm planning to send the next verification batch to Anthropic in the coming days — once that lands, Anthropic unlocks the Claude Certified Architect Foundations (CCAF) exam for the group.

You got your @vadim.blog alias set up but I don't see any course completions on file yet. If you can fit in even the first course (Introduction to agent skills) before I submit, I'll fold you into the same batch — saves you waiting for the next round.

Direct link: https://anthropic.skilljar.com/page/claude-partner-network-learning-path

No pressure on pace. If anything's blocking, just reply — happy to help.

Vadim`;
}

async function loadDormant(): Promise<Dormant[]> {
  const rows = (await sql`
    WITH onboarded AS (
      SELECT contact_id, MIN(sent_at) AS onboarded_at
      FROM contact_emails
      WHERE subject = 'Your @vadim.blog email is ready - start the courses'
        AND status IN ('sent','delivered')
      GROUP BY contact_id
    ),
    has_completion AS (
      SELECT DISTINCT c.id
      FROM contacts c
      LEFT JOIN received_emails re
        ON (re.matched_contact_id = c.id
            OR (c.forwarding_alias IS NOT NULL
                AND to_emails::text ILIKE '%' || c.forwarding_alias || '%'))
      WHERE re.subject ILIKE '%completion of%'
    )
    SELECT
      c.id,
      c.first_name,
      c.last_name,
      c.email,
      o.onboarded_at,
      (SELECT MAX(CAST(NULLIF(sequence_number,'') AS INT))
         FROM contact_emails ce
         WHERE ce.contact_id = c.id AND tags LIKE '%cpn-outreach%') AS max_seq,
      COALESCE(c.do_not_contact, false) AS dnc,
      (c.bounced_emails IS NOT NULL
         AND c.bounced_emails::text NOT IN ('[]','null','')) AS bounced
    FROM contacts c
    JOIN onboarded o ON o.contact_id = c.id
    WHERE c.id NOT IN (SELECT id FROM has_completion)
      AND c.email IS NOT NULL AND c.email <> ''
    ORDER BY o.onboarded_at
  `) as unknown as Dormant[];
  return rows;
}

function applyFilters(rows: Dormant[]): { keep: Dormant[]; skipped: { row: Dormant; reason: string }[] } {
  const now = Date.now();
  const minMs = MIN_HOURS_SINCE_ONBOARDED * 60 * 60 * 1000;
  const keep: Dormant[] = [];
  const skipped: { row: Dormant; reason: string }[] = [];

  for (const r of rows) {
    if (r.dnc) {
      skipped.push({ row: r, reason: "do_not_contact" });
      continue;
    }
    if (r.bounced) {
      skipped.push({ row: r, reason: "bounced" });
      continue;
    }
    if (SKIP_IDS.has(r.id)) {
      skipped.push({ row: r, reason: "tastehub (separate track)" });
      continue;
    }
    const ageMs = now - new Date(r.onboarded_at).getTime();
    if (ageMs < minMs) {
      const hours = Math.round(ageMs / 3600000);
      skipped.push({ row: r, reason: `onboarded ${hours}h ago (< ${MIN_HOURS_SINCE_ONBOARDED}h)` });
      continue;
    }
    keep.push(r);
  }
  return { keep, skipped };
}

async function sendOne(r: Dormant): Promise<void> {
  const name = `${r.first_name} ${r.last_name ?? ""}`.trim();
  const body = buildBody(r.first_name);
  const seqNum = String((r.max_seq ?? 0) + 1);

  const [lastOutbound] = (await sql`
    SELECT id FROM contact_emails
    WHERE contact_id = ${r.id} AND tags LIKE '%cpn-outreach%'
    ORDER BY id DESC LIMIT 1
  `) as unknown as { id: number }[];

  console.log(`\n→ ${r.first_name} <${r.email}>  (contact_id=${r.id}, seq=${seqNum})`);

  const result = await resend.emails.send({
    from: FROM,
    to: r.email,
    subject: SUBJECT,
    text: body,
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
      (${r.id}, ${resendId}, 'contact@vadim.blog',
       ${JSON.stringify([r.email])}, ${SUBJECT}, ${body}, 'sent',
       now()::text, ${TAGS}, ${name}, ${lastOutbound?.id ?? null},
       ${`followup_${seqNum}`}, ${seqNum}, now()::text, now()::text)
  `;

  console.log(`  sent (resend_id=${resendId})`);
}

async function main() {
  const all = await loadDormant();
  const { keep, skipped } = applyFilters(all);

  console.log(`\n── CPN dormant re-engage ──`);
  console.log(`  Total dormant:  ${all.length}`);
  console.log(`  Skipped:        ${skipped.length}`);
  for (const { row, reason } of skipped) {
    console.log(`    · [${row.id}] ${row.first_name} ${row.last_name ?? ""} <${row.email}> — ${reason}`);
  }
  console.log(`  Will send to:   ${keep.length}`);
  for (const r of keep) {
    const seq = (r.max_seq ?? 0) + 1;
    console.log(`    → [${r.id}] ${r.first_name} ${r.last_name ?? ""} <${r.email}> (seq ${seq})`);
  }
  console.log(`  Mode:           ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  if (keep.length > 0) {
    console.log(`── Body preview (${keep[0].first_name}) ──`);
    console.log(buildBody(keep[0].first_name).split("\n").map((l) => `  ${l}`).join("\n"));
    console.log();
  }

  if (dryRun) {
    console.log("Dry run — no Resend calls, no DB writes.\n");
    return;
  }

  for (const r of keep) {
    await sendOne(r);
  }

  console.log(`\nDone: ${keep.length} sent.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
