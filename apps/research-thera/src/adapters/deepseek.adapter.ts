/**
 * DeepSeek Adapters for Generic Claim Cards
 *
 * Implements Extractor and Judge interfaces using DeepSeek LLM.
 */

import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import {
  extractedClaimsSchema,
  buildExtractionPrompt,
  type Extractor,
  type Judge,
  type JudgeResult,
  type ExtractedClaim,
  type ParentItemMeta,
  type SourceDetails,
  type EvidencePolarity,
} from "../tools/generic-claim-cards.tools";
import { z } from "zod";

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * DeepSeek-based claim extractor
 */
export function createDeepSeekExtractor(
  modelName = "deepseek-chat",
): Extractor {
  return {
    name: `deepseek-extractor:${modelName}`,

    async extract(
      item: ParentItemMeta,
      sources: SourceDetails[],
      maxClaims: number,
    ): Promise<ExtractedClaim[]> {
      const prompt = buildExtractionPrompt(item, sources, maxClaims);

      try {
        const result = await generateObject({
          model: deepseek(modelName),
          schema: extractedClaimsSchema,
          prompt,
        });

        return result.object.claims;
      } catch (error) {
        console.error("DeepSeek extraction error:", error);
        return [];
      }
    },
  };
}

/**
 * DeepSeek-based evidence judge
 */
export function createDeepSeekJudge(modelName = "deepseek-chat"): Judge {
  const judgeSchema = z.object({
    polarity: z
      .enum(["supports", "contradicts", "mixed", "irrelevant"])
      .describe(
        "Does this source support, contradict, provide mixed evidence for, or is irrelevant to the claim?",
      ),
    rationale: z
      .string()
      .describe("Brief 1-2 sentence explanation of the judgment"),
    score: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence in this judgment (0-1)"),
  });

  return {
    name: `deepseek-judge:${modelName}`,

    async judge(claim: string, source: SourceDetails): Promise<JudgeResult> {
      const prompt = `Evaluate whether this research source supports, contradicts, or is irrelevant to the claim.

Claim: "${claim}"

Source:
Title: ${source.title}
Authors: ${(source.authors || []).join(", ") || "N/A"}
Year: ${source.year ?? "N/A"}
Abstract: ${source.abstract || "No abstract available"}

Instructions:
- Respond with polarity: supports/contradicts/mixed/irrelevant
- Provide a brief rationale (1-2 sentences)
- Give a confidence score (0-1) for your judgment

Focus on whether the abstract directly addresses the claim, not just topical relevance.`;

      try {
        const result = await generateObject({
          model: deepseek(modelName),
          schema: judgeSchema,
          prompt,
        });

        return {
          polarity: result.object.polarity as EvidencePolarity,
          rationale: result.object.rationale,
          score: result.object.score,
        };
      } catch (error) {
        console.error("DeepSeek judge error:", error);
        return {
          polarity: "irrelevant",
          rationale: "Error during evaluation",
          score: 0,
        };
      }
    },
  };
}

/**
 * Convenience: Create both extractor and judge at once
 */
export function createDeepSeekAdapters(modelName = "deepseek-chat") {
  return {
    extractor: createDeepSeekExtractor(modelName),
    judge: createDeepSeekJudge(modelName),
  };
}
