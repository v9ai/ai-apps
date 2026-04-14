/**
 * LinkedIn Voyager Jobs API Client
 *
 * Covers job recommendations, alerts, saved jobs, application tracking,
 * notification preferences, profile-match scoring, and Easy Apply detection.
 *
 * Authentication: all requests piggyback the browser session via the
 * JSESSIONID cookie, sent as a `csrf-token` header.  The extension
 * must declare `cookies` permission for `https://www.linkedin.com`.
 *
 * Response shapes:  LinkedIn returns two flavours —
 *   Shape A  "normalized"   → top-level `included[]` + `data.elements[]` with URN refs
 *   Shape B  "direct"       → top-level `elements[]` with inline data
 * Both are handled where applicable.
 */

// ────────────────────────────────────────────────────────────────────
// 0. Constants & Auth
// ────────────────────────────────────────────────────────────────────

const VOYAGER_BASE = "https://www.linkedin.com/voyager/api";

const COMMON_HEADERS = {
  "x-restli-protocol-version": "2.0.0",
  Accept: "application/vnd.linkedin.normalized+json+2.1",
} as const;

/** Decoration IDs observed in the wild (subject to LinkedIn versioning). */
const DECORATION = {
  /** Full job search card with company, location, applicant count, Easy Apply flag. */
  JOB_SEARCH_CARD:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCard-227",
  /** Lighter card used for "Jobs you might be interested in" feed. */
  JOB_RECOMMENDATION_CARD:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCard-203",
  /** Saved-jobs list decoration. */
  SAVED_JOB_CARD:
    "com.linkedin.voyager.dash.deco.jobs.SavedJob-14",
  /** Applied-jobs tracking decoration. */
  APPLIED_JOB_CARD:
    "com.linkedin.voyager.dash.deco.jobs.AppliedJob-16",
  /** Job alert / saved-search decoration. */
  JOB_ALERT:
    "com.linkedin.voyager.dash.deco.jobs.JobAlert-24",
  /** Full job posting detail (used for match score and Easy Apply detection). */
  JOB_POSTING_DETAIL:
    "com.linkedin.voyager.dash.deco.jobs.JobPosting-87",
  /** Job cards collection (used for paging metadata). */
  JOB_SEARCH_CARDS_COLLECTION:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",
} as const;

/**
 * Read the JSESSIONID cookie and strip surrounding quotes.
 * Throws if the user is not logged in to LinkedIn.
 */
async function getCsrfToken(): Promise<string> {
  const cookie = await chrome.cookies.get({
    url: "https://www.linkedin.com",
    name: "JSESSIONID",
  });
  if (!cookie?.value) {
    throw new VoyagerAuthError(
      "Not logged into LinkedIn — JSESSIONID cookie not found",
    );
  }
  return cookie.value.replace(/^"|"$/g, "");
}

// ────────────────────────────────────────────────────────────────────
// 1. Error types
// ────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────
// 2. Core types — Voyager response shapes
// ────────────────────────────────────────────────────────────────────

/** LinkedIn URN string, e.g. "urn:li:fsd_jobPosting:12345". */
export type LinkedInUrn = string;

export interface VoyagerPaging {
  count: number;
  start: number;
  total: number;
  /** Links for cursor-based pagination (present on some endpoints). */
  links?: Array<{ rel: string; href: string }>;
}

/** Wrapper used by most Voyager list endpoints. */
export interface VoyagerCollectionResponse<T> {
  paging: VoyagerPaging;
  elements: T[];
  /** Normalized shape — referenced entities live here. */
  included?: VoyagerIncludedEntity[];
}

/**
 * Union of entity shapes that appear in `included[]`.
 * The `$type` discriminator tells you which fields are populated.
 */
export interface VoyagerIncludedEntity {
  $type: string;
  entityUrn?: LinkedInUrn;
  [key: string]: unknown;
}

// ────────────────────────────────────────────────────────────────────
// 3. Job Card / Posting types
// ────────────────────────────────────────────────────────────────────

/** Workplace type enum used in Voyager filters. */
export type WorkplaceType =
  | "1" // On-site
  | "2" // Remote
  | "3"; // Hybrid

/** Experience level seniority codes. */
export type ExperienceLevel =
  | "1" // Internship
  | "2" // Entry level
  | "3" // Associate
  | "4" // Mid-Senior level
  | "5" // Director
  | "6"; // Executive

/** Job posting apply method — the key signal for Easy Apply detection. */
export type ApplyMethod =
  | "IN_APP"         // Easy Apply (application stays on LinkedIn)
  | "EXTERNAL"       // Redirects to company ATS
  | "COMPLEX_APPLY"  // Multi-step LinkedIn apply (rare)
  | "OFFSITE";       // Alias sometimes seen for EXTERNAL

export interface VoyagerJobCompany {
  entityUrn: LinkedInUrn;
  name: string;
  universalName?: string; // slug, e.g. "anthropic"
  logo?: {
    image?: { rootUrl: string; artifacts: Array<{ fileIdentifyingUrlPathSegment: string }> };
  };
  url?: string;
}

export interface VoyagerJobLocation {
  /** Human-readable, e.g. "San Francisco, CA (Remote)". */
  formattedLocation: string;
  /** Geo URN for programmatic filtering. */
  geoUrn?: LinkedInUrn;
}

export interface VoyagerJobInsight {
  /** e.g. "10 applicants", "Be an early applicant", "3 connections work here". */
  text: string;
  insightType?: string;
}

export interface VoyagerSkillMatch {
  /** Skill name (normalized by LinkedIn). */
  skill: string;
  /** Whether the viewer's profile lists this skill. */
  matched: boolean;
}

/**
 * Job-profile match assessment shown as "X% match" on LinkedIn.
 *
 * LinkedIn computes this server-side based on:
 *   - skills overlap (your skills vs. job required/preferred skills)
 *   - title similarity (your recent titles vs. job title)
 *   - industry/function alignment
 *   - location/workplace-type fit
 *   - experience level bracket
 *
 * The score is NOT a simple Jaccard — it uses a proprietary weighted model.
 * The `howYouMatch` sub-object breaks down the contributing factors.
 */
export interface VoyagerJobMatchRating {
  /** Overall match, 0-100 (the percentage shown in the UI). */
  profileFitScore?: number;
  /** Human-readable label, e.g. "Good match". */
  profileFitLabel?: string;
  /** Breakdown of why you match / don't match. */
  howYouMatch?: {
    /** Skills the job requires that you have. */
    matchedSkills: VoyagerSkillMatch[];
    /** Skills the job requires that you lack. */
    missingSkills: VoyagerSkillMatch[];
    /** Title similarity assessment. */
    titleMatch?: { matched: boolean; explanation: string };
    /** Location / remote fit. */
    locationMatch?: { matched: boolean; explanation: string };
    /** Experience level fit. */
    experienceMatch?: { matched: boolean; explanation: string };
  };
}

/** A single job card as returned by search / recommendation endpoints. */
export interface VoyagerJobCard {
  entityUrn: LinkedInUrn;
  /** Numeric job posting ID extracted from the URN. */
  jobPostingId: string;
  title: string;
  /** Company that posted the job. */
  company: VoyagerJobCompany;
  /** Primary location string. */
  formattedLocation: string;
  /** Detailed location with geo URN. */
  location?: VoyagerJobLocation;
  /** "LISTED" | "CLOSED" | "EXPIRED". */
  state: string;
  /** ISO 8601 timestamp. */
  listedAt: string;
  /** Seconds since epoch (LinkedIn's native format). */
  listedAtTimestamp?: number;
  /** Workplace type. */
  workplaceType?: "REMOTE" | "ON_SITE" | "HYBRID";
  /** Employment type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP". */
  employmentType?: string;
  /** Experience level label. */
  experienceLevel?: string;
  /** Number of applicants (approximate). */
  applicantCount?: number;
  /** Insight strings (applicant count, connections, etc.). */
  insights?: VoyagerJobInsight[];
  /** Salary info when disclosed. */
  formattedSalary?: string;
  /** Whether the job supports Easy Apply. */
  easyApply: boolean;
  /** Detailed apply method. */
  applyMethod?: ApplyMethod;
  /** External apply URL (only when applyMethod is EXTERNAL). */
  externalApplyUrl?: string;
  /** Profile-job match rating (only populated on recommendation / detail endpoints). */
  matchRating?: VoyagerJobMatchRating;
  /** Whether the viewer has already saved this job. */
  saved?: boolean;
  /** Whether the viewer has already applied. */
  applied?: boolean;
  /** Job description HTML snippet (truncated in list views). */
  descriptionSnippet?: string;
  /** Tracking URN used by LinkedIn analytics. */
  trackingUrn?: LinkedInUrn;
}

// ────────────────────────────────────────────────────────────────────
// 4. Job Alert / Saved Search types
// ────────────────────────────────────────────────────────────────────

/** Frequency for job alert notifications. */
export type AlertFrequency =
  | "DAILY"
  | "WEEKLY"
  | "NONE"; // effectively paused

/** A single saved search / job alert. */
export interface VoyagerJobAlert {
  entityUrn: LinkedInUrn;
  alertId: string;
  /** User-visible name (auto-generated from search params or custom). */
  title: string;
  /** The saved search query that triggers the alert. */
  savedSearchQuery: VoyagerSavedSearchQuery;
  /** How often LinkedIn emails the user. */
  frequency: AlertFrequency;
  /** Alert channel: "EMAIL" | "PUSH" | "BOTH" | "NONE". */
  notificationChannel: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-modified timestamp. */
  modifiedAt: string;
  /** Number of new jobs since last viewed. */
  newJobCount?: number;
  /** Whether the alert is currently active. */
  active: boolean;
}

/** Filters encoded in a saved search. */
export interface VoyagerSavedSearchQuery {
  keywords?: string;
  locationUnion?: {
    geoId?: string;
    geoUrn?: LinkedInUrn;
  };
  /** Selected filter values — keys match LinkedIn's filter taxonomy. */
  selectedFilters: {
    /** Company URNs. */
    company?: string[];
    /** Workplace type codes. */
    workplaceType?: WorkplaceType[];
    /** Experience level codes. */
    experience?: ExperienceLevel[];
    /** Job function URNs. */
    function?: string[];
    /** Industry URNs. */
    industry?: string[];
    /** Date posted: "r86400" (24h), "r604800" (week), "r2592000" (month). */
    timePostedRange?: string[];
    /** Salary range bucket. */
    salaryBucketV2?: string[];
    /** "true" to filter Easy Apply only. */
    applyWithLinkedin?: string[];
    /** Job type codes: "F" (full-time), "P" (part-time), "C" (contract), etc. */
    jobType?: string[];
    /** Title URNs for title-based filtering. */
    title?: string[];
    /** Distance radius in miles. */
    distance?: string[];
    /** "1" for "Under 10 applicants". */
    easyApply?: string[];
  };
  origin?: string;
  spellCorrectionEnabled?: boolean;
}

/** Payload for creating a new job alert (POST body). */
export interface CreateJobAlertPayload {
  /** Keywords / job title search string. */
  keywords?: string;
  /** Geo ID for location (92000000 = Worldwide). */
  geoId?: string;
  /** Filter selections. */
  selectedFilters: VoyagerSavedSearchQuery["selectedFilters"];
  /** Notification frequency. */
  frequency: AlertFrequency;
  /** Notification channel preference. */
  notificationChannel?: "EMAIL" | "PUSH" | "BOTH";
  /** Origin tag for analytics. */
  origin?: string;
}

/** Payload for updating an existing alert (PATCH body). */
export interface UpdateJobAlertPayload {
  frequency?: AlertFrequency;
  notificationChannel?: "EMAIL" | "PUSH" | "BOTH" | "NONE";
  active?: boolean;
}

// ────────────────────────────────────────────────────────────────────
// 5. Saved Jobs types
// ────────────────────────────────────────────────────────────────────

export interface VoyagerSavedJob {
  entityUrn: LinkedInUrn;
  savedAt: string; // ISO 8601
  jobPosting: VoyagerJobCard;
  /** Notes the user attached (if any). */
  note?: string;
}

// ────────────────────────────────────────────────────────────────────
// 6. Application Tracking types
// ────────────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "APPLIED"
  | "VIEWED"         // recruiter viewed your application
  | "CONTACTED"      // recruiter messaged you
  | "INTERVIEWING"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN"
  | "ARCHIVED";

export interface VoyagerJobApplication {
  entityUrn: LinkedInUrn;
  applicationId: string;
  jobPosting: VoyagerJobCard;
  /** Timestamp of application submission. */
  appliedAt: string;
  /** Last status update timestamp. */
  lastUpdatedAt: string;
  /** Current application status. */
  status: ApplicationStatus;
  /** Whether this was an Easy Apply submission. */
  easyApply: boolean;
  /** Resume used (URN reference). */
  resumeUrn?: LinkedInUrn;
  /** Answers submitted for screening questions. */
  screeningQuestionAnswers?: Array<{
    question: string;
    answer: string;
  }>;
}

// ────────────────────────────────────────────────────────────────────
// 7. Notification Preferences types
// ────────────────────────────────────────────────────────────────────

export interface VoyagerJobNotificationPreferences {
  /** Master toggle for all job notification emails. */
  jobSearchEmailEnabled: boolean;
  /** Alert digest frequency. */
  alertDigestFrequency: AlertFrequency;
  /** "Recommended jobs" email frequency. */
  recommendedJobsFrequency: AlertFrequency;
  /** Push notification for new jobs matching alerts. */
  pushNotificationsEnabled: boolean;
  /** "Application viewed" notification. */
  applicationViewedNotification: boolean;
  /** "Similar jobs" after applying notification. */
  similarJobsAfterApplyNotification: boolean;
  /** Resume download notification (when recruiter downloads). */
  resumeDownloadNotification: boolean;
}

// ────────────────────────────────────────────────────────────────────
// 8. Job Search Filter types (for recommendations query)
// ────────────────────────────────────────────────────────────────────

export interface JobSearchFilters {
  keywords?: string;
  /** Geo ID (92000000 = Worldwide, 103644278 = US, 91000000 = EU). */
  geoId?: string;
  /** Workplace type codes. */
  workplaceType?: WorkplaceType[];
  /** Experience level codes. */
  experience?: ExperienceLevel[];
  /** Company numeric IDs. */
  company?: string[];
  /** Date posted filter. "r86400" = past 24h, "r604800" = past week. */
  timePostedRange?: string;
  /** Job type codes: "F", "P", "C", "T" (temp), "I" (internship), "V" (volunteer). */
  jobType?: string[];
  /** Filter to Easy Apply only. */
  easyApplyOnly?: boolean;
  /** Salary bucket. */
  salaryBucketV2?: string;
  /** Industry URNs. */
  industry?: string[];
  /** Job function URNs. */
  function?: string[];
  /** Title URNs. */
  title?: string[];
  /** Distance in miles from geo center. */
  distance?: string;
  /** Sort order. */
  sortBy?: "RELEVANCE" | "DATE_POSTED";
}

// ────────────────────────────────────────────────────────────────────
// 9. Internal helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Execute an authenticated Voyager request. Handles CSRF, common headers,
 * and maps HTTP error codes to typed exceptions.
 */
async function voyagerFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const csrfToken = await getCsrfToken();
  const url = path.startsWith("http") ? path : `${VOYAGER_BASE}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  const res = await fetch(url, {
    ...options,
    headers: {
      "csrf-token": csrfToken,
      ...COMMON_HEADERS,
      ...(options.headers ?? {}),
    },
    credentials: "include",
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (res.status === 401 || res.status === 403) {
    throw new VoyagerAuthError(
      `LinkedIn session expired or forbidden (${res.status})`,
    );
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    throw new VoyagerRateLimitError(
      retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000,
    );
  }
  if (res.status === 204) {
    return undefined as unknown as T; // DELETE success
  }
  if (!res.ok) {
    throw new VoyagerApiError(res.status, res.statusText);
  }

  return res.json() as Promise<T>;
}

/**
 * Build the `query` param string used by LinkedIn's RestLI-style endpoints.
 * Produces syntax like: `(origin:JOB_SEARCH_PAGE,selectedFilters:(workplaceType:List(2),...))`
 */
function buildSearchQuery(
  filters: JobSearchFilters,
  origin = "JOB_SEARCH_PAGE_JOB_FILTER",
): string {
  const parts: string[] = [`origin:${origin}`];
  const filterParts: string[] = [];

  if (filters.workplaceType?.length) {
    filterParts.push(
      `workplaceType:List(${filters.workplaceType.join(",")})`,
    );
  }
  if (filters.experience?.length) {
    filterParts.push(
      `experience:List(${filters.experience.join(",")})`,
    );
  }
  if (filters.company?.length) {
    filterParts.push(`company:List(${filters.company.join(",")})`);
  }
  if (filters.timePostedRange) {
    filterParts.push(
      `timePostedRange:List(${filters.timePostedRange})`,
    );
  }
  if (filters.jobType?.length) {
    filterParts.push(`jobType:List(${filters.jobType.join(",")})`);
  }
  if (filters.easyApplyOnly) {
    filterParts.push("applyWithLinkedin:List(true)");
  }
  if (filters.salaryBucketV2) {
    filterParts.push(
      `salaryBucketV2:List(${filters.salaryBucketV2})`,
    );
  }
  if (filters.industry?.length) {
    filterParts.push(
      `industry:List(${filters.industry.join(",")})`,
    );
  }
  if (filters.function?.length) {
    filterParts.push(
      `function:List(${filters.function.join(",")})`,
    );
  }
  if (filters.title?.length) {
    filterParts.push(`title:List(${filters.title.join(",")})`);
  }
  if (filters.distance) {
    filterParts.push(`distance:List(${filters.distance})`);
  }
  if (filters.sortBy) {
    filterParts.push(`sortBy:List(${filters.sortBy})`);
  }

  if (filterParts.length > 0) {
    parts.push(`selectedFilters:(${filterParts.join(",")})`);
  }
  parts.push("spellCorrectionEnabled:true");

  return `(${parts.join(",")})`;
}

/**
 * Parse a Voyager normalized response into an array of job cards.
 * Handles both `included[]` and direct `elements[]` shapes.
 */
function parseJobCards(data: Record<string, unknown>): VoyagerJobCard[] {
  const cards: VoyagerJobCard[] = [];
  const included = (data.included ?? []) as Record<string, unknown>[];
  const elements = (data.elements ?? []) as Record<string, unknown>[];

  // Build lookup from included entities (profiles, companies, etc.)
  const entityMap = new Map<string, Record<string, unknown>>();
  for (const item of included) {
    const urn = item.entityUrn as string | undefined;
    if (urn) entityMap.set(urn, item);
  }

  // Find job posting entities — they have $type containing "JobPosting" or "JobSearchCard"
  const jobEntities = included.filter(
    (e) =>
      typeof e.$type === "string" &&
      (e.$type.includes("JobPosting") || e.$type.includes("JobSearchCard")),
  );

  // If no job-like included entities, fall back to top-level elements
  const source = jobEntities.length > 0 ? jobEntities : elements;

  for (const item of source) {
    const card = parseOneJobCard(item, entityMap);
    if (card) cards.push(card);
  }

  return cards;
}

/**
 * Resolve a single raw entity into a VoyagerJobCard.
 */
function parseOneJobCard(
  item: Record<string, unknown>,
  entityMap: Map<string, Record<string, unknown>>,
): VoyagerJobCard | null {
  const entityUrn = (item.entityUrn ?? item.jobPostingUrn ?? "") as string;
  if (!entityUrn) return null;

  // Extract numeric ID from URN like "urn:li:fsd_jobPosting:12345"
  const idMatch = entityUrn.match(/(\d+)$/);
  if (!idMatch) return null;

  const title = (item.title ?? item.jobPostingTitle ?? "") as string;
  if (!title) return null;

  // Resolve company — might be inline or a URN reference
  let company: VoyagerJobCompany = {
    entityUrn: "",
    name: "Unknown",
  };
  const companyRef = item.companyUrn ?? item.company;
  if (typeof companyRef === "string" && entityMap.has(companyRef)) {
    const c = entityMap.get(companyRef)!;
    company = {
      entityUrn: companyRef,
      name: (c.name ?? "Unknown") as string,
      universalName: c.universalName as string | undefined,
      url: c.url as string | undefined,
    };
  } else if (typeof companyRef === "object" && companyRef !== null) {
    const c = companyRef as Record<string, unknown>;
    company = {
      entityUrn: (c.entityUrn ?? "") as string,
      name: (c.name ?? "Unknown") as string,
      universalName: c.universalName as string | undefined,
      url: c.url as string | undefined,
    };
  } else if (typeof item.companyName === "string") {
    company = { entityUrn: "", name: item.companyName };
  }

  // Easy Apply detection
  const applyingInfo = item.applyingInfo as Record<string, unknown> | undefined;
  const applyMethod = (item.applyMethod ?? applyingInfo?.applyMethod ?? "") as string;
  const easyApply =
    applyMethod === "IN_APP" ||
    applyMethod === "COMPLEX_APPLY" ||
    (item.easyApply === true) ||
    (typeof item.applyingInfo === "object" && applyingInfo?.easyApplyUrl != null);

  // Match rating
  let matchRating: VoyagerJobMatchRating | undefined;
  const jobInsight = item.jobInsight ?? item.insightResponse;
  if (typeof jobInsight === "object" && jobInsight !== null) {
    const ji = jobInsight as Record<string, unknown>;
    if (ji.profileFitScore != null || ji.howYouMatch != null) {
      matchRating = {
        profileFitScore: ji.profileFitScore as number | undefined,
        profileFitLabel: ji.profileFitLabel as string | undefined,
        howYouMatch: ji.howYouMatch as VoyagerJobMatchRating["howYouMatch"],
      };
    }
  }

  // Listed timestamp
  let listedAt = "";
  let listedAtTimestamp: number | undefined;
  if (typeof item.listedAt === "number") {
    listedAtTimestamp = item.listedAt as number;
    listedAt = new Date(listedAtTimestamp).toISOString();
  } else if (typeof item.listedAt === "string") {
    listedAt = item.listedAt as string;
  }

  return {
    entityUrn,
    jobPostingId: idMatch[1],
    title,
    company,
    formattedLocation: (item.formattedLocation ?? item.locationName ?? "") as string,
    location: item.location
      ? {
          formattedLocation: ((item.location as Record<string, unknown>).formattedLocation ?? "") as string,
          geoUrn: (item.location as Record<string, unknown>).geoUrn as string | undefined,
        }
      : undefined,
    state: (item.state ?? item.jobState ?? "LISTED") as string,
    listedAt,
    listedAtTimestamp,
    workplaceType: normalizeWorkplaceType(item.workplaceType ?? item.workRemoteAllowed),
    employmentType: item.employmentType as string | undefined,
    experienceLevel: item.experienceLevel as string | undefined,
    applicantCount: item.applicantCount as number | undefined,
    formattedSalary: (item.formattedSalary ?? (item.salaryInsight as Record<string, unknown> | undefined)?.formattedSalary) as string | undefined,
    easyApply,
    applyMethod: (applyMethod || undefined) as ApplyMethod | undefined,
    externalApplyUrl: (applyingInfo?.externalApplyUrl ??
      item.externalApplyUrl) as string | undefined,
    matchRating,
    saved: item.saved as boolean | undefined,
    applied: item.applied as boolean | undefined,
    descriptionSnippet: item.description as string | undefined,
    trackingUrn: item.trackingUrn as string | undefined,
  };
}

function normalizeWorkplaceType(
  raw: unknown,
): VoyagerJobCard["workplaceType"] {
  if (raw === true || raw === "REMOTE" || raw === 2 || raw === "2")
    return "REMOTE";
  if (raw === "ON_SITE" || raw === 1 || raw === "1") return "ON_SITE";
  if (raw === "HYBRID" || raw === 3 || raw === "3") return "HYBRID";
  return undefined;
}

// ────────────────────────────────────────────────────────────────────
// 10. Client methods — Job Recommendations
// ────────────────────────────────────────────────────────────────────

/**
 * Fetch recommended jobs (the "Jobs you might be interested in" feed).
 *
 * GET /voyager/api/voyagerJobsDashJobCards
 *   ?decorationId=...JobSearchCard-203
 *   &q=jobRecommendation
 *   &count=25&start=0
 *
 * LinkedIn generates recommendations based on:
 *   - Your profile headline, skills, and experience
 *   - Past job searches and views
 *   - Saved jobs and alerts
 *   - Profile-job match model (see VoyagerJobMatchRating)
 */
export async function getRecommendedJobs(
  options: {
    count?: number;
    start?: number;
  } = {},
): Promise<{ jobs: VoyagerJobCard[]; paging: VoyagerPaging }> {
  const { count = 25, start = 0 } = options;

  const url = new URL(`${VOYAGER_BASE}/voyagerJobsDashJobCards`);
  url.searchParams.set("decorationId", DECORATION.JOB_RECOMMENDATION_CARD);
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));
  url.searchParams.set("q", "jobRecommendation");

  const data = await voyagerFetch<Record<string, unknown>>(url.toString());
  const paging = (data.paging ?? (data.data as Record<string, unknown> | undefined)?.paging ?? { count, start, total: 0 }) as VoyagerPaging;

  return { jobs: parseJobCards(data), paging };
}

/**
 * Search jobs with filters — the main search endpoint.
 *
 * GET /voyager/api/voyagerJobsDashJobCards
 *   ?decorationId=...JobSearchCardsCollection-227
 *   &q=jobSearch
 *   &query=(origin:...,selectedFilters:(...))
 *   &keywords=...
 *   &locationUnion=(geoId:...)
 *   &count=25&start=0
 */
export async function searchJobs(
  filters: JobSearchFilters,
  options: {
    count?: number;
    start?: number;
  } = {},
): Promise<{ jobs: VoyagerJobCard[]; paging: VoyagerPaging }> {
  const { count = 25, start = 0 } = options;

  const url = new URL(`${VOYAGER_BASE}/voyagerJobsDashJobCards`);
  url.searchParams.set(
    "decorationId",
    DECORATION.JOB_SEARCH_CARDS_COLLECTION,
  );
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));
  url.searchParams.set("q", "jobSearch");
  url.searchParams.set("query", buildSearchQuery(filters));

  if (filters.keywords) {
    url.searchParams.set("keywords", filters.keywords);
  }
  if (filters.geoId) {
    url.searchParams.set("locationUnion", `(geoId:${filters.geoId})`);
  }

  const data = await voyagerFetch<Record<string, unknown>>(url.toString());
  const paging = (data.paging ?? (data.data as Record<string, unknown> | undefined)?.paging ?? { count, start, total: 0 }) as VoyagerPaging;

  return { jobs: parseJobCards(data), paging };
}

/**
 * Fetch "Jobs you might be interested in" — the feed endpoint.
 *
 * GET /voyager/api/voyagerJobsDashJobRecommendations
 *   ?decorationId=...JobSearchCard-203
 *   &count=25&start=0
 *
 * This is a distinct endpoint from getRecommendedJobs — it powers the
 * feed widget on the LinkedIn homepage, typically returning a shorter,
 * more curated list based on recent activity.
 */
export async function getJobRecommendationsFeed(
  options: {
    count?: number;
    start?: number;
  } = {},
): Promise<{ jobs: VoyagerJobCard[]; paging: VoyagerPaging }> {
  const { count = 10, start = 0 } = options;

  const url = new URL(
    `${VOYAGER_BASE}/voyagerJobsDashJobRecommendations`,
  );
  url.searchParams.set("decorationId", DECORATION.JOB_RECOMMENDATION_CARD);
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));
  url.searchParams.set("q", "recommended");

  const data = await voyagerFetch<Record<string, unknown>>(url.toString());
  const paging = (data.paging ?? (data.data as Record<string, unknown> | undefined)?.paging ?? { count, start, total: 0 }) as VoyagerPaging;

  return { jobs: parseJobCards(data), paging };
}

// ────────────────────────────────────────────────────────────────────
// 11. Client methods — Job Detail & Match Score
// ────────────────────────────────────────────────────────────────────

/**
 * Fetch full job posting detail including match score and Easy Apply detection.
 *
 * GET /voyager/api/jobs/jobPostings/{jobPostingId}
 *   ?decorationId=...JobPosting-87
 *
 * This is where you get the authoritative Easy Apply flag and the
 * full profile-match breakdown.
 */
export async function getJobPostingDetail(
  jobPostingId: string,
): Promise<VoyagerJobCard & { fullDescription: string }> {
  const url = new URL(
    `${VOYAGER_BASE}/jobs/jobPostings/${jobPostingId}`,
  );
  url.searchParams.set("decorationId", DECORATION.JOB_POSTING_DETAIL);

  const data = await voyagerFetch<Record<string, unknown>>(url.toString());

  // Detail endpoint returns a single entity, not a collection
  const included = (data.included ?? []) as Record<string, unknown>[];
  const entityMap = new Map<string, Record<string, unknown>>();
  for (const item of included) {
    const urn = item.entityUrn as string | undefined;
    if (urn) entityMap.set(urn, item);
  }

  // The root entity is either in data.data or directly in data
  const root = (data.data ?? data) as Record<string, unknown>;
  const card = parseOneJobCard(root, entityMap);

  if (!card) {
    throw new VoyagerApiError(404, `Job posting ${jobPostingId} not found or not parseable`);
  }

  return {
    ...card,
    fullDescription: ((root.description as Record<string, unknown> | undefined)?.text ?? root.descriptionText ?? root.description ?? "") as string,
  };
}

/**
 * Detect whether a job is Easy Apply or External Apply.
 *
 * Shortcut that fetches only the apply info for a job posting.
 *
 * GET /voyager/api/jobs/jobPostings/{id}/applyMethod
 */
export async function detectApplyMethod(
  jobPostingId: string,
): Promise<{
  easyApply: boolean;
  applyMethod: ApplyMethod;
  externalUrl?: string;
  /** Screening questions present (Easy Apply multi-step). */
  hasScreeningQuestions: boolean;
}> {
  const detail = await getJobPostingDetail(jobPostingId);
  return {
    easyApply: detail.easyApply,
    applyMethod: detail.applyMethod ?? (detail.easyApply ? "IN_APP" : "EXTERNAL"),
    externalUrl: detail.externalApplyUrl,
    hasScreeningQuestions: detail.applyMethod === "COMPLEX_APPLY",
  };
}

/**
 * Get the profile-job match score (the "X% match" percentage).
 *
 * GET /voyager/api/voyagerJobsDashJobPostingMatchInsights
 *   ?jobPostingUrn=urn:li:fsd_jobPosting:{id}
 *
 * Score components (weighted proprietary model):
 *   1. Skills overlap      — strongest signal (~40%)
 *   2. Title similarity    — headline + recent titles (~25%)
 *   3. Industry alignment  — industry codes on profile vs job (~15%)
 *   4. Location fit        — geo + remote preference (~10%)
 *   5. Experience bracket  — years + seniority level (~10%)
 */
export async function getJobMatchScore(
  jobPostingId: string,
): Promise<VoyagerJobMatchRating> {
  const url = new URL(
    `${VOYAGER_BASE}/voyagerJobsDashJobPostingMatchInsights`,
  );
  url.searchParams.set(
    "jobPostingUrn",
    `urn:li:fsd_jobPosting:${jobPostingId}`,
  );

  const data = await voyagerFetch<Record<string, unknown>>(url.toString());

  // The insight is either top-level or nested in data
  const insight = (data.data ?? data) as Record<string, unknown>;
  const elements = (insight.elements ?? []) as Record<string, unknown>[];
  const primary = elements[0] ?? insight;

  return {
    profileFitScore: primary.profileFitScore as number | undefined,
    profileFitLabel: primary.profileFitLabel as string | undefined,
    howYouMatch: primary.howYouMatch
      ? {
          matchedSkills: ((primary.howYouMatch as Record<string, unknown>).matchedSkills ?? []) as VoyagerSkillMatch[],
          missingSkills: ((primary.howYouMatch as Record<string, unknown>).missingSkills ?? []) as VoyagerSkillMatch[],
          titleMatch: (primary.howYouMatch as Record<string, unknown>).titleMatch as
            | { matched: boolean; explanation: string }
            | undefined,
          locationMatch: (primary.howYouMatch as Record<string, unknown>).locationMatch as
            | { matched: boolean; explanation: string }
            | undefined,
          experienceMatch: (primary.howYouMatch as Record<string, unknown>).experienceMatch as
            | { matched: boolean; explanation: string }
            | undefined,
        }
      : undefined,
  };
}

// ────────────────────────────────────────────────────────────────────
// 12. Client methods — Job Alerts (Saved Searches)
// ────────────────────────────────────────────────────────────────────

/**
 * List all job alerts (saved searches).
 *
 * GET /voyager/api/voyagerJobsDashJobAlerts
 *   ?decorationId=...JobAlert-24
 *   &q=alerts
 *   &count=50&start=0
 */
export async function listJobAlerts(
  options: { count?: number; start?: number } = {},
): Promise<{ alerts: VoyagerJobAlert[]; paging: VoyagerPaging }> {
  const { count = 50, start = 0 } = options;

  const url = new URL(`${VOYAGER_BASE}/voyagerJobsDashJobAlerts`);
  url.searchParams.set("decorationId", DECORATION.JOB_ALERT);
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));
  url.searchParams.set("q", "alerts");

  const data = await voyagerFetch<VoyagerCollectionResponse<Record<string, unknown>>>(
    url.toString(),
  );

  const alerts: VoyagerJobAlert[] = (data.elements ?? []).map((el) => ({
    entityUrn: (el.entityUrn ?? "") as string,
    alertId: ((el.entityUrn ?? "") as string).match(/(\d+)$/)?.[1] ?? "",
    title: (el.title ?? el.searchTitle ?? "") as string,
    savedSearchQuery: (el.savedSearchQuery ?? el.searchQuery ?? {
      selectedFilters: {},
    }) as VoyagerSavedSearchQuery,
    frequency: (el.frequency ?? el.alertFrequency ?? "DAILY") as AlertFrequency,
    notificationChannel: (el.notificationChannel ?? "EMAIL") as string,
    createdAt: typeof el.createdAt === "number"
      ? new Date(el.createdAt as number).toISOString()
      : (el.createdAt ?? "") as string,
    modifiedAt: typeof el.modifiedAt === "number"
      ? new Date(el.modifiedAt as number).toISOString()
      : (el.modifiedAt ?? "") as string,
    newJobCount: el.newJobCount as number | undefined,
    active: (el.active ?? el.enabled ?? true) as boolean,
  }));

  return { alerts, paging: data.paging };
}

/**
 * Create a new job alert (saved search).
 *
 * POST /voyager/api/voyagerJobsDashJobAlerts
 *
 * Body: RestLI-style JSON with the saved search params.
 * LinkedIn auto-generates the alert title from the keywords + filters.
 */
export async function createJobAlert(
  payload: CreateJobAlertPayload,
): Promise<VoyagerJobAlert> {
  // Build the RestLI-compatible body
  const body = {
    savedSearch: {
      searchParams: {
        keywords: payload.keywords ?? "",
        locationUnion: payload.geoId
          ? { geoId: payload.geoId }
          : undefined,
        selectedFilters: payload.selectedFilters,
        origin: payload.origin ?? "JOB_SEARCH_PAGE_JOB_FILTER",
        spellCorrectionEnabled: true,
      },
    },
    alertFrequency: payload.frequency,
    notificationChannel: payload.notificationChannel ?? "EMAIL",
  };

  const data = await voyagerFetch<Record<string, unknown>>(
    "/voyagerJobsDashJobAlerts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return {
    entityUrn: (data.entityUrn ?? (data.value as Record<string, unknown> | undefined)?.entityUrn ?? "") as string,
    alertId:
      ((data.entityUrn ?? (data.value as Record<string, unknown> | undefined)?.entityUrn ?? "") as string).match(
        /(\d+)$/,
      )?.[1] ?? "",
    title: (data.title ?? payload.keywords ?? "") as string,
    savedSearchQuery: {
      keywords: payload.keywords,
      locationUnion: payload.geoId
        ? { geoId: payload.geoId }
        : undefined,
      selectedFilters: payload.selectedFilters,
      origin: payload.origin,
      spellCorrectionEnabled: true,
    },
    frequency: payload.frequency,
    notificationChannel: payload.notificationChannel ?? "EMAIL",
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    active: true,
  };
}

/**
 * Update an existing job alert.
 *
 * PATCH /voyager/api/voyagerJobsDashJobAlerts/{alertUrn}
 */
export async function updateJobAlert(
  alertUrn: LinkedInUrn,
  payload: UpdateJobAlertPayload,
): Promise<void> {
  await voyagerFetch(`/voyagerJobsDashJobAlerts/${encodeURIComponent(alertUrn)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patch: {
        $set: {
          ...(payload.frequency != null && {
            alertFrequency: payload.frequency,
          }),
          ...(payload.notificationChannel != null && {
            notificationChannel: payload.notificationChannel,
          }),
          ...(payload.active != null && { active: payload.active }),
        },
      },
    }),
  });
}

/**
 * Delete a job alert.
 *
 * DELETE /voyager/api/voyagerJobsDashJobAlerts/{alertUrn}
 */
export async function deleteJobAlert(alertUrn: LinkedInUrn): Promise<void> {
  await voyagerFetch(
    `/voyagerJobsDashJobAlerts/${encodeURIComponent(alertUrn)}`,
    { method: "DELETE" },
  );
}

// ────────────────────────────────────────────────────────────────────
// 13. Client methods — Saved Jobs
// ────────────────────────────────────────────────────────────────────

/**
 * List saved (bookmarked) jobs.
 *
 * GET /voyager/api/voyagerJobsDashSavedJobs
 *   ?decorationId=...SavedJob-14
 *   &q=savedJobs
 *   &count=25&start=0
 */
export async function listSavedJobs(
  options: { count?: number; start?: number } = {},
): Promise<{ savedJobs: VoyagerSavedJob[]; paging: VoyagerPaging }> {
  const { count = 25, start = 0 } = options;

  const url = new URL(`${VOYAGER_BASE}/voyagerJobsDashSavedJobs`);
  url.searchParams.set("decorationId", DECORATION.SAVED_JOB_CARD);
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));
  url.searchParams.set("q", "savedJobs");

  const data = await voyagerFetch<Record<string, unknown>>(url.toString());
  const paging = (data.paging ?? { count, start, total: 0 }) as VoyagerPaging;

  const included = (data.included ?? []) as Record<string, unknown>[];
  const entityMap = new Map<string, Record<string, unknown>>();
  for (const item of included) {
    const urn = item.entityUrn as string | undefined;
    if (urn) entityMap.set(urn, item);
  }

  const elements = (data.elements ?? []) as Record<string, unknown>[];
  const savedJobs: VoyagerSavedJob[] = elements
    .map((el) => {
      const jobRef = el.jobPosting ?? el.jobPostingUrn;
      let jobCard: VoyagerJobCard | null = null;

      if (typeof jobRef === "string" && entityMap.has(jobRef)) {
        jobCard = parseOneJobCard(entityMap.get(jobRef)!, entityMap);
      } else if (typeof jobRef === "object" && jobRef !== null) {
        jobCard = parseOneJobCard(
          jobRef as Record<string, unknown>,
          entityMap,
        );
      }

      if (!jobCard) return null;

      const result: VoyagerSavedJob = {
        entityUrn: (el.entityUrn ?? "") as string,
        savedAt:
          typeof el.savedAt === "number"
            ? new Date(el.savedAt as number).toISOString()
            : (el.savedAt ?? "") as string,
        jobPosting: jobCard,
        note: el.note as string | undefined,
      };
      return result;
    })
    .filter((x): x is VoyagerSavedJob => x !== null);

  return { savedJobs, paging };
}

/**
 * Save (bookmark) a job.
 *
 * POST /voyager/api/voyagerJobsDashSavedJobs
 */
export async function saveJob(jobPostingId: string): Promise<void> {
  await voyagerFetch("/voyagerJobsDashSavedJobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobPosting: `urn:li:fsd_jobPosting:${jobPostingId}`,
    }),
  });
}

/**
 * Unsave (remove bookmark) a job.
 *
 * DELETE /voyager/api/voyagerJobsDashSavedJobs/{savedJobUrn}
 */
export async function unsaveJob(savedJobUrn: LinkedInUrn): Promise<void> {
  await voyagerFetch(
    `/voyagerJobsDashSavedJobs/${encodeURIComponent(savedJobUrn)}`,
    { method: "DELETE" },
  );
}

// ────────────────────────────────────────────────────────────────────
// 14. Client methods — Application Tracking
// ────────────────────────────────────────────────────────────────────

/**
 * List job applications (your application history).
 *
 * GET /voyager/api/voyagerJobsDashJobApplications
 *   ?decorationId=...AppliedJob-16
 *   &q=appliedJobs
 *   &count=25&start=0
 */
export async function listApplications(
  options: { count?: number; start?: number } = {},
): Promise<{
  applications: VoyagerJobApplication[];
  paging: VoyagerPaging;
}> {
  const { count = 25, start = 0 } = options;

  const url = new URL(
    `${VOYAGER_BASE}/voyagerJobsDashJobApplications`,
  );
  url.searchParams.set("decorationId", DECORATION.APPLIED_JOB_CARD);
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));
  url.searchParams.set("q", "appliedJobs");

  const data = await voyagerFetch<Record<string, unknown>>(url.toString());
  const paging = (data.paging ?? { count, start, total: 0 }) as VoyagerPaging;

  const included = (data.included ?? []) as Record<string, unknown>[];
  const entityMap = new Map<string, Record<string, unknown>>();
  for (const item of included) {
    const urn = item.entityUrn as string | undefined;
    if (urn) entityMap.set(urn, item);
  }

  const elements = (data.elements ?? []) as Record<string, unknown>[];
  const applications: VoyagerJobApplication[] = elements
    .map((el) => {
      const jobRef = el.jobPosting ?? el.jobPostingUrn;
      let jobCard: VoyagerJobCard | null = null;

      if (typeof jobRef === "string" && entityMap.has(jobRef)) {
        jobCard = parseOneJobCard(entityMap.get(jobRef)!, entityMap);
      } else if (typeof jobRef === "object" && jobRef !== null) {
        jobCard = parseOneJobCard(
          jobRef as Record<string, unknown>,
          entityMap,
        );
      }

      if (!jobCard) return null;

      const entityUrn = (el.entityUrn ?? "") as string;
      const application: VoyagerJobApplication = {
        entityUrn,
        applicationId: entityUrn.match(/(\d+)$/)?.[1] ?? "",
        jobPosting: jobCard,
        appliedAt:
          typeof el.appliedAt === "number"
            ? new Date(el.appliedAt as number).toISOString()
            : (el.appliedAt ?? el.submittedAt ?? "") as string,
        lastUpdatedAt:
          typeof el.lastUpdatedAt === "number"
            ? new Date(el.lastUpdatedAt as number).toISOString()
            : (el.lastUpdatedAt ?? "") as string,
        status: (el.status ?? el.applicationState ?? "APPLIED") as ApplicationStatus,
        easyApply: (el.easyApply ?? el.isEasyApply ?? false) as boolean,
        resumeUrn: el.resumeUrn as string | undefined,
        screeningQuestionAnswers: el.screeningQuestionAnswers as
          | Array<{ question: string; answer: string }>
          | undefined,
      };
      return application;
    })
    .filter((x): x is VoyagerJobApplication => x !== null);

  return { applications, paging };
}

/**
 * Withdraw a job application.
 *
 * POST /voyager/api/voyagerJobsDashJobApplications/{applicationUrn}/withdraw
 */
export async function withdrawApplication(
  applicationUrn: LinkedInUrn,
): Promise<void> {
  await voyagerFetch(
    `/voyagerJobsDashJobApplications/${encodeURIComponent(applicationUrn)}/withdraw`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
}

/**
 * Archive an application (hide from active list).
 *
 * PATCH /voyager/api/voyagerJobsDashJobApplications/{applicationUrn}
 */
export async function archiveApplication(
  applicationUrn: LinkedInUrn,
): Promise<void> {
  await voyagerFetch(
    `/voyagerJobsDashJobApplications/${encodeURIComponent(applicationUrn)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patch: { $set: { status: "ARCHIVED" } },
      }),
    },
  );
}

// ────────────────────────────────────────────────────────────────────
// 15. Client methods — Job Notification Preferences
// ────────────────────────────────────────────────────────────────────

/**
 * Get current job notification preferences.
 *
 * GET /voyager/api/voyagerJobsDashJobNotificationPreferences
 */
export async function getJobNotificationPreferences(): Promise<VoyagerJobNotificationPreferences> {
  const data = await voyagerFetch<Record<string, unknown>>(
    "/voyagerJobsDashJobNotificationPreferences",
  );

  const prefs = (data.data ?? data) as Record<string, unknown>;

  return {
    jobSearchEmailEnabled: (prefs.jobSearchEmailEnabled ?? true) as boolean,
    alertDigestFrequency: (prefs.alertDigestFrequency ?? "DAILY") as AlertFrequency,
    recommendedJobsFrequency: (prefs.recommendedJobsFrequency ?? "WEEKLY") as AlertFrequency,
    pushNotificationsEnabled: (prefs.pushNotificationsEnabled ?? true) as boolean,
    applicationViewedNotification: (prefs.applicationViewedNotification ?? true) as boolean,
    similarJobsAfterApplyNotification: (prefs.similarJobsAfterApplyNotification ?? true) as boolean,
    resumeDownloadNotification: (prefs.resumeDownloadNotification ?? true) as boolean,
  };
}

/**
 * Update job notification preferences.
 *
 * PATCH /voyager/api/voyagerJobsDashJobNotificationPreferences
 */
export async function updateJobNotificationPreferences(
  updates: Partial<VoyagerJobNotificationPreferences>,
): Promise<void> {
  await voyagerFetch("/voyagerJobsDashJobNotificationPreferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patch: { $set: updates },
    }),
  });
}

// ────────────────────────────────────────────────────────────────────
// 16. Convenience — Paginated iterators
// ────────────────────────────────────────────────────────────────────

/**
 * Iterate ALL recommended jobs across pages.
 * Yields batches and respects a configurable delay between pages.
 */
export async function* iterateRecommendedJobs(
  options: {
    pageSize?: number;
    maxPages?: number;
    delayMs?: number;
  } = {},
): AsyncGenerator<VoyagerJobCard[], void, unknown> {
  const { pageSize = 25, maxPages = 20, delayMs = 400 } = options;
  let start = 0;
  let pages = 0;

  while (pages < maxPages) {
    const { jobs, paging } = await getRecommendedJobs({
      count: pageSize,
      start,
    });
    if (jobs.length === 0) break;

    yield jobs;

    start += pageSize;
    pages++;
    if (start >= paging.total) break;

    // Rate limit between pages
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

/**
 * Iterate ALL saved jobs across pages.
 */
export async function* iterateSavedJobs(
  options: {
    pageSize?: number;
    maxPages?: number;
    delayMs?: number;
  } = {},
): AsyncGenerator<VoyagerSavedJob[], void, unknown> {
  const { pageSize = 25, maxPages = 40, delayMs = 400 } = options;
  let start = 0;
  let pages = 0;

  while (pages < maxPages) {
    const { savedJobs, paging } = await listSavedJobs({
      count: pageSize,
      start,
    });
    if (savedJobs.length === 0) break;

    yield savedJobs;

    start += pageSize;
    pages++;
    if (start >= paging.total) break;

    await new Promise((r) => setTimeout(r, delayMs));
  }
}

/**
 * Iterate ALL applications across pages.
 */
export async function* iterateApplications(
  options: {
    pageSize?: number;
    maxPages?: number;
    delayMs?: number;
  } = {},
): AsyncGenerator<VoyagerJobApplication[], void, unknown> {
  const { pageSize = 25, maxPages = 40, delayMs = 400 } = options;
  let start = 0;
  let pages = 0;

  while (pages < maxPages) {
    const { applications, paging } = await listApplications({
      count: pageSize,
      start,
    });
    if (applications.length === 0) break;

    yield applications;

    start += pageSize;
    pages++;
    if (start >= paging.total) break;

    await new Promise((r) => setTimeout(r, delayMs));
  }
}

// ────────────────────────────────────────────────────────────────────
// 17. Convenience — Batch helpers for lead-gen pipeline
// ────────────────────────────────────────────────────────────────────

/**
 * Fetch recommended remote AI/ML jobs — pre-filtered for the lead-gen ICP.
 * Uses the search endpoint with remote + relevant keyword filters.
 */
export async function getRemoteAIJobRecommendations(
  options: {
    keywords?: string;
    count?: number;
    start?: number;
  } = {},
): Promise<{ jobs: VoyagerJobCard[]; paging: VoyagerPaging }> {
  return searchJobs(
    {
      keywords:
        options.keywords ??
        "AI engineer OR machine learning engineer OR ML engineer",
      geoId: "92000000", // Worldwide
      workplaceType: ["2"], // Remote
      sortBy: "RELEVANCE",
    },
    { count: options.count ?? 25, start: options.start ?? 0 },
  );
}

/**
 * Create a job alert for remote AI/ML engineering roles.
 * Convenience wrapper with sensible defaults for the lead-gen pipeline.
 */
export async function createRemoteAIJobAlert(
  options: {
    keywords?: string;
    frequency?: AlertFrequency;
  } = {},
): Promise<VoyagerJobAlert> {
  return createJobAlert({
    keywords:
      options.keywords ??
      "AI engineer OR machine learning engineer OR ML engineer",
    geoId: "92000000", // Worldwide
    selectedFilters: {
      workplaceType: ["2"], // Remote
      experience: ["4"], // Mid-Senior
    },
    frequency: options.frequency ?? "DAILY",
    notificationChannel: "EMAIL",
    origin: "JOB_SEARCH_PAGE_JOB_FILTER",
  });
}

/**
 * Classify a batch of job cards by Easy Apply status.
 * Returns two arrays: easyApply and externalApply.
 */
export function classifyByApplyMethod(jobs: VoyagerJobCard[]): {
  easyApply: VoyagerJobCard[];
  externalApply: VoyagerJobCard[];
  unknown: VoyagerJobCard[];
} {
  const easyApply: VoyagerJobCard[] = [];
  const externalApply: VoyagerJobCard[] = [];
  const unknown: VoyagerJobCard[] = [];

  for (const job of jobs) {
    if (job.easyApply) {
      easyApply.push(job);
    } else if (
      job.applyMethod === "EXTERNAL" ||
      job.applyMethod === "OFFSITE" ||
      job.externalApplyUrl
    ) {
      externalApply.push(job);
    } else {
      unknown.push(job);
    }
  }

  return { easyApply, externalApply, unknown };
}
