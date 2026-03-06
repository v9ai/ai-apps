import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { getPrompt } from "@/observability/prompts";
import { aiTelemetry } from "@/lib/telemetry";
import { studyPlanSchema } from "./types";
import { KNOWLEDGE_PROMPTS } from "./prompts";

export async function generateStudyPlan(input: {
  resumeText: string;
  jobDescriptions: string[];
  existingStudyTopics?: string[];
}) {
  const { text: systemPrompt } = await getPrompt(KNOWLEDGE_PROMPTS.STUDY_CURATOR);

  const jobContext = input.jobDescriptions
    .slice(0, 5) // limit context
    .map((jd, i) => `### Job ${i + 1}\n${jd}`)
    .join("\n\n");

  const result = await generateObject({
    model: deepseek("deepseek-reasoner"),
    system: systemPrompt,
    prompt: `## Candidate Resume
${input.resumeText}

## Target Job Descriptions
${jobContext}
${input.existingStudyTopics?.length ? `\n## Already Studying\n${input.existingStudyTopics.join(", ")}` : ""}

Identify skill gaps and curate a focused study plan.`,
    schema: studyPlanSchema,
    experimental_telemetry: aiTelemetry("know-squad-study"),
  });

  return result.object;
}
