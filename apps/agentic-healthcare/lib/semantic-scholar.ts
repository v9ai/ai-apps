const SCHOLAR_BASE = "https://api.semanticscholar.org";
const OPENALEX_BASE = "https://api.openalex.org";
const CROSSREF_BASE = "https://api.crossref.org";
const CORE_BASE = "https://api.core.ac.uk/v3";
const MAX_RETRIES = 3;

export const SEARCH_FIELDS =
  "paperId,title,abstract,year,citationCount,openAccessPdf,authors,fieldsOfStudy,url,publicationDate,isOpenAccess,venue";

export const PAPER_FIELDS_FULL =
  "paperId,title,abstract,year,citationCount,influentialCitationCount,tldr,openAccessPdf,authors,fieldsOfStudy,url,publicationDate,isOpenAccess,venue";

export type Paper = {
  paperId?: string;
  title?: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  influentialCitationCount?: number;
  tldr?: { model?: string; text?: string };
  openAccessPdf?: { url?: string; status?: string };
  authors?: { authorId?: string; name?: string }[];
  fieldsOfStudy?: string[];
  url?: string;
  venue?: string;
  publicationDate?: string;
  isOpenAccess?: boolean;
};

export type BulkSearchResponse = {
  total?: number;
  token?: string;
  data: Paper[];
};

async function fetchWithRetry(
  url: string,
  headers: Record<string, string> = {},
  label = "API",
): Promise<unknown> {
  let retries = 0;
  while (true) {
    const resp = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (resp.status === 429) {
      if (retries >= MAX_RETRIES) throw new Error(`${label} rate limited`);
      const wait = 2 ** retries * 1000;
      await new Promise((r) => setTimeout(r, wait));
      retries++;
      continue;
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`${label} ${resp.status}: ${text}`);
    }

    return resp.json();
  }
}

function scholarHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { "x-api-key": apiKey } : {};
}

export async function searchBulk(
  query: string,
  opts: {
    fields?: string;
    year?: string;
    minCitationCount?: number;
    sort?: string;
    limit?: number;
    apiKey?: string;
  } = {}
): Promise<BulkSearchResponse> {
  const params = new URLSearchParams({
    query,
    fields: opts.fields ?? SEARCH_FIELDS,
  });
  if (opts.year) params.set("year", opts.year);
  if (opts.minCitationCount != null)
    params.set("minCitationCount", String(opts.minCitationCount));
  if (opts.sort) params.set("sort", opts.sort);

  const url = `${SCHOLAR_BASE}/graph/v1/paper/search/bulk?${params}`;
  const resp = (await fetchWithRetry(
    url, scholarHeaders(opts.apiKey), "Semantic Scholar"
  )) as BulkSearchResponse;

  if (opts.limit && resp.data.length > opts.limit) {
    resp.data = resp.data.slice(0, opts.limit);
  }
  return resp;
}

export async function getPaper(
  paperId: string,
  opts: { fields?: string; apiKey?: string } = {}
): Promise<Paper> {
  const params = new URLSearchParams({
    fields: opts.fields ?? PAPER_FIELDS_FULL,
  });
  const url = `${SCHOLAR_BASE}/graph/v1/paper/${encodeURIComponent(paperId)}?${params}`;
  return (await fetchWithRetry(
    url, scholarHeaders(opts.apiKey), "Semantic Scholar"
  )) as Paper;
}

// ─── OpenAlex ────────────────────────────────────────────────────────────────

type OpenAlexWork = {
  id?: string;
  doi?: string;
  title?: string;
  publication_year?: number;
  cited_by_count?: number;
  authorships?: { author?: { display_name?: string } }[];
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: { pdf_url?: string; landing_page_url?: string };
  open_access?: { oa_url?: string };
};

function reconstructAbstract(index?: Record<string, number[]>): string | undefined {
  if (!index) return undefined;
  const entries = Object.entries(index);
  if (entries.length === 0) return undefined;
  const positions: [number, string][] = [];
  for (const [word, indices] of entries) {
    for (const pos of indices) positions.push([pos, word]);
  }
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, w]) => w).join(" ");
}

export async function searchOpenAlex(
  query: string,
  opts: { perPage?: number; mailto?: string } = {}
): Promise<OpenAlexWork[]> {
  const params = new URLSearchParams({
    search: query,
    page: "1",
    per_page: String(opts.perPage ?? 10),
  });
  if (opts.mailto) params.set("mailto", opts.mailto);
  const url = `${OPENALEX_BASE}/works?${params}`;
  const resp = (await fetchWithRetry(url, {}, "OpenAlex")) as {
    results?: OpenAlexWork[];
  };
  return resp.results ?? [];
}

// ─── Crossref ────────────────────────────────────────────────────────────────

type CrossrefWork = {
  DOI?: string;
  title?: string[];
  abstract?: string;
  author?: { given?: string; family?: string }[];
  published?: { "date-parts"?: number[][] };
  "is-referenced-by-count"?: number;
  link?: { URL?: string }[];
  URL?: string;
};

export async function searchCrossref(
  query: string,
  opts: { rows?: number; mailto?: string } = {}
): Promise<CrossrefWork[]> {
  const params = new URLSearchParams({
    query,
    rows: String(opts.rows ?? 10),
  });
  if (opts.mailto) params.set("mailto", opts.mailto);
  const url = `${CROSSREF_BASE}/works?${params}`;
  const resp = (await fetchWithRetry(url, {}, "Crossref")) as {
    message?: { items?: CrossrefWork[] };
  };
  return resp.message?.items ?? [];
}

// ─── CORE ────────────────────────────────────────────────────────────────────

type CoreWork = {
  id?: number;
  doi?: string;
  title?: string;
  abstract?: string;
  authors?: { name?: string }[];
  yearPublished?: number;
  citationCount?: number;
  downloadUrl?: string;
  sourceFulltextUrls?: string[];
};

export async function searchCore(
  query: string,
  opts: { limit?: number; apiKey?: string } = {}
): Promise<CoreWork[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(opts.limit ?? 10),
  });
  const headers: Record<string, string> = {};
  if (opts.apiKey) headers["Authorization"] = `Bearer ${opts.apiKey}`;
  const url = `${CORE_BASE}/search/works/?${params}`;
  const resp = (await fetchWithRetry(url, headers, "CORE")) as {
    results?: CoreWork[];
  };
  return resp.results ?? [];
}

// ─── Unified Research Paper type ─────────────────────────────────────────────

export type ResearchPaperRecord = {
  paper_id: string;
  title: string;
  year: number | null;
  citation_count: number | null;
  abstract: string | null;
  tldr: string | null;
  url: string | null;
  authors: string[];
  source: string;
};

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

function scholarToRecord(p: Paper): ResearchPaperRecord {
  return {
    paper_id: p.paperId ?? "",
    title: p.title ?? "",
    year: p.year ?? null,
    citation_count: p.citationCount ?? null,
    abstract: p.abstract ?? null,
    tldr: null,
    url: p.url ?? null,
    authors: (p.authors ?? []).map((a) => a.name).filter(Boolean) as string[],
    source: "SemanticScholar",
  };
}

function openAlexToRecord(w: OpenAlexWork): ResearchPaperRecord {
  return {
    paper_id: w.id ?? "",
    title: w.title ?? "",
    year: w.publication_year ?? null,
    citation_count: w.cited_by_count ?? null,
    abstract: reconstructAbstract(w.abstract_inverted_index) ?? null,
    tldr: null,
    url: w.primary_location?.landing_page_url ?? w.open_access?.oa_url ?? null,
    authors: (w.authorships ?? [])
      .map((a) => a.author?.display_name)
      .filter(Boolean) as string[],
    source: "OpenAlex",
  };
}

function crossrefToRecord(w: CrossrefWork): ResearchPaperRecord {
  const abstract_text = w.abstract ? stripHtmlTags(w.abstract) : null;
  const year = w.published?.["date-parts"]?.[0]?.[0] ?? null;
  return {
    paper_id: w.DOI ?? "",
    title: w.title?.[0] ?? "",
    year,
    citation_count: w["is-referenced-by-count"] ?? null,
    abstract: abstract_text,
    tldr: null,
    url: w.URL ?? null,
    authors: (w.author ?? [])
      .map((a) => [a.given, a.family].filter(Boolean).join(" "))
      .filter((s) => s.length > 0),
    source: "Crossref",
  };
}

function coreToRecord(w: CoreWork): ResearchPaperRecord {
  return {
    paper_id: w.id?.toString() ?? "",
    title: w.title ?? "",
    year: w.yearPublished ?? null,
    citation_count: w.citationCount ?? null,
    abstract: w.abstract ?? null,
    tldr: null,
    url: w.downloadUrl ?? w.sourceFulltextUrls?.[0] ?? null,
    authors: (w.authors ?? []).map((a) => a.name).filter(Boolean) as string[],
    source: "CORE",
  };
}

/**
 * Search all 4 research APIs in parallel, deduplicate by title,
 * sort by citations, and return top N unified records.
 */
export async function searchAllApis(
  query: string,
  opts: {
    limit?: number;
    scholarApiKey?: string;
    coreApiKey?: string;
    mailto?: string;
  } = {}
): Promise<ResearchPaperRecord[]> {
  const limit = opts.limit ?? 15;

  const [scholar, openalex, crossref, core] = await Promise.allSettled([
    searchBulk(query, {
      year: "2019-",
      minCitationCount: 3,
      sort: "citationCount:desc",
      limit: 15,
      apiKey: opts.scholarApiKey,
    }).then((r) => r.data.map(scholarToRecord)),
    searchOpenAlex(query, { perPage: 10, mailto: opts.mailto }),
    searchCrossref(query, { rows: 10, mailto: opts.mailto }),
    searchCore(query, { limit: 10, apiKey: opts.coreApiKey }),
  ]);

  const all: ResearchPaperRecord[] = [];

  if (scholar.status === "fulfilled") all.push(...scholar.value);
  if (openalex.status === "fulfilled")
    all.push(...openalex.value.map(openAlexToRecord));
  if (crossref.status === "fulfilled")
    all.push(...crossref.value.map(crossrefToRecord));
  if (core.status === "fulfilled")
    all.push(...core.value.map(coreToRecord));

  // Deduplicate by normalized title
  const seen = new Set<string>();
  const deduped = all.filter((p) => {
    const key = p.title.trim().toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by citations descending
  deduped.sort(
    (a, b) => (b.citation_count ?? 0) - (a.citation_count ?? 0)
  );

  return deduped.slice(0, limit);
}
