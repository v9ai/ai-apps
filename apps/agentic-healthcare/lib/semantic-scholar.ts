const BASE_URL = "https://api.semanticscholar.org";
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
  apiKey?: string
): Promise<unknown> {
  let retries = 0;
  while (true) {
    const headers: Record<string, string> = {};
    if (apiKey) headers["x-api-key"] = apiKey;

    const resp = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (resp.status === 429) {
      if (retries >= MAX_RETRIES) throw new Error("Semantic Scholar rate limited");
      const wait = 2 ** retries * 1000;
      await new Promise((r) => setTimeout(r, wait));
      retries++;
      continue;
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Semantic Scholar ${resp.status}: ${text}`);
    }

    return resp.json();
  }
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

  const url = `${BASE_URL}/graph/v1/paper/search/bulk?${params}`;
  const resp = (await fetchWithRetry(url, opts.apiKey)) as BulkSearchResponse;

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
  const url = `${BASE_URL}/graph/v1/paper/${encodeURIComponent(paperId)}?${params}`;
  return (await fetchWithRetry(url, opts.apiKey)) as Paper;
}
