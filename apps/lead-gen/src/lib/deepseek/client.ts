import OpenAI from "openai";

let _client: OpenAI | null = null;

/** Singleton OpenAI client pointed at DeepSeek's OpenAI-compatible endpoint. */
export function getDeepSeekClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set. Add it to .env.local.");
  _client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });
  return _client;
}

/** Resolve the DeepSeek model for a given reasoning tier.
 * - "standard" → DEEPSEEK_MODEL (defaults to deepseek-v4-pro)
 * - "deep"     → DEEPSEEK_MODEL_DEEP (defaults to deepseek-v4-pro)
 * Both default to v4-pro since the user wants the latest model everywhere;
 * the two env knobs let deployed environments diverge if needed.
 */
export function getDeepSeekModel(tier: "standard" | "deep" = "standard"): string {
  if (tier === "deep") return process.env.DEEPSEEK_MODEL_DEEP ?? "deepseek-v4-pro";
  return process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
}

/** Reasoning + thinking defaults for v4-pro. Spread into chat.completions.create().
 * Note: temperature / top_p / penalties are silently ignored in thinking mode. */
export const DEEPSEEK_REASONING_DEFAULTS = {
  reasoning_effort: "high" as const,
  // @ts-expect-error — DeepSeek extension, not in OpenAI types
  thinking: { type: "enabled" as const },
};
