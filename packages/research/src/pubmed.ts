import { fetchJsonWithRetry, fetchWithRetry } from "./retry";
import { normalizeDoi } from "./text";
import type {
  PaperCandidate,
  PubMedESearchResponse,
  PubMedESummaryResponse,
  PubMedSummary,
} from "./types";

const DEFAULT_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export interface PubMedClientOptions {
  /** NCBI API key — optional, raises rate limit from 3 to 10 req/sec. */
  apiKey?: string;
  /** Tool identifier sent with every request per NCBI policy. */
  tool?: string;
  /** Contact email sent with every request per NCBI policy. */
  email?: string;
  baseUrl?: string;
}

export class PubMedClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly tool: string;
  private readonly email?: string;

  constructor(options: PubMedClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.tool = options.tool ?? "research-ts";
    this.email = options.email;
  }

  private commonParams(): Record<string, string | undefined> {
    return {
      tool: this.tool,
      email: this.email,
      api_key: this.apiKey,
    };
  }

  async esearch(query: string, retmax = 10): Promise<string[]> {
    const resp = await fetchJsonWithRetry<PubMedESearchResponse>(
      `${this.baseUrl}/esearch.fcgi`,
      {
        params: {
          ...this.commonParams(),
          db: "pubmed",
          term: query,
          retmax,
          retmode: "json",
        },
        apiName: "PubMed",
      },
    );
    return resp.esearchresult?.idlist ?? [];
  }

  async esummary(ids: string[]): Promise<Record<string, PubMedSummary>> {
    if (ids.length === 0) return {};
    const resp = await fetchJsonWithRetry<PubMedESummaryResponse>(
      `${this.baseUrl}/esummary.fcgi`,
      {
        params: {
          ...this.commonParams(),
          db: "pubmed",
          id: ids.join(","),
          retmode: "json",
        },
        apiName: "PubMed",
      },
    );
    const result = resp.result ?? {};
    const out: Record<string, PubMedSummary> = {};
    for (const id of ids) {
      const v = result[id];
      if (v && !Array.isArray(v)) out[id] = v as PubMedSummary;
    }
    return out;
  }

  /** Fetch raw XML for a PMID via efetch (used to extract DOI + abstract). */
  async efetchXml(pmid: string): Promise<string> {
    const resp = await fetchWithRetry(`${this.baseUrl}/efetch.fcgi`, {
      params: {
        ...this.commonParams(),
        db: "pubmed",
        id: pmid,
        retmode: "xml",
      },
      apiName: "PubMed",
    });
    if (!resp.ok) return "";
    return resp.text();
  }

  /** Combined search → summary → candidate list. */
  async search(query: string, limit = 10): Promise<PaperCandidate[]> {
    const ids = await this.esearch(query, limit);
    if (ids.length === 0) return [];
    const summaries = await this.esummary(ids);
    const out: PaperCandidate[] = [];
    for (const id of ids) {
      const paper = summaries[id];
      if (!paper) continue;
      out.push(summaryToCandidate(id, paper));
    }
    return out;
  }

  /** Extract DOI + full abstract from the efetch XML payload. */
  async fetchDoiAndAbstract(pmid: string): Promise<{ doi?: string; abstract?: string }> {
    const xml = await this.efetchXml(pmid);
    if (!xml) return {};
    const doiMatch = xml.match(
      /<ArticleId[^>]*IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/i,
    );
    const doi = normalizeDoi(doiMatch?.[1]?.trim());
    const blocks = [...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)]
      .map((m) =>
        (m[1] ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);
    const abstract = blocks.length ? blocks.join("\n") : undefined;
    return { doi, abstract };
  }
}

function summaryToCandidate(pmid: string, paper: PubMedSummary): PaperCandidate {
  const elocDoi = paper.elocationid
    ?.split(" ")
    .find((token) => token.toLowerCase().startsWith("doi:"))
    ?.replace(/^doi:\s*/i, "");
  const articleDoi = paper.articleids?.find((a) => a.idtype === "doi")?.value;
  const doi = normalizeDoi(articleDoi ?? elocDoi);
  const yearStr = paper.pubdate?.split(" ")[0];
  const year = yearStr && /^\d{4}$/.test(yearStr) ? Number(yearStr) : undefined;
  return {
    title: paper.title ?? "Untitled",
    doi,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    year,
    source: "pubmed",
    authors: (paper.authors ?? [])
      .map((a) => a.name)
      .filter((n): n is string => !!n),
    journal: paper.fulljournalname ?? paper.source,
  };
}

/** Convenience: single-call search using a client created from env vars. */
export async function searchPubMed(query: string, limit = 10): Promise<PaperCandidate[]> {
  const client = new PubMedClient({
    apiKey: process.env.PUBMED_API_KEY ?? process.env.NCBI_API_KEY,
    email: process.env.RESEARCH_MAILTO,
  });
  try {
    return await client.search(query, limit);
  } catch (err) {
    console.error("[PubMed] search failed:", err);
    return [];
  }
}

export async function fetchPubMedDoiAndAbstractByPmid(
  pmid: string,
): Promise<{ doi?: string; abstract?: string }> {
  const client = new PubMedClient({
    apiKey: process.env.PUBMED_API_KEY ?? process.env.NCBI_API_KEY,
    email: process.env.RESEARCH_MAILTO,
  });
  try {
    return await client.fetchDoiAndAbstract(pmid);
  } catch (err) {
    console.error("[PubMed] efetch failed:", err);
    return {};
  }
}
