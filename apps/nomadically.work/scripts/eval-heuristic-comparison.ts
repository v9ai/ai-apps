#!/usr/bin/env tsx

/**
 * Heuristic vs LLM Comparison Evaluation
 *
 * Runs the rule-based heuristic classifier against all test cases
 * and reports accuracy. Optionally compares against LLM results
 * when DEEPSEEK_API_KEY is available.
 *
 * Usage:
 *   pnpm eval:heuristic
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: new URL("../.env.local", import.meta.url).pathname, override: true });

import {
  runHeuristicComparison,
  heuristicClassify,
} from "../src/evals/remote-eu/heuristic-comparison";
import { remoteEUTestCases } from "../src/evals/remote-eu/test-data";
import type { RemoteEUClassification } from "../src/evals/remote-eu/schema";
import type { RemoteEUTestCase } from "../src/evals/remote-eu/schema";

async function main() {
  console.log("Heuristic vs LLM Comparison Evaluation");
  console.log("========================================\n");

  // Build LLM classifier if API key is available
  let llmClassify:
    | ((posting: RemoteEUTestCase["jobPosting"]) => Promise<RemoteEUClassification>)
    | undefined;

  if (process.env.DEEPSEEK_API_KEY) {
    // Lazy import to avoid loading AI SDK when not needed
    const { deepseek } = await import("@ai-sdk/deepseek");
    const { generateObject } = await import("ai");
    const { z } = await import("zod");
    const { getPrompt, PROMPTS } = await import("../src/observability");

    const { text: promptText } = await getPrompt(PROMPTS.JOB_CLASSIFIER);

    const schema = z.object({
      isRemoteEU: z.boolean(),
      confidence: z.enum(["high", "medium", "low"]),
      reason: z.string(),
    });

    llmClassify = async (jobPosting) => {
      const result = await generateObject({
        model: deepseek("deepseek-chat"),
        system: promptText,
        prompt: `Job Title: ${jobPosting.title}
Location: ${jobPosting.location}
Description: ${jobPosting.description}
${jobPosting.country ? `Country Code: ${jobPosting.country}` : ""}
${jobPosting.workplace_type ? `Workplace Type: ${jobPosting.workplace_type}` : ""}
${jobPosting.is_remote !== undefined ? `Is Remote: ${jobPosting.is_remote}` : ""}

Classify this job posting.`,
        schema,
      });
      return result.object;
    };

    console.log("LLM classifier enabled (DeepSeek)\n");
  } else {
    console.log("DEEPSEEK_API_KEY not set — running heuristic-only mode\n");
  }

  console.log(`Running ${remoteEUTestCases.length} test cases...\n`);

  const result = await runHeuristicComparison(llmClassify);

  // --- Report ---
  console.log("\nRESULTS");
  console.log("=======\n");

  console.log(`Heuristic Accuracy: ${(result.heuristicAccuracy * 100).toFixed(1)}%`);
  if (llmClassify) {
    console.log(`LLM Accuracy:       ${(result.llmAccuracy * 100).toFixed(1)}%`);
    console.log(`Agreement:          ${(result.agreement * 100).toFixed(1)}%`);
  }

  // Heuristic failures
  const heuristicFailures = result.perCase.filter((r) => !r.heuristicCorrect);
  if (heuristicFailures.length > 0) {
    console.log(`\nHEURISTIC FAILURES (${heuristicFailures.length}):`);
    for (const f of heuristicFailures) {
      console.log(`  ${f.id}: ${f.description}`);
      console.log(
        `    Expected: ${f.expected.isRemoteEU ? "EU" : "Non-EU"} (${f.expected.confidence})`,
      );
      console.log(
        `    Got:      ${f.heuristic.isRemoteEU ? "EU" : "Non-EU"} (${f.heuristic.confidence}) — ${f.heuristic.reason}`,
      );
    }
  }

  // Disagreements (where heuristic and LLM differ)
  if (llmClassify) {
    const disagreements = result.perCase.filter((r) => !r.agree);
    if (disagreements.length > 0) {
      console.log(`\nDISAGREEMENTS (${disagreements.length}):`);
      for (const d of disagreements) {
        const hWin = d.heuristicCorrect && !d.llmCorrect;
        const lWin = !d.heuristicCorrect && d.llmCorrect;
        const winner = hWin ? "HEURISTIC" : lWin ? "LLM" : "BOTH WRONG";
        console.log(`  ${d.id}: ${d.description} [${winner}]`);
        console.log(
          `    Expected:  ${d.expected.isRemoteEU ? "EU" : "Non-EU"} (${d.expected.confidence})`,
        );
        console.log(
          `    Heuristic: ${d.heuristic.isRemoteEU ? "EU" : "Non-EU"} (${d.heuristic.confidence})`,
        );
        if (d.llm) {
          console.log(
            `    LLM:       ${d.llm.isRemoteEU ? "EU" : "Non-EU"} (${d.llm.confidence})`,
          );
        }
      }
    }
  }

  console.log("\nEvaluation complete!");
}

main().catch((error) => {
  console.error("Heuristic evaluation failed:", error);
  process.exit(1);
});
