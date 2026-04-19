import { fetchJsonWithRetry } from "./retry";
import type { CrossrefResponse, CrossrefWork } from "./types";

const DEFAULT_BASE_URL = "https://api.crossref.org";

export interface CrossrefClientOptions {
  mailto?: string;
  baseUrl?: string;
}

export class CrossrefClient {
  private readonly baseUrl: string;
  private readonly mailto?: string;
  private readonly userAgent: string;

  constructor(options: CrossrefClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.mailto = options.mailto;
    this.userAgent = options.mailto
      ? `research-ts/0.1 (mailto:${options.mailto})`
      : "research-ts/0.1";
  }

  private get headers(): Record<string, string> {
    return { "User-Agent": this.userAgent };
  }

  async search(query: string, rows = 20, offset = 0): Promise<CrossrefResponse> {
    return this.searchFiltered(query, undefined, rows, offset);
  }

  async searchFiltered(
    query: string,
    fromPubDate?: string,
    rows = 20,
    offset = 0,
  ): Promise<CrossrefResponse> {
    const params: Record<string, string | number | undefined> = {
      query,
      rows,
      offset,
      mailto: this.mailto,
    };
    if (fromPubDate) params.filter = `from-pub-date:${fromPubDate}`;
    return fetchJsonWithRetry<CrossrefResponse>(`${this.baseUrl}/works`, {
      params,
      headers: this.headers,
      apiName: "Crossref",
    });
  }

  async getWork(doi: string): Promise<CrossrefWork> {
    const resp = await fetchJsonWithRetry<{ message: CrossrefWork }>(
      `${this.baseUrl}/works/${encodeURIComponent(doi)}`,
      { headers: this.headers, apiName: "Crossref" },
    );
    return resp.message;
  }
}
