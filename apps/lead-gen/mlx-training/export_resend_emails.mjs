/**
 * Export all sent emails from Resend API as JSONL training data.
 *
 * Paginates through all sent emails, fetches full content for each,
 * and formats as chat-format JSONL for MLX LoRA fine-tuning.
 *
 * Usage:
 *   node mlx-training/export_resend_emails.mjs --stats
 *   node mlx-training/export_resend_emails.mjs
 *   node mlx-training/export_resend_emails.mjs --limit 50
 */

import { Resend } from "resend";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Config ──────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error("ERROR: Set RESEND_API_KEY");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

const SYSTEM_PROMPT =
  'You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer ' +
  '(10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). ' +
  'Output ONLY valid JSON: {"subject": "...", "body": "..."}';

const OUT_DIR = "mlx-training/data/outreach-email";

// ── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const statsOnly = args.includes("--stats");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#\d+|#x[\da-fA-F]+|\w+);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractRecipientName(to) {
  // "Vadim <v@x.com>" → "Vadim", or just the email local part
  if (!to) return null;
  const addr = Array.isArray(to) ? to[0] : to;
  if (!addr) return null;
  const nameMatch = addr.match(/^([^<]+)</);
  if (nameMatch) return nameMatch[1].trim();
  const localMatch = addr.match(/^([^@]+)/);
  if (localMatch) {
    const local = localMatch[1].replace(/[._-]/g, " ");
    return local.split(" ")[0];
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Fetch all sent emails ───────────────────────────────────────────────────

async function fetchAllEmails() {
  const allEmails = [];
  let after = undefined;
  let page = 0;

  while (true) {
    page++;
    const params = { limit: 100 };
    if (after) params.after = after;

    console.error(`  Fetching page ${page}...`);
    const { data, error } = await resend.emails.list(params);

    if (error) {
      console.error(`  API error: ${error.message}`);
      break;
    }

    if (!data?.data?.length) break;

    allEmails.push(...data.data);
    console.error(`  Got ${data.data.length} emails (total: ${allEmails.length})`);

    if (allEmails.length >= limit) {
      break;
    }

    if (data.has_more && data.data.length > 0) {
      after = data.data[data.data.length - 1].id;
      await sleep(150); // rate limit
    } else {
      break;
    }
  }

  const raw = allEmails.slice(0, limit);

  // Filter to delivered/clicked only (skip bounced, suppressed, canceled, failed)
  const USEFUL_EVENTS = new Set(["delivered", "clicked", "opened", "sent"]);
  const filtered = raw.filter((e) => USEFUL_EVENTS.has(e.last_event));
  console.error(`  Filtered: ${raw.length} → ${filtered.length} (kept delivered/clicked/opened/sent, skipped ${raw.length - filtered.length} bounced/suppressed/canceled/failed)`);

  return filtered;
}

// ── Fetch full email content (with concurrency) ────────────────────────────

async function fetchEmailContent(emailId) {
  try {
    const { data, error } = await resend.emails.get(emailId);
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch emails in concurrent batches to speed up the export.
 * Resend rate limit is 10 req/sec; we use 5 concurrent to stay safe.
 */
async function fetchEmailsBatch(emails, concurrency = 5) {
  const results = new Array(emails.length).fill(null);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= emails.length) break;
      results[idx] = await fetchEmailContent(emails[idx].id);
      // Small delay per request within each worker
      await sleep(100);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Build training record ───────────────────────────────────────────────────

function buildUserMessage(email) {
  const recipientName = extractRecipientName(
    Array.isArray(email.to) ? email.to[0] : email.to
  );

  const parts = ["Write an initial outreach email.", ""];

  parts.push("RECIPIENT:");
  parts.push(`- Name: ${recipientName || "there"}`);

  // We don't have company/position from Resend, so keep it minimal
  const to = Array.isArray(email.to) ? email.to[0] : email.to;
  if (to) {
    const domain = to.split("@")[1];
    if (domain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain)) {
      parts.push(`- Company domain: ${domain}`);
    }
  }
  parts.push("");

  parts.push("INSTRUCTIONS:");
  parts.push("- Cold outreach to explore engineering opportunities");
  parts.push("- Highlight relevant experience only");
  parts.push("- 100-180 words, one clear CTA");
  parts.push('- Use {{name}} placeholder for recipient name');

  return parts.join("\n");
}

function buildAssistantMessage(subject, body) {
  // Replace actual recipient name with {{name}} in body
  const content = JSON.stringify({ subject, body });
  return `<think>\n</think>\n${content}`;
}

function emailToRecord(email, fullEmail) {
  const subject = (fullEmail?.subject || email.subject || "").trim();
  let body = "";

  // Prefer text_content, fall back to stripped HTML
  if (fullEmail?.text) {
    body = fullEmail.text.trim();
  } else if (fullEmail?.html) {
    body = stripHtml(fullEmail.html);
  }

  if (!subject || !body) return null;

  const wc = wordCount(body);
  if (wc < 30 || wc > 500) return null;
  if (subject.length < 5) return null;

  // Skip system/transactional emails
  const lowerSubject = subject.toLowerCase();
  if (
    lowerSubject.includes("verify") ||
    lowerSubject.includes("password") ||
    lowerSubject.includes("welcome") ||
    lowerSubject.includes("confirm") ||
    lowerSubject.includes("notification") ||
    lowerSubject.includes("unsubscribe")
  ) {
    return null;
  }

  const userMsg = buildUserMessage(email);
  const assistantMsg = buildAssistantMessage(subject, body);

  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMsg },
      { role: "assistant", content: assistantMsg },
    ],
    _meta: {
      resend_id: email.id,
      to: email.to,
      created_at: email.created_at,
      subject,
      word_count: wc,
    },
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.error("Fetching sent emails from Resend...");
  const emails = await fetchAllEmails();
  console.error(`Total emails from Resend: ${emails.length}`);

  if (statsOnly) {
    // Quick stats from list metadata
    const byStatus = {};
    for (const e of emails) {
      const status = e.last_event || "unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    console.log(`\nResend emails: ${emails.length}`);
    console.log("By last_event:", JSON.stringify(byStatus, null, 2));
    return;
  }

  // Fetch full content with concurrent workers
  console.error(`\nFetching full content for ${emails.length} emails (5 concurrent workers)...`);
  const fullEmails = await fetchEmailsBatch(emails, 5);

  const records = [];
  let skipped = 0;
  let fetchErrors = 0;

  for (let i = 0; i < emails.length; i++) {
    const full = fullEmails[i];
    if (!full) {
      fetchErrors++;
      continue;
    }

    const record = emailToRecord(emails[i], full);
    if (record) {
      records.push(record);
    } else {
      skipped++;
    }

    if ((i + 1) % 500 === 0) {
      console.error(`  Processed: ${i + 1}/${emails.length} (${records.length} valid, ${skipped} skipped, ${fetchErrors} errors)`);
    }
  }

  console.error(`\nResults: ${records.length} valid, ${skipped} skipped, ${fetchErrors} fetch errors`);

  // Write JSONL
  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "resend.jsonl");
  const lines = records.map((r) => {
    // Remove _meta before writing training data
    const { _meta, ...training } = r;
    return JSON.stringify(training);
  });
  writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`Written ${records.length} records to ${outPath}`);

  // Also write a metadata file for debugging
  const metaPath = join(OUT_DIR, "resend_meta.jsonl");
  const metaLines = records.map((r) => JSON.stringify(r._meta));
  writeFileSync(metaPath, metaLines.join("\n") + "\n");
  console.log(`Metadata written to ${metaPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
