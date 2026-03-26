/**
 * One-time data migration: Cloudflare D1 (SQLite) → Neon PostgreSQL
 *
 * Run: pnpm tsx scripts/migrate-d1-to-neon.ts
 *
 * Tables migrated (in FK order):
 *   companies → ashby_boards → jobs → job_skill_tags
 *
 * Skipped D1-only columns:
 *   companies: is_ai_native, is_ai_first, ats_provider
 *   jobs: opening, opening_plain, description_body, description_body_plain,
 *         additional, additional_plain, lists, role_frontend_react
 *
 * ashby_boards has a schema mismatch between D1 and Neon — mapped explicitly.
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_D1_ID = process.env.CLOUDFLARE_D1_DATABASE_ID!;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_ID}/query`;

const sql = neon(process.env.NEON_DATABASE_URL!);

// ---------------------------------------------------------------------------
// D1 helpers
// ---------------------------------------------------------------------------

async function d1Query(query: string): Promise<any[]> {
  const res = await fetch(D1_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql: query }),
  });
  const data = (await res.json()) as any;
  if (!data.success) throw new Error(`D1 error: ${JSON.stringify(data.errors)}`);
  return data.result[0].results ?? [];
}

async function d1FetchAll(table: string, batchSize = 100): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const batch = await d1Query(`SELECT * FROM ${table} LIMIT ${batchSize} OFFSET ${offset}`);
    all.push(...batch);
    if (batch.length < batchSize) break;
    offset += batchSize;
    process.stdout.write(`  fetched ${all.length} from ${table}…\r`);
  }
  return all;
}

// ---------------------------------------------------------------------------
// Neon helpers
// ---------------------------------------------------------------------------

function toBool(v: any): boolean | null {
  if (v === null || v === undefined) return null;
  return v === 1 || v === true;
}

const INT32_MAX = 2_147_483_647;
const INT32_MIN = -2_147_483_648;

/** Clamp to PostgreSQL INTEGER range; out-of-range values become null. */
function toInt(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n > INT32_MAX || n < INT32_MIN) return null;
  return n;
}

async function batchInsert(
  table: string,
  cols: string[],
  rows: any[],
  getValues: (row: any) => any[],
  batchSize = 50,
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholderRows: string[] = [];
    const params: any[] = [];

    for (const row of batch) {
      const vals = getValues(row);
      const start = params.length + 1;
      placeholderRows.push(`(${vals.map((_, j) => `$${start + j}`).join(", ")})`);
      params.push(...vals);
    }

    const q = `INSERT INTO ${table} (${cols.join(", ")}) VALUES ${placeholderRows.join(", ")} ON CONFLICT DO NOTHING`;
    await sql.query(q, params);
    process.stdout.write(`  ${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🚀 D1 → Neon migration starting…\n");

  // 1. Wipe existing Neon data (bad scraped data + any partials)
  console.log("🧹 Truncating Neon tables…");
  await sql`TRUNCATE TABLE job_skill_tags, jobs, ats_boards, ashby_boards, contact_emails, contacts, applications, user_settings, companies RESTART IDENTITY CASCADE`;
  console.log("  Done.\n");

  // 2. Companies (no FK deps)
  console.log("📦 companies");
  const d1Companies = await d1FetchAll("companies");
  console.log(`  ${d1Companies.length} rows from D1`);

  const companyCols = [
    "id", "key", "name", "logo_url", "website", "description", "industry",
    "size", "location", "canonical_domain", "category", "tags", "services",
    "service_taxonomy", "industries", "score", "score_reasons",
    "last_seen_crawl_id", "last_seen_capture_timestamp", "last_seen_source_url",
    "created_at", "updated_at", "ashby_industry_tags", "ashby_tech_signals",
    "ashby_size_signal", "ashby_enriched_at", "linkedin_url", "job_board_url",
    "ai_classification_reason", "ai_classification_confidence", "ai_tier",
    "deep_analysis", "email", "emails", "github_url",
  ];

  await batchInsert("companies", companyCols, d1Companies, (r) =>
    companyCols.map((c) => r[c] ?? null),
  );
  await sql`SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1))`;

  // 3. Ashby boards — schema mismatch, map explicitly
  console.log("\n📋 ashby_boards");
  const d1Ashby = await d1FetchAll("ashby_boards");
  console.log(`  ${d1Ashby.length} rows from D1`);

  const ashbyNeonCols = ["board_name", "discovered_at", "last_synced_at", "job_count", "is_active", "created_at", "updated_at"];
  await batchInsert("ashby_boards", ashbyNeonCols, d1Ashby, (r) => [
    r.slug,
    r.first_seen,
    r.last_synced_at,
    r.job_count,
    toBool(r.is_active),
    r.created_at,
    r.updated_at,
  ]);
  await sql`SELECT setval('ashby_boards_id_seq', COALESCE((SELECT MAX(id) FROM ashby_boards), 1))`;

  // 4. Jobs (depends on companies)
  console.log("\n💼 jobs");
  const d1Jobs = await d1FetchAll("jobs", 50); // smaller batch — large text fields
  console.log(`  ${d1Jobs.length} rows from D1`);

  const jobCols = [
    "id", "external_id", "source_id", "source_kind", "company_id", "company_key",
    "title", "location", "url", "description", "posted_at", "score", "score_reason",
    "status", "is_remote_eu", "remote_eu_confidence", "remote_eu_reason", "ats_data",
    "absolute_url", "internal_job_id", "requisition_id", "company_name",
    "first_published", "language", "metadata", "departments", "offices", "questions",
    "location_questions", "compliance", "demographic_questions", "data_compliance",
    "categories", "workplace_type", "country", "ats_created_at", "created_at", "updated_at",
    "ashby_department", "ashby_team", "ashby_employment_type",
    "ashby_is_remote", "ashby_is_listed", "ashby_published_at",
    "ashby_job_url", "ashby_apply_url", "ashby_secondary_locations",
    "ashby_compensation", "ashby_address",
    "role_ai_engineer", "role_confidence", "role_reason", "role_source",
    "report_reason", "report_confidence", "report_reasoning", "report_tags",
    "report_action", "report_trace_id", "report_reviewed_at",
    "salary_min", "salary_max", "salary_currency", "visa_sponsorship",
    "enrichment_status", "applied", "applied_at", "recruiter_id", "archived",
  ];
  const jobBools = new Set(["is_remote_eu", "role_ai_engineer", "ashby_is_remote", "ashby_is_listed", "applied", "archived", "visa_sponsorship"]);
  const jobInts = new Set(["id", "company_id", "internal_job_id", "salary_min", "salary_max", "recruiter_id"]);

  await batchInsert("jobs", jobCols, d1Jobs, (r) =>
    jobCols.map((c) => {
      if (jobBools.has(c)) return toBool(r[c]);
      if (jobInts.has(c)) return toInt(r[c]);
      return r[c] ?? null;
    }),
    25, // 25 rows per INSERT — jobs have large description fields
  );
  await sql`SELECT setval('jobs_id_seq', COALESCE((SELECT MAX(id) FROM jobs), 1))`;

  // 5. Job skill tags (depends on jobs)
  console.log("\n🏷️  job_skill_tags");
  const d1Skills = await d1FetchAll("job_skill_tags");
  console.log(`  ${d1Skills.length} rows from D1`);

  const skillCols = ["job_id", "tag", "level", "confidence", "evidence", "extracted_at", "version"];
  await batchInsert("job_skill_tags", skillCols, d1Skills, (r) =>
    skillCols.map((c) => r[c] ?? null),
  );

  // 6. Contacts
  console.log("\n👤 contacts");
  const d1Contacts = await d1FetchAll("contacts", 200);
  console.log(`  ${d1Contacts.length} rows from D1`);

  const contactCols = [
    "id", "first_name", "last_name", "linkedin_url", "email", "emails",
    "company", "company_id", "position", "user_id",
    "nb_status", "nb_result", "nb_flags", "nb_suggested_correction",
    "nb_retry_token", "nb_execution_time_ms",
    "email_verified", "bounced_emails", "github_handle", "telegram_handle",
    "do_not_contact", "tags", "created_at", "updated_at",
  ];
  const contactBools = new Set(["email_verified", "do_not_contact"]);
  const contactInts = new Set(["id", "company_id", "nb_execution_time_ms"]);

  await batchInsert("contacts", contactCols, d1Contacts, (r) =>
    contactCols.map((c) => {
      if (contactBools.has(c)) return toBool(r[c]);
      if (contactInts.has(c)) return toInt(r[c]);
      return r[c] ?? null;
    }),
  );
  await sql`SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id) FROM contacts), 1))`;

  // 7. Applications (skip D1-only AI columns not in Neon schema)
  console.log("\n📋 applications");
  const d1Apps = await d1FetchAll("applications");
  console.log(`  ${d1Apps.length} rows from D1`);

  const appCols = [
    "id", "user_email", "job_id", "resume_url", "questions", "status",
    "notes", "job_title", "company_name", "job_description", "created_at", "updated_at",
  ];
  await batchInsert("applications", appCols, d1Apps, (r) =>
    appCols.map((c) => r[c] ?? null),
  );
  await sql`SELECT setval('applications_id_seq', COALESCE((SELECT MAX(id) FROM applications), 1))`;

  // 8. User settings
  console.log("\n⚙️  user_settings");
  const d1UserSettings = await d1FetchAll("user_settings");
  console.log(`  ${d1UserSettings.length} rows from D1`);

  const userSettingsCols = [
    "id", "user_id", "email_notifications", "daily_digest", "new_job_alerts",
    "preferred_locations", "preferred_skills", "excluded_companies",
    "dark_mode", "jobs_per_page", "created_at", "updated_at",
  ];
  const userSettingsBools = new Set(["email_notifications", "daily_digest", "new_job_alerts", "dark_mode"]);
  const userSettingsInts = new Set(["id", "jobs_per_page"]);

  await batchInsert("user_settings", userSettingsCols, d1UserSettings, (r) =>
    userSettingsCols.map((c) => {
      if (userSettingsBools.has(c)) return toBool(r[c]);
      if (userSettingsInts.has(c)) return toInt(r[c]);
      return r[c] ?? null;
    }),
  );
  await sql`SELECT setval('user_settings_id_seq', COALESCE((SELECT MAX(id) FROM user_settings), 1))`;

  // 9. Final counts
  const [counts] = await sql`
    SELECT
      (SELECT COUNT(*) FROM companies)      AS companies,
      (SELECT COUNT(*) FROM ashby_boards)   AS ashby_boards,
      (SELECT COUNT(*) FROM jobs)           AS jobs,
      (SELECT COUNT(*) FROM job_skill_tags) AS job_skill_tags,
      (SELECT COUNT(*) FROM contacts)       AS contacts,
      (SELECT COUNT(*) FROM applications)   AS applications,
      (SELECT COUNT(*) FROM user_settings)  AS user_settings
  `;
  console.log("\n✅ Migration complete!");
  console.log("   companies:     ", counts.companies);
  console.log("   ashby_boards:  ", counts.ashby_boards);
  console.log("   jobs:          ", counts.jobs);
  console.log("   job_skill_tags:", counts.job_skill_tags);
  console.log("   contacts:      ", counts.contacts);
  console.log("   applications:  ", counts.applications);
  console.log("   user_settings: ", counts.user_settings);

  // Skipped (no Neon schema equivalent):
  //   greenhouse_boards (2724) — legacy, replaced by ats_boards (needs company_id + required fields)
  //   job_sources       (4005) — not in Neon schema
  //   study_topics      (96)   — not in Neon schema
  //   lever_boards      (1)    — legacy, replaced by ats_boards
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
