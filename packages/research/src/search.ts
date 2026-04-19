import { CrossrefClient } from "./crossref";
import { OpenAlexClient } from "./openalex";
import { SemanticScholarClient, SCHOLAR_SEARCH_FIELDS } from "./scholar";
import { ZenodoClient } from "./zenodo";
import {
  fromCrossref,
  fromOpenAlex,
  fromScholar,
  fromZenodo,
} from "./paper";
import type { ResearchPaper, SearchArgs } from "./types";

export type SearchProviderName = "open_alex" | "crossref" | "zenodo" | "semantic_scholar";

export interface SearchProviders {
  openAlex?: OpenAlexClient;
  crossref?: CrossrefClient;
  scholar?: SemanticScholarClient;
  zenodo?: ZenodoClient;
}

export interface SearchOptions {
  /** Provider order. Default: open_alex → crossref → semantic_scholar → zenodo. */
  order?: SearchProviderName[];
}

export interface SearchResult {
  provider: SearchProviderName;
  papers: ResearchPaper[];
  total?: number;
}

const DEFAULT_ORDER: SearchProviderName[] = [
  "open_alex",
  "crossref",
  "semantic_scholar",
  "zenodo",
];

/**
 * Search papers across multiple academic APIs with a fallback chain.
 * Returns the first provider that yields non-empty results.
 * Mirrors `crates/research/src/tools.rs` SearchPapers.fetch_papers.
 */
export async function searchPapers(
  args: SearchArgs,
  providers: SearchProviders = {},
  options: SearchOptions = {},
): Promise<SearchResult> {
  const limit = Math.min(args.limit ?? 8, 100);
  const order = options.order ?? DEFAULT_ORDER;

  const openAlex = providers.openAlex ?? new OpenAlexClient();
  const crossref = providers.crossref ?? new CrossrefClient();
  const scholar = providers.scholar ?? new SemanticScholarClient();
  const zenodo = providers.zenodo;

  for (const provider of order) {
    try {
      if (provider === "open_alex") {
        const resp = await openAlex.search(args.query, 1, limit);
        if (resp.results.length) {
          return {
            provider,
            papers: resp.results.map(fromOpenAlex),
            total: resp.meta?.count,
          };
        }
      } else if (provider === "crossref") {
        const resp = await crossref.search(args.query, limit, 0);
        const items = resp.message?.items ?? [];
        if (items.length) {
          return {
            provider,
            papers: items.map(fromCrossref),
            total: resp.message?.["total-results"],
          };
        }
      } else if (provider === "semantic_scholar") {
        const resp = await scholar.searchBulk(args.query, {
          fields: SCHOLAR_SEARCH_FIELDS,
          year: args.year,
          minCitations: args.min_citations,
          sort: "citationCount:desc",
          limit,
        });
        if (resp.data.length) {
          return {
            provider,
            papers: resp.data.map(fromScholar),
            total: resp.total,
          };
        }
      } else if (provider === "zenodo" && zenodo) {
        const resp = await zenodo.search(args.query, 1, limit);
        const hits = resp.hits?.hits ?? [];
        if (hits.length) {
          return {
            provider,
            papers: hits.map(fromZenodo),
            total: resp.hits?.total,
          };
        }
      }
    } catch (err) {
      console.warn(`[searchPapers] ${provider} failed: ${String(err)}`);
      continue;
    }
  }

  return { provider: order[order.length - 1] ?? "open_alex", papers: [], total: 0 };
}
