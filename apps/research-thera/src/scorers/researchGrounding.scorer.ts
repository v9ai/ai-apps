import { createScorer } from "@mastra/core/evals";
import { z } from "zod";

/**
 * Research Grounding Scorer
 *
 * Checks that extracted keyFindings and therapeuticTechniques are supported
 * by the provided abstract/context. Used as a gating scorer in the research
 * extraction workflow to ensure high-quality, evidence-based extractions.
 *
 * Score: 1.0 = all findings supported, 0.0 = no findings supported
 */
export function createResearchGroundingScorer() {
  return createScorer({
    id: "research-grounding",
    description:
      "Check that keyFindings/techniques are supported by the provided abstract/context",
    judge: {
      model: "deepseek/deepseek-chat",
      instructions: `You are a strict scientific evaluator. Only mark a finding as supported if the abstract explicitly supports it.

Guidelines:
- A finding is SUPPORTED if the abstract contains direct evidence or clear inference
- A finding is UNSUPPORTED if it makes claims beyond what the abstract states
- Be strict: if unsure, mark as unsupported
- Check both keyFindings and therapeuticTechniques arrays`,
    },
  })
    .analyze({
      description: "Detect unsupported findings/techniques",
      outputSchema: z.object({
        unsupportedFindings: z
          .array(z.string())
          .describe(
            "List of keyFindings that are NOT supported by the abstract",
          ),
        unsupportedTechniques: z
          .array(z.string())
          .describe("List of therapeuticTechniques that are NOT supported"),
        supportedFindings: z
          .array(z.string())
          .describe("List of keyFindings that ARE supported"),
        supportedTechniques: z
          .array(z.string())
          .describe("List of therapeuticTechniques that ARE supported"),
        notes: z.string().describe("Brief explanation of the evaluation"),
      }),
      createPrompt: ({ run }) => {
        const context = (run as any).context;
        return `
Abstract/Context:
${Array.isArray(context) ? context.join("\n---\n") : String(context ?? "")}

Extracted Research Data:
${JSON.stringify(run.output, null, 2)}

Evaluate each keyFinding and therapeuticTechnique in the extracted data.
Return JSON with:
- unsupportedFindings: keyFindings that are NOT supported by the abstract
- unsupportedTechniques: therapeuticTechniques that are NOT supported  
- supportedFindings: keyFindings that ARE supported
- supportedTechniques: therapeuticTechniques that ARE supported
- notes: short explanation (2-3 sentences)
`;
      },
    })
    .generateScore(({ results, run }) => {
      const out = run.output as any;
      const findingsCount = Array.isArray(out?.keyFindings)
        ? out.keyFindings.length
        : 0;
      const techniquesCount = Array.isArray(out?.therapeuticTechniques)
        ? out.therapeuticTechniques.length
        : 0;

      const unsupported =
        results.analyzeStepResult.unsupportedFindings.length +
        results.analyzeStepResult.unsupportedTechniques.length;

      const total = Math.max(1, findingsCount + techniquesCount);

      // Score: 1.0 = perfect (no unsupported), 0.0 = all unsupported
      return Math.max(0, 1 - unsupported / total);
    })
    .generateReason(({ results, score }) => {
      const {
        supportedFindings,
        supportedTechniques,
        unsupportedFindings,
        unsupportedTechniques,
        notes,
      } = results.analyzeStepResult;

      return `Score: ${score.toFixed(2)}. Supported: ${supportedFindings.length} findings, ${supportedTechniques.length} techniques. Unsupported: ${unsupportedFindings.length} findings, ${unsupportedTechniques.length} techniques. ${notes}`;
    });
}
