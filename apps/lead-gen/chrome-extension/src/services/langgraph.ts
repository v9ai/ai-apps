// ── LangGraph client (chrome extension) ──────────────────────────────
//
// Thin wrapper around POST {LANGGRAPH_URL}/runs/wait. Mirrors the Next.js
// helper at apps/lead-gen/src/lib/langgraph-client.ts but lives in the
// extension because we kick off graphs from the background service worker
// after profile scrapes.
//
// Env:
//   VITE_LANGGRAPH_URL         Base URL of the langgraph runtime (defaults
//                              to http://127.0.0.1:8002 for local `pnpm backend-dev`).
//   VITE_LANGGRAPH_AUTH_TOKEN  Bearer token; required when the backend has
//                              LANGGRAPH_AUTH_TOKEN set (HF Spaces / tunnel).

const BASE_URL =
  (import.meta.env.VITE_LANGGRAPH_URL as string | undefined) ??
  "http://127.0.0.1:8002";
const TOKEN = (import.meta.env.VITE_LANGGRAPH_AUTH_TOKEN as string | undefined) ?? "";

export interface RunGraphOptions {
  assistantId: string;
  input: Record<string, unknown>;
  timeoutMs?: number;
}

export interface RunGraphResult<T = Record<string, unknown>> {
  ok: boolean;
  output?: T;
  error?: string;
  status?: number;
}

export async function runGraph<T = Record<string, unknown>>(
  opts: RunGraphOptions,
): Promise<RunGraphResult<T>> {
  const { assistantId, input, timeoutMs = 90_000 } = opts;
  const url = `${BASE_URL.replace(/\/$/, "")}/runs/wait`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ assistant_id: assistantId, input }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: `langgraph ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, output: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `langgraph fetch failed: ${message}` };
  } finally {
    clearTimeout(timeout);
  }
}
