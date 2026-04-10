/**
 * LinkedIn Voyager API — Job Detail & Description Endpoint Types
 *
 * Comprehensive TypeScript interfaces for every field returned by the
 * LinkedIn Voyager internal API endpoints for job postings.
 *
 * Endpoints covered:
 *   1. GET /voyager/api/jobs/jobPostings/{jobId}
 *   2. GET /voyager/api/voyagerJobsDashJobCards/{urn}
 *   3. GET /voyager/api/jobs/jobPostings/{jobId}/description  (rich description)
 *   4. GET /voyager/api/jobs/jobPostings/{jobId}/skills       (skills breakdown)
 *   5. Decorated fields: companyDetails, salary, benefits, workplace type
 *   6. Remote work encoding: workplaceTypesResolutionResults, workRemoteAllowed
 *   7. Application instructions and apply URLs
 *   8. Job function, industries, seniority level mappings
 *
 * Auth: All requests require:
 *   - csrf-token header (from JSESSIONID cookie, stripped of quotes)
 *   - x-restli-protocol-version: 2.0.0
 *   - Accept: application/vnd.linkedin.normalized+json+2.1
 *   - credentials: "include"
 *
 * URN format: "urn:li:fsd_jobPosting:{numericId}"
 *
 * @see connection-scraper.ts for the CSRF token extraction pattern
 */

// ---------------------------------------------------------------------------
// 0. Shared primitives & enums
// ---------------------------------------------------------------------------

/** LinkedIn entity URN — globally unique identifier across the graph. */
export type LinkedInUrn = string; // e.g. "urn:li:fsd_jobPosting:3912345678"

/** LinkedIn $type discriminator present on every entity in normalized responses. */
export type VoyagerEntityType = string; // e.g. "com.linkedin.voyager.jobs.JobPosting"

/**
 * Base entity shape present on every Voyager object in the `included` array
 * of a normalized response (Accept: application/vnd.linkedin.normalized+json+2.1).
 */
export interface VoyagerEntity {
  $type: VoyagerEntityType;
  entityUrn: LinkedInUrn;
  $recipeTypes?: string[];
  $anti_abuse_annotations?: Array<{
    attributeId: number;
    invocationType: string;
  }>;
}

/** Pagination metadata returned on all paginated Voyager responses. */
export interface VoyagerPaging {
  count: number;
  start: number;
  total?: number;
  /** Links for cursor-based pagination (rare on job endpoints). */
  links?: Array<{ rel: string; href: string; type: string }>;
}

/** Text artifact — LinkedIn's structured text with optional attributes. */
export interface VoyagerTextContent {
  text: string;
  textDirection?: "USER_LOCALE" | "FIRST_STRONG";
  attributesV2?: VoyagerTextAttribute[];
  /** Legacy field — older responses use `attributes` instead of `attributesV2`. */
  attributes?: VoyagerTextAttribute[];
}

export interface VoyagerTextAttribute {
  start: number;
  length: number;
  type?: VoyagerTextAttributeType;
  detailData?: {
    /** Hyperlink */
    hyperlink?: { url: string };
    /** Entity reference (company, profile, etc.) */
    entity?: { urn: LinkedInUrn };
    /** List item marker */
    listItem?: { position: number };
    /** Paragraph style */
    paragraphStyle?: { style: string };
  };
}

export type VoyagerTextAttributeType =
  | "HYPERLINK"
  | "BOLD"
  | "ITALIC"
  | "UNDERLINE"
  | "LINE_BREAK"
  | "PARAGRAPH_BREAK"
  | "LIST_ITEM"
  | "SUBSCRIPT"
  | "SUPERSCRIPT";

/** Image reference — used for company logos, banners, etc. */
export interface VoyagerImage {
  $type?: VoyagerEntityType;
  /** Vector image with multiple size variants. */
  attributes?: Array<{
    scalingType?: string;
    detailData?: {
      vectorImage?: VoyagerVectorImage;
      nonEntityProfilePicture?: {
        vectorImage: VoyagerVectorImage;
      };
    };
  }>;
}

export interface VoyagerVectorImage {
  $type?: VoyagerEntityType;
  artifacts: VoyagerImageArtifact[];
  rootUrl: string;
}

export interface VoyagerImageArtifact {
  width: number;
  height: number;
  fileIdentifyingUrlPathSegment: string;
  expiresAt?: number;
}

// ---------------------------------------------------------------------------
// 1. GET /voyager/api/jobs/jobPostings/{jobId} — Full Job Posting
// ---------------------------------------------------------------------------

/**
 * Primary job posting entity. Returned as the root entity or in `included`
 * for: GET /voyager/api/jobs/jobPostings/{jobId}
 *
 * Also embedded in search results and job card responses.
 *
 * decorationId often used:
 *   "com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65"
 *   "com.linkedin.voyager.deco.jobs.web.shared.WebLightJobPosting-23"
 */
export interface VoyagerJobPosting extends VoyagerEntity {
  $type: "com.linkedin.voyager.jobs.JobPosting";

  // ── Core identification ──────────────────────────────────────────────
  /** Numeric job ID (also in the URN). */
  jobPostingId: number;
  /** Human-readable tracking code (e.g. "R-12345"). */
  trackingUrn?: LinkedInUrn;
  /** Referral tracking URN for apply attribution. */
  referenceUrn?: LinkedInUrn;

  // ── Title & headline ─────────────────────────────────────────────────
  title: string;
  /** Formatted multi-line title (rare — usually same as `title`). */
  formattedTitle?: VoyagerTextContent;

  // ── Description (inline) ─────────────────────────────────────────────
  /** Full rich-text description (when decorated). */
  description?: VoyagerJobDescription;

  // ── Company ──────────────────────────────────────────────────────────
  /** Company URN — resolve via `companyResolutionResult` or separate fetch. */
  companyUrn?: LinkedInUrn;
  /** Inline company details when decorated with company expansion. */
  companyDetails?: VoyagerJobCompanyDetails;
  /** Resolved company entity (in `included` array of normalized response). */
  companyResolutionResult?: VoyagerCompanyResolution;

  // ── Location & workplace ─────────────────────────────────────────────
  /** Human-readable location string (e.g. "San Francisco, CA"). */
  formattedLocation: string;
  /** Structured location details. */
  locationDetails?: VoyagerJobLocationDetails;
  /**
   * Workplace type — the primary remote/onsite/hybrid indicator.
   * Values: "remote", "on-site", "hybrid"
   */
  workplaceType?: VoyagerWorkplaceType;
  /**
   * Legacy boolean flag for remote jobs (pre-workplaceType era).
   * Still populated on many postings as a backward-compat field.
   */
  workRemoteAllowed?: boolean;
  /**
   * Decorated resolution of workplace types — contains the canonical
   * enum values and display labels. Present when using decoration IDs
   * that expand workplace metadata.
   */
  workplaceTypesResolutionResults?: Record<string, VoyagerWorkplaceTypeResolution>;

  // ── Employment type ──────────────────────────────────────────────────
  /**
   * Employment type enum.
   * Known values: "FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY",
   *               "INTERNSHIP", "VOLUNTEER", "OTHER"
   */
  employmentType?: VoyagerEmploymentType;
  formattedEmploymentStatus?: string;

  // ── Seniority level ──────────────────────────────────────────────────
  /**
   * Experience/seniority level.
   * Known values: "ENTRY_LEVEL", "ASSOCIATE", "MID_SENIOR_LEVEL",
   *               "DIRECTOR", "EXECUTIVE", "NOT_APPLICABLE", "INTERNSHIP"
   */
  experienceLevel?: VoyagerExperienceLevel;
  formattedExperienceLevel?: string;

  // ── Job functions ────────────────────────────────────────────────────
  /** Job function URNs (e.g. "urn:li:function:it"). Resolve via `jobFunctionsResolutionResults`. */
  jobFunctions?: LinkedInUrn[];
  jobFunctionsResolutionResults?: Record<string, VoyagerJobFunction>;
  formattedJobFunctions?: string;

  // ── Industries ───────────────────────────────────────────────────────
  /** Industry URNs (e.g. "urn:li:industry:96"). Resolve via `industriesResolutionResults`. */
  industries?: LinkedInUrn[];
  industriesResolutionResults?: Record<string, VoyagerIndustry>;
  formattedIndustries?: string;

  // ── Salary / compensation ────────────────────────────────────────────
  /** Salary insight data — may be null if employer didn't disclose. */
  salaryInsights?: VoyagerSalaryInsights;
  /** Formatted salary string shown in the UI (e.g. "$120K - $180K/yr"). */
  formattedSalary?: string;
  /** Compensation details with breakdown. */
  compensationDetails?: VoyagerCompensationDetails;

  // ── Benefits ─────────────────────────────────────────────────────────
  benefits?: VoyagerBenefits;

  // ── Skills ───────────────────────────────────────────────────────────
  /** Skill match insight (how viewer's skills match). */
  skillMatchInsight?: VoyagerSkillMatchInsight;
  /** Job-required skills (when decorated). */
  jobSkills?: VoyagerJobSkills;

  // ── Application ──────────────────────────────────────────────────────
  /** How to apply for this job. */
  applyMethod?: VoyagerApplyMethod;
  /** Whether viewer has already applied. */
  applies?: boolean;
  /** Number of applicants (approximate). */
  applicantCount?: number;
  formattedApplicantCount?: string;
  /** Whether Easy Apply is available. */
  easyApplyEnabled?: boolean;

  // ── Posting metadata ─────────────────────────────────────────────────
  /** ISO 8601 timestamp — when the job was first listed. */
  listedAt: number; // epoch milliseconds
  /** ISO 8601 timestamp — when the posting expires/closes. */
  expireAt?: number;
  /** ISO 8601 timestamp — original posting date. */
  originalListedAt?: number;
  /** Reposted timestamp (if the job was bumped). */
  repostedAt?: number;
  /** Whether the job has been closed/filled. */
  closed?: boolean;
  /** Current state of the posting. */
  jobState?: "LISTED" | "CLOSED" | "SUSPENDED";

  // ── Poster / recruiter ───────────────────────────────────────────────
  /** URN of the person who posted the job. */
  posterUrn?: LinkedInUrn;
  /** Resolved poster profile (in normalized response). */
  posterResolutionResult?: VoyagerJobPoster;
  /** Hiring team members shown on the posting. */
  hiringTeam?: VoyagerHiringTeamMember[];

  // ── Viewer context (personalized) ────────────────────────────────────
  /** Whether the viewer has saved/bookmarked this job. */
  saved?: boolean;
  /** Job match score (0-100) for the viewing user. */
  jobMatchScore?: number;
  /** Viewer's connections who work at this company. */
  companyConnections?: VoyagerCompanyConnection[];
  /** Insight cards shown to the viewer. */
  insightCards?: VoyagerInsightCard[];

  // ── Tracking & analytics ─────────────────────────────────────────────
  trackingId?: string;
  /** Impression tracking data. */
  jobPostingTrackingData?: {
    trackingId: string;
    jobPostingUrn: LinkedInUrn;
  };

  // ── Premium content ──────────────────────────────────────────────────
  /** Whether LinkedIn Premium insights are available. */
  premiumJob?: boolean;
  /** Premium salary benchmarking data. */
  premiumSalaryInsights?: VoyagerPremiumSalaryInsights;
  /** Premium applicant competition data. */
  premiumApplicantInsights?: VoyagerPremiumApplicantInsights;
}

// ---------------------------------------------------------------------------
// 1a. Workplace type enums & resolution
// ---------------------------------------------------------------------------

export type VoyagerWorkplaceType = "remote" | "on-site" | "hybrid";

/**
 * Resolved workplace type entity — found in `workplaceTypesResolutionResults`.
 * Key is the URN: "urn:li:fs_workplaceType:1" (on-site), ":2" (remote), ":3" (hybrid).
 */
export interface VoyagerWorkplaceTypeResolution extends VoyagerEntity {
  $type: "com.linkedin.voyager.jobs.WorkplaceType";
  workplaceTypeUrn: LinkedInUrn;
  /** Display name: "Remote", "On-site", "Hybrid" */
  localizedName: string;
  /**
   * Canonical enum:
   *   1 = ON_SITE
   *   2 = REMOTE
   *   3 = HYBRID
   */
  workplaceTypeEnum?: "ON_SITE" | "REMOTE" | "HYBRID";
}

// ---------------------------------------------------------------------------
// 1b. Employment type & experience level enums
// ---------------------------------------------------------------------------

export type VoyagerEmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "TEMPORARY"
  | "INTERNSHIP"
  | "VOLUNTEER"
  | "OTHER";

export type VoyagerExperienceLevel =
  | "ENTRY_LEVEL"
  | "ASSOCIATE"
  | "MID_SENIOR_LEVEL"
  | "DIRECTOR"
  | "EXECUTIVE"
  | "NOT_APPLICABLE"
  | "INTERNSHIP";

// ---------------------------------------------------------------------------
// 1c. Job function & industry resolution
// ---------------------------------------------------------------------------

/**
 * Resolved job function entity.
 * LinkedIn uses ~26 canonical function categories.
 */
export interface VoyagerJobFunction extends VoyagerEntity {
  $type: "com.linkedin.voyager.common.Function";
  functionUrn: LinkedInUrn;
  localizedName: string;
  /** e.g. "it", "eng", "sales", "mktg", "fin", "ops", "hr", "design" */
  functionCode?: string;
}

/**
 * Resolved industry entity.
 * LinkedIn uses ~148 canonical industry codes.
 */
export interface VoyagerIndustry extends VoyagerEntity {
  $type: "com.linkedin.voyager.common.Industry";
  industryUrn: LinkedInUrn;
  localizedName: string;
  /** LinkedIn industry group code. */
  industryCode?: number;
  /** Parent industry group URN. */
  industryGroupUrn?: LinkedInUrn;
}

// ---------------------------------------------------------------------------
// 1d. Company details (decorated on job posting)
// ---------------------------------------------------------------------------

/**
 * Inline company details decorated onto the job posting entity.
 * This is a summary — full company profile requires a separate fetch.
 */
export interface VoyagerJobCompanyDetails {
  $type?: "com.linkedin.voyager.jobs.JobPostingCompanyDetails";
  /** Company URN. */
  companyUrn: LinkedInUrn;
  /** Company name. */
  companyName: string;
  /** LinkedIn company page URL path (e.g. "/company/google"). */
  companyPageUrl?: string;
  /** Company logo image. */
  logo?: VoyagerImage;
  /** Company cover/banner image. */
  coverImage?: VoyagerImage;
  /** Follower count on LinkedIn. */
  followerCount?: number;
  formattedFollowerCount?: string;
  /** Employee count range. */
  staffCount?: number;
  staffCountRange?: VoyagerStaffCountRange;
  formattedStaffCount?: string;
  /** Company type (e.g. "PUBLIC_COMPANY", "PRIVATELY_HELD", "NONPROFIT"). */
  companyType?: VoyagerCompanyType;
  /** Industries the company operates in. */
  industries?: string[];
  /** Company description/tagline. */
  description?: string;
  /** Headquarters location. */
  headquarter?: VoyagerCompanyLocation;
  /** Company specialties/focus areas. */
  specialities?: string[];
  /** Company website URL. */
  websiteUrl?: string;
  /** Founded year. */
  foundedOn?: { year: number; month?: number; day?: number };
}

export type VoyagerCompanyType =
  | "PUBLIC_COMPANY"
  | "PRIVATELY_HELD"
  | "NONPROFIT"
  | "GOVERNMENT_AGENCY"
  | "SELF_EMPLOYED"
  | "PARTNERSHIP"
  | "SOLE_PROPRIETORSHIP"
  | "EDUCATIONAL_INSTITUTION";

export interface VoyagerStaffCountRange {
  start: number;
  end?: number;
}

export interface VoyagerCompanyLocation {
  country: string;
  geographicArea?: string;
  city?: string;
  postalCode?: string;
  line1?: string;
  line2?: string;
}

/**
 * Full company resolution entity found in `included` array.
 * Resolved from `companyUrn` on the job posting.
 */
export interface VoyagerCompanyResolution extends VoyagerEntity {
  $type: "com.linkedin.voyager.organization.Company";
  name: string;
  universalName: string; // URL-safe slug
  entityUrn: LinkedInUrn;
  logo?: VoyagerImage;
  url?: string;
  followingInfo?: {
    followerCount: number;
    following: boolean;
  };
  staffCount?: number;
  staffCountRange?: VoyagerStaffCountRange;
  industryUrns?: LinkedInUrn[];
  industries?: string[];
  companyType?: VoyagerCompanyType;
  headquarter?: VoyagerCompanyLocation;
  description?: string;
  specialities?: string[];
  websiteUrl?: string;
  foundedOn?: { year: number };
}

// ---------------------------------------------------------------------------
// 1e. Salary & compensation
// ---------------------------------------------------------------------------

export interface VoyagerSalaryInsights {
  $type?: "com.linkedin.voyager.jobs.SalaryInsights";
  /** Whether salary data is available. */
  salaryAvailable: boolean;
  /** Currency code (ISO 4217). */
  currencyCode?: string;
  /** Compensation range. */
  compensationRange?: {
    minValue: number;
    maxValue: number;
    medianValue?: number;
  };
  /** Pay period: "YEARLY", "MONTHLY", "HOURLY", "WEEKLY". */
  payPeriod?: VoyagerPayPeriod;
  formattedRange?: string;
}

export type VoyagerPayPeriod = "YEARLY" | "MONTHLY" | "HOURLY" | "WEEKLY";

export interface VoyagerCompensationDetails {
  $type?: "com.linkedin.voyager.jobs.CompensationDetails";
  /** Overall compensation range (base + bonus, etc.). */
  compensationRange?: {
    minValue: number;
    maxValue: number;
    medianValue?: number;
  };
  /** Breakdown by component type. */
  compensationBreakdown?: VoyagerCompensationBreakdown[];
  payPeriod?: VoyagerPayPeriod;
  currencyCode?: string;
}

export interface VoyagerCompensationBreakdown {
  /** e.g. "BASE_SALARY", "BONUS", "STOCK", "COMMISSION", "TIPS", "OTHER" */
  compensationType: VoyagerCompensationType;
  range?: {
    minValue: number;
    maxValue: number;
    medianValue?: number;
  };
  payPeriod?: VoyagerPayPeriod;
  description?: string;
}

export type VoyagerCompensationType =
  | "BASE_SALARY"
  | "BONUS"
  | "STOCK"
  | "COMMISSION"
  | "TIPS"
  | "OTHER";

export interface VoyagerPremiumSalaryInsights {
  $type?: string;
  /** Percentile placement of this job's salary vs. market. */
  salaryPercentile?: number;
  /** Median salary for comparable roles. */
  marketMedian?: number;
  /** How this salary compares to market. */
  comparison?: "ABOVE" | "BELOW" | "AT";
  currencyCode?: string;
}

// ---------------------------------------------------------------------------
// 1f. Benefits
// ---------------------------------------------------------------------------

export interface VoyagerBenefits {
  $type?: "com.linkedin.voyager.jobs.Benefits";
  /** List of benefit categories offered. */
  benefitsList?: VoyagerBenefitItem[];
  /** Formatted benefits summary text. */
  formattedBenefits?: string;
}

export interface VoyagerBenefitItem {
  /**
   * Benefit type enum.
   * Known values: "MEDICAL_INSURANCE", "DENTAL_INSURANCE", "VISION_INSURANCE",
   *   "LIFE_INSURANCE", "401K", "PENSION_PLAN", "PAID_TIME_OFF",
   *   "PARENTAL_LEAVE", "TUITION_ASSISTANCE", "DISABILITY_INSURANCE",
   *   "COMMUTER_BENEFITS", "STOCK_OPTIONS", "PERFORMANCE_BONUS",
   *   "FLEXIBLE_SCHEDULE", "REMOTE_WORK", "CHILDCARE_SUPPORT",
   *   "GYM_MEMBERSHIP", "PROFESSIONAL_DEVELOPMENT", "OTHER"
   */
  benefitType: string;
  localizedName?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// 1g. Application methods
// ---------------------------------------------------------------------------

/**
 * Polymorphic apply method — check $type to determine which shape applies.
 *
 * Easy Apply:  $type = "com.linkedin.voyager.jobs.OffsiteApply"  (actually uses LinkedIn flow)
 * External:    $type = "com.linkedin.voyager.jobs.OffsiteApply"
 * Complex:     $type = "com.linkedin.voyager.jobs.ComplexOnsiteApply"
 */
export type VoyagerApplyMethod =
  | VoyagerEasyApply
  | VoyagerOffsiteApply
  | VoyagerComplexOnsiteApply;

export interface VoyagerEasyApply {
  $type: "com.linkedin.voyager.jobs.EasyApplyOnlineApply";
  easyApplyUrl: string;
  /** Number of questions in the Easy Apply form. */
  questionCount?: number;
  /** Whether a resume is required. */
  resumeRequired?: boolean;
  /** Whether a cover letter field is shown. */
  coverLetterRequired?: boolean;
  /** Estimated time to complete (minutes). */
  estimatedCompletionTime?: number;
}

export interface VoyagerOffsiteApply {
  $type: "com.linkedin.voyager.jobs.OffsiteApply";
  /** External ATS URL to apply. */
  companyApplyUrl: string;
  /** Whether the URL was verified by LinkedIn. */
  applyUrlVerified?: boolean;
  /** Tracking-wrapped version of companyApplyUrl. */
  applyStartersPreferenceVoid?: boolean;
  /** Instructions from the employer (free text). */
  applyInstructions?: VoyagerTextContent;
  /** Email to apply to (rare — some smaller companies). */
  applyEmail?: string;
}

export interface VoyagerComplexOnsiteApply {
  $type: "com.linkedin.voyager.jobs.ComplexOnsiteApply";
  /** Multi-step application with questions. */
  companyApplyUrl?: string;
  easyApplyUrl?: string;
  /** Application instructions (free text or structured). */
  applyInstructions?: VoyagerTextContent;
}

// ---------------------------------------------------------------------------
// 1h. Hiring team & poster
// ---------------------------------------------------------------------------

export interface VoyagerJobPoster {
  $type?: string;
  posterUrn: LinkedInUrn;
  firstName?: string;
  lastName?: string;
  headline?: string;
  profilePicture?: VoyagerImage;
  publicIdentifier?: string;
  /** e.g. "FIRST_DEGREE", "SECOND_DEGREE", "OUT_OF_NETWORK" */
  connectionDegree?: string;
}

export interface VoyagerHiringTeamMember {
  memberUrn: LinkedInUrn;
  firstName?: string;
  lastName?: string;
  title?: string;
  headline?: string;
  profilePicture?: VoyagerImage;
  publicIdentifier?: string;
  /** Whether this person is the primary recruiter. */
  isPrimaryContact?: boolean;
  /** Degree of connection to viewer. */
  connectionDegree?: string;
}

// ---------------------------------------------------------------------------
// 1i. Viewer context & insight cards
// ---------------------------------------------------------------------------

export interface VoyagerCompanyConnection {
  profileUrn: LinkedInUrn;
  firstName: string;
  lastName: string;
  headline?: string;
  profilePicture?: VoyagerImage;
  publicIdentifier?: string;
}

export interface VoyagerInsightCard {
  $type?: string;
  /** Insight type: "COMPANY_GROWTH", "SKILLS_MATCH", "ALUMNI", etc. */
  insightType: string;
  /** Display text for the insight. */
  text?: VoyagerTextContent;
  /** Optional icon. */
  icon?: VoyagerImage;
}

export interface VoyagerPremiumApplicantInsights {
  $type?: string;
  /** Total number of applicants. */
  totalApplicants?: number;
  /** Percentile breakdown by seniority. */
  seniorityDistribution?: Array<{
    seniority: VoyagerExperienceLevel;
    percentage: number;
  }>;
  /** Applicant location distribution. */
  locationDistribution?: Array<{
    locationName: string;
    percentage: number;
  }>;
  /** How competitive the role is. */
  competitiveness?: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
}

// ---------------------------------------------------------------------------
// 1j. Location details
// ---------------------------------------------------------------------------

export interface VoyagerJobLocationDetails {
  $type?: string;
  /** Structured geo location. */
  geoLocation?: VoyagerGeoLocation;
  /** Location type: "ONSITE", "REMOTE", "HYBRID". */
  locationType?: string;
  /** Multiple locations (for multi-office postings). */
  locationMap?: Record<string, VoyagerGeoLocation>;
}

export interface VoyagerGeoLocation {
  $type?: string;
  entityUrn?: LinkedInUrn;
  /** Country code (ISO 3166-1 alpha-2). */
  countryCode?: string;
  country?: string;
  /** State/region/province. */
  geographicArea?: string;
  city?: string;
  postalCode?: string;
  /** Full formatted location string. */
  defaultLocalizedName?: string;
  /** Latitude/longitude for map display. */
  latitude?: number;
  longitude?: number;
}

// ---------------------------------------------------------------------------
// 2. GET /voyager/api/voyagerJobsDashJobCards/{urn} — Job Card Data
// ---------------------------------------------------------------------------

/**
 * Job card entity — lightweight representation used in search results,
 * recommendations, and job lists. Fetched via:
 *   GET /voyager/api/voyagerJobsDashJobCards?decorationId=...&jobCardUnion=urn:li:fsd_jobPosting:{id}
 *
 * Common decorationId:
 *   "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCard-37"
 *   "com.linkedin.voyager.dash.deco.jobs.web.shared.WebJobSearchCardWithSalary-25"
 */
export interface VoyagerJobCard extends VoyagerEntity {
  $type: "com.linkedin.voyager.dash.jobs.JobCard";

  /** Reference to the full job posting URN. */
  jobCardUnion: {
    jobPostingCard?: LinkedInUrn;
  };

  // ── Core fields ──────────────────────────────────────────────────────
  /** Job title. */
  jobTitle: string;
  /** Primary subtitle (usually company name). */
  primaryDescription?: VoyagerTextContent;
  /** Secondary subtitle (usually location). */
  secondaryDescription?: VoyagerTextContent;
  /** Tertiary info (e.g. "2 days ago", "Easy Apply"). */
  tertiaryDescription?: VoyagerTextContent;
  /** Formatted location string. */
  formattedLocation?: string;

  // ── Company ──────────────────────────────────────────────────────────
  companyName?: string;
  companyUrn?: LinkedInUrn;
  logo?: VoyagerImage;

  // ── Insights shown on card ───────────────────────────────────────────
  /** e.g. "3 connections work here", "Your skills match" */
  insightText?: VoyagerTextContent;
  /** Footer insight (e.g. applicant count). */
  footerItems?: VoyagerJobCardFooterItem[];

  // ── Salary (when available) ──────────────────────────────────────────
  salaryInsight?: VoyagerTextContent;
  formattedSalary?: string;

  // ── Metadata ─────────────────────────────────────────────────────────
  /** When the job was listed (epoch ms). */
  listedAt?: number;
  /** Whether Easy Apply is available. */
  easyApplyEnabled?: boolean;
  /** Workplace type label. */
  workplaceType?: VoyagerWorkplaceType;
  /** Whether the viewer has saved this job. */
  saved?: boolean;
  /** Whether the viewer has applied. */
  applied?: boolean;
  /** Referral tracking. */
  referenceId?: string;
  trackingId?: string;

  // ── Promoted / sponsored ─────────────────────────────────────────────
  /** Whether this is a promoted/sponsored job listing. */
  promoted?: boolean;
  /** Badge text (e.g. "Promoted", "Actively recruiting"). */
  jobCardBadge?: {
    text: string;
    badgeType?: string;
  };
}

export interface VoyagerJobCardFooterItem {
  type: string;
  text?: VoyagerTextContent;
  /** Applicant count insight. */
  applicantCountText?: string;
  timePostedText?: string;
}

// ---------------------------------------------------------------------------
// 3. GET /voyager/api/jobs/jobPostings/{jobId}/description — Rich Description
// ---------------------------------------------------------------------------

/**
 * Job description response entity. Contains the full formatted description
 * with rich text attributes (bold, lists, links, etc.).
 *
 * This endpoint returns the description separately from the main posting,
 * which is useful when the main posting was fetched with a lightweight
 * decoration that excluded the description body.
 */
export interface VoyagerJobDescription {
  $type?: "com.linkedin.voyager.jobs.JobPostingDescription";
  /** The full description with structured formatting. */
  description: VoyagerTextContent;
  /**
   * Some postings include a separate "about the company" section
   * below the job description.
   */
  companyDescription?: VoyagerTextContent;
  /** Qualifications section (structured in newer postings). */
  qualificationsSummary?: VoyagerQualificationsSummary;
  /** How the description was sourced. */
  descriptionSource?: "EMPLOYER" | "GENERATED" | "STANDARDIZED";
}

export interface VoyagerQualificationsSummary {
  $type?: string;
  /** Must-have qualifications. */
  requiredQualifications?: VoyagerTextContent;
  /** Nice-to-have qualifications. */
  preferredQualifications?: VoyagerTextContent;
  /** Responsibilities section. */
  responsibilities?: VoyagerTextContent;
}

/**
 * Top-level response shape for the description endpoint.
 * Normalized response wraps the description in `data` + `included`.
 */
export interface VoyagerJobDescriptionResponse {
  data: {
    $type: string;
    entityUrn: LinkedInUrn;
    description: VoyagerTextContent;
    companyDescription?: VoyagerTextContent;
  };
  included: VoyagerEntity[];
  paging?: VoyagerPaging;
}

// ---------------------------------------------------------------------------
// 4. GET /voyager/api/jobs/jobPostings/{jobId}/skills — Skills Breakdown
// ---------------------------------------------------------------------------

/**
 * Skills response for a job posting. Contains both the skills required by
 * the job and how the viewer's skills match.
 */
export interface VoyagerJobSkillsResponse {
  data: {
    $type: string;
    entityUrn: LinkedInUrn;
    skillMatchStatuses: VoyagerSkillMatchStatus[];
  };
  included: VoyagerEntity[];
}

export interface VoyagerJobSkills {
  $type?: "com.linkedin.voyager.jobs.JobPostingSkills";
  /** All skills associated with this job. */
  skillMatchStatuses?: VoyagerSkillMatchStatus[];
  /** Summary: how many skills the viewer matches. */
  skillMatchSummary?: {
    matched: number;
    total: number;
    formattedText?: string;
  };
}

export interface VoyagerSkillMatchStatus {
  /** Skill entity. */
  skill: VoyagerSkill;
  /**
   * Match status relative to the viewer's profile.
   * "MATCHED" = viewer has this skill
   * "UNMATCHED" = viewer doesn't have this skill
   * "MISSING" = critical skill the viewer is missing
   */
  matchStatus?: "MATCHED" | "UNMATCHED" | "MISSING";
  /**
   * Whether this skill is explicitly required or merely preferred.
   * "REQUIRED" | "PREFERRED" | "NICE_TO_HAVE"
   */
  importance?: VoyagerSkillImportance;
  /** Localized label for the skill. */
  localizedSkillDisplayName?: string;
}

export type VoyagerSkillImportance = "REQUIRED" | "PREFERRED" | "NICE_TO_HAVE";

export interface VoyagerSkill extends VoyagerEntity {
  $type: "com.linkedin.voyager.common.Skill";
  /** Skill URN (e.g. "urn:li:fsd_skill:12345"). */
  entityUrn: LinkedInUrn;
  /** Canonical skill name. */
  name: string;
  localizedName?: string;
  /** Skill category (e.g. "Information Technology", "Engineering"). */
  skillCategory?: string;
}

export interface VoyagerSkillMatchInsight {
  $type?: string;
  /** Number of matching skills. */
  matchedSkillCount: number;
  /** Total skills required/listed. */
  totalSkillCount: number;
  /** Formatted text: "5 of 8 skills match your profile". */
  formattedMatchText?: string;
  /** Detailed skill-by-skill breakdown. */
  skillMatchStatuses?: VoyagerSkillMatchStatus[];
}

// ---------------------------------------------------------------------------
// 5. Normalized response wrapper
// ---------------------------------------------------------------------------

/**
 * Top-level shape of all Voyager API normalized responses when using
 * Accept: application/vnd.linkedin.normalized+json+2.1
 *
 * The `data` field contains the root entity reference.
 * The `included` array contains all resolved/decorated entities.
 */
export interface VoyagerNormalizedResponse<T = VoyagerEntity> {
  data: T & { $type: string; entityUrn: LinkedInUrn };
  included: VoyagerEntity[];
  paging?: VoyagerPaging;
}

/**
 * Alternative response shape when using
 * Accept: application/vnd.linkedin.normalized+json+2.1
 * with collection endpoints (job search, recommendations, etc.).
 */
export interface VoyagerCollectionResponse<T = VoyagerEntity> {
  data: {
    $type: string;
    entityUrn?: LinkedInUrn;
    /** Paginated elements — may be URN references resolved in `included`. */
    elements: Array<T | LinkedInUrn>;
    paging: VoyagerPaging;
    metadata?: Record<string, unknown>;
  };
  included: VoyagerEntity[];
}

// ---------------------------------------------------------------------------
// 6. API endpoint constants & request helpers
// ---------------------------------------------------------------------------

/** Base URL for all Voyager API calls (must be same-origin from linkedin.com). */
export const VOYAGER_API_BASE = "https://www.linkedin.com/voyager/api";

/** Endpoint paths for job-related Voyager APIs. */
export const VOYAGER_JOB_ENDPOINTS = {
  /** Full job posting details. Param: numeric jobId. */
  JOB_POSTING: (jobId: string | number) =>
    `${VOYAGER_API_BASE}/jobs/jobPostings/${jobId}`,

  /** Job card data. Param: full URN. */
  JOB_CARD: (urn: string) =>
    `${VOYAGER_API_BASE}/voyagerJobsDashJobCards?jobCardUnion=${encodeURIComponent(urn)}`,

  /** Rich job description. Param: numeric jobId. */
  JOB_DESCRIPTION: (jobId: string | number) =>
    `${VOYAGER_API_BASE}/jobs/jobPostings/${jobId}/description`,

  /** Skills breakdown. Param: numeric jobId. */
  JOB_SKILLS: (jobId: string | number) =>
    `${VOYAGER_API_BASE}/jobs/jobPostings/${jobId}/skills`,

  /** Job search. */
  JOB_SEARCH:
    `${VOYAGER_API_BASE}/voyagerJobsDashJobCards`,

  /** Job recommendations for viewer. */
  JOB_RECOMMENDATIONS:
    `${VOYAGER_API_BASE}/jobs/jobRecommendations`,
} as const;

/**
 * Common decoration IDs used with Voyager job endpoints.
 * Append as `?decorationId={value}` to control which fields are expanded.
 */
export const VOYAGER_JOB_DECORATION_IDS = {
  /** Full posting with all fields expanded (description, company, skills). */
  FULL_JOB_POSTING:
    "com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65",
  /** Lightweight posting — title, company, location, no description. */
  LIGHT_JOB_POSTING:
    "com.linkedin.voyager.deco.jobs.web.shared.WebLightJobPosting-23",
  /** Job search card — used in search result lists. */
  JOB_SEARCH_CARD:
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCard-37",
  /** Job search card with salary — includes compensation data. */
  JOB_SEARCH_CARD_WITH_SALARY:
    "com.linkedin.voyager.dash.deco.jobs.web.shared.WebJobSearchCardWithSalary-25",
  /** Job details panel — the right-side detail pane on search. */
  JOB_DETAILS_PANEL:
    "com.linkedin.voyager.deco.jobs.web.shared.WebJobPostingWithCompanyDetails-68",
} as const;

/**
 * Required headers for all Voyager API requests.
 * The csrf-token must be extracted from the JSESSIONID cookie.
 */
export function voyagerHeaders(csrfToken: string): HeadersInit {
  return {
    "csrf-token": csrfToken,
    "x-restli-protocol-version": "2.0.0",
    Accept: "application/vnd.linkedin.normalized+json+2.1",
  };
}

// ---------------------------------------------------------------------------
// 7. Helper: Extract remote work status from a posting
// ---------------------------------------------------------------------------

export type RemoteWorkStatus = "remote" | "hybrid" | "on-site" | "unknown";

/**
 * Determine the remote work status from a VoyagerJobPosting.
 *
 * LinkedIn encodes remote work in multiple fields (evolved over time):
 *   1. `workplaceType` — canonical field ("remote" | "on-site" | "hybrid")
 *   2. `workplaceTypesResolutionResults` — decorated resolution with enum
 *   3. `workRemoteAllowed` — legacy boolean (true = remote)
 *   4. `formattedLocation` — sometimes contains "(Remote)" suffix
 *
 * This function checks all four in priority order.
 */
export function extractRemoteStatus(posting: VoyagerJobPosting): RemoteWorkStatus {
  // 1. Canonical workplaceType field
  if (posting.workplaceType) {
    return posting.workplaceType;
  }

  // 2. Resolved workplace types
  if (posting.workplaceTypesResolutionResults) {
    const resolved = Object.values(posting.workplaceTypesResolutionResults);
    for (const wt of resolved) {
      if (wt.workplaceTypeEnum === "REMOTE") return "remote";
      if (wt.workplaceTypeEnum === "HYBRID") return "hybrid";
      if (wt.workplaceTypeEnum === "ON_SITE") return "on-site";
      // Fall back to localizedName
      const name = wt.localizedName?.toLowerCase();
      if (name === "remote") return "remote";
      if (name === "hybrid") return "hybrid";
      if (name === "on-site" || name === "onsite") return "on-site";
    }
  }

  // 3. Legacy boolean
  if (posting.workRemoteAllowed === true) return "remote";
  if (posting.workRemoteAllowed === false) return "on-site";

  // 4. Location string heuristic
  if (posting.formattedLocation) {
    const loc = posting.formattedLocation.toLowerCase();
    if (loc.includes("remote")) return "remote";
    if (loc.includes("hybrid")) return "hybrid";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// 8. Helper: Extract apply URL from a posting
// ---------------------------------------------------------------------------

/**
 * Extract the application URL from a job posting's applyMethod.
 * Returns the most actionable URL (external ATS link preferred over Easy Apply).
 */
export function extractApplyUrl(
  posting: VoyagerJobPosting,
): { url: string; method: "easy_apply" | "external" | "complex" } | null {
  if (!posting.applyMethod) return null;

  switch (posting.applyMethod.$type) {
    case "com.linkedin.voyager.jobs.OffsiteApply":
      return {
        url: (posting.applyMethod as VoyagerOffsiteApply).companyApplyUrl,
        method: "external",
      };
    case "com.linkedin.voyager.jobs.EasyApplyOnlineApply":
      return {
        url: (posting.applyMethod as VoyagerEasyApply).easyApplyUrl,
        method: "easy_apply",
      };
    case "com.linkedin.voyager.jobs.ComplexOnsiteApply": {
      const complex = posting.applyMethod as VoyagerComplexOnsiteApply;
      return {
        url: complex.companyApplyUrl || complex.easyApplyUrl || "",
        method: "complex",
      };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 9. Helper: Parse job ID from various formats
// ---------------------------------------------------------------------------

/**
 * Extract the numeric job ID from a LinkedIn job URL or URN.
 *
 * Handles:
 *   - "urn:li:fsd_jobPosting:3912345678"
 *   - "urn:li:jobPosting:3912345678"
 *   - "https://www.linkedin.com/jobs/view/3912345678"
 *   - "https://www.linkedin.com/jobs/view/some-title-3912345678"
 *   - "3912345678" (raw ID)
 */
export function parseJobId(input: string): string | null {
  // URN format
  const urnMatch = input.match(/urn:li:(?:fsd_)?jobPosting:(\d+)/);
  if (urnMatch) return urnMatch[1];

  // URL format — /jobs/view/{id} or /jobs/view/{slug}-{id}
  const urlMatch = input.match(/\/jobs\/view\/(?:.*?[-/])?(\d{8,})/);
  if (urlMatch) return urlMatch[1];

  // Raw numeric ID
  if (/^\d{8,}$/.test(input.trim())) return input.trim();

  return null;
}

/**
 * Build the full fsd_jobPosting URN from a numeric ID.
 */
export function jobPostingUrn(jobId: string | number): LinkedInUrn {
  return `urn:li:fsd_jobPosting:${jobId}`;
}
