/**
 * LinkedIn Voyager Remote Work Classification
 *
 * Maps LinkedIn/Voyager API fields to the codebase remote_policy encoding:
 *   0 = unknown
 *   1 = full_remote
 *   2 = hybrid
 *   3 = onsite
 *
 * Covers: f_WT search param, WorkplaceType enum, workRemoteAllowed boolean,
 * workplaceTypesResolutionResults, location string heuristics, geographic
 * restrictions, freshness timestamps, and reposted job detection.
 */

// ---------------------------------------------------------------------------
// Core remote policy — matches crates/metal/src/similarity/filter.rs VectorMeta
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// LinkedIn f_WT search parameter values
// ---------------------------------------------------------------------------

/**
 * LinkedIn Jobs Search URL filter: `f_WT` (Workplace Type).
 * Used in both browser URLs (`/jobs/search/?f_WT=2`) and Voyager queries
 * (`selectedFilters:(workplaceType:List(2))`).
 */
export const F_WT = {
  ONSITE: "1",
  REMOTE: "2",
  HYBRID: "3",
} as const;

export type FwtValue = (typeof F_WT)[keyof typeof F_WT];

/** Map f_WT search parameter to remote_policy. */
export function fwtToRemotePolicy(fwt: string): RemotePolicy {
  switch (fwt) {
    case F_WT.ONSITE:
      return REMOTE_POLICY.ONSITE;
    case F_WT.REMOTE:
      return REMOTE_POLICY.FULL_REMOTE;
    case F_WT.HYBRID:
      return REMOTE_POLICY.HYBRID;
    default:
      return REMOTE_POLICY.UNKNOWN;
  }
}

// ---------------------------------------------------------------------------
// Voyager WorkplaceType enum (returned in jobPostingData / jobCardUnion)
// ---------------------------------------------------------------------------

/**
 * `com.linkedin.voyager.jobs.WorkplaceType` values returned in
 * Voyager job search responses and individual job detail payloads.
 *
 * Appears in two locations:
 *   1. `jobPostingData.workplaceTypes[]` — array of enum strings
 *   2. `workplaceTypesResolutionResults` — decorated object with resolved metadata
 */
export type VoyagerWorkplaceType = "ONSITE" | "REMOTE" | "HYBRID";

/** Map Voyager WorkplaceType enum to remote_policy. */
export function workplaceTypeToRemotePolicy(wt: VoyagerWorkplaceType): RemotePolicy {
  switch (wt) {
    case "REMOTE":
      return REMOTE_POLICY.FULL_REMOTE;
    case "HYBRID":
      return REMOTE_POLICY.HYBRID;
    case "ONSITE":
      return REMOTE_POLICY.ONSITE;
    default:
      return REMOTE_POLICY.UNKNOWN;
  }
}

// ---------------------------------------------------------------------------
// Geographic restriction detection
// ---------------------------------------------------------------------------

/**
 * LinkedIn geoId values for broad "worldwide" / continental filters.
 *
 * geoId=92000000 is the LinkedIn meta-geoId for "Worldwide".
 * Used in the Voyager query `locationUnion:(geoId:92000000)` and in
 * the browser URL `&geoId=92000000`.
 *
 * Existing usage: company-browsing.ts line 414 and 477.
 */
export const GEO_ID = {
  WORLDWIDE: "92000000",
  // Major country-level geoIds used for restriction detection
  UNITED_STATES: "103644278",
  UNITED_KINGDOM: "101165590",
  CANADA: "101174742",
  GERMANY: "101282230",
  FRANCE: "105015875",
  NETHERLANDS: "102890719",
  INDIA: "102713980",
  AUSTRALIA: "101452733",
  IRELAND: "104738515",
  SWITZERLAND: "106693272",
  SPAIN: "105646813",
  SWEDEN: "105117694",
  POLAND: "105072130",
  PORTUGAL: "100364837",
  EUROPEAN_UNION: "91000000",
} as const;

export type GeoId = string;

/**
 * Remote geographic scope — finer than remote_policy.
 *
 * Distinguishes "remote anywhere" from "remote in US only" from
 * "remote in EU" — the Voyager API encodes this through geoId
 * restrictions, location strings, and the now-deprecated
 * `workRemoteAllowed` boolean.
 */
export type RemoteGeoScope =
  | "worldwide"           // No geographic restriction
  | "country_restricted"  // Remote but limited to specific country/region
  | "region_restricted"   // Remote within a multi-country region (EU, EMEA, etc.)
  | "unspecified";        // Remote but no geo data to determine scope

// ---------------------------------------------------------------------------
// Voyager response types
// ---------------------------------------------------------------------------

/**
 * Subset of a Voyager job posting as returned by:
 *   GET /voyager/api/voyagerJobsDashJobCards
 *   GET /voyager/api/jobs/jobPostings/{id}
 *
 * Fields are cherry-picked for remote classification; the full Voyager
 * payload has hundreds of fields we do not need.
 */
export interface VoyagerJobPosting {
  /** LinkedIn job ID — numeric string like "3847291056". */
  jobPostingId: string;

  /**
   * Structured workplace type from the `WorkplaceType` enum.
   * Primary signal. Array because LinkedIn allows multi-select
   * (rare; a job tagged both REMOTE and HYBRID is treated as HYBRID).
   */
  workplaceTypes?: VoyagerWorkplaceType[];

  /**
   * Legacy boolean from pre-2022 API versions.
   * `true` meant "remote allowed" but did not distinguish full vs. hybrid.
   * Voyager still returns it on some endpoints; treat as supplementary.
   */
  workRemoteAllowed?: boolean;

  /**
   * Decorated resolution of workplace types — contains localized label
   * and sometimes additional metadata about geographic scope.
   * Present in collection endpoints with the `-227` decoration.
   */
  workplaceTypesResolutionResults?: Record<
    string, // URN like "urn:li:fs_workplaceType:2"
    {
      localizedName: string;  // "Remote", "On-site", "Hybrid"
      workplaceType: VoyagerWorkplaceType;
    }
  >;

  /** Human-readable location string, e.g. "San Francisco, CA (Remote)". */
  formattedLocation?: string;

  /**
   * Location union — structured geographic data.
   * May contain geoId pointing to a specific country or to 92000000 (Worldwide).
   */
  locationUnion?: {
    geoId?: string;
    countryCode?: string;
  };

  /**
   * Unix timestamp (ms) when the job was first posted.
   * Used for freshness scoring.
   */
  listedAt?: number;

  /**
   * Unix timestamp (ms) of the original listing if this is a repost.
   * When present, `listedAt` reflects the repost date and
   * `originalListedAt` is the true first-posted date.
   */
  originalListedAt?: number;

  /**
   * Present and `true` when the posting has been reposted by the employer.
   * Reposted jobs reset their `listedAt` but retain `originalListedAt`.
   */
  repostedJob?: boolean;

  /** Job title — useful for location-in-title heuristic. */
  title?: string;

  /** Company URN — `urn:li:fsd_company:12345`. */
  companyUrn?: string;
}

/**
 * Normalized Voyager job search response paging.
 * Matches the shape returned by the `-227` decorated collection.
 */
export interface VoyagerJobSearchPaging {
  count: number;
  start: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Location string heuristics
// ---------------------------------------------------------------------------

/**
 * Patterns in `formattedLocation` that signal full remote.
 * LinkedIn appends "(Remote)" or "Remote" to the location field when
 * the job is tagged as remote in structured data.
 */
export const FULL_REMOTE_LOCATION_RE =
  /\(remote\)$|\bfully remote\b|\bremote[\s-]*first\b|\b100% remote\b|\bwork from anywhere\b|\banywhere\b/i;

/**
 * Patterns that indicate the remote flag is country-scoped.
 * "Remote in United States" or "United States (Remote)" are
 * different from bare "(Remote)".
 */
export const COUNTRY_REMOTE_RE =
  /\bremote\s+in\s+(?:the\s+)?(?:united states|usa|us|uk|canada|germany|france|netherlands|india|australia|ireland|switzerland)\b/i;

/**
 * Patterns indicating region-scoped remote (EU, EMEA, APAC).
 */
export const REGION_REMOTE_RE =
  /\bremote\s+(?:in\s+)?(?:eu|europe|emea|apac|latam|eea)\b|\b(?:eu|europe|emea|apac|latam|eea)\s+remote\b/i;

/**
 * Extract remote classification from a `formattedLocation` string.
 *
 * LinkedIn formats the location differently depending on the
 * WorkplaceType structured data:
 *   - Onsite: "San Francisco, CA"
 *   - Hybrid: "San Francisco, CA (Hybrid)"
 *   - Remote: "San Francisco, CA (Remote)" or just "Remote"
 *   - Country-scoped remote: "United States (Remote)"
 *   - Worldwide remote: "Anywhere" or "(Remote)"
 */
export function classifyLocationString(location: string): {
  policy: RemotePolicy;
  geoScope: RemoteGeoScope;
} {
  if (!location) {
    return { policy: REMOTE_POLICY.UNKNOWN, geoScope: "unspecified" };
  }

  const lower = location.toLowerCase();

  if (/\bhybrid\b/i.test(lower)) {
    return { policy: REMOTE_POLICY.HYBRID, geoScope: "unspecified" };
  }

  if (FULL_REMOTE_LOCATION_RE.test(lower)) {
    // Determine geo scope from the location text
    if (/\banywhere\b|\bworldwide\b|\bglobal\b/i.test(lower)) {
      return { policy: REMOTE_POLICY.FULL_REMOTE, geoScope: "worldwide" };
    }
    if (REGION_REMOTE_RE.test(lower)) {
      return { policy: REMOTE_POLICY.FULL_REMOTE, geoScope: "region_restricted" };
    }
    if (COUNTRY_REMOTE_RE.test(lower)) {
      return { policy: REMOTE_POLICY.FULL_REMOTE, geoScope: "country_restricted" };
    }
    // "(Remote)" with a city/state prefix means company-specific location
    // but remote work is allowed — still full remote but scope unclear
    if (/^[A-Z]/.test(location) && /\(remote\)$/i.test(location)) {
      return { policy: REMOTE_POLICY.FULL_REMOTE, geoScope: "country_restricted" };
    }
    return { policy: REMOTE_POLICY.FULL_REMOTE, geoScope: "unspecified" };
  }

  // No remote signal in location — likely onsite
  // But we only call this "onsite" if we see positive onsite signals
  if (/\bon[\s-]?site\b|\bin[\s-]?office\b|\bmust relocate\b/i.test(lower)) {
    return { policy: REMOTE_POLICY.ONSITE, geoScope: "unspecified" };
  }

  return { policy: REMOTE_POLICY.UNKNOWN, geoScope: "unspecified" };
}

// ---------------------------------------------------------------------------
// Geographic restriction resolver
// ---------------------------------------------------------------------------

/**
 * Determine geographic scope of a remote job from Voyager data.
 *
 * Combines geoId, countryCode, and formattedLocation to determine
 * whether a remote job is truly worldwide or restricted to a country/region.
 *
 * LinkedIn does NOT have a single "worldwide remote" boolean.
 * Instead, employers choose a geoId when posting. Jobs with geoId=92000000
 * (Worldwide) are closest to "remote worldwide". Jobs with a country geoId
 * plus WorkplaceType=REMOTE mean "remote within that country".
 */
export function resolveRemoteGeoScope(posting: VoyagerJobPosting): RemoteGeoScope {
  // 1. Check geoId first — most reliable structured signal
  const geoId = posting.locationUnion?.geoId;
  if (geoId === GEO_ID.WORLDWIDE) {
    return "worldwide";
  }
  if (geoId === GEO_ID.EUROPEAN_UNION) {
    return "region_restricted";
  }
  if (geoId && geoId !== GEO_ID.WORLDWIDE) {
    return "country_restricted";
  }

  // 2. Fall back to location string analysis
  if (posting.formattedLocation) {
    const { geoScope } = classifyLocationString(posting.formattedLocation);
    return geoScope;
  }

  return "unspecified";
}

// ---------------------------------------------------------------------------
// Freshness scoring
// ---------------------------------------------------------------------------

/**
 * Job freshness classification.
 *
 * LinkedIn Voyager timestamps:
 *   - `listedAt`: when the job appears in search results (repost date if reposted)
 *   - `originalListedAt`: first posting date (only present if reposted)
 *   - `repostedJob`: boolean flag for reposts
 *
 * Reposted jobs inflate their apparent freshness. The true age is from
 * `originalListedAt` when available, otherwise `listedAt`.
 */
export interface FreshnessInfo {
  /** True first-posted timestamp (ms). Prefers originalListedAt if available. */
  trueListedAt: number;
  /** Display timestamp (ms). Always listedAt (or originalListedAt as fallback). */
  displayListedAt: number;
  /** Age in days from trueListedAt. */
  ageDays: number;
  /** Whether this job was reposted. */
  isRepost: boolean;
  /** Freshness tier for filtering/ranking. */
  tier: "fresh" | "recent" | "aging" | "stale";
}

/**
 * Calculate job freshness from Voyager timestamps.
 *
 * @param posting Voyager job posting with timestamp fields
 * @param now     Current time in ms (defaults to Date.now())
 */
export function calculateFreshness(
  posting: Pick<VoyagerJobPosting, "listedAt" | "originalListedAt" | "repostedJob">,
  now?: number,
): FreshnessInfo | null {
  const currentTime = now ?? Date.now();
  const displayListedAt = posting.listedAt ?? posting.originalListedAt;

  if (!displayListedAt) return null;

  const isRepost = posting.repostedJob === true || (
    posting.originalListedAt !== undefined &&
    posting.listedAt !== undefined &&
    posting.originalListedAt < posting.listedAt
  );

  const trueListedAt = posting.originalListedAt ?? posting.listedAt ?? displayListedAt;
  const ageDays = (currentTime - trueListedAt) / (1000 * 60 * 60 * 24);

  let tier: FreshnessInfo["tier"];
  if (ageDays <= 3) tier = "fresh";
  else if (ageDays <= 14) tier = "recent";
  else if (ageDays <= 30) tier = "aging";
  else tier = "stale";

  return { trueListedAt, displayListedAt, ageDays, isRepost, tier };
}

// ---------------------------------------------------------------------------
// Main classifier
// ---------------------------------------------------------------------------

/**
 * Comprehensive classification result combining structured Voyager data,
 * location heuristics, geographic scope, and freshness.
 */
export interface VoyagerRemoteClassification {
  /** Codebase-standard remote policy: 0=unknown, 1=full_remote, 2=hybrid, 3=onsite. */
  remotePolicy: RemotePolicy;
  /** Human-readable label matching crates/metal enum. */
  remotePolicyLabel: string;
  /** Geographic scope of remote work. */
  geoScope: RemoteGeoScope;
  /** Freshness info (null if no timestamps). */
  freshness: FreshnessInfo | null;
  /** Which signals were used to make the classification decision. */
  signals: ClassificationSignal[];
  /** Classification confidence: 0.0-1.0. */
  confidence: number;
}

export type ClassificationSignal =
  | "workplaceTypes"
  | "workRemoteAllowed"
  | "workplaceTypesResolutionResults"
  | "formattedLocation"
  | "geoId"
  | "repostedJob"
  | "none";

/**
 * Classify a Voyager job posting into the codebase remote_policy encoding.
 *
 * Signal priority (highest to lowest):
 *   1. `workplaceTypes[]` — structured enum, most reliable
 *   2. `workplaceTypesResolutionResults` — decorated resolution, same data
 *   3. `workRemoteAllowed` — legacy boolean, supplementary
 *   4. `formattedLocation` — text heuristic, fallback
 *
 * When `workplaceTypes` contains multiple values (rare edge case), the
 * most restrictive wins: HYBRID beats REMOTE, ONSITE beats HYBRID.
 * This matches LinkedIn's own behavior where a multi-tagged job appears
 * under all applicable filters.
 *
 * @param posting  Voyager job posting data (partial is fine)
 * @param now      Current time in ms for freshness calculation
 */
export function classifyVoyagerJob(
  posting: VoyagerJobPosting,
  now?: number,
): VoyagerRemoteClassification {
  const signals: ClassificationSignal[] = [];
  let remotePolicy: RemotePolicy = REMOTE_POLICY.UNKNOWN;
  let geoScope: RemoteGeoScope = "unspecified";
  let confidence = 0;

  // ── Signal 1: workplaceTypes (structured enum) ──────────────────────
  if (posting.workplaceTypes && posting.workplaceTypes.length > 0) {
    signals.push("workplaceTypes");

    // When multiple types present, use most restrictive
    // Priority: ONSITE (3) > HYBRID (2) > REMOTE (1)
    const policies = posting.workplaceTypes.map(workplaceTypeToRemotePolicy);
    remotePolicy = Math.max(...policies) as RemotePolicy;

    // If it resolved to REMOTE (1) but had HYBRID too, it's HYBRID
    if (policies.includes(REMOTE_POLICY.HYBRID)) {
      remotePolicy = REMOTE_POLICY.HYBRID;
    }

    confidence = 0.95;
  }

  // ── Signal 2: workplaceTypesResolutionResults ───────────────────────
  if (
    remotePolicy === REMOTE_POLICY.UNKNOWN &&
    posting.workplaceTypesResolutionResults
  ) {
    signals.push("workplaceTypesResolutionResults");

    const resolved = Object.values(posting.workplaceTypesResolutionResults);
    if (resolved.length > 0) {
      const policies = resolved.map((r) => workplaceTypeToRemotePolicy(r.workplaceType));
      remotePolicy = Math.max(...policies) as RemotePolicy;
      if (policies.includes(REMOTE_POLICY.HYBRID)) {
        remotePolicy = REMOTE_POLICY.HYBRID;
      }
      confidence = 0.90;
    }
  }

  // ── Signal 3: workRemoteAllowed (legacy boolean) ────────────────────
  if (remotePolicy === REMOTE_POLICY.UNKNOWN && posting.workRemoteAllowed !== undefined) {
    signals.push("workRemoteAllowed");

    // workRemoteAllowed=true is ambiguous between full_remote and hybrid.
    // Without additional context, map to hybrid (conservative).
    // The Rust kernel uses the same heuristic: bare "remote" -> hybrid.
    // See crates/metal/src/kernel/job_ner.rs:197
    remotePolicy = posting.workRemoteAllowed
      ? REMOTE_POLICY.HYBRID
      : REMOTE_POLICY.ONSITE;

    confidence = 0.60;
  }

  // ── Signal 4: formattedLocation (text heuristic) ────────────────────
  if (remotePolicy === REMOTE_POLICY.UNKNOWN && posting.formattedLocation) {
    signals.push("formattedLocation");
    const loc = classifyLocationString(posting.formattedLocation);
    remotePolicy = loc.policy;
    geoScope = loc.geoScope;
    confidence = remotePolicy !== REMOTE_POLICY.UNKNOWN ? 0.50 : 0;
  }

  // ── No signal ───────────────────────────────────────────────────────
  if (signals.length === 0) {
    signals.push("none");
  }

  // ── Geo scope resolution ────────────────────────────────────────────
  if (remotePolicy === REMOTE_POLICY.FULL_REMOTE || remotePolicy === REMOTE_POLICY.HYBRID) {
    const resolvedScope = resolveRemoteGeoScope(posting);
    if (resolvedScope !== "unspecified") {
      geoScope = resolvedScope;
      if (!signals.includes("geoId") && posting.locationUnion?.geoId) {
        signals.push("geoId");
      }
    }
  }

  // ── Freshness ───────────────────────────────────────────────────────
  const freshness = calculateFreshness(posting, now);
  if (freshness?.isRepost) {
    signals.push("repostedJob");
  }

  return {
    remotePolicy,
    remotePolicyLabel: REMOTE_POLICY_LABELS[remotePolicy],
    geoScope,
    freshness,
    signals,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Voyager URL builders
// ---------------------------------------------------------------------------

/**
 * Build a LinkedIn Jobs Search URL for remote jobs at a specific company.
 * Matches the existing pattern in company-browsing.ts.
 *
 * @param companyNumericId  LinkedIn numeric company ID
 * @param geoId            Geographic filter (default: worldwide)
 */
export function buildRemoteJobSearchUrl(
  companyNumericId: string,
  geoId: GeoId = GEO_ID.WORLDWIDE,
): string {
  return `https://www.linkedin.com/jobs/search/?f_C=${companyNumericId}&f_WT=${F_WT.REMOTE}&geoId=${geoId}`;
}

/**
 * Build a Voyager API query string for remote jobs at a specific company.
 * Matches the existing pattern in company-browsing.ts:countRemoteJobsViaVoyager.
 *
 * @param companyNumericId  LinkedIn numeric company ID
 * @param geoId            Geographic filter (default: worldwide)
 * @param count            Number of results per page
 * @param start            Pagination offset
 */
export function buildVoyagerJobSearchUrl(
  companyNumericId: string,
  geoId: GeoId = GEO_ID.WORLDWIDE,
  count = 25,
  start = 0,
): string {
  const url = new URL(
    "https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards",
  );
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",
  );
  url.searchParams.set("count", String(count));
  url.searchParams.set("q", "jobSearch");
  url.searchParams.set(
    "query",
    `(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(company:List(${companyNumericId}),workplaceType:List(${F_WT.REMOTE})),spellCorrectionEnabled:true)`,
  );
  url.searchParams.set("locationUnion", `(geoId:${geoId})`);
  url.searchParams.set("start", String(start));
  return url.toString();
}

/**
 * Build a Voyager API URL for remote jobs in a specific country.
 * Combines f_WT=2 (remote) with a country geoId.
 *
 * This is the key mechanism for answering "remote jobs available to country X":
 * LinkedIn resolves geoId to include jobs that explicitly list that country
 * as an allowed remote location, plus worldwide-remote jobs.
 *
 * @param geoId            Country geoId (e.g., GEO_ID.GERMANY)
 * @param keywords         Optional job search keywords
 * @param count            Results per page
 * @param start            Pagination offset
 */
export function buildCountryRemoteSearchUrl(
  geoId: GeoId,
  keywords?: string,
  count = 25,
  start = 0,
): string {
  const url = new URL(
    "https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards",
  );
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",
  );
  url.searchParams.set("count", String(count));
  url.searchParams.set("q", "jobSearch");

  const filters = keywords
    ? `(origin:JOB_SEARCH_PAGE_JOB_FILTER,keywords:${encodeURIComponent(keywords)},selectedFilters:(workplaceType:List(${F_WT.REMOTE})),spellCorrectionEnabled:true)`
    : `(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(workplaceType:List(${F_WT.REMOTE})),spellCorrectionEnabled:true)`;

  url.searchParams.set("query", filters);
  url.searchParams.set("locationUnion", `(geoId:${geoId})`);
  url.searchParams.set("start", String(start));
  return url.toString();
}

// ---------------------------------------------------------------------------
// Batch classification helper
// ---------------------------------------------------------------------------

/**
 * Classify an array of Voyager job postings and partition by remote scope.
 * Useful for pipeline stages that need to separate worldwide-remote from
 * country-restricted remote jobs.
 */
export function classifyBatch(
  postings: VoyagerJobPosting[],
  now?: number,
): {
  worldwide: VoyagerRemoteClassification[];
  countryRestricted: VoyagerRemoteClassification[];
  regionRestricted: VoyagerRemoteClassification[];
  nonRemote: VoyagerRemoteClassification[];
  unknown: VoyagerRemoteClassification[];
} {
  const result = {
    worldwide: [] as VoyagerRemoteClassification[],
    countryRestricted: [] as VoyagerRemoteClassification[],
    regionRestricted: [] as VoyagerRemoteClassification[],
    nonRemote: [] as VoyagerRemoteClassification[],
    unknown: [] as VoyagerRemoteClassification[],
  };

  for (const posting of postings) {
    const classification = classifyVoyagerJob(posting, now);

    if (classification.remotePolicy === REMOTE_POLICY.ONSITE) {
      result.nonRemote.push(classification);
    } else if (classification.remotePolicy === REMOTE_POLICY.UNKNOWN) {
      result.unknown.push(classification);
    } else if (classification.geoScope === "worldwide") {
      result.worldwide.push(classification);
    } else if (classification.geoScope === "country_restricted") {
      result.countryRestricted.push(classification);
    } else if (classification.geoScope === "region_restricted") {
      result.regionRestricted.push(classification);
    } else {
      // remote or hybrid but scope unspecified — treat as country-restricted (conservative)
      result.countryRestricted.push(classification);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Voyager response normalizer
// ---------------------------------------------------------------------------

/**
 * Extract VoyagerJobPosting fields from a raw Voyager normalized+json response.
 *
 * Voyager's `application/vnd.linkedin.normalized+json+2.1` format nests
 * entities in an `included[]` array with `$type` discriminators.
 * This function extracts and normalizes the job posting data we need.
 */
export function extractJobPostingsFromVoyagerResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
): VoyagerJobPosting[] {
  if (!raw?.included || !Array.isArray(raw.included)) return [];

  const postings: VoyagerJobPosting[] = [];

  for (const entity of raw.included) {
    const type = entity["$type"] || entity["$recipeType"] || "";

    // Match job posting entities
    if (
      !type.includes("JobPosting") &&
      !type.includes("jobPosting") &&
      !type.includes("JobCard")
    ) {
      continue;
    }

    // Extract jobPostingId from entityUrn or trackingUrn
    const urn =
      entity.entityUrn ||
      entity.trackingUrn ||
      entity["*jobPosting"] ||
      "";
    const idMatch = urn.match(/(\d{5,})/);
    if (!idMatch) continue;

    const posting: VoyagerJobPosting = {
      jobPostingId: idMatch[1],
    };

    // workplaceTypes — structured enum array
    if (Array.isArray(entity.workplaceTypes)) {
      posting.workplaceTypes = entity.workplaceTypes;
    }
    // Sometimes nested under jobPostingData
    if (Array.isArray(entity.jobPostingData?.workplaceTypes)) {
      posting.workplaceTypes = entity.jobPostingData.workplaceTypes;
    }

    // workRemoteAllowed — legacy boolean
    if (typeof entity.workRemoteAllowed === "boolean") {
      posting.workRemoteAllowed = entity.workRemoteAllowed;
    }
    if (typeof entity.jobPostingData?.workRemoteAllowed === "boolean") {
      posting.workRemoteAllowed = entity.jobPostingData.workRemoteAllowed;
    }

    // workplaceTypesResolutionResults
    if (entity.workplaceTypesResolutionResults) {
      posting.workplaceTypesResolutionResults =
        entity.workplaceTypesResolutionResults;
    }

    // formattedLocation
    if (entity.formattedLocation) {
      posting.formattedLocation = entity.formattedLocation;
    }
    if (entity.jobPostingData?.formattedLocation) {
      posting.formattedLocation = entity.jobPostingData.formattedLocation;
    }

    // locationUnion
    if (entity.locationUnion) {
      posting.locationUnion = {
        geoId: entity.locationUnion.geoId,
        countryCode: entity.locationUnion.countryCode,
      };
    }

    // Timestamps
    if (typeof entity.listedAt === "number") {
      posting.listedAt = entity.listedAt;
    }
    if (typeof entity.originalListedAt === "number") {
      posting.originalListedAt = entity.originalListedAt;
    }
    if (typeof entity.repostedJob === "boolean") {
      posting.repostedJob = entity.repostedJob;
    }

    // Title and company
    if (entity.title) posting.title = entity.title;
    if (entity.companyUrn) posting.companyUrn = entity.companyUrn;

    postings.push(posting);
  }

  return postings;
}
