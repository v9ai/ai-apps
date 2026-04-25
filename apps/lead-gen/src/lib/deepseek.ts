import OpenAI from "openai";
import { getDeepSeekClient, getDeepSeekModel, DEEPSEEK_REASONING_DEFAULTS } from "@/lib/deepseek/client";

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

/**
 * Generate text using DeepSeek.
 */
export async function generateDeepSeek(
  input: GenerateInput,
): Promise<string> {
  const model = input.model ?? getDeepSeekModel();
  const client = getDeepSeekClient();

  const messages: OpenAI.Chat.ChatCompletionCreateParams["messages"] =
    input.promptType === "chat" && Array.isArray(input.promptText)
      ? (input.promptText as unknown as OpenAI.Chat.ChatCompletionCreateParams["messages"])
      : [{ role: "user", content: String(input.promptText) }];

  const res = await client.chat.completions.create({
    model,
    messages,
    max_tokens: input.max_tokens,
    ...DEEPSEEK_REASONING_DEFAULTS,
  });

  return res.choices?.[0]?.message?.content ?? "";
}
