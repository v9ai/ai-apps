/**
 * Lightweight LangGraph HTTP client — replaces @langchain/langgraph-sdk
 *
 * Calls the Python LangGraph server's /runs/wait endpoint.
 */

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:2024";

export interface LangGraphRunOptions {
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
}

/**
 * Run a LangGraph graph and wait for the result.
 *
 * Equivalent to `new Client({ apiUrl }).runs.wait(null, graphName, { input })`.
 */
export async function runGraphAndWait(
  graphName: string,
  options: LangGraphRunOptions,
  baseUrl: string = LANGGRAPH_URL,
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
