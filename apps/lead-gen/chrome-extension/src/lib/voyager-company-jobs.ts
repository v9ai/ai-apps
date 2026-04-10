/**
 * LinkedIn Voyager API — Company Jobs & Hiring Insights
 *
 * Comprehensive TypeScript interfaces and endpoint documentation for
 * company-level job data, headcount insights, recent hires, and
 * department breakdowns via LinkedIn's internal Voyager REST API.
 *
 * Authentication: All endpoints require:
 *   - `csrf-token` header: extracted from JSESSIONID cookie (strip quotes)
 *   - `x-restli-protocol-version: 2.0.0` header
 *   - `Accept: application/vnd.linkedin.normalized+json+2.1` header
 *   - `credentials: "include"` (sends li_at + JSESSIONID cookies)
 *
 * URN Format: `urn:li:fsd_company:{numericId}` or `urn:li:company:{numericId}`
 *
 * Rate Limits: ~100 requests/minute per session. 429 responses should
 * trigger exponential backoff (2s, 4s, 8s, max 30s). Sessions typically
 * survive 1000-2000 requests before requiring re-auth.
 */

// ─── URN Types ───────────────────────────────────────────────────────

/** LinkedIn URN string pattern */
export type LinkedInURN = string; // e.g. "urn:li:fsd_company:12345"

/** Organization URN subtypes encountered in Voyager responses */
export type CompanyURN = `urn:li:fsd_company:${string}` | `urn:li:company:${string}`;
export type JobPostingURN = `urn:li:fsd_jobPosting:${string}`;
export type MemberURN = `urn:li:fsd_profile:${string}` | `urn:li:member:${string}`;
export type GeoURN = `urn:li:fsd_geo:${string}` | `urn:li:geo:${string}`;

// ─── Shared Types ────────────────────────────────────────────────────

/** Standard Voyager pagination metadata */
export interface VoyagerPaging {
  /** Total number of results available */
  total: number;
  /** Number of results returned in this page */
  count: number;
  /** Offset of first result in this page */
  start: number;
  /** Links for pagination (next, prev) — not always present */
  links?: Array<{
    rel: string;
    href: string;
    type: string;
  }>;
}

/**
 * All Voyager responses come in one of two shapes:
 * 1. Normalized: { data: { ... }, included: [...], paging: {...} }
 * 2. Direct: { elements: [...], paging: {...} }
 *
 * The normalized shape uses `included` for denormalized entity resolution
 * (referenced by URN from the main `data` or `elements` arrays).
 */
export interface VoyagerNormalizedResponse<T = unknown> {
  data: T;
  included: VoyagerIncludedEntity[];
  paging?: VoyagerPaging;
}

export interface VoyagerDirectResponse<T = unknown> {
  elements: T[];
  paging?: VoyagerPaging;
}

export type VoyagerResponse<T = unknown> =
  | VoyagerNormalizedResponse<T>
  | VoyagerDirectResponse<T>;

/** Generic included entity — every entity has $type and entityUrn */
export interface VoyagerIncludedEntity {
  $type: string;
  entityUrn: string;
  [key: string]: unknown;
}

/** Image artifact (used in logos, profile photos, etc.) */
export interface VoyagerImageArtifact {
  width: number;
  height: number;
  fileIdentifyingUrlPathSegment: string;
  expiresAt: number;
}

export interface VoyagerImage {
  $type: "com.linkedin.common.VectorImage";
  rootUrl: string;
  artifacts: VoyagerImageArtifact[];
}

// ─── 1. Company Job Search Cards ─────────────────────────────────────
//
// GET /voyager/api/voyagerJobsDashJobCards
//
// Primary endpoint for fetching job listings posted by a specific company.
// Same API that powers the LinkedIn Jobs search page.
//
// Query Parameters:
//   decorationId: "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227"
//   count: number (page size, max 25)
//   start: number (offset for pagination)
//   q: "jobSearch"
//   query: "(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(company:List({numericId}),workplaceType:List(2)),spellCorrectionEnabled:true)"
//   locationUnion: "(geoId:92000000)"  // Worldwide
//
// workplaceType filter values:
//   1 = On-site
//   2 = Remote
//   3 = Hybrid
//
// geoId values:
//   92000000 = Worldwide
//   103644278 = United States
//   101165590 = United Kingdom
//   100364837 = European Union
//   91000000 = European Economic Area
//
// The `paging.total` field gives total matching job count WITHOUT fetching all pages.
// Set count=1 to get just the count with minimal data transfer.

export interface VoyagerJobSearchParams {
  decorationId: "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227";
  count: number;
  start: number;
  q: "jobSearch";
  query: string;
  locationUnion: string;
}

/** A single job card from search results */
export interface VoyagerJobCard {
  $type: "com.linkedin.voyager.dash.jobs.search.JobSearchCard";
  entityUrn: string;
  /** Reference to the job posting entity (resolve from `included`) */
  jobPosting: JobPostingURN | string;
  /** Tracking context for analytics */
  trackingUrn: string;
}

/** Job posting entity (found in `included` array, resolved by URN) */
export interface VoyagerJobPosting {
  $type: "com.linkedin.voyager.dash.jobs.JobPosting";
  entityUrn: JobPostingURN;
  title: string;
  /** Company URN — resolve from included for full company data */
  companyResolutionResult?: VoyagerJobCompanyInfo;
  /** Formatted location string */
  formattedLocation: string;
  /** Listed time as Unix timestamp (ms) */
  listedAt: number;
  /** Workplace type */
  workplaceType?: "REMOTE" | "ON_SITE" | "HYBRID";
  /** Whether the job is still actively listed */
  state: "LISTED" | "CLOSED" | "SUSPENDED";
  /** Apply URL (may be LinkedIn Easy Apply or external) */
  applyMethod?: {
    $type: string;
    companyApplyUrl?: string;
    easyApplyUrl?: string;
  };
  /** Salary info (when disclosed) */
  salaryInsights?: {
    compensationBreakdown?: Array<{
      compensation: {
        min?: { amount: number; currencyCode: string };
        max?: { amount: number; currencyCode: string };
        median?: { amount: number; currencyCode: string };
      };
      type: "BASE_SALARY" | "TOTAL_COMPENSATION";
    }>;
  };
  /** Experience level */
  formattedExperienceLevel?: string;
  /** Employment type */
  formattedEmploymentStatus?: string;
  /** Job description (may be truncated in search results) */
  description?: { text: string };
  /** Number of applicants */
  applies?: number;
  /** Reposted time (if job was reposted) */
  repostedAt?: number;
}

/** Minimal company info nested in job posting results */
export interface VoyagerJobCompanyInfo {
  entityUrn: CompanyURN;
  name: string;
  universalName: string; // URL slug
  logo?: VoyagerImage;
  url: string;
}

/** Full response shape for job search */
export interface VoyagerJobSearchResponse {
  data: {
    paging: VoyagerPaging;
    elements: VoyagerJobCard[];
  };
  included: Array<VoyagerJobPosting | VoyagerJobCompanyInfo | VoyagerIncludedEntity>;
  paging?: VoyagerPaging; // sometimes duplicated at root
}

// ─── 2. Search Clusters with companyHireTargetId ─────────────────────
//
// GET /voyager/api/search/dash/clusters
//
// LinkedIn's unified search endpoint. When filtered by company, returns
// clustered results: jobs, people, posts, etc. Useful for getting a
// holistic view of a company's hiring activity.
//
// Query Parameters:
//   decorationId: "com.linkedin.voyager.dash.deco.search.SearchClusterCollection-191"
//   q: "all"
//   query: "(flagshipSearchIntent:SEARCH_SRP,queryParameters:(companyHireTargetId:List({numericId}),resultType:List(JOBS)),includeFiltersInResponse:true)"
//   count: 10
//   start: 0
//
// Alternate filter — recent company hires (people who recently joined):
//   query: "(flagshipSearchIntent:SEARCH_SRP,queryParameters:(currentCompany:List({numericId}),pastTimeRange:List(Past_month),resultType:List(PEOPLE)),includeFiltersInResponse:true)"

export interface VoyagerSearchClusterParams {
  decorationId: "com.linkedin.voyager.dash.deco.search.SearchClusterCollection-191";
  q: "all";
  query: string;
  count: number;
  start: number;
}

/** Search cluster metadata — groups results by type */
export interface VoyagerSearchCluster {
  $type: "com.linkedin.voyager.dash.search.SearchCluster";
  clusterType: "JOB_SEEKER" | "PEOPLE" | "COMPANY" | "CONTENT" | "JOB";
  title?: string;
  /** Total results in this cluster */
  totalResultCount?: number;
  /** Results in this page */
  items: VoyagerSearchClusterItem[];
}

export interface VoyagerSearchClusterItem {
  $type: string;
  entityUrn: string;
  /** Summary for job results */
  jobCardUnion?: {
    jobPostingCard?: {
      entityUrn: JobPostingURN;
      title: string;
      primaryDescription: { text: string }; // company name
      secondaryDescription: { text: string }; // location
      insightText?: { text: string }; // "X applicants" or "Easy Apply"
    };
  };
  /** Summary for people results */
  entityResult?: {
    entityUrn: MemberURN;
    title: { text: string };
    primarySubtitle: { text: string };
    secondarySubtitle?: { text: string };
    summary?: { text: string };
  };
}

export interface VoyagerSearchClusterResponse {
  data: {
    paging: VoyagerPaging;
    elements: VoyagerSearchCluster[];
    metadata?: {
      totalResultCount: number;
    };
  };
  included: VoyagerIncludedEntity[];
}

// ─── 3. Company Job Count ────────────────────────────────────────────
//
// There is no dedicated "job count" endpoint. Instead, extract the count from:
//
// Method A: Job search with count=1 (most reliable)
//   → paging.total gives exact count
//   → Minimal data transfer
//
// Method B: Company page header badge
//   GET /voyager/api/voyagerOrganizationDashCompanies?decorationId=com.linkedin.voyager.dash.deco.organization.MiniCompany-10&q=universalName&universalName={slug}
//   → Response includes `jobCount` or `staffCount` fields
//
// Method C: Organization card
//   GET /voyager/api/organization/companies?decorationId=com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-64&q=universalName&universalName={slug}
//   → Includes `confirmedLocations`, `staffCount`, and sometimes `jobSearchCount`
//
// Recommendation: Use Method A (job search count=1) for accurate job counts.
// Methods B/C are useful for company metadata but job counts may be stale.

/** Compact company card with basic counts (Method B) */
export interface VoyagerMiniCompany {
  $type: "com.linkedin.voyager.dash.organization.Company";
  entityUrn: CompanyURN;
  name: string;
  universalName: string;
  logo?: VoyagerImage;
  /** Employee count as listed on profile */
  staffCount?: number;
  /** Approximate range text: "51-200 employees" */
  staffCountRange?: {
    start: number;
    end: number;
  };
  /** Number of active job postings (may be stale) */
  jobSearchCount?: number;
  url: string;
  industries?: string[];
  headquarter?: {
    country: string;
    city: string;
    geographicArea: string;
    line1?: string;
    postalCode?: string;
  };
}

/** Parameters for company lookup by universalName */
export interface VoyagerCompanyLookupParams {
  decorationId: string;
  q: "universalName";
  universalName: string;
}

// ─── 4. Company Insights Cards (Headcount) ───────────────────────────
//
// GET /voyager/api/voyagerOrganizationDashCompanyInsightsCards
//
// Returns insight cards shown on the company page's "Insights" tab.
// Includes headcount growth, median tenure, top skills, distribution data.
//
// Query Parameters:
//   decorationId: "com.linkedin.voyager.dash.deco.organization.CompanyInsightsCardCollection-86"
//   q: "companyInsights"
//   query: "(companyId:{numericId})"
//
// Requires LinkedIn Premium for full data. Free accounts get partial data.
//
// Alternate endpoint for premium insights:
// GET /voyager/api/voyagerOrganizationDashPremiumCompanyInsights
//   decorationId: "com.linkedin.voyager.dash.deco.organization.PremiumCompanyInsightsCollection-24"
//   q: "premiumCompanyInsights"
//   query: "(companyId:{numericId})"

export interface VoyagerCompanyInsightsParams {
  decorationId: "com.linkedin.voyager.dash.deco.organization.CompanyInsightsCardCollection-86";
  q: "companyInsights";
  query: string; // "(companyId:{numericId})"
}

/** Individual insight card */
export interface VoyagerInsightCard {
  $type: string;
  cardType:
    | "HEADCOUNT_GROWTH"
    | "TOTAL_EMPLOYEE_HEADCOUNT"
    | "MEDIAN_TENURE"
    | "NEW_HIRES"
    | "TOP_SKILLS"
    | "TOP_SCHOOLS"
    | "TOP_COMPANIES"
    | "DISTRIBUTION"
    | "FUNCTION_GROWTH"
    | "SENIOR_LEADERSHIP_HIRES";
  /** Human-readable title ("Employee count", "Median employee tenure") */
  title?: { text: string };
  /** Summary text shown below the card title */
  subtitle?: { text: string };
  /** Main insight value */
  insightValue?: string;
  /** Percentage change (for growth cards) */
  percentageChange?: number;
  /** Time period for the insight */
  timePeriod?: {
    startDate: { month: number; year: number };
    endDate: { month: number; year: number };
  };
}

/** Headcount growth data point (timeseries) */
export interface VoyagerHeadcountGrowthPoint {
  date: { month: number; year: number };
  headcount: number;
  /** Growth rate vs previous period (fractional, e.g. 0.12 = 12%) */
  growthRate?: number;
}

/** Full headcount growth card */
export interface VoyagerHeadcountGrowthCard extends VoyagerInsightCard {
  cardType: "HEADCOUNT_GROWTH" | "TOTAL_EMPLOYEE_HEADCOUNT";
  /** Time series of headcount data */
  headcountGrowth?: {
    timeSeries: VoyagerHeadcountGrowthPoint[];
    /** Overall growth percentage over the time range */
    overallGrowthRate: number;
    /** 6-month growth rate */
    sixMonthGrowthRate?: number;
    /** 12-month growth rate */
    oneYearGrowthRate?: number;
    /** 24-month growth rate */
    twoYearGrowthRate?: number;
    /** Current total employee count */
    currentEmployeeCount: number;
  };
}

/** Function/department growth breakdown */
export interface VoyagerFunctionGrowthCard extends VoyagerInsightCard {
  cardType: "FUNCTION_GROWTH";
  /** Per-department growth data */
  functionGrowth?: VoyagerFunctionGrowthEntry[];
}

export interface VoyagerFunctionGrowthEntry {
  /** Department/function name: "Engineering", "Sales", "Marketing", etc. */
  functionName: string;
  /** Current headcount in this function */
  headcount: number;
  /** Growth rate over 12 months */
  growthRate: number;
  /** Share of total company headcount (0-1) */
  headcountShare: number;
}

/** Response for company insights */
export interface VoyagerCompanyInsightsResponse {
  data: {
    paging: VoyagerPaging;
    elements: VoyagerInsightCard[];
  };
  included: VoyagerIncludedEntity[];
}

// ─── 5. Recent Hires ─────────────────────────────────────────────────
//
// There is no single "recent hires" endpoint. Use these approaches:
//
// Method A: Search clusters with time filter (best)
//   GET /voyager/api/search/dash/clusters
//   query: "(flagshipSearchIntent:SEARCH_SRP,queryParameters:(currentCompany:List({numericId}),pastTimeRange:List(Past_month),resultType:List(PEOPLE)),includeFiltersInResponse:true)"
//
//   pastTimeRange values:
//     Past_24_hours, Past_week, Past_month, Past_3_months, Past_year
//
// Method B: Company people with date-joined sort
//   GET /voyager/api/voyagerOrganizationDashEmployees
//   decorationId: "com.linkedin.voyager.dash.deco.organization.EmployeeCardCollection-32"
//   q: "search"
//   query: "(companyId:{numericId},sortBy:DATE_STARTED)"
//   count: 10
//   start: 0
//
// Method C: Insights card "NEW_HIRES" from endpoint #4
//   Returns aggregate count and percentage, not individual profiles.
//
// Method D: Senior leadership hires (Insights card)
//   cardType: "SENIOR_LEADERSHIP_HIRES" from endpoint #4
//   Returns recent VP/C-level hires specifically.

export interface VoyagerEmployeeSearchParams {
  decorationId: "com.linkedin.voyager.dash.deco.organization.EmployeeCardCollection-32";
  q: "search";
  query: string; // "(companyId:{numericId},sortBy:DATE_STARTED)"
  count: number;
  start: number;
}

/** Employee card from the company people page */
export interface VoyagerEmployeeCard {
  $type: "com.linkedin.voyager.dash.organization.EmployeeCard";
  entityUrn: string;
  /** Reference to the member profile */
  member: MemberURN | string;
  /** Current title at this company */
  title: string;
  /** Resolved profile data (in `included`) */
  memberResolutionResult?: {
    entityUrn: MemberURN;
    firstName: string;
    lastName: string;
    publicIdentifier: string;
    headline: string;
    profilePicture?: VoyagerImage;
  };
  /** When the person started at the company (not always available) */
  dateStarted?: { month?: number; year: number };
}

export interface VoyagerEmployeeSearchResponse {
  data: {
    paging: VoyagerPaging;
    elements: VoyagerEmployeeCard[];
  };
  included: VoyagerIncludedEntity[];
}

// ─── 6. Department Breakdown of Open Roles ───────────────────────────
//
// Method A: Job search with function filter (recommended)
//   GET /voyager/api/voyagerJobsDashJobCards
//   Same as endpoint #1, but add function filter:
//   query: "(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(company:List({numericId}),function:List({functionId})),spellCorrectionEnabled:true)"
//
//   Common functionId values:
//     1  = Accounting
//     2  = Administrative
//     3  = Arts and Design
//     4  = Business Development
//     5  = Community and Social Services
//     6  = Consulting
//     7  = Education
//     8  = Engineering
//     9  = Entrepreneurship
//     10 = Finance
//     11 = Healthcare Services
//     12 = Human Resources
//     13 = Information Technology
//     14 = Legal
//     15 = Marketing
//     16 = Media and Communication
//     17 = Military and Protective Services
//     18 = Operations
//     19 = Product Management
//     20 = Program and Project Management
//     21 = Purchasing
//     22 = Quality Assurance
//     23 = Real Estate
//     24 = Research
//     25 = Sales
//     26 = Support
//
//   Issue each function filter with count=1 to get department job counts.
//   Total API calls = number of departments to check.
//
// Method B: Function growth from insights (endpoint #4)
//   Returns headcount by department (not open roles specifically).
//   Combine with job search counts for a fuller picture.
//
// Method C: Search filters response
//   GET /voyager/api/search/dash/clusters
//   With `includeFiltersInResponse:true`, the response includes
//   available filter values with result counts per filter option.

export interface VoyagerDepartmentJobCount {
  functionId: number;
  functionName: string;
  openRoles: number;
}

/**
 * Filter metadata returned in search cluster responses when
 * `includeFiltersInResponse:true` is set.
 */
export interface VoyagerSearchFilter {
  filterType: string; // "FUNCTION", "WORKPLACE_TYPE", "EXPERIENCE", "DATE_POSTED"
  filterValues: VoyagerSearchFilterValue[];
}

export interface VoyagerSearchFilterValue {
  id: string;
  name: string;
  /** Number of results matching this filter value */
  resultCount: number;
  isSelected: boolean;
}

// ─── 7. Growth Rate Signals from Headcount Data ──────────────────────
//
// Derived from endpoint #4 (Company Insights Cards).
// The headcount growth timeseries allows computing:
//   - Month-over-month growth rate
//   - 6-month / 12-month / 24-month growth rates
//   - Acceleration (second derivative: is growth speeding up or slowing?)
//   - Department-level growth (Engineering vs Sales vs Marketing)
//   - Seasonal hiring patterns
//
// Growth thresholds for ICP scoring:
//   Hypergrowth:  > 25% YoY headcount growth
//   Fast growth:  15-25% YoY
//   Steady:       5-15% YoY
//   Stagnant:     0-5% YoY
//   Contracting:  < 0% YoY

export interface CompanyGrowthSignals {
  companyId: string;
  companyName: string;

  /** Current total employee count */
  currentHeadcount: number;

  /** YoY headcount growth rate (fractional) */
  yearOverYearGrowth: number | null;

  /** 6-month growth rate (fractional) */
  sixMonthGrowth: number | null;

  /** Whether growth is accelerating or decelerating */
  growthAcceleration: "accelerating" | "decelerating" | "stable" | "unknown";

  /** Derived growth tier */
  growthTier: "hypergrowth" | "fast" | "steady" | "stagnant" | "contracting";

  /** Per-department growth (from function growth card) */
  departmentGrowth: VoyagerFunctionGrowthEntry[];

  /** Raw timeseries for custom analysis */
  headcountTimeSeries: VoyagerHeadcountGrowthPoint[];

  /** Hiring velocity: open roles / total headcount */
  hiringVelocity: number | null;
}

// ─── 8. Total Job Count Extraction ───────────────────────────────────
//
// Summary of all methods to get total job count for a company:
//
// A. Voyager Job Search (most accurate, works for filtered counts too):
//    Request: GET voyagerJobsDashJobCards with count=1
//    Extract: response.paging.total OR response.data.paging.total
//    Latency: ~200ms
//    Auth: Requires active LinkedIn session
//
// B. Company page DOM scraping (fallback):
//    Navigate to: linkedin.com/jobs/search/?f_C={numericId}
//    Extract: ".jobs-search-results-list__subtitle" text
//    Parse: /([\d,]+)\s+results?/i
//    Latency: 3-8s (requires page load + render)
//
// C. Public jobs page (no auth needed, limited data):
//    GET https://www.linkedin.com/jobs/search/?f_C={numericId}&position=1&pageNum=0
//    Parse HTML for "X,XXX results" text
//    Note: Only shows ~1000 results max; may redirect to login for exact counts
//
// D. Company page badge:
//    On linkedin.com/company/{slug}/, the "Jobs" tab badge shows count
//    DOM: "a[href*='/jobs/'] .artdeco-pill" or "a.ember-view[href*='/jobs/'] span"
//    Less reliable — sometimes shows "N+ jobs" (approximate)

/** Result of extracting job counts for a company */
export interface CompanyJobCounts {
  companyId: string;
  companyName: string;

  /** Total job postings (all types) */
  totalJobs: number;

  /** Remote-only jobs (workplaceType=2) */
  remoteJobs: number;

  /** Hybrid jobs (workplaceType=3) */
  hybridJobs: number;

  /** On-site jobs (workplaceType=1) */
  onsiteJobs: number;

  /** Method used to extract counts */
  method: "voyager" | "dom-scrape" | "public-page" | "company-badge";

  /** Timestamp of extraction */
  extractedAt: number;
}

// ─── 9. Organization URN Resolution & Company ID Lookups ─────────────
//
// Problem: LinkedIn uses both URL slugs ("universal names" like "google")
// and numeric IDs (e.g., 1441). Voyager endpoints need numeric IDs.
//
// Method A: DOM extraction (when on company page) — 3 strategies:
//   1. data-urn attributes: [data-urn*="urn:li:fsd_company:"]
//   2. Embedded JSON in <script> tags: /"companyId"\s*:\s*(\d+)/
//   3. meta/link tags: /company[:/](\d+)/
//   (see extractCompanyData in company-browsing.ts)
//
// Method B: Voyager company lookup by universalName
//   GET /voyager/api/voyagerOrganizationDashCompanies
//   decorationId: "com.linkedin.voyager.dash.deco.organization.MiniCompany-10"
//   q: "universalName"
//   universalName: "{slug}"
//   → Response entityUrn contains numeric ID
//
// Method C: Voyager typeahead / autocomplete
//   GET /voyager/api/voyagerSearchDashTypeahead
//   decorationId: "com.linkedin.voyager.dash.deco.search.TypeaheadCollection-44"
//   q: "type"
//   query: "(typeaheadType:COMPANY,query:{companyName})"
//   → Returns list of matching companies with URNs
//
// Method D: Organization API (older, sometimes more reliable)
//   GET /voyager/api/organization/companies
//   decorationId: "com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-64"
//   q: "universalName"
//   universalName: "{slug}"

export interface VoyagerCompanyLookupByNameParams {
  decorationId: "com.linkedin.voyager.dash.deco.organization.MiniCompany-10";
  q: "universalName";
  universalName: string;
}

export interface VoyagerTypeaheadParams {
  decorationId: "com.linkedin.voyager.dash.deco.search.TypeaheadCollection-44";
  q: "type";
  query: string; // "(typeaheadType:COMPANY,query:{name})"
}

export interface VoyagerTypeaheadResult {
  $type: "com.linkedin.voyager.dash.search.TypeaheadHit";
  entityUrn: string;
  text: { text: string };
  subtext?: { text: string };
  /** Entity URN for the company — extract numeric ID from this */
  trackingUrn: CompanyURN;
  image?: VoyagerImage;
}

export interface VoyagerTypeaheadResponse {
  data: {
    elements: VoyagerTypeaheadResult[];
  };
  included: VoyagerIncludedEntity[];
}

/** Full company profile response (Method D) */
export interface VoyagerFullCompanyProfile {
  $type: "com.linkedin.voyager.organization.Company";
  entityUrn: CompanyURN;
  name: string;
  universalName: string;
  /** Numeric company ID (extracted from entityUrn) */
  companyId?: number;
  description?: string;
  tagline?: string;
  website?: string;
  industryName?: string;
  staffCount?: number;
  staffCountRange?: { start: number; end: number };
  specialities?: string[];
  headquarter?: {
    country: string;
    city: string;
    geographicArea: string;
    postalCode?: string;
    line1?: string;
    line2?: string;
  };
  confirmedLocations?: Array<{
    country: string;
    city: string;
    geographicArea: string;
    description?: string;
    localizedDescription?: string;
    headquarter: boolean;
  }>;
  foundedOn?: { year: number };
  companyType?: {
    localizedName: string; // "Privately Held", "Public Company", etc.
    code: string;
  };
  /** Phone number on file */
  phone?: string;
  /** Stock exchange info for public companies */
  stockExchange?: string;
  /** Parent/subsidiary relationships */
  affiliatedCompanies?: Array<{
    company: CompanyURN;
    relationship: "PARENT" | "SUBSIDIARY" | "SISTER";
  }>;
  /** Showcase pages */
  showcasePages?: CompanyURN[];
  /** Company groups */
  groups?: string[];
  /** Auto-generated company pages LinkedIn links this company to */
  autoGenerated?: boolean;
  /** Premium features available */
  premiumCompanyPage?: boolean;
  /** Follower count */
  followingInfo?: {
    followerCount: number;
    following: boolean;
  };
  logo?: VoyagerImage;
  backgroundCoverImage?: VoyagerImage;
}

// ─── Utility Functions ───────────────────────────────────────────────

/**
 * Extract numeric company ID from a LinkedIn URN.
 *
 * @example
 * extractNumericId("urn:li:fsd_company:12345") // "12345"
 * extractNumericId("urn:li:company:67890")     // "67890"
 */
export function extractNumericId(urn: string): string | null {
  const match = urn.match(/urn:li:(?:fsd_)?company:(\d+)/);
  return match ? match[1] : null;
}

/**
 * Build the Voyager job search query string for a company.
 *
 * @param numericId - LinkedIn numeric company ID
 * @param workplaceType - 1=On-site, 2=Remote, 3=Hybrid, undefined=All
 * @param geoId - Geographic filter (default: 92000000 = Worldwide)
 */
export function buildJobSearchQuery(
  numericId: string,
  workplaceType?: 1 | 2 | 3,
  geoId = "92000000",
): { query: string; locationUnion: string } {
  const filters: string[] = [`company:List(${numericId})`];
  if (workplaceType) {
    filters.push(`workplaceType:List(${workplaceType})`);
  }
  return {
    query: `(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(${filters.join(",")}),spellCorrectionEnabled:true)`,
    locationUnion: `(geoId:${geoId})`,
  };
}

/**
 * Build Voyager job search URL for a company.
 * Use count=1 for just getting the total count.
 */
export function buildJobSearchUrl(
  numericId: string,
  options: {
    workplaceType?: 1 | 2 | 3;
    geoId?: string;
    count?: number;
    start?: number;
    functionId?: number;
  } = {},
): string {
  const { workplaceType, geoId = "92000000", count = 1, start = 0, functionId } = options;

  const filters: string[] = [`company:List(${numericId})`];
  if (workplaceType) filters.push(`workplaceType:List(${workplaceType})`);
  if (functionId) filters.push(`function:List(${functionId})`);

  const url = new URL("https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards");
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227",
  );
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));
  url.searchParams.set("q", "jobSearch");
  url.searchParams.set(
    "query",
    `(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(${filters.join(",")}),spellCorrectionEnabled:true)`,
  );
  url.searchParams.set("locationUnion", `(geoId:${geoId})`);

  return url.toString();
}

/**
 * Build URL for company insights cards (headcount, growth, etc.).
 */
export function buildInsightsUrl(numericId: string): string {
  const url = new URL(
    "https://www.linkedin.com/voyager/api/voyagerOrganizationDashCompanyInsightsCards",
  );
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.organization.CompanyInsightsCardCollection-86",
  );
  url.searchParams.set("q", "companyInsights");
  url.searchParams.set("query", `(companyId:${numericId})`);
  return url.toString();
}

/**
 * Build URL for employee search (recent hires).
 */
export function buildEmployeeSearchUrl(
  numericId: string,
  options: { sortBy?: "DATE_STARTED" | "RELEVANCE"; count?: number; start?: number } = {},
): string {
  const { sortBy = "DATE_STARTED", count = 10, start = 0 } = options;
  const url = new URL(
    "https://www.linkedin.com/voyager/api/voyagerOrganizationDashEmployees",
  );
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.organization.EmployeeCardCollection-32",
  );
  url.searchParams.set("q", "search");
  url.searchParams.set("query", `(companyId:${numericId},sortBy:${sortBy})`);
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));
  return url.toString();
}

/**
 * Build URL for company lookup by URL slug.
 */
export function buildCompanyLookupUrl(universalName: string): string {
  const url = new URL(
    "https://www.linkedin.com/voyager/api/voyagerOrganizationDashCompanies",
  );
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.organization.MiniCompany-10",
  );
  url.searchParams.set("q", "universalName");
  url.searchParams.set("universalName", universalName);
  return url.toString();
}

/**
 * Build URL for company typeahead search.
 */
export function buildTypeaheadUrl(companyName: string): string {
  const url = new URL(
    "https://www.linkedin.com/voyager/api/voyagerSearchDashTypeahead",
  );
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.search.TypeaheadCollection-44",
  );
  url.searchParams.set("q", "type");
  url.searchParams.set("query", `(typeaheadType:COMPANY,query:${companyName})`);
  return url.toString();
}

/**
 * Build URL for search clusters (unified search with company filter).
 */
export function buildSearchClustersUrl(
  numericId: string,
  options: {
    resultType?: "JOBS" | "PEOPLE" | "CONTENT";
    pastTimeRange?: "Past_24_hours" | "Past_week" | "Past_month" | "Past_3_months" | "Past_year";
    count?: number;
    start?: number;
  } = {},
): string {
  const { resultType = "JOBS", pastTimeRange, count = 10, start = 0 } = options;

  const queryParams: string[] = [
    "flagshipSearchIntent:SEARCH_SRP",
  ];

  if (resultType === "PEOPLE" && pastTimeRange) {
    // Recent hires query
    queryParams.push(
      `queryParameters:(currentCompany:List(${numericId}),pastTimeRange:List(${pastTimeRange}),resultType:List(PEOPLE))`,
    );
  } else {
    queryParams.push(
      `queryParameters:(companyHireTargetId:List(${numericId}),resultType:List(${resultType}))`,
    );
  }

  queryParams.push("includeFiltersInResponse:true");

  const url = new URL("https://www.linkedin.com/voyager/api/search/dash/clusters");
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.search.SearchClusterCollection-191",
  );
  url.searchParams.set("q", "all");
  url.searchParams.set("query", `(${queryParams.join(",")})`);
  url.searchParams.set("count", String(count));
  url.searchParams.set("start", String(start));

  return url.toString();
}

/**
 * Extract total job count from a Voyager response.
 * Handles both normalized and direct response shapes.
 */
export function extractTotalCount(response: unknown): number {
  if (!response || typeof response !== "object") return 0;

  const r = response as Record<string, unknown>;

  // Shape 1: response.paging.total
  if (r.paging && typeof r.paging === "object") {
    const paging = r.paging as Record<string, unknown>;
    if (typeof paging.total === "number") return paging.total;
  }

  // Shape 2: response.data.paging.total
  if (r.data && typeof r.data === "object") {
    const data = r.data as Record<string, unknown>;
    if (data.paging && typeof data.paging === "object") {
      const paging = data.paging as Record<string, unknown>;
      if (typeof paging.total === "number") return paging.total;
    }
  }

  // Shape 3: response.data.metadata.totalResultCount (search clusters)
  if (r.data && typeof r.data === "object") {
    const data = r.data as Record<string, unknown>;
    if (data.metadata && typeof data.metadata === "object") {
      const meta = data.metadata as Record<string, unknown>;
      if (typeof meta.totalResultCount === "number") return meta.totalResultCount;
    }
  }

  return 0;
}

/**
 * Compute growth tier from YoY growth rate.
 */
export function computeGrowthTier(
  yoyGrowth: number,
): CompanyGrowthSignals["growthTier"] {
  if (yoyGrowth > 0.25) return "hypergrowth";
  if (yoyGrowth > 0.15) return "fast";
  if (yoyGrowth > 0.05) return "steady";
  if (yoyGrowth >= 0) return "stagnant";
  return "contracting";
}

/**
 * Compute growth acceleration from a headcount timeseries.
 * Compares recent 3-month growth rate to prior 3-month growth rate.
 */
export function computeGrowthAcceleration(
  timeSeries: VoyagerHeadcountGrowthPoint[],
): CompanyGrowthSignals["growthAcceleration"] {
  if (timeSeries.length < 7) return "unknown";

  // Sort by date ascending
  const sorted = [...timeSeries].sort((a, b) => {
    const da = a.date.year * 12 + a.date.month;
    const db = b.date.year * 12 + b.date.month;
    return da - db;
  });

  const len = sorted.length;
  const recentStart = sorted[len - 4]?.headcount;
  const recentEnd = sorted[len - 1]?.headcount;
  const priorStart = sorted[len - 7]?.headcount;
  const priorEnd = sorted[len - 4]?.headcount;

  if (!recentStart || !recentEnd || !priorStart || !priorEnd) return "unknown";
  if (recentStart === 0 || priorStart === 0) return "unknown";

  const recentGrowth = (recentEnd - recentStart) / recentStart;
  const priorGrowth = (priorEnd - priorStart) / priorStart;

  const diff = recentGrowth - priorGrowth;
  if (diff > 0.02) return "accelerating";
  if (diff < -0.02) return "decelerating";
  return "stable";
}

/**
 * Build department job counts by issuing parallel count=1 requests.
 *
 * @example
 * const departments = [
 *   { functionId: 8, functionName: "Engineering" },
 *   { functionId: 13, functionName: "Information Technology" },
 *   { functionId: 19, functionName: "Product Management" },
 *   { functionId: 25, functionName: "Sales" },
 * ];
 * // For each, call buildJobSearchUrl(numericId, { functionId: d.functionId })
 * // then fetch and extractTotalCount to get openRoles per department.
 */
export const LINKEDIN_FUNCTIONS: Array<{ id: number; name: string }> = [
  { id: 1, name: "Accounting" },
  { id: 2, name: "Administrative" },
  { id: 3, name: "Arts and Design" },
  { id: 4, name: "Business Development" },
  { id: 5, name: "Community and Social Services" },
  { id: 6, name: "Consulting" },
  { id: 7, name: "Education" },
  { id: 8, name: "Engineering" },
  { id: 9, name: "Entrepreneurship" },
  { id: 10, name: "Finance" },
  { id: 11, name: "Healthcare Services" },
  { id: 12, name: "Human Resources" },
  { id: 13, name: "Information Technology" },
  { id: 14, name: "Legal" },
  { id: 15, name: "Marketing" },
  { id: 16, name: "Media and Communication" },
  { id: 17, name: "Military and Protective Services" },
  { id: 18, name: "Operations" },
  { id: 19, name: "Product Management" },
  { id: 20, name: "Program and Project Management" },
  { id: 21, name: "Purchasing" },
  { id: 22, name: "Quality Assurance" },
  { id: 23, name: "Real Estate" },
  { id: 24, name: "Research" },
  { id: 25, name: "Sales" },
  { id: 26, name: "Support" },
];

/**
 * Standard headers for all Voyager API requests.
 * CSRF token must be obtained from the JSESSIONID cookie.
 */
export function buildVoyagerHeaders(csrfToken: string): Record<string, string> {
  return {
    "csrf-token": csrfToken,
    "x-restli-protocol-version": "2.0.0",
    Accept: "application/vnd.linkedin.normalized+json+2.1",
  };
}

/**
 * Fetch options template for Voyager requests.
 * Must be used with `credentials: "include"` to send cookies.
 */
export function buildVoyagerFetchInit(csrfToken: string): RequestInit {
  return {
    method: "GET",
    headers: buildVoyagerHeaders(csrfToken),
    credentials: "include",
  };
}
