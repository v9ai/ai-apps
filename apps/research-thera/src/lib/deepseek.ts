/**
 * Centralized DeepSeek module
 *
 * - generateObject: structured output via DeepSeek (JSON mode + Zod parse)
 * - deepseekModel: LanguageModelV1 provider for AI SDK generateText (via @ai-sdk/openai compat layer)
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { z } from "zod";

const DEEPSEEK_API_BASE_URL = "https://api.deepseek.com";

export const DEEPSEEK_MODELS = {
  CHAT: "deepseek-chat",
  REASONER: "deepseek-reasoner",
} as const;

// Minimal DeepSeek client for chat completions (inlined from @ai-apps/deepseek)
class DeepSeekClient {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    if (!this.apiKey)
      throw new Error("DEEPSEEK_API_KEY environment variable is required");
    this.baseURL = DEEPSEEK_API_BASE_URL;
  }

  async chat(request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    response_format?: { type: string };
    temperature?: number;
  }) {
    const resp = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: false }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ||
          `HTTP ${resp.status}`
      );
    }
    return resp.json() as Promise<{
      choices: Array<{ message: { content: string } }>;
    }>;
  }
}

let _client: DeepSeekClient | null = null;
function getDefaultClient(): DeepSeekClient {
  if (!_client) _client = new DeepSeekClient();
  return _client;
}

// AI SDK LanguageModelV1 provider for generateText/generateObject
const _provider = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export const deepseekModel = (model: string = DEEPSEEK_MODELS.CHAT) =>
  _provider(model);

export async function generateObject<T>({
  schema,
  prompt,
  model = DEEPSEEK_MODELS.CHAT,
  temperature,
}: {
  schema: z.ZodType<T>;
  prompt: string;
  model?: string;
  temperature?: number;
}): Promise<{ object: T }> {
  const response = await getDefaultClient().chat({
    model,
    messages: [
      { role: "system", content: "Respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return { object: schema.parse(parsed) };
}
