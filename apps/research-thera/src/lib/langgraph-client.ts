/**
 * Lightweight LangGraph HTTP client — calls the Python LangGraph server's
 * `/runs/wait` endpoint. One server hosts all graphs (research, story, tts,
 * deep_analysis, parent_advice, habits, books).
 *
 * LangGraph is Python-only in this project; there is no `@langchain/langgraph`
 * JS dependency. This file is the sole TS keep-alive — a thin fetch wrapper.
 */

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://localhost:2024";

export interface LangGraphRunOptions {
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
}

/**
 * Run a LangGraph workflow on the Python server and wait for the result.
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
