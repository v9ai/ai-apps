import type { ChatMessage, ChatOptions, ChatResult, LlmProvider } from "./types";

const DEEPSEEK_DEFAULT_BASE = "https://api.deepseek.com";
const DEEPSEEK_DEFAULT_MODEL = "deepseek-chat";
const QWEN_BASE = "https://dashscope-intl.aliyuncs.com/compatible-mode";

export function deepseekFromEnv(env: NodeJS.ProcessEnv = process.env): LlmProvider | undefined {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) return undefined;
  return {
    kind: "deepseek",
    apiKey,
    baseUrl: env.DEEPSEEK_BASE_URL,
    model: env.DEEPSEEK_MODEL,
  };
}

export function qwenFromEnv(env: NodeJS.ProcessEnv = process.env): LlmProvider | undefined {
  const apiKey = env.DASHSCOPE_API_KEY;
  if (!apiKey) return undefined;
  return {
    kind: "qwen",
    apiKey,
    model: env.QWEN_MODEL ?? "qwen-max",
  };
}

function resolveEndpoint(provider: LlmProvider): { url: string; model: string } {
  if (provider.kind === "deepseek") {
    const base = (provider.baseUrl ?? DEEPSEEK_DEFAULT_BASE).replace(/\/+$/, "");
    return {
      url: `${base}/v1/chat/completions`,
      model: provider.model ?? DEEPSEEK_DEFAULT_MODEL,
    };
  }
  return {
    url: `${QWEN_BASE}/v1/chat/completions`,
    model: provider.model,
  };
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string; type?: string };
}

export async function chat(
  provider: LlmProvider,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  const { url, model } = resolveEndpoint(provider);
  const body: Record<string, unknown> = { model, messages };
  if (options.temperature != null) body.temperature = options.temperature;
  if (options.max_tokens != null) body.max_tokens = options.max_tokens;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `[chat] ${provider.kind} HTTP ${response.status} ${response.statusText}: ${text.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as OpenAiChatResponse;
  if (data.error) {
    throw new Error(`[chat] ${provider.kind}: ${data.error.message ?? "unknown error"}`);
  }
  const content = data.choices?.[0]?.message?.content ?? "";
  return {
    content,
    model: data.model ?? model,
    usage: data.usage,
  };
}
