#!/usr/bin/env tsx

/**
 * Batch Email Quality Evaluation with Langfuse Datasets
 *
 * Seeds test cases as dataset items, generates emails via DeepSeek Reasoner,
 * scores quality, and links traces to a named dataset run.
 *
 * Usage:
 *   pnpm eval:batch-email
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({
  path: new URL("../.env.local", import.meta.url).pathname,
  override: true,
});

import { Langfuse } from "langfuse";
import OpenAI from "openai";
import { emailQualityTestCases } from "../src/evals/batch-email/test-data";
import { scoreEmailQuality } from "../src/evals/batch-email/scorers";
import type {
  EmailQualityTestCase,
  EmailQualityScore,
} from "../src/evals/batch-email/schema";
import {
  buildBatchPrompt,
  parseJsonContent,
} from "../src/app/api/emails/generate-batch/route";
import type { GenerateBatchEmailResponse } from "../src/app/api/emails/generate-batch/route";
import {
  ensureDataset,
  upsertDatasetItem,
  createDatasetRunItem,
} from "../src/langfuse/datasets";

const DATASET_NAME = "batch-email-quality";

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

interface EvaluationResult {
  testCaseId: string;
  description: string;
  qualityScore: EmailQualityScore;
  parsed: GenerateBatchEmailResponse | null;
  traceUrl?: string;
}

/**
 * Seed all test cases into the Langfuse dataset.
 */
async function seedDataset() {
  console.log(
    `Seeding dataset "${DATASET_NAME}" with ${emailQualityTestCases.length} items...`,
  );

  await ensureDataset(DATASET_NAME, "Batch email quality test cases");

  await Promise.all(
    emailQualityTestCases.map((tc) =>
      upsertDatasetItem({
        datasetName: DATASET_NAME,
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedAttributes,
        metadata: { description: tc.description },
      }),
    ),
  );

  console.log("Dataset seeded.\n");
}

/**
 * Build tags for a test case based on its input.
 */
function buildTags(tc: EmailQualityTestCase): string[] {
  const tags: string[] = [];
  if (tc.input.companyName) tags.push("has-company");
  if (tc.input.instructions) tags.push("has-instructions");
  if (!tc.input.companyName && !tc.input.instructions) tags.push("generic");

  // Detect tone from instructions
  if (tc.input.instructions) {
    const lower = tc.input.instructions.toLowerCase();
    if (/follow.?up|applied|application|no response/i.test(lower)) {
      tags.push("tone:follow-up");
    }
    if (/refer/i.test(lower)) tags.push("tone:referral");
    if (/\b(Rust|AI|React|TypeScript)\b/i.test(tc.input.instructions)) {
      tags.push("tone:technical");
    }
  }

  return tags;
}

/**
 * Evaluate a single test case.
 */
async function evaluateTestCase(
  testCase: EmailQualityTestCase,
  sessionId: string,
  runName: string,
): Promise<EvaluationResult> {
  console.log(`\nEvaluating: ${testCase.description}`);
  if (testCase.input.companyName)
    console.log(`   Company: ${testCase.input.companyName}`);
  if (testCase.input.instructions)
    console.log(
      `   Instructions: ${testCase.input.instructions.slice(0, 80)}`,
    );

  const trace = langfuse.trace({
    name: "batch-email-quality",
    sessionId,
    userId: "eval-script",
    tags: buildTags(testCase),
    metadata: {
      testCaseId: testCase.id,
      description: testCase.description,
      input: testCase.input,
      runName,
    },
  });

  try {
    const prompt = buildBatchPrompt(testCase.input);

    const generation = trace.generation({
      name: "generate-email",
      model: "deepseek-reasoner",
      input: {
        prompt,
        input: testCase.input,
      },
      metadata: { testCase: testCase.id },
    });

    const completion = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        {
          role: "system",
          content:
            'You are an expert email writer. Your top priority is the PRIMARY GOAL in the user prompt \u2014 every sentence must serve it. Respond ONLY with a JSON object: {"subject": "...", "body": "..."}. The body must use {{name}} as the placeholder for the recipient\'s first name. Never add fluff. Keep it under 180 words.',
        },
        { role: "user", content: prompt },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "";

    generation.update({
      output: rawContent,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
    });

    const parsed = parseJsonContent(rawContent);
    const qualityScore = scoreEmailQuality(testCase.input, parsed);

    // --- Attach scores to trace ---

    // NUMERIC: composite quality score
    trace.score({
      name: "email-quality",
      value: qualityScore.score,
      comment: `Composite quality: ${(qualityScore.score * 100).toFixed(1)}%`,
    });

    // BOOLEAN scores for each check
    const booleanChecks = [
      "has-name-placeholder",
      "has-greeting",
      "has-signoff",
      "has-cta",
      "tone-match",
      "mentions-company",
      "valid-json",
    ] as const;

    for (const checkName of booleanChecks) {
      const check = qualityScore.checks[checkName];
      if (check) {
        trace.score({
          name: checkName,
          value: check.score >= 1 ? 1 : 0,
          dataType: "BOOLEAN",
          comment: check.comment,
        });
      }
    }

    // BOOLEAN for word count (threshold at 1.0)
    const wcCheck = qualityScore.checks["word-count"];
    if (wcCheck) {
      trace.score({
        name: "word-count-ok",
        value: wcCheck.score >= 1 ? 1 : 0,
        dataType: "BOOLEAN",
        comment: wcCheck.comment,
      });
    }

    generation.end();

    // Link trace to dataset run
    await createDatasetRunItem({
      datasetItemId: testCase.id,
      runName,
      traceId: trace.id,
    });

    // Print results
    const passFail = qualityScore.score >= 0.8 ? "PASS" : "FAIL";
    console.log(
      `   Score: ${(qualityScore.score * 100).toFixed(1)}% ${passFail}`,
    );

    // Show failing checks
    for (const [name, check] of Object.entries(qualityScore.checks)) {
      if (check.score < 1) {
        console.log(`   [FAIL] ${name}: ${check.comment}`);
      }
    }

    return {
      testCaseId: testCase.id,
      description: testCase.description,
      qualityScore,
      parsed,
      traceUrl: trace.url,
    };
  } catch (error) {
    console.error(
      `   Error evaluating ${testCase.id}:`,
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
  console.log("Batch Email Quality Evaluation");
  console.log("==================================\n");

  await seedDataset();

  const runName = `run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}`;
  console.log(`Dataset run: ${runName}`);

  const testCases = emailQualityTestCases;
  console.log(`Running ${testCases.length} test cases...\n`);

  const sessionId = `eval-email-${Date.now()}`;
  const results: EvaluationResult[] = [];

  for (const testCase of testCases) {
    try {
      const result = await evaluateTestCase(testCase, sessionId, runName);
      results.push(result);
    } catch {
      console.error(`Failed to evaluate ${testCase.id}, skipping...`);
    }
  }

  // --- Aggregate scores ---
  const avgScore =
    results.reduce((sum, r) => sum + r.qualityScore.score, 0) / results.length;

  // Per-check pass rates
  const checkNames = [
    "has-name-placeholder",
    "has-greeting",
    "has-signoff",
    "word-count",
    "has-cta",
    "tone-match",
    "mentions-company",
    "valid-json",
  ];

  const checkPassRates: Record<string, number> = {};
  for (const name of checkNames) {
    const passing = results.filter(
      (r) => (r.qualityScore.checks[name]?.score ?? 0) >= 1,
    ).length;
    checkPassRates[name] = passing / results.length;
  }

  // --- Summary trace ---
  const summaryTrace = langfuse.trace({
    name: "eval-run-summary",
    sessionId,
    userId: "eval-script",
    tags: ["eval-summary", "batch-email", `run:${runName}`],
    metadata: {
      runName,
      totalCases: results.length,
      model: "deepseek-reasoner",
    },
  });

  summaryTrace.score({
    name: "run-avg-quality",
    value: avgScore,
    comment: `Average quality across ${results.length} cases`,
  });

  for (const [name, rate] of Object.entries(checkPassRates)) {
    summaryTrace.score({
      name: `run-${name}-pass-rate`,
      value: rate,
      comment: `${(rate * 100).toFixed(0)}% of cases pass ${name}`,
    });
  }

  summaryTrace.update({
    output: {
      avgScore,
      checkPassRates,
      totalCases: results.length,
    },
  });

  // Flush all traces to Langfuse
  console.log("\nSending traces to Langfuse...");
  await langfuse.flushAsync();

  // --- Print results table ---
  console.log("\n\nEVALUATION SUMMARY");
  console.log("=====================\n");

  console.log(`Total Test Cases: ${results.length}`);
  console.log(`Average Quality Score: ${(avgScore * 100).toFixed(1)}%`);

  console.log("\nPer-Check Pass Rates:");
  for (const [name, rate] of Object.entries(checkPassRates)) {
    const bar = rate >= 1 ? "PASS" : rate >= 0.8 ? "OK" : "WARN";
    console.log(`  ${name}: ${(rate * 100).toFixed(0)}% [${bar}]`);
  }

  const failures = results.filter((r) => r.qualityScore.score < 0.8);
  if (failures.length > 0) {
    console.log(`\nFAILING CASES (${failures.length}):`);
    for (const f of failures) {
      console.log(
        `\n  ${f.testCaseId}: ${f.description} — ${(f.qualityScore.score * 100).toFixed(1)}%`,
      );
      for (const [name, check] of Object.entries(f.qualityScore.checks)) {
        if (check.score < 1) {
          console.log(`    [FAIL] ${name}: ${check.comment}`);
        }
      }
    }
  }

  console.log(`\nDataset: ${DATASET_NAME}`);
  console.log(`Run: ${runName}`);
  console.log("\nEvaluation complete!");

  if (avgScore < 0.8) {
    console.log(
      `\nWarning: Average quality score ${(avgScore * 100).toFixed(1)}% is below 80% threshold`,
    );
    process.exit(1);
  }
}

runEvaluation().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});
