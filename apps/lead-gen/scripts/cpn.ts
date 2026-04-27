#!/usr/bin/env npx tsx
/**
 * Unified CPN (Claude Partner Network) pipeline script.
 *
 * Usage:
 *   npx tsx scripts/cpn.ts import         [--dry-run] [--offset N]
 *   npx tsx scripts/cpn.ts campaign       [--dry-run] [--limit N] [--batch-size N] [--delay N] [--offset N] [--per-day N] [--schedule-minutes N]
 *   npx tsx scripts/cpn.ts send                                                      # flush queued emails
 *   npx tsx scripts/cpn.ts sync                                                      # sync replies from Resend
 *   npx tsx scripts/cpn.ts followup       [--dry-run] [--auto]
 *   npx tsx scripts/cpn.ts send-one       --template <name> (--id N | --email E) [--alias X] [--auto] [--dry-run] [--force]
 *   npx tsx scripts/cpn.ts training-path  [--dry-run] [--auto] [--only-id N]         # bulk cpn_training_path to interested contacts
 *   npx tsx scripts/cpn.ts assign-aliases [--dry-run]                                 # auto-assign forwarding_alias to cpn-outreach contacts without one
 *   npx tsx scripts/cpn.ts audit-missing                                              # interested-but-not-onboarded report
 *   npx tsx scripts/cpn.ts cohort-status                                              # 4-course completion table
 *   npx tsx scripts/cpn.ts custom         (--id N[,N...] | --email E[,E...]) --subject "..." (--body "..." | --body-file PATH) [--tags '[...]'] [--sequence-type X] [--auto] [--dry-run]
 *
 * Templates for `send-one`: cpn_followup | cpn_training_path | cpn_email_ready | cpn_waiting_reply
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createInterface } from "readline";
import { readFileSync } from "fs";
import { resolve } from "path";
import Papa from "papaparse";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { classifyReply, stripQuotedText } from "@/lib/email/reply-classifier";
import {
  buildCpnTrainingPath,
  buildCpnEmailReady,
  buildCpnWaitingReply,
} from "@/lib/email/cpn-followup";

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

function flagStr(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  const raw = process.argv[idx + 1];
  return raw && !raw.startsWith("--") ? raw : null;
}

function die(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Alias helpers (mirrors src/app/api/contacts/forwarding-alias/route.ts) ──

const ALIAS_DOMAIN = "vadim.blog";
const RESERVED_ALIASES = new Set([
  "contact",
  "postmaster",
  "abuse",
  "hostmaster",
  "admin",
  "noreply",
  "no-reply",
]);

function sanitizeAlias(raw: string): string {
  return raw.trim().replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64);
}

// ── Single-contact template dispatch (used by send-one) ────────

type CpnTemplate =
  | "cpn_followup"
  | "cpn_training_path"
  | "cpn_email_ready"
  | "cpn_waiting_reply";

interface TemplateMeta {
  tagsJson: string;
  tagMatch: string;
  sequenceType: string;
  sequenceNumber: string;
}

const TEMPLATE_META: Record<CpnTemplate, TemplateMeta> = {
  cpn_followup: {
    tagsJson: '["cpn-outreach","cpn-followup-1"]',
    tagMatch: "cpn-followup-1",
    sequenceType: "followup_1",
    sequenceNumber: "1",
  },
  cpn_training_path: {
    tagsJson: '["cpn-outreach","cpn-training-path"]',
    tagMatch: "cpn-training-path",
    sequenceType: "followup_2",
    sequenceNumber: "2",
  },
  cpn_email_ready: {
    tagsJson: '["cpn-outreach","cpn-email-ready"]',
    tagMatch: "cpn-email-ready",
    sequenceType: "followup_3",
    sequenceNumber: "3",
  },
  cpn_waiting_reply: {
    tagsJson: '["cpn-outreach","cpn-waiting-reply"]',
    tagMatch: "cpn-waiting-reply",
    sequenceType: "followup_2_reminder",
    sequenceNumber: "2",
  },
};

function buildTemplate(
  name: CpnTemplate,
  firstName: string,
  contactEmail: string,
  alias: string | null,
): { subject: string; text: string; to: string } {
  switch (name) {
    case "cpn_followup": {
      const { subject, text } = buildFollowup(firstName);
      return { subject, text, to: contactEmail };
    }
    case "cpn_training_path": {
      const { subject, text } = buildCpnTrainingPath(firstName);
      return { subject, text, to: contactEmail };
    }
    case "cpn_waiting_reply": {
      const { subject, text } = buildCpnWaitingReply(firstName);
      return { subject, text, to: contactEmail };
    }
    case "cpn_email_ready": {
      if (!alias) die("cpn_email_ready needs an alias");
      const aliasEmail = `${alias}@${ALIAS_DOMAIN}`;
      const { subject, text } = buildCpnEmailReady(firstName, aliasEmail, contactEmail);
      return { subject, text, to: aliasEmail };
    }
  }
}

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
  // Legacy CSV output from the former Rust `gh` crate. Regenerate via the
  // Python port at `backend/leadgen_agent/gh_patterns_graph.py`
  // (`command: "export_contributors"`) and drop the result here, or override
  // the path with CPN_PARTNERS_CSV=/path/to/partners_export.csv.
  const csvPath = resolve(process.env.CPN_PARTNERS_CSV || "data/partners_export.csv");
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

const DECLINE_PATTERNS = [
  "not interested", "no thanks", "pass on this", "not a fit",
  "i'll pass", "pass for now", "not for us", "we'll pass",
  "please don't contact", "stop emailing", "unsubscribe",
  "remove me", "opt out", "not a good fit",
];

interface ThreadReply {
  text: string;
  subject: string;
  received_at: string;
  classification: string;
  resend_id: string;
}

interface ContactThread {
  contact_id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  company: string | null;
  github_handle: string | null;
  replies: ThreadReply[];
  outbound_ids: number[];
  has_followup: boolean;
  status: "ready" | "declined" | "has_questions" | "already_replied_to_followup";
}

async function cmdFollowup() {
  const dryRun = flag("dry-run");
  const autoSend = flag("auto");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  // 1. Get unique contacts with needs_response
  const contacts = await sql`
    SELECT DISTINCT ON (c.email)
      c.id as contact_id, c.first_name, c.last_name, c.email, c.company, c.github_handle
    FROM contact_emails ce
    JOIN contacts c ON c.id = ce.contact_id
    WHERE ce.tags LIKE '%needs_response%' AND ce.tags LIKE '%cpn-outreach%'
    ORDER BY c.email, c.first_name
  `;

  // 2. Build threaded view per contact
  const threads: ContactThread[] = [];
  let alreadyHandled = 0;

  for (const c of contacts) {
    // All outbound CPN emails to this contact
    const outbounds = await sql`
      SELECT id, tags, sent_at FROM contact_emails
      WHERE contact_id = ${c.contact_id} AND tags LIKE '%cpn-outreach%'
      ORDER BY id
    `;

    // Check if follow-up already sent
    const followups = await sql`
      SELECT id, sent_at FROM contact_emails
      WHERE contact_id = ${c.contact_id} AND tags LIKE '%cpn-followup%' AND status = 'sent'
      ORDER BY sent_at DESC LIMIT 1
    `;
    const hasFollowup = followups.length > 0;

    // All replies from this contact
    const rawReplies = await sql`
      SELECT text_content, html_content, subject, received_at, classification, resend_id
      FROM received_emails
      WHERE matched_contact_id = ${c.contact_id}
      ORDER BY received_at ASC
    `;

    // Fetch missing reply text from Resend if needed
    const replies: ThreadReply[] = [];
    for (const r of rawReplies) {
      let text = r.text_content || r.html_content?.replace(/<[^>]+>/g, "") || "";
      if (!text && r.resend_id) {
        try {
          const { data: full } = await resend.emails.receiving.get(r.resend_id);
          text = full?.text || full?.html?.replace(/<[^>]+>/g, "") || "";
          if (full?.text || full?.html) {
            await sql`UPDATE received_emails SET text_content = ${full.text ?? null}, html_content = ${full.html ?? null} WHERE resend_id = ${r.resend_id}`;
          }
        } catch { /* ignore */ }
      }
      replies.push({
        text,
        subject: r.subject || "",
        received_at: r.received_at,
        classification: r.classification || "unknown",
        resend_id: r.resend_id,
      });
    }

    // Skip if follow-up sent and no new replies after it
    if (hasFollowup && replies.length > 0) {
      const followupTime = new Date(followups[0].sent_at).getTime();
      const latestReplyTime = new Date(replies[replies.length - 1].received_at).getTime();
      if (latestReplyTime < followupTime) {
        alreadyHandled++;
        continue;
      }
    }

    // Determine thread status
    const latestReplyText = replies.length > 0
      ? stripQuotedText(replies[replies.length - 1].text).toLowerCase()
      : "";

    let status: ContactThread["status"] = "ready";
    if (DECLINE_PATTERNS.some(p => latestReplyText.includes(p))) {
      status = "declined";
    } else if (hasFollowup) {
      status = "already_replied_to_followup";
    } else if ((latestReplyText.match(/\?/g) || []).length >= 2) {
      status = "has_questions";
    }

    threads.push({
      contact_id: c.contact_id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      company: c.company,
      github_handle: c.github_handle,
      replies,
      outbound_ids: outbounds.map((o: any) => o.id),
      has_followup: hasFollowup,
      status,
    });
  }

  // Sort: ready first, then questions, then replied-to-followup, then declined
  const statusOrder = { ready: 0, has_questions: 1, already_replied_to_followup: 2, declined: 3 };
  threads.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.first_name.localeCompare(b.first_name));

  const statusCounts = { ready: 0, has_questions: 0, already_replied_to_followup: 0, declined: 0 };
  for (const t of threads) statusCounts[t.status]++;

  console.log(`\n  CPN Follow-up: ${threads.length} contacts (${alreadyHandled} already handled, filtered out)`);
  console.log(`  Breakdown: ${statusCounts.ready} ready, ${statusCounts.has_questions} have questions, ${statusCounts.already_replied_to_followup} replied to followup, ${statusCounts.declined} declined`);
  console.log(`  Mode: ${dryRun ? "DRY RUN" : autoSend ? "AUTO SEND" : "INTERACTIVE"}\n`);

  if (threads.length === 0) {
    console.log("  No contacts to follow up.\n");
    rl.close();
    return;
  }

  let sent = 0, skipped = 0;

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const name = `${thread.first_name} ${thread.last_name ?? ""}`.trim();
    const { subject, text } = buildFollowup(thread.first_name);

    const statusLabel = {
      ready: "",
      declined: " ⛔ DECLINED",
      has_questions: " ❓ HAS QUESTIONS",
      already_replied_to_followup: " ↩️  REPLIED TO FOLLOWUP",
    }[thread.status];

    console.log(`── [${i + 1}/${threads.length}] ──────────────────────────────`);
    console.log(`  Name:    ${name}${statusLabel}`);
    console.log(`  Email:   ${thread.email}`);
    if (thread.company) console.log(`  Company: ${thread.company}`);
    if (thread.github_handle) console.log(`  GitHub:  ${thread.github_handle}`);
    console.log(`  Replies: ${thread.replies.length}${thread.has_followup ? "  (follow-up already sent)" : ""}`);

    // Show all replies, stripped of quoted text
    for (let j = 0; j < thread.replies.length; j++) {
      const reply = thread.replies[j];
      const stripped = stripQuotedText(reply.text).trim();
      const lines = stripped.split("\n").slice(0, 8);
      const date = new Date(reply.received_at).toLocaleDateString();
      console.log(`\n  ── Reply ${j + 1}/${thread.replies.length} (${date}, ${reply.classification}) ──`);
      if (stripped) {
        console.log(lines.map((l: string) => `  │ ${l}`).join("\n"));
        if (stripped.split("\n").length > 8) {
          console.log(`  │ ... (${stripped.split("\n").length - 8} more lines)`);
        }
      } else {
        console.log(`  │ (no reply text captured)`);
      }
    }

    console.log(`\n  ── Follow-up ──`);
    console.log(`  Subject: ${subject}`);
    console.log(text.split("\n").map((l: string) => `  ${l}`).join("\n"));
    console.log(`  ──────\n`);

    if (dryRun) { skipped++; continue; }

    let action = "s";
    if (!autoSend) {
      const answer = await ask("  [S]end / s[K]ip / [D]one (mark handled, no send) / [Q]uit? ");
      action = answer.trim().toLowerCase() || "s";
    }

    if (action === "q") { console.log("\n  Quitting early.\n"); break; }

    if (action === "k") { skipped++; console.log("  → Skipped\n"); continue; }

    if (action === "d") {
      // Mark as handled without sending
      for (const oid of thread.outbound_ids) {
        await sql`
          UPDATE contact_emails SET tags = ${CPN_TAG}, followup_status = 'completed', updated_at = now()::text
          WHERE id = ${oid}
        `;
      }
      skipped++;
      console.log("  → Marked as handled (no email sent)\n");
      continue;
    }

    const to = thread.email;
    const result = await resend.emails.send({ from: FROM, to, subject, text });

    if (result.error) {
      console.log(`  ✗ Failed: ${result.error.message}\n`);
      continue;
    }

    await sql`
      INSERT INTO contact_emails (contact_id, resend_id, from_email, to_emails, subject, text_content, status, sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number, created_at, updated_at)
      VALUES (${thread.contact_id}, ${result.data?.id ?? ""}, 'contact@vadim.blog', ${JSON.stringify([to])}, ${subject}, ${text}, 'sent', now()::text, '["cpn-outreach","cpn-followup-1"]', ${name}, ${thread.outbound_ids[0]}, 'followup_1', '1', now()::text, now()::text)
    `;

    // Mark ALL outbound emails for this contact as handled
    for (const oid of thread.outbound_ids) {
      await sql`
        UPDATE contact_emails SET tags = ${CPN_TAG}, followup_status = 'completed', updated_at = now()::text
        WHERE id = ${oid}
      `;
    }

    sent++;
    console.log(`  ✓ Sent\n`);
  }

  console.log(`\n── Summary ──`);
  console.log(`  Sent:      ${sent}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Remaining: ${threads.length - sent - skipped}`);
  console.log();
  rl.close();
}

// ── send-one ────────────────────────────────────────────────────

interface ContactRow {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  forwarding_alias: string | null;
  do_not_contact: boolean | null;
}

async function loadContact(idArg: string | null, emailArg: string | null): Promise<ContactRow> {
  if (idArg) {
    const id = parseInt(idArg, 10);
    if (!Number.isFinite(id)) die(`--id must be a number, got ${idArg}`);
    const rows = (await sql`
      SELECT id, first_name, last_name, email, forwarding_alias, do_not_contact
      FROM contacts WHERE id = ${id} LIMIT 1
    `) as unknown as ContactRow[];
    if (rows.length === 0) die(`No contact with id=${id}`);
    return rows[0];
  }
  if (emailArg) {
    const rows = (await sql`
      SELECT id, first_name, last_name, email, forwarding_alias, do_not_contact
      FROM contacts WHERE lower(email) = lower(${emailArg}) LIMIT 1
    `) as unknown as ContactRow[];
    if (rows.length === 0) die(`No contact with email=${emailArg}`);
    return rows[0];
  }
  die("--id or --email is required");
}

async function ensureAlias(
  contact: ContactRow,
  aliasArg: string | null,
  templateName: CpnTemplate,
  dryRun: boolean,
): Promise<{ alias: string | null; wrote: boolean }> {
  const wantsAlias = templateName === "cpn_email_ready" || aliasArg !== null;
  if (!wantsAlias) return { alias: contact.forwarding_alias, wrote: false };

  let alias = aliasArg ? sanitizeAlias(aliasArg) : null;
  if (!alias && contact.forwarding_alias) alias = contact.forwarding_alias;

  if (templateName === "cpn_email_ready" && !alias) {
    die("cpn_email_ready requires --alias (contact has no existing forwarding_alias)");
  }
  if (!alias) return { alias: contact.forwarding_alias, wrote: false };

  if (RESERVED_ALIASES.has(alias.toLowerCase())) die(`Alias '${alias}' is reserved`);

  if (
    contact.forwarding_alias &&
    aliasArg !== null &&
    contact.forwarding_alias.toLowerCase() !== alias.toLowerCase()
  ) {
    die(
      `Contact already has forwarding_alias='${contact.forwarding_alias}' but --alias='${alias}' was passed. Pick one.`,
    );
  }

  if (alias.toLowerCase() !== (contact.forwarding_alias ?? "").toLowerCase()) {
    const clash = (await sql`
      SELECT id FROM contacts
      WHERE lower(forwarding_alias) = lower(${alias}) AND id <> ${contact.id}
      LIMIT 1
    `) as unknown as { id: number }[];
    if (clash.length > 0) die(`Alias '${alias}' is already used by contact ${clash[0].id}`);
  }

  if (alias === contact.forwarding_alias) return { alias, wrote: false };

  if (dryRun) {
    console.log(`  [dry-run] would set forwarding_alias='${alias}' on contact ${contact.id}`);
    return { alias, wrote: false };
  }

  await sql`
    UPDATE contacts
    SET forwarding_alias = ${alias}, updated_at = now()::text
    WHERE id = ${contact.id}
  `;
  return { alias, wrote: true };
}

async function findParentEmailId(contactId: number): Promise<number | null> {
  const rows = (await sql`
    SELECT id FROM contact_emails
    WHERE contact_id = ${contactId} AND tags LIKE '%cpn-outreach%'
    ORDER BY id DESC LIMIT 1
  `) as unknown as { id: number }[];
  return rows.length > 0 ? rows[0].id : null;
}

async function alreadySent(contactId: number, tagMatch: string): Promise<boolean> {
  const rows = (await sql`
    SELECT id FROM contact_emails
    WHERE contact_id = ${contactId}
      AND tags LIKE ${"%" + tagMatch + "%"}
      AND resend_id IS NOT NULL AND resend_id <> ''
    LIMIT 1
  `) as unknown as { id: number }[];
  return rows.length > 0;
}

async function cmdSendOne() {
  const templateArg = flagStr("template") as CpnTemplate | null;
  if (!templateArg || !(templateArg in TEMPLATE_META)) {
    die(`--template required, one of: ${Object.keys(TEMPLATE_META).join(", ")}`);
  }
  const template = templateArg;
  const dryRun = flag("dry-run");
  const autoSend = flag("auto");
  const force = flag("force");

  const contact = await loadContact(flagStr("id"), flagStr("email"));
  if (contact.do_not_contact) die(`Contact ${contact.id} is marked do_not_contact`);
  if (!contact.email) die(`Contact ${contact.id} has no email`);

  const meta = TEMPLATE_META[template];
  if (!force && (await alreadySent(contact.id, meta.tagMatch))) {
    console.log(
      `Already sent '${template}' to contact ${contact.id} (tag ${meta.tagMatch}). Use --force to resend.`,
    );
    return;
  }

  const { alias, wrote: aliasWrote } = await ensureAlias(contact, flagStr("alias"), template, dryRun);
  const firstName = contact.first_name?.trim() || "there";
  const fullName = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
  const { subject, text, to } = buildTemplate(template, firstName, contact.email, alias);
  const parentEmailId = await findParentEmailId(contact.id);

  console.log(`\n── CPN send-one ──`);
  console.log(`  Contact:  [${contact.id}] ${fullName} <${contact.email}>`);
  if (alias) {
    console.log(`  Alias:    ${alias}@${ALIAS_DOMAIN}${aliasWrote ? " (newly set)" : ""}`);
  }
  console.log(`  Template: ${template}`);
  console.log(`  To:       ${to}`);
  console.log(`  Subject:  ${subject}`);
  console.log(`  Parent:   ${parentEmailId ?? "(none)"}`);
  console.log(`  Tags:     ${meta.tagsJson}`);
  console.log(`\n${text.split("\n").map((l) => `  ${l}`).join("\n")}\n`);

  if (dryRun) {
    console.log("[dry-run] no Resend call, no DB insert.");
    return;
  }

  if (!autoSend) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));
    const answer = (await ask("[S]end / [Q]uit? ")).trim().toLowerCase();
    rl.close();
    if (answer === "q" || (answer && answer !== "s")) {
      console.log("Cancelled.");
      return;
    }
  }

  const result = await resend.emails.send({ from: FROM, to, subject, text });
  if (result.error) die(`Resend failed: ${result.error.message}`);
  const resendId = result.data?.id ?? "";

  await sql`
    INSERT INTO contact_emails
      (contact_id, resend_id, from_email, to_emails, subject, text_content, status,
       sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number,
       created_at, updated_at)
    VALUES
      (${contact.id}, ${resendId}, 'contact@vadim.blog',
       ${JSON.stringify([to])}, ${subject}, ${text}, 'sent',
       now()::text, ${meta.tagsJson}, ${fullName}, ${parentEmailId},
       ${meta.sequenceType}, ${meta.sequenceNumber}, now()::text, now()::text)
  `;

  console.log(`✓ Sent (resend_id=${resendId}), logged to contact_emails.`);
}

// ── training-path (bulk) ────────────────────────────────────────

async function cmdTrainingPath() {
  const dryRun = flag("dry-run");
  const autoSend = flag("auto");
  const onlyIdRaw = flagStr("only-id");
  const onlyId = onlyIdRaw ? parseInt(onlyIdRaw, 10) : null;

  const meta = TEMPLATE_META.cpn_training_path;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));

  const rawTargets = (await sql`
    SELECT DISTINCT ON (c.email)
      c.id AS contact_id, c.first_name, c.last_name, c.email, c.company
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
          AND ce2.resend_id IS NOT NULL AND ce2.resend_id <> ''
      )
    ORDER BY c.email, c.first_name
  `) as unknown as {
    contact_id: number;
    first_name: string;
    last_name: string | null;
    email: string;
    company: string | null;
  }[];

  const targets = onlyId !== null ? rawTargets.filter((t) => t.contact_id === onlyId) : rawTargets;

  console.log(`\n  CPN Training Path bulk`);
  console.log(`  Targets: ${targets.length}${onlyId !== null ? ` (filtered from ${rawTargets.length})` : ""}`);
  console.log(`  Mode:    ${dryRun ? "DRY RUN" : autoSend ? "AUTO SEND" : "INTERACTIVE"}\n`);

  if (targets.length === 0) {
    console.log("  Nothing to send.\n");
    rl.close();
    return;
  }

  let sent = 0, skipped = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const name = `${t.first_name} ${t.last_name ?? ""}`.trim();
    const { subject, text } = buildCpnTrainingPath(t.first_name);

    const outboundRows = (await sql`
      SELECT id FROM contact_emails
      WHERE contact_id = ${t.contact_id} AND tags LIKE '%cpn-outreach%'
      ORDER BY id ASC
    `) as unknown as { id: number }[];
    const parentEmailId = outboundRows.length > 0 ? outboundRows[outboundRows.length - 1].id : null;

    console.log(`── [${i + 1}/${targets.length}] ${name} <${t.email}>${t.company ? ` @ ${t.company}` : ""}`);
    console.log(`  Subject: ${subject}`);

    if (dryRun) { skipped++; continue; }

    let action = "s";
    if (!autoSend) {
      const answer = await ask("  [S]end / s[K]ip / [Q]uit? ");
      action = answer.trim().toLowerCase() || "s";
    }
    if (action === "q") { console.log("\n  Quitting early.\n"); break; }
    if (action === "k") { skipped++; console.log("  → Skipped\n"); continue; }

    try {
      const result = await resend.emails.send({ from: FROM, to: t.email, subject, text });
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
           now()::text, ${meta.tagsJson}, ${name}, ${parentEmailId},
           ${meta.sequenceType}, ${meta.sequenceNumber}, now()::text, now()::text)
      `;
      sent++;
      console.log(`  ✓ Sent\n`);
      if (autoSend) await sleep(500);
    } catch (err) {
      failed++;
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  console.log(`\n── Summary ──\n  Sent: ${sent}  Skipped: ${skipped}  Failed: ${failed}\n`);
  rl.close();
}

// ── assign-aliases (bulk auto) ──────────────────────────────────

async function cmdAssignAliases() {
  const dryRun = flag("dry-run");

  const eligible = (await sql`
    SELECT id, first_name, last_name, email, forwarding_alias
    FROM contacts
    WHERE tags LIKE '%cpn-outreach%'
      AND forwarding_alias IS NULL
      AND COALESCE(do_not_contact, false) = false
      AND email IS NOT NULL AND email <> ''
    ORDER BY id ASC
  `) as unknown as {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    forwarding_alias: string | null;
  }[];

  console.log(`\n  CPN auto-assign aliases: ${eligible.length} eligible (mode: ${dryRun ? "DRY RUN" : "LIVE"})\n`);

  async function aliasTaken(alias: string): Promise<boolean> {
    if (RESERVED_ALIASES.has(alias)) return true;
    const rows = (await sql`
      SELECT id FROM contacts WHERE lower(forwarding_alias) = lower(${alias}) LIMIT 1
    `) as unknown as { id: number }[];
    return rows.length > 0;
  }

  async function pickAlias(first: string, last: string, id: number): Promise<string> {
    const f = sanitizeAlias(first).toLowerCase();
    const l = sanitizeAlias(last).toLowerCase();
    const li = l.slice(0, 1);
    const candidates: string[] = [];
    if (f) {
      candidates.push(f);
      if (li) candidates.push(`${f}.${li}`);
      if (l && l !== f) candidates.push(`${f}.${l}`);
      for (let n = 2; n <= 99; n++) candidates.push(`${f}${n}`);
    } else if (l) {
      candidates.push(l);
      for (let n = 2; n <= 99; n++) candidates.push(`${l}${n}`);
    }
    candidates.push(`user${id}`);
    for (const c of candidates) {
      if (!c) continue;
      if (!(await aliasTaken(c))) return c;
    }
    throw new Error(`no alias found for contact ${id}`);
  }

  let n = 0;
  const sample: { id: number; name: string; email: string; alias: string }[] = [];
  for (const r of eligible) {
    const alias = await pickAlias(r.first_name, r.last_name ?? "", r.id);
    if (!dryRun) {
      await sql`
        UPDATE contacts SET forwarding_alias = ${alias}, updated_at = now()::text WHERE id = ${r.id}
      `;
    }
    n++;
    if (sample.length < 10) {
      sample.push({
        id: r.id,
        name: `${r.first_name} ${r.last_name ?? ""}`.trim(),
        email: r.email,
        alias,
      });
    }
    if (n % 50 === 0) console.log(`  ${n}/${eligible.length}`);
  }

  console.log(`\n  ${dryRun ? "Would assign" : "Assigned"}: ${n}\n  First 10:`);
  for (const s of sample) {
    console.log(`    [${s.id}] ${s.name} <${s.email}>  →  ${s.alias}@${ALIAS_DOMAIN}`);
  }
  console.log();
}

// ── audit-missing (read-only) ──────────────────────────────────

async function cmdAuditMissing() {
  const rows = (await sql`
    WITH interested AS (
      SELECT DISTINCT c.id
      FROM contacts c
      JOIN contact_emails ce ON ce.contact_id = c.id
      WHERE ce.tags LIKE '%cpn-outreach%'
        AND ce.reply_received = true
        AND ce.reply_classification ILIKE 'interested%'
    ),
    onboarded AS (
      SELECT DISTINCT contact_id
      FROM contact_emails
      WHERE subject = 'Your @vadim.blog email is ready - start the courses'
        AND status IN ('sent','delivered')
    )
    SELECT
      c.id,
      trim(c.first_name || ' ' || COALESCE(c.last_name,'')) AS name,
      c.email,
      c.do_not_contact AS dnc,
      (c.bounced_emails IS NOT NULL
        AND c.bounced_emails::text NOT IN ('[]','null','')) AS bounced,
      (SELECT ce.subject FROM contact_emails ce
        WHERE ce.contact_id = c.id AND ce.status IN ('sent','delivered')
        ORDER BY ce.id DESC LIMIT 1) AS last_out_subject,
      (SELECT COUNT(*)::int FROM contact_emails ce
        WHERE ce.contact_id = c.id
          AND (ce.text_content ILIKE '%@vadim.blog%' OR ce.subject ILIKE '%@vadim.blog%')) AS vadim_blog_mentions,
      (SELECT LEFT(regexp_replace(re.text_content, '\\s+', ' ', 'g'), 140)
        FROM received_emails re
        JOIN contact_emails ce ON ce.in_reply_to_received_id = re.id
        WHERE ce.contact_id = c.id AND ce.reply_classification ILIKE 'interested%'
        ORDER BY ce.id DESC LIMIT 1) AS classify_excerpt
    FROM contacts c
    WHERE c.id IN (SELECT id FROM interested)
      AND c.id NOT IN (SELECT contact_id FROM onboarded)
    ORDER BY c.first_name NULLS LAST, c.last_name NULLS LAST
  `) as unknown as {
    id: number;
    name: string;
    email: string;
    dnc: boolean;
    bounced: boolean;
    last_out_subject: string | null;
    vadim_blog_mentions: number;
    classify_excerpt: string | null;
  }[];

  console.log(`Total missing onboarding: ${rows.length}\n`);
  console.log(
    "id     | name                              | email                                     | dnc | bnc | vb# | last_out_subject                                         | classify_excerpt",
  );
  console.log("-".repeat(220));
  for (const r of rows) {
    console.log(
      [
        String(r.id).padEnd(6),
        (r.name || "").padEnd(33).slice(0, 33),
        (r.email || "").padEnd(41).slice(0, 41),
        r.dnc ? "Y  " : "   ",
        r.bounced ? "Y  " : "   ",
        String(r.vadim_blog_mentions).padEnd(3),
        (r.last_out_subject || "").padEnd(56).slice(0, 56),
        (r.classify_excerpt || "").slice(0, 120),
      ].join(" | "),
    );
  }

  const actionable = rows.filter((r) => !r.dnc && !r.bounced);
  console.log(`\nActionable (not DNC, not bounced): ${actionable.length}`);
  console.log(`Blocked (DNC or bounced):          ${rows.length - actionable.length}`);
}

// ── cohort-status (read-only) ──────────────────────────────────

async function cmdCohortStatus() {
  const REQUIRED_COURSES = [
    "Introduction to agent skills",
    "Building with the Claude API",
    "Introduction to Model Context Protocol",
    "Claude Code in Action",
  ];

  const cohort = (await sql`
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.forwarding_alias AS alias_email
    FROM contacts c
    JOIN contact_emails ce ON ce.contact_id = c.id
    WHERE ce.subject = 'Your @vadim.blog email is ready - start the courses'
      AND ce.resend_id IS NOT NULL AND ce.resend_id <> ''
    ORDER BY c.first_name
  `) as unknown as {
    id: number;
    first_name: string;
    last_name: string | null;
    email: string;
    alias_email: string | null;
  }[];

  console.log(`Cohort size: ${cohort.length}\n`);

  const results: {
    name: string;
    email: string;
    alias: string | null;
    completions: Record<string, string | null>;
    complete: boolean;
    missing: string[];
    extras: string[];
  }[] = [];

  for (const c of cohort) {
    const name = `${c.first_name} ${c.last_name ?? ""}`.trim();

    const emails = c.alias_email
      ? ((await sql`
          SELECT received_at, subject FROM received_emails
          WHERE subject ILIKE '%completion of%'
            AND (matched_contact_id = ${c.id}
                 OR to_emails::text ILIKE ${"%" + c.alias_email + "%"})
          ORDER BY received_at ASC
        `) as unknown as { received_at: string; subject: string }[])
      : ((await sql`
          SELECT received_at, subject FROM received_emails
          WHERE subject ILIKE '%completion of%' AND matched_contact_id = ${c.id}
          ORDER BY received_at ASC
        `) as unknown as { received_at: string; subject: string }[]);

    const completions: Record<string, string | null> = {};
    for (const course of REQUIRED_COURSES) {
      const hit = emails.find((e) => e.subject.toLowerCase().includes(`completion of ${course.toLowerCase()}`));
      completions[course] = hit ? hit.received_at : null;
    }
    const extras = emails
      .filter((e) => {
        const subj = e.subject.toLowerCase();
        return !REQUIRED_COURSES.some((rc) => subj.includes(`completion of ${rc.toLowerCase()}`));
      })
      .map((e) => e.subject);
    const missing = REQUIRED_COURSES.filter((rc) => !completions[rc]);
    results.push({
      name,
      email: c.email,
      alias: c.alias_email,
      completions,
      complete: missing.length === 0,
      missing,
      extras,
    });
  }

  console.log("── CPN cohort completion status ──\n");
  for (const r of results) {
    console.log(`${r.complete ? "✓" : "✗"} ${r.name} <${r.email}>${r.alias ? ` (${r.alias})` : ""}`);
    for (const course of REQUIRED_COURSES) {
      const when = r.completions[course];
      console.log(`   ${when ? "  ✓" : "  ✗"} ${course}${when ? "  " + when : "  — not completed"}`);
    }
    if (r.extras.length > 0) console.log(`   ⚠ off-path completions: ${r.extras.join(", ")}`);
    console.log();
  }

  const done = results.filter((r) => r.complete).length;
  console.log(`── Summary: ${done}/${results.length} complete ──`);
  for (const r of results) {
    console.log(
      `  ${r.complete ? "✓" : "✗"} ${r.name.padEnd(30)} ${r.complete ? "all 4 done" : `missing: ${r.missing.join(", ")}`}`,
    );
  }
}

// ── custom (ad-hoc one-off send) ───────────────────────────────

async function cmdCustom() {
  const dryRun = flag("dry-run");
  const autoSend = flag("auto");
  const subject = flagStr("subject");
  const bodyArg = flagStr("body");
  const bodyFile = flagStr("body-file");
  const tagsJson = flagStr("tags") ?? '["cpn-outreach","cpn-custom"]';
  const sequenceType = flagStr("sequence-type") ?? "custom";
  const idsRaw = flagStr("id");
  const emailsRaw = flagStr("email");

  if (!subject) die("--subject is required");
  const body = bodyArg ?? (bodyFile ? readFileSync(bodyFile, "utf-8") : null);
  if (!body) die("--body or --body-file is required");
  if (!idsRaw && !emailsRaw) die("--id or --email is required (comma-separated for multiple)");

  const ids = idsRaw ? idsRaw.split(",").map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite) : [];
  const emails = emailsRaw ? emailsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const targets: ContactRow[] = [];
  for (const id of ids) {
    const rows = (await sql`
      SELECT id, first_name, last_name, email, forwarding_alias, do_not_contact
      FROM contacts WHERE id = ${id} LIMIT 1
    `) as unknown as ContactRow[];
    if (rows.length === 0) die(`No contact with id=${id}`);
    targets.push(rows[0]);
  }
  for (const e of emails) {
    const rows = (await sql`
      SELECT id, first_name, last_name, email, forwarding_alias, do_not_contact
      FROM contacts WHERE lower(email) = lower(${e}) LIMIT 1
    `) as unknown as ContactRow[];
    if (rows.length === 0) die(`No contact with email=${e}`);
    targets.push(rows[0]);
  }

  console.log(`\n── CPN custom send ──`);
  console.log(`  Targets: ${targets.length}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Tags:    ${tagsJson}`);
  console.log(`  Mode:    ${dryRun ? "DRY RUN" : autoSend ? "AUTO SEND" : "INTERACTIVE"}\n`);
  console.log(`${body.split("\n").map((l) => `  ${l}`).join("\n")}\n`);

  if (dryRun) {
    for (const t of targets) {
      console.log(`  [dry-run] would send to [${t.id}] ${t.first_name} <${t.email}>`);
    }
    return;
  }

  const rl = autoSend ? null : createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((r) => rl!.question(q, r));

  let sent = 0, skipped = 0, failed = 0;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (t.do_not_contact) {
      skipped++;
      console.log(`  → Skipped [${t.id}] ${t.email} (do_not_contact)\n`);
      continue;
    }
    const fullName = `${t.first_name} ${t.last_name ?? ""}`.trim();
    console.log(`── [${i + 1}/${targets.length}] ${fullName} <${t.email}>`);

    if (rl) {
      const answer = (await ask("  [S]end / s[K]ip / [Q]uit? ")).trim().toLowerCase();
      if (answer === "q") break;
      if (answer === "k") { skipped++; continue; }
    }

    const parentEmailId = await findParentEmailId(t.id);
    try {
      const result = await resend.emails.send({ from: FROM, to: t.email, subject, text: body });
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
          (${t.id}, ${result.data?.id ?? ""}, 'contact@vadim.blog',
           ${JSON.stringify([t.email])}, ${subject}, ${body}, 'sent',
           now()::text, ${tagsJson}, ${fullName}, ${parentEmailId},
           ${sequenceType}, '0', now()::text, now()::text)
      `;
      sent++;
      console.log(`  ✓ Sent\n`);
      if (autoSend) await sleep(500);
    } catch (err) {
      failed++;
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
  rl?.close();

  console.log(`\n── Summary ──\n  Sent: ${sent}  Skipped: ${skipped}  Failed: ${failed}\n`);
}

// ── CLI router ─────────────────────────────────────────────────

const COMMANDS: Record<string, () => Promise<void>> = {
  import: cmdImport,
  campaign: cmdCampaign,
  send: cmdSend,
  sync: cmdSync,
  followup: cmdFollowup,
  "send-one": cmdSendOne,
  "training-path": cmdTrainingPath,
  "assign-aliases": cmdAssignAliases,
  "audit-missing": cmdAuditMissing,
  "cohort-status": cmdCohortStatus,
  custom: cmdCustom,
};

const cmd = process.argv[2];
if (!cmd || !COMMANDS[cmd]) {
  console.log(`
  Usage: npx tsx scripts/cpn.ts <command> [flags]

  Pipeline:
    import         Import contacts from CSV + queue emails    [--dry-run] [--offset N]
    campaign       Direct send from CSV via Resend            [--dry-run] [--limit N] [--batch-size N] [--delay N] [--offset N] [--per-day N] [--schedule-minutes N]
    send           Flush queued emails from DB
    sync           Sync replies from Resend + classify
    followup       Follow up on needs_response contacts       [--dry-run] [--auto]

  Templates:
    send-one       Send one CPN template to one contact       --template <cpn_followup|cpn_training_path|cpn_email_ready|cpn_waiting_reply> (--id N | --email E) [--alias X] [--auto] [--dry-run] [--force]
    training-path  Bulk cpn_training_path to interested       [--dry-run] [--auto] [--only-id N]

  Aliases:
    assign-aliases Auto-assign forwarding_alias               [--dry-run]

  Audits (read-only):
    audit-missing  Interested-but-not-onboarded report
    cohort-status  4-course completion table

  Ad-hoc:
    custom         One-off send to N contacts                 (--id N[,N...] | --email E[,E...]) --subject "..." (--body "..." | --body-file PATH) [--tags '[...]'] [--sequence-type X] [--auto] [--dry-run]
`);
  process.exit(cmd ? 1 : 0);
}

COMMANDS[cmd]().catch((err) => {
  console.error(err);
  process.exit(1);
});
