/**
 * LinkedIn Voyager API — Job Metadata Types
 *
 * TypeScript interfaces for LinkedIn's internal Voyager REST API endpoints
 * covering skills, salary, benefits, classification, and seniority data
 * from job postings. These types model the JSON shapes returned by Voyager
 * and provide mapping functions to the codebase's internal skill taxonomy.
 *
 * Voyager endpoints are accessed via the Chrome extension using the
 * authenticated session (JSESSIONID CSRF token + x-restli-protocol-version: 2.0.0).
 *
 * Related codebase files:
 *   - src/schema/contracts/skill-taxonomy.ts  — canonical SKILL_TAXONOMY + ESCO_SKILL_MAP
 *   - src/lib/skills/taxonomy.ts              — re-exports + utility functions
 *   - src/lib/skills/schema.ts                — Zod schemas for JobSkill
 *   - chrome-extension/src/services/connection-scraper.ts — Voyager connections API pattern
 *   - chrome-extension/src/pages/background/company-browsing.ts — Voyager jobs search API
 *   - crates/metal/src/kernel/esco.rs         — Rust ESCO bridge (157 internal tags)
 *   - crates/metal/src/kernel/techwolf.rs     — TechWolf eval harness
 */

// ─── Voyager Common ────────────────────────────────────────────────────────────

/**
 * LinkedIn URN format for entities. Voyager uses these as primary identifiers.
 * Format: "urn:li:{entity_type}:{numeric_id}"
 *
 * Examples:
 *   "urn:li:skill:1234"
 *   "urn:li:fsd_skill:5678"
 *   "urn:li:jobPosting:3900000000"
 *   "urn:li:fsd_company:12345"
 */
export type LinkedInUrn = `urn:li:${string}:${string}`;

/**
 * Paging metadata present in all paginated Voyager responses.
 * Used by /voyagerJobsDashJobCards, /relationships/dash/connections, etc.
 */
export interface VoyagerPaging {
  /** Number of items returned in this page. */
  count: number;
  /** Offset of this page from the beginning. */
  start: number;
  /** Total number of items available. */
  total: number;
  /** Links for cursor-based pagination (some endpoints). */
  links?: Array<{ rel: string; href: string }>;
}

// ─── Skills ────────────────────────────────────────────────────────────────────

/**
 * A skill entity as returned by Voyager job detail endpoints.
 *
 * Voyager endpoints that include skills:
 *   - /voyager/api/jobs/jobPostings/{jobPostingId} (decoration includes skill list)
 *   - /voyager/api/voyagerJobsDashJobCards (skill match data in decorated cards)
 *   - /voyager/api/graphql?queryId=voyagerJobsDashJobDetailSkills (job detail skills section)
 *
 * The $type field is "com.linkedin.voyager.dash.jobs.JobPostingSkill" or similar.
 */
export interface VoyagerSkill {
  /** LinkedIn URN for this skill. Format: "urn:li:fsd_skill:{id}" or "urn:li:skill:{id}". */
  entityUrn: LinkedInUrn;

  /** Numeric skill ID extracted from the URN. LinkedIn maintains ~35,000 skill IDs. */
  skillId: number;

  /** Human-readable skill name as displayed on LinkedIn. */
  name: string;

  /**
   * Match percentage (0-100) showing how well the viewer's profile matches
   * this required skill. Only populated in authenticated job views.
   * Absent when the user has no profile data for this skill.
   */
  skillMatchPercentage?: number;

  /**
   * Whether this skill is explicitly listed vs. inferred from the job description.
   * "EXPLICIT" = listed in the job posting skills section.
   * "INFERRED" = derived by LinkedIn's ML from job description text.
   */
  skillSource: "EXPLICIT" | "INFERRED";

  /**
   * Voyager $type discriminator. Varies across API versions:
   *   "com.linkedin.voyager.dash.jobs.JobPostingSkill"
   *   "com.linkedin.voyager.jobs.JobPostingSkill"
   */
  $type?: string;
}

/**
 * Skill assessment data returned alongside skill match features.
 * LinkedIn surfaces "How you match" assessments when viewing a job.
 *
 * Endpoint: /voyager/api/voyagerJobsDashJobDetailSkillMatch
 *   ?decorationId=com.linkedin.voyager.dash.deco.jobs.FullJobDetailSkillMatch-*
 *   &jobPostingUrn=urn:li:fsd_jobPosting:{id}
 */
export interface VoyagerSkillAssessment {
  /** The skill being assessed. */
  skill: VoyagerSkill;

  /**
   * Whether the viewer has this skill on their profile.
   * "MATCH" = skill present on profile.
   * "MISSING" = skill not on profile.
   * "PARTIAL" = related skill present.
   */
  matchStatus: "MATCH" | "MISSING" | "PARTIAL";

  /** Source of the match (profile skill, endorsement, assessment badge, etc.). */
  matchSource?: "PROFILE_SKILL" | "ENDORSEMENT" | "ASSESSMENT" | "EXPERIENCE" | "EDUCATION";

  /** Number of endorsements the viewer has for this skill. */
  endorsementCount?: number;

  /** Whether the viewer passed LinkedIn's skill assessment for this skill. */
  hasAssessmentBadge?: boolean;
}

/**
 * Full skill match response for a job posting.
 */
export interface VoyagerSkillMatchResponse {
  /** Skills required by the job with match status. */
  skillAssessments: VoyagerSkillAssessment[];

  /** Overall match percentage across all required skills. */
  overallMatchPercentage: number;

  /** Count of matched vs total skills. */
  matchedSkillCount: number;
  totalSkillCount: number;

  /** Paging (typically all skills fit in one page). */
  paging: VoyagerPaging;
}

// ─── Salary ────────────────────────────────────────────────────────────────────

/**
 * Salary insights from the dedicated salary endpoint.
 *
 * Endpoint: /voyager/api/voyagerJobsDashSalaryInsights
 *   ?decorationId=com.linkedin.voyager.dash.deco.jobs.SalaryInsightsCard-*
 *   &jobPostingUrn=urn:li:fsd_jobPosting:{id}
 *
 * Also partially embedded in job card decorations via:
 *   /voyager/api/voyagerJobsDashJobCards (when decoration includes salary fields)
 */
export interface VoyagerSalary {
  /**
   * Pre-formatted salary string as shown in the LinkedIn UI.
   * Examples: "$120K - $180K/yr", "€80K - €100K/yr", "£500 - £700/day"
   * May be null if the employer didn't provide salary data.
   */
  formattedSalary: string | null;

  /**
   * Structured salary range, present when LinkedIn has parsed or estimated the range.
   */
  salaryRange?: {
    /** Minimum salary in the range (annual or hourly depending on payPeriod). */
    min: number;
    /** Maximum salary in the range. */
    max: number;
    /** Median salary (LinkedIn's estimate based on similar roles). */
    median?: number;
    /** ISO 4217 currency code: "USD", "EUR", "GBP", etc. */
    currencyCode: string;
    /** Pay period: "YEARLY", "MONTHLY", "HOURLY", "DAILY". */
    payPeriod: "YEARLY" | "MONTHLY" | "HOURLY" | "DAILY";
  };

  /**
   * LinkedIn's salary insights — aggregated from user-reported data.
   * Shown as "Salary insights" card on job detail pages.
   */
  salaryInsights?: {
    /** Median base salary for this title + location. */
    medianBaseSalary: number;
    /** Salary range (10th to 90th percentile). */
    salaryP10: number;
    salaryP25: number;
    salaryP50: number;
    salaryP75: number;
    salaryP90: number;
    /** Currency code. */
    currencyCode: string;
    /** Number of data points used. */
    sampleSize: number;
    /** Pay period for the insight data. */
    payPeriod: "YEARLY" | "MONTHLY" | "HOURLY";
    /** Title used for the salary lookup. */
    titleForInsights: string;
    /** Location used for the salary lookup. */
    locationForInsights: string;
  };

  /**
   * Compensation type breakdown (base, bonus, equity, etc.).
   * Present in detailed salary insight responses.
   */
  compensationBreakdown?: Array<{
    type: "BASE_SALARY" | "BONUS" | "EQUITY" | "COMMISSION" | "TIPS" | "OTHER";
    min: number;
    max: number;
    median: number;
    currencyCode: string;
    payPeriod: "YEARLY" | "MONTHLY" | "HOURLY";
  }>;

  /** Voyager $type discriminator. */
  $type?: string;
}

// ─── Benefits ──────────────────────────────────────────────────────────────────

/**
 * Benefits enumeration from job detail responses.
 *
 * LinkedIn standardizes benefits into a fixed set of benefit types.
 * These appear in the "Benefits" section of job detail pages and are
 * embedded in the job posting decoration.
 *
 * Endpoint: embedded in /voyager/api/jobs/jobPostings/{id}
 *   with decoration com.linkedin.voyager.dash.deco.jobs.FullJobPosting-*
 */
export interface VoyagerBenefits {
  /** Array of standardized benefit entries. */
  benefits: VoyagerBenefitEntry[];

  /** Free-text benefits description provided by the employer (HTML or plain text). */
  benefitsDescription?: string;

  /** Voyager $type discriminator. */
  $type?: string;
}

/**
 * Individual benefit entry. LinkedIn normalizes employer-provided benefits
 * into a standard enumeration.
 */
export interface VoyagerBenefitEntry {
  /**
   * LinkedIn's standardized benefit type code.
   *
   * Known values (non-exhaustive, LinkedIn adds new ones periodically):
   *   MEDICAL_INSURANCE, DENTAL_INSURANCE, VISION_INSURANCE,
   *   PENSION_PLAN, 401K, PAID_TIME_OFF, SICK_LEAVE,
   *   PARENTAL_LEAVE, MATERNITY_LEAVE, PATERNITY_LEAVE,
   *   TUITION_ASSISTANCE, STUDENT_LOAN_ASSISTANCE,
   *   DISABILITY_INSURANCE, LIFE_INSURANCE,
   *   COMMUTER_BENEFITS, RELOCATION_ASSISTANCE,
   *   STOCK_OPTIONS, EQUITY, PERFORMANCE_BONUS,
   *   REMOTE_WORK, FLEXIBLE_SCHEDULE,
   *   PROFESSIONAL_DEVELOPMENT, GYM_MEMBERSHIP,
   *   CHILDCARE, FOOD_PROVIDED, WELLNESS_PROGRAMS,
   *   EMPLOYEE_DISCOUNT, REFERRAL_BONUS
   */
  type: string;

  /** Human-readable label for the benefit. */
  label: string;

  /** Optional employer-provided description for this benefit. */
  description?: string;
}

// ─── Job Classification ────────────────────────────────────────────────────────

/**
 * Seniority level mapping used by LinkedIn Voyager.
 * Maps numeric codes to human-readable levels.
 *
 * These appear in job postings as `seniorityLevel` or `experienceLevel` fields
 * in the Voyager response, and correspond to the dropdown options when
 * employers create job postings on LinkedIn.
 */
export enum VoyagerSeniorityLevel {
  INTERNSHIP = 1,
  ENTRY_LEVEL = 2,
  ASSOCIATE = 3,
  MID_SENIOR_LEVEL = 4,
  DIRECTOR = 5,
  EXECUTIVE = 6,
}

/** Reverse mapping: numeric code to display string. */
export const SENIORITY_LEVEL_LABELS: Record<VoyagerSeniorityLevel, string> = {
  [VoyagerSeniorityLevel.INTERNSHIP]: "Internship",
  [VoyagerSeniorityLevel.ENTRY_LEVEL]: "Entry level",
  [VoyagerSeniorityLevel.ASSOCIATE]: "Associate",
  [VoyagerSeniorityLevel.MID_SENIOR_LEVEL]: "Mid-Senior level",
  [VoyagerSeniorityLevel.DIRECTOR]: "Director",
  [VoyagerSeniorityLevel.EXECUTIVE]: "Executive",
};

/**
 * Employment type mapping used by LinkedIn Voyager.
 *
 * These correspond to the `employmentStatus` or `employmentType` field
 * in job posting Voyager responses.
 */
export enum VoyagerEmploymentType {
  FULL_TIME = "F",
  PART_TIME = "P",
  CONTRACT = "C",
  TEMPORARY = "T",
  INTERNSHIP = "I",
  VOLUNTEER = "V",
  OTHER = "O",
}

/** Reverse mapping: code to display string. */
export const EMPLOYMENT_TYPE_LABELS: Record<VoyagerEmploymentType, string> = {
  [VoyagerEmploymentType.FULL_TIME]: "Full-time",
  [VoyagerEmploymentType.PART_TIME]: "Part-time",
  [VoyagerEmploymentType.CONTRACT]: "Contract",
  [VoyagerEmploymentType.TEMPORARY]: "Temporary",
  [VoyagerEmploymentType.INTERNSHIP]: "Internship",
  [VoyagerEmploymentType.VOLUNTEER]: "Volunteer",
  [VoyagerEmploymentType.OTHER]: "Other",
};

/**
 * Job function codes used by LinkedIn.
 * These are LinkedIn's internal function classification codes,
 * distinct from ISCO/SOC occupation codes.
 *
 * Appears in Voyager responses as `jobFunctions` array with these codes.
 */
export const VOYAGER_JOB_FUNCTIONS: Record<string, string> = {
  it: "Information Technology",
  eng: "Engineering",
  design: "Design",
  mrkt: "Marketing",
  sale: "Sales",
  hr: "Human Resources",
  fin: "Finance",
  acct: "Accounting",
  opr: "Operations",
  prod: "Product Management",
  qa: "Quality Assurance",
  pr: "Public Relations",
  legal: "Legal",
  admin: "Administrative",
  bd: "Business Development",
  cs: "Customer Service",
  dist: "Distribution",
  edu: "Education",
  hc: "Healthcare Services",
  consulting: "Consulting",
  research: "Research",
  writing: "Writing/Editing",
  art: "Arts and Design",
  media: "Media and Communication",
  rsk: "Risk Management",
  strat: "Strategy/Planning",
  data: "Data Science",
  ai: "Artificial Intelligence",
};

/**
 * Industry classification codes used by LinkedIn.
 * LinkedIn uses its own industry taxonomy (~150 industries) which maps
 * loosely to NAICS/SIC codes but is not a 1:1 match.
 *
 * Appears in Voyager responses as `industries` array with numeric IDs.
 * Selected representative codes shown here.
 */
export const VOYAGER_INDUSTRY_CODES: Record<number, string> = {
  4: "Computer Software",
  6: "Computer Networking",
  14: "Semiconductors",
  43: "Financial Services",
  47: "Accounting",
  69: "Hospital & Health Care",
  80: "Education Management",
  96: "Information Technology and Services",
  104: "Internet",
  116: "Management Consulting",
  137: "Telecommunications",
  150: "Automotive",
  1594: "Artificial Intelligence",
};

// ─── Full Job Posting (Voyager Response) ───────────────────────────────────────

/**
 * Shape of a Voyager job posting detail response.
 * Aggregates skills, salary, benefits, and classification data.
 *
 * Endpoint: /voyager/api/jobs/jobPostings/{jobPostingId}
 *   with decoration com.linkedin.voyager.dash.deco.jobs.FullJobPosting-*
 *
 * Also: /voyager/api/voyagerJobsDashJobCards with full decoration
 */
export interface VoyagerJobPosting {
  /** Job posting URN: "urn:li:fsd_jobPosting:{id}" */
  entityUrn: LinkedInUrn;

  /** Numeric job posting ID. */
  jobPostingId: number;

  /** Job title. */
  title: string;

  /** Company that posted the job. */
  companyName: string;
  companyUrn?: LinkedInUrn;

  /** Job description (HTML or plain text). */
  description: string;

  /** Location string as displayed. */
  formattedLocation: string;

  /** Skills required/preferred for this job. */
  skills: VoyagerSkill[];

  /** Salary data (may be partially populated). */
  salary: VoyagerSalary;

  /** Benefits offered. */
  benefits: VoyagerBenefits;

  /** Seniority level code (1-6). */
  seniorityLevel: VoyagerSeniorityLevel;

  /** Employment type code. */
  employmentType: VoyagerEmploymentType;

  /** Job function codes. */
  jobFunctions: string[];

  /** Industry codes for the posting company. */
  industries: number[];

  /**
   * Workplace type for remote/hybrid filtering.
   * 1 = On-site, 2 = Remote, 3 = Hybrid.
   * Used in the existing Voyager job search: `workplaceType:List(2)` for remote.
   */
  workplaceType: 1 | 2 | 3;

  /** When the job was posted (ISO 8601). */
  listedAt: string;

  /** When the job expires (ISO 8601), if set. */
  expireAt?: string;

  /** Number of applicants shown on LinkedIn. */
  applicantCount?: number;

  /** Job posting URL on LinkedIn. */
  jobPostingUrl: string;

  /** Apply URL (external ATS or LinkedIn Easy Apply). */
  applyUrl?: string;

  /** Whether LinkedIn Easy Apply is enabled. */
  easyApplyEnabled: boolean;
}

// ─── Voyager Skill ID → Internal Taxonomy Mapping ──────────────────────────────

/**
 * Mapping from known LinkedIn skill IDs to internal taxonomy tags.
 *
 * LinkedIn maintains ~35,000 skill entities. This maps the most common
 * tech skills to the codebase's SKILL_TAXONOMY tags (157 entries in
 * src/schema/contracts/skill-taxonomy.ts).
 *
 * These IDs are extracted from Voyager skill URNs:
 *   "urn:li:fsd_skill:355" → skillId 355 → "python"
 *
 * The IDs were collected by observing Voyager responses for tech job
 * postings. LinkedIn occasionally reassigns IDs, so this should be
 * treated as a best-effort mapping with fuzzy name fallback.
 */
export const VOYAGER_SKILL_ID_TO_TAG: Record<number, string> = {
  // Programming Languages
  355: "python",
  320: "javascript",
  1009: "typescript",
  24: "java",
  47: "csharp",
  106: "ruby",
  163: "php",
  3676: "go",
  1367: "rust",
  242: "swift",
  2397: "kotlin",
  238: "scala",
  3837: "elixir",

  // Frontend Frameworks
  1133: "react",
  903: "angular",
  2717: "vue",
  3835: "svelte",
  3467: "nextjs",

  // Backend Frameworks
  49: "nodejs",
  1108: "express",
  101: "django",
  1021: "flask",
  1135: "laravel",
  3580: "fastapi",
  39: "spring-boot",

  // Mobile
  1612: "react-native",
  2999: "flutter",
  174: "ios",
  176: "android",

  // Databases
  85: "postgresql",
  13: "mysql",
  307: "mongodb",
  381: "redis",
  1205: "elasticsearch",
  1200: "cassandra",
  3014: "dynamodb",
  3: "sql",

  // Cloud & DevOps
  316: "aws",
  2310: "gcp",
  1098: "azure",
  413: "docker",
  2580: "kubernetes",
  3112: "terraform",
  407: "ansible",
  66: "jenkins",
  348: "ci-cd",
  3098: "serverless",

  // Architecture
  3023: "microservices",
  1178: "rest-api",
  3113: "graphql",
  3212: "grpc",

  // Tools
  41: "git",
  40: "linux",
  56: "agile",

  // Data Science & ML
  97: "machine-learning",
  2572: "deep-learning",
  375: "tensorflow",
  3468: "pytorch",
  1094: "pandas",
  1095: "numpy",
  1208: "scikit",
  155: "nlp",
  1810: "computer-vision",

  // AI / LLM / GenAI
  3895: "llm",
  3905: "rag",
  3890: "prompt-engineering",
  3908: "fine-tuning",
  3600: "embeddings",
  3464: "transformers",
  3910: "agents",
  3463: "langchain",
  3909: "langgraph",
  3096: "openai",
  3911: "anthropic",
  2381: "mlops",
  3462: "huggingface",

  // Frontend (extended)
  3840: "shadcn-ui",
  2683: "storybook",
  3578: "playwright",
  1153: "cypress",
  3838: "vitest",
  3579: "zustand",
  1147: "apollo-client",
  3581: "remix",
  3836: "astro",

  // Backend (extended)
  3834: "drizzle-orm",
  3466: "prisma",
  3582: "trpc",
  3833: "hono",
  3465: "bun",
  3099: "deno",
};

/**
 * Reverse mapping: internal tag → known LinkedIn skill IDs.
 * Built at module initialization.
 */
export const TAG_TO_VOYAGER_SKILL_ID: Record<string, number> = Object.fromEntries(
  Object.entries(VOYAGER_SKILL_ID_TO_TAG).map(([id, tag]) => [tag, Number(id)])
);

// ─── Mapping Functions ─────────────────────────────────────────────────────────

import { SKILL_TAXONOMY, ESCO_SKILL_MAP, ESCO_LABEL_TO_TAG } from "./skill-taxonomy";

/**
 * Map a Voyager skill to the internal taxonomy tag.
 *
 * Strategy (in priority order):
 *   1. Direct ID lookup in VOYAGER_SKILL_ID_TO_TAG
 *   2. Exact name match (case-insensitive) against SKILL_TAXONOMY labels
 *   3. ESCO label match via ESCO_LABEL_TO_TAG
 *   4. Fuzzy name match (normalized, removing common suffixes)
 *
 * Returns null if no match found — the skill is outside our 157-tag taxonomy.
 */
export function voyagerSkillToTag(skill: VoyagerSkill): string | null {
  // Strategy 1: Direct ID lookup
  const directTag = VOYAGER_SKILL_ID_TO_TAG[skill.skillId];
  if (directTag) return directTag;

  const nameLower = skill.name.toLowerCase().trim();

  // Strategy 2: Exact match against taxonomy labels
  for (const [tag, label] of Object.entries(SKILL_TAXONOMY)) {
    if (label.toLowerCase() === nameLower) return tag;
  }

  // Strategy 3: ESCO label match
  const escoTag = ESCO_LABEL_TO_TAG[nameLower];
  if (escoTag) return escoTag;

  // Strategy 4: Fuzzy normalization
  const normalized = nameLower
    .replace(/\s*\(.*?\)\s*/g, "")           // strip parentheticals: "Python (computer programming)" → "python"
    .replace(/\.js$/i, "")                     // "react.js" → "react"
    .replace(/\s+/g, "-")                      // spaces → hyphens
    .replace(/[^a-z0-9-]/g, "");               // strip special chars

  // Check if normalized matches a tag directly
  if (SKILL_TAXONOMY[normalized]) return normalized;

  // Check common aliases
  const ALIASES: Record<string, string> = {
    "amazon-web-services": "aws",
    "google-cloud-platform": "gcp",
    "google-cloud": "gcp",
    "microsoft-azure": "azure",
    "c-sharp": "csharp",
    "c#": "csharp",
    "node": "nodejs",
    "node-js": "nodejs",
    "react-js": "react",
    "reactjs": "react",
    "vue-js": "vue",
    "vuejs": "vue",
    "angular-js": "angular",
    "angularjs": "angular",
    "next-js": "nextjs",
    "postgresql-database": "postgresql",
    "postgres": "postgresql",
    "mongo-db": "mongodb",
    "elastic-search": "elasticsearch",
    "scikit-learn": "scikit",
    "sklearn": "scikit",
    "natural-language-processing": "nlp",
    "large-language-models": "llm",
    "retrieval-augmented-generation": "rag",
    "generative-ai": "llm",
    "gen-ai": "llm",
    "artificial-intelligence": "machine-learning",
    "ai": "machine-learning",
    "ci-cd-pipelines": "ci-cd",
    "continuous-integration": "ci-cd",
    "test-driven-development": "tdd",
    "tailwindcss": "tailwind",
    "tailwind-css": "tailwind",
  };

  if (ALIASES[normalized]) return ALIASES[normalized];

  return null;
}

/**
 * Map a Voyager skill to its ESCO equivalent label.
 * Uses the internal tag as an intermediate step.
 *
 * Returns null if the skill has no ESCO mapping.
 */
export function voyagerSkillToEsco(skill: VoyagerSkill): { tag: string; escoLabel: string } | null {
  const tag = voyagerSkillToTag(skill);
  if (!tag) return null;

  const esco = ESCO_SKILL_MAP[tag];
  if (!esco) return null;

  return { tag, escoLabel: esco.label };
}

/**
 * Convert a batch of Voyager skills to internal JobSkill format.
 * Compatible with the Zod schema in src/lib/skills/schema.ts.
 *
 * Skills that don't map to the internal taxonomy are dropped.
 *
 * @param voyagerSkills - Skills from a Voyager job posting response
 * @param defaultLevel  - Skill level to assign ("required" | "preferred" | "nice")
 */
export function voyagerSkillsToJobSkills(
  voyagerSkills: VoyagerSkill[],
  defaultLevel: "required" | "preferred" | "nice" = "required",
): Array<{
  tag: string;
  level: "required" | "preferred" | "nice";
  confidence: number;
  evidence: string;
  escoLabel?: string;
}> {
  const seen = new Set<string>();
  const results: Array<{
    tag: string;
    level: "required" | "preferred" | "nice";
    confidence: number;
    evidence: string;
    escoLabel?: string;
  }> = [];

  for (const skill of voyagerSkills) {
    const tag = voyagerSkillToTag(skill);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);

    // Derive confidence from source and match percentage
    let confidence = 0.8; // default for explicit skills
    if (skill.skillSource === "INFERRED") {
      confidence = 0.6;
    }
    if (skill.skillMatchPercentage !== undefined) {
      // If we have match data, use it as a signal (but keep minimum at 0.5)
      confidence = Math.max(0.5, skill.skillMatchPercentage / 100);
    }

    const esco = ESCO_SKILL_MAP[tag];

    results.push({
      tag,
      level: skill.skillSource === "EXPLICIT" ? defaultLevel : "preferred",
      confidence,
      evidence: `LinkedIn Voyager: "${skill.name}" (ID: ${skill.skillId}, source: ${skill.skillSource})`,
      escoLabel: esco?.label,
    });
  }

  return results;
}

// ─── Seniority Mapping ─────────────────────────────────────────────────────────

/**
 * Map Voyager seniority level to the contact seniority strings
 * used in the DB schema (src/db/schema.ts contacts.seniority).
 */
export function voyagerSeniorityToDbSeniority(
  level: VoyagerSeniorityLevel,
): string {
  const mapping: Record<VoyagerSeniorityLevel, string> = {
    [VoyagerSeniorityLevel.INTERNSHIP]: "intern",
    [VoyagerSeniorityLevel.ENTRY_LEVEL]: "junior",
    [VoyagerSeniorityLevel.ASSOCIATE]: "mid",
    [VoyagerSeniorityLevel.MID_SENIOR_LEVEL]: "senior",
    [VoyagerSeniorityLevel.DIRECTOR]: "director",
    [VoyagerSeniorityLevel.EXECUTIVE]: "executive",
  };
  return mapping[level] ?? "unknown";
}

/**
 * Map Voyager employment type to the DB employment_type string
 * used in linkedin_posts.employment_type (src/db/schema.ts).
 */
export function voyagerEmploymentTypeToDb(
  type: VoyagerEmploymentType,
): string {
  const mapping: Record<VoyagerEmploymentType, string> = {
    [VoyagerEmploymentType.FULL_TIME]: "full-time",
    [VoyagerEmploymentType.PART_TIME]: "part-time",
    [VoyagerEmploymentType.CONTRACT]: "contract",
    [VoyagerEmploymentType.TEMPORARY]: "temporary",
    [VoyagerEmploymentType.INTERNSHIP]: "internship",
    [VoyagerEmploymentType.VOLUNTEER]: "volunteer",
    [VoyagerEmploymentType.OTHER]: "other",
  };
  return mapping[type] ?? "other";
}

// ─── O*NET / ESCO Cross-Reference ──────────────────────────────────────────────

/**
 * How LinkedIn Voyager skills relate to ESCO and O*NET:
 *
 * 1. LinkedIn skill IDs are PROPRIETARY. They are NOT ESCO URIs or O*NET codes.
 *    LinkedIn has its own skill taxonomy (~35K skills) maintained independently.
 *
 * 2. The codebase bridges LinkedIn → Internal Tags → ESCO via:
 *      VoyagerSkill.skillId → VOYAGER_SKILL_ID_TO_TAG → ESCO_SKILL_MAP
 *    This is a lossy mapping: ~157 of LinkedIn's ~35K skills map to our tags,
 *    and ~70 of those tags have ESCO equivalents (see skill-taxonomy.ts).
 *
 * 3. O*NET (US Department of Labor) uses SOC codes for occupations and
 *    a separate skill framework. There is no direct mapping from LinkedIn
 *    skill IDs to O*NET skill IDs. The path is:
 *      LinkedIn skill name → fuzzy match → O*NET skill name → O*NET ID
 *    This is handled by the Rust ESCO bridge (crates/metal/src/kernel/esco.rs)
 *    which uses Levenshtein similarity for name matching.
 *
 * 4. ESCO v1.1.0 provides URIs for ~13,800 skills. Our ESCO_SKILL_MAP covers
 *    the ~70 most relevant tech skills. The TechWolf eval harness
 *    (crates/metal/src/kernel/techwolf.rs) benchmarks extraction quality
 *    against ESCO ground truth from 9 HuggingFace datasets.
 *
 * 5. For job function/industry codes, LinkedIn uses its own proprietary codes
 *    (VOYAGER_JOB_FUNCTIONS, VOYAGER_INDUSTRY_CODES above) which do NOT
 *    correspond to ISCO-08, NACE, or NAICS codes.
 */
