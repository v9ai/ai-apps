/**
 * Email Generation Evaluation
 *
 * Centralized module for evaluating email generation quality.
 * Evaluation runs via Langfuse Datasets: pnpm eval:email
 *
 * @module email-generation-eval
 */

export * from "./schema";
export * from "./test-data";
export * from "./scorers";
