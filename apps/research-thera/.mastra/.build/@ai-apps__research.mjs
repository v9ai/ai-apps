const DEFAULT_RETRY = {
  maxRetries: 3,
  baseDelayMs: 1e3,
  maxDelayMs: 3e4,
  jitter: true,
  retryOnServerError: true
};
function classifyStatus(status) {
  if (status >= 200 && status <= 399) return "success";
  if (status === 429) return "rate_limited";
  if (status >= 500 && status <= 599) return "server_error";
  return "client_error";
}
function backoffDelay(config, attempt) {
  const raw = config.baseDelayMs * 2 ** attempt;
  const capped = Math.min(raw, config.maxDelayMs);
  if (!config.jitter) return capped;
  const jitterFraction = Math.random();
  const jitterMs = capped * 0.5 * jitterFraction;
  return Math.max(0, capped - jitterMs);
}
class RetryHttpError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`), this.status = status, this.body = body;
    this.name = "RetryHttpError";
  }
}
function buildUrl(url, params) {
  if (!params) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== void 0 && v !== null) u.searchParams.append(k, String(v));
  }
  return u.toString();
}
function isRetryableNetworkError(err) {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("timeout") || msg.includes("econnrefused") || msg.includes("econnreset") || msg.includes("enotfound") || msg.includes("fetch failed") || msg.includes("network");
}
function sleep$1(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchWithRetry(url, options = {}) {
  const config = {
    ...DEFAULT_RETRY,
    ...options.retry
  };
  const fullUrl = buildUrl(url, options.params);
  const apiName = options.apiName ?? "unknown";
  let lastErr = null;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = backoffDelay(config, attempt - 1);
      console.warn(`[${apiName}] retry attempt=${attempt} delay=${Math.round(delay)}ms`);
      await sleep$1(delay);
    }
    try {
      const resp = await fetch(fullUrl, {
        headers: options.headers,
        signal: options.signal
      });
      const action = classifyStatus(resp.status);
      const retryable = action === "rate_limited" || action === "server_error" && config.retryOnServerError;
      if (!retryable) return resp;
      const body = await resp.text().catch(() => "");
      console.warn(`[${apiName}] status=${resp.status} kind=${action} attempt=${attempt}/${config.maxRetries}, will retry`);
      lastErr = new RetryHttpError(resp.status, body);
    } catch (err) {
      if (isRetryableNetworkError(err) && attempt < config.maxRetries) {
        console.warn(`[${apiName}] network error attempt=${attempt}, will retry: ${String(err)}`);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error(`${apiName}: retries exhausted`);
}
async function fetchJsonWithRetry(url, options = {}) {
  const resp = await fetchWithRetry(url, options);
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new RetryHttpError(resp.status, body);
  }
  return await resp.json();
}
const DEFAULT_BASE_URL$9 = "https://export.arxiv.org/api/query";
const POLITE_DELAY_MS = 3e3;
class ArxivClient {
  async search(query, opts = {}) {
    const start = opts.start ?? 0;
    const maxResults = opts.maxResults ?? 10;
    const sortBy = opts.sortBy ?? "relevance";
    const sortOrder = opts.sortOrder ?? "descending";
    const parts = [];
    if (query) parts.push(`all:${query.replace(/ /g, "+").replace(/"/g, "%22")}`);
    for (const c of opts.categories ?? []) parts.push(`cat:${c}`);
    let searchQuery = parts.length ? parts.join("+AND+") : "all:*";
    if (opts.dateRange) {
      searchQuery = `${searchQuery}+AND+submittedDate:[${opts.dateRange.from}+TO+${opts.dateRange.to}]`;
    }
    const url = `${this.baseUrl}?search_query=${searchQuery}&start=${start}&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    const body = await this.getXml(url);
    return parseAtomFeed(body);
  }
  async getPaper(arxivId) {
    validateArxivId(arxivId);
    const url = `${this.baseUrl}?id_list=${encodeURIComponent(arxivId)}&max_results=1`;
    const body = await this.getXml(url);
    const resp = parseAtomFeed(body);
    const paper = resp.papers[0];
    if (!paper) throw new Error(`Paper ${arxivId} not found`);
    return paper;
  }
  async fetchBatch(ids, batchSize = 50) {
    const bs = Math.max(1, batchSize);
    const out = [];
    for (let i = 0; i < ids.length; i += bs) {
      const chunk = ids.slice(i, i + bs);
      const url = `${this.baseUrl}?id_list=${chunk.join(",")}&max_results=${chunk.length}`;
      try {
        out.push(...parseAtomFeed(await this.getXml(url)).papers);
      } catch {
        await sleep(1e4);
        try {
          out.push(...parseAtomFeed(await this.getXml(url)).papers);
        } catch {
        }
      }
    }
    return out;
  }
  async getXml(url) {
    const resp = await fetchWithRetry(url, {
      apiName: "arXiv",
      retry: {
        baseDelayMs: 2e3
      }
    });
    if (!resp.ok) {
      const body2 = await resp.text().catch(() => "");
      throw new Error(`arXiv HTTP ${resp.status}: ${body2.slice(0, 200)}`);
    }
    const body = await resp.text();
    await sleep(POLITE_DELAY_MS);
    return body;
  }
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL$9;
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function validateArxivId(id) {
  const newFormat = id.length >= 10 && id[4] === "." && /^\d{4}$/.test(id.slice(0, 4)) && /^\d{5,}(v\d+)?$/.test(id.slice(5));
  const oldFormat = id.includes("/") && (() => {
    const tail = id.split("/").pop() ?? "";
    const base = tail.split("v")[0] ?? "";
    return base.length === 7 && /^\d+$/.test(base);
  })();
  if (!newFormat && !oldFormat) {
    throw new Error(`Invalid arXiv ID: ${id}`);
  }
}
function parseAtomFeed(xml) {
  const totalResults = Number(matchOne(xml, /<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/) ?? 0);
  const startIndex = Number(matchOne(xml, /<opensearch:startIndex>(\d+)<\/opensearch:startIndex>/) ?? 0);
  const itemsPerPage = Number(matchOne(xml, /<opensearch:itemsPerPage>(\d+)<\/opensearch:itemsPerPage>/) ?? 0);
  const entries = [
    ...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)
  ].map((m) => m[1] ?? "");
  const papers = [];
  for (const entry of entries) {
    const paper = parseEntry(entry);
    if (paper) papers.push(paper);
  }
  return {
    total_results: totalResults,
    start_index: startIndex,
    items_per_page: itemsPerPage,
    papers
  };
}
function parseEntry(entry) {
  const title = cleanText(matchOne(entry, /<title>([\s\S]*?)<\/title>/) ?? "");
  const summary = cleanText(matchOne(entry, /<summary>([\s\S]*?)<\/summary>/) ?? "");
  const published = (matchOne(entry, /<published>([\s\S]*?)<\/published>/) ?? "").trim();
  const updated = (matchOne(entry, /<updated>([\s\S]*?)<\/updated>/) ?? "").trim() || void 0;
  const authors = [
    ...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)
  ].map((m) => (m[1] ?? "").trim()).filter(Boolean);
  const categories = [
    ...entry.matchAll(/<category\s[^>]*term="([^"]+)"/g)
  ].map((m) => m[1] ?? "");
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
  const doi = (matchOne(entry, /<arxiv:doi>([\s\S]*?)<\/arxiv:doi>/) ?? "").trim() || void 0;
  const comment = (matchOne(entry, /<arxiv:comment>([\s\S]*?)<\/arxiv:comment>/) ?? "").trim() || void 0;
  const journalRef = (matchOne(entry, /<arxiv:journal_ref>([\s\S]*?)<\/arxiv:journal_ref>/) ?? "").trim() || void 0;
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
    pdf_url: pdfUrl || void 0,
    doi,
    comment,
    journal_ref: journalRef,
    link_url: linkUrl || void 0
  };
}
function matchOne(input, re) {
  const m = input.match(re);
  return m?.[1];
}
function cleanText(s) {
  return decodeEntities(s).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}
function decodeEntities(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}
const DEFAULT_BASE_URL$8 = "https://api.core.ac.uk/v3";
class CoreClient {
  async search(query, limit = 25, offset = 0) {
    return fetchJsonWithRetry(`${this.baseUrl}/search/works/`, {
      params: {
        q: query,
        limit,
        offset
      },
      headers: this.headers,
      apiName: "CORE",
      retry: {
        baseDelayMs: 2e3
      }
    });
  }
  async getWork(id) {
    return fetchJsonWithRetry(`${this.baseUrl}/works/${encodeURIComponent(id)}`, {
      headers: this.headers,
      apiName: "CORE",
      retry: {
        baseDelayMs: 2e3
      }
    });
  }
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL$8).replace(/\/+$/, "");
    this.headers = {};
    if (options.apiKey) this.headers.Authorization = `Bearer ${options.apiKey}`;
  }
}
const DEFAULT_BASE_URL$7 = "https://api.crossref.org";
class CrossrefClient {
  get headers() {
    return {
      "User-Agent": this.userAgent
    };
  }
  async search(query, rows = 20, offset = 0) {
    return this.searchFiltered(query, void 0, rows, offset);
  }
  async searchFiltered(query, fromPubDate, rows = 20, offset = 0) {
    const params = {
      query,
      rows,
      offset,
      mailto: this.mailto
    };
    if (fromPubDate) params.filter = `from-pub-date:${fromPubDate}`;
    return fetchJsonWithRetry(`${this.baseUrl}/works`, {
      params,
      headers: this.headers,
      apiName: "Crossref"
    });
  }
  async getWork(doi) {
    const resp = await fetchJsonWithRetry(`${this.baseUrl}/works/${encodeURIComponent(doi)}`, {
      headers: this.headers,
      apiName: "Crossref"
    });
    return resp.message;
  }
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL$7).replace(/\/+$/, "");
    this.mailto = options.mailto;
    this.userAgent = options.mailto ? `research-ts/0.1 (mailto:${options.mailto})` : "research-ts/0.1";
  }
}
const DEFAULT_BASE_URL$6 = "https://api.openalex.org";
class OpenAlexClient {
  get headers() {
    return {
      "User-Agent": this.userAgent
    };
  }
  async search(query, page = 1, perPage = 25) {
    return this.searchFiltered(query, void 0, page, perPage);
  }
  async searchFiltered(query, fromPublicationDate, page = 1, perPage = 25) {
    const params = {
      search: query,
      page,
      per_page: perPage,
      mailto: this.mailto
    };
    if (fromPublicationDate) {
      params.filter = `from_publication_date:${fromPublicationDate}`;
    }
    return fetchJsonWithRetry(`${this.baseUrl}/works`, {
      params,
      headers: this.headers,
      apiName: "OpenAlex"
    });
  }
  async getWork(id) {
    return fetchJsonWithRetry(`${this.baseUrl}/works/${encodeURIComponent(id)}`, {
      headers: this.headers,
      apiName: "OpenAlex"
    });
  }
  /** Find papers affiliated with a given institution (raw affiliation string search). */
  async searchByAffiliation(companyName, page = 1, perPage = 25) {
    return fetchJsonWithRetry(`${this.baseUrl}/works`, {
      params: {
        filter: `raw_affiliation_strings.search:${companyName}`,
        page,
        per_page: perPage,
        mailto: this.mailto
      },
      headers: this.headers,
      apiName: "OpenAlex"
    });
  }
  async searchByAuthorName(authorName, page = 1, perPage = 25) {
    return fetchJsonWithRetry(`${this.baseUrl}/works`, {
      params: {
        filter: `raw_author_name.search:${authorName}`,
        page,
        per_page: perPage,
        mailto: this.mailto
      },
      headers: this.headers,
      apiName: "OpenAlex"
    });
  }
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL$6).replace(/\/+$/, "");
    this.mailto = options.mailto;
    this.userAgent = options.mailto ? `research-ts/0.1 (mailto:${options.mailto})` : "research-ts/0.1";
  }
}
const DEFAULT_BASE_URL$5 = "https://api.semanticscholar.org";
const SCHOLAR_SEARCH_FIELDS = "paperId,title,abstract,year,citationCount,openAccessPdf,authors,fieldsOfStudy,url,publicationDate,isOpenAccess,venue";
const SCHOLAR_PAPER_FIELDS_FULL = "paperId,title,abstract,year,citationCount,influentialCitationCount,tldr,openAccessPdf,authors,fieldsOfStudy,url,publicationDate,isOpenAccess,venue";
const SCHOLAR_PAPER_FIELDS_BRIEF = "paperId,title,year,citationCount,authors,url";
class SemanticScholarClient {
  /** Relevance-ranked search (max 1000 results). */
  async search(query, fields = SCHOLAR_SEARCH_FIELDS, limit = 20, offset = 0) {
    return fetchJsonWithRetry(`${this.baseUrl}/graph/v1/paper/search`, {
      params: {
        query,
        fields,
        limit,
        offset
      },
      headers: this.headers,
      apiName: "SemanticScholar",
      retry: {
        retryOnServerError: false
      }
    });
  }
  /** Bulk keyword search — up to 10M results, advanced query syntax. */
  async searchBulk(query, opts = {}) {
    return fetchJsonWithRetry(`${this.baseUrl}/graph/v1/paper/search/bulk`, {
      params: {
        query,
        fields: opts.fields ?? SCHOLAR_SEARCH_FIELDS,
        limit: opts.limit ?? 100,
        year: opts.year,
        minCitationCount: opts.minCitations,
        sort: opts.sort
      },
      headers: this.headers,
      apiName: "SemanticScholar",
      retry: {
        retryOnServerError: false
      }
    });
  }
  /** Full details for a paper by ID (S2/DOI/arXiv/PMID/ACL). */
  async getPaper(paperId, fields = SCHOLAR_PAPER_FIELDS_FULL) {
    return fetchJsonWithRetry(`${this.baseUrl}/graph/v1/paper/${encodeURIComponent(paperId)}`, {
      params: {
        fields
      },
      headers: this.headers,
      apiName: "SemanticScholar",
      retry: {
        retryOnServerError: false
      }
    });
  }
  /** Forward citations — papers citing this one. */
  async getCitations(paperId, fields = SCHOLAR_PAPER_FIELDS_BRIEF, limit = 100) {
    return fetchJsonWithRetry(`${this.baseUrl}/graph/v1/paper/${encodeURIComponent(paperId)}/citations`, {
      params: {
        fields,
        limit
      },
      headers: this.headers,
      apiName: "SemanticScholar",
      retry: {
        retryOnServerError: false
      }
    });
  }
  /** Backward citations — papers this one references. */
  async getReferences(paperId, fields = SCHOLAR_PAPER_FIELDS_BRIEF, limit = 100) {
    return fetchJsonWithRetry(`${this.baseUrl}/graph/v1/paper/${encodeURIComponent(paperId)}/references`, {
      params: {
        fields,
        limit
      },
      headers: this.headers,
      apiName: "SemanticScholar",
      retry: {
        retryOnServerError: false
      }
    });
  }
  /** Batch-fetch up to 500 papers by ID in a single request. */
  async batch(ids, fields = SCHOLAR_PAPER_FIELDS_FULL) {
    if (ids.length === 0) return [];
    const resp = await fetch(`${this.baseUrl}/graph/v1/paper/batch?fields=${encodeURIComponent(fields)}`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ids
      })
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`SemanticScholar batch HTTP ${resp.status}: ${body.slice(0, 200)}`);
    }
    const data = await resp.json();
    return data.filter((p) => !!p);
  }
  /** Recommendations API — SPECTER2-based similar papers. */
  async getRecommendations(paperId, fields = SCHOLAR_PAPER_FIELDS_BRIEF, limit = 20) {
    return fetchJsonWithRetry(`${this.baseUrl}/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}`, {
      params: {
        fields,
        limit
      },
      headers: this.headers,
      apiName: "SemanticScholar",
      retry: {
        retryOnServerError: false
      }
    });
  }
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL$5).replace(/\/+$/, "");
    this.headers = {};
    if (options.apiKey) this.headers["x-api-key"] = options.apiKey;
  }
}
const DEFAULT_BASE_URL$4 = "https://zenodo.org/api";
class ZenodoClient {
  /** Search records. Supports Elasticsearch query syntax (title:"X", creators.name:Y). */
  async search(query, page = 1, size = 25) {
    return this.searchFiltered(query, void 0, void 0, page, size);
  }
  async searchFiltered(query, resourceType, sort, page = 1, size = 25) {
    return fetchJsonWithRetry(`${this.baseUrl}/records`, {
      params: {
        q: query,
        page,
        size,
        type: resourceType,
        sort
      },
      headers: this.headers,
      apiName: "Zenodo",
      retry: {
        baseDelayMs: 2e3
      }
    });
  }
  async getRecord(id) {
    return fetchJsonWithRetry(`${this.baseUrl}/records/${id}`, {
      headers: this.headers,
      apiName: "Zenodo",
      retry: {
        baseDelayMs: 2e3
      }
    });
  }
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL$4).replace(/\/+$/, "");
    this.headers = {
      "User-Agent": "research-ts/0.1"
    };
    if (options.accessToken) {
      this.headers.Authorization = `Bearer ${options.accessToken}`;
    }
  }
}
function normalizeDoi(doi) {
  if (!doi) return void 0;
  const d = doi.trim().toLowerCase();
  const stripped = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:\s*/i, "").trim();
  return stripped || void 0;
}
function stripJats(input) {
  if (!input) return void 0;
  const noTags = input.replace(/<\/?[^>]+>/g, " ");
  const decoded = noTags.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}
const DEFAULT_BASE_URL$3 = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
class PubMedClient {
  commonParams() {
    return {
      tool: this.tool,
      email: this.email,
      api_key: this.apiKey
    };
  }
  async esearch(query, retmax = 10) {
    const resp = await fetchJsonWithRetry(`${this.baseUrl}/esearch.fcgi`, {
      params: {
        ...this.commonParams(),
        db: "pubmed",
        term: query,
        retmax,
        retmode: "json"
      },
      apiName: "PubMed"
    });
    return resp.esearchresult?.idlist ?? [];
  }
  async esummary(ids) {
    if (ids.length === 0) return {};
    const resp = await fetchJsonWithRetry(`${this.baseUrl}/esummary.fcgi`, {
      params: {
        ...this.commonParams(),
        db: "pubmed",
        id: ids.join(","),
        retmode: "json"
      },
      apiName: "PubMed"
    });
    const result = resp.result ?? {};
    const out = {};
    for (const id of ids) {
      const v = result[id];
      if (v && !Array.isArray(v)) out[id] = v;
    }
    return out;
  }
  /** Fetch raw XML for a PMID via efetch (used to extract DOI + abstract). */
  async efetchXml(pmid) {
    const resp = await fetchWithRetry(`${this.baseUrl}/efetch.fcgi`, {
      params: {
        ...this.commonParams(),
        db: "pubmed",
        id: pmid,
        retmode: "xml"
      },
      apiName: "PubMed"
    });
    if (!resp.ok) return "";
    return resp.text();
  }
  /** Combined search → summary → candidate list. */
  async search(query, limit = 10) {
    const ids = await this.esearch(query, limit);
    if (ids.length === 0) return [];
    const summaries = await this.esummary(ids);
    const out = [];
    for (const id of ids) {
      const paper = summaries[id];
      if (!paper) continue;
      out.push(summaryToCandidate(id, paper));
    }
    return out;
  }
  /** Extract DOI + full abstract from the efetch XML payload. */
  async fetchDoiAndAbstract(pmid) {
    const xml = await this.efetchXml(pmid);
    if (!xml) return {};
    const doiMatch = xml.match(/<ArticleId[^>]*IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/i);
    const doi = normalizeDoi(doiMatch?.[1]?.trim());
    const blocks = [
      ...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)
    ].map((m) => (m[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
    const abstract = blocks.length ? blocks.join("\n") : void 0;
    return {
      doi,
      abstract
    };
  }
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL$3).replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.tool = options.tool ?? "research-ts";
    this.email = options.email;
  }
}
function summaryToCandidate(pmid, paper) {
  const elocDoi = paper.elocationid?.split(" ").find((token) => token.toLowerCase().startsWith("doi:"))?.replace(/^doi:\s*/i, "");
  const articleDoi = paper.articleids?.find((a) => a.idtype === "doi")?.value;
  const doi = normalizeDoi(articleDoi ?? elocDoi);
  const yearStr = paper.pubdate?.split(" ")[0];
  const year = yearStr && /^\d{4}$/.test(yearStr) ? Number(yearStr) : void 0;
  return {
    title: paper.title ?? "Untitled",
    doi,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    year,
    source: "pubmed",
    authors: (paper.authors ?? []).map((a) => a.name).filter((n) => !!n),
    journal: paper.fulljournalname ?? paper.source
  };
}
async function searchPubMed(query, limit = 10) {
  const client = new PubMedClient({
    apiKey: process.env.PUBMED_API_KEY ?? process.env.NCBI_API_KEY,
    email: process.env.RESEARCH_MAILTO
  });
  try {
    return await client.search(query, limit);
  } catch (err) {
    console.error("[PubMed] search failed:", err);
    return [];
  }
}
const DEFAULT_BASE_URL$2 = "https://www.ebi.ac.uk/europepmc/webservices/rest";
class EuropePmcClient {
  async search(query, pageSize = 10) {
    const resp = await fetchJsonWithRetry(`${this.baseUrl}/search`, {
      params: {
        query,
        pageSize,
        format: "json"
      },
      apiName: "EuropePMC"
    });
    return (resp.resultList?.result ?? []).map(toCandidate$1);
  }
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL$2).replace(/\/+$/, "");
  }
}
function toCandidate$1(r) {
  const doi = normalizeDoi(r.doi);
  const year = r.pubYear ? Number(r.pubYear) : void 0;
  const url = doi ? `https://doi.org/${doi}` : r.pmid ? `https://europepmc.org/article/MED/${r.pmid}` : void 0;
  return {
    title: r.title ?? "Untitled",
    doi,
    url,
    year: Number.isFinite(year) ? year : void 0,
    source: "europepmc",
    authors: r.authorString ? r.authorString.split(", ").filter(Boolean) : [],
    abstract: r.abstractText,
    journal: r.journalTitle
  };
}
async function searchEuropePmc(query, limit = 10) {
  try {
    return await new EuropePmcClient().search(query, limit);
  } catch (err) {
    console.error("[EuropePMC] search failed:", err);
    return [];
  }
}
const DEFAULT_BASE_URL$1 = "https://api.datacite.org";
class DataCiteClient {
  async search(query, pageSize = 10) {
    const resp = await fetchJsonWithRetry(`${this.baseUrl}/dois`, {
      params: {
        query,
        "page[size]": pageSize
      },
      apiName: "DataCite"
    });
    return (resp.data ?? []).map(toCandidate);
  }
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL$1).replace(/\/+$/, "");
  }
}
function toCandidate(item) {
  const attrs = item.attributes ?? {};
  const doi = normalizeDoi(attrs.doi);
  const year = attrs.publicationYear;
  const authors = (attrs.creators ?? []).map((c) => c.name ?? `${c.givenName ?? ""} ${c.familyName ?? ""}`.trim()).filter((n) => n.length > 0);
  const abstract = attrs.descriptions?.find((d) => d.descriptionType === "Abstract")?.description;
  return {
    title: attrs.titles?.[0]?.title ?? "Untitled",
    doi,
    url: attrs.url ?? (doi ? `https://doi.org/${doi}` : void 0),
    year,
    source: "datacite",
    authors,
    abstract,
    journal: attrs.container?.title ?? attrs.publisher
  };
}
async function searchDataCite(query, limit = 10) {
  try {
    return await new DataCiteClient().search(query, limit);
  } catch (err) {
    console.error("[DataCite] search failed:", err);
    return [];
  }
}
function crossrefToCandidate(item) {
  const title = Array.isArray(item.title) ? item.title[0] : item.title;
  return {
    title: title ?? "Untitled",
    doi: normalizeDoi(item.DOI),
    url: item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : void 0),
    year: item.published?.["date-parts"]?.[0]?.[0],
    source: "crossref",
    authors: (item.author ?? []).map((a) => `${a.given ?? ""} ${a.family ?? ""}`.trim()).filter((s) => s.length > 0),
    abstract: stripJats(item.abstract),
    journal: Array.isArray(item["container-title"]) ? item["container-title"][0] : item["container-title"],
    publicationType: item.type
  };
}
async function searchCrossref(query, limit = 10, mailto) {
  try {
    const client = new CrossrefClient({
      mailto: mailto ?? process.env.RESEARCH_MAILTO
    });
    const resp = await client.search(query, limit, 0);
    return (resp.message?.items ?? []).map(crossrefToCandidate);
  } catch (err) {
    console.error("[Crossref] search failed:", err);
    return [];
  }
}
function scholarToCandidate(p) {
  const externalIds = p.externalIds;
  const doi = normalizeDoi(externalIds?.DOI);
  return {
    title: p.title ?? "Untitled",
    doi,
    url: p.url ?? (doi ? `https://doi.org/${doi}` : p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : void 0),
    year: p.year,
    source: "semantic_scholar",
    authors: (p.authors ?? []).map((a) => a.name ?? "").filter((n) => n.length > 0),
    abstract: p.abstract,
    journal: p.journal?.name ?? p.venue,
    publicationType: p.publicationTypes?.[0],
    tldr: p.tldr?.text,
    citationCount: p.citationCount,
    influentialCitationCount: p.influentialCitationCount,
    fieldsOfStudy: p.fieldsOfStudy,
    isOpenAccess: p.isOpenAccess,
    openAccessPdfUrl: p.openAccessPdf?.url,
    s2PaperId: p.paperId
  };
}
const S2_ENRICHMENT_FIELDS = SCHOLAR_PAPER_FIELDS_FULL + ",externalIds,journal,publicationTypes";
function makeScholarClient() {
  return new SemanticScholarClient({
    apiKey: process.env.SEMANTIC_SCHOLAR_API_KEY
  });
}
async function searchSemanticScholar(query, limit = 10) {
  try {
    const resp = await makeScholarClient().search(query, S2_ENRICHMENT_FIELDS, limit, 0);
    return (resp.data ?? []).map(scholarToCandidate);
  } catch (err) {
    console.error("[S2] search failed:", err);
    return [];
  }
}
function openAlexToCandidate(w) {
  const abstract = w.abstract_inverted_index ? reconstructAbstract(w.abstract_inverted_index) : void 0;
  return {
    title: w.title ?? "Untitled",
    doi: normalizeDoi(w.doi),
    url: w.doi ?? w.id,
    year: w.publication_year,
    source: "openalex",
    authors: (w.authorships ?? []).map((a) => a.author?.display_name).filter((n) => !!n),
    abstract,
    journal: w.primary_location?.source?.display_name
  };
}
function reconstructAbstract(index) {
  const tokens = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) tokens.push({
      word,
      pos
    });
  }
  return tokens.sort((a, b) => a.pos - b.pos).map((t) => t.word).join(" ");
}
async function searchOpenAlex(query, limit = 10) {
  try {
    const client = new OpenAlexClient({
      mailto: process.env.RESEARCH_MAILTO
    });
    const resp = await client.search(query, 1, limit);
    return (resp.results ?? []).map(openAlexToCandidate);
  } catch (err) {
    console.error("[OpenAlex] search failed:", err);
    return [];
  }
}
function arxivToCandidate(p) {
  const yearStr = p.published.slice(0, 4);
  const year = /^\d{4}$/.test(yearStr) ? Number(yearStr) : void 0;
  return {
    title: p.title.trim(),
    doi: normalizeDoi(p.doi),
    url: p.link_url ?? `https://arxiv.org/abs/${p.arxiv_id}`,
    year,
    source: "arxiv",
    authors: p.authors,
    abstract: p.summary.trim(),
    journal: "arXiv (preprint)"
  };
}
async function searchArxiv(query, limit = 10) {
  try {
    const client = new ArxivClient();
    const resp = await client.search(query, {
      maxResults: limit
    });
    return resp.papers.map(arxivToCandidate);
  } catch (err) {
    console.error("[arXiv] search failed:", err);
    return [];
  }
}
function coreToCandidate(w) {
  return {
    title: w.title ?? "Untitled",
    doi: normalizeDoi(w.doi),
    url: w.downloadUrl ?? w.sourceFulltextUrls?.[0] ?? (w.doi ? `https://doi.org/${w.doi}` : void 0),
    year: w.yearPublished,
    source: "core",
    authors: (w.authors ?? []).map((a) => a.name).filter((n) => !!n),
    abstract: w.abstract,
    journal: w.publisher,
    citationCount: w.citationCount
  };
}
async function searchCore(query, limit = 10) {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) return [];
  try {
    const client = new CoreClient({
      apiKey
    });
    const resp = await client.search(query, limit, 0);
    return (resp.results ?? []).map(coreToCandidate);
  } catch (err) {
    console.error("[CORE] search failed:", err);
    return [];
  }
}
function zenodoToCandidate(r) {
  const meta = r.metadata ?? {};
  const doi = normalizeDoi(meta.doi ?? r.doi);
  const year = meta.publication_date?.slice(0, 4);
  const yearNum = year && /^\d{4}$/.test(year) ? Number(year) : void 0;
  return {
    title: meta.title ?? r.title ?? "Untitled",
    doi,
    url: r.links?.self_html ?? (doi ? `https://doi.org/${doi}` : void 0),
    year: yearNum,
    source: "zenodo",
    authors: (meta.creators ?? []).map((c) => c.name).filter((n) => !!n),
    abstract: stripJats(meta.description),
    journal: meta.journal?.title ?? meta.resource_type?.title
  };
}
async function searchZenodo(query, limit = 10) {
  try {
    const client = new ZenodoClient({
      accessToken: process.env.ZENODO_ACCESS_TOKEN ?? process.env.ZENODO_TOKEN
    });
    const resp = await client.search(query, 1, limit);
    return (resp.hits?.hits ?? []).map(zenodoToCandidate);
  } catch (err) {
    console.error("[Zenodo] search failed:", err);
    return [];
  }
}

export { searchArxiv, searchCore, searchCrossref, searchDataCite, searchEuropePmc, searchOpenAlex, searchPubMed, searchSemanticScholar, searchZenodo };
//# sourceMappingURL=@ai-apps__research.mjs.map
