/**
 * Research Source Tools
 * Provides multi-source research paper retrieval
 *
 * Integrations:
 * - Crossref API (no auth required)
 * - PubMed API (E-utilities)
 * - Semantic Scholar API (optional API key via SEMANTIC_SCHOLAR_API_KEY env var)
 * - OpenAlex API (requires free API key via OPENALEX_API_KEY env var)
 * - arXiv API (no auth required, Atom XML)
 * - Europe PMC API (no auth required)
 * - DataCite API (no auth required)
 * - Unpaywall API (requires email via UNPAYWALL_EMAIL env var)
 * - DOI Content Negotiation (CSL-JSON fallback)
 *
 * Usage Example:
 * ```typescript
 * // Search multiple sources in parallel
 * const [crossref, pubmed, semantic] = await Promise.all([
 *   searchCrossref("cognitive behavioral therapy anxiety", 10),
 *   searchPubMed("cognitive behavioral therapy anxiety", 10),
 *   searchSemanticScholar("cognitive behavioral therapy anxiety", 10),
 * ]);
 *
 * // Deduplicate results
 * const candidates = dedupeCandidates([...crossref, ...pubmed, ...semantic]);
 *
 * // Fetch full details for top candidate
 * if (candidates.length > 0) {
 *   const details = await fetchPaperDetails(candidates[0]);
 *   console.log(details.title, details.abstract);
 * }
 * ```
 */

export interface PaperCandidate {
  title: string;
  doi?: string;
  url?: string;
  year?: number;
  source: string;
  authors?: string[];
  abstract?: string;
  journal?: string;
  publicationType?: string; // e.g., "journal-article", "book-chapter", "proceedings-article"
  // Semantic Scholar enrichment fields
  tldr?: string;               // AI-generated TLDR summary
  citationCount?: number;
  influentialCitationCount?: number;
  fieldsOfStudy?: string[];
  isOpenAccess?: boolean;
  openAccessPdfUrl?: string;
  s2PaperId?: string;          // S2 internal paper ID for follow-up API calls
}

export interface PaperDetails extends PaperCandidate {
  abstract: string;
  authors: string[];
  citationCount?: number;
  influentialCitationCount?: number;
  tldr?: string;
  fieldsOfStudy?: string[];
  oaUrl?: string; // Open Access full-text URL
  oaStatus?: string; // e.g., "gold", "green", "hybrid", "bronze", "closed"
}

/**
 * Normalize DOI to canonical form (lowercase, no URL prefix)
 */
export function normalizeDoi(doi?: string): string | undefined {
  if (!doi) return undefined;
  const d = doi.trim().toLowerCase();

  // Remove common DOI URL prefixes
  return d
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

/**
 * Strip JATS XML tags from abstracts (common in Crossref)
 */
export function stripJats(input?: string): string | undefined {
  if (!input) return undefined;

  // Crossref abstracts can include JATS tags like <jats:p>...</jats:p>
  // This is a conservative tag-strip (not a full XML parser).
  const noTags = input.replace(/<\/?[^>]+>/g, " ");
  const decoded = noTags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded.replace(/\s+/g, " ").trim();
}

/**
 * Create normalized title fingerprint for better deduplication
 */
export function titleFingerprint(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-") // normalize dashes
    .replace(/[^a-z0-9\s]/g, " ") // drop punctuation
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 2) // remove tiny tokens
    .filter(
      (t) =>
        ![
          "the",
          "and",
          "for",
          "with",
          "from",
          "into",
          "over",
          "under",
          "after",
          "before",
        ].includes(t),
    )
    .sort()
    .join(" ");
}

/**
 * Retry fetch with exponential backoff for rate limiting
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If rate limited, wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s

        console.log(
          `Rate limited (429). Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(
          `Fetch error. Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Score a candidate match against a target paper
 */
export function scoreCandidate(
  c: PaperCandidate,
  target: { title: string; year?: number },
): number {
  let score = 0;

  const cTitle = (c.title || "").trim();
  const tTitle = (target.title || "").trim();

  if (!cTitle || !tTitle) return -1;

  const fpC = titleFingerprint(cTitle);
  const fpT = titleFingerprint(tTitle);

  // Simple overlap score on fingerprint tokens
  const setC = new Set(fpC.split(" ").filter(Boolean));
  const setT = new Set(fpT.split(" ").filter(Boolean));

  let overlap = 0;
  for (const tok of setT) if (setC.has(tok)) overlap++;

  const denom = Math.max(1, setT.size);
  const overlapRatio = overlap / denom;

  // Title similarity dominates
  score += overlapRatio * 70;

  // Year match helps (if you have it)
  if (target.year && c.year) {
    const diff = Math.abs(target.year - c.year);
    score += diff === 0 ? 15 : diff === 1 ? 8 : diff <= 3 ? 2 : -5;
  }

  // Prefer candidates with DOI + abstract + authors
  if (c.doi) score += 8;
  if (c.abstract && stripJats(c.abstract)?.length) score += 5;
  if (c.authors && c.authors.length > 0) score += 2;

  // Source preference (tune as needed)
  if (c.source === "openalex") score += 4; // broad coverage, good metadata
  if (c.source === "semantic_scholar") score += 3; // good for CS/general
  if (c.source === "crossref") score += 2; // authoritative DOIs
  if (c.source === "europepmc") score += 1; // good for biomed
  if (c.source === "arxiv") score += 0; // preprints, may not be final
  if (c.source === "datacite") score -= 1; // often datasets, not papers
  if (c.source === "pubmed") score -= 1; // for labor econ, usually noise

  // Citation count as quality signal (log-scale, capped at +8)
  if (c.citationCount !== undefined && c.citationCount > 0) {
    score += Math.min(Math.log10(c.citationCount) * 2, 8);
  }
  // Influential citations are a stronger signal of field impact
  if (c.influentialCitationCount !== undefined && c.influentialCitationCount > 0) {
    score += Math.min(c.influentialCitationCount * 0.5, 4);
  }
  // TLDR presence means S2 has fully indexed and analyzed the paper
  if (c.tldr) score += 2;

  return score;
}

/**
 * Pick the best matching candidate from a list
 */
export function pickBestCandidate(
  candidates: PaperCandidate[],
  target: { title: string; year?: number },
): PaperCandidate | null {
  if (!candidates.length) return null;

  let best: PaperCandidate | null = null;
  let bestScore = -Infinity;

  for (const c of candidates) {
    const s = scoreCandidate(c, target);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }

  // Guardrail: require some title similarity
  if (bestScore < 35) return null;
  return best;
}

/**
 * Search Crossref for papers
 */
export async function searchCrossref(
  query: string,
  limit: number = 10,
): Promise<PaperCandidate[]> {
  try {
    const url = new URL("https://api.crossref.org/works");
    url.searchParams.set("query", query);
    url.searchParams.set("rows", limit.toString());
    url.searchParams.set(
      "select",
      "DOI,title,author,published,container-title,abstract,URL,type",
    );

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "AI-Therapist/1.0 (mailto:research@example.com)",
      },
    });

    if (!response.ok) {
      console.error(`Crossref API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = data.message?.items || [];

    return items.map((item: any) => ({
      title: Array.isArray(item.title)
        ? item.title[0]
        : item.title || "Untitled",
      doi: item.DOI,
      url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : undefined),
      year: item.published?.["date-parts"]?.[0]?.[0],
      source: "crossref",
      authors: item.author
        ?.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim())
        .filter(Boolean),
      abstract: item.abstract,
      journal: Array.isArray(item["container-title"])
        ? item["container-title"][0]
        : item["container-title"],
      publicationType: item.type,
    }));
  } catch (error) {
    console.error("Error searching Crossref:", error);
    return [];
  }
}

/**
 * Search PubMed for papers
 */
export async function searchPubMed(
  query: string,
  limit: number = 10,
): Promise<PaperCandidate[]> {
  try {
    // Step 1: Search for PMIDs
    const searchUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
    );
    searchUrl.searchParams.set("db", "pubmed");
    searchUrl.searchParams.set("term", query);
    searchUrl.searchParams.set("retmax", limit.toString());
    searchUrl.searchParams.set("retmode", "json");

    const searchResponse = await fetchWithRetry(searchUrl.toString());
    if (!searchResponse.ok) {
      console.error(`PubMed search error: ${searchResponse.status}`);
      return [];
    }

    const searchData = await searchResponse.json();
    const idList = searchData.esearchresult?.idlist || [];

    if (idList.length === 0) {
      return [];
    }

    // Step 2: Fetch summaries for PMIDs
    const summaryUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
    );
    summaryUrl.searchParams.set("db", "pubmed");
    summaryUrl.searchParams.set("id", idList.join(","));
    summaryUrl.searchParams.set("retmode", "json");

    const summaryResponse = await fetchWithRetry(summaryUrl.toString());
    if (!summaryResponse.ok) {
      console.error(`PubMed summary error: ${summaryResponse.status}`);
      return [];
    }

    const summaryData = await summaryResponse.json();
    const results = summaryData.result;

    return idList
      .map((id: string) => {
        const paper = results[id];
        if (!paper) return null;

        return {
          title: paper.title || "Untitled",
          doi: paper.elocationid
            ?.split(" ")
            .find((id: string) => id.startsWith("doi:"))
            ?.replace("doi:", ""),
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          year: parseInt(paper.pubdate?.split(" ")[0]),
          source: "pubmed",
          authors: paper.authors?.map((a: any) => a.name) || [],
          journal: paper.fulljournalname || paper.source,
        };
      })
      .filter(Boolean) as PaperCandidate[];
  } catch (error) {
    console.error("Error searching PubMed:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Semantic Scholar helpers
// ---------------------------------------------------------------------------

/** Fields requested on every S2 paper call */
const S2_FIELDS =
  "paperId,title,abstract,year,authors,externalIds,journal,url,tldr," +
  "citationCount,influentialCitationCount,fieldsOfStudy,isOpenAccess," +
  "openAccessPdf,publicationTypes";

/** Inject API key header when SEMANTIC_SCHOLAR_API_KEY is set */
function semanticScholarHeaders(): Record<string, string> {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  return key ? { "x-api-key": key } : {};
}

/** Map a raw S2 paper object to PaperCandidate */
function mapS2Paper(paper: any): PaperCandidate {
  return {
    title: paper.title || "Untitled",
    doi: paper.externalIds?.DOI,
    url:
      paper.url ||
      (paper.externalIds?.DOI
        ? `https://doi.org/${paper.externalIds.DOI}`
        : paper.paperId
          ? `https://www.semanticscholar.org/paper/${paper.paperId}`
          : undefined),
    year: paper.year,
    source: "semantic_scholar",
    authors: paper.authors?.map((a: any) => a.name) || [],
    abstract: paper.abstract,
    journal: paper.journal?.name,
    publicationType: paper.publicationTypes?.[0],
    tldr: paper.tldr?.text,
    citationCount: paper.citationCount,
    influentialCitationCount: paper.influentialCitationCount,
    fieldsOfStudy: paper.fieldsOfStudy,
    isOpenAccess: paper.isOpenAccess,
    openAccessPdfUrl: paper.openAccessPdf?.url,
    s2PaperId: paper.paperId,
  };
}

/**
 * Search Semantic Scholar for papers (relevance-ranked, up to 1,000 results).
 * Fetches TLDR summaries, citation counts, open-access PDF links, and more.
 * Set SEMANTIC_SCHOLAR_API_KEY env var for higher rate limits.
 */
export async function searchSemanticScholar(
  query: string,
  limit: number = 10,
): Promise<PaperCandidate[]> {
  try {
    const url = new URL(
      "https://api.semanticscholar.org/graph/v1/paper/search",
    );
    url.searchParams.set("query", query);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);

    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders(),
    });

    if (!response.ok) {
      console.error(`Semantic Scholar search error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.data || []).map(mapS2Paper);
  } catch (error) {
    console.error("Error searching Semantic Scholar:", error);
    return [];
  }
}

/**
 * Fetch a single Semantic Scholar paper by any supported ID format:
 *   S2 hash, DOI:xxx, ARXIV:xxx, PMID:xxx, PMCID:xxx, ACL:xxx, MAG:xxx
 */
export async function getSemanticScholarPaper(
  paperId: string,
): Promise<PaperCandidate | null> {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}`,
    );
    url.searchParams.set("fields", S2_FIELDS);

    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders(),
    });

    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`Semantic Scholar paper lookup error: ${response.status}`);
      }
      return null;
    }

    return mapS2Paper(await response.json());
  } catch (error) {
    console.error("Error fetching Semantic Scholar paper:", error);
    return null;
  }
}

/**
 * Batch-fetch up to 500 papers by ID in a single request.
 * IDs can mix formats: S2 hash, DOI:xxx, PMID:xxx, ARXIV:xxx, etc.
 */
export async function getSemanticScholarPapersBatch(
  paperIds: string[],
): Promise<PaperCandidate[]> {
  if (paperIds.length === 0) return [];

  const results: PaperCandidate[] = [];

  // API hard limit: 500 IDs per request
  for (let i = 0; i < paperIds.length; i += 500) {
    const chunk = paperIds.slice(i, i + 500);
    try {
      const url = new URL(
        "https://api.semanticscholar.org/graph/v1/paper/batch",
      );
      url.searchParams.set("fields", S2_FIELDS);

      const response = await fetchWithRetry(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...semanticScholarHeaders(),
        },
        body: JSON.stringify({ ids: chunk }),
      });

      if (!response.ok) {
        console.error(`Semantic Scholar batch error: ${response.status}`);
        continue;
      }

      const papers: any[] = await response.json();
      results.push(...papers.filter(Boolean).map(mapS2Paper));
    } catch (error) {
      console.error("Error in Semantic Scholar batch lookup:", error);
    }
  }

  return results;
}

/**
 * Fetch papers that Semantic Scholar recommends as similar to the given paper.
 * `paperId` must be a Semantic Scholar paper ID (s2PaperId field).
 */
export async function getSemanticScholarRecommendations(
  paperId: string,
  limit: number = 20,
): Promise<PaperCandidate[]> {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}`,
    );
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);

    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders(),
    });

    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`Semantic Scholar recommendations error: ${response.status}`);
      }
      return [];
    }

    const data = await response.json();
    return (data.recommendedPapers || []).map(mapS2Paper);
  } catch (error) {
    console.error("Error fetching Semantic Scholar recommendations:", error);
    return [];
  }
}

/**
 * Fetch papers that cite the given paper (forward citation graph).
 * `paperId` must be a Semantic Scholar paper ID (s2PaperId field).
 */
export async function getSemanticScholarCitations(
  paperId: string,
  limit: number = 25,
): Promise<PaperCandidate[]> {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}/citations`,
    );
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);

    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders(),
    });

    if (!response.ok) {
      console.error(`Semantic Scholar citations error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.data || [])
      .map((c: any) => c.citingPaper)
      .filter(Boolean)
      .map(mapS2Paper);
  } catch (error) {
    console.error("Error fetching Semantic Scholar citations:", error);
    return [];
  }
}

/**
 * Search OpenAlex for papers
 * Requires OPENALEX_API_KEY environment variable (free from openalex.org)
 */
export async function searchOpenAlex(
  query: string,
  limit: number = 10,
): Promise<PaperCandidate[]> {
  try {
    const apiKey = process.env.OPENALEX_API_KEY;
    if (!apiKey) {
      console.warn("OPENALEX_API_KEY not set, skipping OpenAlex");
      return [];
    }

    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", limit.toString());
    url.searchParams.set(
      "mailto",
      process.env.UNPAYWALL_EMAIL || "research@example.com",
    );

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`OpenAlex API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];

    return results.map((work: any) => ({
      title: work.title || "Untitled",
      doi: work.doi?.replace("https://doi.org/", ""),
      url: work.doi || work.id,
      year: work.publication_year,
      source: "openalex",
      authors:
        work.authorships
          ?.map((a: any) => a.author?.display_name)
          .filter(Boolean) || [],
      abstract: work.abstract_inverted_index
        ? reconstructAbstract(work.abstract_inverted_index)
        : undefined,
      journal:
        work.primary_location?.source?.display_name ||
        work.host_venue?.display_name,
    }));
  } catch (error) {
    console.error("Error searching OpenAlex:", error);
    return [];
  }
}

/**
 * Reconstruct abstract from OpenAlex inverted index
 */
function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const tokens: { word: string; pos: number }[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      tokens.push({ word, pos });
    }
  }
  return tokens
    .sort((a, b) => a.pos - b.pos)
    .map((t) => t.word)
    .join(" ");
}

/**
 * Search arXiv for preprints
 * Returns Atom XML which is parsed to PaperCandidates
 */
export async function searchArxiv(
  query: string,
  limit: number = 10,
): Promise<PaperCandidate[]> {
  try {
    const url = new URL("http://export.arxiv.org/api/query");
    url.searchParams.set("search_query", `all:${query}`);
    url.searchParams.set("start", "0");
    url.searchParams.set("max_results", limit.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`arXiv API error: ${response.status}`);
      return [];
    }

    const xml = await response.text();

    // Basic XML parsing for entries
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

    return entries.map((match) => {
      const entry = match[1];
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(\d{4})/);
      const idMatch = entry.match(/<id>([^<]+)<\/id>/);
      const doiMatch = entry.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/);
      const authorMatches = [
        ...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g),
      ];

      return {
        title: titleMatch?.[1]?.replace(/\s+/g, " ").trim() || "Untitled",
        doi: doiMatch?.[1]?.trim(),
        url: idMatch?.[1]?.trim(),
        year: publishedMatch?.[1] ? parseInt(publishedMatch[1]) : undefined,
        source: "arxiv",
        authors: authorMatches.map((m) => m[1].trim()),
        abstract: summaryMatch?.[1]?.replace(/\s+/g, " ").trim(),
        journal: "arXiv (preprint)",
      };
    });
  } catch (error) {
    console.error("Error searching arXiv:", error);
    return [];
  }
}

/**
 * Search Europe PMC for biomedical/life-science papers
 */
export async function searchEuropePmc(
  query: string,
  limit: number = 10,
): Promise<PaperCandidate[]> {
  try {
    const url = new URL(
      "https://www.ebi.ac.uk/europepmc/webservices/rest/search",
    );
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", limit.toString());
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`Europe PMC API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.resultList?.result || [];

    return results.map((paper: any) => ({
      title: paper.title || "Untitled",
      doi: paper.doi,
      url: paper.doi
        ? `https://doi.org/${paper.doi}`
        : paper.pmid
          ? `https://europepmc.org/article/MED/${paper.pmid}`
          : undefined,
      year: parseInt(paper.pubYear),
      source: "europepmc",
      authors: paper.authorString?.split(", ") || [],
      abstract: paper.abstractText,
      journal: paper.journalTitle,
    }));
  } catch (error) {
    console.error("Error searching Europe PMC:", error);
    return [];
  }
}

/**
 * Search DataCite for datasets, software, and other research outputs
 */
export async function searchDataCite(
  query: string,
  limit: number = 10,
): Promise<PaperCandidate[]> {
  try {
    const url = new URL("https://api.datacite.org/dois");
    url.searchParams.set("query", query);
    url.searchParams.set("page[size]", limit.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`DataCite API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.data || [];

    return results.map((item: any) => {
      const attrs = item.attributes;
      return {
        title: attrs.titles?.[0]?.title || "Untitled",
        doi: attrs.doi,
        url: attrs.url || `https://doi.org/${attrs.doi}`,
        year: attrs.publicationYear,
        source: "datacite",
        authors:
          attrs.creators
            ?.map(
              (c: any) =>
                c.name || `${c.givenName || ""} ${c.familyName || ""}`.trim(),
            )
            .filter(Boolean) || [],
        abstract: attrs.descriptions?.find(
          (d: any) => d.descriptionType === "Abstract",
        )?.description,
        journal: attrs.container?.title || attrs.publisher,
      };
    });
  } catch (error) {
    console.error("Error searching DataCite:", error);
    return [];
  }
}

/**
 * Get Open Access full-text URL via Unpaywall
 * Requires UNPAYWALL_EMAIL environment variable
 */
export async function getUnpaywallOaUrl(
  doi: string,
): Promise<{ oaUrl?: string; oaStatus?: string } | null> {
  try {
    const email = process.env.UNPAYWALL_EMAIL;
    if (!email) {
      console.warn("UNPAYWALL_EMAIL not set, skipping Unpaywall lookup");
      return null;
    }

    const normalizedDoi = normalizeDoi(doi);
    if (!normalizedDoi) return null;

    const url = `https://api.unpaywall.org/v2/${normalizedDoi}?email=${email}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`Unpaywall API error: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    return {
      oaUrl: data.best_oa_location?.url_for_pdf || data.best_oa_location?.url,
      oaStatus: data.oa_status,
    };
  } catch (error) {
    console.error("Error fetching Unpaywall data:", error);
    return null;
  }
}

/**
 * Fetch metadata via DOI content negotiation (CSL-JSON)
 * Fast fallback when source APIs are flaky
 */
export async function fetchDoiMetadata(
  doi: string,
): Promise<Partial<PaperCandidate> | null> {
  try {
    const normalizedDoi = normalizeDoi(doi);
    if (!normalizedDoi) return null;

    const url = `https://doi.org/${normalizedDoi}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.citationstyles.csl+json",
      },
    });

    if (!response.ok) {
      console.error(`DOI content negotiation error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      title: data.title || data["title-short"],
      doi: normalizedDoi,
      url: data.URL || `https://doi.org/${normalizedDoi}`,
      year:
        data.issued?.["date-parts"]?.[0]?.[0] ||
        data.published?.["date-parts"]?.[0]?.[0],
      authors: data.author
        ?.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim())
        .filter(Boolean),
      abstract: data.abstract,
      journal: data["container-title"] || data.publisher,
    };
  } catch (error) {
    console.error("Error fetching DOI metadata:", error);
    return null;
  }
}

/**
 * Fetch DOI and full abstract from PubMed via efetch XML
 */
export async function fetchPubMedDoiAndAbstractByPmid(
  pmid: string,
): Promise<{ doi?: string; abstract?: string }> {
  const url = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
  );
  url.searchParams.set("db", "pubmed");
  url.searchParams.set("id", pmid);
  url.searchParams.set("retmode", "xml");

  const response = await fetch(url.toString());
  if (!response.ok) return {};

  const xml = await response.text();

  // DOI via ArticleIdList
  const doiMatch = xml.match(
    /<ArticleId[^>]*IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/i,
  );
  const doi = doiMatch?.[1]?.trim();

  // Abstract can have multiple AbstractText blocks; join them.
  const abstractBlocks = [
    ...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi),
  ]
    .map((m) =>
      m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

  const abstract = abstractBlocks.length
    ? abstractBlocks.join("\n")
    : undefined;

  return { doi: normalizeDoi(doi), abstract };
}

/**
 * Fetch full paper details
 */
export async function fetchPaperDetails(
  candidate: PaperCandidate,
): Promise<PaperDetails> {
  try {
    // First, check if we have enriched data from OpenAlex (attached during enrichment step)
    const enriched = candidate as any;
    if (enriched._enrichedAbstract) {
      return {
        ...candidate,
        abstract: enriched._enrichedAbstract,
        year: candidate.year || enriched._enrichedYear,
        journal: candidate.journal || enriched._enrichedVenue,
        authors: candidate.authors || enriched._enrichedAuthors || [],
        doi: normalizeDoi(candidate.doi),
      };
    }

    // Try to enrich from Crossref if we have a DOI
    if (candidate.doi) {
      const url = `https://api.crossref.org/works/${encodeURIComponent(candidate.doi)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "AI-Therapist/1.0 (mailto:research@example.com)",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const item = data.message;

        return {
          ...candidate,
          title:
            candidate.title ||
            (Array.isArray(item.title) ? item.title[0] : item.title),
          abstract:
            item.abstract || candidate.abstract || "Abstract not available",
          authors:
            candidate.authors ||
            item.author
              ?.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim())
              .filter(Boolean) ||
            [],
          year: candidate.year || item.published?.["date-parts"]?.[0]?.[0],
          journal:
            candidate.journal ||
            (Array.isArray(item["container-title"])
              ? item["container-title"][0]
              : item["container-title"]),
        };
      }
    }

    // If from PubMed, try to get DOI and full abstract
    if (candidate.source === "pubmed" && candidate.url) {
      const pmid = candidate.url.match(/\/(\d+)\//)?.[1];
      if (pmid) {
        const extra = await fetchPubMedDoiAndAbstractByPmid(pmid);
        return {
          ...candidate,
          doi: candidate.doi || extra.doi,
          abstract:
            extra.abstract || candidate.abstract || "Abstract not available",
          authors: candidate.authors || [],
        };
      }
    }

    // If from Semantic Scholar, re-fetch with full field set
    if (
      candidate.source === "semantic_scholar" &&
      (candidate.doi || candidate.s2PaperId)
    ) {
      const s2Id = candidate.doi
        ? `DOI:${candidate.doi}`
        : candidate.s2PaperId!;
      const enriched = await getSemanticScholarPaper(s2Id);
      if (enriched) {
        return {
          ...candidate,
          ...enriched,
          // Preserve any already-set OA info from Unpaywall
          oaUrl: (candidate as any).oaUrl ?? enriched.openAccessPdfUrl,
          abstract: enriched.abstract || candidate.abstract || "Abstract not available",
          authors: enriched.authors?.length ? enriched.authors : (candidate.authors || []),
        };
      }
    }
  } catch (error) {
    console.error("Error fetching paper details:", error);
  }

  // Try DOI content negotiation as fallback
  if (candidate.doi) {
    const doiData = await fetchDoiMetadata(candidate.doi);
    if (doiData) {
      const merged = {
        ...candidate,
        title: candidate.title || doiData.title || "Untitled",
        abstract:
          stripJats(candidate.abstract || doiData.abstract) ||
          "Abstract not available",
        authors: candidate.authors?.length
          ? candidate.authors
          : doiData.authors || [],
        year: candidate.year || doiData.year,
        journal: candidate.journal || doiData.journal,
        doi: normalizeDoi(candidate.doi),
      };

      // Add OA link if available
      const oaData = await getUnpaywallOaUrl(candidate.doi);
      return {
        ...merged,
        oaUrl: oaData?.oaUrl,
        oaStatus: oaData?.oaStatus,
      };
    }
  }

  // Fallback to candidate data
  const result: PaperDetails = {
    ...candidate,
    abstract: stripJats(candidate.abstract) || "Abstract not available",
    authors: candidate.authors || [],
    doi: normalizeDoi(candidate.doi),
  };

  // Try to add OA link even without full enrichment
  if (candidate.doi) {
    const oaData = await getUnpaywallOaUrl(candidate.doi);
    if (oaData) {
      result.oaUrl = oaData.oaUrl;
      result.oaStatus = oaData.oaStatus;
    }
  }

  return result;
}

/**
 * Deduplicate candidates by normalized DOI and title fingerprint
 */
export function dedupeCandidates(
  candidates: PaperCandidate[],
): PaperCandidate[] {
  const seen = new Set<string>();
  const unique: PaperCandidate[] = [];

  for (const c of candidates) {
    const doi = normalizeDoi(c.doi);
    const titleKey = c.title ? titleFingerprint(c.title) : "";

    // Prefer DOI, fallback to title fingerprint
    const key = doi ? `doi:${doi}` : `t:${titleKey}`;

    if (!titleKey && !doi) continue;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ ...c, doi });
    }
  }

  return unique;
}

/**
 * Filter out book chapters and other non-journal publications
 * Crossref type values: https://api.crossref.org/types
 */
export function filterBookChapters(
  candidates: PaperCandidate[],
): PaperCandidate[] {
  const excludedTypes = new Set([
    "book-chapter",
    "book-section",
    "book-part",
    "reference-entry", // encyclopedia entries
    "book",
    "monograph",
    "edited-book",
    "reference-book",
  ]);

  return candidates.filter((c) => {
    // If no type available, allow through (benefit of doubt for other sources)
    if (!c.publicationType) return true;
    
    // Exclude known book-related types
    if (excludedTypes.has(c.publicationType)) {
      console.log(`🚫 Filtered book chapter: "${c.title}" (type: ${c.publicationType})`);
      return false;
    }
    
    return true;
  });
}

/**
 * Hard exclusion: filter out titles with forensic/child/legal keywords
 */
export function filterIrrelevantTitles(
  candidates: PaperCandidate[],
): PaperCandidate[] {
  const exclusionRegex = /\b(child|forensic|witness|court|legal|police|criminal|abuse|victim|testimony|investigative interview|law enforcement)\b/i;
  
  return candidates.filter((c) => {
    if (exclusionRegex.test(c.title)) {
      console.log(`🚫 Filtered irrelevant title: "${c.title}"`);
      return false;
    }
    return true;
  });
}

/**
 * Filter candidates with insufficient abstracts
 */
export function filterShortAbstracts(
  candidates: PaperCandidate[],
  minLength: number = 200,
): PaperCandidate[] {
  return candidates.filter((c) => {
    if (!c.abstract || c.abstract.length < minLength) {
      console.log(`🚫 Filtered short/missing abstract: "${c.title}" (${c.abstract?.length || 0} chars)`);
      return false;
    }
    return true;
  });
}

/**
 * Apply all quality filters in pipeline
 */
export function applyQualityFilters(
  candidates: PaperCandidate[],
  opts?: { minAbstractLength?: number; skipAbstractCheck?: boolean },
): PaperCandidate[] {
  const minAbstract = opts?.minAbstractLength ?? 200;
  
  let filtered = filterBookChapters(candidates);
  filtered = filterIrrelevantTitles(filtered);
  
  if (!opts?.skipAbstractCheck) {
    filtered = filterShortAbstracts(filtered, minAbstract);
  }
  
  console.log(`📊 Quality filter: ${candidates.length} → ${filtered.length} candidates`);
  return filtered;
}

/**
 * Resolve paper metadata by title (optionally with year)
 * This is the main function for your 182-paper backfill use case
 */
export async function resolvePaperByTitle(
  title: string,
  opts?: { year?: number; limitPerSource?: number },
): Promise<PaperDetails | null> {
  const limit = opts?.limitPerSource ?? 8;

  // Search all available sources in parallel
  const [crossref, pubmed, semantic, openalex, arxiv, europepmc] =
    await Promise.all([
      searchCrossref(title, limit),
      searchPubMed(title, limit),
      searchSemanticScholar(title, limit),
      searchOpenAlex(title, limit),
      searchArxiv(title, limit),
      searchEuropePmc(title, limit),
    ]);

  const candidates = dedupeCandidates([
    ...crossref,
    ...pubmed,
    ...semantic,
    ...openalex,
    ...arxiv,
    ...europepmc,
  ]);
  const best = pickBestCandidate(candidates, { title, year: opts?.year });

  if (!best) return null;

  // Enrich details using existing function
  const details = await fetchPaperDetails(best);

  // Extra PubMed enrichment if needed (DOI/abstract)
  if (details.source === "pubmed" && details.url) {
    const pmid = details.url.match(/\/(\d+)\//)?.[1];
    if (pmid) {
      const extra = await fetchPubMedDoiAndAbstractByPmid(pmid);
      return {
        ...details,
        doi: details.doi ?? extra.doi,
        abstract:
          details.abstract && details.abstract !== "Abstract not available"
            ? details.abstract
            : (extra.abstract ?? details.abstract),
        authors: details.authors ?? [],
      };
    }
  }

  return {
    ...details,
    abstract: stripJats(details.abstract) ?? "Abstract not available",
    doi: normalizeDoi(details.doi),
  };
}

/**
 * Process items with controlled concurrency
 * Useful for batch-processing your 182 papers without overwhelming APIs
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  const workers = new Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        results[idx] = await fn(items[idx], idx);
      }
    });

  await Promise.all(workers);
  return results;
}

export const sourceTools = {
  // Search functions
  searchCrossref,
  searchPubMed,
  searchSemanticScholar,
  searchOpenAlex,
  searchArxiv,
  searchEuropePmc,
  searchDataCite,

  // Semantic Scholar extended API
  getSemanticScholarPaper,
  getSemanticScholarPapersBatch,
  getSemanticScholarRecommendations,
  getSemanticScholarCitations,

  // Enrichment functions
  fetchPaperDetails,
  fetchPubMedDoiAndAbstractByPmid,
  fetchDoiMetadata,
  getUnpaywallOaUrl,

  // Resolution and deduplication
  dedupeCandidates,
  resolvePaperByTitle,
  pickBestCandidate,

  // Quality filters
  filterBookChapters,
  filterIrrelevantTitles,
  filterShortAbstracts,
  applyQualityFilters,

  // Utilities
  mapLimit,
  normalizeDoi,
  stripJats,
  titleFingerprint,
  scoreCandidate,
};
