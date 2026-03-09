#!/usr/bin/env tsx

/**
 * A/B Prompt Evaluation Script
 *
 * Compares two prompt variants (prod-a vs prod-b) across all test cases.
 * Uses deterministic pickAbLabel for consistent assignment and
 * records all results in Langfuse for experiment tracking.
 *
 * Usage:
 *   pnpm eval:ab
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: new URL("../.env.local", import.meta.url).pathname, override: true });

import { Langfuse } from "langfuse";
import { remoteEUTestCases } from "../src/evals/remote-eu/test-data";
import {
  scoreRemoteEUClassification,
  scoreConfidenceCalibration,
} from "../src/evals/remote-eu/scorers";
import type { RemoteEUClassification } from "../src/evals/remote-eu/schema";
import { pickAbLabel, fetchLangfusePrompt } from "../src/langfuse";
import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";

const PROMPT_NAME = "job-classifier";
const LABEL_A = "prod-a";
const LABEL_B = "prod-b";

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

const remoteEUSchema = z.object({
  isRemoteEU: z.boolean().describe("Whether the job is a remote EU position"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the classification"),
  reason: z.string().describe("Explanation for the classification decision"),
});

// Rough token-based cost estimation (DeepSeek Chat pricing)
const COST_PER_1K_INPUT = 0.00014;
const COST_PER_1K_OUTPUT = 0.00028;

interface PromptRunResult {
  label: string;
  promptVersion: number;
  results: Array<{
    testCaseId: string;
    score: number;
    isCorrect: boolean;
    confidenceMatch: boolean;
    expected: RemoteEUClassification;
    actual: RemoteEUClassification;
    usage: { promptTokens: number; completionTokens: number };
  }>;
  accuracy: number;
  avgScore: number;
  costEstimate: number;
  calibration: ReturnType<typeof scoreConfidenceCalibration>;
}

async function classifyWithPrompt(
  promptText: string,
  label: string,
  sessionId: string,
): Promise<PromptRunResult["results"]> {
  const results: PromptRunResult["results"] = [];

  for (const tc of remoteEUTestCases) {
    const trace = langfuse.trace({
      name: "remote-eu-ab-eval",
      sessionId,
      metadata: {
        testCaseId: tc.id,
        promptLabel: label,
      },
      tags: ["ab-eval", label],
    });

    try {
      const generation = trace.generation({
        name: "classify-job",
        model: "deepseek-chat",
        input: { jobPosting: tc.jobPosting },
        metadata: { testCase: tc.id, promptLabel: label },
      });

      const result = await generateObject({
        model: deepseek("deepseek-chat"),
        system: promptText,
        prompt: `Job Title: ${tc.jobPosting.title}
Location: ${tc.jobPosting.location}
Description: ${tc.jobPosting.description}
${tc.jobPosting.country ? `Country Code: ${tc.jobPosting.country}` : ""}
${tc.jobPosting.workplace_type ? `Workplace Type: ${tc.jobPosting.workplace_type}` : ""}
${tc.jobPosting.is_remote !== undefined ? `Is Remote: ${tc.jobPosting.is_remote}` : ""}

Classify this job posting.`,
        schema: remoteEUSchema,
        experimental_telemetry: {
          isEnabled: true,
          functionId: `ab-eval-${label}-${tc.id}`,
          metadata: {
            langfuseTraceId: trace.id,
            langfuseUpdateParent: false,
            sessionId,
            userId: "eval-ab-script",
          },
        },
      });

      const actual: RemoteEUClassification = result.object;
      const usage = {
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
      };

      generation.update({
        output: actual,
        usage: {
          ...usage,
          totalTokens: usage.promptTokens + usage.completionTokens,
        },
      });

      const scoreResult = scoreRemoteEUClassification({
        jobPosting: tc.jobPosting,
        expectedClassification: tc.expectedClassification,
        actualClassification: actual,
      });

      trace.score({
        name: "ab-accuracy",
        value: scoreResult.score,
        comment: `${label}: ${scoreResult.metadata.isCorrect ? "correct" : "incorrect"}`,
      });

      generation.end();

      results.push({
        testCaseId: tc.id,
        score: scoreResult.score,
        isCorrect: scoreResult.metadata.isCorrect,
        confidenceMatch: scoreResult.metadata.confidenceMatch,
        expected: tc.expectedClassification,
        actual,
        usage,
      });
    } catch (error) {
      console.error(
        `  Error evaluating ${tc.id} with ${label}:`,
        error instanceof Error ? error.message : error,
      );
      trace.update({
        level: "ERROR",
        output: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  return results;
}

function summarize(
  label: string,
  promptVersion: number,
  results: PromptRunResult["results"],
): PromptRunResult {
  const total = results.length;
  const correct = results.filter((r) => r.isCorrect).length;
  const accuracy = total > 0 ? correct / total : 0;
  const avgScore =
    total > 0 ? results.reduce((s, r) => s + r.score, 0) / total : 0;

  const totalInputTokens = results.reduce((s, r) => s + r.usage.promptTokens, 0);
  const totalOutputTokens = results.reduce(
    (s, r) => s + r.usage.completionTokens,
    0,
  );
  const costEstimate =
    (totalInputTokens / 1000) * COST_PER_1K_INPUT +
    (totalOutputTokens / 1000) * COST_PER_1K_OUTPUT;

  const calibration = scoreConfidenceCalibration(
    results.map((r) => ({ expected: r.expected, actual: r.actual })),
  );

  return {
    label,
    promptVersion,
    results,
    accuracy,
    avgScore,
    costEstimate,
    calibration,
  };
}

async function main() {
  console.log("A/B Prompt Evaluation");
  console.log("======================\n");

  // Demonstrate pickAbLabel usage (here we just run both)
  const exampleLabel = await pickAbLabel({
    seed: "eval-session-demo",
    labelA: LABEL_A,
    labelB: LABEL_B,
  });
  console.log(`pickAbLabel demo (seed 'eval-session-demo'): ${exampleLabel}\n`);

  // Fetch both prompt variants
  console.log(`Fetching prompt "${PROMPT_NAME}" with label "${LABEL_A}"...`);
  let promptA;
  try {
    promptA = await fetchLangfusePrompt(PROMPT_NAME, { label: LABEL_A });
  } catch {
    console.error(
      `Failed to fetch prompt with label "${LABEL_A}". ` +
        `Ensure the prompt exists in Langfuse with this label.`,
    );
    process.exit(1);
  }

  console.log(`Fetching prompt "${PROMPT_NAME}" with label "${LABEL_B}"...`);
  let promptB;
  try {
    promptB = await fetchLangfusePrompt(PROMPT_NAME, { label: LABEL_B });
  } catch {
    console.error(
      `Failed to fetch prompt with label "${LABEL_B}". ` +
        `Ensure the prompt exists in Langfuse with this label.`,
    );
    process.exit(1);
  }

  const promptTextA =
    typeof promptA.prompt === "string" ? promptA.prompt : JSON.stringify(promptA.prompt);
  const promptTextB =
    typeof promptB.prompt === "string" ? promptB.prompt : JSON.stringify(promptB.prompt);

  console.log(`\nPrompt A (v${promptA.version}): ${promptTextA.substring(0, 80)}...`);
  console.log(`Prompt B (v${promptB.version}): ${promptTextB.substring(0, 80)}...\n`);

  const sessionId = `ab-eval-${Date.now()}`;
  const testCount = remoteEUTestCases.length;

  // --- Run variant A ---
  console.log(`\n--- Running ${LABEL_A} (${testCount} test cases) ---`);
  const resultsA = await classifyWithPrompt(promptTextA, LABEL_A, sessionId);
  const summaryA = summarize(LABEL_A, promptA.version, resultsA);

  // --- Run variant B ---
  console.log(`\n--- Running ${LABEL_B} (${testCount} test cases) ---`);
  const resultsB = await classifyWithPrompt(promptTextB, LABEL_B, sessionId);
  const summaryB = summarize(LABEL_B, promptB.version, resultsB);

  // Flush traces
  console.log("\nSending traces to Langfuse...");
  await langfuse.flushAsync();

  // --- Report ---
  console.log("\n\nA/B EVALUATION RESULTS");
  console.log("========================\n");

  const printSummary = (s: PromptRunResult) => {
    console.log(`  ${s.label} (v${s.promptVersion}):`);
    console.log(`    Accuracy:      ${(s.accuracy * 100).toFixed(1)}%`);
    console.log(`    Avg Score:     ${s.avgScore.toFixed(3)}`);
    console.log(`    Cost Estimate: $${s.costEstimate.toFixed(4)}`);
    console.log(`    ECE:           ${s.calibration.ece.toFixed(3)}`);
    console.log(
      `    Calibration:   high=${(s.calibration.tiers.high.accuracy * 100).toFixed(0)}% (n=${s.calibration.tiers.high.count}) ` +
        `med=${(s.calibration.tiers.medium.accuracy * 100).toFixed(0)}% (n=${s.calibration.tiers.medium.count}) ` +
        `low=${(s.calibration.tiers.low.accuracy * 100).toFixed(0)}% (n=${s.calibration.tiers.low.count})`,
    );
  };

  printSummary(summaryA);
  console.log();
  printSummary(summaryB);

  // --- Deltas ---
  console.log("\n  DELTAS (A - B):");
  const deltaAccuracy = summaryA.accuracy - summaryB.accuracy;
  const deltaScore = summaryA.avgScore - summaryB.avgScore;
  const deltaCost = summaryA.costEstimate - summaryB.costEstimate;
  const deltaECE = summaryA.calibration.ece - summaryB.calibration.ece;

  const sign = (n: number) => (n >= 0 ? "+" : "");
  console.log(`    Accuracy:  ${sign(deltaAccuracy)}${(deltaAccuracy * 100).toFixed(1)}pp`);
  console.log(`    Avg Score: ${sign(deltaScore)}${deltaScore.toFixed(3)}`);
  console.log(`    Cost:      ${sign(deltaCost)}$${deltaCost.toFixed(4)}`);
  console.log(`    ECE:       ${sign(deltaECE)}${deltaECE.toFixed(3)} (lower is better)`);

  // --- Disagreements ---
  const disagreements = summaryA.results.filter((a) => {
    const b = summaryB.results.find((r) => r.testCaseId === a.testCaseId);
    return b && a.isCorrect !== b.isCorrect;
  });

  if (disagreements.length > 0) {
    console.log(`\n  DISAGREEMENTS (${disagreements.length} cases where one is correct and the other is not):`);
    for (const a of disagreements) {
      const b = summaryB.results.find((r) => r.testCaseId === a.testCaseId)!;
      const winner = a.isCorrect ? LABEL_A : LABEL_B;
      console.log(`    ${a.testCaseId}: ${winner} correct`);
      console.log(`      Expected: ${a.expected.isRemoteEU ? "EU" : "Non-EU"} (${a.expected.confidence})`);
      console.log(`      A: ${a.actual.isRemoteEU ? "EU" : "Non-EU"} (${a.actual.confidence})`);
      console.log(`      B: ${b.actual.isRemoteEU ? "EU" : "Non-EU"} (${b.actual.confidence})`);
    }
  }

  // --- Recommendation ---
  console.log("\n  RECOMMENDATION:");
  if (Math.abs(deltaAccuracy) < 0.02) {
    console.log("    No significant accuracy difference. Consider other factors (cost, calibration).");
  } else if (deltaAccuracy > 0) {
    console.log(`    ${LABEL_A} is better by ${(deltaAccuracy * 100).toFixed(1)}pp accuracy.`);
  } else {
    console.log(`    ${LABEL_B} is better by ${(-deltaAccuracy * 100).toFixed(1)}pp accuracy.`);
  }

  console.log("\nA/B evaluation complete!");
}

main().catch((error) => {
  console.error("A/B evaluation failed:", error);
  process.exit(1);
});
