import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@ai-apps/r2";

export const runtime = "nodejs";
export const maxDuration = 300;

const APP_NAME = "research-thera";
const BUCKET = "db-backups";
const RETENTION_DAYS = 30;
const MAX_DURATION_MS = 280_000;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const dateStr = startedAt.toISOString().slice(0, 10);
  const prefix = `${APP_NAME}/${dateStr}`;
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID!.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
  });

  const tables: Record<string, { tableName: string; rowCount: number; sizeBytes: number; status: string; error?: string }> = {};
  let overallStatus: "complete" | "partial" | "failed" = "complete";

  try {
    const tableRows = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    const tableNames = tableRows.map((r) => r.table_name as string);
    console.log(`[backup] ${APP_NAME}: found ${tableNames.length} tables`);

    for (const tableName of tableNames) {
      if (Date.now() - startedAt.getTime() > MAX_DURATION_MS * 0.8) {
        tables[tableName] = { tableName, rowCount: 0, sizeBytes: 0, status: "skipped_timeout" };
        overallStatus = "partial";
        continue;
      }

      try {
        const columns = await sql`
          SELECT column_name, data_type, is_nullable, column_default, udt_name, ordinal_position
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${tableName}
          ORDER BY ordinal_position
        `;
        const schemaJson = JSON.stringify({ tableName, columns }, null, 2);
        await upload(r2, `${prefix}/schema/${tableName}.json`, schemaJson);

        // Dynamic table name from information_schema — safe to interpolate
        const queryParts = [`SELECT * FROM "${tableName}"`] as string[] & { raw: string[] };
        queryParts.raw = [...queryParts];
        const rows = await sql(queryParts as TemplateStringsArray);
        const jsonl = rows.map((row: Record<string, unknown>) => JSON.stringify(row)).join("\n");
        let sizeBytes = 0;
        if (jsonl.length > 0) {
          const buf = Buffer.from(jsonl, "utf-8");
          await upload(r2, `${prefix}/data/${tableName}.jsonl`, jsonl);
          sizeBytes = buf.length;
        }

        tables[tableName] = { tableName, rowCount: rows.length, sizeBytes, status: "complete" };
        console.log(`[backup] ${tableName}: ${rows.length} rows, ${sizeBytes} bytes`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        tables[tableName] = { tableName, rowCount: 0, sizeBytes: 0, status: "failed", error: message };
        overallStatus = "partial";
        console.error(`[backup] ${tableName} failed: ${message}`);
      }
    }
  } catch (err) {
    overallStatus = "failed";
    console.error(`[backup] discovery failed: ${err}`);
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

  try {
    await upload(r2, `${prefix}/manifest.json`, JSON.stringify(manifest, null, 2));
  } catch (err) {
    console.error(`[backup] manifest upload failed: ${err}`);
  }

  try {
    await cleanupOldBackups(r2);
  } catch (err) {
    console.error(`[backup] retention cleanup failed: ${err}`);
  }

  return NextResponse.json(manifest, {
    status: overallStatus === "complete" ? 200 : 207,
  });
}

async function upload(client: S3Client, key: string, body: string) {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(body, "utf-8"),
      ContentType: "application/json",
    }),
  );
}

async function cleanupOldBackups(client: S3Client) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const prefix = `${APP_NAME}/`;

  const resp = await client.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, Delimiter: "/" }),
  );

  for (const cp of resp.CommonPrefixes ?? []) {
    const dateDir = cp.Prefix?.replace(prefix, "").replace(/\/$/, "") ?? "";
    if (dateDir < cutoffStr) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const list = await client.send(
          new ListObjectsV2Command({ Bucket: BUCKET, Prefix: cp.Prefix!, ContinuationToken: token }),
        );
        for (const obj of list.Contents ?? []) {
          if (obj.Key) keys.push(obj.Key);
        }
        token = list.NextContinuationToken;
      } while (token);

      if (keys.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: keys.map((k) => ({ Key: k })), Quiet: true },
          }),
        );
        console.log(`[backup] cleaned up ${cp.Prefix}`);
      }
    }
  }
}
