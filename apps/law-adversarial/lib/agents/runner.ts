import { deepseekClient, deepseekReasoner, qwenClient } from "./providers";
import { AttackerOutputSchema, DefenderOutputSchema, JudgeOutputSchema, CitationVerifierOutputSchema, JurisdictionExpertOutputSchema, BriefRewriterOutputSchema } from "./schemas";
import { buildAttackerPrompt, buildDefenderPrompt, buildJudgePrompt, buildCitationVerifierPrompt, buildJurisdictionExpertPrompt, buildBriefRewriterPrompt } from "./prompts";
import type { AttackerOutput, BriefRewriterOutput, CitationVerifierOutput, DefenderOutput, JudgeOutput, JurisdictionExpertOutput, RoundContext } from "./types";
import type { DeepSeekClient } from "@repo/deepseek";

async function generateObject<T>(
  client: DeepSeekClient,
  prompt: string,
  schema: { parse: (v: unknown) => T },
): Promise<T> {
  const response = await client.chat({
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  const text = response.choices[0]?.message?.content ?? "{}";
  return schema.parse(JSON.parse(text));
}

export async function runAttacker(ctx: RoundContext): Promise<AttackerOutput> {
  return generateObject(deepseekReasoner, buildAttackerPrompt(ctx), AttackerOutputSchema);
}

export async function runDefender(
  ctx: RoundContext,
  attacks: AttackerOutput,
): Promise<DefenderOutput> {
  return generateObject(
    qwenClient,
    buildDefenderPrompt(ctx, JSON.stringify(attacks, null, 2)),
    DefenderOutputSchema,
  );
}

export async function runJudge(
  ctx: RoundContext,
  attacks: AttackerOutput,
  rebuttals: DefenderOutput,
): Promise<JudgeOutput> {
  return generateObject(
    deepseekClient,
    buildJudgePrompt(ctx, JSON.stringify(attacks, null, 2), JSON.stringify(rebuttals, null, 2)),
    JudgeOutputSchema,
  );
}

export async function runCitationVerifier(ctx: RoundContext): Promise<CitationVerifierOutput> {
  return generateObject(deepseekReasoner, buildCitationVerifierPrompt(ctx), CitationVerifierOutputSchema);
}

export async function runJurisdictionExpert(ctx: RoundContext): Promise<JurisdictionExpertOutput> {
  return generateObject(deepseekReasoner, buildJurisdictionExpertPrompt(ctx), JurisdictionExpertOutputSchema);
}

export async function runBriefRewriter(
  ctx: RoundContext,
  findings: JudgeOutput,
): Promise<BriefRewriterOutput> {
  const findingsSummary = findings.findings
    .map(
      (f, i) =>
        `Finding ${i + 1}: [${f.type.toUpperCase()}] (${f.severity}, confidence: ${f.confidence})\n` +
        `  Description: ${f.description}\n` +
        `  Suggested fix: ${f.suggested_fix}`
    )
    .join('\n\n');

  return generateObject(
    qwenClient,
    buildBriefRewriterPrompt(ctx, findingsSummary),
    BriefRewriterOutputSchema,
  );
}
