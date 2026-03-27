#!/usr/bin/env tsx

/**
 * Export real job data from Neon for use as LLM eval test cases.
 *
 * Queries jobs that have already been classified by the pipeline and exports
 * balanced samples as TypeScript test data files. The DB labels (role_ai_engineer)
 * serve as the ground truth for eval assertions.
 *
 * Outputs:
 *   src/evals/role-tagging/db-test-data.ts  — AI engineer / frontend role cases
 *
 * Usage:
 *   pnpm tsx scripts/export-eval-data.ts
 *
 * Requires (in .env.local):
 *   NEON_DATABASE_URL   or   DATABASE_URL
 */

import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const pg = neon(process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL!);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const samplesPerBucket = parseInt(
  args[args.indexOf("--limit") + 1] ?? "15",
  10,
);
const roleOut = "src/evals/role-tagging/db-test-data.ts";

// ---------------------------------------------------------------------------
// D1 query helpers
// ---------------------------------------------------------------------------

async function query<T = Record<string, unknown>>(rawSql: string, params?: unknown[]): Promise<T[]> {
  // Build a tagged-template call from raw SQL + params so neon can safely escape values.
  const parts = rawSql.split("?");
  const strings = Object.assign(parts, { raw: parts }) as TemplateStringsArray;
  const rows = await pg(strings, ...(params ?? []));
  return rows as unknown as T[];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawRoleJob {
  id: number;
  title: string;
  location: string | null;
  description: string | null;
  role_ai_engineer: boolean | null;
  role_frontend_react: boolean | null;
  role_confidence: string | null;
  role_reason: string | null;
  role_source: string | null;
  source_kind: string | null;
  company_key: string | null;
}

// ---------------------------------------------------------------------------
// Sampling helpers
// ---------------------------------------------------------------------------

/** Truncate description to ~600 chars at a word boundary. */
function trimDesc(raw: string | null, maxLen = 600): string {
  if (!raw) return "";
  // Strip HTML tags
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

/** Make a slug-safe id from a string. */
function slugId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function toConfidence(raw: string | null): "high" | "medium" | "low" {
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "medium";
}

// ---------------------------------------------------------------------------
// Role tagging export
// ---------------------------------------------------------------------------

async function exportRoleTaggingCases(n: number): Promise<void> {
  console.log("\n📡 Querying role tagging data from Neon…");
  console.log(
    "  Note: role columns require the Phase 2 migration to be applied.",
  );

  const buckets: Array<{ label: string; sql: string; params: unknown[] }> = [
    {
      label: "AI engineer = true, high confidence",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_ai_engineer = true
              AND role_confidence = 'high'
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "Frontend React = true, high confidence",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_frontend_react = true
              AND role_ai_engineer = false
              AND role_confidence = 'high'
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "Dual role (AI + Frontend)",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_ai_engineer = true
              AND role_frontend_react = true
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [Math.max(3, Math.floor(n / 3))],
    },
    {
      label: "Non-target role (both false, high confidence)",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_ai_engineer = false
              AND role_frontend_react = false
              AND role_confidence = 'high'
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "Uncertain (medium/low confidence)",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_confidence IN ('medium', 'low')
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [Math.max(5, Math.floor(n / 2))],
    },
  ];

  const seen = new Set<number>();
  const allRows: Array<{ row: RawRoleJob; bucket: string }> = [];

  for (const bucket of buckets) {
    try {
      const rows = await query<RawRoleJob>(bucket.sql, bucket.params);
      console.log(`  ${bucket.label}: ${rows.length} rows`);
      for (const row of rows) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          allRows.push({ row, bucket: bucket.label });
        }
      }
    } catch (err) {
      // role columns may not exist yet if migration hasn't run
      console.warn(`  ⚠️  Skipping "${bucket.label}" — ${(err as Error).message.split("\n")[0]}`);
    }
  }

  if (allRows.length === 0) {
    console.log(
      "\n  ⚠️  No role tagging data found. Run the Phase 2 migration first:\n" +
        "    ALTER TABLE jobs ADD COLUMN role_ai_engineer INTEGER;\n" +
        "    ALTER TABLE jobs ADD COLUMN role_frontend_react INTEGER;\n" +
        "    ALTER TABLE jobs ADD COLUMN role_confidence TEXT;\n" +
        "    ALTER TABLE jobs ADD COLUMN role_reason TEXT;\n" +
        "    ALTER TABLE jobs ADD COLUMN role_source TEXT;\n",
    );
    return;
  }

  console.log(`\n  Total unique jobs: ${allRows.length}`);

  const cases = allRows.map(({ row, bucket }, i) => {
    const id = `db-role-${row.id}-${slugId(row.title ?? `job-${i}`)}`;
    const desc = trimDesc(row.description);
    const isAI = row.role_ai_engineer === true;
    const isFrontend = row.role_frontend_react === true;
    const confidence = toConfidence(row.role_confidence);
    const reason =
      row.role_reason?.replace(/"/g, '\\"').slice(0, 200) ??
      "Classified by pipeline";

    return `  // ${bucket} — DB id ${row.id} [${row.source_kind ?? "?"}/${row.company_key ?? "?"}] source=${row.role_source ?? "?"}
  {
    id: ${JSON.stringify(id)},
    description: ${JSON.stringify(row.title ?? "")},
    jobPosting: {
      title: ${JSON.stringify(row.title ?? "")},
      location: ${JSON.stringify(row.location ?? "")},
      description: ${JSON.stringify(desc)},
    },
    expectedRoleTags: {
      isAIEngineer: ${isAI},
      isFrontendReact: ${isFrontend},
      confidence: ${JSON.stringify(confidence)},
      reason: ${JSON.stringify(reason)},
    },
  }`;
  });

  const output = `/**
 * Real job data from D1 — role tagging test cases.
 *
 * AUTO-GENERATED by scripts/export-eval-data.ts — DO NOT EDIT BY HAND.
 * Re-run the script to refresh from the database.
 *
 * Ground truth: role_ai_engineer + role_frontend_react set by the
 * process-jobs Phase 2 pipeline (keyword heuristic → Workers AI → DeepSeek).
 *
 * Review labels before using in CI — especially medium/low confidence cases.
 *
 * Generated: ${new Date().toISOString()}
 * Total cases: ${cases.length}
 */

export interface RoleTagTestCase {
  id: string;
  description: string;
  jobPosting: {
    title: string;
    location: string;
    description: string;
  };
  expectedRoleTags: {
    isAIEngineer: boolean;
    isFrontendReact: boolean;
    confidence: "high" | "medium" | "low";
    reason: string;
  };
}

export const dbRoleTagTestCases: RoleTagTestCase[] = [
${cases.join(",\n")}
];
`;

  mkdirSync(dirname(roleOut), { recursive: true });
  writeFileSync(roleOut, output, "utf8");
  console.log(`\n✅ Role tagging test cases written to ${roleOut} (${cases.length} cases)`);
}

// ---------------------------------------------------------------------------
// Stats summary
// ---------------------------------------------------------------------------

async function printStats(): Promise<void> {
  console.log("\n📊 Database classification stats:");

  const roleStats = await query<{ ai: boolean | null; frontend: boolean | null; count: number }>(
    `SELECT role_ai_engineer AS ai, role_frontend_react AS frontend, COUNT(*) AS count
     FROM jobs
     WHERE role_ai_engineer IS NOT NULL OR role_frontend_react IS NOT NULL
     GROUP BY role_ai_engineer, role_frontend_react
     ORDER BY count DESC`,
  ).catch(() => []);

  if (roleStats.length > 0) {
    console.log("\n  Role tagging (Phase 2):");
    for (const row of roleStats) {
      console.log(`  ai=${row.ai ?? "null"}  frontend=${row.frontend ?? "null"}  n=${row.count}`);
    }
  } else {
    console.log("\n  Role tagging: no data (Phase 2 migration may not be applied)");
  }

  const total = await query<{ count: number }>("SELECT COUNT(*) AS count FROM jobs");
  console.log(`\n  Total jobs in DB: ${total[0]?.count ?? "?"}`);
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  console.log("🗃️  Export real job data (Neon) as LLM eval test cases");
  console.log("======================================================");

  await printStats();
  await exportRoleTaggingCases(samplesPerBucket);

  console.log("\n🏁 Done.");
  console.log(
    "\nNext steps:",
    "\n  1. Review the generated files — spot-check low/medium confidence labels",
    "\n  2. Import dbRoleTagTestCases in role-tagging eval tests",
    "\n  3. Run: pnpm test:email-evals",
  );
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
