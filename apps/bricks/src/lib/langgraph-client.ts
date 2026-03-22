const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:2025";

export async function runGraphAndWait(
  graphName: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${LANGGRAPH_URL}/runs/wait`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assistant_id: graphName,
      input,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LangGraph ${graphName} failed (${response.status}): ${text}`);
  }
  return await response.json();
}
