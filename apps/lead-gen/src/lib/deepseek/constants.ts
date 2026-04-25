/** DeepSeek v4 model catalog. Source of truth for UI copy that names a model
 * or quotes its per-1M-token pricing. Mirrors the entries in
 * backend/leadgen_agent/llm.py MODEL_PRICING (Python) — keep in sync. */
export const DEEPSEEK_MODELS = {
  flash: {
    id: "deepseek-v4-flash",
    label: "deepseek-v4-flash",
    inputPer1M: 0.27,
    outputPer1M: 1.10,
    note: "non-thinking, summary nodes",
  },
  pro: {
    id: "deepseek-v4-pro",
    label: "deepseek-v4-pro",
    inputPer1M: 0.55,
    outputPer1M: 2.19,
    note: "thinking mode, reasoning_effort=high",
  },
} as const;

export type DeepSeekModelKey = keyof typeof DEEPSEEK_MODELS;

/** Format a model's per-1M pricing as "$0.27/$1.10". */
export function formatDeepSeekPrice(key: DeepSeekModelKey): string {
  const m = DEEPSEEK_MODELS[key];
  return `$${m.inputPer1M.toFixed(2)}/$${m.outputPer1M.toFixed(2)}`;
}
