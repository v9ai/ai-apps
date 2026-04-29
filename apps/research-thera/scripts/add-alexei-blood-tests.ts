/**
 * One-shot: create family member "Alexei" + attach the two WhatsApp blood-test JPEGs.
 *
 * Run: pnpm tsx scripts/add-alexei-blood-tests.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { uploadToR2 } from "@ai-apps/r2";

const USER_ID = "nicolai.vadim@gmail.com";
const FIRST_NAME = "Alexei";
const TEST_DATE = "2026-04-28";
const REPO_ROOT = process.cwd();
const FILES = [
  "WhatsApp Image 2026-04-28 at 09.24.40.jpeg",
  "WhatsApp Image 2026-04-28 at 09.24.51.jpeg",
];

const DATABASE_URL = process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) throw new Error("NEON_DATABASE_URL is required");

const sql = neon(DATABASE_URL);

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureFamilyMember(): Promise<number> {
  const existing = (await sql`
    SELECT id FROM family_members
    WHERE user_id = ${USER_ID} AND lower(first_name) = ${FIRST_NAME.toLowerCase()}
    LIMIT 1
  `) as { id: number }[];
  if (existing.length > 0) {
    console.log(`  family_members: reusing id=${existing[0].id}`);
    return existing[0].id;
  }

  const base = slugify(FIRST_NAME);
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const taken = (await sql`
      SELECT 1 FROM family_members WHERE user_id = ${USER_ID} AND slug = ${slug} LIMIT 1
    `) as unknown[];
    if (taken.length === 0) break;
    slug = `${base}-${i}`;
  }

  const inserted = (await sql`
    INSERT INTO family_members (user_id, slug, first_name, created_at, updated_at)
    VALUES (${USER_ID}, ${slug}, ${FIRST_NAME}, NOW(), NOW())
    RETURNING id
  `) as { id: number }[];
  const id = inserted[0].id;
  console.log(`  family_members: inserted id=${id} slug=${slug}`);
  return id;
}

async function uploadAndInsert(familyMemberId: number, filename: string) {
  const path = join(REPO_ROOT, filename);
  const bytes = await readFile(path);
  const key = `healthcare/blood-tests/${USER_ID}/${familyMemberId}/${Date.now()}-${filename.replace(/\s+/g, "_")}`;

  const result = await uploadToR2({
    key,
    body: bytes,
    contentType: "image/jpeg",
    bucket: "research-thera",
  });
  console.log(`  r2: uploaded ${key} (${result.sizeBytes} bytes)`);

  const row = (await sql`
    INSERT INTO blood_tests (user_id, family_member_id, file_name, file_path, status, test_date)
    VALUES (${USER_ID}, ${familyMemberId}, ${filename}, ${key}, 'uploaded', ${TEST_DATE}::date)
    RETURNING id
  `) as { id: string }[];
  console.log(`  blood_tests: inserted id=${row[0].id}`);
  return { testId: row[0].id, key, publicUrl: result.publicUrl };
}

async function main() {
  console.log(`add-alexei-blood-tests: user=${USER_ID}`);
  const familyMemberId = await ensureFamilyMember();
  const results = [];
  for (const filename of FILES) {
    results.push(await uploadAndInsert(familyMemberId, filename));
  }
  console.log("\nDone:");
  console.log(`  family_member_id = ${familyMemberId}`);
  for (const r of results) {
    console.log(`  test_id = ${r.testId}  url = ${r.publicUrl ?? r.key}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
