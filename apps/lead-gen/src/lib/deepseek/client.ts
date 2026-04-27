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
  thinking: { type: "enabled" as const },
};

/** Throws if DEEPSEEK_API_KEY is missing. Use at API route entry points
 * before doing work that depends on the DeepSeek client, so the failure
 * mode is a clear 500 with a useful message instead of a downstream
 * "client.chat.completions.create is not a function" tangle.
 *
 * The lazy `getDeepSeekClient()` already throws the same error on first
 * use — this helper exists for routes that want to fail fast at the top
 * (before doing DB work, building prompts, etc.) so the user sees the
 * config error before any side effects fire. */
export function assertDeepSeekConfigured(): void {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error(
      "DEEPSEEK_API_KEY not set. Add it to .env.local (dev) or the deploy target's environment.",
    );
  }
}

/** Non-throwing variant for code paths that have a non-DeepSeek fallback
 * (e.g. local Qwen first, DeepSeek as fallback). Returns true when the
 * DeepSeek client can be constructed. */
export function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}
