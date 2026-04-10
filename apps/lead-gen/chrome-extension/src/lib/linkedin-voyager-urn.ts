/**
 * LinkedIn Voyager URN System & Entity Resolution
 *
 * Complete TypeScript types, URN parser/builder, decoration ID registry,
 * and entity resolution mapping for LinkedIn's internal Voyager API.
 *
 * URN = Uniform Resource Name. LinkedIn uses URNs as stable entity identifiers
 * across all Voyager endpoints. Format: urn:li:{entityType}:{numericId}
 *
 * Two URN generations coexist:
 *   - Legacy:  urn:li:company:12345      (older endpoints, public APIs)
 *   - FSD:     urn:li:fsd_company:12345   (Voyager "dash" endpoints, newer SPA)
 *
 * "fsd" = "Front-end Serving Data" — the decoration/projection layer that
 * controls which fields are returned in Voyager responses.
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. URN Entity Type Registry
// ═══════════════════════════════════════════════════════════════════════

/**
 * All known URN entity types observed in Voyager responses.
 * Grouped by domain for clarity.
 */

// ── Core entity types (legacy) ──────────────────────────────────────
export type LegacyEntityType =
  | "company"          // Company profile
  | "member"           // User/member profile
  | "job"              // Job posting (legacy)
  | "jobPosting"       // Job posting (REST)
  | "school"           // Educational institution
  | "group"            // LinkedIn group
  | "showcase"         // Showcase page (company sub-page)
  | "organization"     // Generic org (superset of company)
  | "article"          // LinkedIn article
  | "share"            // Shared post
  | "ugcPost"          // User-generated content post
  | "comment"          // Comment on a post
  | "activity"         // Activity (like, comment, share)
  | "connection"       // Connection relationship
  | "invitation"       // Connection invitation
  | "message"          // Message in messaging
  | "conversation"     // Messaging conversation thread
  | "event"            // LinkedIn event
  | "hashtagTopic"     // Hashtag entity
  | "newsletter"       // Newsletter
  | "creatorContent";  // Creator content piece

// ── FSD entity types (Voyager "dash" layer) ─────────────────────────
export type FsdEntityType =
  | "fsd_company"             // Company (dash)
  | "fsd_profile"             // Member profile (dash)
  | "fsd_jobPosting"          // Job posting (dash)
  | "fsd_job"                 // Job entity (dash, sometimes distinct)
  | "fsd_skill"               // Skill entity
  | "fsd_industry"            // Industry classification
  | "fsd_function"            // Job function / department
  | "fsd_seniority"           // Seniority level
  | "fsd_geo"                 // Geographic location
  | "fsd_region"              // Geographic region
  | "fsd_country"             // Country entity
  | "fsd_school"              // School (dash)
  | "fsd_entityResultViewModel" // Search result wrapper
  | "fsd_lazyLoadedActions"   // Lazy-loaded action buttons
  | "fsd_hiringProject"       // Recruiter hiring project
  | "fsd_companyJobPosting"   // Company-specific job (dash)
  | "fsd_followState"         // Follow relationship state
  | "fsd_connection"          // Connection entity (dash)
  | "fsd_miniProfile"         // Minimal profile projection
  | "fsd_miniCompany"         // Minimal company projection
  | "fsd_update"              // Feed update entity
  | "fsd_feedUpdate"          // Feed update (alternate)
  | "fsd_socialDetail"        // Reactions/comments metadata
  | "fsd_comment"             // Comment entity (dash)
  | "fsd_networkDistance"      // Degree of connection
  | "fsd_profileActions";     // Profile action buttons

// ── Taxonomy / classification types ─────────────────────────────────
export type TaxonomyEntityType =
  | "skill"             // Skill (legacy)
  | "industry"          // Industry code
  | "function"          // Job function
  | "seniority"         // Seniority level
  | "geo"               // Geographic ID
  | "region"            // Regional grouping
  | "country"           // Country
  | "title"             // Job title standardization
  | "degree"            // Education degree level
  | "fieldOfStudy"      // Field of study
  | "companyType";      // Company type classification

// ── Composite union ─────────────────────────────────────────────────
export type LinkedInEntityType =
  | LegacyEntityType
  | FsdEntityType
  | TaxonomyEntityType;

// ═══════════════════════════════════════════════════════════════════════
// 2. URN Types
// ═══════════════════════════════════════════════════════════════════════

/**
 * Branded string type for type-safe URN handling.
 * Format: "urn:li:{entityType}:{numericOrStringId}"
 */
export type LinkedInUrn = `urn:li:${string}:${string}`;

/** Parsed URN components */
export interface ParsedUrn {
  /** Full URN string: "urn:li:fsd_company:12345" */
  raw: LinkedInUrn;
  /** Namespace: always "li" */
  namespace: "li";
  /** Entity type: "fsd_company", "member", "jobPosting", etc. */
  entityType: string;
  /** Entity ID — usually numeric, but can be alphanumeric for some types */
  entityId: string;
  /** Numeric ID if parseable, null otherwise */
  numericId: number | null;
  /** Whether this is an FSD (dash) entity type */
  isFsd: boolean;
  /** The base type without "fsd_" prefix: "company", "profile", "jobPosting" */
  baseType: string;
}

/**
 * Compound URN with multiple ID segments.
 * Example: "urn:li:fsd_jobPosting:(12345,LISTED)"
 * Used in job search for filtered/decorated job cards.
 */
export interface CompoundUrn extends ParsedUrn {
  /** Additional segments in compound URNs */
  segments: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// 3. URN Parser & Builder Utility
// ═══════════════════════════════════════════════════════════════════════

/** Regex for standard URN: urn:li:{type}:{id} */
const URN_REGEX = /^urn:li:([a-zA-Z_]+):(.+)$/;

/** Regex for compound URN with parenthesized segments: urn:li:{type}:({seg1},{seg2},...) */
const COMPOUND_URN_REGEX = /^urn:li:([a-zA-Z_]+):\((.+)\)$/;

/** Regex to extract numeric ID from end of URN or within compound */
const NUMERIC_ID_REGEX = /^(\d+)$/;

/**
 * Parse a LinkedIn URN string into its components.
 *
 * @example
 * parseUrn("urn:li:fsd_company:12345")
 * // => { raw, namespace: "li", entityType: "fsd_company", entityId: "12345",
 * //      numericId: 12345, isFsd: true, baseType: "company" }
 *
 * parseUrn("urn:li:fsd_jobPosting:(67890,LISTED)")
 * // => { ..., entityId: "(67890,LISTED)", segments: ["67890", "LISTED"] }
 */
export function parseUrn(urn: string): ParsedUrn | null {
  const match = urn.match(URN_REGEX);
  if (!match) return null;

  const [, entityType, entityId] = match;
  const isFsd = entityType.startsWith("fsd_");
  const baseType = isFsd ? entityType.slice(4) : entityType;

  // Check for compound URN
  const compoundMatch = urn.match(COMPOUND_URN_REGEX);
  const segments = compoundMatch
    ? compoundMatch[2].split(",").map((s) => s.trim())
    : undefined;

  // Try to extract numeric ID
  const cleanId = segments ? segments[0] : entityId;
  const numericId = NUMERIC_ID_REGEX.test(cleanId) ? parseInt(cleanId, 10) : null;

  const parsed: ParsedUrn = {
    raw: urn as LinkedInUrn,
    namespace: "li",
    entityType,
    entityId,
    numericId,
    isFsd,
    baseType,
  };

  if (segments) {
    return { ...parsed, segments } as CompoundUrn;
  }

  return parsed;
}

/**
 * Build a URN string from components.
 *
 * @example
 * buildUrn("fsd_company", "12345")    // "urn:li:fsd_company:12345"
 * buildUrn("company", 12345)          // "urn:li:company:12345"
 * buildUrn("fsd_jobPosting", [67890, "LISTED"]) // "urn:li:fsd_jobPosting:(67890,LISTED)"
 */
export function buildUrn(
  entityType: string,
  id: string | number | (string | number)[],
): LinkedInUrn {
  if (Array.isArray(id)) {
    return `urn:li:${entityType}:(${id.join(",")})` as LinkedInUrn;
  }
  return `urn:li:${entityType}:${id}` as LinkedInUrn;
}

/**
 * Extract the numeric ID from a URN string.
 * Returns null if the URN is invalid or the ID is not numeric.
 *
 * @example
 * extractNumericId("urn:li:fsd_company:12345")  // 12345
 * extractNumericId("urn:li:company:12345")       // 12345
 * extractNumericId("urn:li:member:abc")          // null
 */
export function extractNumericId(urn: string): number | null {
  return parseUrn(urn)?.numericId ?? null;
}

/**
 * Extract numeric ID from a URN, supporting both fsd_ and legacy prefixes.
 * This is the pattern already used in company-browsing.ts — centralized here.
 *
 * @example
 * extractCompanyId("urn:li:fsd_company:12345")  // "12345"
 * extractCompanyId("urn:li:company:12345")       // "12345"
 */
export function extractCompanyId(urn: string): string | null {
  const match = urn.match(/urn:li:(?:fsd_)?company:(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Extract job posting ID from a URN.
 */
export function extractJobPostingId(urn: string): string | null {
  const match = urn.match(/urn:li:(?:fsd_)?jobPosting:(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Extract member/profile ID from a URN.
 */
export function extractMemberId(urn: string): string | null {
  const match = urn.match(/urn:li:(?:fsd_)?(?:member|profile):(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Convert between FSD and legacy URN forms.
 *
 * @example
 * toFsdUrn("urn:li:company:12345")       // "urn:li:fsd_company:12345"
 * toLegacyUrn("urn:li:fsd_company:12345") // "urn:li:company:12345"
 */
export function toFsdUrn(urn: string): LinkedInUrn | null {
  const parsed = parseUrn(urn);
  if (!parsed) return null;
  if (parsed.isFsd) return parsed.raw;
  return buildUrn(`fsd_${parsed.entityType}`, parsed.entityId);
}

export function toLegacyUrn(urn: string): LinkedInUrn | null {
  const parsed = parseUrn(urn);
  if (!parsed) return null;
  if (!parsed.isFsd) return parsed.raw;
  return buildUrn(parsed.baseType, parsed.entityId);
}

/**
 * Batch-extract numeric IDs from an array of URNs.
 * Filters out nulls from unparseable URNs.
 */
export function extractNumericIds(urns: string[]): number[] {
  return urns
    .map(extractNumericId)
    .filter((id): id is number => id !== null);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Voyager Response Types
// ═══════════════════════════════════════════════════════════════════════

/**
 * The `*elements[]` pattern — every Voyager collection response has this shape.
 * The `included` array holds denormalized entities referenced by URN.
 */
export interface VoyagerCollectionResponse<T = VoyagerEntity> {
  /** Paging metadata for the collection */
  paging: VoyagerPaging;
  /** Primary result elements — the "main" items requested */
  elements: T[];
  /** Denormalized entity store — referenced entities from decorations */
  included?: VoyagerEntity[];
  /** Metadata about the response */
  metadata?: Record<string, unknown>;
}

/** Nested data wrapper — some endpoints wrap in `data` */
export interface VoyagerWrappedResponse<T = VoyagerEntity> {
  data: VoyagerCollectionResponse<T>;
}

/** Pagination metadata present on all collection responses */
export interface VoyagerPaging {
  /** Total number of matching entities */
  total: number;
  /** Number of elements returned in this page */
  count: number;
  /** Starting offset for this page */
  start: number;
  /** Links to prev/next pages (sometimes present) */
  links?: Array<{ rel: string; href: string; type: string }>;
}

/**
 * Base entity shape — every entity in Voyager responses has these fields.
 *
 * Three URN fields coexist with different purposes:
 *   - entityUrn:       The canonical URN for this entity (always present)
 *   - dashEntityUrn:   The FSD/dash-layer URN (present in dash endpoints)
 *   - *linkedEntityUrn: URN of a related/parent entity (field-specific, varies)
 *
 * Why three? LinkedIn's API evolved through three generations:
 *   1. REST (entityUrn with "urn:li:company:X")
 *   2. Voyager classic (entityUrn stays, added resolution via "included")
 *   3. Voyager dash (dashEntityUrn for FSD projection, entityUrn for compat)
 */
export interface VoyagerEntity {
  /** Schema type discriminator: "com.linkedin.voyager.dash.deco.jobs.JobCard" etc. */
  $type: string;
  /** Canonical entity URN */
  entityUrn: LinkedInUrn;
  /** Dash/FSD entity URN — used in newer endpoints, may differ from entityUrn */
  dashEntityUrn?: LinkedInUrn;
  /** Arbitrary additional fields populated by decorations */
  [key: string]: unknown;
}

// ── Job-domain entities ─────────────────────────────────────────────

export interface VoyagerJobPosting extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.jobs.JobPosting";
  entityUrn: LinkedInUrn;                    // urn:li:fsd_jobPosting:12345
  title: string;
  companyUrn?: LinkedInUrn;                  // urn:li:fsd_company:6789
  companyResolutionResult?: VoyagerMiniCompany;
  formattedLocation?: string;
  listedAt?: number;                         // epoch ms
  expireAt?: number;                         // epoch ms
  workRemoteAllowed?: boolean;
  workplaceTypes?: string[];                 // ["REMOTE", "HYBRID", "ON_SITE"]
  jobState?: "LISTED" | "CLOSED" | "EXPIRED";
  applies?: number;
  views?: number;
  /** Compensation — present when decoration includes salary fields */
  compensationInfo?: {
    baseSalary?: { range?: { min: number; max: number }; currencyCode: string };
  };
}

export interface VoyagerJobCard extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.jobs.JobCard";
  jobCardUnion?: {
    jobPostingCard?: {
      title?: { text: string };
      primaryDescription?: { text: string };
      secondaryDescription?: { text: string };
      insightText?: { text: string };
      logo?: { url: string };
      entityUrn?: LinkedInUrn;
      jobPosting?: LinkedInUrn;
      footerItems?: Array<{ type: string; text?: string }>;
    };
  };
}

// ── Company-domain entities ─────────────────────────────────────────

export interface VoyagerCompany extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.organization.Company";
  entityUrn: LinkedInUrn;                    // urn:li:fsd_company:12345
  name: string;
  universalName?: string;                    // URL slug
  description?: string;
  url?: string;                              // Company website
  companyPageUrl?: string;                   // LinkedIn URL
  staffCount?: number;
  staffCountRange?: { start: number; end: number };
  industryUrns?: LinkedInUrn[];              // urn:li:fsd_industry:XX
  industryV2Urns?: LinkedInUrn[];
  headquarter?: {
    city?: string;
    country?: string;
    geographicArea?: string;
    postalCode?: string;
    line1?: string;
  };
  logo?: VoyagerImage;
  companyType?: { localizedName: string; code: string };
  followingInfo?: { followerCount: number; following: boolean };
  foundedOn?: { year: number };
  specialities?: string[];
  confirmedLocations?: Array<{
    city?: string;
    country?: string;
    geographicArea?: string;
    description?: string;
  }>;
}

export interface VoyagerMiniCompany extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.organization.MiniCompany";
  entityUrn: LinkedInUrn;
  name: string;
  universalName?: string;
  logo?: VoyagerImage;
  active?: boolean;
}

// ── Profile-domain entities ─────────────────────────────────────────

export interface VoyagerProfile extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.identity.profile.Profile";
  entityUrn: LinkedInUrn;                    // urn:li:fsd_profile:ACoAABxxxxxx
  firstName: string;
  lastName: string;
  headline?: string;
  publicIdentifier?: string;                 // vanity URL slug
  locationName?: string;
  geoUrn?: LinkedInUrn;                     // urn:li:fsd_geo:1234
  industryUrn?: LinkedInUrn;
  profilePicture?: VoyagerImage;
  backgroundImage?: VoyagerImage;
  summary?: string;
  memberBadges?: { premium: boolean; influencer: boolean; openLink: boolean };
  networkDistance?: { value: "DISTANCE_1" | "DISTANCE_2" | "DISTANCE_3" | "OUT_OF_NETWORK" };
}

export interface VoyagerMiniProfile extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.identity.profile.MiniProfile";
  entityUrn: LinkedInUrn;
  firstName: string;
  lastName: string;
  publicIdentifier: string;
  headline?: string;
  picture?: VoyagerImage;
  trackingId?: string;
  objectUrn?: LinkedInUrn;                  // urn:li:member:12345
}

// ── Connection entity ───────────────────────────────────────────────

export interface VoyagerConnection extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.relationships.Connection";
  entityUrn: LinkedInUrn;                    // urn:li:fsd_connection:12345
  connectedMember?: LinkedInUrn;             // urn:li:fsd_profile:ACoXXX
  connectedMemberResolutionResult?: VoyagerMiniProfile;
  createdAt?: number;                        // epoch ms
}

// ── Skill entity ────────────────────────────────────────────────────

export interface VoyagerSkill extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.identity.profile.Skill";
  entityUrn: LinkedInUrn;                    // urn:li:fsd_skill:12345
  name: string;
}

// ── Taxonomy entities ───────────────────────────────────────────────

export interface VoyagerIndustry extends VoyagerEntity {
  entityUrn: LinkedInUrn;                    // urn:li:fsd_industry:XX
  name: string;
  localizedName?: string;
}

export interface VoyagerGeo extends VoyagerEntity {
  entityUrn: LinkedInUrn;                    // urn:li:fsd_geo:XXXXX
  defaultLocalizedName: string;
  countryUrn?: LinkedInUrn;
  parentUrn?: LinkedInUrn;
}

export interface VoyagerFunction extends VoyagerEntity {
  entityUrn: LinkedInUrn;                    // urn:li:fsd_function:XX
  name: string;
  localizedName?: string;
}

export interface VoyagerSeniority extends VoyagerEntity {
  entityUrn: LinkedInUrn;                    // urn:li:fsd_seniority:X
  name: string;
  localizedName?: string;
}

// ── Common sub-types ────────────────────────────────────────────────

export interface VoyagerImage {
  /** Root URL for image CDN — append artifacts[].fileIdentifyingUrlPathSegment */
  rootUrl?: string;
  artifacts?: Array<{
    width: number;
    height: number;
    fileIdentifyingUrlPathSegment: string;
    expiresAt?: number;
  }>;
  /** Direct URL — sometimes present instead of rootUrl + artifacts */
  url?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// 5. entityUrn vs dashEntityUrn vs *linkedEntityUrn
// ═══════════════════════════════════════════════════════════════════════

/**
 * Field-level URN references found in Voyager entities.
 *
 * When entity A references entity B, the reference field name follows a pattern:
 *   - {fieldName}:        LinkedInUrn        — raw URN reference
 *   - {fieldName}Urn:     LinkedInUrn        — explicit URN suffix
 *   - {fieldName}ResolutionResult: object    — inline resolved entity
 *
 * Examples from a JobPosting:
 *   companyUrn:                    "urn:li:fsd_company:12345"
 *   companyResolutionResult:       { name: "Acme", ... }   (inline)
 *
 * The `included[]` array in collection responses holds ALL referenced entities,
 * keyed by their entityUrn, allowing client-side join without extra API calls.
 *
 * Cross-referencing algorithm:
 *   1. Parse elements[] — extract URN references from each element
 *   2. Build lookup: Map<string, VoyagerEntity> from included[]
 *   3. Resolve: lookup.get(element.companyUrn) => full company object
 */

/**
 * Resolve URN references from the `included` array.
 * This is the core pattern for client-side entity resolution.
 */
export function buildIncludedLookup(
  included: VoyagerEntity[],
): Map<string, VoyagerEntity> {
  const lookup = new Map<string, VoyagerEntity>();
  for (const entity of included) {
    if (entity.entityUrn) {
      lookup.set(entity.entityUrn, entity);
    }
    if (entity.dashEntityUrn && entity.dashEntityUrn !== entity.entityUrn) {
      lookup.set(entity.dashEntityUrn, entity);
    }
  }
  return lookup;
}

/**
 * Resolve a URN reference from the included lookup.
 * Tries both FSD and legacy forms.
 */
export function resolveUrn<T extends VoyagerEntity = VoyagerEntity>(
  lookup: Map<string, VoyagerEntity>,
  urn: string,
): T | null {
  const direct = lookup.get(urn) as T | undefined;
  if (direct) return direct;

  // Try converting between FSD and legacy
  const fsd = toFsdUrn(urn);
  if (fsd) {
    const fsdResult = lookup.get(fsd) as T | undefined;
    if (fsdResult) return fsdResult;
  }

  const legacy = toLegacyUrn(urn);
  if (legacy) {
    const legacyResult = lookup.get(legacy) as T | undefined;
    if (legacyResult) return legacyResult;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Decoration ID Registry
// ═══════════════════════════════════════════════════════════════════════

/**
 * Decoration IDs control the "shape" of Voyager API responses.
 * They are versioned strings that specify which fields to include.
 *
 * Format: "com.linkedin.voyager.dash.deco.{domain}.{DecorationName}-{version}"
 *
 * The version number increments when LinkedIn changes the field set.
 * Using an outdated version may return fewer fields or trigger a 400 error.
 *
 * NOTE: These version numbers are observed as of 2025. LinkedIn updates them
 * without notice. If an endpoint returns 400/422, check for a newer version
 * by inspecting network traffic on linkedin.com.
 */
export const DECORATION_IDS = {
  // ── Job Search ──────────────────────────────────────────────────────
  /** Job search cards collection — full job card data with company info */
  JOB_SEARCH_CARDS:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",

  /** Job search cards (lightweight) — minimal card data */
  JOB_SEARCH_CARDS_LITE:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-218",

  /** Individual job posting detail — full description, skills, company */
  JOB_POSTING_DETAIL:
    "com.linkedin.voyager.dash.deco.jobs.FullJobPostingWithDecorations-74",

  /** Job posting card in feeds/recommendations */
  JOB_POSTING_CARD:
    "com.linkedin.voyager.dash.deco.jobs.JobPostingCard-84",

  /** Recommended jobs sidebar */
  JOB_RECOMMENDATIONS:
    "com.linkedin.voyager.dash.deco.jobs.RecommendedJobs-26",

  /** Job applicant tracking (for recruiters) */
  JOB_APPLICANTS:
    "com.linkedin.voyager.dash.deco.jobs.JobApplicantsCollection-30",

  // ── Company Profiles ────────────────────────────────────────────────
  /** Company page full profile */
  COMPANY_PROFILE:
    "com.linkedin.voyager.dash.deco.organization.MemberViewCompany-98",

  /** Company card in search results */
  COMPANY_SEARCH_CARD:
    "com.linkedin.voyager.dash.deco.organization.CompanySearchCard-29",

  /** Company employees list */
  COMPANY_EMPLOYEES:
    "com.linkedin.voyager.dash.deco.organization.CompanyPeopleSearchResult-24",

  /** Company jobs list */
  COMPANY_JOBS:
    "com.linkedin.voyager.dash.deco.organization.CompanyJobsCollection-35",

  /** Similar companies / "People also viewed" */
  SIMILAR_COMPANIES:
    "com.linkedin.voyager.dash.deco.organization.SimilarCompanies-18",

  // ── People / Profiles ───────────────────────────────────────────────
  /** Profile page full view */
  PROFILE_VIEW:
    "com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-23",

  /** Profile card in search results */
  PROFILE_SEARCH_CARD:
    "com.linkedin.voyager.dash.deco.search.SearchClusterCollection-186",

  /** Mini profile (hover card, mentions, connections list) */
  MINI_PROFILE:
    "com.linkedin.voyager.dash.deco.identity.profile.MiniProfile-58",

  // ── Connections / Network ───────────────────────────────────────────
  /** Connections list with profile data (used in connection-scraper.ts) */
  CONNECTIONS_LIST:
    "com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16",

  /** Connection invitation list */
  INVITATIONS_LIST:
    "com.linkedin.voyager.dash.deco.web.mynetwork.InvitationView-18",

  /** People You May Know */
  PYMK:
    "com.linkedin.voyager.dash.deco.web.mynetwork.PeopleYouMayKnow-14",

  // ── Search ──────────────────────────────────────────────────────────
  /** Universal search results (people, companies, jobs mixed) */
  UNIVERSAL_SEARCH:
    "com.linkedin.voyager.dash.deco.search.SearchClusterCollection-186",

  /** Typeahead / autocomplete suggestions */
  SEARCH_TYPEAHEAD:
    "com.linkedin.voyager.dash.deco.search.TypeaheadCollection-38",

  // ── Feed / Posts ────────────────────────────────────────────────────
  /** Feed updates (posts in timeline) */
  FEED_UPDATES:
    "com.linkedin.voyager.dash.deco.feed.UpdateCollectionV2-70",

  /** Individual post detail */
  POST_DETAIL:
    "com.linkedin.voyager.dash.deco.feed.FullUpdate-12",

  /** Post reactions/comments social detail */
  SOCIAL_DETAIL:
    "com.linkedin.voyager.dash.deco.feed.SocialDetail-34",

  // ── Skills / Taxonomy ───────────────────────────────────────────────
  /** Skill typeahead for profile editing */
  SKILL_TYPEAHEAD:
    "com.linkedin.voyager.dash.deco.identity.profile.SkillTypeahead-8",

  /** Industry list */
  INDUSTRY_LIST:
    "com.linkedin.voyager.dash.deco.common.IndustryCollection-4",

  // ── Messaging ───────────────────────────────────────────────────────
  /** Conversation list */
  CONVERSATIONS:
    "com.linkedin.voyager.dash.deco.messaging.ConversationCollection-46",

  /** Message thread */
  MESSAGE_THREAD:
    "com.linkedin.voyager.dash.deco.messaging.FullConversation-24",
} as const;

export type DecorationId = (typeof DECORATION_IDS)[keyof typeof DECORATION_IDS];

// ═══════════════════════════════════════════════════════════════════════
// 7. Entity Resolution: URN -> Endpoint Mapping
// ═══════════════════════════════════════════════════════════════════════

/** Voyager API base URL */
const VOYAGER_BASE = "https://www.linkedin.com/voyager/api";

/**
 * Mapping from entity type to Voyager API endpoint for detail resolution.
 * Each entry provides the endpoint path and default decoration ID.
 */
export const ENTITY_ENDPOINTS: Record<
  string,
  { path: string; decorationId: string; method: "GET" | "POST" }
> = {
  // ── Jobs ──
  fsd_jobPosting: {
    path: "/voyagerJobsDashJobCards",
    decorationId: DECORATION_IDS.JOB_SEARCH_CARDS,
    method: "GET",
  },
  jobPosting: {
    path: "/voyagerJobsDashJobPostings/{id}",
    decorationId: DECORATION_IDS.JOB_POSTING_DETAIL,
    method: "GET",
  },

  // ── Companies ──
  fsd_company: {
    path: "/voyagerOrganizationDashCompanies/{id}",
    decorationId: DECORATION_IDS.COMPANY_PROFILE,
    method: "GET",
  },
  company: {
    path: "/voyagerOrganizationDashCompanies/{id}",
    decorationId: DECORATION_IDS.COMPANY_PROFILE,
    method: "GET",
  },

  // ── Profiles ──
  fsd_profile: {
    path: "/voyagerIdentityDashProfiles/{id}",
    decorationId: DECORATION_IDS.PROFILE_VIEW,
    method: "GET",
  },
  member: {
    path: "/voyagerIdentityDashProfiles/{id}",
    decorationId: DECORATION_IDS.PROFILE_VIEW,
    method: "GET",
  },

  // ── Connections ──
  fsd_connection: {
    path: "/relationships/dash/connections",
    decorationId: DECORATION_IDS.CONNECTIONS_LIST,
    method: "GET",
  },

  // ── Skills ──
  fsd_skill: {
    path: "/voyagerIdentityDashProfileSkills",
    decorationId: DECORATION_IDS.SKILL_TYPEAHEAD,
    method: "GET",
  },

  // ── Geo ──
  fsd_geo: {
    path: "/voyagerCommonDashGeos/{id}",
    decorationId: "",
    method: "GET",
  },

  // ── Industry ──
  fsd_industry: {
    path: "/voyagerCommonDashIndustries/{id}",
    decorationId: "",
    method: "GET",
  },

  // ── Functions ──
  fsd_function: {
    path: "/voyagerCommonDashFunctions/{id}",
    decorationId: "",
    method: "GET",
  },

  // ── Seniority ──
  fsd_seniority: {
    path: "/voyagerCommonDashSeniorityLevels/{id}",
    decorationId: "",
    method: "GET",
  },
};

/**
 * Build the Voyager API URL for resolving a single entity by URN.
 *
 * @example
 * buildEntityUrl("urn:li:fsd_company:12345")
 * // => "https://www.linkedin.com/voyager/api/voyagerOrganizationDashCompanies/12345?decorationId=..."
 */
export function buildEntityUrl(urn: string): string | null {
  const parsed = parseUrn(urn);
  if (!parsed) return null;

  const endpoint = ENTITY_ENDPOINTS[parsed.entityType];
  if (!endpoint) return null;

  const url = new URL(VOYAGER_BASE + endpoint.path.replace("{id}", parsed.entityId));
  if (endpoint.decorationId) {
    url.searchParams.set("decorationId", endpoint.decorationId);
  }

  return url.toString();
}

// ═══════════════════════════════════════════════════════════════════════
// 8. Batch Entity Resolution
// ═══════════════════════════════════════════════════════════════════════

/**
 * LinkedIn Voyager supports batch entity resolution via the
 * `voyagerCommonDashBatchEntities` endpoint with multiple URNs.
 *
 * This avoids N+1 API calls when resolving many entities.
 * Max batch size is typically 25 URNs per request.
 */
export const BATCH_ENDPOINT = `${VOYAGER_BASE}/voyagerCommonDashBatchEntities`;
export const MAX_BATCH_SIZE = 25;

/**
 * Build URL for batch entity resolution.
 *
 * @param urns - Array of URNs to resolve
 * @param decorationId - Decoration to apply to results
 *
 * @example
 * buildBatchUrl(
 *   ["urn:li:fsd_company:123", "urn:li:fsd_company:456"],
 *   DECORATION_IDS.COMPANY_SEARCH_CARD
 * )
 */
export function buildBatchUrl(urns: string[], decorationId: string): string {
  const url = new URL(BATCH_ENDPOINT);
  url.searchParams.set("decorationId", decorationId);
  // URNs are passed as a List() parameter
  url.searchParams.set("ids", `List(${urns.join(",")})`);
  return url.toString();
}

/**
 * Split URNs into batches respecting MAX_BATCH_SIZE.
 */
export function batchUrns(urns: string[]): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < urns.length; i += MAX_BATCH_SIZE) {
    batches.push(urns.slice(i, i + MAX_BATCH_SIZE));
  }
  return batches;
}

// ═══════════════════════════════════════════════════════════════════════
// 9. Voyager Request Helpers
// ═══════════════════════════════════════════════════════════════════════

/** Standard Voyager API request headers */
export interface VoyagerRequestHeaders {
  /** CSRF token from JSESSIONID cookie (required) */
  "csrf-token": string;
  /** Protocol version — always 2.0.0 for current Voyager */
  "x-restli-protocol-version": "2.0.0";
  /** Accept header — controls response normalization */
  Accept: VoyagerAcceptType;
}

/**
 * Accept header types control response format:
 *
 * - "normalized+json+2.1": Flat entity store (elements[] + included[])
 *   Most useful — all referenced entities are denormalized into `included[]`
 *
 * - "json+2.1": Nested/inline resolution — entities resolved inline
 *   Simpler to consume but duplicates data
 *
 * - "json": Legacy format — minimal decoration
 */
export type VoyagerAcceptType =
  | "application/vnd.linkedin.normalized+json+2.1"
  | "application/vnd.linkedin.json+2.1"
  | "application/json";

/** Build standard Voyager request headers */
export function buildVoyagerHeaders(csrfToken: string): VoyagerRequestHeaders {
  return {
    "csrf-token": csrfToken,
    "x-restli-protocol-version": "2.0.0",
    Accept: "application/vnd.linkedin.normalized+json+2.1",
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 10. Job Search Query Builder
// ═══════════════════════════════════════════════════════════════════════

/**
 * LinkedIn Voyager job search uses a Lisp-like query syntax passed as a
 * `query` parameter. This builder constructs well-formed query strings.
 *
 * The query format is:
 *   (origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(key:List(val1,val2),...))
 */

/** Well-known filter keys for job search */
export interface JobSearchFilters {
  /** Company numeric IDs */
  company?: string[];
  /** Workplace type: 1=On-site, 2=Remote, 3=Hybrid */
  workplaceType?: ("1" | "2" | "3")[];
  /** Time posted: r86400=24h, r604800=week, r2592000=month */
  timePostedRange?: string[];
  /** Experience level: 1=Internship, 2=Entry, 3=Associate, 4=Mid-Senior, 5=Director, 6=Executive */
  experience?: string[];
  /** Job type: F=Full-time, P=Part-time, C=Contract, T=Temporary, I=Internship, V=Volunteer, O=Other */
  jobType?: string[];
  /** Industry URN IDs */
  industry?: string[];
  /** Job function URN IDs */
  function?: string[];
  /** Salary range bucket */
  salary?: string[];
  /** Benefits: 1=Medical, 2=Vision, 3=Dental, 4=401k, etc. */
  benefits?: string[];
  /** "Under 10 applicants" filter */
  easyApply?: string[];
  /** Sort by: R=Relevant, DD=Date */
  sortBy?: "R" | "DD";
}

/** Well-known geo IDs */
export const GEO_IDS = {
  WORLDWIDE: "92000000",
  UNITED_STATES: "103644278",
  EUROPEAN_UNION: "91000000",
  UNITED_KINGDOM: "101165590",
  GERMANY: "101282230",
  FRANCE: "105015875",
  NETHERLANDS: "102890719",
  CANADA: "101174742",
  AUSTRALIA: "101452733",
  REMOTE_WORLDWIDE: "92000000",  // Same as worldwide — remote filter is via workplaceType
} as const;

/**
 * Build a Voyager job search query string from structured filters.
 *
 * @example
 * buildJobSearchQuery({ company: ["12345"], workplaceType: ["2"] })
 * // "(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(company:List(12345),workplaceType:List(2)),spellCorrectionEnabled:true)"
 */
export function buildJobSearchQuery(filters: JobSearchFilters): string {
  const filterParts: string[] = [];

  for (const [key, values] of Object.entries(filters)) {
    if (values && values.length > 0) {
      filterParts.push(`${key}:List(${values.join(",")})`);
    }
  }

  const selectedFilters = filterParts.length > 0
    ? `selectedFilters:(${filterParts.join(",")}),`
    : "";

  return `(origin:JOB_SEARCH_PAGE_JOB_FILTER,${selectedFilters}spellCorrectionEnabled:true)`;
}

/**
 * Build a complete Voyager job search URL.
 *
 * This is the URL pattern used in company-browsing.ts's countRemoteJobsViaVoyager,
 * now generalized for any filter combination.
 */
export function buildJobSearchUrl(options: {
  filters: JobSearchFilters;
  geoId?: string;
  keywords?: string;
  start?: number;
  count?: number;
  decorationId?: string;
}): string {
  const {
    filters,
    geoId = GEO_IDS.WORLDWIDE,
    keywords,
    start = 0,
    count = 25,
    decorationId = DECORATION_IDS.JOB_SEARCH_CARDS,
  } = options;

  const url = new URL(`${VOYAGER_BASE}/voyagerJobsDashJobCards`);
  url.searchParams.set("decorationId", decorationId);
  url.searchParams.set("count", String(count));
  url.searchParams.set("q", "jobSearch");
  url.searchParams.set("query", buildJobSearchQuery(filters));
  url.searchParams.set("locationUnion", `(geoId:${geoId})`);
  url.searchParams.set("start", String(start));

  if (keywords) {
    url.searchParams.set("keywords", keywords);
  }

  return url.toString();
}

// ═══════════════════════════════════════════════════════════════════════
// 11. Response Parsing Utilities
// ═══════════════════════════════════════════════════════════════════════

/**
 * Extract total count from a Voyager response (handles both wrapped and unwrapped).
 * This is the pattern from connection-scraper.ts and company-browsing.ts.
 */
export function extractTotal(data: Record<string, unknown>): number {
  // Unwrapped: data.paging.total
  if (data.paging && typeof (data.paging as Record<string, unknown>).total === "number") {
    return (data.paging as Record<string, number>).total;
  }
  // Wrapped: data.data.paging.total
  if (data.data && typeof data.data === "object") {
    const inner = data.data as Record<string, unknown>;
    if (inner.paging && typeof (inner.paging as Record<string, unknown>).total === "number") {
      return (inner.paging as Record<string, number>).total;
    }
  }
  return 0;
}

/**
 * Extract elements from a Voyager response (handles both shapes).
 */
export function extractElements<T = VoyagerEntity>(
  data: Record<string, unknown>,
): T[] {
  if (Array.isArray(data.elements)) return data.elements as T[];
  if (data.data && typeof data.data === "object") {
    const inner = data.data as Record<string, unknown>;
    if (Array.isArray(inner.elements)) return inner.elements as T[];
  }
  return [];
}

/**
 * Extract the included entity store from a normalized response.
 */
export function extractIncluded(data: Record<string, unknown>): VoyagerEntity[] {
  if (Array.isArray(data.included)) return data.included as VoyagerEntity[];
  if (data.data && typeof data.data === "object") {
    const inner = data.data as Record<string, unknown>;
    if (Array.isArray(inner.included)) return inner.included as VoyagerEntity[];
  }
  return [];
}

/**
 * Full parse of a Voyager collection response: elements, included lookup, paging.
 */
export function parseVoyagerResponse<T extends VoyagerEntity = VoyagerEntity>(
  data: Record<string, unknown>,
): {
  elements: T[];
  included: Map<string, VoyagerEntity>;
  total: number;
  count: number;
  start: number;
} {
  const elements = extractElements<T>(data);
  const includedArr = extractIncluded(data);
  const included = buildIncludedLookup(includedArr);
  const total = extractTotal(data);

  const paging = (data.paging as Record<string, number> | undefined) ??
    ((data.data as Record<string, unknown> | undefined)?.paging as Record<string, number> | undefined);

  return {
    elements,
    included,
    total,
    count: paging?.count ?? elements.length,
    start: paging?.start ?? 0,
  };
}

/**
 * Extract all entities of a specific $type from the included array.
 *
 * @example
 * const companies = filterByType<VoyagerMiniCompany>(
 *   includedArr,
 *   "com.linkedin.voyager.dash.organization.MiniCompany"
 * );
 */
export function filterByType<T extends VoyagerEntity>(
  entities: VoyagerEntity[],
  type: string,
): T[] {
  return entities.filter((e) => e.$type === type) as T[];
}

/**
 * Extract all URNs of a given entity type from the included array.
 *
 * @example
 * const companyUrns = extractUrnsByType(includedArr, "fsd_company");
 * // => ["urn:li:fsd_company:123", "urn:li:fsd_company:456"]
 */
export function extractUrnsByType(
  entities: VoyagerEntity[],
  entityType: string,
): LinkedInUrn[] {
  return entities
    .map((e) => e.entityUrn)
    .filter((urn) => {
      const parsed = parseUrn(urn);
      return parsed?.entityType === entityType || parsed?.baseType === entityType;
    });
}
