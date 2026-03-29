/**
 * Shared enums — single source of truth for all workers.
 *
 * Every runtime (TypeScript, Python, Rust) consumes these definitions
 * via `pnpm schema:generate`. Never duplicate enum values in worker code.
 *
 * When adding/removing values here:
 *   1. Run `pnpm schema:generate` to regenerate worker constants
 *   2. Update `schema/**\/*.graphql` enums to match (or use the generated SDL)
 *   3. Run `pnpm codegen` to regenerate GraphQL TS types
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Job pipeline status
// ---------------------------------------------------------------------------

export const JobStatus = z.enum([
  "new",
  "enhanced",
  "role_match",
  "role_nomatch",
  "remote_match",
  "remote_nomatch",
  "error",
  "reported",
]);
export type JobStatus = z.infer<typeof JobStatus>;

/** Mapping from canonical enum values to Python-style hyphenated keys used by process-jobs. */
export const JOB_STATUS_PYTHON_MAP: Record<JobStatus, string> = {
  new: "new",
  enhanced: "enhanced",
  role_match: "role-match",
  role_nomatch: "role-nomatch",
  remote_match: "remote-match",
  remote_nomatch: "remote-nomatch",
  error: "error",
  reported: "reported",
};

// ---------------------------------------------------------------------------
// Company category
// ---------------------------------------------------------------------------

export const CompanyCategory = z.enum([
  "CONSULTANCY",
  "AGENCY",
  "STAFFING",
  "DIRECTORY",
  "PRODUCT",
  "OTHER",
  "UNKNOWN",
]);
export type CompanyCategory = z.infer<typeof CompanyCategory>;

// ---------------------------------------------------------------------------
// Evidence / provenance source type
// ---------------------------------------------------------------------------

export const SourceType = z.enum([
  "COMMONCRAWL",
  "LIVE_FETCH",
  "MANUAL",
  "PARTNER",
]);
export type SourceType = z.infer<typeof SourceType>;

// ---------------------------------------------------------------------------
// Extraction method
// ---------------------------------------------------------------------------

export const ExtractMethod = z.enum([
  "JSONLD",
  "META",
  "DOM",
  "HEURISTIC",
  "LLM",
]);
export type ExtractMethod = z.infer<typeof ExtractMethod>;

// ---------------------------------------------------------------------------
// Application status
// ---------------------------------------------------------------------------

export const ApplicationStatus = z.enum([
  "pending",
  "submitted",
  "reviewed",
  "rejected",
  "accepted",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

// ---------------------------------------------------------------------------
// Skill level (job_skill_tags.level)
// ---------------------------------------------------------------------------

export const SkillLevel = z.enum(["required", "preferred", "nice"]);
export type SkillLevel = z.infer<typeof SkillLevel>;
