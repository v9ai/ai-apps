import { fetchJsonWithRetry } from "./retry";
import type { OpenAlexSearchResponse, OpenAlexWork } from "./types";

const DEFAULT_BASE_URL = "https://api.openalex.org";

export interface OpenAlexClientOptions {
  /** Polite pool — email address sent via User-Agent / mailto param. */
  mailto?: string;
  baseUrl?: string;
}

export class OpenAlexClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly mailto?: string;

  constructor(options: OpenAlexClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.mailto = options.mailto;
    this.userAgent = options.mailto
      ? `research-ts/0.1 (mailto:${options.mailto})`
      : "research-ts/0.1";
  }

  private get headers(): Record<string, string> {
    return { "User-Agent": this.userAgent };
  }

  async search(query: string, page = 1, perPage = 25): Promise<OpenAlexSearchResponse> {
    return this.searchFiltered(query, undefined, page, perPage);
  }

  async searchFiltered(
    query: string,
    fromPublicationDate?: string,
    page = 1,
    perPage = 25,
  ): Promise<OpenAlexSearchResponse> {
    const params: Record<string, string | number | undefined> = {
      search: query,
      page,
      per_page: perPage,
      mailto: this.mailto,
    };
    if (fromPublicationDate) {
      params.filter = `from_publication_date:${fromPublicationDate}`;
    }
    return fetchJsonWithRetry<OpenAlexSearchResponse>(
      `${this.baseUrl}/works`,
      { params, headers: this.headers, apiName: "OpenAlex" },
    );
  }

  async getWork(id: string): Promise<OpenAlexWork> {
    return fetchJsonWithRetry<OpenAlexWork>(
      `${this.baseUrl}/works/${encodeURIComponent(id)}`,
      { headers: this.headers, apiName: "OpenAlex" },
    );
  }

  /** Find papers affiliated with a given institution (raw affiliation string search). */
  async searchByAffiliation(
    companyName: string,
    page = 1,
    perPage = 25,
  ): Promise<OpenAlexSearchResponse> {
    return fetchJsonWithRetry<OpenAlexSearchResponse>(
      `${this.baseUrl}/works`,
      {
        params: {
          filter: `raw_affiliation_strings.search:${companyName}`,
          page,
          per_page: perPage,
          mailto: this.mailto,
        },
        headers: this.headers,
        apiName: "OpenAlex",
      },
    );
  }

  async searchByAuthorName(
    authorName: string,
    page = 1,
    perPage = 25,
  ): Promise<OpenAlexSearchResponse> {
    return fetchJsonWithRetry<OpenAlexSearchResponse>(
      `${this.baseUrl}/works`,
      {
        params: {
          filter: `raw_author_name.search:${authorName}`,
          page,
          per_page: perPage,
          mailto: this.mailto,
        },
        headers: this.headers,
        apiName: "OpenAlex",
      },
    );
  }
}
