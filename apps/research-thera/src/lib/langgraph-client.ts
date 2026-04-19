/**
 * Lightweight LangGraph HTTP client — replaces @langchain/langgraph-sdk
 *
 * Calls the Mastra Worker's /runs/wait endpoint (LangGraph-compatible shim).
 *
 * The Mastra deployment is split into two Cloudflare Workers to fit under
 * the per-Worker size cap:
 *   - core  (5 workflows: habits, parent_advice, deep_analysis, story, research)
 *   - tts   (1 workflow with @aws-sdk/client-s3 for R2 upload)
 *
 * Dispatch happens client-side here: `assistant_id` → Worker URL.
 */

const TTS_WORKFLOWS = new Set<string>(["tts"]);

const LEGACY = process.env.LANGGRAPH_URL;
const LANGGRAPH_URL_CORE =
  process.env.LANGGRAPH_URL_CORE || LEGACY || "http://127.0.0.1:2024";
const LANGGRAPH_URL_TTS =
  process.env.LANGGRAPH_URL_TTS || LEGACY || "http://127.0.0.1:2024";

export function urlForGraph(graphName: string): string {
  return TTS_WORKFLOWS.has(graphName) ? LANGGRAPH_URL_TTS : LANGGRAPH_URL_CORE;
}

export interface LangGraphRunOptions {
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
}

/**
 * Run a LangGraph-compatible workflow and wait for the result.
 *
 * Equivalent to `new Client({ apiUrl }).runs.wait(null, graphName, { input })`.
 */
export async function runGraphAndWait(
  graphName: string,
  options: LangGraphRunOptions,
  baseUrl: string = urlForGraph(graphName),
): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl}/runs/wait`, {
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
