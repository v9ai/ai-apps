const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.deepseek.com/v1";
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export interface ChatResult {
  content: string;
  tokens: number;
}

export async function deepseekChat(
  prompt: string,
  opts: { model?: string } = {},
): Promise<ChatResult> {
  if (!DEEPSEEK_API_KEY && !process.env.LLM_BASE_URL) {
    throw new Error(
      "Set DEEPSEEK_API_KEY or LLM_BASE_URL in the environment (.env.local).",
    );
  }

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(DEEPSEEK_API_KEY && { Authorization: `Bearer ${DEEPSEEK_API_KEY}` }),
    },
    body: JSON.stringify({
      model: opts.model ?? LLM_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };

  return {
    content: data.choices?.[0]?.message?.content ?? "",
    tokens: data.usage?.total_tokens ?? 0,
  };
}
