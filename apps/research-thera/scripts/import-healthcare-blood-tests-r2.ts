/**
 * Migrate the remaining healthcare R2 objects:
 *   - blood_tests PDFs under `<old_user_id>/...` (54 referenced in target DB)
 *     → copy to `longform-tts` under `healthcare/blood-tests/<new_user_id>/<basename>`
 *     → rewrite `blood_tests.file_path` in target DB
 *   - `test/...` 0-byte stubs (orphans) → delete from source only
 *
 * Run: pnpm tsx scripts/import-healthcare-blood-tests-r2.ts
 *
 * Same R2 account hosts both buckets, so CopyObjectCommand is server-side.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const SRC_BUCKET = "healthcare-blood-tests";
const DST_BUCKET = "longform-tts";

const OLD_USER_ID = "lJdCCXSxzqFTyavBgzgYZtM2hRLbAgmX";
const NEW_USER_ID = "88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c";
const NEW_PREFIX = `healthcare/blood-tests/${NEW_USER_ID}/`;

const TARGET_URL = process.env.NEON_DATABASE_URL!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
if (!TARGET_URL || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("NEON_DATABASE_URL + R2_* env vars required");
}

const DST = neon(TARGET_URL);
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function listAll(bucket: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const r = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const o of r.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = r.NextContinuationToken;
  } while (token);
  return keys;
}

async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw err;
  }
}

function srcKeyToDstKey(srcKey: string): string | null {
  if (srcKey.startsWith(`${OLD_USER_ID}/`)) {
    return NEW_PREFIX + srcKey.slice(OLD_USER_ID.length + 1);
  }
  return null;
}

function srcPathToDstPath(srcPath: string): string | null {
  // blood_tests.file_path uses the same key as the bucket key.
  return srcKeyToDstKey(srcPath);
}

async function main() {
  console.log(`Migrate remaining R2 objects: ${SRC_BUCKET} → ${DST_BUCKET}\n`);

  const allKeys = await listAll(SRC_BUCKET);
  const userKeys = allKeys.filter((k) => k.startsWith(`${OLD_USER_ID}/`));
  const testKeys = allKeys.filter((k) => k.startsWith("test/"));
  const otherKeys = allKeys.filter(
    (k) => !k.startsWith(`${OLD_USER_ID}/`) && !k.startsWith("test/"),
  );
  console.log(`  ${userKeys.length} blood-test PDFs, ${testKeys.length} test/ stubs, ${otherKeys.length} other`);
  if (otherKeys.length > 0) {
    console.warn(`  unexpected keys, aborting:\n${otherKeys.map((k) => "    " + k).join("\n")}`);
    process.exit(1);
  }

  console.log("\n--- Copy blood-test PDFs to target bucket ---");
  let copied = 0,
    skipped = 0;
  for (const srcKey of userKeys) {
    const dstKey = srcKeyToDstKey(srcKey)!;
    if (await objectExists(DST_BUCKET, dstKey)) {
      skipped++;
      continue;
    }
    await s3.send(
      new CopyObjectCommand({
        Bucket: DST_BUCKET,
        CopySource: `/${SRC_BUCKET}/${encodeURIComponent(srcKey).replace(/%2F/g, "/")}`,
        Key: dstKey,
      }),
    );
    copied++;
  }
  console.log(`  copied: ${copied}, already present: ${skipped}`);

  console.log("\n--- Update blood_tests.file_path in target DB ---");
  const updated = (await DST(
    `UPDATE blood_tests
       SET file_path = replace(file_path, $1, $2)
     WHERE file_path LIKE $3
     RETURNING id`,
    [`${OLD_USER_ID}/`, NEW_PREFIX, `${OLD_USER_ID}/%`],
  )) as { id: string }[];
  console.log(`  rewrote ${updated.length} blood_tests.file_path values`);

  console.log("\n--- Delete blood-test PDFs from source bucket ---");
  for (const k of userKeys) {
    await s3.send(new DeleteObjectCommand({ Bucket: SRC_BUCKET, Key: k }));
  }
  console.log(`  deleted ${userKeys.length} object(s) from ${SRC_BUCKET}`);

  if (testKeys.length > 0) {
    console.log("\n--- Delete orphan test/ stubs from source bucket ---");
    for (const k of testKeys) {
      await s3.send(new DeleteObjectCommand({ Bucket: SRC_BUCKET, Key: k }));
    }
    console.log(`  deleted ${testKeys.length} test/ stub(s)`);
  }

  const remaining = await listAll(SRC_BUCKET);
  console.log(`\nDone — source bucket now has ${remaining.length} object(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
