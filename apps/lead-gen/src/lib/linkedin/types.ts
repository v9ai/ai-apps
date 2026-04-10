/**
 * Type definitions for the LinkedIn Voyager API client.
 *
 * These types model the Voyager v2 REST API responses, mapped to
 * TypeScript for consumption by the lead-gen pipeline. Field names
 * follow the Voyager wire format (camelCase with URN references)
 * but are normalized to plain types at the boundary.
 */

// ── Session & Auth ─────────────────────────────────────────────────────────

/** A single LinkedIn session credential pair. */
export interface VoyagerSession {
  /** li_at cookie value (primary auth) */
  liAt: string;
  /** JSESSIONID cookie value (CSRF token) */
  jsessionId: string;
  /** Optional human label for logging/rotation tracking */
  label?: string;
}

/** Session rotation strategy for multi-account usage. */
export interface SessionRotationConfig {
  sessions: VoyagerSession[];
  /** Rotate after N requests per session (default: 80) */
  requestsPerRotation?: number;
  /** Cool-down period in ms after rotation (default: 30_000) */
  cooldownMs?: number;
}

export type VoyagerSessionConfig = VoyagerSession | SessionRotationConfig;

/** Discriminator: is this a rotation config or single session? */
export function isRotationConfig(
  config: VoyagerSessionConfig,
): config is SessionRotationConfig {
  return "sessions" in config && Array.isArray(config.sessions);
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

/** Per-endpoint rate limit budget. */
export interface EndpointBudget {
  /** Max requests in the window */
  maxRequests: number;
  /** Window size in ms */
  windowMs: number;
  /** Current request count within the window */
  currentCount: number;
  /** Window start timestamp */
  windowStart: number;
}

/** Map of endpoint pattern to its budget. */
export type RateLimitBudgets = Record<string, EndpointBudget>;

// ── Cache ──────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

export interface CacheConfig {
  /** Default TTL in ms (default: 300_000 = 5 min) */
  defaultTtlMs?: number;
  /** Max cache entries before LRU eviction (default: 2000) */
  maxEntries?: number;
  /** Per-method TTL overrides */
  ttlOverrides?: Partial<Record<string, number>>;
}

// ── Error Taxonomy ─────────────────────────────────────────────────────────

export type VoyagerErrorCode =
  | "AUTH_EXPIRED"
  | "AUTH_INVALID"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "TIMEOUT"
  | "SESSION_ROTATED_EXHAUSTED";

export class VoyagerError extends Error {
  readonly code: VoyagerErrorCode;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly endpoint?: string;

  constructor(
    code: VoyagerErrorCode,
    message: string,
    opts?: {
      statusCode?: number;
      retryable?: boolean;
      retryAfterMs?: number;
      endpoint?: string;
      cause?: Error;
    },
  ) {
    super(message, { cause: opts?.cause });
    this.name = "VoyagerError";
    this.code = code;
    this.statusCode = opts?.statusCode;
    this.retryable = opts?.retryable ?? false;
    this.retryAfterMs = opts?.retryAfterMs;
    this.endpoint = opts?.endpoint;
  }
}

// ── Event System ───────────────────────────────────────────────────────────

export type VoyagerEventType =
  | "request:start"
  | "request:success"
  | "request:error"
  | "request:retry"
  | "rate_limit:approaching"
  | "rate_limit:hit"
  | "session:rotated"
  | "session:exhausted"
  | "cache:hit"
  | "cache:miss"
  | "sync:progress"
  | "sync:complete"
  | "health:ok"
  | "health:degraded";

export interface VoyagerEvent {
  type: VoyagerEventType;
  timestamp: number;
  endpoint?: string;
  sessionLabel?: string;
  metadata?: Record<string, unknown>;
}

export type VoyagerEventListener = (event: VoyagerEvent) => void;

// ── Job Search ─────────────────────────────────────────────────────────────

export type VoyagerJobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "temporary"
  | "internship"
  | "volunteer"
  | "other";

export type VoyagerExperienceLevel =
  | "internship"
  | "entry_level"
  | "associate"
  | "mid_senior"
  | "director"
  | "executive";

export type VoyagerDatePosted =
  | "past_24h"
  | "past_week"
  | "past_month"
  | "any";

export type VoyagerRemoteFilter =
  | "on_site"
  | "remote"
  | "hybrid";

export type VoyagerSortBy =
  | "most_relevant"
  | "most_recent";

/** Parameters for voyager job search (maps to /voyagerJobsDashJobCards). */
export interface VoyagerJobSearchParams {
  /** Keyword query (e.g. "AI engineer") */
  keywords: string;
  /** Location text (e.g. "London, UK") or geoId */
  location?: string;
  /** LinkedIn geoId for precise location filtering */
  geoId?: string;
  /** Remote/on-site/hybrid filter */
  workplaceType?: VoyagerRemoteFilter | VoyagerRemoteFilter[];
  /** Job type filter(s) */
  jobType?: VoyagerJobType | VoyagerJobType[];
  /** Experience level filter(s) */
  experienceLevel?: VoyagerExperienceLevel | VoyagerExperienceLevel[];
  /** Date posted filter */
  datePosted?: VoyagerDatePosted;
  /** Company URN filter (e.g. "urn:li:fsd_company:12345") */
  companyUrn?: string | string[];
  /** Sort order */
  sortBy?: VoyagerSortBy;
  /** Number of results per page (max 25) */
  count?: number;
  /** Starting offset for pagination */
  start?: number;
}

// ── Voyager Response Types ─────────────────────────────────────────────────

/** Minimal job card from search results. */
export interface VoyagerJobCard {
  /** LinkedIn job URN (e.g. "urn:li:fsd_jobPosting:1234567890") */
  jobUrn: string;
  /** Extracted numeric job ID */
  jobId: string;
  /** Job title */
  title: string;
  /** Company name */
  companyName: string;
  /** Company URN */
  companyUrn?: string;
  /** Company logo URL */
  companyLogoUrl?: string;
  /** Location text */
  location?: string;
  /** Workplace type (remote/hybrid/on-site) */
  workplaceType?: string;
  /** Listed time (e.g. "2 days ago") or ISO date */
  listedAt?: string;
  /** Listed timestamp in ms (from repostedAt or listedAt field) */
  listedAtMs?: number;
  /** Easy apply available */
  easyApply?: boolean;
  /** Salary text if visible in card */
  salary?: string;
}

/** Full job posting details. */
export interface VoyagerJobDetails {
  jobId: string;
  jobUrn: string;
  title: string;
  description: string;
  companyName: string;
  companyUrn?: string;
  companyLogoUrl?: string;
  location?: string;
  workplaceType?: string;

  /** Employment type (full-time, contract, etc.) */
  employmentType?: string;
  /** Experience level */
  experienceLevel?: string;
  /** Industry tags */
  industries?: string[];

  /** Salary range if disclosed */
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
    text?: string;
  };

  /** Skill tags extracted by LinkedIn */
  skills?: string[];

  /** Number of applicants */
  applicantCount?: number;
  /** Posted timestamp in ms */
  listedAtMs?: number;
  /** Expiry timestamp in ms */
  expireAtMs?: number;
  /** Job poster info if available */
  poster?: VoyagerJobPoster;

  /** Apply URL (external or LinkedIn easy-apply) */
  applyUrl?: string;
  /** Whether LinkedIn Easy Apply is available */
  easyApply?: boolean;

  /** Raw Voyager included entities for downstream processing */
  rawIncluded?: unknown[];
}

/** Hiring manager / recruiter info for a job posting. */
export interface VoyagerJobPoster {
  /** Member URN */
  memberUrn?: string;
  /** Full name */
  name: string;
  /** Headline / title */
  headline?: string;
  /** Profile photo URL */
  photoUrl?: string;
  /** LinkedIn profile URL */
  profileUrl?: string;
}

/** Search result page metadata. */
export interface VoyagerSearchMeta {
  /** Total results available (may be approximate) */
  totalResults: number;
  /** Current offset */
  start: number;
  /** Page size */
  count: number;
  /** Pagination metadata (paging URN, etc.) */
  pagingToken?: string;
}

/** A page of job search results. */
export interface VoyagerJobSearchPage {
  jobs: VoyagerJobCard[];
  meta: VoyagerSearchMeta;
}

// ── Trend / Analytics Types ────────────────────────────────────────────────

/** A single data point in a time series. */
export interface TrendDataPoint {
  date: string;
  count: number;
}

/** Time-series trend for a query. */
export interface QueryTrend {
  query: string;
  dataPoints: TrendDataPoint[];
  totalCount: number;
  avgDailyCount: number;
}

// ── Sync Types ─────────────────────────────────────────────────────────────

/** Progress of an incremental sync operation. */
export interface SyncProgress {
  /** Total new jobs discovered */
  discovered: number;
  /** Jobs with full details fetched */
  detailed: number;
  /** Jobs already in DB (skipped) */
  skipped: number;
  /** Errors encountered */
  errors: number;
  /** Current query being processed */
  currentQuery?: string;
  /** Whether sync is still in progress */
  inProgress: boolean;
}

// ── Client Config ──────────────────────────────────────────────────────────

export interface VoyagerClientConfig {
  /** Session credential(s) */
  session: VoyagerSessionConfig;

  /** Response cache configuration */
  cache?: CacheConfig;

  /** Per-endpoint rate limit budgets (merged with defaults) */
  rateLimits?: Partial<RateLimitBudgets>;

  /** Max retries for transient failures (default: 3) */
  maxRetries?: number;

  /** Base delay for exponential backoff in ms (default: 1000) */
  baseRetryDelayMs?: number;

  /** Request timeout in ms (default: 30_000) */
  timeoutMs?: number;

  /** User-Agent override (default: realistic browser UA) */
  userAgent?: string;

  /** Queries to use for incremental sync (default: AI/ML focused) */
  syncQueries?: string[];

  /** Proxy URL for requests (optional) */
  proxyUrl?: string;
}

// ── Health Check ───────────────────────────────────────────────────────────

export interface VoyagerHealthStatus {
  /** Whether the session is alive and can make requests */
  alive: boolean;
  /** Whether rate limits are close to being hit */
  rateLimitHealthy: boolean;
  /** Remaining budget across endpoints */
  remainingBudget: Record<string, { remaining: number; total: number }>;
  /** Current session label (if rotation) */
  activeSession?: string;
  /** Number of sessions available (if rotation) */
  totalSessions?: number;
  /** Last successful request timestamp */
  lastSuccessAt?: number;
  /** Error if health check failed */
  error?: string;
}
