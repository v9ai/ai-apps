// LangGraph HTTP trigger client for the lead-gen backend.
//
// Thin wrapper around the standard LangGraph REST API (`POST /runs/wait`)
// exposed by `langgraph dev` (local, port 8002) or the HF / CF Containers
// runtime. Any consumer app (lead-gen, knowledge, ...) can invoke the
// registered graphs by passing its own URL + optional bearer token.

export interface TriggerConfig {
  url: string;
  authToken?: string;
  defaultTimeoutMs?: number;
}

export interface RunOptions {
  timeoutMs?: number;
}

export async function runGraph<T = unknown>(
  config: TriggerConfig,
  assistantId: string,
  input: Record<string, unknown>,
  options: RunOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }
  const res = await fetch(`${config.url.replace(/\/$/, "")}/runs/wait`, {
    method: "POST",
    headers,
    body: JSON.stringify({ assistant_id: assistantId, input }),
    signal: AbortSignal.timeout(
      options.timeoutMs ?? config.defaultTimeoutMs ?? 120_000,
    ),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LangGraph ${assistantId} failed (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  return (await res.json()) as T;
}

export interface EnrichCompanyResult {
  success: boolean;
  company_id?: number;
  company_key?: string;
  score?: number;
  ai_tier?: number;
  category?: string;
}

export interface AnalyzeCompanyResult {
  success: boolean;
  deep_analysis?: string;
  analysis_id?: number;
}

export interface DiscoverContactsResult {
  success: boolean;
  contacts_added?: number;
}

export interface DeepScrapeResult {
  success: boolean;
  url?: string;
  pages?: string[];
  emails?: string[];
}

export function createTriggerClient(config: TriggerConfig) {
  return {
    runGraph: <T = unknown>(
      assistantId: string,
      input: Record<string, unknown>,
      options?: RunOptions,
    ) => runGraph<T>(config, assistantId, input, options),

    enrichCompany: (input: { key: string; force?: boolean }) =>
      runGraph<EnrichCompanyResult>(config, "company_enrichment", input),

    analyzeCompany: (input: { key: string }) =>
      runGraph<AnalyzeCompanyResult>(config, "analyze_product_v2", input),

    discoverContacts: (input: { company_id: number }) =>
      runGraph<DiscoverContactsResult>(config, "contact_enrich", input),

    deepScrape: (input: { url: string; company_id?: number }) =>
      runGraph<DeepScrapeResult>(config, "deep_scrape", input, {
        timeoutMs: 300_000,
      }),
  };
}

export type TriggerClient = ReturnType<typeof createTriggerClient>;
