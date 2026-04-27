/**
 * Move healthcare/ R2 objects from legacy `longform-tts` → current
 * research-thera bucket `pdf-uploads`. Server-side copy on the same R2 account.
 * After verifying every object exists at the destination, deletes the source copies.
 *
 * Run: pnpm tsx scripts/move-healthcare-to-pdf-uploads.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const SRC_BUCKET = "longform-tts";
const DST_BUCKET = "pdf-uploads";
const PREFIX = "healthcare/";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const r = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of r.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = r.NextContinuationToken;
  } while (token);
  return keys;
}

async function exists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw err;
  }
}

async function main() {
  console.log(`Move ${PREFIX} from ${SRC_BUCKET} → ${DST_BUCKET}\n`);

  const keys = await listAll(SRC_BUCKET, PREFIX);
  console.log(`  found ${keys.length} object(s) at source under ${PREFIX}`);
  if (keys.length === 0) {
    console.log("  nothing to move.");
    return;
  }

  console.log("\n--- Phase 1: server-side copy ---");
  let copied = 0, already = 0;
  for (const key of keys) {
    if (await exists(DST_BUCKET, key)) {
      already++;
      continue;
    }
    await s3.send(
      new CopyObjectCommand({
        Bucket: DST_BUCKET,
        CopySource: `/${SRC_BUCKET}/${encodeURIComponent(key).replace(/%2F/g, "/")}`,
        Key: key,
      }),
    );
    copied++;
  }
  console.log(`  copied ${copied}, already at destination ${already}`);

  console.log("\n--- Phase 2: verify all destination objects ---");
  const missing: string[] = [];
  for (const key of keys) {
    if (!(await exists(DST_BUCKET, key))) missing.push(key);
  }
  if (missing.length > 0) {
    console.error(`  ${missing.length} object(s) MISSING at ${DST_BUCKET} — aborting before delete:`);
    for (const k of missing) console.error("   -", k);
    process.exit(2);
  }
  console.log(`  all ${keys.length} object(s) verified at ${DST_BUCKET}`);

  console.log("\n--- Phase 3: delete from source ---");
  for (const key of keys) {
    await s3.send(new DeleteObjectCommand({ Bucket: SRC_BUCKET, Key: key }));
  }
  console.log(`  deleted ${keys.length} object(s) from ${SRC_BUCKET}`);

  const remaining = await listAll(SRC_BUCKET, PREFIX);
  console.log(`\nDone — ${SRC_BUCKET}/${PREFIX} now has ${remaining.length} object(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
