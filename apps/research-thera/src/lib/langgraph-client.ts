/**
 * Lightweight LangGraph HTTP client — calls the Python LangGraph server's
 * `/runs/wait` endpoint for blocking runs, and `/threads` + `/threads/{id}/runs`
 * for fire-and-forget background runs whose progress is polled separately.
 *
 * LangGraph is Python-only in this project; there is no `@langchain/langgraph`
 * JS dependency. This file is the sole TS keep-alive — a thin fetch wrapper.
 */

const LANGGRAPH_URL = (process.env.LANGGRAPH_URL || "http://localhost:2024").trim();

function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export class LangGraphHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "LangGraphHttpError";
  }
}

export interface LangGraphRunOptions {
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
}

/**
 * Run a LangGraph workflow on the Python server and wait for the result.
 * Use for graphs that complete within Vercel's function maxDuration.
 */
export async function runGraphAndWait(
  graphName: string,
  options: LangGraphRunOptions,
  baseUrl: string = LANGGRAPH_URL,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${normalizeBase(baseUrl)}/runs/wait`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assistant_id: graphName,
      input: options.input,
      config: options.config,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LangGraph ${graphName} failed (${response.status}): ${text}`);
  }

  return await response.json();
}

export interface BackgroundRun {
  threadId: string;
  runId: string;
}

/**
 * Start a LangGraph run in the background. Returns immediately with IDs
 * for later polling. Graph can run as long as it needs.
 */
export async function startGraphRun(
  graphName: string,
  options: LangGraphRunOptions,
  baseUrl: string = LANGGRAPH_URL,
): Promise<BackgroundRun> {
  const base = normalizeBase(baseUrl);

  // 1. Create a thread to host the run.
  const threadRes = await fetch(`${base}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!threadRes.ok) {
    const text = await threadRes.text().catch(() => "");
    throw new Error(`LangGraph POST /threads failed (${threadRes.status}): ${text}`);
  }
  const thread = (await threadRes.json()) as { thread_id: string };

  // 2. Kick off the run. Server returns immediately; run executes in background.
  const runRes = await fetch(`${base}/threads/${thread.thread_id}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assistant_id: graphName,
      input: options.input,
      config: options.config,
    }),
  });
  if (!runRes.ok) {
    const text = await runRes.text().catch(() => "");
    throw new Error(
      `LangGraph POST /threads/${thread.thread_id}/runs failed (${runRes.status}): ${text}`,
    );
  }
  const run = (await runRes.json()) as { run_id: string };

  return { threadId: thread.thread_id, runId: run.run_id };
}

export type LangGraphRunStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "interrupted"
  | "timeout"
  | "unknown";

export interface RunStatus {
  status: LangGraphRunStatus;
  raw: Record<string, unknown>;
}

export async function getGraphRunStatus(
  threadId: string,
  runId: string,
  baseUrl: string = LANGGRAPH_URL,
): Promise<RunStatus> {
  const res = await fetch(`${normalizeBase(baseUrl)}/threads/${threadId}/runs/${runId}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LangGraphHttpError(
      res.status,
      `LangGraph GET run status failed (${res.status}): ${text}`,
    );
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const rawStatus = typeof raw.status === "string" ? (raw.status as string).toLowerCase() : "unknown";
  const KNOWN: readonly LangGraphRunStatus[] = [
    "pending",
    "running",
    "success",
    "error",
    "interrupted",
    "timeout",
  ];
  const status: LangGraphRunStatus = KNOWN.includes(rawStatus as LangGraphRunStatus)
    ? (rawStatus as LangGraphRunStatus)
    : "unknown";
  return { status, raw };
}

export async function getGraphState(
  threadId: string,
  baseUrl: string = LANGGRAPH_URL,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${normalizeBase(baseUrl)}/threads/${threadId}/state`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LangGraphHttpError(
      res.status,
      `LangGraph GET thread state failed (${res.status}): ${text}`,
    );
  }
  const raw = (await res.json()) as { values?: Record<string, unknown> };
  return raw.values ?? {};
}
