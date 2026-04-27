/**
 * Shared helpers for intent-signal detectors.
 *
 * Used by:
 *   scripts/detect-intent-signals.ts        (snapshots + facts + Neon linkedin_posts)
 *   scripts/detect-intent-from-posts.ts     (D1 posts, posts-first)
 */

export const VALID_SIGNAL_TYPES = new Set([
  "hiring_intent",
  "tech_adoption",
  "growth_signal",
  "budget_cycle",
  "leadership_change",
  "product_launch",
]);

export const INTENT_WEIGHTS: Record<string, number> = {
  hiring_intent: 30,
  tech_adoption: 20,
  growth_signal: 25,
  budget_cycle: 15,
  leadership_change: 5,
  product_launch: 5,
  competitor_mention: 40,
};

export interface DetectedSignal {
  signal_type: string;
  confidence: number;
  evidence: string[];
  decay_days: number;
}

export interface ScoreableSignal {
  signal_type: string;
  confidence: number;
  detected_at: string;
  decay_days: number;
}

export function computeFreshness(detectedAt: string, decayDays: number): number {
  const daysSince =
    (Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (decayDays <= 0) return 0;
  const k = 0.693 / decayDays;
  return Math.exp(-k * daysSince);
}

export function computeIntentScore(signals: ScoreableSignal[]): number {
  if (signals.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [signalType, weight] of Object.entries(INTENT_WEIGHTS)) {
    const best = signals
      .filter((s) => s.signal_type === signalType)
      .reduce((max, s) => {
        const f = computeFreshness(s.detected_at, s.decay_days);
        return Math.max(max, s.confidence * f);
      }, 0);

    weightedSum += best * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
}

export function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  return s.trim();
}

export interface LLMOptions {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? "http://localhost:8080/v1";
const DEFAULT_LLM_MODEL =
  process.env.LLM_MODEL ?? "mlx-community/Qwen2.5-3B-Instruct-4bit";

export async function callLocalLLM(
  systemPrompt: string,
  userText: string,
  opts: LLMOptions = {},
): Promise<string> {
  const baseUrl = opts.baseUrl ?? DEFAULT_LLM_BASE_URL;
  const model = opts.model ?? DEFAULT_LLM_MODEL;

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      temperature: opts.temperature ?? 0.1,
      max_tokens: opts.maxTokens ?? 1024,
    }),
  });

  if (!resp.ok) {
    throw new Error(`LLM API ${resp.status}: ${await resp.text()}`);
  }

  const body = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return body.choices[0]?.message?.content ?? "";
}

export async function ensureLLMReachable(baseUrl?: string): Promise<void> {
  const url = baseUrl ?? DEFAULT_LLM_BASE_URL;
  const r = await fetch(`${url}/models`);
  if (!r.ok) throw new Error(`LLM not reachable at ${url} (HTTP ${r.status})`);
}
