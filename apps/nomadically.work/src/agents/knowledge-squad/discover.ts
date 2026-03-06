import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { getPrompt } from "@/observability/prompts";
import { aiTelemetry } from "@/lib/telemetry";
import { discoverResultSchema } from "./types";
import { KNOWLEDGE_PROMPTS } from "./prompts";

export async function discoverSources(input: {
  existingSources: string[];
  targetRoles: string[];
  feedbackInsights?: string;
}) {
  const { text: systemPrompt } = await getPrompt(KNOWLEDGE_PROMPTS.SOURCE_DISCOVERY);

  const result = await generateObject({
    model: deepseek("deepseek-chat"),
    system: systemPrompt,
    prompt: `## Existing Sources (already integrated)
${input.existingSources.map((s) => `- ${s}`).join("\n")}

## Target Roles
${input.targetRoles.map((r) => `- ${r}`).join("\n")}
${input.feedbackInsights ? `\n## Feedback from Previous Cycles\n${input.feedbackInsights}` : ""}

Discover new job sources for remote EU AI/ML engineering roles that we don't already have.`,
    schema: discoverResultSchema,
    experimental_telemetry: aiTelemetry("know-squad-discover"),
  });

  return result.object;
}
