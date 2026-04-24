// One-shot competitor scraper for analyses 2/3/4 (Team D).
// Runs `runCompetitorScrape` for all approved/failed competitors, then reconciles
// the competitor_analyses status. Concurrency = 3 to keep DeepSeek happy.
//
// Usage (from apps/lead-gen):
//   pnpm tsx scripts/teamd-scrape-competitors.ts
//
// Safe to delete after the run completes — it's a one-shot.

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, inArray } from "drizzle-orm";
import { competitorAnalyses, competitors } from "../src/db/schema";
import { db } from "../src/db";
import { runCompetitorScrape } from "../src/lib/competitors/run";

const ANALYSIS_IDS = [2, 3, 4];
const CONCURRENCY = 3;

async function processInBatches<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += n) {
    const slice = items.slice(i, i + n);
    await Promise.all(slice.map(fn));
  }
}

async function main() {
  const rows = await db
    .select()
    .from(competitors)
    .where(inArray(competitors.analysis_id, ANALYSIS_IDS));
  const targets = rows.filter((r) => r.status === "approved" || r.status === "failed");
  console.log(
    `[teamd-scrape] ${targets.length} competitors to scrape across analyses ${ANALYSIS_IDS.join(", ")}`,
  );

  await processInBatches(targets, CONCURRENCY, async (row) => {
    const t0 = Date.now();
    try {
      await runCompetitorScrape(row.id);
      console.log(
        `[teamd-scrape] OK competitor=${row.id} (${row.name}) in ${Math.round((Date.now() - t0) / 1000)}s`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[teamd-scrape] FAIL competitor=${row.id} (${row.name}): ${msg}`);
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
