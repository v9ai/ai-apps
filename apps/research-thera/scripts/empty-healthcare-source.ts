/**
 * After verifying that healthcare data is correctly imported, empty the source:
 *   - TRUNCATE all healthcare public.* user-data tables (CASCADE)
 *   - Delete the 2 family-documents/ R2 objects from `healthcare-blood-tests` bucket
 *
 * Keeps the Neon project shell + bucket shell intact (per user decision: "Empty after verify").
 *
 * Run: pnpm tsx scripts/empty-healthcare-source.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const SRC_BUCKET = "healthcare-blood-tests";
const HEALTHCARE_URL = process.env.HEALTHCARE_DATABASE_URL;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!HEALTHCARE_URL) throw new Error("HEALTHCARE_DATABASE_URL is required");
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required");
}

const SRC = neon(HEALTHCARE_URL);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const TABLES = [
  "appointment_embeddings",
  "appointments",
  "blood_marker_embeddings",
  "blood_markers",
  "blood_test_embeddings",
  "blood_tests",
  "brain_health_protocols",
  "protocol_supplements",
  "cognitive_baselines",
  "cognitive_check_ins",
  "condition_embeddings",
  "conditions",
  "doctors",
  "family_member_doctors",
  "family_documents",
  "family_members",
  "health_memories",
  "health_state_embeddings",
  "journal_embeddings",
  "journal_entries",
  "medical_letters",
  "medication_embeddings",
  "medications",
  "memory_baseline",
  "memory_entries",
  "researches",
  "symptom_embeddings",
  "symptoms",
];

async function emptyDb() {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  console.log(`Truncating ${TABLES.length} source tables (CASCADE)…`);
  await SRC(`TRUNCATE ${list} CASCADE`);
  console.log("  done.");
}

async function emptyR2() {
  console.log(`\nListing objects in ${SRC_BUCKET}…`);
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: SRC_BUCKET, Prefix: "family-documents/" }),
  );
  const keys = (listed.Contents ?? []).map((o) => o.Key!).filter(Boolean);
  if (keys.length === 0) {
    console.log("  no objects under family-documents/ — nothing to delete.");
    return;
  }
  console.log(`  found ${keys.length} object(s) to delete:`);
  for (const k of keys) console.log(`    ${k}`);
  for (const k of keys) {
    await s3.send(new DeleteObjectCommand({ Bucket: SRC_BUCKET, Key: k }));
  }
  console.log(`  deleted ${keys.length} object(s).`);
}

async function main() {
  console.log("Empty agentic-healthcare source (DB + R2)\n");
  await emptyDb();
  await emptyR2();
  console.log("\nSource is now empty. Neon project + bucket shells retained.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
