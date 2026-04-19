import { fetchJsonWithRetry } from "./retry";
import type { ZenodoRecord, ZenodoSearchResponse } from "./types";

const DEFAULT_BASE_URL = "https://zenodo.org/api";

export interface ZenodoClientOptions {
  accessToken?: string;
  baseUrl?: string;
}

export class ZenodoClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(options: ZenodoClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.headers = { "User-Agent": "research-ts/0.1" };
    if (options.accessToken) {
      this.headers.Authorization = `Bearer ${options.accessToken}`;
    }
  }

  /** Search records. Supports Elasticsearch query syntax (title:"X", creators.name:Y). */
  async search(query: string, page = 1, size = 25): Promise<ZenodoSearchResponse> {
    return this.searchFiltered(query, undefined, undefined, page, size);
  }

  async searchFiltered(
    query: string,
    resourceType?: string,
    sort?: string,
    page = 1,
    size = 25,
  ): Promise<ZenodoSearchResponse> {
    return fetchJsonWithRetry<ZenodoSearchResponse>(`${this.baseUrl}/records`, {
      params: {
        q: query,
        page,
        size,
        type: resourceType,
        sort,
      },
      headers: this.headers,
      apiName: "Zenodo",
      retry: { baseDelayMs: 2000 },
    });
  }

  async getRecord(id: number): Promise<ZenodoRecord> {
    return fetchJsonWithRetry<ZenodoRecord>(`${this.baseUrl}/records/${id}`, {
      headers: this.headers,
      apiName: "Zenodo",
      retry: { baseDelayMs: 2000 },
    });
  }
}
