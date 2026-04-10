/**
 * Unified worker schema contracts.
 *
 * Single source of truth for all shared enums, types, and message formats
 * consumed across TypeScript, Python, and Rust workers.
 *
 * Usage:
 *   import { JobStatus, CompanyCategory, SKILL_TAXONOMY } from "@/schema/contracts";
 *
 * Codegen:
 *   pnpm schema:generate  — regenerates Python/Rust constants from these definitions
 */

export {
  JobStatus,
  CompanyCategory,
  SourceType,
  ExtractMethod,
  ApplicationStatus,
  ClassificationConfidence,
  DeepPlannerStatus,
  SkillLevel,
  JOB_STATUS_PYTHON_MAP,
} from "./enums";

export { SKILL_TAXONOMY, SKILL_TAGS } from "./skill-taxonomy";

export {
  QueueMessage,
  ProcessJobsMessage,
  JobRoleTagsResult,
  ExtractedSkill,
  JobSkillsOutput,
  JobInsertPayload,
} from "./messages";

export type {
  VoyagerSkill,
  VoyagerSkillAssessment,
  VoyagerSkillMatchResponse,
  VoyagerSalary,
  VoyagerBenefits,
  VoyagerBenefitEntry,
  VoyagerJobPosting,
  LinkedInUrn,
  VoyagerPaging,
} from "./voyager-job-metadata";

export {
  VoyagerSeniorityLevel,
  VoyagerEmploymentType,
  SENIORITY_LEVEL_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  VOYAGER_JOB_FUNCTIONS,
  VOYAGER_INDUSTRY_CODES,
  VOYAGER_SKILL_ID_TO_TAG,
  TAG_TO_VOYAGER_SKILL_ID,
  voyagerSkillToTag,
  voyagerSkillToEsco,
  voyagerSkillsToJobSkills,
  voyagerSeniorityToDbSeniority,
  voyagerEmploymentTypeToDb,
} from "./voyager-job-metadata";
