export * from "./types";
export * from "./retry";
export * from "./paper";

export { ArxivClient } from "./arxiv";
export { CoreClient } from "./core";
export { CrossrefClient } from "./crossref";
export { OpenAlexClient } from "./openalex";
export {
  SemanticScholarClient,
  SCHOLAR_SEARCH_FIELDS,
  SCHOLAR_PAPER_FIELDS_FULL,
  SCHOLAR_PAPER_FIELDS_BRIEF,
} from "./scholar";
export { ZenodoClient } from "./zenodo";

// New sources
export { PubMedClient, searchPubMed, fetchPubMedDoiAndAbstractByPmid } from "./pubmed";
export { EuropePmcClient, searchEuropePmc } from "./europepmc";
export { DataCiteClient, searchDataCite } from "./datacite";
export { UnpaywallClient, getUnpaywallOaUrl } from "./unpaywall";
export { fetchDoiMetadata } from "./doi";

// Unified search + critique + agent
export { searchPapers } from "./search";
export type {
  SearchProviders,
  SearchProviderName,
  SearchOptions,
  SearchResult,
} from "./search";
export { critique, DEFAULT_WEIGHTS } from "./critique";
export type {
  Critique,
  CritiqueConfig,
  DimensionScores,
  DimensionWeights,
} from "./critique";
export { chat, deepseekFromEnv, qwenFromEnv } from "./agent";

// Candidate-shaped search + helpers (research-thera compatible surface)
export {
  S2_ENRICHMENT_FIELDS,
  searchCrossref,
  searchSemanticScholar,
  searchOpenAlex,
  searchArxiv,
  searchCore,
  searchZenodo,
  getSemanticScholarPaper,
  getSemanticScholarPapersBatch,
  getSemanticScholarRecommendations,
  getSemanticScholarCitations,
  dedupeCandidates,
  crossrefToCandidate,
  scholarToCandidate,
  openAlexToCandidate,
  arxivToCandidate,
  coreToCandidate,
  zenodoToCandidate,
} from "./candidate";
export { normalizeDoi, stripJats, titleFingerprint } from "./text";
export { scoreCandidate, pickBestCandidate } from "./score";
export {
  filterBookChapters,
  filterShortAbstracts,
  applyQualityFilters,
} from "./filters";
export type { QualityFilterOptions } from "./filters";
export { mapLimit } from "./concurrency";
export { fetchPaperDetails, resolvePaperByTitle } from "./resolve";
export type { ResolvePaperByTitleOptions } from "./resolve";

// ─── Aggregated namespace (matches research-thera's `sourceTools`) ──────────
import {
  searchCrossref,
  searchSemanticScholar,
  searchOpenAlex,
  searchArxiv,
  searchCore,
  searchZenodo,
  getSemanticScholarPaper,
  getSemanticScholarPapersBatch,
  getSemanticScholarRecommendations,
  getSemanticScholarCitations,
  dedupeCandidates,
} from "./candidate";
import { searchPubMed, fetchPubMedDoiAndAbstractByPmid } from "./pubmed";
import { searchEuropePmc } from "./europepmc";
import { searchDataCite } from "./datacite";
import { getUnpaywallOaUrl } from "./unpaywall";
import { fetchDoiMetadata } from "./doi";
import { fetchPaperDetails, resolvePaperByTitle } from "./resolve";
import { pickBestCandidate, scoreCandidate } from "./score";
import {
  applyQualityFilters,
  filterBookChapters,
  filterShortAbstracts,
} from "./filters";
import { mapLimit } from "./concurrency";
import { normalizeDoi, stripJats, titleFingerprint } from "./text";

export const sourceTools = {
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
  // Filters
  filterBookChapters,
  filterShortAbstracts,
  applyQualityFilters,
  // Utilities
  mapLimit,
  normalizeDoi,
  stripJats,
  titleFingerprint,
  scoreCandidate,
};
