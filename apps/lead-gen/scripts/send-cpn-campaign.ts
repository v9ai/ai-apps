/**
 * Send Claude Partner Network outreach campaign via Resend.
 *
 * Reads partners_export.csv, personalizes emails per row, and sends
 * through Resend with rate-limiting and batching.
 *
 * Usage:
 *   npx tsx scripts/send-cpn-campaign.ts --dry-run --limit 5
 *   npx tsx scripts/send-cpn-campaign.ts --limit 100 --batch-size 50 --delay 2000
 *   npx tsx scripts/send-cpn-campaign.ts                # send to all
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import Papa from "papaparse";
import { Resend } from "resend";

// ── CLI flags ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const batchIdx = args.indexOf("--batch-size");
const batchSize = batchIdx !== -1 ? parseInt(args[batchIdx + 1], 10) : 50;
const delayIdx = args.indexOf("--delay");
const delayMs = delayIdx !== -1 ? parseInt(args[delayIdx + 1], 10) : 2000;
const scheduleIdx = args.indexOf("--schedule-minutes");
const scheduleMinutes = scheduleIdx !== -1 ? parseInt(args[scheduleIdx + 1], 10) : 0;

// ── CSV types ───────────────────────────────────────────────────

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

// ── Personalization ─────────────────────────────────────────────

function firstName(row: PartnerRow): string {
  const name = row.name?.trim();
  if (name) return name.split(/\s+/)[0];
  return row.login;
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

function buildEmail(row: PartnerRow) {
  const first = firstName(row);
  const sig = signal(row);

  const subject = `Claude Partner Network — ${first}`;

  const text = `Hi ${first},

${sig} — you'd be a strong fit for this.

Anthropic is launching the Claude Partner Network for teams deploying Claude to enterprise. I'm putting together the first training cohort — Anthropic is opening the partner training path next week and I'm looking for people to go through it together.

Want me to send you the details?

Vadim Nicolai
vadim.blog
`;

  return { subject, text };
}

// ── Main ────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey && !dryRun) {
    console.error("RESEND_API_KEY not found in .env.local");
    process.exit(1);
  }

  const csvPath = resolve("crates/github-patterns/partners_export.csv");
  const csvText = readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse<PartnerRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = data.filter((r) => r.email?.trim()).slice(0, limit);

  console.log(`\n  Campaign: Claude Partner Network`);
  console.log(`  Rows:     ${rows.length} (of ${data.length} total)`);
  console.log(`  Batch:    ${batchSize}  Delay: ${delayMs}ms`);
  console.log(`  Mode:     ${dryRun ? "DRY RUN" : "LIVE SEND"}\n`);

  if (dryRun) {
    const preview = rows.slice(0, 5);
    for (const row of preview) {
      const { subject, text } = buildEmail(row);
      console.log(`─── ${row.email} ───`);
      console.log(`Subject: ${subject}`);
      console.log(text);
      console.log();
    }
    console.log(`  (dry run — ${preview.length} previewed, 0 sent)\n`);
    return;
  }

  const resend = new Resend(apiKey);
  let scheduled = 0;
  let sent = 0;
  let failed = 0;

  const scheduledAt =
    scheduleMinutes > 0
      ? new Date(Date.now() + scheduleMinutes * 60_000).toISOString()
      : undefined;

  if (scheduledAt) {
    console.log(`  Scheduled for: ${scheduledAt} (${scheduleMinutes} min from now)\n`);
  }

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    for (const row of batch) {
      const { subject, text } = buildEmail(row);
      try {
        await resend.emails.send({
          from: "Vadim Nicolai <contact@vadim.blog>",
          to: row.email.trim(),
          subject,
          text,
          scheduledAt,
        });
        if (scheduledAt) {
          scheduled++;
          process.stdout.write(`  [${scheduled + failed}/${rows.length}] ⏱ ${row.email} → ${scheduledAt}\n`);
        } else {
          sent++;
          process.stdout.write(`  [${sent + failed}/${rows.length}] ✓ ${row.email}\n`);
        }
      } catch (err) {
        failed++;
        const total = (scheduledAt ? scheduled : sent) + failed;
        process.stdout.write(
          `  [${total}/${rows.length}] ✗ ${row.email} — ${err instanceof Error ? err.message : err}\n`,
        );
      }
    }

    if (i + batchSize < rows.length) {
      await sleep(delayMs);
    }
  }

  if (scheduledAt) {
    console.log(`\n  Done: ${scheduled} scheduled for ${scheduledAt}, ${failed} failed, ${rows.length} total\n`);
  } else {
    console.log(`\n  Done: ${sent} sent, ${failed} failed, ${rows.length} total\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
