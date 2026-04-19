/**
 * Research Source Tools — thin re-export over @ai-apps/research.
 *
 * All source clients, enrichment helpers, scoring, dedup, and concurrency
 * helpers live in the `@ai-apps/research` package. Only the app-specific
 * `filterIrrelevantTitles` rule (forensic/child/legal keyword exclusion) stays
 * here because its content filter encodes a therapeutic-domain choice.
 */

import type { PaperCandidate } from "@ai-apps/research";
import {
  applyQualityFilters as packageApplyQualityFilters,
  filterBookChapters,
  filterShortAbstracts,
  sourceTools as packageSourceTools,
} from "@ai-apps/research";

export type {
  CandidateSource,
  PaperCandidate,
  PaperDetails,
} from "@ai-apps/research";

export {
  // Search
  searchCrossref,
  searchPubMed,
  searchSemanticScholar,
  searchOpenAlex,
  searchArxiv,
  searchEuropePmc,
  searchDataCite,
  searchCore,
  searchZenodo,
  // Semantic Scholar extended
  getSemanticScholarPaper,
  getSemanticScholarPapersBatch,
  getSemanticScholarRecommendations,
  getSemanticScholarCitations,
  // Enrichment
  fetchPaperDetails,
  fetchPubMedDoiAndAbstractByPmid,
  fetchDoiMetadata,
  getUnpaywallOaUrl,
  // Resolution + dedup
  dedupeCandidates,
  resolvePaperByTitle,
  pickBestCandidate,
  // Filters (package-level)
  filterBookChapters,
  filterShortAbstracts,
  // Utilities
  mapLimit,
  normalizeDoi,
  stripJats,
  titleFingerprint,
  scoreCandidate,
} from "@ai-apps/research";

const IRRELEVANT_TITLE_REGEX =
  /\b(child|forensic|witness|court|legal|police|criminal|abuse|victim|testimony|investigative interview|law enforcement)\b/i;

/** Therapeutic-domain title exclusions (forensic/child/legal context). */
export function filterIrrelevantTitles(
  candidates: PaperCandidate[],
): PaperCandidate[] {
  return candidates.filter((c) => {
    if (IRRELEVANT_TITLE_REGEX.test(c.title)) {
      console.log(`🚫 Filtered irrelevant title: "${c.title}"`);
      return false;
    }
    return true;
  });
}

/** Wrap the package filter with the app-specific `filterIrrelevantTitles` step. */
export function applyQualityFilters(
  candidates: PaperCandidate[],
  opts?: { minAbstractLength?: number; skipAbstractCheck?: boolean },
): PaperCandidate[] {
  const filtered = packageApplyQualityFilters(candidates, {
    minAbstractLength: opts?.minAbstractLength,
    skipAbstractCheck: opts?.skipAbstractCheck,
    extraFilters: [filterIrrelevantTitles],
  });
  console.log(
    `📊 Quality filter: ${candidates.length} → ${filtered.length} candidates`,
  );
  return filtered;
}

/**
 * Matches the shape of the old `sourceTools` export, with `filterIrrelevantTitles`
 * and the wrapped `applyQualityFilters` swapped in.
 */
export const sourceTools = {
  ...packageSourceTools,
  filterBookChapters,
  filterIrrelevantTitles,
  filterShortAbstracts,
  applyQualityFilters,
};
