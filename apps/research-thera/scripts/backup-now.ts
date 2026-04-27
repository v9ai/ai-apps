/**
 * One-off backup runner — mirrors `app/api/cron/backup/route.ts` for local invocation.
 * Use when the daily Vercel cron failed and you need a fresh backup now.
 *
 *   pnpm tsx scripts/backup-now.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { gzipSync } from "node:zlib";
import { neon } from "@neondatabase/serverless";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const APP_NAME = "research-thera";
const BUCKET = "db-backups";
const RETENTION_DAYS = 30;

const OMIT_COLUMNS_DAILY: Record<string, string[]> = {
  deep_analyses: ["data_snapshot"],
  deep_issue_analyses: ["data_snapshot"],
  deep_goal_analyses: ["data_snapshot"],
  journal_entries: ["content"],
  notes: ["content"],
  stories: ["content"],
};

const sql = neon(process.env.NEON_DATABASE_URL!);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID!.trim()}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
  },
});

async function uploadString(key: string, body: string, contentType: string) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(body, "utf-8"),
      ContentType: contentType,
    }),
  );
}

async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string,
  contentEncoding?: string,
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(contentEncoding ? { ContentEncoding: contentEncoding } : {}),
    }),
  );
}

async function cleanupOldBackups() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const prefix = `${APP_NAME}/`;
  const resp = await r2.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, Delimiter: "/" }),
  );
  for (const cp of resp.CommonPrefixes ?? []) {
    const dateDir = cp.Prefix?.replace(prefix, "").replace(/\/$/, "") ?? "";
    if (dateDir < cutoffStr) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const list = await r2.send(
          new ListObjectsV2Command({ Bucket: BUCKET, Prefix: cp.Prefix!, ContinuationToken: token }),
        );
        for (const obj of list.Contents ?? []) if (obj.Key) keys.push(obj.Key);
        token = list.NextContinuationToken;
      } while (token);
      if (keys.length > 0) {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: keys.map((k) => ({ Key: k })), Quiet: true },
          }),
        );
        console.log(`  cleaned up ${cp.Prefix}`);
      }
    }
  }
}

async function main() {
  const startedAt = new Date();
  const dateStr = startedAt.toISOString().slice(0, 10);
  const prefix = `${APP_NAME}/${dateStr}`;
  const tables: Record<
    string,
    { tableName: string; rowCount: number; sizeBytes: number; status: string; error?: string }
  > = {};
  let overallStatus: "complete" | "partial" | "failed" = "complete";

  try {
    const tableRows = (await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `) as { table_name: string }[];
    const tableNames = tableRows.map((r) => r.table_name);
    console.log(`found ${tableNames.length} tables`);

    for (const tableName of tableNames) {
      try {
        const columns = (await sql`
          SELECT column_name, data_type, is_nullable, column_default, udt_name, ordinal_position
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${tableName}
          ORDER BY ordinal_position
        `) as { column_name: string }[];
        const schemaJson = JSON.stringify({ tableName, columns }, null, 2);
        await uploadString(`${prefix}/schema/${tableName}.json`, schemaJson, "application/json");

        const omit = new Set(OMIT_COLUMNS_DAILY[tableName] ?? []);
        const allColumnNames = columns.map((c) => c.column_name);
        const selectColumnNames = allColumnNames.filter((c) => !omit.has(c));
        const selectList =
          selectColumnNames.length === allColumnNames.length
            ? "*"
            : selectColumnNames.map((c) => `"${c}"`).join(", ");

        const rows = (await sql(`SELECT ${selectList} FROM "${tableName}"`)) as Record<
          string,
          unknown
        >[];
        const jsonl = rows.map((row) => JSON.stringify(row)).join("\n");
        let sizeBytes = 0;
        if (jsonl.length > 0) {
          const gz = gzipSync(Buffer.from(jsonl, "utf-8"));
          await uploadBuffer(
            `${prefix}/data/${tableName}.jsonl.gz`,
            gz,
            "application/x-ndjson",
            "gzip",
          );
          sizeBytes = gz.length;
        }
        tables[tableName] = { tableName, rowCount: rows.length, sizeBytes, status: "complete" };
        console.log(`  ${tableName}: ${rows.length} rows, ${sizeBytes}B (gzip)`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        tables[tableName] = { tableName, rowCount: 0, sizeBytes: 0, status: "failed", error: message };
        overallStatus = "partial";
        console.error(`  ${tableName} FAILED: ${message}`);
      }
    }
  } catch (err) {
    overallStatus = "failed";
    console.error(`discovery failed: ${err}`);
  }

  const completedAt = new Date();
  const manifest = {
    app: APP_NAME,
    date: dateStr,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    status: overallStatus,
    tables,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
  await uploadString(`${prefix}/manifest.json`, JSON.stringify(manifest, null, 2), "application/json");
  await cleanupOldBackups();

  const ok = Object.values(tables).filter((t) => t.status === "complete").length;
  const fail = Object.values(tables).filter((t) => t.status === "failed").length;
  console.log(`\nDone — status=${overallStatus}, ${ok} complete, ${fail} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
