import { fetchJsonWithRetry } from "./retry";
import { normalizeDoi } from "./text";
import type { EuropePmcResponse, EuropePmcResult, PaperCandidate } from "./types";

const DEFAULT_BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest";

export interface EuropePmcClientOptions {
  baseUrl?: string;
}

export class EuropePmcClient {
  private readonly baseUrl: string;

  constructor(options: EuropePmcClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async search(query: string, pageSize = 10): Promise<PaperCandidate[]> {
    const resp = await fetchJsonWithRetry<EuropePmcResponse>(
      `${this.baseUrl}/search`,
      {
        params: { query, pageSize, format: "json" },
        apiName: "EuropePMC",
      },
    );
    return (resp.resultList?.result ?? []).map(toCandidate);
  }
}

function toCandidate(r: EuropePmcResult): PaperCandidate {
  const doi = normalizeDoi(r.doi);
  const year = r.pubYear ? Number(r.pubYear) : undefined;
  const url = doi
    ? `https://doi.org/${doi}`
    : r.pmid
      ? `https://europepmc.org/article/MED/${r.pmid}`
      : undefined;
  return {
    title: r.title ?? "Untitled",
    doi,
    url,
    year: Number.isFinite(year) ? year : undefined,
    source: "europepmc",
    authors: r.authorString ? r.authorString.split(", ").filter(Boolean) : [],
    abstract: r.abstractText,
    journal: r.journalTitle,
  };
}

export async function searchEuropePmc(
  query: string,
  limit = 10,
): Promise<PaperCandidate[]> {
  try {
    return await new EuropePmcClient().search(query, limit);
  } catch (err) {
    console.error("[EuropePMC] search failed:", err);
    return [];
  }
}
