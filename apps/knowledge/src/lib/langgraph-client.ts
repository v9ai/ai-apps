/**
 * Typed HTTP client for the knowledge LangGraph backend.
 *
 * Calls the FastAPI harness at apps/knowledge/backend/app.py via POST /runs/wait.
 * Local dev: start the container or run `uvicorn app:app --port 7860` from
 * `apps/knowledge/backend/`. Point LANGGRAPH_URL at the deployed worker in prod.
 */

const LANGGRAPH_URL =
  process.env.LANGGRAPH_URL || "http://127.0.0.1:7860";

const LANGGRAPH_AUTH_TOKEN = process.env.LANGGRAPH_AUTH_TOKEN;

async function runGraph<T>(
  assistantId: string,
  input: Record<string, unknown>,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (LANGGRAPH_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${LANGGRAPH_AUTH_TOKEN}`;
  }
  const res = await fetch(`${LANGGRAPH_URL}/runs/wait`, {
    method: "POST",
    headers,
    body: JSON.stringify({ assistant_id: assistantId, input }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LangGraph ${assistantId} failed (${res.status}): ${text}`,
    );
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────

export interface ChatResult {
  response: string;
}

export interface TechBadge {
  tag: string;
  label: string;
  category: string;
  relevance: "primary" | "secondary";
}

export interface AppPrepResult {
  tech_stack: TechBadge[];
  interview_questions: string;
}

export interface MemorizeItemDetail {
  label: string;
  description: string;
}

export interface MemorizeItem {
  id: string;
  term: string;
  description: string;
  details: MemorizeItemDetail[];
  context?: string;
  relatedItems: string[];
  mnemonicHint?: string;
}

export interface MemorizeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: MemorizeItem[];
}

export interface MemorizeGenerateResult {
  categories: MemorizeCategory[];
}

// ── Typed wrappers ─────────────────────────────────────────

export function chat(input: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  contextSnippets?: string[];
}): Promise<ChatResult> {
  return runGraph<ChatResult>("chat", {
    message: input.message,
    history: input.history ?? [],
    context_snippets: input.contextSnippets ?? [],
  });
}

export function runAppPrep(input: {
  appId: string;
  jobDescription: string;
  company?: string;
  position?: string;
}): Promise<AppPrepResult> {
  return runGraph<AppPrepResult>(
    "app_prep",
    {
      app_id: input.appId,
      job_description: input.jobDescription,
      company: input.company ?? "",
      position: input.position ?? "",
    },
    { timeoutMs: 120_000 },
  );
}

export function runMemorizeGenerate(input: {
  company: string;
  position: string;
  techs: TechBadge[];
}): Promise<MemorizeGenerateResult> {
  return runGraph<MemorizeGenerateResult>(
    "memorize_generate",
    {
      company: input.company,
      position: input.position,
      techs: input.techs,
    },
    { timeoutMs: 180_000 },
  );
}
