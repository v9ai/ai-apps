#!/usr/bin/env npx tsx
/**
 * One-shot data fix: re-resolve `openalex_profile.institution` for the cohort
 * of papers-tagged contacts whose existing profiles were written before
 * Expert 1's plural-field fix landed in
 * `backend/leadgen_agent/contact_enrich_paper_author_graph.py`.
 *
 * Background: OpenAlex deprecated `last_known_institution` (singular) in favor
 * of `last_known_institutions` (plural array). Earlier author resolutions
 * persisted empty institution strings because they read the now-null singular
 * field. Expert 1 patched the graph to read the plural field, but the fix only
 * applies to NEW resolutions — `resolve_openalex_author` early-returns for any
 * contact whose profile already has `openalex_id`. This script bypasses that
 * early-return for the 137 already-resolved-but-empty-institution rows by
 * calling OpenAlex directly with the saved `openalex_id` and patching the
 * jsonb in place.
 *
 * Usage:
 *   pnpm tsx scripts/reresolve-openalex-institutions.ts --dry-run
 *   pnpm tsx scripts/reresolve-openalex-institutions.ts
 *
 * Safety:
 *   - Every UPDATE is triple-guarded:
 *       WHERE id = ?
 *         AND tags::jsonb @> '["papers"]'::jsonb
 *         AND openalex_profile IS NOT NULL
 *   - Throttled to <=10 req/sec (OpenAlex polite-pool limit).
 *   - Identifies via `mailto=nicolai.vadim@gmail.com`.
 *   - Backs off on HTTP 429; aborts after 5 consecutive failures.
 *   - Does NOT touch `papers`, `paper_classifications`, `to_be_deleted`,
 *     `tags`, or `companies`. Only patches `openalex_profile` jsonb.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

// ── CLI flags ────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

// ── Constants ────────────────────────────────────────────────────────────

const MAILTO = "nicolai.vadim@gmail.com";
const REQ_INTERVAL_MS = 110; // ~9 req/sec — under OpenAlex's 10/sec ceiling.
const MAX_CONSECUTIVE_FAILURES = 5;

// ── Types ────────────────────────────────────────────────────────────────

interface ExistingProfile {
  openalex_id?: string;
  orcid?: string;
  display_name?: string;
  institution?: string;
  institution_country?: string;
  institution_id?: string;
  institution_ror?: string;
  works_count?: number;
  cited_by_count?: number;
  h_index?: number;
  i10_index?: number;
  topics?: string[];
  match_confidence?: number;
  resolved_at?: string;
  [k: string]: unknown;
}

interface OpenAlexInstitution {
  id?: string;
  display_name?: string;
  country_code?: string;
  ror?: string;
}

interface OpenAlexAuthor {
  id?: string;
  display_name?: string;
  last_known_institutions?: OpenAlexInstitution[];
  last_known_institution?: OpenAlexInstitution | null;
  affiliations?: Array<{ institution?: OpenAlexInstitution }>;
}

interface ContactRow {
  id: number;
  first_name: string | null;
  last_name: string | null;
  existing: ExistingProfile;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function pickInstitution(author: OpenAlexAuthor): OpenAlexInstitution | null {
  if (Array.isArray(author.last_known_institutions)) {
    for (const item of author.last_known_institutions) {
      if (item && item.display_name) return item;
    }
  }
  if (
    author.last_known_institution &&
    author.last_known_institution.display_name
  ) {
    return author.last_known_institution;
  }
  if (Array.isArray(author.affiliations)) {
    for (const aff of author.affiliations) {
      if (aff?.institution?.display_name) return aff.institution;
    }
  }
  return null;
}

async function fetchAuthor(
  openalexId: string,
): Promise<{ ok: true; author: OpenAlexAuthor } | { ok: false; status: number }> {
  const url = `https://api.openalex.org/authors/${encodeURIComponent(openalexId)}?mailto=${encodeURIComponent(MAILTO)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": `lead-gen-reresolve/1.0 (mailto:${MAILTO})` },
  });
  if (!res.ok) return { ok: false, status: res.status };
  const author = (await res.json()) as OpenAlexAuthor;
  return { ok: true, author };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const dsn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!dsn) {
    console.error("NEON_DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const sql = neon(dsn);

  console.log(
    `[reresolve-openalex-institutions] mode=${DRY_RUN ? "DRY-RUN" : "LIVE"}`,
  );

  const rows = (await sql`
    SELECT id, first_name, last_name, openalex_profile AS existing
    FROM contacts
    WHERE tags::jsonb @> '["papers"]'::jsonb
      AND openalex_profile IS NOT NULL
      AND COALESCE(openalex_profile->>'institution', '') = ''
      AND COALESCE(openalex_profile->>'openalex_id', '') <> ''
    ORDER BY id
  `) as unknown as ContactRow[];

  console.log(`Found ${rows.length} contacts to re-resolve.`);

  let apiHits = 0;
  let updated = 0;
  let withInstitution = 0;
  let withRor = 0;
  let stillEmpty = 0;
  let failures = 0;
  let consecutiveFailures = 0;

  const dryRunSamples: string[] = [];
  const institutionCounts = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const existing = row.existing || {};
    const openalexId = existing.openalex_id || "";
    if (!openalexId) {
      stillEmpty++;
      continue;
    }

    // Throttle. (Don't sleep before the very first request.)
    if (apiHits > 0) await sleep(REQ_INTERVAL_MS);

    let result = await fetchAuthor(openalexId);
    apiHits++;

    // 429 backoff: wait 5s and retry once.
    if (!result.ok && result.status === 429) {
      console.warn(`[${row.id}] 429 rate-limited, backing off 5s…`);
      await sleep(5000);
      result = await fetchAuthor(openalexId);
      apiHits++;
    }

    if (!result.ok) {
      failures++;
      consecutiveFailures++;
      console.warn(
        `[${row.id}] HTTP ${result.status} for openalex_id=${openalexId}`,
      );
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(
          `Aborting: ${MAX_CONSECUTIVE_FAILURES} consecutive failures.`,
        );
        break;
      }
      continue;
    }
    consecutiveFailures = 0;

    const inst = pickInstitution(result.author);
    const displayName = result.author.display_name || existing.display_name || "";
    const institution = inst?.display_name || "";
    const institutionCountry = inst?.country_code || "";
    const institutionId = inst?.id || "";
    const institutionRor = inst?.ror || "";

    const patched: ExistingProfile = {
      ...existing,
      display_name: displayName,
      institution,
      institution_country: institutionCountry,
      institution_id: institutionId,
      institution_ror: institutionRor,
      resolved_at: new Date().toISOString(),
    };

    if (institution) {
      withInstitution++;
      if (institutionRor) withRor++;
      institutionCounts.set(
        institution,
        (institutionCounts.get(institution) || 0) + 1,
      );
    } else {
      stillEmpty++;
    }

    const logLine = `[${row.id}] ${displayName} -> ${institution || "(none)"}`;

    if (DRY_RUN) {
      if (dryRunSamples.length < 5) dryRunSamples.push(logLine);
      // Stop early in dry-run: we only need a sample of 5 patches.
      if (dryRunSamples.length >= 5) {
        console.log("Dry-run sample (first 5):");
        for (const line of dryRunSamples) console.log("  " + line);
        console.log(`API hits so far: ${apiHits}. Stopping dry-run early.`);
        return;
      }
      continue;
    }

    // Triple-guarded UPDATE.
    const upd = await sql`
      UPDATE contacts
      SET openalex_profile = ${JSON.stringify(patched)}::jsonb,
          updated_at = NOW()::text
      WHERE id = ${row.id}
        AND tags::jsonb @> '["papers"]'::jsonb
        AND openalex_profile IS NOT NULL
    `;
    void upd;
    updated++;
    console.log(logLine);
  }

  console.log("");
  console.log("─── Summary ───");
  console.log(`API hits:              ${apiHits}`);
  console.log(`Rows updated:          ${updated}`);
  console.log(`With institution:      ${withInstitution}`);
  console.log(`With ROR ID:           ${withRor}`);
  console.log(`Still empty after:     ${stillEmpty}`);
  console.log(`HTTP failures:         ${failures}`);

  if (institutionCounts.size > 0) {
    console.log("");
    console.log("Top 10 institutions:");
    const sorted = Array.from(institutionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [name, n] of sorted) {
      console.log(`  ${n.toString().padStart(3)}  ${name}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
