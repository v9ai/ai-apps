import { fetchWithRetry } from "./retry";
import type { ArxivPaper } from "./types";

const DEFAULT_BASE_URL = "https://export.arxiv.org/api/query";
const POLITE_DELAY_MS = 3000;

export interface ArxivSearchResponse {
  total_results: number;
  start_index: number;
  items_per_page: number;
  papers: ArxivPaper[];
}

export interface ArxivClientOptions {
  baseUrl?: string;
}

export interface ArxivSearchOptions {
  start?: number;
  maxResults?: number;
  sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate";
  sortOrder?: "ascending" | "descending";
  categories?: string[];
  /** YYYYMMDD-YYYYMMDD or with '*' wildcard, e.g. `20240101-*`. */
  dateRange?: { from: string; to: string };
}

export class ArxivClient {
  private readonly baseUrl: string;

  constructor(options: ArxivClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async search(query: string, opts: ArxivSearchOptions = {}): Promise<ArxivSearchResponse> {
    const start = opts.start ?? 0;
    const maxResults = opts.maxResults ?? 10;
    const sortBy = opts.sortBy ?? "relevance";
    const sortOrder = opts.sortOrder ?? "descending";

    const parts: string[] = [];
    if (query) parts.push(`all:${query.replace(/ /g, "+").replace(/"/g, "%22")}`);
    for (const c of opts.categories ?? []) parts.push(`cat:${c}`);
    let searchQuery = parts.length ? parts.join("+AND+") : "all:*";
    if (opts.dateRange) {
      searchQuery = `${searchQuery}+AND+submittedDate:[${opts.dateRange.from}+TO+${opts.dateRange.to}]`;
    }

    const url =
      `${this.baseUrl}?search_query=${searchQuery}` +
      `&start=${start}&max_results=${maxResults}` +
      `&sortBy=${sortBy}&sortOrder=${sortOrder}`;

    const body = await this.getXml(url);
    return parseAtomFeed(body);
  }

  async getPaper(arxivId: string): Promise<ArxivPaper> {
    validateArxivId(arxivId);
    const url = `${this.baseUrl}?id_list=${encodeURIComponent(arxivId)}&max_results=1`;
    const body = await this.getXml(url);
    const resp = parseAtomFeed(body);
    const paper = resp.papers[0];
    if (!paper) throw new Error(`Paper ${arxivId} not found`);
    return paper;
  }

  async fetchBatch(ids: string[], batchSize = 50): Promise<ArxivPaper[]> {
    const bs = Math.max(1, batchSize);
    const out: ArxivPaper[] = [];
    for (let i = 0; i < ids.length; i += bs) {
      const chunk = ids.slice(i, i + bs);
      const url = `${this.baseUrl}?id_list=${chunk.join(",")}&max_results=${chunk.length}`;
      try {
        out.push(...parseAtomFeed(await this.getXml(url)).papers);
      } catch {
        await sleep(10000);
        try {
          out.push(...parseAtomFeed(await this.getXml(url)).papers);
        } catch {
          // skip batch
        }
      }
    }
    return out;
  }

  private async getXml(url: string): Promise<string> {
    const resp = await fetchWithRetry(url, {
      apiName: "arXiv",
      retry: { baseDelayMs: 2000 },
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`arXiv HTTP ${resp.status}: ${body.slice(0, 200)}`);
    }
    const body = await resp.text();
    await sleep(POLITE_DELAY_MS);
    return body;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function validateArxivId(id: string): void {
  const newFormat =
    id.length >= 10 &&
    id[4] === "." &&
    /^\d{4}$/.test(id.slice(0, 4)) &&
    /^\d{5,}(v\d+)?$/.test(id.slice(5));
  const oldFormat =
    id.includes("/") &&
    (() => {
      const tail = id.split("/").pop() ?? "";
      const base = tail.split("v")[0] ?? "";
      return base.length === 7 && /^\d+$/.test(base);
    })();
  if (!newFormat && !oldFormat) {
    throw new Error(`Invalid arXiv ID: ${id}`);
  }
}

// ─── Atom feed parsing (regex-based, minimal) ───────────────────────────────

export function parseAtomFeed(xml: string): ArxivSearchResponse {
  const totalResults = Number(matchOne(xml, /<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/) ?? 0);
  const startIndex = Number(matchOne(xml, /<opensearch:startIndex>(\d+)<\/opensearch:startIndex>/) ?? 0);
  const itemsPerPage = Number(matchOne(xml, /<opensearch:itemsPerPage>(\d+)<\/opensearch:itemsPerPage>/) ?? 0);

  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1] ?? "");
  const papers: ArxivPaper[] = [];
  for (const entry of entries) {
    const paper = parseEntry(entry);
    if (paper) papers.push(paper);
  }

  return {
    total_results: totalResults,
    start_index: startIndex,
    items_per_page: itemsPerPage,
    papers,
  };
}

function parseEntry(entry: string): ArxivPaper | null {
  const title = cleanText(matchOne(entry, /<title>([\s\S]*?)<\/title>/) ?? "");
  const summary = cleanText(matchOne(entry, /<summary>([\s\S]*?)<\/summary>/) ?? "");
  const published = (matchOne(entry, /<published>([\s\S]*?)<\/published>/) ?? "").trim();
  const updated = (matchOne(entry, /<updated>([\s\S]*?)<\/updated>/) ?? "").trim() || undefined;

  const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)]
    .map((m) => (m[1] ?? "").trim())
    .filter(Boolean);

  const categories = [...entry.matchAll(/<category\s[^>]*term="([^"]+)"/g)].map((m) => m[1] ?? "");

  let linkUrl = "";
  let pdfUrl = "";
  for (const m of entry.matchAll(/<link\s+([^>]+?)\/?>/g)) {
    const attrs = m[1] ?? "";
    const href = matchOne(attrs, /href="([^"]+)"/) ?? "";
    const linkTitle = matchOne(attrs, /title="([^"]+)"/) ?? "";
    const linkType = matchOne(attrs, /type="([^"]+)"/) ?? "";
    if (linkTitle === "pdf" || linkType === "application/pdf") pdfUrl = href;
    else if (!linkUrl) linkUrl = href;
  }

  const doi = (matchOne(entry, /<arxiv:doi>([\s\S]*?)<\/arxiv:doi>/) ?? "").trim() || undefined;
  const comment = (matchOne(entry, /<arxiv:comment>([\s\S]*?)<\/arxiv:comment>/) ?? "").trim() || undefined;
  const journalRef = (matchOne(entry, /<arxiv:journal_ref>([\s\S]*?)<\/arxiv:journal_ref>/) ?? "").trim() || undefined;

  const arxivId = linkUrl.split("/abs/").pop() ?? "";

  if (!title && !arxivId) return null;

  return {
    arxiv_id: arxivId,
    title,
    summary,
    authors,
    published,
    updated,
    categories,
    pdf_url: pdfUrl || undefined,
    doi,
    comment,
    journal_ref: journalRef,
    link_url: linkUrl || undefined,
  };
}

function matchOne(input: string, re: RegExp): string | undefined {
  const m = input.match(re);
  return m?.[1];
}

function cleanText(s: string): string {
  return decodeEntities(s).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
