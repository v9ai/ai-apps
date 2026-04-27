/**
 * Copy healthcare R2 objects from `healthcare-blood-tests` → `longform-tts`
 * under the `healthcare/` prefix, with user_id and family_member_id rewritten
 * to research-thera identities.
 *
 * Run: pnpm tsx scripts/import-healthcare-r2.ts
 *
 * Env required (same R2 account hosts both buckets):
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   HEALTHCARE_DATABASE_URL — to enumerate source file_paths
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import {
  S3Client,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SRC_BUCKET = "healthcare-blood-tests";
const DST_BUCKET = "longform-tts";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const HEALTHCARE_URL = process.env.HEALTHCARE_DATABASE_URL;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required");
}
if (!HEALTHCARE_URL) throw new Error("HEALTHCARE_DATABASE_URL is required");

const SRC = neon(HEALTHCARE_URL);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const map = JSON.parse(
  readFileSync(join(__dirname, "migrations/healthcare-column-map.json"), "utf-8"),
) as {
  _user_id_remap: Record<string, string>;
  _family_member_id_uuid_to_int: Record<string, number>;
};
const USER_MAP = map._user_id_remap;
const FM_MAP = map._family_member_id_uuid_to_int;
const DST_USER = Object.values(USER_MAP)[0];

function rewriteKey(srcKey: string): string {
  const parts = srcKey.split("/");
  if (parts[0] !== "family-documents" || parts.length < 4) {
    throw new Error(`Unexpected source key shape: ${srcKey}`);
  }
  const srcUser = parts[1];
  const srcFamUuid = parts[2];
  if (!USER_MAP[srcUser]) throw new Error(`Unknown user_id segment in key: ${srcKey}`);
  const dstFamInt = FM_MAP[srcFamUuid];
  if (dstFamInt === undefined) {
    throw new Error(`Unknown family_member_id segment in key: ${srcKey}`);
  }
  return [
    "healthcare",
    "family-documents",
    DST_USER,
    String(dstFamInt),
    ...parts.slice(3),
  ].join("/");
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

async function copyOne(srcKey: string) {
  const dstKey = rewriteKey(srcKey);

  const srcExists = await objectExists(SRC_BUCKET, srcKey);
  if (!srcExists) {
    console.warn(`  ${srcKey}: not found in source — skipping`);
    return false;
  }
  const dstAlready = await objectExists(DST_BUCKET, dstKey);
  if (dstAlready) {
    console.log(`  ${srcKey} → ${dstKey} : already present, skipping`);
    return true;
  }

  await s3.send(
    new CopyObjectCommand({
      Bucket: DST_BUCKET,
      CopySource: `/${SRC_BUCKET}/${encodeURIComponent(srcKey).replace(/%2F/g, "/")}`,
      Key: dstKey,
    }),
  );
  console.log(`  ${srcKey} → ${dstKey}`);
  return true;
}

async function main() {
  console.log(`R2 copy: ${SRC_BUCKET} → ${DST_BUCKET} (account ${R2_ACCOUNT_ID})\n`);

  const rows = (await SRC(
    `SELECT file_path FROM family_documents WHERE file_path IS NOT NULL ORDER BY file_path`,
  )) as { file_path: string }[];

  if (rows.length === 0) {
    console.log("No source file_paths to copy.");
    return;
  }

  console.log(`Found ${rows.length} source object(s):\n`);
  let ok = 0;
  for (const r of rows) {
    if (await copyOne(r.file_path)) ok++;
  }
  console.log(`\nDone — ${ok}/${rows.length} object(s) present at destination.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
