/**
 * Import healthcare data from agentic-healthcare Neon DB into research-thera Neon DB.
 *
 * Run: pnpm tsx scripts/import-healthcare-data.ts
 *
 * Env required:
 *   HEALTHCARE_DATABASE_URL — source (young-shadow-74777159 / neondb)
 *   NEON_DATABASE_URL       — target (wandering-dew-31821015 / neondb)
 *
 * Idempotent: re-running is safe. Each row is inserted with ON CONFLICT DO NOTHING,
 * and per-table progress is recorded in healthcare_import_progress on the target.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HEALTHCARE_URL = process.env.HEALTHCARE_DATABASE_URL;
const TARGET_URL = process.env.NEON_DATABASE_URL;
if (!HEALTHCARE_URL) throw new Error("HEALTHCARE_DATABASE_URL is required");
if (!TARGET_URL) throw new Error("NEON_DATABASE_URL is required");

const SRC = neon(HEALTHCARE_URL);
const DST = neon(TARGET_URL);

const mapPath = join(__dirname, "migrations/healthcare-column-map.json");
const map = JSON.parse(readFileSync(mapPath, "utf-8")) as {
  _user_id_remap: Record<string, string>;
  _family_member_id_uuid_to_int: Record<string, number>;
  tables: Record<
    string,
    { target: string; rows: number; transforms: string[]; rename?: boolean }
  >;
};

const USER_MAP = map._user_id_remap;
const FM_MAP = map._family_member_id_uuid_to_int;
const DST_USER = Object.values(USER_MAP)[0];

function rewriteFilePath(path: string): string {
  const parts = path.split("/");
  if (parts[0] === "family-documents" && parts.length >= 4) {
    const srcFamUuid = parts[2];
    const dstFamInt = FM_MAP[srcFamUuid];
    if (dstFamInt === undefined) {
      throw new Error(`No family_member map for uuid ${srcFamUuid} in path ${path}`);
    }
    return [
      "healthcare",
      "family-documents",
      DST_USER,
      String(dstFamInt),
      ...parts.slice(3),
    ].join("/");
  }
  return path;
}

function applyTransforms(
  row: Record<string, unknown>,
  srcTable: string,
  transforms: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };

  if (transforms.includes("user_id")) {
    const u = out.user_id as string | null | undefined;
    if (u != null) {
      const mapped = USER_MAP[u];
      if (!mapped) throw new Error(`Unknown user_id "${u}" in ${srcTable}`);
      out.user_id = mapped;
    }
  }

  if (transforms.includes("family_member_id_uuid_to_int")) {
    const fm = out.family_member_id as string | null | undefined;
    if (fm != null) {
      const mapped = FM_MAP[fm];
      if (mapped === undefined) {
        throw new Error(`Unknown family_member_id "${fm}" in ${srcTable}`);
      }
      out.family_member_id = mapped;
    }
  }

  if (transforms.includes("file_path_rewrite")) {
    const fp = out.file_path as string | null | undefined;
    if (fp) out.file_path = rewriteFilePath(fp);
  }

  return out;
}

function normalize(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

async function ensureProgressTable() {
  await DST(`CREATE TABLE IF NOT EXISTS healthcare_import_progress (
    table_name   text PRIMARY KEY,
    rows_copied  integer NOT NULL DEFAULT 0,
    completed_at timestamptz,
    notes        text
  )`);
}

async function recordProgress(
  srcTable: string,
  rowsCopied: number,
  completed: boolean,
  notes?: string,
) {
  await DST(
    `INSERT INTO healthcare_import_progress (table_name, rows_copied, completed_at, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (table_name) DO UPDATE
       SET rows_copied  = EXCLUDED.rows_copied,
           completed_at = EXCLUDED.completed_at,
           notes        = EXCLUDED.notes`,
    [
      srcTable,
      rowsCopied,
      completed ? new Date().toISOString() : null,
      notes ?? null,
    ],
  );
}

async function getColumns(db: ReturnType<typeof neon>, table: string): Promise<string[]> {
  const cols = (await db(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1
     ORDER BY ordinal_position`,
    [table],
  )) as { column_name: string }[];
  return cols.map((r) => r.column_name);
}

async function migrateTable(
  srcTable: string,
  def: { target: string; rows: number; transforms: string[] },
) {
  const targetTable = def.target;
  const targetCols = await getColumns(DST, targetTable);

  const rows = (await SRC(`SELECT * FROM ${srcTable}`)) as Record<string, unknown>[];
  if (rows.length === 0) {
    console.log(`  ${srcTable}: 0 rows — skipping`);
    await recordProgress(srcTable, 0, true, "0 rows in source");
    return 0;
  }

  console.log(`  ${srcTable} → ${targetTable}: ${rows.length} rows`);

  let copied = 0;
  for (const r of rows) {
    const transformed = applyTransforms(r, srcTable, def.transforms);

    // Project onto target columns; missing keys in source become null.
    const placeholders = targetCols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = targetCols.map((c) => `"${c}"`).join(", ");
    const values = targetCols.map((c) => normalize(transformed[c] ?? null));

    await DST(
      `INSERT INTO ${targetTable} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values,
    );
    copied++;
  }

  await recordProgress(srcTable, copied, true);
  return copied;
}

async function main() {
  console.log("Healthcare → research-thera data import\n");
  console.log(`source:  ${HEALTHCARE_URL!.replace(/:[^:@/]+@/, ":***@").slice(0, 60)}…`);
  console.log(`target:  ${TARGET_URL!.replace(/:[^:@/]+@/, ":***@").slice(0, 60)}…\n`);

  await ensureProgressTable();

  const order = [
    "doctors",
    "blood_tests",
    "blood_markers",
    "blood_test_embeddings",
    "blood_marker_embeddings",
    "conditions",
    "condition_embeddings",
    "medications",
    "medication_embeddings",
    "symptoms",
    "symptom_embeddings",
    "appointments",
    "appointment_embeddings",
    "medical_letters",
    "family_member_doctors",
    "family_documents",
    "brain_health_protocols",
    "protocol_supplements",
    "cognitive_baselines",
    "cognitive_check_ins",
    "memory_baseline",
    "memory_entries",
    "health_state_embeddings",
    "researches",
  ];

  let total = 0;
  for (const srcTable of order) {
    const def = map.tables[srcTable];
    if (!def) {
      console.warn(`  ${srcTable}: not in column-map — skipping`);
      continue;
    }
    total += await migrateTable(srcTable, def);
  }

  console.log(`\nDone — ${total} rows copied across ${order.length} tables.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
