#!/usr/bin/env tsx

/**
 * Remote EU Job Classification Evaluation with Langfuse Datasets
 *
 * Seeds test cases as dataset items, runs LLM classification,
 * links traces to a named dataset run for experiment tracking.
 *
 * Usage:
 *   pnpm eval:langfuse
 */

// Load .env.local with override=true so project keys take precedence over shell env
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: new URL("../.env.local", import.meta.url).pathname, override: true });

import { Langfuse } from "langfuse";
import { getPrompt, PROMPTS } from "../src/observability";
import { remoteEUTestCases } from "../src/evals/remote-eu/test-data";
import {
  scoreRemoteEUClassification,
  scoreConfidenceCalibration,
} from "../src/evals/remote-eu/scorers";
import { heuristicClassify } from "../src/evals/remote-eu/heuristic-comparison";
import type { RemoteEUClassification } from "../src/evals/remote-eu/schema";
import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import {
  ensureDataset,
  upsertDatasetItem,
  createDatasetRunItem,
} from "../src/langfuse/datasets";

const DATASET_NAME = "remote-eu-classification";

// Initialize Langfuse client — read directly from process.env (loaded via --env-file)
const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

// Remote EU classification schema
const remoteEUSchema = z.object({
  isRemoteEU: z.boolean().describe("Whether the job is a remote EU position"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the classification"),
  reason: z.string().describe("Explanation for the classification decision"),
});

interface EvaluationResult {
  testCaseId: string;
  description: string;
  score: number;
  isCorrect: boolean;
  confidenceMatch: boolean;
  expected: RemoteEUClassification;
  actual: RemoteEUClassification;
  traceUrl?: string;
}

/**
 * Sync all test cases from test-data.ts into the Langfuse dataset.
 */
async function seedDataset() {
  console.log(`Seeding dataset "${DATASET_NAME}" with ${remoteEUTestCases.length} items...`);

  await ensureDataset(DATASET_NAME, "Remote EU job classification test cases");

  await Promise.all(
    remoteEUTestCases.map((tc) =>
      upsertDatasetItem({
        datasetName: DATASET_NAME,
        id: tc.id,
        input: {
          jobPosting: tc.jobPosting,
          description: tc.description,
        },
        expectedOutput: tc.expectedClassification,
        metadata: { description: tc.description },
      }),
    ),
  );

  console.log("Dataset seeded.\n");
}

async function evaluateTestCase(
  testCase: (typeof remoteEUTestCases)[0],
  promptText: string,
  sessionId: string,
  runName: string,
): Promise<EvaluationResult> {
  console.log(`\nEvaluating: ${testCase.description}`);
  console.log(`   Location: ${testCase.jobPosting.location}`);
  console.log(`   Title: ${testCase.jobPosting.title}`);

  // Heuristic baseline for comparison
  const heuristicResult = heuristicClassify(testCase.jobPosting);

  const trace = langfuse.trace({
    name: "remote-eu-classification",
    sessionId,
    userId: "eval-script",
    tags: [
      `expected:${testCase.expectedClassification.isRemoteEU ? "eu" : "non-eu"}`,
      `confidence:${testCase.expectedClassification.confidence}`,
      testCase.jobPosting.country ? `country:${testCase.jobPosting.country}` : "country:none",
      testCase.jobPosting.is_remote ? "ats:remote" : "ats:unknown",
    ].filter(Boolean),
    metadata: {
      testCaseId: testCase.id,
      description: testCase.description,
      jobLocation: testCase.jobPosting.location,
      hasCountryCode: !!testCase.jobPosting.country,
      hasRemoteFlag: !!testCase.jobPosting.is_remote,
      runName,
    },
  });

  try {
    const generation = trace.generation({
      name: "classify-job",
      model: "deepseek-chat",
      input: {
        jobPosting: testCase.jobPosting,
        prompt: promptText,
      },
      metadata: {
        testCase: testCase.id,
      },
    });

    const result = await generateObject({
      model: deepseek("deepseek-chat"),
      system: promptText,
      prompt: `Job Title: ${testCase.jobPosting.title}
Location: ${testCase.jobPosting.location}
Description: ${testCase.jobPosting.description}

Classify this job posting.`,
      schema: remoteEUSchema,
      experimental_telemetry: {
        isEnabled: true,
        functionId: `remote-eu-classify-${testCase.id}`,
        metadata: {
          langfuseTraceId: trace.id,
          langfuseUpdateParent: false,
          sessionId,
          userId: "eval-script",
        },
      },
    });

    const actualClassification: RemoteEUClassification = result.object;

    generation.update({
      output: actualClassification,
      usage: {
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      },
    });

    const scoreResult = scoreRemoteEUClassification({
      jobPosting: testCase.jobPosting,
      expectedClassification: testCase.expectedClassification,
      actualClassification,
    });

    // --- Langfuse Scores: NUMERIC, BOOLEAN, CATEGORICAL ---

    // NUMERIC: composite accuracy score (0, 0.5, or 1.0)
    trace.score({
      name: "remote-eu-accuracy",
      value: scoreResult.score,
      comment: scoreResult.metadata.isCorrect
        ? "Correct classification"
        : `Incorrect: Expected ${scoreResult.metadata.expected.isRemoteEU}, got ${scoreResult.metadata.actual.isRemoteEU}`,
    });

    // BOOLEAN: was the classification correct?
    trace.score({
      name: "classification-correct",
      value: scoreResult.metadata.isCorrect ? 1 : 0,
      dataType: "BOOLEAN",
      comment: scoreResult.metadata.isCorrect ? "Match" : "Mismatch",
    });

    // BOOLEAN: did confidence level match?
    trace.score({
      name: "confidence-match",
      value: scoreResult.metadata.confidenceMatch ? 1 : 0,
      dataType: "BOOLEAN",
      comment: `Expected: ${scoreResult.metadata.expected.confidence}, Got: ${scoreResult.metadata.actual.confidence}`,
    });

    // CATEGORICAL: predicted confidence tier (for filtering in Langfuse UI)
    trace.score({
      name: "predicted-confidence",
      value: actualClassification.confidence as string,
      dataType: "CATEGORICAL" as const,
      comment: String(actualClassification.reason).slice(0, 200),
    });

    // CATEGORICAL: error type for failure analysis
    if (!scoreResult.metadata.isCorrect) {
      const errorType: string = scoreResult.metadata.expected.isRemoteEU
        ? "false-negative" // missed EU job
        : "false-positive"; // wrongly classified as EU
      trace.score({
        name: "error-type",
        value: errorType,
        dataType: "CATEGORICAL" as const,
        comment: `${errorType}: "${testCase.jobPosting.location}" — ${actualClassification.reason}`,
      });
    }

    // BOOLEAN: does the heuristic agree with the LLM?
    const heuristicAgrees = heuristicResult.isRemoteEU === actualClassification.isRemoteEU;
    trace.score({
      name: "heuristic-agrees",
      value: heuristicAgrees ? 1 : 0,
      dataType: "BOOLEAN",
      comment: `Heuristic: ${heuristicResult.isRemoteEU ? "EU" : "non-EU"} (${heuristicResult.confidence}), LLM: ${actualClassification.isRemoteEU ? "EU" : "non-EU"} (${actualClassification.confidence})`,
    });

    // BOOLEAN: is the heuristic correct? (baseline comparison)
    trace.score({
      name: "heuristic-correct",
      value: heuristicResult.isRemoteEU === testCase.expectedClassification.isRemoteEU ? 1 : 0,
      dataType: "BOOLEAN",
      comment: heuristicResult.reason,
    });

    generation.end();

    // Link this trace to the dataset run
    await createDatasetRunItem({
      datasetItemId: testCase.id,
      runName,
      traceId: trace.id,
    });

    console.log(
      `   Result: ${actualClassification.isRemoteEU ? "EU Remote" : "Non-EU"} (${actualClassification.confidence})`,
    );
    console.log(
      `   Expected: ${testCase.expectedClassification.isRemoteEU ? "EU Remote" : "Non-EU"} (${testCase.expectedClassification.confidence})`,
    );
    console.log(
      `   Score: ${scoreResult.score} ${scoreResult.metadata.isCorrect ? "PASS" : "FAIL"}`,
    );

    return {
      testCaseId: testCase.id,
      description: testCase.description,
      score: scoreResult.score,
      isCorrect: scoreResult.metadata.isCorrect,
      confidenceMatch: scoreResult.metadata.confidenceMatch,
      expected: testCase.expectedClassification,
      actual: actualClassification,
      traceUrl: trace.url,
    };
  } catch (error) {
    console.error(
      `   Error evaluating test case ${testCase.id}:`,
      error instanceof Error ? error.message : error,
    );

    trace.update({
      level: "ERROR",
      output: { error: error instanceof Error ? error.message : String(error) },
    });

    throw error;
  }
}

async function runEvaluation() {
  console.log("Remote EU Job Classification Evaluation");
  console.log("==========================================\n");

  // Seed dataset items
  await seedDataset();

  // Generate a named run for this experiment
  const runName = `run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}`;
  console.log(`Dataset run: ${runName}`);

  console.log("Fetching prompt from Langfuse...");
  const { text: promptText } = await getPrompt(PROMPTS.JOB_CLASSIFIER);
  console.log(`Using latest prompt version\n${promptText.substring(0, 100)}...\n`);

  const testCases = remoteEUTestCases;
  console.log(`Running ${testCases.length} test cases...`);

  const sessionId = `eval-${Date.now()}`;
  const results: EvaluationResult[] = [];

  for (const testCase of testCases) {
    try {
      const result = await evaluateTestCase(testCase, promptText, sessionId, runName);
      results.push(result);
    } catch (error) {
      console.error(`Failed to evaluate ${testCase.id}, skipping...`);
    }
  }

  // --- Compute calibration metrics ---
  const calibrationInput = results.map((r) => ({
    expected: r.expected,
    actual: r.actual,
  }));
  const calibration = scoreConfidenceCalibration(calibrationInput);

  // --- Create a session-level summary trace with aggregate scores ---
  const summaryTrace = langfuse.trace({
    name: "eval-run-summary",
    sessionId,
    userId: "eval-script",
    tags: ["eval-summary", `run:${runName}`],
    metadata: {
      runName,
      totalCases: results.length,
      model: "deepseek-chat",
      promptName: PROMPTS.JOB_CLASSIFIER.name,
    },
  });

  const correctClassifications = results.filter((r) => r.isCorrect).length;
  const accuracy = (correctClassifications / results.length) * 100;
  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const confidenceMatches = results.filter((r) => r.confidenceMatch).length;
  const confidenceAccuracy = (confidenceMatches / results.length) * 100;

  // Heuristic baseline accuracy
  const heuristicCorrect = results.filter((r) => {
    const h = heuristicClassify(
      remoteEUTestCases.find((tc) => tc.id === r.testCaseId)!.jobPosting,
    );
    return h.isRemoteEU === r.expected.isRemoteEU;
  }).length;
  const heuristicAccuracy = (heuristicCorrect / results.length) * 100;

  // NUMERIC scores on summary trace for run-level dashboard
  summaryTrace.score({ name: "run-accuracy", value: accuracy / 100 });
  summaryTrace.score({ name: "run-avg-score", value: avgScore });
  summaryTrace.score({ name: "run-confidence-accuracy", value: confidenceAccuracy / 100 });
  summaryTrace.score({ name: "run-ece", value: calibration.ece, comment: "Expected Calibration Error — lower is better" });
  summaryTrace.score({ name: "run-heuristic-accuracy", value: heuristicAccuracy / 100, comment: "Baseline heuristic accuracy" });
  summaryTrace.score({
    name: "run-llm-vs-heuristic-delta",
    value: (accuracy - heuristicAccuracy) / 100,
    comment: `LLM ${accuracy > heuristicAccuracy ? "beats" : "trails"} heuristic by ${Math.abs(accuracy - heuristicAccuracy).toFixed(1)}pp`,
  });

  // Per-tier calibration scores on summary trace
  for (const tier of ["high", "medium", "low"] as const) {
    const t = calibration.tiers[tier];
    if (t.count > 0) {
      summaryTrace.score({
        name: `calibration-${tier}-accuracy`,
        value: t.accuracy,
        comment: `${t.count} cases at ${tier} confidence`,
      });
    }
  }

  // False positive / false negative counts
  const falsePositives = results.filter((r) => !r.isCorrect && r.actual.isRemoteEU).length;
  const falseNegatives = results.filter((r) => !r.isCorrect && !r.actual.isRemoteEU).length;
  summaryTrace.score({ name: "false-positives", value: falsePositives, comment: "Wrongly classified as EU" });
  summaryTrace.score({ name: "false-negatives", value: falseNegatives, comment: "Missed EU jobs" });

  summaryTrace.update({
    output: {
      accuracy: accuracy / 100,
      avgScore,
      confidenceAccuracy: confidenceAccuracy / 100,
      ece: calibration.ece,
      heuristicAccuracy: heuristicAccuracy / 100,
      calibrationTiers: calibration.tiers,
      falsePositives,
      falseNegatives,
      totalCases: results.length,
    },
  });

  console.log("\nSending traces to Langfuse...");
  await langfuse.flushAsync();

  console.log("\n\nEVALUATION SUMMARY");
  console.log("=====================\n");

  console.log(`Total Test Cases: ${results.length}`);
  console.log(
    `Correct Classifications: ${correctClassifications}/${results.length}`,
  );
  console.log(`LLM Accuracy: ${accuracy.toFixed(1)}%`);
  console.log(`Heuristic Accuracy: ${heuristicAccuracy.toFixed(1)}%`);
  console.log(`LLM vs Heuristic Delta: ${(accuracy - heuristicAccuracy).toFixed(1)}pp`);
  console.log(`Average Score: ${avgScore.toFixed(2)}`);
  console.log(
    `Confidence Match: ${confidenceMatches}/${results.length} (${confidenceAccuracy.toFixed(1)}%)`,
  );
  console.log(`\nCalibration (ECE): ${calibration.ece.toFixed(4)} (lower is better)`);
  console.log(`  High confidence: ${(calibration.tiers.high.accuracy * 100).toFixed(1)}% accuracy (${calibration.tiers.high.count} cases, expected ~90%)`);
  console.log(`  Medium confidence: ${(calibration.tiers.medium.accuracy * 100).toFixed(1)}% accuracy (${calibration.tiers.medium.count} cases, expected ~60%)`);
  console.log(`  Low confidence: ${(calibration.tiers.low.accuracy * 100).toFixed(1)}% accuracy (${calibration.tiers.low.count} cases, expected ~30%)`);
  console.log(`\nError Analysis:`);
  console.log(`  False positives: ${falsePositives} (wrongly classified as EU)`);
  console.log(`  False negatives: ${falseNegatives} (missed EU jobs)`);
  console.log(`\nDataset: ${DATASET_NAME}`);
  console.log(`Run: ${runName}`);

  const failures = results.filter((r) => !r.isCorrect);
  if (failures.length > 0) {
    console.log("\nFAILED CLASSIFICATIONS:");
    failures.forEach((f) => {
      const errorType = f.expected.isRemoteEU ? "FALSE-NEG" : "FALSE-POS";
      console.log(`\n  [${errorType}] ${f.testCaseId}: ${f.description}`);
      console.log(
        `    Expected: ${f.expected.isRemoteEU ? "EU Remote" : "Non-EU"} (${f.expected.confidence})`,
      );
      console.log(
        `    Got: ${f.actual.isRemoteEU ? "EU Remote" : "Non-EU"} (${f.actual.confidence})`,
      );
      console.log(`    Expected Reason: ${f.expected.reason}`);
      console.log(`    Actual Reason: ${f.actual.reason}`);
    });
  }

  console.log("\nEvaluation complete!");

  if (accuracy < 80) {
    console.log("\nWarning: Accuracy below 80% threshold");
    process.exit(1);
  }
}

runEvaluation().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});
