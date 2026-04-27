/**
 * "Rename" pdf-uploads → research-thera and flatten all healthcare/* keys to
 * basename-only. R2 doesn't support rename, so this is create-new + copy + delete.
 *
 *   pdf-uploads/healthcare/family-documents/<uid>/<int>/<file>  → research-thera/<file>
 *   pdf-uploads/healthcare/blood-tests/<uid>/<file>             → research-thera/<file>
 *
 * Then:
 *   - UPDATE family_documents.file_path / blood_tests.file_path to basename only.
 *   - Delete healthcare/* from pdf-uploads.
 *   - Delete pdf-uploads bucket if it's now empty.
 *
 * Run: pnpm tsx scripts/flatten-to-research-thera-bucket.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import {
  S3Client,
  ListObjectsV2Command,
  CreateBucketCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const OLD_BUCKET = "pdf-uploads";
const NEW_BUCKET = "research-thera";
const PREFIX = "healthcare/";

const TARGET_URL = process.env.NEON_DATABASE_URL!;
const DST = neon(TARGET_URL);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

function basename(key: string): string {
  return key.split("/").pop()!;
}

async function listAll(bucket: string, prefix?: string): Promise<string[]> {
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

async function bucketExists(bucket: string): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch {
    return false;
  }
}

async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
    if (status === 404) return false;
    throw err;
  }
}

async function main() {
  console.log(`Flatten ${OLD_BUCKET}/${PREFIX} → ${NEW_BUCKET}/<basename>\n`);

  // --- Phase 0: ensure new bucket exists ---
  if (!(await bucketExists(NEW_BUCKET))) {
    console.log(`Creating bucket ${NEW_BUCKET}...`);
    await s3.send(new CreateBucketCommand({ Bucket: NEW_BUCKET }));
  } else {
    console.log(`Bucket ${NEW_BUCKET} already exists.`);
  }

  // --- Phase 1: enumerate source + check basename collisions ---
  const oldKeys = await listAll(OLD_BUCKET, PREFIX);
  const baseToOld = new Map<string, string>();
  const dupes: string[] = [];
  for (const k of oldKeys) {
    const b = basename(k);
    if (baseToOld.has(b)) dupes.push(b);
    else baseToOld.set(b, k);
  }
  if (dupes.length > 0) {
    console.error(`Basename collision(s) detected — aborting:\n${dupes.join("\n")}`);
    process.exit(2);
  }
  console.log(`  ${oldKeys.length} object(s) at ${OLD_BUCKET}/${PREFIX}, all basenames unique`);

  // --- Phase 2: server-side copy ---
  console.log("\n--- Copy ---");
  let copied = 0,
    already = 0;
  for (const [base, oldKey] of baseToOld) {
    if (await objectExists(NEW_BUCKET, base)) {
      already++;
      continue;
    }
    await s3.send(
      new CopyObjectCommand({
        Bucket: NEW_BUCKET,
        CopySource: `/${OLD_BUCKET}/${encodeURIComponent(oldKey).replace(/%2F/g, "/")}`,
        Key: base,
      }),
    );
    copied++;
  }
  console.log(`  copied ${copied}, already at destination ${already}`);

  // --- Phase 3: verify all destination objects exist ---
  console.log("\n--- Verify ---");
  const missing: string[] = [];
  for (const base of baseToOld.keys()) {
    if (!(await objectExists(NEW_BUCKET, base))) missing.push(base);
  }
  if (missing.length > 0) {
    console.error(`  ${missing.length} object(s) MISSING — aborting before delete:`);
    for (const k of missing) console.error("   -", k);
    process.exit(3);
  }
  console.log(`  all ${baseToOld.size} object(s) present at ${NEW_BUCKET}`);

  // --- Phase 4: rewrite DB file_paths to basename only ---
  console.log("\n--- Rewrite DB file_paths ---");
  const fdRows = (await DST(
    `UPDATE family_documents
       SET file_path = regexp_replace(file_path, '^.*/', '')
     WHERE file_path LIKE 'healthcare/%'
     RETURNING id, file_path`,
  )) as { id: string; file_path: string }[];
  console.log(`  family_documents: ${fdRows.length} row(s) rewritten`);
  const btRows = (await DST(
    `UPDATE blood_tests
       SET file_path = regexp_replace(file_path, '^.*/', '')
     WHERE file_path LIKE 'healthcare/%' OR file_path LIKE '%/%'
     RETURNING id, file_path`,
  )) as { id: string; file_path: string }[];
  console.log(`  blood_tests: ${btRows.length} row(s) rewritten`);

  // --- Phase 5: delete from source ---
  console.log("\n--- Delete source objects ---");
  for (const k of oldKeys) {
    await s3.send(new DeleteObjectCommand({ Bucket: OLD_BUCKET, Key: k }));
  }
  console.log(`  deleted ${oldKeys.length} object(s) from ${OLD_BUCKET}/${PREFIX}`);

  // --- Phase 6: delete pdf-uploads bucket if it's now empty ---
  const remainingTotal = await listAll(OLD_BUCKET);
  if (remainingTotal.length === 0) {
    try {
      await s3.send(new DeleteBucketCommand({ Bucket: OLD_BUCKET }));
      console.log(`\nBucket ${OLD_BUCKET} was empty after move — deleted.`);
    } catch (e) {
      console.warn(
        `\nBucket ${OLD_BUCKET} delete failed (likely permissions); leaving in place.`,
        (e as Error).message,
      );
    }
  } else {
    console.log(`\nBucket ${OLD_BUCKET} still has ${remainingTotal.length} other object(s); keeping it.`);
  }

  console.log(`\nDone — research-thera/ now holds ${baseToOld.size} flat object(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
