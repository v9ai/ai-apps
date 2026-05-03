// ── Remote-classifier post-insert hook ───────────────────────────────
//
// After each chrome-extension import batch lands in D1, this service runs
// the `remote_classify` langgraph against the freshly-inserted ids. The
// graph re-fetches each row from D1, applies the rule-based remote +
// fully-remote detectors, and writes back archived=1 for any row that is
// not fully remote (so they drop out of the /opportunities UI).
//
// Flow: extension save → POST {LANGGRAPH_URL}/runs/wait
//       → graph hits {edge}/api/jobs/d1/opportunities?ids=...
//       → graph hits {edge}/api/jobs/d1/opportunities/archive-bulk
//
// All errors are non-fatal. The import pipeline must never block on the
// classifier — failures log and return null so the orchestrator continues.

import { runGraph } from "./langgraph";

export interface ClassifyRemoteVerdict {
  total: number;
  fullyRemote: number;
  anyRemote: number;
  archivedCount: number;
}

export async function classifyRemoteForBatch(
  insertedIds: string[],
): Promise<ClassifyRemoteVerdict | null> {
  if (insertedIds.length === 0) return null;

  const result = await runGraph<{
    total?: number;
    fully_remote?: number;
    any_remote?: number;
    archived_count?: number;
  }>({
    assistantId: "remote_classify",
    input: { ids: insertedIds },
    // Per-batch runs are small (≤ 25 ids) and the graph is rule-based — no
    // LLM calls — so 30s is generous. Don't sit on the 90s default and stall
    // the import button if the CF backend is cold.
    timeoutMs: 30_000,
  });

  if (!result.ok || !result.output) {
    console.warn(
      `[ClassifyRemote] graph failed for ${insertedIds.length} ids: ${result.error ?? "unknown"}`,
    );
    return null;
  }

  const verdict: ClassifyRemoteVerdict = {
    total: numberOr(result.output.total, 0),
    fullyRemote: numberOr(result.output.fully_remote, 0),
    anyRemote: numberOr(result.output.any_remote, 0),
    archivedCount: numberOr(result.output.archived_count, 0),
  };

  console.log(
    `[ClassifyRemote] ids=${insertedIds.length} total=${verdict.total} fullyRemote=${verdict.fullyRemote} archived=${verdict.archivedCount}`,
  );
  return verdict;
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
