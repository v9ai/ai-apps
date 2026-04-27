/**
 * Dump every non-empty table from the CRM Neon project to Cloudflare R2 as JSONL.
 *
 * Run from apps/research-thera (so .env.local is picked up):
 *   export CRM_DATABASE_URL="postgresql://..."
 *   pnpm tsx scripts/backup-crm.ts
 *
 * Output keys: db-backups/crm/<YYYY-MM-DD>/data/<table>.jsonl  (minified, one JSON object per line)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const DST_BUCKET = "db-backups";
const DATE = "2026-04-27";
const PREFIX = `crm/${DATE}/data`;
const PAGE_SIZE = 5000;

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const CRM_DATABASE_URL = process.env.CRM_DATABASE_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required");
}
if (!CRM_DATABASE_URL) throw new Error("CRM_DATABASE_URL is required");

const sql = neon(CRM_DATABASE_URL);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/** Pick a stable order-by column. Prefer numeric `id`, then any text/uuid `id`,
 * then ctid as a last-resort tiebreaker so OFFSET pagination is deterministic. */
async function pickOrderBy(table: string): Promise<string> {
  const cols = (await sql(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  )) as { column_name: string; data_type: string }[];

  const byName = new Map(cols.map((c) => [c.column_name, c.data_type]));
  if (byName.has("id")) return `"id"`;
  if (byName.has("created_at")) return `"created_at"`;
  if (byName.has("checkpoint_id")) return `"checkpoint_id"`;
  // Fall back to a deterministic physical ordering.
  return `ctid`;
}

async function dumpTable(table: string): Promise<{ rows: number; bytes: number }> {
  const orderBy = await pickOrderBy(table);

  // Streaming-ish: fetch one page at a time, append JSON lines into a buffer,
  // then PutObject once. (R2 PutObject requires the full body, so we buffer.)
  const lines: string[] = [];
  let offset = 0;
  let total = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = (await sql(
      `SELECT * FROM "${table}" ORDER BY ${orderBy} LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    )) as Record<string, unknown>[];

    if (page.length === 0) break;

    for (const row of page) {
      lines.push(JSON.stringify(row));
    }
    total += page.length;
    offset += page.length;
    if (page.length < PAGE_SIZE) break;
  }

  if (total === 0) return { rows: 0, bytes: 0 };

  const body = lines.join("\n") + "\n";
  const bytes = Buffer.byteLength(body, "utf-8");
  const Key = `${PREFIX}/${table}.jsonl`;

  await s3.send(
    new PutObjectCommand({
      Bucket: DST_BUCKET,
      Key,
      Body: body,
      ContentType: "application/x-ndjson",
    }),
  );

  return { rows: total, bytes };
}

async function main() {
  console.log(`CRM backup → r2://${DST_BUCKET}/${PREFIX}/\n`);

  const tablesRows = (await sql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  )) as { table_name: string }[];
  const tables = tablesRows.map((r) => r.table_name);

  // Determine non-empty tables up-front so we skip empties cleanly.
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const c = (await sql(`SELECT COUNT(*)::int AS c FROM "${t}"`)) as { c: number }[];
    counts[t] = c[0].c;
  }

  const nonEmpty = tables.filter((t) => counts[t] > 0);
  const empty = tables.filter((t) => counts[t] === 0);
  console.log(`Tables: ${tables.length} total, ${nonEmpty.length} non-empty, ${empty.length} empty (skipped)\n`);
  console.log(`Empty (skipped): ${empty.join(", ")}\n`);

  const summary: { table: string; rows: number; bytes: number }[] = [];
  let totalBytes = 0;
  let totalRows = 0;
  for (const t of nonEmpty) {
    process.stdout.write(`  ${t} (${counts[t]} rows) ... `);
    const { rows, bytes } = await dumpTable(t);
    if (rows !== counts[t]) {
      console.log(`MISMATCH (got ${rows}, expected ${counts[t]})`);
    } else {
      console.log(`OK (${bytes} bytes)`);
    }
    summary.push({ table: t, rows, bytes });
    totalRows += rows;
    totalBytes += bytes;
  }

  console.log(`\n=== Summary ===`);
  for (const s of summary) {
    console.log(`  ${s.table.padEnd(28)} rows=${String(s.rows).padStart(6)}  bytes=${s.bytes}`);
  }
  console.log(`\nTOTAL  rows=${totalRows}  bytes=${totalBytes}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
