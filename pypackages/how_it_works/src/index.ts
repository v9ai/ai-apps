#!/usr/bin/env node
import "dotenv/config";
/**
 * How It Works Pipeline
 *
 * Scans all Next.js apps in ../apps/, performs a deep technical analysis
 * with DeepSeek, and writes (or updates) the how-it-works page in each app
 * using the @ai-apps/ui/how-it-works component.
 *
 * Usage:
 *   pnpm how-it-works              # process all apps
 *   pnpm how-it-works:dry          # dry run (no file writes)
 *   pnpm how-it-works -- --app lead-gen   # single app
 *   pnpm how-it-works -- --verbose  # show full analysis output
 */

import { buildHowItWorksGraph } from "./graphs/how-it-works/graph.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose") || args.includes("-v");
const appIdx = args.indexOf("--app");
const filterApp = appIdx !== -1 ? args[appIdx + 1] : null;

async function main() {
  const banner = "━".repeat(58);
  console.log(`\n${banner}`);
  console.log("  How It Works Pipeline");
  console.log(banner);
  if (dryRun) console.log("  Mode: DRY RUN");
  if (filterApp) console.log(`  Filter: ${filterApp}`);
  console.log();

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("Error: DEEPSEEK_API_KEY not set.");
    console.error("Create a .env file with:  DEEPSEEK_API_KEY=sk-...");
    process.exit(1);
  }

  const graph = buildHowItWorksGraph();

  const result = await graph.invoke(
    {
      pendingApps: [],
      currentApp: null,
      currentFiles: [],
      currentAnalysis: "",
      currentData: null,
      results: [],
      dryRun,
      verbose,
      filterApp: filterApp ?? null,
    },
    { recursionLimit: 200 }
  );

  // ─── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n${banner}`);
  console.log("  Summary");
  console.log(banner);

  for (const r of result.results) {
    const icon = r.status === "error" ? "✗" : r.status === "updated" ? "↺" : "✓";
    console.log(`  ${icon}  ${r.appName.padEnd(28)} ${r.status}`);
    if (r.error) console.log(`       Error: ${r.error}`);
  }

  const written = result.results.filter((r) => r.status === "written").length;
  const updated = result.results.filter((r) => r.status === "updated").length;
  const errors = result.results.filter((r) => r.status === "error").length;

  console.log(`\n  ${written} written  ·  ${updated} updated  ·  ${errors} errors`);

  if (written > 0 || updated > 0) {
    console.log(`\n  Next steps:`);
    console.log(`    pnpm install          # link any newly added @ai-apps/ui deps`);
    console.log(`    pnpm build            # verify the generated pages compile`);
  }

  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
