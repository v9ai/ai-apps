import { z } from "zod";
import { generateObject, DEEPSEEK_MODELS } from "../deepseek";

const energyEnum = z.enum(["high", "medium", "low"]);

const parsedTaskSchema = z.object({
  title: z.string(),
  dueDate: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().nullable().optional(),
  energyPreference: energyEnum.nullable().optional(),
});
export type ParsedTask = z.infer<typeof parsedTaskSchema>;

const categorizationSchema = z.object({
  priority: z.number().int().min(1).max(5),
  energyPreference: energyEnum,
  estimatedMinutes: z.number().int().min(1),
});
export type TaskCategorization = z.infer<typeof categorizationSchema>;

const subtaskSchema = z.object({
  subtasks: z.array(
    z.object({
      title: z.string(),
      estimatedMinutes: z.number().int().min(1),
      energyPreference: energyEnum,
    }),
  ),
});
export type SubtaskBreakdown = z.infer<typeof subtaskSchema>;

function aiAvailable() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export async function parseNaturalLanguageTask(input: string): Promise<ParsedTask | null> {
  if (!aiAvailable()) return null;
  const { object } = await generateObject({
    schema: parsedTaskSchema,
    model: DEEPSEEK_MODELS.CHAT,
    temperature: 0.3,
    max_tokens: 512,
    prompt: `Parse this task description into a JSON object with fields:
- title (string): clean, concise task title
- dueDate (ISO datetime string or null)
- estimatedMinutes (integer or null)
- energyPreference ("high" | "medium" | "low" | null) based on cognitive load

Input: ${JSON.stringify(input)}`,
  });
  return object;
}

export async function suggestCategorization(
  title: string,
  description?: string | null,
): Promise<TaskCategorization | null> {
  if (!aiAvailable()) return null;
  const { object } = await generateObject({
    schema: categorizationSchema,
    model: DEEPSEEK_MODELS.CHAT,
    temperature: 0.3,
    max_tokens: 512,
    prompt: `Analyze this task and return JSON:
- priority (integer 1-5, urgency/importance)
- energyPreference ("high" | "medium" | "low")
- estimatedMinutes (integer, realistic estimate)

Task: ${JSON.stringify(title)}${description ? `\nDescription: ${JSON.stringify(description)}` : ""}`,
  });
  return object;
}

export async function generateSubtaskBreakdown(
  title: string,
  description?: string | null,
): Promise<SubtaskBreakdown | null> {
  if (!aiAvailable()) return null;
  const { object } = await generateObject({
    schema: subtaskSchema,
    model: DEEPSEEK_MODELS.CHAT,
    temperature: 0.3,
    max_tokens: 1024,
    prompt: `Break this task into 3-7 concrete subtasks. Return JSON of shape:
{ "subtasks": [{ "title": string, "estimatedMinutes": integer, "energyPreference": "high"|"medium"|"low" }] }

Task: ${JSON.stringify(title)}${description ? `\nDescription: ${JSON.stringify(description)}` : ""}`,
  });
  return object;
}
