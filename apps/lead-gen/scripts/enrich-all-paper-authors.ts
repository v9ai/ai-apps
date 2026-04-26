#!/usr/bin/env npx tsx
/**
 * Drain the entire papers-tagged unenriched cohort by calling the server-side
 * batch graph repeatedly until it reports `stop_reason: "drained"`.
 *
 * The batch graph (`leadgen_agent.contact_enrich_paper_author_graph:batch_graph`)
 * runs the full enrichment pipeline (load → resolve_openalex → synthesize →
 * resolve_github_handle (GraphQL) → enrich_github_profile (GraphQL) →
 * classify_affiliation → classify_buyer_fit → auto_flag_unreachable) for one
 * contact at a time, looping server-side within a single HTTP request until
 * either the cohort is drained or the wall-clock budget is hit. Each HTTP
 * call therefore burns one CF Container "request slot" but processes many
 * contacts — far cheaper than driving each contact from the client.
 *
 * Usage:
 *   pnpm tsx scripts/enrich-all-paper-authors.ts                      # drain everything
 *   pnpm tsx scripts/enrich-all-paper-authors.ts --dry-run            # just count remaining
 *   pnpm tsx scripts/enrich-all-paper-authors.ts --limit 50           # cap total contacts
 *   pnpm tsx scripts/enrich-all-paper-authors.ts --max-iters 3        # cap HTTP calls
 *   pnpm tsx scripts/enrich-all-paper-authors.ts --budget 480         # per-call seconds
 *   pnpm tsx scripts/enrich-all-paper-authors.ts --per-call-count 30  # cap per call
 *
 * Env:
 *   LANGGRAPH_URL          (default http://127.0.0.1:8002)
 *   LANGGRAPH_AUTH_TOKEN   (optional bearer for the CF Container deploy)
 *   NEON_DATABASE_URL      (read-only progress count; falls back gracefully)
 *
 * Sequential by design. Per the project's runtime contract for `langgraph
 * dev` on :8002 (single worker + queue), parallel calls poison the queue on
 * dropped curls — issuing one batch call at a time is the only safe pattern.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");

function intArg(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  const v = parseInt(process.argv[i + 1] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
}

const LIMIT = intArg("--limit", 0); // 0 = no cap
const MAX_ITERS = intArg("--max-iters", 100);
const BUDGET_S = intArg("--budget", 480); // 8 min per call (leaves 2 min HTTP headroom)
const PER_CALL_COUNT = intArg("--per-call-count", 0); // 0 = no per-call cap

const LANGGRAPH_URL = (
  process.env.LANGGRAPH_URL || "http://127.0.0.1:8002"
).replace(/\/$/, "");
const LANGGRAPH_AUTH_TOKEN = process.env.LANGGRAPH_AUTH_TOKEN;

interface BatchResult {
  enriched_at?: string;
  enriched?: Array<{
    id: number;
    name: string;
    resolve_source: string;
    openalex_id: string;
    display_name: string;
    institution: string;
    h_index: number;
    match_confidence: number;
    affiliation_type: string;
    buyer_verdict: string;
    auto_flagged_for_deletion: boolean;
    github_login: string;
    github_handle_status: string;
    github_profile_status: string;
    enrichers_completed: string[];
  }>;
  counts?: { openalex: number; existing: number; no_match: number; load_error: number };
  total?: number;
  stop_reason?: string;
  elapsed_s?: number;
}

async function callBatch(
  iteration: number,
  remainingCap: number | null,
): Promise<BatchResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (LANGGRAPH_AUTH_TOKEN) headers.Authorization = `Bearer ${LANGGRAPH_AUTH_TOKEN}`;

  const input: Record<string, number> = { deadline_seconds: BUDGET_S };
  if (PER_CALL_COUNT > 0) input.count = PER_CALL_COUNT;
  if (remainingCap !== null && (input.count === undefined || input.count > remainingCap)) {
    input.count = remainingCap;
  }

  const body = JSON.stringify({
    assistant_id: "contact_enrich_paper_authors_batch",
    input,
  });
  // Wall-clock budget is server-side; client timeout adds 60s headroom for
  // synth/persist + HTTP framing on the way back.
  const timeoutMs = (BUDGET_S + 60) * 1000;

  const t0 = Date.now();
  const res = await fetch(`${LANGGRAPH_URL}/runs/wait`, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`/runs/wait ${res.status}: ${text.slice(0, 240)}`);
  }
  const elapsedMs = Date.now() - t0;
  const result = (await res.json()) as BatchResult;
  console.log(
    `[iter ${iteration}] total=${result.total ?? 0} ` +
      `openalex=${result.counts?.openalex ?? 0} ` +
      `existing=${result.counts?.existing ?? 0} ` +
      `no_match=${result.counts?.no_match ?? 0} ` +
      `load_error=${result.counts?.load_error ?? 0} ` +
      `stop=${result.stop_reason ?? "?"} ` +
      `server=${result.elapsed_s ?? "?"}s ` +
      `client=${(elapsedMs / 1000).toFixed(1)}s`,
  );
  return result;
}

async function countPending(): Promise<number | null> {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) return null;
  try {
    const sql = neon(url);
    // The batch graph's load_contact picks rows with tags ILIKE '%"papers"%'
    // AND openalex_profile IS NULL. Mirror that here for accurate progress.
    const rows = (await sql`
      SELECT COUNT(*)::int AS n
      FROM contacts
      WHERE tags ILIKE ${'%"papers"%'}
        AND openalex_profile IS NULL
    `) as Array<{ n: number }>;
    return rows[0]?.n ?? 0;
  } catch (err) {
    console.warn(
      `(could not count pending: ${err instanceof Error ? err.message : err})`,
    );
    return null;
  }
}

async function main(): Promise<void> {
  console.log(`backend: ${LANGGRAPH_URL}${LANGGRAPH_AUTH_TOKEN ? " (bearer auth)" : ""}`);
  console.log(
    `config: budget=${BUDGET_S}s/call max-iters=${MAX_ITERS}` +
      (LIMIT > 0 ? ` total-limit=${LIMIT}` : "") +
      (PER_CALL_COUNT > 0 ? ` per-call-count=${PER_CALL_COUNT}` : ""),
  );

  const pending = await countPending();
  if (pending !== null) {
    console.log(`pending: ${pending} contacts tagged "papers" with NULL openalex_profile`);
  }

  if (DRY_RUN) {
    console.log("Dry run — no graph calls made.");
    return;
  }
  if (pending === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Aggregate counters across iterations.
  const totals = { openalex: 0, existing: 0, no_match: 0, load_error: 0 };
  let processed = 0;
  let drained = false;
  let lastStop = "";

  for (let iter = 1; iter <= MAX_ITERS; iter += 1) {
    const remainingCap =
      LIMIT > 0 ? Math.max(0, LIMIT - processed) : null;
    if (remainingCap === 0) {
      console.log(`[iter ${iter}] hit --limit=${LIMIT}, stopping`);
      lastStop = "client_limit_reached";
      break;
    }

    let result: BatchResult;
    try {
      result = await callBatch(iter, remainingCap);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[iter ${iter}] FAILED: ${msg}`);
      lastStop = `client_error:${msg.slice(0, 80)}`;
      break;
    }

    processed += result.total ?? 0;
    totals.openalex += result.counts?.openalex ?? 0;
    totals.existing += result.counts?.existing ?? 0;
    totals.no_match += result.counts?.no_match ?? 0;
    totals.load_error += result.counts?.load_error ?? 0;
    lastStop = result.stop_reason ?? "?";

    if (result.stop_reason === "drained") {
      drained = true;
      break;
    }
    // Defensive: if a load_error stop_reason came back, surface and stop —
    // a stable DB error will only repeat on the next call.
    if (result.stop_reason && result.stop_reason.startsWith("load_error:")) {
      console.error(`[iter ${iter}] aborting — server reported ${result.stop_reason}`);
      break;
    }
    // budget_exhausted / count_reached → loop and call again.
  }

  console.log("");
  console.log(
    `done. processed=${processed} ` +
      `openalex=${totals.openalex} existing=${totals.existing} ` +
      `no_match=${totals.no_match} load_error=${totals.load_error} ` +
      `last_stop=${lastStop} drained=${drained}`,
  );

  if (!drained) {
    const post = await countPending();
    if (post !== null) {
      console.log(`pending after run: ${post}`);
    }
    process.exit(2);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
