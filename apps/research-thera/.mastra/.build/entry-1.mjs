import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

"use strict";
const DEEPSEEK_API_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODELS = {
  CHAT: "deepseek-chat",
  REASONER: "deepseek-reasoner"
};
class DeepSeekClient {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    if (!this.apiKey)
      throw new Error("DEEPSEEK_API_KEY environment variable is required");
    this.baseURL = DEEPSEEK_API_BASE_URL;
  }
  async chat(request) {
    const resp = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ ...request, stream: false })
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(
        body.error?.message || `DeepSeek HTTP ${resp.status}`
      );
    }
    return body;
  }
}
let _client = null;
function getDefaultClient() {
  if (!_client) _client = new DeepSeekClient();
  return _client;
}
const _provider = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1"
});
const deepseekModel = (model = DEEPSEEK_MODELS.CHAT) => _provider(model);
async function generateObject({
  schema,
  prompt,
  model = DEEPSEEK_MODELS.CHAT,
  temperature,
  max_tokens
}) {
  const response = await getDefaultClient().chat({
    model,
    messages: [
      { role: "system", content: "Respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature,
    max_tokens
  });
  if (!response.choices?.length) {
    throw new Error(`DeepSeek returned no choices: ${JSON.stringify(response).slice(0, 300)}`);
  }
  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return { object: schema.parse(parsed) };
}

"use strict";
function normalizeDoi(doi) {
  if (!doi) return void 0;
  const d = doi.trim().toLowerCase();
  return d.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:\s*/i, "").trim();
}
function stripJats(input) {
  if (!input) return void 0;
  const noTags = input.replace(/<\/?[^>]+>/g, " ");
  const decoded = noTags.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}
function titleFingerprint(title) {
  return title.toLowerCase().replace(/[\u2010-\u2015]/g, "-").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter((t) => t.length > 2).filter(
    (t) => ![
      "the",
      "and",
      "for",
      "with",
      "from",
      "into",
      "over",
      "under",
      "after",
      "before"
    ].includes(t)
  ).sort().join(" ");
}
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter ? parseInt(retryAfter) * 1e3 : Math.min(1e3 * Math.pow(2, attempt), 1e4);
        console.log(
          `Rate limited (429). Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const waitMs = Math.min(1e3 * Math.pow(2, attempt), 1e4);
        console.log(
          `Fetch error. Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }
  throw lastError || new Error("Max retries exceeded");
}
function scoreCandidate(c, target) {
  let score = 0;
  const cTitle = (c.title || "").trim();
  const tTitle = (target.title || "").trim();
  if (!cTitle || !tTitle) return -1;
  const fpC = titleFingerprint(cTitle);
  const fpT = titleFingerprint(tTitle);
  const setC = new Set(fpC.split(" ").filter(Boolean));
  const setT = new Set(fpT.split(" ").filter(Boolean));
  let overlap = 0;
  for (const tok of setT) if (setC.has(tok)) overlap++;
  const denom = Math.max(1, setT.size);
  const overlapRatio = overlap / denom;
  score += overlapRatio * 70;
  if (target.year && c.year) {
    const diff = Math.abs(target.year - c.year);
    score += diff === 0 ? 15 : diff === 1 ? 8 : diff <= 3 ? 2 : -5;
  }
  if (c.doi) score += 8;
  if (c.abstract && stripJats(c.abstract)?.length) score += 5;
  if (c.authors && c.authors.length > 0) score += 2;
  if (c.source === "openalex") score += 4;
  if (c.source === "semantic_scholar") score += 3;
  if (c.source === "crossref") score += 2;
  if (c.source === "europepmc") score += 1;
  if (c.source === "arxiv") score += 0;
  if (c.source === "datacite") score -= 1;
  if (c.source === "pubmed") score -= 1;
  if (c.citationCount !== void 0 && c.citationCount > 0) {
    score += Math.min(Math.log10(c.citationCount) * 2, 8);
  }
  if (c.influentialCitationCount !== void 0 && c.influentialCitationCount > 0) {
    score += Math.min(c.influentialCitationCount * 0.5, 4);
  }
  if (c.tldr) score += 2;
  return score;
}
function pickBestCandidate(candidates, target) {
  if (!candidates.length) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scoreCandidate(c, target);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  if (bestScore < 35) return null;
  return best;
}
async function searchCrossref(query, limit = 10) {
  try {
    const url = new URL("https://api.crossref.org/works");
    url.searchParams.set("query", query);
    url.searchParams.set("rows", limit.toString());
    url.searchParams.set(
      "select",
      "DOI,title,author,published,container-title,abstract,URL,type"
    );
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "AI-Therapist/1.0 (mailto:research@example.com)"
      }
    });
    if (!response.ok) {
      console.error(`Crossref API error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    const items = data.message?.items || [];
    return items.map((item) => ({
      title: Array.isArray(item.title) ? item.title[0] : item.title || "Untitled",
      doi: item.DOI,
      url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : void 0),
      year: item.published?.["date-parts"]?.[0]?.[0],
      source: "crossref",
      authors: item.author?.map((a) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean),
      abstract: item.abstract,
      journal: Array.isArray(item["container-title"]) ? item["container-title"][0] : item["container-title"],
      publicationType: item.type
    }));
  } catch (error) {
    console.error("Error searching Crossref:", error);
    return [];
  }
}
async function searchPubMed(query, limit = 10) {
  try {
    const searchUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
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
    const summaryUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
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
    return idList.map((id) => {
      const paper = results[id];
      if (!paper) return null;
      return {
        title: paper.title || "Untitled",
        doi: paper.elocationid?.split(" ").find((id2) => id2.startsWith("doi:"))?.replace("doi:", ""),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        year: parseInt(paper.pubdate?.split(" ")[0]),
        source: "pubmed",
        authors: paper.authors?.map((a) => a.name) || [],
        journal: paper.fulljournalname || paper.source
      };
    }).filter(Boolean);
  } catch (error) {
    console.error("Error searching PubMed:", error);
    return [];
  }
}
const S2_FIELDS = "paperId,title,abstract,year,authors,externalIds,journal,url,tldr,citationCount,influentialCitationCount,fieldsOfStudy,isOpenAccess,openAccessPdf,publicationTypes";
function semanticScholarHeaders() {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  return key ? { "x-api-key": key } : {};
}
function mapS2Paper(paper) {
  return {
    title: paper.title || "Untitled",
    doi: paper.externalIds?.DOI,
    url: paper.url || (paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : void 0),
    year: paper.year,
    source: "semantic_scholar",
    authors: paper.authors?.map((a) => a.name) || [],
    abstract: paper.abstract,
    journal: paper.journal?.name,
    publicationType: paper.publicationTypes?.[0],
    tldr: paper.tldr?.text,
    citationCount: paper.citationCount,
    influentialCitationCount: paper.influentialCitationCount,
    fieldsOfStudy: paper.fieldsOfStudy,
    isOpenAccess: paper.isOpenAccess,
    openAccessPdfUrl: paper.openAccessPdf?.url,
    s2PaperId: paper.paperId
  };
}
async function searchSemanticScholar(query, limit = 10) {
  try {
    const url = new URL(
      "https://api.semanticscholar.org/graph/v1/paper/search"
    );
    url.searchParams.set("query", query);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);
    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders()
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
async function getSemanticScholarPaper(paperId) {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}`
    );
    url.searchParams.set("fields", S2_FIELDS);
    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders()
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
async function getSemanticScholarPapersBatch(paperIds) {
  if (paperIds.length === 0) return [];
  const results = [];
  for (let i = 0; i < paperIds.length; i += 500) {
    const chunk = paperIds.slice(i, i + 500);
    try {
      const url = new URL(
        "https://api.semanticscholar.org/graph/v1/paper/batch"
      );
      url.searchParams.set("fields", S2_FIELDS);
      const response = await fetchWithRetry(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...semanticScholarHeaders()
        },
        body: JSON.stringify({ ids: chunk })
      });
      if (!response.ok) {
        console.error(`Semantic Scholar batch error: ${response.status}`);
        continue;
      }
      const papers = await response.json();
      results.push(...papers.filter(Boolean).map(mapS2Paper));
    } catch (error) {
      console.error("Error in Semantic Scholar batch lookup:", error);
    }
  }
  return results;
}
async function getSemanticScholarRecommendations(paperId, limit = 20) {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}`
    );
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);
    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders()
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
async function getSemanticScholarCitations(paperId, limit = 25) {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}/citations`
    );
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);
    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders()
    });
    if (!response.ok) {
      console.error(`Semantic Scholar citations error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return (data.data || []).map((c) => c.citingPaper).filter(Boolean).map(mapS2Paper);
  } catch (error) {
    console.error("Error fetching Semantic Scholar citations:", error);
    return [];
  }
}
async function searchOpenAlex(query, limit = 10) {
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
      process.env.UNPAYWALL_EMAIL || "research@example.com"
    );
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    if (!response.ok) {
      console.error(`OpenAlex API error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    const results = data.results || [];
    return results.map((work) => ({
      title: work.title || "Untitled",
      doi: work.doi?.replace("https://doi.org/", ""),
      url: work.doi || work.id,
      year: work.publication_year,
      source: "openalex",
      authors: work.authorships?.map((a) => a.author?.display_name).filter(Boolean) || [],
      abstract: work.abstract_inverted_index ? reconstructAbstract(work.abstract_inverted_index) : void 0,
      journal: work.primary_location?.source?.display_name || work.host_venue?.display_name
    }));
  } catch (error) {
    console.error("Error searching OpenAlex:", error);
    return [];
  }
}
function reconstructAbstract(invertedIndex) {
  const tokens = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      tokens.push({ word, pos });
    }
  }
  return tokens.sort((a, b) => a.pos - b.pos).map((t) => t.word).join(" ");
}
async function searchArxiv(query, limit = 10) {
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
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries.map((match) => {
      const entry = match[1];
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(\d{4})/);
      const idMatch = entry.match(/<id>([^<]+)<\/id>/);
      const doiMatch = entry.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/);
      const authorMatches = [
        ...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)
      ];
      return {
        title: titleMatch?.[1]?.replace(/\s+/g, " ").trim() || "Untitled",
        doi: doiMatch?.[1]?.trim(),
        url: idMatch?.[1]?.trim(),
        year: publishedMatch?.[1] ? parseInt(publishedMatch[1]) : void 0,
        source: "arxiv",
        authors: authorMatches.map((m) => m[1].trim()),
        abstract: summaryMatch?.[1]?.replace(/\s+/g, " ").trim(),
        journal: "arXiv (preprint)"
      };
    });
  } catch (error) {
    console.error("Error searching arXiv:", error);
    return [];
  }
}
async function searchEuropePmc(query, limit = 10) {
  try {
    const url = new URL(
      "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
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
    return results.map((paper) => ({
      title: paper.title || "Untitled",
      doi: paper.doi,
      url: paper.doi ? `https://doi.org/${paper.doi}` : paper.pmid ? `https://europepmc.org/article/MED/${paper.pmid}` : void 0,
      year: parseInt(paper.pubYear),
      source: "europepmc",
      authors: paper.authorString?.split(", ") || [],
      abstract: paper.abstractText,
      journal: paper.journalTitle
    }));
  } catch (error) {
    console.error("Error searching Europe PMC:", error);
    return [];
  }
}
async function searchDataCite(query, limit = 10) {
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
    return results.map((item) => {
      const attrs = item.attributes;
      return {
        title: attrs.titles?.[0]?.title || "Untitled",
        doi: attrs.doi,
        url: attrs.url || `https://doi.org/${attrs.doi}`,
        year: attrs.publicationYear,
        source: "datacite",
        authors: attrs.creators?.map(
          (c) => c.name || `${c.givenName || ""} ${c.familyName || ""}`.trim()
        ).filter(Boolean) || [],
        abstract: attrs.descriptions?.find(
          (d) => d.descriptionType === "Abstract"
        )?.description,
        journal: attrs.container?.title || attrs.publisher
      };
    });
  } catch (error) {
    console.error("Error searching DataCite:", error);
    return [];
  }
}
async function getUnpaywallOaUrl(doi) {
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
      oaStatus: data.oa_status
    };
  } catch (error) {
    console.error("Error fetching Unpaywall data:", error);
    return null;
  }
}
async function fetchDoiMetadata(doi) {
  try {
    const normalizedDoi = normalizeDoi(doi);
    if (!normalizedDoi) return null;
    const url = `https://doi.org/${normalizedDoi}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.citationstyles.csl+json"
      }
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
      year: data.issued?.["date-parts"]?.[0]?.[0] || data.published?.["date-parts"]?.[0]?.[0],
      authors: data.author?.map((a) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean),
      abstract: data.abstract,
      journal: data["container-title"] || data.publisher
    };
  } catch (error) {
    console.error("Error fetching DOI metadata:", error);
    return null;
  }
}
async function fetchPubMedDoiAndAbstractByPmid(pmid) {
  const url = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
  );
  url.searchParams.set("db", "pubmed");
  url.searchParams.set("id", pmid);
  url.searchParams.set("retmode", "xml");
  const response = await fetch(url.toString());
  if (!response.ok) return {};
  const xml = await response.text();
  const doiMatch = xml.match(
    /<ArticleId[^>]*IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/i
  );
  const doi = doiMatch?.[1]?.trim();
  const abstractBlocks = [
    ...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)
  ].map(
    (m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  ).filter(Boolean);
  const abstract = abstractBlocks.length ? abstractBlocks.join("\n") : void 0;
  return { doi: normalizeDoi(doi), abstract };
}
async function fetchPaperDetails(candidate) {
  try {
    const enriched = candidate;
    if (enriched._enrichedAbstract) {
      return {
        ...candidate,
        abstract: enriched._enrichedAbstract,
        year: candidate.year || enriched._enrichedYear,
        journal: candidate.journal || enriched._enrichedVenue,
        authors: candidate.authors || enriched._enrichedAuthors || [],
        doi: normalizeDoi(candidate.doi)
      };
    }
    if (candidate.doi) {
      const url = `https://api.crossref.org/works/${encodeURIComponent(candidate.doi)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "AI-Therapist/1.0 (mailto:research@example.com)"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const item = data.message;
        return {
          ...candidate,
          title: candidate.title || (Array.isArray(item.title) ? item.title[0] : item.title),
          abstract: item.abstract || candidate.abstract || "Abstract not available",
          authors: candidate.authors || item.author?.map((a) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean) || [],
          year: candidate.year || item.published?.["date-parts"]?.[0]?.[0],
          journal: candidate.journal || (Array.isArray(item["container-title"]) ? item["container-title"][0] : item["container-title"])
        };
      }
    }
    if (candidate.source === "pubmed" && candidate.url) {
      const pmid = candidate.url.match(/\/(\d+)\//)?.[1];
      if (pmid) {
        const extra = await fetchPubMedDoiAndAbstractByPmid(pmid);
        return {
          ...candidate,
          doi: candidate.doi || extra.doi,
          abstract: extra.abstract || candidate.abstract || "Abstract not available",
          authors: candidate.authors || []
        };
      }
    }
    if (candidate.source === "semantic_scholar" && (candidate.doi || candidate.s2PaperId)) {
      const s2Id = candidate.doi ? `DOI:${candidate.doi}` : candidate.s2PaperId;
      const enriched2 = await getSemanticScholarPaper(s2Id);
      if (enriched2) {
        return {
          ...candidate,
          ...enriched2,
          // Preserve any already-set OA info from Unpaywall
          oaUrl: candidate.oaUrl ?? enriched2.openAccessPdfUrl,
          abstract: enriched2.abstract || candidate.abstract || "Abstract not available",
          authors: enriched2.authors?.length ? enriched2.authors : candidate.authors || []
        };
      }
    }
  } catch (error) {
    console.error("Error fetching paper details:", error);
  }
  if (candidate.doi) {
    const doiData = await fetchDoiMetadata(candidate.doi);
    if (doiData) {
      const merged = {
        ...candidate,
        title: candidate.title || doiData.title || "Untitled",
        abstract: stripJats(candidate.abstract || doiData.abstract) || "Abstract not available",
        authors: candidate.authors?.length ? candidate.authors : doiData.authors || [],
        year: candidate.year || doiData.year,
        journal: candidate.journal || doiData.journal,
        doi: normalizeDoi(candidate.doi)
      };
      const oaData = await getUnpaywallOaUrl(candidate.doi);
      return {
        ...merged,
        oaUrl: oaData?.oaUrl,
        oaStatus: oaData?.oaStatus
      };
    }
  }
  const result = {
    ...candidate,
    abstract: stripJats(candidate.abstract) || "Abstract not available",
    authors: candidate.authors || [],
    doi: normalizeDoi(candidate.doi)
  };
  if (candidate.doi) {
    const oaData = await getUnpaywallOaUrl(candidate.doi);
    if (oaData) {
      result.oaUrl = oaData.oaUrl;
      result.oaStatus = oaData.oaStatus;
    }
  }
  return result;
}
function dedupeCandidates(candidates) {
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const c of candidates) {
    const doi = normalizeDoi(c.doi);
    const titleKey = c.title ? titleFingerprint(c.title) : "";
    const key = doi ? `doi:${doi}` : `t:${titleKey}`;
    if (!titleKey && !doi) continue;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ ...c, doi });
    }
  }
  return unique;
}
function filterBookChapters(candidates) {
  const excludedTypes = /* @__PURE__ */ new Set([
    "book-chapter",
    "book-section",
    "book-part",
    "reference-entry",
    // encyclopedia entries
    "book",
    "monograph",
    "edited-book",
    "reference-book"
  ]);
  return candidates.filter((c) => {
    if (!c.publicationType) return true;
    if (excludedTypes.has(c.publicationType)) {
      console.log(`\u{1F6AB} Filtered book chapter: "${c.title}" (type: ${c.publicationType})`);
      return false;
    }
    return true;
  });
}
function filterIrrelevantTitles(candidates) {
  const exclusionRegex = /\b(child|forensic|witness|court|legal|police|criminal|abuse|victim|testimony|investigative interview|law enforcement)\b/i;
  return candidates.filter((c) => {
    if (exclusionRegex.test(c.title)) {
      console.log(`\u{1F6AB} Filtered irrelevant title: "${c.title}"`);
      return false;
    }
    return true;
  });
}
function filterShortAbstracts(candidates, minLength = 200) {
  return candidates.filter((c) => {
    if (!c.abstract || c.abstract.length < minLength) {
      console.log(`\u{1F6AB} Filtered short/missing abstract: "${c.title}" (${c.abstract?.length || 0} chars)`);
      return false;
    }
    return true;
  });
}
function applyQualityFilters(candidates, opts) {
  const minAbstract = opts?.minAbstractLength ?? 200;
  let filtered = filterBookChapters(candidates);
  filtered = filterIrrelevantTitles(filtered);
  if (!opts?.skipAbstractCheck) {
    filtered = filterShortAbstracts(filtered, minAbstract);
  }
  console.log(`\u{1F4CA} Quality filter: ${candidates.length} \u2192 ${filtered.length} candidates`);
  return filtered;
}
async function resolvePaperByTitle(title, opts) {
  const limit = opts?.limitPerSource ?? 8;
  const [crossref, pubmed, semantic, openalex, arxiv, europepmc] = await Promise.all([
    searchCrossref(title, limit),
    searchPubMed(title, limit),
    searchSemanticScholar(title, limit),
    searchOpenAlex(title, limit),
    searchArxiv(title, limit),
    searchEuropePmc(title, limit)
  ]);
  const candidates = dedupeCandidates([
    ...crossref,
    ...pubmed,
    ...semantic,
    ...openalex,
    ...arxiv,
    ...europepmc
  ]);
  const best = pickBestCandidate(candidates, { title, year: opts?.year });
  if (!best) return null;
  const details = await fetchPaperDetails(best);
  if (details.source === "pubmed" && details.url) {
    const pmid = details.url.match(/\/(\d+)\//)?.[1];
    if (pmid) {
      const extra = await fetchPubMedDoiAndAbstractByPmid(pmid);
      return {
        ...details,
        doi: details.doi ?? extra.doi,
        abstract: details.abstract && details.abstract !== "Abstract not available" ? details.abstract : extra.abstract ?? details.abstract,
        authors: details.authors ?? []
      };
    }
  }
  return {
    ...details,
    abstract: stripJats(details.abstract) ?? "Abstract not available",
    doi: normalizeDoi(details.doi)
  };
}
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}
const sourceTools = {
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
  scoreCandidate
};

"use strict";
const sql = neon(process.env.NEON_DATABASE_URL);

"use strict";
async function extractClaims(text) {
  const schema = z.object({
    claims: z.array(z.string()).describe(
      "Atomic, testable claims extracted from the text. Each claim should be a single statement that can be verified independently."
    )
  });
  const result = await generateObject({
    schema,
    prompt: `Extract all factual claims from the following text. Make each claim:
1. Atomic (one testable statement)
2. Specific (include population, intervention, outcome where applicable)
3. Falsifiable (can be proven true or false)
4. Complete (doesn't require context from other claims)

Text:
${text}

Example transformations:
- "CBT helps anxiety" \u2192 "CBT reduces anxiety symptom severity in adults with generalized anxiety disorder"
- "Exercise improves mood" \u2192 "Regular aerobic exercise improves mood in adults with major depressive disorder"

Extract claims:`
  });
  return result.object.claims;
}
function stableClaimId(claim, scope) {
  const normalized = claim.trim().toLowerCase();
  const scopeStr = scope ? JSON.stringify(scope) : "";
  const hash = crypto.createHash("sha256").update(normalized + scopeStr).digest("hex").slice(0, 16);
  return `claim_${hash}`;
}
function bestSnippet(p) {
  const a = (p.abstract || "").trim();
  if (!a) return void 0;
  return a.length > 220 ? a.slice(0, 220) + "\u2026" : a;
}
function basicScore(claim, p) {
  const text = `${p.title} ${p.abstract ?? ""}`.toLowerCase();
  const tokens = claim.toLowerCase().split(/\W+/).filter(Boolean);
  const hits = tokens.filter((t) => text.includes(t)).length;
  return Math.min(1, hits / Math.max(6, tokens.length));
}
async function judgeEvidence(claim, paper) {
  const schema = z.object({
    polarity: z.enum(["supports", "contradicts", "mixed", "irrelevant"]).describe(
      "Does this paper support, contradict, provide mixed evidence for, or is irrelevant to the claim?"
    ),
    rationale: z.string().describe("Brief 1-2 sentence explanation"),
    score: z.number().min(0).max(1).describe("Confidence in this judgment (0-1)")
  });
  try {
    const result = await generateObject({
      schema,
      prompt: `Evaluate whether this research paper supports, contradicts, or is irrelevant to the claim.

Claim: "${claim}"

Paper:
Title: ${paper.title}
Authors: ${paper.authors.join(", ")}
Abstract: ${paper.abstract || "No abstract available"}

Respond with:
- polarity: supports/contradicts/mixed/irrelevant
- rationale: why (1-2 sentences)
- score: confidence 0-1`
    });
    return result.object;
  } catch (error) {
    console.error("Error judging evidence:", error);
    return {
      polarity: "irrelevant",
      rationale: "Error during evaluation",
      score: 0
    };
  }
}
function aggregateVerdict(evidence) {
  if (evidence.length === 0) {
    return { verdict: "insufficient", confidence: 0 };
  }
  const polarities = evidence.map((e) => e.polarity);
  const scores = evidence.map((e) => e.score ?? 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const supports = polarities.filter((p) => p === "supports").length;
  const contradicts = polarities.filter((p) => p === "contradicts").length;
  const mixed = polarities.filter((p) => p === "mixed").length;
  const relevant = supports + contradicts + mixed;
  if (relevant === 0) {
    return { verdict: "insufficient", confidence: Math.max(0.1, avgScore) };
  }
  const supportRatio = supports / relevant;
  const contradictRatio = contradicts / relevant;
  let verdict;
  if (supportRatio > 0.7) {
    verdict = "supported";
  } else if (contradictRatio > 0.7) {
    verdict = "contradicted";
  } else if (supportRatio + contradictRatio < 0.3) {
    verdict = "insufficient";
  } else {
    verdict = "mixed";
  }
  const evidenceStrength = Math.min(1, relevant / 5);
  const confidence = Math.min(0.95, avgScore * 0.7 + evidenceStrength * 0.3);
  return { verdict, confidence };
}
async function buildClaimCardsFromClaims(claims, opts) {
  const perSourceLimit = opts?.perSourceLimit ?? 10;
  const topK = opts?.topK ?? 6;
  const useLlmJudge = opts?.useLlmJudge ?? false;
  const sources = opts?.sources ?? ["crossref", "pubmed", "semantic_scholar"];
  const paperPool = opts?.paperPool;
  const poolConcurrency = Math.max(1, Math.min(8, opts?.poolConcurrency ?? 3));
  const enrichPool = opts?.enrichPool ?? true;
  const detailsCache = /* @__PURE__ */ new Map();
  const cacheKeyFor = (p) => {
    const doi = sourceTools.normalizeDoi(p.doi);
    if (doi) return `doi:${doi}`;
    const t = (p.title || "").trim();
    if (t) return `t:${sourceTools.titleFingerprint(t)}`;
    return `u:${p.url ?? Math.random().toString()}`;
  };
  const fetchDetailsCached = async (p) => {
    const key = cacheKeyFor(p);
    const cached = detailsCache.get(key);
    if (cached) return cached;
    const d = await sourceTools.fetchPaperDetails(p);
    detailsCache.set(key, d);
    return d;
  };
  const rankPoolForClaim = (claim, pool) => {
    const scored = pool.map((p) => {
      const score = basicScore(claim, p);
      return { p, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.p);
  };
  const cards = [];
  let poolDetails = null;
  if (paperPool?.length) {
    const dedupedPool = sourceTools.dedupeCandidates(paperPool);
    if (!enrichPool) {
      poolDetails = dedupedPool.map((p) => ({
        ...p,
        abstract: p.abstract ?? "Abstract not available",
        authors: p.authors ?? [],
        doi: sourceTools.normalizeDoi(p.doi)
      }));
    } else {
      poolDetails = await sourceTools.mapLimit(
        dedupedPool,
        poolConcurrency,
        async (p) => {
          if (p.abstract && sourceTools.stripJats(p.abstract)?.length) {
            return {
              ...p,
              abstract: sourceTools.stripJats(p.abstract) ?? p.abstract,
              authors: p.authors ?? [],
              doi: sourceTools.normalizeDoi(p.doi)
            };
          }
          return fetchDetailsCached(p);
        }
      );
    }
  }
  for (const claim of claims) {
    const queries = [claim];
    let enriched = [];
    let sourceNames = [];
    if (poolDetails?.length) {
      const ranked = rankPoolForClaim(claim, poolDetails);
      enriched = ranked.slice(0, topK);
      sourceNames = ["linked_pool"];
    } else {
      const searchPromises = [];
      sourceNames = [];
      if (sources.includes("crossref")) {
        searchPromises.push(sourceTools.searchCrossref(claim, perSourceLimit));
        sourceNames.push("crossref");
      }
      if (sources.includes("pubmed")) {
        searchPromises.push(sourceTools.searchPubMed(claim, perSourceLimit));
        sourceNames.push("pubmed");
      }
      if (sources.includes("semantic_scholar")) {
        searchPromises.push(
          sourceTools.searchSemanticScholar(claim, perSourceLimit)
        );
        sourceNames.push("semantic_scholar");
      }
      if (sources.includes("openalex")) {
        searchPromises.push(sourceTools.searchOpenAlex(claim, perSourceLimit));
        sourceNames.push("openalex");
      }
      if (sources.includes("arxiv")) {
        searchPromises.push(sourceTools.searchArxiv(claim, perSourceLimit));
        sourceNames.push("arxiv");
      }
      if (sources.includes("europepmc")) {
        searchPromises.push(sourceTools.searchEuropePmc(claim, perSourceLimit));
        sourceNames.push("europepmc");
      }
      const results = await Promise.all(searchPromises);
      const allCandidates = results.flat();
      const candidates = sourceTools.dedupeCandidates(allCandidates);
      for (const c of candidates.slice(0, topK)) {
        const details = await sourceTools.fetchPaperDetails(c);
        enriched.push(details);
      }
    }
    const evidence = [];
    for (const p of enriched) {
      if (useLlmJudge) {
        const judgment = await judgeEvidence(claim, p);
        evidence.push({
          paper: p,
          polarity: judgment.polarity,
          excerpt: bestSnippet(p),
          rationale: judgment.rationale,
          score: judgment.score
        });
      } else {
        evidence.push({
          paper: p,
          polarity: "mixed",
          // Conservative default
          excerpt: bestSnippet(p),
          rationale: "Auto-mapped from abstract/title match",
          score: basicScore(claim, p)
        });
      }
    }
    const { verdict, confidence } = aggregateVerdict(evidence);
    cards.push({
      id: stableClaimId(claim),
      claim,
      verdict,
      confidence,
      evidence,
      queries,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      provenance: {
        generatedBy: "pipeline:claim-cards@1",
        model: useLlmJudge ? "deepseek-chat" : void 0,
        sourceTools: sourceNames
      }
    });
  }
  return cards;
}
async function buildClaimCardsFromText(text, opts) {
  const claims = await extractClaims(text);
  return buildClaimCardsFromClaims(claims, opts);
}
async function refreshClaimCard(card, opts) {
  const [refreshed] = await buildClaimCardsFromClaims([card.claim], opts);
  return {
    ...refreshed,
    id: card.id,
    // Keep original ID
    createdAt: card.createdAt,
    // Keep original creation time
    notes: card.notes
    // Preserve any notes
  };
}
async function saveClaimCard(card, noteId) {
  const confidenceInt = Math.round(card.confidence * 100);
  await sql`
    INSERT INTO claim_cards (id, note_id, claim, scope, verdict, confidence, evidence, queries, provenance, notes, created_at, updated_at)
    VALUES (${card.id}, ${noteId || null}, ${card.claim}, ${card.scope ? JSON.stringify(card.scope) : null}, ${card.verdict}, ${confidenceInt}, ${JSON.stringify(card.evidence)}, ${JSON.stringify(card.queries)}, ${JSON.stringify(card.provenance)}, ${card.notes || null}, ${card.createdAt}, ${card.updatedAt})
    ON CONFLICT (id) DO UPDATE SET
      claim = excluded.claim,
      scope = excluded.scope,
      verdict = excluded.verdict,
      confidence = excluded.confidence,
      evidence = excluded.evidence,
      queries = excluded.queries,
      provenance = excluded.provenance,
      notes = excluded.notes,
      updated_at = excluded.updated_at`;
  if (noteId) {
    await sql`INSERT INTO notes_claims (note_id, claim_id) VALUES (${noteId}, ${card.id}) ON CONFLICT DO NOTHING`;
  }
}
async function getClaimCard(claimId) {
  const rows = await sql`SELECT * FROM claim_cards WHERE id = ${claimId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    claim: row.claim,
    scope: row.scope ? JSON.parse(row.scope) : void 0,
    verdict: row.verdict,
    confidence: row.confidence / 100,
    evidence: JSON.parse(row.evidence),
    queries: JSON.parse(row.queries),
    provenance: JSON.parse(row.provenance),
    notes: row.notes || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getClaimCardsForNote(noteId) {
  const rows = await sql`
    SELECT cc.* FROM claim_cards cc
    INNER JOIN notes_claims nc ON cc.id = nc.claim_id
    WHERE nc.note_id = ${noteId}
    ORDER BY cc.created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    claim: row.claim,
    scope: row.scope ? JSON.parse(row.scope) : void 0,
    verdict: row.verdict,
    confidence: row.confidence / 100,
    evidence: JSON.parse(row.evidence),
    queries: JSON.parse(row.queries),
    provenance: JSON.parse(row.provenance),
    notes: row.notes || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function deleteClaimCard(claimId) {
  await sql`DELETE FROM notes_claims WHERE claim_id = ${claimId}`;
  await sql`DELETE FROM claim_cards WHERE id = ${claimId}`;
}
const claimCardsTools = {
  // Core claim card generation
  extractClaims,
  buildClaimCardsFromClaims,
  buildClaimCardsFromText,
  refreshClaimCard,
  // Database persistence
  saveClaimCard,
  getClaimCard,
  getClaimCardsForNote,
  deleteClaimCard
};

export { buildClaimCardsFromClaims, buildClaimCardsFromText, claimCardsTools, deleteClaimCard, extractClaims, getClaimCard, getClaimCardsForNote, refreshClaimCard, saveClaimCard };
