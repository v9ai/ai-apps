/**
 * Typed fetch wrapper for the merged Python backend (research-thera + healthcare).
 *
 * The healthcare routers (`/upload`, `/embed/*`, `/search/*`, `/chat`) are mounted
 * inside the same FastAPI process that serves the LangGraph endpoints. Default URL
 * is the local dev port (2024); override with HEALTHCARE_BACKEND_URL in production.
 */

const BACKEND_URL =
  process.env.HEALTHCARE_BACKEND_URL ??
  process.env.PYTHON_API_URL ??
  "http://localhost:2024";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

function headers(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (INTERNAL_API_KEY) h["x-api-key"] = INTERNAL_API_KEY;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatResponse = {
  answer: string;
  intent: string;
  intentConfidence: number;
  retrievalSources: string[];
  rerankScores: number[];
  guardPassed: boolean;
  guardIssues: string[];
  citations: string[];
};

export async function sendHealthcareChat(
  messages: ChatTurn[],
  userId: string,
): Promise<ChatResponse> {
  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ messages, user_id: userId }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`Healthcare /chat failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as {
    answer: string;
    intent: string;
    intent_confidence: number;
    retrieval_sources: string[];
    rerank_scores?: number[];
    guard_passed: boolean;
    guard_issues: string[];
    citations: string[];
  };
  return {
    answer: data.answer ?? "",
    intent: data.intent ?? "",
    intentConfidence: data.intent_confidence ?? 0,
    retrievalSources: data.retrieval_sources ?? [],
    rerankScores: data.rerank_scores ?? [],
    guardPassed: data.guard_passed ?? true,
    guardIssues: data.guard_issues ?? [],
    citations: data.citations ?? [],
  };
}
