/**
 * Interactive CPN follow-up sender.
 *
 * Iterates over contacts tagged "needs_response", shows a preview
 * of the follow-up email, and asks you to send or skip each one.
 *
 * Usage:
 *   npx tsx scripts/send-cpn-followup.ts
 *   npx tsx scripts/send-cpn-followup.ts --dry-run
 *   npx tsx scripts/send-cpn-followup.ts --auto
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createInterface } from "readline";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

const CPN_TAG = '["cpn-outreach"]';
const dryRun = process.argv.includes("--dry-run");
const autoSend = process.argv.includes("--auto");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) =>
  new Promise<string>((resolve) => rl.question(q, resolve));

function buildFollowup(firstName: string): { subject: string; text: string } {
  const subject = `Re: Claude Partner Network — ${firstName}`;
  const text = `Hi ${firstName},

Here's what I have from Karl Kadon (Head of Partner Experience, Anthropic):

The Claude Partner Network training path opens next week. The first step is getting a cohort through it together — that's what I'm putting together now.

Karl's advice for anyone joining:
1. List your active Claude/Anthropic work — client projects, internal tools, anything you're building with Claude
2. Registration opens in the coming weeks — I'll forward the link the moment it's live

You're on my list. I'll loop you in as soon as the next steps land.

Vadim Nicolai
vadim.blog`;

  return { subject, text };
}

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Fetch contacts with needs_response tag + their reply
  const rows = await sql`
    SELECT
      ce.id as email_id,
      ce.to_emails,
      c.id as contact_id,
      c.first_name,
      c.last_name,
      c.email,
      c.company,
      c.github_handle,
      re.resend_id as reply_resend_id,
      re.text_content as reply_text,
      re.html_content as reply_html,
      re.subject as reply_subject
    FROM contact_emails ce
    JOIN contacts c ON c.id = ce.contact_id
    LEFT JOIN received_emails re ON re.matched_outbound_id = ce.id
    WHERE ce.tags LIKE '%needs_response%'
      AND ce.tags LIKE '%cpn-outreach%'
    ORDER BY c.first_name
  `;

  console.log(`\n  CPN Follow-up: ${rows.length} contacts need response`);
  console.log(`  Mode: ${dryRun ? "DRY RUN" : autoSend ? "AUTO SEND" : "INTERACTIVE"}\n`);

  if (rows.length === 0) {
    console.log("  No contacts to follow up.\n");
    rl.close();
    return;
  }

  let sent = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = `${row.first_name} ${row.last_name ?? ""}`.trim();
    const { subject, text } = buildFollowup(row.first_name);

    // Fetch their reply
    let replyText = row.reply_text || row.reply_html || null;
    if (!replyText && row.reply_resend_id) {
      try {
        const { data: full } = await resend.emails.receiving.get(row.reply_resend_id);
        replyText = full?.text || full?.html || null;
        if (replyText) {
          // Update DB so we don't re-fetch next time
          await sql`UPDATE received_emails SET text_content = ${full?.text ?? null}, html_content = ${full?.html ?? null} WHERE resend_id = ${row.reply_resend_id}`;
        }
      } catch { /* ignore fetch errors */ }
    }

    console.log(`── [${i + 1}/${rows.length}] ──────────────────────────────`);
    console.log(`  Name:    ${name}`);
    console.log(`  Email:   ${row.email}`);
    if (row.company) console.log(`  Company: ${row.company}`);
    if (row.github_handle) console.log(`  GitHub:  ${row.github_handle}`);

    // Show their reply
    console.log(`\n  ── Their reply ──`);
    if (replyText) {
      const lines = replyText.replace(/<[^>]+>/g, "").trim().split("\n").slice(0, 10);
      console.log(lines.map((l: string) => `  │ ${l}`).join("\n"));
    } else {
      console.log(`  │ (no reply text captured)`);
    }

    console.log(`\n  ── Follow-up ──`);
    console.log(`  Subject: ${subject}`);
    console.log(text.split("\n").map((l: string) => `  ${l}`).join("\n"));
    console.log(`  ──────\n`);

    if (dryRun) {
      skipped++;
      continue;
    }

    let action = "s";
    if (autoSend) {
      action = "s";
    } else {
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

    // Send via Resend
    const to = row.email;
    const result = await resend.emails.send({
      from: "Vadim Nicolai <contact@vadim.blog>",
      to,
      subject,
      text,
    });

    if (result.error) {
      console.log(`  ✗ Failed: ${result.error.message}\n`);
      continue;
    }

    // Insert follow-up email row
    await sql`
      INSERT INTO contact_emails (contact_id, resend_id, from_email, to_emails, subject, text_content,
        status, sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number, created_at, updated_at)
      VALUES (${row.contact_id}, ${result.data?.id ?? ""}, 'contact@vadim.blog', ${JSON.stringify([to])},
        ${subject}, ${text}, 'sent', now()::text, '["cpn-outreach","cpn-followup-1"]', ${name},
        ${row.email_id}, 'followup_1', '1', now()::text, now()::text)
    `;

    // Update original email: remove needs_response, mark followup completed
    await sql`
      UPDATE contact_emails
      SET tags = ${CPN_TAG},
          followup_status = 'completed',
          updated_at = now()::text
      WHERE id = ${row.email_id}
    `;

    sent++;
    console.log(`  ✓ Sent\n`);
  }

  console.log(`\n── Summary ──`);
  console.log(`  Sent:      ${sent}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Remaining: ${rows.length - sent - skipped}`);
  console.log();

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
