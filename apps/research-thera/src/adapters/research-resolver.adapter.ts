/**
 * Research Source Resolver Adapter
 *
 * Implements Resolver interface for the existing sourceTools.
 * Converts LinkedSourceRef -> SourceDetails using multi-source lookup.
 */

import {
  type Resolver,
  type LinkedSourceRef,
  type SourceDetails,
  type ResolveOptions,
} from "../tools/generic-claim-cards.tools";
import {
  fetchPaperDetails,
  searchCrossref,
  searchSemanticScholar,
  searchPubMed,
  searchOpenAlex,
  dedupeCandidates,
  normalizeDoi,
  type PaperCandidate,
  type PaperDetails,
} from "../tools/sources.tools";

/**
 * Convert PaperDetails to SourceDetails
 */
function paperToSource(paper: PaperDetails): SourceDetails {
  return {
    id: paper.doi || paper.url,
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    url: paper.oaUrl || paper.url,
    abstract: paper.abstract,
    venue: paper.journal,
    doi: paper.doi,
    citationsCount: paper.citationCount,
    provider: paper.source,
  };
}

/**
 * Convert PaperCandidate to SourceDetails (without full details)
 */
function candidateToSource(candidate: PaperCandidate): SourceDetails {
  return {
    id: candidate.doi || candidate.url,
    title: candidate.title,
    authors: candidate.authors,
    year: candidate.year,
    url: candidate.url,
    abstract: candidate.abstract,
    venue: candidate.journal,
    doi: candidate.doi,
    provider: candidate.source,
  };
}

export function createResearchSourceResolver(): Resolver {
  return {
    name: "sourceTools@v1",

    async resolve(
      ref: LinkedSourceRef,
      opts?: ResolveOptions,
    ): Promise<SourceDetails | null> {
      // Strategy:
      // 1. If we have a DOI/ID, try direct lookup
      // 2. Otherwise, search by title across multiple sources
      // 3. Return the best match with full details

      const hints = opts?.resolutionHints as { sources?: string[] } | undefined;
      const allowedSources = hints?.sources ?? [
        "semantic_scholar",
        "crossref",
        "pubmed",
        "openalex",
      ];

      // Try direct ID lookups first
      if (ref.doi) {
        const doi = normalizeDoi(ref.doi);
        if (doi) {
          try {
            const candidate: PaperCandidate = {
              title: ref.title,
              doi,
              url: `https://doi.org/${doi}`,
              source: "doi",
              year: ref.year,
              authors: ref.authors,
            };
            const details = await fetchPaperDetails(candidate);
            return paperToSource(details);
          } catch (error) {
            console.warn(`Failed to resolve DOI ${doi}:`, error);
          }
        }
      }

      if (
        ref.semanticScholarId &&
        allowedSources.includes("semantic_scholar")
      ) {
        try {
          // Fetch directly using S2 ID (assumes sourceTools can handle this)
          const candidate: PaperCandidate = {
            title: ref.title,
            url: `https://www.semanticscholar.org/paper/${ref.semanticScholarId}`,
            source: "semantic_scholar",
            year: ref.year,
            authors: ref.authors,
          };
          const details = await fetchPaperDetails(candidate);
          return paperToSource(details);
        } catch (error) {
          console.warn(
            `Failed to resolve S2 ID ${ref.semanticScholarId}:`,
            error,
          );
        }
      }

      // Fallback: search by title
      if (!ref.title || ref.title.trim().length < 3) {
        return null;
      }

      const searches: Promise<PaperCandidate[]>[] = [];

      if (allowedSources.includes("semantic_scholar")) {
        searches.push(searchSemanticScholar(ref.title, 5).catch(() => []));
      }
      if (allowedSources.includes("crossref")) {
        searches.push(searchCrossref(ref.title, 5).catch(() => []));
      }
      if (allowedSources.includes("pubmed")) {
        searches.push(searchPubMed(ref.title, 5).catch(() => []));
      }
      if (allowedSources.includes("openalex")) {
        searches.push(searchOpenAlex(ref.title, 5).catch(() => []));
      }

      const results = await Promise.all(searches);
      const allCandidates = results.flat();

      if (allCandidates.length === 0) {
        return null;
      }

      const deduped = dedupeCandidates(allCandidates);

      // Find best match by title similarity
      const scoredCandidates = deduped
        .map((c) => {
          const titleSimilarity = computeTitleSimilarity(ref.title, c.title);
          return { candidate: c, score: titleSimilarity };
        })
        .sort((a, b) => b.score - a.score);

      const best = scoredCandidates[0];

      // Only accept high-confidence matches
      if (best.score < 0.6) {
        return null;
      }

      // Fetch full details for the best match
      try {
        const details = await fetchPaperDetails(best.candidate);
        return paperToSource(details);
      } catch (error) {
        console.warn("Failed to fetch paper details:", error);
        // Fallback to candidate data if available
        if (best.candidate.abstract) {
          return candidateToSource(best.candidate);
        }
        return null;
      }
    },
  };
}

/**
 * Simple title similarity score (0-1)
 */
function computeTitleSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter((t) => t.length > 2);

  const tokensA = new Set(normalize(a));
  const tokensB = new Set(normalize(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const tok of tokensA) {
    if (tokensB.has(tok)) overlap++;
  }

  const union = tokensA.size + tokensB.size - overlap;
  return union > 0 ? overlap / union : 0;
}
