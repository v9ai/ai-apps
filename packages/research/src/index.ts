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
export { searchPapers } from "./search";
export type {
  SearchProviders,
  SearchProviderName,
  SearchOptions,
  SearchResult,
} from "./search";
export {
  critique,
  DEFAULT_WEIGHTS,
} from "./critique";
export type {
  Critique,
  CritiqueConfig,
  DimensionScores,
  DimensionWeights,
} from "./critique";
export { chat, deepseekFromEnv, qwenFromEnv } from "./agent";
