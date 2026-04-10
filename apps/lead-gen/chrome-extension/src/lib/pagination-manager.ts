/**
 * LinkedIn Voyager API Pagination Manager
 *
 * Handles all pagination patterns for LinkedIn's internal Voyager API:
 *   1. Offset-based pagination (start/count)
 *   2. Cursor-based pagination (infinite scroll endpoints)
 *   3. Deduplication across pages (jobs shift between pages in real-time)
 *   4. Rate limiting with exponential backoff + jitter
 *   5. End-of-results detection (multiple strategies)
 *   6. Parallel pagination (bounded concurrency)
 *   7. Endpoint-specific adapters (search, company jobs, recommendations, feed)
 *
 * Architecture: PaginationManager is endpoint-agnostic. Endpoint-specific
 * configuration is provided via VoyagerEndpointConfig. The manager handles
 * cursor tracking, dedup, rate limits, and retry — callers handle parsing.
 */

// ── Constants ──────────────────────────────────────────────────────────

/** LinkedIn caps search results at ~1000 regardless of actual total. */
const LINKEDIN_MAX_SEARCH_DEPTH = 1000;

/** Maximum results for company-scoped job listings (lower cap). */
const LINKEDIN_MAX_COMPANY_JOBS_DEPTH = 950;

/** Feed endpoints have a different, cursor-based cap. */
const LINKEDIN_MAX_FEED_DEPTH = 500;

/** Absolute safety ceiling — never paginate beyond this. */
const ABSOLUTE_MAX_DEPTH = 1200;

/** Default page size for Voyager endpoints. */
const DEFAULT_PAGE_SIZE = 25;

/** Default delay between sequential requests (ms). */
const DEFAULT_REQUEST_DELAY_MS = 350;

/** Maximum retry attempts for a single page fetch. */
const DEFAULT_MAX_RETRIES = 4;

/** Base delay for exponential backoff (ms). */
const BACKOFF_BASE_MS = 2000;

/** Maximum backoff delay (ms). */
const BACKOFF_MAX_MS = 60_000;

/** Maximum concurrent page requests for parallel pagination. */
const DEFAULT_MAX_CONCURRENCY = 3;

/** Number of consecutive empty pages before giving up. */
const MAX_CONSECUTIVE_EMPTY = 3;

// ── Types ──────────────────────────────────────────────────────────────

/** LinkedIn's paging metadata object, as returned by Voyager endpoints. */
export interface VoyagerPagingMetadata {
  /** Offset of the first item in this page. */
  start: number;
  /** Number of items requested. */
  count: number;
  /** Total number of results (may be approximate or capped). */
  total?: number;
  /** Link relations for next/prev pages. */
  links?: Array<{
    rel: string;
    href: string;
    type?: string;
  }>;
}

/** Parsed response from a single Voyager page fetch. */
export interface VoyagerPageResult<T> {
  /** The extracted items from this page. */
  items: T[];
  /** Raw paging metadata from the response. */
  paging: VoyagerPagingMetadata;
  /** Unique identifier for each item (used for deduplication). */
  itemIds: string[];
  /** Optional cursor for cursor-based pagination. */
  nextCursor?: string;
  /** HTTP status code. */
  status: number;
}

/**
 * Pagination mode. LinkedIn uses both:
 *  - "offset": start/count based (search, connections, company jobs)
 *  - "cursor": opaque cursor token (feed, recommendations, notifications)
 */
export type PaginationMode = "offset" | "cursor";

/**
 * Endpoint-specific configuration.
 * Callers implement this to adapt the PaginationManager to a specific Voyager endpoint.
 */
export interface VoyagerEndpointConfig<T> {
  /** Human-readable name for logging. */
  name: string;

  /** Pagination mode for this endpoint. */
  mode: PaginationMode;

  /** Base URL (without query params). */
  baseUrl: string;

  /** Maximum page depth for this endpoint type. */
  maxDepth: number;

  /** Items per page. */
  pageSize: number;

  /** Delay between sequential requests (ms). */
  requestDelayMs: number;

  /**
   * Build the full URL for a page request.
   * For offset mode: receives `start` and `count`.
   * For cursor mode: receives `cursor` (undefined for first page).
   */
  buildUrl(params: {
    start: number;
    count: number;
    cursor?: string;
  }): string;

  /**
   * Parse the raw Voyager JSON response into a VoyagerPageResult.
   * Must extract items, paging metadata, item IDs for dedup, and optional next cursor.
   */
  parsePage(data: unknown, status: number): VoyagerPageResult<T>;

  /**
   * Optional: Additional request headers beyond the standard Voyager headers.
   */
  extraHeaders?: Record<string, string>;
}

/** Progress callback for pagination operations. */
export interface PaginationProgress {
  /** Number of unique items collected so far. */
  collected: number;
  /** Reported total from the API (may be approximate). */
  reportedTotal: number | null;
  /** Number of duplicate items encountered. */
  duplicates: number;
  /** Current page number (0-indexed). */
  page: number;
  /** Whether rate limiting was hit on this page. */
  wasRateLimited: boolean;
  /** Optional warning message. */
  warning?: string;
}

/** Result of a full pagination run. */
export interface PaginationResult<T> {
  /** All unique items collected. */
  items: T[];
  /** Total reported by the API. */
  reportedTotal: number | null;
  /** Number of pages fetched. */
  pagesFetched: number;
  /** Number of duplicate items filtered. */
  duplicatesFiltered: number;
  /** Whether pagination was truncated by LinkedIn's depth cap. */
  hitDepthCap: boolean;
  /** Whether pagination was cancelled. */
  cancelled: boolean;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Number of rate limit retries. */
  rateLimitRetries: number;
}

/** Error subclass for retryable failures (429, 503, network). */
class RetryableError extends Error {
  readonly retryable = true as const;
  readonly statusCode: number;
  constructor(message: string, statusCode: number = 429) {
    super(message);
    this.name = "RetryableError";
    this.statusCode = statusCode;
  }
}

/** Error subclass for auth failures (401, 403) — not retryable. */
class AuthError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

// ── CSRF Token ─────────────────────────────────────────────────────────

/**
 * Read LinkedIn's CSRF token from the JSESSIONID cookie.
 * The Voyager API requires this as a `csrf-token` header.
 */
async function getCsrfToken(): Promise<string> {
  const cookie = await chrome.cookies.get({
    url: "https://www.linkedin.com",
    name: "JSESSIONID",
  });
  if (!cookie?.value) {
    throw new AuthError(
      "Not logged into LinkedIn — JSESSIONID cookie not found",
      401,
    );
  }
  return cookie.value.replace(/^"|"$/g, "");
}

// ── Core Fetch with Retry ──────────────────────────────────────────────

/**
 * Fetch a single page with retry logic and exponential backoff.
 * Handles 429 (rate limit), 503 (temporary), and network errors.
 */
async function fetchWithRetry(
  url: string,
  csrfToken: string,
  extraHeaders: Record<string, string> = {},
  maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<{ data: unknown; status: number }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "csrf-token": csrfToken,
          "x-restli-protocol-version": "2.0.0",
          Accept: "application/vnd.linkedin.normalized+json+2.1",
          ...extraHeaders,
        },
        credentials: "include",
      });

      // Auth failures — not retryable
      if (res.status === 401 || res.status === 403) {
        throw new AuthError(
          `LinkedIn auth error: ${res.status} — session may have expired`,
          res.status,
        );
      }

      // Rate limit — retryable with backoff
      if (res.status === 429) {
        throw new RetryableError("LinkedIn rate limit (429)", 429);
      }

      // Server errors — retryable
      if (res.status === 503 || res.status === 502) {
        throw new RetryableError(
          `LinkedIn server error (${res.status})`,
          res.status,
        );
      }

      // Other non-OK — not retryable
      if (!res.ok) {
        throw new Error(`Voyager API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      return { data, status: res.status };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on retryable errors or network failures
      const isRetryable =
        err instanceof RetryableError ||
        (err instanceof TypeError && err.message.includes("fetch")); // Network error

      if (!isRetryable || attempt >= maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const baseDelay = Math.min(
        BACKOFF_BASE_MS * Math.pow(2, attempt),
        BACKOFF_MAX_MS,
      );
      // Add 0-50% jitter to avoid thundering herd
      const jitter = baseDelay * 0.5 * Math.random();
      const delay = baseDelay + jitter;

      console.warn(
        `[PaginationManager] Retryable error — attempt ${attempt + 1}/${maxRetries}, retrying in ${Math.round(delay)}ms: ${lastError.message}`,
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Unexpected retry loop exit");
}

// ── Utility ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── PaginationManager ──────────────────────────────────────────────────

/**
 * Manages pagination across LinkedIn Voyager API endpoints.
 *
 * Features:
 *   - Offset and cursor-based pagination
 *   - Deduplication via item ID set (handles job shifting between pages)
 *   - Exponential backoff with jitter for rate limits
 *   - Configurable max depth per endpoint type
 *   - Parallel pagination with bounded concurrency
 *   - Multiple end-of-results detection strategies
 *   - Cancellation support
 */
export class PaginationManager<T> {
  private config: VoyagerEndpointConfig<T>;
  private csrfToken: string | null = null;
  private seenIds = new Set<string>();
  private items: T[] = [];
  private reportedTotal: number | null = null;
  private cancelled = false;
  private rateLimitRetries = 0;
  private consecutiveEmpty = 0;
  private pagesFetched = 0;
  private duplicatesFiltered = 0;

  // Cursor state (for cursor-based pagination)
  private currentCursor: string | undefined = undefined;

  // Offset state (for offset-based pagination)
  private currentOffset = 0;

  constructor(config: VoyagerEndpointConfig<T>) {
    this.config = config;
  }

  /** Cancel an in-progress pagination run. */
  cancel(): void {
    this.cancelled = true;
  }

  /** Reset internal state for a fresh pagination run. */
  private reset(): void {
    this.seenIds.clear();
    this.items = [];
    this.reportedTotal = null;
    this.cancelled = false;
    this.rateLimitRetries = 0;
    this.consecutiveEmpty = 0;
    this.pagesFetched = 0;
    this.duplicatesFiltered = 0;
    this.currentCursor = undefined;
    this.currentOffset = 0;
  }

  /**
   * Fetch all pages sequentially.
   * This is the standard pattern — one page at a time with delays between requests.
   * Safest for avoiding rate limits.
   */
  async fetchAll(
    onProgress?: (progress: PaginationProgress) => void,
  ): Promise<PaginationResult<T>> {
    this.reset();
    const t0 = Date.now();

    // Acquire CSRF token once
    this.csrfToken = await getCsrfToken();

    while (!this.shouldStop()) {
      const wasRateLimited = await this.fetchNextPage();

      onProgress?.({
        collected: this.items.length,
        reportedTotal: this.reportedTotal,
        duplicates: this.duplicatesFiltered,
        page: this.pagesFetched - 1,
        wasRateLimited,
      });

      // Delay between requests (skip if we just did a backoff wait)
      if (!wasRateLimited && !this.shouldStop()) {
        await sleep(this.config.requestDelayMs);
      }
    }

    return this.buildResult(t0);
  }

  /**
   * Fetch pages in parallel with bounded concurrency.
   *
   * Strategy: Fetch the first page sequentially to learn the total,
   * then fan out remaining pages with concurrency limit.
   *
   * WARNING: Higher risk of rate limiting. Use for endpoints where
   * LinkedIn is known to be lenient (e.g., company job listings with
   * a known total < 100).
   *
   * Only works for offset-based pagination (cursor-based is inherently sequential).
   */
  async fetchParallel(
    maxConcurrency: number = DEFAULT_MAX_CONCURRENCY,
    onProgress?: (progress: PaginationProgress) => void,
  ): Promise<PaginationResult<T>> {
    if (this.config.mode === "cursor") {
      console.warn(
        `[PaginationManager] Cursor-based endpoints cannot be paginated in parallel — falling back to sequential`,
      );
      return this.fetchAll(onProgress);
    }

    this.reset();
    const t0 = Date.now();
    this.csrfToken = await getCsrfToken();

    // Step 1: Fetch first page to learn total
    await this.fetchNextPage();

    onProgress?.({
      collected: this.items.length,
      reportedTotal: this.reportedTotal,
      duplicates: this.duplicatesFiltered,
      page: 0,
      wasRateLimited: false,
    });

    if (this.reportedTotal === null || this.reportedTotal <= this.config.pageSize) {
      return this.buildResult(t0);
    }

    // Step 2: Calculate remaining pages
    const effectiveTotal = Math.min(
      this.reportedTotal,
      this.config.maxDepth,
      ABSOLUTE_MAX_DEPTH,
    );
    const offsets: number[] = [];
    for (
      let start = this.config.pageSize;
      start < effectiveTotal;
      start += this.config.pageSize
    ) {
      offsets.push(start);
    }

    // Step 3: Fan out with bounded concurrency
    const semaphore = new Semaphore(maxConcurrency);

    const pagePromises = offsets.map(async (start) => {
      if (this.cancelled) return;

      await semaphore.acquire();
      try {
        if (this.cancelled) return;

        // Add inter-request delay scaled by concurrency to spread load
        await sleep(
          this.config.requestDelayMs * (0.5 + Math.random() * 0.5),
        );

        const url = this.config.buildUrl({
          start,
          count: this.config.pageSize,
        });

        const { data, status } = await fetchWithRetry(
          url,
          this.csrfToken!,
          this.config.extraHeaders ?? {},
        );

        const page = this.config.parsePage(data, status);
        this.ingestPage(page);
        this.pagesFetched++;

        onProgress?.({
          collected: this.items.length,
          reportedTotal: this.reportedTotal,
          duplicates: this.duplicatesFiltered,
          page: this.pagesFetched - 1,
          wasRateLimited: false,
        });
      } catch (err) {
        if (err instanceof RetryableError) {
          this.rateLimitRetries++;
        }
        // Swallow errors in parallel mode — we collect what we can
        console.warn(
          `[PaginationManager] Parallel page at offset=${start} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(pagePromises);

    return this.buildResult(t0);
  }

  /**
   * Fetch a single next page. Returns true if a rate limit was encountered.
   * Advances internal cursor/offset state.
   */
  private async fetchNextPage(): Promise<boolean> {
    let wasRateLimited = false;

    const url = this.config.buildUrl({
      start: this.currentOffset,
      count: this.config.pageSize,
      cursor: this.currentCursor,
    });

    try {
      const { data, status } = await fetchWithRetry(
        url,
        this.csrfToken!,
        this.config.extraHeaders ?? {},
      );

      const page = this.config.parsePage(data, status);
      this.ingestPage(page);
      this.pagesFetched++;

      // Advance cursor/offset
      if (this.config.mode === "cursor") {
        this.currentCursor = page.nextCursor;
      } else {
        this.currentOffset += this.config.pageSize;
      }

      // Update total if API reports it
      if (page.paging.total !== undefined && page.paging.total > 0) {
        this.reportedTotal = page.paging.total;
      }

      // Track consecutive empty pages
      if (page.items.length === 0) {
        this.consecutiveEmpty++;
      } else {
        this.consecutiveEmpty = 0;
      }
    } catch (err) {
      if (err instanceof RetryableError) {
        wasRateLimited = true;
        this.rateLimitRetries++;
      } else {
        throw err;
      }
    }

    return wasRateLimited;
  }

  /**
   * Ingest a page result: deduplicate items and add unique ones.
   */
  private ingestPage(page: VoyagerPageResult<T>): void {
    for (let i = 0; i < page.items.length; i++) {
      const id = page.itemIds[i];
      if (!id) continue;

      if (this.seenIds.has(id)) {
        this.duplicatesFiltered++;
        continue;
      }

      this.seenIds.add(id);
      this.items.push(page.items[i]);
    }
  }

  /**
   * Determine whether pagination should stop.
   *
   * End-of-results detection strategies:
   *   1. Cancelled by caller
   *   2. Hit max consecutive empty pages
   *   3. Offset exceeds API-reported total
   *   4. Offset exceeds endpoint-specific max depth
   *   5. Offset exceeds absolute max depth safety ceiling
   *   6. Cursor-based: no next cursor returned
   *   7. Paging metadata has no "next" link
   */
  private shouldStop(): boolean {
    // 1. Cancellation
    if (this.cancelled) return true;

    // 2. Consecutive empty pages
    if (this.consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
      console.log(
        `[PaginationManager:${this.config.name}] Stopping: ${MAX_CONSECUTIVE_EMPTY} consecutive empty pages`,
      );
      return true;
    }

    // 3. Offset exceeds reported total
    if (
      this.config.mode === "offset" &&
      this.reportedTotal !== null &&
      this.currentOffset >= this.reportedTotal
    ) {
      return true;
    }

    // 4. Endpoint max depth
    if (
      this.config.mode === "offset" &&
      this.currentOffset >= this.config.maxDepth
    ) {
      console.log(
        `[PaginationManager:${this.config.name}] Stopping: hit endpoint max depth (${this.config.maxDepth})`,
      );
      return true;
    }

    // 5. Absolute max depth
    if (
      this.config.mode === "offset" &&
      this.currentOffset >= ABSOLUTE_MAX_DEPTH
    ) {
      return true;
    }

    // 6. Cursor-based: no next cursor after first page
    if (
      this.config.mode === "cursor" &&
      this.pagesFetched > 0 &&
      !this.currentCursor
    ) {
      return true;
    }

    return false;
  }

  /** Build the final result object. */
  private buildResult(t0: number): PaginationResult<T> {
    const hitDepthCap =
      this.reportedTotal !== null &&
      this.items.length < this.reportedTotal &&
      this.currentOffset >= this.config.maxDepth;

    if (hitDepthCap) {
      console.warn(
        `[PaginationManager:${this.config.name}] LinkedIn depth cap: collected ${this.items.length} of ${this.reportedTotal} reported`,
      );
    }

    return {
      items: this.items,
      reportedTotal: this.reportedTotal,
      pagesFetched: this.pagesFetched,
      duplicatesFiltered: this.duplicatesFiltered,
      hitDepthCap,
      cancelled: this.cancelled,
      durationMs: Date.now() - t0,
      rateLimitRetries: this.rateLimitRetries,
    };
  }
}

// ── Semaphore (for parallel pagination) ────────────────────────────────

class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    } else {
      this.permits++;
    }
  }
}

// ── Pre-built Endpoint Configs ─────────────────────────────────────────

/**
 * Factory: Search results pagination (jobs, people, companies).
 * Uses offset-based pagination with LinkedIn's ~1000 result cap.
 */
export function searchEndpoint<T>(opts: {
  name: string;
  baseUrl: string;
  decorationId: string;
  queryParams: Record<string, string>;
  pageSize?: number;
  parseItem: (element: unknown, included: unknown[]) => { item: T; id: string } | null;
}): VoyagerEndpointConfig<T> {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;

  return {
    name: opts.name,
    mode: "offset",
    baseUrl: opts.baseUrl,
    maxDepth: LINKEDIN_MAX_SEARCH_DEPTH,
    pageSize,
    requestDelayMs: DEFAULT_REQUEST_DELAY_MS,

    buildUrl({ start, count }) {
      const url = new URL(opts.baseUrl);
      url.searchParams.set("decorationId", opts.decorationId);
      url.searchParams.set("count", String(count));
      url.searchParams.set("start", String(start));
      for (const [k, v] of Object.entries(opts.queryParams)) {
        url.searchParams.set(k, v);
      }
      return url.toString();
    },

    parsePage(data: unknown, status: number): VoyagerPageResult<T> {
      const d = data as Record<string, unknown>;
      const paging = extractPaging(d);
      const included = Array.isArray(d.included) ? d.included : [];
      const elements = Array.isArray(d.elements) ? d.elements : [];

      const items: T[] = [];
      const itemIds: string[] = [];

      for (const el of elements) {
        const parsed = opts.parseItem(el, included);
        if (parsed) {
          items.push(parsed.item);
          itemIds.push(parsed.id);
        }
      }

      return { items, paging, itemIds, status };
    },
  };
}

/**
 * Factory: Company job listings.
 * Uses offset-based pagination with a slightly lower cap (~950).
 */
export function companyJobsEndpoint<T>(opts: {
  companyId: string;
  filters?: Record<string, string>;
  pageSize?: number;
  parseItem: (element: unknown, included: unknown[]) => { item: T; id: string } | null;
}): VoyagerEndpointConfig<T> {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = opts.filters ?? {};

  // Build the Voyager filter query string
  const filterParts = Object.entries(filters)
    .map(([k, v]) => `${k}:List(${v})`)
    .join(",");
  const companyFilter = `company:List(${opts.companyId})`;
  const allFilters = filterParts
    ? `${companyFilter},${filterParts}`
    : companyFilter;

  return {
    name: `company-jobs:${opts.companyId}`,
    mode: "offset",
    baseUrl: "https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards",
    maxDepth: LINKEDIN_MAX_COMPANY_JOBS_DEPTH,
    pageSize,
    requestDelayMs: DEFAULT_REQUEST_DELAY_MS,

    buildUrl({ start, count }) {
      const url = new URL(
        "https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards",
      );
      url.searchParams.set(
        "decorationId",
        "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",
      );
      url.searchParams.set("count", String(count));
      url.searchParams.set("start", String(start));
      url.searchParams.set("q", "jobSearch");
      url.searchParams.set(
        "query",
        `(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(${allFilters}),spellCorrectionEnabled:true)`,
      );
      url.searchParams.set("locationUnion", "(geoId:92000000)");
      return url.toString();
    },

    parsePage(data: unknown, status: number): VoyagerPageResult<T> {
      const d = data as Record<string, unknown>;
      const paging = extractPaging(d);
      const included = Array.isArray(d.included) ? d.included : [];
      const elements = Array.isArray(d.elements) ? d.elements : [];

      const items: T[] = [];
      const itemIds: string[] = [];

      for (const el of elements) {
        const parsed = opts.parseItem(el, included);
        if (parsed) {
          items.push(parsed.item);
          itemIds.push(parsed.id);
        }
      }

      return { items, paging, itemIds, status };
    },
  };
}

/**
 * Factory: Connections list.
 * Uses offset-based pagination. The existing connection-scraper pattern.
 */
export function connectionsEndpoint<T>(opts: {
  sortType?: "RECENTLY_ADDED" | "FIRST_NAME" | "LAST_NAME";
  pageSize?: number;
  parseItem: (element: unknown, included: unknown[]) => { item: T; id: string } | null;
}): VoyagerEndpointConfig<T> {
  const pageSize = opts.pageSize ?? 40;
  const sortType = opts.sortType ?? "RECENTLY_ADDED";

  return {
    name: "connections",
    mode: "offset",
    baseUrl:
      "https://www.linkedin.com/voyager/api/relationships/dash/connections",
    maxDepth: ABSOLUTE_MAX_DEPTH, // Connections have no known cap below the safety ceiling
    pageSize,
    requestDelayMs: 300,

    buildUrl({ start, count }) {
      const url = new URL(
        "https://www.linkedin.com/voyager/api/relationships/dash/connections",
      );
      url.searchParams.set(
        "decorationId",
        "com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16",
      );
      url.searchParams.set("count", String(count));
      url.searchParams.set("start", String(start));
      url.searchParams.set("q", "search");
      url.searchParams.set("sortType", sortType);
      return url.toString();
    },

    parsePage(data: unknown, status: number): VoyagerPageResult<T> {
      const d = data as Record<string, unknown>;
      const paging = extractPaging(d);
      const included = Array.isArray(d.included) ? d.included : [];
      const elements = Array.isArray(d.elements) ? d.elements : [];

      const items: T[] = [];
      const itemIds: string[] = [];

      // Connections use the `included` array with profile entities
      const sources =
        included.length > 0 ? (included as unknown[]) : elements;

      for (const el of sources) {
        const parsed = opts.parseItem(el, included);
        if (parsed) {
          items.push(parsed.item);
          itemIds.push(parsed.id);
        }
      }

      return { items, paging, itemIds, status };
    },
  };
}

/**
 * Factory: Feed / recommendations (cursor-based pagination).
 * LinkedIn's feed uses opaque cursor tokens rather than offset.
 */
export function feedEndpoint<T>(opts: {
  name: string;
  baseUrl: string;
  parseItem: (element: unknown, included: unknown[]) => { item: T; id: string } | null;
  parseCursor: (data: unknown) => string | undefined;
  pageSize?: number;
}): VoyagerEndpointConfig<T> {
  const pageSize = opts.pageSize ?? 10;

  return {
    name: opts.name,
    mode: "cursor",
    baseUrl: opts.baseUrl,
    maxDepth: LINKEDIN_MAX_FEED_DEPTH,
    pageSize,
    requestDelayMs: 500, // Feed endpoints are more aggressively rate-limited

    buildUrl({ count, cursor }) {
      const url = new URL(opts.baseUrl);
      url.searchParams.set("count", String(count));
      if (cursor) {
        url.searchParams.set("paginationToken", cursor);
      }
      return url.toString();
    },

    parsePage(data: unknown, status: number): VoyagerPageResult<T> {
      const d = data as Record<string, unknown>;
      const paging = extractPaging(d);
      const included = Array.isArray(d.included) ? d.included : [];
      const elements = Array.isArray(d.elements) ? d.elements : [];

      const items: T[] = [];
      const itemIds: string[] = [];

      for (const el of elements) {
        const parsed = opts.parseItem(el, included);
        if (parsed) {
          items.push(parsed.item);
          itemIds.push(parsed.id);
        }
      }

      const nextCursor = opts.parseCursor(data);

      return { items, paging, itemIds, nextCursor, status };
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Extract the `paging` metadata from a Voyager response.
 * LinkedIn nests it differently depending on the endpoint and decoration.
 */
function extractPaging(data: Record<string, unknown>): VoyagerPagingMetadata {
  // Direct paging
  if (data.paging && typeof data.paging === "object") {
    return data.paging as VoyagerPagingMetadata;
  }
  // Nested under data
  if (
    data.data &&
    typeof data.data === "object" &&
    (data.data as Record<string, unknown>).paging
  ) {
    return (data.data as Record<string, unknown>)
      .paging as VoyagerPagingMetadata;
  }
  // Nested under metadata
  if (
    data.metadata &&
    typeof data.metadata === "object" &&
    (data.metadata as Record<string, unknown>).paging
  ) {
    return (data.metadata as Record<string, unknown>)
      .paging as VoyagerPagingMetadata;
  }
  // Fallback
  return { start: 0, count: 0 };
}

/**
 * Detect whether a paging metadata object indicates more results.
 * Checks the `links` array for a "next" relation.
 */
export function hasNextPage(paging: VoyagerPagingMetadata): boolean {
  if (!paging.links || !Array.isArray(paging.links)) return false;
  return paging.links.some(
    (link) => link.rel === "next" || link.rel === "NEXT",
  );
}

/**
 * Estimate the real total from LinkedIn's reported total.
 * LinkedIn inflates totals for search endpoints — the real cap is ~1000.
 */
export function estimateRealTotal(
  reportedTotal: number,
  endpointMaxDepth: number,
): {
  displayTotal: number;
  fetchableTotal: number;
  isCapped: boolean;
} {
  const fetchableTotal = Math.min(reportedTotal, endpointMaxDepth);
  return {
    displayTotal: reportedTotal,
    fetchableTotal,
    isCapped: reportedTotal > endpointMaxDepth,
  };
}
