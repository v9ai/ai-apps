#!/usr/bin/env npx tsx
/**
 * For every contact tagged "papers" (imported by import-paper-authors.ts), run
 * the `contact_enrich` LangGraph on the Cloudflare Container backend to:
 *   1. Resolve a GitHub handle via the GitHub Search Users API
 *   2. Fetch academic papers (OpenAlex → Crossref → Semantic Scholar)
 *   3. Derive research tags
 * The graph persists papers, papers_enriched_at, tags, and github_handle to
 * Neon itself (see backend/leadgen_agent/contact_enrich_graph.py:_persist_*),
 * so this script only orchestrates — it does not write to the DB.
 *
 * Usage:
 *   pnpm tsx scripts/enrich-paper-contacts.ts                 # real run, only-missing
 *   pnpm tsx scripts/enrich-paper-contacts.ts --dry-run       # list pending, no graph calls
 *   pnpm tsx scripts/enrich-paper-contacts.ts --limit 10      # only first N pending
 *   pnpm tsx scripts/enrich-paper-contacts.ts --redo          # re-enrich everyone
 *
 * Default (only-missing): skip rows where both papers_enriched_at IS NOT NULL
 * AND github_handle IS NOT NULL. Either field missing triggers a re-run.
 *
 * Targets LANGGRAPH_URL from .env.local. Point it at the CF container
 * (e.g. https://lead-gen-langgraph.eeeew.workers.dev) for production runs.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");
const REDO = process.argv.includes("--redo");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();

const LANGGRAPH_URL = (process.env.LANGGRAPH_URL || "http://127.0.0.1:8002").replace(/\/$/, "");
const LANGGRAPH_AUTH_TOKEN = process.env.LANGGRAPH_AUTH_TOKEN;

interface ContactRow {
  id: number;
  first_name: string;
  last_name: string;
  github_handle: string | null;
  papers_enriched_at: string | null;
}

interface ContactEnrichResult {
  papers?: Array<{ title: string; year: number | null; source: string | null }>;
  tags?: string[];
  tags_added?: string[];
  enriched_at?: string;
  github_handle?: string;
  github_handle_source?: string;
  error?: string | null;
}

async function enrichContact(contactId: number): Promise<ContactEnrichResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (LANGGRAPH_AUTH_TOKEN) headers.Authorization = `Bearer ${LANGGRAPH_AUTH_TOKEN}`;

  const res = await fetch(`${LANGGRAPH_URL}/runs/wait`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      assistant_id: "contact_enrich",
      input: { contact_id: contactId },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`contact_enrich failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return (await res.json()) as ContactEnrichResult;
}

async function main() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL not set — check .env.local");
  const sql = neon(url);

  const rows = (await sql`
    SELECT id, first_name, last_name, github_handle, papers_enriched_at
    FROM contacts
    WHERE tags::jsonb @> '["papers"]'::jsonb
    ORDER BY id ASC
  `) as ContactRow[];
  console.log(`Fetched ${rows.length} contacts tagged "papers" from Neon`);

  const isDone = (r: ContactRow) =>
    r.papers_enriched_at != null && r.github_handle != null && r.github_handle !== "";
  const filtered = REDO ? rows : rows.filter((r) => !isDone(r));
  const pending = filtered.slice(0, Number.isFinite(LIMIT) ? LIMIT : filtered.length);
  const skipped = rows.length - filtered.length;
  console.log(
    `  → ${pending.length} to process, ${skipped} already enriched${REDO ? " (ignored via --redo)" : " (skipped)"}`,
  );
  console.log(`  → backend: ${LANGGRAPH_URL}${LANGGRAPH_AUTH_TOKEN ? " (bearer auth)" : ""}`);

  if (pending.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (DRY_RUN) {
    for (const c of pending) {
      const missing: string[] = [];
      if (!c.papers_enriched_at) missing.push("papers");
      if (!c.github_handle) missing.push("github");
      console.log(`  [${c.id}] ${c.first_name} ${c.last_name} — missing: ${missing.join(", ") || "(none, --redo)"}`);
    }
    console.log("");
    console.log(`Dry run — ${pending.length} contacts would be enriched. No graph calls made.`);
    return;
  }

  // Sanity-check backend reachability — best-effort, /ok may not exist on CF
  try {
    const ping = await fetch(`${LANGGRAPH_URL}/ok`, {
      signal: AbortSignal.timeout(5_000),
    }).catch(() => null);
    if (!ping || !ping.ok) {
      console.warn(`  (LangGraph ping to ${LANGGRAPH_URL}/ok did not respond 200 — will try anyway)`);
    }
  } catch {
    /* ignore */
  }

  let enriched = 0;
  let withGithub = 0;
  let withPapers = 0;
  let totalPapers = 0;
  let totalTagsAdded = 0;
  const errors: string[] = [];

  for (const contact of pending) {
    const label = `[${contact.id}] ${contact.first_name} ${contact.last_name}`;
    try {
      const t0 = Date.now();
      const result = await enrichContact(contact.id);
      const ms = Date.now() - t0;

      if (result.error) {
        errors.push(`${label}: ${result.error}`);
        console.log(`  ${label} — error: ${result.error}`);
        continue;
      }

      const papers = result.papers ?? [];
      const tagsAdded = result.tags_added ?? [];
      const gh = result.github_handle ?? "";
      const ghSrc = result.github_handle_source ?? "";

      if (gh) withGithub += 1;
      if (papers.length > 0) withPapers += 1;
      totalPapers += papers.length;
      totalTagsAdded += tagsAdded.length;
      enriched += 1;

      console.log(
        `  ${label} — ${papers.length} paper(s), +${tagsAdded.length} tag(s), github=${gh || "∅"}${
          ghSrc ? ` (${ghSrc})` : ""
        } [${ms}ms]`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${label}: ${msg}`);
      console.log(`  ${label} — FAIL: ${msg}`);
    }
  }

  console.log("");
  console.log(
    `Done. enriched=${enriched}/${pending.length} with-github=${withGithub} with-papers=${withPapers} total-papers=${totalPapers} tags-added=${totalTagsAdded} errors=${errors.length}`,
  );
  if (errors.length > 0) {
    console.log("");
    console.log("Errors:");
    for (const e of errors.slice(0, 20)) console.log(`  - ${e}`);
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
