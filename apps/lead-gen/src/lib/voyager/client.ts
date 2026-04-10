/**
 * LinkedIn Voyager API — Unified Client for Remote Job Counting
 *
 * Production-ready client for LinkedIn's internal Voyager REST API,
 * purpose-built for remote job counting, company hiring insights,
 * trend detection, and intent signal generation.
 *
 * ── Architecture ──────────────────────────────────────────────────────
 *
 * This module consolidates the work of 20 specialized expert agents into
 * a single, importable client. It is designed to run in TWO contexts:
 *
 *   1. Chrome Extension (primary): Piggybacks the browser's authenticated
 *      LinkedIn session. Cookies sent automatically via `credentials: "include"`.
 *
 *   2. Server-side (Next.js API routes): Requires manual cookie injection
 *      via the session management layer. Use `VoyagerSession` config.
 *
 * ── Voyager API Overview ──────────────────────────────────────────────
 *
 * Base URL: https://www.linkedin.com/voyager/api/
 *
 * Required headers for ALL requests:
 *   csrf-token: <JSESSIONID cookie value, quotes stripped>
 *   x-restli-protocol-version: 2.0.0
 *   Accept: application/vnd.linkedin.normalized+json+2.1
 *
 * Authentication cookies:
 *   li_at       — Main session token (~10KB base64, lifespan ~1 year)
 *   JSESSIONID  — CSRF token cookie (format: "ajax:{digits}", lifespan ~2h)
 *
 * Response shapes:
 *   Normalized: { data: {}, included: [...], paging: {} }
 *   Direct:     { elements: [...], paging: {} }
 *
 * ── Key Endpoints ─────────────────────────────────────────────────────
 *
 * Job Search:       /voyagerJobsDashJobCards
 * Job Detail:       /jobs/jobPostings/{id}
 * Job Description:  /jobs/jobPostings/{id}/description
 * Job Skills:       /voyagerJobsDashJobDetailSkills
 * Company Jobs:     /voyagerJobsDashJobCards?query=(selectedFilters:(company:List({id})))
 * Hiring Team:      /voyagerJobsDashHiringTeamCards
 * Salary Insights:  /voyagerJobsDashSalaryInsights
 * Profile:          /identity/dash/profiles
 * Company:          /organization/companies
 * Connections:      /relationships/dash/connections
 *
 * @module voyager/client
 */

// ═══════════════════════════════════════════════════════════════════════
// Section 1: URN System
// ═══════════════════════════════════════════════════════════════════════

/** LinkedIn URN — globally unique entity identifier. */
export type LinkedInUrn = `urn:li:${string}:${string}`;

/**
 * Known FSD (Front-end Serving Data) entity types in Voyager responses.
 * "fsd_" prefix indicates the newer Voyager "dash" layer.
 */
export type FsdEntityType =
  | "fsd_company"
  | "fsd_profile"
  | "fsd_jobPosting"
  | "fsd_skill"
  | "fsd_industry"
  | "fsd_function"
  | "fsd_seniority"
  | "fsd_geo"
  | "fsd_region"
  | "fsd_country"
  | "fsd_miniProfile"
  | "fsd_miniCompany"
  | "fsd_hiringProject"
  | "fsd_connection";

/** Legacy entity types (older endpoints, public APIs). */
export type LegacyEntityType =
  | "company"
  | "member"
  | "jobPosting"
  | "skill"
  | "industry"
  | "function"
  | "seniority"
  | "geo";

export type LinkedInEntityType = FsdEntityType | LegacyEntityType;

export interface ParsedUrn {
  raw: LinkedInUrn;
  namespace: "li";
  entityType: string;
  entityId: string;
  numericId: number | null;
}

/** Parse a LinkedIn URN into its components. */
export function parseUrn(urn: string): ParsedUrn | null {
  const match = urn.match(/^urn:li:([^:]+):(.+)$/);
  if (!match) return null;
  const numericId = /^\d+$/.test(match[2]) ? parseInt(match[2], 10) : null;
  return {
    raw: urn as LinkedInUrn,
    namespace: "li",
    entityType: match[1],
    entityId: match[2],
    numericId,
  };
}

/** Build a URN from components. */
export function buildUrn(entityType: string, entityId: string | number): LinkedInUrn {
  return `urn:li:${entityType}:${entityId}` as LinkedInUrn;
}

/** Extract numeric ID from a URN. */
export function extractId(urn: string): string | null {
  return parseUrn(urn)?.entityId ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// Section 2: Constants & Enums
// ═══════════════════════════════════════════════════════════════════════

const VOYAGER_BASE = "https://www.linkedin.com/voyager/api";

const VOYAGER_JOBS_API = `${VOYAGER_BASE}/voyagerJobsDashJobCards`;

const REQUIRED_HEADERS = {
  "x-restli-protocol-version": "2.0.0",
  Accept: "application/vnd.linkedin.normalized+json+2.1",
} as const;

/** Decoration IDs control which fields LinkedIn includes in responses. */
export const DECORATION_IDS = {
  JOB_SEARCH_CARDS_COLLECTION:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",
  JOB_SEARCH_CARD:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCard-227",
  JOB_RECOMMENDATION_CARD:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCard-203",
  JOB_POSTING_DETAIL:
    "com.linkedin.voyager.dash.deco.jobs.JobPosting-87",
  SAVED_JOB_CARD:
    "com.linkedin.voyager.dash.deco.jobs.SavedJob-14",
  APPLIED_JOB_CARD:
    "com.linkedin.voyager.dash.deco.jobs.AppliedJob-16",
  JOB_ALERT:
    "com.linkedin.voyager.dash.deco.jobs.JobAlert-24",
  HIRING_TEAM_CARD:
    "com.linkedin.voyager.dash.deco.jobs.HiringTeamCard-14",
  SALARY_INSIGHTS:
    "com.linkedin.voyager.dash.deco.jobs.SalaryInsight-12",
  CONNECTIONS:
    "com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16",
  FULL_PROFILE:
    "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-107",
  FULL_COMPANY:
    "com.linkedin.voyager.dash.deco.organization.FullCompanyPage-81",
  TOP_CARD_PROFILE:
    "com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-21",
} as const;

/** Known Voyager $type values for entity discrimination. */
export const VoyagerTypes = {
  JOB_POSTING: "com.linkedin.voyager.dash.jobs.JobPosting",
  JOB_CARD: "com.linkedin.voyager.dash.jobs.JobCard",
  JOB_SEARCH_CARD: "com.linkedin.voyager.dash.jobs.search.JobSearchCard",
  JOB_SEARCH_CARDS_COLLECTION: "com.linkedin.voyager.dash.jobs.search.JobSearchCardsCollection",
  COMPANY: "com.linkedin.voyager.dash.organization.Company",
  COMPANY_MINI: "com.linkedin.voyager.dash.organization.MiniCompany",
  PROFILE: "com.linkedin.voyager.dash.identity.profile.Profile",
  PROFILE_MINI: "com.linkedin.voyager.dash.identity.profile.MiniProfile",
  CONNECTION: "com.linkedin.voyager.dash.relationships.Connection",
  TEXT_VIEW_MODEL: "com.linkedin.voyager.dash.common.text.TextViewModel",
  VECTOR_IMAGE: "com.linkedin.common.VectorImage",
  COLLECTION_RESPONSE: "com.linkedin.restli.common.CollectionResponse",
} as const;

// ── Geographic IDs ──────────────────────────────────────────────────

/** LinkedIn geoId values for location filtering. */
export const GEO_IDS = {
  WORLDWIDE: "92000000",
  US: "103644278",
  EU: "91000000",
  UK: "101165590",
  DE: "101282230",
  NL: "102890719",
  CA: "101174742",
  AU: "101452733",
  IN: "102713980",
  SG: "102454443",
  CH: "106693272",
  FR: "105015875",
  ES: "105646813",
  IE: "104738515",
  PL: "105072130",
  PT: "100364837",
  RO: "106670623",
  SE: "105117694",
  DK: "104514075",
  NO: "103819153",
  FI: "100456013",
  IL: "101620260",
  JP: "101355337",
  BR: "106057199",
} as const;

// ── Industry Codes ──────────────────────────────────────────────────

export const INDUSTRY_CODES = {
  TECH: "6",
  SOFTWARE: "4",
  IT_SERVICES: "96",
  STAFFING: "104",
  FINANCE: "43",
  CYBERSECURITY: "118",
  AI_ML: "150",
  BIOTECH: "49",
  PHARMA: "126",
  HEALTHCARE: "14",
  EDUCATION: "68",
  DEFENSE: "1",
} as const;

// ── Time Posted Ranges (f_TPR) ──────────────────────────────────────

/**
 * LinkedIn f_TPR filter values. Encoded as seconds since epoch.
 * These are the ONLY values LinkedIn supports — no custom ranges.
 */
export const TIME_RANGES = {
  PAST_24H: "r86400",
  PAST_WEEK: "r604800",
  PAST_MONTH: "r2592000",
  ANY_TIME: null,
} as const;

export type TimeRange = (typeof TIME_RANGES)[keyof typeof TIME_RANGES];

// ── Workplace Types (f_WT) ──────────────────────────────────────────

export const WORKPLACE_TYPES = {
  ON_SITE: "1",
  REMOTE: "2",
  HYBRID: "3",
} as const;

export type WorkplaceType = (typeof WORKPLACE_TYPES)[keyof typeof WORKPLACE_TYPES];

// ── Experience Levels (f_E) ─────────────────────────────────────────

export const EXPERIENCE_LEVELS = {
  INTERNSHIP: "1",
  ENTRY_LEVEL: "2",
  ASSOCIATE: "3",
  MID_SENIOR: "4",
  DIRECTOR: "5",
  EXECUTIVE: "6",
} as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[keyof typeof EXPERIENCE_LEVELS];

// ── Seniority Mapping ───────────────────────────────────────────────

export const SENIORITY_MAP: Record<string, string> = {
  "1": "Internship",
  "2": "Entry level",
  "3": "Associate",
  "4": "Mid-Senior level",
  "5": "Director",
  "6": "Executive",
};

// ═══════════════════════════════════════════════════════════════════════
// Section 3: Remote Work Classification
// ═══════════════════════════════════════════════════════════════════════

/**
 * Remote policy values — matches crates/metal/src/similarity/filter.rs
 * VectorMeta.remote_policy and crates/metal/src/kernel/job_ner.rs
 */
export const REMOTE_POLICY = {
  UNKNOWN: 0,
  FULL_REMOTE: 1,
  HYBRID: 2,
  ONSITE: 3,
} as const;

export type RemotePolicy = (typeof REMOTE_POLICY)[keyof typeof REMOTE_POLICY];

export const REMOTE_POLICY_LABELS: Record<RemotePolicy, string> = {
  [REMOTE_POLICY.UNKNOWN]: "unknown",
  [REMOTE_POLICY.FULL_REMOTE]: "full_remote",
  [REMOTE_POLICY.HYBRID]: "hybrid",
  [REMOTE_POLICY.ONSITE]: "onsite",
};

/** Voyager WorkplaceType enum in API responses. */
export type VoyagerWorkplaceType = "ONSITE" | "REMOTE" | "HYBRID";

/** Map f_WT search parameter to remote_policy. */
export function fwtToRemotePolicy(fwt: string): RemotePolicy {
  switch (fwt) {
    case WORKPLACE_TYPES.ON_SITE: return REMOTE_POLICY.ONSITE;
    case WORKPLACE_TYPES.REMOTE: return REMOTE_POLICY.FULL_REMOTE;
    case WORKPLACE_TYPES.HYBRID: return REMOTE_POLICY.HYBRID;
    default: return REMOTE_POLICY.UNKNOWN;
  }
}

/** Map Voyager WorkplaceType enum to remote_policy. */
export function workplaceTypeToRemotePolicy(wt: VoyagerWorkplaceType): RemotePolicy {
  switch (wt) {
    case "REMOTE": return REMOTE_POLICY.FULL_REMOTE;
    case "HYBRID": return REMOTE_POLICY.HYBRID;
    case "ONSITE": return REMOTE_POLICY.ONSITE;
    default: return REMOTE_POLICY.UNKNOWN;
  }
}

/** Geographic scope of remote work. */
export type RemoteGeoScope =
  | "worldwide"
  | "country_restricted"
  | "region_restricted"
  | "unspecified";

/**
 * Resolve the geographic scope of a remote job from Voyager data.
 * Checks geoId first, then falls back to location string analysis.
 */
export function resolveRemoteGeoScope(
  geoId?: string,
  locationStr?: string,
): RemoteGeoScope {
  if (geoId === GEO_IDS.WORLDWIDE) return "worldwide";
  if (geoId && Object.values(GEO_IDS).includes(geoId as typeof GEO_IDS[keyof typeof GEO_IDS])) {
    return "country_restricted";
  }
  if (!locationStr) return "unspecified";

  const lower = locationStr.toLowerCase();
  if (/\b(worldwide|anywhere|global|any\s*location)\b/.test(lower)) return "worldwide";
  if (/\b(remote\s+in|united states only|us only|uk only)\b/.test(lower)) return "country_restricted";
  if (/\b(europe|emea|apac|americas)\b/.test(lower)) return "region_restricted";

  return "unspecified";
}

/**
 * Classify a Voyager job posting into remote_policy using a 4-signal
 * priority chain. Matches the Rust kernel's detect_remote_policy() logic.
 */
export function classifyRemotePolicy(job: {
  workplaceTypes?: VoyagerWorkplaceType[];
  workRemoteAllowed?: boolean;
  workplaceTypesResolutionResults?: Record<string, { localizedName: string; workplaceType: VoyagerWorkplaceType }>;
  formattedLocation?: string;
}): { policy: RemotePolicy; confidence: number; source: string } {
  // Signal 1: Structured workplaceTypes array (highest confidence)
  if (job.workplaceTypes?.length) {
    const primary = job.workplaceTypes[0];
    return {
      policy: workplaceTypeToRemotePolicy(primary),
      confidence: 0.95,
      source: "workplaceTypes",
    };
  }

  // Signal 2: Resolution results (decorated responses)
  if (job.workplaceTypesResolutionResults) {
    const entries = Object.values(job.workplaceTypesResolutionResults);
    if (entries.length > 0) {
      return {
        policy: workplaceTypeToRemotePolicy(entries[0].workplaceType),
        confidence: 0.90,
        source: "workplaceTypesResolutionResults",
      };
    }
  }

  // Signal 3: Boolean flag (lower confidence — ambiguous between remote/hybrid)
  if (job.workRemoteAllowed === true) {
    return { policy: REMOTE_POLICY.HYBRID, confidence: 0.60, source: "workRemoteAllowed" };
  }
  if (job.workRemoteAllowed === false) {
    return { policy: REMOTE_POLICY.ONSITE, confidence: 0.70, source: "workRemoteAllowed" };
  }

  // Signal 4: Location string heuristics (lowest confidence)
  if (job.formattedLocation) {
    const loc = job.formattedLocation.toLowerCase();
    if (/\b(fully remote|100% remote|remote[- ]first|work from anywhere)\b/.test(loc)) {
      return { policy: REMOTE_POLICY.FULL_REMOTE, confidence: 0.75, source: "locationString" };
    }
    if (/\(remote\)|\bremote\b/.test(loc)) {
      return { policy: REMOTE_POLICY.FULL_REMOTE, confidence: 0.65, source: "locationString" };
    }
    if (/\bhybrid\b/.test(loc)) {
      return { policy: REMOTE_POLICY.HYBRID, confidence: 0.65, source: "locationString" };
    }
    if (/\b(on[- ]?site|in[- ]?office)\b/.test(loc)) {
      return { policy: REMOTE_POLICY.ONSITE, confidence: 0.65, source: "locationString" };
    }
  }

  return { policy: REMOTE_POLICY.UNKNOWN, confidence: 0, source: "none" };
}

// ── Freshness ───────────────────────────────────────────────────────

export type FreshnessTier = "fresh" | "recent" | "aging" | "stale";

export interface FreshnessInfo {
  tier: FreshnessTier;
  ageDays: number;
  isRepost: boolean;
  trueListedAt: number;
}

/**
 * Calculate job freshness from Voyager timestamps.
 * Uses originalListedAt as true age when available (detects reposts).
 */
export function calculateFreshness(
  listedAt: number,
  originalListedAt?: number,
): FreshnessInfo {
  const now = Date.now();
  const isRepost = originalListedAt != null && originalListedAt < listedAt;
  const trueListedAt = originalListedAt ?? listedAt;
  const ageDays = (now - trueListedAt) / (1000 * 60 * 60 * 24);

  let tier: FreshnessTier;
  if (ageDays <= 3) tier = "fresh";
  else if (ageDays <= 14) tier = "recent";
  else if (ageDays <= 30) tier = "aging";
  else tier = "stale";

  return { tier, ageDays, isRepost, trueListedAt };
}

// ═══════════════════════════════════════════════════════════════════════
// Section 4: Error Types
// ═══════════════════════════════════════════════════════════════════════

export class VoyagerAuthError extends Error {
  readonly code = "AUTH_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "VoyagerAuthError";
  }
}

export class VoyagerRateLimitError extends Error {
  readonly code = "RATE_LIMITED" as const;
  readonly retryAfterMs: number;
  constructor(retryAfterMs = 60_000) {
    super("LinkedIn rate limit hit (429)");
    this.name = "VoyagerRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class VoyagerApiError extends Error {
  readonly code = "API_ERROR" as const;
  readonly status: number;
  constructor(status: number, statusText: string) {
    super(`Voyager API error: ${status} ${statusText}`);
    this.name = "VoyagerApiError";
    this.status = status;
  }
}

export class VoyagerBlockedError extends Error {
  readonly code = "BLOCKED" as const;
  constructor() {
    super("LinkedIn custom block (status 999). IP or account flagged.");
    this.name = "VoyagerBlockedError";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Section 5: Response Types
// ═══════════════════════════════════════════════════════════════════════

export interface VoyagerPaging {
  total: number;
  start: number;
  count: number;
  links?: Array<{ rel: string; href: string; type?: string }>;
}

export interface VoyagerEntity {
  $type: string;
  entityUrn?: string;
  [key: string]: unknown;
}

/** Normalized Voyager response (most common shape). */
export interface VoyagerNormalizedResponse<T = unknown> {
  data: T & { paging?: VoyagerPaging; elements?: unknown[] };
  included: VoyagerEntity[];
  paging?: VoyagerPaging;
}

/** Direct Voyager response (older format). */
export interface VoyagerDirectResponse<T = unknown> {
  elements: T[];
  paging?: VoyagerPaging;
}

export type VoyagerResponse<T = unknown> =
  | VoyagerNormalizedResponse<T>
  | VoyagerDirectResponse<T>;

/** Extract paging.total from either response shape. */
export function extractPagingTotal(data: Record<string, unknown>): number {
  const d = data as { paging?: VoyagerPaging; data?: { paging?: VoyagerPaging } };
  return d?.paging?.total ?? d?.data?.paging?.total ?? 0;
}

// ── Job Card Types ──────────────────────────────────────────────────

export type ApplyMethod = "IN_APP" | "EXTERNAL" | "COMPLEX_APPLY" | "OFFSITE";

export interface VoyagerJobCompany {
  entityUrn: LinkedInUrn;
  name: string;
  universalName?: string;
  logo?: { image?: { rootUrl: string; artifacts: Array<{ fileIdentifyingUrlPathSegment: string }> } };
  url?: string;
}

export interface VoyagerJobCard {
  entityUrn: LinkedInUrn;
  jobPostingId: string;
  title: string;
  company: VoyagerJobCompany;
  formattedLocation: string;
  geoUrn?: LinkedInUrn;
  state: string;
  listedAt: string;
  listedAtTimestamp?: number;
  originalListedAt?: number;
  workplaceType?: VoyagerWorkplaceType;
  employmentType?: string;
  experienceLevel?: string;
  applicantCount?: number;
  formattedSalary?: string;
  easyApply: boolean;
  applyMethod?: ApplyMethod;
  externalApplyUrl?: string;
  descriptionSnippet?: string;
  matchRating?: { profileFitScore?: number; profileFitLabel?: string };
  saved?: boolean;
  applied?: boolean;
  trackingUrn?: LinkedInUrn;
}

export interface VoyagerJobCountResult {
  total: number;
  paging: VoyagerPaging;
  error: string | null;
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
  timestamp: string;
  query: string;
  total: number;
  filters: Record<string, string>;
}

export interface TrendSeries {
  query: string;
  points: TrendDataPoint[];
  delta: number;
  deltaPercent: number;
}

// ── Skill Types ─────────────────────────────────────────────────────

export interface VoyagerSkill {
  entityUrn: LinkedInUrn;
  skillId: number;
  name: string;
  skillMatchPercentage?: number;
  skillSource: "EXPLICIT" | "INFERRED";
  $type?: string;
}

export interface VoyagerSalaryInsight {
  medianSalary?: number;
  minSalary?: number;
  maxSalary?: number;
  currencyCode?: string;
  payPeriod?: "YEARLY" | "MONTHLY" | "HOURLY";
  formattedSalary?: string;
}

// ── Hiring Contact Types ────────────────────────────────────────────

export type HiringContactSource =
  | "job_poster"
  | "hiring_team"
  | "recruiter"
  | "company_employee";

export type ConnectionDegree =
  | "SELF" | "FIRST" | "SECOND" | "THIRD" | "OUT_OF_NETWORK" | "UNKNOWN";

export interface HiringContact {
  memberUrn: string | null;
  publicIdentifier: string | null;
  linkedinUrl: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  profilePictureUrl: string | null;
  source: HiringContactSource;
  connectionDegree: ConnectionDegree;
  inmailAvailable: boolean;
  jobPostingIds: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// Section 6: Search Filter Types & RestLI Query Builder
// ═══════════════════════════════════════════════════════════════════════

export interface VoyagerJobSearchFilters {
  /** Company numeric IDs (f_C). */
  companyIds?: string[];
  /** Workplace type (f_WT): 1=onsite, 2=remote, 3=hybrid. */
  workplaceType?: WorkplaceType | WorkplaceType[];
  /** Time posted range (f_TPR). */
  timeRange?: TimeRange;
  /** Experience level (f_E). */
  experience?: ExperienceLevel | ExperienceLevel[];
  /** Industry codes (f_I). */
  industryIds?: string[];
  /** Geo URNs for location facet. */
  geoUrns?: string[];
  /** Free-text keywords. */
  keywords?: string;
}

/**
 * Build the RestLI query expression for Voyager job search.
 *
 * Output example:
 *   (origin:JOB_SEARCH_PAGE_JOB_FILTER,
 *    selectedFilters:(company:List(12345),workplaceType:List(2)),
 *    spellCorrectionEnabled:true,
 *    keywords:machine learning engineer)
 */
export function buildQueryExpression(filters: VoyagerJobSearchFilters): string {
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
 * Build the full Voyager URL for a job search.
 * With count=1, response is ~5KB (vs ~200KB for full page).
 */
export function buildVoyagerJobSearchUrl(
  filters: VoyagerJobSearchFilters,
  geoId: string = GEO_IDS.WORLDWIDE,
  pageSize: number = 1,
  start: number = 0,
): string {
  const url = new URL(VOYAGER_JOBS_API);
  url.searchParams.set("decorationId", DECORATION_IDS.JOB_SEARCH_CARDS_COLLECTION);
  url.searchParams.set("count", String(pageSize));
  url.searchParams.set("q", "jobSearch");
  url.searchParams.set("query", buildQueryExpression(filters));
  url.searchParams.set("locationUnion", `(geoId:${geoId})`);
  url.searchParams.set("start", String(start));
  return url.toString();
}

// ═══════════════════════════════════════════════════════════════════════
// Section 7: Session Management
// ═══════════════════════════════════════════════════════════════════════

export type SessionHealth =
  | "healthy"
  | "expiring_soon"
  | "rate_limited"
  | "session_expired"
  | "challenged"
  | "restricted";

export interface VoyagerSession {
  csrfToken: string;
  health: SessionHealth;
  totalRequests: number;
  total429s: number;
  lastRequestAt: number;
}

export interface VoyagerClientConfig {
  /**
   * How to obtain CSRF token.
   *   "chrome-extension" — read JSESSIONID cookie via chrome.cookies API
   *   "manual"           — pass csrfToken directly
   */
  authMode: "chrome-extension" | "manual";
  /** Required when authMode is "manual". */
  csrfToken?: string;
  /** Cookies for server-side requests (li_at + JSESSIONID). */
  cookies?: { li_at: string; JSESSIONID: string };
  /** Minimum delay between requests (ms). Default: 300. */
  requestDelayMs?: number;
  /** Max retries on 429. Default: 3. */
  maxRetries?: number;
  /** Jitter factor (0-1). Default: 0.3. */
  jitterFactor?: number;
  /** User-Agent for server-side requests. */
  userAgent?: string;
  /** Include full browser fingerprint headers. Default: false. */
  includeFingerprint?: boolean;
}

const DEFAULT_CONFIG: Required<
  Pick<VoyagerClientConfig, "requestDelayMs" | "maxRetries" | "jitterFactor">
> = {
  requestDelayMs: 300,
  maxRetries: 3,
  jitterFactor: 0.3,
};

/** Extract CSRF token from JSESSIONID cookie (strip quotes). */
export function extractCsrfToken(jsessionId: string): string {
  return jsessionId.replace(/^"|"$/g, "");
}

// ═══════════════════════════════════════════════════════════════════════
// Section 8: Rate Limiting & Stealth
// ═══════════════════════════════════════════════════════════════════════

/**
 * Apply jitter to a base delay. Prevents constant inter-request timing
 * which LinkedIn uses to detect automation.
 */
function jitteredDelay(baseMs: number, jitterFactor: number = 0.3): number {
  const jitter = baseMs * jitterFactor;
  const ms = baseMs + Math.floor(Math.random() * jitter * 2 - jitter);
  return Math.max(200, ms);
}

/** Exponential backoff for 429 retries. */
function computeBackoff(attempt: number, initialMs = 2000, maxMs = 30_000): number {
  const delay = initialMs * Math.pow(2, attempt);
  return Math.min(delay, maxMs);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Interpret Voyager HTTP status codes.
 *
 * Special note: status 999 is LinkedIn's custom "you are blocked" code.
 * Stop all requests immediately on 999.
 */
export function interpretStatus(status: number): {
  action: "success" | "retry" | "reauth" | "abort";
  description: string;
} {
  switch (status) {
    case 200: return { action: "success", description: "OK" };
    case 401: return { action: "reauth", description: "Session expired — li_at or JSESSIONID invalid" };
    case 403: return { action: "reauth", description: "Forbidden — possible CAPTCHA or account verification" };
    case 429: return { action: "retry", description: "Rate limited — backoff with exponential delay" };
    case 999: return { action: "abort", description: "LinkedIn block (999) — stop all requests" };
    default:
      if (status >= 500) return { action: "retry", description: `Server error (${status})` };
      return { action: "abort", description: `Unexpected status ${status}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Section 9: Response Parser
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parse Voyager normalized response — resolve entities from `included[]`
 * by cross-referencing URNs.
 */
export function resolveIncluded<T extends VoyagerEntity>(
  included: VoyagerEntity[],
  $type: string,
): T[] {
  return included.filter((e) => e.$type === $type) as T[];
}

/** Extract elements from either normalized or direct response shape. */
export function extractElements(data: Record<string, unknown>): unknown[] {
  const d = data as VoyagerNormalizedResponse & VoyagerDirectResponse;
  return d?.data?.elements ?? d?.elements ?? [];
}

/** Resolve a URN reference from the included[] array. */
export function resolveEntity(included: VoyagerEntity[], urn: string): VoyagerEntity | undefined {
  return included.find((e) => e.entityUrn === urn);
}

/** Extract plain text from Voyager rich text structures. */
export function extractText(textObj: { text?: string } | string | null | undefined): string {
  if (!textObj) return "";
  if (typeof textObj === "string") return textObj;
  return textObj.text ?? "";
}

/** Resolve the highest-res image URL from a Voyager VectorImage. */
export function resolveImageUrl(
  rootUrl: string,
  artifacts: Array<{ width: number; height: number; fileIdentifyingUrlPathSegment: string }>,
): string | null {
  if (!artifacts?.length) return null;
  const largest = artifacts.reduce((a, b) => (a.width > b.width ? a : b));
  return `${rootUrl}${largest.fileIdentifyingUrlPathSegment}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Section 10: VoyagerClient — Main Client Class
// ═══════════════════════════════════════════════════════════════════════

/**
 * Unified LinkedIn Voyager API client.
 *
 * Primary interface for all Voyager operations. Handles authentication,
 * rate limiting, retry logic, and response parsing.
 *
 * @example Chrome Extension context
 *   const client = new VoyagerClient({ authMode: "chrome-extension" });
 *   const count = await client.countRemoteJobs("AI engineer");
 *
 * @example Server-side context
 *   const client = new VoyagerClient({
 *     authMode: "manual",
 *     csrfToken: extractCsrfToken(jsessionId),
 *     cookies: { li_at: "...", JSESSIONID: "..." },
 *   });
 */
export class VoyagerClient {
  private config: VoyagerClientConfig & typeof DEFAULT_CONFIG;
  private session: VoyagerSession;

  constructor(config: VoyagerClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.session = {
      csrfToken: config.csrfToken ?? "",
      health: "healthy",
      totalRequests: 0,
      total429s: 0,
      lastRequestAt: 0,
    };
  }

  // ── Auth ───────────────────────────────────────────────────────────

  /** Get CSRF token, refreshing from cookie if in extension context. */
  private async getCsrfToken(): Promise<string> {
    if (this.config.authMode === "manual") {
      if (!this.config.csrfToken) throw new VoyagerAuthError("csrfToken required in manual mode");
      return this.config.csrfToken;
    }
    // Chrome extension context
    if (typeof chrome !== "undefined" && chrome?.cookies?.get) {
      const cookie = await chrome.cookies.get({
        url: "https://www.linkedin.com",
        name: "JSESSIONID",
      });
      if (!cookie?.value) {
        throw new VoyagerAuthError("Not logged into LinkedIn — JSESSIONID cookie not found");
      }
      this.session.csrfToken = extractCsrfToken(cookie.value);
      return this.session.csrfToken;
    }
    throw new VoyagerAuthError("Chrome cookies API not available — use manual authMode");
  }

  /** Build headers for a Voyager request. */
  private async buildHeaders(): Promise<Record<string, string>> {
    const csrfToken = await this.getCsrfToken();
    const headers: Record<string, string> = {
      "csrf-token": csrfToken,
      ...REQUIRED_HEADERS,
    };

    if (this.config.includeFingerprint) {
      headers["User-Agent"] = this.config.userAgent ??
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
      headers["x-li-lang"] = "en_US";
      headers["Accept-Language"] = "en-US,en;q=0.9";
      headers["Origin"] = "https://www.linkedin.com";
      headers["Referer"] = "https://www.linkedin.com/jobs/search/";
      headers["Sec-Fetch-Dest"] = "empty";
      headers["Sec-Fetch-Mode"] = "cors";
      headers["Sec-Fetch-Site"] = "same-origin";
    }

    return headers;
  }

  // ── Core Request ──────────────────────────────────────────────────

  /**
   * Execute a Voyager API request with retry logic.
   *
   * Handles: rate limits (429), auth errors (401/403), blocks (999),
   * server errors (5xx), and network failures.
   */
  async request<T = Record<string, unknown>>(
    url: string,
    options?: { method?: string; skipDelay?: boolean },
  ): Promise<T> {
    const headers = await this.buildHeaders();
    let retries = 0;

    while (true) {
      // Rate limit: enforce minimum delay between requests
      if (!options?.skipDelay) {
        const elapsed = Date.now() - this.session.lastRequestAt;
        const minDelay = jitteredDelay(this.config.requestDelayMs, this.config.jitterFactor);
        if (elapsed < minDelay) {
          await delay(minDelay - elapsed);
        }
      }

      this.session.lastRequestAt = Date.now();
      this.session.totalRequests++;

      try {
        const fetchInit: RequestInit = {
          method: options?.method ?? "GET",
          headers,
          credentials: this.config.authMode === "chrome-extension" ? "include" : undefined,
        };

        // Server-side: inject cookies manually
        if (this.config.cookies && this.config.authMode === "manual") {
          (fetchInit.headers as Record<string, string>)["Cookie"] =
            `li_at=${this.config.cookies.li_at}; JSESSIONID="${this.config.cookies.JSESSIONID}"`;
        }

        const res = await fetch(url, fetchInit);

        // Handle error statuses
        const { action } = interpretStatus(res.status);

        if (action === "success") {
          this.session.health = "healthy";
          return (await res.json()) as T;
        }

        if (action === "reauth") {
          this.session.health = res.status === 401 ? "session_expired" : "challenged";
          throw new VoyagerAuthError(`${res.status}: ${res.statusText}`);
        }

        if (action === "abort") {
          if (res.status === 999) {
            this.session.health = "restricted";
            throw new VoyagerBlockedError();
          }
          throw new VoyagerApiError(res.status, res.statusText);
        }

        // action === "retry" (429 or 5xx)
        if (retries >= this.config.maxRetries) {
          this.session.health = "rate_limited";
          throw new VoyagerRateLimitError();
        }

        this.session.total429s++;
        const backoff = computeBackoff(retries);
        retries++;
        console.warn(`[VoyagerClient] ${res.status} — retry ${retries}/${this.config.maxRetries} in ${backoff}ms`);
        await delay(backoff);
      } catch (err) {
        if (
          err instanceof VoyagerAuthError ||
          err instanceof VoyagerRateLimitError ||
          err instanceof VoyagerBlockedError ||
          err instanceof VoyagerApiError
        ) {
          throw err;
        }
        // Network error
        throw new VoyagerApiError(0, err instanceof Error ? err.message : String(err));
      }
    }
  }

  // ── Health ────────────────────────────────────────────────────────

  /** Check session health. */
  getHealth(): VoyagerSession {
    return { ...this.session };
  }

  /** Verify the session is alive by making a lightweight request. */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request(`${VOYAGER_BASE}/voyagerDashMySettings`);
      this.session.health = "healthy";
      return true;
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Remote Job Counting — Primary Use Case
  // ══════════════════════════════════════════════════════════════════

  /**
   * Count total remote jobs matching a keyword query.
   *
   * Uses count=1 to minimize payload (~5KB vs ~200KB for full results).
   * This is the most efficient way to get totalResultCount from LinkedIn.
   *
   * @example
   *   const result = await client.countRemoteJobs("machine learning engineer");
   *   console.log(result.total); // 4521
   */
  async countRemoteJobs(
    query: string,
    options: {
      geoId?: string;
      timeRange?: TimeRange;
      experience?: ExperienceLevel | ExperienceLevel[];
      industryIds?: string[];
    } = {},
  ): Promise<VoyagerJobCountResult> {
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

    try {
      const data = await this.request<Record<string, unknown>>(url);
      const total = extractPagingTotal(data);
      return { total, paging: { total, start: 0, count: 1 }, error: null, httpStatus: 200 };
    } catch (err) {
      return {
        total: 0,
        paging: { total: 0, start: 0, count: 0 },
        error: err instanceof Error ? err.message : String(err),
        httpStatus: err instanceof VoyagerApiError ? err.status : 0,
      };
    }
  }

  /**
   * Count remote jobs for a specific company.
   *
   * @example
   *   const result = await client.countRemoteJobsByCompany("1441"); // Google
   *   console.log(result.total); // 287
   */
  async countRemoteJobsByCompany(
    companyId: string,
    options: {
      workplaceType?: WorkplaceType;
      timeRange?: TimeRange;
      keywords?: string;
      geoId?: string;
    } = {},
  ): Promise<VoyagerJobCountResult> {
    const url = buildVoyagerJobSearchUrl(
      {
        companyIds: [companyId],
        workplaceType: options.workplaceType ?? WORKPLACE_TYPES.REMOTE,
        timeRange: options.timeRange ?? null,
        keywords: options.keywords,
      },
      options.geoId ?? GEO_IDS.WORLDWIDE,
    );

    try {
      const data = await this.request<Record<string, unknown>>(url);
      const total = extractPagingTotal(data);
      return { total, paging: { total, start: 0, count: 1 }, error: null, httpStatus: 200 };
    } catch (err) {
      return {
        total: 0,
        paging: { total: 0, start: 0, count: 0 },
        error: err instanceof Error ? err.message : String(err),
        httpStatus: err instanceof VoyagerApiError ? err.status : 0,
      };
    }
  }

  /**
   * Count remote jobs by time range.
   *
   * @example
   *   const result = await client.countByTimeRange(TIME_RANGES.PAST_24H, "AI engineer");
   *   console.log(result.total); // 89 new remote AI jobs in last 24h
   */
  async countByTimeRange(
    range: TimeRange,
    query?: string,
    options: { companyIds?: string[]; geoId?: string; experience?: ExperienceLevel | ExperienceLevel[] } = {},
  ): Promise<VoyagerJobCountResult> {
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

    try {
      const data = await this.request<Record<string, unknown>>(url);
      const total = extractPagingTotal(data);
      return { total, paging: { total, start: 0, count: 1 }, error: null, httpStatus: 200 };
    } catch (err) {
      return {
        total: 0,
        paging: { total: 0, start: 0, count: 0 },
        error: err instanceof Error ? err.message : String(err),
        httpStatus: err instanceof VoyagerApiError ? err.status : 0,
      };
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Faceted Counts — Regional, Experience, Industry Breakdowns
  // ══════════════════════════════════════════════════════════════════

  /**
   * Count remote jobs broken down by geographic region.
   * Issues one count=1 request per region (~8s for all 24 GEO_IDS).
   */
  async countByRegion(
    query: string,
    regions?: Record<string, string>,
    options: { timeRange?: TimeRange; workplaceType?: WorkplaceType } = {},
  ): Promise<FacetedCount[]> {
    const geoMap = regions ?? GEO_IDS;
    const results: FacetedCount[] = [];

    for (const [label, geoId] of Object.entries(geoMap)) {
      try {
        const url = buildVoyagerJobSearchUrl(
          {
            workplaceType: options.workplaceType ?? WORKPLACE_TYPES.REMOTE,
            timeRange: options.timeRange ?? null,
            keywords: query,
          },
          geoId,
        );
        const data = await this.request<Record<string, unknown>>(url);
        results.push({ label, filterValue: geoId, total: extractPagingTotal(data) });
      } catch (err) {
        console.warn(`[VoyagerClient] countByRegion failed for ${label}: ${err}`);
        results.push({ label, filterValue: geoId, total: -1 });
      }
    }

    return results.sort((a, b) => b.total - a.total);
  }

  /**
   * Count remote jobs broken down by experience level.
   * Issues 6 requests (~2s total).
   */
  async countByExperience(
    query: string,
    options: { geoId?: string; timeRange?: TimeRange; companyIds?: string[] } = {},
  ): Promise<FacetedCount[]> {
    const results: FacetedCount[] = [];

    for (const [label, level] of Object.entries(EXPERIENCE_LEVELS)) {
      try {
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
        const data = await this.request<Record<string, unknown>>(url);
        results.push({ label, filterValue: level, total: extractPagingTotal(data) });
      } catch (err) {
        console.warn(`[VoyagerClient] countByExperience failed for ${label}: ${err}`);
      }
    }

    return results.sort((a, b) => b.total - a.total);
  }

  /**
   * Count remote jobs broken down by industry.
   */
  async countByIndustry(
    query: string,
    industryCodes?: string[],
    options: { geoId?: string; timeRange?: TimeRange } = {},
  ): Promise<FacetedCount[]> {
    const industries = industryCodes ?? Object.values(INDUSTRY_CODES);
    const labelMap = Object.fromEntries(
      Object.entries(INDUSTRY_CODES).map(([k, v]) => [v, k]),
    );
    const results: FacetedCount[] = [];

    for (const code of industries) {
      try {
        const url = buildVoyagerJobSearchUrl(
          {
            workplaceType: WORKPLACE_TYPES.REMOTE,
            industryIds: [code],
            timeRange: options.timeRange ?? null,
            keywords: query,
          },
          options.geoId ?? GEO_IDS.WORLDWIDE,
        );
        const data = await this.request<Record<string, unknown>>(url);
        results.push({
          label: labelMap[code] ?? `industry_${code}`,
          filterValue: code,
          total: extractPagingTotal(data),
        });
      } catch (err) {
        console.warn(`[VoyagerClient] countByIndustry failed for ${code}: ${err}`);
      }
    }

    return results.sort((a, b) => b.total - a.total);
  }

  // ══════════════════════════════════════════════════════════════════
  // Company-Level Job Intelligence
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get full workplace type breakdown for a company.
   * Returns remote, onsite, hybrid, and total counts + time ranges.
   */
  async getCompanyJobCounts(
    companyId: string,
    companyName?: string,
  ): Promise<CompanyJobCounts> {
    const [remote, onSite, hybrid, total] = await Promise.all([
      this.countRemoteJobsByCompany(companyId, { workplaceType: WORKPLACE_TYPES.REMOTE }),
      this.countRemoteJobsByCompany(companyId, { workplaceType: WORKPLACE_TYPES.ON_SITE }),
      this.countRemoteJobsByCompany(companyId, { workplaceType: WORKPLACE_TYPES.HYBRID }),
      this.countRemoteJobsByCompany(companyId, {}),
    ]);

    const [past24h, pastWeek, pastMonth] = await Promise.all([
      this.countRemoteJobsByCompany(companyId, { timeRange: TIME_RANGES.PAST_24H }),
      this.countRemoteJobsByCompany(companyId, { timeRange: TIME_RANGES.PAST_WEEK }),
      this.countRemoteJobsByCompany(companyId, { timeRange: TIME_RANGES.PAST_MONTH }),
    ]);

    return {
      companyId,
      companyName,
      remote: remote.total,
      onSite: onSite.total,
      hybrid: hybrid.total,
      total: total.total,
      byTimeRange: {
        past24h: past24h.total,
        pastWeek: pastWeek.total,
        pastMonth: pastMonth.total,
        anyTime: total.total,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Job Search — Full Result Fetching
  // ══════════════════════════════════════════════════════════════════

  /**
   * Search for remote jobs with full card data.
   * Returns an async generator that auto-paginates.
   *
   * @example
   *   for await (const job of client.searchJobs({ keywords: "AI engineer" })) {
   *     console.log(job.title, job.company.name, job.formattedLocation);
   *   }
   */
  async *searchJobs(
    filters: VoyagerJobSearchFilters & { geoId?: string },
    options: { maxResults?: number; pageSize?: number } = {},
  ): AsyncGenerator<VoyagerJobCard, void, undefined> {
    const pageSize = Math.min(options.pageSize ?? 25, 49);
    const maxResults = options.maxResults ?? 1000;
    const geoId = filters.geoId ?? GEO_IDS.WORLDWIDE;
    const seen = new Set<string>();
    let start = 0;
    let yielded = 0;

    while (yielded < maxResults) {
      const url = buildVoyagerJobSearchUrl(
        { ...filters, workplaceType: filters.workplaceType ?? WORKPLACE_TYPES.REMOTE },
        geoId,
        pageSize,
        start,
      );

      const data = await this.request<Record<string, unknown>>(url);
      const elements = extractElements(data) as Record<string, unknown>[];
      const included = (data as VoyagerNormalizedResponse).included ?? [];

      if (elements.length === 0) break;

      for (const el of elements) {
        const card = this.parseJobCard(el, included);
        if (!card) continue;
        if (seen.has(card.jobPostingId)) continue;
        seen.add(card.jobPostingId);
        yield card;
        yielded++;
        if (yielded >= maxResults) return;
      }

      start += pageSize;
      const totalAvailable = extractPagingTotal(data);
      if (start >= totalAvailable || start >= 1000) break; // LinkedIn caps at ~1000
    }
  }

  /** Parse a raw Voyager element into a typed VoyagerJobCard. */
  private parseJobCard(
    el: Record<string, unknown>,
    included: VoyagerEntity[],
  ): VoyagerJobCard | null {
    const jobCard = el as Record<string, unknown>;
    const jobPostingCard = (jobCard.jobCardUnion as Record<string, unknown>)?.jobPostingCard as Record<string, unknown> | undefined;
    const data = jobPostingCard ?? jobCard;

    const entityUrn = (data.entityUrn ?? data.jobPostingUrn ?? "") as string;
    const jobPostingId = extractId(entityUrn);
    if (!jobPostingId) return null;

    const title = extractText(data.title as { text?: string } | string);
    const primaryDescription = data.primaryDescription as { text?: string } | undefined;
    const secondaryDescription = data.secondaryDescription as { text?: string } | undefined;
    const formattedLocation = extractText(secondaryDescription) || extractText(primaryDescription);

    // Resolve company from included[]
    const companyUrn = (data.companyUrn ?? data.primaryActorUrn ?? "") as string;
    const companyEntity = companyUrn ? resolveEntity(included, companyUrn) : undefined;

    const workplaceType = data.workplaceType as VoyagerWorkplaceType | undefined;
    const listedAt = data.listedAt as number | undefined;
    const applyMethod = data.applyMethod as Record<string, unknown> | undefined;

    return {
      entityUrn: entityUrn as LinkedInUrn,
      jobPostingId,
      title,
      company: {
        entityUrn: companyUrn as LinkedInUrn,
        name: extractText(companyEntity?.name as { text?: string } | string) ||
              extractText(primaryDescription),
        universalName: companyEntity?.universalName as string | undefined,
      },
      formattedLocation,
      state: (data.state ?? "LISTED") as string,
      listedAt: listedAt ? new Date(listedAt).toISOString() : "",
      listedAtTimestamp: listedAt,
      originalListedAt: data.originalListedAt as number | undefined,
      workplaceType,
      employmentType: data.employmentType as string | undefined,
      experienceLevel: data.formattedExperienceLevel as string | undefined,
      applicantCount: data.applicantCount as number | undefined,
      formattedSalary: extractText(data.formattedSalary as { text?: string } | string) || undefined,
      easyApply: applyMethod?.$type === "com.linkedin.voyager.dash.jobs.EasyApplyMethod" ||
                 !!(applyMethod?.easyApplyUrl),
      applyMethod: (applyMethod?.companyApplyUrl ? "EXTERNAL" : "IN_APP") as ApplyMethod,
      externalApplyUrl: applyMethod?.companyApplyUrl as string | undefined,
      descriptionSnippet: extractText(data.tertiaryDescription as { text?: string } | string) || undefined,
      trackingUrn: data.trackingUrn as LinkedInUrn | undefined,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Job Details
  // ══════════════════════════════════════════════════════════════════

  /**
   * Fetch full job posting details by job ID.
   *
   * @example
   *   const job = await client.getJobDetails("3912345678");
   */
  async getJobDetails(jobId: string): Promise<Record<string, unknown>> {
    const url = `${VOYAGER_BASE}/jobs/jobPostings/${jobId}?decorationId=${DECORATION_IDS.JOB_POSTING_DETAIL}`;
    return this.request(url);
  }

  /**
   * Fetch job description (rich text).
   */
  async getJobDescription(jobId: string): Promise<string> {
    const data = await this.getJobDetails(jobId);
    const description = (data as { data?: { description?: { text?: string } } })?.data?.description;
    return extractText(description);
  }

  // ══════════════════════════════════════════════════════════════════
  // Hiring Team Discovery
  // ══════════════════════════════════════════════════════════════════

  /**
   * Fetch hiring team members for a job posting.
   * Uses the "Meet the hiring team" Voyager endpoint.
   */
  async getHiringTeam(jobId: string): Promise<HiringContact[]> {
    const url = `${VOYAGER_BASE}/voyagerJobsDashHiringTeamCards` +
      `?decorationId=${DECORATION_IDS.HIRING_TEAM_CARD}` +
      `&q=jobPosting` +
      `&jobPostingUrn=urn:li:fsd_jobPosting:${jobId}`;

    try {
      const data = await this.request<VoyagerNormalizedResponse>(url);
      const elements = data.data?.elements ?? (data as unknown as VoyagerDirectResponse).elements ?? [];
      const included = data.included ?? [];

      return (elements as Record<string, unknown>[]).map((el) => {
        const member = el.hiringTeamMember as Record<string, unknown> | undefined;
        const memberUrn = (member?.linkedInMemberProfileUrn ?? el.memberUrn ?? null) as string | null;
        const memberEntity = memberUrn ? resolveEntity(included, memberUrn) : undefined;

        return {
          memberUrn,
          publicIdentifier: (memberEntity?.publicIdentifier ?? null) as string | null,
          linkedinUrl: memberUrn ? `https://www.linkedin.com/in/${memberEntity?.publicIdentifier ?? ""}` : null,
          firstName: extractText(member?.name as { text?: string } | string) || extractText(el.name as { text?: string } | string),
          lastName: "",
          title: extractText(member?.title as { text?: string } | string) || extractText(el.title as { text?: string } | string) || null,
          profilePictureUrl: null,
          source: "hiring_team" as HiringContactSource,
          connectionDegree: "UNKNOWN" as ConnectionDegree,
          inmailAvailable: false,
          jobPostingIds: [jobId],
        };
      });
    } catch {
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Trend Data — Time-Series Remote Job Counting
  // ══════════════════════════════════════════════════════════════════

  /**
   * Build trend data by counting jobs across multiple time ranges.
   * Returns a snapshot per query with past24h/pastWeek/pastMonth/anyTime.
   *
   * @example
   *   const trends = await client.getRemoteJobTrends([
   *     "AI engineer", "ML engineer", "React developer"
   *   ]);
   */
  async getRemoteJobTrends(
    queries: string[],
    options: { geoId?: string } = {},
  ): Promise<TrendSeries[]> {
    const series: TrendSeries[] = [];
    const now = new Date().toISOString();
    const geoId = options.geoId ?? GEO_IDS.WORLDWIDE;

    for (const query of queries) {
      const [day, week, month, all] = await Promise.all([
        this.countRemoteJobs(query, { timeRange: TIME_RANGES.PAST_24H, geoId }),
        this.countRemoteJobs(query, { timeRange: TIME_RANGES.PAST_WEEK, geoId }),
        this.countRemoteJobs(query, { timeRange: TIME_RANGES.PAST_MONTH, geoId }),
        this.countRemoteJobs(query, { timeRange: TIME_RANGES.ANY_TIME, geoId }),
      ]);

      const points: TrendDataPoint[] = [
        { timestamp: now, query, total: day.total, filters: { timeRange: "PAST_24H" } },
        { timestamp: now, query, total: week.total, filters: { timeRange: "PAST_WEEK" } },
        { timestamp: now, query, total: month.total, filters: { timeRange: "PAST_MONTH" } },
        { timestamp: now, query, total: all.total, filters: { timeRange: "ANY_TIME" } },
      ];

      const delta = all.total - month.total;
      const deltaPercent = month.total > 0 ? ((delta / month.total) * 100) : 0;

      series.push({ query, points, delta, deltaPercent });
    }

    return series;
  }

  // ══════════════════════════════════════════════════════════════════
  // Platform Goal — Pre-configured Target Role Queries
  // ══════════════════════════════════════════════════════════════════

  /**
   * Target roles from src/constants/goal.ts.
   * These are the job titles this platform is optimized for.
   */
  static readonly TARGET_QUERIES = [
    "AI Engineer",
    "ML Engineer",
    "LLM Engineer",
    "GenAI Engineer",
    "Machine Learning Engineer",
    "React Engineer",
    "Frontend Engineer",
    "Full-Stack Engineer React",
  ] as const;

  /**
   * Count remote jobs for all target roles at once.
   * Returns a map of query → count.
   *
   * @example
   *   const counts = await client.countAllTargetRoles();
   *   // { "AI Engineer": 1205, "ML Engineer": 892, ... }
   */
  async countAllTargetRoles(
    options: { geoId?: string; timeRange?: TimeRange } = {},
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const query of VoyagerClient.TARGET_QUERIES) {
      const result = await this.countRemoteJobs(query, options);
      results[query] = result.total;
    }

    return results;
  }

  /**
   * Full dashboard snapshot — all target roles × all time ranges.
   * ~32 API calls (8 roles × 4 time ranges). Takes ~15s with rate limiting.
   */
  async getDashboardSnapshot(
    options: { geoId?: string } = {},
  ): Promise<{
    timestamp: string;
    geoId: string;
    roles: Record<string, { past24h: number; pastWeek: number; pastMonth: number; anyTime: number }>;
    totals: { past24h: number; pastWeek: number; pastMonth: number; anyTime: number };
  }> {
    const geoId = options.geoId ?? GEO_IDS.WORLDWIDE;
    const roles: Record<string, { past24h: number; pastWeek: number; pastMonth: number; anyTime: number }> = {};
    const totals = { past24h: 0, pastWeek: 0, pastMonth: 0, anyTime: 0 };

    for (const query of VoyagerClient.TARGET_QUERIES) {
      const [day, week, month, all] = await Promise.all([
        this.countRemoteJobs(query, { timeRange: TIME_RANGES.PAST_24H, geoId }),
        this.countRemoteJobs(query, { timeRange: TIME_RANGES.PAST_WEEK, geoId }),
        this.countRemoteJobs(query, { timeRange: TIME_RANGES.PAST_MONTH, geoId }),
        this.countRemoteJobs(query, { timeRange: TIME_RANGES.ANY_TIME, geoId }),
      ]);

      roles[query] = {
        past24h: day.total,
        pastWeek: week.total,
        pastMonth: month.total,
        anyTime: all.total,
      };

      totals.past24h += day.total;
      totals.pastWeek += week.total;
      totals.pastMonth += month.total;
      totals.anyTime += all.total;
    }

    return { timestamp: new Date().toISOString(), geoId, roles, totals };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Section 11: Convenience Exports
// ═══════════════════════════════════════════════════════════════════════

/** Create a VoyagerClient for Chrome Extension context. */
export function createExtensionClient(config?: Partial<VoyagerClientConfig>): VoyagerClient {
  return new VoyagerClient({ authMode: "chrome-extension", ...config });
}

/** Create a VoyagerClient for server-side context. */
export function createServerClient(
  csrfToken: string,
  cookies: { li_at: string; JSESSIONID: string },
  config?: Partial<VoyagerClientConfig>,
): VoyagerClient {
  return new VoyagerClient({
    authMode: "manual",
    csrfToken,
    cookies,
    includeFingerprint: true,
    ...config,
  });
}
