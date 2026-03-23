// src/llm/deepseek.ts
import OpenAI from "openai";

export type GenerateInput = {
  promptText: string;
  promptType: "text" | "chat";
  variables?: Record<string, unknown>;

  // DeepSeek-only knobs
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
};

function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY not set. Please add it to your environment variables.",
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });
}

/**
 * Generate text using DeepSeek.
 */
export async function generateDeepSeek(
  input: GenerateInput,
): Promise<string> {
  const model =
    input.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

  const client = getDeepSeekClient();

  const messages: OpenAI.Chat.ChatCompletionCreateParams["messages"] =
    input.promptType === "chat" && Array.isArray(input.promptText)
      ? (input.promptText as unknown as OpenAI.Chat.ChatCompletionCreateParams["messages"])
      : [{ role: "user", content: String(input.promptText) }];

  const res = await client.chat.completions.create({
    model,
    messages,
    max_tokens: input.max_tokens,
    temperature: input.temperature,
    top_p: input.top_p,
  });

  return res.choices?.[0]?.message?.content ?? "";
}
