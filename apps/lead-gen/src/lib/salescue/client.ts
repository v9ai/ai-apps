/**
 * HTTP client for the SalesCue Python service.
 *
 * Reads SALESCUE_URL from env (default: http://localhost:8000).
 * Each method maps 1:1 to a FastAPI endpoint in salescue/server.py.
 */

import type {
  AnalyzeResponse,
  AnomalyResult,
  BanditResult,
  CallResult,
  EmailgenResult,
  EntitiesResult,
  GraphResult,
  HealthResponse,
  ICPResult,
  IntentResult,
  ModuleName,
  ModuleResponse,
  ObjectionResult,
  ReplyResult,
  ScoreResult,
  SentimentResult,
  SkillsResult,
  SpamResult,
  SubjectResult,
  SurvivalResult,
  TriggersResult,
} from "./types";

const BASE_URL =
  process.env.SALESCUE_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`SalesCue ${path} failed (${res.status}): ${detail}`);
  }

  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);

  if (!res.ok) {
    throw new Error(`SalesCue ${path} failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

// ── Individual modules ──────────────────────────────────────────────────────

export async function score(text: string) {
  return post<ModuleResponse<ScoreResult>>("/score", { text });
}

export async function intent(
  text: string,
  eventHistory?: Array<{ embed: number[]; days: number; type: string }>,
) {
  return post<ModuleResponse<IntentResult>>("/intent", {
    text,
    event_history: eventHistory,
  });
}

export async function reply(text: string, touchpoint?: number) {
  return post<ModuleResponse<ReplyResult>>("/reply", { text, touchpoint });
}

export async function sentiment(text: string) {
  return post<ModuleResponse<SentimentResult>>("/sentiment", { text });
}

export async function triggers(text: string) {
  return post<ModuleResponse<TriggersResult>>("/triggers", { text });
}

export async function icp(icpDescription: string, prospect: string) {
  return post<ModuleResponse<ICPResult>>("/icp", {
    icp: icpDescription,
    prospect,
  });
}

export async function spam(text: string) {
  return post<ModuleResponse<SpamResult>>("/spam", { text });
}

export async function objection(text: string) {
  return post<ModuleResponse<ObjectionResult>>("/objection", { text });
}

export async function entities(text: string) {
  return post<ModuleResponse<EntitiesResult>>("/entities", { text });
}

export async function subject(subjects: string[]) {
  return post<ModuleResponse<SubjectResult>>("/subject", { subjects });
}

export async function survival(
  text: string,
  structuredFeatures?: number[],
) {
  return post<ModuleResponse<SurvivalResult>>("/survival", {
    text,
    structured_features: structuredFeatures,
  });
}

export async function bandit(
  text: string,
  structuredFeatures?: number[],
) {
  return post<ModuleResponse<BanditResult>>("/bandit", {
    text,
    structured_features: structuredFeatures,
  });
}

export async function banditUpdate(
  text: string,
  armIndex: number,
  reward: number,
  structuredFeatures?: number[],
) {
  return post<{ status: string; arm_index: number; reward: number }>(
    "/bandit/update",
    {
      text,
      arm_index: armIndex,
      reward,
      structured_features: structuredFeatures,
    },
  );
}

export async function call(
  transcript: Array<{ text: string; speaker: string }>,
) {
  return post<ModuleResponse<CallResult>>("/call", { transcript });
}

export async function anomaly(
  text: string,
  signals: Record<string, number[]>,
) {
  return post<ModuleResponse<AnomalyResult>>("/anomaly", { text, signals });
}

export async function emailgen(
  text: string,
  emailType?: string,
  context?: Record<string, string>,
) {
  return post<ModuleResponse<EmailgenResult>>("/emailgen", {
    text,
    email_type: emailType,
    context,
  });
}

export async function skills(
  text: string,
  topK?: number,
  threshold?: number,
) {
  return post<ModuleResponse<SkillsResult>>("/skills", {
    text,
    top_k: topK,
    threshold,
  });
}

export async function graph(
  text: string,
  graphData?: {
    nodes: Array<{
      name?: string;
      text?: string;
      embedding?: number[];
      features?: number[];
    }>;
    edges: Array<[number, number, string]>;
    target_idx: number;
  },
) {
  return post<ModuleResponse<GraphResult>>("/graph", {
    text,
    graph: graphData,
  });
}

// ── Batch analysis ──────────────────────────────────────────────────────────

export async function analyze(text: string, modules?: ModuleName[]) {
  return post<AnalyzeResponse>("/analyze", { text, modules });
}

// ── Health check ────────────────────────────────────────────────────────────

export async function health() {
  return get<HealthResponse>("/health");
}

// ── Default export ──────────────────────────────────────────────────────────

export const salescue = {
  score,
  intent,
  reply,
  sentiment,
  triggers,
  icp,
  spam,
  objection,
  entities,
  subject,
  survival,
  bandit,
  banditUpdate,
  call,
  anomaly,
  emailgen,
  graph,
  skills,
  analyze,
  health,
} as const;
