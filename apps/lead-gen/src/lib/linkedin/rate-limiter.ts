/**
 * LinkedIn Voyager API Rate Limiter
 *
 * Sustainable usage of LinkedIn's internal Voyager REST API with:
 * - Per-endpoint token-bucket budgets (known empirical limits)
 * - Adaptive throttling with exponential backoff + jitter
 * - Session health monitoring and rotation
 * - Circuit breaker pattern (closed -> open -> half-open)
 * - Human-like request spacing with behavioral variance
 * - Cookie lifecycle management (li_at / JSESSIONID)
 * - ChallengeV2 captcha detection
 * - Soft-ban / shadow-restriction detection
 *
 * -----------------------------------------------------------------------
 * KNOWN LINKEDIN RATE LIMITS (empirical, as of 2025-Q4)
 * -----------------------------------------------------------------------
 *
 * Endpoint category           | ~Requests/min | ~Requests/day | Notes
 * ----------------------------|---------------|---------------|------------------
 * Profile views (GET /me)     | 60            | 1,000         | Authenticated self
 * Profile views (others)      | 15-20         | 400-500       | Varies by account age
 * Search (people)             | 10-15         | 300           | Drops fast on new accounts
 * Search (companies)          | 10-15         | 300           | Slightly more lenient
 * Search (jobs)               | 20            | 500           | Most lenient search
 * Connections list             | 15            | 300           | Paginated, 40/page max
 * Messaging (read)            | 20            | 500           | Read-only
 * Messaging (send)            | 5             | 100           | Heavily monitored
 * Company info                | 20            | 500           | Public data
 * Feed / posts                | 15            | 400           | Voyager feed endpoints
 * Skills / endorsements       | 15            | 300           | Low priority for LI
 * InMail                      | 2             | 25            | Premium only, strict
 *
 * -----------------------------------------------------------------------
 * HTTP 429 HANDLING
 * -----------------------------------------------------------------------
 *
 * LinkedIn returns 429 with varying behavior:
 * - Retry-After header: sometimes present (seconds), often absent
 * - When absent: exponential backoff starting at 60s
 * - Repeated 429s within a window: likely soft ban, back off 4-24 hours
 * - 429 on search: often accompanied by CAPTCHA on next browser visit
 *
 * -----------------------------------------------------------------------
 * ACCOUNT RESTRICTION TRIGGERS
 * -----------------------------------------------------------------------
 *
 * 1. Velocity: > 80 profile views/hour or > 500/day
 * 2. Pattern: exact intervals between requests (bot fingerprint)
 * 3. Impossible sequences: viewing profile -> messaging in < 1s
 * 4. Geographic: IP in different country from account locale
 * 5. Session: rapid li_at rotation or concurrent sessions
 * 6. Content: bulk identical messages (copy-paste detection)
 * 7. Graph: viewing unconnected profiles in disconnected clusters
 * 8. Time: activity during sleeping hours for account timezone
 *
 * -----------------------------------------------------------------------
 * CHALLENGEV2 CAPTCHA SYSTEM
 * -----------------------------------------------------------------------
 *
 * Triggers:
 * - Automated behavior score exceeds threshold (LinkedIn uses ML scoring)
 * - Multiple 429 responses in short window
 * - IP reputation change (data center IP, known proxy)
 * - Unusual user-agent or missing browser fingerprint signals
 * - Session replayed from different TLS fingerprint
 *
 * Response: HTTP 403 with challenge URL in body/headers. Cannot be solved
 * programmatically without browser automation. Session must be discarded.
 *
 * -----------------------------------------------------------------------
 * COOKIE LIFECYCLE
 * -----------------------------------------------------------------------
 *
 * - li_at: Main session cookie. ~1 year expiry. Revoked on password change.
 * - JSESSIONID: CSRF token. Changes per session. Must be sent as
 *   `csrf-token` header (without quotes, despite being stored with quotes).
 * - Cookies become invalid after: password change, security challenge,
 *   explicit logout, account restriction, ~365 days (li_at max TTL).
 * - Re-auth signal: 401 response, redirect to /login, or empty JSON body
 *   where data was expected.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Voyager endpoint categories with known rate characteristics. */
export type VoyagerEndpoint =
  | "profile_self"
  | "profile_view"
  | "search_people"
  | "search_companies"
  | "search_jobs"
  | "connections"
  | "messaging_read"
  | "messaging_send"
  | "company_info"
  | "feed"
  | "skills"
  | "inmail";

/** Circuit breaker states. */
export type CircuitState = "closed" | "open" | "half_open";

/** Session health status. */
export type SessionHealth =
  | "healthy"
  | "degraded"
  | "challenged"
  | "restricted"
  | "expired";

/** Reason a request was denied by the limiter. */
export type DenialReason =
  | "budget_exhausted"
  | "circuit_open"
  | "session_unhealthy"
  | "daily_limit_reached"
  | "cool_down_active"
  | "backoff_active";

/** Result of attempting to acquire a rate limit permit. */
export type AcquireResult =
  | { granted: true; delayMs: number; session: SessionState }
  | { granted: false; reason: DenialReason; retryAfterMs: number };

/** Individual session tracking. */
export interface SessionState {
  id: string;
  liAt: string;
  jsessionId: string;
  health: SessionHealth;
  /** ISO timestamp of last successful request. */
  lastActiveAt: string;
  /** ISO timestamp when li_at cookie was obtained. */
  cookieObtainedAt: string;
  /** Consecutive 429 responses on this session. */
  consecutive429s: number;
  /** Consecutive successful requests. */
  consecutiveSuccesses: number;
  /** Total requests made on this session today. */
  dailyRequestCount: number;
  /** Timestamp when daily count resets. */
  dailyResetAt: string;
  /** Whether a ChallengeV2 was encountered. */
  challengeEncountered: boolean;
  /** Soft-ban indicators. */
  softBanIndicators: SoftBanSignal[];
}

/** Signals that indicate shadow restriction / soft ban. */
export interface SoftBanSignal {
  type:
    | "empty_search_results"
    | "reduced_result_count"
    | "profile_not_found_spike"
    | "connection_list_empty"
    | "captcha_redirect"
    | "unusual_response_time";
  detectedAt: string;
  count: number;
}

/** Per-endpoint budget configuration. */
export interface EndpointBudget {
  /** Max requests per minute for this endpoint. */
  maxPerMinute: number;
  /** Max requests per day for this endpoint. */
  maxPerDay: number;
  /** Current tokens available in the per-minute bucket. */
  minuteTokens: number;
  /** Requests consumed today. */
  dailyConsumed: number;
  /** Timestamp of last token refill. */
  lastRefillAt: number;
  /** Timestamp when daily counter resets. */
  dailyResetAt: number;
  /** Minimum delay between consecutive requests to this endpoint (ms). */
  minIntervalMs: number;
  /** Last request timestamp for this endpoint. */
  lastRequestAt: number;
}

/** Configuration for the rate limiter. */
export interface RateLimiterConfig {
  /** Override default per-endpoint budgets. */
  budgets?: Partial<Record<VoyagerEndpoint, Partial<EndpointBudget>>>;
  /** Max consecutive 429s before circuit opens. Default: 3. */
  circuitBreakerThreshold?: number;
  /** Duration circuit stays open before trying half-open (ms). Default: 300_000 (5 min). */
  circuitOpenDurationMs?: number;
  /** Max requests allowed in half-open state to test recovery. Default: 2. */
  halfOpenMaxRequests?: number;
  /** Base backoff duration on 429 (ms). Default: 60_000. */
  baseBackoffMs?: number;
  /** Max backoff cap (ms). Default: 3_600_000 (1 hour). */
  maxBackoffMs?: number;
  /** Max daily requests across all endpoints per session. Default: 2_500. */
  globalDailyLimit?: number;
  /** Human-like delay range [min, max] added to each request (ms). Default: [800, 3_000]. */
  humanDelayRange?: [number, number];
  /** Max cookie age before forced re-auth (ms). Default: 30 days. */
  maxCookieAgeMs?: number;
  /** Soft-ban signal threshold before marking session degraded. Default: 3. */
  softBanThreshold?: number;
}

// ---------------------------------------------------------------------------
// Constants — Default Per-Endpoint Budgets
// ---------------------------------------------------------------------------

const DEFAULT_BUDGETS: Record<VoyagerEndpoint, Omit<EndpointBudget, "minuteTokens" | "dailyConsumed" | "lastRefillAt" | "dailyResetAt" | "lastRequestAt">> = {
  profile_self:     { maxPerMinute: 50, maxPerDay: 800,  minIntervalMs: 1_200 },
  profile_view:     { maxPerMinute: 12, maxPerDay: 400,  minIntervalMs: 4_000 },
  search_people:    { maxPerMinute: 8,  maxPerDay: 250,  minIntervalMs: 6_000 },
  search_companies: { maxPerMinute: 10, maxPerDay: 250,  minIntervalMs: 5_000 },
  search_jobs:      { maxPerMinute: 15, maxPerDay: 400,  minIntervalMs: 3_500 },
  connections:      { maxPerMinute: 12, maxPerDay: 250,  minIntervalMs: 4_000 },
  messaging_read:   { maxPerMinute: 15, maxPerDay: 400,  minIntervalMs: 3_000 },
  messaging_send:   { maxPerMinute: 3,  maxPerDay: 80,   minIntervalMs: 12_000 },
  company_info:     { maxPerMinute: 15, maxPerDay: 400,  minIntervalMs: 3_500 },
  feed:             { maxPerMinute: 12, maxPerDay: 350,  minIntervalMs: 4_000 },
  skills:           { maxPerMinute: 12, maxPerDay: 250,  minIntervalMs: 4_000 },
  inmail:           { maxPerMinute: 2,  maxPerDay: 20,   minIntervalMs: 30_000 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Uniform random in [min, max). */
function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Exponential backoff with full jitter (AWS-style). */
function expBackoffJitter(base: number, attempt: number, cap: number): number {
  const exp = Math.min(cap, base * Math.pow(2, attempt));
  return randRange(0, exp);
}

/** Human-like delay: log-normal distribution centered on midpoint of range. */
function humanDelay(range: [number, number]): number {
  const [min, max] = range;
  // Box-Muller transform for normal distribution, then shift to range
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const mid = (min + max) / 2;
  const spread = (max - min) / 4; // ~95% within range
  const delay = mid + normal * spread;
  return Math.max(min, Math.min(max, delay));
}

/** ISO timestamp string. */
function isoNow(): string {
  return new Date().toISOString();
}

/** Start of next UTC day as epoch ms. */
function nextDayResetMs(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

export class VoyagerRateLimiter {
  // --- Circuit breaker state ---
  private circuitState: CircuitState = "closed";
  private circuitOpenedAt = 0;
  private halfOpenRequestCount = 0;

  // --- Backoff state ---
  private global429Count = 0;
  private backoffUntil = 0;

  // --- Per-endpoint budgets ---
  private budgets: Map<VoyagerEndpoint, EndpointBudget>;

  // --- Session pool ---
  private sessions: SessionState[] = [];
  private activeSessionIndex = 0;

  // --- Config ---
  private readonly config: Required<RateLimiterConfig>;

  // --- Metrics ---
  private totalRequests = 0;
  private totalDenied = 0;
  private total429s = 0;

  constructor(config: RateLimiterConfig = {}) {
    this.config = {
      budgets: config.budgets ?? {},
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 3,
      circuitOpenDurationMs: config.circuitOpenDurationMs ?? 300_000,
      halfOpenMaxRequests: config.halfOpenMaxRequests ?? 2,
      baseBackoffMs: config.baseBackoffMs ?? 60_000,
      maxBackoffMs: config.maxBackoffMs ?? 3_600_000,
      globalDailyLimit: config.globalDailyLimit ?? 2_500,
      humanDelayRange: config.humanDelayRange ?? [800, 3_000],
      maxCookieAgeMs: config.maxCookieAgeMs ?? 30 * 24 * 60 * 60 * 1_000,
      softBanThreshold: config.softBanThreshold ?? 3,
    };

    // Initialize per-endpoint budgets
    this.budgets = new Map();
    const endpoints = Object.keys(DEFAULT_BUDGETS) as VoyagerEndpoint[];
    const now = Date.now();
    const dailyReset = nextDayResetMs();

    for (const ep of endpoints) {
      const defaults = DEFAULT_BUDGETS[ep];
      const overrides = this.config.budgets[ep] ?? {};
      this.budgets.set(ep, {
        maxPerMinute: overrides.maxPerMinute ?? defaults.maxPerMinute,
        maxPerDay: overrides.maxPerDay ?? defaults.maxPerDay,
        minIntervalMs: overrides.minIntervalMs ?? defaults.minIntervalMs,
        minuteTokens: overrides.maxPerMinute ?? defaults.maxPerMinute,
        dailyConsumed: 0,
        lastRefillAt: now,
        dailyResetAt: dailyReset,
        lastRequestAt: 0,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Session Management
  // -------------------------------------------------------------------------

  /**
   * Register a LinkedIn session for rotation.
   *
   * @param id        Unique identifier for this session (e.g. account email)
   * @param liAt      The li_at cookie value
   * @param jsessionId The JSESSIONID cookie value (CSRF token)
   */
  addSession(id: string, liAt: string, jsessionId: string): void {
    // Prevent duplicates
    if (this.sessions.some((s) => s.id === id)) {
      throw new Error(`Session "${id}" already registered`);
    }

    this.sessions.push({
      id,
      liAt,
      jsessionId,
      health: "healthy",
      lastActiveAt: isoNow(),
      cookieObtainedAt: isoNow(),
      consecutive429s: 0,
      consecutiveSuccesses: 0,
      dailyRequestCount: 0,
      dailyResetAt: new Date(nextDayResetMs()).toISOString(),
      challengeEncountered: false,
      softBanIndicators: [],
    });
  }

  /** Remove a session (e.g. after permanent restriction). */
  removeSession(id: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (this.activeSessionIndex >= this.sessions.length) {
      this.activeSessionIndex = 0;
    }
  }

  /**
   * Get the best session for the next request.
   * Prioritizes: healthy > degraded. Skips challenged/restricted/expired.
   * Rotates round-robin among healthy sessions.
   */
  private selectSession(): SessionState | null {
    if (this.sessions.length === 0) return null;

    const usable = this.sessions.filter(
      (s) => s.health === "healthy" || s.health === "degraded",
    );
    if (usable.length === 0) return null;

    // Sort: healthy first, then by lowest daily request count (spread load)
    usable.sort((a, b) => {
      if (a.health !== b.health) {
        return a.health === "healthy" ? -1 : 1;
      }
      return a.dailyRequestCount - b.dailyRequestCount;
    });

    // Round-robin among equally healthy sessions
    const healthySessions = usable.filter((s) => s.health === "healthy");
    if (healthySessions.length > 1) {
      this.activeSessionIndex =
        (this.activeSessionIndex + 1) % healthySessions.length;
      return healthySessions[this.activeSessionIndex];
    }

    return usable[0];
  }

  /** Update session cookies (e.g. after re-authentication). */
  refreshSession(id: string, liAt: string, jsessionId: string): void {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) throw new Error(`Session "${id}" not found`);

    session.liAt = liAt;
    session.jsessionId = jsessionId;
    session.cookieObtainedAt = isoNow();
    session.health = "healthy";
    session.consecutive429s = 0;
    session.challengeEncountered = false;
    session.softBanIndicators = [];
  }

  // -------------------------------------------------------------------------
  // Cookie Lifecycle
  // -------------------------------------------------------------------------

  /** Check if a session's cookies are approaching expiry. */
  isCookieStale(session: SessionState): boolean {
    const age = Date.now() - new Date(session.cookieObtainedAt).getTime();
    return age > this.config.maxCookieAgeMs;
  }

  /** Check if a session needs re-authentication based on signals. */
  needsReauth(session: SessionState): boolean {
    return (
      session.health === "expired" ||
      session.health === "challenged" ||
      this.isCookieStale(session)
    );
  }

  // -------------------------------------------------------------------------
  // Token Bucket — Per-Endpoint
  // -------------------------------------------------------------------------

  /** Refill minute-bucket tokens based on elapsed time. */
  private refillTokens(budget: EndpointBudget): void {
    const now = Date.now();
    const elapsed = now - budget.lastRefillAt;
    const refill = (elapsed / 60_000) * budget.maxPerMinute;
    budget.minuteTokens = Math.min(
      budget.maxPerMinute,
      budget.minuteTokens + refill,
    );
    budget.lastRefillAt = now;

    // Daily reset
    if (now >= budget.dailyResetAt) {
      budget.dailyConsumed = 0;
      budget.dailyResetAt = nextDayResetMs();
    }
  }

  /** Consume one token from an endpoint budget. Returns false if exhausted. */
  private consumeToken(endpoint: VoyagerEndpoint): boolean {
    const budget = this.budgets.get(endpoint);
    if (!budget) return false;

    this.refillTokens(budget);

    if (budget.minuteTokens < 1) return false;
    if (budget.dailyConsumed >= budget.maxPerDay) return false;

    budget.minuteTokens -= 1;
    budget.dailyConsumed += 1;
    budget.lastRequestAt = Date.now();
    return true;
  }

  // -------------------------------------------------------------------------
  // Circuit Breaker
  // -------------------------------------------------------------------------

  /** Transition circuit breaker based on current state and timing. */
  private evaluateCircuit(): CircuitState {
    const now = Date.now();

    if (this.circuitState === "open") {
      if (now - this.circuitOpenedAt >= this.config.circuitOpenDurationMs) {
        this.circuitState = "half_open";
        this.halfOpenRequestCount = 0;
      }
    }

    return this.circuitState;
  }

  /** Open the circuit breaker (too many failures). */
  private tripCircuit(): void {
    this.circuitState = "open";
    this.circuitOpenedAt = Date.now();
    this.halfOpenRequestCount = 0;
  }

  /** Record a success — may close a half-open circuit. */
  private circuitSuccess(): void {
    if (this.circuitState === "half_open") {
      this.halfOpenRequestCount += 1;
      if (this.halfOpenRequestCount >= this.config.halfOpenMaxRequests) {
        this.circuitState = "closed";
        this.global429Count = 0;
      }
    }
  }

  /** Record a failure — may trip the circuit. */
  private circuitFailure(): void {
    this.global429Count += 1;
    if (this.global429Count >= this.config.circuitBreakerThreshold) {
      this.tripCircuit();
    }
  }

  // -------------------------------------------------------------------------
  // Acquire — Main Entry Point
  // -------------------------------------------------------------------------

  /**
   * Attempt to acquire permission to make a Voyager API request.
   *
   * Returns either a granted permit with the recommended delay and session
   * to use, or a denial with the reason and suggested retry time.
   *
   * Usage:
   * ```ts
   * const result = limiter.acquire("profile_view");
   * if (!result.granted) {
   *   console.log(`Denied: ${result.reason}, retry in ${result.retryAfterMs}ms`);
   *   return;
   * }
   * await sleep(result.delayMs);
   * const res = await fetch(url, {
   *   headers: buildHeaders(result.session),
   * });
   * limiter.reportOutcome(result.session.id, "profile_view", res.status, res.headers);
   * ```
   */
  acquire(endpoint: VoyagerEndpoint): AcquireResult {
    this.totalRequests += 1;

    // 1. Check circuit breaker
    const circuit = this.evaluateCircuit();
    if (circuit === "open") {
      this.totalDenied += 1;
      const retryAfterMs =
        this.config.circuitOpenDurationMs -
        (Date.now() - this.circuitOpenedAt);
      return {
        granted: false,
        reason: "circuit_open",
        retryAfterMs: Math.max(0, retryAfterMs),
      };
    }

    // 2. Check active backoff
    const now = Date.now();
    if (now < this.backoffUntil) {
      this.totalDenied += 1;
      return {
        granted: false,
        reason: "backoff_active",
        retryAfterMs: this.backoffUntil - now,
      };
    }

    // 3. Select a healthy session
    const session = this.selectSession();
    if (!session) {
      this.totalDenied += 1;
      return {
        granted: false,
        reason: "session_unhealthy",
        retryAfterMs: 60_000,
      };
    }

    // 4. Check session daily limit
    if (session.dailyRequestCount >= this.config.globalDailyLimit) {
      this.totalDenied += 1;
      const resetAt = new Date(session.dailyResetAt).getTime();
      return {
        granted: false,
        reason: "daily_limit_reached",
        retryAfterMs: Math.max(0, resetAt - now),
      };
    }

    // 5. Check per-endpoint budget
    if (!this.consumeToken(endpoint)) {
      this.totalDenied += 1;
      const budget = this.budgets.get(endpoint)!;
      // If daily exhausted, wait until reset; otherwise wait for minute refill
      if (budget.dailyConsumed >= budget.maxPerDay) {
        return {
          granted: false,
          reason: "daily_limit_reached",
          retryAfterMs: Math.max(0, budget.dailyResetAt - now),
        };
      }
      return {
        granted: false,
        reason: "budget_exhausted",
        retryAfterMs: Math.ceil(60_000 / budget.maxPerMinute),
      };
    }

    // 6. In half-open, limit probing requests
    if (
      circuit === "half_open" &&
      this.halfOpenRequestCount >= this.config.halfOpenMaxRequests
    ) {
      this.totalDenied += 1;
      return {
        granted: false,
        reason: "circuit_open",
        retryAfterMs: this.config.circuitOpenDurationMs,
      };
    }

    // 7. Compute human-like delay
    const budget = this.budgets.get(endpoint)!;
    const timeSinceLast = now - budget.lastRequestAt;
    const minInterval = budget.minIntervalMs;
    const humanJitter = humanDelay(this.config.humanDelayRange);

    // Ensure minimum interval plus human-like variance
    let delayMs = 0;
    if (budget.lastRequestAt > 0 && timeSinceLast < minInterval) {
      delayMs = minInterval - timeSinceLast;
    }
    delayMs += humanJitter;

    // Additional delay for degraded sessions (more cautious)
    if (session.health === "degraded") {
      delayMs *= 2;
    }

    return {
      granted: true,
      delayMs: Math.round(delayMs),
      session,
    };
  }

  // -------------------------------------------------------------------------
  // Outcome Reporting — Adaptive Throttling
  // -------------------------------------------------------------------------

  /**
   * Report the outcome of a Voyager API request.
   * Drives adaptive throttling, circuit breaker, and session health.
   *
   * @param sessionId    The session that made the request.
   * @param endpoint     Which endpoint was hit.
   * @param statusCode   HTTP response status.
   * @param headers      Response headers (for Retry-After, challenge detection).
   * @param responseBody Optional response body for deeper signal extraction.
   */
  reportOutcome(
    sessionId: string,
    endpoint: VoyagerEndpoint,
    statusCode: number,
    headers?: Headers | Record<string, string>,
    responseBody?: unknown,
  ): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const getHeader = (name: string): string | null => {
      if (!headers) return null;
      if (headers instanceof Headers) return headers.get(name);
      return (headers as Record<string, string>)[name] ?? null;
    };

    // --- Success ---
    if (statusCode >= 200 && statusCode < 300) {
      session.consecutive429s = 0;
      session.consecutiveSuccesses += 1;
      session.dailyRequestCount += 1;
      session.lastActiveAt = isoNow();
      this.circuitSuccess();

      // Promote degraded sessions back to healthy after sustained success
      if (
        session.health === "degraded" &&
        session.consecutiveSuccesses >= 10
      ) {
        session.health = "healthy";
        session.softBanIndicators = [];
      }

      // Check for soft-ban signals in successful responses
      this.checkSoftBanSignals(session, endpoint, responseBody);
      return;
    }

    // --- Rate Limited (429) ---
    if (statusCode === 429) {
      this.total429s += 1;
      session.consecutive429s += 1;
      session.consecutiveSuccesses = 0;

      // Parse Retry-After header
      const retryAfter = getHeader("retry-after") ?? getHeader("Retry-After");
      let backoffMs: number;

      if (retryAfter) {
        // Retry-After can be seconds or HTTP-date
        const seconds = parseInt(retryAfter, 10);
        backoffMs = isNaN(seconds)
          ? Math.max(0, new Date(retryAfter).getTime() - Date.now())
          : seconds * 1_000;
      } else {
        // No header — exponential backoff with jitter
        backoffMs = expBackoffJitter(
          this.config.baseBackoffMs,
          session.consecutive429s - 1,
          this.config.maxBackoffMs,
        );
      }

      this.backoffUntil = Date.now() + backoffMs;
      this.circuitFailure();

      // Degrade session after repeated 429s
      if (session.consecutive429s >= 2) {
        session.health = "degraded";
      }

      // Severe: likely soft-banned, quarantine session
      if (session.consecutive429s >= 5) {
        session.health = "restricted";
      }

      return;
    }

    // --- Authentication failure (401) ---
    if (statusCode === 401) {
      session.health = "expired";
      session.consecutiveSuccesses = 0;
      return;
    }

    // --- Forbidden / Challenge (403) ---
    if (statusCode === 403) {
      // Check for ChallengeV2 captcha
      const body =
        typeof responseBody === "string"
          ? responseBody
          : JSON.stringify(responseBody ?? "");
      const isChallenge =
        body.includes("challenge") ||
        body.includes("captcha") ||
        body.includes("ChallengeV2");

      if (isChallenge) {
        session.health = "challenged";
        session.challengeEncountered = true;
        session.consecutiveSuccesses = 0;
        // Immediately circuit-break — captcha means the whole IP/session is suspect
        this.tripCircuit();
      } else {
        session.health = "restricted";
        session.consecutiveSuccesses = 0;
      }

      return;
    }

    // --- Server errors (5xx) — not our fault, but back off gently ---
    if (statusCode >= 500) {
      session.consecutiveSuccesses = 0;
      // Brief cooldown, don't degrade session
      this.backoffUntil = Date.now() + 10_000;
    }
  }

  // -------------------------------------------------------------------------
  // Soft-Ban Detection
  // -------------------------------------------------------------------------

  /**
   * Analyze response body for shadow-restriction signals.
   *
   * LinkedIn soft bans often manifest as:
   * - Search returning 0 results where results were expected
   * - Profile views returning 404 for known-good profiles
   * - Connection list returning empty
   * - Response times spiking (server-side throttling)
   */
  private checkSoftBanSignals(
    session: SessionState,
    endpoint: VoyagerEndpoint,
    responseBody: unknown,
  ): void {
    if (!responseBody || typeof responseBody !== "object") return;

    const body = responseBody as Record<string, unknown>;

    // Empty search results
    if (
      (endpoint === "search_people" ||
        endpoint === "search_companies" ||
        endpoint === "search_jobs") &&
      Array.isArray(body.elements) &&
      body.elements.length === 0
    ) {
      this.addSoftBanSignal(session, "empty_search_results");
    }

    // Reduced result counts (LinkedIn returns fewer results under soft ban)
    if (
      endpoint.startsWith("search_") &&
      typeof body.paging === "object" &&
      body.paging !== null
    ) {
      const paging = body.paging as Record<string, unknown>;
      if (typeof paging.total === "number" && paging.total === 0) {
        this.addSoftBanSignal(session, "reduced_result_count");
      }
    }

    // Empty connection list
    if (
      endpoint === "connections" &&
      Array.isArray(body.elements) &&
      body.elements.length === 0
    ) {
      this.addSoftBanSignal(session, "connection_list_empty");
    }
  }

  private addSoftBanSignal(
    session: SessionState,
    type: SoftBanSignal["type"],
  ): void {
    const existing = session.softBanIndicators.find((s) => s.type === type);
    if (existing) {
      existing.count += 1;
      existing.detectedAt = isoNow();
    } else {
      session.softBanIndicators.push({
        type,
        detectedAt: isoNow(),
        count: 1,
      });
    }

    // Degrade session if too many signals
    const totalSignals = session.softBanIndicators.reduce(
      (sum, s) => sum + s.count,
      0,
    );
    if (totalSignals >= this.config.softBanThreshold) {
      session.health = "degraded";
    }
  }

  // -------------------------------------------------------------------------
  // Cool-Down Periods
  // -------------------------------------------------------------------------

  /**
   * Trigger a cool-down period for a specific session.
   * Used when manual inspection reveals suspicious behavior.
   *
   * @param sessionId  Session to cool down.
   * @param durationMs How long to cool down (ms). Default: 4 hours.
   */
  coolDown(sessionId: string, durationMs = 4 * 60 * 60 * 1_000): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    session.health = "degraded";
    // Use backoff mechanism for cool-down
    this.backoffUntil = Math.max(
      this.backoffUntil,
      Date.now() + durationMs,
    );
  }

  /**
   * Force a global cool-down across all sessions.
   * Nuclear option — use after detecting systematic restriction.
   *
   * @param durationMs Default: 24 hours.
   */
  globalCoolDown(durationMs = 24 * 60 * 60 * 1_000): void {
    this.tripCircuit();
    this.backoffUntil = Date.now() + durationMs;
    for (const session of this.sessions) {
      session.health = "degraded";
    }
  }

  // -------------------------------------------------------------------------
  // Request Spacing — Behavioral Stealth
  // -------------------------------------------------------------------------

  /**
   * Compute a human-like delay sequence for a batch of operations.
   * Simulates realistic browsing: fast initial loads, slower on detail pages,
   * occasional pauses (reading time), rare long pauses (tab switch).
   *
   * @param count Number of operations in the batch.
   * @returns Array of delays in ms to wait BEFORE each operation.
   */
  computeBatchDelays(count: number): number[] {
    const delays: number[] = [];

    for (let i = 0; i < count; i++) {
      const roll = Math.random();

      if (roll < 0.05) {
        // 5% chance: long pause (tab switch, reading something else)
        delays.push(Math.round(randRange(15_000, 45_000)));
      } else if (roll < 0.20) {
        // 15% chance: medium pause (reading a profile/post)
        delays.push(Math.round(randRange(5_000, 15_000)));
      } else if (roll < 0.50) {
        // 30% chance: normal navigation delay
        delays.push(Math.round(randRange(2_000, 6_000)));
      } else {
        // 50% chance: quick action (scrolling, clicking)
        delays.push(Math.round(randRange(800, 2_500)));
      }
    }

    // First request in a batch should have a warm-up delay
    if (delays.length > 0) {
      delays[0] = Math.round(randRange(1_500, 4_000));
    }

    return delays;
  }

  /**
   * Validate that an action sequence is plausible for a human user.
   * Detects impossible sequences that would trigger LinkedIn's behavioral ML.
   *
   * @param sequence Ordered list of [endpoint, timestampMs] pairs.
   * @returns List of violations found.
   */
  validateActionSequence(
    sequence: Array<[VoyagerEndpoint, number]>,
  ): string[] {
    const violations: string[] = [];

    for (let i = 1; i < sequence.length; i++) {
      const [prevEp, prevTs] = sequence[i - 1];
      const [currEp, currTs] = sequence[i];
      const gap = currTs - prevTs;

      // Impossible speed: any two actions < 500ms apart
      if (gap < 500) {
        violations.push(
          `Actions ${prevEp} -> ${currEp} only ${gap}ms apart (min 500ms)`,
        );
      }

      // Impossible sequence: viewing profile -> sending message in < 3s
      if (
        prevEp === "profile_view" &&
        currEp === "messaging_send" &&
        gap < 3_000
      ) {
        violations.push(
          `Profile view -> message send in ${gap}ms (min 3000ms to read profile)`,
        );
      }

      // Impossible: search -> profile view in < 1s (need to scan results)
      if (
        prevEp.startsWith("search_") &&
        currEp === "profile_view" &&
        gap < 1_000
      ) {
        violations.push(
          `Search -> profile view in ${gap}ms (min 1000ms to scan results)`,
        );
      }

      // Suspicious: same search endpoint hit repeatedly < 2s apart
      if (prevEp === currEp && prevEp.startsWith("search_") && gap < 2_000) {
        violations.push(
          `Repeated ${prevEp} only ${gap}ms apart (looks like pagination bot)`,
        );
      }
    }

    return violations;
  }

  // -------------------------------------------------------------------------
  // Observability — Health & Metrics
  // -------------------------------------------------------------------------

  /** Get current state of the circuit breaker. */
  getCircuitState(): {
    state: CircuitState;
    openedAt: number | null;
    global429Count: number;
  } {
    return {
      state: this.evaluateCircuit(),
      openedAt: this.circuitState === "closed" ? null : this.circuitOpenedAt,
      global429Count: this.global429Count,
    };
  }

  /** Get health summary for all sessions. */
  getSessionHealth(): Array<{
    id: string;
    health: SessionHealth;
    dailyRequests: number;
    consecutive429s: number;
    cookieAge: string;
    softBanSignals: number;
    needsReauth: boolean;
  }> {
    return this.sessions.map((s) => {
      const cookieAgeMs =
        Date.now() - new Date(s.cookieObtainedAt).getTime();
      const days = Math.floor(cookieAgeMs / (24 * 60 * 60 * 1_000));
      const hours = Math.floor(
        (cookieAgeMs % (24 * 60 * 60 * 1_000)) / (60 * 60 * 1_000),
      );

      return {
        id: s.id,
        health: s.health,
        dailyRequests: s.dailyRequestCount,
        consecutive429s: s.consecutive429s,
        cookieAge: `${days}d ${hours}h`,
        softBanSignals: s.softBanIndicators.reduce(
          (sum, sig) => sum + sig.count,
          0,
        ),
        needsReauth: this.needsReauth(s),
      };
    });
  }

  /** Get per-endpoint budget utilization. */
  getBudgetUtilization(): Array<{
    endpoint: VoyagerEndpoint;
    minuteTokensRemaining: number;
    minuteCapacity: number;
    dailyConsumed: number;
    dailyCapacity: number;
    utilizationPct: number;
  }> {
    const result: Array<{
      endpoint: VoyagerEndpoint;
      minuteTokensRemaining: number;
      minuteCapacity: number;
      dailyConsumed: number;
      dailyCapacity: number;
      utilizationPct: number;
    }> = [];

    for (const [ep, budget] of this.budgets) {
      this.refillTokens(budget);
      result.push({
        endpoint: ep,
        minuteTokensRemaining: Math.round(budget.minuteTokens * 10) / 10,
        minuteCapacity: budget.maxPerMinute,
        dailyConsumed: budget.dailyConsumed,
        dailyCapacity: budget.maxPerDay,
        utilizationPct:
          Math.round((budget.dailyConsumed / budget.maxPerDay) * 1000) / 10,
      });
    }

    return result;
  }

  /** Aggregate metrics. */
  getMetrics(): {
    totalRequests: number;
    totalDenied: number;
    total429s: number;
    denialRate: number;
    activeSessions: number;
    healthySessions: number;
    circuitState: CircuitState;
    backoffRemainingMs: number;
  } {
    const now = Date.now();
    return {
      totalRequests: this.totalRequests,
      totalDenied: this.totalDenied,
      total429s: this.total429s,
      denialRate:
        this.totalRequests > 0
          ? Math.round((this.totalDenied / this.totalRequests) * 1000) / 10
          : 0,
      activeSessions: this.sessions.filter(
        (s) => s.health === "healthy" || s.health === "degraded",
      ).length,
      healthySessions: this.sessions.filter((s) => s.health === "healthy")
        .length,
      circuitState: this.evaluateCircuit(),
      backoffRemainingMs: Math.max(0, this.backoffUntil - now),
    };
  }

  // -------------------------------------------------------------------------
  // HTTP Header Builder — Convenience
  // -------------------------------------------------------------------------

  /**
   * Build request headers for a Voyager API call.
   * Includes all necessary cookies, CSRF token, and realistic browser headers.
   *
   * @param session The session to use (from acquire result).
   * @returns Headers object ready for fetch().
   */
  static buildHeaders(session: SessionState): Record<string, string> {
    // JSESSIONID is stored with surrounding quotes by LinkedIn;
    // the csrf-token header must strip them.
    const csrfToken = session.jsessionId.replace(/^"|"$/g, "");

    return {
      // Authentication
      Cookie: `li_at=${session.liAt}; JSESSIONID="${session.jsessionId}"`,
      "csrf-token": csrfToken,

      // Voyager API contract
      Accept: "application/vnd.linkedin.normalized+json+2.1",
      "x-li-lang": "en_US",
      "x-li-track": JSON.stringify({
        clientVersion: "1.13.8878",
        mpVersion: "1.13.8878",
        osName: "web",
        timezoneOffset: -1,
        timezone: "Europe/Amsterdam",
        deviceFormFactor: "DESKTOP",
        mpName: "voyager-web",
      }),
      "x-li-page-instance": `urn:li:page:d_flagship3_profile_view_base;${crypto.randomUUID()}`,

      // Browser fingerprint mimicry
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "sec-ch-ua": '"Chromium";v="125", "Not.A/Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      Referer: "https://www.linkedin.com/feed/",
    };
  }

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  /** Reset all state (for testing or fresh start). */
  reset(): void {
    this.circuitState = "closed";
    this.circuitOpenedAt = 0;
    this.halfOpenRequestCount = 0;
    this.global429Count = 0;
    this.backoffUntil = 0;
    this.totalRequests = 0;
    this.totalDenied = 0;
    this.total429s = 0;

    const now = Date.now();
    const dailyReset = nextDayResetMs();
    for (const [, budget] of this.budgets) {
      budget.minuteTokens = budget.maxPerMinute;
      budget.dailyConsumed = 0;
      budget.lastRefillAt = now;
      budget.dailyResetAt = dailyReset;
      budget.lastRequestAt = 0;
    }

    for (const session of this.sessions) {
      session.health = "healthy";
      session.consecutive429s = 0;
      session.consecutiveSuccesses = 0;
      session.dailyRequestCount = 0;
      session.dailyResetAt = new Date(dailyReset).toISOString();
      session.challengeEncountered = false;
      session.softBanIndicators = [];
    }
  }
}

// ---------------------------------------------------------------------------
// Safe Usage Guidelines (exported as documentation constants)
// ---------------------------------------------------------------------------

/**
 * Recommended safe usage patterns based on empirical observation.
 * These are conservative estimates to minimize account risk.
 */
export const SAFE_USAGE_GUIDELINES = {
  /** Max profile views per session before rotating. */
  maxProfileViewsPerSession: 25,

  /** Max search queries per session before rotating. */
  maxSearchesPerSession: 15,

  /** Max messages per session before rotating. */
  maxMessagesPerSession: 10,

  /** Minimum session duration to appear human (ms). 20 min. */
  minSessionDurationMs: 20 * 60 * 1_000,

  /** Maximum session duration before voluntary cool-down (ms). 2 hours. */
  maxSessionDurationMs: 2 * 60 * 60 * 1_000,

  /** Cool-down between sessions on the same account (ms). 4 hours. */
  interSessionCoolDownMs: 4 * 60 * 60 * 1_000,

  /** Maximum daily requests across all sessions for one account. */
  maxDailyPerAccount: 500,

  /** Hours of the day (UTC) to avoid activity (sleeping hours for account locale). */
  avoidHoursUtc: [0, 1, 2, 3, 4, 5] as readonly number[],

  /** Maximum accounts to rotate through per IP address. */
  maxAccountsPerIp: 3,

  /** IP rotation: minimum distinct IPs for heavy scraping. */
  minDistinctIps: 5,

  /** Time to wait after a ChallengeV2 before retrying (ms). 24 hours. */
  postChallengeWaitMs: 24 * 60 * 60 * 1_000,

  /** Time to wait after a soft ban detection (ms). 12 hours. */
  postSoftBanWaitMs: 12 * 60 * 60 * 1_000,

  /** Maximum consecutive days of automated activity before a rest day. */
  maxConsecutiveActiveDays: 5,
} as const;

/**
 * IP rotation considerations:
 *
 * 1. Residential proxies preferred over datacenter (LinkedIn checks IP reputation)
 * 2. Sticky sessions: same IP for entire session duration (IP changes mid-session
 *    trigger immediate challenge)
 * 3. Geographic consistency: IP should match account's declared location
 * 4. Max 3 accounts per residential IP per day
 * 5. Datacenter IPs (AWS, GCP, Azure ranges) are flagged immediately
 * 6. Mobile carrier IPs (CGNAT) are most trusted but hardest to obtain
 * 7. VPN IPs: many are blocklisted, test before committing
 * 8. Rate of IP rotation matters: switching every request = instant flag
 * 9. Prefer rotating per session (every 1-2 hours), not per request
 * 10. Monitor IP reputation via services like IPQualityScore
 */
