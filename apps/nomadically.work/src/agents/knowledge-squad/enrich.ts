import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { getPrompt } from "@/observability/prompts";
import { aiTelemetry } from "@/lib/telemetry";
import { enrichmentResultSchema } from "./types";
import { KNOWLEDGE_PROMPTS } from "./prompts";

export async function enrichJobListing(input: {
  jobTitle: string;
  location: string;
  description: string;
  atsData?: string;
}) {
  const { text: systemPrompt } = await getPrompt(KNOWLEDGE_PROMPTS.ENRICHMENT);

  const result = await generateObject({
    model: deepseek("deepseek-chat"),
    system: systemPrompt,
    prompt: `Job Title: ${input.jobTitle}
Location: ${input.location || "Not specified"}
Description: ${input.description}
${input.atsData ? `\nATS Data: ${input.atsData}` : ""}

Extract salary, visa, and culture information from this job posting.`,
    schema: enrichmentResultSchema,
    experimental_telemetry: aiTelemetry("know-squad-enrich"),
  });

  return result.object;
}
