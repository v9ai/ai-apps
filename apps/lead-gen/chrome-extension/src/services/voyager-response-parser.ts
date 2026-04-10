/**
 * LinkedIn Voyager API Response Parser & Data Normalization
 *
 * Parses the normalized JSON response format used by LinkedIn's internal
 * Voyager API (accessed via chrome extension with authenticated session).
 *
 * Response format: { data: {}, included: [], paging?: {} }
 * - `data` contains the primary response with entity URN references
 * - `included[]` contains denormalized referenced entities (profiles, companies, jobs, images)
 * - `$type` field on each entity enables type discrimination
 * - Entity URNs (e.g. "urn:li:fsd_company:12345") cross-reference between data and included
 *
 * Supports:
 * - com.linkedin.voyager.dash.jobs.* types (job cards, postings, search results)
 * - com.linkedin.voyager.dash.identity.profile.* types (profiles, connections)
 * - com.linkedin.voyager.dash.organization.* types (companies)
 * - com.linkedin.voyager.dash.common.text.TextViewModel (rich text in descriptions)
 * - Image/media URL resolution from vectorImage artifacts
 * - Error response parsing (401, 403, 429, 999)
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. Voyager Type Constants
// ────────────────────────────────────────────────────────────────────────────

/** Known $type values in Voyager responses. Non-exhaustive but covers the job/company/profile domain. */
export const VoyagerTypes = {
  // Jobs
  JOB_POSTING: "com.linkedin.voyager.dash.jobs.JobPosting",
  JOB_CARD: "com.linkedin.voyager.dash.jobs.JobCard",
  JOB_SEARCH_CARD: "com.linkedin.voyager.dash.jobs.search.JobSearchCard",
  JOB_SEARCH_CARDS_COLLECTION: "com.linkedin.voyager.dash.jobs.search.JobSearchCardsCollection",
  JOB_POSTING_CARD: "com.linkedin.voyager.dash.jobs.JobPostingCard",
  JOB_VIEW: "com.linkedin.voyager.dash.jobs.JobView",

  // Companies / Organizations
  COMPANY: "com.linkedin.voyager.dash.organization.Company",
  COMPANY_MINI: "com.linkedin.voyager.dash.organization.MiniCompany",
  ORGANIZATION: "com.linkedin.voyager.dash.organization.Organization",

  // Profiles
  PROFILE: "com.linkedin.voyager.dash.identity.profile.Profile",
  PROFILE_MINI: "com.linkedin.voyager.dash.identity.profile.MiniProfile",
  MEMBER: "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities",
  PROFILE_POSITION: "com.linkedin.voyager.dash.identity.profile.Position",

  // Connections
  CONNECTION: "com.linkedin.voyager.dash.relationships.Connection",

  // Rich text
  TEXT_VIEW_MODEL: "com.linkedin.voyager.dash.common.text.TextViewModel",
  ATTRIBUTED_TEXT: "com.linkedin.voyager.dash.common.text.AttributedText",

  // Media / Images
  VECTOR_IMAGE: "com.linkedin.common.VectorImage",
  IMAGE: "com.linkedin.voyager.dash.common.image.ImageViewModel",
  PHOTO_FILTER_EDIT_PHOTO: "com.linkedin.voyager.dash.identity.profile.PhotoFilterEditPhoto",

  // Paging
  COLLECTION_RESPONSE: "com.linkedin.restli.common.CollectionResponse",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// 2. Raw Voyager Response Types
// ────────────────────────────────────────────────────────────────────────────

/** Any entity in a Voyager response has $type and entityUrn. */
export interface VoyagerEntity {
  $type: string;
  entityUrn?: string;
  /** Any entity can have an $id shorthand (usually same as entityUrn). */
  $id?: string;
  /** Catch-all for entity-specific fields. */
  [key: string]: unknown;
}

/** The top-level shape of a Voyager normalized+json response. */
export interface VoyagerRawResponse {
  /** Primary data payload. Shape depends on endpoint. */
  data?: Record<string, unknown> & {
    $type?: string;
    entityUrn?: string;
    /** Paging info sometimes nested here. */
    paging?: VoyagerPaging;
    /** Some endpoints put elements at data.elements. */
    elements?: unknown[];
    /** Some endpoints use *Elements pattern for collections. */
    [key: string]: unknown;
  };

  /** Denormalized referenced entities — the core of Voyager's normalization strategy. */
  included?: VoyagerEntity[];

  /** Top-level paging (present in most list/search endpoints). */
  paging?: VoyagerPaging;

  /** Top-level elements (older Voyager format, pre-normalization). */
  elements?: VoyagerEntity[];

  /** Response metadata — varies per endpoint. */
  metadata?: VoyagerMetadata;
}

export interface VoyagerPaging {
  /** Total number of results available server-side. */
  total?: number;
  /** Number of results returned in this page. */
  count?: number;
  /** Offset of the first result in this page. */
  start?: number;
  /** Links to next/prev pages (rarely used — we paginate via start/count). */
  links?: Array<{ rel: string; href: string; type: string }>;
}

export interface VoyagerMetadata {
  /** Server-side request ID for debugging. */
  id?: string;
  /** A/B test information. */
  abTest?: Record<string, unknown>;
  /** Search-specific metadata. */
  searchId?: string;
  guidanceCards?: unknown[];
  /** Facet counts for search refinement. */
  facetResultFilter?: unknown;
  /** Total result count (sometimes duplicated from paging). */
  numResults?: number;
  /** Catch-all. */
  [key: string]: unknown;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Error Response Types
// ────────────────────────────────────────────────────────────────────────────

export interface VoyagerErrorResponse {
  /** HTTP status code. */
  status: number;
  /** LinkedIn error code string (e.g. "UNAUTHORIZED", "THROTTLED"). */
  serviceErrorCode?: number;
  /** Human-readable message. */
  message?: string;
  /** Request ID for support tickets. */
  requestId?: string;
}

/**
 * Status code semantics for LinkedIn Voyager API:
 *
 * 401 — Session expired or CSRF token invalid. User must re-login.
 * 403 — Feature gated or insufficient permissions (e.g. Sales Navigator endpoint without license).
 * 429 — Rate limited. Respect Retry-After header. LinkedIn throttles ~100 req/min per session.
 * 999 — LinkedIn-specific "Request denied" — IP/browser fingerprint flagged as bot.
 *       This is NOT a standard HTTP code. Often returned instead of 403 for aggressive automation.
 */
export type VoyagerErrorStatus = 401 | 403 | 429 | 999;

export interface ParsedVoyagerError {
  status: VoyagerErrorStatus | number;
  retryable: boolean;
  message: string;
  /** Suggested wait time in ms before retrying (only for 429). */
  retryAfterMs: number | null;
  /** Raw error body if available. */
  raw: VoyagerErrorResponse | null;
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Parsed/Clean Output Types
// ────────────────────────────────────────────────────────────────────────────

export interface ParsedJobPosting {
  entityUrn: string;
  /** Numeric job posting ID extracted from URN. */
  jobPostingId: string;
  title: string;
  description: string;
  /** Plain text description with rich text formatting stripped. */
  descriptionPlainText: string;
  companyName: string | null;
  companyUrn: string | null;
  companyLogoUrl: string | null;
  location: string | null;
  /** Remote, on-site, or hybrid. */
  workplaceType: string | null;
  /** FULL_TIME, PART_TIME, CONTRACT, etc. */
  employmentType: string | null;
  /** Experience level (ENTRY, MID_SENIOR, DIRECTOR, etc.) */
  experienceLevel: string | null;
  /** Posted timestamp as ISO string. */
  listedAt: string | null;
  /** Expiry timestamp as ISO string. */
  expiresAt: string | null;
  /** Number of applicants. */
  applicantCount: number | null;
  /** Apply URL (external or LinkedIn Easy Apply). */
  applyUrl: string | null;
  /** Salary range if disclosed. */
  salary: {
    min: number | null;
    max: number | null;
    currency: string | null;
    period: string | null;
  } | null;
  /** Skills mentioned in the posting. */
  skills: string[];
  /** Industries associated with the posting. */
  industries: string[];
  /** Raw entity for fields we haven't mapped. */
  _raw: VoyagerEntity;
}

export interface ParsedCompany {
  entityUrn: string;
  companyId: string;
  name: string;
  universalName: string | null;
  description: string | null;
  industry: string | null;
  employeeCount: number | null;
  employeeCountRange: string | null;
  headquarters: string | null;
  website: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  specialties: string[];
  foundedYear: number | null;
  _raw: VoyagerEntity;
}

export interface ParsedProfile {
  entityUrn: string;
  publicIdentifier: string | null;
  firstName: string;
  lastName: string;
  headline: string | null;
  location: string | null;
  profilePictureUrl: string | null;
  backgroundImageUrl: string | null;
  /** Current positions (from included Position entities). */
  positions: Array<{
    title: string;
    companyName: string | null;
    companyUrn: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
  }>;
  _raw: VoyagerEntity;
}

export interface ParsedJobSearchResult {
  jobs: ParsedJobPosting[];
  paging: VoyagerPaging;
  metadata: {
    searchId: string | null;
    numResults: number | null;
  };
}

export interface ParsedConnection {
  entityUrn: string;
  firstName: string;
  lastName: string;
  publicIdentifier: string;
  headline: string | null;
  profilePictureUrl: string | null;
  connectedAt: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Entity Resolution Index
// ────────────────────────────────────────────────────────────────────────────

/**
 * Index of included[] entities keyed by entityUrn for O(1) cross-reference resolution.
 * This is the core mechanism for de-normalizing Voyager responses.
 */
class EntityIndex {
  private byUrn = new Map<string, VoyagerEntity>();
  private byType = new Map<string, VoyagerEntity[]>();

  constructor(included: VoyagerEntity[]) {
    for (const entity of included) {
      // Index by entityUrn
      const urn = entity.entityUrn ?? entity.$id;
      if (urn) {
        this.byUrn.set(urn, entity);
      }
      // Index by $type
      if (entity.$type) {
        const existing = this.byType.get(entity.$type) ?? [];
        existing.push(entity);
        this.byType.set(entity.$type, existing);
      }
    }
  }

  /** Resolve an entity URN to its full entity from included[]. Returns null if not found. */
  resolve(urnOrRef: string | null | undefined): VoyagerEntity | null {
    if (!urnOrRef) return null;
    // Handle both direct URNs and *Ref patterns (e.g. "urn:li:fsd_company:12345")
    return this.byUrn.get(urnOrRef) ?? null;
  }

  /** Get all entities of a specific $type. */
  getByType(type: string): VoyagerEntity[] {
    return this.byType.get(type) ?? [];
  }

  /** Get all entity URNs in the index. */
  allUrns(): string[] {
    return [...this.byUrn.keys()];
  }

  /** Get the total number of indexed entities. */
  get size(): number {
    return this.byUrn.size;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Rich Text Parser
// ────────────────────────────────────────────────────────────────────────────

/**
 * Parse com.linkedin.voyager.dash.common.text.TextViewModel into plain text.
 *
 * TextViewModel structure:
 * {
 *   $type: "com.linkedin.voyager.dash.common.text.TextViewModel",
 *   text: "The raw text content...",
 *   attributesV2: [
 *     {
 *       start: 0,
 *       length: 10,
 *       detailData: {
 *         $type: "...",
 *         // type-specific: hyperlink, mention, hashtag, bold, etc.
 *       }
 *     }
 *   ],
 *   accessibilityText: "Screen reader text"
 * }
 *
 * AttributedText is the older variant with the same structure.
 */
function parseRichText(textModel: unknown): { text: string; plainText: string } {
  if (!textModel || typeof textModel !== "object") {
    return { text: "", plainText: "" };
  }

  const model = textModel as Record<string, unknown>;

  // The .text field contains the full text content (attributes are overlay metadata)
  const text = typeof model.text === "string" ? model.text : "";

  // For plain text, strip any embedded HTML entities and normalize whitespace
  const plainText = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  return { text, plainText };
}

/**
 * Parse job description which may be either:
 * 1. A TextViewModel object (newer format)
 * 2. A plain HTML string (older format, from description.text)
 * 3. A nested { text: string } object
 */
function parseJobDescription(desc: unknown): { html: string; plainText: string } {
  if (!desc) return { html: "", plainText: "" };

  // Case 1: String (raw HTML)
  if (typeof desc === "string") {
    const plainText = desc
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { html: desc, plainText };
  }

  // Case 2: Object with $type (TextViewModel or AttributedText)
  if (typeof desc === "object") {
    const obj = desc as Record<string, unknown>;
    if (
      obj.$type === VoyagerTypes.TEXT_VIEW_MODEL ||
      obj.$type === VoyagerTypes.ATTRIBUTED_TEXT
    ) {
      const { text, plainText } = parseRichText(desc);
      return { html: text, plainText };
    }
    // Case 3: Nested { text: "..." }
    if (typeof obj.text === "string") {
      return parseJobDescription(obj.text);
    }
  }

  return { html: "", plainText: "" };
}

// ────────────────────────────────────────────────────────────────────────────
// 7. Image URL Resolution
// ────────────────────────────────────────────────────────────────────────────

/**
 * Resolve image URLs from Voyager's VectorImage format.
 *
 * VectorImage structure:
 * {
 *   $type: "com.linkedin.common.VectorImage",
 *   rootUrl: "https://media.licdn.com/dms/image/...",
 *   artifacts: [
 *     { width: 100, height: 100, fileIdentifyingUrlPathSegment: "100_100/0/..." },
 *     { width: 200, height: 200, fileIdentifyingUrlPathSegment: "200_200/0/..." },
 *     { width: 400, height: 400, fileIdentifyingUrlPathSegment: "400_400/0/..." },
 *   ]
 * }
 *
 * The full URL is: rootUrl + artifact.fileIdentifyingUrlPathSegment
 *
 * Some entities use the newer format with a top-level `url` field directly.
 */
function resolveImageUrl(
  imageData: unknown,
  preferredSize: "small" | "medium" | "large" = "medium",
): string | null {
  if (!imageData || typeof imageData !== "object") return null;

  const img = imageData as Record<string, unknown>;

  // Direct URL (newer format or already resolved)
  if (typeof img.url === "string" && img.url.startsWith("http")) {
    return img.url;
  }

  // VectorImage format
  const rootUrl = img.rootUrl as string | undefined;
  const artifacts = img.artifacts as Array<{
    width?: number;
    height?: number;
    fileIdentifyingUrlPathSegment?: string;
    expiresAt?: number;
  }> | undefined;

  if (!rootUrl || !Array.isArray(artifacts) || artifacts.length === 0) {
    return null;
  }

  // Sort artifacts by width ascending
  const sorted = [...artifacts].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));

  // Pick artifact based on preferred size
  let artifact: (typeof sorted)[number];
  switch (preferredSize) {
    case "small":
      artifact = sorted[0];
      break;
    case "large":
      artifact = sorted[sorted.length - 1];
      break;
    case "medium":
    default:
      artifact = sorted[Math.floor(sorted.length / 2)];
      break;
  }

  if (!artifact.fileIdentifyingUrlPathSegment) return null;

  return rootUrl + artifact.fileIdentifyingUrlPathSegment;
}

/**
 * Extract image URL from various nested image structures in Voyager entities.
 * Handles: logo, logoResolutionResult, miniCompany.logo, vectorImage, image, etc.
 */
function extractEntityImageUrl(
  entity: VoyagerEntity,
  imageField: string,
  preferredSize: "small" | "medium" | "large" = "medium",
): string | null {
  const fieldValue = entity[imageField];
  if (!fieldValue) return null;

  // Direct VectorImage
  if (typeof fieldValue === "object" && (fieldValue as Record<string, unknown>).$type === VoyagerTypes.VECTOR_IMAGE) {
    return resolveImageUrl(fieldValue, preferredSize);
  }

  // Nested in a wrapper object (e.g. logo: { vectorImage: { ... } })
  if (typeof fieldValue === "object") {
    const obj = fieldValue as Record<string, unknown>;
    if (obj.vectorImage) return resolveImageUrl(obj.vectorImage, preferredSize);
    if (obj.image) return resolveImageUrl(obj.image, preferredSize);
    // Try rootUrl directly (sometimes the field IS the vectorImage without $type)
    if (obj.rootUrl) return resolveImageUrl(obj, preferredSize);
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// 8. URN Parsing Utilities
// ────────────────────────────────────────────────────────────────────────────

/** Extract the numeric ID from a LinkedIn entity URN. */
function parseUrnId(urn: string | null | undefined): string | null {
  if (!urn) return null;
  // URN formats:
  //   urn:li:fsd_company:12345
  //   urn:li:company:12345
  //   urn:li:fsd_jobPosting:67890
  //   urn:li:jobPosting:67890
  //   urn:li:fsd_profile:abc123
  //   urn:li:member:12345
  const match = urn.match(/:(\d+)$/);
  return match?.[1] ?? null;
}

/** Extract the entity type from a URN. */
function parseUrnType(urn: string | null | undefined): string | null {
  if (!urn) return null;
  // urn:li:fsd_jobPosting:12345 -> "fsd_jobPosting"
  const match = urn.match(/urn:li:([^:]+):/);
  return match?.[1] ?? null;
}

/** Safely extract a string field, returning null if missing/wrong type. */
function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Safely extract a number field. */
function num(value: unknown): number | null {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

/** Convert LinkedIn epoch milliseconds to ISO string. */
function epochMsToIso(ms: unknown): string | null {
  const n = num(ms);
  if (n === null || n <= 0) return null;
  return new Date(n).toISOString();
}

/** Convert LinkedIn date object { month, year } to ISO-ish string. */
function linkedInDateToString(dateObj: unknown): string | null {
  if (!dateObj || typeof dateObj !== "object") return null;
  const d = dateObj as Record<string, unknown>;
  const year = num(d.year);
  if (!year) return null;
  const month = num(d.month);
  if (month) return `${year}-${String(month).padStart(2, "0")}`;
  return String(year);
}

// ────────────────────────────────────────────────────────────────────────────
// 9. Entity Parsers
// ────────────────────────────────────────────────────────────────────────────

function parseJobPostingEntity(entity: VoyagerEntity, index: EntityIndex): ParsedJobPosting {
  const urn = entity.entityUrn ?? "";
  const jobPostingId = parseUrnId(urn) ?? "";

  // Description can be in multiple locations depending on endpoint/decoration
  const descObj = entity.description ?? entity.descriptionText ?? entity.jobDescription;
  const { html: description, plainText: descriptionPlainText } = parseJobDescription(descObj);

  // Company resolution: companyUrn -> resolve from included[]
  const companyUrn = str(entity.companyUrn as string)
    ?? str(entity.companyResolutionResult as string)
    ?? str((entity.companyDetails as Record<string, unknown>)?.companyUrn as string)
    ?? null;

  let companyName: string | null = null;
  let companyLogoUrl: string | null = null;

  if (companyUrn) {
    const companyEntity = index.resolve(companyUrn);
    if (companyEntity) {
      companyName = str(companyEntity.name as string)
        ?? str(companyEntity.universalName as string);
      companyLogoUrl = extractEntityImageUrl(companyEntity, "logo")
        ?? extractEntityImageUrl(companyEntity, "logoResolutionResult");
    }
  }

  // Fallback: inline company name
  if (!companyName) {
    companyName = str(entity.companyName as string)
      ?? str((entity.companyDetails as Record<string, unknown>)?.companyName as string)
      ?? null;
  }

  // Location
  const location = str(entity.formattedLocation as string)
    ?? str(entity.locationName as string)
    ?? null;

  // Workplace type mapping
  const workplaceTypeRaw = entity.workplaceType ?? entity.workplaceTypes;
  let workplaceType: string | null = null;
  if (typeof workplaceTypeRaw === "string") {
    workplaceType = workplaceTypeRaw;
  } else if (Array.isArray(workplaceTypeRaw) && workplaceTypeRaw.length > 0) {
    // Workplace type enum: 1 = On-site, 2 = Remote, 3 = Hybrid
    const first = workplaceTypeRaw[0];
    if (first === 2 || first === "2" || first === "REMOTE") workplaceType = "Remote";
    else if (first === 3 || first === "3" || first === "HYBRID") workplaceType = "Hybrid";
    else if (first === 1 || first === "1" || first === "ON_SITE") workplaceType = "On-site";
    else workplaceType = String(first);
  }

  // Employment type
  const employmentType = str(entity.employmentType as string)
    ?? str(entity.formattedEmploymentStatus as string)
    ?? null;

  // Experience level
  const experienceLevel = str(entity.experienceLevel as string)
    ?? str(entity.formattedExperienceLevel as string)
    ?? null;

  // Timestamps
  const listedAt = epochMsToIso(entity.listedAt) ?? epochMsToIso(entity.createdAt);
  const expiresAt = epochMsToIso(entity.expireAt) ?? epochMsToIso(entity.closedAt);

  // Applicants
  const applicantCount = num(entity.applicantCount)
    ?? num((entity.jobInsight as Record<string, unknown>)?.applicantCount);

  // Apply URL
  const applyUrl = str(entity.applyUrl as string)
    ?? str((entity.applyMethod as Record<string, unknown>)?.companyApplyUrl as string)
    ?? str((entity.applyMethod as Record<string, unknown>)?.easyApplyUrl as string)
    ?? null;

  // Salary
  let salary: ParsedJobPosting["salary"] = null;
  const salaryObj = entity.salaryInsight ?? entity.compensationInsight ?? entity.salary;
  if (salaryObj && typeof salaryObj === "object") {
    const s = salaryObj as Record<string, unknown>;
    const compensationRange = s.compensationRange ?? s.salaryRange ?? s;
    if (compensationRange && typeof compensationRange === "object") {
      const range = compensationRange as Record<string, unknown>;
      const minComp = range.min ?? range.minimumValue;
      const maxComp = range.max ?? range.maximumValue;
      if (minComp || maxComp) {
        salary = {
          min: typeof minComp === "object"
            ? num((minComp as Record<string, unknown>).amount)
            : num(minComp),
          max: typeof maxComp === "object"
            ? num((maxComp as Record<string, unknown>).amount)
            : num(maxComp),
          currency: str(
            (typeof minComp === "object" ? (minComp as Record<string, unknown>).currencyCode : null) as string
            ?? (range.currencyCode as string)
          ),
          period: str(range.payPeriod as string) ?? str(range.period as string),
        };
      }
    }
  }

  // Skills
  const skills: string[] = [];
  const skillsArr = entity.skills ?? entity.skillMatchStatuses ?? entity.jobSkills;
  if (Array.isArray(skillsArr)) {
    for (const s of skillsArr) {
      if (typeof s === "string") {
        skills.push(s);
      } else if (typeof s === "object" && s !== null) {
        const skillObj = s as Record<string, unknown>;
        const name = str(skillObj.name as string) ?? str(skillObj.localizedSkillDisplayName as string);
        if (name) skills.push(name);
      }
    }
  }

  // Industries
  const industries: string[] = [];
  const industriesArr = entity.industries ?? entity.formattedIndustries;
  if (Array.isArray(industriesArr)) {
    for (const ind of industriesArr) {
      if (typeof ind === "string") industries.push(ind);
      else if (typeof ind === "object" && ind !== null) {
        const name = str((ind as Record<string, unknown>).name as string)
          ?? str((ind as Record<string, unknown>).localizedName as string);
        if (name) industries.push(name);
      }
    }
  }

  return {
    entityUrn: urn,
    jobPostingId,
    title: str(entity.title as string) ?? str(entity.jobPostingTitle as string) ?? "",
    description,
    descriptionPlainText,
    companyName,
    companyUrn,
    companyLogoUrl,
    location,
    workplaceType,
    employmentType,
    experienceLevel,
    listedAt,
    expiresAt,
    applicantCount,
    applyUrl,
    salary,
    skills,
    industries,
    _raw: entity,
  };
}

function parseCompanyEntity(entity: VoyagerEntity, index: EntityIndex): ParsedCompany {
  const urn = entity.entityUrn ?? "";
  const companyId = parseUrnId(urn) ?? "";

  // Description may be a TextViewModel
  const descRaw = entity.description ?? entity.descriptionText;
  let description: string | null = null;
  if (typeof descRaw === "string") {
    description = descRaw;
  } else if (descRaw && typeof descRaw === "object") {
    const { plainText } = parseRichText(descRaw);
    description = plainText || null;
  }

  // Employee count
  const employeeCount = num(entity.staffCount) ?? num(entity.employeeCount);

  // Employee count range
  const rangeObj = entity.staffCountRange ?? entity.employeeCountRange;
  let employeeCountRange: string | null = null;
  if (rangeObj && typeof rangeObj === "object") {
    const r = rangeObj as Record<string, unknown>;
    const start = num(r.start);
    const end = num(r.end);
    if (start !== null && end !== null) {
      employeeCountRange = `${start}-${end}`;
    } else if (start !== null) {
      employeeCountRange = `${start}+`;
    }
  } else if (typeof rangeObj === "string") {
    employeeCountRange = rangeObj;
  }

  // Headquarters
  let headquarters: string | null = null;
  const hqObj = entity.headquarter ?? entity.headquarters ?? entity.confirmedLocations;
  if (typeof hqObj === "string") {
    headquarters = hqObj;
  } else if (hqObj && typeof hqObj === "object") {
    const hq = hqObj as Record<string, unknown>;
    const parts = [
      str(hq.city as string),
      str(hq.geographicArea as string) ?? str(hq.state as string),
      str(hq.country as string),
    ].filter(Boolean);
    headquarters = parts.length > 0 ? parts.join(", ") : null;
  } else if (Array.isArray(hqObj) && hqObj.length > 0) {
    const first = hqObj[0] as Record<string, unknown>;
    const parts = [
      str(first.city as string),
      str(first.geographicArea as string),
      str(first.country as string),
    ].filter(Boolean);
    headquarters = parts.length > 0 ? parts.join(", ") : null;
  }

  // Logo
  const logoUrl = extractEntityImageUrl(entity, "logo")
    ?? extractEntityImageUrl(entity, "logoResolutionResult")
    ?? extractEntityImageUrl(entity, "companyLogoUrl");

  // Cover image
  const coverImageUrl = extractEntityImageUrl(entity, "backgroundCoverImage")
    ?? extractEntityImageUrl(entity, "coverPhoto");

  // Specialties
  const specialties: string[] = [];
  const specArr = entity.specialities ?? entity.specialties;
  if (Array.isArray(specArr)) {
    for (const s of specArr) {
      if (typeof s === "string") specialties.push(s);
    }
  }

  // Industry
  const industryObj = entity.companyIndustries ?? entity.industry;
  let industry: string | null = null;
  if (typeof industryObj === "string") {
    industry = industryObj;
  } else if (Array.isArray(industryObj) && industryObj.length > 0) {
    const first = industryObj[0];
    industry = typeof first === "string"
      ? first
      : str((first as Record<string, unknown>).localizedName as string);
  }

  return {
    entityUrn: urn,
    companyId,
    name: str(entity.name as string) ?? str(entity.universalName as string) ?? "",
    universalName: str(entity.universalName as string),
    description,
    industry,
    employeeCount,
    employeeCountRange,
    headquarters,
    website: str(entity.companyPageUrl as string) ?? str(entity.websiteUrl as string),
    logoUrl,
    coverImageUrl,
    specialties,
    foundedYear: num(entity.foundedOn as number)
      ?? num((entity.foundedOn as Record<string, unknown>)?.year),
    _raw: entity,
  };
}

function parseProfileEntity(entity: VoyagerEntity, index: EntityIndex): ParsedProfile {
  const urn = entity.entityUrn ?? "";

  // Profile picture
  const profilePictureUrl = extractEntityImageUrl(entity, "profilePicture")
    ?? extractEntityImageUrl(entity, "picture")
    ?? extractEntityImageUrl(entity, "miniProfilePicture");

  // Background image
  const backgroundImageUrl = extractEntityImageUrl(entity, "backgroundImage")
    ?? extractEntityImageUrl(entity, "backgroundPicture");

  // Location
  const location = str(entity.geoLocationName as string)
    ?? str(entity.locationName as string)
    ?? str((entity.geoLocation as Record<string, unknown>)?.city as string)
    ?? null;

  // Positions — may be resolved from included[] or inline
  const positions: ParsedProfile["positions"] = [];
  const posUrns = entity.profilePositionGroups ?? entity.positionGroups ?? entity.positions;

  if (Array.isArray(posUrns)) {
    for (const posRef of posUrns) {
      // posRef could be a URN string or an inline object
      let posEntity: Record<string, unknown> | null = null;

      if (typeof posRef === "string") {
        posEntity = index.resolve(posRef) as Record<string, unknown> | null;
      } else if (typeof posRef === "object" && posRef !== null) {
        posEntity = posRef as Record<string, unknown>;
      }

      if (!posEntity) continue;

      // Position groups have nested profilePositionInPositionGroup
      const innerPositions = posEntity.profilePositionInPositionGroup ?? posEntity.positions;
      if (Array.isArray(innerPositions)) {
        for (const inner of innerPositions) {
          const pos = typeof inner === "string" ? index.resolve(inner) : inner;
          if (!pos || typeof pos !== "object") continue;
          const p = pos as Record<string, unknown>;
          positions.push({
            title: str(p.title as string) ?? "",
            companyName: str(p.companyName as string)
              ?? str((p.company as Record<string, unknown>)?.name as string)
              ?? null,
            companyUrn: str(p.companyUrn as string) ?? null,
            startDate: linkedInDateToString(p.dateRange ? (p.dateRange as Record<string, unknown>).start : p.startDate),
            endDate: linkedInDateToString(p.dateRange ? (p.dateRange as Record<string, unknown>).end : p.endDate),
            isCurrent: !!(p.dateRange
              ? !(p.dateRange as Record<string, unknown>).end
              : !p.endDate),
          });
        }
      } else {
        // Direct position entity
        positions.push({
          title: str(posEntity.title as string) ?? "",
          companyName: str(posEntity.companyName as string) ?? null,
          companyUrn: str(posEntity.companyUrn as string) ?? null,
          startDate: linkedInDateToString(
            posEntity.dateRange
              ? (posEntity.dateRange as Record<string, unknown>).start
              : posEntity.startDate
          ),
          endDate: linkedInDateToString(
            posEntity.dateRange
              ? (posEntity.dateRange as Record<string, unknown>).end
              : posEntity.endDate
          ),
          isCurrent: !!(posEntity.dateRange
            ? !(posEntity.dateRange as Record<string, unknown>).end
            : !posEntity.endDate),
        });
      }
    }
  }

  return {
    entityUrn: urn,
    publicIdentifier: str(entity.publicIdentifier as string),
    firstName: str(entity.firstName as string) ?? "",
    lastName: str(entity.lastName as string) ?? "",
    headline: str(entity.headline as string),
    location,
    profilePictureUrl,
    backgroundImageUrl,
    positions,
    _raw: entity,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 10. Main Parser Class
// ────────────────────────────────────────────────────────────────────────────

export class VoyagerResponseParser {
  private raw: VoyagerRawResponse;
  private index: EntityIndex;

  constructor(response: unknown) {
    // Validate basic shape
    if (!response || typeof response !== "object") {
      this.raw = {};
      this.index = new EntityIndex([]);
      return;
    }

    this.raw = response as VoyagerRawResponse;
    this.index = new EntityIndex(this.raw.included ?? []);
  }

  // ── Static factory methods ──

  /** Parse a raw HTTP Response from a Voyager API call. */
  static async fromResponse(response: Response): Promise<VoyagerResponseParser | ParsedVoyagerError> {
    if (!response.ok) {
      return VoyagerResponseParser.parseError(response);
    }
    const json = await response.json();
    return new VoyagerResponseParser(json);
  }

  /** Parse an error response into a structured error object. */
  static async parseError(response: Response): Promise<ParsedVoyagerError> {
    const status = response.status as VoyagerErrorStatus;

    let raw: VoyagerErrorResponse | null = null;
    try {
      const body = await response.json();
      raw = { status, ...body };
    } catch {
      // Body may not be JSON (e.g. HTML error page for 999)
    }

    let message: string;
    let retryable = false;
    let retryAfterMs: number | null = null;

    switch (status) {
      case 401:
        message = "LinkedIn session expired — CSRF token or cookie invalid. User must re-login.";
        break;

      case 403:
        message = raw?.message
          ?? "Feature gated or insufficient permissions (may require Sales Navigator or Recruiter license).";
        break;

      case 429: {
        retryable = true;
        // Parse Retry-After header (seconds)
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10);
          retryAfterMs = isNaN(seconds) ? 60_000 : seconds * 1000;
        } else {
          // Default backoff: 60 seconds
          retryAfterMs = 60_000;
        }
        message = `Rate limited (429). Retry after ${retryAfterMs / 1000}s. LinkedIn throttles ~100 req/min per session.`;
        break;
      }

      case 999:
        // LinkedIn-specific non-standard code — IP/fingerprint flagged
        message = "Request denied (999) — LinkedIn has flagged this session as automated. "
          + "This is a LinkedIn-specific status code, not standard HTTP. "
          + "May require changing IP, clearing cookies, or waiting 24h.";
        break;

      default:
        message = raw?.message ?? `Voyager API error: HTTP ${status}`;
        if (status >= 500) retryable = true;
    }

    return { status, retryable, message, retryAfterMs, raw };
  }

  /** Check if a parsed result is an error. */
  static isError(result: VoyagerResponseParser | ParsedVoyagerError): result is ParsedVoyagerError {
    return "retryable" in result && "status" in result;
  }

  // ── Accessors ──

  /** Get the raw response data. */
  get data(): VoyagerRawResponse["data"] {
    return this.raw.data;
  }

  /** Get the entity index for manual resolution. */
  get entities(): EntityIndex {
    return this.index;
  }

  /** Get paging information (checks both top-level and nested). */
  get paging(): VoyagerPaging {
    return this.raw.paging
      ?? this.raw.data?.paging
      ?? { total: 0, count: 0, start: 0 };
  }

  /** Get response metadata. */
  get metadata(): VoyagerMetadata {
    return this.raw.metadata ?? {};
  }

  /** Total result count from paging. */
  get total(): number {
    return this.paging.total ?? 0;
  }

  // ── Entity resolution ──

  /** Resolve an entity URN to its full entity from included[]. */
  resolve(urn: string | null | undefined): VoyagerEntity | null {
    return this.index.resolve(urn);
  }

  /** Get all included entities of a specific $type. */
  getByType(type: string): VoyagerEntity[] {
    return this.index.getByType(type);
  }

  // ── Domain-specific parsers ──

  /**
   * Parse job search results (from voyagerJobsDashJobCards or similar).
   * Resolves company entities from included[] for each job card.
   */
  parseJobSearch(): ParsedJobSearchResult {
    const jobEntities = this.findJobEntities();
    const jobs = jobEntities.map((entity) => parseJobPostingEntity(entity, this.index));

    return {
      jobs,
      paging: this.paging,
      metadata: {
        searchId: str(this.metadata.searchId as string),
        numResults: num(this.metadata.numResults) ?? this.paging.total ?? null,
      },
    };
  }

  /**
   * Parse a single job posting detail response.
   */
  parseJobPosting(): ParsedJobPosting | null {
    // Try data root first
    if (this.raw.data?.$type?.includes("Job")) {
      return parseJobPostingEntity(this.raw.data as unknown as VoyagerEntity, this.index);
    }
    // Try included entities
    const jobEntities = this.findJobEntities();
    return jobEntities.length > 0
      ? parseJobPostingEntity(jobEntities[0], this.index)
      : null;
  }

  /**
   * Parse company entities from the response.
   */
  parseCompanies(): ParsedCompany[] {
    const companyEntities = [
      ...this.index.getByType(VoyagerTypes.COMPANY),
      ...this.index.getByType(VoyagerTypes.ORGANIZATION),
    ];
    // Deduplicate by entityUrn
    const seen = new Set<string>();
    return companyEntities
      .filter((e) => {
        const urn = e.entityUrn ?? "";
        if (seen.has(urn)) return false;
        seen.add(urn);
        return true;
      })
      .map((entity) => parseCompanyEntity(entity, this.index));
  }

  /**
   * Parse profile entities from the response.
   */
  parseProfiles(): ParsedProfile[] {
    const profileEntities = [
      ...this.index.getByType(VoyagerTypes.PROFILE),
      ...this.index.getByType(VoyagerTypes.PROFILE_MINI),
    ];
    const seen = new Set<string>();
    return profileEntities
      .filter((e) => {
        const urn = e.entityUrn ?? "";
        if (seen.has(urn)) return false;
        seen.add(urn);
        return true;
      })
      .map((entity) => parseProfileEntity(entity, this.index));
  }

  /**
   * Parse connections response (from relationships/dash/connections).
   * This is what connection-scraper.ts currently parses manually.
   */
  parseConnections(): ParsedConnection[] {
    const connections: ParsedConnection[] = [];
    const seen = new Set<string>();

    // Shape 1: Normalized response — connection entities reference profiles in included[]
    const connectionEntities = this.index.getByType(VoyagerTypes.CONNECTION);
    for (const conn of connectionEntities) {
      const memberUrn = str(conn.connectedMember as string)
        ?? str(conn.connectedMemberResolutionResult as string);
      const profile = memberUrn ? this.index.resolve(memberUrn) : null;

      if (profile?.publicIdentifier && !seen.has(profile.publicIdentifier as string)) {
        seen.add(profile.publicIdentifier as string);
        connections.push({
          entityUrn: conn.entityUrn ?? "",
          firstName: str(profile.firstName as string) ?? "",
          lastName: str(profile.lastName as string) ?? "",
          publicIdentifier: profile.publicIdentifier as string,
          headline: str(profile.headline as string),
          profilePictureUrl: extractEntityImageUrl(
            profile,
            "profilePicture",
          ) ?? extractEntityImageUrl(profile, "picture"),
          connectedAt: epochMsToIso(conn.createdAt),
        });
      }
    }

    // Shape 2: Direct profiles in included[] (when connection entities not present)
    if (connections.length === 0) {
      const profiles = [
        ...this.index.getByType(VoyagerTypes.PROFILE),
        ...this.index.getByType(VoyagerTypes.PROFILE_MINI),
      ];
      for (const profile of profiles) {
        const pubId = str(profile.publicIdentifier as string);
        if (pubId && !seen.has(pubId)) {
          seen.add(pubId);
          connections.push({
            entityUrn: profile.entityUrn ?? "",
            firstName: str(profile.firstName as string) ?? "",
            lastName: str(profile.lastName as string) ?? "",
            publicIdentifier: pubId,
            headline: str(profile.headline as string),
            profilePictureUrl: extractEntityImageUrl(profile, "profilePicture")
              ?? extractEntityImageUrl(profile, "picture"),
            connectedAt: null,
          });
        }
      }
    }

    // Shape 3: Top-level or data.elements (older format)
    if (connections.length === 0) {
      const elements = this.raw.elements ?? (this.raw.data?.elements as VoyagerEntity[] | undefined) ?? [];
      for (const el of elements) {
        const member =
          (el as Record<string, unknown>).connectedMember ??
          (el as Record<string, unknown>).connectedMemberResolutionResult ??
          el;

        const m = member as Record<string, unknown>;
        const pubId = str(m.publicIdentifier as string);
        if (pubId && !seen.has(pubId)) {
          seen.add(pubId);
          connections.push({
            entityUrn: el.entityUrn ?? "",
            firstName: str(m.firstName as string) ?? "",
            lastName: str(m.lastName as string) ?? "",
            publicIdentifier: pubId,
            headline: str(m.headline as string),
            profilePictureUrl: null,
            connectedAt: epochMsToIso(el.createdAt ?? (el as Record<string, unknown>).connectedAt),
          });
        }
      }
    }

    return connections;
  }

  // ── Internal helpers ──

  /**
   * Find job entities across all known locations in the response.
   * Jobs appear as different $types depending on the endpoint called.
   */
  private findJobEntities(): VoyagerEntity[] {
    const jobTypes = [
      VoyagerTypes.JOB_POSTING,
      VoyagerTypes.JOB_CARD,
      VoyagerTypes.JOB_SEARCH_CARD,
      VoyagerTypes.JOB_POSTING_CARD,
      VoyagerTypes.JOB_VIEW,
    ];

    const entities: VoyagerEntity[] = [];
    const seen = new Set<string>();

    for (const type of jobTypes) {
      for (const entity of this.index.getByType(type)) {
        const urn = entity.entityUrn ?? entity.$id ?? "";
        if (!seen.has(urn)) {
          seen.add(urn);
          entities.push(entity);
        }
      }
    }

    // Also check elements (some endpoints return jobs as top-level elements)
    const elements = this.raw.elements ?? (this.raw.data?.elements as VoyagerEntity[] | undefined) ?? [];
    for (const el of elements) {
      const type = el.$type ?? "";
      if (jobTypes.some((jt) => type.includes("Job"))) {
        const urn = el.entityUrn ?? el.$id ?? "";
        if (!seen.has(urn)) {
          seen.add(urn);
          entities.push(el);
        }
      }
    }

    return entities;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 11. Convenience Exports
// ────────────────────────────────────────────────────────────────────────────

/**
 * Quick-parse a Voyager job search response into clean job objects.
 * Convenience wrapper around VoyagerResponseParser.
 */
export function parseVoyagerJobSearch(rawJson: unknown): ParsedJobSearchResult {
  return new VoyagerResponseParser(rawJson).parseJobSearch();
}

/**
 * Quick-parse Voyager connections response.
 * Drop-in replacement for the manual parsing in connection-scraper.ts.
 */
export function parseVoyagerConnections(rawJson: unknown): {
  connections: ParsedConnection[];
  total: number;
} {
  const parser = new VoyagerResponseParser(rawJson);
  return {
    connections: parser.parseConnections(),
    total: parser.total,
  };
}

/**
 * Parse a Voyager error response from a fetch Response object.
 */
export async function parseVoyagerError(response: Response): Promise<ParsedVoyagerError> {
  return VoyagerResponseParser.parseError(response);
}

/** Re-export utility functions for external use. */
export { resolveImageUrl, parseRichText, parseUrnId, parseUrnType, EntityIndex };
