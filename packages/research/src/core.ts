import { fetchJsonWithRetry } from "./retry";
import type { CoreSearchResponse, CoreWork } from "./types";

const DEFAULT_BASE_URL = "https://api.core.ac.uk/v3";

export interface CoreClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

export class CoreClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(options: CoreClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.headers = {};
    if (options.apiKey) this.headers.Authorization = `Bearer ${options.apiKey}`;
  }

  async search(query: string, limit = 25, offset = 0): Promise<CoreSearchResponse> {
    return fetchJsonWithRetry<CoreSearchResponse>(`${this.baseUrl}/search/works/`, {
      params: { q: query, limit, offset },
      headers: this.headers,
      apiName: "CORE",
      retry: { baseDelayMs: 2000 },
    });
  }

  async getWork(id: string): Promise<CoreWork> {
    return fetchJsonWithRetry<CoreWork>(`${this.baseUrl}/works/${encodeURIComponent(id)}`, {
      headers: this.headers,
      apiName: "CORE",
      retry: { baseDelayMs: 2000 },
    });
  }
}
