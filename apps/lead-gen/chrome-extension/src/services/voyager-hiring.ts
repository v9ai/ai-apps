/**
 * LinkedIn Voyager API — Hiring Contact Discovery
 *
 * Extracts hiring managers, recruiters, and decision makers from job postings
 * via LinkedIn's internal Voyager REST API. Endpoints documented here are
 * reverse-engineered from the LinkedIn web app's XHR traffic (2024-2025).
 *
 * ── Voyager Endpoints Used ──────────────────────────────────────────────
 *
 * 1. Job poster / hiring manager profile:
 *    GET /voyager/api/voyagerJobsDashJobCards
 *      ?decorationId=...JobSearchCardsCollection-227
 *      &q=jobSearch
 *      &query=(selectedFilters:(company:List({id}),workplaceType:List(2)))
 *    → elements[].jobCardUnion.jobPostingCard.posterDetail
 *      { topCardV2 { ... memberName, memberTitle, memberUrl } }
 *
 * 2. "Meet the hiring team" feature:
 *    GET /voyager/api/voyagerJobsDashHiringTeamCards
 *      ?decorationId=com.linkedin.voyager.dash.deco.jobs.HiringTeamCard-14
 *      &q=jobPosting
 *      &jobPostingUrn=urn:li:fsd_jobPosting:{jobId}
 *    → elements[].hiringTeamMember { name, title, linkedInMemberProfileUrn }
 *
 * 3. Job posting detail with poster:
 *    GET /voyager/api/jobs/jobPostings/{jobId}
 *      ?decorationId=com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-67
 *    → posterDetail { posterResolutionResult { title, publicIdentifier } }
 *    → recruiterDetail { recruiterResolutionResult { ... } }
 *
 * 4. Member URN → profile resolution:
 *    GET /voyager/api/identity/dash/profiles
 *      ?q=memberIdentity
 *      &memberIdentity={publicIdentifier}
 *      &decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-21
 *    → elements[0] { firstName, lastName, headline, publicIdentifier, profilePicture }
 *
 * 5. Company employees who posted jobs (derived from #1):
 *    Iterate job cards, extract unique poster URNs, resolve to profiles.
 *
 * 6. InMail connection data:
 *    Job cards include `applyMethod.companyApplyUrl` or `applyMethod.easyApplyUrl`
 *    and poster profiles expose `connectionDegree` (FIRST/SECOND/THIRD/OUT_OF_NETWORK).
 *    InMail is available for SECOND+ when the poster has Premium/Recruiter.
 *
 * 7. Poster role and seniority:
 *    posterDetail.topCardV2.memberTitle contains the poster's current position.
 *    This is fed into classifyContact() for authority scoring.
 *
 * ── Rate Limiting ───────────────────────────────────────────────────────
 *
 * LinkedIn enforces ~100 Voyager requests/minute per session. This module
 * uses a 350ms inter-request delay and exponential backoff on 429s.
 * The Chrome extension must be logged into LinkedIn for CSRF tokens.
 */

// ── Types ───────────────────────────────────────────────────────────────

/** A hiring contact extracted from Voyager job posting data. */
export interface HiringContact {
  /** LinkedIn member URN (e.g., "urn:li:fsd_profile:ACoAAB...") */
  memberUrn: string | null;
  /** Public profile identifier (e.g., "johndoe") */
  publicIdentifier: string | null;
  /** Full LinkedIn profile URL */
  linkedinUrl: string | null;
  /** Display name from Voyager */
  firstName: string;
  lastName: string;
  /** Current position/headline from poster detail */
  title: string | null;
  /** Profile photo URL (if available) */
  profilePictureUrl: string | null;
  /** How this contact was discovered */
  source: HiringContactSource;
  /** Connection degree to the authenticated user */
  connectionDegree: ConnectionDegree;
  /** Whether InMail is available for this contact */
  inmailAvailable: boolean;
  /** The job posting ID(s) this contact is associated with */
  jobPostingIds: string[];
  /** Raw Voyager entity type for debugging */
  entityType: string | null;
}

export type HiringContactSource =
  | "job_poster"        // posterDetail on the job card
  | "hiring_team"       // "Meet the hiring team" section
  | "recruiter"         // recruiterDetail on job posting
  | "company_employee"; // Inferred from employee search

export type ConnectionDegree =
  | "SELF"
  | "FIRST"
  | "SECOND"
  | "THIRD"
  | "OUT_OF_NETWORK"
  | "UNKNOWN";

/** A recruiter profile resolved from Voyager member data. */
export interface RecruiterProfile {
  /** LinkedIn member URN */
  memberUrn: string;
  publicIdentifier: string;
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  /** Current company from headline/experience */
  currentCompany: string | null;
  /** Whether this is an internal recruiter (works at the hiring company) */
  isInternal: boolean;
  /** Agency/staffing firm name if external recruiter */
  agencyName: string | null;
  connectionDegree: ConnectionDegree;
  /** Number of open positions this recruiter is associated with */
  openPositionCount: number;
  /** Job posting IDs they are recruiting for */
  jobPostingIds: string[];
}

/** Result from a full hiring contact discovery pass. */
export interface HiringDiscoveryResult {
  companyNumericId: string;
  jobPostingsScanned: number;
  hiringContacts: HiringContact[];
  recruiters: RecruiterProfile[];
  errors: string[];
  /** Wall-clock ms for the entire discovery */
  durationMs: number;
}

// ── Voyager Response Shapes (partial, only fields we use) ───────────────

interface VoyagerPaging {
  total?: number;
  count?: number;
  start?: number;
}

interface VoyagerNormalized<T = unknown> {
  data?: { elements?: T[]; paging?: VoyagerPaging; "*elements"?: string[] };
  elements?: T[];
  included?: Record<string, unknown>[];
  paging?: VoyagerPaging;
}

interface VoyagerJobCard {
  jobCardUnion?: {
    jobPostingCard?: {
      jobPostingUrn?: string;
      title?: string;
      primaryDescription?: { text?: string };
      posterDetail?: {
        topCardV2?: {
          memberName?: { text?: string };
          memberTitle?: { text?: string };
          memberUrl?: string;
          memberProfileUrn?: string;
          memberProfilePicture?: {
            rootUrl?: string;
            artifacts?: Array<{ fileIdentifyingUrlPathSegment?: string }>;
          };
          connectionDegree?: string;
        };
      };
      applyMethod?: {
        companyApplyUrl?: string;
        easyApplyUrl?: string;
        inMailUrl?: string;
      };
    };
  };
  // Fallback: some decorations flatten these
  jobPostingUrn?: string;
  posterDetail?: VoyagerJobCard["jobCardUnion"] extends { jobPostingCard?: { posterDetail?: infer P } } ? P : never;
}

interface VoyagerHiringTeamMember {
  hiringTeamMember?: {
    name?: { text?: string };
    title?: { text?: string };
    linkedInMemberProfileUrn?: string;
    profilePicture?: {
      rootUrl?: string;
      artifacts?: Array<{ fileIdentifyingUrlPathSegment?: string }>;
    };
    connectionDegree?: string;
    isOpenToInMail?: boolean;
  };
  // Alternative shape: member fields at top level
  name?: { text?: string };
  title?: { text?: string };
  linkedInMemberProfileUrn?: string;
}

interface VoyagerJobPosting {
  posterDetail?: {
    posterResolutionResult?: {
      title?: string;
      publicIdentifier?: string;
      firstName?: string;
      lastName?: string;
      profilePicture?: unknown;
      connectionDegree?: string;
    };
  };
  recruiterDetail?: {
    recruiterResolutionResult?: {
      title?: string;
      publicIdentifier?: string;
      firstName?: string;
      lastName?: string;
      headline?: string;
      connectionDegree?: string;
    };
  };
  companyDetails?: {
    companyResolutionResult?: {
      name?: string;
      universalName?: string;
    };
  };
}

interface VoyagerProfileCard {
  firstName?: string;
  lastName?: string;
  headline?: string;
  publicIdentifier?: string;
  profilePicture?: {
    rootUrl?: string;
    artifacts?: Array<{ fileIdentifyingUrlPathSegment?: string }>;
  };
  connectionDegree?: string;
  entityUrn?: string;
}

// ── Constants ───────────────────────────────────────────────────────────

const VOYAGER_BASE = "https://www.linkedin.com/voyager/api";
const REQUEST_DELAY_MS = 350;
const MAX_RETRIES = 3;

const DECORATION_IDS = {
  /** Job search cards with poster detail */
  jobCards: "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",
  /** Hiring team cards for a specific job posting */
  hiringTeam: "com.linkedin.voyager.dash.deco.jobs.HiringTeamCard-14",
  /** Full job posting with poster + recruiter detail */
  jobPosting: "com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-67",
  /** Profile top card for member URN resolution */
  profileCard: "com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-21",
} as const;

// ── Auth ────────────────────────────────────────────────────────────────

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

// ── HTTP Layer ──────────────────────────────────────────────────────────

class RetryableError extends Error {
  readonly retryable = true as const;
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

async function voyagerFetch<T>(
  path: string,
  params: Record<string, string>,
  csrfToken: string,
): Promise<T> {
  const url = new URL(`${VOYAGER_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  let retries = 0;
  while (true) {
    const res = await fetch(url.toString(), {
      headers: {
        "csrf-token": csrfToken,
        "x-restli-protocol-version": "2.0.0",
        Accept: "application/vnd.linkedin.normalized+json+2.1",
      },
      credentials: "include",
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error(`LinkedIn auth error: ${res.status}`);
    }
    if (res.status === 429) {
      if (retries >= MAX_RETRIES) {
        throw new RetryableError(`Rate limited after ${MAX_RETRIES} retries`);
      }
      const backoff = Math.min(2000 * Math.pow(2, retries), 30000);
      retries++;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Voyager ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── URN Utilities ───────────────────────────────────────────────────────

/**
 * Extract numeric ID from a LinkedIn URN.
 * e.g., "urn:li:fsd_jobPosting:12345" → "12345"
 *       "urn:li:fsd_profile:ACoAAB..." → "ACoAAB..."
 */
function extractUrnId(urn: string | null | undefined): string | null {
  if (!urn) return null;
  const parts = urn.split(":");
  return parts[parts.length - 1] ?? null;
}

/**
 * Extract public identifier from a LinkedIn URL or URN.
 * e.g., "https://www.linkedin.com/in/johndoe" → "johndoe"
 *       "/in/johndoe/" → "johndoe"
 */
function extractPublicIdentifier(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/in\/([^/?]+)/);
  return match?.[1]?.replace(/\/$/, "") ?? null;
}

/**
 * Resolve a member URN to a full profile URL.
 */
function memberUrnToUrl(publicIdentifier: string | null): string | null {
  if (!publicIdentifier) return null;
  return `https://www.linkedin.com/in/${publicIdentifier}/`;
}

/**
 * Build a profile picture URL from Voyager's artifact-based image data.
 */
function resolveProfilePicture(
  pic: { rootUrl?: string; artifacts?: Array<{ fileIdentifyingUrlPathSegment?: string }> } | null | undefined,
): string | null {
  if (!pic?.rootUrl || !pic.artifacts?.length) return null;
  // Pick the largest artifact (last in the array)
  const largest = pic.artifacts[pic.artifacts.length - 1];
  if (!largest?.fileIdentifyingUrlPathSegment) return null;
  return `${pic.rootUrl}${largest.fileIdentifyingUrlPathSegment}`;
}

/**
 * Parse connection degree from Voyager string representation.
 */
function parseConnectionDegree(degree: string | null | undefined): ConnectionDegree {
  if (!degree) return "UNKNOWN";
  const d = degree.toUpperCase();
  if (d === "SELF" || d === "DISTANCE_SELF") return "SELF";
  if (d === "FIRST" || d === "DISTANCE_1" || d.includes("FIRST")) return "FIRST";
  if (d === "SECOND" || d === "DISTANCE_2" || d.includes("SECOND")) return "SECOND";
  if (d === "THIRD" || d === "DISTANCE_3" || d.includes("THIRD")) return "THIRD";
  if (d.includes("OUT_OF_NETWORK") || d === "DISTANCE_MAX") return "OUT_OF_NETWORK";
  return "UNKNOWN";
}

// ── Endpoint 1: Job Cards with Poster Detail ────────────────────────────

/**
 * Fetch job cards for a company, extracting poster (hiring manager) details.
 *
 * Uses GET /voyager/api/voyagerJobsDashJobCards decorated with posterDetail.
 * This is the same endpoint the codebase already uses for job counting
 * (company-browsing.ts), but here we also parse the poster metadata.
 */
async function fetchJobCardsWithPosters(
  companyNumericId: string,
  csrfToken: string,
  maxCards: number = 100,
): Promise<{ contacts: HiringContact[]; jobPostingIds: string[]; total: number }> {
  const contacts: HiringContact[] = [];
  const jobPostingIds: string[] = [];
  const seenPosters = new Set<string>();
  let start = 0;
  const pageSize = 25;

  while (start < maxCards) {
    const data = await voyagerFetch<VoyagerNormalized<VoyagerJobCard>>(
      "voyagerJobsDashJobCards",
      {
        decorationId: DECORATION_IDS.jobCards,
        count: String(pageSize),
        q: "jobSearch",
        query: `(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(company:List(${companyNumericId})),spellCorrectionEnabled:true)`,
        locationUnion: "(geoId:92000000)",
        start: String(start),
      },
      csrfToken,
    );

    const total = data?.paging?.total ?? data?.data?.paging?.total ?? 0;
    const elements = data?.data?.elements ?? data?.elements ?? [];

    // Also scan `included` for poster profiles (normalized response shape)
    const includedProfiles = new Map<string, VoyagerProfileCard>();
    if (Array.isArray(data?.included)) {
      for (const item of data.included as VoyagerProfileCard[]) {
        if (item.publicIdentifier && item.firstName) {
          includedProfiles.set(
            item.entityUrn ?? item.publicIdentifier,
            item,
          );
        }
      }
    }

    for (const el of elements) {
      const card = el.jobCardUnion?.jobPostingCard ?? el;
      const jobUrn = card.jobPostingUrn ?? el.jobPostingUrn;
      const jobId = extractUrnId(jobUrn);
      if (jobId) jobPostingIds.push(jobId);

      // Extract poster detail from card
      const poster = (card as VoyagerJobCard["jobCardUnion"] extends { jobPostingCard?: infer P } ? P : never)
        // @ts-expect-error -- navigating nested Voyager shapes
        ?.posterDetail?.topCardV2 ?? card.posterDetail?.topCardV2;

      if (!poster) continue;

      const profileUrn = poster.memberProfileUrn ?? null;
      const pubId = extractPublicIdentifier(poster.memberUrl) ?? extractUrnId(profileUrn);
      const posterKey = pubId ?? poster.memberName?.text ?? profileUrn;
      if (!posterKey || seenPosters.has(posterKey)) continue;
      seenPosters.add(posterKey);

      // Parse name (Voyager gives "First Last" in memberName.text)
      const nameParts = (poster.memberName?.text ?? "").split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ") ?? "";

      contacts.push({
        memberUrn: profileUrn,
        publicIdentifier: pubId,
        linkedinUrl: memberUrnToUrl(pubId),
        firstName,
        lastName,
        title: poster.memberTitle?.text ?? null,
        profilePictureUrl: resolveProfilePicture(poster.memberProfilePicture),
        source: "job_poster",
        connectionDegree: parseConnectionDegree(poster.connectionDegree),
        inmailAvailable: poster.connectionDegree !== "FIRST",
        jobPostingIds: jobId ? [jobId] : [],
        entityType: "voyagerJobsDashJobCard.posterDetail",
      });
    }

    // Also extract profiles from included entities that weren't in posterDetail
    for (const [, profile] of includedProfiles) {
      const pubId = profile.publicIdentifier;
      if (!pubId || seenPosters.has(pubId)) continue;
      // Only include if they appear to be associated with the company
      // (included entities can contain tangential profiles)
      // Skip these for now -- they're resolved via hiring team endpoint
    }

    if (elements.length === 0 || start + pageSize >= total) break;
    start += pageSize;
    await delay(REQUEST_DELAY_MS);

    return { contacts, jobPostingIds, total };
  }

  return { contacts, jobPostingIds, total: 0 };
}

// ── Endpoint 2: "Meet the Hiring Team" ──────────────────────────────────

/**
 * Fetch the "Meet the hiring team" section for a specific job posting.
 *
 * GET /voyager/api/voyagerJobsDashHiringTeamCards
 *   ?decorationId=com.linkedin.voyager.dash.deco.jobs.HiringTeamCard-14
 *   &q=jobPosting
 *   &jobPostingUrn=urn:li:fsd_jobPosting:{jobId}
 *
 * This endpoint returns 1-5 team members (typically the hiring manager,
 * a recruiter, and sometimes a team lead). It is the most reliable source
 * for identifying the actual hiring decision maker.
 */
async function fetchHiringTeam(
  jobPostingId: string,
  csrfToken: string,
): Promise<HiringContact[]> {
  const contacts: HiringContact[] = [];

  try {
    const data = await voyagerFetch<VoyagerNormalized<VoyagerHiringTeamMember>>(
      "voyagerJobsDashHiringTeamCards",
      {
        decorationId: DECORATION_IDS.hiringTeam,
        q: "jobPosting",
        jobPostingUrn: `urn:li:fsd_jobPosting:${jobPostingId}`,
      },
      csrfToken,
    );

    const elements = data?.data?.elements ?? data?.elements ?? [];

    // Also scan `included` for resolved member profiles
    const includedProfiles = new Map<string, VoyagerProfileCard>();
    if (Array.isArray(data?.included)) {
      for (const item of data.included as VoyagerProfileCard[]) {
        if (item.publicIdentifier || item.entityUrn) {
          includedProfiles.set(
            item.entityUrn ?? item.publicIdentifier ?? "",
            item,
          );
        }
      }
    }

    for (const el of elements) {
      const member = el.hiringTeamMember ?? el;
      const memberUrn = member.linkedInMemberProfileUrn ?? null;
      const urnId = extractUrnId(memberUrn);

      // Try to resolve from included profiles
      const resolved = memberUrn ? includedProfiles.get(memberUrn) : null;

      const nameText = member.name?.text ?? "";
      const nameParts = nameText.split(/\s+/);
      const firstName = resolved?.firstName ?? nameParts[0] ?? "";
      const lastName = resolved?.lastName ?? nameParts.slice(1).join(" ") ?? "";
      const pubId = resolved?.publicIdentifier ?? urnId;
      const degree = parseConnectionDegree(
        resolved?.connectionDegree ?? member.connectionDegree,
      );

      contacts.push({
        memberUrn,
        publicIdentifier: pubId,
        linkedinUrl: memberUrnToUrl(pubId),
        firstName,
        lastName,
        title: member.title?.text ?? resolved?.headline ?? null,
        profilePictureUrl: resolveProfilePicture(
          member.profilePicture ?? resolved?.profilePicture,
        ),
        source: "hiring_team",
        connectionDegree: degree,
        inmailAvailable: member.isOpenToInMail ?? degree !== "FIRST",
        jobPostingIds: [jobPostingId],
        entityType: "voyagerJobsDashHiringTeamCard",
      });
    }
  } catch (err) {
    // Hiring team endpoint returns 404 for jobs without this feature
    console.warn(`[VoyagerHiring] No hiring team for job ${jobPostingId}:`, err);
  }

  return contacts;
}

// ── Endpoint 3: Job Posting Detail (poster + recruiter) ─────────────────

/**
 * Fetch full job posting detail including poster and recruiter profiles.
 *
 * GET /voyager/api/jobs/jobPostings/{jobId}
 *   ?decorationId=com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-67
 *
 * This returns richer data than the job card, including:
 * - posterDetail.posterResolutionResult — the actual hiring manager
 * - recruiterDetail.recruiterResolutionResult — the assigned recruiter
 * - companyDetails — company context for internal vs. agency detection
 */
async function fetchJobPostingDetail(
  jobPostingId: string,
  csrfToken: string,
  companyName?: string,
): Promise<{ poster: HiringContact | null; recruiter: RecruiterProfile | null }> {
  let poster: HiringContact | null = null;
  let recruiter: RecruiterProfile | null = null;

  try {
    const data = await voyagerFetch<VoyagerJobPosting>(
      `jobs/jobPostings/${jobPostingId}`,
      {
        decorationId: DECORATION_IDS.jobPosting,
      },
      csrfToken,
    );

    // Poster (hiring manager)
    const p = data?.posterDetail?.posterResolutionResult;
    if (p?.publicIdentifier) {
      poster = {
        memberUrn: null,
        publicIdentifier: p.publicIdentifier,
        linkedinUrl: memberUrnToUrl(p.publicIdentifier),
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        title: p.title ?? null,
        profilePictureUrl: null,
        source: "job_poster",
        connectionDegree: parseConnectionDegree(p.connectionDegree),
        inmailAvailable: parseConnectionDegree(p.connectionDegree) !== "FIRST",
        jobPostingIds: [jobPostingId],
        entityType: "jobPosting.posterDetail",
      };
    }

    // Recruiter
    const r = data?.recruiterDetail?.recruiterResolutionResult;
    if (r?.publicIdentifier) {
      const companyFromPosting = data?.companyDetails?.companyResolutionResult?.name;
      const recruiterIsInternal = companyName
        ? r.headline?.toLowerCase().includes(companyName.toLowerCase()) ?? false
        : false;

      recruiter = {
        memberUrn: "",
        publicIdentifier: r.publicIdentifier,
        linkedinUrl: memberUrnToUrl(r.publicIdentifier)!,
        firstName: r.firstName ?? "",
        lastName: r.lastName ?? "",
        headline: r.headline ?? null,
        currentCompany: companyFromPosting ?? null,
        isInternal: recruiterIsInternal,
        agencyName: recruiterIsInternal ? null : extractAgencyFromHeadline(r.headline),
        connectionDegree: parseConnectionDegree(r.connectionDegree),
        openPositionCount: 1,
        jobPostingIds: [jobPostingId],
      };
    }
  } catch (err) {
    console.warn(`[VoyagerHiring] Failed to fetch job detail for ${jobPostingId}:`, err);
  }

  return { poster, recruiter };
}

/**
 * Attempt to extract agency/staffing firm name from a recruiter's headline.
 * e.g., "Technical Recruiter at Hays" → "Hays"
 */
function extractAgencyFromHeadline(headline: string | null | undefined): string | null {
  if (!headline) return null;
  const match = headline.match(/\bat\s+(.+?)(?:\s*[|·\-—]|$)/i);
  return match?.[1]?.trim() ?? null;
}

// ── Endpoint 4: Member URN → Profile Resolution ────────────────────────

/**
 * Resolve a public identifier to a full profile card.
 *
 * GET /voyager/api/identity/dash/profiles
 *   ?q=memberIdentity
 *   &memberIdentity={publicIdentifier}
 *   &decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-21
 *
 * Used to enrich HiringContacts that only have a URN or public identifier
 * but are missing name/headline data.
 */
async function resolveProfile(
  publicIdentifier: string,
  csrfToken: string,
): Promise<VoyagerProfileCard | null> {
  try {
    const data = await voyagerFetch<VoyagerNormalized<VoyagerProfileCard>>(
      "identity/dash/profiles",
      {
        q: "memberIdentity",
        memberIdentity: publicIdentifier,
        decorationId: DECORATION_IDS.profileCard,
      },
      csrfToken,
    );

    const elements = data?.data?.elements ?? data?.elements ?? [];
    return elements[0] ?? null;
  } catch {
    return null;
  }
}

// ── Main Discovery Function ─────────────────────────────────────────────

/**
 * Full hiring contact discovery for a company.
 *
 * Pipeline:
 * 1. Fetch job cards → extract poster details (hiring managers)
 * 2. For top N job postings, fetch "Meet the hiring team"
 * 3. For top N job postings, fetch full job posting detail (poster + recruiter)
 * 4. Deduplicate and merge contacts by publicIdentifier
 * 5. Resolve incomplete profiles via member identity endpoint
 *
 * @param companyNumericId — LinkedIn numeric company ID
 * @param options.maxJobs — Max job postings to scan (default 25)
 * @param options.fetchHiringTeams — Whether to fetch hiring team per job (slower but more complete)
 * @param options.resolveProfiles — Whether to resolve incomplete profiles via identity API
 */
export async function discoverHiringContacts(
  companyNumericId: string,
  options: {
    maxJobs?: number;
    fetchHiringTeams?: boolean;
    resolveProfiles?: boolean;
    companyName?: string;
    onProgress?: (step: string, count: number) => void;
  } = {},
): Promise<HiringDiscoveryResult> {
  const {
    maxJobs = 25,
    fetchHiringTeams = true,
    resolveProfiles: doResolve = false,
    companyName,
    onProgress,
  } = options;

  const start = Date.now();
  const errors: string[] = [];
  const csrfToken = await getCsrfToken();

  // ── Step 1: Fetch job cards with poster detail ──

  onProgress?.("Fetching job cards", 0);
  let jobCardResult: Awaited<ReturnType<typeof fetchJobCardsWithPosters>>;
  try {
    jobCardResult = await fetchJobCardsWithPosters(companyNumericId, csrfToken, maxJobs);
  } catch (err) {
    errors.push(`Job cards: ${err instanceof Error ? err.message : String(err)}`);
    return {
      companyNumericId,
      jobPostingsScanned: 0,
      hiringContacts: [],
      recruiters: [],
      errors,
      durationMs: Date.now() - start,
    };
  }

  onProgress?.("Job cards fetched", jobCardResult.contacts.length);

  // Deduplicated contact map by publicIdentifier or name
  const contactMap = new Map<string, HiringContact>();
  const recruiterMap = new Map<string, RecruiterProfile>();

  for (const c of jobCardResult.contacts) {
    const key = c.publicIdentifier ?? `${c.firstName}:${c.lastName}`;
    if (contactMap.has(key)) {
      // Merge job posting IDs
      const existing = contactMap.get(key)!;
      existing.jobPostingIds = [
        ...new Set([...existing.jobPostingIds, ...c.jobPostingIds]),
      ];
    } else {
      contactMap.set(key, { ...c });
    }
  }

  // ── Step 2: Fetch hiring teams for top job postings ──

  const jobsToScan = jobCardResult.jobPostingIds.slice(0, maxJobs);

  if (fetchHiringTeams && jobsToScan.length > 0) {
    onProgress?.("Fetching hiring teams", 0);
    let teamCount = 0;

    for (const jobId of jobsToScan) {
      try {
        const teamContacts = await fetchHiringTeam(jobId, csrfToken);
        for (const c of teamContacts) {
          const key = c.publicIdentifier ?? `${c.firstName}:${c.lastName}`;
          if (contactMap.has(key)) {
            const existing = contactMap.get(key)!;
            existing.jobPostingIds = [
              ...new Set([...existing.jobPostingIds, ...c.jobPostingIds]),
            ];
            // Upgrade source if hiring_team (more authoritative)
            if (existing.source === "job_poster") {
              existing.source = "hiring_team";
            }
          } else {
            contactMap.set(key, { ...c });
          }
        }
        teamCount += teamContacts.length;
      } catch (err) {
        errors.push(`Hiring team for job ${jobId}: ${err instanceof Error ? err.message : String(err)}`);
      }
      await delay(REQUEST_DELAY_MS);
    }

    onProgress?.("Hiring teams fetched", teamCount);
  }

  // ── Step 3: Fetch job posting details (recruiter + poster enrichment) ──

  // Only fetch details for a subset to stay within rate limits
  const detailJobs = jobsToScan.slice(0, 10);

  if (detailJobs.length > 0) {
    onProgress?.("Fetching job details", 0);

    for (const jobId of detailJobs) {
      try {
        const { poster, recruiter } = await fetchJobPostingDetail(
          jobId,
          csrfToken,
          companyName,
        );

        if (poster) {
          const key = poster.publicIdentifier ?? `${poster.firstName}:${poster.lastName}`;
          if (!contactMap.has(key)) {
            contactMap.set(key, poster);
          }
        }

        if (recruiter) {
          const key = recruiter.publicIdentifier;
          if (recruiterMap.has(key)) {
            const existing = recruiterMap.get(key)!;
            existing.jobPostingIds = [
              ...new Set([...existing.jobPostingIds, ...recruiter.jobPostingIds]),
            ];
            existing.openPositionCount = existing.jobPostingIds.length;
          } else {
            recruiterMap.set(key, recruiter);
          }
        }
      } catch (err) {
        errors.push(`Job detail ${jobId}: ${err instanceof Error ? err.message : String(err)}`);
      }
      await delay(REQUEST_DELAY_MS);
    }

    onProgress?.("Job details fetched", detailJobs.length);
  }

  // ── Step 4: Resolve incomplete profiles ──

  if (doResolve) {
    const incomplete = [...contactMap.values()].filter(
      (c) => c.publicIdentifier && (!c.firstName || !c.title),
    );

    if (incomplete.length > 0) {
      onProgress?.("Resolving profiles", 0);

      for (const contact of incomplete.slice(0, 20)) {
        try {
          const profile = await resolveProfile(contact.publicIdentifier!, csrfToken);
          if (profile) {
            contact.firstName = profile.firstName ?? contact.firstName;
            contact.lastName = profile.lastName ?? contact.lastName;
            contact.title = profile.headline ?? contact.title;
            contact.profilePictureUrl =
              resolveProfilePicture(profile.profilePicture) ?? contact.profilePictureUrl;
            contact.connectionDegree =
              parseConnectionDegree(profile.connectionDegree) ?? contact.connectionDegree;
          }
        } catch {
          // Non-critical -- skip silently
        }
        await delay(REQUEST_DELAY_MS);
      }

      onProgress?.("Profiles resolved", incomplete.length);
    }
  }

  return {
    companyNumericId,
    jobPostingsScanned: jobsToScan.length,
    hiringContacts: [...contactMap.values()],
    recruiters: [...recruiterMap.values()],
    errors,
    durationMs: Date.now() - start,
  };
}

// ── Integration: Extract Decision Makers ────────────────────────────────

/**
 * Identify decision makers from Voyager hiring discovery results.
 *
 * Applies the same authority classification used in the main app's
 * classifyContact() (src/apollo/resolvers/contacts/classification.ts)
 * to the Voyager-sourced title data, then ranks by authority signal
 * strength using the contact ranker weights.
 *
 * Decision maker criteria (from classification.ts):
 * - authorityScore >= 0.70 (after gatekeeper penalty)
 * - C-level, Founder, Partner, VP, Director seniority tiers
 * - Non-HR/Recruiting department (gatekeepers get 0.4x penalty)
 *
 * Additional Voyager-specific signals:
 * - source="hiring_team" → +0.10 authority boost (confirmed by LinkedIn)
 * - Multiple jobPostingIds → +0.05 per additional posting (active hiring)
 * - connectionDegree="FIRST" → +0.05 (reachable without InMail)
 */
export interface HiringDecisionMaker {
  contact: HiringContact;
  /** Authority score (0-1) from title classification + Voyager signals */
  authorityScore: number;
  seniority: string;
  department: string;
  isDecisionMaker: boolean;
  /** Why this contact was flagged as a decision maker */
  reasons: string[];
  /** Suggested outreach priority (1 = highest) */
  priority: number;
  /** Whether to bypass this contact (e.g., recruiter gatekeeper) */
  isGatekeeper: boolean;
}

/**
 * Title-based authority classification.
 *
 * Mirrors classifyContact() from the main app. We inline a lightweight
 * version here to avoid importing from the Next.js app into the Chrome
 * extension bundle.
 */
function classifyTitle(title: string | null): {
  seniority: string;
  department: string;
  authorityScore: number;
  isGatekeeper: boolean;
} {
  const raw = title?.trim() ?? "";
  if (!raw) {
    return { seniority: "IC", department: "Other", authorityScore: 0.10, isGatekeeper: false };
  }

  const t = raw.toLowerCase();

  // ── Seniority ──
  let seniority = "IC";
  let score = 0.10;

  const C_LEVEL = [
    "chief executive", "chief technology", "chief technical", "chief product",
    "chief operating", "chief financial", "chief revenue", "chief marketing",
    "chief data", "chief ai", "chief machine learning", "chief architect",
  ];
  const isCLevel =
    C_LEVEL.some((p) => t.includes(p)) ||
    /\bceo\b/.test(t) || /\bcto\b/.test(t) || /\bcfo\b/.test(t) ||
    /\bcoo\b/.test(t) || /\bcpo\b/.test(t) || /\bcro\b/.test(t) || /\bcmo\b/.test(t);

  if (isCLevel) {
    seniority = "C-level"; score = 1.0;
  } else if (["founder", "co-founder", "cofounder", "president"].some((p) => t.includes(p))) {
    seniority = "Founder"; score = 0.95;
  } else if (["managing partner", "general partner", " partner", "equity partner"].some((p) => t.includes(p))) {
    seniority = "Partner"; score = 0.90;
  } else if (
    ["vice president", "vp of", "vp,", "vp engineering", "vp product", "vp sales",
     "vp marketing", "vp business", "vp operations", "vp ai", "vp technology",
     "vp research", "vp data"].some((p) => t.includes(p)) ||
    t.startsWith("vp ") || t === "vp"
  ) {
    seniority = "VP"; score = 0.85;
  } else if (
    ["director of", "director,", "director ", "head of", "general manager",
     "managing director", "executive director"].some((p) => t.includes(p)) ||
    t === "director"
  ) {
    seniority = "Director"; score = 0.75;
  } else if (
    ["engineering manager", "product manager", "team lead", "tech lead",
     "technical lead"].some((p) => t.includes(p)) ||
    (t.includes("manager") && !t.includes("general manager")) ||
    t.endsWith(" lead")
  ) {
    seniority = "Manager"; score = 0.50;
  } else if (["senior ", "staff ", "principal ", "sr. "].some((p) => t.includes(p))) {
    seniority = "Senior"; score = 0.25;
  }

  // ── Department ──
  let department = "Other";
  let isGatekeeper = false;

  const AI_ML = [
    "artificial intelligence", " ai ", "machine learning", "deep learning",
    "data science", "mlops", "ml engineer", "llm", "ai engineer", "ai architect",
  ];
  if (AI_ML.some((p) => t.includes(p)) || t.startsWith("ai ") || t.endsWith(" ai")) {
    department = "AI/ML";
  } else if (["engineer", "developer", "software", "backend", "frontend", "full stack",
              "platform", "infrastructure", "devops", "sre", "architect", "cto"].some((p) => t.includes(p))) {
    department = "Engineering";
  } else if (["product manager", "product owner", "head of product", "cpo", "ux"].some((p) => t.includes(p))) {
    department = "Product";
  } else if (["sales", "business development", "account executive", "revenue",
              "partnerships", "cro"].some((p) => t.includes(p))) {
    department = "Sales/BD";
  } else if (["marketing", "growth", "cmo", "brand", "content"].some((p) => t.includes(p))) {
    department = "Marketing";
  } else if (["recruiter", "recruiting", "recruitment", "talent acquisition",
              "talent partner", "head of talent", "head of people", "chief people",
              "people operations", "hr manager", "human resources"].some((p) => t.includes(p))) {
    department = "HR/Recruiting";
    isGatekeeper = true;
  }

  // Gatekeeper penalty: HR/Recruiting contacts get 0.4x authority
  if (isGatekeeper) {
    score *= 0.4;
  }

  return { seniority, department, authorityScore: Math.round(score * 100) / 100, isGatekeeper };
}

/**
 * Extract and rank hiring decision makers from a discovery result.
 *
 * @param result — Output from discoverHiringContacts()
 * @returns Sorted array of decision makers (highest priority first)
 */
export function extractDecisionMakers(
  result: HiringDiscoveryResult,
): HiringDecisionMaker[] {
  const ranked: HiringDecisionMaker[] = [];

  for (const contact of result.hiringContacts) {
    const classification = classifyTitle(contact.title);
    const reasons: string[] = [];

    let adjustedScore = classification.authorityScore;

    // Voyager-specific boosts
    if (contact.source === "hiring_team") {
      adjustedScore += 0.10;
      reasons.push("Confirmed hiring team member");
    }

    if (contact.jobPostingIds.length > 1) {
      const boost = Math.min((contact.jobPostingIds.length - 1) * 0.05, 0.15);
      adjustedScore += boost;
      reasons.push(`Active on ${contact.jobPostingIds.length} job postings`);
    }

    if (contact.connectionDegree === "FIRST") {
      adjustedScore += 0.05;
      reasons.push("1st-degree connection (direct message possible)");
    }

    adjustedScore = Math.min(adjustedScore, 1.0);

    const isDecisionMaker = adjustedScore >= 0.70 && !classification.isGatekeeper;

    if (classification.seniority !== "IC") {
      reasons.push(`${classification.seniority} in ${classification.department}`);
    }
    if (classification.isGatekeeper) {
      reasons.push("Gatekeeper (HR/Recruiting) -- bypass for hiring DM");
    }

    ranked.push({
      contact,
      authorityScore: Math.round(adjustedScore * 100) / 100,
      seniority: classification.seniority,
      department: classification.department,
      isDecisionMaker,
      reasons,
      priority: 0, // Set below after sorting
      isGatekeeper: classification.isGatekeeper,
    });
  }

  // Sort by authority score descending, DMs first
  ranked.sort((a, b) => {
    if (a.isDecisionMaker !== b.isDecisionMaker) {
      return a.isDecisionMaker ? -1 : 1;
    }
    return b.authorityScore - a.authorityScore;
  });

  // Assign priority (1-indexed)
  for (let i = 0; i < ranked.length; i++) {
    ranked[i].priority = i + 1;
  }

  return ranked;
}

/**
 * Convert a HiringContact to the shape needed for the lead-gen GraphQL
 * createContact/importContacts mutation. Maps Voyager fields to the
 * ContactInput type from schema/contacts/schema.graphql.
 */
export function hiringContactToContactInput(
  contact: HiringContact,
  companyId?: number,
  companyName?: string,
): {
  firstName: string;
  lastName: string;
  linkedinUrl: string | null;
  position: string | null;
  companyId: number | undefined;
  company: string | undefined;
  tags: string[];
} {
  const tags: string[] = [`voyager:${contact.source}`];
  if (contact.connectionDegree !== "UNKNOWN") {
    tags.push(`connection:${contact.connectionDegree.toLowerCase()}`);
  }
  if (contact.inmailAvailable) {
    tags.push("inmail:available");
  }
  if (contact.jobPostingIds.length > 0) {
    tags.push(`jobs:${contact.jobPostingIds.length}`);
  }

  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    linkedinUrl: contact.linkedinUrl,
    position: contact.title,
    companyId,
    company: companyName,
    tags,
  };
}

/**
 * Convert a RecruiterProfile to the same contact input shape.
 */
export function recruiterToContactInput(
  recruiter: RecruiterProfile,
  companyId?: number,
  companyName?: string,
): {
  firstName: string;
  lastName: string;
  linkedinUrl: string | null;
  position: string | null;
  companyId: number | undefined;
  company: string | undefined;
  tags: string[];
} {
  const tags: string[] = ["voyager:recruiter"];
  if (recruiter.isInternal) {
    tags.push("recruiter:internal");
  } else {
    tags.push("recruiter:external");
    if (recruiter.agencyName) {
      tags.push(`agency:${recruiter.agencyName}`);
    }
  }
  tags.push(`connection:${recruiter.connectionDegree.toLowerCase()}`);
  tags.push(`open-positions:${recruiter.openPositionCount}`);

  return {
    firstName: recruiter.firstName,
    lastName: recruiter.lastName,
    linkedinUrl: recruiter.linkedinUrl,
    position: recruiter.headline,
    companyId,
    company: companyName,
    tags,
  };
}
