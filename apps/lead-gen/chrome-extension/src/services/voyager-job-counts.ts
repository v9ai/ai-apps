/**
 * LinkedIn Voyager Job Count Aggregation & Analytics
 *
 * Extracts job count metrics from LinkedIn's internal Voyager API without
 * fetching full result payloads. Uses count=1 requests to minimize data
 * transfer while still getting totalResultCount from paging metadata.
 *
 * All functions run in a Chrome Extension background service worker context
 * with access to the authenticated LinkedIn session via JSESSIONID cookie.
 *
 * ── Voyager Job Search Endpoint ──────────────────────────────────────
 *
 * Base URL:
 *   https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards
 *
 * Required headers:
 *   csrf-token: <JSESSIONID cookie value, quotes stripped>
 *   x-restli-protocol-version: 2.0.0
 *   Accept: application/vnd.linkedin.normalized+json+2.1
 *
 * Query parameters:
 *   decorationId   — response shape selector (which fields to include)
 *   count          — page size (use 1 for count-only requests)
 *   start          — pagination offset
 *   q              — query type, always "jobSearch"
 *   query          — RestLI filter expression (see below)
 *   locationUnion  — geo targeting, e.g. "(geoId:92000000)" for worldwide
 *
 * ── Response Shape ───────────────────────────────────────────────────
 *
 * The response contains:
 *   paging.total    — totalResultCount (the number we care about)
 *   paging.start    — current offset
 *   paging.count    — requested page size
 *   paging.links[]  — HATEOAS pagination links
 *   elements[]      — job card entities (minimized when count=1)
 *   included[]      — normalized entity store (companies, geo, etc.)
 *
 * ── Filter Expression Syntax (RestLI) ────────────────────────────────
 *
 * The `query` parameter uses LinkedIn's RestLI protocol encoding:
 *
 *   (origin:JOB_SEARCH_PAGE_JOB_FILTER,
 *    selectedFilters:(
 *      company:List(12345),           // f_C — company numeric ID
 *      workplaceType:List(2),         // f_WT — 1=onsite, 2=remote, 3=hybrid
 *      timePostedRange:List(r86400),  // f_TPR — time window
 *      experience:List(4),            // f_E — seniority level
 *      industry:List(96),             // f_I — industry code
 *      geoUrn:List(101174742)         // f_JC — geo URN for location facet
 *    ),
 *    spellCorrectionEnabled:true,
 *    keywords:machine learning engineer  // keywords filter
 *   )
 *
 * ── Time Posted Range Values (f_TPR) ─────────────────────────────────
 *
 *   r86400    — Past 24 hours   (60*60*24)
 *   r604800   — Past week       (60*60*24*7)
 *   r2592000  — Past month      (60*60*24*30)
 *   (omit)    — Any time
 *
 * ── Workplace Type Values (f_WT) ─────────────────────────────────────
 *
 *   1 — On-site
 *   2 — Remote
 *   3 — Hybrid
 *
 * ── Experience Level Values (f_E) ────────────────────────────────────
 *
 *   1 — Internship
 *   2 — Entry level
 *   3 — Associate
 *   4 — Mid-Senior level
 *   5 — Director
 *   6 — Executive
 *
 * ── Faceted Counts ───────────────────────────────────────────────────
 *
 * LinkedIn does NOT return faceted count breakdowns in the Voyager job
 * search response (unlike some search APIs that include facet histograms).
 * To get counts by different facet values, you must issue separate requests
 * with each filter combination. The strategy is:
 *
 *   1. Use count=1 to minimize payload (we only need paging.total)
 *   2. Issue parallel requests with different filter combos
 *   3. Respect rate limits (300ms between requests, exponential backoff on 429)
 *
 * This is still far more efficient than DOM scraping, which requires full
 * page navigation for each count.
 */

// ── Constants ────────────────────────────────────────────────────────

const VOYAGER_JOBS_API =
  "https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards";

const DECORATION_ID =
  "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227";

const VOYAGER_HEADERS = {
  "x-restli-protocol-version": "2.0.0",
  Accept: "application/vnd.linkedin.normalized+json+2.1",
} as const;

/** Minimum delay between Voyager requests to avoid 429. */
const REQUEST_DELAY_MS = 300;

/** Maximum retries on 429 rate limit. */
const MAX_RETRIES = 3;

// ── Geo IDs ──────────────────────────────────────────────────────────

export const GEO_IDS = {
  /** Worldwide — includes all job locations */
  WORLDWIDE: "92000000",
  /** United States */
  US: "103644278",
  /** European Union (aggregate) */
  EU: "91000000",
  /** United Kingdom */
  UK: "101165590",
  /** Germany */
  DE: "101282230",
  /** Netherlands */
  NL: "102890719",
  /** Canada */
  CA: "101174742",
  /** Australia */
  AU: "101452733",
  /** India */
  IN: "102713980",
  /** Singapore */
  SG: "102454443",
  /** Switzerland */
  CH: "106693272",
  /** France */
  FR: "105015875",
  /** Spain */
  ES: "105646813",
  /** Ireland */
  IE: "104738515",
  /** Poland */
  PL: "105072130",
  /** Portugal */
  PT: "100364837",
  /** Romania */
  RO: "106670623",
  /** Sweden */
  SE: "105117694",
  /** Denmark */
  DK: "104514075",
  /** Norway */
  NO: "103819153",
  /** Finland */
  FI: "100456013",
  /** Israel */
  IL: "101620260",
  /** Japan */
  JP: "101355337",
  /** Brazil */
  BR: "106057199",
} as const;

// ── Industry Codes ───────────────────────────────────────────────────

export const INDUSTRY_CODES = {
  /** Technology, Information and Internet */
  TECH: "6",
  /** Software Development */
  SOFTWARE: "4",
  /** IT Services and IT Consulting */
  IT_SERVICES: "96",
  /** Staffing and Recruiting */
  STAFFING: "104",
  /** Financial Services */
  FINANCE: "43",
  /** Computer and Network Security */
  CYBERSECURITY: "118",
  /** Artificial Intelligence / Machine Learning */
  AI_ML: "150",
  /** Biotechnology Research */
  BIOTECH: "49",
  /** Pharmaceutical Manufacturing */
  PHARMA: "126",
  /** Hospitals and Health Care */
  HEALTHCARE: "14",
  /** Higher Education */
  EDUCATION: "68",
  /** Defense and Space Manufacturing */
  DEFENSE: "1",
} as const;

// ── Time Ranges ──────────────────────────────────────────────────────

export const TIME_RANGES = {
  /** Past 24 hours */
  PAST_24H: "r86400",
  /** Past week (7 days) */
  PAST_WEEK: "r604800",
  /** Past month (30 days) */
  PAST_MONTH: "r2592000",
  /** Any time (omit the filter) */
  ANY_TIME: null,
} as const;

export type TimeRange = (typeof TIME_RANGES)[keyof typeof TIME_RANGES];

// ── Workplace Types ──────────────────────────────────────────────────

export const WORKPLACE_TYPES = {
  ON_SITE: "1",
  REMOTE: "2",
  HYBRID: "3",
} as const;

export type WorkplaceType = (typeof WORKPLACE_TYPES)[keyof typeof WORKPLACE_TYPES];

// ── Experience Levels ────────────────────────────────────────────────

export const EXPERIENCE_LEVELS = {
  INTERNSHIP: "1",
  ENTRY_LEVEL: "2",
  ASSOCIATE: "3",
  MID_SENIOR: "4",
  DIRECTOR: "5",
  EXECUTIVE: "6",
} as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[keyof typeof EXPERIENCE_LEVELS];

// ── Types ────────────────────────────────────────────────────────────

export interface VoyagerPaging {
  total: number;
  start: number;
  count: number;
}

export interface VoyagerJobCountResult {
  total: number;
  paging: VoyagerPaging;
  error: string | null;
  /** HTTP status code of the response, or 0 on network error */
  httpStatus: number;
}

export interface FacetedCount {
  label: string;
  filterValue: string;
  total: number;
}

export interface CompanyJobCounts {
  companyId: string;
  companyName?: string;
  remote: number;
  onSite: number;
  hybrid: number;
  total: number;
  byTimeRange: {
    past24h: number;
    pastWeek: number;
    pastMonth: number;
    anyTime: number;
  };
}

export interface TrendDataPoint {
  timestamp: string; // ISO 8601
  query: string;
  total: number;
  filters: Record<string, string>;
}

export interface TrendSeries {
  query: string;
  points: TrendDataPoint[];
  /** Computed: latest count minus earliest count */
  delta: number;
  /** Computed: percentage change from earliest to latest */
  deltaPercent: number;
}

// ── Auth ─────────────────────────────────────────────────────────────

/**
 * Read LinkedIn CSRF token from the JSESSIONID cookie.
 * Reused pattern from connection-scraper.ts and company-browsing.ts.
 */
async function getCsrfToken(): Promise<string> {
  const cookie = await chrome.cookies.get({
    url: "https://www.linkedin.com",
    name: "JSESSIONID",
  });
  if (!cookie?.value) {
    throw new Error("Not logged into LinkedIn -- JSESSIONID cookie not found");
  }
  return cookie.value.replace(/^"|"$/g, "");
}

// ── Core: Build Voyager URL ──────────────────────────────────────────

export interface VoyagerJobSearchFilters {
  /** Company numeric IDs (f_C) */
  companyIds?: string[];
  /** Workplace type (f_WT): 1=onsite, 2=remote, 3=hybrid */
  workplaceType?: WorkplaceType | WorkplaceType[];
  /** Time posted range (f_TPR): r86400, r604800, r2592000 */
  timeRange?: TimeRange;
  /** Experience level (f_E) */
  experience?: ExperienceLevel | ExperienceLevel[];
  /** Industry codes (f_I) */
  industryIds?: string[];
  /** Geo URNs for location facet (f_JC or geoUrn in selectedFilters) */
  geoUrns?: string[];
  /** Free-text keywords */
  keywords?: string;
}

/**
 * Build the RestLI query expression for Voyager job search.
 *
 * Example output:
 *   (origin:JOB_SEARCH_PAGE_JOB_FILTER,
 *    selectedFilters:(company:List(12345),workplaceType:List(2)),
 *    spellCorrectionEnabled:true)
 */
function buildQueryExpression(filters: VoyagerJobSearchFilters): string {
  const parts: string[] = [];

  if (filters.companyIds?.length) {
    parts.push(`company:List(${filters.companyIds.join(",")})`);
  }

  if (filters.workplaceType) {
    const wt = Array.isArray(filters.workplaceType)
      ? filters.workplaceType
      : [filters.workplaceType];
    parts.push(`workplaceType:List(${wt.join(",")})`);
  }

  if (filters.timeRange) {
    parts.push(`timePostedRange:List(${filters.timeRange})`);
  }

  if (filters.experience) {
    const exp = Array.isArray(filters.experience)
      ? filters.experience
      : [filters.experience];
    parts.push(`experience:List(${exp.join(",")})`);
  }

  if (filters.industryIds?.length) {
    parts.push(`industry:List(${filters.industryIds.join(",")})`);
  }

  if (filters.geoUrns?.length) {
    parts.push(`geoUrn:List(${filters.geoUrns.join(",")})`);
  }

  const selectedFilters = parts.length > 0
    ? `selectedFilters:(${parts.join(",")})`
    : "";

  const keywordsPart = filters.keywords
    ? `,keywords:${filters.keywords}`
    : "";

  const queryParts = [
    "origin:JOB_SEARCH_PAGE_JOB_FILTER",
    selectedFilters,
    "spellCorrectionEnabled:true",
  ].filter(Boolean);

  return `(${queryParts.join(",")}${keywordsPart})`;
}

/**
 * Construct the full Voyager URL for a job search count query.
 *
 * Uses count=1 and start=0 — we only need paging.total, not the actual
 * job card data. This minimizes response payload from ~200KB to ~5KB.
 */
export function buildVoyagerJobSearchUrl(
  filters: VoyagerJobSearchFilters,
  geoId: string = GEO_IDS.WORLDWIDE,
  pageSize: number = 1,
  start: number = 0,
): string {
  const url = new URL(VOYAGER_JOBS_API);
  url.searchParams.set("decorationId", DECORATION_ID);
  url.searchParams.set("count", String(pageSize));
  url.searchParams.set("q", "jobSearch");
  url.searchParams.set("query", buildQueryExpression(filters));
  url.searchParams.set("locationUnion", `(geoId:${geoId})`);
  url.searchParams.set("start", String(start));
  return url.toString();
}

// ── Core: Fetch with Retry ───────────────────────────────────────────

/**
 * Execute a single Voyager job count request with retry logic.
 *
 * Rate limit strategy:
 *   - 300ms minimum between requests (enforced by caller)
 *   - On 429: exponential backoff (2s, 4s, 8s) up to MAX_RETRIES
 *   - On 401/403: fail immediately (session expired)
 */
async function fetchVoyagerJobCount(
  url: string,
  csrfToken: string,
): Promise<VoyagerJobCountResult> {
  let retries = 0;

  while (true) {
    try {
      const res = await fetch(url, {
        headers: {
          "csrf-token": csrfToken,
          ...VOYAGER_HEADERS,
        },
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        return {
          total: 0,
          paging: { total: 0, start: 0, count: 0 },
          error: `Auth error: ${res.status} -- session may have expired`,
          httpStatus: res.status,
        };
      }

      if (res.status === 429) {
        if (retries >= MAX_RETRIES) {
          return {
            total: 0,
            paging: { total: 0, start: 0, count: 0 },
            error: `Rate limited (429) after ${MAX_RETRIES} retries`,
            httpStatus: 429,
          };
        }
        const backoff = Math.min(2000 * Math.pow(2, retries), 30000);
        retries++;
        console.warn(
          `[VoyagerJobCounts] 429 rate limit -- retry ${retries}/${MAX_RETRIES} in ${backoff}ms`,
        );
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      if (!res.ok) {
        return {
          total: 0,
          paging: { total: 0, start: 0, count: 0 },
          error: `HTTP ${res.status} ${res.statusText}`,
          httpStatus: res.status,
        };
      }

      const data = await res.json();

      // The paging object lives at data.paging or data.data.paging
      // depending on the Voyager response shape
      const paging: VoyagerPaging = {
        total: data?.paging?.total ?? data?.data?.paging?.total ?? 0,
        start: data?.paging?.start ?? data?.data?.paging?.start ?? 0,
        count: data?.paging?.count ?? data?.data?.paging?.count ?? 0,
      };

      return {
        total: paging.total,
        paging,
        error: null,
        httpStatus: res.status,
      };
    } catch (err) {
      return {
        total: 0,
        paging: { total: 0, start: 0, count: 0 },
        error: err instanceof Error ? err.message : String(err),
        httpStatus: 0,
      };
    }
  }
}

/** Delay helper for rate limiting between requests. */
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ══════════════════════════════════════════════════════════════════════
// PUBLIC API — Primary Count Functions
// ══════════════════════════════════════════════════════════════════════

/**
 * Count total remote jobs matching a keyword query.
 *
 * This is the most efficient way to get the totalResultCount from
 * LinkedIn's job search. Uses count=1 so the response is ~5KB instead
 * of ~200KB for a full page of results.
 *
 * @example
 *   const result = await countRemoteJobs("machine learning engineer");
 *   // result.total = 4521
 *
 * @example
 *   const result = await countRemoteJobs("react developer", {
 *     geoId: GEO_IDS.EU,
 *     timeRange: TIME_RANGES.PAST_WEEK,
 *   });
 *   // result.total = 312
 */
export async function countRemoteJobs(
  query: string,
  options: {
    geoId?: string;
    timeRange?: TimeRange;
    experience?: ExperienceLevel | ExperienceLevel[];
    industryIds?: string[];
  } = {},
): Promise<VoyagerJobCountResult> {
  const csrfToken = await getCsrfToken();

  const url = buildVoyagerJobSearchUrl(
    {
      workplaceType: WORKPLACE_TYPES.REMOTE,
      keywords: query,
      timeRange: options.timeRange ?? null,
      experience: options.experience,
      industryIds: options.industryIds,
    },
    options.geoId ?? GEO_IDS.WORLDWIDE,
  );

  return fetchVoyagerJobCount(url, csrfToken);
}

/**
 * Count remote jobs for a specific company by its LinkedIn numeric ID.
 *
 * This replaces the DOM-scraping approach in company-browsing.ts. No tab
 * navigation required — a single HTTP request gets the exact count.
 *
 * @example
 *   const result = await countByCompany("1441");  // Google
 *   // result.total = 287
 *
 * @example
 *   // With additional filters
 *   const result = await countByCompany("1441", {
 *     workplaceType: WORKPLACE_TYPES.REMOTE,
 *     timeRange: TIME_RANGES.PAST_WEEK,
 *     keywords: "machine learning",
 *   });
 */
export async function countByCompany(
  companyId: string,
  options: {
    workplaceType?: WorkplaceType;
    timeRange?: TimeRange;
    keywords?: string;
    geoId?: string;
  } = {},
): Promise<VoyagerJobCountResult> {
  const csrfToken = await getCsrfToken();

  const url = buildVoyagerJobSearchUrl(
    {
      companyIds: [companyId],
      workplaceType: options.workplaceType ?? WORKPLACE_TYPES.REMOTE,
      timeRange: options.timeRange ?? null,
      keywords: options.keywords,
    },
    options.geoId ?? GEO_IDS.WORLDWIDE,
  );

  return fetchVoyagerJobCount(url, csrfToken);
}

/**
 * Count remote jobs filtered by time range.
 *
 * The time range filter is LinkedIn's f_TPR parameter, encoded as
 * seconds since epoch. The three standard values are:
 *   r86400    = past 24 hours  (86400 seconds = 60*60*24)
 *   r604800   = past week      (604800 seconds = 60*60*24*7)
 *   r2592000  = past month     (2592000 seconds = 60*60*24*30)
 *
 * These are the ONLY values LinkedIn supports. Custom ranges like
 * "past 3 days" or "past 2 weeks" are not available via this filter.
 *
 * @example
 *   const result = await countByTimeRange(TIME_RANGES.PAST_24H, "AI engineer");
 *   // result.total = 89 (new remote AI engineer jobs in last 24 hours)
 */
export async function countByTimeRange(
  range: TimeRange,
  query?: string,
  options: {
    companyIds?: string[];
    geoId?: string;
    experience?: ExperienceLevel | ExperienceLevel[];
  } = {},
): Promise<VoyagerJobCountResult> {
  const csrfToken = await getCsrfToken();

  const url = buildVoyagerJobSearchUrl(
    {
      workplaceType: WORKPLACE_TYPES.REMOTE,
      timeRange: range,
      keywords: query,
      companyIds: options.companyIds,
      experience: options.experience,
    },
    options.geoId ?? GEO_IDS.WORLDWIDE,
  );

  return fetchVoyagerJobCount(url, csrfToken);
}

// ══════════════════════════════════════════════════════════════════════
// Faceted Count Functions
// ══════════════════════════════════════════════════════════════════════

/**
 * Get remote job counts broken down by geographic region.
 *
 * Since Voyager does not return facet histograms, this issues one
 * count=1 request per region. For N regions, that's N API calls.
 *
 * Rate limit: 300ms between requests = ~3.3 requests/sec.
 * For all 26 regions defined in GEO_IDS: ~8 seconds total.
 *
 * @example
 *   const counts = await countByRegion("machine learning");
 *   // [
 *   //   { label: "US", filterValue: "103644278", total: 1205 },
 *   //   { label: "UK", filterValue: "101165590", total: 342 },
 *   //   ...
 *   // ]
 */
export async function countByRegion(
  query: string,
  regions?: Record<string, string>,
  options: {
    timeRange?: TimeRange;
    workplaceType?: WorkplaceType;
  } = {},
): Promise<FacetedCount[]> {
  const csrfToken = await getCsrfToken();
  const geoMap = regions ?? GEO_IDS;
  const results: FacetedCount[] = [];

  for (const [label, geoId] of Object.entries(geoMap)) {
    const url = buildVoyagerJobSearchUrl(
      {
        workplaceType: options.workplaceType ?? WORKPLACE_TYPES.REMOTE,
        timeRange: options.timeRange ?? null,
        keywords: query,
      },
      geoId,
    );

    const result = await fetchVoyagerJobCount(url, csrfToken);

    if (!result.error) {
      results.push({ label, filterValue: geoId, total: result.total });
    } else {
      console.warn(
        `[VoyagerJobCounts] countByRegion failed for ${label}: ${result.error}`,
      );
      results.push({ label, filterValue: geoId, total: -1 });
    }

    await delay(REQUEST_DELAY_MS);
  }

  return results.sort((a, b) => b.total - a.total);
}

/**
 * Get remote job counts broken down by experience level.
 *
 * Issues 6 requests (one per experience level). ~2 seconds total.
 *
 * @example
 *   const counts = await countByExperience("react developer");
 *   // [
 *   //   { label: "MID_SENIOR", filterValue: "4", total: 892 },
 *   //   { label: "ASSOCIATE", filterValue: "3", total: 456 },
 *   //   ...
 *   // ]
 */
export async function countByExperience(
  query: string,
  options: {
    geoId?: string;
    timeRange?: TimeRange;
    companyIds?: string[];
  } = {},
): Promise<FacetedCount[]> {
  const csrfToken = await getCsrfToken();
  const results: FacetedCount[] = [];

  for (const [label, level] of Object.entries(EXPERIENCE_LEVELS)) {
    const url = buildVoyagerJobSearchUrl(
      {
        workplaceType: WORKPLACE_TYPES.REMOTE,
        experience: level,
        timeRange: options.timeRange ?? null,
        keywords: query,
        companyIds: options.companyIds,
      },
      options.geoId ?? GEO_IDS.WORLDWIDE,
    );

    const result = await fetchVoyagerJobCount(url, csrfToken);

    if (!result.error) {
      results.push({ label, filterValue: level, total: result.total });
    } else {
      console.warn(
        `[VoyagerJobCounts] countByExperience failed for ${label}: ${result.error}`,
      );
    }

    await delay(REQUEST_DELAY_MS);
  }

  return results.sort((a, b) => b.total - a.total);
}

/**
 * Get remote job counts broken down by industry.
 *
 * @example
 *   const counts = await countByIndustry("engineer", [
 *     INDUSTRY_CODES.TECH,
 *     INDUSTRY_CODES.AI_ML,
 *     INDUSTRY_CODES.FINANCE,
 *   ]);
 */
export async function countByIndustry(
  query: string,
  industryCodes?: string[],
  options: {
    geoId?: string;
    timeRange?: TimeRange;
  } = {},
): Promise<FacetedCount[]> {
  const csrfToken = await getCsrfToken();
  const industries = industryCodes ?? Object.values(INDUSTRY_CODES);
  const labelMap = Object.fromEntries(
    Object.entries(INDUSTRY_CODES).map(([k, v]) => [v, k]),
  );
  const results: FacetedCount[] = [];

  for (const code of industries) {
    const url = buildVoyagerJobSearchUrl(
      {
        workplaceType: WORKPLACE_TYPES.REMOTE,
        industryIds: [code],
        timeRange: options.timeRange ?? null,
        keywords: query,
      },
      options.geoId ?? GEO_IDS.WORLDWIDE,
    );

    const result = await fetchVoyagerJobCount(url, csrfToken);

    if (!result.error) {
      results.push({
        label: labelMap[code] ?? `industry_${code}`,
        filterValue: code,
        total: result.total,
      });
    } else {
      console.warn(
        `[VoyagerJobCounts] countByIndustry failed for ${code}: ${result.error}`,
      );
    }

    await delay(REQUEST_DELAY_MS);
  }

  return results.sort((a, b) => b.total - a.total);
}

/**
 * Get full workplace type breakdown for a company.
 *
 * Returns remote, on-site, hybrid, and total counts in 4 API calls.
 *
 * @example
 *   const counts = await getCompanyJobCounts("1441", "Google");
 *   // { companyId: "1441", companyName: "Google",
 *   //   remote: 287, onSite: 1205, hybrid: 456, total: 1948,
 *   //   byTimeRange: { past24h: 12, pastWeek: 89, pastMonth: 201, anyTime: 287 } }
 */
export async function getCompanyJobCounts(
  companyId: string,
  companyName?: string,
): Promise<CompanyJobCounts> {
  const csrfToken = await getCsrfToken();

  // Parallel-safe: build all URLs, then fetch sequentially with rate limiting
  const workplaceTypes = [
    { key: "remote" as const, wt: WORKPLACE_TYPES.REMOTE },
    { key: "onSite" as const, wt: WORKPLACE_TYPES.ON_SITE },
    { key: "hybrid" as const, wt: WORKPLACE_TYPES.HYBRID },
  ];

  const timeRanges = [
    { key: "past24h" as const, tr: TIME_RANGES.PAST_24H },
    { key: "pastWeek" as const, tr: TIME_RANGES.PAST_WEEK },
    { key: "pastMonth" as const, tr: TIME_RANGES.PAST_MONTH },
    { key: "anyTime" as const, tr: TIME_RANGES.ANY_TIME },
  ];

  const counts: CompanyJobCounts = {
    companyId,
    companyName,
    remote: 0,
    onSite: 0,
    hybrid: 0,
    total: 0,
    byTimeRange: { past24h: 0, pastWeek: 0, pastMonth: 0, anyTime: 0 },
  };

  // Workplace type counts (3 requests)
  for (const { key, wt } of workplaceTypes) {
    const url = buildVoyagerJobSearchUrl(
      { companyIds: [companyId], workplaceType: wt },
      GEO_IDS.WORLDWIDE,
    );
    const result = await fetchVoyagerJobCount(url, csrfToken);
    if (!result.error) counts[key] = result.total;
    await delay(REQUEST_DELAY_MS);
  }

  counts.total = counts.remote + counts.onSite + counts.hybrid;

  // Time range counts for remote jobs only (4 requests)
  for (const { key, tr } of timeRanges) {
    const url = buildVoyagerJobSearchUrl(
      {
        companyIds: [companyId],
        workplaceType: WORKPLACE_TYPES.REMOTE,
        timeRange: tr,
      },
      GEO_IDS.WORLDWIDE,
    );
    const result = await fetchVoyagerJobCount(url, csrfToken);
    if (!result.error) counts.byTimeRange[key] = result.total;
    await delay(REQUEST_DELAY_MS);
  }

  return counts;
}

/**
 * Count remote jobs for multiple companies in batch.
 *
 * Rate-efficient: issues one count=1 request per company with 300ms spacing.
 * For 50 companies: ~15 seconds.
 *
 * @example
 *   const counts = await batchCountByCompany([
 *     { id: "1441", name: "Google" },
 *     { id: "1035", name: "Microsoft" },
 *     { id: "2029", name: "Apple" },
 *   ]);
 */
export async function batchCountByCompany(
  companies: Array<{ id: string; name?: string }>,
  options: {
    workplaceType?: WorkplaceType;
    timeRange?: TimeRange;
    geoId?: string;
  } = {},
): Promise<Array<{ id: string; name?: string; total: number; error: string | null }>> {
  const csrfToken = await getCsrfToken();
  const results: Array<{ id: string; name?: string; total: number; error: string | null }> = [];

  for (const company of companies) {
    const url = buildVoyagerJobSearchUrl(
      {
        companyIds: [company.id],
        workplaceType: options.workplaceType ?? WORKPLACE_TYPES.REMOTE,
        timeRange: options.timeRange ?? null,
      },
      options.geoId ?? GEO_IDS.WORLDWIDE,
    );

    const result = await fetchVoyagerJobCount(url, csrfToken);
    results.push({
      id: company.id,
      name: company.name,
      total: result.total,
      error: result.error,
    });

    await delay(REQUEST_DELAY_MS);
  }

  return results;
}

// ══════════════════════════════════════════════════════════════════════
// Trend / Time-Series Functions
// ══════════════════════════════════════════════════════════════════════

/**
 * Build a single trend data point (snapshot) for a query.
 *
 * This function is designed to be called repeatedly (e.g., daily via a
 * cron job or extension alarm) to build up a time-series dataset.
 *
 * Strategy for daily snapshots:
 *   1. Use chrome.alarms to fire every 24 hours
 *   2. Call buildTrendDataPoint() to get current counts
 *   3. Store result in chrome.storage.local under a date key
 *   4. Use buildTrendSeries() to reconstruct the time-series
 *
 * @example
 *   const point = await buildTrendDataPoint("machine learning engineer remote");
 *   // {
 *   //   timestamp: "2026-04-10T14:30:00.000Z",
 *   //   query: "machine learning engineer remote",
 *   //   total: 4521,
 *   //   filters: { workplaceType: "2", geoId: "92000000" }
 *   // }
 */
export async function buildTrendDataPoint(
  query: string,
  options: {
    geoId?: string;
    workplaceType?: WorkplaceType;
    timeRange?: TimeRange;
    experience?: ExperienceLevel | ExperienceLevel[];
  } = {},
): Promise<TrendDataPoint> {
  const result = await countRemoteJobs(query, {
    geoId: options.geoId,
    timeRange: options.timeRange,
    experience: options.experience,
  });

  const filters: Record<string, string> = {
    workplaceType: options.workplaceType ?? WORKPLACE_TYPES.REMOTE,
    geoId: options.geoId ?? GEO_IDS.WORLDWIDE,
  };
  if (options.timeRange) filters.timeRange = options.timeRange;
  if (options.experience) {
    filters.experience = Array.isArray(options.experience)
      ? options.experience.join(",")
      : options.experience;
  }

  return {
    timestamp: new Date().toISOString(),
    query,
    total: result.total,
    filters,
  };
}

/**
 * Capture a multi-dimensional trend snapshot.
 *
 * Takes a snapshot across all three time ranges simultaneously, giving you:
 *   - anyTime total (cumulative)
 *   - pastMonth count (rolling 30-day window)
 *   - pastWeek count (rolling 7-day window)
 *   - past24h count (daily new postings)
 *
 * The difference between consecutive snapshots of "pastMonth" reveals
 * the true velocity of new job postings over time.
 *
 * @example
 *   const snapshot = await captureMultiRangeSnapshot("AI engineer");
 *   // {
 *   //   timestamp: "2026-04-10T14:30:00.000Z",
 *   //   query: "AI engineer",
 *   //   anyTime: 12450,
 *   //   pastMonth: 3200,
 *   //   pastWeek: 890,
 *   //   past24h: 125
 *   // }
 *
 *   // Store daily, then compute velocity:
 *   // velocity = today.pastWeek - yesterday.pastWeek
 *   // acceleration = today.velocity - yesterday.velocity
 */
export async function captureMultiRangeSnapshot(
  query: string,
  options: {
    geoId?: string;
    companyIds?: string[];
  } = {},
): Promise<{
  timestamp: string;
  query: string;
  anyTime: number;
  pastMonth: number;
  pastWeek: number;
  past24h: number;
}> {
  const csrfToken = await getCsrfToken();
  const geoId = options.geoId ?? GEO_IDS.WORLDWIDE;

  const ranges = [
    { key: "anyTime", tr: TIME_RANGES.ANY_TIME },
    { key: "pastMonth", tr: TIME_RANGES.PAST_MONTH },
    { key: "pastWeek", tr: TIME_RANGES.PAST_WEEK },
    { key: "past24h", tr: TIME_RANGES.PAST_24H },
  ] as const;

  const snapshot = {
    timestamp: new Date().toISOString(),
    query,
    anyTime: 0,
    pastMonth: 0,
    pastWeek: 0,
    past24h: 0,
  };

  for (const { key, tr } of ranges) {
    const url = buildVoyagerJobSearchUrl(
      {
        workplaceType: WORKPLACE_TYPES.REMOTE,
        timeRange: tr,
        keywords: query,
        companyIds: options.companyIds,
      },
      geoId,
    );

    const result = await fetchVoyagerJobCount(url, csrfToken);
    if (!result.error) {
      snapshot[key] = result.total;
    }

    await delay(REQUEST_DELAY_MS);
  }

  return snapshot;
}

/**
 * Build a trend series from stored data points.
 *
 * Reads previously-captured snapshots from chrome.storage.local and
 * computes delta/percentage change across the time window.
 *
 * Storage key format: `trend:${query}:${YYYY-MM-DD}`
 *
 * @example
 *   // After collecting daily snapshots for a week:
 *   const series = await buildTrendSeries("machine learning engineer");
 *   // {
 *   //   query: "machine learning engineer",
 *   //   points: [ { timestamp, query, total, filters }, ... ],
 *   //   delta: +142,
 *   //   deltaPercent: 3.2
 *   // }
 */
export async function buildTrendSeries(
  query: string,
  daysBack: number = 30,
): Promise<TrendSeries> {
  const keys: string[] = [];
  const now = new Date();

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    keys.push(`trend:${query}:${dateStr}`);
  }

  const stored = await chrome.storage.local.get(keys);

  const points: TrendDataPoint[] = [];
  for (const key of keys) {
    if (stored[key]) {
      points.push(stored[key] as TrendDataPoint);
    }
  }

  // Sort chronologically (oldest first)
  points.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const delta =
    points.length >= 2 ? points[points.length - 1].total - points[0].total : 0;

  const deltaPercent =
    points.length >= 2 && points[0].total > 0
      ? ((delta / points[0].total) * 100)
      : 0;

  return {
    query,
    points,
    delta,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
  };
}

/**
 * Store a trend data point for later retrieval by buildTrendSeries().
 *
 * Call this once per day (e.g., from a chrome.alarms handler) to build
 * up the time-series dataset.
 *
 * @example
 *   // In your alarm handler:
 *   chrome.alarms.onAlarm.addListener(async (alarm) => {
 *     if (alarm.name === "daily-trend-capture") {
 *       const point = await buildTrendDataPoint("AI engineer remote");
 *       await storeTrendDataPoint(point);
 *     }
 *   });
 *
 *   // Set up the alarm:
 *   chrome.alarms.create("daily-trend-capture", {
 *     periodInMinutes: 24 * 60, // once per day
 *   });
 */
export async function storeTrendDataPoint(
  point: TrendDataPoint,
): Promise<void> {
  const dateStr = new Date(point.timestamp).toISOString().split("T")[0];
  const key = `trend:${point.query}:${dateStr}`;
  await chrome.storage.local.set({ [key]: point });
}

// ══════════════════════════════════════════════════════════════════════
// Composite / Dashboard Functions
// ══════════════════════════════════════════════════════════════════════

/**
 * Full dashboard snapshot for a query — all dimensions in one call.
 *
 * Captures: total count, time range breakdown, top 5 regions, top 5 industries,
 * and experience level distribution. Total API calls: ~20.
 * At 300ms spacing: ~6 seconds.
 *
 * @example
 *   const dashboard = await buildDashboardSnapshot("machine learning engineer");
 *   // {
 *   //   query: "machine learning engineer",
 *   //   timestamp: "2026-04-10T...",
 *   //   totals: { anyTime: 12450, pastMonth: 3200, pastWeek: 890, past24h: 125 },
 *   //   topRegions: [...],
 *   //   topIndustries: [...],
 *   //   experienceLevels: [...]
 *   // }
 */
export async function buildDashboardSnapshot(
  query: string,
  options: {
    /** Which geo regions to count (defaults to top 8 markets) */
    regions?: Record<string, string>;
    /** Which industry codes to count (defaults to tech-adjacent) */
    industries?: string[];
  } = {},
): Promise<{
  query: string;
  timestamp: string;
  totals: {
    anyTime: number;
    pastMonth: number;
    pastWeek: number;
    past24h: number;
  };
  topRegions: FacetedCount[];
  topIndustries: FacetedCount[];
  experienceLevels: FacetedCount[];
}> {
  const timestamp = new Date().toISOString();

  // 1. Multi-range snapshot (4 API calls)
  const totals = await captureMultiRangeSnapshot(query);

  // 2. Top regions (default: 8 key markets)
  const defaultRegions: Record<string, string> = {
    US: GEO_IDS.US,
    UK: GEO_IDS.UK,
    DE: GEO_IDS.DE,
    NL: GEO_IDS.NL,
    CA: GEO_IDS.CA,
    AU: GEO_IDS.AU,
    FR: GEO_IDS.FR,
    CH: GEO_IDS.CH,
  };
  const topRegions = await countByRegion(
    query,
    options.regions ?? defaultRegions,
  );

  // 3. Top industries (default: tech-adjacent)
  const defaultIndustries = [
    INDUSTRY_CODES.TECH,
    INDUSTRY_CODES.SOFTWARE,
    INDUSTRY_CODES.IT_SERVICES,
    INDUSTRY_CODES.AI_ML,
    INDUSTRY_CODES.FINANCE,
    INDUSTRY_CODES.CYBERSECURITY,
  ];
  const topIndustries = await countByIndustry(
    query,
    options.industries ?? defaultIndustries,
  );

  // 4. Experience levels (6 API calls)
  const experienceLevels = await countByExperience(query);

  return {
    query,
    timestamp,
    totals: {
      anyTime: totals.anyTime,
      pastMonth: totals.pastMonth,
      pastWeek: totals.pastWeek,
      past24h: totals.past24h,
    },
    topRegions,
    topIndustries,
    experienceLevels,
  };
}

/**
 * Efficient batch comparison: count the same query across multiple
 * companies without fetching any result data.
 *
 * Use case: "Which of our target companies are currently hiring
 * remote ML engineers?"
 *
 * @example
 *   const ranked = await rankCompaniesByRemoteJobs(
 *     [
 *       { id: "1441", name: "Google" },
 *       { id: "1035", name: "Microsoft" },
 *       { id: "2029", name: "Apple" },
 *       { id: "1337", name: "Netflix" },
 *     ],
 *     { keywords: "machine learning" },
 *   );
 *   // Sorted by remote job count descending
 */
export async function rankCompaniesByRemoteJobs(
  companies: Array<{ id: string; name?: string }>,
  options: {
    keywords?: string;
    timeRange?: TimeRange;
    geoId?: string;
  } = {},
): Promise<Array<{ id: string; name?: string; remoteJobs: number }>> {
  const csrfToken = await getCsrfToken();
  const results: Array<{ id: string; name?: string; remoteJobs: number }> = [];

  for (const company of companies) {
    const url = buildVoyagerJobSearchUrl(
      {
        companyIds: [company.id],
        workplaceType: WORKPLACE_TYPES.REMOTE,
        timeRange: options.timeRange ?? null,
        keywords: options.keywords,
      },
      options.geoId ?? GEO_IDS.WORLDWIDE,
    );

    const result = await fetchVoyagerJobCount(url, csrfToken);
    results.push({
      id: company.id,
      name: company.name,
      remoteJobs: result.error ? -1 : result.total,
    });

    await delay(REQUEST_DELAY_MS);
  }

  return results.sort((a, b) => b.remoteJobs - a.remoteJobs);
}

// ══════════════════════════════════════════════════════════════════════
// URL Construction Helpers (for DOM-based search)
// ══════════════════════════════════════════════════════════════════════

/**
 * Build a LinkedIn Jobs search URL (browser-navigable, not Voyager API).
 *
 * Use this when you need to navigate a tab to the LinkedIn jobs search page,
 * e.g., for DOM scraping fallback or user-facing links.
 *
 * URL parameters:
 *   f_C       — company IDs (comma-separated)
 *   f_WT      — workplace type: 1=onsite, 2=remote, 3=hybrid
 *   f_TPR     — time posted range: r86400, r604800, r2592000
 *   f_E       — experience level: 1-6
 *   f_I       — industry codes
 *   geoId     — geo targeting
 *   keywords  — search terms
 *
 * @example
 *   const url = buildLinkedInJobsSearchUrl({
 *     companyIds: ["1441"],
 *     workplaceType: WORKPLACE_TYPES.REMOTE,
 *     timeRange: TIME_RANGES.PAST_WEEK,
 *   });
 *   // "https://www.linkedin.com/jobs/search/?f_C=1441&f_WT=2&f_TPR=r604800&geoId=92000000"
 */
export function buildLinkedInJobsSearchUrl(
  filters: VoyagerJobSearchFilters,
  geoId: string = GEO_IDS.WORLDWIDE,
): string {
  const url = new URL("https://www.linkedin.com/jobs/search/");

  if (filters.companyIds?.length) {
    url.searchParams.set("f_C", filters.companyIds.join(","));
  }

  if (filters.workplaceType) {
    const wt = Array.isArray(filters.workplaceType)
      ? filters.workplaceType.join(",")
      : filters.workplaceType;
    url.searchParams.set("f_WT", wt);
  }

  if (filters.timeRange) {
    url.searchParams.set("f_TPR", filters.timeRange);
  }

  if (filters.experience) {
    const exp = Array.isArray(filters.experience)
      ? filters.experience.join(",")
      : filters.experience;
    url.searchParams.set("f_E", exp);
  }

  if (filters.industryIds?.length) {
    url.searchParams.set("f_I", filters.industryIds.join(","));
  }

  if (filters.keywords) {
    url.searchParams.set("keywords", filters.keywords);
  }

  url.searchParams.set("geoId", geoId);

  return url.toString();
}

// ══════════════════════════════════════════════════════════════════════
// Alarm-based Daily Trend Capture
// ══════════════════════════════════════════════════════════════════════

/**
 * Set up daily trend capture via chrome.alarms.
 *
 * Call this once during extension initialization. It creates an alarm
 * that fires every 24 hours and captures trend snapshots for the
 * configured queries.
 *
 * @example
 *   // In background/index.ts:
 *   import { setupDailyTrendCapture, handleTrendAlarm } from "../services/voyager-job-counts";
 *
 *   setupDailyTrendCapture([
 *     "machine learning engineer",
 *     "AI engineer",
 *     "react developer",
 *     "rust developer",
 *   ]);
 *
 *   chrome.alarms.onAlarm.addListener(async (alarm) => {
 *     if (alarm.name === "daily-trend-capture") {
 *       await handleTrendAlarm();
 *     }
 *   });
 */
export function setupDailyTrendCapture(queries: string[]): void {
  // Store query list for the alarm handler
  chrome.storage.local.set({ "trend:queries": queries });

  // Create alarm: fire every 24 hours, starting now + 1 minute
  chrome.alarms.create("daily-trend-capture", {
    delayInMinutes: 1,
    periodInMinutes: 24 * 60,
  });

  console.log(
    `[VoyagerJobCounts] Daily trend capture set up for ${queries.length} queries`,
  );
}

/**
 * Handle the daily trend capture alarm.
 *
 * Reads the query list from storage, captures a snapshot for each,
 * and stores the results for later retrieval by buildTrendSeries().
 */
export async function handleTrendAlarm(): Promise<void> {
  const stored = await chrome.storage.local.get("trend:queries");
  const queries = (stored["trend:queries"] as string[] | undefined) ?? [];

  if (queries.length === 0) {
    console.warn("[VoyagerJobCounts] No trend queries configured");
    return;
  }

  console.log(
    `[VoyagerJobCounts] Capturing daily trend for ${queries.length} queries...`,
  );

  for (const query of queries) {
    try {
      const point = await buildTrendDataPoint(query);
      await storeTrendDataPoint(point);
      console.log(
        `[VoyagerJobCounts] Trend captured: "${query}" = ${point.total}`,
      );
    } catch (err) {
      console.error(
        `[VoyagerJobCounts] Trend capture failed for "${query}":`,
        err,
      );
    }

    await delay(REQUEST_DELAY_MS * 2); // Extra spacing between queries
  }
}
