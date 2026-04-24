// One-shot competitor scraper for analyses 2/3/4 (Team D).
// Worker-pool pattern: 3 concurrent workers each pull from a shared queue, so
// one slow scrape doesn't block the others. Per-scrape timeout = 90s (covers
// 3 page loads + DeepSeek extract on a normal site, fails fast otherwise).
//
// Usage (from apps/lead-gen):
//   pnpm tsx --env-file=.env.local scripts/teamd-scrape-competitors.ts
//
// Safe to delete after the run completes — it's a one-shot.

import { eq, inArray } from "drizzle-orm";
import { competitorAnalyses, competitors } from "../src/db/schema";
import { db } from "../src/db";
import { runCompetitorScrape } from "../src/lib/competitors/run";

const ANALYSIS_IDS = [2, 3, 4];
const CONCURRENCY = 3;
const PER_SCRAPE_TIMEOUT_MS = 90_000;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

async function workerPool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: n }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) break;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const rows = await db
    .select()
    .from(competitors)
    .where(inArray(competitors.analysis_id, ANALYSIS_IDS));
  const targets = rows.filter((r) => r.status === "approved" || r.status === "failed");
  console.log(
    `[teamd-scrape] ${targets.length} competitors to scrape across analyses ${ANALYSIS_IDS.join(", ")} (concurrency=${CONCURRENCY}, per-scrape timeout=${PER_SCRAPE_TIMEOUT_MS / 1000}s)`,
  );

  await workerPool(targets, CONCURRENCY, async (row) => {
    const t0 = Date.now();
    try {
      await withTimeout(runCompetitorScrape(row.id), PER_SCRAPE_TIMEOUT_MS);
      console.log(
        `[teamd-scrape] OK competitor=${row.id} (${row.name}) in ${Math.round((Date.now() - t0) / 1000)}s`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[teamd-scrape] FAIL competitor=${row.id} (${row.name}) after ${Math.round((Date.now() - t0) / 1000)}s: ${msg}`,
      );
      // Make sure DB row reflects the timeout so the analysis status query is correct.
      try {
        await db
          .update(competitors)
          .set({ status: "failed", scrape_error: msg.slice(0, 500), updated_at: new Date().toISOString() })
          .where(eq(competitors.id, row.id));
      } catch {
        // best-effort
      }
    }
  });

  for (const aid of ANALYSIS_IDS) {
    const final = await db.select().from(competitors).where(eq(competitors.analysis_id, aid));
    const anyFailed = final.some((r) => r.status === "failed");
    const allDone = final.every((r) => r.status === "done" || r.status === "failed");
    const newStatus = allDone
      ? anyFailed && final.every((r) => r.status === "failed")
        ? "failed"
        : "done"
      : "scraping";
    await db
      .update(competitorAnalyses)
      .set({ status: newStatus, updated_at: new Date().toISOString() })
      .where(eq(competitorAnalyses.id, aid));
    console.log(
      `[teamd-scrape] analysis ${aid} -> ${newStatus} (done=${final.filter((r) => r.status === "done").length} failed=${final.filter((r) => r.status === "failed").length})`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[teamd-scrape] fatal", err);
    process.exit(1);
  });
