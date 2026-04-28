/**
 * Opportunity classifier — structured extraction + fit scoring from raw_context.
 *
 * Speaks OpenAI-compatible chat completions over `LLM_BASE_URL`. Production
 * target is the `lead-gen-opportunity-llm` Cloudflare Worker
 * (Mistral-7B-Instruct-v0.2 + LoRA trained on opportunity gold labels).
 *
 * Env:
 *   LLM_BASE_URL           — e.g. https://lead-gen-opportunity-llm.<sub>.workers.dev/v1
 *   LLM_API_KEY            — bearer token (matches OPPORTUNITY_LLM_SHARED_SECRET on the Worker)
 *   LLM_MODEL_OPPORTUNITY  — override model name (defaults to mistral-opportunity-lora)
 */

import OpenAI from "openai";

export type Seniority = "junior" | "mid" | "senior" | "staff" | "principal";
export type RemotePolicy = "remote-global" | "remote-regional" | "hybrid" | "onsite";

export interface OpportunityClassification {
  score: number; // 0-100
  tags: string[];
  seniority: Seniority;
  tech_stack: string[];
  remote_policy: RemotePolicy;
  reward_usd: number | null;
  tldr: string;
}

const OPPORTUNITY_SYSTEM_PROMPT = `You analyze job descriptions for a senior AI engineer focused on fully remote worldwide roles. Extract structured fields and score the role's fit (0-100).

Fit rubric (target profile: senior AI/ML engineer, remote-global):
- 90-100: Senior+ AI/ML, fully remote worldwide, strong stack match
- 70-89:  AI/ML but regional-remote, or senior non-AI remote-global
- 40-69:  Adjacent (data, MLOps, AI-curious backend), partial remote
- 0-39:   Onsite, junior, or unrelated domain

Tags: short lowercase kebab-case strings. Include at least one of {ai, ml, llm, data, backend, frontend, devops}; at most one of {junior, mid, senior, staff, principal}; one of {remote-global, remote-regional, hybrid, onsite}. Optional: languages/frameworks (rust, python, pytorch, etc.).

Output schema (STRICT JSON, no markdown):
{"score": int, "tags": [str], "seniority": str, "tech_stack": [str], "remote_policy": str, "reward_usd": number|null, "tldr": str}`;

const SENIORITY_VALUES: readonly Seniority[] = ["junior", "mid", "senior", "staff", "principal"];
const REMOTE_POLICY_VALUES: readonly RemotePolicy[] = [
  "remote-global",
  "remote-regional",
  "hybrid",
  "onsite",
];

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function pickSeniority(s: unknown): Seniority {
  return SENIORITY_VALUES.includes(s as Seniority) ? (s as Seniority) : "mid";
}

function pickRemote(s: unknown): RemotePolicy {
  return REMOTE_POLICY_VALUES.includes(s as RemotePolicy) ? (s as RemotePolicy) : "onsite";
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);
}

export async function classifyOpportunityLLM(input: {
  title: string;
  rawContext: string;
  companyName?: string | null;
  location?: string | null;
  url?: string | null;
}): Promise<OpportunityClassification> {
  const url = process.env.LLM_BASE_URL;
  if (!url) throw new Error("LLM_BASE_URL not set");

  const client = new OpenAI({ apiKey: process.env.LLM_API_KEY ?? "local", baseURL: url });
  const model =
    process.env.LLM_MODEL_OPPORTUNITY ??
    process.env.LLM_MODEL ??
    "mistral-opportunity-lora";

  const userMsg = [
    `Title: ${input.title}`,
    `Company: ${input.companyName || "Unknown"}`,
    `Location: ${input.location || "Unknown"}`,
    `URL: ${input.url || "N/A"}`,
    `Description: ${input.rawContext.slice(0, 4000)}`,
  ].join("\n");

  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: OPPORTUNITY_SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
     
    response_format: { type: "json_object" } as any,
    temperature: 0.1,
    max_tokens: 512,
  });

  const raw = res.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const rewardRaw = parsed.reward_usd;
  const reward: number | null =
    typeof rewardRaw === "number" && Number.isFinite(rewardRaw) ? rewardRaw : null;

  const tldrRaw = typeof parsed.tldr === "string" ? parsed.tldr : "";

  return {
    score: clampScore(parsed.score),
    tags: asStringArray(parsed.tags),
    seniority: pickSeniority(parsed.seniority),
    tech_stack: asStringArray(parsed.tech_stack),
    remote_policy: pickRemote(parsed.remote_policy),
    reward_usd: reward,
    tldr: tldrRaw.slice(0, 200),
  };
}
