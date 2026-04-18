#!/usr/bin/env npx tsx
/**
 * CPN "Training Path Live" campaign.
 *
 * Sends `buildCpnTrainingPath` to every contact who ever replied `interested`
 * to a CPN outreach email, excluding anyone whose first_name is "lisa"
 * (case-insensitive). Idempotent: re-runs skip contacts already tagged
 * with `cpn-training-path`.
 *
 * Usage:
 *   npx tsx scripts/cpn-training-path.ts              # interactive per-contact
 *   npx tsx scripts/cpn-training-path.ts --dry-run    # list only, send nothing
 *   npx tsx scripts/cpn-training-path.ts --auto       # send every target, no prompt
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createInterface } from "readline";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { buildCpnTrainingPath, FROM } from "@/lib/email/cpn-followup";
import { stripQuotedText } from "@/lib/email/reply-classifier";

const TRAINING_PATH_TAGS = '["cpn-outreach","cpn-training-path"]';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

interface Target {
  contact_id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  company: string | null;
}

interface ThreadEvent {
  direction: "sent" | "received";
  at: string;
  subject: string;
  text: string;
  classification?: string;
  tags?: string;
}

async function main() {
  const dryRun = flag("dry-run");
  const autoSend = flag("auto");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  // Target pool: anyone who ever replied `interested` to a CPN outreach,
  // excluding Lisa and anyone already sent the training-path email.
  const targets = (await sql`
    SELECT DISTINCT ON (c.email)
      c.id           AS contact_id,
      c.first_name,
      c.last_name,
      c.email,
      c.company
    FROM received_emails re
    JOIN contacts c        ON c.id = re.matched_contact_id
    JOIN contact_emails ce ON ce.contact_id = c.id
    WHERE re.classification = 'interested'
      AND ce.tags LIKE '%cpn-outreach%'
      AND LOWER(c.first_name) <> 'lisa'
      AND NOT EXISTS (
        SELECT 1 FROM contact_emails ce2
        WHERE ce2.contact_id = c.id
          AND ce2.tags LIKE '%cpn-training-path%'
          AND ce2.status = 'sent'
      )
    ORDER BY c.email, c.first_name
  `) as unknown as Target[];

  // Diagnostic counts (informational only — the targets list is already filtered).
  const lisaRows = (await sql`
    SELECT DISTINCT c.email
    FROM received_emails re
    JOIN contacts c ON c.id = re.matched_contact_id
    JOIN contact_emails ce ON ce.contact_id = c.id
    WHERE re.classification = 'interested'
      AND ce.tags LIKE '%cpn-outreach%'
      AND LOWER(c.first_name) = 'lisa'
  `) as unknown as { email: string }[];
  const alreadySentRows = (await sql`
    SELECT DISTINCT ce.contact_id
    FROM contact_emails ce
    WHERE ce.tags LIKE '%cpn-training-path%' AND ce.status = 'sent'
  `) as unknown as { contact_id: number }[];

  console.log(`\n  CPN Training Path campaign`);
  console.log(`  ──────────────────────────────`);
  console.log(`  Eligible targets:        ${targets.length}`);
  console.log(`  Excluded (first=Lisa):   ${lisaRows.length}`);
  console.log(`  Already sent previously: ${alreadySentRows.length}`);
  console.log(`  Mode:                    ${dryRun ? "DRY RUN" : autoSend ? "AUTO SEND" : "INTERACTIVE"}\n`);

  if (targets.length === 0) {
    console.log("  Nothing to send.\n");
    rl.close();
    return;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const name = `${t.first_name} ${t.last_name ?? ""}`.trim();
    const { subject, text } = buildCpnTrainingPath(t.first_name);

    // All outbound CPN emails to this contact (for threading + display).
    const outboundRows = (await sql`
      SELECT id, subject, text_content, tags, sent_at
      FROM contact_emails
      WHERE contact_id = ${t.contact_id} AND tags LIKE '%cpn-outreach%'
      ORDER BY id ASC
    `) as unknown as {
      id: number;
      subject: string;
      text_content: string | null;
      tags: string | null;
      sent_at: string | null;
    }[];
    const parentEmailId = outboundRows.length > 0 ? outboundRows[outboundRows.length - 1].id : null;

    // All received replies.
    const replyRows = (await sql`
      SELECT subject, text_content, html_content, classification, received_at
      FROM received_emails
      WHERE matched_contact_id = ${t.contact_id}
      ORDER BY received_at ASC
    `) as unknown as {
      subject: string | null;
      text_content: string | null;
      html_content: string | null;
      classification: string | null;
      received_at: string;
    }[];

    const thread: ThreadEvent[] = [];
    for (const o of outboundRows) {
      thread.push({
        direction: "sent",
        at: o.sent_at ?? "",
        subject: o.subject,
        text: o.text_content ?? "",
        tags: o.tags ?? "",
      });
    }
    for (const r of replyRows) {
      thread.push({
        direction: "received",
        at: r.received_at,
        subject: r.subject ?? "",
        text: r.text_content || r.html_content?.replace(/<[^>]+>/g, "") || "",
        classification: r.classification ?? "unknown",
      });
    }
    thread.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    console.log(`── [${i + 1}/${targets.length}] ──────────────────────────────`);
    console.log(`  Name:    ${name}`);
    console.log(`  Email:   ${t.email}`);
    if (t.company) console.log(`  Company: ${t.company}`);
    console.log(`  Thread:  ${outboundRows.length} sent / ${replyRows.length} received`);

    for (let j = 0; j < thread.length; j++) {
      const ev = thread[j];
      const date = ev.at ? new Date(ev.at).toLocaleDateString() : "?";
      const arrow = ev.direction === "sent" ? "→ SENT" : "← REPLY";
      const meta =
        ev.direction === "sent"
          ? ev.tags
            ? ` [${ev.tags}]`
            : ""
          : ` (${ev.classification})`;
      console.log(`\n  ── ${arrow} ${j + 1}/${thread.length} (${date})${meta} ──`);
      console.log(`  Subject: ${ev.subject}`);
      const body = ev.direction === "received" ? stripQuotedText(ev.text).trim() : ev.text.trim();
      if (!body) {
        console.log(`  │ (no text captured)`);
        continue;
      }
      const lines = body.split("\n").slice(0, 10);
      console.log(lines.map((l) => `  │ ${l}`).join("\n"));
      if (body.split("\n").length > 10) {
        console.log(`  │ ... (${body.split("\n").length - 10} more lines)`);
      }
    }

    console.log(`\n  ── Training-path email ──`);
    console.log(`  Subject: ${subject}`);
    console.log(text.split("\n").map((l) => `  ${l}`).join("\n"));
    console.log(`  ──────\n`);

    if (dryRun) {
      skipped++;
      continue;
    }

    let action = "s";
    if (!autoSend) {
      const answer = await ask("  [S]end / s[K]ip / [Q]uit? ");
      action = answer.trim().toLowerCase() || "s";
    }

    if (action === "q") {
      console.log("\n  Quitting early.\n");
      break;
    }
    if (action === "k") {
      skipped++;
      console.log("  → Skipped\n");
      continue;
    }

    try {
      const result = await resend.emails.send({
        from: FROM,
        to: t.email,
        subject,
        text,
      });

      if (result.error) {
        failed++;
        console.log(`  ✗ Failed: ${result.error.message}\n`);
        continue;
      }

      await sql`
        INSERT INTO contact_emails
          (contact_id, resend_id, from_email, to_emails, subject, text_content, status,
           sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number,
           created_at, updated_at)
        VALUES
          (${t.contact_id}, ${result.data?.id ?? ""}, 'contact@vadim.blog',
           ${JSON.stringify([t.email])}, ${subject}, ${text}, 'sent',
           now()::text, ${TRAINING_PATH_TAGS}, ${name}, ${parentEmailId},
           'followup_2', '2', now()::text, now()::text)
      `;

      sent++;
      console.log(`  ✓ Sent\n`);

      if (autoSend) await sleep(500);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ Error: ${msg}\n`);
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`  Sent:      ${sent}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Remaining: ${targets.length - sent - skipped - failed}`);
  console.log();
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
