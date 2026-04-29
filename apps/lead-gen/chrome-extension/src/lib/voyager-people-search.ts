/**
 * LinkedIn Voyager People-Search Endpoint Adapter
 *
 * Implements VoyagerEndpointConfig<PersonHit> for the people-search clusters
 * endpoint. Used by the "Browse All Pages" button on /search/results/people/...
 * to enumerate every profile a search query returns (up to ~1000 cap).
 *
 * Endpoint: GET https://www.linkedin.com/voyager/api/graphql
 *   ?variables=(start:N,origin:FACETED_SEARCH,query:(keywords:K,flagshipSearchIntent:SEARCH_SRP,queryParameters:List(...),includeFiltersInResponse:false))
 *   &queryId=voyagerSearchDashClusters.<HASH>
 *
 * ── How to refresh the queryId ─────────────────────────────────────────
 * LinkedIn rotates the `queryId` hash roughly quarterly. When traversal
 * starts returning empty pages despite an active session, refresh:
 *
 *   1. Open https://www.linkedin.com/search/results/people/?keywords=test
 *      while signed in.
 *   2. DevTools → Network → filter "voyagerSearchDashClusters".
 *   3. Pick the first call, copy the `queryId` query param verbatim
 *      (looks like "voyagerSearchDashClusters.abcdef0123456789...").
 *   4. Replace SEARCH_CLUSTERS_QUERY_ID below.
 *
 * Auth: reuses csrf-token + JSESSIONID via PaginationManager's getCsrfToken().
 */
import type {
  VoyagerEndpointConfig,
  VoyagerPageResult,
  VoyagerPagingMetadata,
} from "./pagination-manager";

// ── Query ID — refresh per docblock above ──────────────────────────────
const SEARCH_CLUSTERS_QUERY_ID =
  "voyagerSearchDashClusters.b0928897b71bd00a5cebcd9d4ef12345";

// ── Caps ───────────────────────────────────────────────────────────────
const PEOPLE_SEARCH_PAGE_SIZE = 10; // LinkedIn returns 10 per cluster page
const PEOPLE_SEARCH_MAX_DEPTH = 1000; // LinkedIn's hard cap on search results
const REQUEST_DELAY_MS = 600; // Slightly more conservative than default (350)

// ── Types ──────────────────────────────────────────────────────────────

export interface PersonHit {
  /** Public profile URL, e.g. https://www.linkedin.com/in/john-doe/ */
  profileUrl: string;
  /** Display name from the title text. */
  name: string;
  /** Headline / primary subtitle text. */
  headline: string;
  /** Stable URN used for dedup across pages. */
  profileUrn: string;
}

/**
 * Build a people-search Voyager endpoint config from the URL of an active
 * /search/results/people/... tab. Pass through `keywords` and any facet
 * params (geoUrn, network, currentCompany, etc.) the user already applied.
 */
export function peopleSearchEndpoint(
  searchUrl: string,
): VoyagerEndpointConfig<PersonHit> {
  const parsed = parseSearchUrl(searchUrl);

  return {
    name: `people-search:${parsed.keywords || "(no-keywords)"}`,
    mode: "offset",
    baseUrl: "https://www.linkedin.com/voyager/api/graphql",
    maxDepth: PEOPLE_SEARCH_MAX_DEPTH,
    pageSize: PEOPLE_SEARCH_PAGE_SIZE,
    requestDelayMs: REQUEST_DELAY_MS,

    buildUrl({ start, count }) {
      const variables = buildVariables({
        start,
        count,
        keywords: parsed.keywords,
        queryParameters: parsed.queryParameters,
      });
      const url = new URL("https://www.linkedin.com/voyager/api/graphql");
      url.searchParams.set("variables", variables);
      url.searchParams.set("queryId", SEARCH_CLUSTERS_QUERY_ID);
      return url.toString();
    },

    parsePage(data: unknown, status: number): VoyagerPageResult<PersonHit> {
      return parseClustersResponse(data, status);
    },

    extraHeaders: {
      // GraphQL endpoint expects the JSON variant of the accept header.
      Accept: "application/vnd.linkedin.normalized+json+2.1",
    },
  };
}

// ── URL → Voyager variables ────────────────────────────────────────────

interface ParsedSearchUrl {
  keywords: string;
  /** Facet params encoded for Voyager's `queryParameters:List(...)` clause. */
  queryParameters: Array<{ key: string; values: string[] }>;
}

/**
 * Parse a /search/results/people/ URL into the inputs we need to rebuild
 * the Voyager query. Maps web URL params to Voyager facet keys.
 */
function parseSearchUrl(searchUrl: string): ParsedSearchUrl {
  let url: URL;
  try {
    url = new URL(searchUrl);
  } catch {
    return { keywords: "", queryParameters: [] };
  }

  const keywords = url.searchParams.get("keywords") ?? "";

  // Web → Voyager facet name map. LinkedIn's web UI uses one set of param
  // names; the Voyager `query.queryParameters` clause uses another. These
  // are the common ones — extend as needed.
  const FACET_MAP: Record<string, string> = {
    geoUrn: "geoUrn",
    network: "network",
    currentCompany: "currentCompany",
    pastCompany: "pastCompany",
    industry: "industry",
    profileLanguage: "profileLanguage",
    school: "schoolFilter",
    serviceCategory: "serviceCategory",
    titleFreeText: "titleFreeText",
    firstName: "firstName",
    lastName: "lastName",
    keywordFirstName: "keywordFirstName",
    keywordLastName: "keywordLastName",
    keywordTitle: "keywordTitle",
    keywordCompany: "keywordCompany",
    keywordSchool: "keywordSchool",
  };

  const queryParameters: Array<{ key: string; values: string[] }> = [];
  for (const [webKey, voyagerKey] of Object.entries(FACET_MAP)) {
    const raw = url.searchParams.get(webKey);
    if (!raw) continue;
    const values = parseFacetValues(raw);
    if (values.length === 0) continue;
    queryParameters.push({ key: voyagerKey, values });
  }

  // resultType is always PEOPLE for this endpoint.
  queryParameters.push({ key: "resultType", values: ["PEOPLE"] });

  return { keywords, queryParameters };
}

/**
 * LinkedIn encodes multi-value facets as JSON arrays in the URL, e.g.
 *   geoUrn=%5B%22103644278%22%5D  →  ["103644278"]
 * Plain string values pass through unchanged.
 */
function parseFacetValues(raw: string): string[] {
  const decoded = decodeURIComponent(raw);
  if (decoded.startsWith("[") && decoded.endsWith("]")) {
    try {
      const arr = JSON.parse(decoded);
      if (Array.isArray(arr)) {
        return arr.map((v) => String(v)).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }
  return decoded ? [decoded] : [];
}

/**
 * Build the Voyager `variables` string for the search query.
 * Format: (start:N,origin:FACETED_SEARCH,query:(keywords:K,flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE)),...),includeFiltersInResponse:false))
 */
function buildVariables(opts: {
  start: number;
  count: number;
  keywords: string;
  queryParameters: Array<{ key: string; values: string[] }>;
}): string {
  const qpList = opts.queryParameters
    .map(
      (qp) =>
        `(key:${escapeRestli(qp.key)},value:List(${qp.values
          .map(escapeRestli)
          .join(",")}))`,
    )
    .join(",");

  const queryClause = [
    opts.keywords ? `keywords:${escapeRestli(opts.keywords)}` : "",
    "flagshipSearchIntent:SEARCH_SRP",
    `queryParameters:List(${qpList})`,
    "includeFiltersInResponse:false",
  ]
    .filter(Boolean)
    .join(",");

  return `(start:${opts.start},count:${opts.count},origin:FACETED_SEARCH,query:(${queryClause}))`;
}

/**
 * Voyager rest.li URL-encoded protocol uses '(', ')', ',', and ':' as
 * structural characters. Values containing those (or '%') must be encoded.
 */
function escapeRestli(value: string): string {
  return value.replace(/[(),:%]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

// ── Response → PersonHit[] ─────────────────────────────────────────────

/**
 * Walk a SearchDashClusters response and pull every profile result. The
 * shape varies by LinkedIn deploy; this walker is intentionally lenient:
 * it descends through known cluster/element/item nesting and falls back
 * to scanning `included` for entityResultViewModel entities.
 */
function parseClustersResponse(
  data: unknown,
  status: number,
): VoyagerPageResult<PersonHit> {
  const root = (data ?? {}) as Record<string, unknown>;
  const dataNode = (root.data ?? root) as Record<string, unknown>;

  // 1. Try the canonical path: data.searchDashClustersByAll.elements[*].items[*]
  const clusters =
    pickObject(dataNode, "searchDashClustersByAll") ??
    pickObject(dataNode, "data", "searchDashClustersByAll");
  const elements = pickArray(clusters, "elements");

  const seen = new Set<string>();
  const items: PersonHit[] = [];
  const itemIds: string[] = [];

  for (const cluster of elements) {
    const clusterItems = pickArray(cluster as Record<string, unknown>, "items");
    for (const wrapper of clusterItems) {
      const hit = extractEntityResult(wrapper);
      if (hit && !seen.has(hit.profileUrn)) {
        seen.add(hit.profileUrn);
        items.push(hit);
        itemIds.push(hit.profileUrn);
      }
    }
  }

  // 2. Fallback: scan `included[]` for any entityResultViewModel
  if (items.length === 0) {
    const included = Array.isArray(root.included)
      ? (root.included as unknown[])
      : [];
    for (const entity of included) {
      const hit = extractEntityResult(entity);
      if (hit && !seen.has(hit.profileUrn)) {
        seen.add(hit.profileUrn);
        items.push(hit);
        itemIds.push(hit.profileUrn);
      }
    }
  }

  const paging = extractPagingFromClusters(clusters) ?? {
    start: 0,
    count: items.length,
    total: undefined,
  };

  return { items, itemIds, paging, status };
}

function extractEntityResult(node: unknown): PersonHit | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  // Possible nesting: { item: { entityResult: {...} } } | { item: { ... entityResult } } | bare entityResult
  const candidate =
    pickObject(obj, "item", "entityResult") ??
    pickObject(obj, "entityResult") ??
    (looksLikeEntityResult(obj) ? obj : null);
  if (!candidate) return null;

  const navigationUrl =
    pickString(candidate, "navigationUrl") ??
    pickString(candidate, "navigationContext", "url") ??
    "";

  // Only keep /in/ profiles; filter out company/school/group hits that may
  // appear in mixed clusters when the user hasn't constrained resultType.
  const inMatch = navigationUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
  if (!inMatch) return null;
  const profileUrl = `https://www.linkedin.com/in/${inMatch[1]}/`;

  const name =
    pickString(candidate, "title", "text") ??
    pickString(candidate, "title", "accessibilityText") ??
    "";

  const headline =
    pickString(candidate, "primarySubtitle", "text") ??
    pickString(candidate, "primarySubtitle", "accessibilityText") ??
    pickString(candidate, "secondarySubtitle", "text") ??
    "";

  const profileUrn =
    pickString(candidate, "entityUrn") ??
    pickString(candidate, "trackingUrn") ??
    profileUrl; // last-resort dedup key

  if (!name || name === "LinkedIn Member") return null;

  return { profileUrl, name, headline, profileUrn };
}

function looksLikeEntityResult(obj: Record<string, unknown>): boolean {
  const t = obj.$type;
  if (typeof t === "string" && t.includes("EntityResultViewModel")) return true;
  return "navigationUrl" in obj && "title" in obj;
}

function extractPagingFromClusters(
  clusters: Record<string, unknown> | null,
): VoyagerPagingMetadata | null {
  if (!clusters) return null;
  const paging = clusters.paging;
  if (paging && typeof paging === "object") {
    return paging as VoyagerPagingMetadata;
  }
  return null;
}

// ── Tiny path-walk helpers ─────────────────────────────────────────────

function pickObject(
  obj: unknown,
  ...path: string[]
): Record<string, unknown> | null {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur && typeof cur === "object"
    ? (cur as Record<string, unknown>)
    : null;
}

function pickArray(obj: unknown, ...path: string[]): unknown[] {
  const node = pickObject(obj, ...path.slice(0, -1));
  if (!node) return [];
  const last = node[path[path.length - 1]];
  return Array.isArray(last) ? (last as unknown[]) : [];
}

function pickString(obj: unknown, ...path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" ? cur : undefined;
}
