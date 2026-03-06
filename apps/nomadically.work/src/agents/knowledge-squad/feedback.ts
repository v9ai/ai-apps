import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { getPrompt } from "@/observability/prompts";
import { aiTelemetry } from "@/lib/telemetry";
import { feedbackResultSchema } from "./types";
import { KNOWLEDGE_PROMPTS } from "./prompts";

export async function analyzeFeedback(input: {
  applications: Array<{
    id: number;
    jobTitle: string;
    companyName: string;
    status: string;
    strategy?: string;
    source?: string;
    createdAt: string;
  }>;
}) {
  const { text: systemPrompt } = await getPrompt(KNOWLEDGE_PROMPTS.FEEDBACK);

  const appSummary = input.applications
    .map((a) => `- [${a.status}] ${a.jobTitle} at ${a.companyName} (${a.createdAt})${a.source ? ` via ${a.source}` : ""}`)
    .join("\n");

  const result = await generateObject({
    model: deepseek("deepseek-reasoner"),
    system: systemPrompt,
    prompt: `## Application History (${input.applications.length} applications)
${appSummary}

Analyze patterns and generate improvement recommendations for the Knowledge Squad agents.`,
    schema: feedbackResultSchema,
    experimental_telemetry: aiTelemetry("know-squad-feedback"),
  });

  return result.object;
}
