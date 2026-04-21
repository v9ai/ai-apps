/**
 * VoyagerClient — Production-grade LinkedIn Voyager API client.
 *
 * This is the primary interface the lead-gen codebase uses to interact with
 * LinkedIn's internal Voyager v2 REST API for job data. It provides:
 *
 * - Auto-paginating async generators for search results
 * - Built-in per-endpoint rate limiting with sliding windows
 * - Automatic retry with exponential backoff + jitter
 * - LRU response cache with configurable TTL
 * - Session rotation for multi-account usage
 * - Typed event emitter for progress reporting
 * - Comprehensive error taxonomy (auth/rate-limit/not-found/server-error)
 *
 * @example
 * ```ts
 * import { VoyagerClient } from "@/lib/linkedin/voyager-client";
 *
 * const client = new VoyagerClient({
 *   session: { liAt: process.env.LI_AT!, jsessionId: process.env.JSESSIONID! },
 * });
 *
 * // Stream all remote AI jobs
 * for await (const job of client.searchJobs({ keywords: "AI engineer", workplaceType: "remote" })) {
 *   console.log(job.title, job.companyName);
 * }
 *
 * // Get full details for a specific job
 * const details = await client.getJobDetails("3912345678");
 * ```
 */

import type {
  VoyagerClientConfig,
  VoyagerSessionConfig,
  VoyagerSession,
  VoyagerJobSearchParams,
  VoyagerJobCard,
  VoyagerJobSearchPage,
  VoyagerJobDetails,
  VoyagerJobPoster,
  VoyagerSearchMeta,
  VoyagerHealthStatus,
  VoyagerEvent,
  VoyagerEventType,
  VoyagerEventListener,
  VoyagerErrorCode,
  RateLimitBudgets,
  CacheConfig,
  CacheEntry,
  QueryTrend,
  TrendDataPoint,
  SyncProgress,
} from "./types";
import { VoyagerError, isRotationConfig } from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

const VOYAGER_BASE_URL = "https://www.linkedin.com/voyager/api";


const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Maximum results LinkedIn returns per page (hard limit). */
const MAX_PAGE_SIZE = 25;

/** Maximum pagination depth before LinkedIn starts returning empty/stale results. */
const MAX_PAGINATION_DEPTH = 1000;

/** Default sync queries focused on remote AI/ML roles. */
const DEFAULT_SYNC_QUERIES = [
  "AI engineer remote",
  "machine learning engineer remote",
  "ML engineer remote",
  "deep learning engineer remote",
  "NLP engineer remote",
  "computer vision engineer remote",
  "MLOps engineer remote",
  "AI infrastructure engineer remote",
];

/**
 * Default per-endpoint rate limit budgets.
 *
 * These are conservative estimates based on observed LinkedIn throttling
 * behavior. The Voyager API does not publish official limits.
 *
 * Endpoints:
 *   search   — job search queries (heaviest fingerprinting)
 *   details  — individual job detail fetches
 *   company  — company-scoped queries
 *   poster   — job poster / recruiter lookups
 *   generic  — fallback for unmatched endpoints
 */
const DEFAULT_RATE_LIMITS: RateLimitBudgets = {
  search: {
    maxRequests: 30,
    windowMs: 60_000,
    currentCount: 0,
    windowStart: 0,
  },
  details: {
    maxRequests: 60,
    windowMs: 60_000,
    currentCount: 0,
    windowStart: 0,
  },
  company: {
    maxRequests: 40,
    windowMs: 60_000,
    currentCount: 0,
    windowStart: 0,
  },
  poster: {
    maxRequests: 20,
    windowMs: 60_000,
    currentCount: 0,
    windowStart: 0,
  },
  generic: {
    maxRequests: 50,
    windowMs: 60_000,
    currentCount: 0,
    windowStart: 0,
  },
};

const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  defaultTtlMs: 5 * 60_000,
  maxEntries: 2000,
  ttlOverrides: {
    getJobDetails: 30 * 60_000,
    getJobPoster: 60 * 60_000,
    countRemoteJobs: 10 * 60_000,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract numeric job ID from URN like "urn:li:fsd_jobPosting:1234567890". */
function jobIdFromUrn(urn: string): string {
  const match = urn.match(/(\d+)$/);
  return match?.[1] ?? urn;
}

/** Extract numeric company ID from URN. */
function companyIdFromUrn(urn: string): string {
  const match = urn.match(/(\d+)$/);
  return match?.[1] ?? urn;
}

/** Jittered exponential backoff delay. */
function backoffDelay(attempt: number, baseMs: number): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = exponential * 0.5 * Math.random();
  return Math.min(exponential + jitter, 60_000);
}

/** Resolve workplaceType filter to Voyager f_WT parameter values. */
function workplaceTypeToParam(
  wt: VoyagerJobSearchParams["workplaceType"],
): string | undefined {
  if (!wt) return undefined;
  const map: Record<string, string> = {
    on_site: "1",
    remote: "2",
    hybrid: "3",
  };
  const arr = Array.isArray(wt) ? wt : [wt];
  return arr.map((v) => map[v]).filter(Boolean).join(",");
}

/** Resolve datePosted filter to Voyager f_TPR parameter. */
function datePostedToParam(
  dp: VoyagerJobSearchParams["datePosted"],
): string | undefined {
  if (!dp) return undefined;
  const map: Record<string, string> = {
    past_24h: "r86400",
    past_week: "r604800",
    past_month: "r2592000",
    any: "",
  };
  return map[dp] || undefined;
}

/** Resolve experience level to Voyager f_E parameter values. */
function experienceLevelToParam(
  el: VoyagerJobSearchParams["experienceLevel"],
): string | undefined {
  if (!el) return undefined;
  const map: Record<string, string> = {
    internship: "1",
    entry_level: "2",
    associate: "3",
    mid_senior: "4",
    director: "5",
    executive: "6",
  };
  const arr = Array.isArray(el) ? el : [el];
  return arr.map((v) => map[v]).filter(Boolean).join(",");
}

/** Resolve job type to Voyager f_JT parameter values. */
function jobTypeToParam(
  jt: VoyagerJobSearchParams["jobType"],
): string | undefined {
  if (!jt) return undefined;
  const map: Record<string, string> = {
    "full-time": "F",
    "part-time": "P",
    contract: "C",
    temporary: "T",
    internship: "I",
    volunteer: "V",
    other: "O",
  };
  const arr = Array.isArray(jt) ? jt : [jt];
  return arr.map((v) => map[v]).filter(Boolean).join(",");
}

/** Extract salary text from a Voyager job card entity. */
function extractSalaryText(entity: Record<string, unknown>): string | undefined {
  const insights = entity.salaryInsights as Record<string, unknown> | undefined;
  if (insights) {
    const breakdown = insights.compensationBreakdown as Array<Record<string, unknown>> | undefined;
    if (breakdown?.[0]?.description) {
      return breakdown[0].description as string;
    }
  }
  return (entity.formattedSalary as string) ?? undefined;
}

// ── LRU Cache ──────────────────────────────────────────────────────────────

class LRUCache {
  private map = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.map.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.map.size >= this.maxEntries) {
      const first = this.map.keys().next();
      if (!first.done) {
        this.map.delete(first.value);
      }
    }
    this.map.set(key, { data, cachedAt: Date.now(), ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  invalidate(pattern?: string): number {
    if (!pattern) {
      const size = this.map.size;
      this.map.clear();
      return size;
    }
    let count = 0;
    for (const key of this.map.keys()) {
      if (key.includes(pattern)) {
        this.map.delete(key);
        count++;
      }
    }
    return count;
  }

  get size(): number {
    return this.map.size;
  }
}

// ── Session Manager ────────────────────────────────────────────────────────

class SessionManager {
  private sessions: VoyagerSession[];
  private currentIndex = 0;
  private requestCounts: number[];
  private readonly requestsPerRotation: number;
  private readonly cooldownMs: number;
  private cooldownUntil = 0;

  constructor(config: VoyagerSessionConfig) {
    if (isRotationConfig(config)) {
      if (config.sessions.length === 0) {
        throw new VoyagerError("AUTH_INVALID", "No sessions provided in rotation config");
      }
      this.sessions = [...config.sessions];
      this.requestsPerRotation = config.requestsPerRotation ?? 80;
      this.cooldownMs = config.cooldownMs ?? 30_000;
    } else {
      this.sessions = [config];
      this.requestsPerRotation = Infinity;
      this.cooldownMs = 0;
    }
    this.requestCounts = new Array(this.sessions.length).fill(0);
  }

  /** Get the current active session. Throws if all sessions are exhausted. */
  get current(): VoyagerSession {
    return this.sessions[this.currentIndex];
  }

  get currentLabel(): string {
    return this.current.label ?? `session-${this.currentIndex}`;
  }

  get totalSessions(): number {
    return this.sessions.length;
  }

  /** Record a request and check if rotation is needed. Returns true if rotated. */
  recordRequest(): boolean {
    this.requestCounts[this.currentIndex]++;

    if (this.requestCounts[this.currentIndex] >= this.requestsPerRotation) {
      return this.rotate();
    }
    return false;
  }

  /** Force-rotate to the next session. Returns true if successful, false if exhausted. */
  rotate(): boolean {
    if (this.sessions.length <= 1) return false;

    const nextIndex = (this.currentIndex + 1) % this.sessions.length;

    // Check if we've cycled through all sessions
    if (this.requestCounts[nextIndex] >= this.requestsPerRotation) {
      // Find any session with remaining budget
      const available = this.requestCounts.findIndex(
        (count) => count < this.requestsPerRotation,
      );
      if (available === -1) {
        // All sessions exhausted — reset counts and apply cooldown
        this.requestCounts.fill(0);
        this.cooldownUntil = Date.now() + this.cooldownMs;
      }
    }

    this.currentIndex = (this.currentIndex + 1) % this.sessions.length;
    return true;
  }

  /** Check if we're in a cooldown period. Returns remaining ms, or 0. */
  get cooldownRemaining(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  /** Mark a session as invalid (auth failure). Removes it from rotation. */
  invalidateCurrentSession(): void {
    if (this.sessions.length <= 1) return;
    this.sessions.splice(this.currentIndex, 1);
    this.requestCounts.splice(this.currentIndex, 1);
    if (this.currentIndex >= this.sessions.length) {
      this.currentIndex = 0;
    }
  }
}

// ── VoyagerClient ──────────────────────────────────────────────────────────

export class VoyagerClient {
  private readonly sessionManager: SessionManager;
  private readonly cache: LRUCache;
  private readonly cacheConfig: Required<CacheConfig>;
  private readonly rateLimits: RateLimitBudgets;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;
  private readonly timeoutMs: number;
  private readonly userAgent: string;
  private readonly syncQueries: string[];
  private readonly proxyUrl?: string;

  private readonly listeners = new Map<VoyagerEventType, Set<VoyagerEventListener>>();
  private lastSuccessAt?: number;

  constructor(config: VoyagerClientConfig) {
    this.sessionManager = new SessionManager(config.session);

    // Cache
    this.cacheConfig = {
      defaultTtlMs: config.cache?.defaultTtlMs ?? DEFAULT_CACHE_CONFIG.defaultTtlMs,
      maxEntries: config.cache?.maxEntries ?? DEFAULT_CACHE_CONFIG.maxEntries,
      ttlOverrides: {
        ...DEFAULT_CACHE_CONFIG.ttlOverrides,
        ...config.cache?.ttlOverrides,
      },
    };
    this.cache = new LRUCache(this.cacheConfig.maxEntries);

    // Rate limits (merge with defaults)
    this.rateLimits = { ...DEFAULT_RATE_LIMITS };
    if (config.rateLimits) {
      for (const [key, override] of Object.entries(config.rateLimits)) {
        if (override) {
          this.rateLimits[key] = { ...this.rateLimits[key], ...override };
        }
      }
    }

    this.maxRetries = config.maxRetries ?? 3;
    this.baseRetryDelayMs = config.baseRetryDelayMs ?? 1_000;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.userAgent = config.userAgent ?? DEFAULT_USER_AGENT;
    this.syncQueries = config.syncQueries ?? DEFAULT_SYNC_QUERIES;
    this.proxyUrl = config.proxyUrl;
  }

  // ── Event Emitter ──────────────────────────────────────────────────────

  /** Subscribe to client events for progress reporting. */
  on(type: VoyagerEventType, listener: VoyagerEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  /** Subscribe to all events. */
  onAny(listener: VoyagerEventListener): () => void {
    const unsubs: Array<() => void> = [];
    const allTypes: VoyagerEventType[] = [
      "request:start", "request:success", "request:error", "request:retry",
      "rate_limit:approaching", "rate_limit:hit",
      "session:rotated", "session:exhausted",
      "cache:hit", "cache:miss",
      "sync:progress", "sync:complete",
      "health:ok", "health:degraded",
    ];
    for (const type of allTypes) {
      unsubs.push(this.on(type, listener));
    }
    return () => unsubs.forEach((unsub) => unsub());
  }

  private emit(event: VoyagerEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch {
          // Swallow listener errors to prevent disrupting the client
        }
      });
    }
  }

  // ── Rate Limiting ──────────────────────────────────────────────────────

  /**
   * Classify an endpoint path into a rate limit bucket.
   * Maps Voyager API paths to budget categories.
   */
  private classifyEndpoint(path: string): string {
    if (path.includes("jobCards") || path.includes("jobSearch")) return "search";
    if (path.includes("jobPosting") || path.includes("jobView")) return "details";
    if (path.includes("company") || path.includes("organization")) return "company";
    if (path.includes("hirer") || path.includes("poster")) return "poster";
    return "generic";
  }

  /**
   * Check and consume a rate limit token. If the bucket is exhausted,
   * returns the number of ms to wait; otherwise returns 0.
   */
  private consumeRateLimit(endpoint: string): number {
    const bucket = this.classifyEndpoint(endpoint);
    const budget = this.rateLimits[bucket] ?? this.rateLimits.generic;

    const now = Date.now();
    if (now - budget.windowStart >= budget.windowMs) {
      // Window expired — reset
      budget.currentCount = 0;
      budget.windowStart = now;
    }

    // Approaching limit warning (80% threshold)
    if (budget.currentCount >= budget.maxRequests * 0.8) {
      this.emit({
        type: "rate_limit:approaching",
        timestamp: now,
        endpoint,
        metadata: {
          bucket,
          current: budget.currentCount,
          max: budget.maxRequests,
          windowRemainingMs: budget.windowMs - (now - budget.windowStart),
        },
      });
    }

    if (budget.currentCount >= budget.maxRequests) {
      const waitMs = budget.windowMs - (now - budget.windowStart);
      this.emit({
        type: "rate_limit:hit",
        timestamp: now,
        endpoint,
        metadata: { bucket, waitMs },
      });
      return waitMs;
    }

    budget.currentCount++;
    return 0;
  }

  // ── HTTP Transport ─────────────────────────────────────────────────────

  /**
   * Build request headers for the Voyager API.
   * Mimics a real browser session using the li_at + JSESSIONID cookies.
   */
  private buildHeaders(): Record<string, string> {
    const session = this.sessionManager.current;
    return {
      "User-Agent": this.userAgent,
      "Accept": "application/vnd.linkedin.normalized+json+2.1",
      "Accept-Language": "en-US,en;q=0.9",
      "x-li-lang": "en_US",
      "x-li-track": JSON.stringify({
        clientVersion: "1.13.22",
        mpVersion: "1.13.22",
        osName: "web",
        timezoneOffset: 0,
        timezone: "Etc/UTC",
        deviceFormFactor: "DESKTOP",
        mpName: "voyager-web",
      }),
      "x-li-page-instance": `urn:li:page:d_flagship3_search_srp_jobs;${crypto.randomUUID()}`,
      "x-restli-protocol-version": "2.0.0",
      "csrf-token": session.jsessionId.replace(/"/g, ""),
      "Cookie": `li_at=${session.liAt}; JSESSIONID="${session.jsessionId}"`,
    };
  }

  /**
   * Execute a raw Voyager API request with rate limiting, retries, and caching.
   *
   * @typeParam T - Expected response body type
   * @param path - API path relative to VOYAGER_BASE_URL
   * @param opts - Additional fetch options and caching hints
   */
  private async request<T>(
    path: string,
    opts: {
      method?: string;
      params?: Record<string, string | number | undefined>;
      cacheKey?: string;
      cacheTtlMs?: number;
      skipCache?: boolean;
    } = {},
  ): Promise<T> {
    const { method = "GET", params, cacheKey, cacheTtlMs, skipCache = false } = opts;

    // Check cache first
    if (cacheKey && !skipCache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== undefined) {
        this.emit({ type: "cache:hit", timestamp: Date.now(), endpoint: path });
        return cached;
      }
      this.emit({ type: "cache:miss", timestamp: Date.now(), endpoint: path });
    }

    // Build URL with query params
    const url = new URL(`${VOYAGER_BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Wait for cooldown if sessions just rotated
    const cooldown = this.sessionManager.cooldownRemaining;
    if (cooldown > 0) {
      await new Promise((resolve) => setTimeout(resolve, cooldown));
    }

    // Retry loop
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Rate limit check
      const waitMs = this.consumeRateLimit(path);
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      this.emit({
        type: "request:start",
        timestamp: Date.now(),
        endpoint: path,
        sessionLabel: this.sessionManager.currentLabel,
        metadata: { attempt, method, url: url.toString() },
      });

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url.toString(), {
          method,
          headers: this.buildHeaders(),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Handle session rotation
        const didRotate = this.sessionManager.recordRequest();
        if (didRotate) {
          this.emit({
            type: "session:rotated",
            timestamp: Date.now(),
            sessionLabel: this.sessionManager.currentLabel,
          });
        }

        // Success path
        if (response.ok) {
          const data = (await response.json()) as T;
          this.lastSuccessAt = Date.now();

          this.emit({
            type: "request:success",
            timestamp: Date.now(),
            endpoint: path,
            metadata: { status: response.status, attempt },
          });

          // Cache the response
          if (cacheKey) {
            const ttl = cacheTtlMs ?? this.cacheConfig.defaultTtlMs;
            this.cache.set(cacheKey, data, ttl);
          }

          return data;
        }

        // Error classification
        const errorInfo = await this.classifyHttpError(response, path);
        lastError = errorInfo;

        // Auth errors: try invalidating session and rotating
        if (errorInfo.code === "AUTH_EXPIRED" || errorInfo.code === "AUTH_INVALID") {
          if (this.sessionManager.totalSessions > 1) {
            this.sessionManager.invalidateCurrentSession();
            this.emit({
              type: "session:rotated",
              timestamp: Date.now(),
              sessionLabel: this.sessionManager.currentLabel,
              metadata: { reason: "auth_failure" },
            });
            continue; // Retry with next session
          }
          throw errorInfo; // Single session — no recovery
        }

        // Rate limit errors
        if (errorInfo.code === "RATE_LIMITED") {
          const retryAfter = errorInfo.retryAfterMs ?? backoffDelay(attempt, this.baseRetryDelayMs);
          this.emit({
            type: "request:retry",
            timestamp: Date.now(),
            endpoint: path,
            metadata: { attempt, retryAfterMs: retryAfter, reason: "rate_limited" },
          });
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          continue;
        }

        // Non-retryable errors
        if (!errorInfo.retryable) {
          throw errorInfo;
        }

        // Retryable server errors
        if (attempt < this.maxRetries) {
          const delay = backoffDelay(attempt, this.baseRetryDelayMs);
          this.emit({
            type: "request:retry",
            timestamp: Date.now(),
            endpoint: path,
            metadata: { attempt, retryAfterMs: delay, reason: "server_error" },
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (err) {
        if (err instanceof VoyagerError) throw err;

        const isAbort = err instanceof DOMException && err.name === "AbortError";
        const isNetwork = err instanceof TypeError; // fetch network errors

        const code: VoyagerErrorCode = isAbort ? "TIMEOUT" : "NETWORK_ERROR";
        const retryable = attempt < this.maxRetries;

        lastError = new VoyagerError(code, isAbort ? "Request timed out" : String(err), {
          retryable,
          endpoint: path,
          cause: err instanceof Error ? err : undefined,
        });

        this.emit({
          type: "request:error",
          timestamp: Date.now(),
          endpoint: path,
          metadata: { attempt, code, message: lastError.message },
        });

        if (retryable && (isAbort || isNetwork)) {
          const delay = backoffDelay(attempt, this.baseRetryDelayMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError ?? new VoyagerError("SERVER_ERROR", "Max retries exhausted", { endpoint: path });
  }

  /**
   * Classify an HTTP error response into our error taxonomy.
   */
  private async classifyHttpError(response: Response, endpoint: string): Promise<VoyagerError> {
    const status = response.status;
    let body: string;
    try {
      body = await response.text();
    } catch {
      body = "";
    }

    if (status === 401) {
      return new VoyagerError("AUTH_EXPIRED", `Session expired (401): ${body.slice(0, 200)}`, {
        statusCode: status,
        retryable: false,
        endpoint,
      });
    }

    if (status === 403) {
      // LinkedIn returns 403 for both auth issues and forbidden resources
      const isAuth = body.includes("CSRF") || body.includes("login") || body.includes("session");
      return new VoyagerError(
        isAuth ? "AUTH_INVALID" : "FORBIDDEN",
        `Forbidden (403): ${body.slice(0, 200)}`,
        { statusCode: status, retryable: false, endpoint },
      );
    }

    if (status === 404) {
      return new VoyagerError("NOT_FOUND", `Resource not found (404): ${endpoint}`, {
        statusCode: status,
        retryable: false,
        endpoint,
      });
    }

    if (status === 429) {
      // Parse Retry-After header if present
      const retryAfter = response.headers.get("retry-after");
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
      return new VoyagerError("RATE_LIMITED", `Rate limited (429). Retry after ${retryAfterMs}ms`, {
        statusCode: status,
        retryable: true,
        retryAfterMs,
        endpoint,
      });
    }

    if (status >= 500) {
      return new VoyagerError("SERVER_ERROR", `LinkedIn server error (${status}): ${body.slice(0, 200)}`, {
        statusCode: status,
        retryable: true,
        endpoint,
      });
    }

    return new VoyagerError("SERVER_ERROR", `Unexpected status ${status}: ${body.slice(0, 200)}`, {
      statusCode: status,
      retryable: status >= 500,
      endpoint,
    });
  }

  // ── Response Parsers ───────────────────────────────────────────────────

  /**
   * Parse a Voyager job search response into typed job cards.
   *
   * Voyager returns a normalized JSON format with `data`, `included`, and
   * `paging` sections. Job cards are in the `included` array with
   * `$type: "com.linkedin.voyager.dash.jobs.JobCard"` or similar.
   */
  private parseJobSearchResponse(raw: Record<string, unknown>): VoyagerJobSearchPage {
    const included = (raw.included ?? []) as Array<Record<string, unknown>>;
    const rawData = (raw.data ?? {}) as Record<string, unknown>;
    const paging = (raw.paging ?? rawData.paging ?? {}) as Record<string, unknown>;
    const metadata = (raw.metadata ?? rawData.metadata ?? {}) as Record<string, unknown>;

    const jobs: VoyagerJobCard[] = [];

    // Extract job postings from the included entities
    for (const entity of included) {
      const type = entity["$type"] as string | undefined;

      // Match job posting entities
      if (
        type?.includes("JobPosting") ||
        type?.includes("jobPosting") ||
        entity["entityUrn"]?.toString().includes("jobPosting")
      ) {
        const entityUrn = (entity.entityUrn ?? entity["*entityUrn"] ?? "") as string;
        if (!entityUrn.includes("jobPosting")) continue;

        const jobId = jobIdFromUrn(entityUrn);

        // Resolve company info from included entities
        const companyRef = entity["companyDetails"] as Record<string, unknown> | undefined;
        const companyUrn = (
          companyRef?.["*company"] ??
          companyRef?.["company"] ??
          entity["*companyDetails"] ??
          ""
        ) as string;

        const companyEntity = companyUrn
          ? included.find((e) => e.entityUrn === companyUrn || e["*entityUrn"] === companyUrn)
          : undefined;

        const workplaceType = entity["workplaceType"] ?? entity["formattedWorkplaceType"];
        const listedAt = entity["listedAt"] as number | undefined;
        const repostedAt = entity["repostedAt"] as number | undefined;

        jobs.push({
          jobUrn: entityUrn,
          jobId,
          title: (entity.title ?? entity.jobTitle ?? "") as string,
          companyName: (companyEntity?.name ?? companyEntity?.universalName ?? entity.companyName ?? "") as string,
          companyUrn: companyUrn || undefined,
          companyLogoUrl: resolveImageUrl(companyEntity?.logo ?? companyEntity?.logoResolutionResult),
          location: (entity.formattedLocation ?? entity.location ?? "") as string,
          workplaceType: workplaceType as string | undefined,
          listedAt: listedAt ? new Date(listedAt).toISOString() : undefined,
          listedAtMs: repostedAt ?? listedAt,
          easyApply: entity.applyMethod
            ? ((entity.applyMethod as Record<string, unknown>)["$type"]?.toString().includes("EasyApply") || false)
            : undefined,
          salary: extractSalaryText(entity),
        });
      }
    }

    // De-duplicate by jobId (Voyager sometimes returns duplicates across entities)
    const seen = new Set<string>();
    const dedupedJobs = jobs.filter((j) => {
      if (seen.has(j.jobId)) return false;
      seen.add(j.jobId);
      return true;
    });

    const totalResults = (
      metadata.totalResultCount ??
      paging.total ??
      metadata.jobCardPrefetchCount ??
      0
    ) as number;

    const meta: VoyagerSearchMeta = {
      totalResults,
      start: (paging.start ?? 0) as number,
      count: (paging.count ?? dedupedJobs.length) as number,
    };

    return { jobs: dedupedJobs, meta };
  }

  /**
   * Parse a Voyager job detail response into a typed job details object.
   */
  private parseJobDetailsResponse(raw: Record<string, unknown>): VoyagerJobDetails {
    const data = (raw.data ?? raw) as Record<string, unknown>;
    const included = (raw.included ?? []) as Array<Record<string, unknown>>;

    const entityUrn = (data.entityUrn ?? data["*entityUrn"] ?? "") as string;
    const jobId = jobIdFromUrn(entityUrn);

    // Find the primary job posting entity
    const jobEntity =
      included.find(
        (e) =>
          e.entityUrn?.toString().includes("jobPosting") &&
          e.entityUrn?.toString().includes(jobId),
      ) ?? data;

    // Find company entity
    const companyRef = (jobEntity["companyDetails"] ?? jobEntity["*companyDetails"]) as
      | Record<string, unknown>
      | string
      | undefined;
    const companyUrn =
      typeof companyRef === "string"
        ? companyRef
        : (companyRef?.["*company"] ?? companyRef?.["company"] ?? "") as string;

    const companyEntity = companyUrn
      ? included.find(
          (e) => e.entityUrn === companyUrn || e["*entityUrn"] === companyUrn,
        )
      : undefined;

    // Extract description (can be in various formats)
    const descriptionObj = jobEntity.description as Record<string, unknown> | string | undefined;
    const description =
      typeof descriptionObj === "string"
        ? descriptionObj
        : (descriptionObj?.text ?? descriptionObj?.rawText ?? "") as string;

    // Extract skills from included entities
    const skills: string[] = [];
    for (const entity of included) {
      const type = entity["$type"] as string | undefined;
      if (type?.includes("Skill") || type?.includes("skill")) {
        const skillName = (entity.name ?? entity.localizedName ?? entity.skill) as string | undefined;
        if (skillName) skills.push(skillName);
      }
    }

    // Extract salary
    const salaryInsights = jobEntity.salaryInsights as Record<string, unknown> | undefined;
    const compensationBreakdown = (salaryInsights?.compensationBreakdown as Array<Record<string, unknown>>)?.[0];

    let salary: VoyagerJobDetails["salary"] = undefined;
    if (compensationBreakdown) {
      salary = {
        min: compensationBreakdown.min as number | undefined,
        max: compensationBreakdown.max as number | undefined,
        currency: compensationBreakdown.currencyCode as string | undefined,
        period: compensationBreakdown.period as string | undefined,
        text: compensationBreakdown.description as string | undefined,
      };
    }

    // Extract poster
    const hirerEntity = included.find(
      (e) =>
        (e["$type"] as string | undefined)?.includes("Hirer") ||
        (e["$type"] as string | undefined)?.includes("JobPoster"),
    );
    let poster: VoyagerJobPoster | undefined;
    if (hirerEntity) {
      poster = this.parseJobPosterEntity(hirerEntity, included);
    }

    return {
      jobId,
      jobUrn: entityUrn,
      title: (jobEntity.title ?? jobEntity.jobTitle ?? "") as string,
      description,
      companyName: (companyEntity?.name ?? companyEntity?.universalName ?? "") as string,
      companyUrn: companyUrn || undefined,
      companyLogoUrl: resolveImageUrl(companyEntity?.logo ?? companyEntity?.logoResolutionResult),
      location: (jobEntity.formattedLocation ?? jobEntity.location ?? "") as string,
      workplaceType: (jobEntity.workplaceType ?? jobEntity.formattedWorkplaceType) as string | undefined,
      employmentType: (jobEntity.employmentType ?? jobEntity.formattedEmploymentStatus) as string | undefined,
      experienceLevel: (jobEntity.experienceLevel ?? jobEntity.formattedExperienceLevel) as string | undefined,
      industries: (jobEntity.formattedIndustries ?? jobEntity.industries) as string[] | undefined,
      salary,
      skills: skills.length > 0 ? skills : undefined,
      applicantCount: (jobEntity.applies ?? jobEntity.applicantCount) as number | undefined,
      listedAtMs: (jobEntity.listedAt ?? jobEntity.repostedAt) as number | undefined,
      expireAtMs: jobEntity.expireAt as number | undefined,
      poster,
      applyUrl: (jobEntity.applyUrl ?? jobEntity.externalApplyUrl) as string | undefined,
      easyApply: jobEntity.applyMethod
        ? (jobEntity.applyMethod as Record<string, unknown>)["$type"]?.toString().includes("EasyApply") ?? false
        : undefined,
      rawIncluded: included,
    };
  }

  /**
   * Parse a job poster / hirer entity from included data.
   */
  private parseJobPosterEntity(
    hirerEntity: Record<string, unknown>,
    included: Array<Record<string, unknown>>,
  ): VoyagerJobPoster {
    // Hirer entity often references a miniProfile
    const profileRef = (hirerEntity["*hirerMember"] ??
      hirerEntity["*profile"] ??
      hirerEntity.hirerMember) as string | undefined;

    const profileEntity = profileRef
      ? included.find((e) => e.entityUrn === profileRef)
      : undefined;

    const nameSource = profileEntity ?? hirerEntity;
    const firstName = (nameSource.firstName ?? "") as string;
    const lastName = (nameSource.lastName ?? "") as string;
    const name = `${firstName} ${lastName}`.trim() || ((nameSource.name as string) ?? "");

    return {
      memberUrn: (profileEntity?.entityUrn ?? hirerEntity.entityUrn) as string | undefined,
      name,
      headline: (nameSource.headline ?? nameSource.occupation) as string | undefined,
      photoUrl: resolveImageUrl(nameSource.picture ?? nameSource.profilePicture),
      profileUrl: nameSource.publicIdentifier
        ? `https://www.linkedin.com/in/${nameSource.publicIdentifier}`
        : undefined,
    };
  }

  // ── Public API: Job Search ─────────────────────────────────────────────

  /**
   * Search for jobs with auto-pagination. Returns an async generator that
   * yields one VoyagerJobCard at a time, transparently fetching subsequent
   * pages as needed.
   *
   * @param query - Search parameters (keywords, location, filters, etc.)
   * @yields VoyagerJobCard for each matching job
   *
   * @example
   * ```ts
   * const jobs: VoyagerJobCard[] = [];
   * for await (const job of client.searchJobs({ keywords: "ML engineer", workplaceType: "remote" })) {
   *   jobs.push(job);
   *   if (jobs.length >= 100) break; // Early exit supported
   * }
   * ```
   */
  async *searchJobs(query: VoyagerJobSearchParams): AsyncGenerator<VoyagerJobCard, void, undefined> {
    const pageSize = Math.min(query.count ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);
    let start = query.start ?? 0;

    while (start < MAX_PAGINATION_DEPTH) {
      const page = await this.fetchJobSearchPage(query, start, pageSize);

      for (const job of page.jobs) {
        yield job;
      }

      // Stop conditions
      if (page.jobs.length === 0) break;
      if (start + pageSize >= page.meta.totalResults) break;
      if (page.jobs.length < pageSize) break;

      start += pageSize;

      // Small delay between pages to be respectful
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));
    }
  }

  /**
   * Fetch a single page of job search results (non-paginating).
   * Prefer `searchJobs()` for most use cases.
   */
  async fetchJobSearchPage(
    query: VoyagerJobSearchParams,
    start: number,
    count: number,
  ): Promise<VoyagerJobSearchPage> {
    const params: Record<string, string | number | undefined> = {
      decorationId: "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",
      q: "jsearch",
      query: `search`,
      keywords: query.keywords,
      locationUnion: query.geoId
        ? `(geoId:${query.geoId})`
        : query.location
          ? `(geoId:${query.location})`
          : undefined,
      origin: "JOB_SEARCH_PAGE_JOB_FILTER",
      start,
      count: Math.min(count, MAX_PAGE_SIZE),
    };

    // Apply filters
    const wt = workplaceTypeToParam(query.workplaceType);
    if (wt) params["f_WT"] = wt;

    const dp = datePostedToParam(query.datePosted);
    if (dp) params["f_TPR"] = dp;

    const el = experienceLevelToParam(query.experienceLevel);
    if (el) params["f_E"] = el;

    const jt = jobTypeToParam(query.jobType);
    if (jt) params["f_JT"] = jt;

    if (query.companyUrn) {
      const urns = Array.isArray(query.companyUrn) ? query.companyUrn : [query.companyUrn];
      params["f_C"] = urns.map(companyIdFromUrn).join(",");
    }

    if (query.sortBy === "most_recent") {
      params["sortBy"] = "DD";
    }

    const cacheKey = `search:${JSON.stringify({ ...query, start, count })}`;

    const raw = await this.request<Record<string, unknown>>(
      "/voyagerJobsDashJobCards",
      { params, cacheKey, cacheTtlMs: this.getTtl("searchJobs") },
    );

    return this.parseJobSearchResponse(raw);
  }

  // ── Public API: Job Details ────────────────────────────────────────────

  /**
   * Fetch full details for a specific job posting, including description,
   * skills, salary, and poster information.
   *
   * @param jobId - Numeric job ID (e.g. "3912345678")
   * @returns Full job details or throws VoyagerError with code NOT_FOUND
   */
  async getJobDetails(jobId: string): Promise<VoyagerJobDetails> {
    const cacheKey = `details:${jobId}`;
    const cached = this.cache.get<VoyagerJobDetails>(cacheKey);
    if (cached) {
      this.emit({ type: "cache:hit", timestamp: Date.now(), endpoint: `jobDetails/${jobId}` });
      return cached;
    }

    const raw = await this.request<Record<string, unknown>>(
      `/jobs/jobPostings/${jobId}`,
      {
        params: {
          decorationId: "com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65",
          topN: "1",
          topNRequestedFlavors: "List(TOP_APPLICANT,IN_NETWORK,COMPANY_RECRUIT,SCHOOL_RECRUIT,HIDDEN_GEM,ACTIVELY_HIRING_COMPANY)",
        },
        cacheKey,
        cacheTtlMs: this.getTtl("getJobDetails"),
      },
    );

    return this.parseJobDetailsResponse(raw);
  }

  // ── Public API: Company Jobs ───────────────────────────────────────────

  /**
   * Fetch all jobs for a specific company. Auto-paginates through all
   * available results.
   *
   * @param companyId - Numeric company ID or company URN
   * @returns Array of all job cards for the company
   */
  async getCompanyJobs(companyId: string): Promise<VoyagerJobCard[]> {
    const numericId = companyIdFromUrn(companyId);
    const companyUrn = `urn:li:fsd_company:${numericId}`;

    const jobs: VoyagerJobCard[] = [];
    for await (const job of this.searchJobs({
      keywords: "",
      companyUrn,
    })) {
      jobs.push(job);
    }
    return jobs;
  }

  // ── Public API: Remote Job Counts ──────────────────────────────────────

  /**
   * Get the total count of remote jobs matching a search query.
   * Uses a minimal page-size request to read the total from metadata.
   *
   * @param query - Keyword query (e.g. "AI engineer")
   * @returns Total remote job count
   */
  async countRemoteJobs(query: string): Promise<number> {
    const cacheKey = `count:remote:${query}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    const page = await this.fetchJobSearchPage(
      { keywords: query, workplaceType: "remote" },
      0,
      1, // Minimal page to get metadata
    );

    const count = page.meta.totalResults;
    this.cache.set(cacheKey, count, this.getTtl("countRemoteJobs"));
    return count;
  }

  /**
   * Count remote jobs for a specific company.
   *
   * @param companyUrn - Company URN (e.g. "urn:li:fsd_company:12345")
   * @returns Number of remote jobs posted by the company
   */
  async countRemoteJobsByCompany(companyUrn: string): Promise<number> {
    const cacheKey = `count:remote:company:${companyUrn}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    const page = await this.fetchJobSearchPage(
      { keywords: "", companyUrn, workplaceType: "remote" },
      0,
      1,
    );

    const count = page.meta.totalResults;
    this.cache.set(cacheKey, count, this.getTtl("countRemoteJobsByCompany"));
    return count;
  }

  // ── Public API: Job Poster ─────────────────────────────────────────────

  /**
   * Get hiring manager / recruiter info for a job posting.
   * Fetches full job details and extracts the poster entity.
   *
   * @param jobId - Numeric job ID
   * @returns Poster info or null if not disclosed
   */
  async getJobPoster(jobId: string): Promise<VoyagerJobPoster | null> {
    const cacheKey = `poster:${jobId}`;
    const cached = this.cache.get<VoyagerJobPoster | null>(cacheKey);
    if (cached !== undefined) return cached;

    // The poster info is embedded in the full job details response
    const details = await this.getJobDetails(jobId);
    const poster = details.poster ?? null;

    this.cache.set(cacheKey, poster, this.getTtl("getJobPoster"));
    return poster;
  }

  // ── Public API: Remote Job Trends ──────────────────────────────────────

  /**
   * Build time-series trend data for remote job queries over a date range.
   *
   * Samples daily remote job counts for each query by progressively
   * filtering by datePosted. Note: LinkedIn's date filters are coarse
   * (24h/week/month), so the resolution is approximate.
   *
   * @param queries - Array of search queries to track
   * @param days - Number of days to look back (1, 7, or 30)
   * @returns Array of QueryTrend objects with daily data points
   *
   * @example
   * ```ts
   * const trends = await client.getRemoteJobTrends(
   *   ["AI engineer", "ML engineer", "NLP engineer"],
   *   30,
   * );
   * for (const trend of trends) {
   *   console.log(`${trend.query}: ${trend.totalCount} total, ${trend.avgDailyCount}/day avg`);
   * }
   * ```
   */
  async getRemoteJobTrends(queries: string[], days: number): Promise<QueryTrend[]> {
    const trends: QueryTrend[] = [];

    // Map days to the datePosted filter buckets
    const buckets: Array<{ label: string; filter: VoyagerJobSearchParams["datePosted"]; days: number }> = [
      { label: "past_24h", filter: "past_24h", days: 1 },
      { label: "past_week", filter: "past_week", days: 7 },
      { label: "past_month", filter: "past_month", days: 30 },
    ];

    // Select applicable buckets up to the requested range
    const applicableBuckets = buckets.filter((b) => b.days <= days);
    if (applicableBuckets.length === 0) {
      applicableBuckets.push(buckets[0]); // At minimum, check past 24h
    }

    for (const query of queries) {
      const dataPoints: TrendDataPoint[] = [];
      let prevCount = 0;

      for (const bucket of applicableBuckets) {
        // For trend calculation, we need counts per bucket
        const page = await this.fetchJobSearchPage(
          { keywords: query, workplaceType: "remote", datePosted: bucket.filter },
          0,
          1,
        );

        const bucketCount = page.meta.totalResults;
        const incrementalCount = bucketCount - prevCount;

        // Distribute count across days in the bucket for approximate daily data
        const bucketDays = bucket.days - (prevCount > 0 ? applicableBuckets[applicableBuckets.indexOf(bucket) - 1]?.days ?? 0 : 0);
        const dailyAvg = bucketDays > 0 ? incrementalCount / bucketDays : incrementalCount;

        const today = new Date();
        for (let d = 0; d < bucketDays; d++) {
          const date = new Date(today);
          date.setDate(date.getDate() - (bucket.days - d));
          dataPoints.push({
            date: date.toISOString().split("T")[0],
            count: Math.round(dailyAvg),
          });
        }

        prevCount = bucketCount;

        // Rate limit courtesy delay between trend queries
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Sort by date ascending
      dataPoints.sort((a, b) => a.date.localeCompare(b.date));

      const totalCount = dataPoints.reduce((sum, dp) => sum + dp.count, 0);
      const avgDailyCount = dataPoints.length > 0 ? totalCount / dataPoints.length : 0;

      trends.push({
        query,
        dataPoints,
        totalCount,
        avgDailyCount: Math.round(avgDailyCount * 100) / 100,
      });
    }

    return trends;
  }

  // ── Public API: Incremental Sync ───────────────────────────────────────

  /**
   * Incrementally sync new remote jobs posted since a given date.
   *
   * Iterates through configured sync queries, fetches recent results
   * sorted by date, and yields fully detailed job objects. Designed
   * to be piped into the DB upsert via the GraphQL mutation.
   *
   * Emits `sync:progress` events for monitoring.
   *
   * @param since - Only return jobs posted after this date
   * @yields VoyagerJobDetails for each new job
   *
   * @example
   * ```ts
   * const yesterday = new Date(Date.now() - 86_400_000);
   * const progress: SyncProgress = { discovered: 0, detailed: 0, skipped: 0, errors: 0, inProgress: true };
   *
   * for await (const job of client.syncNewJobs(yesterday)) {
   *   // Upsert into the linkedin_posts table
   *   await upsertLinkedInPost({
   *     url: `https://www.linkedin.com/jobs/view/${job.jobId}`,
   *     type: "job",
   *     title: job.title,
   *     content: job.description,
   *     location: job.location,
   *     employmentType: job.employmentType,
   *     postedAt: job.listedAtMs ? new Date(job.listedAtMs).toISOString() : undefined,
   *   });
   * }
   * ```
   */
  async *syncNewJobs(since: Date): AsyncGenerator<VoyagerJobDetails, SyncProgress, undefined> {
    const sinceMs = since.getTime();
    const seenJobIds = new Set<string>();
    const progress: SyncProgress = {
      discovered: 0,
      detailed: 0,
      skipped: 0,
      errors: 0,
      inProgress: true,
    };

    // Determine datePosted filter based on how far back `since` is
    const ageMs = Date.now() - sinceMs;
    const datePosted: VoyagerJobSearchParams["datePosted"] =
      ageMs <= 86_400_000 ? "past_24h" :
      ageMs <= 604_800_000 ? "past_week" :
      "past_month";

    for (const query of this.syncQueries) {
      progress.currentQuery = query;

      this.emit({
        type: "sync:progress",
        timestamp: Date.now(),
        metadata: { ...progress },
      });

      try {
        for await (const card of this.searchJobs({
          keywords: query,
          workplaceType: "remote",
          datePosted,
          sortBy: "most_recent",
        })) {
          // Skip if we've already seen this job in another query
          if (seenJobIds.has(card.jobId)) {
            progress.skipped++;
            continue;
          }
          seenJobIds.add(card.jobId);
          progress.discovered++;

          // Skip if the job was posted before our sync window
          if (card.listedAtMs && card.listedAtMs < sinceMs) {
            progress.skipped++;
            continue;
          }

          // Fetch full details
          try {
            const details = await this.getJobDetails(card.jobId);
            progress.detailed++;

            this.emit({
              type: "sync:progress",
              timestamp: Date.now(),
              metadata: { ...progress },
            });

            yield details;

            // Courtesy delay between detail fetches
            await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
          } catch (err) {
            progress.errors++;

            // Skip NOT_FOUND (job was removed) but log other errors
            if (err instanceof VoyagerError && err.code === "NOT_FOUND") {
              continue;
            }

            this.emit({
              type: "request:error",
              timestamp: Date.now(),
              endpoint: `jobDetails/${card.jobId}`,
              metadata: { error: err instanceof Error ? err.message : String(err) },
            });

            // Stop on auth errors
            if (err instanceof VoyagerError && (err.code === "AUTH_EXPIRED" || err.code === "AUTH_INVALID")) {
              progress.inProgress = false;
              return progress;
            }
          }
        }
      } catch (err) {
        progress.errors++;

        this.emit({
          type: "request:error",
          timestamp: Date.now(),
          metadata: {
            query,
            error: err instanceof Error ? err.message : String(err),
          },
        });

        // Auth errors are fatal for the entire sync
        if (err instanceof VoyagerError && (err.code === "AUTH_EXPIRED" || err.code === "AUTH_INVALID")) {
          progress.inProgress = false;
          return progress;
        }
      }
    }

    progress.inProgress = false;
    this.emit({
      type: "sync:complete",
      timestamp: Date.now(),
      metadata: { ...progress },
    });

    return progress;
  }

  // ── Public API: Health Check ───────────────────────────────────────────

  /**
   * Verify the current session is alive and not rate-limited.
   *
   * Makes a lightweight request to the Voyager identity endpoint to
   * confirm authentication, then reports rate limit budget status.
   *
   * @returns Health status object
   */
  async healthCheck(): Promise<VoyagerHealthStatus> {
    const status: VoyagerHealthStatus = {
      alive: false,
      rateLimitHealthy: true,
      remainingBudget: {},
      activeSession: this.sessionManager.currentLabel,
      totalSessions: this.sessionManager.totalSessions,
      lastSuccessAt: this.lastSuccessAt,
    };

    // Report rate limit budgets
    for (const [bucket, budget] of Object.entries(this.rateLimits)) {
      const now = Date.now();
      const windowActive = now - budget.windowStart < budget.windowMs;
      const remaining = windowActive ? budget.maxRequests - budget.currentCount : budget.maxRequests;

      status.remainingBudget[bucket] = {
        remaining: Math.max(0, remaining),
        total: budget.maxRequests,
      };

      if (remaining <= budget.maxRequests * 0.1) {
        status.rateLimitHealthy = false;
      }
    }

    // Test session by making a lightweight profile request
    try {
      await this.request<Record<string, unknown>>(
        "/me",
        { cacheKey: undefined, skipCache: true },
      );
      status.alive = true;

      this.emit({ type: "health:ok", timestamp: Date.now(), metadata: { ...status } });
    } catch (err) {
      status.alive = false;
      status.error = err instanceof Error ? err.message : String(err);

      this.emit({ type: "health:degraded", timestamp: Date.now(), metadata: { ...status } });
    }

    return status;
  }

  // ── Public API: Cache Management ───────────────────────────────────────

  /**
   * Invalidate cached responses matching a pattern.
   * Pass no argument to clear the entire cache.
   *
   * @param pattern - Partial cache key to match (e.g. "details:", "search:")
   * @returns Number of entries invalidated
   */
  invalidateCache(pattern?: string): number {
    return this.cache.invalidate(pattern);
  }

  /** Current number of cached entries. */
  get cacheSize(): number {
    return this.cache.size;
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /** Get TTL for a method name, checking overrides first. */
  private getTtl(method: string): number {
    return this.cacheConfig.ttlOverrides[method] ?? this.cacheConfig.defaultTtlMs;
  }
}

// ── Module-level Helper ──────────────────────────────────────────────────

/**
 * Resolve a Voyager image object to a URL string.
 * Voyager image entities have various nested formats for resolution data.
 */
function resolveImageUrl(imageObj: unknown): string | undefined {
  if (!imageObj || typeof imageObj !== "object") return undefined;

  const obj = imageObj as Record<string, unknown>;

  // Direct URL
  if (typeof obj.url === "string") return obj.url;

  // rootUrl + artifacts pattern
  if (typeof obj.rootUrl === "string") {
    const artifacts = obj.artifacts as Array<Record<string, unknown>> | undefined;
    if (artifacts?.[0]?.fileIdentifyingUrlPathSegment) {
      return `${obj.rootUrl}${artifacts[0].fileIdentifyingUrlPathSegment}`;
    }
    return obj.rootUrl;
  }

  // vectorImage pattern
  const vectorImage = obj.vectorImage as Record<string, unknown> | undefined;
  if (vectorImage) {
    return resolveImageUrl(vectorImage);
  }

  // image.com.linkedin.common.VectorImage pattern
  const image = obj.image as Record<string, unknown> | undefined;
  if (image) {
    const inner = Object.values(image).find(
      (v) => typeof v === "object" && v !== null,
    );
    if (inner) return resolveImageUrl(inner);
  }

  return undefined;
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a VoyagerClient from environment variables.
 *
 * Reads LI_AT and JSESSIONID from process.env. Supports multi-session
 * rotation via comma-separated values:
 *   LI_AT="token1,token2"
 *   JSESSIONID="csrf1,csrf2"
 *
 * @throws VoyagerError if credentials are missing
 */
export function createVoyagerClient(overrides?: Partial<VoyagerClientConfig>): VoyagerClient {
  const liAtRaw = process.env.LI_AT;
  const jsessionRaw = process.env.JSESSIONID;

  if (!liAtRaw || !jsessionRaw) {
    throw new VoyagerError(
      "AUTH_INVALID",
      "Missing LI_AT and/or JSESSIONID environment variables. " +
        "Set these to your LinkedIn session cookies.",
    );
  }

  const liAtTokens = liAtRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const jsessionTokens = jsessionRaw.split(",").map((s) => s.trim()).filter(Boolean);

  if (liAtTokens.length !== jsessionTokens.length) {
    throw new VoyagerError(
      "AUTH_INVALID",
      `LI_AT has ${liAtTokens.length} tokens but JSESSIONID has ${jsessionTokens.length}. ` +
        "They must have the same count for session rotation.",
    );
  }

  let session: VoyagerSessionConfig;

  if (liAtTokens.length === 1) {
    session = { liAt: liAtTokens[0], jsessionId: jsessionTokens[0] };
  } else {
    session = {
      sessions: liAtTokens.map((liAt, i) => ({
        liAt,
        jsessionId: jsessionTokens[i],
        label: `session-${i}`,
      })),
    };
  }

  return new VoyagerClient({ session, ...overrides });
}
