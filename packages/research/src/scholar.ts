import { fetchJsonWithRetry } from "./retry";
import type { ScholarPaper, ScholarSearchResponse } from "./types";

const DEFAULT_BASE_URL = "https://api.semanticscholar.org";

export const SCHOLAR_SEARCH_FIELDS =
  "paperId,title,abstract,year,citationCount,openAccessPdf,authors,fieldsOfStudy,url,publicationDate,isOpenAccess,venue";

export const SCHOLAR_PAPER_FIELDS_FULL =
  "paperId,title,abstract,year,citationCount,influentialCitationCount,tldr,openAccessPdf,authors,fieldsOfStudy,url,publicationDate,isOpenAccess,venue";

export const SCHOLAR_PAPER_FIELDS_BRIEF = "paperId,title,year,citationCount,authors,url";

export interface SemanticScholarClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

export class SemanticScholarClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(options: SemanticScholarClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.headers = {};
    if (options.apiKey) this.headers["x-api-key"] = options.apiKey;
  }

  /** Relevance-ranked search (max 1000 results). */
  async search(
    query: string,
    fields: string = SCHOLAR_SEARCH_FIELDS,
    limit = 20,
    offset = 0,
  ): Promise<ScholarSearchResponse> {
    return fetchJsonWithRetry<ScholarSearchResponse>(
      `${this.baseUrl}/graph/v1/paper/search`,
      {
        params: { query, fields, limit, offset },
        headers: this.headers,
        apiName: "SemanticScholar",
        retry: { retryOnServerError: false },
      },
    );
  }

  /** Bulk keyword search — up to 10M results, advanced query syntax. */
  async searchBulk(
    query: string,
    opts: {
      fields?: string;
      year?: string;
      minCitations?: number;
      sort?: string;
      limit?: number;
    } = {},
  ): Promise<{ total?: number; token?: string; data: ScholarPaper[] }> {
    return fetchJsonWithRetry(
      `${this.baseUrl}/graph/v1/paper/search/bulk`,
      {
        params: {
          query,
          fields: opts.fields ?? SCHOLAR_SEARCH_FIELDS,
          limit: opts.limit ?? 100,
          year: opts.year,
          minCitationCount: opts.minCitations,
          sort: opts.sort,
        },
        headers: this.headers,
        apiName: "SemanticScholar",
        retry: { retryOnServerError: false },
      },
    );
  }

  /** Full details for a paper by ID (S2/DOI/arXiv/PMID/ACL). */
  async getPaper(paperId: string, fields: string = SCHOLAR_PAPER_FIELDS_FULL): Promise<ScholarPaper> {
    return fetchJsonWithRetry<ScholarPaper>(
      `${this.baseUrl}/graph/v1/paper/${encodeURIComponent(paperId)}`,
      {
        params: { fields },
        headers: this.headers,
        apiName: "SemanticScholar",
        retry: { retryOnServerError: false },
      },
    );
  }

  /** Forward citations — papers citing this one. */
  async getCitations(
    paperId: string,
    fields: string = SCHOLAR_PAPER_FIELDS_BRIEF,
    limit = 100,
  ): Promise<{ data: { citingPaper?: ScholarPaper }[] }> {
    return fetchJsonWithRetry(
      `${this.baseUrl}/graph/v1/paper/${encodeURIComponent(paperId)}/citations`,
      {
        params: { fields, limit },
        headers: this.headers,
        apiName: "SemanticScholar",
        retry: { retryOnServerError: false },
      },
    );
  }

  /** Backward citations — papers this one references. */
  async getReferences(
    paperId: string,
    fields: string = SCHOLAR_PAPER_FIELDS_BRIEF,
    limit = 100,
  ): Promise<{ data: { citedPaper?: ScholarPaper }[] }> {
    return fetchJsonWithRetry(
      `${this.baseUrl}/graph/v1/paper/${encodeURIComponent(paperId)}/references`,
      {
        params: { fields, limit },
        headers: this.headers,
        apiName: "SemanticScholar",
        retry: { retryOnServerError: false },
      },
    );
  }

  /** Recommendations API — SPECTER2-based similar papers. */
  async getRecommendations(
    paperId: string,
    fields: string = SCHOLAR_PAPER_FIELDS_BRIEF,
    limit = 20,
  ): Promise<{ recommendedPapers: ScholarPaper[] }> {
    return fetchJsonWithRetry(
      `${this.baseUrl}/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}`,
      {
        params: { fields, limit },
        headers: this.headers,
        apiName: "SemanticScholar",
        retry: { retryOnServerError: false },
      },
    );
  }
}
