import { ArxivClient } from "./arxiv";
import { CoreClient } from "./core";
import { CrossrefClient } from "./crossref";
import { OpenAlexClient } from "./openalex";
import { SCHOLAR_PAPER_FIELDS_FULL, SemanticScholarClient } from "./scholar";
import { normalizeDoi, stripJats, titleFingerprint } from "./text";
import { ZenodoClient } from "./zenodo";
import type {
  ArxivPaper,
  CoreWork,
  CrossrefWork,
  OpenAlexWork,
  PaperCandidate,
  ScholarPaper,
  ZenodoRecord,
} from "./types";

// ─── Crossref ────────────────────────────────────────────────────────────────

export function crossrefToCandidate(item: CrossrefWork): PaperCandidate {
  const title = Array.isArray(item.title) ? item.title[0] : item.title;
  return {
    title: title ?? "Untitled",
    doi: normalizeDoi(item.DOI),
    url: item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : undefined),
    year: item.published?.["date-parts"]?.[0]?.[0],
    source: "crossref",
    authors: (item.author ?? [])
      .map((a) => `${a.given ?? ""} ${a.family ?? ""}`.trim())
      .filter((s) => s.length > 0),
    abstract: stripJats(item.abstract),
    journal: Array.isArray(item["container-title"])
      ? item["container-title"][0]
      : item["container-title"],
    publicationType: item.type,
  };
}

export async function searchCrossref(
  query: string,
  limit = 10,
  mailto?: string,
): Promise<PaperCandidate[]> {
  try {
    const client = new CrossrefClient({ mailto: mailto ?? process.env.RESEARCH_MAILTO });
    const resp = await client.search(query, limit, 0);
    return (resp.message?.items ?? []).map(crossrefToCandidate);
  } catch (err) {
    console.error("[Crossref] search failed:", err);
    return [];
  }
}

// ─── Semantic Scholar ────────────────────────────────────────────────────────

export function scholarToCandidate(p: ScholarPaper): PaperCandidate {
  const externalIds = (p as unknown as { externalIds?: { DOI?: string } }).externalIds;
  const doi = normalizeDoi(externalIds?.DOI);
  return {
    title: p.title ?? "Untitled",
    doi,
    url:
      p.url ??
      (doi
        ? `https://doi.org/${doi}`
        : p.paperId
          ? `https://www.semanticscholar.org/paper/${p.paperId}`
          : undefined),
    year: p.year,
    source: "semantic_scholar",
    authors: (p.authors ?? []).map((a) => a.name ?? "").filter((n) => n.length > 0),
    abstract: p.abstract,
    journal: (p as unknown as { journal?: { name?: string } }).journal?.name ?? p.venue,
    publicationType: (p as unknown as { publicationTypes?: string[] }).publicationTypes?.[0],
    tldr: p.tldr?.text,
    citationCount: p.citationCount,
    influentialCitationCount: p.influentialCitationCount,
    fieldsOfStudy: p.fieldsOfStudy,
    isOpenAccess: p.isOpenAccess,
    openAccessPdfUrl: p.openAccessPdf?.url,
    s2PaperId: p.paperId,
  };
}

export const S2_ENRICHMENT_FIELDS =
  SCHOLAR_PAPER_FIELDS_FULL +
  ",externalIds,journal,publicationTypes";

function makeScholarClient(): SemanticScholarClient {
  return new SemanticScholarClient({ apiKey: process.env.SEMANTIC_SCHOLAR_API_KEY });
}

export async function searchSemanticScholar(
  query: string,
  limit = 10,
): Promise<PaperCandidate[]> {
  try {
    const resp = await makeScholarClient().search(query, S2_ENRICHMENT_FIELDS, limit, 0);
    return (resp.data ?? []).map(scholarToCandidate);
  } catch (err) {
    console.error("[S2] search failed:", err);
    return [];
  }
}

export async function getSemanticScholarPaper(
  paperId: string,
): Promise<PaperCandidate | null> {
  try {
    const paper = await makeScholarClient().getPaper(paperId, S2_ENRICHMENT_FIELDS);
    return paper ? scholarToCandidate(paper) : null;
  } catch (err) {
    console.error("[S2] paper lookup failed:", err);
    return null;
  }
}

export async function getSemanticScholarPapersBatch(
  paperIds: string[],
): Promise<PaperCandidate[]> {
  if (paperIds.length === 0) return [];
  const client = makeScholarClient();
  const out: PaperCandidate[] = [];
  for (let i = 0; i < paperIds.length; i += 500) {
    const chunk = paperIds.slice(i, i + 500);
    try {
      const papers = await client.batch(chunk, S2_ENRICHMENT_FIELDS);
      out.push(...papers.map(scholarToCandidate));
    } catch (err) {
      console.error("[S2] batch lookup failed:", err);
    }
  }
  return out;
}

export async function getSemanticScholarRecommendations(
  paperId: string,
  limit = 20,
): Promise<PaperCandidate[]> {
  try {
    const resp = await makeScholarClient().getRecommendations(
      paperId,
      S2_ENRICHMENT_FIELDS,
      limit,
    );
    return (resp.recommendedPapers ?? []).map(scholarToCandidate);
  } catch (err) {
    console.error("[S2] recommendations failed:", err);
    return [];
  }
}

export async function getSemanticScholarCitations(
  paperId: string,
  limit = 25,
): Promise<PaperCandidate[]> {
  try {
    const resp = await makeScholarClient().getCitations(
      paperId,
      S2_ENRICHMENT_FIELDS,
      limit,
    );
    return (resp.data ?? [])
      .map((c) => c.citingPaper)
      .filter((p): p is ScholarPaper => !!p)
      .map(scholarToCandidate);
  } catch (err) {
    console.error("[S2] citations failed:", err);
    return [];
  }
}

// ─── OpenAlex ────────────────────────────────────────────────────────────────

export function openAlexToCandidate(w: OpenAlexWork): PaperCandidate {
  const abstract = w.abstract_inverted_index
    ? reconstructAbstract(w.abstract_inverted_index)
    : undefined;
  return {
    title: w.title ?? "Untitled",
    doi: normalizeDoi(w.doi),
    url: w.doi ?? w.id,
    year: w.publication_year,
    source: "openalex",
    authors: (w.authorships ?? [])
      .map((a) => a.author?.display_name)
      .filter((n): n is string => !!n),
    abstract,
    journal: w.primary_location?.source?.display_name,
  };
}

function reconstructAbstract(index: Record<string, number[]>): string {
  const tokens: { word: string; pos: number }[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) tokens.push({ word, pos });
  }
  return tokens.sort((a, b) => a.pos - b.pos).map((t) => t.word).join(" ");
}

export async function searchOpenAlex(
  query: string,
  limit = 10,
): Promise<PaperCandidate[]> {
  try {
    const client = new OpenAlexClient({ mailto: process.env.RESEARCH_MAILTO });
    const resp = await client.search(query, 1, limit);
    return (resp.results ?? []).map(openAlexToCandidate);
  } catch (err) {
    console.error("[OpenAlex] search failed:", err);
    return [];
  }
}

// ─── arXiv ───────────────────────────────────────────────────────────────────

export function arxivToCandidate(p: ArxivPaper): PaperCandidate {
  const yearStr = p.published.slice(0, 4);
  const year = /^\d{4}$/.test(yearStr) ? Number(yearStr) : undefined;
  return {
    title: p.title.trim(),
    doi: normalizeDoi(p.doi),
    url: p.link_url ?? `https://arxiv.org/abs/${p.arxiv_id}`,
    year,
    source: "arxiv",
    authors: p.authors,
    abstract: p.summary.trim(),
    journal: "arXiv (preprint)",
  };
}

export async function searchArxiv(
  query: string,
  limit = 10,
): Promise<PaperCandidate[]> {
  try {
    const client = new ArxivClient();
    const resp = await client.search(query, { maxResults: limit });
    return resp.papers.map(arxivToCandidate);
  } catch (err) {
    console.error("[arXiv] search failed:", err);
    return [];
  }
}

// ─── CORE ────────────────────────────────────────────────────────────────────

export function coreToCandidate(w: CoreWork): PaperCandidate {
  return {
    title: w.title ?? "Untitled",
    doi: normalizeDoi(w.doi),
    url:
      w.downloadUrl ??
      w.sourceFulltextUrls?.[0] ??
      (w.doi ? `https://doi.org/${w.doi}` : undefined),
    year: w.yearPublished,
    source: "core",
    authors: (w.authors ?? []).map((a) => a.name).filter((n): n is string => !!n),
    abstract: w.abstract,
    journal: (w as unknown as { publisher?: string }).publisher,
    citationCount: w.citationCount,
  };
}

export async function searchCore(
  query: string,
  limit = 10,
): Promise<PaperCandidate[]> {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) return [];
  try {
    const client = new CoreClient({ apiKey });
    const resp = await client.search(query, limit, 0);
    return (resp.results ?? []).map(coreToCandidate);
  } catch (err) {
    console.error("[CORE] search failed:", err);
    return [];
  }
}

// ─── Zenodo ──────────────────────────────────────────────────────────────────

export function zenodoToCandidate(r: ZenodoRecord): PaperCandidate {
  const meta = r.metadata ?? {};
  const doi = normalizeDoi(meta.doi ?? r.doi);
  const year = meta.publication_date?.slice(0, 4);
  const yearNum = year && /^\d{4}$/.test(year) ? Number(year) : undefined;
  return {
    title: meta.title ?? r.title ?? "Untitled",
    doi,
    url: r.links?.self_html ?? (doi ? `https://doi.org/${doi}` : undefined),
    year: yearNum,
    source: "zenodo",
    authors: (meta.creators ?? []).map((c) => c.name).filter((n): n is string => !!n),
    abstract: stripJats(meta.description),
    journal: meta.journal?.title ?? meta.resource_type?.title,
  };
}

export async function searchZenodo(
  query: string,
  limit = 10,
): Promise<PaperCandidate[]> {
  try {
    const client = new ZenodoClient({
      accessToken: process.env.ZENODO_ACCESS_TOKEN ?? process.env.ZENODO_TOKEN,
    });
    const resp = await client.search(query, 1, limit);
    return (resp.hits?.hits ?? []).map(zenodoToCandidate);
  } catch (err) {
    console.error("[Zenodo] search failed:", err);
    return [];
  }
}

// ─── Dedup ───────────────────────────────────────────────────────────────────

/** Dedup candidates by DOI first, then title fingerprint. Drops unidentified rows. */
export function dedupeCandidates(
  candidates: PaperCandidate[],
): PaperCandidate[] {
  const seen = new Set<string>();
  const out: PaperCandidate[] = [];
  for (const c of candidates) {
    const doi = normalizeDoi(c.doi);
    const titleKey = c.title ? titleFingerprint(c.title) : "";
    const key = doi ? `doi:${doi}` : `t:${titleKey}`;
    if (!titleKey && !doi) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ ...c, doi });
    }
  }
  return out;
}
