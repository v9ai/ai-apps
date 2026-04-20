import { DeepSeekClient } from "@ai-apps/deepseek";
import type { ChatMessage } from "@ai-apps/deepseek";

const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";
const LLM_BASE_URL = process.env.LLM_BASE_URL;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export interface ChatResult {
  content: string;
  tokens: number;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  system?: string;
  messages?: ChatMessage[];
}

let _client: DeepSeekClient | null = null;

function getClient(): DeepSeekClient {
  if (!_client) {
    if (!DEEPSEEK_API_KEY && !LLM_BASE_URL) {
      throw new Error(
        "Set DEEPSEEK_API_KEY or LLM_BASE_URL in the environment (.env.local).",
      );
    }
    _client = new DeepSeekClient({
      apiKey: DEEPSEEK_API_KEY || "missing",
      baseURL: LLM_BASE_URL,
      defaultModel: LLM_MODEL,
    });
  }
  return _client;
}

export async function deepseekChat(
  prompt: string,
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const messages: ChatMessage[] = opts.messages
    ? opts.messages
    : opts.system
      ? [
          { role: "system", content: opts.system },
          { role: "user", content: prompt },
        ]
      : [{ role: "user", content: prompt }];

  const response = await getClient().chat({
    model: opts.model ?? LLM_MODEL,
    messages,
    temperature: opts.temperature,
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    tokens: response.usage?.total_tokens ?? 0,
  };
}
