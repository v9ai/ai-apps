/**
 * Voyager API -> Rust/Metal Pipeline Bridge
 *
 * Serialization types and bridge functions that convert TypeScript Voyager API
 * data into the JSON wire format consumed by the Rust metal pipeline
 * (`crates/metal/src/kernel/voyager_bridge.rs`).
 *
 * Data flow:
 *   LinkedIn Voyager API (TS) -> VoyagerJobDetails -> toMetalPayload()
 *     -> JSON.stringify() -> Rust serde_json::from_str::<VoyagerJobPayload>()
 *     -> MergedJobExtraction -> JobBERT-v3 embeddings / ConTeXT skills / intent scoring
 *
 * The JSON wire format uses camelCase field names (serde rename_all = "camelCase"
 * on the Rust side) for zero-friction serialization from TypeScript objects.
 */

import type {
  VoyagerJobDetails,
  VoyagerJobCard,
} from "@/lib/linkedin/types";

// ════════════════════════════════════════════════════════════════════════════════
// § 1. Wire Types (exact mirror of Rust `VoyagerJobPayload` serde shape)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Workplace type enum — must match Rust `VoyagerWorkplaceType` serde encoding.
 * Rust uses `#[serde(rename_all = "kebab-case")]`.
 */
export type MetalWorkplaceType = "remote" | "hybrid" | "on-site";

/**
 * Skill as expected by Rust `VoyagerSkill`.
 */
export interface MetalVoyagerSkill {
  /** LinkedIn skill URN (e.g., "urn:li:fsd_skill:12345") */
  urn: string;
  /** Normalized skill label (e.g., "Python (Programming Language)") */
  label: string;
  /** LinkedIn's own skill type classification */
  skillType?: string;
}

/**
 * Salary as expected by Rust `VoyagerSalary`.
 */
export interface MetalVoyagerSalary {
  min?: number;
  max?: number;
  /** ISO 4217 currency code */
  currency: string;
  /** "YEARLY" | "MONTHLY" | "HOURLY" */
  period?: string;
}

/**
 * The JSON wire type that Rust deserializes as `VoyagerJobPayload`.
 * Field names are camelCase to match Rust's `#[serde(rename_all = "camelCase")]`.
 *
 * This is the contract between TypeScript and Rust — any changes here
 * must be mirrored in `crates/metal/src/kernel/voyager_bridge.rs`.
 */
export interface MetalVoyagerJobPayload {
  urn: string;
  title: string;
  description: string;
  companyName: string;
  companyUrn?: string;
  workplaceType?: MetalWorkplaceType;
  salary?: MetalVoyagerSalary;
  skills: MetalVoyagerSkill[];
  location?: string;
  listedAt?: number;
  applyUrl?: string;
  posterUrn?: string;
  reposted: boolean;
  employmentType?: string;
  experienceLevel?: string;
}

/**
 * Batch payload for sending multiple jobs to Rust at once.
 * Matches Rust `VoyagerJobBatch`.
 */
export interface MetalVoyagerJobBatch {
  jobs: MetalVoyagerJobPayload[];
  fetchedAt: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// § 2. Result Types (deserialized from Rust JSON output)
// ════════════════════════════════════════════════════════════════════════════════

/** Provenance of an extracted field — mirrors Rust `FieldSource`. */
export type FieldSource = "Voyager" | "Ner" | "Fused";

/** Skill with provenance — mirrors Rust `ProvenancedSkill`. */
export interface ProvenancedSkill {
  label: string;
  confidence: number;
  source: FieldSource;
  voyagerUrn?: string;
  escoLabel?: string;
}

/**
 * Merged extraction result from the Rust pipeline.
 * Mirrors Rust `MergedJobExtraction`.
 */
export interface MergedJobExtraction {
  voyagerUrn: string;
  company: string;
  companySource: FieldSource;
  title: string;
  titleSource: FieldSource;
  remotePolicy: number;
  remoteSource: FieldSource;
  remoteConfidence: number;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  salarySource: FieldSource;
  experienceMin: number;
  experienceMax: number;
  skills: ProvenancedSkill[];
  location?: string;
  employmentType?: string;
  experienceLevel?: string;
  listedAt?: number;
  applyUrl?: string;
  posterUrn?: string;
  reposted: boolean;
  overallConfidence: number;
  description: string;
}

/**
 * Quality comparison result — mirrors Rust `QualityComparison`.
 */
export interface QualityComparison {
  voyagerUrn: string;
  remoteAgrees: boolean;
  voyagerRemote: number;
  nerRemote: number;
  salaryAgrees: boolean;
  voyagerSalaryMin: number;
  nerSalaryMin: number;
  voyagerSkillCount: number;
  nerSkillCount: number;
  sharedSkillCount: number;
  skillJaccard: number;
  voyagerOnlySkills: string[];
  nerOnlySkills: string[];
}

/** Intent signal from Rust extraction — mirrors Rust `IntentSignalInput`. */
export interface IntentSignalInput {
  signalType:
    | "HiringIntent"
    | "TechAdoption"
    | "GrowthSignal"
    | "BudgetCycle"
    | "LeadershipChange"
    | "ProductLaunch";
  confidence: number;
  detectedAtDays: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// § 3. Conversion Functions (TypeScript Voyager types -> Metal wire format)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Map Voyager API workplaceType string to the Metal enum value.
 *
 * LinkedIn Voyager uses various string representations:
 * - "1" / "remote" / "REMOTE" -> "remote"
 * - "2" / "hybrid" / "HYBRID" -> "hybrid"
 * - "3" / "on-site" / "ON_SITE" / "ON-SITE" -> "on-site"
 */
function mapWorkplaceType(
  raw: string | undefined,
): MetalWorkplaceType | undefined {
  if (!raw) return undefined;
  const normalized = raw.toLowerCase().replace(/_/g, "-");
  switch (normalized) {
    case "1":
    case "remote":
      return "remote";
    case "2":
    case "hybrid":
      return "hybrid";
    case "3":
    case "on-site":
    case "onsite":
      return "on-site";
    default:
      return undefined;
  }
}

/**
 * Map LinkedIn Voyager experience level to the Rust enum string.
 *
 * Voyager returns various formats: numeric codes, snake_case, etc.
 */
function mapExperienceLevel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.toUpperCase().replace(/-/g, "_");
  switch (normalized) {
    case "1":
    case "INTERNSHIP":
      return "INTERNSHIP";
    case "2":
    case "ENTRY_LEVEL":
      return "ENTRY_LEVEL";
    case "3":
    case "ASSOCIATE":
      return "ASSOCIATE";
    case "4":
    case "MID_SENIOR":
    case "MID_SENIOR_LEVEL":
      return "MID_SENIOR";
    case "5":
    case "DIRECTOR":
      return "DIRECTOR";
    case "6":
    case "EXECUTIVE":
      return "EXECUTIVE";
    default:
      return raw;
  }
}

/**
 * Strip HTML from job description text.
 * Rust expects plain text — HTML tags would pollute NER patterns and embeddings.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Convert a `VoyagerJobDetails` (full job posting) to the Metal wire format.
 *
 * This is the primary bridge function. Call this after fetching job details
 * from the Voyager API, then `JSON.stringify()` the result and pass it
 * to the Rust pipeline via stdin, IPC, or HTTP.
 */
export function toMetalPayload(
  job: VoyagerJobDetails,
): MetalVoyagerJobPayload {
  const salary: MetalVoyagerSalary | undefined = job.salary
    ? {
        min: job.salary.min ?? undefined,
        max: job.salary.max ?? undefined,
        currency: job.salary.currency ?? "USD",
        period: job.salary.period ?? "YEARLY",
      }
    : undefined;

  const skills: MetalVoyagerSkill[] = (job.skills ?? []).map(
    (label, index) => ({
      urn: `urn:li:fsd_skill:${index}`, // Generate synthetic URN if not available
      label,
    }),
  );

  return {
    urn: job.jobUrn,
    title: job.title,
    description: stripHtml(job.description),
    companyName: job.companyName,
    companyUrn: job.companyUrn,
    workplaceType: mapWorkplaceType(job.workplaceType),
    salary,
    skills,
    location: job.location,
    listedAt: job.listedAtMs,
    applyUrl: job.applyUrl,
    posterUrn: job.poster?.memberUrn ?? undefined,
    reposted: false,
    employmentType: job.employmentType,
    experienceLevel: mapExperienceLevel(job.experienceLevel),
  };
}

/**
 * Convert a `VoyagerJobCard` (search result) to the Metal wire format.
 *
 * Job cards have less data than full details, but are available during
 * search without an extra API call. Useful for batch pre-screening
 * before fetching full details for promising jobs.
 */
export function toMetalPayloadFromCard(
  card: VoyagerJobCard,
): MetalVoyagerJobPayload {
  return {
    urn: card.jobUrn,
    title: card.title,
    description: "", // Cards don't have descriptions
    companyName: card.companyName,
    companyUrn: card.companyUrn,
    workplaceType: mapWorkplaceType(card.workplaceType),
    skills: [],
    location: card.location,
    listedAt: card.listedAtMs,
    reposted: false,
  };
}

/**
 * Convert a batch of job details to the Metal batch wire format.
 */
export function toMetalBatch(
  jobs: VoyagerJobDetails[],
): MetalVoyagerJobBatch {
  return {
    jobs: jobs.map(toMetalPayload),
    fetchedAt: Date.now(),
  };
}

/**
 * Serialize a batch for the Rust pipeline.
 * Returns a JSON string ready for IPC (stdin pipe, HTTP body, or file).
 */
export function serializeForMetal(
  jobs: VoyagerJobDetails[],
): string {
  return JSON.stringify(toMetalBatch(jobs));
}

/**
 * Serialize a single job for the Rust pipeline.
 */
export function serializeJobForMetal(
  job: VoyagerJobDetails,
): string {
  return JSON.stringify(toMetalPayload(job));
}

// ════════════════════════════════════════════════════════════════════════════════
// § 4. Deserialization (Rust output -> TypeScript)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Parse a `MergedJobExtraction` from the Rust pipeline's JSON output.
 */
export function parseMergedExtraction(json: string): MergedJobExtraction {
  return JSON.parse(json) as MergedJobExtraction;
}

/**
 * Parse a quality comparison from the Rust pipeline's JSON output.
 */
export function parseQualityComparison(json: string): QualityComparison {
  return JSON.parse(json) as QualityComparison;
}

// ════════════════════════════════════════════════════════════════════════════════
// § 5. Remote Policy Mapping (TypeScript-side, for cases where Rust isn't needed)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * TypeScript-side remote_policy mapping, matching the Rust enum exactly.
 * Use when you need the mapping in TS without calling into Rust.
 *
 * 0=unknown, 1=full_remote, 2=hybrid, 3=onsite
 */
export function remotePolicy(
  workplaceType: MetalWorkplaceType | undefined,
): number {
  switch (workplaceType) {
    case "remote":
      return 1;
    case "hybrid":
      return 2;
    case "on-site":
      return 3;
    default:
      return 0;
  }
}

/**
 * Human-readable label for a remote_policy value.
 */
export function remotePolicyLabel(policy: number): string {
  switch (policy) {
    case 1:
      return "full_remote";
    case 2:
      return "hybrid";
    case 3:
      return "onsite";
    default:
      return "unknown";
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// § 6. Voyager Skill -> Internal Taxonomy Mapping (TypeScript-side)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a Voyager skill label to match the internal taxonomy.
 * Mirrors the Rust `normalize_voyager_skill()` function exactly.
 */
export function normalizeVoyagerSkill(label: string): string {
  let normalized = label.toLowerCase();

  // Strip parenthetical qualifiers, but keep acronym expansions
  const parenStart = normalized.indexOf("(");
  if (parenStart !== -1) {
    const inside = normalized.slice(parenStart + 1);
    const parenEnd = inside.indexOf(")");
    if (parenEnd !== -1) {
      const acronym = inside.slice(0, parenEnd).trim();
      if (acronym.length <= 5 && /^[a-z0-9]+$/i.test(acronym)) {
        normalized = acronym;
      } else {
        normalized = normalized.slice(0, parenStart).trim();
      }
    }
  }

  normalized = normalized.replace(/ /g, "-").replace(/_/g, "-");
  normalized = normalized.replace(/[.,]+$/, "");

  return normalized;
}
