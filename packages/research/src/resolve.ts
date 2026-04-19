import {
  dedupeCandidates,
  getSemanticScholarPaper,
  searchArxiv,
  searchCrossref,
  searchOpenAlex,
  searchSemanticScholar,
} from "./candidate";
import { CrossrefClient } from "./crossref";
import { fetchDoiMetadata } from "./doi";
import { searchEuropePmc } from "./europepmc";
import { fetchPubMedDoiAndAbstractByPmid, searchPubMed } from "./pubmed";
import { pickBestCandidate } from "./score";
import { normalizeDoi, stripJats } from "./text";
import { getUnpaywallOaUrl } from "./unpaywall";
import type { PaperCandidate, PaperDetails } from "./types";

interface EnrichmentHints {
  _enrichedAbstract?: string;
  _enrichedYear?: number;
  _enrichedVenue?: string;
  _enrichedAuthors?: string[];
}

/**
 * Enrich a candidate into full `PaperDetails`:
 *  - Attached `_enrichedAbstract` → use it directly.
 *  - DOI present → re-fetch from Crossref.
 *  - PubMed candidate → pull DOI + abstract from efetch.
 *  - Scholar candidate → re-fetch with richer field set.
 *  - Fallback: DOI content negotiation + Unpaywall OA.
 */
export async function fetchPaperDetails(
  candidate: PaperCandidate,
): Promise<PaperDetails> {
  const hints = candidate as PaperCandidate & EnrichmentHints;
  if (hints._enrichedAbstract) {
    return {
      ...candidate,
      abstract: hints._enrichedAbstract,
      year: candidate.year ?? hints._enrichedYear,
      journal: candidate.journal ?? hints._enrichedVenue,
      authors: candidate.authors ?? hints._enrichedAuthors ?? [],
      doi: normalizeDoi(candidate.doi),
    };
  }

  if (candidate.doi) {
    try {
      const client = new CrossrefClient({ mailto: process.env.RESEARCH_MAILTO });
      const item = await client.getWork(candidate.doi);
      return {
        ...candidate,
        title:
          candidate.title ||
          (Array.isArray(item.title) ? item.title[0] ?? "" : item.title ?? ""),
        abstract:
          stripJats(item.abstract) ??
          candidate.abstract ??
          "Abstract not available",
        authors:
          candidate.authors ??
          (item.author ?? [])
            .map((a) => `${a.given ?? ""} ${a.family ?? ""}`.trim())
            .filter((s) => s.length > 0),
        year: candidate.year ?? item.published?.["date-parts"]?.[0]?.[0],
        journal:
          candidate.journal ??
          (Array.isArray(item["container-title"])
            ? item["container-title"][0]
            : item["container-title"]),
      };
    } catch (err) {
      console.warn("[fetchPaperDetails] Crossref enrichment failed:", err);
    }
  }

  if (candidate.source === "pubmed" && candidate.url) {
    const pmid = candidate.url.match(/\/(\d+)\//)?.[1];
    if (pmid) {
      const extra = await fetchPubMedDoiAndAbstractByPmid(pmid);
      return {
        ...candidate,
        doi: candidate.doi ?? extra.doi,
        abstract: extra.abstract ?? candidate.abstract ?? "Abstract not available",
        authors: candidate.authors ?? [],
      };
    }
  }

  if (
    candidate.source === "semantic_scholar" &&
    (candidate.doi || candidate.s2PaperId)
  ) {
    const id = candidate.doi ? `DOI:${candidate.doi}` : candidate.s2PaperId!;
    const enriched = await getSemanticScholarPaper(id);
    if (enriched) {
      return {
        ...candidate,
        ...enriched,
        oaUrl: (candidate as PaperDetails).oaUrl ?? enriched.openAccessPdfUrl,
        abstract: enriched.abstract ?? candidate.abstract ?? "Abstract not available",
        authors: enriched.authors?.length ? enriched.authors : (candidate.authors ?? []),
      };
    }
  }

  if (candidate.doi) {
    const doiData = await fetchDoiMetadata(candidate.doi);
    if (doiData) {
      const merged: PaperDetails = {
        ...candidate,
        title: candidate.title || doiData.title || "Untitled",
        abstract:
          stripJats(candidate.abstract ?? doiData.abstract) ?? "Abstract not available",
        authors: candidate.authors?.length ? candidate.authors : (doiData.authors ?? []),
        year: candidate.year ?? doiData.year,
        journal: candidate.journal ?? doiData.journal,
        doi: normalizeDoi(candidate.doi),
      };
      const oa = await getUnpaywallOaUrl(candidate.doi);
      return {
        ...merged,
        oaUrl: oa?.oaUrl,
        oaStatus: oa?.oaStatus,
      };
    }
  }

  const result: PaperDetails = {
    ...candidate,
    abstract: stripJats(candidate.abstract) ?? "Abstract not available",
    authors: candidate.authors ?? [],
    doi: normalizeDoi(candidate.doi),
  };

  if (candidate.doi) {
    const oa = await getUnpaywallOaUrl(candidate.doi);
    if (oa) {
      result.oaUrl = oa.oaUrl;
      result.oaStatus = oa.oaStatus;
    }
  }

  return result;
}

export interface ResolvePaperByTitleOptions {
  year?: number;
  limitPerSource?: number;
  /** Minimum match score the best candidate must clear. Default 35. */
  minScore?: number;
}

/** Resolve paper metadata across all sources by title (+ optional year). */
export async function resolvePaperByTitle(
  title: string,
  opts: ResolvePaperByTitleOptions = {},
): Promise<PaperDetails | null> {
  const limit = opts.limitPerSource ?? 8;
  const [crossref, pubmed, semantic, openalex, arxiv, europepmc] = await Promise.all([
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
  const best = pickBestCandidate(candidates, { title, year: opts.year }, opts.minScore);
  if (!best) return null;

  const details = await fetchPaperDetails(best);

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
