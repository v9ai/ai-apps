/**
 * Thin LangGraph backend client — replicates the helpers from
 * `apps/lead-gen/src/lib/langgraph-client.ts` that intel-run kickoffs need.
 *
 * Talks to the existing CF Container backend at `LANGGRAPH_URL`. Optional
 * bearer token authentication via `LANGGRAPH_AUTH_TOKEN`.
 */

export interface LangGraphEnv {
  LANGGRAPH_URL: string;
  LANGGRAPH_AUTH_TOKEN?: string;
  PRODUCT_INTEL_GRAPH_VERSION?: string;
  GATEWAY_URL: string;
  GATEWAY_HMAC: string;
}

export interface StartRunResult {
  appRunId: string;
  lgRunId: string;
  threadId: string;
  webhookSecret: string;
}

export function productIntelAssistantId(env: LangGraphEnv): string {
  const v = (env.PRODUCT_INTEL_GRAPH_VERSION ?? "v1").toLowerCase();
  return v === "v2" ? "analyze_product_v2" : "product_intel";
}

async function lgFetch(
  env: LangGraphEnv,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers ?? {}) as Record<string, string>),
  };
  if (env.LANGGRAPH_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${env.LANGGRAPH_AUTH_TOKEN}`;
  }
  return fetch(`${env.LANGGRAPH_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });
}

/**
 * Kicks off a background LangGraph run. The graph's `notify_complete` node
 * later POSTs to `${GATEWAY_URL}/internal/run-finished` with HMAC=GATEWAY_HMAC.
 */
export async function startGraphRun(
  env: LangGraphEnv,
  assistantId: string,
  input: Record<string, unknown>,
  options: { resumeThreadId?: string | null } = {},
): Promise<StartRunResult> {
  const gatewayUrl = env.GATEWAY_URL.replace(/\/$/, "");

  const appRunId = crypto.randomUUID();
  // Per-run token kept for the legacy webhook_secret column (NOT NULL in DB).
  // The actual completion HMAC uses the global GATEWAY_HMAC.
  const webhookSecret = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

  let threadId: string;
  if (options.resumeThreadId) {
    threadId = options.resumeThreadId;
  } else {
    const threadRes = await lgFetch(env, "/threads", {
      method: "POST",
      body: JSON.stringify({
        metadata: { app_run_id: appRunId, kind: assistantId },
      }),
    });
    if (!threadRes.ok) {
      const text = await threadRes.text().catch(() => "");
      throw new Error(`LangGraph thread create failed (${threadRes.status}): ${text}`);
    }
    const threadBody = (await threadRes.json()) as { thread_id: string };
    threadId = threadBody.thread_id;
  }

  const runRes = await lgFetch(env, `/threads/${threadId}/runs`, {
    method: "POST",
    body: JSON.stringify({
      assistant_id: assistantId,
      input: {
        ...input,
        webhook_url: `${gatewayUrl}/internal/run-finished`,
        webhook_secret: env.GATEWAY_HMAC,
        app_run_id: appRunId,
      },
      multitask_strategy: "enqueue",
    }),
  });
  if (!runRes.ok) {
    const text = await runRes.text().catch(() => "");
    throw new Error(`LangGraph run create failed (${runRes.status}): ${text}`);
  }
  const runBody = (await runRes.json()) as { run_id: string };

  return { appRunId, lgRunId: runBody.run_id, threadId, webhookSecret };
}

/**
 * Reconcile a run's state directly from LangGraph. Used when the webhook is
 * unusually delayed or dropped.
 */
export async function getRunStatus(
  env: LangGraphEnv,
  threadId: string,
  lgRunId: string,
): Promise<{ status: string; output?: Record<string, unknown> }> {
  try {
    const res = await lgFetch(env, `/threads/${threadId}/runs/${lgRunId}`, {
      method: "GET",
    });
    if (!res.ok) return { status: "unknown" };
    return (await res.json()) as {
      status: string;
      output?: Record<string, unknown>;
    };
  } catch {
    return { status: "unknown" };
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}
