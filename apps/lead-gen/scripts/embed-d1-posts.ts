/**
 * Generate JobBERT-v3 embeddings for D1 posts that don't have one yet.
 *
 * Pulls rows from D1 (`lead-gen-jobs`) via `wrangler d1 execute --json`,
 * batches `post_text` through `embedPostBatch` (HF Inference, 768-dim),
 * and writes UPDATE statements back via `wrangler d1 execute --file`.
 *
 * Filters by `--contact-id` and/or `--company-key` so a single contact's
 * posts (e.g. Shannon Palmer / 29934) can be embedded in isolation.
 *
 * Usage:
 *   pnpm exec tsx scripts/embed-d1-posts.ts --contact-id 29934 [--batch 16] [--limit N] [--dry-run]
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { embedPostBatch } from "@/lib/candle/client";

const DB = "lead-gen-jobs";
const EDGE_DIR = join(process.cwd(), "edge");

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function flagStr(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : null;
}
function flagInt(name: string, fallback: number): number {
  const v = flagStr(name);
  return v ? parseInt(v, 10) : fallback;
}

interface PostRow {
  id: number;
  post_text: string;
}

// wrangler --json prefixes stdout with non-JSON progress glyphs (e.g. "├ Checking…").
// Walk back from the trailing `]`/`}` and parse the balanced slice so a leading
// banner doesn't blow up JSON.parse.
function parseTrailingJson(out: string): unknown {
  const s = out.trimEnd();
  const lastBracket = s.lastIndexOf("]");
  const lastBrace = s.lastIndexOf("}");
  const last = Math.max(lastBracket, lastBrace);
  if (last < 0) {
    throw new Error(`wrangler: no JSON in output: ${s.slice(0, 200)}`);
  }
  const close = s[last];
  const open = close === "]" ? "[" : "{";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = last; i >= 0; i--) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === close) depth++;
    else if (ch === open) {
      depth--;
      if (depth === 0) return JSON.parse(s.slice(i, last + 1));
    }
  }
  throw new Error(`wrangler: unbalanced JSON in output: ${s.slice(0, 200)}`);
}

function execD1Json(sql: string): unknown {
  const out = execFileSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql],
    { cwd: EDGE_DIR, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  return parseTrailingJson(out);
}

function execD1File(filePath: string): unknown {
  const rel = filePath.startsWith(EDGE_DIR) ? filePath.slice(EDGE_DIR.length + 1) : filePath;
  const out = execFileSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", DB, "--remote", "--json", "--file", rel],
    { cwd: EDGE_DIR, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  return parseTrailingJson(out);
}

function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function main() {
  const contactId = flagStr("contact-id");
  const companyKey = flagStr("company-key");
  const batchSize = flagInt("batch", 16);
  const limit = flagInt("limit", 100_000);
  const dryRun = flag("dry-run");

  if (!contactId && !companyKey) {
    console.error("--contact-id or --company-key is required");
    process.exit(1);
  }

  const where: string[] = [
    "post_text IS NOT NULL",
    "length(post_text) > 0",
    "(job_embedding IS NULL OR job_embedding = '')",
  ];
  if (contactId) where.push(`contact_id = ${parseInt(contactId, 10)}`);
  if (companyKey) where.push(`company_key = ${sqlString(companyKey)}`);

  const selectSql = `SELECT id, post_text FROM posts WHERE ${where.join(" AND ")} ORDER BY id LIMIT ${limit}`;
  console.log(`SELECT: ${selectSql}\n`);

  const result = execD1Json(selectSql) as Array<{ results: PostRow[] }>;
  const rows = (result?.[0]?.results ?? []) as PostRow[];
  console.log(`Found ${rows.length} posts to embed`);
  if (rows.length === 0) return;

  const batches = chunk(rows, batchSize);
  const updates: string[] = [];
  let done = 0;
  for (const b of batches) {
    const texts = b.map((r) => r.post_text.slice(0, 4000));
    const vecs = await embedPostBatch(texts);
    for (let i = 0; i < b.length; i++) {
      const id = b[i].id;
      const vecJson = JSON.stringify(vecs[i]);
      updates.push(`UPDATE posts SET job_embedding = ${sqlString(vecJson)} WHERE id = ${id};`);
    }
    done += b.length;
    process.stdout.write(`  embedded ${done}/${rows.length}\n`);
  }

  if (dryRun) {
    console.log(`\n[dry-run] would write ${updates.length} UPDATEs. Sample:`);
    console.log(updates.slice(0, 2).join("\n"));
    return;
  }

  const out = join(EDGE_DIR, `seeds/.tmp-embed-${Date.now()}.sql`);
  writeFileSync(out, updates.join("\n") + "\n", "utf-8");
  console.log(`\nWrote ${updates.length} UPDATEs to ${out}, applying...`);
  const applyResult = execD1File(out) as Array<{ meta?: { changes?: number } }>;
  const changes = applyResult?.[0]?.meta?.changes;
  console.log(`Applied. changes=${changes ?? "?"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
