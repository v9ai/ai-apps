import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { getPrompt } from "@/observability/prompts";
import { aiTelemetry } from "@/lib/telemetry";
import { applicationStrategySchema } from "./types";
import { KNOWLEDGE_PROMPTS } from "./prompts";

export async function generateApplicationStrategy(input: {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeText: string;
  previousOutcomes?: string;
}) {
  const { text: systemPrompt } = await getPrompt(KNOWLEDGE_PROMPTS.STRATEGY);

  const result = await generateObject({
    model: deepseek("deepseek-reasoner"),
    system: systemPrompt,
    prompt: `## Job
Title: ${input.jobTitle}
Company: ${input.companyName}

## Job Description
${input.jobDescription}

## Candidate Resume
${input.resumeText}
${input.previousOutcomes ? `\n## Previous Application Outcomes\n${input.previousOutcomes}` : ""}

Generate a comprehensive application strategy for this specific role.`,
    schema: applicationStrategySchema,
    experimental_telemetry: aiTelemetry("know-squad-strategy"),
  });

  return result.object;
}
