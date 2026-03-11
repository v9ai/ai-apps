#!/usr/bin/env tsx

/**
 * Email Generation Evaluation with Langfuse Datasets
 *
 * Seeds email test cases as dataset items, generates emails via DeepSeek,
 * runs deterministic scorers, and links traces to a named dataset run.
 *
 * Usage:
 *   pnpm eval:email
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: new URL("../.env.local", import.meta.url).pathname, override: true });

import { Langfuse } from "langfuse";
import OpenAI from "openai";
import { emailTestCases } from "../src/evals/email-generation/test-data";
import { scoreEmail } from "../src/evals/email-generation/scorers";
import type { EmailTestCase, EmailScoreResult } from "../src/evals/email-generation/schema";
import { buildBatchPrompt, parseJsonContent } from "../src/lib/email-prompt-builder";
import type { GenerateBatchEmailRequest } from "../src/lib/email-prompt-builder";
import {
  ensureDataset,
  upsertDatasetItem,
  createDatasetRunItem,
} from "../src/langfuse/datasets";

const DATASET_NAME = "email-generation";

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
  scores: EmailScoreResult;
  email: { subject: string; body: string } | null;
  error?: string;
  traceUrl?: string;
}

async function seedDataset() {
  console.log(`Seeding dataset "${DATASET_NAME}" with ${emailTestCases.length} items...`);

  await ensureDataset(DATASET_NAME, "Email generation quality test cases");

  await Promise.all(
    emailTestCases.map((tc) =>
      upsertDatasetItem({
        datasetName: DATASET_NAME,
        id: tc.id,
        input: {
          companyName: tc.companyName,
          instructions: tc.instructions,
          jobContext: tc.jobContext,
          applicationContext: tc.applicationContext,
        },
        expectedOutput: {
          mustMention: tc.mustMention,
          mustNotContain: tc.mustNotContain,
          expectedSkillCategory: tc.expectedSkillCategory,
        },
        metadata: { description: tc.description },
      }),
    ),
  );

  console.log("Dataset seeded.\n");
}

async function evaluateTestCase(
  testCase: EmailTestCase,
  sessionId: string,
  runName: string,
): Promise<EvaluationResult> {
  console.log(`\nEvaluating: ${testCase.description}`);
  if (testCase.companyName) console.log(`   Company: ${testCase.companyName}`);
  if (testCase.jobContext?.title) console.log(`   Role: ${testCase.jobContext.title}`);

  const trace = langfuse.trace({
    name: "email-generation",
    sessionId,
    userId: "eval-script",
    tags: [
      testCase.jobContext?.title ? `role:${testCase.jobContext.title}` : "role:none",
      testCase.companyName ? `company:${testCase.companyName}` : "company:none",
      testCase.applicationContext ? "type:followup" : "type:outreach",
    ],
    metadata: {
      testCaseId: testCase.id,
      description: testCase.description,
      runName,
    },
  });

  try {
    const promptInput: GenerateBatchEmailRequest = {
      companyName: testCase.companyName,
      instructions: testCase.instructions,
      jobContext: testCase.jobContext,
      applicationContext: testCase.applicationContext,
    };

    const prompt = buildBatchPrompt(promptInput);

    const generation = trace.generation({
      name: "generate-email",
      model: "deepseek-reasoner",
      input: { prompt, testCase: testCase.id },
    });

    const completion = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        {
          role: "system",
          content:
            "You are an expert email writer. Your top priority is the PRIMARY GOAL in the user prompt — every sentence must serve it. Respond ONLY with a JSON object: {\"subject\": \"...\", \"body\": \"...\"}. The body must use {{name}} as the placeholder for the recipient's first name. Never add fluff. Keep it under 180 words.",
        },
        { role: "user", content: prompt },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      generation.end();
      trace.score({ name: "email-composite", value: 0, comment: "Empty response" });
      return {
        testCaseId: testCase.id,
        description: testCase.description,
        scores: { relevance: 0, naturalness: 0, personalization: 0, structure: 0, conciseness: 0, noHallucination: 0, composite: 0 },
        email: null,
        error: "Empty model response",
      };
    }

    const parsed = parseJsonContent(rawContent);
    if (!parsed) {
      generation.update({ output: rawContent });
      generation.end();
      trace.score({ name: "email-composite", value: 0, comment: "Failed to parse JSON" });
      return {
        testCaseId: testCase.id,
        description: testCase.description,
        scores: { relevance: 0, naturalness: 0, personalization: 0, structure: 0, conciseness: 0, noHallucination: 0, composite: 0 },
        email: null,
        error: "JSON parse failed",
      };
    }

    generation.update({
      output: parsed,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    });
    generation.end();

    // Score the email
    const fullEmail = `${parsed.subject}\n\n${parsed.body}`;
    const scores = scoreEmail(fullEmail, testCase);

    // Record Langfuse scores
    trace.score({ name: "email-relevance", value: scores.relevance });
    trace.score({ name: "email-naturalness", value: scores.naturalness });
    trace.score({ name: "email-personalization", value: scores.personalization });
    trace.score({ name: "email-structure", value: scores.structure });
    trace.score({ name: "email-conciseness", value: scores.conciseness });
    trace.score({ name: "email-no-hallucination", value: scores.noHallucination });
    trace.score({ name: "email-composite", value: scores.composite });

    // Link trace to dataset run
    await createDatasetRunItem({
      datasetItemId: testCase.id,
      runName,
      traceId: trace.id,
    });

    console.log(`   Composite: ${scores.composite.toFixed(3)} | Rel: ${scores.relevance.toFixed(2)} Nat: ${scores.naturalness.toFixed(2)} Per: ${scores.personalization.toFixed(2)} Str: ${scores.structure.toFixed(2)} Con: ${scores.conciseness.toFixed(2)} NoH: ${scores.noHallucination.toFixed(2)}`);

    return {
      testCaseId: testCase.id,
      description: testCase.description,
      scores,
      email: parsed,
      traceUrl: trace.url,
    };
  } catch (error) {
    console.error(`   Error: ${error instanceof Error ? error.message : error}`);
    trace.update({
      level: "ERROR",
      output: { error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}

async function runEvaluation() {
  console.log("Email Generation Quality Evaluation");
  console.log("====================================\n");

  await seedDataset();

  const runName = `email-run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}`;
  console.log(`Dataset run: ${runName}`);

  const sessionId = `eval-email-${Date.now()}`;
  const results: EvaluationResult[] = [];

  for (const testCase of emailTestCases) {
    try {
      const result = await evaluateTestCase(testCase, sessionId, runName);
      results.push(result);
    } catch {
      console.error(`Failed to evaluate ${testCase.id}, skipping...`);
    }
  }

  // Aggregate metrics
  const successful = results.filter((r) => r.email !== null);
  const failed = results.filter((r) => r.email === null);

  const avgScores: Record<string, number> = {};
  const dimensions = ["relevance", "naturalness", "personalization", "structure", "conciseness", "noHallucination", "composite"] as const;

  for (const dim of dimensions) {
    avgScores[dim] = successful.length > 0
      ? successful.reduce((sum, r) => sum + r.scores[dim], 0) / successful.length
      : 0;
  }

  // Summary trace
  const summaryTrace = langfuse.trace({
    name: "email-eval-summary",
    sessionId,
    userId: "eval-script",
    tags: ["eval-summary", `run:${runName}`],
    metadata: { runName, totalCases: results.length, model: "deepseek-reasoner" },
  });

  for (const dim of dimensions) {
    summaryTrace.score({ name: `run-${dim}`, value: avgScores[dim] });
  }

  summaryTrace.update({
    output: {
      avgScores,
      totalCases: results.length,
      successfulGenerations: successful.length,
      failedGenerations: failed.length,
    },
  });

  console.log("\nSending traces to Langfuse...");
  await langfuse.flushAsync();

  // Print summary
  console.log("\n\nEVALUATION SUMMARY");
  console.log("==================\n");

  console.log(`Total Test Cases: ${results.length}`);
  console.log(`Successful Generations: ${successful.length}`);
  console.log(`Failed Generations: ${failed.length}`);
  console.log("");

  console.log("Average Scores:");
  for (const dim of dimensions) {
    const bar = "█".repeat(Math.round(avgScores[dim] * 20)).padEnd(20, "░");
    console.log(`  ${dim.padEnd(18)} ${bar} ${avgScores[dim].toFixed(3)}`);
  }

  // Worst cases
  const worst = [...successful].sort((a, b) => a.scores.composite - b.scores.composite).slice(0, 5);
  if (worst.length > 0) {
    console.log("\nWorst Cases:");
    for (const w of worst) {
      console.log(`  ${w.testCaseId}: ${w.scores.composite.toFixed(3)} — ${w.description}`);
    }
  }

  console.log(`\nDataset: ${DATASET_NAME}`);
  console.log(`Run: ${runName}`);
  console.log("\nEvaluation complete!");

  if (avgScores.composite < 0.7) {
    console.log(`\nWarning: Composite score ${avgScores.composite.toFixed(3)} below 0.7 threshold`);
    process.exit(1);
  }
}

runEvaluation().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});
