const BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatChoice {
  message: ChatMessage;
}

interface ChatResponse {
  choices: ChatChoice[];
}

async function chat(
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-plus",
      messages,
      max_completion_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DashScope API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as ChatResponse;
  return data.choices[0]?.message.content ?? "";
}

export async function parseNaturalLanguageTask(input: string) {
  const text = await chat(
    [
      {
        role: "user",
        content: `Parse this task description into structured data. Return ONLY valid JSON with these fields:
- title (string, required): A clean, concise task title
- dueDate (string|null): ISO date string if a date is mentioned, else null
- estimatedMinutes (number|null): Estimated minutes if duration is mentioned, else null
- energyPreference (string|null): "high", "medium", or "low" based on task complexity

Input: "${input}"

JSON:`,
      },
    ],
    512
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  return JSON.parse(jsonMatch[0]) as {
    title: string;
    dueDate: string | null;
    estimatedMinutes: number | null;
    energyPreference: "high" | "medium" | "low" | null;
  };
}

export async function suggestCategorization(
  title: string,
  description?: string
) {
  const text = await chat(
    [
      {
        role: "user",
        content: `Analyze this task and suggest categorization. Return ONLY valid JSON:
- priority (number 1-5): How urgent/important
- energyPreference ("high"|"medium"|"low"): Required mental energy
- estimatedMinutes (number): Realistic time estimate

Task: "${title}"${description ? `\nDescription: "${description}"` : ""}

JSON:`,
      },
    ],
    512
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  return JSON.parse(jsonMatch[0]) as {
    priority: number;
    energyPreference: "high" | "medium" | "low";
    estimatedMinutes: number;
  };
}

export async function generateSubtaskBreakdown(
  title: string,
  description?: string
) {
  const text = await chat(
    [
      {
        role: "user",
        content: `Break this task into 3-7 concrete subtasks. Return ONLY a JSON array of objects with:
- title (string): Subtask title
- estimatedMinutes (number): Time estimate
- energyPreference ("high"|"medium"|"low"): Required energy

Task: "${title}"${description ? `\nDescription: "${description}"` : ""}

JSON array:`,
      },
    ],
    1024
  );

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  return JSON.parse(jsonMatch[0]) as Array<{
    title: string;
    estimatedMinutes: number;
    energyPreference: "high" | "medium" | "low";
  }>;
}

export async function smartSchedulingSuggestion(
  tasks: Array<{
    id: string;
    title: string;
    estimatedMinutes: number | null;
    energyPreference: string | null;
    dueDate: Date | null;
    priorityScore: number | null;
  }>,
  preferences: {
    chronotype: string;
    bufferPercentage: number;
  },
  existingBlocks: Array<{
    startTime: Date;
    endTime: Date;
  }>
) {
  const text = await chat(
    [
      {
        role: "user",
        content: `You are a scheduling assistant. Given these tasks, user preferences, and existing calendar blocks, suggest an optimal schedule for today.

User chronotype: ${preferences.chronotype}
Buffer: ${preferences.bufferPercentage}%

Tasks:
${tasks.map((t) => `- ${t.title} (${t.estimatedMinutes ?? 30}min, energy: ${t.energyPreference ?? "medium"}, priority: ${t.priorityScore ?? 0})`).join("\n")}

Existing blocks:
${existingBlocks.length === 0 ? "None" : existingBlocks.map((b) => `- ${b.startTime.toISOString()} to ${b.endTime.toISOString()}`).join("\n")}

Return ONLY a JSON array of objects:
- taskId (string)
- startHour (number, 0-23)
- durationMinutes (number)
- reason (string, brief)

JSON array:`,
      },
    ],
    2048
  );

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  return JSON.parse(jsonMatch[0]) as Array<{
    taskId: string;
    startHour: number;
    durationMinutes: number;
    reason: string;
  }>;
}
