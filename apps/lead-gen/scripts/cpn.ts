#!/usr/bin/env npx tsx
/**
 * Unified CPN (Claude Partner Network) pipeline script.
 *
 * Usage:
 *   npx tsx scripts/cpn.ts import   [--dry-run] [--offset N]
 *   npx tsx scripts/cpn.ts campaign [--dry-run] [--limit N] [--batch-size N] [--delay N] [--offset N] [--per-day N] [--schedule-minutes N]
 *   npx tsx scripts/cpn.ts send                                      # flush queued emails
 *   npx tsx scripts/cpn.ts sync                                      # sync replies from Resend
 *   npx tsx scripts/cpn.ts followup [--dry-run] [--auto]
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createInterface } from "readline";
import { readFileSync } from "fs";
import { resolve } from "path";
import Papa from "papaparse";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { classifyReply } from "@/lib/email/reply-classifier";

// ── Shared ─────────────────────────────────────────────────────

const CPN_TAG = '["cpn-outreach"]';
const FROM = "Vadim Nicolai <contact@vadim.blog>";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function flagVal(name: string, fallback: number): number {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : fallback;
}

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

// ── CSV types & helpers ─────────────────────────────────��──────

interface PartnerRow {
  rank: string;
  login: string;
  name: string;
  email: string;
  company: string;
  location: string;
  score: string;
  archetypes: string;
  source: string;
  starred: string;
  github_url: string;
  bio: string;
}

function readCsv(): PartnerRow[] {
  const csvPath = resolve("crates/github-patterns/partners_export.csv");
  const csvText = readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse<PartnerRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  return data.filter((r) => r.email?.trim());
}

function firstName(row: PartnerRow): string {
  const name = row.name?.trim();
  return name ? name.split(/\s+/)[0] : row.login;
}

function lastName(row: PartnerRow): string {
  const name = row.name?.trim();
  if (!name) return "";
  const parts = name.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

function signal(row: PartnerRow): string {
  const company = row.company?.trim().replace(/^@/, "");
  if (company) return `Saw ${company} is working with Claude`;
  const archetypes = row.archetypes?.trim();
  if (archetypes) {
    const first = archetypes.split(",")[0].trim().replace(/-/g, " ");
    return `Your ${first} work on GitHub caught my eye`;
  }
  return "Noticed you're active in the Claude SDK ecosystem";
}

function buildOutreach(row: PartnerRow) {
  const first = firstName(row);
  const sig = signal(row);
  const subject = `Claude Partner Network — ${first}`;
  const text = `Hi ${first},

${sig} — you'd be a strong fit for this.

Anthropic is launching the Claude Partner Network for teams deploying Claude to enterprise. Karl Kadon (Head of Partner Experience, Anthropic) is opening the partner training path next week. I'm putting together the first training cohort and looking for people to go through it together.

Want me to send you the details?

Vadim Nicolai
vadim.blog`;
  return { subject, text };
}

function buildFollowup(firstNameStr: string) {
  const subject = `Re: Claude Partner Network — ${firstNameStr}`;
  const text = `Hi ${firstNameStr},

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

// ── import ──────────────────────────────────────────────────��──

async function cmdImport() {
  const dryRun = flag("dry-run");
  const offset = flagVal("offset", 100);
  const rows = readCsv().slice(offset);

  console.log(`\n  CPN Import: ${rows.length} partners (offset ${offset})`);
  console.log(`  Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  if (dryRun) {
    for (const row of rows.slice(0, 3)) {
      const { subject } = buildOutreach(row);
      console.log(`  ${firstName(row)} ${lastName(row)} <${row.email}> — ${row.login}`);
      console.log(`  Subject: ${subject}\n`);
    }
    console.log(`  ... and ${rows.length - 3} more\n`);
    return;
  }

  let imported = 0, queued = 0, skipped = 0;

  for (const row of rows) {
    const email = row.email.trim();
    const existing = await sql`SELECT id FROM contacts WHERE email = ${email} LIMIT 1`;
    let contactId: number;

    if (existing.length > 0) {
      contactId = existing[0].id;
      skipped++;
    } else {
      const [inserted] = await sql`
        INSERT INTO contacts (first_name, last_name, email, github_handle, company, tags)
        VALUES (${firstName(row)}, ${lastName(row)}, ${email}, ${row.login}, ${row.company?.trim().replace(/^@/, "") || null}, ${JSON.stringify(["cpn-outreach"])})
        RETURNING id
      `;
      contactId = inserted.id;
      imported++;
    }

    const existingEmail = await sql`SELECT id FROM contact_emails WHERE contact_id = ${contactId} LIMIT 1`;
    if (existingEmail.length > 0) continue;

    const { subject, text } = buildOutreach(row);
    await sql`
      INSERT INTO contact_emails (contact_id, resend_id, from_email, to_emails, subject, text_content, status, tags, recipient_name)
      VALUES (${contactId}, '', 'contact@vadim.blog', ${JSON.stringify([email])}, ${subject}, ${text}, 'scheduled', ${CPN_TAG}, ${`${firstName(row)} ${lastName(row)}`.trim()})
    `;
    queued++;

    if ((imported + skipped) % 50 === 0) {
      process.stdout.write(`  [${imported + skipped}/${rows.length}] ${imported} imported, ${skipped} existing, ${queued} queued\n`);
    }
  }

  console.log(`\n  Done: ${imported} contacts imported, ${skipped} existing, ${queued} emails queued\n`);
}

// ── campaign ────────────────────────────────���──────────────────

async function cmdCampaign() {
  const dryRun = flag("dry-run");
  const limit = flagVal("limit", Infinity);
  const batchSize = flagVal("batch-size", 50);
  const delayMs = flagVal("delay", 2000);
  const offset = flagVal("offset", 0);
  const perDay = flagVal("per-day", 0);
  const scheduleMinutes = flagVal("schedule-minutes", 0);

  const allRows = readCsv();
  const rows = allRows.slice(offset, offset + (limit === Infinity ? allRows.length : limit));

  console.log(`\n  Campaign: Claude Partner Network`);
  console.log(`  Rows:     ${rows.length} (offset ${offset}, ${allRows.length} total)`);
  console.log(`  Batch:    ${batchSize}  Delay: ${delayMs}ms`);
  if (perDay > 0) console.log(`  Per-day:  ${perDay}  Days: ${Math.ceil(rows.length / perDay)}`);
  console.log(`  Mode:     ${dryRun ? "DRY RUN" : "LIVE SEND"}\n`);

  if (dryRun) {
    for (const row of rows.slice(0, 5)) {
      const { subject, text } = buildOutreach(row);
      console.log(`─── ${row.email} ───`);
      console.log(`Subject: ${subject}`);
      console.log(text);
      console.log();
    }
    console.log(`  (dry run — ${Math.min(5, rows.length)} previewed, 0 sent)\n`);
    return;
  }

  function getScheduledAt(idx: number): string | undefined {
    if (perDay > 0) {
      const sendDate = new Date();
      sendDate.setDate(sendDate.getDate() + Math.floor(idx / perDay) + 1);
      sendDate.setHours(9, 0, 0, 0);
      return sendDate.toISOString();
    }
    if (scheduleMinutes > 0) {
      return new Date(Date.now() + scheduleMinutes * 60_000).toISOString();
    }
    return undefined;
  }

  if (perDay > 0) {
    const days = Math.ceil(rows.length / perDay);
    for (let d = 0; d < days; d++) {
      const sendDate = new Date();
      sendDate.setDate(sendDate.getDate() + d + 1);
      sendDate.setHours(9, 0, 0, 0);
      const chunk = rows.slice(d * perDay, (d + 1) * perDay);
      console.log(`  Day ${d + 1} (${sendDate.toLocaleDateString()}): ${chunk.length} emails at 9:00 AM`);
    }
    console.log();
  }

  let sent = 0, scheduled = 0, failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { subject, text } = buildOutreach(row);
    const scheduledAt = getScheduledAt(i);

    try {
      const result = await resend.emails.send({
        from: FROM,
        to: row.email.trim(),
        subject,
        text,
        scheduledAt,
      });

      if (result.error) {
        failed++;
        process.stdout.write(`  [${scheduled + sent + failed}/${rows.length}] ✗ ${row.email} — ${result.error.message}\n`);
        if (result.error.name === "daily_quota_exceeded") {
          console.log(`\n  Daily quota hit. Stopping.\n`);
          break;
        }
      } else if (scheduledAt) {
        scheduled++;
        process.stdout.write(`  [${scheduled + failed}/${rows.length}] ⏱ ${row.email} → ${scheduledAt}\n`);
      } else {
        sent++;
        process.stdout.write(`  [${sent + failed}/${rows.length}] ✓ ${row.email}\n`);
      }
    } catch (err) {
      failed++;
      process.stdout.write(`  [${scheduled + sent + failed}/${rows.length}] ✗ ${row.email} — ${err instanceof Error ? err.message : err}\n`);
    }

    if ((i + 1) % batchSize === 0 && i + 1 < rows.length) await sleep(delayMs);
  }

  if (scheduled > 0) {
    console.log(`\n  Done: ${scheduled} scheduled across ${Math.ceil(scheduled / (perDay || scheduled))} days, ${failed} failed, ${rows.length} total\n`);
  } else {
    console.log(`\n  Done: ${sent} sent, ${failed} failed, ${rows.length} total\n`);
  }
}

// ── send (flush queued) ───────────────────────────────────��────

async function cmdSend() {
  const rows = await sql`
    SELECT DISTINCT ON (to_emails) id, to_emails, subject, text_content
    FROM contact_emails
    WHERE tags = ${CPN_TAG} AND status = 'scheduled'
    ORDER BY to_emails, id
  `;

  console.log(`\n  Unique to send: ${rows.length}\n`);
  let sent = 0, failed = 0;

  for (const row of rows) {
    const to = JSON.parse(row.to_emails)[0];
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject: row.subject,
      text: row.text_content,
    });

    if (result.error) {
      failed++;
      await sql`UPDATE contact_emails SET status = 'failed', error_message = ${result.error.message}, updated_at = now()::text WHERE id = ${row.id}`;
      if (result.error.name === "daily_quota_exceeded") {
        console.log(`\n  Quota hit at ${sent} sent, ${failed} failed`);
        break;
      }
    } else {
      sent++;
      await sql`UPDATE contact_emails SET resend_id = ${result.data?.id ?? ""}, status = 'sent', sent_at = now()::text, updated_at = now()::text WHERE id = ${row.id}`;
    }

    if ((sent + failed) % 50 === 0) {
      process.stdout.write(`  [${sent + failed}/${rows.length}] sent=${sent} failed=${failed}\n`);
    }
  }

  await sql`
    UPDATE contact_emails SET status = 'sent', updated_at = now()::text
    WHERE tags = ${CPN_TAG} AND status = 'scheduled'
    AND to_emails IN (SELECT to_emails FROM contact_emails WHERE tags = ${CPN_TAG} AND status = 'sent')
  `;

  console.log(`\n  Done: ${sent} sent, ${failed} failed, ${rows.length} total\n`);
}

// ── sync ───────────────────────────────────────────────────────

async function cmdSync() {
  const allReceived: any[] = [];
  let cursor: string | undefined;
  while (true) {
    const params: any = { limit: 100 };
    if (cursor) params.after = cursor;
    const { data, error } = await resend.emails.receiving.list(params);
    if (error || !data?.data?.length) break;
    allReceived.push(...data.data);
    if (!data.has_more) break;
    cursor = data.data[data.data.length - 1].id;
  }

  console.log(`\n  Fetched ${allReceived.length} received emails from Resend\n`);

  const existing = await sql`SELECT resend_id FROM received_emails`;
  const existingIds = new Set(existing.map((r: any) => r.resend_id));
  const newEmails = allReceived.filter((e) => !existingIds.has(e.id));

  console.log(`  New to sync: ${newEmails.length} (${existingIds.size} already in DB)\n`);

  const stats: Record<string, number> = {};
  let cpnReplies = 0, needsResponse = 0;

  for (const email of newEmails) {
    const { data: full, error } = await resend.emails.receiving.get(email.id);
    if (error || !full) {
      console.log(`  ✗ Failed to fetch ${email.id}: ${error?.message}`);
      continue;
    }

    const fromEmail = full.from;
    const subject = full.subject ?? "";
    const textContent = full.text ?? "";
    const htmlContent = full.html ?? "";
    const classification = classifyReply(subject, textContent || htmlContent);
    stats[classification.label] = (stats[classification.label] || 0) + 1;

    const contactMatch = await sql`SELECT id FROM contacts WHERE LOWER(email) = LOWER(${fromEmail}) LIMIT 1`;
    const contactId = contactMatch.length > 0 ? contactMatch[0].id : null;

    let outboundId: number | null = null;
    if (contactId) {
      const outbound = await sql`SELECT id FROM contact_emails WHERE contact_id = ${contactId} AND tags = ${CPN_TAG} LIMIT 1`;
      if (outbound.length > 0) outboundId = outbound[0].id;
    }

    const receivedAt = full.created_at ?? new Date().toISOString();
    await sql`
      INSERT INTO received_emails (resend_id, from_email, to_emails, cc_emails, reply_to_emails, subject, text_content, html_content, received_at, classification, classification_confidence, classified_at, matched_contact_id, matched_outbound_id, created_at, updated_at)
      VALUES (${full.id}, ${fromEmail}, ${JSON.stringify(full.to ?? [])}, ${JSON.stringify(full.cc ?? [])}, ${JSON.stringify(full.reply_to ?? [])}, ${subject}, ${textContent}, ${htmlContent}, ${receivedAt}, ${classification.label}, ${classification.confidence}, ${new Date().toISOString()}, ${contactId}, ${outboundId}, now()::text, now()::text)
      ON CONFLICT (resend_id) DO NOTHING
    `;

    if (outboundId) {
      cpnReplies++;
      const needsResp = classification.label === "interested" || classification.label === "info_request";
      if (needsResp) needsResponse++;

      const newTags = needsResp ? '["cpn-outreach","needs_response"]' : CPN_TAG;
      await sql`
        UPDATE contact_emails
        SET reply_received = true, reply_received_at = ${new Date().toISOString()}, reply_classification = ${classification.label}, tags = ${newTags}, updated_at = now()::text
        WHERE id = ${outboundId}
      `;

      if (classification.label === "unsubscribe" && contactId) {
        await sql`UPDATE contacts SET do_not_contact = true WHERE id = ${contactId}`;
      }

      console.log(`  ✓ ${fromEmail} → ${classification.label} (${(classification.confidence * 100).toFixed(0)}%) ${needsResp ? "⚡ NEEDS RESPONSE" : ""}`);
    } else {
      console.log(`  · ${fromEmail} → ${classification.label} (no CPN match)`);
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`  Total synced:    ${newEmails.length}`);
  console.log(`  CPN replies:     ${cpnReplies}`);
  console.log(`  Needs response:  ${needsResponse}`);
  console.log(`  Classifications:`);
  for (const [label, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${label}: ${count}`);
  }

  // Retroactive matching
  const unmatched = await sql`
    SELECT re.id, re.from_email, re.subject, re.classification, re.resend_id
    FROM received_emails re
    WHERE re.matched_outbound_id IS NULL
    AND re.from_email IN (
      SELECT c.email FROM contacts c
      JOIN contact_emails ce ON ce.contact_id = c.id
      WHERE ce.tags = ${CPN_TAG}
    )
  `;

  if (unmatched.length > 0) {
    console.log(`\n  Retroactively matching ${unmatched.length} previously unmatched emails...`);
    for (const row of unmatched) {
      const contact = await sql`SELECT id FROM contacts WHERE LOWER(email) = LOWER(${row.from_email}) LIMIT 1`;
      if (contact.length === 0) continue;
      const outbound = await sql`SELECT id FROM contact_emails WHERE contact_id = ${contact[0].id} AND tags = ${CPN_TAG} LIMIT 1`;
      if (outbound.length === 0) continue;

      const cls = row.classification ?? classifyReply(row.subject ?? "", "").label;
      const needsResp = cls === "interested" || cls === "info_request";

      await sql`UPDATE received_emails SET matched_contact_id = ${contact[0].id}, matched_outbound_id = ${outbound[0].id}, updated_at = now()::text WHERE id = ${row.id}`;
      await sql`UPDATE contact_emails SET reply_received = true, reply_received_at = now()::text, reply_classification = ${cls}, tags = ${needsResp ? '["cpn-outreach","needs_response"]' : CPN_TAG}, updated_at = now()::text WHERE id = ${outbound[0].id}`;

      console.log(`    ✓ ${row.from_email} → ${cls} (retroactive)`);
    }
  }

  console.log(`\nDone.\n`);
}

// ── followup ───────────────────────────────────────────────────

async function cmdFollowup() {
  const dryRun = flag("dry-run");
  const autoSend = flag("auto");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  const rows = await sql`
    SELECT
      ce.id as email_id, ce.to_emails,
      c.id as contact_id, c.first_name, c.last_name, c.email, c.company, c.github_handle,
      re.resend_id as reply_resend_id, re.text_content as reply_text, re.html_content as reply_html, re.subject as reply_subject
    FROM contact_emails ce
    JOIN contacts c ON c.id = ce.contact_id
    LEFT JOIN received_emails re ON re.matched_outbound_id = ce.id
    WHERE ce.tags LIKE '%needs_response%' AND ce.tags LIKE '%cpn-outreach%'
    ORDER BY c.first_name
  `;

  console.log(`\n  CPN Follow-up: ${rows.length} contacts need response`);
  console.log(`  Mode: ${dryRun ? "DRY RUN" : autoSend ? "AUTO SEND" : "INTERACTIVE"}\n`);

  if (rows.length === 0) {
    console.log("  No contacts to follow up.\n");
    rl.close();
    return;
  }

  let sent = 0, skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = `${row.first_name} ${row.last_name ?? ""}`.trim();
    const { subject, text } = buildFollowup(row.first_name);

    let replyText = row.reply_text || row.reply_html || null;
    if (!replyText && row.reply_resend_id) {
      try {
        const { data: full } = await resend.emails.receiving.get(row.reply_resend_id);
        replyText = full?.text || full?.html || null;
        if (replyText) {
          await sql`UPDATE received_emails SET text_content = ${full?.text ?? null}, html_content = ${full?.html ?? null} WHERE resend_id = ${row.reply_resend_id}`;
        }
      } catch { /* ignore */ }
    }

    console.log(`── [${i + 1}/${rows.length}] ──────────────────────────────`);
    console.log(`  Name:    ${name}`);
    console.log(`  Email:   ${row.email}`);
    if (row.company) console.log(`  Company: ${row.company}`);
    if (row.github_handle) console.log(`  GitHub:  ${row.github_handle}`);

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

    if (dryRun) { skipped++; continue; }

    let action = "s";
    if (!autoSend) {
      const answer = await ask("  [S]end / s[K]ip / [Q]uit? ");
      action = answer.trim().toLowerCase() || "s";
    }

    if (action === "q") { console.log("\n  Quitting early.\n"); break; }
    if (action === "k") { skipped++; console.log("  → Skipped\n"); continue; }

    const to = row.email;
    const result = await resend.emails.send({ from: FROM, to, subject, text });

    if (result.error) {
      console.log(`  ✗ Failed: ${result.error.message}\n`);
      continue;
    }

    await sql`
      INSERT INTO contact_emails (contact_id, resend_id, from_email, to_emails, subject, text_content, status, sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number, created_at, updated_at)
      VALUES (${row.contact_id}, ${result.data?.id ?? ""}, 'contact@vadim.blog', ${JSON.stringify([to])}, ${subject}, ${text}, 'sent', now()::text, '["cpn-outreach","cpn-followup-1"]', ${name}, ${row.email_id}, 'followup_1', '1', now()::text, now()::text)
    `;

    await sql`
      UPDATE contact_emails SET tags = ${CPN_TAG}, followup_status = 'completed', updated_at = now()::text
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

// ── CLI router ─────────────────────────────────────────────────

const COMMANDS: Record<string, () => Promise<void>> = {
  import: cmdImport,
  campaign: cmdCampaign,
  send: cmdSend,
  sync: cmdSync,
  followup: cmdFollowup,
};

const cmd = process.argv[2];
if (!cmd || !COMMANDS[cmd]) {
  console.log(`
  Usage: npx tsx scripts/cpn.ts <command> [flags]

  Commands:
    import     Import contacts from CSV + queue emails     [--dry-run] [--offset N]
    campaign   Direct send from CSV via Resend             [--dry-run] [--limit N] [--batch-size N] [--delay N] [--offset N] [--per-day N] [--schedule-minutes N]
    send       Flush queued emails from DB
    sync       Sync replies from Resend + classify
    followup   Follow up on needs_response contacts        [--dry-run] [--auto]
`);
  process.exit(cmd ? 1 : 0);
}

COMMANDS[cmd]().catch((err) => {
  console.error(err);
  process.exit(1);
});
